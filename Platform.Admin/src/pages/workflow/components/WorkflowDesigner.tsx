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
  Handle,
  Position,
  NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './WorkflowDesigner.less';
import { NODE_CONFIGS, nodeTypes, edgeTypes } from './WorkflowDesignerConstants';
import NodeConfigDrawer from './NodeConfigDrawer';
import WorkflowSidebar from './WorkflowSidebar';

import { Button, Card, Drawer, Form, Input, Select, Switch, Space, Divider, Modal, Tabs, Mentions } from 'antd';
const { Option } = Mentions;
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  PlusOutlined,
  SaveOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  CheckOutlined,
  StopOutlined,
  ApartmentOutlined,
  BranchesOutlined,
  InfoCircleOutlined,
  UserOutlined,
  NodeIndexOutlined,
  CloudUploadOutlined,
  BellOutlined,
  CloudSyncOutlined,
  HistoryOutlined,
  EditOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { useMessage } from '@/hooks/useMessage';
import { useModal } from '@/hooks/useModal';
import type {
  WorkflowGraph,
  WorkflowNode,
  WorkflowEdge,
  NodeConfig,
  ApprovalConfig,
  ConditionConfig,
  ApproverRule,
} from '@/services/workflow/api';
import {
  ApproverType,
} from '@/services/workflow/api';
import { getFormList } from '@/services/form/api';
import type { FormDefinition } from '@/services/form/api';
import { FormTarget } from '@/services/workflow/api';
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
  ai: intl.formatMessage({ id: 'pages.workflow.designer.addAi' }),
  notification: intl.formatMessage({ id: 'pages.workflow.designer.addNotification' }),
  parallel: intl.formatMessage({ id: 'pages.workflow.designer.addParallel' }),
  httpRequest: intl.formatMessage({ id: 'pages.workflow.designer.addHttpRequest' }),
  timer: intl.formatMessage({ id: 'pages.workflow.designer.addTimer' }),
  setVariable: intl.formatMessage({ id: 'pages.workflow.designer.addSetVariable' }),
  log: intl.formatMessage({ id: 'pages.workflow.designer.addLog' }),
  aiJudge: intl.formatMessage({ id: 'pages.workflow.designer.addAiJudge' }),
  parameterExtractor: intl.formatMessage({ id: 'pages.workflow.designer.addParameterExtractor' }),
  iteration: intl.formatMessage({ id: 'pages.workflow.designer.addIteration' }),
  answer: intl.formatMessage({ id: 'pages.workflow.designer.addAnswer' }),
  knowledgeSearch: intl.formatMessage({ id: 'pages.workflow.designer.addKnowledgeSearch' }),
  tool: intl.formatMessage({ id: 'pages.workflow.designer.addTool' }),
});

  const defaultNodeStyle = {
    borderRadius: '8px',
    minWidth: '120px',
  };

  // 获取工作流中可引用的变量列表
  const useWorkflowVariables = (nodes: Node[]) => {
    return useMemo(() => {
      const vars = [
        { label: '实例 ID', value: '__instanceId' },
        { label: '文档标题', value: '__documentTitle' },
        { label: '发起人', value: 'startedBy' },
      ];

      nodes.forEach(node => {
        if (node.data?.nodeType && node.data?.nodeType !== 'start') {
          vars.push({
            label: `节点: ${node.data.label || node.id}`,
            value: `#${node.id}.output#`
          });
        }
      });

      return vars;
    }, [nodes]);
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

    // 如果字段名以 Id 结尾且值为空字符串，则丢弃
    if (typeof value === 'string' && value.trim() === '' && (key.endsWith('Id') || key === 'id')) {
      return;
    }

    // 处理特殊的 ID 数组字段
    if (Array.isArray(value) && (key === 'userIds' || key === 'roleIds' || key === 'departmentIds')) {
      const cleanedArray = value.filter(v => typeof v === 'string' && v.trim() !== '');
      if (cleanedArray.length > 0) {
        newObj[key] = cleanedArray;
      }
      return;
    }

    if (typeof value === 'object' && value !== null) {
      const cleaned = deepCleanIdFields(value);
      // 如果清理后对象为空，且不是配置根节点，可以选择保留或丢弃。这里保留以维持结构。
      newObj[key] = cleaned;
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
    const newNode = {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      // 偏移节点使其中心点能够和 dagre 计算出来的中心点重合
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };

    return newNode;
  });

  return { nodes: newNodes, edges };
};

