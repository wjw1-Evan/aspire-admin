import React, { useRef, useState } from 'react';
import { PageContainer } from '@/components';
import { Button, Space, message, Tag, Card, Form, Input, Tabs, Row, Col } from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  RollbackOutlined,
  SwapOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { ActionType } from '@/types/pro-components';
import type { ColumnsType } from 'antd/es/table';
import { DataTable } from '@/components/DataTable';
import {
  getPendingDocuments,
  getDocumentList,
  getDocumentDetail,
  getDocumentInstanceForm,
  getDocumentStatistics,
  type Document,
  type DocumentStatistics,
  type DocumentQueryParams,
  DocumentStatus,
} from '@/services/document/api';
import { StatCard } from '@/components';
import {
  FormFieldType,
  type FormDefinition,
  getDocumentCreateForm,
  getNodeForm,
  submitNodeForm,
  executeNodeAction,
  getWorkflowDetail,
  type WorkflowDefinition,
} from '@/services/workflow/api';
import { getUserList } from '@/services/user/api';
import { useIntl, useModel } from '@umijs/max';
import dayjs from 'dayjs';
import { getStatusMeta, documentStatusMap } from '@/utils/statusMaps';
import {
  ApproveModal,
  RejectModal,
  ReturnModal,
  DelegateModal,
  DocumentDetailDrawer,
  type ReturnableNode,
  type NodeFormData,
} from './components';

