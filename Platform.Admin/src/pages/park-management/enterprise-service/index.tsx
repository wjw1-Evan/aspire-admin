import {
  AppstoreOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  SettingOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components/es/card';
import { ProDescriptions } from '@ant-design/pro-components/es/descriptions';
import { ModalForm, ProFormSelect, ProFormText, ProFormTextArea } from '@ant-design/pro-components/es/form';
import { PageContainer } from '@ant-design/pro-components/es/layout';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components/es/table';
import { history, request, useIntl, useSearchParams } from '@umijs/max';
import {
  App,
  Button,
  Col,
  Drawer,
  Flex,
  Form,
  Input,
  Popconfirm,
  Rate,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ApiResponse, PagedResult } from '@/types';

const { Text } = Typography;

interface ServiceRequest {
  id: string;
  categoryId: string;
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
  categoryId: string;
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
      render: (text) => text || <Text type="secondary">-</Text>,
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
              set({ suggestedCategory: { categoryId: record.categoryId, categoryName: record.categoryName || '' } });
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
              set({ suggestedCategory: null });
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
            set({ suggestedCategory: null });
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
          if (currentRequest) {
            const res = await api.updateRequest(currentRequest.id, values);
            if (res.success) {
              message.success(intl.formatMessage({ id: 'pages.park.service.message.updateSuccess' }));
              setModal({ requestVisible: false });
              setCurrentRequest(null);
              set({ suggestedCategory: null });
              actionRef.current?.reload();
              loadData();
            }
            return res.success;
          }
          set({ categorizing: true });
          const suggestion = await api.suggestCategory(values.description || '');
          set({ categorizing: false });
          if (!suggestion.success || !suggestion.data?.categoryId) {
            message.error(intl.formatMessage({ id: 'pages.park.service.message.categorySuggestFailed' }));
            return false;
          }
          set({ suggestedCategory: suggestion.data });
          const res = await api.createRequest({
            ...values,
            categoryId: suggestion.data.categoryId,
          });
          if (res.success) {
            message.success(intl.formatMessage({ id: 'pages.park.service.message.createSuccess' }));
            setModal({ requestVisible: false });
            set({ suggestedCategory: null });
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
        key="update-status"
        title={intl.formatMessage({ id: 'pages.park.service.request.updateStatus' })}
        open={modalState.statusVisible}
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
          </ProDescriptions>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default EnterpriseService;
