import React, { useRef, useState, useCallback, useEffect } from 'react';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { useIntl, useSearchParams, history, request } from '@umijs/max';
import { Form, Input, Select, Button, Modal, App, Space, Row, Col, Tag, Typography, Tabs, Popconfirm, Rate, Switch, List, Avatar, Empty, Flex, Card } from 'antd';
import { Drawer } from 'antd';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import { ModalForm, ProFormText, ProFormSelect, ProFormTextArea } from '@ant-design/pro-form';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, AppstoreOutlined, FormOutlined, CheckCircleOutlined, ClockCircleOutlined, StarOutlined, ReloadOutlined, SettingOutlined, SearchOutlined } from '@ant-design/icons';
import { ProDescriptions } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import { ApiResponse, PagedResult } from '@/types';

const { Text } = Typography;

interface ServiceCategory { id: string; name: string; description?: string; icon?: string; sortOrder: number; isActive: boolean; requestCount: number; }
interface ServiceRequest { id: string; categoryId: string; categoryName?: string; tenantId?: string; tenantName?: string; title: string; description?: string; contactPerson?: string; contactPhone?: string; priority: string; status: string; assignedTo?: string; assignedToName?: string; completedAt?: string; rating?: number; createdAt: string; }
interface ServiceStatistics { totalCategories: number; activeCategories: number; totalRequests: number; pendingRequests: number; processingRequests: number; completedRequests: number; averageRating: number; }
interface ParkTenant { id: string; tenantName: string; contactPerson?: string; phone?: string; }

const api = {
    statistics: () => request<ApiResponse<ServiceStatistics>>('/apiservice/api/park/services/statistics', { method: 'GET' }),
    categories: () => request<ApiResponse<{ categories: ServiceCategory[] }>>('/apiservice/api/park/services/categories', { method: 'GET' }),
    createCategory: (data: Partial<ServiceCategory>) => request<ApiResponse<ServiceCategory>>('/apiservice/api/park/services/categories', { method: 'POST', data }),
    updateCategory: (id: string, data: Partial<ServiceCategory>) => request<ApiResponse<ServiceCategory>>(`/apiservice/api/park/services/categories/${id}`, { method: 'PUT', data }),
    deleteCategory: (id: string) => request<ApiResponse<boolean>>(`/apiservice/api/park/services/categories/${id}`, { method: 'DELETE' }),
    toggleCategory: (id: string) => request<ApiResponse<boolean>>(`/apiservice/api/park/services/categories/${id}/toggle`, { method: 'PUT' }),
    requests: (params: any) => request<ApiResponse<PagedResult<ServiceRequest>>>('/apiservice/api/park/services/requests/list', { params }),
    createRequest: (data: Partial<ServiceRequest>) => request<ApiResponse<ServiceRequest>>('/apiservice/api/park/services/requests', { method: 'POST', data }),
    updateStatus: (id: string, data: { status: string; assignedTo?: string; resolution?: string }) => request<ApiResponse<ServiceRequest>>(`/apiservice/api/park/services/requests/${id}/status`, { method: 'PUT', data }),
    deleteRequest: (id: string) => request<ApiResponse<boolean>>(`/apiservice/api/park/services/requests/${id}`, { method: 'DELETE' }),
    rateRequest: (id: string, data: { rating: number; feedback?: string }) => request<ApiResponse<boolean>>(`/apiservice/api/park/services/requests/${id}/rate`, { method: 'POST', data }),
    tenants: (params: any) => request<ApiResponse<PagedResult<ParkTenant>>>('/apiservice/api/park/tenants/list', { params }),
};

