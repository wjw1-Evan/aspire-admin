import React, { useRef, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Button, Space, Modal, message, Tag, Drawer, Card, Descriptions, Select } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SendOutlined,
  FileTextOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { DataTable } from '@/components/DataTable';
import {
  getDocumentList,
  deleteDocument,
  getDocumentDetail,
  submitDocument,
  type Document,
  DocumentStatus,
} from '@/services/document/api';
import { getWorkflowList } from '@/services/workflow/api';
import { useIntl } from '@umijs/max';
import dayjs from 'dayjs';

const DocumentManagement: React.FC = () => {
  const intl = useIntl();
  const actionRef = useRef<ActionType>();
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);
  const [submitModalVisible, setSubmitModalVisible] = useState(false);
  const [submittingDocument, setSubmittingDocument] = useState<Document | null>(null);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');

  const handleRefresh = () => {
    actionRef.current?.reload();
  };

  const statusMap = {
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

  const columns: ProColumns<Document>[] = [
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
      render: (_, record) => {
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
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: intl.formatMessage({ id: 'pages.document.table.action' }),
      valueType: 'option',
      width: 250,
      render: (_, record) => (
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
                    const workflowResponse = await getWorkflowList({ current: 1, pageSize: 100 });
                    if (workflowResponse.success && workflowResponse.data) {
                      setWorkflows(workflowResponse.data.list);
                      setSubmittingDocument(record);
                      setSubmitModalVisible(true);
                    }
                  } catch (error) {
                    console.error('获取流程列表失败:', error);
                  }
                }}
              >
                {intl.formatMessage({ id: 'pages.document.action.submit' })}
              </Button>
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={async () => {
                  Modal.confirm({
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
                          actionRef.current?.reload();
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
            </>
          )}
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
        actionRef.current?.reload();
      }
    } catch (error) {
      console.error('提交失败:', error);
      message.error(intl.formatMessage({ id: 'pages.document.message.submitFailed' }));
    }
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
            onClick={() => {
              window.location.href = '/document/create';
            }}
          >
            {intl.formatMessage({ id: 'pages.document.create' })}
          </Button>
        </Space>
      }
    >
      <DataTable<Document>
        actionRef={actionRef}
        columns={columns}
        request={async (params) => {
          const response = await getDocumentList({
            current: params.current,
            pageSize: params.pageSize,
            keyword: params.keyword as string,
            status: params.status as DocumentStatus,
            documentType: params.documentType as string,
            category: params.category as string,
            filterType: params.filterType as any,
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
        search={{
          labelWidth: 'auto',
          options: {
            fullScreen: true,
          },
        }}
      />

      <Drawer
        title={intl.formatMessage({ id: 'pages.document.modal.detailTitle' })}
        open={detailVisible}
        onClose={() => {
          setDetailVisible(false);
          setDetailData(null);
        }}
        width={800}
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
                  <Tag color={statusMap[detailData.status].color}>
                    {statusMap[detailData.status].text}
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
    </PageContainer>
  );
};

export default DocumentManagement;
