import React from 'react';
import ReactFlow, { Background, Controls, MiniMap, Node, Edge, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import '../../workflow/components/WorkflowDesigner.less';
import { nodeTypes, NODE_CONFIGS } from '../../workflow/components/WorkflowDesignerConstants';
import { useIntl } from '@umijs/max';

interface WorkflowViewerProps {
    nodes: Node[];
    edges: Edge[];
}

const WorkflowViewer: React.FC<WorkflowViewerProps> = ({ nodes, edges }) => {
    const intl = useIntl();

    if (!nodes || nodes.length === 0) {
        return (
            <div style={{ padding: 12, color: '#999' }}>
                {intl.formatMessage({ id: 'pages.workflow.graph.empty', defaultMessage: '暂无流程图数据' })}
            </div>
        );
    }

    return (
        <div
            style={{
                height: 360,
                marginTop: 8,
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                overflow: 'hidden',
                background: 'white'
            }}
        >
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                proOptions={{ hideAttribution: true }}
                defaultEdgeOptions={{
                    type: 'smoothstep',
                    style: { stroke: '#94a3b8', strokeWidth: 2 },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: '#94a3b8',
                    },
                }}
            >
                <MiniMap
                    nodeColor={(n) => {
                        const config = NODE_CONFIGS[n.data.nodeType as keyof typeof NODE_CONFIGS];
                        return config?.color || '#eee';
                    }}
                    style={{ borderRadius: 12 }}
                />
                <Controls showInteractive={false} />
                <Background color="#cbd5e1" gap={24} size={1} />
            </ReactFlow>
        </div>
    );
};

export default WorkflowViewer;