const ApprovalPage: React.FC = () => {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const actionRef = useRef<ActionType>(null);

  // Modal 状态
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [delegateModalVisible, setDelegateModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);

  // 当前操作数据
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('pending');

  // 表单定义相关
  const [detailFormDef, setDetailFormDef] = useState<FormDefinition | null>(null);
  const [detailFormValues, setDetailFormValues] = useState<Record<string, any> | null>(null);
  const [detailNodeFormDef, setDetailNodeFormDef] = useState<FormDefinition | null>(null);
  const [detailNodeFormValues, setDetailNodeFormValues] = useState<Record<string, any> | null>(null);
  const [detailNodeForms, setDetailNodeForms] = useState<Record<string, NodeFormData>>({});
  const [detailWorkflowDef, setDetailWorkflowDef] = useState<WorkflowDefinition | null>(null);

  // 审批Modal用
  const [nodeFormDef, setNodeFormDef] = useState<FormDefinition | null>(null);
  const [nodeFormInitialValues, setNodeFormInitialValues] = useState<Record<string, any>>({});
  const [currentInstanceId, setCurrentInstanceId] = useState<string | null>(null);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);

  // 加载状态
  const [approvalModalLoading, setApprovalModalLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [returning, setReturning] = useState(false);
  const [delegating, setDelegating] = useState(false);
  const [returnableNodes, setReturnableNodes] = useState<ReturnableNode[]>([]);

  // 搜索相关
  const [searchForm] = Form.useForm();
  const [searchParams, setSearchParams] = useState<DocumentQueryParams>({ page: 1, pageSize: 10 });
  const [statistics, setStatistics] = useState<DocumentStatistics | null>(null);

  React.useEffect(() => {
    loadUsers();
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      const response = await getDocumentStatistics();
      if (response.success && response.data) {
        setStatistics(response.data);
      }
    } catch (error) {
      // 静默处理
    }
  };

  const loadUsers = async () => {
    try {
      const response = await getUserList({ page: 1, pageSize: 100, isActive: true });
      if (response.success && response.data?.list) {
        setUsers(response.data.list);
      }
    } catch (error) {
      // 静默处理
    }
  };

  const handleRefresh = () => {
    actionRef.current?.reload?.();
  };

  const getDocStatus = (status?: DocumentStatus | null) => getStatusMeta(intl, status, documentStatusMap);

  // 加载文档详情
  const loadDocumentDetail = async (record: Document) => {
    try {
      const response = await getDocumentDetail(record.id!);
      if (response.success && response.data) {
        const docData = response.data as any;
        setDetailData(docData);
        const doc = docData.document ?? docData;
        const instance = docData.workflowInstance ?? doc?.workflowInstance;
        const defId = instance?.workflowDefinitionId;
        const instanceId = instance?.id || instance?.workflowInstanceId || instance?.workflowInstance?.id;
        const nodeId = instance?.currentNodeId;
        const approvalHistory = docData?.approvalHistory ?? doc?.approvalHistory ?? instance?.approvalHistory ?? [];
        const workflowDefinition = docData?.workflowDefinition;

        // 流程定义
        if (workflowDefinition) {
          setDetailWorkflowDef(workflowDefinition);
        } else if (defId) {
          try {
            const defResp = await getWorkflowDetail(defId);
            setDetailWorkflowDef(defResp.success ? defResp.data || null : null);
          } catch (err) {
            message.error('加载流程定义失败');
            setDetailWorkflowDef(null);
          }
        } else {
          setDetailWorkflowDef(null);
        }

        // 表单定义
        if (instanceId) {
          try {
            const formResp = await getDocumentInstanceForm(record.id!);
            if (formResp.success) {
              setDetailFormDef(formResp.data?.form || null);
              setDetailFormValues(formResp.data?.initialValues || {});
            } else {
              setDetailFormDef(null);
              setDetailFormValues(null);
            }
          } catch (e) {
            setDetailFormDef(null);
            setDetailFormValues(null);
          }
        } else {
          setDetailFormDef(null);
          setDetailFormValues(null);
        }

        if (defId && !instanceId) {
          try {
            const formResp = await getDocumentCreateForm(defId);
            if (formResp.success) {
              const dataScopeKey = formResp.data?.dataScopeKey;
              const sourceFormData = doc?.formData || {};
              const values = dataScopeKey ? sourceFormData?.[dataScopeKey] || {} : sourceFormData || {};
              setDetailFormDef(formResp.data?.form || null);
              setDetailFormValues(values);
            } else {
              setDetailFormDef(null);
              setDetailFormValues(null);
            }
          } catch (e) {
            setDetailFormDef(null);
            setDetailFormValues(null);
          }
        }

        if (instanceId && nodeId) {
          try {
            const nodeFormResp = await getNodeForm(instanceId, nodeId);
            if (nodeFormResp.success) {
              setDetailNodeFormDef(nodeFormResp.data?.form || null);
              setDetailNodeFormValues(nodeFormResp.data?.initialValues || {});
            } else {
              setDetailNodeFormDef(null);
              setDetailNodeFormValues(null);
            }
          } catch (err) {
            setDetailNodeFormDef(null);
            setDetailNodeFormValues(null);
          }

          // 批量加载节点表单
          try {
            const allNodeIds = Array.from(new Set([nodeId, ...approvalHistory.map((h: any) => h.nodeId).filter(Boolean)]));
            const forms: Record<string, NodeFormData> = {};
            for (const nid of allNodeIds) {
              try {
                const nf = await getNodeForm(instanceId, nid);
                if (nf.success) {
                  forms[nid] = { def: nf.data?.form || null, values: nf.data?.initialValues || {} };
                }
              } catch (e) {
                // 跳过
              }
            }
            setDetailNodeForms(forms);
          } catch (e) {
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
      message.error('获取详情失败');
    }
  };

  // 打开审批Modal
  const openApprovalModal = async (record: Document) => {
    setCurrentDocument(record);
    setApprovalModalLoading(true);
    try {
      const detailResp = await getDocumentDetail(record.id!);
      if (detailResp.success && detailResp.data) {
        const docData = detailResp.data as any;
        const doc = docData.document ?? docData;
        const instance = docData.workflowInstance ?? doc?.workflowInstance;
        const defId = instance?.workflowDefinitionId;
        const instanceId = instance?.id || instance?.workflowInstanceId || instance?.workflowInstance?.id;
        const nodeId = instance?.currentNodeId;
        setCurrentInstanceId(instanceId || null);
        setCurrentNodeId(nodeId || null);

        if (instanceId && nodeId) {
          try {
            const formResp = await getNodeForm(instanceId, nodeId);
            if (formResp.success) {
              setNodeFormDef(formResp.data?.form || null);
              setNodeFormInitialValues(formResp.data?.initialValues || {});
            } else {
              setNodeFormDef(null);
              setNodeFormInitialValues({});
            }

            if (defId) {
              const defResp = await getWorkflowDetail(defId);
              setDetailWorkflowDef(defResp.success ? defResp.data || null : null);
            }
          } catch (e) {
            setNodeFormDef(null);
            setNodeFormInitialValues({});
          }
        } else {
          setDetailNodeFormDef(null);
          setDetailNodeFormValues(null);
          setDetailNodeForms({});
          setDetailWorkflowDef(null);
        }
        setApprovalModalVisible(true);
      }
    } catch (e) {
      message.error(intl.formatMessage({ id: 'pages.document.approval.loadFailed', defaultMessage: '加载审批信息失败' }));
    } finally {
      setApprovalModalLoading(false);
    }
  };

  // 打开拒绝Modal
  const openRejectModal = async (record: Document) => {
    setCurrentDocument(record);
    try {
      const detailResp = await getDocumentDetail(record.id!);
      if (detailResp.success && detailResp.data) {
        const docData = detailResp.data as any;
        const doc = docData.document ?? docData;
        const instance = docData.workflowInstance ?? doc?.workflowInstance;
        const instanceId = instance?.id || instance?.workflowInstanceId || instance?.workflowInstance?.id;
        const nodeId = instance?.currentNodeId;
        setCurrentInstanceId(instanceId || null);
        setCurrentNodeId(nodeId || null);
      }
    } catch (e) {
      // 静默处理
    }
    setRejectModalVisible(true);
  };

  // 打开退回Modal
  const openReturnModal = async (record: Document) => {
    setCurrentDocument(record);
    try {
      const detailResp = await getDocumentDetail(record.id!);
      if (detailResp.success && detailResp.data) {
        const docData = detailResp.data as any;
        const doc = docData.document ?? docData;
        const instance = docData.workflowInstance ?? doc?.workflowInstance;
        const instanceId = instance?.id || instance?.workflowInstanceId || instance?.workflowInstance?.id;
        const nodeId = instance?.currentNodeId;
        const defId = instance?.workflowDefinitionId;
        const approvalHistory = docData?.approvalHistory ?? doc?.approvalHistory ?? instance?.approvalHistory ?? [];

        setCurrentInstanceId(instanceId || null);
        setCurrentNodeId(nodeId || null);

        if (defId) {
          try {
            const defResp = await getWorkflowDetail(defId);
            if (defResp.success && defResp.data) {
              const workflowDef = defResp.data;
              const completedNodeIds = new Set(
                approvalHistory
                  .filter((h: any) => h.action === 'Approve' || h.action === 'approve')
                  .map((h: any) => h.nodeId)
              );
              const returnableNodeList = (workflowDef.graph?.nodes || [])
                .filter((node: any) => {
                  if (node.id === nodeId) return false;
                  if (node.type === 'start') return true;
                  if (node.type === 'approval') return completedNodeIds.has(node.id);
                  return false;
                })
                .map((node: any) => ({ id: node.id, label: node.label || node.id, type: node.type }))
                .sort((a, b) => {
                  if (a.type === 'start' && b.type !== 'start') return -1;
                  if (b.type === 'start' && a.type !== 'start') return 1;
                  return a.label.localeCompare(b.label);
                });
              setReturnableNodes(returnableNodeList);
            } else {
              setReturnableNodes([]);
            }
          } catch (err) {
            setReturnableNodes([]);
          }
        } else {
          setReturnableNodes([]);
        }
      }
    } catch (e) {
      setReturnableNodes([]);
    }
    setReturnModalVisible(true);
  };

  // 打开转办Modal
  const openDelegateModal = async (record: Document) => {
    setCurrentDocument(record);
    try {
      const detailResp = await getDocumentDetail(record.id!);
      if (detailResp.success && detailResp.data) {
        const docData = detailResp.data as any;
        const doc = docData.document ?? docData;
        const instance = docData.workflowInstance ?? doc?.workflowInstance;
        const instanceId = instance?.id || instance?.workflowInstanceId || instance?.workflowInstance?.id;
        const nodeId = instance?.currentNodeId;
        setCurrentInstanceId(instanceId || null);
        setCurrentNodeId(nodeId || null);
      }
    } catch (e) {
      // 静默处理
    }
    try {
      const userResp = await getUserList({ page: 1, pageSize: 1000 });
      if (userResp.success && userResp.data) {
        const userData = userResp.data as any;
        setUsers(userData.list || userData.data || []);
      }
    } catch (e) {
      // 静默处理
    }
    setDelegateModalVisible(true);
  };

  // 审批提交
  const handleApprove = async (values: { nodeValues: Record<string, any>; comment?: string }) => {
    if (!currentDocument || approving) return;

    try {
      setApproving(true);
      if (currentInstanceId && currentNodeId) {
        const normalized: Record<string, any> = { ...values.nodeValues };
        if (nodeFormDef?.fields?.length) {
          for (const f of nodeFormDef.fields) {
            const v = normalized[f.dataKey];
            if (v === undefined) continue;
            switch (f.type) {
              case FormFieldType.Date:
              case FormFieldType.DateTime:
                normalized[f.dataKey] = v && (v as any).toISOString ? (v as any).toISOString() : v;
                break;
              case FormFieldType.Number:
                normalized[f.dataKey] = typeof v === 'string' ? Number(v) : v;
                break;
              case FormFieldType.Checkbox:
                normalized[f.dataKey] = Array.isArray(v) ? v : [v];
                break;
              default:
                normalized[f.dataKey] = v;
            }
          }
        }

        if (nodeFormDef) {
          await submitNodeForm(currentInstanceId, currentNodeId, normalized);
        }

        const actionResp = await executeNodeAction(currentInstanceId, currentNodeId, { action: 'approve', comment: values.comment });

        if (actionResp.success) {
          message.success(intl.formatMessage({ id: 'pages.document.approval.message.approveSuccess' }));
          setApprovalModalVisible(false);
          setCurrentDocument(null);
          setNodeFormDef(null);
          setNodeFormInitialValues({});
          setCurrentInstanceId(null);
          setCurrentNodeId(null);
          actionRef.current?.reload?.();
        }
      } else {
        message.error('缺少流程实例或节点信息');
      }
    } catch (error) {
      message.error(intl.formatMessage({ id: 'pages.document.approval.message.approveFailed' }));
    } finally {
      setApproving(false);
    }
  };

  // 拒绝提交
  const handleReject = async (values: { comment: string }) => {
    if (!currentDocument || rejecting) return;

    try {
      setRejecting(true);
      if (currentInstanceId && currentNodeId) {
        const actionResp = await executeNodeAction(currentInstanceId, currentNodeId, { action: 'reject', comment: values.comment });

        if (actionResp.success) {
          message.success(intl.formatMessage({ id: 'pages.document.approval.message.rejectSuccess' }));
          setRejectModalVisible(false);
          setCurrentDocument(null);
          actionRef.current?.reload?.();
        }
      } else {
        message.error('缺少流程实例或节点信息');
      }
    } catch (error) {
      message.error(intl.formatMessage({ id: 'pages.document.approval.message.rejectFailed' }));
    } finally {
      setRejecting(false);
    }
  };

  // 退回提交
  const handleReturn = async (values: { targetNodeId: string; comment: string }) => {
    if (!currentDocument || returning) return;

    try {
      setReturning(true);
      if (currentInstanceId && currentNodeId) {
        const actionResp = await executeNodeAction(currentInstanceId, currentNodeId, {
          action: 'return',
          comment: values.comment,
          targetNodeId: values.targetNodeId,
        });

        if (actionResp.success) {
          message.success(intl.formatMessage({ id: 'pages.document.approval.message.returnSuccess' }));
          setReturnModalVisible(false);
          setCurrentDocument(null);
          actionRef.current?.reload?.();
        }
      } else {
        message.error('缺少流程实例或节点信息');
      }
    } catch (error) {
      message.error(intl.formatMessage({ id: 'pages.document.approval.message.returnFailed' }));
    } finally {
      setReturning(false);
    }
  };

  // 转办提交
  const handleDelegate = async (values: { delegateToUserId: string; comment?: string }) => {
    if (!currentDocument || delegating) return;

    try {
      setDelegating(true);
      if (currentInstanceId && currentNodeId) {
        const actionResp = await executeNodeAction(currentInstanceId, currentNodeId, {
          action: 'delegate',
          comment: values.comment,
          delegateToUserId: values.delegateToUserId,
        });

        if (actionResp.success) {
          message.success(intl.formatMessage({ id: 'pages.document.approval.message.delegateSuccess' }));
          setDelegateModalVisible(false);
          setCurrentDocument(null);
          actionRef.current?.reload?.();
        }
      } else {
        message.error('缺少流程实例或节点信息');
      }
    } catch (error) {
      message.error(intl.formatMessage({ id: 'pages.document.approval.message.delegateFailed' }));
    } finally {
      setDelegating(false);
    }
  };

  const handleSearch = (values: any) => {
    setSearchParams((prev) => ({ ...prev, ...values, page: 1 }));
    actionRef.current?.reloadAndReset?.();
  };

  const handleReset = () => {
    searchForm.resetFields();
    setSearchParams((prev) => ({ page: 1, pageSize: prev.pageSize }));
    actionRef.current?.reloadAndReset?.();
  };

  const columns: ColumnsType<Document> = [
    { title: intl.formatMessage({ id: 'pages.document.table.title' }), dataIndex: 'title', ellipsis: true },
    { title: intl.formatMessage({ id: 'pages.document.table.type' }), dataIndex: 'documentType', ellipsis: true },
    {
      title: intl.formatMessage({ id: 'pages.document.table.status' }),
      dataIndex: 'status',
      render: (_, record) => {
        const status = getDocStatus(record.status);
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
    { title: intl.formatMessage({ id: 'pages.document.table.createdBy' }), dataIndex: 'createdBy', ellipsis: true },
    {
      title: intl.formatMessage({ id: 'pages.document.table.createdAt' }),
      dataIndex: 'createdAt',
      render: (text: string) => (text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: intl.formatMessage({ id: 'pages.document.table.action' }),
      key: 'action',
      fixed: 'right' as const,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={(e) => { e.preventDefault(); e.stopPropagation(); loadDocumentDetail(record); }}>
            {intl.formatMessage({ id: 'pages.document.action.view' })}
          </Button>
          {activeTab === 'pending' && (
            <>
              <Button type="link" size="small" icon={<CheckOutlined />} onClick={(e) => { e.preventDefault(); e.stopPropagation(); openApprovalModal(record); }}>
                {intl.formatMessage({ id: 'pages.document.approval.action.approve' })}
              </Button>
              <Button type="link" size="small" danger icon={<CloseOutlined />} onClick={(e) => { e.preventDefault(); e.stopPropagation(); openRejectModal(record); }}>
                {intl.formatMessage({ id: 'pages.document.approval.action.reject' })}
              </Button>
              <Button type="link" size="small" icon={<RollbackOutlined />} onClick={(e) => { e.preventDefault(); e.stopPropagation(); openReturnModal(record); }}>
                {intl.formatMessage({ id: 'pages.document.approval.action.return' })}
              </Button>
              <Button type="link" size="small" icon={<SwapOutlined />} onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDelegateModal(record); }}>
                {intl.formatMessage({ id: 'pages.document.approval.action.delegate' })}
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'pending',
      label: intl.formatMessage({ id: 'pages.document.approval.tab.pending' }),
      children: (
        <DataTable<Document>
          actionRef={actionRef}
          columns={columns}
          request={async (params) => {
            const response = await getPendingDocuments({ page: params.current, pageSize: params.pageSize, ...searchParams });
            if (response.success && response.data) {
              const resData: any = response.data;
              return { data: resData.list || resData.data || [], success: true, total: resData.total || 0 };
            }
            return { data: [], success: false, total: 0 };
          }}
          rowKey="id"
          search={false}
        />
      ),
    },
    {
      key: 'approved',
      label: intl.formatMessage({ id: 'pages.document.approval.tab.approved' }),
      children: (
        <DataTable<Document>
          actionRef={actionRef}
          columns={columns}
          request={async (params) => {
            const response = await getDocumentList({ page: params.current, pageSize: params.pageSize, filterType: 'approved', ...searchParams });
            if (response.success && response.data) {
              const resData: any = response.data;
              return { data: resData.list || resData.data || [], success: true, total: resData.total || 0 };
            }
            return { data: [], success: false, total: 0 };
          }}
          rowKey="id"
          search={false}
        />
      ),
    },
    {
      key: 'my',
      label: intl.formatMessage({ id: 'pages.document.approval.tab.myInitiated' }),
      children: (
        <DataTable<Document>
          actionRef={actionRef}
          columns={columns}
          request={async (params) => {
            const response = await getDocumentList({ page: params.current, pageSize: params.pageSize, filterType: 'my', ...searchParams });
            if (response.success && response.data) {
              const resData: any = response.data;
              return { data: resData.list || resData.data || [], success: true, total: resData.total || 0 };
            }
            return { data: [], success: false, total: 0 };
          }}
          rowKey="id"
          search={false}
        />
      ),
    },
  ];

  return (
    <PageContainer
      title={
        <Space>
          <CheckCircleOutlined />
          {intl.formatMessage({ id: 'pages.document.approval' })}
        </Space>
      }
      style={{ paddingBlock: 12 }}
      extra={
        <Button key="refresh" icon={<ReloadOutlined />} onClick={handleRefresh}>
          {intl.formatMessage({ id: 'pages.button.refresh' })}
        </Button>
      }
    >
      {statistics && (
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} md={6}>
              <StatCard title={intl.formatMessage({ id: 'pages.document.stat.pending', defaultMessage: '待在办' })} value={statistics.pendingCount} icon={<CheckCircleOutlined />} color="#faad14" />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard title={intl.formatMessage({ id: 'pages.document.stat.myCreated', defaultMessage: '我发起的' })} value={statistics.myCreatedCount} icon={<FileTextOutlined />} color="#1890ff" />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard title={intl.formatMessage({ id: 'pages.document.stat.approved', defaultMessage: '已通过' })} value={statistics.approvedCount} icon={<CheckCircleOutlined />} color="#52c41a" />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard title={intl.formatMessage({ id: 'pages.document.stat.rejected', defaultMessage: '已驳回' })} value={statistics.rejectedCount} icon={<CloseOutlined />} color="#ff4d4f" />
            </Col>
          </Row>
        </Card>
      )}

      <Card style={{ marginBottom: 16 }}>
        <Form form={searchForm} layout="inline" onFinish={handleSearch}>
          <Form.Item name="keyword" label={intl.formatMessage({ id: 'pages.document.form.search', defaultMessage: '关键词' })}>
            <Input placeholder={intl.formatMessage({ id: 'pages.document.form.search', defaultMessage: '搜索关键词' })} allowClear />
          </Form.Item>
          <Form.Item name="documentType" label={intl.formatMessage({ id: 'pages.document.table.type', defaultMessage: '公文类型' })}>
            <Input placeholder={intl.formatMessage({ id: 'pages.document.table.type', defaultMessage: '输入类型' })} allowClear />
          </Form.Item>
          <Form.Item name="category" label={intl.formatMessage({ id: 'pages.document.table.category', defaultMessage: '分类' })}>
            <Input placeholder={intl.formatMessage({ id: 'pages.document.table.category', defaultMessage: '输入分类' })} allowClear />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<ReloadOutlined />}>
                {intl.formatMessage({ id: 'pages.searchTable.search', defaultMessage: '查询' })}
              </Button>
              <Button onClick={handleReset}>{intl.formatMessage({ id: 'pages.searchTable.reset', defaultMessage: '重置' })}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key);
          actionRef.current?.reload?.();
        }}
        items={tabItems}
      />

      {/* Modals */}
      <ApproveModal
        open={approvalModalVisible}
        onCancel={() => {
          setApprovalModalVisible(false);
          setCurrentDocument(null);
          setNodeFormDef(null);
          setNodeFormInitialValues({});
          setCurrentInstanceId(null);
          setCurrentNodeId(null);
        }}
        loading={approving}
        nodeFormDef={nodeFormDef}
        nodeFormInitialValues={nodeFormInitialValues}
        onSubmit={handleApprove}
      />

      <RejectModal
        open={rejectModalVisible}
        onCancel={() => {
          setRejectModalVisible(false);
          setCurrentDocument(null);
        }}
        loading={rejecting}
        onSubmit={handleReject}
      />

      <ReturnModal
        open={returnModalVisible}
        onCancel={() => {
          setReturnModalVisible(false);
          setCurrentDocument(null);
          setReturnableNodes([]);
        }}
        loading={returning}
        returnableNodes={returnableNodes}
        onSubmit={handleReturn}
      />

      <DelegateModal
        open={delegateModalVisible}
        onCancel={() => {
          setDelegateModalVisible(false);
          setCurrentDocument(null);
        }}
        loading={delegating}
        users={users}
        onSubmit={handleDelegate}
      />

      <DocumentDetailDrawer
        open={detailVisible}
        onClose={() => {
          setDetailVisible(false);
          setDetailData(null);
          setDetailNodeFormDef(null);
          setDetailNodeFormValues(null);
          setDetailNodeForms({});
        }}
        detailData={detailData}
        workflowDef={detailWorkflowDef}
        formDef={detailFormDef}
        formValues={detailFormValues}
        nodeFormDef={detailNodeFormDef}
        nodeFormValues={detailNodeFormValues}
        nodeForms={detailNodeForms}
      />
    </PageContainer>
  );
};

export default ApprovalPage;