const WorkflowDesigner: React.FC<WorkflowDesignerProps> = ({
  open = false,
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
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const availableVariables = useWorkflowVariables(nodes);

  // 稳定状态引用，防止回调循环热更新
  const nodesRef = React.useRef(nodes);
  const edgesRef = React.useRef(edges);
  const typeLabels = useMemo(() => getTypeLabels(intl), [intl]);

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);



  const defaultEdgeOptions = useMemo(() => ({
    type: 'workflowEdge',
    animated: true,
    style: { stroke: '#94a3b8', strokeWidth: 2 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#94a3b8',
    },
  }), []);

  // 加载用户和角色列表
  useEffect(() => {
    const loadData = async () => {
      setLoadingUsers(true);
      setLoadingRoles(true);
      try {
        const [usersResponse, rolesResponse] = await Promise.all([
          getUserList({ page: 1, pageSize: 100, isActive: true }),
          getAllRoles(),
        ]);
        if (usersResponse.success && usersResponse.data) {
          setUsers(usersResponse.data.list);
        }
        if (rolesResponse.success && rolesResponse.data) {
          setRoles(rolesResponse.data.roles.filter((r) => r.isActive));
        }
      } catch (error) {
        console.error('加载用户或角色列表失败:', error);
      } finally {
        setLoadingUsers(false);
        setLoadingRoles(false);
      }
    };
    loadData();
  }, []);

  // 加载可用表单列表
  useEffect(() => {
    const loadForms = async () => {
      setLoadingForms(true);
      try {
        const res = await getFormList({ pageSize: 200, current: 1, isActive: true });
        if (res.success && res.data) {
          setForms(res.data.list || []);
        }
      } catch (err) {
        console.error('加载表单列表失败:', err);
      } finally {
        setLoadingForms(false);
      }
    };
    loadForms();
  }, []);

  const hasInitializedRef = React.useRef(false);

  // 初始化节点和边 (优化版：移除易变依赖，增加初始化标记)
  useEffect(() => {
    if (graph && !hasInitializedRef.current) {
      const initialNodes: Node[] = graph.nodes.map((node) => {
        const config = node.data?.config || {};
        let jumpLabel = '';
        if (node.type === 'condition' && config.condition?.targetNodeId) {
          const targetNode = graph.nodes.find((n) => n.id === config.condition?.targetNodeId);
          if (targetNode) {
            jumpLabel = targetNode.data?.label || targetNode.id;
          }
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
            jumpLabel: jumpLabel,
          },
        };
      });

      const initialEdges: Edge[] = graph.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'workflowEdge',
        label: edge.label,
        labelStyle: { fill: '#64748b', fontWeight: 600 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#94a3b8',
        },
        data: {
          condition: edge.data?.condition,
        },
      }));

      setNodes(initialNodes);
      setEdges(initialEdges);
      hasInitializedRef.current = true;
    } else if (!graph && nodesRef.current.length === 0 && !hasInitializedRef.current) {
      // 仅在画布为空且无 graph 输入时，默认创建一个开始节点
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
  }, [graph, readOnly, setNodes, setEdges, typeLabels]);

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
      const typeLabels = getTypeLabels(intl);
      const id = `${type}-${Date.now()}`;
      const newNode: Node = {
        id,
        type: 'workflowNode',
        position: {
          x: Math.random() * 400 + 100,
          y: Math.random() * 300 + 100,
        },
        deletable: type !== 'start',
        data: {
          label: `新${typeLabels[type as keyof typeof typeLabels] || type}`,
          typeLabel: typeLabels[type as keyof typeof typeLabels] || type,
          nodeType: type,
          config: {},
        },
      };
      setNodes((nds) => {
        if (type === 'start' && nds.some((n) => n.data?.nodeType === 'start')) {
          message.warning(intl.formatMessage({ id: 'pages.workflow.designer.onlyOneStartNode', defaultMessage: '流程只能包含一个开始节点' }));
          return nds;
        }
        return [...nds, newNode];
      });
    },
    [setNodes, intl, message]
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

      if (readOnly) return; // Prevent dropping when read-only

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      // Check if the dropped element is valid
      if (typeof type === 'undefined' || !type || !reactFlowBounds || !reactFlowInstance) {
        return;
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const typeLabelsInfo = getTypeLabels(intl);
      const id = `${type}-${Date.now()}`;
      
      const newNode: Node = {
        id,
        type: 'workflowNode',
        position,
        deletable: type !== 'start',
        data: {
          label: `新${typeLabelsInfo[type as keyof typeof typeLabelsInfo] || type}`,
          typeLabel: typeLabelsInfo[type as keyof typeof typeLabelsInfo] || type,
          nodeType: type,
          config: {},
        },
      };

      setNodes((nds) => {
        if (type === 'start' && nds.some((n) => n.data?.nodeType === 'start')) {
          message.warning(intl.formatMessage({ id: 'pages.workflow.designer.onlyOneStartNode', defaultMessage: '流程只能包含一个开始节点' }));
          return nds;
        }
        return nds.concat(newNode);
      });
    },
    [reactFlowInstance, setNodes, intl, readOnly, message]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setConfigDrawerVisible(true);
    const config = node.data.config || {};
    const labelText = node.data.label || '';

    configForm.resetFields();
    configForm.setFieldsValue({
      label: labelText,
      nodeType: node.data.nodeType,
      approvalType: config.approval?.type || 0,
      approvers: config.approval?.approvers?.map((r: ApproverRule) => {
        if (r.type === 0) return { type: 0, userIds: r.userId ? [r.userId] : [] };
        if (r.type === 1) return { type: 1, roleIds: r.roleId ? [r.roleId] : [] };
        if (r.type === 2) return { type: 2, departmentId: r.departmentId };
        if (r.type === 3) return { type: 3, formFieldKey: r.formFieldKey };
        return r;
      }) || [],
      ccRules: config.approval?.ccRules?.map((r: ApproverRule) => {
        if (r.type === 0) return { type: 0, userIds: r.userId ? [r.userId] : [] };
        if (r.type === 1) return { type: 1, roleIds: r.roleId ? [r.roleId] : [] };
        if (r.type === 2) return { type: 2, departmentId: r.departmentId };
        if (r.type === 3) return { type: 3, formFieldKey: r.formFieldKey };
        return r;
      }) || [],
      allowDelegate: config.approval?.allowDelegate,
      allowReject: config.approval?.allowReject,
      allowReturn: config.approval?.allowReturn,
      timeoutHours: config.approval?.timeoutHours,
      expression: config.condition?.expression,
      targetNodeId: config.condition?.targetNodeId,
      formDefinitionId: config.form?.formDefinitionId,
      formTarget: config.form?.target,
      formDataScopeKey: config.form?.dataScopeKey,
      formRequired: config.form?.required,
      promptTemplate: config.ai?.promptTemplate,
      systemPrompt: config.ai?.systemPrompt,
      aiModel: config.ai?.model,
      aiInputVariable: config.ai?.inputVariable,
      outputVariable: config.ai?.outputVariable,
      maxTokens: config.ai?.maxTokens,
      temperature: config.ai?.temperature,
      notificationActionType: config.notification?.actionType || 'workflow_notification',
      notificationRemarks: config.notification?.remarksTemplate,
      notificationRecipients: config.notification?.recipients?.map((r: ApproverRule) => {
        if (r.type === 0) return { type: 0, userIds: r.userId ? [r.userId] : [] };
        if (r.type === 1) return { type: 1, roleIds: r.roleId ? [r.roleId] : [] };
        if (r.type === 2) return { type: 2, departmentId: r.departmentId };
        if (r.type === 3) return { type: 3, formFieldKey: r.formFieldKey };
        return r;
      }) || [],
      httpMethod: config.http?.method || 'GET',
      httpUrl: config.http?.url,
      httpHeaders: config.http?.headers,
      httpBody: config.http?.body,
      httpOutputVariable: config.http?.outputVariable,
      timerWaitDuration: config.timer?.waitDuration,
      timerCron: config.timer?.cron,
      variableName: config.variable?.name,
      variableValue: config.variable?.value,
      logLevel: config.log?.level || 'Information',
      logMessage: config.log?.message,
      judgeInputVariable: config.aiJudge?.inputVariable,
      judgePrompt: config.aiJudge?.judgePrompt,
      judgeSystemPrompt: config.aiJudge?.systemPrompt,
      judgeModel: config.aiJudge?.model,
      judgeOutputVariable: config.aiJudge?.outputVariable || 'judge_result',
      // LLM 节点配置
      llmModel: config.llm?.model,
      llmProvider: config.llm?.provider,
      llmMode: config.llm?.mode || 'chat',
      llmSystemPrompt: config.llm?.systemPrompt,
      llmPrompt: config.llm?.prompt,
      llmMaxTokens: config.llm?.maxTokens,
      llmTemperature: config.llm?.temperature,
      llmTopP: config.llm?.topP,
      llmResponseFormat: config.llm?.responseFormat,
      llmOutputVariable: config.llm?.outputVariable || 'llm_result',
      // Agent 节点配置
      agentStrategy: config.agent?.strategy || 'react',
      agentModel: config.agent?.model,
      agentProvider: config.agent?.provider,
      agentSystemPrompt: config.agent?.systemPrompt,
      agentMaxIterations: config.agent?.maxIterations || 10,
      agentMaxTokens: config.agent?.maxTokens,
      agentTemperature: config.agent?.temperature,
      agentMemoryEnabled: config.agent?.memory?.enabled || false,
      agentMemoryMaxMessages: config.agent?.memory?.maxMessages || 10,
      agentOutputVariable: config.agent?.outputVariable || 'agent_result',
      // Retrieval 节点配置
      retrievalQuery: config.retrieval?.query,
      retrievalKnowledgeBaseId: config.retrieval?.knowledgeBaseId,
      retrievalStrategy: config.retrieval?.retrievalStrategy || 'semantic_search',
      retrievalTopK: config.retrieval?.topK || 3,
      retrievalScoreThreshold: config.retrieval?.scoreThreshold || 0.5,
      retrievalOutputVariable: config.retrieval?.outputVariable || 'retrieved_documents',
      // Knowledge 节点配置
      knowledgeQuery: config.knowledge?.query,
      knowledgeQueryVariable: config.knowledge?.queryVariable,
      knowledgeBaseIds: config.knowledge?.knowledgeBaseIds || [],
      knowledgeRetrievalMode: config.knowledge?.retrievalMode || 'hybrid',
      knowledgeTopK: config.knowledge?.topK || 3,
      knowledgeScoreThreshold: config.knowledge?.scoreThreshold,
      knowledgeOutputVariable: config.knowledge?.outputVariable || 'search_results',
      // HumanInput 节点配置
      humanInputLabel: config.humanInput?.inputLabel,
      humanInputType: config.humanInput?.inputType || 'text',
      humanInputDescription: config.humanInput?.description,
      humanInputTimeout: config.humanInput?.timeout,
      // Loop 节点配置
      loopIteratorVariable: config.iteration?.iteratorVariable,
      loopOutputVariable: config.iteration?.outputVariable || 'iteration_results',
      // 代码节点配置
      codeLanguage: config.code?.language || 'python',
      codeInputVariables: config.code?.inputVariables || [],
      codeOutputVariable: config.code?.outputVariable || 'code_result',
      // 模板节点配置
      templateContent: config.template?.template,
      templateVariables: config.template?.variables || {},
      templateOutputVariable: config.template?.outputVariable || 'template_result',
      // Variable Assigner 配置
      variableAssignments: config.variableAssigner?.assignments || [],
      // List Operator 配置
      listOperator: config.listOperator?.operator || 'transform',
      listInputVariable: config.listOperator?.inputVariable,
      listOutputVariable: config.listOperator?.outputVariable || 'list_result',
      // Document Extractor 配置
      documentExtractorVariable: config.documentExtractor?.variable,
      documentExtractorExtractions: config.documentExtractor?.extractions || [],
      documentExtractorOutputVariable: config.documentExtractor?.outputVariable || 'extracted_data',
      // STT 节点配置
      sttInputVariable: config.speechToText?.inputVariable,
      sttProvider: config.speechToText?.provider,
      sttLanguage: config.speechToText?.language,
      sttOutputVariable: config.speechToText?.outputVariable || 'stt_result',
      // TTS 节点配置
      ttsInputVariable: config.textToSpeech?.inputVariable,
      ttsProvider: config.textToSpeech?.provider,
      ttsVoice: config.textToSpeech?.voice,
      ttsLanguage: config.textToSpeech?.language,
      ttsOutputVariable: config.textToSpeech?.outputVariable || 'tts_result',
      // Email 节点配置
      emailTo: config.email?.to,
      emailCc: config.email?.cc,
      emailSubject: config.email?.subject,
      emailBody: config.email?.body,
      emailIsHtml: config.email?.isHtml || false,
      // Vision 节点配置
      visionImageVariable: config.vision?.imageVariable,
      visionPrompt: config.vision?.prompt,
      visionModel: config.vision?.model,
      visionOutputVariable: config.vision?.outputVariable || 'vision_result',
      // Variable Aggregator 节点配置
      aggregatorInputVariables: config.variableAggregator?.inputVariables || [],
      aggregatorOutputVariable: config.variableAggregator?.outputVariable || 'aggregator_result',
      aggregatorFormat: config.variableAggregator?.format || 'json',
      aggregatorTemplate: config.variableAggregator?.template,
    });
  }, [configForm, users, roles, forms]);

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
                  const userIds: string[] = Array.isArray(rule.userIds) ? rule.userIds : rule.userId ? [rule.userId] : [];
                  const validUserIds = userIds.filter(id => id && id.trim() !== '');
                  return validUserIds.map((uid) => ({ type: ApproverType.User, userId: uid } as ApproverRule));
                }
                if (rule.type === 1) {
                  const roleIds: string[] = Array.isArray(rule.roleIds) ? rule.roleIds : rule.roleId ? [rule.roleId] : [];
                  const validRoleIds = roleIds.filter(id => id && id.trim() !== '');
                  return validRoleIds.map((rid) => ({ type: ApproverType.Role, roleId: rid } as ApproverRule));
                }
                if (rule.type === 2) {
                  return { type: ApproverType.Department, departmentId: rule.departmentId };
                }
                if (rule.type === 3) {
                  return { type: ApproverType.FormField, formFieldKey: rule.formFieldKey };
                }
                return rule;
              });
            };

            const approvers = formatApprovers(values.approvers);
            const ccRules = formatApprovers(values.ccRules);

            config.approval = {
              type: values.approvalType || 0,
              approvers: approvers,
              ccRules: ccRules,
              allowDelegate: values.allowDelegate || false,
              allowReject: values.allowReject !== false,
              allowReturn: values.allowReturn || false,
              timeoutHours: values.timeoutHours,
            };
          } else if (values.nodeType === 'condition') {
            config.condition = {
              expression: values.expression || '',
              targetNodeId: values.targetNodeId && values.targetNodeId.trim() !== '' ? values.targetNodeId : undefined,
            };
          }

          // Bug 26 修复：form、ai、notification 配置独立保存，不互斥
          if (values.formDefinitionId && values.formDefinitionId.trim() !== '') {
            config.form = {
              formDefinitionId: values.formDefinitionId,
              target: (values.formTarget as FormTarget) || FormTarget.Document,
              dataScopeKey: values.formDataScopeKey || undefined,
              required: values.formRequired || false,
            };
          }

          if (values.nodeType === 'ai') {
            config.ai = {
              inputVariable: values.aiInputVariable,
              promptTemplate: values.promptTemplate || '',
              systemPrompt: values.systemPrompt,
              model: values.aiModel,
              outputVariable: values.outputVariable || 'ai_result',
              maxTokens: values.maxTokens,
              temperature: values.temperature,
            };
          }

          if (values.nodeType === 'notification') {
            const formatRecipients = (rules: any[]) => {
              return (rules || []).flatMap((rule: any) => {
                if (rule.type === 0) {
                  const userIds: string[] = Array.isArray(rule.userIds) ? rule.userIds : rule.userId ? [rule.userId] : [];
                  const validUserIds = userIds.filter(id => id && id.trim() !== '');
                  return validUserIds.map((uid) => ({ type: ApproverType.User, userId: uid } as ApproverRule));
                }
                if (rule.type === 1) {
                  const roleIds: string[] = Array.isArray(rule.roleIds) ? rule.roleIds : rule.roleId ? [rule.roleId] : [];
                  const validRoleIds = roleIds.filter(id => id && id.trim() !== '');
                  return validRoleIds.map((rid) => ({ type: ApproverType.Role, roleId: rid } as ApproverRule));
                }
                if (rule.type === 2) {
                  return { type: ApproverType.Department, departmentId: rule.departmentId };
                }
                if (rule.type === 3) {
                  return { type: ApproverType.FormField, formFieldKey: rule.formFieldKey };
                }
                return rule;
              });
            };

            config.notification = {
              actionType: values.notificationActionType || 'workflow_notification',
              remarksTemplate: values.notificationRemarks,
              recipients: formatRecipients(values.notificationRecipients),
            };
          }

          if (values.nodeType === 'httpRequest') {
            try {
              config.http = {
                method: values.httpMethod || 'GET',
                url: values.httpUrl,
                headers: typeof values.httpHeaders === 'string' && values.httpHeaders.trim() !== '' 
                  ? JSON.parse(values.httpHeaders) 
                  : values.httpHeaders,
                body: typeof values.httpBody === 'string' && values.httpBody.trim() !== '' 
                  ? JSON.parse(values.httpBody) 
                  : values.httpBody,
                outputVariable: values.httpOutputVariable || 'http_result',
              };
            } catch (e) {
              message.error('HTTP：Header 或 Body 不是有效的 JSON');
              return node;
            }
          }

          if (values.nodeType === 'timer') {
            config.timer = {
              waitDuration: values.timerWaitDuration,
              cron: values.timerCron,
            };
          }

          if (values.nodeType === 'setVariable') {
            config.variable = {
              name: values.variableName,
              value: values.variableValue,
            };
          }

          if (values.nodeType === 'log') {
            config.log = {
              level: values.logLevel || 'Information',
              message: values.logMessage,
            };
          }

          if (values.nodeType === 'aiJudge') {
            config.aiJudge = {
              inputVariable: values.judgeInputVariable,
              judgePrompt: values.judgePrompt || '',
              systemPrompt: values.judgeSystemPrompt,
              model: values.judgeModel,
              outputVariable: values.judgeOutputVariable || 'judge_result',
            };
          }

          if (values.nodeType === 'parameterExtractor') {
            try {
              config.parameterExtractor = {
                inputVariable: values.extractorInputVariable,
                parameters: typeof values.extractorParameters === 'string' ? JSON.parse(values.extractorParameters) : values.extractorParameters,
                model: values.extractorModel,
                outputVariable: values.extractorOutputVariable,
              };
            } catch (e) {
              message.error('参数提取：参数定义不是有效的 JSON 数组');
              return node;
            }
          }

          if (values.nodeType === 'iteration') {
            config.iteration = {
              iteratorVariable: values.iterationIteratorVariable,
              outputVariable: values.iterationOutputVariable,
            };
          }

          if (values.nodeType === 'answer') {
            config.answer = {
              answer: values.answerContent,
            };
          }

          if (values.nodeType === 'knowledgeSearch') {
            config.knowledge = {
              query: values.knowledgeQuery,
              queryVariable: values.knowledgeQueryVariable,
              knowledgeBaseIds: values.knowledgeBaseIds || [],
              retrievalMode: values.knowledgeRetrievalMode || 'hybrid',
              topK: parseInt(values.knowledgeTopK || '3'),
              scoreThreshold: values.knowledgeScoreThreshold ? parseFloat(values.knowledgeScoreThreshold) : undefined,
              outputVariable: values.knowledgeOutputVariable || 'search_results',
            };
          }

          if (values.nodeType === 'llm') {
            config.llm = {
              model: values.llmModel,
              provider: values.llmProvider,
              mode: values.llmMode || 'chat',
              systemPrompt: values.llmSystemPrompt,
              prompt: values.llmPrompt,
              maxTokens: values.llmMaxTokens,
              temperature: values.llmTemperature,
              topP: values.llmTopP,
              responseFormat: values.llmResponseFormat,
              outputVariable: values.llmOutputVariable || 'llm_result',
            };
          }

          if (values.nodeType === 'agent') {
            config.agent = {
              strategy: values.agentStrategy || 'react',
              model: values.agentModel,
              provider: values.agentProvider,
              systemPrompt: values.agentSystemPrompt,
              maxIterations: values.agentMaxIterations || 10,
              maxTokens: values.agentMaxTokens,
              temperature: values.agentTemperature,
              memory: {
                enabled: values.agentMemoryEnabled || false,
                maxMessages: values.agentMemoryMaxMessages || 10,
              },
              outputVariable: values.agentOutputVariable || 'agent_result',
            };
          }

          if (values.nodeType === 'retrieval') {
            config.retrieval = {
              query: values.retrievalQuery,
              knowledgeBaseId: values.retrievalKnowledgeBaseId,
              retrievalStrategy: values.retrievalStrategy || 'semantic_search',
              topK: parseInt(values.retrievalTopK || '3'),
              scoreThreshold: values.retrievalScoreThreshold ? parseFloat(values.retrievalScoreThreshold) : undefined,
              outputVariable: values.retrievalOutputVariable || 'retrieved_documents',
            };
          }

          if (values.nodeType === 'humanInput') {
            config.humanInput = {
              inputLabel: values.humanInputLabel || '请输入',
              inputType: values.humanInputType || 'text',
              description: values.humanInputDescription,
              timeout: values.humanInputTimeout,
              defaultValue: values.humanInputDefaultValue,
            };
          }

          if (values.nodeType === 'loop' || values.nodeType === 'iteration') {
            config.iteration = {
              iteratorVariable: values.loopIteratorVariable,
              outputVariable: values.loopOutputVariable || 'iteration_results',
            };
          }


          if (values.nodeType === 'code') {
            config.code = {
              language: values.codeLanguage || 'python',
              inputVariables: values.codeInputVariables || [],
              code: values.codeCode,
              outputVariable: values.codeOutputVariable || 'code_result',
            };
          }

          if (values.nodeType === 'template') {
            config.template = {
              template: values.templateContent || '',
              variables: values.templateVariables || {},
              outputVariable: values.templateOutputVariable || 'template_result',
            };
          }

          if (values.nodeType === 'variableAssigner') {
            config.variableAssigner = {
              assignments: values.variableAssignments || [],
              outputVariable: values.variableAssignerOutputVariable || 'assigned_value',
            };
          }

          if (values.nodeType === 'listOperator') {
            config.listOperator = {
              operator: values.listOperator || 'transform',
              inputVariable: values.listInputVariable,
              outputVariable: values.listOutputVariable || 'list_result',
            };
          }

          if (values.nodeType === 'documentExtractor') {
            try {
              config.documentExtractor = {
                variable: values.documentExtractorVariable,
                extractions: typeof values.documentExtractorExtractions === 'string' 
                  ? JSON.parse(values.documentExtractorExtractions) 
                  : values.documentExtractorExtractions || [],
                outputVariable: values.documentExtractorOutputVariable || 'extracted_data',
              };
            } catch (e) {
              message.error('文档提取：提取规则不是有效的 JSON 数组');
              return node;
            }
          }

          if (values.nodeType === 'parallel') {
            config.parallel = {
              mode: values.parallelMode || 'parallel',
              branches: values.parallelBranches || [],
            };
          }

          if (values.nodeType === 'tool') {
            try {
              config.tool = {
                toolName: values.toolName,
                parameters: typeof values.toolParameters === 'string' && values.toolParameters.trim() !== '' 
                  ? JSON.parse(values.toolParameters) 
                  : values.toolParameters,
              };
            } catch (e) {
              message.error('工具：参数定义不是有效的 JSON');
              return node;
            }
          }

          if (values.nodeType === 'speechToText') {
            config.speechToText = {
              inputVariable: values.sttInputVariable,
              provider: values.sttProvider,
              language: values.sttLanguage,
              outputVariable: values.sttOutputVariable || 'stt_result',
            };
          }

          if (values.nodeType === 'textToSpeech') {
            config.textToSpeech = {
              inputVariable: values.ttsInputVariable,
              provider: values.ttsProvider,
              voice: values.ttsVoice,
              language: values.ttsLanguage,
              outputVariable: values.ttsOutputVariable || 'tts_result',
            };
          }

          if (values.nodeType === 'vision') {
            config.vision = {
              model: values.visionModel,
              imageVariable: values.visionImageVariable,
              prompt: values.visionPrompt,
              outputVariable: values.visionOutputVariable || 'vision_result',
            };
          }

          if (values.nodeType === 'email') {
            config.email = {
              to: values.emailTo,
              cc: values.emailCc,
              subject: values.emailSubject,
              body: values.emailBody,
              isHtml: values.emailIsHtml || false,
              attachments: values.emailAttachments,
            };
          }

          if (values.nodeType === 'variableAggregator') {
            config.variableAggregator = {
              inputVariables: values.aggregatorInputVariables || [],
              outputVariable: values.aggregatorOutputVariable || 'aggregator_result',
              format: values.aggregatorFormat || 'json',
              template: values.aggregatorTemplate,
            };
          }

          let jumpLabel = '';
          if (values.nodeType === 'condition' && config.condition?.targetNodeId) {
            const targetNode = nodes.find((n) => n.id === config.condition?.targetNodeId);
            if (targetNode) {
              jumpLabel = targetNode.data.label || targetNode.id;
            }
          }

          const typeLabelsMap = getTypeLabels(intl);
          return {
            ...node,
            data: {
              ...node.data,
              label: values.label,
              typeLabel: typeLabelsMap[values.nodeType as keyof typeof typeLabelsMap] || values.nodeType,
              config: config,
              jumpLabel: jumpLabel,
            },
          };
        }
        return node;
      });

      setNodes(updatedNodes);
      setConfigDrawerVisible(false);
      message.success(intl.formatMessage({ id: 'pages.workflow.designer.message.configSaved' }));
    });
  }, [selectedNode, configForm, nodes, setNodes, intl, message]);

  const validateWorkflow = useCallback(() => {
    const startNodes = nodes.filter((n) => n.data.nodeType === 'start');
    const endNodes = nodes.filter((n) => n.data.nodeType === 'end');

    if (startNodes.length === 0) {
      message.error(intl.formatMessage({ id: 'pages.workflow.designer.message.noStartNode' }));
      return false;
    }

    if (endNodes.length === 0) {
      message.error(intl.formatMessage({ id: 'pages.workflow.designer.message.noEndNode' }));
      return false;
    }

    // 检查所有节点是否连通
    const nodeIds = new Set(nodes.map((n) => n.id));
    const connectedNodes = new Set<string>();

    const dfs = (nodeId: string) => {
      if (connectedNodes.has(nodeId)) return;
      connectedNodes.add(nodeId);
      edges.forEach((edge) => {
        if (edge.source === nodeId) {
          dfs(edge.target);
        }
      });
    };

    startNodes.forEach((node) => dfs(node.id));

    if (connectedNodes.size !== nodeIds.size) {
      message.warning(intl.formatMessage({ id: 'pages.workflow.designer.message.disconnectedNodes' }));
    }

    return true;
  }, [nodes, edges, intl]);

  const handleSave = useCallback(() => {
    if (!validateWorkflow()) {
      return;
    }

    const workflowGraph: WorkflowGraph = {
      nodes: nodes.map((node) => {
        return {
          id: node.id,
          type: node.data.nodeType as 'start' | 'end' | 'approval' | 'condition' | 'ai' | 'aiJudge' | 'notification' | 'parallel' | 'httpRequest' | 'timer' | 'setVariable' | 'log' | 'parameterExtractor' | 'iteration' | 'answer' | 'knowledgeSearch' | 'tool',
          data: {
            nodeType: node.data.nodeType,
            label: node.data.label || '',
            config: deepCleanIdFields(node.data.config || {}),
          },
          position: {
            x: node.position.x,
            y: node.position.y,
          },
        };
      }),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label as string,
        data: {
          condition: edge.data?.condition,
        },
      })),
    };

    onSave?.(workflowGraph);
  }, [nodes, edges, validateWorkflow, onSave]);

  const handleDeleteNode = useCallback(() => {
    if (!selectedNode) {
      message.warning('请先选择要删除的节点');
      return;
    }

    confirm({
      title: '确认删除节点',
      content: '确定删除该流程节点？删除后与该节点关联的连线也会一并移除。',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        const targetId = selectedNode.id;
        setNodes((nds) => nds.filter((n) => n.id !== targetId));
        setEdges((eds) => eds.filter((e) => e.source !== targetId && e.target !== targetId));
        setSelectedNode(null);
        setConfigDrawerVisible(false);
        message.success('节点已删除');
      },
    });
  }, [selectedNode, setNodes, setEdges]);

  const activityCategories = useMemo(() => {
    const categories: Record<string, any[]> = {};
    Object.entries(NODE_CONFIGS).forEach(([key, config]) => {
      const cat = (config as any).category || '其他';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push({ type: key, ...config });
    });
    return categories;
  }, []);

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
                const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
                setNodes([...layoutedNodes]);
                setEdges([...layoutedEdges]);
                message.success('已自动重新排版');
              }}
            >
              自动排版
            </Button>
            <Button
              icon={<CheckCircleOutlined />}
              onClick={() => {
                if (validateWorkflow()) {
                  message.success(intl.formatMessage({ id: 'pages.message.success' }));
                }
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
      />
    </div>
  );
};

export default WorkflowDesigner;
