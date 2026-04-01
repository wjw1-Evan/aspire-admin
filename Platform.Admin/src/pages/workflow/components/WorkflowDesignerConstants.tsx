import React from 'react';
import {
  NodeProps,
  EdgeProps,
  Position,
  getBezierPath,
  Handle,
} from 'reactflow';
import {
  PlayCircleOutlined,
  StopOutlined,
  CheckOutlined,
  ApartmentOutlined,
  HistoryOutlined,
} from '@ant-design/icons';

export const NODE_CATEGORIES = {
  base: { label: '基础', order: 1 },
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
  approval: {
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
    icon: <CheckOutlined />,
    category: 'base',
    description: '人工审批环节',
    version: '1.0.0',
  },
  condition: {
    color: '#d97706',
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
    icon: <ApartmentOutlined />,
    category: 'base',
    description: '条件分支判断',
    version: '1.0.0',
  },
};


export const NODE_TYPE_LABELS: Record<string, string> = {
  start: '开始',
  end: '结束',
  approval: '审批',
  condition: '条件',
};



export const NODE_DESCRIPTIONS: Record<string, string> = {
  start: '定义工作流的入口点和输入参数',
  end: '工作流执行完成，返回结果',
  approval: '人工审批流程节点',
  condition: '基于条件表达式的分支判断',
};


export const DEFAULT_NODE_CONFIGS: Partial<Record<string, any>> = {
};


export const CustomNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeType = data.nodeType as keyof typeof NODE_CONFIGS;
  const config = NODE_CONFIGS[nodeType] || NODE_CONFIGS.start;

  const renderBody = () => {
    switch (nodeType) {
      case 'approval':
        const approversCount = data.config?.approval?.approvers?.length || 0;
        return `${approversCount > 0 ? `配置了 ${approversCount} 条审批规则` : '未配置审批人'}`;
      case 'condition':
        const branchesCount = data.config?.condition?.branches?.length || 0;
        return branchesCount > 0 ? `配置了 ${branchesCount} 条分支` : '等待配置条件分支...';
      case 'start':
        return data.config?.form?.formDefinitionId ? '已绑定启动表单' : '流程开始';
      case 'end':
        return '流程结束';
      default:
        return data.description || '未配置';
    }
  };

  // 为条件节点生成多个输出 handle
  const renderHandles = () => {
    if (nodeType === 'condition') {
      const branches = data.config?.condition?.branches || [];
      const hasDefaultNode = !!data.config?.condition?.defaultNodeId;
      const handleCount = Math.max(branches.length, 1);
      const handles = [];

      // 输入 handle
      handles.push(
        <Handle key="target" type="target" position={Position.Top} />
      );

      // 为每个分支生成一个输出 handle
      for (let i = 0; i < handleCount; i++) {
        const branch = branches[i];
        const handleId = branch?.id || `branch-${i}`;
        handles.push(
          <Handle
            key={`source-${handleId}`}
            type="source"
            position={Position.Bottom}
            id={handleId}
            style={{
              left: `${((i + 1) / (handleCount + (hasDefaultNode ? 2 : 1))) * 100}%`,
            }}
          />
        );
      }

      // 为默认节点生成单独的输出 handle
      if (hasDefaultNode) {
        handles.push(
          <Handle
            key="source-default"
            type="source"
            position={Position.Bottom}
            id="default"
            style={{
              left: `${((handleCount + 1) / (handleCount + 2)) * 100}%`,
            }}
          />
        );
      }

      return handles;
    }

    // 其他节点类型保持原样
    return (
      <>
        <Handle type="target" position={Position.Top} />
        <Handle type="source" position={Position.Bottom} />
      </>
    );
  };

  return (
    <div
      className={`elsa-node-wrapper ${selected ? 'workflow-node-selected' : ''}`}
      style={{
        '--node-accent-color': config.color,
        borderColor: selected ? config.color : 'rgba(226, 232, 240, 0.8)',
      } as React.CSSProperties}
    >
      {renderHandles()}
      <div className="elsa-node-header">
        <div className="elsa-node-icon" style={{
          background: config.backgroundColor,
          color: config.color,
          borderColor: `rgba(${parseInt(config.color.slice(1, 3), 16)}, ${parseInt(config.color.slice(3, 5), 16)}, ${parseInt(config.color.slice(5, 7), 16)}, 0.1)`
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
