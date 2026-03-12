// @ts-nocheck
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import { IntlProvider } from '@umijs/max';
import WorkflowDesigner from '../WorkflowDesigner';
import { WorkflowGraph } from '@/services/workflow/api';

// Mock matchMedia that Ant Design requires
window.matchMedia = window.matchMedia || function() {
    return {
        matches: false,
        addListener: function() {},
        removeListener: function() {}
    };
};

// Mock ResizeObserver for ReactFlow
global.ResizeObserver = class ResizeObserver {
  constructor(cb) { this.cb = cb; }
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('WorkflowDesigner - API Payload Payload Formatting', () => {
  it('should format react flow nodes/edges to the strict backend-compatible WorkflowGraph structure on save', async () => {
    const handleSaveMock = jest.fn();

    // A mock graph mimicking what a backend would initially provide 
    // And containing the exact fields that had mapping issues previously
    const testInitialGraph: WorkflowGraph = {
      nodes: [
        {
          id: 'mock-start',
          type: 'start',
          data: {
            nodeType: 'start',
            label: 'Start Node',
            config: {}
          },
          position: { x: 100, y: 100 },
        },
        {
          id: 'mock-approval',
          type: 'approval',
          data: {
            nodeType: 'approval',
            label: 'Approval Node',
            config: { approval: { allowTransfer: true } }
          },
          position: { x: 300, y: 100 },
        }
      ],
      edges: [
        {
          id: 'mock-edge-1',
          source: 'mock-start',
          target: 'mock-approval',
          label: 'Go',
          data: {
            condition: 'Amt > 100'
          }
        }
      ],
    };

    render(
      <ConfigProvider>
        <IntlProvider locale="zh-CN" messages={{ "pages.workflow.designer.save": "保存" }}>
          <WorkflowDesigner
            open={true}
            graph={testInitialGraph}
            onSave={handleSaveMock}
            onClose={jest.fn()}
          />
        </IntlProvider>
      </ConfigProvider>
    );

    // Wait for the UI and flow to render
    await waitFor(() => {
        // Find the '保存' button (use aria-label or span text depending on Antd design)
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    // Fire the save action
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    // Assert the shape of the payload returned to the onSave callback!
    await waitFor(() => {
        expect(handleSaveMock).toHaveBeenCalledTimes(1);
    });

    const savedPayload = handleSaveMock.mock.calls[0][0] as WorkflowGraph;

    // 1. Verify Node payload structure (No root fields leaking, wrapped correctly in 'data')
    expect(savedPayload.nodes).toHaveLength(2);
    
    const startNode = savedPayload.nodes.find(n => n.id === 'mock-start');
    const approvalNode = savedPayload.nodes.find(n => n.id === 'mock-approval');

    expect(startNode).toBeDefined();
    // Validate that flat property access is undefined/forbidden!
    expect((startNode as any).nodeType).toBeUndefined();
    expect((startNode as any).label).toBeUndefined();
    expect((startNode as any).config).toBeUndefined();
    
    // Validate exact structure expected by Backend System.Text.Json / Bson Serialization
    expect(startNode?.data).toMatchObject({
        nodeType: 'start',
        label: 'Start Node',
        config: {}
    });

    expect(approvalNode?.data?.config).toBeDefined();
    expect(approvalNode?.data?.config?.approval?.allowTransfer).toBe(true);

    // 2. Verify Edge payload structure (No root 'condition')
    expect(savedPayload.edges).toHaveLength(1);
    const edge = savedPayload.edges[0];
    
    // Explicitly verify the old bug is patched!
    expect((edge as any).condition).toBeUndefined();
    
    // Validate structure is inside 'data' wrapper
    expect(edge.data).toMatchObject({
        condition: 'Amt > 100'
    });
  });
});
