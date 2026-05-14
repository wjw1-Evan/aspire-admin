import {
  AppstoreOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  SettingOutlined,
  StarOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components/es/card';
import { ProDescriptions } from '@ant-design/pro-components/es/descriptions';
import { ModalForm, ProFormSelect, ProFormText, ProFormTextArea } from '@ant-design/pro-components/es/form';
import { PageContainer } from '@ant-design/pro-components/es/layout';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components/es/table';
import { history, request, useIntl, useSearchParams } from '@umijs/max';
import type { UploadFile } from 'antd';
import {
  App,
  Button,
  Col,
  Drawer,
  Flex,
  Form,
  Image,
  Input,
  Popconfirm,
  Rate,
  Row,
  Space,
  Spin,
  Tag,
  Timeline,
  Typography,
  Upload,
} from 'antd';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ApiResponse, PagedResult } from '@/types';
import { tokenUtils } from '@/utils/token';

const { Text } = Typography;

interface StatusChangeRecord {
  fromStatus: string;
  toStatus: string;
  changedBy?: string;
  changedByName?: string;
  comment?: string;
  changedAt: string;
}
interface ServiceRequest {
  id: string;
  categoryName?: string;
  tenantId?: string;
  tenantName?: string;
  title: string;
  description?: string;
  contactPerson?: string;
  contactPhone?: string;
  priority: string;
  status: string;
  assignedTo?: string;
  assignedToName?: string;
  completedAt?: string;
  rating?: number;
  createdAt: string;
  attachments?: string[];
  statusHistory?: StatusChangeRecord[];
}
interface ServiceStatistics {
  totalCategories: number;
  activeCategories: number;
  totalRequests: number;
  pendingRequests: number;
  processingRequests: number;
  completedRequests: number;
  averageRating: number;
}
interface ParkTenant {
  id: string;
  tenantName: string;
  contactPerson?: string;
  phone?: string;
}
interface SuggestCategoryResult {
  categoryName: string;
}

const api = {
  statistics: () =>
    request<ApiResponse<ServiceStatistics>>('/apiservice/api/park/services/statistics', { method: 'GET' }),
  requests: (params: any) =>
    request<ApiResponse<PagedResult<ServiceRequest>>>('/apiservice/api/park/services/requests/list', { params }),
  createRequest: (data: Partial<ServiceRequest>) =>
    request<ApiResponse<ServiceRequest>>('/apiservice/api/park/services/requests', { method: 'POST', data }),
  updateRequest: (id: string, data: Partial<ServiceRequest>) =>
    request<ApiResponse<ServiceRequest>>(`/apiservice/api/park/services/requests/${id}`, { method: 'PUT', data }),
  updateStatus: (id: string, data: { status: string; assignedTo?: string; resolution?: string }) =>
    request<ApiResponse<ServiceRequest>>(`/apiservice/api/park/services/requests/${id}/status`, {
      method: 'PUT',
      data,
    }),
  deleteRequest: (id: string) =>
    request<ApiResponse<boolean>>(`/apiservice/api/park/services/requests/${id}`, { method: 'DELETE' }),
  rateRequest: (id: string, data: { rating: number; feedback?: string }) =>
    request<ApiResponse<boolean>>(`/apiservice/api/park/services/requests/${id}/rate`, { method: 'POST', data }),
  tenants: (params: any) =>
    request<ApiResponse<PagedResult<ParkTenant>>>('/apiservice/api/park/tenants/list', { params }),
  suggestCategory: (description: string) =>
    request<ApiResponse<SuggestCategoryResult>>('/apiservice/api/park/services/categories/suggest', {
      method: 'POST',
      data: { description },
    }),
  uploadFile: (data: FormData) =>
    request<ApiResponse<{ id: string; name: string }>>('/apiservice/api/cloud-storage/upload', { method: 'POST', data }),
};

