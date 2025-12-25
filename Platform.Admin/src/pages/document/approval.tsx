import React, { useMemo, useRef, useState } from 'react';
import { PageContainer } from '@/components';
import {
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
  Tag,
  Drawer,
  Card,
  Descriptions,
  Select,
  Tabs,
  DatePicker,
  InputNumber,
  Checkbox,
  Radio,
  Switch,
  Steps,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  RollbackOutlined,
  SwapOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import ReactFlow, { Background, Controls, MiniMap, type Edge as FlowEdge, type Node as FlowNode } from 'reactflow';
import 'reactflow/dist/style.css';
import type { ActionType } from '@/types/pro-components';
import type { ColumnsType } from 'antd/es/table';
import { DataTable } from '@/components/DataTable';
import {
  getPendingDocuments,
  getDocumentList,
  getDocumentDetail,
  getDocumentInstanceForm,
  approveDocument,
  rejectDocument,
  returnDocument,
  delegateDocument,
  type Document,
  DocumentStatus,
} from '@/services/document/api';
import {
  WorkflowStatus,
  ApprovalAction,
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
import { getStatusMeta, documentStatusMap, workflowStatusMap, approvalActionMap } from '@/utils/statusMaps';

const { TextArea } = Input;

const ApprovalPage: React.FC = () => {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const actionRef = useRef<ActionType>(null);
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [delegateModalVisible, setDelegateModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [approvalForm] = Form.useForm();
  const [rejectForm] = Form.useForm();
  const [returnForm] = Form.useForm();
  const [delegateForm] = Form.useForm();
  const [users, setUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [detailFormDef, setDetailFormDef] = useState<FormDefinition | null>(null);
  const [detailFormValues, setDetailFormValues] = useState<Record<string, any> | null>(null);
  const [detailNodeFormDef, setDetailNodeFormDef] = useState<FormDefinition | null>(null);
  const [detailNodeFormValues, setDetailNodeFormValues] = useState<Record<string, any> | null>(null);
  const [detailNodeForms, setDetailNodeForms] = useState<Record<string, { def: FormDefinition | null; values: Record<string, any> }>>({});
  const [detailWorkflowDef, setDetailWorkflowDef] = useState<WorkflowDefinition | null>(null);
  const [nodeFormDef, setNodeFormDef] = useState<FormDefinition | null>(null);
  const [nodeFormInitialValues, setNodeFormInitialValues] = useState<Record<string, any>>({});
  const [currentInstanceId, setCurrentInstanceId] = useState<string | null>(null);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [approvalModalLoading, setApprovalModalLoading] = useState(false);
  const [approving, setApproving] = useState(false);

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
    if (actionRef.current?.reload) {
      actionRef.current.reload();
    }
  };

  React.useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await getUserList({ page: 1, pageSize: 100, isActive: true });
      if (response.success && response.data?.users) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error('加载用户列表失败:', error);
    }
  };

  const getDocStatus = (status?: DocumentStatus | null) => getStatusMeta(intl, status, documentStatusMap);

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
      render: (text: string) => (text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: intl.formatMessage({ id: 'pages.document.table.action' }),
      width: 300,
      render: (_, record: Document) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={async () => {
              try {
                const response = await getDocumentDetail(record.id!);
                if (response.success && response.data) {
                  setDetailData(response.data);
                  const doc = response.data.document ?? response.data;
                  const instance = response.data.workflowInstance ?? doc?.workflowInstance;
                  const defId = instance?.workflowDefinitionId;
                  const instanceId = instance?.id || instance?.workflowInstanceId || instance?.workflowInstance?.id;
                  const nodeId = instance?.currentNodeId;
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
                      console.error('加载节点表单失败', err);
                      setDetailNodeFormDef(null);
                      setDetailNodeFormValues(null);
                    }

                    // 拉取所有涉及的节点表单（已审批节点也可查看）
                    try {
                      const allNodeIds = Array.from(
                        new Set(
                          [nodeId, ...approvalHistory.map((h: any) => h.nodeId).filter(Boolean)],
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
              }
            }}
          >
            {intl.formatMessage({ id: 'pages.document.action.view' })}
          </Button>
          {activeTab === 'pending' && (
            <>
              <Button
                type="link"
                size="small"
                icon={<CheckOutlined />}
                onClick={async () => {
                  setCurrentDocument(record);
                  setApprovalModalLoading(true);
                  try {
                    const detailResp = await getDocumentDetail(record.id!);
                    if (detailResp.success && detailResp.data) {
                      const doc = detailResp.data.document ?? detailResp.data;
                      const instance = detailResp.data.workflowInstance ?? doc?.workflowInstance;
                      const defId = instance?.workflowDefinitionId;
                      const instanceId = instance?.id || instance?.workflowInstanceId || instance?.workflowInstance?.id;
                      const nodeId = instance?.currentNodeId;
                      setCurrentInstanceId(instanceId || null);
                      setCurrentNodeId(nodeId || null);
                      if (instanceId && nodeId) {
                        try {
                          const formResp = await getNodeForm(instanceId, nodeId);
                          if (formResp.success) {
                            const def = formResp.data?.form || null;
                            const initVals = formResp.data?.initialValues || {};
                            setNodeFormDef(def);
                            setNodeFormInitialValues(initVals);
                            approvalForm.setFieldsValue({ nodeValues: initVals, comment: undefined });
                          } else {
                            setNodeFormDef(null);
                            setNodeFormInitialValues({});
                          }

                          // 加载流程定义，用于节点名称/类型展示
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
                        } catch (e) {
                          console.error('加载节点表单失败', e);
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
                    console.error('加载审批信息失败', e);
                    message.error(intl.formatMessage({ id: 'pages.document.approval.loadFailed', defaultMessage: '加载审批信息失败' }));
                  } finally {
                    setApprovalModalLoading(false);
                  }
                }}
              >
                {intl.formatMessage({ id: 'pages.document.approval.action.approve' })}
              </Button>
              <Button
                type="link"
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={async () => {
                  setCurrentDocument(record);
                  // 获取流程实例和节点信息
                  try {
                    const detailResp = await getDocumentDetail(record.id!);
                    if (detailResp.success && detailResp.data) {
                      const doc = detailResp.data.document ?? detailResp.data;
                      const instance = detailResp.data.workflowInstance ?? doc?.workflowInstance;
                      const instanceId = instance?.id || instance?.workflowInstanceId || instance?.workflowInstance?.id;
                      const nodeId = instance?.currentNodeId;
                      setCurrentInstanceId(instanceId || null);
                      setCurrentNodeId(nodeId || null);
                    }
                  } catch (e) {
                    console.error('获取流程信息失败', e);
                  }
                  setRejectModalVisible(true);
                }}
              >
                {intl.formatMessage({ id: 'pages.document.approval.action.reject' })}
              </Button>
              <Button
                type="link"
                size="small"
                icon={<RollbackOutlined />}
                onClick={async () => {
                  setCurrentDocument(record);
                  // 获取流程实例和节点信息
                  try {
                    const detailResp = await getDocumentDetail(record.id!);
                    if (detailResp.success && detailResp.data) {
                      const doc = detailResp.data.document ?? detailResp.data;
                      const instance = detailResp.data.workflowInstance ?? doc?.workflowInstance;
                      const instanceId = instance?.id || instance?.workflowInstanceId || instance?.workflowInstance?.id;
                      const nodeId = instance?.currentNodeId;
                      setCurrentInstanceId(instanceId || null);
                      setCurrentNodeId(nodeId || null);
                    }
                  } catch (e) {
                    console.error('获取流程信息失败', e);
                  }
                  setReturnModalVisible(true);
                }}
              >
                {intl.formatMessage({ id: 'pages.document.approval.action.return' })}
              </Button>
              <Button
                type="link"
                size="small"
                icon={<SwapOutlined />}
                onClick={async () => {
                  setCurrentDocument(record);
                  // 获取流程实例和节点信息
                  try {
                    const detailResp = await getDocumentDetail(record.id!);
                    if (detailResp.success && detailResp.data) {
                      const doc = detailResp.data.document ?? detailResp.data;
                      const instance = detailResp.data.workflowInstance ?? doc?.workflowInstance;
                      const instanceId = instance?.id || instance?.workflowInstanceId || instance?.workflowInstance?.id;
                      const nodeId = instance?.currentNodeId;
                      setCurrentInstanceId(instanceId || null);
                      setCurrentNodeId(nodeId || null);
                    }
                  } catch (e) {
                    console.error('获取流程信息失败', e);
                  }
                  // 获取用户列表用于转办
                  try {
                    const userResp = await getUserList({ page: 1, pageSize: 1000 });
                    if (userResp.success && userResp.data) {
                      setUsers(userResp.data.list || userResp.data.data || []);
                    }
                  } catch (e) {
                    console.error('获取用户列表失败', e);
                  }
                  setDelegateModalVisible(true);
                }}
              >
                {intl.formatMessage({ id: 'pages.document.approval.action.delegate' })}
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const handleApprove = async () => {
    if (!currentDocument) return;

    try {
      setApproving(true);
      const values = await approvalForm.validateFields();
      const comment = values.comment;
      const nodeValues: Record<string, any> = values.nodeValues || {};

      // 统一使用 executeNodeAction 接口，确保审批记录记录在正确的节点上
      if (currentInstanceId && currentNodeId) {
        const normalized: Record<string, any> = { ...nodeValues };
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

        // 如果有节点表单，先提交表单数据
        if (nodeFormDef) {
          await submitNodeForm(currentInstanceId, currentNodeId, normalized);
        }

        // 执行审批操作
        const actionResp = await executeNodeAction(currentInstanceId, currentNodeId, {
          action: 'approve',
          comment,
        });

        if (actionResp.success) {
          message.success(intl.formatMessage({ id: 'pages.document.approval.message.approveSuccess' }));
          setApprovalModalVisible(false);
          approvalForm.resetFields();
          setCurrentDocument(null);
          setNodeFormDef(null);
          setNodeFormInitialValues({});
          setCurrentInstanceId(null);
          setCurrentNodeId(null);
          if (actionRef.current?.reload) {
            actionRef.current.reload();
          }
          setApproving(false);
          return;
        }
      } else {
        message.error('缺少流程实例或节点信息');
        setApproving(false);
        return;
      }
    } catch (error) {
      console.error('审批失败:', error);
      message.error(intl.formatMessage({ id: 'pages.document.approval.message.approveFailed' }));
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!currentDocument) return;

    try {
      const values = await rejectForm.validateFields();

      // 统一使用 executeNodeAction 接口，确保审批记录记录在正确的节点上
      if (currentInstanceId && currentNodeId) {
        const actionResp = await executeNodeAction(currentInstanceId, currentNodeId, {
          action: 'reject',
          comment: values.comment,
        });

        if (actionResp.success) {
          message.success(intl.formatMessage({ id: 'pages.document.approval.message.rejectSuccess' }));
          setRejectModalVisible(false);
          rejectForm.resetFields();
          setCurrentDocument(null);
          if (actionRef.current?.reload) {
            actionRef.current.reload();
          }
        }
      } else {
        message.error('缺少流程实例或节点信息');
      }
    } catch (error) {
      console.error('拒绝失败:', error);
      message.error(intl.formatMessage({ id: 'pages.document.approval.message.rejectFailed' }));
    }
  };

  const handleReturn = async () => {
    if (!currentDocument) return;

    try {
      const values = await returnForm.validateFields();

      // 统一使用 executeNodeAction 接口，确保审批记录记录在正确的节点上
      if (currentInstanceId && currentNodeId) {
        const actionResp = await executeNodeAction(currentInstanceId, currentNodeId, {
          action: 'return',
          comment: values.comment,
          targetNodeId: values.targetNodeId,
        });

        if (actionResp.success) {
          message.success(intl.formatMessage({ id: 'pages.document.approval.message.returnSuccess' }));
          setReturnModalVisible(false);
          returnForm.resetFields();
          setCurrentDocument(null);
          actionRef.current?.reload?.();
        }
      } else {
        message.error('缺少流程实例或节点信息');
      }
    } catch (error) {
      console.error('退回失败:', error);
      message.error(intl.formatMessage({ id: 'pages.document.approval.message.returnFailed' }));
    }
  };

  const handleDelegate = async () => {
    if (!currentDocument) return;

    try {
      const values = await delegateForm.validateFields();

      // 统一使用 executeNodeAction 接口，确保审批记录记录在正确的节点上
      if (currentInstanceId && currentNodeId) {
        const actionResp = await executeNodeAction(currentInstanceId, currentNodeId, {
          action: 'delegate',
          comment: values.comment,
          delegateToUserId: values.delegateToUserId,
        });

        if (actionResp.success) {
          message.success(intl.formatMessage({ id: 'pages.document.approval.message.delegateSuccess' }));
          setDelegateModalVisible(false);
          delegateForm.resetFields();
          setCurrentDocument(null);
          if (actionRef.current?.reload) {
            actionRef.current.reload();
          }
        }
      } else {
        message.error('缺少流程实例或节点信息');
      }
    } catch (error) {
      console.error('转办失败:', error);
      message.error(intl.formatMessage({ id: 'pages.document.approval.message.delegateFailed' }));
    }
  };

  const tabItems = [
    {
      key: 'pending',
      label: intl.formatMessage({ id: 'pages.document.approval.tab.pending' }),
      children: (
        <DataTable<Document>
          actionRef={actionRef}
          columns={columns}
          request={async (params) => {
            const response = await getPendingDocuments({
              page: params.current,
              pageSize: params.pageSize,
            });
            if (response.success && response.data) {
              return {
                data: response.data.list || response.data.data || [],
                success: true,
                total: response.data.total || 0,
              };
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
            const response = await getDocumentList({
              page: params.current,
              pageSize: params.pageSize,
              filterType: 'approved',
            });
            if (response.success && response.data) {
              return {
                data: response.data.list || response.data.data || [],
                success: true,
                total: response.data.total || 0,
              };
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
            const response = await getDocumentList({
              page: params.current,
              pageSize: params.pageSize,
              filterType: 'my',
            });
            if (response.success && response.data) {
              return {
                data: response.data.list || response.data.data || [],
                success: true,
                total: response.data.total || 0,
              };
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
        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          onClick={handleRefresh}
        >
          {intl.formatMessage({ id: 'pages.button.refresh' })}
        </Button>
      }
    >
      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key);
          if (actionRef.current?.reload) {
            actionRef.current.reload();
          }
        }}
        items={tabItems}
      />

      <Modal
        title={intl.formatMessage({ id: 'pages.document.approval.modal.approveTitle' })}
        open={approvalModalVisible}
        onOk={handleApprove}
        confirmLoading={approving}
        onCancel={() => {
          setApprovalModalVisible(false);
          approvalForm.resetFields();
          setCurrentDocument(null);
          setNodeFormDef(null);
          setNodeFormInitialValues({});
          setCurrentInstanceId(null);
          setCurrentNodeId(null);
        }}
      >
        <Form form={approvalForm} layout="vertical" initialValues={{ nodeValues: nodeFormInitialValues }}>
          {nodeFormDef && nodeFormDef.fields?.length > 0 && (
            <Card size="small" style={{ marginBottom: 12 }} title={intl.formatMessage({ id: 'pages.document.approval.modal.nodeForm', defaultMessage: '审批表单' })}>
              {(nodeFormDef.fields || []).map((f) => {
                const common = {
                  name: ['nodeValues', f.dataKey],
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
                      <Form.Item
                        key={f.dataKey}
                        {...common}
                        getValueProps={(v: any) => ({ value: v ? dayjs(v) : undefined })}
                      >
                        <DatePicker style={{ width: '100%' }} />
                      </Form.Item>
                    );
                  case FormFieldType.DateTime:
                    return (
                      <Form.Item
                        key={f.dataKey}
                        {...common}
                        getValueProps={(v: any) => ({ value: v ? dayjs(v) : undefined })}
                      >
                        <DatePicker showTime style={{ width: '100%' }} />
                      </Form.Item>
                    );
                  case FormFieldType.Select:
                    return (
                      <Form.Item key={f.dataKey} {...common}>
                        <Select options={(f.options || []).map((o) => ({ label: o.label, value: o.value }))} placeholder={f.placeholder} />
                      </Form.Item>
                    );
                  case FormFieldType.Radio:
                    return (
                      <Form.Item key={f.dataKey} {...common}>
                        <Radio.Group options={(f.options || []).map((o) => ({ label: o.label, value: o.value }))} />
                      </Form.Item>
                    );
                  case FormFieldType.Checkbox:
                    return (
                      <Form.Item key={f.dataKey} {...common}>
                        <Checkbox.Group options={(f.options || []).map((o) => ({ label: o.label, value: o.value }))} />
                      </Form.Item>
                    );
                  case FormFieldType.Switch:
                    return (
                      <Form.Item key={f.dataKey} {...common} valuePropName="checked">
                        <Switch />
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
            </Card>
          )}
          <Form.Item name="comment" label={intl.formatMessage({ id: 'pages.document.approval.modal.approveComment' })}>
            <TextArea rows={4} placeholder={intl.formatMessage({ id: 'pages.document.approval.modal.approveCommentPlaceholder' })} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={intl.formatMessage({ id: 'pages.document.approval.modal.rejectTitle' })}
        open={rejectModalVisible}
        onOk={handleReject}
        onCancel={() => {
          setRejectModalVisible(false);
          rejectForm.resetFields();
          setCurrentDocument(null);
        }}
      >
        <Form form={rejectForm} layout="vertical">
          <Form.Item
            name="comment"
            label={intl.formatMessage({ id: 'pages.document.approval.modal.rejectReason' })}
            rules={[
              {
                required: true,
                message: intl.formatMessage({ id: 'pages.document.approval.modal.rejectReasonRequired' }),
              },
            ]}
          >
            <TextArea rows={4} placeholder={intl.formatMessage({ id: 'pages.document.approval.modal.rejectReasonPlaceholder' })} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={intl.formatMessage({ id: 'pages.document.approval.modal.returnTitle' })}
        open={returnModalVisible}
        onOk={handleReturn}
        onCancel={() => {
          setReturnModalVisible(false);
          returnForm.resetFields();
          setCurrentDocument(null);
        }}
      >
        <Form form={returnForm} layout="vertical">
          <Form.Item
            name="targetNodeId"
            label={intl.formatMessage({ id: 'pages.document.approval.modal.returnNode' })}
            rules={[
              {
                required: true,
                message: intl.formatMessage({ id: 'pages.document.approval.modal.returnNodeRequired' }),
              },
            ]}
          >
            <Input placeholder={intl.formatMessage({ id: 'pages.document.approval.modal.returnNodePlaceholder' })} />
          </Form.Item>
          <Form.Item
            name="comment"
            label={intl.formatMessage({ id: 'pages.document.approval.modal.returnReason' })}
            rules={[
              {
                required: true,
                message: intl.formatMessage({ id: 'pages.document.approval.modal.returnReasonRequired' }),
              },
            ]}
          >
            <TextArea rows={4} placeholder={intl.formatMessage({ id: 'pages.document.approval.modal.returnReasonPlaceholder' })} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={intl.formatMessage({ id: 'pages.document.approval.modal.delegateTitle' })}
        open={delegateModalVisible}
        onOk={handleDelegate}
        onCancel={() => {
          setDelegateModalVisible(false);
          delegateForm.resetFields();
          setCurrentDocument(null);
        }}
      >
        <Form form={delegateForm} layout="vertical">
          <Form.Item
            name="delegateToUserId"
            label={intl.formatMessage({ id: 'pages.document.approval.modal.delegateUser' })}
            rules={[
              {
                required: true,
                message: intl.formatMessage({ id: 'pages.document.approval.modal.delegateUserRequired' }),
              },
            ]}
          >
            <Select placeholder={intl.formatMessage({ id: 'pages.document.approval.modal.delegateUserPlaceholder' })}>
              {users.map((user) => (
                <Select.Option key={user.id} value={user.id}>
                  {user.username}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="comment" label={intl.formatMessage({ id: 'pages.document.approval.modal.delegateComment' })}>
            <TextArea rows={4} placeholder={intl.formatMessage({ id: 'pages.document.approval.modal.delegateCommentPlaceholder' })} />
          </Form.Item>
        </Form>
      </Modal>

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
                        {graphNodes.length > 0 ? (
                          <ReactFlow
                            nodes={graphNodes}
                            edges={graphEdges}
                            fitView
                            nodesDraggable={false}
                            nodesConnectable={false}
                            elementsSelectable={false}
                            proOptions={{ hideAttribution: true }}
                          >
                            <MiniMap pannable zoomable />
                            <Controls showInteractive={false} />
                            <Background gap={12} size={1} />
                          </ReactFlow>
                        ) : (
                          <div style={{ padding: 12, color: '#999' }}>
                            {intl.formatMessage({ id: 'pages.workflow.graph.empty', defaultMessage: '暂无流程图数据' })}
                          </div>
                        )}
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
    </PageContainer>
  );
};

export default ApprovalPage;
