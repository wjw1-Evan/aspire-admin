import { InfoCircleOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Button, Input, Switch, App } from 'antd';
import React, { useState } from 'react';
import { createWorkflow, type WorkflowGraph } from '@/services/workflow/api';
import WorkflowDesigner from './WorkflowDesigner';

interface WorkflowCreateFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const WorkflowCreateForm: React.FC<WorkflowCreateFormProps> = ({ onSuccess, onCancel }) => {
  const { message } = App.useApp();
  const intl = useIntl();
    const [_loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', category: '', description: '', isActive: true });

  const handleSave = async (workflowGraph: WorkflowGraph) => {
    const { message } = App.useApp();
    try {
      if (!formData.name) {
        message.error(intl.formatMessage({ id: 'pages.workflow.create.form.nameRequired' }));
        return;
      }
      if (!workflowGraph?.nodes || workflowGraph.nodes.length === 0) {
        message.error(intl.formatMessage({ id: 'pages.workflow.create.message.designFirst' }));
        return;
      }

      setLoading(true);

      const response = await createWorkflow({
        name: formData.name,
        description: formData.description,
        category: formData.category || 'default',
        graph: workflowGraph,
        isActive: formData.isActive,
      });

      if (response.success) {
        message.success(intl.formatMessage({ id: 'pages.workflow.create.message.createSuccess' }));
        onSuccess();
      }
    } catch (error) {
      console.error('创建失败:', error);
      message.error(intl.formatMessage({ id: 'pages.workflow.create.message.createFailed' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
          background: 'var(--ant-color-fill-tertiary)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <InfoCircleOutlined style={{ color: '#1890ff', fontSize: 18 }} />
        <Input
          placeholder={intl.formatMessage({ id: 'pages.workflow.create.form.namePlaceholder' })}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          style={{ width: 200 }}
        />
        <Switch
          checkedChildren="启用"
          unCheckedChildren="禁用"
          checked={formData.isActive}
          onChange={(v) => setFormData({ ...formData, isActive: v })}
        />
        <span
          style={{ color: 'var(--ant-color-text-tertiary)', fontSize: 13, marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          {!formData.name && <span style={{ color: '#ff4d4f', fontSize: 12 }}>请填写流程名称</span>}
          <Button size="small" onClick={onCancel}>
            退出
          </Button>
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <WorkflowDesigner
          open={true}
          graph={{
            nodes: [
              {
                id: 'start-1',
                type: 'start',
                data: {
                  label: intl.formatMessage({ id: 'pages.workflow.designer.addStart' }),
                  nodeType: 'start',
                  config: {},
                },
                position: { x: 250, y: 50 },
              },
              {
                id: 'approval-1',
                type: 'approval',
                data: {
                  label: intl.formatMessage({ id: 'pages.workflow.designer.addApproval' }),
                  nodeType: 'approval',
                  config: {},
                },
                position: { x: 250, y: 250 },
              },
              {
                id: 'end-1',
                type: 'end',
                data: {
                  label: intl.formatMessage({ id: 'pages.workflow.designer.addEnd' }),
                  nodeType: 'end',
                  config: {},
                },
                position: { x: 250, y: 450 },
              },
            ],
            edges: [
              { id: 'edge-1', source: 'start-1', target: 'approval-1' },
              { id: 'edge-2', source: 'approval-1', target: 'end-1' },
            ],
          }}
          onSave={handleSave}
          onClose={onCancel}
        />
      </div>
    </div>
  );
};

export default WorkflowCreateForm;
