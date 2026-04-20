import React, { useEffect, useState } from 'react';
import { Button, Spin, Result } from 'antd';
import { ProCard, ProFormText, ProFormTextArea, ProFormSwitch, ProForm } from '@ant-design/pro-components';
import type { ProFormInstance } from '@ant-design/pro-components';
import { InfoCircleOutlined } from '@ant-design/icons';
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
    const [loading, setLoading] = useState(false);
    const [detailLoading, setDetailLoading] = useState(true);
    const [fullWorkflow, setFullWorkflow] = useState<WorkflowDefinition | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const formRef = React.useRef<ProFormInstance>(null);

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

    const handleSave = async (graph: WorkflowGraph) => {
        if (readOnly || !fullWorkflow?.id) return;
        try {
            const formValues = formRef.current?.getFieldsValue();
            setLoading(true);

            const response = await updateWorkflow(fullWorkflow.id, {
                name: formValues?.name || fullWorkflow.name,
                description: formValues?.description || fullWorkflow.description || '',
                category: formValues?.category || fullWorkflow.category || 'default',
                isActive: formValues?.isActive ?? fullWorkflow.isActive,
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
            <ProCard
                size="small"
                title={
                    <span>
                        <InfoCircleOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                        {intl.formatMessage({ id: 'pages.workflow.bulk.operationConfig' })}
                    </span>
                }
                style={{ padding: '16px 24px 0 24px' }}
            >
                <ProForm formRef={formRef}>
                    <ProFormText
                        name="name"
                        label={intl.formatMessage({ id: 'pages.workflow.table.name' })}
                        rules={[{ required: true, message: intl.formatMessage({ id: 'pages.workflow.create.form.nameRequired' }) }]}
                        placeholder={intl.formatMessage({ id: 'pages.workflow.create.form.namePlaceholder' })}
                        disabled={readOnly}
                        initialValue={fullWorkflow.name}
                    />
                    <ProFormText
                        name="category"
                        label={intl.formatMessage({ id: 'pages.workflow.table.category' })}
                        placeholder={intl.formatMessage({ id: 'pages.workflow.create.form.categoryPlaceholder' })}
                        disabled={readOnly}
                        initialValue={fullWorkflow.category}
                    />
                    <ProFormSwitch
                        name="isActive"
                        label={intl.formatMessage({ id: 'pages.workflow.table.status' })}
                        checkedChildren={intl.formatMessage({ id: 'pages.workflow.status.enabled' })}
                        unCheckedChildren={intl.formatMessage({ id: 'pages.workflow.status.disabled' })}
                        disabled={readOnly}
                        initialValue={fullWorkflow.isActive}
                    />
                    <ProFormTextArea
                        name="description"
                        label={intl.formatMessage({ id: 'pages.workflow.create.form.description' })}
                        placeholder={intl.formatMessage({ id: 'pages.workflow.create.form.descriptionPlaceholder' })}
                        disabled={readOnly}
                        initialValue={fullWorkflow.description}
                    />
                </ProForm>
            </ProCard>

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