const priorityOptions = (intl: ReturnType<typeof useIntl>) => [
    { label: intl.formatMessage({ id: 'pages.park.service.priority.urgent', defaultMessage: '紧急' }), value: 'Urgent', color: 'red' }, { label: intl.formatMessage({ id: 'pages.park.service.priority.high', defaultMessage: '高' }), value: 'High', color: 'orange' },
    { label: intl.formatMessage({ id: 'pages.park.service.priority.normal', defaultMessage: '普通' }), value: 'Normal', color: 'blue' }, { label: intl.formatMessage({ id: 'pages.park.service.priority.low', defaultMessage: '低' }), value: 'Low', color: 'default' },
];
const statusOptions = (intl: ReturnType<typeof useIntl>) => [
    { label: intl.formatMessage({ id: 'pages.park.service.status.pending', defaultMessage: '待处理' }), value: 'Pending', color: 'orange' }, { label: intl.formatMessage({ id: 'pages.park.service.status.processing', defaultMessage: '处理中' }), value: 'Processing', color: 'processing' },
    { label: intl.formatMessage({ id: 'pages.park.service.status.completed', defaultMessage: '已完成' }), value: 'Completed', color: 'green' }, { label: intl.formatMessage({ id: 'pages.park.service.status.cancelled', defaultMessage: '已取消' }), value: 'Cancelled', color: 'default' },
];

