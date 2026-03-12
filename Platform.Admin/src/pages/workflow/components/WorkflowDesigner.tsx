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
        {!readOnly && (
          <>
            <div className={`elsa-activity-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
              <div className="sidebar-header">
                <span>组件库</span>
              </div>
              <div className="sidebar-content">
                {Object.entries(activityCategories).map(([category, items]) => (
                  <div className="category-group" key={category}>
                    <div className="category-title">{category}</div>
                    {items.map((item) => (
                      <div 
                        className="activity-item" 
                        key={item.type} 
                        onClick={() => addNode(item.type)}
                        onDragStart={(event) => onDragStart(event, item.type)}
                        draggable
                        title="可拖动到右侧区域添加组件"
                      >
                        <div className="activity-icon" style={{ backgroundColor: item.backgroundColor, color: item.color }}>
                          {item.icon}
                        </div>
                        <div className="activity-info">
                          <div className="activity-label">
                            {intl.formatMessage({ id: `pages.workflow.designer.add${item.type.charAt(0).toUpperCase() + item.type.slice(1)}` })}
                          </div>
                          <div className="activity-desc">{item.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className={`sidebar-toggle-btn ${sidebarCollapsed ? 'collapsed' : ''}`} onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
              {sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </div>
          </>
        )}

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

      <Drawer
        title={
          <Space>
            <InfoCircleOutlined style={{ color: '#3b82f6' }} />
            <span>{intl.formatMessage({ id: 'pages.workflow.designer.nodeConfig' })}</span>
          </Space>
        }
        open={configDrawerVisible}
        onClose={() => setConfigDrawerVisible(false)}
        size="large"
        className="node-drawer"
        extra={
          <Space>
            {selectedNode?.data.nodeType !== 'start' && !readOnly && (
              <Button danger icon={<DeleteOutlined />} onClick={handleDeleteNode}>
                {intl.formatMessage({ id: 'pages.workflow.designer.delete' })}
              </Button>
            )}
            <Button onClick={() => setConfigDrawerVisible(false)}>{intl.formatMessage({ id: 'pages.workflow.designer.cancel' })}</Button>
            <Button type="primary" onClick={handleSaveConfig} icon={<SaveOutlined />} disabled={readOnly}>
              {intl.formatMessage({ id: 'pages.workflow.designer.save' })}
            </Button>
          </Space>
        }
      >
        <Form form={configForm} layout="vertical" disabled={readOnly}>
          <Tabs
            defaultActiveKey="basic"
            className="config-tabs"
            items={[
              {
                key: 'basic',
                label: '基础信息',
                children: (
                  <>
                    <Form.Item name="nodeType" label={intl.formatMessage({ id: 'pages.workflow.designer.nodeType' })}>
                      <Select disabled>
                        {Object.keys(NODE_CONFIGS).map(key => (
                          <Select.Option key={key} value={key}>
                            {intl.formatMessage({ id: `pages.workflow.designer.add${key.charAt(0).toUpperCase() + key.slice(1)}` })}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Form.Item name="label" label={intl.formatMessage({ id: 'pages.workflow.designer.nodeLabel' })} rules={[{ required: true }]}>
                      <Input placeholder={intl.formatMessage({ id: 'pages.workflow.designer.nodeLabel' })} />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: 'business',
                label: '业务规则',
                children: (
                  <>
                    {selectedNode?.data.nodeType === 'approval' && (
                      <>
                        <Form.Item
                          name="approvalType"
                          label={intl.formatMessage({ id: 'pages.workflow.designer.approvalType' })}
                        >
                          <Select>
                            <Select.Option value={0}>{intl.formatMessage({ id: 'pages.workflow.designer.approvalType.all' })}</Select.Option>
                            <Select.Option value={1}>{intl.formatMessage({ id: 'pages.workflow.designer.approvalType.any' })}</Select.Option>
                            <Select.Option value={2}>{intl.formatMessage({ id: 'pages.workflow.designer.approvalType.sequential' })}</Select.Option>
                          </Select>
                        </Form.Item>

                        <Divider titlePlacement="left" plain>审批人设置</Divider>
                        <Form.Item name="approvers">
                          <Form.List name="approvers">
                            {(fields, { add, remove }) => (
                              <>
                                {fields.map(({ key, name, ...restField }) => (
                                  <Card size="small" styles={{ body: { marginBottom: 12, background: '#f8fafc' } }} key={key} extra={<DeleteOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                      <Form.Item {...restField} name={[name, 'type']} rules={[{ required: true }]} style={{ marginBottom: 8 }}>
                                        <Select placeholder="审批方式">
                                          <Select.Option value={0}>指定用户</Select.Option>
                                          <Select.Option value={1}>指定角色</Select.Option>
                                          <Select.Option value={3}>表单字段</Select.Option>
                                        </Select>
                                      </Form.Item>
                                      <Form.Item noStyle shouldUpdate={(prev, curr) => prev.approvers?.[name]?.type !== curr.approvers?.[name]?.type}>
                                        {({ getFieldValue }) => {
                                          const type = getFieldValue(['approvers', name, 'type']);
                                          if (type === 0) return <Form.Item {...restField} name={[name, 'userIds']} rules={[{ required: true }]}><Select mode="multiple" placeholder="选择用户" options={users.map(u => ({ label: u.name || u.username, value: u.id }))} /></Form.Item>;
                                          if (type === 1) return <Form.Item {...restField} name={[name, 'roleIds']} rules={[{ required: true }]}><Select mode="multiple" placeholder="选择角色" options={roles.map(r => ({ label: r.name, value: r.id }))} /></Form.Item>;
                                          if (type === 3) return <Form.Item {...restField} name={[name, 'formFieldKey']} rules={[{ required: true }]}><Input placeholder="输入表单字段 Key" /></Form.Item>;
                                          return null;
                                        }}
                                      </Form.Item>
                                    </div>
                                  </Card>
                                ))}
                                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>添加审批人</Button>
                              </>
                            )}
                          </Form.List>
                        </Form.Item>
                      </>
                    )}

                    {selectedNode?.data.nodeType === 'condition' && (
                      <Form.Item name="expression" label="条件表达式 (C#)">
                        <Input.TextArea rows={4} placeholder="例如: Request.Amount > 1000" />
                      </Form.Item>
                    )}

                    {selectedNode?.data.nodeType === 'ai' && (
                      <>
                        <Form.Item name="aiInputVariable" label="输入变量" tooltip="读取此流程变量作为 AI 的输入上下文">
                          <Input placeholder="例如: form_data, http_result" />
                        </Form.Item>
                        <Form.Item name="systemPrompt" label="系统设定 (System Prompt)">
                          <Mentions rows={3} prefix={['{{']}>
                            {availableVariables.map(v => (
                              <Option key={v.value} value={v.value}>{v.label}</Option>
                            ))}
                          </Mentions>
                        </Form.Item>
                        <Form.Item name="promptTemplate" label="提示词模板 (User Prompt)">
                          <Mentions rows={5} placeholder="可使用 {{variable}} 引用输入变量" prefix={['{{']}>
                            {availableVariables.map(v => (
                              <Option key={v.value} value={v.value}>{v.label}</Option>
                            ))}
                          </Mentions>
                        </Form.Item>
                        <Form.Item name="outputVariable" label="输出变量" tooltip="将 AI 的输出结果保存到此流程变量" initialValue="ai_result">
                          <Input placeholder="例如: ai_result" />
                        </Form.Item>
                      </>
                    )}

                    {selectedNode?.data.nodeType === 'llm' && (
                      <>
                        <Form.Item name="llmModel" label="模型" tooltip="选择要使用的 LLM 模型">
                          <Input placeholder="例如: gpt-4o, gpt-4o-mini" />
                        </Form.Item>
                        <Form.Item name="llmProvider" label="模型提供商">
                          <Select placeholder="选择提供商">
                            <Select.Option value="openai">OpenAI</Select.Option>
                            <Select.Option value="azure">Azure OpenAI</Select.Option>
                            <Select.Option value="anthropic">Anthropic</Select.Option>
                            <Select.Option value="custom">自定义</Select.Option>
                          </Select>
                        </Form.Item>
                        <Form.Item name="llmMode" label="模式">
                          <Select>
                            <Select.Option value="chat">对话</Select.Option>
                            <Select.Option value="completion">补全</Select.Option>
                          </Select>
                        </Form.Item>
                        <Form.Item name="llmSystemPrompt" label="系统提示词">
                          <Mentions rows={3} placeholder="设定 AI 的角色和行为" prefix={['{{']}>
                            {availableVariables.map(v => (
                              <Option key={v.value} value={v.value}>{v.label}</Option>
                            ))}
                          </Mentions>
                        </Form.Item>
                        <Form.Item name="llmPrompt" label="用户提示词">
                          <Mentions rows={4} placeholder="可使用 {{variable}} 引用变量" prefix={['{{']}>
                            {availableVariables.map(v => (
                              <Option key={v.value} value={v.value}>{v.label}</Option>
                            ))}
                          </Mentions>
                        </Form.Item>
                        <div style={{ display: 'flex', gap: 16 }}>
                          <Form.Item name="llmTemperature" label="Temperature" style={{ flex: 1 }}>
                            <Input type="number" step="0.1" min={0} max={2} placeholder="0.7" />
                          </Form.Item>
                          <Form.Item name="llmMaxTokens" label="最大 Token" style={{ flex: 1 }}>
                            <Input type="number" placeholder="2000" />
                          </Form.Item>
                        </div>
                        <Form.Item name="llmResponseFormat" label="响应格式">
                          <Select>
                            <Select.Option value="text">文本</Select.Option>
                            <Select.Option value="json">JSON</Select.Option>
                          </Select>
                        </Form.Item>
                        <Form.Item name="llmOutputVariable" label="输出变量" initialValue="llm_result">
                          <Input placeholder="llm_result" />
                        </Form.Item>
                      </>
                    )}

                    {selectedNode?.data.nodeType === 'agent' && (
                      <>
                        <Form.Item name="agentStrategy" label="策略" tooltip="Agent 的推理策略">
                          <Select>
                            <Select.Option value="react">ReAct</Select.Option>
                            <Select.Option value="function_calling">Function Calling</Select.Option>
                            <Select.Option value="cot">Chain of Thought</Select.Option>
                            <Select.Option value="tot">Tree of Thought</Select.Option>
                          </Select>
                        </Form.Item>
                        <Form.Item name="agentModel" label="模型">
                          <Input placeholder="例如: gpt-4o" />
                        </Form.Item>
                        <Form.Item name="agentSystemPrompt" label="系统提示词">
                          <Mentions rows={4} placeholder="设定 Agent 的角色、目标和行为规则" prefix={['{{']}>
                            {availableVariables.map(v => (
                              <Option key={v.value} value={v.value}>{v.label}</Option>
                            ))}
                          </Mentions>
                        </Form.Item>
                        <Form.Item name="agentMaxIterations" label="最大迭代次数" tooltip="Agent 最大思考和行动次数">
                          <Input type="number" placeholder="10" />
                        </Form.Item>
                        <Divider>记忆设置</Divider>
                        <Form.Item name="agentMemoryEnabled" label="启用记忆" valuePropName="checked">
                          <Switch />
                        </Form.Item>
                        <Form.Item noStyle shouldUpdate={(prev, curr) => prev.agentMemoryEnabled !== curr.agentMemoryEnabled}>
                          {({ getFieldValue }) => getFieldValue('agentMemoryEnabled') && (
                            <Form.Item name="agentMemoryMaxMessages" label="记忆消息数">
                              <Input type="number" placeholder="10" />
                            </Form.Item>
                          )}
                        </Form.Item>
                        <Form.Item name="agentOutputVariable" label="输出变量" initialValue="agent_result">
                          <Input placeholder="agent_result" />
                        </Form.Item>
                      </>
                    )}

                    {selectedNode?.data.nodeType === 'retrieval' && (
                      <>
                        <Form.Item name="retrievalQuery" label="检索查询" tooltip="搜索词，支持变量引用">
                          <Mentions rows={2} placeholder="{{query}}" prefix={['{{']}>
                            {availableVariables.map(v => (
                              <Option key={v.value} value={v.value}>{v.label}</Option>
                            ))}
                          </Mentions>
                        </Form.Item>
                        <Form.Item name="retrievalKnowledgeBaseId" label="知识库 ID">
                          <Input placeholder="知识库 ID" />
                        </Form.Item>
                        <Form.Item name="retrievalStrategy" label="检索策略">
                          <Select>
                            <Select.Option value="semantic_search">语义搜索</Select.Option>
                            <Select.Option value="full_text_search">全文搜索</Select.Option>
                            <Select.Option value="hybrid_search">混合搜索</Select.Option>
                          </Select>
                        </Form.Item>
                        <div style={{ display: 'flex', gap: 16 }}>
                          <Form.Item name="retrievalTopK" label="Top K" initialValue={3} style={{ flex: 1 }}>
                            <Input type="number" />
                          </Form.Item>
                          <Form.Item name="retrievalScoreThreshold" label="分数阈值" initialValue={0.5} style={{ flex: 1 }}>
                            <Input type="number" step="0.1" />
                          </Form.Item>
                        </div>
                        <Form.Item name="retrievalOutputVariable" label="输出变量" initialValue="retrieved_documents">
                          <Input placeholder="retrieved_documents" />
                        </Form.Item>
                      </>
                    )}

                    {selectedNode?.data.nodeType === 'knowledge' && (
                      <>
                        <Form.Item name="knowledgeQuery" label="检索查询" rules={[{ required: true }]}>
                          <Mentions rows={2} placeholder="搜索词，支持变量引用" prefix={['{{']}>
                            {availableVariables.map(v => (
                              <Option key={v.value} value={v.value}>{v.label}</Option>
                            ))}
                          </Mentions>
                        </Form.Item>
                        <Form.Item name="knowledgeQueryVariable" label="查询变量" tooltip="如果不设置，则使用当前输入数据">
                          <Input placeholder="例如: user_query" />
                        </Form.Item>
                        <Form.Item name="knowledgeBaseIds" label="知识库 ID 列表">
                          <Select mode="multiple" placeholder="选择知识库">
                            <Select.Option value="kb1">知识库 1</Select.Option>
                            <Select.Option value="kb2">知识库 2</Select.Option>
                          </Select>
                        </Form.Item>
                        <Form.Item name="knowledgeRetrievalMode" label="检索模式">
                          <Select>
                            <Select.Option value="semantic_search">语义搜索</Select.Option>
                            <Select.Option value="full_text_search">全文搜索</Select.Option>
                            <Select.Option value="hybrid_search">混合搜索</Select.Option>
                          </Select>
                        </Form.Item>
                        <div style={{ display: 'flex', gap: 16 }}>
                          <Form.Item name="knowledgeTopK" label="Top K" initialValue={3} style={{ flex: 1 }}>
                            <Input type="number" />
                          </Form.Item>
                          <Form.Item name="knowledgeScoreThreshold" label="分数阈值" style={{ flex: 1 }}>
                            <Input type="number" step="0.1" />
                          </Form.Item>
                        </div>
                        <Form.Item name="knowledgeOutputVariable" label="输出变量" initialValue="search_results">
                          <Input placeholder="search_results" />
                        </Form.Item>
                      </>
                    )}

                    {selectedNode?.data.nodeType === 'humanInput' && (
                      <>
                        <Form.Item name="humanInputLabel" label="输入标签" initialValue="请输入">
                          <Input placeholder="请输入" />
                        </Form.Item>
                        <Form.Item name="humanInputType" label="输入类型">
                          <Select>
                            <Select.Option value="text">文本</Select.Option>
                            <Select.Option value="textarea">多行文本</Select.Option>
                            <Select.Option value="number">数字</Select.Option>
                            <Select.Option value="select">选择</Select.Option>
                          </Select>
                        </Form.Item>
                        <Form.Item name="humanInputDescription" label="说明文字">
                          <Input.TextArea rows={2} placeholder="描述输入的用途或要求" />
                        </Form.Item>
                        <Form.Item name="humanInputTimeout" label="超时时间（秒）">
                          <Input type="number" placeholder="不超时" />
                        </Form.Item>
                      </>
                    )}

                    {selectedNode?.data.nodeType === 'speechToText' && (
                      <>
                        <Form.Item name="sttInputVariable" label="输入变量" tooltip="包含音频内容的变量">
                          <Input placeholder="音频文件 URL 或 Base64" />
                        </Form.Item>
                        <Form.Item name="sttProvider" label="服务提供商">
                          <Select defaultValue="openai">
                            <Select.Option value="openai">OpenAI Whisper</Select.Option>
                            <Select.Option value="azure">Azure Speech</Select.Option>
                            <Select.Option value="google">Google Cloud Speech</Select.Option>
                          </Select>
                        </Form.Item>
                        <Form.Item name="sttLanguage" label="识别语言" tooltip="留空则自动检测">
                          <Input placeholder="例如: zh-CN, en-US" />
                        </Form.Item>
                        <Form.Item name="sttOutputVariable" label="输出变量" initialValue="stt_result">
                          <Input placeholder="stt_result" />
                        </Form.Item>
                      </>
                    )}

                    {selectedNode?.data.nodeType === 'textToSpeech' && (
                      <>
                        <Form.Item name="ttsInputVariable" label="文本变量" tooltip="需要转音频的文本">
                          <Input placeholder="例如: ai_result" />
                        </Form.Item>
                        <Form.Item name="ttsProvider" label="服务提供商">
                          <Select defaultValue="openai">
                            <Select.Option value="openai">OpenAI TTS</Select.Option>
                            <Select.Option value="azure">Azure Cognitive Speech</Select.Option>
                          </Select>
                        </Form.Item>
                        <Form.Item name="ttsVoice" label="声音" initialValue="alloy">
                          <Input placeholder="例如: alloy, echo, fable, onyx, nova, shimmer" />
                        </Form.Item>
                        <Form.Item name="ttsLanguage" label="语言" initialValue="zh-CN">
                          <Input placeholder="例如: zh-CN, en-US" />
                        </Form.Item>
                        <Form.Item name="ttsOutputVariable" label="输出变量" initialValue="tts_result">
                          <Input placeholder="tts_result" />
                        </Form.Item>
                      </>
                    )}

                    {selectedNode?.data.nodeType === 'vision' && (
                      <>
                        <Form.Item name="visionModel" label="模型" initialValue="gpt-4o">
                          <Input placeholder="gpt-4o" />
                        </Form.Item>
                        <Form.Item name="visionImageVariable" label="图像变量" tooltip="包含图像 URL 或 base64 的变量" rules={[{ required: true }]}>
                          <Input placeholder="image_url" />
                        </Form.Item>
                        <Form.Item name="visionPrompt" label="提示词模板" rules={[{ required: true }]}>
                          <Mentions rows={4} placeholder="描述此图像中看到了什么..." prefix={['{{']}>
                            {availableVariables.map(v => (
                              <Option key={v.value} value={v.value}>{v.label}</Option>
                            ))}
                          </Mentions>
                        </Form.Item>
                        <Form.Item name="visionOutputVariable" label="输出变量" initialValue="vision_result">
                          <Input placeholder="vision_result" />
                        </Form.Item>
                      </>
                    )}

                    {selectedNode?.data.nodeType === 'email' && (
                      <>
                        <Form.Item name="emailTo" label="收件人" rules={[{ required: true }]}>
                          <Input placeholder="example@mail.com 或 {{user_email}}" />
                        </Form.Item>
                        <Form.Item name="emailCc" label="抄送">
                          <Input placeholder="多个邮箱用分号隔开" />
                        </Form.Item>
                        <Form.Item name="emailSubject" label="邮件主题" rules={[{ required: true }]}>
                          <Input />
                        </Form.Item>
                        <Form.Item name="emailBody" label="邮件正文" rules={[{ required: true }]}>
                          <Mentions rows={5} placeholder="支持 HTML 和 {{variable}} 变量" prefix={['{{']}>
                            {availableVariables.map(v => (
                              <Option key={v.value} value={v.value}>{v.label}</Option>
                            ))}
                          </Mentions>
                        </Form.Item>
                        <Form.Item name="emailIsHtml" label="HTML 格式" valuePropName="checked" initialValue={true}>
                          <Switch />
                        </Form.Item>
                        <Form.Item name="emailAttachments" label="附件变量 (可选)">
                          <Input placeholder="file_url1, file_url2" />
                        </Form.Item>
                      </>
                    )}

                    {selectedNode?.data.nodeType === 'variableAggregator' && (
                      <>
                        <Form.Item name="aggregatorInputVariables" label="输入变量列表" rules={[{ required: true }]}>
                          <Select mode="tags" placeholder="输入并回车添加变量名" />
                        </Form.Item>
                        <Form.Item name="aggregatorFormat" label="聚合格式" initialValue="json">
                          <Select>
                            <Select.Option value="json">JSON 对象</Select.Option>
                            <Select.Option value="text">纯文本列表</Select.Option>
                            <Select.Option value="template">自定义模板</Select.Option>
                          </Select>
                        </Form.Item>
                        <Form.Item noStyle shouldUpdate={(prev, curr) => prev.aggregatorFormat !== curr.aggregatorFormat}>
                          {({ getFieldValue }) => getFieldValue('aggregatorFormat') === 'template' && (
                            <Form.Item name="aggregatorTemplate" label="聚合模板" rules={[{ required: true }]}>
                              <Mentions rows={4} placeholder="例如: 姓名: {{name}}, 分数: {{score}}" prefix={['{{']}>
                                {availableVariables.map(v => (
                                  <Option key={v.value} value={v.value}>{v.label}</Option>
                                ))}
                              </Mentions>
                            </Form.Item>
                          )}
                        </Form.Item>
                        <Form.Item name="aggregatorOutputVariable" label="输出变量" initialValue="aggregator_result">
                          <Input placeholder="aggregator_result" />
                        </Form.Item>
                      </>
                    )}

                    {selectedNode?.data.nodeType === 'code' && (
                      <>
                        <Form.Item name="codeLanguage" label="编程语言">
                          <Select>
                            <Select.Option value="python">Python</Select.Option>
                            <Select.Option value="javascript">JavaScript</Select.Option>
                          </Select>
                        </Form.Item>
                        <Form.Item name="codeInputVariables" label="输入变量" tooltip="声明需要使用的输入变量名">
                          <Select mode="tags" placeholder="输入变量名">
                          </Select>
                        </Form.Item>
                        <Form.Item name="codeCode" label="代码" rules={[{ required: true }]}>
                          <Input.TextArea rows={8} placeholder="def main(variables):&#10;    # 你的代码&#10;    return {'result': 'output'}" />
                        </Form.Item>
                        <Form.Item name="codeOutputVariable" label="输出变量" initialValue="code_result">
                          <Input placeholder="code_result" />
                        </Form.Item>
                      </>
                    )}

                    {selectedNode?.data.nodeType === 'template' && (
                      <>
                        <Form.Item name="templateContent" label="模板内容" rules={[{ required: true }]}>
                          <Mentions rows={4} placeholder="你好, {{name}}, 今天是 {{date}}" prefix={['{{']}>
                            {availableVariables.map(v => (
                              <Option key={v.value} value={v.value}>{v.label}</Option>
                            ))}
                          </Mentions>
                        </Form.Item>
                        <Form.Item name="templateOutputVariable" label="输出变量" initialValue="template_result">
                          <Input placeholder="template_result" />
                        </Form.Item>
                      </>
                    )}

                    {selectedNode?.data.nodeType === 'loop' && (
                      <>
                        <Form.Item name="loopIteratorVariable" label="迭代变量" tooltip="需要遍历的列表变量 (JSON 数组)">
                          <Input placeholder="例如: items_to_process" />
                        </Form.Item>
                        <Form.Item name="loopOutputVariable" label="输出变量" initialValue="iteration_results">
                          <Input placeholder="iteration_results" />
                        </Form.Item>
                      </>
                    )}

                    {selectedNode?.data.nodeType === 'notification' && (
                      <Form.Item name="notificationRemarks" label="通知内容模板">
                        <Mentions rows={4} prefix={['{{']}>
                          {availableVariables.map(v => (
                            <Option key={v.value} value={v.value}>{v.label}</Option>
                          ))}
                        </Mentions>
                      </Form.Item>
                    )}

                    {selectedNode?.data.nodeType === 'httpRequest' && (
                      <>
                        <Form.Item name="httpMethod" label="请求方法" initialValue="GET">
                          <Select>
                            <Select.Option value="GET">GET</Select.Option>
                            <Select.Option value="POST">POST</Select.Option>
                            <Select.Option value="PUT">PUT</Select.Option>
                            <Select.Option value="DELETE">DELETE</Select.Option>
                          </Select>
                        </Form.Item>
                        <Form.Item name="httpUrl" label="请求 URL" rules={[{ required: true }]}>
                          <Input placeholder="https://api.example.com/v1/..." />
                        </Form.Item>
                        <Form.Item name="httpHeaders" label="请求头 (JSON)">
                          <Input.TextArea rows={3} placeholder='{"Authorization": "BearerToken"}' />
                        </Form.Item>
                        <Form.Item name="httpBody" label="消息体 (Body)">
                          <Input.TextArea rows={4} />
                        </Form.Item>
                        <Form.Item name="httpOutputVariable" label="保存响应到变量" tooltip="将 HTTP 接口的响应结果保存为流程变量，供后续节点使用">
                          <Input placeholder="例如: api_result" />
                        </Form.Item>
                      </>
                    )}

                    {selectedNode?.data.nodeType === 'timer' && (
                      <>
                        <Form.Item name="timerWaitDuration" label="等待时长 (TimeSpan)" tooltip="如: 00:01:00 表示等待 1 分钟">
                          <Input placeholder="00:00:00" />
                        </Form.Item>
                        <Form.Item name="timerCron" label="Cron 表达式" tooltip="在特定时间点执行">
                          <Input placeholder="0 0/1 * * * ?" />
                        </Form.Item>
                      </>
                    )}

                    {selectedNode?.data.nodeType === 'setVariable' && (
                      <>
                        <Form.Item name="variableName" label="变量名称" rules={[{ required: true }]}>
                          <Input placeholder="my_variable" />
                        </Form.Item>
                        <Form.Item name="variableValue" label="变量值/表达式">
                          <Input.TextArea rows={2} />
                        </Form.Item>
                      </>
                    )}

                    {selectedNode?.data.nodeType === 'log' && (
                      <>
                        <Form.Item name="logLevel" label="日志级别" initialValue="Information">
                          <Select>
                            <Select.Option value="Information">Information</Select.Option>
                            <Select.Option value="Warning">Warning</Select.Option>
                            <Select.Option value="Error">Error</Select.Option>
                            <Select.Option value="Debug">Debug</Select.Option>
                          </Select>
                        </Form.Item>
                        <Form.Item name="logMessage" label="日志消息模板" rules={[{ required: true }]}>
                          <Mentions rows={3} prefix={['{{']}>
                            {availableVariables.map(v => (
                              <Option key={v.value} value={v.value}>{v.label}</Option>
                            ))}
                          </Mentions>
                        </Form.Item>
                      </>
                    )}

                    {selectedNode?.data.nodeType === 'aiJudge' && (
                      <>
                        <Form.Item name="judgeInputVariable" label="输入变量" tooltip="读取此流程变量作为判断依据">
                          <Input placeholder="例如: ai_result, form_data" />
                        </Form.Item>
                        <Form.Item name="judgeSystemPrompt" label="系统设定" tooltip="告诉 AI 判断的角色和规则">
                          <Mentions rows={2} placeholder="你是一个判断引擎，根据输入内容返回 true 或 false" prefix={['{{']}>
                            {availableVariables.map(v => (
                              <Option key={v.value} value={v.value}>{v.label}</Option>
                            ))}
                          </Mentions>
                        </Form.Item>
                        <Form.Item name="judgePrompt" label="判断提示词" rules={[{ required: true, message: '请输入判断提示词' }]}>
                          <Mentions rows={4} placeholder="根据以下内容判断是否符合规定：{{inputVariable}}。符合输出 true，不符合输出 false" prefix={['{{']}>
                            {availableVariables.map(v => (
                              <Option key={v.value} value={v.value}>{v.label}</Option>
                            ))}
                          </Mentions>
                        </Form.Item>
                        <Form.Item name="judgeOutputVariable" label="输出变量" tooltip="保存判断结果 (true/false) 到此变量" initialValue="judge_result">
                          <Input placeholder="judge_result" />
                        </Form.Item>
                      </>
                    )}

                    {selectedNode?.data.nodeType === 'parameterExtractor' && (
                      <>
                        <Form.Item name="extractorInputVariable" label="输入变量" tooltip="从中提取参数的文本变量">
                          <Input placeholder="例如: user_query, email_content" />
                        </Form.Item>
                        <Form.Item name="extractorParameters" label="参数定义 (JSON Array)" tooltip='例如: [{"name": "location", "type": "string", "description": "城市名称"}]'>
                          <Input.TextArea rows={4} placeholder='[{"name": "param1", "type": "string", "description": "..."}]' />
                        </Form.Item>
                        <Form.Item name="extractorOutputVariable" label="输出变量" tooltip="将提取出的参数保存到此变量">
                          <Input placeholder="extracted_params" />
                        </Form.Item>
                      </>
                    )}

                    {selectedNode?.data.nodeType === 'iteration' && (
                      <>
                        <Form.Item name="iterationIteratorVariable" label="迭代变量" tooltip="需要遍历的列表变量 (JSON 数组)">
                          <Input placeholder="例如: items_to_process" />
                        </Form.Item>
                        <Form.Item name="iterationOutputVariable" label="单项变量名" tooltip="在循环内部引用的当前项变量名" initialValue="item">
                          <Input placeholder="item" />
                        </Form.Item>
                      </>
                    )}

                    {selectedNode?.data.nodeType === 'answer' && (
                      <>
                        <Form.Item name="answerContent" label="回答内容" rules={[{ required: true }]}>
                          <Input.TextArea rows={6} placeholder="支持使用 {{variable}} 或 {{#node_id.field#}} 引用变量" />
                        </Form.Item>
                      </>
                    )}

                    {selectedNode?.data.nodeType === 'knowledgeSearch' && (
                      <>
                        <Form.Item name="knowledgeQuery" label="搜索查询" rules={[{ required: true }]}>
                          <Input.TextArea rows={3} placeholder="搜索词，支持变量引用" />
                        </Form.Item>
                        <div style={{ display: 'flex', gap: 16 }}>
                          <Form.Item name="knowledgeTopK" label="Top K" initialValue="3" style={{ flex: 1 }}>
                            <Input type="number" />
                          </Form.Item>
                          <Form.Item name="knowledgeScoreThreshold" label="分数阈值" initialValue="0.5" style={{ flex: 1 }}>
                            <Input type="number" step="0.1" />
                          </Form.Item>
                        </div>
                      </>
                    )}






                  </>
                ),
              },
              {
                key: 'advanced',
                label: '高级设置',
                children: (
                  <>
                    {selectedNode?.data.nodeType === 'approval' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <Form.Item name="allowDelegate" label="允许委托申请" valuePropName="checked"><Switch /></Form.Item>
                        <Form.Item name="allowReject" label="允许驳回" valuePropName="checked"><Switch /></Form.Item>
                        <Form.Item name="allowReturn" label="允许退回" valuePropName="checked"><Switch /></Form.Item>
                        <Form.Item name="timeoutHours" label="审批超时设置 (小时)"><Input type="number" /></Form.Item>
                      </div>
                    )}
                    {selectedNode?.data.nodeType === 'start' && (
                      <Form.Item name="formDefinitionId" label="绑定启动表单">
                        <Select placeholder="选择流程启动时需要填写的表单" allowClear options={forms.map(f => ({ label: f.name, value: f.id }))} />
                      </Form.Item>
                    )}
                  </>
                ),
              },
            ]}
          />
        </Form>
      </Drawer>
    </div>
  );
};

export default WorkflowDesigner;
