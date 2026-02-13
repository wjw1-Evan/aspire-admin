import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Card, Form, Input, Select, Button, Modal, App, Space, Row, Col, Tag, Typography, Descriptions, InputNumber, Popconfirm, DatePicker, Drawer, List, Badge, Flex, Upload, Table, Empty } from 'antd';
import { useIntl, history } from '@umijs/max';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, FileTextOutlined, WarningOutlined, ReloadOutlined, CalendarOutlined, SyncOutlined, UploadOutlined, DownloadOutlined, PaperClipOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import PageContainer from '@/components/PageContainer';
import { DataTable } from '@/components/DataTable';
import SearchFormCard from '@/components/SearchFormCard';
import StatCard from '@/components/StatCard';
import * as parkService from '@/services/park';
import type { LeaseContract, TenantStatistics, PropertyUnit, LeasePaymentRecord, ParkTenant } from '@/services/park';
import * as cloudService from '@/services/cloud-storage/api';
import dayjs from 'dayjs';
import type { UploadFile, UploadProps } from 'antd';
import styles from './index.less';

const { Text } = Typography;

const ContractManagement: React.FC = () => {
    const intl = useIntl();
    const contractTableRef = useRef<ActionType>(null);
    const { message } = App.useApp();
    const [contractForm] = Form.useForm();
    const [searchForm] = Form.useForm();
    const [paymentForm] = Form.useForm();

    const [statistics, setStatistics] = useState<TenantStatistics | null>(null);
    const [loading, setLoading] = useState(false);
    const [contractModalVisible, setContractModalVisible] = useState(false);
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [contractDetailDrawerVisible, setContractDetailDrawerVisible] = useState(false);
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
            const res = await parkService.getTenants({ page: 1, pageSize: 500 });
            if (res.success && res.data?.tenants) {
                setTenants(res.data.tenants);
            }
        } catch (error) {
            console.error('Failed to load tenants:', error);
        }
    }, []);

    const loadUnits = useCallback(async () => {
        try {
            const res = await parkService.getPropertyUnits({ page: 1, pageSize: 1000 });
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

    const contractStatusOptions = [
        { label: '有效', value: 'Active', color: 'green' },
        { label: '待生效', value: 'Pending', color: 'blue' },
        { label: '已到期', value: 'Expired', color: 'default' },
        { label: '已续签', value: 'Renewed', color: 'cyan' },
        { label: '已终止', value: 'Terminated', color: 'red' },
    ];

    const contractColumns: ProColumns<LeaseContract>[] = [
        {
            title: intl.formatMessage({ id: 'pages.park.contract.number', defaultMessage: '合同编号' }),
            dataIndex: 'contractNumber',
            width: 140,
            render: (_, record) => (
                <Space>
                    <FileTextOutlined style={{ color: '#1890ff' }} />
                    <a onClick={() => handleViewContract(record)}>{record.contractNumber}</a>
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
                <Text style={{ fontSize: 12 }}>{dayjs(record.startDate as string).format('YYYY-MM-DD')} ~ {dayjs(record.endDate as string).format('YYYY-MM-DD')}</Text>
            ),
        },
        {
            title: intl.formatMessage({ id: 'pages.park.contract.rent', defaultMessage: '月租金' }),
            dataIndex: 'monthlyRent',
            width: 100,
            align: 'right',
            render: (rent) => `¥${rent?.toLocaleString()}`,
        },
        {
            title: intl.formatMessage({ id: 'pages.park.contract.totalAmount', defaultMessage: '合同总额' }),
            dataIndex: 'totalAmount',
            width: 120,
            align: 'right',
            render: (total) => total ? `¥${total?.toLocaleString()}` : '-',
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
            width: 200,
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

    const fetchContracts = async (params: any) => {
        try {
            const res = await parkService.getContracts({
                page: params.current || 1,
                pageSize: params.pageSize || 10,
                search: params.search,
                status: params.status,
                expiringWithin30Days: params.expiringWithin30Days
            });
            if (res.success && res.data) return { data: res.data.contracts, total: res.data.total, success: true };
            return { data: [], total: 0, success: false };
        } catch (error) { return { data: [], total: 0, success: false }; }
    };

    const handleViewContract = (contract: LeaseContract) => {
        setCurrentContract(contract);
        setContractDetailDrawerVisible(true);
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

    const handleDeleteContract = async (id: string) => {
        setLoading(true);
        try {
            const res = await parkService.deleteContract(id);
            if (res.success) {
                message.success('删除成功');
                contractTableRef.current?.reload();
                loadStatistics();
            }
        } catch (e) { message.error('删除失败'); } finally { setLoading(false); }
    };

    const handleAddContract = () => {
        setIsEdit(false);
        setCurrentContract(null);
        contractForm.resetFields();
        setContractFileList([]);
        setContractModalVisible(true);
    };

    const handleRenewContract = (contract: LeaseContract) => {
        setCurrentContract(contract);
        setIsEdit(false);
        contractForm.setFieldsValue({
            tenantId: contract.tenantId,
            contractNumber: `${contract.contractNumber}-R`,
            unitIds: contract.unitIds,
            startDate: dayjs(contract.endDate).add(1, 'day'),
            monthlyRent: contract.monthlyRent,
            deposit: contract.deposit,
            paymentCycle: contract.paymentCycle
        });
        setContractModalVisible(true);
    };

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

    const handleAddPayment = () => {
        paymentForm.resetFields();
        paymentForm.setFieldsValue({
            paymentDate: dayjs(),
            amount: currentContract?.monthlyRent,
            paymentType: 'Rent'
        });
        setPaymentModalVisible(true);
    };

    const handlePaymentSubmit = async () => {
        try {
            if (!currentContract) return;
            const values = await paymentForm.validateFields();
            setLoading(true);
            const submitData = {
                ...values,
                contractId: currentContract.id,
                paymentDate: values.paymentDate?.toISOString(),
                periodStart: values.periodRange?.[0]?.toISOString(),
                periodEnd: values.periodRange?.[1]?.toISOString()
            };
            const res = await parkService.createPaymentRecord(submitData);
            if (res.success) {
                message.success('添加成功');
                setPaymentModalVisible(false);
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
                    onError?.(new Error(res.message || '上传失败'));
                }
            } catch (err) {
                onError?.(err as Error);
            }
        }
    };

    const handleSearch = () => { contractTableRef.current?.reload(); };
    const handleReset = () => { searchForm.resetFields(); handleSearch(); };

    const handleRefresh = () => {
        contractTableRef.current?.reload();
        loadStatistics();
    };

    return (
        <PageContainer
            title="合同管理"
            extra={
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={handleRefresh}>刷新</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAddContract}>新增合同</Button>
                </Space>
            }
        >
            {statistics && (
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} sm={12} md={6}><StatCard title="生效合同" value={statistics.activeContracts} icon={<CheckCircleOutlined />} color="#52c41a" /></Col>
                    <Col xs={24} sm={12} md={6}><StatCard title="合同总额" value={`¥${statistics.totalContractAmount?.toLocaleString()}`} icon={<FileTextOutlined />} color="#1890ff" /></Col>
                    <Col xs={24} sm={12} md={6}><StatCard title="即将到期" value={statistics.expiringContracts} icon={<WarningOutlined />} color={statistics.expiringContracts > 0 ? '#f5222d' : '#d9d9d9'} /></Col>
                    <Col xs={24} sm={12} md={6}><StatCard title="本月应收" value={`¥${statistics.totalExpected?.toLocaleString()}`} icon={<CalendarOutlined />} color="#722ed1" /></Col>
                </Row>
            )}

            <SearchFormCard>
                <Form form={searchForm} layout="inline" onFinish={handleSearch}>
                    <Form.Item name="search"><Input placeholder="搜索合同编号/租户..." style={{ width: 220 }} allowClear /></Form.Item>
                    <Form.Item name="status"><Select placeholder="合同状态" style={{ width: 120 }} allowClear options={contractStatusOptions} /></Form.Item>
                    <Form.Item name="expiringWithin30Days" valuePropName="checked">
                        <Button
                            type={searchForm.getFieldValue('expiringWithin30Days') ? 'primary' : 'default'}
                            onClick={() => {
                                const val = !searchForm.getFieldValue('expiringWithin30Days');
                                searchForm.setFieldValue('expiringWithin30Days', val);
                                handleSearch();
                            }}
                        >
                            30天内到期
                        </Button>
                    </Form.Item>
                    <Form.Item><Space><Button type="primary" htmlType="submit">搜索</Button><Button onClick={handleReset}>重置</Button></Space></Form.Item>
                </Form>
            </SearchFormCard>

            <Card>
                <DataTable<LeaseContract>
                    actionRef={contractTableRef}
                    columns={contractColumns as any}
                    request={fetchContracts}
                    rowKey="id"
                    scroll={{ x: 1200 }}
                    search={false}
                />
            </Card>

            <Modal title={isEdit ? '编辑合同' : '新增合同'} open={contractModalVisible} onOk={handleContractSubmit} onCancel={() => setContractModalVisible(false)} confirmLoading={loading} width={640}>
                <Form
                    form={contractForm}
                    layout="vertical"
                    initialValues={{ rentalPricingMethod: 'PerSqmPerDay', propertyFee: 0, deposit: 0, totalAmount: 0, paymentCycle: 'Monthly' }}
                    onValuesChange={(changedValues, allValues) => {
                        let { startDate, endDate, monthlyRent, propertyFee, unitIds, unitPrice } = allValues;
                        if (changedValues.unitIds || changedValues.unitPrice !== undefined) {
                            if (unitIds && unitIds.length > 0 && unitPrice) {
                                const selectedUnits = allUnits.filter(u => unitIds.includes(u.id));
                                const totalArea = selectedUnits.reduce((acc, curr) => acc + (curr.area || 0), 0);
                                const rent = unitPrice * totalArea * 30;
                                monthlyRent = Number(rent.toFixed(2));
                                contractForm.setFieldValue('monthlyRent', monthlyRent);
                            }
                        }
                        if ((changedValues.startDate || changedValues.endDate || changedValues.monthlyRent !== undefined || changedValues.propertyFee !== undefined || changedValues.unitPrice !== undefined) && startDate && endDate) {
                            const start = dayjs(startDate);
                            const end = dayjs(endDate);
                            if (end.isAfter(start)) {
                                const months = end.diff(start, 'month', true);
                                const rent = Number(monthlyRent) || 0;
                                const fee = Number(propertyFee) || 0;
                                const total = (rent + fee) * months;
                                contractForm.setFieldValue('totalAmount', Number(total.toFixed(2)));
                            }
                        }
                    }}
                >
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="tenantId" label="租户" rules={[{ required: true }]}><Select showSearch placeholder="请选择租户" options={tenants.map(t => ({ label: t.tenantName, value: t.id }))} filterOption={(input, option) => (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="contractNumber" label="合同编号"><Input placeholder="不填则自动生成" /></Form.Item></Col>
                    </Row>
                    <Form.Item name="unitIds" label="租用单元" rules={[{ required: true }]}>
                        <Select mode="multiple" placeholder="请选择房源" options={allUnits.map(u => ({ label: `${u.buildingName || ''} - ${u.unitNumber} (${u.area}m²)`, value: u.id }))} />
                    </Form.Item>
                    <Row gutter={16}><Col span={12}><Form.Item name="startDate" label="开始日期" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col><Col span={12}><Form.Item name="endDate" label="结束日期" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col></Row>
                    <Row gutter={16}>
                        <Col span={6}><Form.Item name="unitPrice" label="单价(元/㎡/天)" rules={[{ required: true }]}><InputNumber min={0} step={0.01} style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={6}><Form.Item name="monthlyRent" label="月租金" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={6}><Form.Item name="propertyFee" label="物业费/月" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={6}><Form.Item name="deposit" label="押金" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="paymentCycle" label="付款周期" rules={[{ required: true }]}><Select options={[{ label: '月付', value: 'Monthly' }, { label: '季付', value: 'Quarterly' }, { label: '年付', value: 'Yearly' }]} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="totalAmount" label="合同总额" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                    </Row>
                    <Form.Item label="合同附件">
                        <Upload {...uploadProps}><Button icon={<UploadOutlined />}>点击上传</Button></Upload>
                    </Form.Item>
                    <Form.Item name="terms" label="条款备注"><Input.TextArea rows={2} /></Form.Item>
                </Form>
            </Modal>

            <Drawer title={currentContract?.contractNumber || '合同详情'} open={contractDetailDrawerVisible} onClose={() => setContractDetailDrawerVisible(false)} styles={{ wrapper: { width: 640 } }}>
                {currentContract && (
                    <div style={{ padding: '0 8px' }}>
                        <Descriptions bordered column={2} size="small">
                            <Descriptions.Item label="合同编号" span={2}>{currentContract.contractNumber}</Descriptions.Item>
                            <Descriptions.Item label="租户名称" span={2}>{currentContract.tenantName}</Descriptions.Item>
                            <Descriptions.Item label="租期">{dayjs(currentContract.startDate as string).format('YYYY-MM-DD')} ~ {dayjs(currentContract.endDate as string).format('YYYY-MM-DD')}</Descriptions.Item>
                            <Descriptions.Item label="月租金">¥{currentContract.monthlyRent?.toLocaleString()}</Descriptions.Item>
                            <Descriptions.Item label="状态"><Tag color={contractStatusOptions.find(o => o.value === currentContract.status)?.color}>{contractStatusOptions.find(o => o.value === currentContract.status)?.label || currentContract.status}</Tag></Descriptions.Item>
                            <Descriptions.Item label="付款周期">{currentContract.paymentCycle}</Descriptions.Item>
                        </Descriptions>

                        <div style={{ marginTop: 24 }}>
                            <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
                                <Text strong>付款记录</Text>
                                <Button type="primary" ghost size="small" icon={<PlusOutlined />} onClick={handleAddPayment}>添加记录</Button>
                            </Flex>
                            <List
                                size="small"
                                dataSource={currentContract.paymentRecords || []}
                                renderItem={(item: any) => (
                                    <List.Item actions={[<Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => handleDeletePayment(item.id)} />]}>
                                        <List.Item.Meta
                                            title={<Space><Text strong>¥{item.amount.toLocaleString()}</Text><Tag color="blue">{item.paymentType || '房租'}</Tag></Space>}
                                            description={<Text type="secondary">日期: {dayjs(item.paymentDate).format('YYYY-MM-DD')} | 方式: {item.paymentMethod}</Text>}
                                        />
                                    </List.Item>
                                )}
                            />
                        </div>

                        {currentContract.attachments && currentContract.attachments.length > 0 && (
                            <div style={{ marginTop: 24 }}>
                                <Text strong>合同附件</Text>
                                <List size="small" dataSource={currentContract.attachments} renderItem={(id) => (
                                    <List.Item actions={[<Button type="link" icon={<EyeOutlined />} href={`/api/cloud-storage/files/${id}/preview`} target="_blank">预览</Button>, <Button type="link" icon={<DownloadOutlined />} href={`/api/cloud-storage/files/${id}/download`}>下载</Button>]}>
                                        <List.Item.Meta avatar={<PaperClipOutlined />} title={`文件-${id.substring(0, 8)}`} />
                                    </List.Item>
                                )} />
                            </div>
                        )}
                    </div>
                )}
            </Drawer>

            <Modal title="添加付款记录" open={paymentModalVisible} onOk={handlePaymentSubmit} onCancel={() => setPaymentModalVisible(false)} confirmLoading={loading} width={480}>
                <Form form={paymentForm} layout="vertical">
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="amount" label="付款金额" rules={[{ required: true }]}><InputNumber prefix="¥" style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="paymentType" label="款项类型" rules={[{ required: true }]}><Select options={[{ label: '房租', value: 'Rent' }, { label: '物业费', value: 'PropertyFee' }, { label: '押金', value: 'Deposit' }, { label: '其他', value: 'Other' }]} /></Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="paymentDate" label="付款日期" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="paymentMethod" label="付款方式"><Select options={[{ label: '银行转账', value: 'BankTransfer' }, { label: '微信支付', value: 'WeChat' }, { label: '支付宝', value: 'Alipay' }, { label: '现金', value: 'Cash' }]} /></Form.Item></Col>
                    </Row>
                    <Form.Item name="periodRange" label="费用账期"><DatePicker.RangePicker style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="notes" label="备注"><Input.TextArea rows={2} /></Form.Item>
                </Form>
            </Modal>
        </PageContainer>
    );
};

export default ContractManagement;
