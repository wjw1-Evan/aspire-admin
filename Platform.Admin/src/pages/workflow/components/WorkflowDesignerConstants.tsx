import React from 'react';
import { Handle, Position, NodeProps, MarkerType } from 'reactflow';
import {
    PlayCircleOutlined,
    StopOutlined,
    CheckOutlined,
    ApartmentOutlined,
    BranchesOutlined,
    RobotOutlined,
    BellOutlined,
    InfoCircleOutlined,
    CloudSyncOutlined,
    HistoryOutlined,
    EditOutlined,
    FileTextOutlined,
    ThunderboltOutlined,
} from '@ant-design/icons';

// 节点类型配置 (Elsa 风格：包含分类信息)
export const NODE_CONFIGS = {
    start: {
        color: '#10b981',
        backgroundColor: '#ecfdf5',
        borderColor: '#10b981',
        icon: <PlayCircleOutlined />,
        category: '基础',
        description: '流程的起点',
    },
    end: {
        color: '#ef4444',
        backgroundColor: '#fef2f2',
        borderColor: '#ef4444',
        icon: <StopOutlined />,
        category: '基础',
        description: '流程的终点',
    },
    approval: {
        color: '#3b82f6',
        backgroundColor: '#eff6ff',
        borderColor: '#3b82f6',
        icon: <CheckOutlined />,
        category: '审批',
        description: '人工审批环节',
    },
    condition: {
        color: '#f59e0b',
        backgroundColor: '#fffbeb',
        borderColor: '#f59e0b',
        icon: <ApartmentOutlined />,
        category: '逻辑',
        description: '基于条件的分支判断',
    },
    parallel: {
        color: '#8b5cf6',
        backgroundColor: '#f5f3ff',
        borderColor: '#8b5cf6',
        icon: <BranchesOutlined />,
        category: '逻辑',
        description: '并行分发与汇聚',
    },
    ai: {
        color: '#ec4899',
        backgroundColor: '#fdf2f8',
        borderColor: '#ec4899',
        icon: <RobotOutlined />,
        category: '自动化',
        description: 'AI 自动处理节点',
    },
    notification: {
        color: '#f97316',
        backgroundColor: '#fff7ed',
        borderColor: '#f97316',
        icon: <BellOutlined />,
        category: '自动化',
        description: '发送系统或邮件通知',
    },
    httpRequest: {
        color: '#6366f1',
        backgroundColor: '#eef2ff',
        borderColor: '#6366f1',
        icon: <CloudSyncOutlined />,
        category: '集成',
        description: '发送外部 HTTP 请求',
    },
    timer: {
        color: '#f59e0b',
        backgroundColor: '#fffbeb',
        borderColor: '#f59e0b',
        icon: <HistoryOutlined />,
        category: '时间',
        description: '定时或延时执行后续动作',
    },
    setVariable: {
        color: '#14b8a6',
        backgroundColor: '#f0fdfa',
        borderColor: '#14b8a6',
        icon: <EditOutlined />,
        category: '数据',
        description: '设置或修改流程变量',
    },
    log: {
        color: '#64748b',
        backgroundColor: '#f8fafc',
        borderColor: '#64748b',
        icon: <FileTextOutlined />,
        category: '调试',
        description: '记录执行日志信息',
    },
    aiJudge: {
        color: '#d946ef',
        backgroundColor: '#fdf4ff',
        borderColor: '#d946ef',
        icon: <ThunderboltOutlined />,
        category: '自动化',
        description: 'AI 智能判断分支',
    },
};

