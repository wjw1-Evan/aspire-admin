import React, { useState } from 'react';
import { Form, Input, Button, Card, Space, Row, Col, Switch } from 'antd';
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
  const [form] = Form.useForm();
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      <Card
        size="small"
        title={
          <Space>
            <InfoCircleOutlined style={{ color: '#1890ff' }} />
            <span>{intl.formatMessage({ id: 'pages.workflow.create.title' })}</span>
          </Space>
        }
        styles={{ body: { padding: '16px 24px 0 24px' } }}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={8}>
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
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="category"
                label={intl.formatMessage({ id: 'pages.workflow.create.form.category' })}
              >
                <Input placeholder={intl.formatMessage({ id: 'pages.workflow.create.form.categoryPlaceholder' })} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="isActive"
                label={intl.formatMessage({ id: 'pages.workflow.create.form.status' })}
                valuePropName="checked"
                initialValue={true}
              >
                <Switch
                  checkedChildren={intl.formatMessage({ id: 'pages.workflow.create.form.statusEnabled' })}
                  unCheckedChildren={intl.formatMessage({ id: 'pages.workflow.create.form.statusDisabled' })}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                name="description"
                label={intl.formatMessage({ id: 'pages.workflow.create.form.description' })}
                style={{ marginBottom: 16 }}
              >
                <Input.TextArea
                  rows={1}
                  autoSize={{ minRows: 1, maxRows: 3 }}
                  placeholder={intl.formatMessage({ id: 'pages.workflow.create.form.descriptionPlaceholder' })}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <div style={{ flex: 1, minHeight: 0 }}>
        <WorkflowDesigner
          open={true}
          graph={{
            nodes: [
              {
                id: 'start-1',
                type: 'start',
                label: intl.formatMessage({ id: 'pages.workflow.designer.addStart' }),
                position: { x: 250, y: 50 },
                config: {},
              },
              {
                id: 'approval-1',
                type: 'approval',
                label: intl.formatMessage({ id: 'pages.workflow.designer.addApproval' }),
                position: { x: 250, y: 250 },
                config: {},
              },
              {
                id: 'end-1',
                type: 'end',
                label: intl.formatMessage({ id: 'pages.workflow.designer.addEnd' }),
                position: { x: 250, y: 450 },
                config: {},
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