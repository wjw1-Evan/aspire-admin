import React, { useMemo, useRef, useState } from 'react';
import { PageContainer, StatCard } from '@/components';
import DataTable from '@/components/DataTable';
import {
  Button,
  Space,
  Modal,
  Tag,
  Drawer,
  Card,
  Descriptions,
  Select,
  Row,
  Col,
  Form,
  Input,
  Upload,
  DatePicker,
  InputNumber,
  Radio,
  Checkbox,
  Switch,
  Steps,
  theme,
  Spin,
} from 'antd';
import {
  FileTextOutlined,
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  SendOutlined,
  ClockCircleOutlined,
  UploadOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { request, useIntl, useModel } from '@umijs/max';
import useCommonStyles from '@/hooks/useCommonStyles';
import SearchFormCard from '@/components/SearchFormCard';
import { useMessage } from '@/hooks/useMessage';
import { useModal } from '@/hooks/useModal';
import type { ActionType } from '@/types/pro-components';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile, UploadProps } from 'antd/es/upload';
import {
  getDocumentList,
  getDocumentStatistics,
  getDocumentDetail,
  submitDocument,
  approveDocument,
  rejectDocument,
  returnDocument,
  delegateDocument,
  getPendingDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  getDocumentInstanceForm,
  uploadDocumentAttachment,
  type Document,
  type DocumentStatistics,
  type DocumentQueryParams,
  DocumentStatus,
} from '@/services/document/api';
import {
  getWorkflowList,
  getWorkflowDetail,
  getDocumentCreateForm,
  getNodeForm,
  executeNodeAction,
  createAndStartDocumentWorkflow,
  type WorkflowDefinition,
  FormFieldType,
  WorkflowStatus,
  ApprovalAction,
} from '@/services/workflow/api';
import { type FormDefinition } from '@/services/form/api';
import { getStatusMeta, documentStatusMap, workflowStatusMap, approvalActionMap } from '@/utils/statusMaps';
import dayjs from 'dayjs';
import type { Edge as FlowEdge, Node as FlowNode } from 'reactflow';

const WorkflowViewer = React.lazy(() => import('./components/WorkflowViewer'));

