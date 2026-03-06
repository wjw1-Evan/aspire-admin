import React from 'react';
import {
  PlayCircleOutlined,
  StopOutlined,
  CheckOutlined,
  ApartmentOutlined,
  BranchesOutlined,
  RobotOutlined,
  BellOutlined,
  CloudSyncOutlined,
  HistoryOutlined,
  EditOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  RetweetOutlined,
  CommentOutlined,
  ReadOutlined,
  TeamOutlined,
  FunctionOutlined,
  CodeOutlined,
  UnorderedListOutlined,
  MenuOutlined,
  UserOutlined,
  SwitcherOutlined,
  ApiOutlined,
  ClockCircleOutlined,
  MessageOutlined,
  DatabaseOutlined,
  AimOutlined,
} from '@ant-design/icons';

export const NODE_CATEGORIES = {
  base: { label: '基础', order: 1 },
  logic: { label: '逻辑', order: 2 },
  ai: { label: 'AI', order: 3 },
  data: { label: '数据', order: 4 },
  integration: { label: '集成', order: 5 },
  flow: { label: '流程', order: 6 },
  advanced: { label: '高级', order: 7 },
};

export const NODE_CONFIGS = {
  start: {
    color: '#059669',
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
    icon: <PlayCircleOutlined />,
    category: 'base',
    description: '流程的起点，定义输入参数',
    version: '1.0.0',
  },
  end: {
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
    icon: <StopOutlined />,
    category: 'base',
    description: '流程的终点，返回结果',
    version: '1.0.0',
  },
  llm: {
    color: '#db2777',
    backgroundColor: '#fdf2f8',
    borderColor: '#ec4899',
    icon: <RobotOutlined />,
    category: 'ai',
    description: '大型语言模型调用节点',
    version: '1.0.0',
  },
  agent: {
    color: '#7c3aed',
    backgroundColor: '#f5f3ff',
    borderColor: '#8b5cf6',
    icon: <AimOutlined />,
    category: 'ai',
    description: 'AI Agent 节点，支持自主决策',
    version: '1.0.0',
  },
  retrieval: {
    color: '#d97706',
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
    icon: <ReadOutlined />,
    category: 'ai',
    description: '知识库检索节点 (RAG)',
    version: '1.0.0',
  },
  questionClassifier: {
    color: '#0891b2',
    backgroundColor: '#ecfeff',
    borderColor: '#06b6d4',
    icon: <SwitcherOutlined />,
    category: 'ai',
    description: '问题分类节点',
    version: '1.0.0',
  },
  parameterExtractor: {
    color: '#0284c7',
    backgroundColor: '#f0f9ff',
    borderColor: '#0ea5e9',
    icon: <FunctionOutlined />,
    category: 'ai',
    description: '从文本提取结构化参数',
    version: '1.0.0',
  },
  approval: {
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
    icon: <CheckOutlined />,
    category: 'flow',
    description: '人工审批环节',
    version: '1.0.0',
  },
  humanInput: {
    color: '#0f766e',
    backgroundColor: '#f0fdfa',
    borderColor: '#0d9488',
    icon: <UserOutlined />,
    category: 'flow',
    description: '人工输入节点 (Human-in-the-loop)',
    version: '1.0.0',
  },
  condition: {
    color: '#d97706',
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
    icon: <ApartmentOutlined />,
    category: 'logic',
    description: '条件分支判断',
    version: '1.0.0',
  },
  ifElse: {
    color: '#d97706',
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
    icon: <BranchesOutlined />,
    category: 'logic',
    description: 'If/Else 条件分支',
    version: '1.0.0',
  },
  parallel: {
    color: '#7c3aed',
    backgroundColor: '#f5f3ff',
    borderColor: '#8b5cf6',
    icon: <BranchesOutlined />,
    category: 'logic',
    description: '并行分支网关',
    version: '1.0.0',
  },
  loop: {
    color: '#7c3aed',
    backgroundColor: '#f5f3ff',
    borderColor: '#8b5cf6',
    icon: <RetweetOutlined />,
    category: 'logic',
    description: '循环处理列表数据',
    version: '1.0.0',
  },
  httpRequest: {
    color: '#4f46e5',
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
    icon: <ApiOutlined />,
    category: 'integration',
    description: '发送外部 HTTP 请求',
    version: '1.0.0',
  },
  tool: {
    color: '#db2777',
    backgroundColor: '#fdf2f8',
    borderColor: '#ec4899',
    icon: <ThunderboltOutlined />,
    category: 'integration',
    description: '调用外部工具',
    version: '1.0.0',
  },
  knowledge: {
    color: '#d97706',
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
    icon: <DatabaseOutlined />,
    category: 'data',
    description: '知识库检索',
    version: '1.0.0',
  },
  code: {
    color: '#0d9488',
    backgroundColor: '#f0fdfa',
    borderColor: '#14b8a6',
    icon: <CodeOutlined />,
    category: 'data',
    description: '执行代码处理数据',
    version: '1.0.0',
  },
  template: {
    color: '#ea580c',
    backgroundColor: '#fff7ed',
    borderColor: '#f97316',
    icon: <FileTextOutlined />,
    category: 'data',
    description: '模板转换',
    version: '1.0.0',
  },
  variableAssigner: {
    color: '#0d9488',
    backgroundColor: '#f0fdfa',
    borderColor: '#14b8a6',
    icon: <EditOutlined />,
    category: 'data',
    description: '变量赋值',
    version: '1.0.0',
  },
  variableAggregator: {
    color: '#0d9488',
    backgroundColor: '#f0fdfa',
    borderColor: '#14b8a6',
    icon: <UnorderedListOutlined />,
    category: 'data',
    description: '变量聚合',
    version: '1.0.0',
  },
  listOperator: {
    color: '#0d9488',
    backgroundColor: '#f0fdfa',
    borderColor: '#14b8a6',
    icon: <MenuOutlined />,
    category: 'data',
    description: '列表操作',
    version: '1.0.0',
  },
  documentExtractor: {
    color: '#475569',
    backgroundColor: '#f8fafc',
    borderColor: '#64748b',
    icon: <FileTextOutlined />,
    category: 'data',
    description: '文档提取器',
    version: '1.0.0',
  },
  notification: {
    color: '#ea580c',
    backgroundColor: '#fff7ed',
    borderColor: '#f97316',
    icon: <BellOutlined />,
    category: 'integration',
    description: '发送系统或邮件通知',
    version: '1.0.0',
  },
  timer: {
    color: '#d97706',
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
    icon: <ClockCircleOutlined />,
    category: 'flow',
    description: '定时或延时执行',
    version: '1.0.0',
  },
  setVariable: {
    color: '#0d9488',
    backgroundColor: '#f0fdfa',
    borderColor: '#14b8a6',
    icon: <EditOutlined />,
    category: 'data',
    description: '设置或修改流程变量',
    version: '1.0.0',
  },
  log: {
    color: '#475569',
    backgroundColor: '#f8fafc',
    borderColor: '#64748b',
    icon: <FileTextOutlined />,
    category: 'advanced',
    description: '记录执行日志',
    version: '1.0.0',
  },
  answer: {
    color: '#059669',
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
    icon: <CommentOutlined />,
    category: 'base',
    description: '返回响应结果',
    version: '1.0.0',
  },
};

