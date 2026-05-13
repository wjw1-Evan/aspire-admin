import {
  AppstoreOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FormOutlined,
  PlusOutlined,
  ReloadOutlined,
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
  Avatar,
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  Flex,
  Form,
  Input,
  Popconfirm,
  Rate,
  Row,
  Space,
  Switch,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ApiResponse, PagedResult } from '@/types';

const { Text } = Typography;

interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
  requestCount: number;
}
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

const api = {
  statistics: () =>
    request<ApiResponse<ServiceStatistics>>('/apiservice/api/park/services/statistics', { method: 'GET' }),
  categories: () =>
    request<ApiResponse<{ categories: ServiceCategory[] }>>('/apiservice/api/park/services/categories', {
      method: 'GET',
    }),
  createCategory: (data: Partial<ServiceCategory>) =>
    request<ApiResponse<ServiceCategory>>('/apiservice/api/park/services/categories', { method: 'POST', data }),
  updateCategory: (id: string, data: Partial<ServiceCategory>) =>
    request<ApiResponse<ServiceCategory>>(`/apiservice/api/park/services/categories/${id}`, { method: 'PUT', data }),
  deleteCategory: (id: string) =>
    request<ApiResponse<boolean>>(`/apiservice/api/park/services/categories/${id}`, { method: 'DELETE' }),
  toggleCategory: (id: string) =>
    request<ApiResponse<boolean>>(`/apiservice/api/park/services/categories/${id}/toggle`, { method: 'PUT' }),
  requests: (params: any) =>
    request<ApiResponse<PagedResult<ServiceRequest>>>('/apiservice/api/park/services/requests/list', { params }),
  createRequest: (data: Partial<ServiceRequest>) =>
    request<ApiResponse<ServiceRequest>>('/apiservice/api/park/services/requests', { method: 'POST', data }),
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
    activeTab: 'requests',
    statistics: null as ServiceStatistics | null,
    categories: [] as ServiceCategory[],
    tenants: [] as ParkTenant[],
    search: '',
  });
  const set = useCallback((partial: Partial<typeof state>) => setState((prev) => ({ ...prev, ...partial })), []);
  const [modalState, setModalState] = useState({
    categoryVisible: false,
    requestVisible: false,
    statusVisible: false,
    ratingVisible: false,
    detailVisible: false,
  });
  const setModal = (partial: Partial<typeof modalState>) => setModalState((prev) => ({ ...prev, ...partial }));
  const [editingState, setEditingState] = useState({
    currentCategory: null as ServiceCategory | null,
    currentRequest: null as ServiceRequest | null,
  });
  const setEditing = (partial: Partial<typeof editingState>) => setEditingState((prev) => ({ ...prev, ...partial }));

  const loadData = useCallback(async () => {
    api.statistics().then((r) => {
      if (r.success && r.data) set({ statistics: r.data });
    });
  }, [set]);
  const loadCategories = useCallback(async () => {
    api.categories().then((r) => {
      if (r.success && r.data?.categories) set({ categories: r.data.categories });
    });
  }, [set]);
  const loadTenants = useCallback(async () => {
    api.tenants({ page: 1 }).then((r) => {
      if (r.success && r.data) set({ tenants: r.data.queryable });
    });
  }, [set]);

  useEffect(() => {
    loadCategories();
    loadTenants();
    loadData();
  }, [loadCategories, loadTenants, loadData]);
  useEffect(() => {
    if (state.activeTab === 'requests') actionRef.current?.reload();
  }, [state.activeTab]);
  useEffect(() => {
    const tenantId = searchParams.get('tenantId');
    if (tenantId) {
      setEditing({ currentRequest: null });
      setModal({ requestVisible: true });
      history.replace('/park-management/enterprise-service');
    }
  }, [searchParams, setEditing, setModal]);

  const columns: ProColumns<ServiceRequest>[] = [
    {
      title: intl.formatMessage({ id: 'pages.park.service.request.title' }),
      dataIndex: 'title',
      sorter: true,
      width: 200,
      render: (_, record) => (
        <Space>
          <FormOutlined style={{ color: '#1890ff' }} />
          <a
            onClick={() => {
              setEditing({ currentRequest: record });
              setModal({ detailVisible: true });
            }}
          >
            {record.title}
          </a>
        </Space>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.park.service.request.category' }),
      dataIndex: 'categoryName',
      sorter: true,
      width: 100,
      render: (text) => <Tag>{text || '-'}</Tag>,
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
      width: 120,
      render: (text, record) => (
        <Flex vertical gap={0}>
          <Text>{text || '-'}</Text>
          {record.contactPhone && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.contactPhone}
            </Text>
          )}
        </Flex>
      ),
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
      render: (rating) => (rating ? <Rate disabled defaultValue={rating as number} style={{ fontSize: 12 }} /> : '-'),
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
            variant="link"
            color="cyan"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setEditing({ currentRequest: record });
              setModal({ detailVisible: true });
            }}
          >
            {intl.formatMessage({ id: 'common.view' })}
          </Button>
          {record.status !== 'Completed' && record.status !== 'Cancelled' && (
            <Button
              type="link"
              size="small"
              icon={<SettingOutlined />}
              onClick={() => {
                setEditing({ currentRequest: record });
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
                setEditing({ currentRequest: record });
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

  const handleRefresh = () => {
    if (state.activeTab === 'requests') actionRef.current?.reload();
    else loadCategories();
    loadData();
  };
  const _handleAdd = () => {
    if (state.activeTab === 'requests') {
      setEditing({ currentRequest: null });
      setModal({ requestVisible: true });
    } else {
      setEditing({ currentCategory: null });
      setModal({ categoryVisible: true });
    }
  };

  return (
    <PageContainer>
      <ProCard>
        <Tabs
          activeKey={state.activeTab}
          onChange={(key) => set({ activeTab: key })}
          items={[
            {
              key: 'requests',
              label: (
                <Space>
                  <FormOutlined />
                  {intl.formatMessage({ id: 'pages.park.service.tab.requests' })}
                </Space>
              ),
              children: (
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
                    <Button key="refresh" icon={<ReloadOutlined />} onClick={handleRefresh}>
                      {intl.formatMessage({ id: 'common.refresh' })}
                    </Button>,
                    <Button
                      key="add"
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        setEditing({ currentRequest: null });
                        setModal({ requestVisible: true });
                      }}
                    >
                      {intl.formatMessage({ id: 'pages.park.service.request.addRequest' })}
                    </Button>,
                  ]}
                />
              ),
            },
            {
              key: 'categories',
              label: (
                <Space>
                  <AppstoreOutlined />
                  {intl.formatMessage({ id: 'pages.park.service.tab.categories' })}
                </Space>
              ),
              children:
                state.categories.length > 0 ? (
                  <Row gutter={[16, 16]}>
                    {state.categories.map((item) => (
                      <Col key={item.id} xs={24} sm={12} md={8} lg={6}>
                        <Card
                          hoverable
                          actions={[
                            <EditOutlined
                              key="edit"
                              onClick={() => {
                                setEditing({ currentCategory: item });
                                setModal({ categoryVisible: true });
                              }}
                            />,
                            <Switch
                              key="toggle"
                              checked={item.isActive}
                              size="small"
                              onChange={async () => {
                                const res = await api.toggleCategory(item.id);
                                if (res.success) {
                                  message.success(
                                    intl.formatMessage({ id: 'pages.park.service.message.statusSwitchSuccess' }),
                                  );
                                  loadCategories();
                                }
                              }}
                            />,
                            <Popconfirm
                              key="delete"
                              title={intl.formatMessage({ id: 'common.confirmDelete' })}
                              onConfirm={async () => {
                                const res = await api.deleteCategory(item.id);
                                if (res.success) {
                                  message.success(
                                    intl.formatMessage({ id: 'pages.park.service.message.deleteSuccess' }),
                                  );
                                  loadCategories();
                                  loadData();
                                }
                              }}
                            >
                              <DeleteOutlined style={{ color: '#ff4d4f' }} />
                            </Popconfirm>,
                          ]}
                        >
                          <Card.Meta
                            avatar={
                              <Avatar
                                style={{ backgroundColor: item.isActive ? '#1890ff' : '#d9d9d9' }}
                                icon={<AppstoreOutlined />}
                              />
                            }
                            title={
                              <Space>
                                {item.name}
                                {!item.isActive && (
                                  <Tag color="default">
                                    {intl.formatMessage({ id: 'pages.park.service.category.disabled' })}
                                  </Tag>
                                )}
                              </Space>
                            }
                            description={
                              <>
                                <Text type="secondary">
                                  {item.description ||
                                    intl.formatMessage({ id: 'pages.park.service.category.noDescription' })}
                                </Text>
                                <div style={{ marginTop: 8 }}>
                                  <Tag color="blue">
                                    {intl.formatMessage({ id: 'pages.park.service.category.requestCount' })}:{' '}
                                    {item.requestCount}
                                  </Tag>
                                </div>
                              </>
                            }
                          />
                        </Card>
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <Empty description={intl.formatMessage({ id: 'pages.park.service.category.empty' })} />
                ),
            },
          ]}
        />
      </ProCard>

      <ModalForm
        key={editingState.currentCategory?.id || 'create-category'}
        title={
          editingState.currentCategory
            ? intl.formatMessage({ id: 'pages.park.service.category.editCategory' })
            : intl.formatMessage({ id: 'pages.park.service.category.addCategory' })
        }
        open={modalState.categoryVisible}
        onOpenChange={(open) => {
          if (!open) setModal({ categoryVisible: false });
        }}
        initialValues={
          editingState.currentCategory
            ? {
                name: editingState.currentCategory.name,
                description: editingState.currentCategory.description,
                icon: editingState.currentCategory.icon,
                sortOrder: editingState.currentCategory.sortOrder,
              }
            : undefined
        }
        onFinish={async (values) => {
          const res = editingState.currentCategory
            ? await api.updateCategory(editingState.currentCategory.id, values)
            : await api.createCategory(values);
          if (res.success) {
            message.success(
              editingState.currentCategory
                ? intl.formatMessage({ id: 'pages.park.service.message.updateSuccess' })
                : intl.formatMessage({ id: 'pages.park.service.message.createSuccess' }),
            );
            setModal({ categoryVisible: false });
            loadCategories();
            loadData();
          }
          return res.success;
        }}
        autoFocusFirstInput
        width={480}
      >
        <ProFormText
          name="name"
          label={intl.formatMessage({ id: 'pages.park.service.category.name' })}
          placeholder={intl.formatMessage({ id: 'pages.park.service.category.namePlaceholder' })}
          rules={[{ required: true, message: intl.formatMessage({ id: 'pages.park.service.category.nameRequired' }) }]}
        />
        <ProFormTextArea
          name="description"
          label={intl.formatMessage({ id: 'pages.park.service.category.description' })}
          placeholder={intl.formatMessage({ id: 'pages.park.service.category.descriptionPlaceholder' })}
        />
        <Row gutter={16}>
          <Col span={12}>
            <ProFormText
              name="icon"
              label={intl.formatMessage({ id: 'pages.park.service.category.icon' })}
              placeholder={intl.formatMessage({ id: 'pages.park.service.category.iconPlaceholder' })}
            />
          </Col>
          <Col span={12}>
            <ProFormText
              name="sortOrder"
              label={intl.formatMessage({ id: 'pages.park.service.category.sortOrder' })}
              placeholder={intl.formatMessage({ id: 'pages.park.service.category.sortOrderPlaceholder' })}
              fieldProps={{ type: 'number' }}
            />
          </Col>
        </Row>
      </ModalForm>

      <ModalForm
        key={editingState.currentRequest?.id || 'create-request'}
        title={intl.formatMessage({ id: 'pages.park.service.request.addRequest' })}
        open={modalState.requestVisible}
        onOpenChange={(open) => {
          if (!open) setModal({ requestVisible: false });
        }}
        initialValues={
          editingState.currentRequest
            ? {
                tenantId: editingState.currentRequest.tenantId,
                categoryId: editingState.currentRequest.categoryId,
                priority: editingState.currentRequest.priority,
                title: editingState.currentRequest.title,
                description: editingState.currentRequest.description,
                contactPerson: editingState.currentRequest.contactPerson,
                contactPhone: editingState.currentRequest.contactPhone,
              }
            : undefined
        }
        onFinish={async (values) => {
          const res = await api.createRequest(values);
          if (res.success) {
            message.success(intl.formatMessage({ id: 'pages.park.service.message.createSuccess' }));
            setModal({ requestVisible: false });
            actionRef.current?.reload();
            loadData();
          }
          return res.success;
        }}
        autoFocusFirstInput
        width={640}
      >
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
              name="categoryId"
              label={intl.formatMessage({ id: 'pages.park.service.request.category' })}
              placeholder={intl.formatMessage({ id: 'pages.park.service.request.categoryPlaceholder' })}
              rules={[
                { required: true, message: intl.formatMessage({ id: 'pages.park.service.request.categoryRequired' }) },
              ]}
              options={state.categories.filter((c) => c.isActive).map((c) => ({ label: c.name, value: c.id }))}
            />
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <ProFormSelect
              name="priority"
              label={intl.formatMessage({ id: 'pages.park.service.request.priority' })}
              placeholder={intl.formatMessage({ id: 'pages.park.service.request.priorityPlaceholder' })}
              options={priorityOptions(intl)}
            />
          </Col>
          <Col span={12} />
        </Row>
        <ProFormText
          name="title"
          label={intl.formatMessage({ id: 'pages.park.service.request.titleField' })}
          placeholder={intl.formatMessage({ id: 'pages.park.service.request.titlePlaceholder' })}
          rules={[{ required: true, message: intl.formatMessage({ id: 'pages.park.service.request.titleRequired' }) }]}
        />
        <ProFormTextArea
          name="description"
          label={intl.formatMessage({ id: 'pages.park.service.request.description' })}
          placeholder={intl.formatMessage({ id: 'pages.park.service.request.descriptionPlaceholder' })}
        />
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
      </ModalForm>

      <ModalForm
        key={editingState.currentRequest?.id || 'update-status'}
        title={intl.formatMessage({ id: 'pages.park.service.request.updateStatus' })}
        open={modalState.statusVisible}
        onOpenChange={(open) => {
          if (!open) setModal({ statusVisible: false });
        }}
        onFinish={async (values) => {
          if (editingState.currentRequest) {
            const res = await api.updateStatus(editingState.currentRequest.id, {
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
        key={`rate-${editingState.currentRequest?.id}`}
        title={intl.formatMessage({ id: 'pages.park.service.request.rate' })}
        open={modalState.ratingVisible}
        onOpenChange={(open) => {
          if (!open) setModal({ ratingVisible: false });
        }}
        onFinish={async (values) => {
          if (editingState.currentRequest) {
            const res = await api.rateRequest(editingState.currentRequest.id, {
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
          editingState.currentRequest?.title || intl.formatMessage({ id: 'pages.park.service.request.requestDetail' })
        }
        open={modalState.detailVisible}
        onClose={() => setModal({ detailVisible: false })}
        placement="right"
        size="large"
      >
        {editingState.currentRequest && (
          <ProDescriptions bordered column={2} size="small">
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.service.request.titleField' })} span={2}>
              {editingState.currentRequest.title}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.service.request.tenant' })}>
              {editingState.currentRequest.tenantName || '-'}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.service.request.category' })}>
              {editingState.currentRequest.categoryName || '-'}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.service.request.priority' })}>
              <Tag color={priorityOptions(intl).find((o) => o.value === editingState.currentRequest?.priority)?.color}>
                {priorityOptions(intl).find((o) => o.value === editingState.currentRequest?.priority)?.label ||
                  editingState.currentRequest?.priority}
              </Tag>
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.service.request.status' })}>
              <Tag color={statusOptions(intl).find((o) => o.value === editingState.currentRequest?.status)?.color}>
                {statusOptions(intl).find((o) => o.value === editingState.currentRequest?.status)?.label ||
                  editingState.currentRequest?.status}
              </Tag>
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.service.request.rating' })}>
              {editingState.currentRequest.rating ? <Rate disabled value={editingState.currentRequest.rating} /> : '-'}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.service.request.contact' })}>
              {editingState.currentRequest.contactPerson || '-'}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.service.request.contactPhone' })}>
              {editingState.currentRequest.contactPhone || '-'}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.service.request.createdAt' })}>
              {dayjs(editingState.currentRequest.createdAt).format('YYYY-MM-DD HH:mm')}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.service.request.completedAt' })}>
              {editingState.currentRequest.completedAt
                ? dayjs(editingState.currentRequest.completedAt).format('YYYY-MM-DD HH:mm')
                : '-'}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.service.request.description' })} span={2}>
              {editingState.currentRequest.description || '-'}
            </ProDescriptions.Item>
          </ProDescriptions>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default EnterpriseService;
