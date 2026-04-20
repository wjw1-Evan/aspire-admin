import React, { useEffect, useState } from 'react';
import { Button, Spin, Result } from 'antd';
import { InfoCircleOutlined, SaveOutlined } from '@ant-design/icons';
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
            setLoading(true);

            const response = await updateWorkflow(fullWorkflow.id, {
                name: fullWorkflow.name,
                description: fullWorkflow.description || '',
                category: fullWorkflow.category || 'default',
                isActive: fullWorkflow.isActive,
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', background: '#fafafa', display: 'flex', alignItems: 'center', gap: 16 }}>
                <InfoCircleOutlined style={{ color: '#1890ff', fontSize: 18 }} />
                <span style={{ fontWeight: 500, fontSize: 15 }}>{fullWorkflow.name}</span>
                {fullWorkflow.isActive ? (
                    <span style={{ background: '#52c41a', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>已启用</span>
                ) : (
                    <span style={{ background: '#8c8c8c', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>已禁用</span>
                )}
                <span style={{ color: '#8c8c8c', fontSize: 13, marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {!readOnly && (
                        <Button type="primary" size="small" icon={<SaveOutlined />} onClick={() => handleSave(fullWorkflow.graph)}>保存</Button>
                    )}
                    <Button size="small" onClick={onCancel}>退出</Button>
                </span>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
                <WorkflowDesigner
                    open={true}
                    graph={fullWorkflow.graph}
                    onSave={undefined}
                    onClose={onCancel}
                    readOnly={readOnly}
                />
            </div>
        </div>
    );
};

export default WorkflowEditForm;

