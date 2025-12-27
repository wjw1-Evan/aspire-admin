import React, { useState } from 'react';
import { Form, Input, Select, Button, Card, Space } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
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
  const [form] = Form.useForm();
  const [graph, setGraph] = useState<WorkflowGraph | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSave = async (workflowGraph: WorkflowGraph) => {
    try {
      const values = await form.validateFields();

      if (!workflowGraph || !workflowGraph.nodes || workflowGraph.nodes.length === 0) {
        message.error(intl.formatMessage({ id: 'pages.workflow.create.message.designFirst' }));
        return;
      }

      setLoading(true);

      const response = await createWorkflow({
        name: values.name,
        description: values.description,
        category: values.category || 'default',
        graph: workflowGraph,
        isActive: values.isActive !== false,
      });

      if (response.success) {
        message.success(intl.formatMessage({ id: 'pages.workflow.create.message.createSuccess' }));
        form.resetFields();
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
    <div>
      <Form form={form} layout="vertical" style={{ marginBottom: 16 }}>
        <Form.Item
          name="name"
          label={intl.formatMessage({ id: 'pages.workflow.create.form.name' })}
          rules={[
            {
              required: true,
              message: intl.formatMessage({ id: 'pages.workflow.create.form.nameRequired' }),
            },
          ]}
        >
          <Input placeholder={intl.formatMessage({ id: 'pages.workflow.create.form.namePlaceholder' })} />
        </Form.Item>
        <Form.Item name="description" label={intl.formatMessage({ id: 'pages.workflow.create.form.description' })}>
          <Input.TextArea rows={3} placeholder={intl.formatMessage({ id: 'pages.workflow.create.form.descriptionPlaceholder' })} />
        </Form.Item>
        <Form.Item name="category" label={intl.formatMessage({ id: 'pages.workflow.create.form.category' })}>
          <Input placeholder={intl.formatMessage({ id: 'pages.workflow.create.form.categoryPlaceholder' })} />
        </Form.Item>
        <Form.Item name="isActive" label={intl.formatMessage({ id: 'pages.workflow.create.form.status' })} initialValue={true}>
          <Select>
            <Select.Option value={true}>{intl.formatMessage({ id: 'pages.workflow.create.form.statusEnabled' })}</Select.Option>
            <Select.Option value={false}>{intl.formatMessage({ id: 'pages.workflow.create.form.statusDisabled' })}</Select.Option>
          </Select>
        </Form.Item>
      </Form>

      <div style={{ height: '400px', border: '1px solid #d9d9d9', borderRadius: '4px' }}>
        <WorkflowDesigner
          open={true}
          graph={graph || undefined}
          onSave={handleSave}
        />
      </div>

      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <Space>
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" icon={<SaveOutlined />} loading={loading} onClick={() => handleSave(graph!)}>
            {intl.formatMessage({ id: 'pages.button.save' })}
          </Button>
        </Space>
      </div>
    </div>
  );
};

export default WorkflowCreateForm;