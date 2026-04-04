import React, { useRef, useState, useCallback } from 'react';
import { Space, Tag, Button, Table } from 'antd';
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
import { useModal } from '@/hooks/useModal';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import dayjs from 'dayjs';
import {
  type Document,
  DocumentStatus,
  getDocumentList,
} from '@/services/document/api';
import {
  DocumentDetailDrawer,
  DocumentStatistics,
  DocumentSubmitModal,
  DocumentCreateModal,
} from './components';
import SearchBar from '@/components/SearchBar';
import { useDocumentManagement } from './hooks/useDocumentManagement';
import { getStatusMeta, documentStatusMap } from '@/utils/statusMaps';
import type { PageParams } from '@/types/page-params';

const DocumentManagement: React.FC = () => {
  const modal = useModal();
  const {
    intl,
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
    setSearchParams,
    handleViewDetail,
    handleSubmit,
    handleDelete,
    onCreateOk,
    wfUploadProps,
    fetchActiveWorkflows,
    resetCreateModal,
  } = useDocumentManagement();

  const [dataSource, setDataSource] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });

  const searchParamsRef = useRef<PageParams>({ page: 1, pageSize: 10, search: '' });

  const fetchData = useCallback(async () => {
    const currentParams = searchParamsRef.current;
    setLoading(true);
    try {
      const response = await getDocumentList({
        ...currentParams,
        page: currentParams.page,
        pageSize: currentParams.pageSize,
      });
      if (response.success && response.data) {
        setDataSource(response.data.queryable || []);
        setPagination(prev => ({
          ...prev,
          page: currentParams.page ?? prev.page,
          pageSize: currentParams.pageSize ?? prev.pageSize,
          total: response.data!.rowCount ?? 0,
        }));
      } else {
        setDataSource([]);
        setPagination(prev => ({ ...prev, total: 0 }));
      }
    } catch {
      setDataSource([]);
      setPagination(prev => ({ ...prev, total: 0 }));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTableChange = useCallback(
    (pag: TablePaginationConfig, _filters: any, sorter: SorterResult<any> | SorterResult<any>[]) => {
      const newPage = pag.current;
      const newPageSize = pag.pageSize;
      const sortBy = (sorter as any)?.field;
      const sortOrder = (sorter as any)?.order === 'ascend' ? 'asc' : (sorter as any)?.order === 'descend' ? 'desc' : undefined;

      searchParamsRef.current = { ...searchParamsRef.current, page: newPage, pageSize: newPageSize, sortBy, sortOrder };
      fetchData();
    },
    [fetchData]
  );

  const handleRefresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = useCallback((params: any) => {
    searchParamsRef.current = { ...searchParamsRef.current, ...params, page: 1 };
    fetchData();
  }, [fetchData]);

  React.useEffect(() => {
    fetchData();
  }, []);

  const getDocStatus = (status?: DocumentStatus | null) =>
    getStatusMeta(intl, status ?? null, documentStatusMap);

  const columns: ColumnsType<Document> = [
    {
      title: intl.formatMessage({ id: 'pages.document.table.title' }),
      dataIndex: 'title',
      ellipsis: true,
      sorter: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.document.table.type' }),
      dataIndex: 'documentType',
      ellipsis: true,
      sorter: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.document.table.category' }),
      dataIndex: 'category',
      ellipsis: true,
      sorter: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.document.table.status' }),
      dataIndex: 'status',
      sorter: true,
      render: (_, record: Document) => {
        const status = getDocStatus(record.status);
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.document.table.createdBy' }),
      dataIndex: 'createdBy',
      ellipsis: true,
      sorter: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.document.table.createdAt' }),
      dataIndex: 'createdAt',
      sorter: true,
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
      <SearchBar
        initialParams={searchParamsRef.current}
        onSearch={(params) => {
          handleSearch(params);
        }}
      />

      <Table<Document>
        dataSource={dataSource}
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