export const NODE_TYPE_LABELS: Record<string, string> = {
  start: '开始',
  end: '结束',
  llm: 'LLM',
  agent: 'Agent',
  retrieval: '知识检索',
  questionClassifier: '问题分类',
  parameterExtractor: '参数提取',
  approval: '审批',
  humanInput: '人工输入',
  condition: '条件分支',
  ifElse: 'If/Else',
  parallel: '并行分支',
  loop: '循环',
  httpRequest: 'HTTP 请求',
  tool: '工具调用',
  knowledge: '知识库',
  code: '代码执行',
  template: '模板转换',
  variableAssigner: '变量赋值',
  variableAggregator: '变量聚合',
  listOperator: '列表操作',
  documentExtractor: '文档提取',
  notification: '通知',
  timer: '定时器',
  setVariable: '设置变量',
  log: '日志',
  answer: '回复',
};

export const NODE_DESCRIPTIONS: Record<string, string> = {
  start: '定义工作流的入口点和输入参数',
  end: '工作流执行完成，返回结果',
  llm: '使用大型语言模型 generate 内容',
  agent: 'AI Agent 可自主决策和调用工具',
  retrieval: '从知识库中检索相关内容',
  questionClassifier: '使用 AI 对问题进行分类',
  parameterExtractor: '从文本中提取结构化参数',
  approval: '人工审批流程节点',
  humanInput: '暂停工作流等待人工输入',
  condition: '基于条件表达式的分支判断',
  ifElse: 'If/Else 条件分支',
  parallel: '并行执行多个分支',
  loop: '循环遍历数组执行',
  httpRequest: '调用外部 HTTP API',
  tool: '调用定义的工具',
  knowledge: '检索知识库内容',
  code: '执行 Python/JavaScript 代码',
  template: '使用模板语法生成文本',
  variableAssigner: '修改变量值',
  variableAggregator: '聚合多个变量',
  listOperator: '对列表进行操作',
  documentExtractor: '从文档中提取内容',
  notification: '发送通知消息',
  timer: '定时触发或延时',
  setVariable: '设置流程变量',
  log: '记录日志',
  answer: '向用户返回响应',
};

