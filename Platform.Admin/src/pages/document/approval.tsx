import React, { useRef, useState } from 'react';
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
import type { ActionType } from '@/types/pro-components';
import type { ColumnsType } from 'antd/es/table';
import { DataTable } from '@/components/DataTable';
import {
  getPendingDocuments,
  getDocumentList,
  getDocumentDetail,
  approveDocument,
  rejectDocument,
  returnDocument,
  delegateDocument,
  type Document,
  DocumentStatus,
} from '@/services/document/api';
import { getUserList } from '@/services/user/api';
import { useIntl, useModel } from '@umijs/max';
import dayjs from 'dayjs';

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

  const statusMap: Record<DocumentStatus, { color: string; text: string }> = {
    [DocumentStatus.Draft]: {
      color: 'default',
      text: intl.formatMessage({ id: 'pages.document.status.draft' }),
    },
    [DocumentStatus.Pending]: {
      color: 'processing',
      text: intl.formatMessage({ id: 'pages.document.status.pending' }),
    },
    [DocumentStatus.Approved]: {
      color: 'success',
      text: intl.formatMessage({ id: 'pages.document.status.approved' }),
    },
    [DocumentStatus.Rejected]: {
      color: 'error',
      text: intl.formatMessage({ id: 'pages.document.status.rejected' }),
    },
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
      title: intl.formatMessage({ id: 'pages.document.table.status' }),
      dataIndex: 'status',
      render: (_, record: Document) => {
        const status = statusMap[record.status];
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
                  setDetailVisible(true);
                }
              } catch (error) {
                console.error('获取详情失败:', error);
              }
            }}
          >
            {intl.formatMessage({ id: 'pages.document.action.view' })}
          </Button>
          {activeTab === 'pending' && record.status === DocumentStatus.Pending && (
            <>
              <Button
                type="link"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => {
                  setCurrentDocument(record);
                  setApprovalModalVisible(true);
                }}
              >
                {intl.formatMessage({ id: 'pages.document.approval.action.approve' })}
              </Button>
              <Button
                type="link"
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={() => {
                  setCurrentDocument(record);
                  setRejectModalVisible(true);
                }}
              >
                {intl.formatMessage({ id: 'pages.document.approval.action.reject' })}
              </Button>
              <Button
                type="link"
                size="small"
                icon={<RollbackOutlined />}
                onClick={() => {
                  setCurrentDocument(record);
                  setReturnModalVisible(true);
                }}
              >
                {intl.formatMessage({ id: 'pages.document.approval.action.return' })}
              </Button>
              <Button
                type="link"
                size="small"
                icon={<SwapOutlined />}
                onClick={() => {
                  setCurrentDocument(record);
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
      const values = await approvalForm.validateFields();
      const response = await approveDocument(currentDocument.id!, {
        comment: values.comment,
      });
      if (response.success) {
        message.success(intl.formatMessage({ id: 'pages.document.approval.message.approveSuccess' }));
        setApprovalModalVisible(false);
        approvalForm.resetFields();
        setCurrentDocument(null);
        if (actionRef.current?.reload) {
          actionRef.current.reload();
        }
      }
    } catch (error) {
      console.error('审批失败:', error);
      message.error(intl.formatMessage({ id: 'pages.document.approval.message.approveFailed' }));
    }
  };

  const handleReject = async () => {
    if (!currentDocument) return;

    try {
      const values = await rejectForm.validateFields();
      const response = await rejectDocument(currentDocument.id!, {
        comment: values.comment,
      });
      if (response.success) {
        message.success(intl.formatMessage({ id: 'pages.document.approval.message.rejectSuccess' }));
        setRejectModalVisible(false);
        rejectForm.resetFields();
        setCurrentDocument(null);
        if (actionRef.current?.reload) {
          actionRef.current.reload();
        }
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
      const response = await returnDocument(currentDocument.id!, {
        targetNodeId: values.targetNodeId,
        comment: values.comment,
      });
      if (response.success) {
        message.success(intl.formatMessage({ id: 'pages.document.approval.message.returnSuccess' }));
        setReturnModalVisible(false);
        returnForm.resetFields();
        setCurrentDocument(null);
        actionRef.current?.reload?.();
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
      const response = await delegateDocument(currentDocument.id!, {
        delegateToUserId: values.delegateToUserId,
        comment: values.comment,
      });
      if (response.success) {
        message.success(intl.formatMessage({ id: 'pages.document.approval.message.delegateSuccess' }));
        setDelegateModalVisible(false);
        delegateForm.resetFields();
        setCurrentDocument(null);
        if (actionRef.current?.reload) {
          actionRef.current.reload();
        }
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
            // 防御性检查：当前企业ID必须为有效的 Mongo ObjectId
            const currentCompanyId = (initialState as any)?.currentUser?.currentCompanyId as string | undefined;
            const isValidObjectId = (id?: string) => !!id && /^[a-fA-F0-9]{24}$/.test(id);

            if (!isValidObjectId(currentCompanyId)) {
              // 当企业ID非法（如 none）时，避免调用后端导致 400
              return { data: [], success: true, total: 0 };
            }

            const response = await getPendingDocuments({
              current: params.current,
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
              current: params.current,
              pageSize: params.pageSize,
              filterType: 'approved',
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
              current: params.current,
              pageSize: params.pageSize,
              filterType: 'my',
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
        onCancel={() => {
          setApprovalModalVisible(false);
          approvalForm.resetFields();
          setCurrentDocument(null);
        }}
      >
        <Form form={approvalForm} layout="vertical">
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
        }}
        size={800}
      >
        {detailData && (
          <div>
            <Card style={{ marginBottom: 16 }}>
              <Descriptions column={2} bordered>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.document.detail.title' })}>
                  {detailData.title}
                </Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.document.detail.type' })}>
                  {detailData.documentType}
                </Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.document.detail.category' })}>
                  {detailData.category || '-'}
                </Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.document.detail.workflowStatus' })}>
                  <Tag color={statusMap[detailData.status as DocumentStatus]?.color}>
                    {statusMap[detailData.status as DocumentStatus]?.text}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.document.detail.createdBy' })}>
                  {detailData.createdBy}
                </Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.document.detail.createdAt' })}>
                  {dayjs(detailData.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
              </Descriptions>
            </Card>
            <Card title={intl.formatMessage({ id: 'pages.document.detail.content' })}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{detailData.content || '-'}</div>
            </Card>
            {detailData.workflowInstance && (
              <Card title={intl.formatMessage({ id: 'pages.document.detail.workflowInfo' })} style={{ marginTop: 16 }}>
                <Descriptions column={1}>
                  <Descriptions.Item label={intl.formatMessage({ id: 'pages.document.detail.workflowStatus' })}>
                    {detailData.workflowInstance.status === 0
                      ? intl.formatMessage({ id: 'pages.workflow.monitor.status.running' })
                      : detailData.workflowInstance.status === 1
                      ? intl.formatMessage({ id: 'pages.workflow.monitor.status.completed' })
                      : detailData.workflowInstance.status === 2
                      ? intl.formatMessage({ id: 'pages.workflow.monitor.status.cancelled' })
                      : intl.formatMessage({ id: 'pages.workflow.monitor.status.rejected' })}
                  </Descriptions.Item>
                  <Descriptions.Item label={intl.formatMessage({ id: 'pages.workflow.monitor.progress.currentNode' })}>
                    {detailData.workflowInstance.currentNodeId}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            )}
            {detailData.approvalHistory && detailData.approvalHistory.length > 0 && (
              <Card title={intl.formatMessage({ id: 'pages.document.detail.approvalHistory' })} style={{ marginTop: 16 }}>
                {detailData.approvalHistory.map((record: any, index: number) => (
                  <Card key={index} size="small" style={{ marginBottom: 8 }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div>
                        <strong>{intl.formatMessage({ id: 'pages.workflow.monitor.history.approver' })}:</strong>{' '}
                        {record.approverName || record.approverId}
                      </div>
                      <div>
                        <strong>{intl.formatMessage({ id: 'pages.workflow.monitor.history.action' })}:</strong>{' '}
                        {record.action === 0
                          ? intl.formatMessage({ id: 'pages.workflow.monitor.history.action.approve' })
                          : record.action === 1
                          ? intl.formatMessage({ id: 'pages.workflow.monitor.history.action.reject' })
                          : record.action === 2
                          ? intl.formatMessage({ id: 'pages.workflow.monitor.history.action.return' })
                          : intl.formatMessage({ id: 'pages.workflow.monitor.history.action.delegate' })}
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
              </Card>
            )}
          </div>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default ApprovalPage;
