import React, { useRef, useState, useCallback, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl, request } from '@umijs/max';
import { Form, Input, Select, Button, Modal, App, Space, Row, Col, Tag, Typography, InputNumber, Popconfirm, DatePicker, Flex, Upload } from 'antd';
import { Drawer } from 'antd';
import { ProDescriptions } from '@ant-design/pro-components';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import { ModalForm, ProFormText, ProFormSelect, ProFormDateRangePicker, ProFormDatePicker } from '@ant-design/pro-form';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, FileTextOutlined, WarningOutlined, ReloadOutlined, CalendarOutlined, SyncOutlined, UploadOutlined, DownloadOutlined, PaperClipOutlined, CheckCircleOutlined, SearchOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import dayjs from 'dayjs';
import { ApiResponse, PagedResult } from '@/types';

const { Text } = Typography;

interface LeaseContract {
    id: string; contractNumber: string; tenantId: string; tenantName?: string;
    unitIds: string[]; unitNumbers?: string[]; startDate: string; endDate: string;
    unitPrice: number; monthlyRent: number; propertyFee: number; deposit: number;
    paymentCycle: string; totalAmount: number; status: string; terms?: string;
    attachments?: string[]; paymentRecords?: LeasePaymentRecord[]; createdAt?: string; updatedAt?: string;
}
interface LeasePaymentRecord {
    id: string; contractId: string; amount: number; paymentType: string;
    paymentDate: string; paymentMethod?: string; periodStart?: string; periodEnd?: string; notes?: string;
}
interface TenantStatistics {
    activeContracts: number; totalContractAmount?: number; expiringContracts: number; totalExpected?: number;
}
interface PropertyUnit { id: string; buildingName?: string; unitNumber: string; area?: number; }
interface ParkTenant { id: string; tenantName: string; }
interface ContractFormData {
    tenantId: string; contractNumber?: string; unitIds: string[];
    startDate?: string; endDate?: string; unitPrice: number; monthlyRent: number;
    propertyFee: number; deposit: number; paymentCycle: string; totalAmount: number;
    terms?: string; attachments?: string[];
}

const api = {
    list: (params: any) => request<ApiResponse<PagedResult<LeaseContract>>>('/apiservice/api/park/contracts/list', { params }),
    create: (data: ContractFormData) => request<ApiResponse<LeaseContract>>('/apiservice/api/park/contracts', { method: 'POST', data }),
    update: (id: string, data: ContractFormData) => request<ApiResponse<LeaseContract>>(`/apiservice/api/park/contracts/${id}`, { method: 'PUT', data }),
    delete: (id: string) => request<ApiResponse<void>>(`/apiservice/api/park/contracts/${id}`, { method: 'DELETE' }),
    getDetail: (id: string) => request<ApiResponse<LeaseContract>>(`/apiservice/api/park/contracts/${id}`),
    statistics: () => request<ApiResponse<TenantStatistics>>('/apiservice/api/park/tenant/statistics'),
    tenants: (params: any) => request<ApiResponse<PagedResult<ParkTenant>>>('/apiservice/api/park/tenants/list', { params }),
    units: (params: any) => request<ApiResponse<PagedResult<PropertyUnit>>>('/apiservice/api/park/properties/list', { params }),
    createPayment: (data: Partial<LeasePaymentRecord>) => request<ApiResponse<LeasePaymentRecord>>('/apiservice/api/park/contracts/payments', { method: 'POST', data }),
    deletePayment: (id: string) => request<ApiResponse<void>>(`/apiservice/api/park/contracts/payments/${id}`, { method: 'DELETE' }),
    uploadFile: (data: FormData) => request<ApiResponse<{ id: string; name: string }>>('/storage/api/files/upload', { method: 'POST', data }),
};

const contractStatusOptions = (intl: ReturnType<typeof useIntl>) => [
    { label: intl.formatMessage({ id: 'pages.park.contract.status.active' }), value: 'Active', color: 'green' }, { label: intl.formatMessage({ id: 'pages.park.contract.status.pending' }), value: 'Pending', color: 'blue' },
    { label: intl.formatMessage({ id: 'pages.park.contract.status.expired' }), value: 'Expired', color: 'default' }, { label: intl.formatMessage({ id: 'pages.park.contract.status.renewed' }), value: 'Renewed', color: 'cyan' },
    { label: intl.formatMessage({ id: 'pages.park.contract.status.terminated' }), value: 'Terminated', color: 'red' },
];

