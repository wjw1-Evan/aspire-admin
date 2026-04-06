import React, { useRef, useState, useCallback, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { StatCard } from '@/components';
import { useIntl, useSearchParams, history, request } from '@umijs/max';
import { Card, Form, Input, Select, Button, Modal, App, Space, Row, Col, Tag, Typography, Descriptions, Tabs, Popconfirm, Rate, Switch, Drawer, List, Avatar, Empty, Flex } from 'antd';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import { ModalForm, ProFormText, ProFormSelect, ProFormTextArea } from '@ant-design/pro-form';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, AppstoreOutlined, FormOutlined, CheckCircleOutlined, ClockCircleOutlined, StarOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ApiResponse, PagedResult, PageParams } from '@/types';

const { Text } = Typography;

interface ServiceCategory { id: string; name: string; description?: string; icon?: string; sortOrder: number; isActive: boolean; requestCount: number; }
interface ServiceRequest { id: string; categoryId: string; categoryName?: string; tenantId?: string; tenantName?: string; title: string; description?: string; contactPerson?: string; contactPhone?: string; priority: string; status: string; assignedTo?: string; assignedToName?: string; completedAt?: string; rating?: number; createdAt: string; }
interface ServiceStatistics { totalCategories: number; activeCategories: number; totalRequests: number; pendingRequests: number; processingRequests: number; completedRequests: number; averageRating: number; }
interface ParkTenant { id: string; tenantName: string; contactPerson?: string; phone?: string; }

const api = {
    statistics: () => request<ApiResponse<ServiceStatistics>>('/api/park/services/statistics', { method: 'GET' }),
    categories: () => request<ApiResponse<{ categories: ServiceCategory[] }>>('/api/park/services/categories', { method: 'GET' }),
    createCategory: (data: Partial<ServiceCategory>) => request<ApiResponse<ServiceCategory>>('/api/park/services/categories', { method: 'POST', data }),
    updateCategory: (id: string, data: Partial<ServiceCategory>) => request<ApiResponse<ServiceCategory>>(`/api/park/services/categories/${id}`, { method: 'PUT', data }),
    deleteCategory: (id: string) => request<ApiResponse<boolean>>(`/api/park/services/categories/${id}`, { method: 'DELETE' }),
    toggleCategory: (id: string) => request<ApiResponse<boolean>>(`/api/park/services/categories/${id}/toggle`, { method: 'PUT' }),
    requests: (params: PageParams) => request<ApiResponse<PagedResult<ServiceRequest>>>('/api/park/services/requests/list', { method: 'POST', data: params }),
    createRequest: (data: Partial<ServiceRequest>) => request<ApiResponse<ServiceRequest>>('/api/park/services/requests', { method: 'POST', data }),
    updateStatus: (id: string, data: { status: string; assignedTo?: string; resolution?: string }) => request<ApiResponse<ServiceRequest>>(`/api/park/services/requests/${id}/status`, { method: 'PUT', data }),
    deleteRequest: (id: string) => request<ApiResponse<boolean>>(`/api/park/services/requests/${id}`, { method: 'DELETE' }),
    rateRequest: (id: string, data: { rating: number; feedback?: string }) => request<ApiResponse<boolean>>(`/api/park/services/requests/${id}/rate`, { method: 'POST', data }),
    tenants: (params: PageParams) => request<ApiResponse<PagedResult<ParkTenant>>>('/api/park/tenants/list', { method: 'POST', data: params }),
};

const priorityOptions = [
    { label: '紧急', value: 'Urgent', color: 'red' }, { label: '高', value: 'High', color: 'orange' },
    { label: '普通', value: 'Normal', color: 'blue' }, { label: '低', value: 'Low', color: 'default' },
];
const statusOptions = [
    { label: '待处理', value: 'Pending', color: 'orange' }, { label: '处理中', value: 'Processing', color: 'processing' },
    { label: '已完成', value: 'Completed', color: 'green' }, { label: '已取消', value: 'Cancelled', color: 'default' },
];

