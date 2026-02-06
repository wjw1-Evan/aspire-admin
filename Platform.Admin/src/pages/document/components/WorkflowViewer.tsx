import React from 'react';
import ReactFlow, { Background, Controls, MiniMap, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
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
                border: '1px solid #f0f0f0',
                borderRadius: 8,
                overflow: 'hidden',
            }}
        >
            <ReactFlow
                nodes={nodes}
                edges={edges}
                fitView
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                proOptions={{ hideAttribution: true }}
            >
                <MiniMap pannable zoomable />
                <Controls showInteractive={false} />
                <Background gap={12} size={1} />
            </ReactFlow>
        </div>
    );
};

export default WorkflowViewer;