const ContractManagement: React.FC = () => {
    const intl = useIntl();
    const { message } = App.useApp();
    const actionRef = useRef<ActionType | undefined>(undefined);
    const [searchParams, setSearchParams] = useState({ search: '' });
    const [state, setState] = useState({
        statistics: null as TenantStatistics | null, contractModalVisible: false, paymentModalVisible: false,
        detailDrawerVisible: false, currentContract: null as LeaseContract | null, detailLoading: false,
        tenants: [] as ParkTenant[], allUnits: [] as PropertyUnit[], isEdit: false, fileList: [] as UploadFile[],
    });
    const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

    useEffect(() => {
        api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); });
        api.tenants({ page: 1 }).then(r => { if (r.success && r.data) set({ tenants: r.data.queryable }); });
        api.units({ page: 1 }).then(r => { if (r.success && r.data) set({ allUnits: r.data.queryable }); });
    }, []);

    const handleViewContract = async (id: string) => {
        set({ currentContract: null, detailDrawerVisible: true, detailLoading: true });
        try {
            const res = await api.getDetail(id);
            if (res.success && res.data) {
                set({ currentContract: res.data });
            }
        } catch (error) {
            console.error('Failed to load contract details:', error);
        } finally {
            set({ detailLoading: false });
        }
    };

    const columns: ProColumns<LeaseContract>[] = [
        { title: intl.formatMessage({ id: 'pages.park.contract.number' }), dataIndex: 'contractNumber', sorter: true, width: 140, render: (_, record) => <Space><FileTextOutlined style={{ color: '#1890ff' }} /><a onClick={() => handleViewContract(record.id)}>{record.contractNumber}</a></Space> },
        { title: intl.formatMessage({ id: 'pages.park.contract.tenant' }), dataIndex: 'tenantName', sorter: true, width: 150 },
        { title: intl.formatMessage({ id: 'pages.park.contract.units' }), dataIndex: 'unitNumbers', width: 200, render: (_, record) => <Space size={[0, 4]} wrap>{record.unitNumbers?.map(num => <Tag key={num} color="blue">{num}</Tag>)}{(!record.unitNumbers || record.unitNumbers.length === 0) && '-'}</Space> },
        { title: intl.formatMessage({ id: 'pages.park.contract.period' }), dataIndex: 'startDate', sorter: true, width: 180, render: (_, record) => <Text style={{ fontSize: 12 }}>{dayjs(record.startDate).format('YYYY-MM-DD')} ~ {dayjs(record.endDate).format('YYYY-MM-DD')}</Text> },
        { title: intl.formatMessage({ id: 'pages.park.contract.rent' }), dataIndex: 'monthlyRent', sorter: true, width: 100, align: 'right', render: (rent) => `¥${rent?.toLocaleString()}` },
        { title: intl.formatMessage({ id: 'pages.park.contract.totalAmount' }), dataIndex: 'totalAmount', sorter: true, width: 120, align: 'right', render: (total) => total ? `¥${total?.toLocaleString()}` : '-' },
        { title: intl.formatMessage({ id: 'pages.park.contract.status' }), dataIndex: 'status', sorter: true, width: 100, render: (status) => { const opt = contractStatusOptions(intl).find(o => o.value === status); return <Tag color={opt?.color || 'default'}>{opt?.label || status}</Tag>; } },
        {
            title: intl.formatMessage({ id: 'common.action' }), valueType: 'option', fixed: 'right', width: 180, render: (_, record) => (
                <Space size={4}>
                    <Button variant="link" color="cyan" size="small" icon={<EyeOutlined />} onClick={() => handleViewContract(record.id)}>{intl.formatMessage({ id: 'common.view' })}</Button>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { set({ isEdit: true, currentContract: record, contractModalVisible: true, fileList: (record.attachments || []).map(id => ({ uid: id, name: `附件-${id.substring(0, 8)}`, status: 'done', url: `/apiservice/api/cloud-storage/files/${id}/download` })) }); }}>{intl.formatMessage({ id: 'common.edit' })}</Button>
                    <Popconfirm title={intl.formatMessage({ id: 'common.confirmDelete' })} onConfirm={async () => { await api.delete(record.id); actionRef.current?.reload(); api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); }}>
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>{intl.formatMessage({ id: 'common.delete' })}</Button>
                    </Popconfirm>
                </Space>
            )
        },
    ];

    const uploadProps: UploadProps = {
        fileList: state.fileList,
        customRequest: async (options) => {
            const { file, onSuccess, onError } = options;
            try {
                const formData = new FormData(); formData.append('file', file as File);
                const res = await api.uploadFile(formData);
                if (res.success && res.data) {
                    const newFile: UploadFile = { uid: res.data.id, name: res.data.name, status: 'done', url: `/apiservice/api/cloud-storage/files/${res.data.id}/download` };
                    setState(prev => ({ ...prev, fileList: [...prev.fileList, newFile] })); onSuccess?.(res.data);
                } else { onError?.(new Error(res.message || intl.formatMessage({ id: 'pages.park.contract.message.uploadFailed' }))); }
            } catch (err) { onError?.(err as Error); }
        },
        onRemove: (file) => { const index = state.fileList.indexOf(file); if (index > -1) { const newList = state.fileList.slice(); newList.splice(index, 1); set({ fileList: newList }); } },
    };

    return (
        <PageContainer>
            <ProTable actionRef={actionRef} headerTitle={
                    <Space size={24}>
                        <Space><FileTextOutlined />{intl.formatMessage({ id: 'pages.park.contract.contractManagement' })}</Space>
                        <Space size={12}>
                            <Tag color="green">{intl.formatMessage({ id: 'pages.park.contract.statistics.active' })} {state.statistics?.activeContracts || 0}</Tag>
                            <Tag color="blue">{intl.formatMessage({ id: 'pages.park.contract.statistics.totalAmount' })} ¥{state.statistics?.totalContractAmount?.toLocaleString() || 0}</Tag>
                            <Tag color={state.statistics?.expiringContracts ? 'red' : 'default'}>{intl.formatMessage({ id: 'pages.park.contract.statistics.expiring' })} {state.statistics?.expiringContracts || 0}</Tag>
                            <Tag color="purple">{intl.formatMessage({ id: 'pages.park.contract.statistics.expectedThisMonth' })} ¥{state.statistics?.totalExpected?.toLocaleString() || 0}</Tag>
                        </Space>
                    </Space>
            } request={async (params: any, sort: any, filter: any) => {
                const res = await api.list({ ...params, search: searchParams.search, sort, filter });
                return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
            }} columns={columns} rowKey="id" search={false}
                scroll={{ x: 'max-content' }}
                toolBarRender={() => [
                    <Input.Search
                        key="search"
                        placeholder={intl.formatMessage({ id: 'pages.common.search' })}
                        allowClear
                        style={{ width: 260, marginRight: 8 }}
                        value={searchParams.search}
                        onChange={(e) => setSearchParams({ search: e.target.value })}
                        onSearch={(v) => { setSearchParams({ search: v }); actionRef.current?.reload(); }}
                        prefix={<SearchOutlined />}
                    />,
                    <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => set({ isEdit: false, currentContract: null, contractModalVisible: true, fileList: [] })}>{intl.formatMessage({ id: 'pages.park.contract.addContract' })}</Button>,
                ]}
            />

            <ModalForm key={state.isEdit && state.currentContract?.id ? state.currentContract.id : 'create'}
                title={state.isEdit ? intl.formatMessage({ id: 'pages.park.contract.editContract' }) : state.currentContract ? intl.formatMessage({ id: 'pages.park.contract.renewContract' }) : intl.formatMessage({ id: 'pages.park.contract.addContract' })}
                open={state.contractModalVisible} onOpenChange={(open) => { if (!open) set({ contractModalVisible: false }); }}
                initialValues={state.currentContract ? { tenantId: state.currentContract.tenantId, contractNumber: state.currentContract.contractNumber, unitIds: state.currentContract.unitIds || [], startDate: state.currentContract.startDate ? [dayjs(state.currentContract.startDate), dayjs(state.currentContract.endDate)] : undefined, unitPrice: state.currentContract.unitPrice, monthlyRent: state.currentContract.monthlyRent, propertyFee: state.currentContract.propertyFee, deposit: state.currentContract.deposit, paymentCycle: state.currentContract.paymentCycle, totalAmount: state.currentContract.totalAmount, terms: state.currentContract.terms } : undefined}
                onFinish={async (values) => {
                    const startDateVal = values.startDate?.[0]?.toISOString ? values.startDate[0].toISOString() : values.startDate?.[0];
                    const endDateVal = values.startDate?.[1]?.toISOString ? values.startDate[1].toISOString() : values.startDate?.[1];
                    const data: ContractFormData = { tenantId: values.tenantId, contractNumber: values.contractNumber, unitIds: values.unitIds, startDate: startDateVal, endDate: endDateVal, unitPrice: values.unitPrice, monthlyRent: values.monthlyRent, propertyFee: values.propertyFee, deposit: values.deposit, paymentCycle: values.paymentCycle, totalAmount: values.totalAmount, terms: values.terms, attachments: state.fileList.filter(f => f.status === 'done').map(f => f.uid) };
                    const res = state.isEdit && state.currentContract ? await api.update(state.currentContract.id, data) : await api.create(data);
                    if (res.success) { message.success(state.isEdit ? intl.formatMessage({ id: 'pages.park.contract.message.updateSuccess' }) : intl.formatMessage({ id: 'pages.park.contract.message.createSuccess' })); set({ contractModalVisible: false, fileList: [] }); actionRef.current?.reload(); api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); }
                    return res.success;
                }} autoFocusFirstInput width={640}>
                <Row gutter={16}><Col span={12}><ProFormSelect name="tenantId" label={intl.formatMessage({ id: 'pages.park.contract.tenant' })} placeholder={intl.formatMessage({ id: 'pages.park.contract.tenantPlaceholder' })} rules={[{ required: true }]} options={state.tenants.map(t => ({ label: t.tenantName, value: t.id }))} /></Col><Col span={12}><ProFormText name="contractNumber" label={intl.formatMessage({ id: 'pages.park.contract.number' })} placeholder={intl.formatMessage({ id: 'pages.park.contract.numberPlaceholder' })} /></Col></Row>
                <ProFormSelect name="unitIds" label={intl.formatMessage({ id: 'pages.park.contract.units' })} placeholder={intl.formatMessage({ id: 'pages.park.contract.unitsPlaceholder' })} rules={[{ required: true }]} mode="multiple" options={state.allUnits.map(u => ({ label: `${u.buildingName || ''} - ${u.unitNumber} (${u.area}m²)`, value: u.id }))} />
                <ProFormDateRangePicker name="startDate" label={intl.formatMessage({ id: 'pages.park.contract.period' })} rules={[{ required: true }]} />
                <Row gutter={16}><Col span={6}><ProFormText name="unitPrice" label={intl.formatMessage({ id: 'pages.park.contract.unitPrice' })} rules={[{ required: true }]} fieldProps={{ addonAfter: intl.formatMessage({ id: 'pages.park.contract.unitPriceAddon' }) }} /></Col><Col span={6}><ProFormText name="monthlyRent" label={intl.formatMessage({ id: 'pages.park.contract.rent' })} rules={[{ required: true }]} fieldProps={{ addonAfter: intl.formatMessage({ id: 'pages.park.contract.currencyYuan' }) }} /></Col><Col span={6}><ProFormText name="propertyFee" label={intl.formatMessage({ id: 'pages.park.contract.propertyFee' })} rules={[{ required: true }]} fieldProps={{ addonAfter: intl.formatMessage({ id: 'pages.park.contract.currencyYuan' }) }} /></Col><Col span={6}><ProFormText name="deposit" label={intl.formatMessage({ id: 'pages.park.contract.deposit' })} rules={[{ required: true }]} fieldProps={{ addonAfter: intl.formatMessage({ id: 'pages.park.contract.currencyYuan' }) }} /></Col></Row>
                <Row gutter={16}><Col span={12}><ProFormSelect name="paymentCycle" label={intl.formatMessage({ id: 'pages.park.contract.paymentCycle' })} rules={[{ required: true }]} options={[{ label: intl.formatMessage({ id: 'pages.park.contract.paymentCycle.monthly' }), value: 'Monthly' }, { label: intl.formatMessage({ id: 'pages.park.contract.paymentCycle.quarterly' }), value: 'Quarterly' }, { label: intl.formatMessage({ id: 'pages.park.contract.paymentCycle.yearly' }), value: 'Yearly' }]} /></Col><Col span={12}><ProFormText name="totalAmount" label={intl.formatMessage({ id: 'pages.park.contract.totalAmount' })} rules={[{ required: true }]} fieldProps={{ addonAfter: intl.formatMessage({ id: 'pages.park.contract.currencyYuan' }) }} /></Col></Row>
                <div style={{ marginBottom: 16 }}><Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>{intl.formatMessage({ id: 'pages.park.contract.attachments' })}</Typography.Text><Upload {...uploadProps}><Button icon={<UploadOutlined />}>{intl.formatMessage({ id: 'pages.park.contract.uploadButton' })}</Button></Upload></div>
                <ProFormText name="terms" label={intl.formatMessage({ id: 'pages.park.contract.terms' })} placeholder={intl.formatMessage({ id: 'pages.park.contract.termsPlaceholder' })} />
            </ModalForm>

            <Drawer title={state.currentContract?.contractNumber || intl.formatMessage({ id: 'pages.park.contract.contractDetail' })} open={state.detailDrawerVisible} onClose={() => { set({ detailDrawerVisible: false, currentContract: null }); }} size="large" loading={state.detailLoading}>
                {state.currentContract && (<div style={{ padding: '0 8px' }}>
                    <ProDescriptions bordered column={2} size="small">
                        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.contract.number' })} span={2}>{state.currentContract.contractNumber}</ProDescriptions.Item>
                        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.contract.tenantName' })} span={2}>{state.currentContract.tenantName}</ProDescriptions.Item>
                        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.contract.period' })}>{dayjs(state.currentContract.startDate).format('YYYY-MM-DD')} ~ {dayjs(state.currentContract.endDate).format('YYYY-MM-DD')}</ProDescriptions.Item>
                        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.contract.rent' })}>¥{state.currentContract.monthlyRent?.toLocaleString()}</ProDescriptions.Item>
                        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.contract.status' })}><Tag color={contractStatusOptions(intl).find(o => o.value === state.currentContract?.status)?.color}>{contractStatusOptions(intl).find(o => o.value === state.currentContract?.status)?.label || state.currentContract?.status}</Tag></ProDescriptions.Item>
                        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.contract.paymentCycle' })}>{state.currentContract.paymentCycle}</ProDescriptions.Item>
                    </ProDescriptions>
                    <div style={{ marginTop: 24 }}>
                        <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}><Text strong>{intl.formatMessage({ id: 'pages.park.contract.paymentRecords' })}</Text><Button type="primary" ghost size="small" icon={<PlusOutlined />} onClick={() => set({ paymentModalVisible: true })}>{intl.formatMessage({ id: 'pages.park.contract.addRecord' })}</Button></Flex>
                        {state.currentContract.paymentRecords?.map((item: LeasePaymentRecord) => (
                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                              <div style={{ flex: 1 }}>
                                <Space>
                                  <Text strong>¥{item.amount.toLocaleString()}</Text>
                                  <Tag color="blue">{item.paymentType || intl.formatMessage({ id: 'pages.park.contract.paymentType.rent' })}</Tag>
                                </Space>
                                <div><Text type="secondary">{intl.formatMessage({ id: 'pages.park.contract.date' })}: {dayjs(item.paymentDate).format('YYYY-MM-DD')} | {intl.formatMessage({ id: 'pages.park.contract.method' })}: {item.paymentMethod}</Text></div>
                              </div>
                              <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={async () => { await api.deletePayment(item.id); const updated = await api.getDetail(state.currentContract!.id); if (updated.success && updated.data) set({ currentContract: updated.data }); }} />
                            </div>
                          ))}
                    </div>
                    {state.currentContract.attachments && state.currentContract.attachments.length > 0 && (<div style={{ marginTop: 24 }}>
                        <Text strong>{intl.formatMessage({ id: 'pages.park.contract.attachments' })}</Text>
                        {state.currentContract.attachments.map((id: string) => (
                            <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                              <Space>
                                <PaperClipOutlined />
                                <span>{intl.formatMessage({ id: 'pages.park.contract.file' })}-{id.substring(0, 8)}</span>
                              </Space>
                              <Space>
                                <Button type="link" icon={<EyeOutlined />} href={`/apiservice/api/cloud-storage/files/${id}/preview`} target="_blank">{intl.formatMessage({ id: 'pages.park.contract.preview' })}</Button>
                                <Button type="link" icon={<DownloadOutlined />} href={`/apiservice/api/cloud-storage/files/${id}/download`}>{intl.formatMessage({ id: 'pages.park.contract.download' })}</Button>
                              </Space>
                            </div>
                          ))}
                    </div>)}
                </div>)}
            </Drawer>

            <ModalForm key={state.currentContract?.id || 'new'} title={intl.formatMessage({ id: 'pages.park.contract.addPaymentRecord' })} open={state.paymentModalVisible} onOpenChange={(open) => { if (!open) set({ paymentModalVisible: false }); }}
                onFinish={async (values) => {
                    if (!state.currentContract) return false;
                    const paymentDateVal = values.paymentDate?.toISOString ? values.paymentDate.toISOString() : values.paymentDate;
                    const periodStartVal = values.periodRange?.[0]?.toISOString ? values.periodRange[0].toISOString() : values.periodRange?.[0];
                    const periodEndVal = values.periodRange?.[1]?.toISOString ? values.periodRange[1].toISOString() : values.periodRange?.[1];
                    const res = await api.createPayment({ contractId: state.currentContract.id, amount: values.amount, paymentType: values.paymentType, paymentDate: paymentDateVal, paymentMethod: values.paymentMethod, periodStart: periodStartVal, periodEnd: periodEndVal, notes: values.notes });
                    if (res.success) { message.success(intl.formatMessage({ id: 'pages.park.contract.message.addSuccess' })); set({ paymentModalVisible: false }); const updated = await api.getDetail(state.currentContract.id); if (updated.success && updated.data) set({ currentContract: updated.data }); }
                    return res.success;
                }} autoFocusFirstInput width={480}>
                <Row gutter={16}><Col span={12}><ProFormText name="amount" label={intl.formatMessage({ id: 'pages.park.contract.paymentAmount' })} rules={[{ required: true }]} fieldProps={{ prefix: '¥' }} /></Col><Col span={12}><ProFormSelect name="paymentType" label={intl.formatMessage({ id: 'pages.park.contract.paymentType' })} rules={[{ required: true }]} options={[{ label: intl.formatMessage({ id: 'pages.park.contract.paymentType.rent' }), value: 'Rent' }, { label: intl.formatMessage({ id: 'pages.park.contract.paymentType.propertyFee' }), value: 'PropertyFee' }, { label: intl.formatMessage({ id: 'pages.park.contract.paymentType.deposit' }), value: 'Deposit' }, { label: intl.formatMessage({ id: 'pages.park.contract.paymentType.other' }), value: 'Other' }]} /></Col></Row>
                <Row gutter={16}><Col span={12}><ProFormDatePicker name="paymentDate" label={intl.formatMessage({ id: 'pages.park.contract.paymentDate' })} rules={[{ required: true }]} placeholder={intl.formatMessage({ id: 'pages.park.contract.selectDate' })} /></Col><Col span={12}><ProFormSelect name="paymentMethod" label={intl.formatMessage({ id: 'pages.park.contract.paymentMethod' })} options={[{ label: intl.formatMessage({ id: 'pages.park.contract.paymentMethod.bankTransfer' }), value: 'BankTransfer' }, { label: intl.formatMessage({ id: 'pages.park.contract.paymentMethod.wechat' }), value: 'WeChat' }, { label: intl.formatMessage({ id: 'pages.park.contract.paymentMethod.alipay' }), value: 'Alipay' }, { label: intl.formatMessage({ id: 'pages.park.contract.paymentMethod.cash' }), value: 'Cash' }]} /></Col></Row>
                <ProFormDateRangePicker name="periodRange" label={intl.formatMessage({ id: 'pages.park.contract.periodRange' })} />
                <ProFormText name="notes" label={intl.formatMessage({ id: 'pages.park.contract.notes' })} placeholder={intl.formatMessage({ id: 'pages.park.contract.notesPlaceholder' })} />
            </ModalForm>
        </PageContainer>
    );
};

export default ContractManagement;
