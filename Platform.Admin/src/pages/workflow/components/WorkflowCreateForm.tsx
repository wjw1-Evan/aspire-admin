import React, { useState } from 'react';
import { Space } from 'antd';
import { ProCard, ProFormText, ProFormTextArea, ProFormSwitch } from '@ant-design/pro-components';
import { InfoCircleOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { useMessage } from '@/hooks/useMessage';
import { createWorkflow, type WorkflowGraph } from '@/services/workflow/api';
import WorkflowDesigner from './WorkflowDesigner';

interface WorkflowCreateFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const WorkflowCreateForm: React.FC<WorkflowCreateFormProps> = ({ onSuccess, onCancel }) => {
  const intl = useIntl();
  const message = useMessage();
  const [loading, setLoading] = useState(false);

  const handleSave = async (workflowGraph: WorkflowGraph) => {
    try {
      if (!workflowGraph || !workflowGraph.nodes || workflowGraph.nodes.length === 0) {
        message.error(intl.formatMessage({ id: 'pages.workflow.create.message.designFirst' }));
        return;
      }

      setLoading(true);

      const response = await createWorkflow({
        name: '新工作流',
        description: '',
        category: 'default',
        graph: workflowGraph,
        isActive: true,
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      <ProCard
        size="small"
        title={
          <Space>
            <InfoCircleOutlined style={{ color: '#1890ff' }} />
            <span>{intl.formatMessage({ id: 'pages.workflow.create.title' })}</span>
          </Space>
        }
        style={{ padding: '16px 24px 0 24px' }}
      >
        <ProFormText
          name="name"
          label={intl.formatMessage({ id: 'pages.workflow.create.form.name' })}
          rules={[
            {
              required: true,
              message: intl.formatMessage({ id: 'pages.workflow.create.form.nameRequired' }),
            },
          ]}
          placeholder={intl.formatMessage({ id: 'pages.workflow.create.form.namePlaceholder' })}
        />
        <ProFormText
          name="category"
          label={intl.formatMessage({ id: 'pages.workflow.create.form.category' })}
          placeholder={intl.formatMessage({ id: 'pages.workflow.create.form.categoryPlaceholder' })}
        />
        <ProFormSwitch
          name="isActive"
          label={intl.formatMessage({ id: 'pages.workflow.create.form.status' })}
          checkedChildren={intl.formatMessage({ id: 'pages.workflow.create.form.statusEnabled' })}
          unCheckedChildren={intl.formatMessage({ id: 'pages.workflow.create.form.statusDisabled' })}
          initialValue={true}
        />
        <ProFormTextArea
          name="description"
          label={intl.formatMessage({ id: 'pages.workflow.create.form.description' })}
          placeholder={intl.formatMessage({ id: 'pages.workflow.create.form.descriptionPlaceholder' })}
        />
      </ProCard>

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
              {
                id: 'edge-1',
                source: 'start-1',
                target: 'approval-1',
              },
              {
                id: 'edge-2',
                source: 'approval-1',
                target: 'end-1',
              },
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