import React, { useRef, useState, useCallback, useEffect } from 'react';
import { PageContainer } from '@/components';
import { Card, Tag, Space, Button, Modal, Grid, Table } from 'antd';
import { EyeOutlined, MonitorOutlined, ReloadOutlined, HistoryOutlined, FormOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
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
import SearchBar from '@/components/SearchBar';
import type { PageParams } from '@/types/page-params';

const { useBreakpoint } = Grid;

const WorkflowMonitor: React.FC = () => {
  const intl = useIntl();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
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
  const [data, setData] = useState<WorkflowInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });

  const searchParamsRef = useRef<PageParams>({
    search: '',
  });

  const fetchData = useCallback(async () => {
    const currentParams = searchParamsRef.current;

    setLoading(true);
    try {
      const response = await getWorkflowInstances({
        page: currentParams.page,
        pageSize: currentParams.pageSize,
        workflowDefinitionId: currentParams.workflowDefinitionId,
        status: currentParams.status,
        search: currentParams.search,
      });
      if (response.success && response.data) {
        setData(response.data.queryable || []);
        setPagination(prev => ({
          ...prev,
          page: currentParams.page ?? prev.page,
          pageSize: currentParams.pageSize ?? prev.pageSize,
          total: response.data!.rowCount ?? 0,
        }));
      } else {
        setData([]);
        setPagination(prev => ({ ...prev, total: 0 }));
      }
    } catch (error) {
      console.error('获取工作流实例列表失败:', error);
      setData([]);
      setPagination(prev => ({ ...prev, total: 0 }));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback((params: PageParams) => {
    searchParamsRef.current = { ...searchParamsRef.current, ...params, page: 1 };
    fetchData();
  }, [fetchData]);

  const handleTableChange = useCallback((pag: any, _filters: any, sorter: any) => {
    const newPage = pag.current;
    const newPageSize = pag.pageSize;
    const sortBy = sorter?.field;
    const sortOrder = sorter?.order === 'ascend' ? 'asc' : sorter?.order === 'descend' ? 'desc' : undefined;
    
    searchParamsRef.current = {
      ...searchParamsRef.current,
      page: newPage,
      pageSize: newPageSize,
      sortBy,
      sortOrder,
    };
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    fetchData();
  };

  const getFlowStatus = (status?: WorkflowStatus | null) => getStatusMeta(intl, status, workflowStatusMap);

  const columns: ColumnsType<WorkflowInstance> = [
    {
      title: intl.formatMessage({ id: 'pages.workflow.monitor.table.instanceId' }),
      dataIndex: 'id',
      ellipsis: true,
      sorter: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.monitor.table.status' }),
      dataIndex: 'status',
      sorter: true,
      render: (_, record) => {
        const status = getFlowStatus(record.status);
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.monitor.table.startedBy' }),
      dataIndex: 'startedBy',
      ellipsis: true,
      sorter: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.monitor.table.startedAt' }),
      dataIndex: 'startedAt',
      sorter: true,
      render: (text) => (text ? dayjs(text as string).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.monitor.table.completedAt' }),
      dataIndex: 'completedAt',
      sorter: true,
      render: (text) => (text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.monitor.table.action' }),
      key: 'action',
      fixed: 'right',
      width: 260,
      render: (_, record) => (
        <Space size="small" wrap>
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
            进度
          </Button>
          <Button
            type="link"
            size="small"
            icon={<HistoryOutlined />}
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
            历史
          </Button>
          <Button
            type="link"
            size="small"
            icon={<FormOutlined />}
            onClick={async () => {
              if (!record.id) return;

              // 立即重置表单状态，确保不显示之前的数据
              setNodeFormDef(null);
              setNodeFormInitial(null);
              setNodeFormVisible(false); // 先关闭模态框
              setCurrentFormInstanceId(record.id);
              setNodeFormLoading(true);

              try {
                const res = await getNodeForm(record.id!, record.currentNodeId);
                if (res.success) {
                  // 确保数据是最新的
                  setNodeFormDef(res.data?.form || null);
                  setNodeFormInitial(res.data?.initialValues || null);
                  // 延迟一点再打开模态框，确保状态已更新
                  setTimeout(() => {
                    setNodeFormVisible(true);
                  }, 50);
                } else {
                  console.error('获取节点表单失败:', res.message);
                }
              } catch (error) {
                console.error('获取节点表单失败:', error);
              } finally {
                setNodeFormLoading(false);
              }
            }}
          >
            表单
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
      <SearchBar
        initialParams={searchParamsRef.current}
        onSearch={handleSearch}
        style={{ marginBottom: 16 }}
      />

      <Table<WorkflowInstance>
        dataSource={data}
        columns={columns}
        rowKey="id"
        loading={loading}
        scroll={{ x: 'max-content' }}
        onChange={handleTableChange}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
        }}
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

                    // 立即重置表单状态，确保不显示之前的数据
                    setNodeFormDef(null);
                    setNodeFormInitial(null);
                    setNodeFormVisible(false); // 先关闭模态框
                    setCurrentFormInstanceId(previewInstance.id);
                    setNodeFormLoading(true);

                    try {
                      const res = await getNodeForm(previewInstance.id!, previewInstance.currentNodeId);
                      if (res.success) {
                        // 确保数据是最新的
                        setNodeFormDef(res.data?.form || null);
                        setNodeFormInitial(res.data?.initialValues || null);
                        // 延迟一点再打开模态框，确保状态已更新
                        setTimeout(() => {
                          setNodeFormVisible(true);
                        }, 50);
                      } else {
                        console.error('获取节点表单失败:', res.message);
                      }
                    } catch (error) {
                      console.error('获取节点表单失败:', error);
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
                open={true}
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
          // 重置表单状态
          setNodeFormDef(null);
          setNodeFormInitial(null);
          setCurrentFormInstanceId(null);
        }}
        onOk={async () => {
          // 收集表单数据并提交
          const formEl = document.getElementById('node-form-container');
          const values: Record<string, any> = {};
          if (formEl) {
            const inputs = formEl.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input[name],textarea[name],select[name]');
            inputs.forEach((el) => {
              const name = el.name;
              if (!name) return; // 跳过没有name属性的元素

              if (el.type === 'checkbox') {
                values[name] = (el as HTMLInputElement).checked;
              } else if (el.type === 'number') {
                // 处理数字类型，确保转换为数字或保持为空
                const numValue = (el as HTMLInputElement).value;
                values[name] = numValue === '' ? null : Number(numValue);
              } else {
                // 处理文本、选择框等其他类型
                const textValue = el.value.trim();
                values[name] = textValue === '' ? null : textValue;
              }
            });
          }

          if (currentFormInstanceId) {
            try {
              const res = await submitNodeForm(currentFormInstanceId!, previewInstance?.currentNodeId || '', values);
              if (res.success) {
                setNodeFormVisible(false);
                setNodeFormDef(null);
                setNodeFormInitial(null);
                setCurrentFormInstanceId(null);
                fetchData();
              }
            } catch (error) {
              console.error('提交表单失败:', error);
            }
          }
        }}
        width={isMobile ? '100%' : 720}
        styles={{
          body: {
            maxHeight: isMobile ? 'calc(100vh - 200px)' : '600px',
            overflowY: 'auto'
          }
        }}
      >
        <style>
          {`
            .node-form-field {
              margin-bottom: 20px;
            }
            .node-form-field:last-child {
              margin-bottom: 0;
            }
            .node-form-label {
              display: block;
              font-size: 14px;
              font-weight: 500;
              color: #262626;
              margin-bottom: 8px;
              line-height: 1.4;
            }
            .node-form-label.required::after {
              content: '*';
              color: #ff4d4f;
              margin-left: 4px;
            }
            .node-form-input,
            .node-form-textarea,
            .node-form-select {
              width: 100%;
              padding: 8px 12px;
              border: 1px solid #d9d9d9;
              border-radius: 6px;
              font-size: 14px;
              line-height: 1.5;
              transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
              outline: none;
              background-color: #fff;
            }
            .node-form-input:hover,
            .node-form-textarea:hover,
            .node-form-select:hover {
              border-color: #40a9ff;
            }
            .node-form-input:focus,
            .node-form-textarea:focus,
            .node-form-select:focus {
              border-color: #1890ff;
              box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
            }
            .node-form-input:disabled,
            .node-form-textarea:disabled,
            .node-form-select:disabled {
              background-color: #f5f5f5;
              border-color: #d9d9d9;
              color: rgba(0, 0, 0, 0.25);
              cursor: not-allowed;
            }
            .node-form-textarea {
              resize: vertical;
              min-height: 80px;
            }
            .node-form-select {
              cursor: pointer;
            }
            .node-form-checkbox-wrapper {
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 4px 0;
            }
            .node-form-checkbox {
              width: 16px;
              height: 16px;
              cursor: pointer;
              accent-color: #1890ff;
            }
            .node-form-checkbox-label {
              font-size: 14px;
              font-weight: 500;
              color: #262626;
              cursor: pointer;
              margin: 0;
              line-height: 1.4;
            }
            .node-form-empty {
              text-align: center;
              padding: 60px 20px;
              color: #999;
              font-size: 14px;
              background-color: #fafafa;
              border-radius: 8px;
              border: 1px dashed #d9d9d9;
            }
            .node-form-empty-icon {
              font-size: 48px;
              color: #d9d9d9;
              margin-bottom: 16px;
              display: block;
            }
            @media (max-width: 768px) {
              .node-form-input,
              .node-form-textarea,
              .node-form-select {
                font-size: 16px; /* 防止iOS缩放 */
              }
            }
          `}
        </style>
        <div id="node-form-container" style={{ padding: '16px 0' }} key={currentFormInstanceId}>
          {!nodeFormDef && (
            <div className="node-form-empty">
              <span className="node-form-empty-icon">📝</span>
              <div>{intl.formatMessage({ id: 'pages.workflow.monitor.nodeForm.none', defaultMessage: '该节点未绑定表单' })}</div>
            </div>
          )}
          {nodeFormDef && (
            <div>
              {nodeFormDef.fields?.map((field, index) => {
                const name = field.dataKey || field.label;
                const initVal = (nodeFormInitial || {})[name];
                const isRequired = field.required;

                switch (field.type) {
                  case FormFieldType.Number:
                    return (
                      <div key={`${currentFormInstanceId}-${name}-${index}`} className="node-form-field">
                        <label className={`node-form-label ${isRequired ? 'required' : ''}`}>
                          {field.label}
                        </label>
                        <input
                          name={name}
                          type="number"
                          defaultValue={initVal != null ? String(initVal) : ''}
                          placeholder={field.placeholder || `请输入${field.label}`}
                          className="node-form-input"
                          required={isRequired}
                          step="any"
                        />
                      </div>
                    );
                  case FormFieldType.Select:
                    return (
                      <div key={`${currentFormInstanceId}-${name}-${index}`} className="node-form-field">
                        <label className={`node-form-label ${isRequired ? 'required' : ''}`}>
                          {field.label}
                        </label>
                        <select
                          name={name}
                          defaultValue={initVal != null ? String(initVal) : ''}
                          className="node-form-select"
                          required={isRequired}
                        >
                          <option value="">请选择{field.label}</option>
                          {(field.options || []).map((opt, optIndex) => (
                            <option key={`${opt.value}-${optIndex}`} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  case FormFieldType.TextArea:
                    return (
                      <div key={`${currentFormInstanceId}-${name}-${index}`} className="node-form-field">
                        <label className={`node-form-label ${isRequired ? 'required' : ''}`}>
                          {field.label}
                        </label>
                        <textarea
                          name={name}
                          defaultValue={initVal != null ? String(initVal) : ''}
                          placeholder={field.placeholder || `请输入${field.label}`}
                          rows={4}
                          className="node-form-textarea"
                          required={isRequired}
                        />
                      </div>
                    );
                  case FormFieldType.Switch:
                    return (
                      <div key={`${currentFormInstanceId}-${name}-${index}`} className="node-form-field">
                        <div className="node-form-checkbox-wrapper">
                          <input
                            name={name}
                            type="checkbox"
                            defaultChecked={!!initVal}
                            className="node-form-checkbox"
                            id={`checkbox-${currentFormInstanceId}-${name}-${index}`}
                          />
                          <label
                            htmlFor={`checkbox-${currentFormInstanceId}-${name}-${index}`}
                            className="node-form-checkbox-label"
                          >
                            {field.label}
                          </label>
                        </div>
                      </div>
                    );
                  default:
                    return (
                      <div key={`${currentFormInstanceId}-${name}-${index}`} className="node-form-field">
                        <label className={`node-form-label ${isRequired ? 'required' : ''}`}>
                          {field.label}
                        </label>
                        <input
                          name={name}
                          type="text"
                          defaultValue={initVal != null ? String(initVal) : ''}
                          placeholder={field.placeholder || `请输入${field.label}`}
                          className="node-form-input"
                          required={isRequired}
                        />
                      </div>
                    );
                }
              })}
            </div>
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
              <Space direction="vertical" style={{ width: '100%' }}>
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
