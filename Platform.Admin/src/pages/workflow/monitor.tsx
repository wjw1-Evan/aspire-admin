import React, { useRef, useState } from 'react';
import { PageContainer } from '@/components';
import { Card, Tag, Space, Button, Modal } from 'antd';
import { EyeOutlined, MonitorOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ActionType } from '@/types/pro-components';
import type { ColumnsType } from 'antd/es/table';
import { DataTable } from '@/components/DataTable';
import {
  getWorkflowInstances,
  getWorkflowInstance,
  getApprovalHistory,
  getWorkflowDetail,
  type WorkflowInstance,
  WorkflowStatus,
  type WorkflowGraph,
  ApprovalAction,
  getNodeForm,
  submitNodeForm,
  type FormDefinition,
  FormFieldType,
} from '@/services/workflow/api';
import WorkflowDesigner from './components/WorkflowDesigner';
import { useIntl } from '@umijs/max';
import dayjs from 'dayjs';
import { getStatusMeta, workflowStatusMap, approvalActionMap } from '@/utils/statusMaps';

const WorkflowMonitor: React.FC = () => {
  const intl = useIntl();
  const actionRef = useRef<ActionType>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewInstance, setPreviewInstance] = useState<WorkflowInstance | null>(null);
  const [previewGraph, setPreviewGraph] = useState<WorkflowGraph | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [nodeFormVisible, setNodeFormVisible] = useState(false);
  const [nodeFormDef, setNodeFormDef] = useState<FormDefinition | null>(null);
  const [nodeFormInitial, setNodeFormInitial] = useState<Record<string, any> | null>(null);
  const [nodeFormLoading, setNodeFormLoading] = useState(false);

  const handleRefresh = () => {
    actionRef.current?.reload?.();
  };

  const getFlowStatus = (status?: WorkflowStatus | null) => getStatusMeta(intl, status, workflowStatusMap);

  const columns: ColumnsType<WorkflowInstance> = [
    {
      title: intl.formatMessage({ id: 'pages.workflow.monitor.table.instanceId' }),
      dataIndex: 'id',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.monitor.table.status' }),
      dataIndex: 'status',
      render: (_, record) => {
        const status = getFlowStatus(record.status);
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.monitor.table.startedBy' }),
      dataIndex: 'startedBy',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.monitor.table.startedAt' }),
      dataIndex: 'startedAt',
      render: (text) => (text ? dayjs(text as string).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.monitor.table.completedAt' }),
      dataIndex: 'completedAt',
      render: (text) => (text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.monitor.table.action' }),
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={async () => {
              try {
                const [instanceResponse, definitionResponse] = await Promise.all([
                  getWorkflowInstance(record.id!),
                  getWorkflowDetail(record.workflowDefinitionId),
                ]);

                if (instanceResponse.success && instanceResponse.data) {
                  setPreviewInstance(instanceResponse.data);
                }

                if (definitionResponse.success && definitionResponse.data) {
                  setPreviewGraph(definitionResponse.data.graph);
                } else {
                  setPreviewGraph(null);
                }

                setPreviewVisible(true);
              } catch (error) {
                console.error('获取实例详情失败:', error);
              }
            }}
          >
            {intl.formatMessage({ id: 'pages.workflow.monitor.action.viewProgress' })}
          </Button>
          <Button
            type="link"
            size="small"
            onClick={async () => {
              try {
                const historyResponse = await getApprovalHistory(record.id!);
                if (historyResponse.success && historyResponse.data) {
                  setHistory(historyResponse.data);
                  setHistoryVisible(true);
                }
              } catch (error) {
                console.error('获取审批历史失败:', error);
              }
            }}
          >
            {intl.formatMessage({ id: 'pages.workflow.monitor.action.viewHistory' })}
          </Button>
          <Button
            type="link"
            size="small"
            onClick={async () => {
              if (!record.id) return;
              setNodeFormLoading(true);
              try {
                const res = await getNodeForm(record.id!, record.currentNodeId);
                if (res.success) {
                  setNodeFormDef(res.data?.form || null);
                  setNodeFormInitial(res.data?.initialValues || null);
                  setNodeFormVisible(true);
                }
              } finally {
                setNodeFormLoading(false);
              }
            }}
          >
            {intl.formatMessage({ id: 'pages.workflow.monitor.action.viewNodeForm', defaultMessage: '节点表单' })}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title={
        <Space>
          <MonitorOutlined />
          {intl.formatMessage({ id: 'pages.workflow.monitor.title' })}
        </Space>
      }
      style={{ paddingBlock: 12 }}
      extra={
        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          onClick={handleRefresh}
        >
          {intl.formatMessage({ id: 'pages.button.refresh' })}
        </Button>
      }
    >
      <DataTable<WorkflowInstance>
        actionRef={actionRef}
        columns={columns}
        request={async (params) => {
          const response = await getWorkflowInstances({
            current: params.current,
            pageSize: params.pageSize,
            workflowDefinitionId: params.workflowDefinitionId as string,
            status: params.status as WorkflowStatus,
          });
          if (response.success && response.data) {
            return {
              data: response.data.list,
              success: true,
              total: response.data.total,
            };
          }
          return { data: [], success: false, total: 0 };
        }}
        rowKey="id"
        search={true}
      />

      <Modal
        title={intl.formatMessage({ id: 'pages.workflow.monitor.modal.progressTitle' })}
        open={previewVisible}
        onCancel={() => {
          setPreviewVisible(false);
          setPreviewInstance(null);
        }}
        footer={null}
        width="90%"
        style={{ top: 20 }}
        styles={{ body: { height: 'calc(100vh - 120px)' } }}
      >
        {previewInstance && (
          <div>
            <Card style={{ marginBottom: 16 }}>
              <Space>
                {(() => {
                  const status = getFlowStatus(previewInstance?.status as WorkflowStatus | null);
                  return <Tag color={status.color}>{status.text}</Tag>;
                })()}
                <span>
                  {intl.formatMessage({ id: 'pages.workflow.monitor.progress.currentNode' })}:{' '}
                  {previewInstance.currentNodeId}
                </span>
                <span>
                  {intl.formatMessage({ id: 'pages.workflow.monitor.table.startedBy' })}:{' '}
                  {previewInstance.startedBy}
                </span>
                <Button
                  type="primary"
                  disabled={nodeFormLoading}
                  onClick={async () => {
                    if (!previewInstance?.id) return;
                    setNodeFormLoading(true);
                    try {
                      const res = await getNodeForm(previewInstance.id!, previewInstance.currentNodeId);
                      if (res.success) {
                        setNodeFormDef(res.data?.form || null);
                        setNodeFormInitial(res.data?.initialValues || null);
                        setNodeFormVisible(true);
                      }
                    } finally {
                      setNodeFormLoading(false);
                    }
                  }}
                >
                  {intl.formatMessage({ id: 'pages.workflow.monitor.action.viewNodeForm', defaultMessage: '节点表单' })}
                </Button>
              </Space>
            </Card>
            {/* 这里可以展示流程图形，高亮当前节点 */}
            <div style={{ height: '500px', border: '1px solid #d9d9d9' }}>
              <WorkflowDesigner
                visible={true}
                graph={previewGraph || undefined}
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title={intl.formatMessage({ id: 'pages.workflow.monitor.modal.nodeFormTitle', defaultMessage: '节点表单' })}
        open={nodeFormVisible}
        onCancel={() => {
          setNodeFormVisible(false);
          setNodeFormDef(null);
          setNodeFormInitial(null);
        }}
        onOk={async () => {
          // 收集简单值并提交
          const formEl = document.getElementById('node-form-container');
          const values: Record<string, any> = {};
          if (formEl) {
            const inputs = formEl.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input[name],textarea[name],select[name]');
            inputs.forEach((el) => {
              if (el.type === 'checkbox') {
                values[el.name] = (el as HTMLInputElement).checked;
              } else {
                values[el.name] = el.value;
              }
            });
          }
          if (previewInstance?.id) {
            const res = await submitNodeForm(previewInstance.id!, previewInstance.currentNodeId, values);
            if (res.success) {
              setNodeFormVisible(false);
            }
          }
        }}
        width={720}
      >
        <div id="node-form-container">
          {!nodeFormDef && <div>{intl.formatMessage({ id: 'pages.workflow.monitor.nodeForm.none', defaultMessage: '该节点未绑定表单' })}</div>}
          {nodeFormDef && (
            <Space orientation="vertical" style={{ width: '100%' }}>
              {nodeFormDef.fields?.map((field) => {
                const name = field.dataKey || field.label;
                const initVal = (nodeFormInitial || {})[name];
                switch (field.type) {
                  case FormFieldType.Number:
                    return (
                      <div key={name}>
                        <label>{field.label}</label>
                        <input name={name} type="number" defaultValue={initVal} placeholder={field.placeholder} />
                      </div>
                    );
                  case FormFieldType.Select:
                    return (
                      <div key={name}>
                        <label>{field.label}</label>
                        <select name={name} defaultValue={initVal}>
                          {(field.options || []).map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    );
                  case FormFieldType.TextArea:
                    return (
                      <div key={name}>
                        <label>{field.label}</label>
                        <textarea name={name} defaultValue={initVal} placeholder={field.placeholder} />
                      </div>
                    );
                  case FormFieldType.Switch:
                    return (
                      <div key={name}>
                        <label>{field.label}</label>
                        <input name={name} type="checkbox" defaultChecked={!!initVal} />
                      </div>
                    );
                  default:
                    return (
                      <div key={name}>
                        <label>{field.label}</label>
                        <input name={name} type="text" defaultValue={initVal} placeholder={field.placeholder} />
                      </div>
                    );
                }
              })}
            </Space>
          )}
        </div>
      </Modal>

      <Modal
        title={intl.formatMessage({ id: 'pages.workflow.monitor.modal.historyTitle' })}
        open={historyVisible}
        onCancel={() => {
          setHistoryVisible(false);
          setHistory([]);
        }}
        footer={null}
        width={800}
      >
        <div>
          {history.map((record, index) => (
            <Card key={index} style={{ marginBottom: 8 }}>
              <Space orientation="vertical" style={{ width: '100%' }}>
                <div>
                  <strong>{intl.formatMessage({ id: 'pages.workflow.monitor.history.approver' })}:</strong>{' '}
                  {record.approverName || record.approverId}
                </div>
                <div>
                  <strong>{intl.formatMessage({ id: 'pages.workflow.monitor.history.action' })}:</strong>{' '}
                  {(() => {
                    const actionMeta = getStatusMeta(intl, record.action as ApprovalAction, approvalActionMap);
                    return <Tag color={actionMeta.color}>{actionMeta.text}</Tag>;
                  })()}
                </div>
                {record.comment && (
                  <div>
                    <strong>{intl.formatMessage({ id: 'pages.workflow.monitor.history.comment' })}:</strong>{' '}
                    {record.comment}
                  </div>
                )}
                <div>
                  <strong>{intl.formatMessage({ id: 'pages.workflow.monitor.history.time' })}:</strong>{' '}
                  {record.approvedAt
                    ? dayjs(record.approvedAt).format('YYYY-MM-DD HH:mm:ss')
                    : '-'}
                </div>
              </Space>
            </Card>
          ))}
        </div>
      </Modal>
    </PageContainer>
  );
};

export default WorkflowMonitor;
