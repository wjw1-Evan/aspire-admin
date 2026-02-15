import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Card, Form, Input, Select, Button, Modal, App, Space, Row, Col, Tag, Typography, Descriptions, InputNumber, Tabs, Popconfirm, Rate, Switch, Drawer, List, Avatar, Empty, Flex } from 'antd';
import { useIntl, useSearchParams, history } from '@umijs/max';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, AppstoreOutlined, FormOutlined, CheckCircleOutlined, ClockCircleOutlined, StarOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import PageContainer from '@/components/PageContainer';
import { DataTable } from '@/components/DataTable';
import SearchFormCard from '@/components/SearchFormCard';
import StatCard from '@/components/StatCard';
import * as parkService from '@/services/park';
import type { ServiceCategory, ServiceRequest, ServiceStatistics, ParkTenant } from '@/services/park';
import dayjs from 'dayjs';
import styles from './index.less';

const { Text, Title } = Typography;
// Tabs items prop is used instead of TabPane


const EnterpriseService: React.FC = () => {
    const intl = useIntl();
    const requestTableRef = useRef<ActionType>(null);
    const { message } = App.useApp();
    const [categoryForm] = Form.useForm();
    const [requestForm] = Form.useForm();
    const [statusForm] = Form.useForm();
    const [ratingForm] = Form.useForm();
    const [searchForm] = Form.useForm();

    const [activeTab, setActiveTab] = useState<string>('requests');
    const [statistics, setStatistics] = useState<ServiceStatistics | null>(null);
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<ServiceCategory[]>([]);
    const [categoryModalVisible, setCategoryModalVisible] = useState(false);
    const [requestModalVisible, setRequestModalVisible] = useState(false);
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [ratingModalVisible, setRatingModalVisible] = useState(false);
    const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
    const [currentCategory, setCurrentCategory] = useState<ServiceCategory | null>(null);
    const [currentRequest, setCurrentRequest] = useState<ServiceRequest | null>(null);
    const [isEdit, setIsEdit] = useState(false);
    const [tenants, setTenants] = useState<ParkTenant[]>([]);

    const loadStatistics = useCallback(async () => {
        try {
            const res = await parkService.getServiceStatistics();
            if (res.success && res.data) setStatistics(res.data);
        } catch (error) { console.error(error); }
    }, []);

    const loadCategories = useCallback(async () => {
        try {
            const res = await parkService.getServiceCategories();
            if (res.success && res.data?.categories) setCategories(res.data.categories);
        } catch (error) { console.error(error); }
    }, []);

    const loadTenants = useCallback(async () => {
        try {
            const res = await parkService.getTenants({ page: 1, pageSize: 500 });
            if (res.success && res.data?.tenants) setTenants(res.data.tenants);
        } catch (error) { console.error(error); }
    }, []);

    useEffect(() => { loadStatistics(); loadCategories(); loadTenants(); }, [loadStatistics, loadCategories, loadTenants]);

    // Handle URL parameters from tenant list quick action
    const [searchParams] = useSearchParams();
    useEffect(() => {
        const tenantId = searchParams.get('tenantId');
        const tenantName = searchParams.get('tenantName');
        if (tenantId) {
            // Auto-open the request form with tenant pre-selected
            requestForm.setFieldsValue({ tenantId });
            setRequestModalVisible(true);
            // Clear URL params after handling (optional, to prevent re-opening on refresh)
            history.replace('/park-management/enterprise-service');
        }
    }, [searchParams, requestForm]);

    const priorityOptions = [
        { label: '紧急', value: 'Urgent', color: 'red' },
        { label: '高', value: 'High', color: 'orange' },
        { label: '普通', value: 'Normal', color: 'blue' },
        { label: '低', value: 'Low', color: 'default' },
    ];

    const statusOptions = [
        { label: '待处理', value: 'Pending', color: 'orange' },
        { label: '处理中', value: 'Processing', color: 'processing' },
        { label: '已完成', value: 'Completed', color: 'green' },
        { label: '已取消', value: 'Cancelled', color: 'default' },
    ];

    const requestColumns: ProColumns<ServiceRequest>[] = [
        {
            title: intl.formatMessage({ id: 'pages.park.service.request.title', defaultMessage: '服务标题' }),
            dataIndex: 'title',
            width: 200,
            render: (_, record) => (
                <Space>
                    <FormOutlined style={{ color: '#1890ff' }} />
                    <a onClick={() => handleViewRequest(record)}>{record.title}</a>
                </Space>
            ),
        },
        {
            title: intl.formatMessage({ id: 'pages.park.service.request.category', defaultMessage: '类别' }),
            dataIndex: 'categoryName',
            width: 100,
            render: (text) => <Tag>{text || '-'}</Tag>,
        },
        {
            title: intl.formatMessage({ id: 'pages.park.service.request.tenant', defaultMessage: '所属租户' }),
            dataIndex: 'tenantName',
            width: 150,
            render: (text) => text || <Text type="secondary">-</Text>,
        },
        {
            title: intl.formatMessage({ id: 'pages.park.service.request.contact', defaultMessage: '联系人' }),
            dataIndex: 'contactPerson',
            width: 120,
            render: (text, record) => (
                <Flex vertical gap={0}>
                    <Text>{text || '-'}</Text>
                    {record.contactPhone && <Text type="secondary" style={{ fontSize: 12 }}>{record.contactPhone}</Text>}
                </Flex>
            ),
        },
        {
            title: intl.formatMessage({ id: 'pages.park.service.request.priority', defaultMessage: '优先级' }),
            dataIndex: 'priority',
            width: 80,
            render: (priority) => {
                const opt = priorityOptions.find(o => o.value === priority);
                return <Tag color={opt?.color || 'default'}>{opt?.label || priority}</Tag>;
            },
        },
        {
            title: intl.formatMessage({ id: 'pages.park.service.request.status', defaultMessage: '状态' }),
            dataIndex: 'status',
            width: 100,
            render: (status) => {
                const opt = statusOptions.find(o => o.value === status);
                return <Tag color={opt?.color || 'default'}>{opt?.label || status}</Tag>;
            },
        },
        {
            title: intl.formatMessage({ id: 'pages.park.service.request.rating', defaultMessage: '评分' }),
            dataIndex: 'rating',
            width: 120,
            render: (rating) => rating ? <Rate disabled defaultValue={rating as number} style={{ fontSize: 12 }} /> : '-',
        },
        {
            title: intl.formatMessage({ id: 'pages.park.service.request.createdAt', defaultMessage: '创建时间' }),
            dataIndex: 'createdAt',
            width: 120,
            render: (date) => dayjs(date as string).format('YYYY-MM-DD HH:mm'),
        },
        {
            title: intl.formatMessage({ id: 'common.action', defaultMessage: '操作' }),
            valueType: 'option',
            width: 200,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewRequest(record)}>
                        {intl.formatMessage({ id: 'common.view', defaultMessage: '查看' })}
                    </Button>
                    {record.status !== 'Completed' && record.status !== 'Cancelled' && (
                        <Button type="link" size="small" icon={<SettingOutlined />} onClick={() => handleUpdateStatus(record)}>
                            {intl.formatMessage({ id: 'pages.park.service.request.updateStatus', defaultMessage: '更新状态' })}
                        </Button>
                    )}
                    {record.status === 'Completed' && !record.rating && (
                        <Button type="link" size="small" icon={<StarOutlined />} onClick={() => handleRateRequest(record)}>
                            {intl.formatMessage({ id: 'pages.park.service.request.rate', defaultMessage: '评价' })}
                        </Button>
                    )}
                    <Popconfirm title={intl.formatMessage({ id: 'common.confirmDelete', defaultMessage: '确认删除？' })} onConfirm={() => handleDeleteRequest(record.id)}>
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                            {intl.formatMessage({ id: 'common.delete', defaultMessage: '删除' })}
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const fetchRequests = async (params: any) => {
        try {
            const res = await parkService.getServiceRequests({ page: params.current || 1, pageSize: params.pageSize || 10, search: params.search, status: params.status, categoryId: params.categoryId, priority: params.priority });
            if (res.success && res.data) return { data: res.data.requests, total: res.data.total, success: true };
            return { data: [], total: 0, success: false };
        } catch (error) { return { data: [], total: 0, success: false }; }
    };

    const handleViewRequest = (request: ServiceRequest) => { setCurrentRequest(request); setDetailDrawerVisible(true); };
    const handleUpdateStatus = (request: ServiceRequest) => { setCurrentRequest(request); statusForm.setFieldsValue({ status: request.status }); setStatusModalVisible(true); };
    const handleRateRequest = (request: ServiceRequest) => { setCurrentRequest(request); ratingForm.resetFields(); setRatingModalVisible(true); };
    const handleDeleteRequest = async (id: string) => { setLoading(true); try { const res = await parkService.deleteServiceRequest(id); if (res.success) { message.success('删除成功'); requestTableRef.current?.reload(); loadStatistics(); } } catch (e) { message.error('删除失败'); } finally { setLoading(false); } };
    const handleAddRequest = () => { setCurrentRequest(null); setIsEdit(false); requestForm.resetFields(); setRequestModalVisible(true); };

    const handleRequestSubmit = async () => {
        try {
            const values = await requestForm.validateFields(); setLoading(true);
            const res = await parkService.createServiceRequest(values);
            if (res.success) { message.success('创建成功'); setRequestModalVisible(false); requestTableRef.current?.reload(); loadStatistics(); }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleStatusSubmit = async () => {
        try {
            const values = await statusForm.validateFields(); setLoading(true);
            if (currentRequest) {
                const res = await parkService.updateServiceRequestStatus(currentRequest.id, values);
                if (res.success) { message.success('状态更新成功'); setStatusModalVisible(false); requestTableRef.current?.reload(); loadStatistics(); }
            }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleRatingSubmit = async () => {
        try {
            const values = await ratingForm.validateFields(); setLoading(true);
            if (currentRequest) {
                const res = await parkService.rateServiceRequest(currentRequest.id, values);
                if (res.success) { message.success('评价成功'); setRatingModalVisible(false); requestTableRef.current?.reload(); loadStatistics(); }
            }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleAddCategory = () => { setCurrentCategory(null); setIsEdit(false); categoryForm.resetFields(); setCategoryModalVisible(true); };
    const handleEditCategory = (category: ServiceCategory) => { setCurrentCategory(category); setIsEdit(true); categoryForm.setFieldsValue(category); setCategoryModalVisible(true); };
    const handleDeleteCategory = async (id: string) => { setLoading(true); try { const res = await parkService.deleteServiceCategory(id); if (res.success) { message.success('删除成功'); loadCategories(); loadStatistics(); } } catch (e) { message.error('删除失败'); } finally { setLoading(false); } };
    const handleToggleCategory = async (id: string) => { setLoading(true); try { const res = await parkService.toggleServiceCategoryStatus(id); if (res.success) { message.success('状态切换成功'); loadCategories(); } } catch (e) { message.error('操作失败'); } finally { setLoading(false); } };
    const handleCategorySubmit = async () => {
        try {
            const values = await categoryForm.validateFields(); setLoading(true);
            const res = isEdit && currentCategory ? await parkService.updateServiceCategory(currentCategory.id, values) : await parkService.createServiceCategory(values);
            if (res.success) { message.success(isEdit ? '更新成功' : '创建成功'); setCategoryModalVisible(false); loadCategories(); loadStatistics(); }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleSearch = () => { requestTableRef.current?.reload(); };
    const handleReset = () => { searchForm.resetFields(); handleSearch(); };

    const handleRefresh = () => {
        if (activeTab === 'requests') {
            requestTableRef.current?.reload();
        } else {
            loadCategories();
        }
        loadStatistics();
    };

    const handleAdd = () => {
        if (activeTab === 'requests') {
            handleAddRequest();
        } else {
            handleAddCategory();
        }
    };

    return (
        <PageContainer
            title={intl.formatMessage({ id: 'pages.park.service.title', defaultMessage: '企业服务' })}
            extra={
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
                        {intl.formatMessage({ id: 'common.refresh', defaultMessage: '刷新' })}
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                        {activeTab === 'requests'
                            ? intl.formatMessage({ id: 'pages.park.service.addRequest', defaultMessage: '新增申请' })
                            : intl.formatMessage({ id: 'pages.park.service.addCategory', defaultMessage: '新增类别' })}
                    </Button>
                </Space>
            }
        >
            {statistics && (
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} sm={12} md={6}><StatCard title="服务类别" value={statistics.totalCategories} icon={<AppstoreOutlined />} color="#1890ff" suffix={<Text type="secondary" style={{ fontSize: 12 }}>启用: {statistics.activeCategories}</Text>} /></Col>
                    <Col xs={24} sm={12} md={6}><StatCard title="服务申请" value={statistics.totalRequests} icon={<FormOutlined />} color="#52c41a" suffix={<Text type="secondary" style={{ fontSize: 12 }}>待处理: {statistics.pendingRequests}</Text>} /></Col>
                    <Col xs={24} sm={12} md={6}><StatCard title="处理中" value={statistics.processingRequests} icon={<ClockCircleOutlined />} color="#faad14" /></Col>
                    <Col xs={24} sm={12} md={6}><StatCard title="满意度" value={statistics.averageRating ? `${statistics.averageRating} ⭐` : '-'} icon={<StarOutlined />} color="#722ed1" /></Col>
                </Row>
            )}

            <Card>
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={[
                        {
                            key: 'requests',
                            label: (
                                <Space>
                                    <FormOutlined />
                                    服务申请
                                </Space>
                            ),
                            children: (
                                <>
                                    <SearchFormCard>
                                        <Form form={searchForm} layout="inline" onFinish={handleSearch}>
                                            <Form.Item name="search"><Input placeholder="搜索..." style={{ width: 200 }} allowClear /></Form.Item>
                                            <Form.Item name="categoryId"><Select placeholder="类别" style={{ width: 120 }} allowClear options={categories.map(c => ({ label: c.name, value: c.id }))} /></Form.Item>
                                            <Form.Item name="status"><Select placeholder="状态" style={{ width: 100 }} allowClear options={statusOptions} /></Form.Item>
                                            <Form.Item name="priority"><Select placeholder="优先级" style={{ width: 100 }} allowClear options={priorityOptions} /></Form.Item>
                                            <Form.Item><Space><Button type="primary" htmlType="submit">搜索</Button><Button onClick={handleReset} icon={<ReloadOutlined />}>重置</Button></Space></Form.Item>
                                        </Form>
                                    </SearchFormCard>
                                    <DataTable<ServiceRequest> actionRef={requestTableRef} columns={requestColumns as any} request={fetchRequests} rowKey="id" scroll={{ x: 1200 }} search={false} />
                                </>
                            ),
                        },
                        {
                            key: 'categories',
                            label: (
                                <Space>
                                    <AppstoreOutlined />
                                    服务类别
                                </Space>
                            ),
                            children: categories.length > 0 ? (
                                <List
                                    grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
                                    dataSource={categories}
                                    renderItem={(item) => (
                                        <List.Item>
                                            <Card
                                                hoverable
                                                actions={[
                                                    <EditOutlined key="edit" onClick={() => handleEditCategory(item)} />,
                                                    <Switch key="toggle" checked={item.isActive} size="small" onChange={() => handleToggleCategory(item.id)} />,
                                                    <Popconfirm key="delete" title="确认删除？" onConfirm={() => handleDeleteCategory(item.id)}><DeleteOutlined style={{ color: '#ff4d4f' }} /></Popconfirm>,
                                                ]}
                                            >
                                                <Card.Meta
                                                    avatar={<Avatar style={{ backgroundColor: item.isActive ? '#1890ff' : '#d9d9d9' }} icon={<AppstoreOutlined />} />}
                                                    title={<Space>{item.name}{!item.isActive && <Tag color="default">已禁用</Tag>}</Space>}
                                                    description={<><Text type="secondary">{item.description || '暂无描述'}</Text><div style={{ marginTop: 8 }}><Tag color="blue">申请数: {item.requestCount}</Tag></div></>}
                                                />
                                            </Card>
                                        </List.Item>
                                    )}
                                />
                            ) : <Empty description="暂无服务类别" />,
                        },
                    ]}
                />
            </Card>

            <Modal title={isEdit ? '编辑类别' : '新增类别'} open={categoryModalVisible} onOk={handleCategorySubmit} onCancel={() => setCategoryModalVisible(false)} confirmLoading={loading}>
                <Form form={categoryForm} layout="vertical">
                    <Form.Item name="name" label="类别名称" rules={[{ required: true }]}><Input placeholder="请输入类别名称" /></Form.Item>
                    <Form.Item name="description" label="描述"><Input.TextArea rows={2} placeholder="请输入描述" /></Form.Item>
                    <Row gutter={16}><Col span={12}><Form.Item name="icon" label="图标"><Input placeholder="图标名称" /></Form.Item></Col><Col span={12}><Form.Item name="sortOrder" label="排序"><InputNumber min={0} style={{ width: '100%' }} placeholder="排序序号" /></Form.Item></Col></Row>
                </Form>
            </Modal>

            <Modal title="新增服务申请" open={requestModalVisible} onOk={handleRequestSubmit} onCancel={() => setRequestModalVisible(false)} confirmLoading={loading} width={640}>
                <Form form={requestForm} layout="vertical">
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="tenantId" label="所属租户">
                                <Select
                                    placeholder="请选择租户"
                                    allowClear
                                    showSearch
                                    optionFilterProp="label"
                                    options={tenants.map(t => ({ label: t.tenantName, value: t.id }))}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="categoryId" label="服务类别" rules={[{ required: true }]}>
                                <Select placeholder="请选择类别" options={categories.filter(c => c.isActive).map(c => ({ label: c.name, value: c.id }))} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="priority" label="优先级">
                                <Select placeholder="请选择" options={priorityOptions} />
                            </Form.Item>
                        </Col>
                        <Col span={12} />
                    </Row>
                    <Form.Item name="title" label="标题" rules={[{ required: true }]}><Input placeholder="请输入服务申请标题" /></Form.Item>
                    <Form.Item name="description" label="详细描述"><Input.TextArea rows={3} placeholder="请详细描述您的需求" /></Form.Item>
                    <Row gutter={16}><Col span={12}><Form.Item name="contactPerson" label="联系人"><Input placeholder="联系人" /></Form.Item></Col><Col span={12}><Form.Item name="contactPhone" label="联系电话"><Input placeholder="联系电话" /></Form.Item></Col></Row>
                </Form>
            </Modal>

            <Modal title="更新状态" open={statusModalVisible} onOk={handleStatusSubmit} onCancel={() => setStatusModalVisible(false)} confirmLoading={loading}>
                <Form form={statusForm} layout="vertical">
                    <Form.Item name="status" label="状态" rules={[{ required: true }]}><Select options={statusOptions} /></Form.Item>
                    <Form.Item name="assignedTo" label="处理人"><Input placeholder="处理人ID" /></Form.Item>
                    <Form.Item name="resolution" label="处理说明"><Input.TextArea rows={2} placeholder="请输入处理说明" /></Form.Item>
                </Form>
            </Modal>

            <Modal title="评价服务" open={ratingModalVisible} onOk={handleRatingSubmit} onCancel={() => setRatingModalVisible(false)} confirmLoading={loading}>
                <Form form={ratingForm} layout="vertical">
                    <Form.Item name="rating" label="满意度评分" rules={[{ required: true }]}><Rate /></Form.Item>
                    <Form.Item name="feedback" label="反馈意见"><Input.TextArea rows={3} placeholder="请输入您的反馈意见" /></Form.Item>
                </Form>
            </Modal>

            <Drawer title={currentRequest?.title || '申请详情'} open={detailDrawerVisible} onClose={() => setDetailDrawerVisible(false)} size={640}>
                {currentRequest && (
                    <Descriptions bordered column={2} size="small">
                        <Descriptions.Item label="服务标题" span={2}>{currentRequest.title}</Descriptions.Item>
                        <Descriptions.Item label="所属租户">{currentRequest.tenantName || '-'}</Descriptions.Item>
                        <Descriptions.Item label="类别">{currentRequest.categoryName || '-'}</Descriptions.Item>
                        <Descriptions.Item label="优先级"><Tag color={priorityOptions.find(o => o.value === currentRequest.priority)?.color}>{priorityOptions.find(o => o.value === currentRequest.priority)?.label || currentRequest.priority}</Tag></Descriptions.Item>
                        <Descriptions.Item label="状态"><Tag color={statusOptions.find(o => o.value === currentRequest.status)?.color}>{statusOptions.find(o => o.value === currentRequest.status)?.label || currentRequest.status}</Tag></Descriptions.Item>
                        <Descriptions.Item label="评分">{currentRequest.rating ? <Rate disabled value={currentRequest.rating} /> : '-'}</Descriptions.Item>
                        <Descriptions.Item label="联系人">{currentRequest.contactPerson || '-'}</Descriptions.Item>
                        <Descriptions.Item label="联系电话">{currentRequest.contactPhone || '-'}</Descriptions.Item>
                        <Descriptions.Item label="创建时间">{dayjs(currentRequest.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
                        <Descriptions.Item label="完成时间">{currentRequest.completedAt ? dayjs(currentRequest.completedAt).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
                        <Descriptions.Item label="描述" span={2}>{currentRequest.description || '-'}</Descriptions.Item>
                    </Descriptions>
                )}
            </Drawer>
        </PageContainer>
    );
};

export default EnterpriseService;
