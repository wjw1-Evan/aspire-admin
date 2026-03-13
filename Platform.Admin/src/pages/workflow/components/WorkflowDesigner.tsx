import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import dagre from 'dagre';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  MarkerType,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './WorkflowDesigner.less';
import { NODE_CONFIGS, nodeTypes, edgeTypes } from './WorkflowDesignerConstants';
import NodeConfigDrawer from './NodeConfigDrawer';
import WorkflowSidebar from './WorkflowSidebar';

import { Button, Form, Modal } from 'antd';
import {
  SaveOutlined,
  CheckCircleOutlined,
  BranchesOutlined,
} from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { useMessage } from '@/hooks/useMessage';
import { useModal } from '@/hooks/useModal';
import type {
  WorkflowGraph,
  NodeConfig,
  ApproverRule,
} from '@/services/workflow/api';
import {
  ApproverType,
  FormTarget,
} from '@/services/workflow/api';
import { getFormList } from '@/services/form/api';
import type { FormDefinition } from '@/services/form/api';
import { getUserList } from '@/services/user/api';
import { getAllRoles } from '@/services/role/api';
import type { AppUser } from '@/services/user/api';
import type { Role } from '@/services/role/api';

interface WorkflowDesignerProps {
  open?: boolean;
  graph?: WorkflowGraph;
  onSave?: (graph: WorkflowGraph) => void;
  onClose?: () => void;
  readOnly?: boolean;
}

// 节点类型显示名称
const getTypeLabels = (intl: any) => ({
  start: intl.formatMessage({ id: 'pages.workflow.designer.addStart' }),
  end: intl.formatMessage({ id: 'pages.workflow.designer.addEnd' }),
  approval: intl.formatMessage({ id: 'pages.workflow.designer.addApproval' }),
  condition: intl.formatMessage({ id: 'pages.workflow.designer.addCondition' }),
});

// 获取工作流中可引用的变量列表
const useWorkflowVariables = (nodes: Node[], forms: FormDefinition[]) => {
  return useMemo(() => {
    const vars = [
      { label: '实例 ID', value: '__instanceId' },
      { label: '文档标题', value: '__documentTitle' },
      { label: '发起人', value: 'startedBy' },
      { label: '公文数据 (JSON)', value: 'document' },
    ];

    nodes.forEach(node => {
      const nodeType = node.data?.nodeType;
      const label = node.data?.label || node.id;

      // 1. 添加节点输出变量
      if (nodeType && nodeType !== 'start') {
        vars.push({
          label: `节点输出: ${label}`,
          value: `nodes.${node.id}.output`
        });
      }

      // 2. 如果节点绑定了表单，提取表单字段
      const formDefId = node.data?.config?.form?.formDefinitionId;
      if (formDefId) {
        const formDef = forms.find(f => f.id === formDefId);
        if (formDef && formDef.fields) {
          formDef.fields.forEach(field => {
            vars.push({
              label: `表单字段: ${label} -> ${field.label}`,
              value: field.dataKey
            });
          });
        }
      }
    });

    return vars;
  }, [nodes, forms]);
};

/**
 * 递归清理对象中的空字符串 ID 字段，防止 MongoDB ObjectId 格式错误
 */
const deepCleanIdFields = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(deepCleanIdFields);
  }

  const newObj: any = {};
  Object.keys(obj).forEach((key) => {
    const value = obj[key];

    if (typeof value === 'string' && value.trim() === '' && (key.endsWith('Id') || key === 'id')) {
      return;
    }

    if (Array.isArray(value) && (key === 'userIds' || key === 'roleIds' || key === 'departmentIds')) {
      const cleanedArray = value.filter(v => typeof v === 'string' && v.trim() !== '');
      if (cleanedArray.length > 0) {
        newObj[key] = cleanedArray;
      }
      return;
    }

    if (typeof value === 'object' && value !== null) {
      newObj[key] = deepCleanIdFields(value);
    } else {
      newObj[key] = value;
    }
  });
  return newObj;
};

// 布局引擎配置
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 250;
const nodeHeight = 100;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction, nodesep: 120, ranksep: 120 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: newNodes, edges };
};

