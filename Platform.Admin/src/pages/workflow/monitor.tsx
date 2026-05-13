import { EyeOutlined, FormOutlined, HistoryOutlined, MonitorOutlined } from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components/es/card';
import { PageContainer } from '@ant-design/pro-components/es/layout';
import { ProColumns, ProTable } from '@ant-design/pro-components/es/table';
import { useIntl, useLocation } from '@umijs/max';
import { Button, Checkbox, Form, Input, InputNumber, Modal, Select, Space, Switch, Tag } from 'antd';
import dayjs from 'dayjs';
import React, { useEffect, useRef, useState } from 'react';
import {
  ApprovalAction,
  type FormDefinition,
  FormFieldType,
  getApprovalHistory,
  getNodeForm,
  getWorkflowDetail,
  getWorkflowInstance,
  getWorkflowInstances,
  submitNodeForm,
  type WorkflowGraph,
  type WorkflowInstance,
  WorkflowStatus,
} from '@/services/workflow/api';
import { approvalActionMap, getStatusMeta, workflowStatusMap } from '@/utils/statusMaps';
import WorkflowDesigner from './components/WorkflowDesigner';

const WorkflowMonitor: React.FC = () => {
  const intl = useIntl();
  const location = useLocation();
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
  const actionRef = useRef<any>(null);
  const [search, setSearch] = useState('');

  // Handle instanceId from URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const instanceId = params.get('instanceId');
    if (instanceId) {
      // Auto-open preview for the specified instance
      const loadInstance = async () => {
        try {
          const instanceResponse = await getWorkflowInstance(instanceId);
          if (instanceResponse.success && instanceResponse.data) {
            const instance = instanceResponse.data;
            const definitionResponse = await getWorkflowDetail(instance.workflowDefinitionId);
            setPreviewInstance(instance);
            if (definitionResponse.success && definitionResponse.data) {
              setPreviewGraph(definitionResponse.data.graph);
            } else {
              setPreviewGraph(null);
            }
            setPreviewVisible(true);
          }
        } catch (error) {
          console.error(intl.formatMessage({ id: 'pages.workflow.monitor.error.getInstanceFailed' }), error);
        }
      };
      loadInstance();
    }
  }, [location.search, intl]);

  const getFlowStatus = (status?: WorkflowStatus | null) => getStatusMeta(intl, status, workflowStatusMap);

  const [nodeForm] = Form.useForm();

  useEffect(() => {
    if (nodeFormInitial && nodeFormVisible) {
      nodeForm.setFieldsValue(nodeFormInitial);
    }
  }, [nodeFormInitial, nodeFormVisible, nodeForm]);

  const openNodeForm = async (instanceId: string, currentNodeId?: string) => {
    setNodeFormDef(null);
    setNodeFormInitial(null);
    setNodeFormVisible(false);
    setCurrentFormInstanceId(instanceId);
    setNodeFormLoading(true);
    try {
      const res = await getNodeForm(instanceId, currentNodeId || '');
      if (res.success) {
        setNodeFormDef(res.data?.form || null);
        setNodeFormInitial(res.data?.initialValues || null);
        nodeForm.resetFields();
        setTimeout(() => setNodeFormVisible(true), 50);
      } else {
        console.error(intl.formatMessage({ id: 'pages.workflow.monitor.error.getNodeFormFailed' }), res.message);
      }
    } catch (error) {
      console.error(intl.formatMessage({ id: 'pages.workflow.monitor.error.getNodeFormFailed' }), error);
    } finally {
      setNodeFormLoading(false);
    }
  };

  const submitFormData = async () => {
    if (!currentFormInstanceId) return;
    try {
      const values = await nodeForm.validateFields();
      const res = await submitNodeForm(currentFormInstanceId!, previewInstance?.currentNodeId || '', values);
      if (res.success) {
        setNodeFormVisible(false);
        setNodeFormDef(null);
        setNodeFormInitial(null);
        setCurrentFormInstanceId(null);
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) return; // validation error, handled by form
      console.error(intl.formatMessage({ id: 'pages.workflow.monitor.error.submitFormFailed' }), error);
    }
  };

  const columns: ProColumns<WorkflowInstance>[] = [
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
      render: (dom) => (dom ? dayjs(dom as string).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.monitor.table.completedAt' }),
      dataIndex: 'completedAt',
      sorter: true,
      render: (dom) => (dom ? dayjs(dom as string).format('YYYY-MM-DD HH:mm:ss') : '-'),
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
                if (instanceResponse.success && instanceResponse.data) setPreviewInstance(instanceResponse.data);
                if (definitionResponse.success && definitionResponse.data)
                  setPreviewGraph(definitionResponse.data.graph);
                else setPreviewGraph(null);
                setPreviewVisible(true);
              } catch (error) {
                console.error(intl.formatMessage({ id: 'pages.workflow.monitor.error.getInstanceFailed' }), error);
              }
            }}
          >
            {intl.formatMessage({ id: 'pages.workflow.monitor.action.viewProgress' })}
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
                console.error(intl.formatMessage({ id: 'pages.workflow.monitor.error.getHistoryFailed' }), error);
              }
            }}
          >
            {intl.formatMessage({ id: 'pages.workflow.monitor.action.viewHistory' })}
          </Button>
          <Button
            type="link"
            size="small"
            icon={<FormOutlined />}
            onClick={() => {
              if (record.id) openNodeForm(record.id!, record.currentNodeId);
            }}
          >
            表单
          </Button>
        </Space>
      ),
    },
  ];

  const renderNodeForm = () => {
    if (!nodeFormDef)
      return (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#999',
            fontSize: 14,
            backgroundColor: '#fafafa',
            borderRadius: 8,
            border: '1px dashed #d9d9d9',
          }}
        >
          <span style={{ fontSize: 48, display: 'block', marginBottom: 16 }}>📝</span>
          <div>{intl.formatMessage({ id: 'pages.workflow.monitor.nodeForm.none' })}</div>
        </div>
      );
    return (
      <Form form={nodeForm} layout="vertical" key={currentFormInstanceId}>
        {nodeFormDef.fields?.map((field, index) => {
          const name = field.dataKey || field.label;
          const label = field.label;
          const placeholder =
            field.placeholder || intl.formatMessage({ id: 'pages.workflow.monitor.form.inputPlaceholder' }, { label });
          switch (field.type) {
            case FormFieldType.Number:
              return (
                <Form.Item
                  key={`${currentFormInstanceId}-${name}-${index}`}
                  name={name}
                  label={label}
                  rules={field.required ? [{ required: true, message: `请填写${label}` }] : []}
                >
                  <InputNumber style={{ width: '100%' }} placeholder={placeholder} />
                </Form.Item>
              );
            case FormFieldType.Select:
              return (
                <Form.Item
                  key={`${currentFormInstanceId}-${name}-${index}`}
                  name={name}
                  label={label}
                  rules={field.required ? [{ required: true, message: `请选择${label}` }] : []}
                >
                  <Select placeholder={placeholder} allowClear>
                    {(field.options || []).map((opt, optIndex) => (
                      <Select.Option key={`${opt.value}-${optIndex}`} value={opt.value}>
                        {opt.label}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              );
            case FormFieldType.TextArea:
              return (
                <Form.Item
                  key={`${currentFormInstanceId}-${name}-${index}`}
                  name={name}
                  label={label}
                  rules={field.required ? [{ required: true, message: `请填写${label}` }] : []}
                >
                  <Input.TextArea rows={4} placeholder={placeholder} />
                </Form.Item>
              );
            case FormFieldType.Switch:
              return (
                <Form.Item
                  key={`${currentFormInstanceId}-${name}-${index}`}
                  name={name}
                  label={label}
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              );
            case FormFieldType.Checkbox:
              return (
                <Form.Item
                  key={`${currentFormInstanceId}-${name}-${index}`}
                  name={name}
                  label={label}
                  valuePropName="checked"
                >
                  <Checkbox>{label}</Checkbox>
                </Form.Item>
              );
            default:
              return (
                <Form.Item
                  key={`${currentFormInstanceId}-${name}-${index}`}
                  name={name}
                  label={label}
                  rules={field.required ? [{ required: true, message: `请填写${label}` }] : []}
                >
                  <Input placeholder={placeholder} />
                </Form.Item>
              );
          }
        })}
      </Form>
    );
  };

  return (
    <PageContainer>
      <ProTable
        headerTitle={
          <Space size={24}>
            <Space>
              <MonitorOutlined />
              {intl.formatMessage({ id: 'pages.workflow.monitor.title' })}
            </Space>
          </Space>
        }
        actionRef={actionRef as any}
        rowKey="id"
        search={false}
        request={async (params: any, sort: any, filter: any) => {
          const response = await getWorkflowInstances({ ...params, search, sort, filter });
          if (response.success && response.data) {
            return { data: response.data.queryable || [], total: response.data.rowCount || 0, success: true };
          }
          return { data: [], total: 0, success: false };
        }}
        columns={columns}
        scroll={{ x: 'max-content' }}
        toolBarRender={() => [
          <Input.Search
            key="search"
            placeholder={intl.formatMessage({ id: 'pages.common.search' })}
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={(value) => {
              setSearch(value);
              (actionRef.current as any)?.reload();
            }}
            style={{ width: 260 }}
          />,
        ]}
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
            <ProCard style={{ marginBottom: 16 }}>
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
                  {intl.formatMessage({ id: 'pages.workflow.monitor.table.startedBy' })}: {previewInstance.startedBy}
                </span>
                <Button
                  type="primary"
                  disabled={nodeFormLoading}
                  onClick={() => {
                    if (previewInstance?.id) openNodeForm(previewInstance.id, previewInstance.currentNodeId);
                  }}
                >
                  {intl.formatMessage({ id: 'pages.workflow.monitor.action.viewNodeForm' })}
                </Button>
              </Space>
            </ProCard>
            <div style={{ height: '500px', border: '1px solid #d9d9d9' }}>
              <WorkflowDesigner open={true} graph={previewGraph || undefined} />
            </div>
          </div>
        )}
      </Modal>
      <Modal
        title={intl.formatMessage({ id: 'pages.workflow.monitor.modal.nodeFormTitle' })}
        open={nodeFormVisible}
        onCancel={() => {
          setNodeFormVisible(false);
          setNodeFormDef(null);
          nodeForm.resetFields();
          setNodeFormInitial(null);
          setCurrentFormInstanceId(null);
        }}
        onOk={submitFormData}
        width={720}
        styles={{ body: { maxHeight: '600px', overflowY: 'auto' } }}
      >
        <div style={{ padding: '16px 0' }}>{renderNodeForm()}</div>
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
            <ProCard key={index} style={{ marginBottom: 8 }}>
              <Space orientation="vertical" style={{ width: '100%' }}>
                <div>
                  <strong>{intl.formatMessage({ id: 'pages.workflow.monitor.history.approver' })}:</strong>{' '}
                  {record.approverName || record.approverId}
                </div>
                <div>
                  <strong>{intl.formatMessage({ id: 'pages.workflow.monitor.history.action' })}:</strong> {(() => {
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
                  {record.approvedAt ? dayjs(record.approvedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
                </div>
              </Space>
            </ProCard>
          ))}
        </div>
      </Modal>
    </PageContainer>
  );
};

export default WorkflowMonitor;
