import React, { useRef, useState, useCallback, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl, request } from '@umijs/max';
import { Form, Input, Select, Button, Modal, App, Space, Row, Col, Tag, Typography, InputNumber, Popconfirm, DatePicker, List, Flex, Upload } from 'antd';
import { Drawer } from 'antd';
import { ProDescriptions } from '@ant-design/pro-components';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import { ModalForm, ProFormText, ProFormSelect, ProFormDateRangePicker, ProFormDatePicker } from '@ant-design/pro-form';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, FileTextOutlined, WarningOutlined, ReloadOutlined, CalendarOutlined, SyncOutlined, UploadOutlined, DownloadOutlined, PaperClipOutlined, CheckCircleOutlined, SearchOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import dayjs from 'dayjs';
import { ApiResponse, PagedResult, PageParams } from '@/types';

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
    list: (params: PageParams) => request<ApiResponse<PagedResult<LeaseContract>>>('/apiservice/api/park/contracts/list', { params }),
    create: (data: ContractFormData) => request<ApiResponse<LeaseContract>>('/apiservice/api/park/contracts', { method: 'POST', data }),
    update: (id: string, data: ContractFormData) => request<ApiResponse<LeaseContract>>(`/apiservice/api/park/contracts/${id}`, { method: 'PUT', data }),
    delete: (id: string) => request<ApiResponse<void>>(`/apiservice/api/park/contracts/${id}`, { method: 'DELETE' }),
    getDetail: (id: string) => request<ApiResponse<LeaseContract>>(`/apiservice/api/park/contracts/${id}`),
    statistics: () => request<ApiResponse<TenantStatistics>>('/apiservice/api/park/tenant/statistics'),
    tenants: (params: PageParams) => request<ApiResponse<PagedResult<ParkTenant>>>('/apiservice/api/park/tenants/list', { params }),
    units: (params: PageParams) => request<ApiResponse<PagedResult<PropertyUnit>>>('/apiservice/api/park/properties/list', { params }),
    createPayment: (data: Partial<LeasePaymentRecord>) => request<ApiResponse<LeasePaymentRecord>>('/apiservice/api/park/contracts/payments', { method: 'POST', data }),
    deletePayment: (id: string) => request<ApiResponse<void>>(`/apiservice/api/park/contracts/payments/${id}`, { method: 'DELETE' }),
    uploadFile: (data: FormData) => request<ApiResponse<{ id: string; name: string }>>('/storage/api/files/upload', { method: 'POST', data }),
};

const contractStatusOptions = [
    { label: '有效', value: 'Active', color: 'green' }, { label: '待生效', value: 'Pending', color: 'blue' },
    { label: '已到期', value: 'Expired', color: 'default' }, { label: '已续签', value: 'Renewed', color: 'cyan' },
    { label: '已终止', value: 'Terminated', color: 'red' },
];