const WorkflowDesigner: React.FC<WorkflowDesignerProps> = ({
  graph,
  onSave,
  onClose,
  readOnly = false,
}) => {
  const intl = useIntl();
  const message = useMessage();
  const { confirm } = useModal();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [configDrawerVisible, setConfigDrawerVisible] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [configForm] = Form.useForm();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const availableVariables = useWorkflowVariables(nodes, forms);

  const typeLabels = useMemo(() => getTypeLabels(intl), [intl]);

  const defaultEdgeOptions = useMemo(() => ({
    type: 'workflowEdge',
    animated: true,
    style: { stroke: '#94a3b8', strokeWidth: 2 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#94a3b8',
    },
  }), []);

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersResponse, rolesResponse, formsResponse] = await Promise.all([
          getUserList({ page: 1, pageSize: 100, isActive: true }),
          getAllRoles(),
          getFormList({ pageSize: 200, current: 1, isActive: true }),
        ]);
        if (usersResponse.success && usersResponse.data) setUsers(usersResponse.data.list);
        if (rolesResponse.success && rolesResponse.data) setRoles(rolesResponse.data.roles.filter(r => r.isActive));
        if (formsResponse.success && formsResponse.data) setForms(formsResponse.data.list || []);
      } catch (error) {
        console.error('加载列表失败:', error);
      }
    };
    loadData();
  }, []);

  const hasInitializedRef = useRef(false);

  // 初始化节点和边
  useEffect(() => {
    if (graph && !hasInitializedRef.current) {
      const initialNodes: Node[] = graph.nodes.map((node) => {
        const config = node.data?.config || {};
        let jumpLabel = '';
        if (node.type === 'condition' && config.condition?.targetNodeId) {
          const targetNode = graph.nodes.find((n) => n.id === config.condition?.targetNodeId);
          if (targetNode) jumpLabel = targetNode.data?.label || targetNode.id;
        }

        return {
          id: node.id,
          type: 'workflowNode',
          position: { x: node.position.x, y: node.position.y },
          deletable: node.type !== 'start',
          data: {
            label: node.data?.label,
            typeLabel: typeLabels[node.type as keyof typeof typeLabels] || node.type,
            nodeType: node.type,
            config: node.data?.config,
            jumpLabel,
          },
        };
      });

      const initialEdges: Edge[] = graph.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'workflowEdge',
        label: edge.label,
        data: { condition: edge.data?.condition },
      }));

      setNodes(initialNodes);
      setEdges(initialEdges);
      hasInitializedRef.current = true;
    } else if (!graph && nodes.length === 0 && !hasInitializedRef.current) {
      setNodes([
        {
          id: 'start',
          type: 'workflowNode',
          position: { x: 250, y: 50 },
          deletable: false,
          data: { label: typeLabels.start, typeLabel: typeLabels.start, nodeType: 'start' },
        },
      ]);
      hasInitializedRef.current = true;
    }
  }, [graph, typeLabels]);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: Edge = {
        id: `edge-${Date.now()}`,
        source: params.source!,
        target: params.target!,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
        ...defaultEdgeOptions,
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges, defaultEdgeOptions]
  );

  const addNode = useCallback(
    (type: string) => {
      const id = `${type}-${Date.now()}`;
      const newNode: Node = {
        id,
        type: 'workflowNode',
        position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
        deletable: type !== 'start',
        data: {
          label: `新${typeLabels[type as keyof typeof typeLabels] || type}`,
          typeLabel: typeLabels[type as keyof typeof typeLabels] || type,
          nodeType: type,
          config: {},
        },
      };
      setNodes((nds) => {
        if (type === 'start' && nds.some(n => n.data?.nodeType === 'start')) {
          message.warning(intl.formatMessage({ id: 'pages.workflow.designer.onlyOneStartNode' }));
          return nds;
        }
        return [...nds, newNode];
      });
    },
    [setNodes, typeLabels, intl, message]
  );

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (readOnly) return;

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      if (!type || !reactFlowBounds || !reactFlowInstance) return;

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const id = `${type}-${Date.now()}`;
      const newNode: Node = {
        id,
        type: 'workflowNode',
        position,
        deletable: type !== 'start',
        data: {
          label: `新${typeLabels[type as keyof typeof typeLabels] || type}`,
          typeLabel: typeLabels[type as keyof typeof typeLabels] || type,
          nodeType: type,
          config: {},
        },
      };

      setNodes((nds) => {
        if (type === 'start' && nds.some(n => n.data?.nodeType === 'start')) {
          message.warning(intl.formatMessage({ id: 'pages.workflow.designer.onlyOneStartNode' }));
          return nds;
        }
        return [...nds, newNode];
      });
    },
    [reactFlowInstance, setNodes, typeLabels, intl, readOnly, message]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setConfigDrawerVisible(true);
    const config = node.data.config || {};

    // 映射辅助函数：处理后端返回的字符串枚举
    const mapApprovalType = (type: any) => {
      if (typeof type === 'number') return type;
      const t = String(type).toLowerCase();
      if (t === 'all') return 0;
      if (t === 'any') return 1;
      if (t === 'sequential') return 2;
      return 0;
    };

    const mapApproverType = (type: any) => {
      if (typeof type === 'number') return type;
      const t = String(type).toLowerCase();
      if (t === 'user') return 0;
      if (t === 'role') return 1;
      if (t === 'department') return 2;
      if (t === 'formfield') return 3;
      return 0;
    };

    configForm.resetFields();
    configForm.setFieldsValue({
      label: node.data.label || '',
      nodeType: node.data.nodeType,
      approvalType: mapApprovalType(config.approval?.type),
      approvers: config.approval?.approvers?.map((r: ApproverRule) => {
        const type = mapApproverType(r.type);
        if (type === 0) return { type: 0, userIds: r.userId ? [r.userId] : (r as any).userIds || [] };
        if (type === 1) return { type: 1, roleIds: r.roleId ? [r.roleId] : (r as any).roleIds || [] };
        if (type === 2) return { type: 2, departmentId: r.departmentId };
        if (type === 3) return { type: 3, formFieldKey: r.formFieldKey };
        return { ...r, type };
      }) || [],
      allowDelegate: config.approval?.allowDelegate,
      allowReject: config.approval?.allowReject,
      allowReturn: config.approval?.allowReturn,
      timeoutHours: config.approval?.timeoutHours,

      // 条件节点配置
      expression: config.condition?.expression,
      logicalOperator: config.condition?.logicalOperator || 'and',
      conditions: config.condition?.conditions || [],
      targetNodeId: config.condition?.targetNodeId,

      formDefinitionId: config.form?.formDefinitionId,
      formTarget: config.form?.target,
      formDataScopeKey: config.form?.dataScopeKey,
      formRequired: config.form?.required,
    });
  }, [configForm]);

  const handleSaveConfig = useCallback(() => {
    if (!selectedNode) return;

    configForm.validateFields().then((values) => {
      const updatedNodes = nodes.map((node: Node): Node => {
        if (node.id === selectedNode.id) {
          const config: NodeConfig = {};

          if (values.nodeType === 'approval') {
            const formatApprovers = (rules: any[]) => {
              return (rules || []).flatMap((rule: any) => {
                if (rule.type === 0) {
                  const uids = Array.isArray(rule.userIds) ? rule.userIds : rule.userId ? [rule.userId] : [];
                  return uids.filter((id: string) => id).map((uid: string) => ({ type: ApproverType.User, userId: uid } as ApproverRule));
                }
                if (rule.type === 1) {
                  const rids = Array.isArray(rule.roleIds) ? rule.roleIds : rule.roleId ? [rule.roleId] : [];
                  return rids.filter((id: string) => id).map((rid: string) => ({ type: ApproverType.Role, roleId: rid } as ApproverRule));
                }
                if (rule.type === 2) return { type: ApproverType.Department, departmentId: rule.departmentId };
                if (rule.type === 3) return { type: ApproverType.FormField, formFieldKey: rule.formFieldKey };
                return rule;
              });
            };

            config.approval = {
              type: values.approvalType || 0,
              approvers: formatApprovers(values.approvers),
              allowDelegate: values.allowDelegate || false,
              allowReject: values.allowReject !== false,
              allowReturn: values.allowReturn || false,
              timeoutHours: values.timeoutHours,
            };
          } else if (values.nodeType === 'condition') {
            config.condition = {
              expression: values.expression || '',
              logicalOperator: values.logicalOperator || 'and',
              conditions: (values.conditions || []).map((c: any) => ({
                variable: c.variable,
                operator: c.operator || 'equals',
                value: c.value
              })),
              targetNodeId: values.targetNodeId?.trim() !== '' ? values.targetNodeId : undefined,
            };
          }

          if (values.formDefinitionId?.trim() !== '') {
            config.form = {
              formDefinitionId: values.formDefinitionId,
              target: values.formTarget || FormTarget.Document,
              dataScopeKey: values.formDataScopeKey || undefined,
              required: values.formRequired || false,
            };
          }

          let jumpLabel = '';
          if (values.nodeType === 'condition' && config.condition?.targetNodeId) {
            const targetNode = nodes.find(n => n.id === config.condition?.targetNodeId);
            if (targetNode) jumpLabel = targetNode.data.label || targetNode.id;
          }

          return {
            ...node,
            data: {
              ...node.data,
              label: values.label,
              typeLabel: typeLabels[values.nodeType as keyof typeof typeLabels] || values.nodeType,
              config,
              jumpLabel,
            },
          };
        }
        return node;
      });

      setNodes(updatedNodes);
      setConfigDrawerVisible(false);
      message.success(intl.formatMessage({ id: 'pages.workflow.designer.message.configSaved' }));
    }).catch(() => { });
  }, [selectedNode, configForm, nodes, setNodes, typeLabels, intl, message]);

  const validateWorkflow = useCallback(() => {
    const startNodes = nodes.filter(n => n.data.nodeType === 'start');
    const endNodes = nodes.filter(n => n.data.nodeType === 'end');

    if (startNodes.length === 0) {
      message.error(intl.formatMessage({ id: 'pages.workflow.designer.message.noStartNode' }));
      return false;
    }
    if (endNodes.length === 0) {
      message.error(intl.formatMessage({ id: 'pages.workflow.designer.message.noEndNode' }));
      return false;
    }
    return true;
  }, [nodes, intl, message]);

  const handleSave = useCallback(() => {
    if (!validateWorkflow()) return;

    const workflowGraph: WorkflowGraph = {
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.data.nodeType as any,
        data: {
          nodeType: node.data.nodeType,
          label: node.data.label || '',
          config: deepCleanIdFields(node.data.config || {}),
        },
        position: { x: node.position.x, y: node.position.y },
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle ?? undefined,
        targetHandle: edge.targetHandle ?? undefined,
        label: edge.label as string,
        data: { condition: edge.data?.condition },
      })),
    };

    onSave?.(workflowGraph);
  }, [nodes, edges, validateWorkflow, onSave]);

  const handleDeleteNode = useCallback(() => {
    if (!selectedNode) return;

    confirm({
      title: '确认删除节点',
      content: '确定删除该流程节点？删除后与该节点关联的连线也会一并移除。',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        const targetId = selectedNode.id;
        setNodes(nds => nds.filter(n => n.id !== targetId));
        setEdges(eds => eds.filter(e => e.source !== targetId && e.target !== targetId));
        setSelectedNode(null);
        setConfigDrawerVisible(false);
        message.success('节点已删除');
      },
    });
  }, [selectedNode, setNodes, setEdges, confirm, message]);

  return (
    <div className="workflow-designer-container" style={{ width: '100%', height: '100%' }}>
      <div className="workflow-main-layout">
        <WorkflowSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onAddNode={addNode}
          onDragStart={onDragStart}
          readOnly={readOnly}
        />

        <div className="workflow-canvas-container" ref={reactFlowWrapper}>
          <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, display: 'flex', gap: 8 }}>
            {onSave && (
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} size="middle">
                {intl.formatMessage({ id: 'pages.workflow.designer.save' })}
              </Button>
            )}
            <Button
              icon={<BranchesOutlined />}
              onClick={() => {
                const { nodes: lNodes, edges: lEdges } = getLayoutedElements(nodes, edges);
                setNodes([...lNodes]);
                setEdges([...lEdges]);
                message.success('已自动重新排版');
              }}
            >
              自动排版
            </Button>
            <Button
              icon={<CheckCircleOutlined />}
              onClick={() => {
                if (validateWorkflow()) message.success(intl.formatMessage({ id: 'pages.message.success' }));
              }}
            >
              验证
            </Button>
            {onClose && <Button onClick={onClose}>退出</Button>}
          </div>

          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={readOnly ? undefined : onNodesChange}
            onEdgesChange={readOnly ? undefined : onEdgesChange}
            onConnect={readOnly ? undefined : onConnect}
            onNodeClick={onNodeClick}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodesDraggable={!readOnly}
            nodesConnectable={!readOnly}
            elementsSelectable={!readOnly}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={defaultEdgeOptions}
          >
            <Background color="#cbd5e1" gap={24} size={1} />
            <Controls />
            <MiniMap
              nodeColor={(n) => {
                const config = NODE_CONFIGS[n.data.nodeType as keyof typeof NODE_CONFIGS];
                return config?.color || '#eee';
              }}
              maskStrokeColor="#3b82f6"
              style={{ borderRadius: 12 }}
            />
          </ReactFlow>
        </div>
      </div>

      <NodeConfigDrawer
        visible={configDrawerVisible}
        onClose={() => setConfigDrawerVisible(false)}
        selectedNode={selectedNode}
        configForm={configForm}
        onSaveConfig={handleSaveConfig}
        onDeleteNode={handleDeleteNode}
        readOnly={readOnly}
        users={users}
        roles={roles}
        forms={forms}
        availableVariables={availableVariables}
        allNodes={nodes}
      />
    </div>
  );
};

export default WorkflowDesigner;
