import React, { useEffect, useState } from 'react';
import { Form, Input, Select, Button, Space, Divider, Row, Col, Card, Switch } from 'antd';
import { SaveOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { useMessage } from '@/hooks/useMessage';
import { updateWorkflow, type WorkflowDefinition, type WorkflowGraph } from '@/services/workflow/api';
import WorkflowDesigner from './WorkflowDesigner';

interface WorkflowEditFormProps {
    workflow: WorkflowDefinition;
    onSuccess: () => void;
    onCancel: () => void;
    readOnly?: boolean;
}

const WorkflowEditForm: React.FC<WorkflowEditFormProps> = ({ workflow, onSuccess, onCancel, readOnly }) => {
    const intl = useIntl();
    const message = useMessage();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (workflow) {
            form.setFieldsValue({
                name: workflow.name,
                description: workflow.description,
                category: workflow.category,
                isActive: workflow.isActive,
            });
        }
    }, [workflow, form]);

    const handleSave = async (graph: WorkflowGraph) => {
        if (readOnly) return;
        try {
            const values = await form.validateFields();
            setLoading(true);

            const response = await updateWorkflow(workflow.id!, {
                name: values.name,
                description: values.description,
                category: values.category || 'default',
                isActive: values.isActive,
                graph: graph,
            });

            if (response.success) {
                message.success(intl.formatMessage({ id: 'pages.workflow.message.saveSuccess' }));
                onSuccess();
            }
        } catch (error) {
            console.error('更新失败:', error);
            message.error(intl.formatMessage({ id: 'pages.workflow.message.saveFailed' }));
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
                        <span>{intl.formatMessage({ id: 'pages.workflow.bulk.operationConfig' })}</span>
                    </Space>
                }
                styles={{ body: { padding: '16px 24px 0 24px' } }}
            >
                <Form form={form} layout="vertical" disabled={readOnly}>
                    <Row gutter={16}>
                        <Col xs={24} md={8}>
                            <Form.Item
                                name="name"
                                label={intl.formatMessage({ id: 'pages.workflow.table.name' })}
                                rules={[{ required: true, message: intl.formatMessage({ id: 'pages.workflow.create.form.nameRequired' }) }]}
                            >
                                <Input placeholder={intl.formatMessage({ id: 'pages.workflow.create.form.namePlaceholder' })} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                            <Form.Item
                                name="category"
                                label={intl.formatMessage({ id: 'pages.workflow.table.category' })}
                            >
                                <Input placeholder={intl.formatMessage({ id: 'pages.workflow.create.form.categoryPlaceholder' })} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                            <Form.Item
                                name="isActive"
                                label={intl.formatMessage({ id: 'pages.workflow.table.status' })}
                                valuePropName="checked"
                            >
                                <Switch
                                    checkedChildren={intl.formatMessage({ id: 'pages.workflow.status.enabled' })}
                                    unCheckedChildren={intl.formatMessage({ id: 'pages.workflow.status.disabled' })}
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
                                    placeholder={intl.formatMessage({ id: 'pages.workflow.create.form.descriptionPlaceholder' })}
                                    autoSize={{ minRows: 1, maxRows: 3 }}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Card>

            <div style={{ flex: 1, minHeight: 0 }}>
                <WorkflowDesigner
                    open={true}
                    graph={workflow.graph}
                    onSave={readOnly ? undefined : handleSave}
                    onClose={onCancel}
                    readOnly={readOnly}
                />
            </div>
        </div>
    );
};

export default WorkflowEditForm;