const DocumentManagement: React.FC = () => {
  const intl = useIntl();
  const message = useMessage();
  const actionRef = useRef<ActionType>(null);
  const [form] = Form.useForm();
  const { styles } = useCommonStyles();
  const { token } = theme.useToken();
  const modal = useModal();
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailFormDef, setDetailFormDef] = useState<FormDefinition | null>(null);
  const [detailFormValues, setDetailFormValues] = useState<Record<string, any> | null>(null);
  const [detailNodeFormDef, setDetailNodeFormDef] = useState<FormDefinition | null>(null);
  const [detailNodeFormValues, setDetailNodeFormValues] = useState<Record<string, any> | null>(null);
  const [detailNodeForms, setDetailNodeForms] = useState<Record<string, { def: FormDefinition | null; values: Record<string, any> }>>({});
  const [detailWorkflowDef, setDetailWorkflowDef] = useState<WorkflowDefinition | null>(null);
  const [detailVisibleLoading, setDetailVisibleLoading] = useState(false);
  const [submitModalVisible, setSubmitModalVisible] = useState(false);
  const [submittingDocument, setSubmittingDocument] = useState<Document | null>(null);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [workflowFormDef, setWorkflowFormDef] = useState<FormDefinition | null>(null);
  const [workflowInitialValues, setWorkflowInitialValues] = useState<Record<string, any>>({});
  const [wfAttachmentFileList, setWfAttachmentFileList] = useState<UploadFile[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
  const [isFormStep, setIsFormStep] = useState(false);
  const [nextStepLoading, setNextStepLoading] = useState(false);
  const [wfForm] = Form.useForm();
  const [searchParams, setSearchParams] = useState<DocumentQueryParams>({
    page: 1,
    pageSize: 10,
  });

  const [statistics, setStatistics] = useState<DocumentStatistics | null>(null);

  const fetchStatistics = async () => {
    try {
      const resp = await getDocumentStatistics();
      if (resp.success) {
        setStatistics(resp.data || null);
      }
    } catch (e) {
      console.error('获取统计信息失败', e);
    }
  };

  React.useEffect(() => {
    fetchStatistics();
  }, []);

  const graphNodes: FlowNode[] = useMemo(() => {
    if (!detailWorkflowDef?.graph?.nodes?.length) return [];
    const typeLabel = (type?: string) => {
      switch (type) {
        case 'start':
          return intl.formatMessage({ id: 'pages.workflow.node.start', defaultMessage: '开始' });
        case 'end':
          return intl.formatMessage({ id: 'pages.workflow.node.end', defaultMessage: '结束' });
        case 'approval':
          return intl.formatMessage({ id: 'pages.workflow.node.approval', defaultMessage: '审批' });
        case 'condition':
          return intl.formatMessage({ id: 'pages.workflow.node.condition', defaultMessage: '条件' });
        case 'parallel':
          return intl.formatMessage({ id: 'pages.workflow.node.parallel', defaultMessage: '并行' });
        default:
          return intl.formatMessage({ id: 'pages.workflow.node.unknown', defaultMessage: '节点' });
      }
    };
    return detailWorkflowDef.graph.nodes.map((node) => ({
      id: node.id,
      position: { x: node.position?.x || 0, y: node.position?.y || 0 },
      data: {
        label: (
          <div style={{ textAlign: 'center', padding: 6 }}>
            <div style={{ fontWeight: 600 }}>{typeLabel(node.type)}</div>
            <div style={{ fontSize: 12 }}>{node.label || node.id}</div>
          </div>
        ),
      },
      draggable: false,
      selectable: false,
      connectable: false,
      style: { borderRadius: 8, padding: 4, border: '1px solid #d9d9d9', background: '#fff' },
    }));
  }, [detailWorkflowDef, intl]);

  const graphEdges: FlowEdge[] = useMemo(() => {
    if (!detailWorkflowDef?.graph?.edges?.length) return [];
    return detailWorkflowDef.graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label || edge.condition,
      type: 'default',
      selectable: false,
    }));
  }, [detailWorkflowDef]);

  const handleRefresh = () => {
    actionRef.current?.reload?.();
    fetchStatistics();
  };

  const handleSearch = (values: any) => {
    setSearchParams((prev: DocumentQueryParams) => ({ ...prev, ...values, page: 1 }));
    actionRef.current?.reloadAndReset?.();
  };

  const handleReset = () => {
    form.resetFields();
    setSearchParams({ page: 1, pageSize: 10 });
    actionRef.current?.reset?.();
  };

  const getDocStatus = (status?: DocumentStatus | null) =>
    getStatusMeta(intl, status ?? null, documentStatusMap);

  const fetchActiveWorkflows = async () => {
    try {
      const resp = await getWorkflowList({ page: 1, pageSize: 100, isActive: true });
      if (resp.success) {
        setWorkflows(resp.data?.list || []);
      }
    } catch (e) {
      console.error('加载流程列表失败', e);
    }
  };

  const columns: ColumnsType<Document> = [
    {
      title: intl.formatMessage({ id: 'pages.document.table.title' }),
      dataIndex: 'title',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.document.table.type' }),
      dataIndex: 'documentType',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.document.table.category' }),
      dataIndex: 'category',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.document.table.status' }),
      dataIndex: 'status',
      render: (_, record: Document) => {
        const status = getDocStatus(record.status);
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.document.table.createdBy' }),
      dataIndex: 'createdBy',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.document.table.createdAt' }),
      dataIndex: 'createdAt',
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: intl.formatMessage({ id: 'pages.document.table.action' }),
      key: 'action',
      fixed: 'right' as const,
      render: (_, record: Document) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={async () => {
              try {
                setDetailVisibleLoading(true);
                const response = await getDocumentDetail(record.id!);
                if (response.success && response.data) {
                  setDetailData(response.data);
                  const rawData: any = response.data as any;
                  const doc = rawData.document ?? rawData;
                  const instance = response.data.workflowInstance ?? doc?.workflowInstance;
                  const defId = instance?.workflowDefinitionId;
                  const instanceId = instance?.id || instance?.workflowInstanceId || instance?.workflowInstance?.id;
                  const currentNodeId = instance?.currentNodeId;
                  const approvalHistory = response.data?.approvalHistory ?? doc?.approvalHistory ?? instance?.approvalHistory ?? [];
                  const workflowDefinition = response.data?.workflowDefinition;

                  // 使用实例快照中的流程定义（如果有）
                  if (workflowDefinition) {
                    setDetailWorkflowDef(workflowDefinition);
                  } else if (defId) {
                    // 如果没有快照，使用最新定义（向后兼容）
                    try {
                      const defResp = await getWorkflowDetail(defId);
                      if (defResp.success) {
                        setDetailWorkflowDef(defResp.data || null);
                      } else {
                        setDetailWorkflowDef(null);
                      }
                    } catch (err) {
                      console.error('加载流程定义失败', err);
                      setDetailWorkflowDef(null);
                    }
                  } else {
                    setDetailWorkflowDef(null);
                  }

                  // 使用实例快照中的表单定义（如果有实例）
                  if (instanceId) {
                    try {
                      const formResp = await getDocumentInstanceForm(record.id!);
                      if (formResp.success) {
                        const formDef = formResp.data?.form || null;
                        const values = formResp.data?.initialValues || {};
                        setDetailFormDef(formDef);
                        setDetailFormValues(values);
                      } else {
                        setDetailFormDef(null);
                        setDetailFormValues(null);
                      }
                    } catch (e) {
                      console.error('加载表单定义失败', e);
                      setDetailFormDef(null);
                      setDetailFormValues(null);
                    }
                  } else {
                    setDetailFormDef(null);
                    setDetailFormValues(null);
                  }

                  if (defId && !instanceId) {
                    // 如果没有实例，使用最新定义（向后兼容，用于草稿状态）
                    try {
                      const formResp = await getDocumentCreateForm(defId);
                      if (formResp.success) {
                        const formDef = formResp.data?.form || null;
                        const dataScopeKey = formResp.data?.dataScopeKey;
                        const sourceFormData = doc?.formData || {};
                        const values = dataScopeKey ? sourceFormData?.[dataScopeKey] || {} : sourceFormData || {};
                        setDetailFormDef(formDef);
                        setDetailFormValues(values);
                      } else {
                        setDetailFormDef(null);
                        setDetailFormValues(null);
                      }
                    } catch (e) {
                      console.error('加载表单定义失败', e);
                      setDetailFormDef(null);
                      setDetailFormValues(null);
                    }
                  }

                  if (instanceId && currentNodeId) {
                    try {
                      const nodeFormResp = await getNodeForm(instanceId, currentNodeId);
                      if (nodeFormResp.success) {
                        setDetailNodeFormDef(nodeFormResp.data?.form || null);
                        setDetailNodeFormValues(nodeFormResp.data?.initialValues || {});
                      } else {
                        setDetailNodeFormDef(null);
                        setDetailNodeFormValues(null);
                      }
                    } catch (err) {
                      console.error('加载节点表单失败', err);
                      setDetailNodeFormDef(null);
                      setDetailNodeFormValues(null);
                    }

                    // 拉取所有涉及的节点表单（已审批节点也可查看）
                    try {
                      const allNodeIds = Array.from(
                        new Set(
                          [currentNodeId, ...approvalHistory.map((h: any) => h.nodeId).filter(Boolean)],
                        ),
                      );
                      const forms: Record<string, { def: FormDefinition | null; values: Record<string, any> }> = {};
                      for (const nid of allNodeIds) {
                        try {
                          const nf = await getNodeForm(instanceId, nid);
                          if (nf.success) {
                            forms[nid] = {
                              def: nf.data?.form || null,
                              values: nf.data?.initialValues || {},
                            };
                          }
                        } catch (e) {
                          console.error('加载节点表单失败', nid, e);
                        }
                      }
                      setDetailNodeForms(forms);
                    } catch (e) {
                      console.error('批量加载节点表单失败', e);
                      setDetailNodeForms({});
                    }
                  } else {
                    setDetailNodeFormDef(null);
                    setDetailNodeFormValues(null);
                    setDetailNodeForms({});
                  }
                  setDetailVisible(true);
                }
              } catch (error) {
                console.error('获取详情失败:', error);
              } finally {
                setDetailVisibleLoading(false);
              }
            }}
          >
            {intl.formatMessage({ id: 'pages.document.action.view' })}
          </Button>
          {record.status === DocumentStatus.Draft && (
            <>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  window.location.href = `/document/edit/${record.id}`;
                }}
              >
                {intl.formatMessage({ id: 'pages.document.action.edit' })}
              </Button>
              <Button
                type="link"
                size="small"
                icon={<SendOutlined />}
                onClick={async () => {
                  try {
                    await fetchActiveWorkflows();
                    setSubmittingDocument(record);
                    setSubmitModalVisible(true);
                  } catch (error) {
                    console.error('获取流程列表失败:', error);
                  }
                }}
              >
                {intl.formatMessage({ id: 'pages.document.action.submit' })}
              </Button>
            </>
          )}
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={async () => {
              modal.confirm({
                title: intl.formatMessage({ id: 'pages.document.modal.confirmDelete' }),
                content: intl.formatMessage(
                  { id: 'pages.document.modal.confirmDeleteContent' },
                  { title: record.title }
                ),
                onOk: async () => {
                  try {
                    const response = await deleteDocument(record.id!);
                    if (response.success) {
                      message.success(intl.formatMessage({ id: 'pages.document.message.deleteSuccess' }));
                      actionRef.current?.reload?.();
                    }
                  } catch (error) {
                    console.error('删除失败:', error);
                    message.error(intl.formatMessage({ id: 'pages.document.message.deleteFailed' }));
                  }
                },
              });
            }}
          >
            {intl.formatMessage({ id: 'pages.document.action.delete' })}
          </Button>
        </Space>
      ),
    },
  ];

  const handleSubmit = async () => {
    if (!submittingDocument) return;

    if (!selectedWorkflowId) {
      message.warning(intl.formatMessage({ id: 'pages.document.modal.selectWorkflowPlaceholder' }));
      return;
    }

    try {
      const response = await submitDocument(submittingDocument.id!, {
        workflowDefinitionId: selectedWorkflowId,
      });
      if (response.success) {
        message.success(intl.formatMessage({ id: 'pages.document.message.submitSuccess' }));
        setSubmitModalVisible(false);
        setSubmittingDocument(null);
        setSelectedWorkflowId('');
        actionRef.current?.reload?.();
      }
    } catch (error) {
      console.error('提交失败:', error);
      message.error(intl.formatMessage({ id: 'pages.document.message.submitFailed' }));
    }
  };

  // 已废弃的创建/提交逻辑改为在模态窗体中按流程表单创建并启动

  // 工作流表单附件上传配置
  const wfUploadProps: UploadProps = {
    fileList: wfAttachmentFileList,
    multiple: true,
    customRequest: async (options) => {
      const { file, onSuccess, onError } = options;
      try {
        const response = await uploadDocumentAttachment(file as File);
        if (response.success && response.data?.id) {
          const ids = wfForm.getFieldValue('attachmentIds') || [];
          wfForm.setFieldsValue({ attachmentIds: [...ids, response.data.id] });

          const newFile: UploadFile = {
            uid: response.data.id,
            name: response.data.name || (file as any).name,
            status: 'done',
            url: response.data.url,
            size: response.data.size,
            type: response.data.contentType,
            response,
          };

          setWfAttachmentFileList((prev) => [...prev, newFile]);
          onSuccess?.(response, file as any);
        } else {
          const msg = response.errorMessage || intl.formatMessage({ id: 'pages.document.create.message.uploadFailed', defaultMessage: '附件上传失败' });
          message.error(msg);
          onError?.(new Error(msg));
        }
      } catch (err: any) {
        const msg = err?.message || intl.formatMessage({ id: 'pages.document.create.message.uploadFailed', defaultMessage: '附件上传失败' });
        message.error(msg);
        onError?.(err as Error);
      }
    },
    onRemove: (file) => {
      const currentIds: string[] = wfForm.getFieldValue('attachmentIds') || [];
      const filtered = currentIds.filter((id) => id !== file.uid);
      wfForm.setFieldsValue({ attachmentIds: filtered });
      setWfAttachmentFileList((prev) => prev.filter((f) => f.uid !== file.uid));
      return true;
    },
  };

  return (
    <PageContainer
      title={
        <Space>
          <FileTextOutlined />
          {intl.formatMessage({ id: 'pages.document.title' })}
        </Space>
      }
      style={{ paddingBlock: 12 }}
      extra={
        <Space wrap>
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
          >
            {intl.formatMessage({ id: 'pages.button.refresh' })}
          </Button>
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={async () => {
              await fetchActiveWorkflows();
              // 下一步模式：仅选择流程，随后在模态窗体内填写流程自定义表单
              setSelectedWorkflowId('');
              setWorkflowFormDef(null);
              setWorkflowInitialValues({});
              setIsFormStep(false);
              setWfAttachmentFileList([]);
              wfForm.resetFields();
              setCreateModalVisible(true);
            }}
          >
            {intl.formatMessage({ id: 'pages.document.create' })}
          </Button>
        </Space>
      }
    >
      {statistics && (
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} md={4}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.document.stat.total', defaultMessage: '总公文' })}
                value={statistics.totalDocuments}
                icon={<FileTextOutlined />}
                color="#1890ff"
              />
            </Col>
            <Col xs={24} sm={12} md={4}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.document.stat.draft', defaultMessage: '草稿箱' })}
                value={statistics.draftCount}
                icon={<EditOutlined />}
                color="#d9d9d9"
              />
            </Col>
            <Col xs={24} sm={12} md={4}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.document.stat.pending', defaultMessage: '待审批' })}
                value={statistics.pendingCount}
                icon={<ClockCircleOutlined />}
                color="#faad14"
              />
            </Col>
            <Col xs={24} sm={12} md={4}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.document.stat.approved', defaultMessage: '已通过' })}
                value={statistics.approvedCount}
                icon={<CheckCircleOutlined />}
                color="#52c41a"
              />
            </Col>
            <Col xs={24} sm={12} md={4}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.document.stat.rejected', defaultMessage: '已驳回' })}
                value={statistics.rejectedCount}
                icon={<CloseCircleOutlined />}
                color="#ff4d4f"
              />
            </Col>
            <Col xs={24} sm={12} md={4}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.document.stat.myCreated', defaultMessage: '我发起的' })}
                value={statistics.myCreatedCount}
                icon={<SendOutlined />}
                color="#722ed1"
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* 搜索表单 */}
      <SearchFormCard>
        <Form
          form={form}
          layout="inline"
          onFinish={(values) => {
            // 手动触发查询
            actionRef.current?.reloadAndRest?.();
          }}
        >
          <Form.Item name="keyword" label={intl.formatMessage({ id: 'pages.document.search.keyword', defaultMessage: '关键词' })}>
            <Input placeholder={intl.formatMessage({ id: 'pages.document.search.keywordPlaceholder', defaultMessage: '搜索标题或内容' })} />
          </Form.Item>
          <Form.Item name="status" label={intl.formatMessage({ id: 'pages.document.search.status', defaultMessage: '状态' })}>
            <Select
              allowClear
              placeholder={intl.formatMessage({ id: 'pages.document.search.statusPlaceholder', defaultMessage: '请选择状态' })}
              style={{ width: 120 }}
              options={[
                { label: intl.formatMessage({ id: 'pages.document.status.draft', defaultMessage: '草稿' }), value: DocumentStatus.Draft },
                { label: intl.formatMessage({ id: 'pages.document.status.pending', defaultMessage: '审批中' }), value: DocumentStatus.Pending },
                { label: intl.formatMessage({ id: 'pages.document.status.approved', defaultMessage: '已通过' }), value: DocumentStatus.Approved },
                { label: intl.formatMessage({ id: 'pages.document.status.rejected', defaultMessage: '已驳回' }), value: DocumentStatus.Rejected },
              ]}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {intl.formatMessage({ id: 'pages.search', defaultMessage: '查询' })}
              </Button>
              <Button onClick={handleReset}>
                {intl.formatMessage({ id: 'pages.reset', defaultMessage: '重置' })}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </SearchFormCard>

      <DataTable<Document>
        actionRef={actionRef}
        columns={columns}
        request={async (params) => {
          const response = await getDocumentList({
            ...searchParams,
            page: params.current,
            pageSize: params.pageSize,
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
      />

      <Drawer
        title={intl.formatMessage({ id: 'pages.document.modal.detailTitle' })}
        open={detailVisible}
        onClose={() => {
          setDetailVisible(false);
          setDetailData(null);
          setDetailNodeFormDef(null);
          setDetailNodeFormValues(null);
          setDetailNodeForms({});
        }}
        size={800}
      >
        {detailData && (() => {
          const doc = detailData?.document ?? detailData;
          const workflowInstance = detailData?.workflowInstance ?? doc?.workflowInstance;
          const approvalHistory = detailData?.approvalHistory ?? doc?.approvalHistory ?? workflowInstance?.approvalHistory;

          return (
            <div>
              <Card style={{ marginBottom: 16 }}>
                <Descriptions column={2} bordered>
                  <Descriptions.Item label={intl.formatMessage({ id: 'pages.document.detail.title' })}>
                    {doc?.title || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label={intl.formatMessage({ id: 'pages.document.detail.type' })}>
                    {doc?.documentType || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label={intl.formatMessage({ id: 'pages.document.detail.category' })}>
                    {doc?.category || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label={intl.formatMessage({ id: 'pages.document.detail.workflowStatus' })}>
                    {(() => {
                      const statusMeta = getStatusMeta(
                        intl,
                        workflowInstance?.status as WorkflowStatus | null,
                        workflowStatusMap,
                      );
                      return <Tag color={statusMeta.color}>{statusMeta.text}</Tag>;
                    })()}
                  </Descriptions.Item>
                  <Descriptions.Item label={intl.formatMessage({ id: 'pages.document.detail.createdBy' })}>
                    {doc?.createdBy || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label={intl.formatMessage({ id: 'pages.document.detail.createdAt' })}>
                    {doc?.createdAt ? dayjs(doc.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
              {doc?.content && (
                <Card title={intl.formatMessage({ id: 'pages.document.detail.content' })} style={{ marginTop: 16 }}>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{doc.content}</div>
                </Card>
              )}
              <Card title={intl.formatMessage({ id: 'pages.document.detail.formData', defaultMessage: '表单填写内容' })} style={{ marginTop: 16 }}>
                {detailFormDef && detailFormDef.fields?.length ? (
                  <Descriptions column={1} bordered>
                    {detailFormDef.fields.map((f) => {
                      const raw = detailFormValues ? detailFormValues[f.dataKey] : undefined;
                      const formatValue = () => {
                        if (raw === undefined || raw === null || raw === '') return '-';
                        switch (f.type) {
                          case FormFieldType.Date:
                          case FormFieldType.DateTime:
                            return dayjs(raw).isValid() ? dayjs(raw).format('YYYY-MM-DD HH:mm:ss') : String(raw);
                          case FormFieldType.Checkbox:
                            return Array.isArray(raw) ? raw.join(', ') : String(raw);
                          case FormFieldType.Switch:
                            return raw ? intl.formatMessage({ id: 'pages.boolean.yes', defaultMessage: '是' }) : intl.formatMessage({ id: 'pages.boolean.no', defaultMessage: '否' });
                          default:
                            return typeof raw === 'object' ? JSON.stringify(raw) : String(raw);
                        }
                      };
                      return (
                        <Descriptions.Item key={f.dataKey} label={f.label || f.dataKey}>
                          {formatValue()}
                        </Descriptions.Item>
                      );
                    })}
                  </Descriptions>
                ) : (
                  <pre style={{ background: '#f6f6f6', padding: 12, borderRadius: 8, minHeight: 80, whiteSpace: 'pre-wrap' }}>
                    {doc?.formData && Object.keys(doc.formData).length > 0
                      ? JSON.stringify(doc.formData, null, 2)
                      : intl.formatMessage({ id: 'pages.document.detail.formData.empty', defaultMessage: '暂无表单数据' })}
                  </pre>
                )}
              </Card>
              {workflowInstance && (
                <Card title={intl.formatMessage({ id: 'pages.document.detail.workflowInfo' })} style={{ marginTop: 16 }}>
                  <Descriptions column={1}>
                    <Descriptions.Item label={intl.formatMessage({ id: 'pages.document.detail.workflowStatus' })}>
                      {(() => {
                        const statusMeta = getStatusMeta(
                          intl,
                          workflowInstance?.status as WorkflowStatus | null,
                          workflowStatusMap,
                        );
                        return <Tag color={statusMeta.color}>{statusMeta.text}</Tag>;
                      })()}
                    </Descriptions.Item>
                    <Descriptions.Item label={intl.formatMessage({ id: 'pages.workflow.monitor.progress.currentNode' })}>
                      {(() => {
                        const currentId = workflowInstance.currentNodeId;
                        const nodeMeta = detailWorkflowDef?.graph?.nodes?.find((n) => n.id === currentId);
                        const typeLabel = (() => {
                          switch (nodeMeta?.type) {
                            case 'start':
                              return intl.formatMessage({ id: 'pages.workflow.node.start', defaultMessage: '开始' });
                            case 'end':
                              return intl.formatMessage({ id: 'pages.workflow.node.end', defaultMessage: '结束' });
                            case 'approval':
                              return intl.formatMessage({ id: 'pages.workflow.node.approval', defaultMessage: '审批' });
                            case 'condition':
                              return intl.formatMessage({ id: 'pages.workflow.node.condition', defaultMessage: '条件' });
                            case 'parallel':
                              return intl.formatMessage({ id: 'pages.workflow.node.parallel', defaultMessage: '并行' });
                            default:
                              return intl.formatMessage({ id: 'pages.workflow.node.unknown', defaultMessage: '节点' });
                          }
                        })();
                        const label = nodeMeta?.label || currentId;
                        return `${label} (${typeLabel}/${currentId})`;
                      })()}
                    </Descriptions.Item>
                  </Descriptions>

                  {detailWorkflowDef && (
                    <div style={{ marginTop: 12 }}>
                      <strong>{intl.formatMessage({ id: 'pages.workflow.monitor.progress.timeline', defaultMessage: '流程时间线、节点表单与审批历史' })}</strong>
                      <Steps
                        size="small"
                        direction="vertical"
                        style={{ marginTop: 8 }}
                        items={(() => {
                          const nodes: any[] = [...(detailWorkflowDef.graph?.nodes || [])];
                          const completedIds = new Set((approvalHistory || []).map((r: any) => r.nodeId));
                          const currentId = workflowInstance.currentNodeId;
                          const typeLabel = (type?: string) => {
                            switch (type) {
                              case 'start':
                                return intl.formatMessage({ id: 'pages.workflow.node.type.start', defaultMessage: '开始' });
                              case 'end':
                                return intl.formatMessage({ id: 'pages.workflow.node.type.end', defaultMessage: '结束' });
                              case 'approval':
                                return intl.formatMessage({ id: 'pages.workflow.node.type.approval', defaultMessage: '审批' });
                              case 'form':
                                return intl.formatMessage({ id: 'pages.workflow.node.type.form', defaultMessage: '表单' });
                              case 'gateway':
                                return intl.formatMessage({ id: 'pages.workflow.node.type.gateway', defaultMessage: '网关' });
                              default:
                                return type || intl.formatMessage({ id: 'pages.workflow.node.type.unknown', defaultMessage: '节点' });
                            }
                          };

                          const sorted = nodes.sort((a, b) => {
                            if (a.type === 'start') return -1;
                            if (b.type === 'start') return 1;
                            if (a.type === 'end') return 1;
                            if (b.type === 'end') return -1;
                            return 0;
                          });

                          return sorted.map((n: any) => {
                            const isCurrent = n.id === currentId;
                            const status = isCurrent
                              ? 'process'
                              : completedIds.has(n.id) || (n.type === 'start' && currentId && currentId !== n.id)
                                ? 'finish'
                                : 'wait';

                            // 获取该节点的审批历史
                            const nodeHistory = (approvalHistory || []).filter((h: any) => h.nodeId === n.id);

                            // 获取该节点的表单数据
                            const nodeFormData = detailNodeForms?.[n.id];

                            // 构建描述信息
                            const descriptionElements: React.ReactNode[] = [];

                            if (isCurrent) {
                              descriptionElements.push(
                                <div key="current" style={{ fontSize: 12, color: '#1890ff', fontWeight: 500, marginBottom: 4 }}>
                                  {intl.formatMessage({ id: 'pages.workflow.current', defaultMessage: '当前节点' })}
                                </div>
                              );
                            }

                            // 添加节点表单数据
                            if (nodeFormData?.def && nodeFormData.def.fields?.length > 0) {
                              descriptionElements.push(
                                <div key="form" style={{ marginTop: 8, marginBottom: 4 }}>
                                  <div style={{ fontSize: 12, fontWeight: 500, color: '#666', marginBottom: 4 }}>
                                    {intl.formatMessage({ id: 'pages.document.detail.nodeFormData', defaultMessage: '节点表单' })}:
                                  </div>
                                  <div style={{ fontSize: 12, color: '#666', paddingLeft: 8 }}>
                                    {nodeFormData.def.fields.map((f) => {
                                      const raw = nodeFormData.values ? nodeFormData.values[f.dataKey] : undefined;
                                      const formatValue = () => {
                                        if (raw === undefined || raw === null || raw === '') return '-';
                                        switch (f.type) {
                                          case FormFieldType.Date:
                                          case FormFieldType.DateTime:
                                            return dayjs(raw).isValid() ? dayjs(raw).format('YYYY-MM-DD HH:mm:ss') : String(raw);
                                          case FormFieldType.Checkbox:
                                            return Array.isArray(raw) ? raw.join(', ') : String(raw);
                                          case FormFieldType.Switch:
                                            return raw ? intl.formatMessage({ id: 'pages.boolean.yes', defaultMessage: '是' }) : intl.formatMessage({ id: 'pages.boolean.no', defaultMessage: '否' });
                                          default:
                                            return typeof raw === 'object' ? JSON.stringify(raw) : String(raw);
                                        }
                                      };
                                      return (
                                        <div key={f.dataKey} style={{ marginBottom: 2 }}>
                                          <span style={{ fontWeight: 500 }}>{f.label || f.dataKey}:</span> {formatValue()}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            }

                            // 添加审批历史信息
                            if (nodeHistory.length > 0) {
                              descriptionElements.push(
                                <div key="history" style={{ marginTop: 8 }}>
                                  <div style={{ fontSize: 12, fontWeight: 500, color: '#666', marginBottom: 4 }}>
                                    {intl.formatMessage({ id: 'pages.workflow.monitor.history.title', defaultMessage: '审批记录' })}:
                                  </div>
                                  <div style={{ fontSize: 12, color: '#666', paddingLeft: 8 }}>
                                    {nodeHistory.map((record: any, idx: number) => {
                                      const actionMeta = getStatusMeta(
                                        intl,
                                        record.action as ApprovalAction,
                                        approvalActionMap,
                                      );
                                      return (
                                        <div key={idx} style={{ marginBottom: 4 }}>
                                          <div>
                                            <span style={{ fontWeight: 500 }}>{record.approverName || record.approverId}</span>
                                            {' - '}
                                            <Tag color={actionMeta.color} style={{ fontSize: 11, margin: 0 }}>
                                              {actionMeta.text}
                                            </Tag>
                                          </div>
                                          {record.comment && (
                                            <div style={{ color: '#999', fontSize: 11, marginTop: 2, paddingLeft: 8 }}>
                                              {record.comment}
                                            </div>
                                          )}
                                          {record.approvedAt && (
                                            <div style={{ color: '#999', fontSize: 11, marginTop: 2 }}>
                                              {dayjs(record.approvedAt).format('YYYY-MM-DD HH:mm:ss')}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            }

                            return {
                              title: `${n.label || n.id} (${typeLabel(n.type)})`,
                              status,
                              description: descriptionElements.length > 0 ? (
                                <div style={{ marginTop: 4 }}>
                                  {descriptionElements}
                                </div>
                              ) : undefined,
                            };
                          });
                        })()}
                      />
                    </div>
                  )}

                  {detailWorkflowDef?.graph && (
                    <div style={{ marginTop: 12 }}>
                      <strong>{intl.formatMessage({ id: 'pages.document.detail.workflowGraph', defaultMessage: '流程图' })}</strong>
                      <div
                        style={{
                          height: 360,
                          marginTop: 8,
                          border: '1px solid #f0f0f0',
                          borderRadius: 8,
                          overflow: 'hidden',
                        }}
                      >
                        <React.Suspense fallback={<div style={{ padding: 20, textAlign: 'center' }}><Spin /></div>}>
                          <WorkflowViewer nodes={graphNodes} edges={graphEdges} />
                        </React.Suspense>
                      </div>
                    </div>
                  )}


                  {detailNodeFormDef && (
                    <div style={{ marginTop: 12 }}>
                      <strong>{intl.formatMessage({ id: 'pages.document.detail.nodeFormData', defaultMessage: '审批节点表单' })}</strong>
                      {detailNodeFormDef.fields?.length ? (
                        <Descriptions column={1} bordered style={{ marginTop: 8 }}>
                          {detailNodeFormDef.fields.map((f) => {
                            const raw = detailNodeFormValues ? detailNodeFormValues[f.dataKey] : undefined;
                            const formatValue = () => {
                              if (raw === undefined || raw === null || raw === '') return '-';
                              switch (f.type) {
                                case FormFieldType.Date:
                                case FormFieldType.DateTime:
                                  return dayjs(raw).isValid() ? dayjs(raw).format('YYYY-MM-DD HH:mm:ss') : String(raw);
                                case FormFieldType.Checkbox:
                                  return Array.isArray(raw) ? raw.join(', ') : String(raw);
                                case FormFieldType.Switch:
                                  return raw ? intl.formatMessage({ id: 'pages.boolean.yes', defaultMessage: '是' }) : intl.formatMessage({ id: 'pages.boolean.no', defaultMessage: '否' });
                                default:
                                  return typeof raw === 'object' ? JSON.stringify(raw) : String(raw);
                              }
                            };
                            return (
                              <Descriptions.Item key={`node-${f.dataKey}`} label={f.label || f.dataKey}>
                                {formatValue()}
                              </Descriptions.Item>
                            );
                          })}
                        </Descriptions>
                      ) : (
                        <pre style={{ background: '#f6f6f6', padding: 12, borderRadius: 8, minHeight: 80, whiteSpace: 'pre-wrap', marginTop: 8 }}>
                          {intl.formatMessage({ id: 'pages.document.detail.nodeFormData.empty', defaultMessage: '暂无节点表单数据' })}
                        </pre>
                      )}
                    </div>
                  )}
                </Card>
              )}
            </div>
          );
        })()}
      </Drawer>

      <Modal
        title={intl.formatMessage({ id: 'pages.document.modal.submitTitle' })}
        open={submitModalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setSubmitModalVisible(false);
          setSubmittingDocument(null);
          setSelectedWorkflowId('');
        }}
      >
        <div>
          <label style={{ display: 'block', marginBottom: '8px' }}>
            {intl.formatMessage({ id: 'pages.document.modal.selectWorkflow' })}:
          </label>
          <Select
            style={{ width: '100%' }}
            placeholder={intl.formatMessage({ id: 'pages.document.modal.selectWorkflowPlaceholder' })}
            value={selectedWorkflowId || undefined}
            onChange={(value) => setSelectedWorkflowId(value)}
          >
            {workflows
              .filter((w) => w.isActive)
              .map((workflow) => (
                <Select.Option key={workflow.id} value={workflow.id}>
                  {workflow.name}
                </Select.Option>
              ))}
          </Select>
        </div>
      </Modal>

      <Modal
        title={isFormStep ? intl.formatMessage({ id: 'pages.document.create.title.fillForm', defaultMessage: '填写流程表单' }) : intl.formatMessage({ id: 'pages.document.create.title' })}
        open={createModalVisible}
        okText={isFormStep ? intl.formatMessage({ id: 'pages.document.create.submit', defaultMessage: '提交' }) : intl.formatMessage({ id: 'pages.document.create.next', defaultMessage: '下一步' })}
        confirmLoading={nextStepLoading}
        onOk={async () => {
          if (!isFormStep) {
            if (!selectedWorkflowId) {
              message.warning(intl.formatMessage({ id: 'pages.document.modal.selectWorkflowPlaceholder' }));
              return;
            }
            try {
              setNextStepLoading(true);
              const resp = await getDocumentCreateForm(selectedWorkflowId);
              if (resp.success) {
                const def = resp.data?.form || null;
                setWorkflowFormDef(def);
                const initVals = resp.data?.initialValues || {};
                setWorkflowInitialValues(initVals);
                wfForm.setFieldsValue({ values: initVals, attachmentIds: [] });
                setIsFormStep(true);
              } else {
                message.error(resp.errorMessage || intl.formatMessage({ id: 'pages.workflow.form.loadFailed', defaultMessage: '表单加载失败' }));
              }
            } catch (e) {
              console.error(e);
              message.error(intl.formatMessage({ id: 'pages.workflow.form.loadFailed', defaultMessage: '表单加载失败' }));
            } finally {
              setNextStepLoading(false);
            }
            return;
          }

          try {
            await wfForm.validateFields();
            const values = wfForm.getFieldValue('values') || {};
            const normalizedValues: Record<string, any> = { ...values };
            if (workflowFormDef?.fields?.length) {
              for (const f of workflowFormDef.fields) {
                const key = f.dataKey;
                const val = values[key];
                if (val === undefined) continue;
                switch (f.type) {
                  case FormFieldType.Date:
                  case FormFieldType.DateTime:
                    normalizedValues[key] = val && (val as any).toISOString ? (val as any).toISOString() : val;
                    break;
                  case FormFieldType.Number:
                    normalizedValues[key] = typeof val === 'string' ? Number(val) : val;
                    break;
                  case FormFieldType.Checkbox:
                    normalizedValues[key] = Array.isArray(val) ? val : [val];
                    break;
                  default:
                    normalizedValues[key] = val;
                }
              }
            }
            const attachmentIds: string[] = wfForm.getFieldValue('attachmentIds') || [];
            if (!selectedWorkflowId) {
              message.error(intl.formatMessage({ id: 'pages.workflow.select.definition', defaultMessage: '请先选择流程' }));
              return;
            }
            setNextStepLoading(true);
            const resp = await createAndStartDocumentWorkflow(selectedWorkflowId, {
              values: normalizedValues,
              attachmentIds,
            });
            if (resp.success) {
              message.success(intl.formatMessage({ id: 'pages.document.create.message.createSuccess', defaultMessage: '创建并启动成功' }));
              setCreateModalVisible(false);
              setIsFormStep(false);
              setSelectedWorkflowId('');
              setWorkflowFormDef(null);
              setWorkflowInitialValues({});
              wfForm.resetFields();
              setWfAttachmentFileList([]);
              actionRef.current?.reload?.();
            } else {
              message.error(resp.errorMessage || intl.formatMessage({ id: 'pages.document.create.message.createFailed', defaultMessage: '创建失败' }));
            }
          } catch (err) {
            console.error(err);
            message.error(intl.formatMessage({ id: 'pages.document.create.message.createFailed', defaultMessage: '创建失败' }));
          } finally {
            setNextStepLoading(false);
          }
        }}
        onCancel={() => {
          setCreateModalVisible(false);
          setIsFormStep(false);
          setSelectedWorkflowId('');
          setWorkflowFormDef(null);
          setWorkflowInitialValues({});
          wfForm.resetFields();
          setWfAttachmentFileList([]);
        }}
        maskClosable={false}
        width={720}
      >
        {!isFormStep ? (
          <div>
            <div style={{ marginBottom: 8 }}>
              {intl.formatMessage({ id: 'pages.document.create.nextStep.tip', defaultMessage: '请选择流程，下一步将在模态窗体内填写流程自定义表单并创建/启动流程。' })}
            </div>
            <Select
              style={{ width: '100%' }}
              placeholder={intl.formatMessage({ id: 'pages.document.modal.selectWorkflowPlaceholder' })}
              value={selectedWorkflowId || undefined}
              onChange={(value) => setSelectedWorkflowId(value)}
            >
              {workflows
                .filter((w) => w.isActive)
                .map((workflow) => (
                  <Select.Option key={workflow.id} value={workflow.id}>
                    {workflow.name}
                  </Select.Option>
                ))}
            </Select>
          </div>
        ) : (
          <Form form={wfForm} layout="vertical" initialValues={{ values: workflowInitialValues, attachmentIds: [] }}>
            {(workflowFormDef?.fields || []).map((f) => {
              const common = {
                name: ['values', f.dataKey],
                label: f.label,
                rules: f.required ? [{ required: true, message: intl.formatMessage({ id: 'pages.form.required' }) }] : [],
              } as any;

              switch (f.type) {
                case FormFieldType.Text:
                  return (
                    <Form.Item key={f.dataKey} {...common}>
                      <Input placeholder={f.placeholder} />
                    </Form.Item>
                  );
                case FormFieldType.TextArea:
                  return (
                    <Form.Item key={f.dataKey} {...common}>
                      <Input.TextArea rows={4} placeholder={f.placeholder} />
                    </Form.Item>
                  );
                case FormFieldType.Number:
                  return (
                    <Form.Item key={f.dataKey} {...common}>
                      <InputNumber style={{ width: '100%' }} />
                    </Form.Item>
                  );
                case FormFieldType.Date:
                  return (
                    <Form.Item key={f.dataKey} {...common} getValueProps={(v: any) => ({ value: v ? dayjs(v) : undefined })}>
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  );
                case FormFieldType.DateTime:
                  return (
                    <Form.Item key={f.dataKey} {...common} getValueProps={(v: any) => ({ value: v ? dayjs(v) : undefined })}>
                      <DatePicker showTime style={{ width: '100%' }} />
                    </Form.Item>
                  );
                case FormFieldType.Select:
                  return (
                    <Form.Item key={f.dataKey} {...common}>
                      <Select options={(f.options || []).map(o => ({ label: o.label, value: o.value }))} placeholder={f.placeholder} />
                    </Form.Item>
                  );
                case FormFieldType.Radio:
                  return (
                    <Form.Item key={f.dataKey} {...common}>
                      <Radio.Group options={(f.options || []).map(o => ({ label: o.label, value: o.value }))} />
                    </Form.Item>
                  );
                case FormFieldType.Checkbox:
                  return (
                    <Form.Item key={f.dataKey} {...common}>
                      <Checkbox.Group options={(f.options || []).map(o => ({ label: o.label, value: o.value }))} />
                    </Form.Item>
                  );
                case FormFieldType.Switch:
                  return (
                    <Form.Item key={f.dataKey} {...common} valuePropName="checked">
                      <Switch />
                    </Form.Item>
                  );
                case FormFieldType.Attachment:
                  return (
                    <Form.Item key={f.dataKey} label={f.label}>
                      <Upload {...wfUploadProps}>
                        <Button icon={<UploadOutlined />}>{intl.formatMessage({ id: 'pages.document.create.form.uploadButton', defaultMessage: '上传附件' })}</Button>
                      </Upload>
                    </Form.Item>
                  );
                default:
                  return (
                    <Form.Item key={f.dataKey} {...common}>
                      <Input />
                    </Form.Item>
                  );
              }
            })}

            <Form.Item name="attachmentIds" hidden />
          </Form>
        )}
      </Modal>
    </PageContainer >
  );
};

export default DocumentManagement;
