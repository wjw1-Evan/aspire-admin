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
  Row,
  Col,
} from 'antd';
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
  getDocumentStatistics,
  type Document,
  type DocumentStatistics,
  type DocumentQueryParams,
  DocumentStatus,
} from '@/services/document/api';
import { StatCard } from '@/components';
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
  const [rejecting, setRejecting] = useState(false);
  const [returning, setReturning] = useState(false);
  const [delegating, setDelegating] = useState(false);
  const [returnableNodes, setReturnableNodes] = useState<Array<{ id: string; label: string; type: string }>>([]);

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

    const nodeStyles: Record<string, any> = {
      start: { background: '#f6ffed', border: '1px solid #b7eb8f', color: '#52c41a' },
      end: { background: '#fff1f0', border: '1px solid #ffa39e', color: '#ff4d4f' },
      approval: { background: '#e6f7ff', border: '1px solid #91d5ff', color: '#1890ff' },
      condition: { background: '#fff7e6', border: '1px solid #ffd591', color: '#fa8c16' },
      parallel: { background: '#f9f0ff', border: '1px solid #d3adf7', color: '#722ed1' },
    };

    const workflowInstance = detailData?.workflowInstance;

    return detailWorkflowDef.graph.nodes.map((node) => {
      const isCurrent = node.id === workflowInstance?.currentNodeId;
      const style = nodeStyles[node.type] || { background: '#fff', border: '1px solid #d9d9d9' };

      return {
        id: node.id,
        position: { x: node.position?.x || 0, y: node.position?.y || 0 },
        data: {
          label: (
            <div style={{ textAlign: 'center', padding: '10px 14px' }}>
              <div style={{ fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', opacity: 0.8 }}>{typeLabel(node.type)}</div>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>{node.label || node.id}</div>
            </div>
          ),
        },
        draggable: false,
        selectable: false,
        connectable: false,
        style: {
          ...style,
          borderRadius: 8,
          boxShadow: isCurrent ? '0 0 10px rgba(24, 144, 255, 0.4)' : '0 2px 4px rgba(0,0,0,0.05)',
          borderWidth: isCurrent ? 2 : 1,
          borderColor: isCurrent ? '#1890ff' : style.border?.split(' ')[2],
          minWidth: 120,
        },
      };
    });
  }, [detailWorkflowDef, intl, detailData]);

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
  const [searchForm] = Form.useForm();
  const [searchParams, setSearchParams] = useState<DocumentQueryParams>({
    page: 1,
    pageSize: 10,
  });
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
      // 统计加载失败，静默处理
    }
  };

  const loadUsers = async () => {
    try {
      const response = await getUserList({ page: 1, pageSize: 100, isActive: true });
      if (response.success && response.data?.users) {
        setUsers(response.data.users);
      }
    } catch (error) {
      // 用户列表加载失败不影响主要功能，静默处理
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
      key: 'action',
      fixed: 'right' as const,
      render: (_, record: Document) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();

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
                      message.error('加载流程定义失败');
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
                      // 表单定义加载失败，静默处理
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
                      // 表单定义加载失败，静默处理
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
                      // 节点表单加载失败，静默处理
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
                          // 单个节点表单加载失败，跳过
                        }
                      }
                      setDetailNodeForms(forms);
                    } catch (e) {
                      // 批量加载失败，使用空对象
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
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();

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
                            // 流程定义加载失败，静默处理
                            setDetailWorkflowDef(null);
                          }
                        } catch (e) {
                          // 节点表单加载失败，静默处理
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
                }}
              >
                {intl.formatMessage({ id: 'pages.document.approval.action.approve' })}
              </Button>
              <Button
                type="link"
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  setCurrentDocument(record);
                  // 获取流程实例和节点信息
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
                    // 获取流程信息失败，静默处理
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
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  setCurrentDocument(record);
                  // 获取流程实例和节点信息
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

                      // 获取流程定义以确定可退回的节点
                      if (defId) {
                        try {
                          const defResp = await getWorkflowDetail(defId);
                          if (defResp.success && defResp.data) {
                            const workflowDef = defResp.data;

                            // 获取已经通过的节点（从审批历史中）
                            const completedNodeIds = new Set(
                              approvalHistory
                                .filter((h: any) => h.action === 'Approve' || h.action === 'approve')
                                .map((h: any) => h.nodeId)
                            );

                            // 获取可退回的节点
                            const returnableNodeList = (workflowDef.graph?.nodes || [])
                              .filter((node: any) => {
                                // 排除当前节点
                                if (node.id === nodeId) return false;

                                // 开始节点始终可以退回（重新开始流程）
                                if (node.type === 'start') return true;

                                // 审批节点需要已经完成审批才能退回
                                if (node.type === 'approval') {
                                  return completedNodeIds.has(node.id);
                                }

                                return false;
                              })
                              .map((node: any) => ({
                                id: node.id,
                                label: node.label || node.id,
                                type: node.type
                              }))
                              .sort((a, b) => {
                                // 开始节点排在最前面
                                if (a.type === 'start' && b.type !== 'start') return -1;
                                if (b.type === 'start' && a.type !== 'start') return 1;
                                // 其他节点按标签排序
                                return a.label.localeCompare(b.label);
                              });

                            setReturnableNodes(returnableNodeList);
                          } else {
                            setReturnableNodes([]);
                          }
                        } catch (err) {
                          // 获取流程定义失败，静默处理
                          setReturnableNodes([]);
                        }
                      } else {
                        setReturnableNodes([]);
                      }
                    }
                  } catch (e) {
                    // 获取流程信息失败，静默处理
                    setReturnableNodes([]);
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
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  setCurrentDocument(record);
                  // 获取流程实例和节点信息
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
                    // 获取流程信息失败，静默处理
                  }
                  // 获取用户列表用于转办
                  try {
                    const userResp = await getUserList({ page: 1, pageSize: 1000 });
                    if (userResp.success && userResp.data) {
                      const userData = userResp.data as any;
                      setUsers(userData.list || userData.users || userData.data || []);
                    }
                  } catch (e) {
                    // 获取用户列表失败，静默处理
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
    if (!currentDocument || approving) return;

    try {
      setApproving(true);
      const values = await approvalForm.validateFields();
      const comment = values.comment;
      const nodeValues: Record<string, any> = values.nodeValues || {};

      // 统一使用 executeNodeAction 接口
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

  const handleReject = async () => {
    if (!currentDocument || rejecting) return;

    try {
      setRejecting(true);
      const values = await rejectForm.validateFields();

      // 统一使用 executeNodeAction 接口
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
      message.error(intl.formatMessage({ id: 'pages.document.approval.message.rejectFailed' }));
    } finally {
      setRejecting(false);
    }
  };

  const handleReturn = async () => {
    if (!currentDocument || returning) return;

    try {
      setReturning(true);
      const values = await returnForm.validateFields();

      // 统一使用 executeNodeAction 接口
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
          if (actionRef.current?.reload) {
            actionRef.current.reload();
          }
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

  const handleDelegate = async () => {
    if (!currentDocument || delegating) return;

    try {
      setDelegating(true);
      const values = await delegateForm.validateFields();

      // 统一使用 executeNodeAction 接口
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
      message.error(intl.formatMessage({ id: 'pages.document.approval.message.delegateFailed' }));
    } finally {
      setDelegating(false);
    }
  };

  const handleSearch = (values: any) => {
    setSearchParams((prev: DocumentQueryParams) => ({ ...prev, ...values, page: 1 }));
    actionRef.current?.reloadAndReset?.();
  };

  const handleReset = () => {
    searchForm.resetFields();
    setSearchParams((prev: DocumentQueryParams) => ({
      page: 1,
      pageSize: prev.pageSize,
    }));
    actionRef.current?.reloadAndReset?.();
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
              ...searchParams,
            });
            if (response.success && response.data) {
              const resData: any = response.data;
              return {
                data: resData.list || resData.data || [],
                success: true,
                total: resData.total || 0,
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
              ...searchParams,
            });
            if (response.success && response.data) {
              const resData: any = response.data;
              return {
                data: resData.list || resData.data || [],
                success: true,
                total: resData.total || 0,
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
              ...searchParams,
            });
            if (response.success && response.data) {
              const resData: any = response.data;
              return {
                data: resData.list || resData.data || [],
                success: true,
                total: resData.total || 0,
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
      {statistics && (
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.document.stat.pending', defaultMessage: '待在办' })}
                value={statistics.pendingCount}
                icon={<CheckCircleOutlined />}
                color="#faad14"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.document.stat.myCreated', defaultMessage: '我发起的' })}
                value={statistics.myCreatedCount}
                icon={<FileTextOutlined />}
                color="#1890ff"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.document.stat.approved', defaultMessage: '已通过' })}
                value={statistics.approvedCount}
                icon={<CheckCircleOutlined />}
                color="#52c41a"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.document.stat.rejected', defaultMessage: '已驳回' })}
                value={statistics.rejectedCount}
                icon={<CloseOutlined />}
                color="#ff4d4f"
              />
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
              <Button onClick={handleReset}>
                {intl.formatMessage({ id: 'pages.searchTable.reset', defaultMessage: '重置' })}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

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
        confirmLoading={rejecting}
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
        confirmLoading={returning}
        onCancel={() => {
          setReturnModalVisible(false);
          returnForm.resetFields();
          setCurrentDocument(null);
          setReturnableNodes([]);
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
            <Select
              placeholder={intl.formatMessage({ id: 'pages.document.approval.modal.returnNodePlaceholder' })}
              options={returnableNodes.map(node => ({
                label: `${node.label} (${node.type === 'start' ? '开始节点' : '审批节点'})`,
                value: node.id
              }))}
              notFoundContent={returnableNodes.length === 0 ? '暂无可退回的节点' : '未找到匹配项'}
            />
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
        confirmLoading={delegating}
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
                                        <div key={idx} style={{
                                          marginBottom: 12,
                                          padding: 8,
                                          background: '#f8fafc',
                                          borderRadius: 4,
                                          borderLeft: `3px solid ${actionMeta.color}`
                                        }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 600, color: '#262626' }}>{record.approverName || record.approverId}</span>
                                            <Tag color={actionMeta.color} style={{ fontSize: 10, borderRadius: 10 }}>
                                              {actionMeta.text}
                                            </Tag>
                                          </div>
                                          {record.comment && (
                                            <div style={{ color: '#595959', fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>
                                              “{record.comment}”
                                            </div>
                                          )}
                                          {record.approvedAt && (
                                            <div style={{ color: '#bfbfbf', fontSize: 10, marginTop: 4 }}>
                                              <ReloadOutlined style={{ marginRight: 4 }} />
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