const EnterpriseService: React.FC = () => {
    const intl = useIntl();
    const { message } = App.useApp();
    const actionRef = useRef<ActionType | undefined>(undefined);
    const [searchParams] = useSearchParams();
    const [state, setState] = useState({
        activeTab: 'requests', statistics: null as ServiceStatistics | null, categories: [] as ServiceCategory[],
        tenants: [] as ParkTenant[], sorter: undefined as { sortBy: string; sortOrder: string } | undefined, searchText: '',
    });
    const set = (partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial }));
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
        { title: intl.formatMessage({ id: 'pages.park.service.request.priority', defaultMessage: '优先级' }), dataIndex: 'priority', sorter: true, width: 80, render: (priority) => { const opt = priorityOptions.find(o => o.value === priority); return <Tag color={opt?.color || 'default'}>{opt?.label || priority}</Tag>; } },
        { title: intl.formatMessage({ id: 'pages.park.service.request.status', defaultMessage: '状态' }), dataIndex: 'status', sorter: true, width: 100, render: (status) => { const opt = statusOptions.find(o => o.value === status); return <Tag color={opt?.color || 'default'}>{opt?.label || status}</Tag>; } },
        { title: intl.formatMessage({ id: 'pages.park.service.request.rating', defaultMessage: '评分' }), dataIndex: 'rating', sorter: true, width: 120, render: (rating) => rating ? <Rate disabled defaultValue={rating as number} style={{ fontSize: 12 }} /> : '-' },
        { title: intl.formatMessage({ id: 'pages.park.service.request.createdAt', defaultMessage: '创建时间' }), dataIndex: 'createdAt', sorter: true, width: 120, render: (date) => dayjs(date as string).format('YYYY-MM-DD HH:mm') },
        { title: intl.formatMessage({ id: 'common.action', defaultMessage: '操作' }), valueType: 'option', width: 200, fixed: 'right', render: (_, record) => (<Space>
            <Button type="link" icon={<EyeOutlined />} onClick={() => { setEditing({ currentRequest: record }); setModal({ detailVisible: true }); }}>{intl.formatMessage({ id: 'common.view', defaultMessage: '查看' })}</Button>
            {record.status !== 'Completed' && record.status !== 'Cancelled' && (<Button type="link" icon={<SettingOutlined />} onClick={() => { setEditing({ currentRequest: record }); setModal({ statusVisible: true }); }}>{intl.formatMessage({ id: 'pages.park.service.request.updateStatus', defaultMessage: '更新状态' })}</Button>)}
            {record.status === 'Completed' && !record.rating && (<Button type="link" icon={<StarOutlined />} onClick={() => { setEditing({ currentRequest: record }); setModal({ ratingVisible: true }); }}>{intl.formatMessage({ id: 'pages.park.service.request.rate', defaultMessage: '评价' })}</Button>)}
            <Popconfirm title={intl.formatMessage({ id: 'common.confirmDelete', defaultMessage: '确认删除？' })} onConfirm={async () => { const res = await api.deleteRequest(record.id); if (res.success) { message.success('删除成功'); actionRef.current?.reload(); loadData(); } }}><Button type="link" danger icon={<DeleteOutlined />}>{intl.formatMessage({ id: 'common.delete', defaultMessage: '删除' })}</Button></Popconfirm>
        </Space>) },
    ];

    const handleRefresh = () => { if (state.activeTab === 'requests') actionRef.current?.reload(); else loadCategories(); loadData(); };
    const handleAdd = () => { if (state.activeTab === 'requests') { setEditing({ currentRequest: null }); setModal({ requestVisible: true }); } else { setEditing({ currentCategory: null }); setModal({ categoryVisible: true }); } };

    return (
        <PageContainer title={intl.formatMessage({ id: 'pages.park.service.title', defaultMessage: '企业服务' })} extra={
            <Space>
                <Button icon={<ReloadOutlined />} onClick={handleRefresh}>{intl.formatMessage({ id: 'common.refresh', defaultMessage: '刷新' })}</Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>{state.activeTab === 'requests' ? intl.formatMessage({ id: 'pages.park.service.addRequest', defaultMessage: '新增申请' }) : intl.formatMessage({ id: 'pages.park.service.addCategory', defaultMessage: '新增类别' })}</Button>
            </Space>
        }>
            {state.statistics && (<Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={12} md={6}><StatCard title="服务类别" value={state.statistics.totalCategories} icon={<AppstoreOutlined />} color="#1890ff" suffix={<Text type="secondary" style={{ fontSize: 12 }}>启用: {state.statistics.activeCategories}</Text>} /></Col>
                <Col xs={24} sm={12} md={6}><StatCard title="服务申请" value={state.statistics.totalRequests} icon={<FormOutlined />} color="#52c41a" suffix={<Text type="secondary" style={{ fontSize: 12 }}>待处理: {state.statistics.pendingRequests}</Text>} /></Col>
                <Col xs={24} sm={12} md={6}><StatCard title="处理中" value={state.statistics.processingRequests} icon={<ClockCircleOutlined />} color="#faad14" /></Col>
                <Col xs={24} sm={12} md={6}><StatCard title="满意度" value={state.statistics.averageRating ? `${state.statistics.averageRating} ⭐` : '-'} icon={<StarOutlined />} color="#722ed1" /></Col>
            </Row>)}

            <Card>
                <Tabs activeKey={state.activeTab} onChange={(key) => set({ activeTab: key })} items={[
                    { key: 'requests', label: <Space><FormOutlined />服务申请</Space>, children: <ProTable actionRef={actionRef} request={async (params: any) => { const { current, pageSize } = params; const sortParams = state.sorter?.sortBy && state.sorter?.sortOrder ? state.sorter : undefined; const res = await api.requests({ page: current, pageSize, search: state.searchText, ...sortParams }); loadData(); return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success }; }} columns={columns} rowKey="id" search={false} onChange={(_p, _f, s: any) => set({ sorter: s?.order ? { sortBy: s.field, sortOrder: s.order === 'ascend' ? 'asc' : 'desc' } : undefined })} toolBarRender={() => [<Input key="search" placeholder="搜索..." style={{ width: 200 }} allowClear />]} scroll={{ x: 1200 }} /> },
                    { key: 'categories', label: <Space><AppstoreOutlined />服务类别</Space>, children: state.categories.length > 0 ? (<List grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }} dataSource={state.categories} renderItem={(item) => (<List.Item><Card hoverable actions={[<EditOutlined key="edit" onClick={() => { setEditing({ currentCategory: item }); setModal({ categoryVisible: true }); }} />, <Switch key="toggle" checked={item.isActive} size="small" onChange={async () => { const res = await api.toggleCategory(item.id); if (res.success) { message.success('状态切换成功'); loadCategories(); } }} />, <Popconfirm key="delete" title="确认删除？" onConfirm={async () => { const res = await api.deleteCategory(item.id); if (res.success) { message.success('删除成功'); loadCategories(); loadData(); } }}><DeleteOutlined style={{ color: '#ff4d4f' }} /></Popconfirm>]}>
                        <Card.Meta avatar={<Avatar style={{ backgroundColor: item.isActive ? '#1890ff' : '#d9d9d9' }} icon={<AppstoreOutlined />} />} title={<Space>{item.name}{!item.isActive && <Tag color="default">已禁用</Tag>}</Space>} description={<><Text type="secondary">{item.description || '暂无描述'}</Text><div style={{ marginTop: 8 }}><Tag color="blue">申请数: {item.requestCount}</Tag></div></>} />
                    </Card></List.Item>)} />) : <Empty description="暂无服务类别" />, },
                ]} />
            </Card>

            <ModalForm key={editingState.currentCategory?.id || 'create-category'} title={editingState.currentCategory ? '编辑类别' : '新增类别'} open={modalState.categoryVisible} onOpenChange={(open) => { if (!open) setModal({ categoryVisible: false }); }}
                initialValues={editingState.currentCategory ? { name: editingState.currentCategory.name, description: editingState.currentCategory.description, icon: editingState.currentCategory.icon, sortOrder: editingState.currentCategory.sortOrder } : undefined}
                onFinish={async (values) => { const res = editingState.currentCategory ? await api.updateCategory(editingState.currentCategory.id, values) : await api.createCategory(values); if (res.success) { message.success(editingState.currentCategory ? '更新成功' : '创建成功'); setModal({ categoryVisible: false }); loadCategories(); loadData(); } return res.success; }} autoFocusFirstInput width={480}>
                <ProFormText name="name" label="类别名称" placeholder="请输入类别名称" rules={[{ required: true, message: '请输入类别名称' }]} />
                <ProFormTextArea name="description" label="描述" placeholder="请输入描述" />
                <Row gutter={16}><Col span={12}><ProFormText name="icon" label="图标" placeholder="图标名称" /></Col><Col span={12}><ProFormText name="sortOrder" label="排序" placeholder="排序序号" fieldProps={{ type: 'number' }} /></Col></Row>
            </ModalForm>

            <ModalForm key={editingState.currentRequest?.id || 'create-request'} title="新增服务申请" open={modalState.requestVisible} onOpenChange={(open) => { if (!open) setModal({ requestVisible: false }); }}
                initialValues={editingState.currentRequest ? { tenantId: editingState.currentRequest.tenantId, categoryId: editingState.currentRequest.categoryId, priority: editingState.currentRequest.priority, title: editingState.currentRequest.title, description: editingState.currentRequest.description, contactPerson: editingState.currentRequest.contactPerson, contactPhone: editingState.currentRequest.contactPhone } : undefined}
                onFinish={async (values) => { const res = await api.createRequest(values); if (res.success) { message.success('创建成功'); setModal({ requestVisible: false }); actionRef.current?.reload(); loadData(); } return res.success; }} autoFocusFirstInput width={640}>
                <Row gutter={16}><Col span={12}><ProFormSelect name="tenantId" label="所属租户" placeholder="请选择租户" allowClear showSearch options={state.tenants.map(t => ({ label: t.tenantName, value: t.id }))} /></Col><Col span={12}><ProFormSelect name="categoryId" label="服务类别" placeholder="请选择类别" rules={[{ required: true, message: '请选择类别' }]} options={state.categories.filter(c => c.isActive).map(c => ({ label: c.name, value: c.id }))} /></Col></Row>
                <Row gutter={16}><Col span={12}><ProFormSelect name="priority" label="优先级" placeholder="请选择" options={priorityOptions} /></Col><Col span={12} /></Row>
                <ProFormText name="title" label="标题" placeholder="请输入服务申请标题" rules={[{ required: true, message: '请输入标题' }]} />
                <ProFormTextArea name="description" label="详细描述" placeholder="请详细描述您的需求" />
                <Row gutter={16}><Col span={12}><ProFormText name="contactPerson" label="联系人" placeholder="联系人" /></Col><Col span={12}><ProFormText name="contactPhone" label="联系电话" placeholder="联系电话" /></Col></Row>
            </ModalForm>

            <ModalForm key={editingState.currentRequest?.id || 'update-status'} title="更新状态" open={modalState.statusVisible} onOpenChange={(open) => { if (!open) setModal({ statusVisible: false }); }}
                onFinish={async (values) => { if (editingState.currentRequest) { const res = await api.updateStatus(editingState.currentRequest.id, { status: values.status, assignedTo: values.assignedTo, resolution: values.resolution }); if (res.success) { message.success('状态更新成功'); setModal({ statusVisible: false }); actionRef.current?.reload(); loadData(); } return res.success; } return false; }} autoFocusFirstInput width={480}>
                <ProFormSelect name="status" label="状态" rules={[{ required: true }]} options={statusOptions} />
                <ProFormText name="assignedTo" label="处理人" placeholder="处理人ID" />
                <ProFormTextArea name="resolution" label="处理说明" placeholder="请输入处理说明" />
            </ModalForm>

            <ModalForm key={`rate-${editingState.currentRequest?.id}`} title="评价服务" open={modalState.ratingVisible} onOpenChange={(open) => { if (!open) setModal({ ratingVisible: false }); }}
                onFinish={async (values) => { if (editingState.currentRequest) { const res = await api.rateRequest(editingState.currentRequest.id, { rating: values.rating, feedback: values.feedback }); if (res.success) { message.success('评价成功'); setModal({ ratingVisible: false }); actionRef.current?.reload(); loadData(); } return res.success; } return false; }} autoFocusFirstInput width={480}>
                <Form.Item name="rating" label="满意度评分" rules={[{ required: true, message: '请选择评分' }]}><Rate /></Form.Item>
                <ProFormTextArea name="feedback" label="反馈意见" placeholder="请输入您的反馈意见" />
            </ModalForm>

            <Drawer title={editingState.currentRequest?.title || '申请详情'} open={modalState.detailVisible} onClose={() => setModal({ detailVisible: false })} size={640}>
                {editingState.currentRequest && (<Descriptions bordered column={2} size="small">
                    <Descriptions.Item label="服务标题" span={2}>{editingState.currentRequest.title}</Descriptions.Item>
                    <Descriptions.Item label="所属租户">{editingState.currentRequest.tenantName || '-'}</Descriptions.Item>
                    <Descriptions.Item label="类别">{editingState.currentRequest.categoryName || '-'}</Descriptions.Item>
                    <Descriptions.Item label="优先级"><Tag color={priorityOptions.find(o => o.value === editingState.currentRequest?.priority)?.color}>{priorityOptions.find(o => o.value === editingState.currentRequest?.priority)?.label || editingState.currentRequest?.priority}</Tag></Descriptions.Item>
                    <Descriptions.Item label="状态"><Tag color={statusOptions.find(o => o.value === editingState.currentRequest?.status)?.color}>{statusOptions.find(o => o.value === editingState.currentRequest?.status)?.label || editingState.currentRequest?.status}</Tag></Descriptions.Item>
                    <Descriptions.Item label="评分">{editingState.currentRequest.rating ? <Rate disabled value={editingState.currentRequest.rating} /> : '-'}</Descriptions.Item>
                    <Descriptions.Item label="联系人">{editingState.currentRequest.contactPerson || '-'}</Descriptions.Item>
                    <Descriptions.Item label="联系电话">{editingState.currentRequest.contactPhone || '-'}</Descriptions.Item>
                    <Descriptions.Item label="创建时间">{dayjs(editingState.currentRequest.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
                    <Descriptions.Item label="完成时间">{editingState.currentRequest.completedAt ? dayjs(editingState.currentRequest.completedAt).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
                    <Descriptions.Item label="描述" span={2}>{editingState.currentRequest.description || '-'}</Descriptions.Item>
                </Descriptions>)}
            </Drawer>
        </PageContainer>
    );
};

export default EnterpriseService;