const priorityOptions = (intl: ReturnType<typeof useIntl>) => [
  { label: intl.formatMessage({ id: 'pages.park.service.priority.urgent' }), value: 'Urgent', color: 'red' },
  { label: intl.formatMessage({ id: 'pages.park.service.priority.high' }), value: 'High', color: 'orange' },
  { label: intl.formatMessage({ id: 'pages.park.service.priority.normal' }), value: 'Normal', color: 'blue' },
  { label: intl.formatMessage({ id: 'pages.park.service.priority.low' }), value: 'Low', color: 'default' },
];
const statusOptions = (intl: ReturnType<typeof useIntl>) => [
  { label: intl.formatMessage({ id: 'pages.park.service.status.pending' }), value: 'Pending', color: 'orange' },
  {
    label: intl.formatMessage({ id: 'pages.park.service.status.processing' }),
    value: 'Processing',
    color: 'processing',
  },
  { label: intl.formatMessage({ id: 'pages.park.service.status.completed' }), value: 'Completed', color: 'green' },
  { label: intl.formatMessage({ id: 'pages.park.service.status.cancelled' }), value: 'Cancelled', color: 'default' },
];

const EnterpriseService: React.FC = () => {
  const intl = useIntl();
  const { message } = App.useApp();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [searchParams] = useSearchParams();
  const [state, setState] = useState({
    statistics: null as ServiceStatistics | null,
    tenants: [] as ParkTenant[],
    search: '',
    categorizing: false,
    suggestedCategory: null as SuggestCategoryResult | null,
    attachmentFileList: [] as UploadFile[],
  });
  const set = useCallback((partial: Partial<typeof state>) => setState((prev) => ({ ...prev, ...partial })), []);
  const [modalState, setModalState] = useState({
    requestVisible: false,
    statusVisible: false,
    ratingVisible: false,
    detailVisible: false,
  });
  const setModal = (partial: Partial<typeof modalState>) => setModalState((prev) => ({ ...prev, ...partial }));
  const [currentRequest, setCurrentRequest] = useState<ServiceRequest | null>(null);

  const loadData = useCallback(async () => {
    api.statistics().then((r) => {
      if (r.success && r.data) set({ statistics: r.data });
    });
  }, [set]);
  const loadTenants = useCallback(async () => {
    api.tenants({ page: 1 }).then((r) => {
      if (r.success && r.data) set({ tenants: r.data.queryable });
    });
  }, [set]);

  useEffect(() => {
    loadTenants();
    loadData();
  }, [loadTenants, loadData]);
  useEffect(() => {
    const tenantId = searchParams.get('tenantId');
    if (tenantId) {
      setCurrentRequest(null);
      setModal({ requestVisible: true });
      history.replace('/park-management/enterprise-service');
    }
  }, [searchParams, setModal]);

  const columns: ProColumns<ServiceRequest>[] = [
    {
      title: intl.formatMessage({ id: 'pages.park.service.request.category' }),
      dataIndex: 'categoryName',
      sorter: true,
      width: 100,
      render: (text) => <Tag>{text || '-'}</Tag>,
    },
    {
      title: intl.formatMessage({ id: 'pages.park.service.request.description' }),
      dataIndex: 'description',
      width: 200,
      ellipsis: true,
      render: (text) => <Text ellipsis={{ tooltip: text }}>{text || '-'}</Text>,
    },
    {
      title: intl.formatMessage({ id: 'pages.park.service.request.tenant' }),
      dataIndex: 'tenantName',
      sorter: true,
      width: 150,
      render: (text) => text || <Text type="secondary">-</Text>,
    },
    {
      title: intl.formatMessage({ id: 'pages.park.service.request.contact' }),
      dataIndex: 'contactPerson',
      sorter: true,
      width: 100,
      render: (text) => text || <Text type="secondary">-</Text>,
    },
    {
      title: intl.formatMessage({ id: 'pages.park.service.request.contactPhone' }),
      dataIndex: 'contactPhone',
      width: 120,
      render: (text) => text || <Text type="secondary">-</Text>,
    },
    {
      title: intl.formatMessage({ id: 'pages.park.service.request.priority' }),
      dataIndex: 'priority',
      sorter: true,
      width: 80,
      render: (priority) => {
        const opt = priorityOptions(intl).find((o) => o.value === priority);
        return <Tag color={opt?.color || 'default'}>{opt?.label || priority}</Tag>;
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.park.service.request.status' }),
      dataIndex: 'status',
      sorter: true,
      width: 100,
      render: (status) => {
        const opt = statusOptions(intl).find((o) => o.value === status);
        return <Tag color={opt?.color || 'default'}>{opt?.label || status}</Tag>;
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.park.service.request.rating' }),
      dataIndex: 'rating',
      sorter: true,
      width: 120,
      render: (rating) => (rating ? <Rate disabled value={rating as number} style={{ fontSize: 12 }} /> : '-'),
    },
    {
      title: intl.formatMessage({ id: 'pages.park.service.request.createdAt' }),
      dataIndex: 'createdAt',
      sorter: true,
      width: 120,
      render: (date) => dayjs(date as string).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: intl.formatMessage({ id: 'common.action' }),
      valueType: 'option',
      fixed: 'right',
      width: 180,
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setCurrentRequest(record);
              set({ suggestedCategory: { categoryName: record.categoryName || '' }, attachmentFileList: [] });
              setModal({ requestVisible: true });
            }}
          >
            {intl.formatMessage({ id: 'common.edit' })}
          </Button>
          {record.status !== 'Completed' && record.status !== 'Cancelled' && (
            <Button
              type="link"
              size="small"
              icon={<SettingOutlined />}
              onClick={() => {
                setCurrentRequest(record);
                setModal({ statusVisible: true });
              }}
            >
              {intl.formatMessage({ id: 'pages.park.service.request.updateStatus' })}
            </Button>
          )}
          {record.status === 'Completed' && !record.rating && (
            <Button
              type="link"
              size="small"
              icon={<StarOutlined />}
              onClick={() => {
                setCurrentRequest(record);
                setModal({ ratingVisible: true });
              }}
            >
              {intl.formatMessage({ id: 'pages.park.service.request.rate' })}
            </Button>
          )}
          <Popconfirm
            title={intl.formatMessage({ id: 'common.confirmDelete' })}
            onConfirm={async () => {
              const res = await api.deleteRequest(record.id);
              if (res.success) {
                message.success(intl.formatMessage({ id: 'pages.park.service.message.deleteSuccess' }));
                actionRef.current?.reload();
                loadData();
              }
            }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              {intl.formatMessage({ id: 'common.delete' })}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <ProTable
        actionRef={actionRef}
        headerTitle={
          <Space size={24}>
            <Space>
              <AppstoreOutlined />
              {intl.formatMessage({ id: 'pages.park.service.enterpriseService' })}
            </Space>
            <Space size={12}>
              <Tag color="blue">
                {intl.formatMessage({ id: 'pages.park.service.statistics.categories' })}{' '}
                {state.statistics?.totalCategories || 0}
              </Tag>
              <Tag color="green">
                {intl.formatMessage({ id: 'pages.park.service.statistics.requests' })}{' '}
                {state.statistics?.totalRequests || 0}
              </Tag>
              <Tag color="orange">
                {intl.formatMessage({ id: 'pages.park.service.statistics.pending' })}{' '}
                {state.statistics?.pendingRequests || 0}
              </Tag>
              <Tag color="cyan">
                {intl.formatMessage({ id: 'pages.park.service.statistics.processing' })}{' '}
                {state.statistics?.processingRequests || 0}
              </Tag>
              <Tag color="purple">
                {intl.formatMessage({ id: 'pages.park.service.statistics.satisfaction' })}{' '}
                {state.statistics?.averageRating || 0} ⭐
              </Tag>
            </Space>
          </Space>
        }
        request={async (params: any, sort: any, filter: any) => {
          const res = await api.requests({ ...params, search: state.search, sort, filter });
          loadData();
          return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
        }}
        columns={columns}
        rowKey="id"
        search={false}
        scroll={{ x: 'max-content' }}
        onRow={(record) => ({
          style: { cursor: 'pointer' },
          onClick: (e) => {
            const target = e.target as HTMLElement;
            if (target.closest('a, button, [role="button"], .ant-btn')) return;
            setCurrentRequest(record);
            setModal({ detailVisible: true });
          },
        })}
        toolBarRender={() => [
          <Input.Search
            key="search"
            placeholder={intl.formatMessage({ id: 'pages.common.search' })}
            allowClear
            value={state.search}
            onChange={(e) => set({ search: e.target.value })}
            onSearch={(value) => {
              set({ search: value });
              actionRef.current?.reload();
            }}
            style={{ width: 260, marginRight: 8 }}
            prefix={<SearchOutlined />}
          />,
          <Button
            key="add"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setCurrentRequest(null);
              set({ suggestedCategory: null, attachmentFileList: [] });
              setModal({ requestVisible: true });
            }}
          >
            {intl.formatMessage({ id: 'pages.park.service.request.addRequest' })}
          </Button>,
        ]}
      />

      <ModalForm
        key={currentRequest?.id || 'create-request'}
        title={
          currentRequest
            ? intl.formatMessage({ id: 'common.edit' })
            : intl.formatMessage({ id: 'pages.park.service.request.addRequest' })
        }
        open={modalState.requestVisible}
        onOpenChange={(open) => {
          if (!open) {
            setModal({ requestVisible: false });
            setCurrentRequest(null);
            set({ suggestedCategory: null, attachmentFileList: [] });
          }
        }}
        initialValues={
          currentRequest
            ? {
              description: currentRequest.description,
              tenantId: currentRequest.tenantId,
              priority: currentRequest.priority,
              contactPerson: currentRequest.contactPerson,
              contactPhone: currentRequest.contactPhone,
            }
            : undefined
        }
        onFinish={async (values) => {
          const attachmentUrls = state.attachmentFileList
            .filter((f) => f.status === 'done')
            .map((item) => {
              if (item.response?.data?.path) return item.response.data.path;
              if (item.response?.data?.url) return item.response.data.url;
              return item.url;
            })
            .filter(Boolean) as string[];
          const data = { ...values, attachments: attachmentUrls };
          if (currentRequest) {
            const res = await api.updateRequest(currentRequest.id, data);
            if (res.success) {
              message.success(intl.formatMessage({ id: 'pages.park.service.message.updateSuccess' }));
              setModal({ requestVisible: false });
              setCurrentRequest(null);
              set({ suggestedCategory: null, attachmentFileList: [] });
              actionRef.current?.reload();
              loadData();
            }
            return res.success;
          }
          set({ categorizing: true });
          const suggestion = await api.suggestCategory(values.description || '');
          set({ categorizing: false });
          if (!suggestion.success || !suggestion.data?.categoryName) {
            message.error(intl.formatMessage({ id: 'pages.park.service.message.categorySuggestFailed' }));
            return false;
          }
          set({ suggestedCategory: suggestion.data });
          const res = await api.createRequest(data);
          if (res.success) {
            message.success(intl.formatMessage({ id: 'pages.park.service.message.createSuccess' }));
            setModal({ requestVisible: false });
            set({ suggestedCategory: null, attachmentFileList: [] });
            actionRef.current?.reload();
            loadData();
          }
          return res.success;
        }}
        autoFocusFirstInput
        width={640}

      >
        <ProFormTextArea
          name="description"
          label={intl.formatMessage({ id: 'pages.park.service.request.description' })}
          placeholder={intl.formatMessage({ id: 'pages.park.service.request.descriptionPlaceholder' })}
          rules={[{ required: true, message: intl.formatMessage({ id: 'pages.park.service.request.descriptionRequired' }) }]}
        />
        <Form.Item
          label={intl.formatMessage({ id: 'pages.park.service.request.attachments' })}
          style={{ marginBottom: 16 }}
        >
          <Image.PreviewGroup>
            <Upload
              listType="picture-card"
              accept="image/*"
              multiple
              fileList={state.attachmentFileList}
              showUploadList={{
                showRemoveIcon: true,
                showPreviewIcon: true,
              }}
              onPreview={(file) => {
                const imgUrl = file.url || file.thumbUrl || '';
                const win = window.open('');
                if (win) {
                  win.document.write(`
                    <html>
                      <head><title>${file.name || '预览'}</title></head>
                      <body style="margin:0;display:flex;align-items:center;justify-content:center;width:100vw;height:100vh;background:#f0f0f0;">
                        <img src="${imgUrl}" style="max-width:90vw;max-height:90vh;object-fit:contain;" />
                      </body>
                    </html>
                  `);
                  win.document.close();
                }
              }}
              itemRender={(originNode, file) => (
                <div
                  style={{
                    position: 'relative',
                    width: 104,
                    height: 104,
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: '1px solid #d9d9d9',
                  }}
                >
                  <Image
                    src={file.url || file.thumbUrl}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    preview={{ mask: null }}
                  />
                  <Button
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      const newList = state.attachmentFileList.filter((f) => f.uid !== file.uid);
                      set({ attachmentFileList: newList });
                    }}
                    style={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      width: 22,
                      height: 22,
                      minWidth: 22,
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(0,0,0,0.5)',
                      color: '#fff',
                      borderRadius: 4,
                      zIndex: 10,
                    }}
                  />
                </div>
              )}
              customRequest={async (options) => {
                const { file, onSuccess, onError } = options;
                try {
                  const formData = new FormData();
                  formData.append('file', file as File);
                  const res = await api.uploadFile(formData);
                  if (res.success && res.data) {
                    const url = `/apiservice/api/cloud-storage/items/${res.data.id}/download`;
                    const newFile: UploadFile = {
                      uid: res.data.id,
                      name: res.data.name,
                      status: 'done',
                      url,
                      thumbUrl: url,
                      response: res.data,
                    };
                    set({ attachmentFileList: [...state.attachmentFileList, newFile] });
                    onSuccess?.(res.data);
                  } else {
                    onError?.(new Error(res.message || '上传失败'));
                  }
                } catch (err) {
                  onError?.(err as Error);
                }
              }}
            >
              {state.attachmentFileList.length < 9 && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    gap: 4,
                  }}
                >
                  <UploadOutlined style={{ fontSize: 24, color: '#999' }} />
                  <span style={{ fontSize: 12, color: '#999' }}>
                    {intl.formatMessage({ id: 'pages.park.service.request.uploadAttachment' })}
                  </span>
                </div>
              )}
            </Upload>
          </Image.PreviewGroup>
        </Form.Item>
        <Row gutter={16}>
          <Col span={12}>
            <ProFormSelect
              name="tenantId"
              label={intl.formatMessage({ id: 'pages.park.service.request.tenant' })}
              placeholder={intl.formatMessage({ id: 'pages.park.service.request.tenantPlaceholder' })}
              allowClear
              showSearch
              options={state.tenants.map((t) => ({ label: t.tenantName, value: t.id }))}
            />
          </Col>
          <Col span={12}>
            <ProFormSelect
              name="priority"
              label={intl.formatMessage({ id: 'pages.park.service.request.priority' })}
              placeholder={intl.formatMessage({ id: 'pages.park.service.request.priorityPlaceholder' })}
              options={priorityOptions(intl)}
            />
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <ProFormText
              name="contactPerson"
              label={intl.formatMessage({ id: 'pages.park.service.request.contact' })}
              placeholder={intl.formatMessage({ id: 'pages.park.service.request.contactPlaceholder' })}
            />
          </Col>
          <Col span={12}>
            <ProFormText
              name="contactPhone"
              label={intl.formatMessage({ id: 'pages.park.service.request.contactPhone' })}
              placeholder={intl.formatMessage({ id: 'pages.park.service.request.contactPhonePlaceholder' })}
            />
          </Col>
        </Row>
        {state.suggestedCategory && (
          <Flex align="center" gap={8} style={{ marginTop: 8 }}>
            <Spin size="small" />
            <Text type="secondary">
              AI 已自动归类：
            </Text>
            <Tag color="blue">{state.suggestedCategory.categoryName}</Tag>
          </Flex>
        )}
        {state.categorizing && (
          <Flex align="center" gap={8} style={{ marginTop: 8 }}>
            <Spin size="small" />
            <Text type="secondary">
              AI 正在分析服务类别...
            </Text>
          </Flex>
        )}
      </ModalForm>

      <ModalForm
        key={`update-status-${currentRequest?.id}`}
        title={intl.formatMessage({ id: 'pages.park.service.request.updateStatus' })}
        open={modalState.statusVisible}
        initialValues={{ status: currentRequest?.status || 'Pending' }}
        onOpenChange={(open) => {
          if (!open) setModal({ statusVisible: false });
        }}
        onFinish={async (values) => {
          if (currentRequest) {
            const res = await api.updateStatus(currentRequest.id, {
              status: values.status,
              assignedTo: values.assignedTo,
              resolution: values.resolution,
            });
            if (res.success) {
              message.success(intl.formatMessage({ id: 'pages.park.service.message.statusUpdateSuccess' }));
              setModal({ statusVisible: false });
              actionRef.current?.reload();
              loadData();
            }
            return res.success;
          }
          return false;
        }}
        autoFocusFirstInput
        width={480}
      >
        <ProFormSelect
          name="status"
          label={intl.formatMessage({ id: 'pages.park.service.request.status' })}
          rules={[{ required: true }]}
          options={statusOptions(intl)}
        />
        <ProFormText
          name="assignedTo"
          label={intl.formatMessage({ id: 'pages.park.service.request.assignedTo' })}
          placeholder={intl.formatMessage({ id: 'pages.park.service.request.assignedToPlaceholder' })}
        />
        <ProFormTextArea
          name="resolution"
          label={intl.formatMessage({ id: 'pages.park.service.request.resolution' })}
          placeholder={intl.formatMessage({ id: 'pages.park.service.request.resolutionPlaceholder' })}
        />
      </ModalForm>

      <ModalForm
        key={`rate-${currentRequest?.id}`}
        title={intl.formatMessage({ id: 'pages.park.service.request.rate' })}
        open={modalState.ratingVisible}
        onOpenChange={(open) => {
          if (!open) setModal({ ratingVisible: false });
        }}
        onFinish={async (values) => {
          if (currentRequest) {
            const res = await api.rateRequest(currentRequest.id, {
              rating: values.rating,
              feedback: values.feedback,
            });
            if (res.success) {
              message.success(intl.formatMessage({ id: 'pages.park.service.message.rateSuccess' }));
              setModal({ ratingVisible: false });
              actionRef.current?.reload();
              loadData();
            }
            return res.success;
          }
          return false;
        }}
        autoFocusFirstInput
        width={480}
      >
        <Form.Item
          name="rating"
          label={intl.formatMessage({ id: 'pages.park.service.request.rating' })}
          rules={[{ required: true, message: intl.formatMessage({ id: 'pages.park.service.request.ratingRequired' }) }]}
        >
          <Rate />
        </Form.Item>
        <ProFormTextArea
          name="feedback"
          label={intl.formatMessage({ id: 'pages.park.service.request.feedback' })}
          placeholder={intl.formatMessage({ id: 'pages.park.service.request.feedbackPlaceholder' })}
        />
      </ModalForm>

      <Drawer
        title={
          currentRequest?.title || intl.formatMessage({ id: 'pages.park.service.request.requestDetail' })
        }
        open={modalState.detailVisible}
        onClose={() => setModal({ detailVisible: false })}
        placement="right"
        size="large"
      >
        {currentRequest && (
          <ProDescriptions bordered column={2} size="small">
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.service.request.titleField' })} span={2}>
              {currentRequest.title}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.service.request.tenant' })}>
              {currentRequest.tenantName || '-'}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.service.request.category' })}>
              {currentRequest.categoryName || '-'}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.service.request.priority' })}>
              <Tag color={priorityOptions(intl).find((o) => o.value === currentRequest?.priority)?.color}>
                {priorityOptions(intl).find((o) => o.value === currentRequest?.priority)?.label ||
                  currentRequest?.priority}
              </Tag>
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.service.request.status' })}>
              <Tag color={statusOptions(intl).find((o) => o.value === currentRequest?.status)?.color}>
                {statusOptions(intl).find((o) => o.value === currentRequest?.status)?.label ||
                  currentRequest?.status}
              </Tag>
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.service.request.rating' })}>
              {currentRequest.rating ? <Rate disabled value={currentRequest.rating} /> : '-'}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.service.request.contact' })}>
              {currentRequest.contactPerson || '-'}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.service.request.contactPhone' })}>
              {currentRequest.contactPhone || '-'}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.service.request.createdAt' })}>
              {dayjs(currentRequest.createdAt).format('YYYY-MM-DD HH:mm')}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.service.request.completedAt' })}>
              {currentRequest.completedAt
                ? dayjs(currentRequest.completedAt).format('YYYY-MM-DD HH:mm')
                : '-'}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.service.request.description' })} span={2}>
              {currentRequest.description || '-'}
            </ProDescriptions.Item>
            {currentRequest.attachments && currentRequest.attachments.length > 0 && (
              <ProDescriptions.Item
                label={intl.formatMessage({ id: 'pages.park.service.request.attachments' })}
                span={2}
              >
                <Image.PreviewGroup>
                  <Space wrap size={8}>
                    {currentRequest.attachments.map((url, index) => (
                      <Image
                        key={`${url}-${index}`}
                        src={url}
                        width={80}
                        height={80}
                        style={{ objectFit: 'cover', borderRadius: 4, border: '1px solid #d9d9d9' }}
                        fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                      />
                    ))}
                  </Space>
                </Image.PreviewGroup>
              </ProDescriptions.Item>
            )}
            {currentRequest.statusHistory && currentRequest.statusHistory.length > 0 && (
              <ProDescriptions.Item
                label={intl.formatMessage({ id: 'pages.park.service.request.statusHistory' })}
                span={2}
              >
                <Timeline
                  items={currentRequest.statusHistory.map((h) => {
                    const fromOpt = statusOptions(intl).find((o) => o.value === h.fromStatus);
                    const toOpt = statusOptions(intl).find((o) => o.value === h.toStatus);
                    return {
                      color: toOpt?.color === 'green' ? 'green' : toOpt?.color === 'orange' ? 'orange' : toOpt?.color === 'processing' ? 'blue' : 'gray',
                      children: (
                        <div>
                          <Space size={4}>
                            <Tag color="default">{fromOpt?.label || h.fromStatus || '-'}</Tag>
                            <span>→</span>
                            <Tag color={toOpt?.color || 'default'}>{toOpt?.label || h.toStatus}</Tag>
                          </Space>
                          <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                            {dayjs(h.changedAt).format('YYYY-MM-DD HH:mm')}
                            {h.comment && ` · ${h.comment}`}
                          </div>
                        </div>
                      ),
                    };
                  })}
                />
              </ProDescriptions.Item>
            )}
          </ProDescriptions>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default EnterpriseService;