export const CustomNode: React.FC<NodeProps> = ({ data, selected }) => {
    const nodeType = data.nodeType as keyof typeof NODE_CONFIGS;
    const config = NODE_CONFIGS[nodeType] || NODE_CONFIGS.approval;

    // 渲染节点主体描述 (Elsa 风格的 Summary)
    const renderBody = () => {
        switch (nodeType) {
            case 'approval':
                const approversCount = data.config?.approval?.approvers?.length || 0;
                return `${approversCount > 0 ? `配置了 ${approversCount} 条审批规则` : '未配置审批人'}`;
            case 'condition':
                return data.config?.condition?.expression ? `条件: ${data.config.condition.expression}` : '等待配置表达式...';
            case 'ai':
                return data.config?.ai?.promptTemplate ? `AI 提示词: ${data.config.ai.promptTemplate.substring(0, 20)}...` : '等待配置 AI 模板...';
            case 'notification':
                const remarks = data.config?.notification?.remarksTemplate;
                const recipientsCount = data.config?.notification?.recipients?.length || 0;
                if (remarks) return `通知: ${remarks.substring(0, 20)}${remarks.length > 20 ? '...' : ''}`;
                return recipientsCount > 0 ? `配置了 ${recipientsCount} 个接收者` : '待配置通知内容';
            case 'parallel':
                return '多分支并行执行';
            case 'start':
                return data.config?.form?.formDefinitionId ? '已绑定启动表单' : '流程开始';
            case 'end':
                return '流程结束';
            case 'httpRequest':
                return data.config?.http?.url ? `${data.config.http.method || 'GET'} ${data.config.http.url.substring(0, 20)}...` : '待配置 HTTP 地址';
            case 'timer':
                return data.config?.timer?.waitDuration ? `等待: ${data.config.timer.waitDuration}` : '待配置时间规则';
            case 'setVariable':
                return data.config?.variable?.name ? `设置: ${data.config.variable.name}` : '未指定变量';
            case 'log':
                return data.config?.log?.message ? `日志: ${data.config.log.message.substring(0, 20)}...` : '空日志';
            case 'aiJudge':
                return data.config?.aiJudge?.judgePrompt ? `判断: ${data.config.aiJudge.judgePrompt.substring(0, 20)}...` : '待配置判断规则';
            default:
                return '无更多描述';
        }
    };

    return (
        <div className={`elsa-node-wrapper ${selected ? 'workflow-node-selected' : ''}`}>
            <Handle type="target" position={Position.Top} />

            <div className="elsa-node-header">
                <div className="elsa-node-icon" style={{ backgroundColor: config.backgroundColor, color: config.color }}>
                    {config.icon}
                </div>
                <div className="elsa-node-title">
                    {data.label || data.typeLabel}
                </div>
            </div>

            <div className="elsa-node-body">
                {renderBody()}
            </div>

            {(data.jumpLabel || data.config?.form?.formDefinitionId) && (
                <div className="elsa-node-footer">
                    <InfoCircleOutlined />
                    {data.jumpLabel ? (
                        <>跳转至: <span style={{ color: '#3b82f6' }}>{data.jumpLabel}</span></>
                    ) : (
                        <span>关联表单已保存</span>
                    )}
                </div>
            )}

            <Handle type="source" position={Position.Bottom} />
        </div>
    );
};

export const nodeTypes = {
    workflowNode: CustomNode,
};

// 自定义 Edge 组件：选中时高亮并显示删除按钮
import { getSmoothStepPath, EdgeProps, useReactFlow } from 'reactflow';

export const WorkflowEdge: React.FC<EdgeProps> = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    selected,
}) => {
    const { setEdges } = useReactFlow();
    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: 16,
    });

    const onDelete = (evt: React.MouseEvent) => {
        evt.stopPropagation();
        setEdges((eds) => eds.filter((e) => e.id !== id));
    };

    return (
        <>
            <path
                id={id}
                style={{
                    ...style,
                    stroke: selected ? '#3b82f6' : style.stroke,
                    strokeWidth: selected ? 3 : style.strokeWidth,
                }}
                className="react-flow__edge-path"
                d={edgePath}
                markerEnd={markerEnd}
            />
            {selected && (
                <g transform={`translate(${labelX}, ${labelY})`} onClick={onDelete} style={{ cursor: 'pointer' }}>
                    <circle r={10} fill="#ef4444" stroke="#fff" strokeWidth={1.5} />
                    <line x1={-4} y1={-4} x2={4} y2={4} stroke="#fff" strokeWidth={2} strokeLinecap="round" />
                    <line x1={4} y1={-4} x2={-4} y2={4} stroke="#fff" strokeWidth={2} strokeLinecap="round" />
                </g>
            )}
        </>
    );
};

export const edgeTypes = {
    workflowEdge: WorkflowEdge,
};