export const DEFAULT_NODE_CONFIGS: Partial<Record<string, any>> = {
  llm: {
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 2000,
    responseFormat: 'text',
  },
  agent: {
    strategy: 'react',
    maxIterations: 10,
    tools: [],
    memory: { enabled: false, maxMessages: 10 },
  },
  retrieval: {
    topK: 3,
    retrievalStrategy: 'semantic_search',
    scoreThreshold: 0.5,
  },
  code: {
    language: 'python',
    inputVariables: [],
    outputVariable: 'code_result',
  },
  httpRequest: {
    method: 'GET',
    timeout: 30,
  },
  timer: {
    waitDuration: '00:00:00',
  },
  parallel: {
    mode: 'parallel',
  },
};

export const CustomNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeType = data.nodeType as keyof typeof NODE_CONFIGS;
  const config = NODE_CONFIGS[nodeType] || NODE_CONFIGS.answer;

  const renderBody = () => {
    switch (nodeType) {
      case 'llm':
        return data.config?.llm?.model 
          ? `模型: ${data.config.llm.model}` 
          : '等待配置 LLM...';
      case 'agent':
        return data.config?.agent?.strategy 
          ? `策略: ${data.config.agent.strategy}` 
          : '等待配置 Agent...';
      case 'approval':
        const approversCount = data.config?.approval?.approvers?.length || 0;
        return `${approversCount > 0 ? `配置了 ${approversCount} 条审批规则` : '未配置审批人'}`;
      case 'condition':
      case 'ifElse':
        return data.config?.condition?.conditions?.length 
          ? `条件: ${data.config.condition.conditions.length} 条` 
          : '等待配置条件...';
      case 'retrieval':
        return data.config?.retrieval?.knowledgeBaseId 
          ? `知识库: ${data.config.retrieval.knowledgeBaseId.substring(0, 10)}...` 
          : '等待配置检索...';
      case 'questionClassifier':
        const classesCount = data.config?.questionClassifier?.classes?.length || 0;
        return classesCount > 0 ? `分类: ${classesCount} 个类别` : '等待配置分类...';
      case 'parameterExtractor':
        const paramsCount = data.config?.parameterExtractor?.parameters?.length || 0;
        return paramsCount > 0 ? `提取: ${paramsCount} 个参数` : '等待配置参数...';
      case 'humanInput':
        return data.config?.humanInput?.inputLabel || '等待人工输入...';
      case 'parallel':
        return data.config?.parallel?.branches?.length 
          ? `分支: ${data.config.parallel.branches.length} 个` 
          : '并行分支';
      case 'loop':
        return data.config?.iteration?.iteratorVariable 
          ? `迭代: ${data.config.iteration.iteratorVariable}` 
          : '等待配置迭代...';
      case 'start':
        return data.config?.form?.formDefinitionId ? '已绑定启动表单' : '流程开始';
      case 'end':
        return '流程结束';
      case 'httpRequest':
        return data.config?.http?.url 
          ? `${data.config.http.method || 'GET'} ${data.config.http.url.substring(0, 15)}...` 
          : '待配置 HTTP';
      case 'timer':
        return data.config?.timer?.waitDuration 
          ? `等待: ${data.config.timer.waitDuration}` 
          : data.config?.timer?.cron 
            ? `Cron: ${data.config.timer.cron}` 
            : '待配置时间';
      case 'setVariable':
      case 'variableAssigner':
        return data.config?.variable?.name 
          ? `设置: ${data.config.variable.name}` 
          : '未指定变量';
      case 'code':
        return data.config?.code?.language 
          ? `代码: ${data.config.code.language}` 
          : '等待配置代码...';
      case 'template':
        return data.config?.template?.template 
          ? `模板: ${data.config.template.template.substring(0, 15)}...` 
          : '等待配置模板...';
      case 'log':
        return data.config?.log?.message 
          ? `日志: ${data.config.log.message.substring(0, 15)}...` 
          : '空日志';
      case 'notification':
        const recipientsCount = data.config?.notification?.recipients?.length || 0;
        return recipientsCount > 0 ? `通知: ${recipientsCount} 个接收者` : '待配置通知';
      case 'answer':
        return data.config?.answer?.answer 
          ? `回复: ${data.config.answer.answer.substring(0, 15)}...` 
          : '等待配置回复...';
      case 'knowledge':
        return data.config?.knowledge?.knowledgeBaseIds?.length 
          ? `知识库: ${data.config.knowledge.knowledgeBaseIds.length} 个` 
          : '等待配置知识库...';
      case 'tool':
        return data.config?.tool?.tool ? `工具: ${data.config.tool.tool}` : '等待配置工具...';
      default:
        return data.description || '未配置';
    }
  };

  return (
    <div
      className={`elsa-node-wrapper ${selected ? 'workflow-node-selected' : ''}`}
      style={{
        '--node-accent-color': config.color,
        borderColor: selected ? config.color : 'rgba(226, 232, 240, 0.8)',
      } as React.CSSProperties}
    >
      <Handle type="target" position={Position.Top} />
      <div className="elsa-node-header">
        <div className="elsa-node-icon" style={{ 
          background: config.backgroundColor, 
          color: config.color,
          borderColor: `rgba(${parseInt(config.color.slice(1,3), 16)}, ${parseInt(config.color.slice(3,5), 16)}, ${parseInt(config.color.slice(5,7), 16)}, 0.1)`
        }}>
          {config.icon}
        </div>
        <div className="elsa-node-title">
          {data.label || NODE_TYPE_LABELS[nodeType] || nodeType}
        </div>
      </div>
      <div className="elsa-node-body">
        {renderBody()}
      </div>
      <div className="elsa-node-footer">
        <HistoryOutlined />
        <span>v{config.version || '1.0.0'}</span>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

const baseEdgeStyle = {
  stroke: '#94a3b8',
  strokeWidth: 2,
};

export const ConditionEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  label,
  selected,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <path
        id={id}
        style={{
          ...baseEdgeStyle,
          stroke: selected ? '#3b82f6' : baseEdgeStyle.stroke,
          strokeWidth: selected ? 3 : baseEdgeStyle.strokeWidth,
        }}
        className="react-flow__edge-path"
        d={edgePath}
      />
      {label && (
        <foreignObject x={labelX - 50} y={labelY - 10} width={100} height={20}>
          <div
            style={{
              textAlign: 'center',
              fontSize: 12,
              color: '#64748b',
              background: '#fff',
              padding: '2px 6px',
              borderRadius: 4,
              border: '1px solid #e2e8f0',
            }}
          >
            {label}
          </div>
        </foreignObject>
      )}
    </>
  );
};

function getControlPoint(
  x1: number,
  y1: number,
  position: Position,
  x2: number,
  y2: number,
  curvature: number
) {
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);

  switch (position) {
    case Position.Top:
      return { x: x1, y: y1 - dy * curvature };
    case Position.Bottom:
      return { x: x1, y: y1 + dy * curvature };
    case Position.Left:
      return { x: x1 - dx * curvature, y: y1 };
    case Position.Right:
      return { x: x1 + dx * curvature, y: y1 };
    default:
      return { x: x1, y: y1 };
  }
}

export const nodeTypes: Record<string, React.FC<NodeProps>> = {
  workflowNode: CustomNode,
};

export const edgeTypes: Record<string, React.FC<EdgeProps>> = {
  workflowEdge: ConditionEdge,
};

import { NodeProps, EdgeProps, Position, getBezierPath, Handle } from 'reactflow';
