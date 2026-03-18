import React, { useEffect, useState } from 'react';
import { Form, Input, Select, Button, Space, Divider, Row, Col, Card, Switch, Spin, Result } from 'antd';
import { SaveOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { useMessage } from '@/hooks/useMessage';
import { updateWorkflow, getWorkflowDetail, type WorkflowDefinition, type WorkflowGraph } from '@/services/workflow/api';
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
    const [detailLoading, setDetailLoading] = useState(true);
    const [fullWorkflow, setFullWorkflow] = useState<WorkflowDefinition | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    // 从详情 API 加载完整工作流数据
    useEffect(() => {
        const loadDetail = async () => {
            if (!workflow.id) {
                setLoadError('工作流 ID 不存在');
                setDetailLoading(false);
                return;
            }
            try {
                setDetailLoading(true);
                setLoadError(null);
                const response = await getWorkflowDetail(workflow.id);
                if (response.success && response.data) {
                    setFullWorkflow(response.data);
                } else {
                    setLoadError('加载工作流详情失败');
                }
            } catch (error) {
                console.error('加载工作流详情失败:', error);
                setLoadError('加载工作流详情失败，请重试');
            } finally {
                setDetailLoading(false);
            }
        };
        loadDetail();
    }, [workflow.id]);

    // 在数据加载完成且渲染完成后同步表单值，避免 "not connected" 警告
    useEffect(() => {
        if (fullWorkflow && !detailLoading) {
            form.setFieldsValue({
                name: fullWorkflow.name,
                description: fullWorkflow.description,
                category: fullWorkflow.category,
                isActive: fullWorkflow.isActive,
            });
        }
    }, [fullWorkflow, detailLoading, form]);

    const handleSave = async (graph: WorkflowGraph) => {
        if (readOnly || !fullWorkflow?.id) return;
        try {
            const values = await form.validateFields();
            setLoading(true);

            // 自动增加 minor 版本号
            const newVersion = {
                major: fullWorkflow.version?.major || 1,
                minor: (fullWorkflow.version?.minor || 0) + 1,
                createdAt: fullWorkflow.version?.createdAt || new Date().toISOString(),
            };

            const response = await updateWorkflow(fullWorkflow.id, {
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

    if (detailLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '400px' }}>
                <Spin size="large" description="加载工作流数据..." />
            </div>
        );
    }

    if (loadError || !fullWorkflow) {
        return (
            <Result
                status="error"
                title="加载失败"
                subTitle={loadError || '无法加载工作流数据'}
                extra={<Button onClick={onCancel}>返回</Button>}
            />
        );
    }

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
                    graph={fullWorkflow.graph}
                    onSave={readOnly ? undefined : handleSave}
                    onClose={onCancel}
                    readOnly={readOnly}
                />
            </div>
        </div>
    );
};

export default WorkflowEditForm;

