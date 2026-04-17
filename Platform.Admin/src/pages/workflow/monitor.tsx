import React, { useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Tag, Space, Button, Modal } from 'antd';
import { ProCard } from '@ant-design/pro-components';
import { EyeOutlined, MonitorOutlined, HistoryOutlined, FormOutlined } from '@ant-design/icons';
import { ProTable, ProColumns } from '@ant-design/pro-table';
import {
  getWorkflowInstances, getWorkflowInstance, getApprovalHistory, getWorkflowDetail,
  type WorkflowInstance, WorkflowStatus, type WorkflowGraph, ApprovalAction,
  getNodeForm, submitNodeForm, type FormDefinition, FormFieldType,
} from '@/services/workflow/api';
import WorkflowDesigner from './components/WorkflowDesigner';
import { useIntl } from '@umijs/max';
import dayjs from 'dayjs';
import { getStatusMeta, workflowStatusMap, approvalActionMap } from '@/utils/statusMaps';
import type { PageParams } from '@/types';

const WorkflowMonitor: React.FC = () => {
  const intl = useIntl();
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewInstance, setPreviewInstance] = useState<WorkflowInstance | null>(null);
  const [previewGraph, setPreviewGraph] = useState<WorkflowGraph | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [nodeFormVisible, setNodeFormVisible] = useState(false);
  const [nodeFormDef, setNodeFormDef] = useState<FormDefinition | null>(null);
  const [nodeFormInitial, setNodeFormInitial] = useState<Record<string, any> | null>(null);
  const [nodeFormLoading, setNodeFormLoading] = useState(false);
  const [currentFormInstanceId, setCurrentFormInstanceId] = useState<string | null>(null);

  const getFlowStatus = (status?: WorkflowStatus | null) => getStatusMeta(intl, status, workflowStatusMap);

  const openNodeForm = async (instanceId: string, currentNodeId?: string) => {
    setNodeFormDef(null); setNodeFormInitial(null); setNodeFormVisible(false);
    setCurrentFormInstanceId(instanceId); setNodeFormLoading(true);
    try {
      const res = await getNodeForm(instanceId, currentNodeId || '');
      if (res.success) {
        setNodeFormDef(res.data?.form || null); setNodeFormInitial(res.data?.initialValues || null);
        setTimeout(() => setNodeFormVisible(true), 50);
      } else { console.error('获取节点表单失败:', res.message); }
    } catch (error) { console.error('获取节点表单失败:', error); }
    finally { setNodeFormLoading(false); }
  };

  const collectFormData = (): Record<string, any> => {
    const formEl = document.getElementById('node-form-container');
    const values: Record<string, any> = {};
    if (formEl) {
      const inputs = formEl.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input[name],textarea[name],select[name]');
      inputs.forEach((el) => {
        const name = el.name; if (!name) return;
        if (el.type === 'checkbox') { values[name] = (el as HTMLInputElement).checked; }
        else if (el.type === 'number') { const numValue = (el as HTMLInputElement).value; values[name] = numValue === '' ? null : Number(numValue); }
        else { const textValue = el.value.trim(); values[name] = textValue === '' ? null : textValue; }
      });
    }
    return values;
  };

  const submitFormData = async () => {
    const values = collectFormData();
    if (currentFormInstanceId) {
      try {
        const res = await submitNodeForm(currentFormInstanceId!, previewInstance?.currentNodeId || '', values);
        if (res.success) {
          setNodeFormVisible(false); setNodeFormDef(null); setNodeFormInitial(null); setCurrentFormInstanceId(null);
        }
      } catch (error) { console.error('提交表单失败:', error); }
    }
  };

  const columns: ProColumns<WorkflowInstance>[] = [
    { title: intl.formatMessage({ id: 'pages.workflow.monitor.table.instanceId' }), dataIndex: 'id', ellipsis: true, sorter: true },
    {
      title: intl.formatMessage({ id: 'pages.workflow.monitor.table.status' }), dataIndex: 'status', sorter: true,
      render: (_, record) => { const status = getFlowStatus(record.status); return <Tag color={status.color}>{status.text}</Tag>; },
    },
    { title: intl.formatMessage({ id: 'pages.workflow.monitor.table.startedBy' }), dataIndex: 'startedBy', ellipsis: true, sorter: true },
    { title: intl.formatMessage({ id: 'pages.workflow.monitor.table.startedAt' }), dataIndex: 'startedAt', sorter: true, render: (dom) => (dom ? dayjs(dom as string).format('YYYY-MM-DD HH:mm:ss') : '-') },
    { title: intl.formatMessage({ id: 'pages.workflow.monitor.table.completedAt' }), dataIndex: 'completedAt', sorter: true, render: (dom) => (dom ? dayjs(dom as string).format('YYYY-MM-DD HH:mm:ss') : '-') },
    {
      title: intl.formatMessage({ id: 'pages.workflow.monitor.table.action' }), key: 'action', fixed: 'right', width: 260,
      render: (_, record) => (
        <Space size="small" wrap>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={async () => {
            try {
              const [instanceResponse, definitionResponse] = await Promise.all([getWorkflowInstance(record.id!), getWorkflowDetail(record.workflowDefinitionId)]);
              if (instanceResponse.success && instanceResponse.data) setPreviewInstance(instanceResponse.data);
              if (definitionResponse.success && definitionResponse.data) setPreviewGraph(definitionResponse.data.graph); else setPreviewGraph(null);
              setPreviewVisible(true);
            } catch (error) { console.error('获取实例详情失败:', error); }
          }}>进度</Button>
          <Button type="link" size="small" icon={<HistoryOutlined />} onClick={async () => {
            try {
              const historyResponse = await getApprovalHistory(record.id!);
              if (historyResponse.success && historyResponse.data) { setHistory(historyResponse.data); setHistoryVisible(true); }
            } catch (error) { console.error('获取审批历史失败:', error); }
          }}>历史</Button>
          <Button type="link" size="small" icon={<FormOutlined />} onClick={() => { if (record.id) openNodeForm(record.id!, record.currentNodeId); }}>表单</Button>
        </Space>
      ),
    },
  ];

  const renderNodeForm = () => {
    if (!nodeFormDef) return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999', fontSize: 14, backgroundColor: '#fafafa', borderRadius: 8, border: '1px dashed #d9d9d9' }}>
        <span style={{ fontSize: 48, display: 'block', marginBottom: 16 }}>📝</span>
        <div>{intl.formatMessage({ id: 'pages.workflow.monitor.nodeForm.none', defaultMessage: '该节点未绑定表单' })}</div>
      </div>
    );
    return (
      <div>
        {nodeFormDef.fields?.map((field, index) => {
          const name = field.dataKey || field.label;
          const initVal = (nodeFormInitial || {})[name];
          const isRequired = field.required;
          const fieldStyle = { marginBottom: 20 };
          const labelStyle = { display: 'block', fontSize: 14, fontWeight: 500, color: '#262626', marginBottom: 8, lineHeight: 1.4 };
          const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 14, lineHeight: 1.5, outline: 'none', backgroundColor: '#fff' };
          switch (field.type) {
            case FormFieldType.Number:
              return (<div key={`${currentFormInstanceId}-${name}-${index}`} style={fieldStyle}><label style={{ ...labelStyle }} className={isRequired ? 'required' : ''}>{field.label}</label><input name={name} type="number" defaultValue={initVal != null ? String(initVal) : ''} placeholder={field.placeholder || `请输入${field.label}`} style={inputStyle} required={isRequired} step="any" /></div>);
            case FormFieldType.Select:
              return (<div key={`${currentFormInstanceId}-${name}-${index}`} style={fieldStyle}><label style={{ ...labelStyle }} className={isRequired ? 'required' : ''}>{field.label}</label><select name={name} defaultValue={initVal != null ? String(initVal) : ''} style={inputStyle} required={isRequired}><option value="">请选择{field.label}</option>{(field.options || []).map((opt, optIndex) => (<option key={`${opt.value}-${optIndex}`} value={opt.value}>{opt.label}</option>))}</select></div>);
            case FormFieldType.TextArea:
              return (<div key={`${currentFormInstanceId}-${name}-${index}`} style={fieldStyle}><label style={{ ...labelStyle }} className={isRequired ? 'required' : ''}>{field.label}</label><textarea name={name} defaultValue={initVal != null ? String(initVal) : ''} placeholder={field.placeholder || `请输入${field.label}`} rows={4} style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} required={isRequired} /></div>);
            case FormFieldType.Switch:
              return (<div key={`${currentFormInstanceId}-${name}-${index}`} style={fieldStyle}><div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}><input name={name} type="checkbox" defaultChecked={!!initVal} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#1890ff' }} id={`checkbox-${currentFormInstanceId}-${name}-${index}`} /><label htmlFor={`checkbox-${currentFormInstanceId}-${name}-${index}`} style={{ fontSize: 14, fontWeight: 500, color: '#262626', cursor: 'pointer', margin: 0, lineHeight: 1.4 }}>{field.label}</label></div></div>);
            default:
              return (<div key={`${currentFormInstanceId}-${name}-${index}`} style={fieldStyle}><label style={{ ...labelStyle }} className={isRequired ? 'required' : ''}>{field.label}</label><input name={name} type="text" defaultValue={initVal != null ? String(initVal) : ''} placeholder={field.placeholder || `请输入${field.label}`} style={inputStyle} required={isRequired} /></div>);
          }
        })}
      </div>
    );
  };

  return (
    <PageContainer>
      <ProTable
        headerTitle={
          <Space size={24}>
            <Space><MonitorOutlined />{intl.formatMessage({ id: 'pages.workflow.monitor.title' })}</Space>
          </Space>
        }
        actionRef={undefined}
        rowKey="id"
        search={{ labelWidth: 'auto' }}
        request={async (params: any) => {
          const { current, pageSize, ...rest } = params;
          const response = await getWorkflowInstances({ page: current, pageSize, ...rest } as PageParams);
          if (response.success && response.data) {
            return { data: response.data.queryable || [], total: response.data.rowCount || 0, success: true };
          }
          return { data: [], total: 0, success: false };
        }}
        columns={columns}
        scroll={{ x: 'max-content' }}
      />
      <Modal title={intl.formatMessage({ id: 'pages.workflow.monitor.modal.progressTitle' })} open={previewVisible} onCancel={() => { setPreviewVisible(false); setPreviewInstance(null); }} footer={null} width="90%" style={{ top: 20 }} styles={{ body: { height: 'calc(100vh - 120px)' } }}>
        {previewInstance && (
          <div>
            <ProCard style={{ marginBottom: 16 }}>
              <Space>
                {(() => { const status = getFlowStatus(previewInstance?.status as WorkflowStatus | null); return <Tag color={status.color}>{status.text}</Tag>; })()}
                <span>{intl.formatMessage({ id: 'pages.workflow.monitor.progress.currentNode' })}: {previewInstance.currentNodeId}</span>
                <span>{intl.formatMessage({ id: 'pages.workflow.monitor.table.startedBy' })}: {previewInstance.startedBy}</span>
                <Button type="primary" disabled={nodeFormLoading} onClick={() => { if (previewInstance?.id) openNodeForm(previewInstance.id, previewInstance.currentNodeId); }}>
                  {intl.formatMessage({ id: 'pages.workflow.monitor.action.viewNodeForm', defaultMessage: '节点表单' })}
                </Button>
              </Space>
            </ProCard>
            <div style={{ height: '500px', border: '1px solid #d9d9d9' }}>
              <WorkflowDesigner open={true} graph={previewGraph || undefined} />
            </div>
          </div>
        )}
      </Modal>
      <Modal title={intl.formatMessage({ id: 'pages.workflow.monitor.modal.nodeFormTitle', defaultMessage: '节点表单' })} open={nodeFormVisible} onCancel={() => { setNodeFormVisible(false); setNodeFormDef(null); setNodeFormInitial(null); setCurrentFormInstanceId(null); }} onOk={submitFormData} width={720} styles={{ body: { maxHeight: '600px', overflowY: 'auto' } }}>
        <div id="node-form-container" style={{ padding: '16px 0' }} key={currentFormInstanceId}>{renderNodeForm()}</div>
      </Modal>
      <Modal title={intl.formatMessage({ id: 'pages.workflow.monitor.modal.historyTitle' })} open={historyVisible} onCancel={() => { setHistoryVisible(false); setHistory([]); }} footer={null} width={800}>
        <div>
          {history.map((record, index) => (
            <ProCard key={index} style={{ marginBottom: 8 }}>
              <Space orientation="vertical" style={{ width: '100%' }}>
                <div><strong>{intl.formatMessage({ id: 'pages.workflow.monitor.history.approver' })}:</strong> {record.approverName || record.approverId}</div>
                <div><strong>{intl.formatMessage({ id: 'pages.workflow.monitor.history.action' })}:</strong> {(() => { const actionMeta = getStatusMeta(intl, record.action as ApprovalAction, approvalActionMap); return <Tag color={actionMeta.color}>{actionMeta.text}</Tag>; })()}</div>
                {record.comment && <div><strong>{intl.formatMessage({ id: 'pages.workflow.monitor.history.comment' })}:</strong> {record.comment}</div>}
                <div><strong>{intl.formatMessage({ id: 'pages.workflow.monitor.history.time' })}:</strong> {record.approvedAt ? dayjs(record.approvedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</div>
              </Space>
            </ProCard>
          ))}
        </div>
      </Modal>
    </PageContainer>
  );
};

export default WorkflowMonitor;
