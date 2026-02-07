import React from 'react';
import { Space, Tag, Button } from 'antd';
import {
  FileTextOutlined,
  ReloadOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  SendOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@/components';
import DataTable from '@/components/DataTable';
import { useModal } from '@/hooks/useModal';
import { type ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  type Document,
  DocumentStatus,
  getDocumentList,
} from '@/services/document/api';
import {
  DocumentDetailDrawer,
  DocumentStatistics,
  DocumentSearchForm,
  DocumentSubmitModal,
  DocumentCreateModal,
} from './components';
import { useDocumentManagement } from './hooks/useDocumentManagement';
import { getStatusMeta, documentStatusMap } from '@/utils/statusMaps';

const DocumentManagement: React.FC = () => {
  const modal = useModal();
  const {
    intl,
    actionRef,
    form,
    wfForm,
    detailVisible,
    setDetailVisible,
    detailData,
    detailFormDef,
    detailFormValues,
    detailNodeFormDef,
    detailNodeFormValues,
    detailNodeForms,
    detailWorkflowDef,
    submitModalVisible,
    setSubmitModalVisible,
    submittingDocument,
    setSubmittingDocument,
    selectedWorkflowId,
    setSelectedWorkflowId,
    createModalVisible,
    setCreateModalVisible,
    isFormStep,
    setIsFormStep,
    workflowFormDef,
    setWorkflowFormDef,
    workflowInitialValues,
    setWorkflowInitialValues,
    nextStepLoading,
    workflows,
    statistics,
    searchParams,
    handleRefresh,
    handleSearch,
    handleReset,
    handleViewDetail,
    handleSubmit,
    handleDelete,
    onCreateOk,
    wfUploadProps,
    fetchActiveWorkflows,
    resetCreateModal,
  } = useDocumentManagement();

  const getDocStatus = (status?: DocumentStatus | null) =>
    getStatusMeta(intl, status ?? null, documentStatusMap);

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
            onClick={() => handleViewDetail(record)}
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
            onClick={() => handleDelete(record, modal)}
          >
            {intl.formatMessage({ id: 'pages.document.action.delete' })}
          </Button>
        </Space>
      ),
    },
  ];

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
              setSelectedWorkflowId('');
              setWorkflowFormDef(null);
              setWorkflowInitialValues({});
              setIsFormStep(false);
              wfForm.resetFields();
              setCreateModalVisible(true);
            }}
          >
            {intl.formatMessage({ id: 'pages.document.create' })}
          </Button>
        </Space>
      }
    >
      {/* 统计信息 */}
      <DocumentStatistics statistics={statistics} />

      {/* 搜索表单 */}
      <DocumentSearchForm
        form={form}
        onSearch={handleSearch}
        onReset={handleReset}
      />

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

      {/* 详情抽屉 */}
      <DocumentDetailDrawer
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        detailData={detailData}
        workflowDef={detailWorkflowDef}
        formDef={detailFormDef}
        formValues={detailFormValues}
        nodeFormDef={detailNodeFormDef}
        nodeFormValues={detailNodeFormValues}
        nodeForms={detailNodeForms}
      />

      {/* 提交审核模态框 */}
      <DocumentSubmitModal
        visible={submitModalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setSubmitModalVisible(false);
          setSubmittingDocument(null);
          setSelectedWorkflowId('');
        }}
        workflows={workflows}
        selectedWorkflowId={selectedWorkflowId}
        onWorkflowChange={(value) => setSelectedWorkflowId(value)}
      />

      {/* 创建流程模态框 */}
      <DocumentCreateModal
        visible={createModalVisible}
        isFormStep={isFormStep}
        nextStepLoading={nextStepLoading}
        onOk={onCreateOk}
        onCancel={resetCreateModal}
        workflows={workflows}
        selectedWorkflowId={selectedWorkflowId}
        onWorkflowChange={(value) => setSelectedWorkflowId(value)}
        workflowFormDef={workflowFormDef}
        workflowInitialValues={workflowInitialValues}
        wfForm={wfForm}
        wfUploadProps={wfUploadProps}
      />
    </PageContainer>
  );
};

export default DocumentManagement;