const ContractManagement: React.FC = () => {
    const intl = useIntl();
    const { message } = App.useApp();
    const actionRef = useRef<ActionType | undefined>(undefined);
    const [searchParams, setSearchParams] = useState({ search: '' });
    const [sorter, setSorter] = useState<{ sortBy: string; sortOrder: string } | undefined>(undefined);
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
        { title: intl.formatMessage({ id: 'pages.park.contract.number', defaultMessage: '合同编号' }), dataIndex: 'contractNumber', sorter: true, width: 140, render: (_, record) => <Space><FileTextOutlined style={{ color: '#1890ff' }} /><a onClick={() => handleViewContract(record.id)}>{record.contractNumber}</a></Space> },
        { title: intl.formatMessage({ id: 'pages.park.contract.tenant', defaultMessage: '租户' }), dataIndex: 'tenantName', sorter: true, width: 150 },
        { title: '租用单元', dataIndex: 'unitNumbers', width: 200, render: (_, record) => <Space size={[0, 4]} wrap>{record.unitNumbers?.map(num => <Tag key={num} color="blue">{num}</Tag>)}{(!record.unitNumbers || record.unitNumbers.length === 0) && '-'}</Space> },
        { title: intl.formatMessage({ id: 'pages.park.contract.period', defaultMessage: '租期' }), dataIndex: 'startDate', sorter: true, width: 180, render: (_, record) => <Text style={{ fontSize: 12 }}>{dayjs(record.startDate).format('YYYY-MM-DD')} ~ {dayjs(record.endDate).format('YYYY-MM-DD')}</Text> },
        { title: intl.formatMessage({ id: 'pages.park.contract.rent', defaultMessage: '月租金' }), dataIndex: 'monthlyRent', sorter: true, width: 100, align: 'right', render: (rent) => `¥${rent?.toLocaleString()}` },
        { title: intl.formatMessage({ id: 'pages.park.contract.totalAmount', defaultMessage: '合同总额' }), dataIndex: 'totalAmount', sorter: true, width: 120, align: 'right', render: (total) => total ? `¥${total?.toLocaleString()}` : '-' },
        { title: intl.formatMessage({ id: 'pages.park.contract.status', defaultMessage: '状态' }), dataIndex: 'status', sorter: true, width: 100, render: (status) => { const opt = contractStatusOptions.find(o => o.value === status); return <Tag color={opt?.color || 'default'}>{opt?.label || status}</Tag>; } },
        {
            title: intl.formatMessage({ id: 'common.action', defaultMessage: '操作' }), valueType: 'option', fixed: 'right', width: 180, render: (_, record) => (
                <Space size={4}>
                    <Button variant="link" color="cyan" size="small" icon={<EyeOutlined />} onClick={() => handleViewContract(record.id)}>{intl.formatMessage({ id: 'common.view', defaultMessage: '查看' })}</Button>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { set({ isEdit: true, currentContract: record, contractModalVisible: true, fileList: (record.attachments || []).map(id => ({ uid: id, name: `附件-${id.substring(0, 8)}`, status: 'done', url: `/apiservice/api/cloud-storage/files/${id}/download` })) }); }}>{intl.formatMessage({ id: 'common.edit', defaultMessage: '编辑' })}</Button>
                    <Popconfirm title={intl.formatMessage({ id: 'common.confirmDelete', defaultMessage: '确认删除？' })} onConfirm={async () => { await api.delete(record.id); actionRef.current?.reload(); api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); }}>
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>{intl.formatMessage({ id: 'common.delete', defaultMessage: '删除' })}</Button>
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
                } else { onError?.(new Error(res.message || '上传失败')); }
            } catch (err) { onError?.(err as Error); }
        },
        onRemove: (file) => { const index = state.fileList.indexOf(file); if (index > -1) { const newList = state.fileList.slice(); newList.splice(index, 1); set({ fileList: newList }); } },
    };

    return (
        <PageContainer>
            <ProTable actionRef={actionRef} headerTitle={
                <Space size={24}>
                    <Space><FileTextOutlined />合同管理</Space>
                    <Space size={12}>
                        <Tag color="green">生效 {state.statistics?.activeContracts || 0}</Tag>
                        <Tag color="blue">总额 ¥{state.statistics?.totalContractAmount?.toLocaleString() || 0}</Tag>
                        <Tag color={state.statistics?.expiringContracts ? 'red' : 'default'}>即将到期 {state.statistics?.expiringContracts || 0}</Tag>
                        <Tag color="purple">本月应收 ¥{state.statistics?.totalExpected?.toLocaleString() || 0}</Tag>
                    </Space>
                </Space>
            } request={async (params: any) => {
                const { current, pageSize } = params;
                const sortParams = sorter?.sortBy && sorter?.sortOrder ? sorter : undefined;
                const res = await api.list({ page: current, pageSize, search: searchParams.search, ...sortParams });
                return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
            }} columns={columns} rowKey="id" search={false}
                onChange={(_p, _f, s: any) => setSorter(s?.order ? { sortBy: s.field as string, sortOrder: s.order === 'ascend' ? 'asc' : 'desc' } : undefined)}
                scroll={{ x: 'max-content' }}
                toolBarRender={() => [
                    <Input.Search
                        key="search"
                        placeholder="搜索..."
                        allowClear
                        style={{ width: 260, marginRight: 8 }}
                        value={searchParams.search}
                        onChange={(e) => setSearchParams({ search: e.target.value })}
                        onSearch={(v) => { setSearchParams({ search: v }); actionRef.current?.reload(); }}
                        prefix={<SearchOutlined />}
                    />,
                    <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => set({ isEdit: false, currentContract: null, contractModalVisible: true, fileList: [] })}>新增合同</Button>,
                ]}
            />

            <ModalForm key={state.isEdit && state.currentContract?.id ? state.currentContract.id : 'create'}
                title={state.isEdit ? '编辑合同' : state.currentContract ? '续签合同' : '新增合同'}
                open={state.contractModalVisible} onOpenChange={(open) => { if (!open) set({ contractModalVisible: false }); }}
                initialValues={state.currentContract ? { tenantId: state.currentContract.tenantId, contractNumber: state.currentContract.contractNumber, unitIds: state.currentContract.unitIds || [], startDate: state.currentContract.startDate ? [dayjs(state.currentContract.startDate), dayjs(state.currentContract.endDate)] : undefined, unitPrice: state.currentContract.unitPrice, monthlyRent: state.currentContract.monthlyRent, propertyFee: state.currentContract.propertyFee, deposit: state.currentContract.deposit, paymentCycle: state.currentContract.paymentCycle, totalAmount: state.currentContract.totalAmount, terms: state.currentContract.terms } : undefined}
                onFinish={async (values) => {
                    const startDateVal = values.startDate?.[0]?.toISOString ? values.startDate[0].toISOString() : values.startDate?.[0];
                    const endDateVal = values.startDate?.[1]?.toISOString ? values.startDate[1].toISOString() : values.startDate?.[1];
                    const data: ContractFormData = { tenantId: values.tenantId, contractNumber: values.contractNumber, unitIds: values.unitIds, startDate: startDateVal, endDate: endDateVal, unitPrice: values.unitPrice, monthlyRent: values.monthlyRent, propertyFee: values.propertyFee, deposit: values.deposit, paymentCycle: values.paymentCycle, totalAmount: values.totalAmount, terms: values.terms, attachments: state.fileList.filter(f => f.status === 'done').map(f => f.uid) };
                    const res = state.isEdit && state.currentContract ? await api.update(state.currentContract.id, data) : await api.create(data);
                    if (res.success) { message.success(state.isEdit ? '更新成功' : '创建成功'); set({ contractModalVisible: false, fileList: [] }); actionRef.current?.reload(); api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); }
                    return res.success;
                }} autoFocusFirstInput width={640}>
                <Row gutter={16}><Col span={12}><ProFormSelect name="tenantId" label="租户" placeholder="请选择租户" rules={[{ required: true }]} options={state.tenants.map(t => ({ label: t.tenantName, value: t.id }))} /></Col><Col span={12}><ProFormText name="contractNumber" label="合同编号" placeholder="不填则自动生成" /></Col></Row>
                <ProFormSelect name="unitIds" label="租用单元" placeholder="请选择房源" rules={[{ required: true }]} mode="multiple" options={state.allUnits.map(u => ({ label: `${u.buildingName || ''} - ${u.unitNumber} (${u.area}m²)`, value: u.id }))} />
                <ProFormDateRangePicker name="startDate" label="租期" rules={[{ required: true }]} />
                <Row gutter={16}><Col span={6}><ProFormText name="unitPrice" label="单价(元/㎡/天)" rules={[{ required: true }]} fieldProps={{ addonAfter: '元/㎡/天' }} /></Col><Col span={6}><ProFormText name="monthlyRent" label="月租金" rules={[{ required: true }]} fieldProps={{ addonAfter: '元' }} /></Col><Col span={6}><ProFormText name="propertyFee" label="物业费/月" rules={[{ required: true }]} fieldProps={{ addonAfter: '元' }} /></Col><Col span={6}><ProFormText name="deposit" label="押金" rules={[{ required: true }]} fieldProps={{ addonAfter: '元' }} /></Col></Row>
                <Row gutter={16}><Col span={12}><ProFormSelect name="paymentCycle" label="付款周期" rules={[{ required: true }]} options={[{ label: '月付', value: 'Monthly' }, { label: '季付', value: 'Quarterly' }, { label: '年付', value: 'Yearly' }]} /></Col><Col span={12}><ProFormText name="totalAmount" label="合同总额" rules={[{ required: true }]} fieldProps={{ addonAfter: '元' }} /></Col></Row>
                <div style={{ marginBottom: 16 }}><Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>合同附件</Typography.Text><Upload {...uploadProps}><Button icon={<UploadOutlined />}>点击上传</Button></Upload></div>
                <ProFormText name="terms" label="条款备注" placeholder="备注信息" />
            </ModalForm>

            <Drawer title={state.currentContract?.contractNumber || '合同详情'} open={state.detailDrawerVisible} onClose={() => { set({ detailDrawerVisible: false, currentContract: null }); }} size="large" loading={state.detailLoading}>
                {state.currentContract && (<div style={{ padding: '0 8px' }}>
                    <ProDescriptions bordered column={2} size="small">
                        <ProDescriptions.Item label="合同编号" span={2}>{state.currentContract.contractNumber}</ProDescriptions.Item>
                        <ProDescriptions.Item label="租户名称" span={2}>{state.currentContract.tenantName}</ProDescriptions.Item>
                        <ProDescriptions.Item label="租期">{dayjs(state.currentContract.startDate).format('YYYY-MM-DD')} ~ {dayjs(state.currentContract.endDate).format('YYYY-MM-DD')}</ProDescriptions.Item>
                        <ProDescriptions.Item label="月租金">¥{state.currentContract.monthlyRent?.toLocaleString()}</ProDescriptions.Item>
                        <ProDescriptions.Item label="状态"><Tag color={contractStatusOptions.find(o => o.value === state.currentContract?.status)?.color}>{contractStatusOptions.find(o => o.value === state.currentContract?.status)?.label || state.currentContract?.status}</Tag></ProDescriptions.Item>
                        <ProDescriptions.Item label="付款周期">{state.currentContract.paymentCycle}</ProDescriptions.Item>
                    </ProDescriptions>
                    <div style={{ marginTop: 24 }}>
                        <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}><Text strong>付款记录</Text><Button type="primary" ghost size="small" icon={<PlusOutlined />} onClick={() => set({ paymentModalVisible: true })}>添加记录</Button></Flex>
                        <List size="small" dataSource={state.currentContract.paymentRecords || []} renderItem={(item: LeasePaymentRecord) => (<List.Item actions={[<Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={async () => { await api.deletePayment(item.id); const updated = await api.getDetail(state.currentContract!.id); if (updated.success && updated.data) set({ currentContract: updated.data }); }} />]}>
                            <List.Item.Meta title={<Space><Text strong>¥{item.amount.toLocaleString()}</Text><Tag color="blue">{item.paymentType || '房租'}</Tag></Space>} description={<Text type="secondary">日期: {dayjs(item.paymentDate).format('YYYY-MM-DD')} | 方式: {item.paymentMethod}</Text>} />
                        </List.Item>)} />
                    </div>
                    {state.currentContract.attachments && state.currentContract.attachments.length > 0 && (<div style={{ marginTop: 24 }}>
                        <Text strong>合同附件</Text>
                        <List size="small" dataSource={state.currentContract.attachments} renderItem={(id) => (<List.Item actions={[<Button type="link" icon={<EyeOutlined />} href={`/apiservice/api/cloud-storage/files/${id}/preview`} target="_blank">预览</Button>, <Button type="link" icon={<DownloadOutlined />} href={`/apiservice/api/cloud-storage/files/${id}/download`}>下载</Button>]}><List.Item.Meta avatar={<PaperClipOutlined />} title={`文件-${id.substring(0, 8)}`} /></List.Item>)} />
                    </div>)}
                </div>)}
            </Drawer>

            <ModalForm key={state.currentContract?.id || 'new'} title="添加付款记录" open={state.paymentModalVisible} onOpenChange={(open) => { if (!open) set({ paymentModalVisible: false }); }}
                onFinish={async (values) => {
                    if (!state.currentContract) return false;
                    const paymentDateVal = values.paymentDate?.toISOString ? values.paymentDate.toISOString() : values.paymentDate;
                    const periodStartVal = values.periodRange?.[0]?.toISOString ? values.periodRange[0].toISOString() : values.periodRange?.[0];
                    const periodEndVal = values.periodRange?.[1]?.toISOString ? values.periodRange[1].toISOString() : values.periodRange?.[1];
                    const res = await api.createPayment({ contractId: state.currentContract.id, amount: values.amount, paymentType: values.paymentType, paymentDate: paymentDateVal, paymentMethod: values.paymentMethod, periodStart: periodStartVal, periodEnd: periodEndVal, notes: values.notes });
                    if (res.success) { message.success('添加成功'); set({ paymentModalVisible: false }); const updated = await api.getDetail(state.currentContract.id); if (updated.success && updated.data) set({ currentContract: updated.data }); }
                    return res.success;
                }} autoFocusFirstInput width={480}>
                <Row gutter={16}><Col span={12}><ProFormText name="amount" label="付款金额" rules={[{ required: true }]} fieldProps={{ prefix: '¥' }} /></Col><Col span={12}><ProFormSelect name="paymentType" label="款项类型" rules={[{ required: true }]} options={[{ label: '房租', value: 'Rent' }, { label: '物业费', value: 'PropertyFee' }, { label: '押金', value: 'Deposit' }, { label: '其他', value: 'Other' }]} /></Col></Row>
                <Row gutter={16}><Col span={12}><ProFormDatePicker name="paymentDate" label="付款日期" rules={[{ required: true }]} placeholder="选择日期" /></Col><Col span={12}><ProFormSelect name="paymentMethod" label="付款方式" options={[{ label: '银行转账', value: 'BankTransfer' }, { label: '微信支付', value: 'WeChat' }, { label: '支付宝', value: 'Alipay' }, { label: '现金', value: 'Cash' }]} /></Col></Row>
                <ProFormDateRangePicker name="periodRange" label="费用账期" />
                <ProFormText name="notes" label="备注" placeholder="备注信息" />
            </ModalForm>
        </PageContainer>
    );
};

export default ContractManagement;
