import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Card, Form, Input, Select, Button, Modal, App, Space, Row, Col, Tag, Typography, Descriptions, InputNumber, Tabs, Popconfirm, DatePicker, Drawer, List, Badge, Flex, Upload } from 'antd';
import { useIntl } from '@umijs/max';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, FileTextOutlined, UserOutlined, PhoneOutlined, WarningOutlined, ReloadOutlined, CalendarOutlined, SyncOutlined, UploadOutlined, DownloadOutlined, PaperClipOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import PageContainer from '@/components/PageContainer';
import { DataTable } from '@/components/DataTable';
import SearchFormCard from '@/components/SearchFormCard';
import StatCard from '@/components/StatCard';
import * as parkService from '@/services/park';
import type { ParkTenant, LeaseContract, TenantStatistics, PropertyUnit } from '@/services/park';
import * as cloudService from '@/services/cloud-storage/api';
import dayjs from 'dayjs';
import type { UploadFile, UploadProps } from 'antd';
import styles from './index.less';

const { Text } = Typography;


const TenantManagement: React.FC = () => {
    const intl = useIntl();
    const tenantTableRef = useRef<ActionType>(null);
    const contractTableRef = useRef<ActionType>(null);
    const { message } = App.useApp();
    const [tenantForm] = Form.useForm();
    const [contractForm] = Form.useForm();
    const [searchForm] = Form.useForm();

    const [paymentForm] = Form.useForm();
    const [activeTab, setActiveTab] = useState<string>('tenants');
    const [statistics, setStatistics] = useState<TenantStatistics | null>(null);
    const [loading, setLoading] = useState(false);
    const [tenantModalVisible, setTenantModalVisible] = useState(false);
    const [contractModalVisible, setContractModalVisible] = useState(false);
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
    const [contractDetailDrawerVisible, setContractDetailDrawerVisible] = useState(false);
    const [currentTenant, setCurrentTenant] = useState<ParkTenant | null>(null);
    const [currentContract, setCurrentContract] = useState<LeaseContract | null>(null);
    const [tenants, setTenants] = useState<ParkTenant[]>([]);
    const [allUnits, setAllUnits] = useState<PropertyUnit[]>([]);
    const [isEdit, setIsEdit] = useState(false);
    const [contractFileList, setContractFileList] = useState<UploadFile[]>([]);

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

    const loadTenants = useCallback(async () => {
        try {
            const res = await parkService.getTenants({ page: 1, pageSize: 100 });
            if (res.success && res.data?.tenants) {
                setTenants(res.data.tenants);
            }
        } catch (error) {
            console.error('Failed to load tenants:', error);
        }
    }, []);

    const loadUnits = useCallback(async () => {
        try {
            const res = await parkService.getPropertyUnits({ page: 1, pageSize: 500 });
            if (res.success && res.data?.units) {
                setAllUnits(res.data.units);
            }
        } catch (error) {
            console.error('Failed to load units:', error);
        }
    }, []);

    useEffect(() => {
        loadStatistics();
        loadTenants();
        loadUnits();
    }, [loadStatistics, loadTenants, loadUnits]);

    const tenantStatusOptions = [
        { label: '活跃', value: 'Active', color: 'green' },
        { label: '即将到期', value: 'Expiring', color: 'orange' },
        { label: '已退租', value: 'Moved', color: 'default' },
    ];

    const contractStatusOptions = [
        { label: '有效', value: 'Active', color: 'green' },
        { label: '待生效', value: 'Pending', color: 'blue' },
        { label: '已到期', value: 'Expired', color: 'default' },
        { label: '已续签', value: 'Renewed', color: 'cyan' },
        { label: '已终止', value: 'Terminated', color: 'red' },
    ];

    const tenantColumns: ProColumns<ParkTenant>[] = [
        {
            title: intl.formatMessage({ id: 'pages.park.tenant.name', defaultMessage: '租户名称' }),
            dataIndex: 'tenantName',
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
            width: 120,
            render: (text, record) => (
                <Flex vertical gap={0}>
                    <Text>{text || '-'}</Text>
                    {record.phone && <Text type="secondary" style={{ fontSize: 12 }}><PhoneOutlined /> {record.phone}</Text>}
                </Flex>
            ),
        },
        {
            title: intl.formatMessage({ id: 'pages.park.tenant.industry', defaultMessage: '行业' }),
            dataIndex: 'industry',
            width: 100,
            render: (text) => text || '-',
        },
        {
            title: intl.formatMessage({ id: 'pages.park.tenant.entryDate', defaultMessage: '入驻日期' }),
            dataIndex: 'entryDate',
            width: 110,
            render: (date) => date ? dayjs(date as string).format('YYYY-MM-DD') : '-',
        },
        {
            title: intl.formatMessage({ id: 'pages.park.tenant.units', defaultMessage: '租用单元' }),
            dataIndex: 'unitCount',
            width: 80,
            align: 'center',
        },
        {
            title: intl.formatMessage({ id: 'pages.park.tenant.contracts', defaultMessage: '有效合同' }),
            dataIndex: 'activeContracts',
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
            width: 100,
            render: (status) => {
                const opt = tenantStatusOptions.find(o => o.value === status);
                return <Tag color={opt?.color || 'default'}>{opt?.label || status}</Tag>;
            },
        },
        {
            title: intl.formatMessage({ id: 'common.action', defaultMessage: '操作' }),
            valueType: 'option',
            width: 180,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewTenant(record)}>
                        {intl.formatMessage({ id: 'common.view', defaultMessage: '查看' })}
                    </Button>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditTenant(record)}>
                        {intl.formatMessage({ id: 'common.edit', defaultMessage: '编辑' })}
                    </Button>
                    <Popconfirm title={intl.formatMessage({ id: 'common.confirmDelete', defaultMessage: '确认删除？' })} onConfirm={() => handleDeleteTenant(record.id)}>
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                            {intl.formatMessage({ id: 'common.delete', defaultMessage: '删除' })}
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const contractColumns: ProColumns<LeaseContract>[] = [
        {
            title: intl.formatMessage({ id: 'pages.park.contract.number', defaultMessage: '合同编号' }),
            dataIndex: 'contractNumber',
            width: 140,
            render: (_, record) => (
                <Space>
                    <FileTextOutlined style={{ color: '#1890ff' }} />
                    {record.contractNumber}
                </Space>
            ),
        },
        {
            title: intl.formatMessage({ id: 'pages.park.contract.tenant', defaultMessage: '租户' }),
            dataIndex: 'tenantName',
            width: 150,
        },
        {
            title: '租用单元',
            dataIndex: 'unitNumbers',
            width: 200,
            render: (_, record) => (
                <Space size={[0, 4]} wrap>
                    {record.unitNumbers?.map(num => (
                        <Tag key={num} color="blue">{num}</Tag>
                    ))}
                    {(!record.unitNumbers || record.unitNumbers.length === 0) && '-'}
                </Space>
            ),
        },
        {
            title: intl.formatMessage({ id: 'pages.park.contract.period', defaultMessage: '租期' }),
            dataIndex: 'startDate',
            width: 180,
            render: (_, record) => (
                <Text>{dayjs(record.startDate as string).format('YYYY-MM-DD')} ~ {dayjs(record.endDate as string).format('YYYY-MM-DD')}</Text>
            ),
        },
        {
            title: intl.formatMessage({ id: 'pages.park.contract.rent', defaultMessage: '月租金' }),
            dataIndex: 'monthlyRent',
            width: 120,
            align: 'right',
            render: (rent) => `¥${rent?.toLocaleString()}`,
        },
        {
            title: intl.formatMessage({ id: 'pages.park.contract.deposit', defaultMessage: '押金' }),
            dataIndex: 'deposit',
            width: 100,
            align: 'right',
            render: (deposit) => deposit ? `¥${deposit?.toLocaleString()}` : '-',
        },
        {
            title: intl.formatMessage({ id: 'pages.park.contract.expiry', defaultMessage: '到期天数' }),
            dataIndex: 'daysUntilExpiry',
            width: 100,
            align: 'center',
            render: (days, record) => {
                if (record.status !== 'Active' || typeof days !== 'number') return '-';
                const color = days <= 30 ? 'red' : days <= 90 ? 'orange' : 'green';
                return <Tag color={color} icon={days <= 30 ? <WarningOutlined /> : undefined}>{days}天</Tag>;
            },
        },
        {
            title: intl.formatMessage({ id: 'pages.park.contract.status', defaultMessage: '状态' }),
            dataIndex: 'status',
            width: 100,
            render: (status) => {
                const opt = contractStatusOptions.find(o => o.value === status);
                return <Tag color={opt?.color || 'default'}>{opt?.label || status}</Tag>;
            },
        },
        {
            title: intl.formatMessage({ id: 'common.action', defaultMessage: '操作' }),
            valueType: 'option',
            width: 180,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewContract(record)}>
                        {intl.formatMessage({ id: 'common.view', defaultMessage: '查看' })}
                    </Button>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditContract(record)}>
                        {intl.formatMessage({ id: 'common.edit', defaultMessage: '编辑' })}
                    </Button>
                    {record.status === 'Active' && (
                        <Button type="link" size="small" icon={<SyncOutlined />} onClick={() => handleRenewContract(record)}>
                            {intl.formatMessage({ id: 'pages.park.contract.renew', defaultMessage: '续签' })}
                        </Button>
                    )}
                    <Popconfirm title={intl.formatMessage({ id: 'common.confirmDelete', defaultMessage: '确认删除？' })} onConfirm={() => handleDeleteContract(record.id)}>
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                            {intl.formatMessage({ id: 'common.delete', defaultMessage: '删除' })}
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const fetchTenants = async (params: any) => {
        try {
            const res = await parkService.getTenants({ page: params.current || 1, pageSize: params.pageSize || 10, search: params.search, status: params.status, industry: params.industry });
            if (res.success && res.data) return { data: res.data.tenants, total: res.data.total, success: true };
            return { data: [], total: 0, success: false };
        } catch (error) { return { data: [], total: 0, success: false }; }
    };

    const fetchContracts = async (params: any) => {
        try {
            const res = await parkService.getContracts({ page: params.current || 1, pageSize: params.pageSize || 10, search: params.search, status: params.status, expiringWithin30Days: params.expiringWithin30Days });
            if (res.success && res.data) return { data: res.data.contracts, total: res.data.total, success: true };
            return { data: [], total: 0, success: false };
        } catch (error) { return { data: [], total: 0, success: false }; }
    };

    const handleViewTenant = (tenant: ParkTenant) => { setCurrentTenant(tenant); setDetailDrawerVisible(true); };
    const handleViewContract = (contract: LeaseContract) => { setCurrentContract(contract); setContractDetailDrawerVisible(true); };
    const handleEditTenant = (tenant: ParkTenant) => { setCurrentTenant(tenant); setIsEdit(true); tenantForm.setFieldsValue({ ...tenant, entryDate: tenant.entryDate ? dayjs(tenant.entryDate) : undefined }); setTenantModalVisible(true); };
    const handleDeleteTenant = async (id: string) => { setLoading(true); try { const res = await parkService.deleteTenant(id); if (res.success) { message.success('删除成功'); tenantTableRef.current?.reload(); loadStatistics(); loadTenants(); } } catch (e) { message.error('删除失败'); } finally { setLoading(false); } };
    const handleAddTenant = () => { setCurrentTenant(null); setIsEdit(false); tenantForm.resetFields(); setTenantModalVisible(true); };
    const handleTenantSubmit = async () => {
        try {
            const values = await tenantForm.validateFields(); setLoading(true);
            const submitData = { ...values, entryDate: values.entryDate?.toISOString() };
            const res = isEdit && currentTenant ? await parkService.updateTenant(currentTenant.id, submitData) : await parkService.createTenant(submitData);
            if (res.success) { message.success(isEdit ? '更新成功' : '创建成功'); setTenantModalVisible(false); tenantTableRef.current?.reload(); loadStatistics(); loadTenants(); }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleEditContract = (record: LeaseContract) => {
        setIsEdit(true);
        setCurrentContract(record);
        contractForm.setFieldsValue({
            ...record,
            startDate: record.startDate ? dayjs(record.startDate) : undefined,
            endDate: record.endDate ? dayjs(record.endDate) : undefined,
            unitIds: record.unitIds || [],
        });
        setContractFileList((record.attachments || []).map(id => ({
            uid: id,
            name: `附件-${id.substring(0, 8)}`,
            status: 'done',
            url: `/api/cloud-storage/files/${id}/download`
        })));
        setContractModalVisible(true);
    };
    const handleDeleteContract = async (id: string) => { setLoading(true); try { const res = await parkService.deleteContract(id); if (res.success) { message.success('删除成功'); contractTableRef.current?.reload(); loadStatistics(); } } catch (e) { message.error('删除失败'); } finally { setLoading(false); } };
    const handleAddContract = () => {
        setIsEdit(false);
        setCurrentContract(null);
        contractForm.resetFields();
        setContractFileList([]);
        setContractModalVisible(true);
    };
    const handleRenewContract = (contract: LeaseContract) => { setCurrentContract(contract); setIsEdit(false); contractForm.setFieldsValue({ tenantId: contract.tenantId, contractNumber: `${contract.contractNumber}-R`, unitIds: contract.unitIds, startDate: dayjs(contract.endDate).add(1, 'day'), monthlyRent: contract.monthlyRent, deposit: contract.deposit, paymentCycle: contract.paymentCycle }); setContractModalVisible(true); };
    const handleContractSubmit = async () => {
        try {
            const values = await contractForm.validateFields();
            setLoading(true);
            const submitData = {
                ...values,
                startDate: values.startDate?.toISOString(),
                endDate: values.endDate?.toISOString(),
                attachments: contractFileList.filter(f => f.status === 'done').map(f => f.uid)
            };
            const res = isEdit && currentContract
                ? await parkService.updateContract(currentContract.id, submitData)
                : await parkService.createContract(submitData);
            if (res.success) {
                message.success(isEdit ? '更新成功' : '创建成功');
                setContractModalVisible(false);
                setContractFileList([]);
                contractTableRef.current?.reload();
                loadStatistics();
            }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleAddPayment = () => { paymentForm.resetFields(); paymentForm.setFieldsValue({ paymentDate: dayjs(), amount: currentContract?.monthlyRent }); setPaymentModalVisible(true); };
    const handlePaymentSubmit = async () => {
        try {
            if (!currentContract) return;
            const values = await paymentForm.validateFields(); setLoading(true);
            const submitData = { ...values, contractId: currentContract.id, paymentDate: values.paymentDate?.toISOString(), periodStart: values.periodRange?.[0]?.toISOString(), periodEnd: values.periodRange?.[1]?.toISOString() };
            const res = await parkService.createPaymentRecord(submitData);
            if (res.success) {
                message.success('添加成功');
                setPaymentModalVisible(false);
                // 重新加载合同详情以获取最新付款记录
                const updatedRes = await parkService.getContract(currentContract.id);
                if (updatedRes.success && updatedRes.data) setCurrentContract(updatedRes.data);
            }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleDeletePayment = async (id: string) => {
        try {
            setLoading(true);
            const res = await parkService.deletePaymentRecord(id);
            if (res.success) {
                message.success('删除成功');
                if (currentContract) {
                    const updatedRes = await parkService.getContract(currentContract.id);
                    if (updatedRes.success && updatedRes.data) setCurrentContract(updatedRes.data);
                }
            }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const uploadProps: UploadProps = {
        fileList: contractFileList,
        onRemove: (file) => {
            const index = contractFileList.indexOf(file);
            const newFileList = contractFileList.slice();
            newFileList.splice(index, 1);
            setContractFileList(newFileList);
        },
        customRequest: async (options) => {
            const { file, onSuccess, onError } = options;
            try {
                const res = await cloudService.uploadFile({ file: file as File });
                if (res.success && res.data) {
                    const newFile: UploadFile = {
                        uid: res.data.id,
                        name: res.data.name,
                        status: 'done',
                        url: `/api/cloud-storage/files/${res.data.id}/download`
                    };
                    setContractFileList(prev => [...prev, newFile]);
                    onSuccess?.(res.data);
                } else {
                    onError?.(new Error(res.errorMessage || '上传失败'));
                }
            } catch (err) {
                onError?.(err as Error);
            }
        }
    };

    const handleSearch = () => { activeTab === 'tenants' ? tenantTableRef.current?.reload() : contractTableRef.current?.reload(); };
    const handleReset = () => { searchForm.resetFields(); handleSearch(); };

    const handleRefresh = () => {
        if (activeTab === 'tenants') {
            tenantTableRef.current?.reload();
        } else {
            contractTableRef.current?.reload();
        }
        loadStatistics();
    };

    const handleAdd = () => {
        if (activeTab === 'tenants') {
            handleAddTenant();
        } else {
            handleAddContract();
        }
    };

    return (
        <PageContainer
            title={intl.formatMessage({ id: 'pages.park.tenant.title', defaultMessage: '租户管理' })}
            extra={
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
                        {intl.formatMessage({ id: 'common.refresh', defaultMessage: '刷新' })}
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                        {activeTab === 'tenants'
                            ? intl.formatMessage({ id: 'pages.park.tenant.addTenant', defaultMessage: '新增租户' })
                            : intl.formatMessage({ id: 'pages.park.contract.addContract', defaultMessage: '新增合同' })}
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

            <SearchFormCard>
                <Form form={searchForm} layout="inline" onFinish={handleSearch}>
                    <Form.Item name="search"><Input placeholder="搜索..." style={{ width: 200 }} allowClear /></Form.Item>
                    <Form.Item name="status"><Select placeholder="状态" style={{ width: 120 }} allowClear options={activeTab === 'tenants' ? tenantStatusOptions : contractStatusOptions} /></Form.Item>
                    {activeTab === 'contracts' && <Form.Item name="expiringWithin30Days" valuePropName="checked"><Button type={searchForm.getFieldValue('expiringWithin30Days') ? 'primary' : 'default'} onClick={() => searchForm.setFieldValue('expiringWithin30Days', !searchForm.getFieldValue('expiringWithin30Days'))}>30天内到期</Button></Form.Item>}
                    <Form.Item><Space><Button type="primary" htmlType="submit">搜索</Button><Button onClick={handleReset} icon={<ReloadOutlined />}>重置</Button></Space></Form.Item>
                </Form>
            </SearchFormCard>

            <Card>
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={[
                        {
                            key: 'tenants',
                            label: (
                                <Space>
                                    <UserOutlined />
                                    租户列表
                                </Space>
                            ),
                            children: (
                                <DataTable<ParkTenant>
                                    actionRef={tenantTableRef}
                                    columns={tenantColumns as any}
                                    request={fetchTenants}
                                    rowKey="id"
                                    scroll={{ x: 1100 }}
                                    search={false}
                                />
                            ),
                        },
                        {
                            key: 'contracts',
                            label: (
                                <Space>
                                    <FileTextOutlined />
                                    合同管理
                                </Space>
                            ),
                            children: (
                                <DataTable<LeaseContract>
                                    actionRef={contractTableRef}
                                    columns={contractColumns as any}
                                    request={fetchContracts}
                                    rowKey="id"
                                    scroll={{ x: 1200 }}
                                    search={false}
                                />
                            ),
                        },
                    ]}
                />
            </Card>

            <Modal title={isEdit ? '编辑租户' : '新增租户'} open={tenantModalVisible} onOk={handleTenantSubmit} onCancel={() => setTenantModalVisible(false)} confirmLoading={loading} width={640}>
                <Form form={tenantForm} layout="vertical">
                    <Row gutter={16}><Col span={12}><Form.Item name="tenantName" label="租户名称" rules={[{ required: true }]}><Input placeholder="请输入租户名称" /></Form.Item></Col><Col span={12}><Form.Item name="industry" label="行业"><Input placeholder="请输入行业" /></Form.Item></Col></Row>
                    <Row gutter={16}><Col span={8}><Form.Item name="contactPerson" label="联系人"><Input placeholder="联系人" /></Form.Item></Col><Col span={8}><Form.Item name="phone" label="电话"><Input placeholder="电话" /></Form.Item></Col><Col span={8}><Form.Item name="email" label="邮箱"><Input placeholder="邮箱" /></Form.Item></Col></Row>
                    <Row gutter={16}><Col span={12}><Form.Item name="businessLicense" label="营业执照号"><Input placeholder="营业执照号" /></Form.Item></Col><Col span={12}><Form.Item name="entryDate" label="入驻日期"><DatePicker style={{ width: '100%' }} /></Form.Item></Col></Row>
                    <Form.Item name="address" label="地址"><Input placeholder="请输入地址" /></Form.Item>
                    <Form.Item name="notes" label="备注"><Input.TextArea rows={2} placeholder="请输入备注" /></Form.Item>
                </Form>
            </Modal>

            <Modal title={isEdit ? '编辑合同' : '新增合同'} open={contractModalVisible} onOk={handleContractSubmit} onCancel={() => setContractModalVisible(false)} confirmLoading={loading} width={640}>
                <Form form={contractForm} layout="vertical">
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="tenantId" label="租户" rules={[{ required: true }]}><Select showSearch placeholder="请选择租户" options={tenants.map(t => ({ label: t.tenantName, value: t.id }))} filterOption={(input, option) => (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="contractNumber" label="合同编号"><Input placeholder="不填则自动生成" /></Form.Item></Col>
                    </Row>
                    <Form.Item name="unitIds" label="租用单元" rules={[{ required: true, message: '请选择租用单元' }]}>
                        <Select
                            mode="multiple"
                            placeholder="请选择房源"
                            options={allUnits.map(u => ({
                                label: `${u.buildingName || ''} - ${u.unitNumber} (${u.area}m²)`,
                                value: u.id
                            }))}
                            filterOption={(input, option) =>
                                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                            }
                        />
                    </Form.Item>
                    <Row gutter={16}><Col span={12}><Form.Item name="startDate" label="开始日期" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col><Col span={12}><Form.Item name="endDate" label="结束日期" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col></Row>
                    <Row gutter={16}><Col span={8}><Form.Item name="monthlyRent" label="月租金" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} placeholder="月租金" /></Form.Item></Col><Col span={8}><Form.Item name="deposit" label="押金"><InputNumber min={0} style={{ width: '100%' }} placeholder="押金" /></Form.Item></Col><Col span={8}><Form.Item name="paymentCycle" label="付款周期"><Select placeholder="请选择" options={[{ label: '月付', value: 'Monthly' }, { label: '季付', value: 'Quarterly' }, { label: '年付', value: 'Yearly' }]} /></Form.Item></Col></Row>
                    <Form.Item label="合同附件">
                        <Upload {...uploadProps}>
                            <Button icon={<UploadOutlined />}>点击上传</Button>
                        </Upload>
                        <Text type="secondary" style={{ fontSize: '12px' }}>支持上传资质、合同扫描件等</Text>
                    </Form.Item>
                    <Form.Item name="terms" label="条款备注"><Input.TextArea rows={2} placeholder="请输入条款备注" /></Form.Item>
                </Form>
            </Modal>

            <Drawer title={currentTenant?.tenantName || '租户详情'} open={detailDrawerVisible} onClose={() => setDetailDrawerVisible(false)} styles={{ wrapper: { width: 640 } }}>
                {currentTenant && (
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
                )}
            </Drawer>

            <Drawer title={currentContract?.contractNumber || '合同详情'} open={contractDetailDrawerVisible} onClose={() => setContractDetailDrawerVisible(false)} styles={{ wrapper: { width: 640 } }}>
                {currentContract && (
                    <div style={{ padding: '0 8px' }}>
                        <Descriptions bordered column={2} size="small" layout="horizontal">
                            <Descriptions.Item label="合同编号" span={2}>{currentContract.contractNumber}</Descriptions.Item>
                            <Descriptions.Item label="租户名称" span={2}>{currentContract.tenantName}</Descriptions.Item>
                            <Descriptions.Item label="开始日期">{dayjs(currentContract.startDate as string).format('YYYY-MM-DD')}</Descriptions.Item>
                            <Descriptions.Item label="结束日期">{dayjs(currentContract.endDate as string).format('YYYY-MM-DD')}</Descriptions.Item>
                            <Descriptions.Item label="月租金">¥{currentContract.monthlyRent?.toLocaleString()}</Descriptions.Item>
                            <Descriptions.Item label="押金">¥{currentContract.deposit?.toLocaleString()}</Descriptions.Item>
                            <Descriptions.Item label="到期状态" span={2}>
                                {currentContract.status === 'Active' && typeof currentContract.daysUntilExpiry === 'number' ? (
                                    <Tag color={currentContract.daysUntilExpiry <= 30 ? 'red' : currentContract.daysUntilExpiry <= 90 ? 'orange' : 'green'}>
                                        剩余 {currentContract.daysUntilExpiry} 天
                                    </Tag>
                                ) : '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="状态">
                                <Tag color={contractStatusOptions.find(o => o.value === currentContract.status)?.color}>
                                    {contractStatusOptions.find(o => o.value === currentContract.status)?.label || currentContract.status}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="付款周期">{currentContract.paymentCycle === 'Monthly' ? '月付' : currentContract.paymentCycle === 'Quarterly' ? '季付' : currentContract.paymentCycle === 'Yearly' ? '年付' : currentContract.paymentCycle || '-'}</Descriptions.Item>
                            <Descriptions.Item label="租用单元" span={2}>
                                <Space size={[0, 4]} wrap>
                                    {currentContract.unitNumbers?.map(num => (
                                        <Tag key={num} color="blue">{num}</Tag>
                                    ))}
                                    {(!currentContract.unitNumbers || currentContract.unitNumbers.length === 0) && '-'}
                                </Space>
                            </Descriptions.Item>
                        </Descriptions>
                        <div style={{ marginTop: 24 }}>
                            <Text strong>条款描述：</Text>
                            <div style={{ marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
                                <Text>{currentContract.terms}</Text>
                            </div>
                        </div>

                        {currentContract.attachments && currentContract.attachments.length > 0 && (
                            <div style={{ marginTop: 24 }}>
                                <Text strong>合同附件</Text>
                                <List
                                    size="small"
                                    dataSource={currentContract.attachments}
                                    renderItem={(id) => (
                                        <List.Item
                                            actions={[
                                                <Button key="view" type="link" icon={<EyeOutlined />} href={`/api/cloud-storage/files/${id}/preview`} target="_blank">预览</Button>,
                                                <Button key="download" type="link" icon={<DownloadOutlined />} href={`/api/cloud-storage/files/${id}/download`}>下载</Button>
                                            ]}
                                        >
                                            <List.Item.Meta
                                                avatar={<PaperClipOutlined />}
                                                title={`附件-${id.substring(0, 8)}`}
                                            />
                                        </List.Item>
                                    )}
                                />
                            </div>
                        )}

                        <div style={{ marginTop: 24 }}>
                            <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
                                <Text strong>付款记录</Text>
                                <Button type="primary" ghost size="small" icon={<PlusOutlined />} onClick={handleAddPayment}>
                                    添加记录
                                </Button>
                            </Flex>
                            <List
                                size="small"
                                dataSource={currentContract.paymentRecords || []}
                                renderItem={(item: any) => (
                                    <List.Item
                                        actions={[
                                            <Popconfirm
                                                key="delete"
                                                title="确定要删除这条付款记录吗？"
                                                onConfirm={() => handleDeletePayment(item.id)}
                                                okText="确定"
                                                cancelText="取消"
                                            >
                                                <Button type="link" danger size="small" icon={<DeleteOutlined />} />
                                            </Popconfirm>
                                        ]}
                                    >
                                        <List.Item.Meta
                                            title={<Space><Text strong>¥{item.amount.toLocaleString()}</Text><Tag color="blue">{item.paymentMethod || '其他'}</Tag></Space>}
                                            description={
                                                <Space direction="vertical" size={0}>
                                                    <Text type="secondary">付款日期: {dayjs(item.paymentDate).format('YYYY-MM-DD')}</Text>
                                                    {item.periodStart && <Text type="secondary">账期: {dayjs(item.periodStart).format('YYYY-MM-DD')} ~ {dayjs(item.periodEnd).format('YYYY-MM-DD')}</Text>}
                                                </Space>
                                            }
                                        />
                                        {item.notes && <Text type="secondary">{item.notes}</Text>}
                                    </List.Item>
                                )}
                                locale={{ emptyText: '暂无付款记录' }}
                            />
                        </div>
                    </div>
                )}
            </Drawer>

            <Modal title="添加付款记录" open={paymentModalVisible} onOk={handlePaymentSubmit} onCancel={() => setPaymentModalVisible(false)} confirmLoading={loading} width={480}>
                <Form form={paymentForm} layout="vertical">
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="amount" label="付款金额" rules={[{ required: true }]}><InputNumber prefix="¥" style={{ width: '100%' }} placeholder="金额" /></Form.Item></Col>
                        <Col span={12}><Form.Item name="paymentDate" label="付款日期" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="paymentMethod" label="付款方式"><Select placeholder="付款方式" options={[{ label: '银行转账', value: 'BankTransfer' }, { label: '微信支付', value: 'WeChat' }, { label: '支付宝', value: 'Alipay' }, { label: '现金', value: 'Cash' }]} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="periodRange" label="费用账期"><DatePicker.RangePicker style={{ width: '100%' }} /></Form.Item></Col>
                    </Row>
                    <Form.Item name="notes" label="备注"><Input.TextArea rows={2} placeholder="请输入备注" /></Form.Item>
                </Form>
            </Modal>
        </PageContainer>
    );
};

export default TenantManagement;