const EnterpriseService: React.FC = () => {
    const intl = useIntl();
    const { message } = App.useApp();
    const actionRef = useRef<ActionType | undefined>(undefined);
    const [searchParams] = useSearchParams();
    const [state, setState] = useState({
        activeTab: 'requests', statistics: null as ServiceStatistics | null, categories: [] as ServiceCategory[],
        tenants: [] as ParkTenant[], sorter: undefined as { sortBy: string; sortOrder: string } | undefined, search: '',
    });
    const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);
    const [modalState, setModalState] = useState({ categoryVisible: false, requestVisible: false, statusVisible: false, ratingVisible: false, detailVisible: false });
    const setModal = (partial: Partial<typeof modalState>) => setModalState(prev => ({ ...prev, ...partial }));
    const [editingState, setEditingState] = useState({ currentCategory: null as ServiceCategory | null, currentRequest: null as ServiceRequest | null });
    const setEditing = (partial: Partial<typeof editingState>) => setEditingState(prev => ({ ...prev, ...partial }));

    const loadData = useCallback(async () => { api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); }, []);
    const loadCategories = useCallback(async () => { api.categories().then(r => { if (r.success && r.data?.categories) set({ categories: r.data.categories }); }); }, []);
    const loadTenants = useCallback(async () => { api.tenants({ page: 1 }).then(r => { if (r.success && r.data) set({ tenants: r.data.queryable }); }); }, []);

    useEffect(() => { loadCategories(); loadTenants(); loadData(); }, [loadCategories, loadTenants, loadData]);
    useEffect(() => { if (state.activeTab === 'requests') actionRef.current?.reload(); }, [state.activeTab]);
    useEffect(() => { const tenantId = searchParams.get('tenantId'); if (tenantId) { setEditing({ currentRequest: null }); setModal({ requestVisible: true }); history.replace('/park-management/enterprise-service'); } }, [searchParams]);

    const columns: ProColumns<ServiceRequest>[] = [
        { title: intl.formatMessage({ id: 'pages.park.service.request.title', defaultMessage: '服务标题' }), dataIndex: 'title', sorter: true, width: 200, render: (_, record) => (<Space><FormOutlined style={{ color: '#1890ff' }} /><a onClick={() => { setEditing({ currentRequest: record }); setModal({ detailVisible: true }); }}>{record.title}</a></Space>) },
        { title: intl.formatMessage({ id: 'pages.park.service.request.category', defaultMessage: '类别' }), dataIndex: 'categoryName', sorter: true, width: 100, render: (text) => <Tag>{text || '-'}</Tag> },
        { title: intl.formatMessage({ id: 'pages.park.service.request.tenant', defaultMessage: '所属租户' }), dataIndex: 'tenantName', sorter: true, width: 150, render: (text) => text || <Text type="secondary">-</Text> },
        { title: intl.formatMessage({ id: 'pages.park.service.request.contact', defaultMessage: '联系人' }), dataIndex: 'contactPerson', sorter: true, width: 120, render: (text, record) => (<Flex vertical gap={0}><Text>{text || '-'}</Text>{record.contactPhone && <Text type="secondary" style={{ fontSize: 12 }}>{record.contactPhone}</Text>}</Flex>) },
        { title: intl.formatMessage({ id: 'pages.park.service.request.priority', defaultMessage: '优先级' }), dataIndex: 'priority', sorter: true, width: 80, render: (priority) => { const opt = priorityOptions(intl).find(o => o.value === priority); return <Tag color={opt?.color || 'default'}>{opt?.label || priority}</Tag>; } },
        { title: intl.formatMessage({ id: 'pages.park.service.request.status', defaultMessage: '状态' }), dataIndex: 'status', sorter: true, width: 100, render: (status) => { const opt = statusOptions(intl).find(o => o.value === status); return <Tag color={opt?.color || 'default'}>{opt?.label || status}</Tag>; } },
        { title: intl.formatMessage({ id: 'pages.park.service.request.rating', defaultMessage: '评分' }), dataIndex: 'rating', sorter: true, width: 120, render: (rating) => rating ? <Rate disabled defaultValue={rating as number} style={{ fontSize: 12 }} /> : '-' },
        { title: intl.formatMessage({ id: 'pages.park.service.request.createdAt', defaultMessage: '创建时间' }), dataIndex: 'createdAt', sorter: true, width: 120, render: (date) => dayjs(date as string).format('YYYY-MM-DD HH:mm') },
        { title: intl.formatMessage({ id: 'common.action', defaultMessage: '操作' }), valueType: 'option', fixed: 'right', width: 180, render: (_, record) => (
            <Space size={4}>
                <Button variant="link" color="cyan" size="small" icon={<EyeOutlined />} onClick={() => { setEditing({ currentRequest: record }); setModal({ detailVisible: true }); }}>{intl.formatMessage({ id: 'common.view', defaultMessage: '查看' })}</Button>
                {record.status !== 'Completed' && record.status !== 'Cancelled' && (<Button type="link" size="small" icon={<SettingOutlined />} onClick={() => { setEditing({ currentRequest: record }); setModal({ statusVisible: true }); }}>{intl.formatMessage({ id: 'pages.park.service.request.updateStatus', defaultMessage: '更新状态' })}</Button>)}
                {record.status === 'Completed' && !record.rating && (<Button type="link" size="small" icon={<StarOutlined />} onClick={() => { setEditing({ currentRequest: record }); setModal({ ratingVisible: true }); }}>{intl.formatMessage({ id: 'pages.park.service.request.rate', defaultMessage: '评价' })}</Button>)}
                <Popconfirm title={intl.formatMessage({ id: 'common.confirmDelete', defaultMessage: '确认删除？' })} onConfirm={async () => { const res = await api.deleteRequest(record.id); if (res.success) { message.success(intl.formatMessage({ id: 'pages.park.service.message.deleteSuccess', defaultMessage: '删除成功' })); actionRef.current?.reload(); loadData(); } }}>
                    <Button type="link" size="small" danger icon={<DeleteOutlined />}>{intl.formatMessage({ id: 'common.delete', defaultMessage: '删除' })}</Button>
                </Popconfirm>
            </Space>
        ) },
    ];

    const handleRefresh = () => { if (state.activeTab === 'requests') actionRef.current?.reload(); else loadCategories(); loadData(); };
    const handleAdd = () => { if (state.activeTab === 'requests') { setEditing({ currentRequest: null }); setModal({ requestVisible: true }); } else { setEditing({ currentCategory: null }); setModal({ categoryVisible: true }); } };

    return (
        <PageContainer>
            <ProCard>
                <Tabs activeKey={state.activeTab} onChange={(key) => set({ activeTab: key })} items={[
                    { key: 'requests', label: <Space><FormOutlined />{intl.formatMessage({ id: 'pages.park.service.tab.requests', defaultMessage: '服务申请' })}</Space>, children: <ProTable actionRef={actionRef} headerTitle={<Space size={24}><Space><AppstoreOutlined />{intl.formatMessage({ id: 'pages.park.service.enterpriseService', defaultMessage: '企业服务' })}</Space><Space size={12}><Tag color="blue">{intl.formatMessage({ id: 'pages.park.service.statistics.categories', defaultMessage: '类别' })} {state.statistics?.totalCategories || 0}</Tag><Tag color="green">{intl.formatMessage({ id: 'pages.park.service.statistics.requests', defaultMessage: '申请' })} {state.statistics?.totalRequests || 0}</Tag><Tag color="orange">{intl.formatMessage({ id: 'pages.park.service.statistics.pending', defaultMessage: '待处理' })} {state.statistics?.pendingRequests || 0}</Tag><Tag color="cyan">{intl.formatMessage({ id: 'pages.park.service.statistics.processing', defaultMessage: '处理中' })} {state.statistics?.processingRequests || 0}</Tag><Tag color="purple">{intl.formatMessage({ id: 'pages.park.service.statistics.satisfaction', defaultMessage: '满意度' })} {state.statistics?.averageRating || 0} ⭐</Tag></Space></Space>} request={async (params: any) => { const { current, pageSize } = params; const sortParams = state.sorter?.sortBy && state.sorter?.sortOrder ? state.sorter : undefined; const res = await api.requests({ page: current, pageSize, search: state.search, ...sortParams }); loadData(); return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success }; }} columns={columns} rowKey="id" search={false} onChange={(_p, _f, s: any) => set({ sorter: s?.order ? { sortBy: s.field, sortOrder: s.order === 'ascend' ? 'asc' : 'desc' } : undefined })} scroll={{ x: 'max-content' }} toolBarRender={() => [
                        <Input.Search
                            key="search"
                            placeholder={intl.formatMessage({ id: 'common.search', defaultMessage: '搜索...' })}
                            allowClear
                            value={state.search}
                            onChange={(e) => set({ search: e.target.value })}
                            onSearch={(value) => { set({ search: value }); actionRef.current?.reload(); }}
                            style={{ width: 260, marginRight: 8 }}
                            prefix={<SearchOutlined />}
                        />,
                        <Button key="refresh" icon={<ReloadOutlined />} onClick={handleRefresh}>{intl.formatMessage({ id: 'common.refresh', defaultMessage: '刷新' })}</Button>,
                        <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing({ currentRequest: null }); setModal({ requestVisible: true }); }}>{intl.formatMessage({ id: 'pages.park.service.request.addRequest', defaultMessage: '新增申请' })}</Button>,
                    ]} /> },
                    { key: 'categories', label: <Space><AppstoreOutlined />{intl.formatMessage({ id: 'pages.park.service.tab.categories', defaultMessage: '服务类别' })}</Space>, children: state.categories.length > 0 ? (<List grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }} dataSource={state.categories} renderItem={(item) => (<List.Item><Card hoverable actions={[<EditOutlined key="edit" onClick={() => { setEditing({ currentCategory: item }); setModal({ categoryVisible: true }); }} />, <Switch key="toggle" checked={item.isActive} size="small" onChange={async () => { const res = await api.toggleCategory(item.id); if (res.success) { message.success(intl.formatMessage({ id: 'pages.park.service.message.statusSwitchSuccess', defaultMessage: '状态切换成功' })); loadCategories(); } }} />, <Popconfirm key="delete" title={intl.formatMessage({ id: 'common.confirmDelete', defaultMessage: '确认删除？' })} onConfirm={async () => { const res = await api.deleteCategory(item.id); if (res.success) { message.success(intl.formatMessage({ id: 'pages.park.service.message.deleteSuccess', defaultMessage: '删除成功' })); loadCategories(); loadData(); } }}><DeleteOutlined style={{ color: '#ff4d4f' }} /></Popconfirm>]}>
                        <Card.Meta avatar={<Avatar style={{ backgroundColor: item.isActive ? '#1890ff' : '#d9d9d9' }} icon={<AppstoreOutlined />} />} title={<Space>{item.name}{!item.isActive && <Tag color="default">{intl.formatMessage({ id: 'pages.park.service.category.disabled', defaultMessage: '已禁用' })}</Tag>}</Space>} description={<><Text type="secondary">{item.description || intl.formatMessage({ id: 'pages.park.service.category.noDescription', defaultMessage: '暂无描述' })}</Text><div style={{ marginTop: 8 }}><Tag color="blue">{intl.formatMessage({ id: 'pages.park.service.category.requestCount', defaultMessage: '申请数' })}: {item.requestCount}</Tag></div></>} />
                    </Card></List.Item>)} />) : <Empty description={intl.formatMessage({ id: 'pages.park.service.category.empty', defaultMessage: '暂无服务类别' })} />, },
                ]} />
            </ProCard>

            <ModalForm key={editingState.currentCategory?.id || 'create-category'} title={editingState.currentCategory ? intl.formatMessage({ id: 'pages.park.service.category.editCategory', defaultMessage: '编辑类别' }) : intl.formatMessage({ id: 'pages.park.service.category.addCategory', defaultMessage: '新增类别' })} open={modalState.categoryVisible} onOpenChange={(open) => { if (!open) setModal({ categoryVisible: false }); }}
                initialValues={editingState.currentCategory ? { name: editingState.currentCategory.name, description: editingState.currentCategory.description, icon: editingState.currentCategory.icon, sortOrder: editingState.currentCategory.sortOrder } : undefined}
                onFinish={async (values) => { const res = editingState.currentCategory ? await api.updateCategory(editingState.currentCategory.id, values) : await api.createCategory(values); if (res.success) { message.success(editingState.currentCategory ? intl.formatMessage({ id: 'pages.park.service.message.updateSuccess', defaultMessage: '更新成功' }) : intl.formatMessage({ id: 'pages.park.service.message.createSuccess', defaultMessage: '创建成功' })); setModal({ categoryVisible: false }); loadCategories(); loadData(); } return res.success; }} autoFocusFirstInput width={480}>
                <ProFormText name="name" label={intl.formatMessage({ id: 'pages.park.service.category.name', defaultMessage: '类别名称' })} placeholder={intl.formatMessage({ id: 'pages.park.service.category.namePlaceholder', defaultMessage: '请输入类别名称' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.park.service.category.nameRequired', defaultMessage: '请输入类别名称' }) }]} />
                <ProFormTextArea name="description" label={intl.formatMessage({ id: 'pages.park.service.category.description', defaultMessage: '描述' })} placeholder={intl.formatMessage({ id: 'pages.park.service.category.descriptionPlaceholder', defaultMessage: '请输入描述' })} />
                <Row gutter={16}><Col span={12}><ProFormText name="icon" label={intl.formatMessage({ id: 'pages.park.service.category.icon', defaultMessage: '图标' })} placeholder={intl.formatMessage({ id: 'pages.park.service.category.iconPlaceholder', defaultMessage: '图标名称' })} /></Col><Col span={12}><ProFormText name="sortOrder" label={intl.formatMessage({ id: 'pages.park.service.category.sortOrder', defaultMessage: '排序' })} placeholder={intl.formatMessage({ id: 'pages.park.service.category.sortOrderPlaceholder', defaultMessage: '排序序号' })} fieldProps={{ type: 'number' }} /></Col></Row>
            </ModalForm>

            <ModalForm key={editingState.currentRequest?.id || 'create-request'} title={intl.formatMessage({ id: 'pages.park.service.request.addRequest', defaultMessage: '新增服务申请' })} open={modalState.requestVisible} onOpenChange={(open) => { if (!open) setModal({ requestVisible: false }); }}
                initialValues={editingState.currentRequest ? { tenantId: editingState.currentRequest.tenantId, categoryId: editingState.currentRequest.categoryId, priority: editingState.currentRequest.priority, title: editingState.currentRequest.title, description: editingState.currentRequest.description, contactPerson: editingState.currentRequest.contactPerson, contactPhone: editingState.currentRequest.contactPhone } : undefined}
                onFinish={async (values) => { const res = await api.createRequest(values); if (res.success) { message.success(intl.formatMessage({ id: 'pages.park.service.message.createSuccess', defaultMessage: '创建成功' })); setModal({ requestVisible: false }); actionRef.current?.reload(); loadData(); } return res.success; }} autoFocusFirstInput width={640}>
                <Row gutter={16}><Col span={12}><ProFormSelect name="tenantId" label={intl.formatMessage({ id: 'pages.park.service.request.tenant', defaultMessage: '所属租户' })} placeholder={intl.formatMessage({ id: 'pages.park.service.request.tenantPlaceholder', defaultMessage: '请选择租户' })} allowClear showSearch options={state.tenants.map(t => ({ label: t.tenantName, value: t.id }))} /></Col><Col span={12}><ProFormSelect name="categoryId" label={intl.formatMessage({ id: 'pages.park.service.request.category', defaultMessage: '服务类别' })} placeholder={intl.formatMessage({ id: 'pages.park.service.request.categoryPlaceholder', defaultMessage: '请选择类别' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.park.service.request.categoryRequired', defaultMessage: '请选择类别' })}]} options={state.categories.filter(c => c.isActive).map(c => ({ label: c.name, value: c.id }))} /></Col></Row>
                <Row gutter={16}><Col span={12}><ProFormSelect name="priority" label={intl.formatMessage({ id: 'pages.park.service.request.priority', defaultMessage: '优先级' })} placeholder={intl.formatMessage({ id: 'pages.park.service.request.priorityPlaceholder', defaultMessage: '请选择' })} options={priorityOptions(intl)} /></Col><Col span={12} /></Row>
                <ProFormText name="title" label={intl.formatMessage({ id: 'pages.park.service.request.titleField', defaultMessage: '标题' })} placeholder={intl.formatMessage({ id: 'pages.park.service.request.titlePlaceholder', defaultMessage: '请输入服务申请标题' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.park.service.request.titleRequired', defaultMessage: '请输入标题' }) }]} />
                <ProFormTextArea name="description" label={intl.formatMessage({ id: 'pages.park.service.request.description', defaultMessage: '详细描述' })} placeholder={intl.formatMessage({ id: 'pages.park.service.request.descriptionPlaceholder', defaultMessage: '请详细描述您的需求' })} />
                <Row gutter={16}><Col span={12}><ProFormText name="contactPerson" label={intl.formatMessage({ id: 'pages.park.service.request.contact', defaultMessage: '联系人' })} placeholder={intl.formatMessage({ id: 'pages.park.service.request.contactPlaceholder', defaultMessage: '联系人' })} /></Col><Col span={12}><ProFormText name="contactPhone" label={intl.formatMessage({ id: 'pages.park.service.request.contactPhone', defaultMessage: '联系电话' })} placeholder={intl.formatMessage({ id: 'pages.park.service.request.contactPhonePlaceholder', defaultMessage: '联系电话' })} /></Col></Row>
            </ModalForm>

            <ModalForm key={editingState.currentRequest?.id || 'update-status'} title={intl.formatMessage({ id: 'pages.park.service.request.updateStatus', defaultMessage: '更新状态' })} open={modalState.statusVisible} onOpenChange={(open) => { if (!open) setModal({ statusVisible: false }); }}
                onFinish={async (values) => { if (editingState.currentRequest) { const res = await api.updateStatus(editingState.currentRequest.id, { status: values.status, assignedTo: values.assignedTo, resolution: values.resolution }); if (res.success) { message.success(intl.formatMessage({ id: 'pages.park.service.message.statusUpdateSuccess', defaultMessage: '状态更新成功' })); setModal({ statusVisible: false }); actionRef.current?.reload(); loadData(); } return res.success; } return false; }} autoFocusFirstInput width={480}>
                <ProFormSelect name="status" label={intl.formatMessage({ id: 'pages.park.service.request.status', defaultMessage: '状态' })} rules={[{ required: true }]} options={statusOptions(intl)} />
                <ProFormText name="assignedTo" label={intl.formatMessage({ id: 'pages.park.service.request.assignedTo', defaultMessage: '处理人' })} placeholder={intl.formatMessage({ id: 'pages.park.service.request.assignedToPlaceholder', defaultMessage: '处理人ID' })} />
                <ProFormTextArea name="resolution" label={intl.formatMessage({ id: 'pages.park.service.request.resolution', defaultMessage: '处理说明' })} placeholder={intl.formatMessage({ id: 'pages.park.service.request.resolutionPlaceholder', defaultMessage: '请输入处理说明' })} />
            </ModalForm>

            <ModalForm key={`rate-${editingState.currentRequest?.id}`} title={intl.formatMessage({ id: 'pages.park.service.request.rate', defaultMessage: '评价服务' })} open={modalState.ratingVisible} onOpenChange={(open) => { if (!open) setModal({ ratingVisible: false }); }}
                onFinish={async (values) => { if (editingState.currentRequest) { const res = await api.rateRequest(editingState.currentRequest.id, { rating: values.rating, feedback: values.feedback }); if (res.success) { message.success(intl.formatMessage({ id: 'pages.park.service.message.rateSuccess', defaultMessage: '评价成功' })); setModal({ ratingVisible: false }); actionRef.current?.reload(); loadData(); } return res.success; } return false; }} autoFocusFirstInput width={480}>
                <Form.Item name="rating" label={intl.formatMessage({ id: 'pages.park.service.request.rating', defaultMessage: '满意度评分' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.park.service.request.ratingRequired', defaultMessage: '请选择评分' }) }]}><Rate /></Form.Item>
                <ProFormTextArea name="feedback" label={intl.formatMessage({ id: 'pages.park.service.request.feedback', defaultMessage: '反馈意见' })} placeholder={intl.formatMessage({ id: 'pages.park.service.request.feedbackPlaceholder', defaultMessage: '请输入您的反馈意见' })} />
            </ModalForm>

            <Drawer title={editingState.currentRequest?.title || intl.formatMessage({ id: 'pages.park.service.request.requestDetail', defaultMessage: '申请详情' })} open={modalState.detailVisible} onClose={() => setModal({ detailVisible: false })} placement="right" size="large">
                {editingState.currentRequest && (<ProDescriptions bordered column={2} size="small">
                    <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.service.request.titleField', defaultMessage: '标题' })} span={2}>{editingState.currentRequest.title}</ProDescriptions.Item>
                    <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.service.request.tenant', defaultMessage: '所属租户' })}>{editingState.currentRequest.tenantName || '-'}</ProDescriptions.Item>
                    <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.service.request.category', defaultMessage: '类别' })}>{editingState.currentRequest.categoryName || '-'}</ProDescriptions.Item>
                    <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.service.request.priority', defaultMessage: '优先级' })}><Tag color={priorityOptions(intl).find(o => o.value === editingState.currentRequest?.priority)?.color}>{priorityOptions(intl).find(o => o.value === editingState.currentRequest?.priority)?.label || editingState.currentRequest?.priority}</Tag></ProDescriptions.Item>
                    <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.service.request.status', defaultMessage: '状态' })}><Tag color={statusOptions(intl).find(o => o.value === editingState.currentRequest?.status)?.color}>{statusOptions(intl).find(o => o.value === editingState.currentRequest?.status)?.label || editingState.currentRequest?.status}</Tag></ProDescriptions.Item>
                    <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.service.request.rating', defaultMessage: '评分' })}>{editingState.currentRequest.rating ? <Rate disabled value={editingState.currentRequest.rating} /> : '-'}</ProDescriptions.Item>
                    <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.service.request.contact', defaultMessage: '联系人' })}>{editingState.currentRequest.contactPerson || '-'}</ProDescriptions.Item>
                    <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.service.request.contactPhone', defaultMessage: '联系电话' })}>{editingState.currentRequest.contactPhone || '-'}</ProDescriptions.Item>
                    <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.service.request.createdAt', defaultMessage: '创建时间' })}>{dayjs(editingState.currentRequest.createdAt).format('YYYY-MM-DD HH:mm')}</ProDescriptions.Item>
                    <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.service.request.completedAt', defaultMessage: '完成时间' })}>{editingState.currentRequest.completedAt ? dayjs(editingState.currentRequest.completedAt).format('YYYY-MM-DD HH:mm') : '-'}</ProDescriptions.Item>
                    <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.service.request.description', defaultMessage: '描述' })} span={2}>{editingState.currentRequest.description || '-'}</ProDescriptions.Item>
                </ProDescriptions>)}
            </Drawer>
        </PageContainer>
    );
};

export default EnterpriseService;
