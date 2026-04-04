import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Card, Form, Input, Select, Button, Modal, App, Space, Row, Col, Tag, Typography, Descriptions, DatePicker, Drawer, List, Badge, Flex, Table, Empty, Rate, Popconfirm } from 'antd';
import { useIntl, history } from '@umijs/max';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, UserOutlined, PhoneOutlined, WarningOutlined, ReloadOutlined, CalendarOutlined, CustomerServiceOutlined, FileTextOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import PageContainer from '@/components/PageContainer';
import SearchBar from '@/components/SearchBar';
import StatCard from '@/components/StatCard';
import * as parkService from '@/services/park';
import type { ParkTenant, LeaseContract, TenantStatistics, ServiceRequest, LeasePaymentRecord } from '@/services/park';
import type { PageParams } from '@/types/page-params';
import dayjs from 'dayjs';

const { Text } = Typography;

const TenantManagement: React.FC = () => {
    const intl = useIntl();
    const { message } = App.useApp();
    const [tenantForm] = Form.useForm();
    const searchParamsRef = useRef<PageParams>({ page: 1, pageSize: 10, search: '' });

    const [statistics, setStatistics] = useState<TenantStatistics | null>(null);
    const [loading, setLoading] = useState(false);
    const [tenantModalVisible, setTenantModalVisible] = useState(false);
    const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
    const [currentTenant, setCurrentTenant] = useState<ParkTenant | null>(null);
    const [isEdit, setIsEdit] = useState(false);
    const [tenantServiceRequests, setTenantServiceRequests] = useState<ServiceRequest[]>([]);
    const [tenantPayments, setTenantPayments] = useState<(LeasePaymentRecord & { contractNumber?: string })[]>([]);
    const [tenantContracts, setTenantContracts] = useState<LeaseContract[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);

    const [tenantsData, setTenantsData] = useState<ParkTenant[]>([]);
    const [tenantsLoading, setTenantsLoading] = useState(false);
    const [tenantsPagination, setTenantsPagination] = useState({ page: 1, pageSize: 10, total: 0 });

    const loadStatistics = useCallback(async () => {
        try {
            const res = await parkService.getTenantStatistics();
            if (res.success && res.data) {
                setStatistics(res.data);
            }
        } catch (error) {
            console.error('Failed to load statistics:', error);
        }
    }, []);

    useEffect(() => {
        loadStatistics();
    }, [loadStatistics]);

    const fetchTenants = useCallback(async () => {
        const currentParams = searchParamsRef.current;
        setTenantsLoading(true);
        try {
            const res = await parkService.getTenants({
                page: currentParams.page ?? 1,
                pageSize: currentParams.pageSize ?? 10,
                search: currentParams.search,
            });
            if (res.success && res.data) {
                const paged = res.data;
                setTenantsData(paged.queryable ?? []);
                setTenantsPagination(prev => ({ ...prev, total: paged.rowCount ?? 0 }));
            } else {
                setTenantsData([]);
                setTenantsPagination(prev => ({ ...prev, total: 0 }));
            }
        } catch {
            setTenantsData([]);
            setTenantsPagination(prev => ({ ...prev, total: 0 }));
        } finally {
            setTenantsLoading(false);
        }
    }, []);

    const handleTenantsTableChange = useCallback((pag: any, _filters: any, sorter: any) => {
        searchParamsRef.current = {
            ...searchParamsRef.current,
            page: pag.current,
            pageSize: pag.pageSize,
            sortBy: sorter?.field,
            sortOrder: sorter?.order === 'ascend' ? 'asc' : sorter?.order === 'descend' ? 'desc' : undefined,
        };
        fetchTenants();
    }, [fetchTenants]);

    useEffect(() => {
        fetchTenants();
    }, [fetchTenants]);

    const tenantStatusOptions = [
        { label: intl.formatMessage({ id: 'pages.park.tenant.status.active', defaultMessage: '活跃' }), value: 'Active', color: 'green' },
        { label: intl.formatMessage({ id: 'pages.park.tenant.status.expiring', defaultMessage: '即将到期' }), value: 'Expiring', color: 'orange' },
        { label: intl.formatMessage({ id: 'pages.park.tenant.status.moved', defaultMessage: '已退租' }), value: 'Moved', color: 'default' },
    ];

    const contractStatusOptions = [
        { label: intl.formatMessage({ id: 'pages.park.contract.status.active', defaultMessage: '有效' }), value: 'Active', color: 'green' },
        { label: intl.formatMessage({ id: 'pages.park.contract.status.pending', defaultMessage: '待生效' }), value: 'Pending', color: 'blue' },
        { label: intl.formatMessage({ id: 'pages.park.contract.status.expired', defaultMessage: '已到期' }), value: 'Expired', color: 'default' },
        { label: intl.formatMessage({ id: 'pages.park.contract.status.renewed', defaultMessage: '已续签' }), value: 'Renewed', color: 'cyan' },
        { label: intl.formatMessage({ id: 'pages.park.contract.status.terminated', defaultMessage: '已终止' }), value: 'Terminated', color: 'red' },
    ];

    const tenantColumns: ProColumns<ParkTenant>[] = [
        {
            title: intl.formatMessage({ id: 'pages.park.tenant.name', defaultMessage: '租户名称' }),
            dataIndex: 'tenantName',
            sorter: true,
            width: 180,
            render: (_, record) => (
                <Space>
                    <UserOutlined style={{ color: '#1890ff' }} />
                    <a onClick={() => handleViewTenant(record)}>{record.tenantName}</a>
                </Space>
            ),
        },
        {
            title: intl.formatMessage({ id: 'pages.park.tenant.contact', defaultMessage: '联系人' }),
            dataIndex: 'contactPerson',
            sorter: true,
            width: 120,
            render: (text, record) => (
                <Flex vertical gap={0}>
                    <Text>{text || '-'}</Text>
                    {record.phone && <Text type="secondary" style={{ fontSize: 12 }}>{record.phone}</Text>}
                </Flex>
            ),
        },
        {
            title: intl.formatMessage({ id: 'pages.park.tenant.industry', defaultMessage: '行业' }),
            dataIndex: 'industry',
            sorter: true,
            width: 100,
            render: (text) => text || '-',
        },
        {
            title: intl.formatMessage({ id: 'pages.park.tenant.entryDate', defaultMessage: '入驻日期' }),
            dataIndex: 'entryDate',
            sorter: true,
            width: 110,
            render: (date) => date ? dayjs(date as string).format('YYYY-MM-DD') : '-',
        },
        {
            title: intl.formatMessage({ id: 'pages.park.tenant.units', defaultMessage: '租用单元' }),
            dataIndex: 'unitCount',
            sorter: true,
            width: 80,
            align: 'center',
        },
        {
            title: intl.formatMessage({ id: 'pages.park.tenant.contracts', defaultMessage: '有效合同' }),
            dataIndex: 'activeContracts',
            sorter: true,
            width: 80,
            align: 'center',
            render: (count) => {
                const c = (count as number) || 0;
                return <Badge count={c} style={{ backgroundColor: c > 0 ? '#52c41a' : '#d9d9d9' }} />;
            },
        },
        {
            title: intl.formatMessage({ id: 'pages.park.tenant.status', defaultMessage: '状态' }),
            dataIndex: 'status',
            sorter: true,
            width: 100,
            render: (status) => {
                const opt = tenantStatusOptions.find(o => o.value === status);
                return <Tag color={opt?.color || 'default'}>{opt?.label || status}</Tag>;
            },
        },
        {
            title: intl.formatMessage({ id: 'common.action', defaultMessage: '操作' }),
            valueType: 'option',
            width: 220,
            fixed: 'right',
            render: (_, record) => (
                <Space>
                    <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewTenant(record)}>
                        {intl.formatMessage({ id: 'common.view', defaultMessage: '详情' })}
                    </Button>
                    <Button type="link" icon={<CustomerServiceOutlined />} onClick={() => history.push(`/park-management/enterprise-service?tenantId=${record.id}&tenantName=${encodeURIComponent(record.tenantName)}`)}>
                        {intl.formatMessage({ id: 'pages.park.tenant.serviceRequest', defaultMessage: '服务' })}
                    </Button>
                    <Button type="link" icon={<EditOutlined />} onClick={() => handleEditTenant(record)}>
                        {intl.formatMessage({ id: 'common.edit', defaultMessage: '编辑' })}
                    </Button>
                    <Popconfirm title={intl.formatMessage({ id: 'common.confirmDelete', defaultMessage: '确认删除？' })} onConfirm={() => handleDeleteTenant(record.id)}>
                        <Button type="link" danger icon={<DeleteOutlined />}>
                            {intl.formatMessage({ id: 'common.delete', defaultMessage: '删除' })}
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const handleViewTenant = async (tenant: ParkTenant) => {
        setCurrentTenant(tenant);
        setDetailDrawerVisible(true);
        setDetailLoading(true);
        try {
            const serviceRes = await parkService.getServiceRequests({ page: 1, pageSize: 100, tenantId: tenant.id });
            if (serviceRes.success && serviceRes.data) setTenantServiceRequests(serviceRes.data.queryable);

            const contractRes = await parkService.getContracts({ page: 1, pageSize: 100, tenantId: tenant.id });
            if (contractRes.success && contractRes.data) {
                setTenantContracts(contractRes.data.queryable);
                const allPayments: LeasePaymentRecord[] = [];
                for (const contract of contractRes.data.queryable) {
                    const paymentRes = await parkService.getPaymentRecords(contract.id);
                    if (paymentRes.success && paymentRes.data) {
                        allPayments.push(...paymentRes.data.map(p => ({ ...p, contractNumber: contract.contractNumber })));
                    }
                }
                setTenantPayments(allPayments);
            }
        } catch (error) {
            console.error('Failed to load tenant details:', error);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleEditTenant = (tenant: ParkTenant) => {
        setCurrentTenant(tenant);
        setIsEdit(true);
        tenantForm.setFieldsValue({ ...tenant, entryDate: tenant.entryDate ? dayjs(tenant.entryDate) : undefined });
        setTenantModalVisible(true);
    };

    const handleDeleteTenant = async (id: string) => {
        setLoading(true);
        try {
            const res = await parkService.deleteTenant(id);
            if (res.success) {
                message.success('删除成功');
                fetchTenants();
                loadStatistics();
            }
        } catch (e) { message.error('删除失败'); }
        finally { setLoading(false); }
    };

    const handleAddTenant = () => {
        setCurrentTenant(null);
        setIsEdit(false);
        tenantForm.resetFields();
        setTenantModalVisible(true);
    };

    const handleTenantSubmit = async () => {
        try {
            const values = await tenantForm.validateFields();
            setLoading(true);
            const submitData = { ...values, entryDate: values.entryDate?.toISOString() };
            const res = isEdit && currentTenant ? await parkService.updateTenant(currentTenant.id, submitData) : await parkService.createTenant(submitData);
            if (res.success) {
                message.success(isEdit ? '更新成功' : '创建成功');
                setTenantModalVisible(false);
                fetchTenants();
                loadStatistics();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        fetchTenants();
        loadStatistics();
    };

    return (
        <PageContainer
            title={intl.formatMessage({ id: 'pages.park.tenant.title', defaultMessage: '租户管理' })}
            extra={
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
                        {intl.formatMessage({ id: 'common.refresh', defaultMessage: '刷新' })}
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAddTenant}>
                        {intl.formatMessage({ id: 'pages.park.tenant.addTenant', defaultMessage: '新增租户' })}
                    </Button>
                </Space>
            }
        >
            {statistics && (
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} sm={12} md={6}><StatCard title="租户总数" value={statistics.totalTenants} icon={<UserOutlined />} color="#1890ff" suffix={<Text type="secondary" style={{ fontSize: 12 }}>活跃: {statistics.activeTenants}</Text>} /></Col>
                    <Col xs={24} sm={12} md={6}><StatCard title="合同总数" value={statistics.totalContracts} icon={<FileTextOutlined />} color="#52c41a" suffix={<Text type="secondary" style={{ fontSize: 12 }}>有效: {statistics.activeContracts}</Text>} /></Col>
                    <Col xs={24} sm={12} md={6}><StatCard title="即将到期" value={statistics.expiringContracts} icon={<WarningOutlined />} color={statistics.expiringContracts > 0 ? '#f5222d' : '#52c41a'} /></Col>
                    <Col xs={24} sm={12} md={6}><StatCard title="月租金收入" value={`¥${statistics.totalMonthlyRent?.toLocaleString()}`} icon={<CalendarOutlined />} color="#722ed1" /></Col>
                </Row>
            )}

            <SearchBar
                initialParams={searchParamsRef.current}
                onSearch={(params) => {
                    searchParamsRef.current = { ...searchParamsRef.current, ...params };
                    setTenantsPagination(prev => ({ ...prev, page: 1 }));
                    fetchTenants();
                }}
                style={{ marginBottom: 16 }}
            />

            <Card>
                <Table<ParkTenant>
                    dataSource={tenantsData}
                    columns={tenantColumns as any}
                    rowKey="id"
                    loading={tenantsLoading}
                    onChange={handleTenantsTableChange}
                    pagination={{
                        current: tenantsPagination.page,
                        pageSize: tenantsPagination.pageSize,
                        total: tenantsPagination.total,
                    }}
                    scroll={{ x: 1100 }}
                />
            </Card>

            <Modal
                title={isEdit ? '编辑租户' : '新增租户'}
                open={tenantModalVisible}
                onOk={handleTenantSubmit}
                onCancel={() => setTenantModalVisible(false)}
                confirmLoading={loading}
                width={640}
            >
                <Form form={tenantForm} layout="vertical">
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="tenantName" label="租户名称" rules={[{ required: true }]}><Input placeholder="请输入租户名称" /></Form.Item></Col>
                        <Col span={12}><Form.Item name="industry" label="行业"><Input placeholder="请输入行业" /></Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={8}><Form.Item name="contactPerson" label="联系人"><Input placeholder="联系人" /></Form.Item></Col>
                        <Col span={8}><Form.Item name="phone" label="电话"><Input placeholder="电话" /></Form.Item></Col>
                        <Col span={8}><Form.Item name="email" label="邮箱"><Input placeholder="邮箱" /></Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="businessLicense" label="营业执照号"><Input placeholder="营业执照号" /></Form.Item></Col>
                        <Col span={12}><Form.Item name="entryDate" label="入驻日期"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                    </Row>
                    <Form.Item name="address" label="地址"><Input placeholder="请输入地址" /></Form.Item>
                    <Form.Item name="notes" label="备注"><Input.TextArea rows={2} placeholder="请输入备注" /></Form.Item>
                </Form>
            </Modal>

            <Drawer
                title={currentTenant?.tenantName || '租户详情'}
                open={detailDrawerVisible}
                onClose={() => { setDetailDrawerVisible(false); setTenantServiceRequests([]); setTenantPayments([]); setTenantContracts([]); }}
                size={720}
                loading={detailLoading}
            >
                {currentTenant && (
                    <Flex vertical gap={24}>
                        <div>
                            <Text strong style={{ fontSize: 16, marginBottom: 12, display: 'block' }}>基本信息</Text>
                            <Descriptions bordered column={2} size="small">
                                <Descriptions.Item label="租户名称">{currentTenant.tenantName}</Descriptions.Item>
                                <Descriptions.Item label="行业">{currentTenant.industry || '-'}</Descriptions.Item>
                                <Descriptions.Item label="联系人">{currentTenant.contactPerson || '-'}</Descriptions.Item>
                                <Descriptions.Item label="电话">{currentTenant.phone || '-'}</Descriptions.Item>
                                <Descriptions.Item label="邮箱" span={2}>{currentTenant.email || '-'}</Descriptions.Item>
                                <Descriptions.Item label="入驻日期">{currentTenant.entryDate ? dayjs(currentTenant.entryDate).format('YYYY-MM-DD') : '-'}</Descriptions.Item>
                                <Descriptions.Item label="状态"><Tag color={tenantStatusOptions.find(o => o.value === currentTenant.status)?.color}>{tenantStatusOptions.find(o => o.value === currentTenant.status)?.label || currentTenant.status}</Tag></Descriptions.Item>
                                <Descriptions.Item label="租用单元">{currentTenant.unitCount}个</Descriptions.Item>
                                <Descriptions.Item label="有效合同">{currentTenant.activeContracts}份</Descriptions.Item>
                            </Descriptions>
                        </div>

                        <div>
                            <Text strong style={{ fontSize: 16, marginBottom: 12, display: 'block' }}>合同记录 ({tenantContracts.length})</Text>
                            {tenantContracts.length > 0 ? (
                                <Table
                                    size="small"
                                    dataSource={tenantContracts}
                                    rowKey="id"
                                    pagination={false}
                                    columns={[
                                        { title: intl.formatMessage({ id: 'pages.park.contract.number', defaultMessage: '合同编号' }), dataIndex: 'contractNumber', width: 120 },
                                        { title: intl.formatMessage({ id: 'pages.park.contract.rent', defaultMessage: '月租金' }), dataIndex: 'monthlyRent', width: 100, render: (v: number) => `¥${v?.toLocaleString()}` },
                                        { title: intl.formatMessage({ id: 'pages.park.contract.totalAmount', defaultMessage: '预估总额' }), dataIndex: 'totalAmount', width: 100, render: (v: number) => v ? `¥${v?.toLocaleString()}` : '-' },
                                        { title: intl.formatMessage({ id: 'pages.park.contract.period', defaultMessage: '起止日期' }), key: 'dates', width: 180, render: (_, r: LeaseContract) => `${dayjs(r.startDate).format('YYYY-MM-DD')} ~ ${dayjs(r.endDate).format('YYYY-MM-DD')}` },
                                        { title: intl.formatMessage({ id: 'pages.park.contract.status', defaultMessage: '状态' }), dataIndex: 'status', width: 80, render: (s: string) => <Tag color={contractStatusOptions.find(o => o.value === s)?.color}>{contractStatusOptions.find(o => o.value === s)?.label || s}</Tag> },
                                    ]}
                                />
                            ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={intl.formatMessage({ id: 'common.noData', defaultMessage: '暂无数据' })} />}
                        </div>

                        <div>
                            <Text strong style={{ fontSize: 16, marginBottom: 12, display: 'block' }}>服务申请 ({tenantServiceRequests.length})</Text>
                            {tenantServiceRequests.length > 0 ? (
                                <Table
                                    size="small"
                                    dataSource={tenantServiceRequests}
                                    rowKey="id"
                                    pagination={false}
                                    columns={[
                                        { title: '标题', dataIndex: 'title', ellipsis: true },
                                        { title: '类别', dataIndex: 'categoryName', width: 80 },
                                        {
                                            title: '状态', dataIndex: 'status', width: 80, render: (s: string) => {
                                                const statusMap: Record<string, { label: string; color: string }> = {
                                                    'Pending': { label: '待处理', color: 'orange' },
                                                    'Processing': { label: '处理中', color: 'processing' },
                                                    'Completed': { label: '已完成', color: 'green' },
                                                    'Cancelled': { label: '已取消', color: 'default' },
                                                };
                                                return <Tag color={statusMap[s]?.color}>{statusMap[s]?.label || s}</Tag>;
                                            }
                                        },
                                        { title: '评分', dataIndex: 'rating', width: 100, render: (r: number) => r ? <Rate disabled value={r} style={{ fontSize: 12 }} /> : '-' },
                                        { title: '创建时间', dataIndex: 'createdAt', width: 100, render: (d: string) => dayjs(d).format('MM-DD HH:mm') },
                                    ]}
                                />
                            ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无服务申请" />}
                        </div>

                        <div>
                            <Text strong style={{ fontSize: 16, marginBottom: 12, display: 'block' }}>缴费记录 ({tenantPayments.length})</Text>
                            {tenantPayments.length > 0 ? (
                                <Table
                                    size="small"
                                    dataSource={tenantPayments}
                                    rowKey="id"
                                    pagination={false}
                                    columns={[
                                        { title: '合同', dataIndex: 'contractNumber', width: 100 },
                                        {
                                            title: '类型',
                                            dataIndex: 'paymentType',
                                            width: 80,
                                            render: (t: string) => {
                                                const typeMap: Record<string, { label: string; color: string }> = {
                                                    'Rent': { label: '房租', color: 'blue' },
                                                    'PropertyFee': { label: '物业费', color: 'orange' },
                                                    'Deposit': { label: '押金', color: 'purple' },
                                                    'Other': { label: '其他', color: 'default' },
                                                };
                                                return <Tag color={typeMap[t]?.color || 'default'}>{typeMap[t]?.label || t || '房租'}</Tag>;
                                            }
                                        },
                                        { title: '金额', dataIndex: 'amount', width: 100, render: (v: number) => <Text type="success">¥{v?.toLocaleString()}</Text> },
                                        { title: '缴费日期', dataIndex: 'paymentDate', width: 100, render: (d: string) => dayjs(d).format('YYYY-MM-DD') },
                                        { title: '方式', dataIndex: 'paymentMethod', width: 80 },
                                        { title: '备注', dataIndex: 'notes', ellipsis: true },
                                    ]}
                                />
                            ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无缴费记录" />}
                        </div>
                    </Flex>
                )}
            </Drawer>
        </PageContainer>
    );
};

export default TenantManagement;
// 统一后端分页字段，无需前置转换
