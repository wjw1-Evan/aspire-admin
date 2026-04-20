import React, { useEffect, useState } from 'react';
import { Button, Spin, Result, Input, Switch } from 'antd';
import { InfoCircleOutlined, SaveOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { useMessage } from '@/hooks/useMessage';
import { createWorkflow, updateWorkflow, getWorkflowDetail, type WorkflowDefinition, type WorkflowGraph } from '@/services/workflow/api';
import WorkflowDesigner from './WorkflowDesigner';

interface WorkflowDesignerModalProps {
  workflow: WorkflowDefinition | null;
  onSuccess: () => void;
  onCancel: () => void;
  readOnly?: boolean;
}

const WorkflowDesignerModal: React.FC<WorkflowDesignerModalProps> = ({ workflow, onSuccess, onCancel, readOnly }) => {
  const intl = useIntl();
  const message = useMessage();
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(!!(workflow?.id));
  const [formData, setFormData] = useState({ name: workflow?.name || '', isActive: workflow?.isActive ?? true });
  const [fullWorkflow, setFullWorkflow] = useState<WorkflowDefinition | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const isCreate = !workflow?.id;
  console.log('[WorkflowDesignerModal] isCreate:', isCreate, 'workflow.id:', workflow?.id);

  useEffect(() => {
    const workflowId = workflow?.id;
    const shouldLoad = !!workflowId;
    if (shouldLoad) {
      const loadDetail = async () => {
        try {
          setDetailLoading(true);
          setLoadError(null);
          const response = await getWorkflowDetail(workflowId);
          if (response.success && response.data) {
            setFullWorkflow(response.data);
            setFormData({ name: response.data.name, isActive: response.data.isActive });
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
    } else {
      setDetailLoading(false);
    }
  }, [workflow?.id]);

  const handleSave = async (graph: WorkflowGraph) => {
    if (!formData.name) {
      message.error(intl.formatMessage({ id: 'pages.workflow.create.form.nameRequired' }));
      return;
    }
    if (readOnly || loading) return;
    const workflowId = workflow?.id;
    try {
      setLoading(true);
      const response = !workflowId
        ? await createWorkflow({ name: formData.name, description: '', category: 'default', graph, isActive: formData.isActive })
        : await updateWorkflow(workflowId, { name: formData.name, description: fullWorkflow?.description || '', category: fullWorkflow?.category || 'default', isActive: formData.isActive, graph });
      if (response.success) {
        message.success(intl.formatMessage({ id: 'pages.workflow.message.saveSuccess' }));
        onSuccess();
      }
    } catch (error) {
      console.error('保存失败:', error);
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

  if (loadError) {
    return <Result status="error" title="加载失败" subTitle={loadError} extra={<Button onClick={onCancel}>返回</Button>} />;
  }

  const defaultGraph = {
    nodes: [
      { id: 'start-1', type: 'start', data: { label: intl.formatMessage({ id: 'pages.workflow.designer.addStart' }), nodeType: 'start', config: {} }, position: { x: 250, y: 50 } },
      { id: 'approval-1', type: 'approval', data: { label: intl.formatMessage({ id: 'pages.workflow.designer.addApproval' }), nodeType: 'approval', config: {} }, position: { x: 250, y: 250 } },
      { id: 'end-1', type: 'end', data: { label: intl.formatMessage({ id: 'pages.workflow.designer.addEnd' }), nodeType: 'end', config: {} }, position: { x: 250, y: 450 } },
    ],
    edges: [
      { id: 'edge-1', source: 'start-1', target: 'approval-1' },
      { id: 'edge-2', source: 'approval-1', target: 'end-1' },
    ],
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', background: '#fafafa', display: 'flex', alignItems: 'center', gap: 16 }}>
        <InfoCircleOutlined style={{ color: '#1890ff', fontSize: 18 }} />
        {readOnly ? (
          <span style={{ fontWeight: 500, fontSize: 15 }}>{formData.name}</span>
        ) : (
          <Input
            placeholder={intl.formatMessage({ id: 'pages.workflow.create.form.namePlaceholder' })}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            style={{ width: 200 }}
          />
        )}
        <Switch checkedChildren="启用" unCheckedChildren="禁用" checked={formData.isActive} onChange={(v) => setFormData({ ...formData, isActive: v })} disabled={readOnly} />
        <span style={{ color: '#8c8c8c', fontSize: 13, marginLeft: 'auto' }}>
          {!readOnly && <Button type="primary" size="small" disabled={!formData.name || loading}>保存</Button>}
          <Button size="small" onClick={onCancel}>退出</Button>
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <WorkflowDesigner
          open={true}
          graph={isCreate ? defaultGraph : fullWorkflow?.graph}
          onSave={readOnly ? undefined : handleSave}
          onClose={onCancel}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
};

export default WorkflowDesignerModal;