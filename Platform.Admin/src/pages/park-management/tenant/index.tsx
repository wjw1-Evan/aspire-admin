import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { request } from '@umijs/max';
import { App, Tag, Typography, Empty, Rate, Button, Space, Input, Row, Col } from 'antd';
import { Drawer } from 'antd';
import { ProTable, ProColumns } from '@ant-design/pro-table';
import { ProDescriptions } from '@ant-design/pro-components';
import { ModalForm, ProFormText, ProFormDatePicker } from '@ant-design/pro-form';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, UserOutlined, WarningOutlined, ReloadOutlined, CalendarOutlined, CustomerServiceOutlined, FileTextOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ApiResponse, PagedResult, PageParams } from '@/types';

interface ParkTenant { id: string; tenantName: string; contactPerson?: string; phone?: string; email?: string; industry?: string; businessLicense?: string; address?: string; notes?: string; entryDate?: string; status: string; unitCount: number; activeContracts: number; createdAt?: string; updatedAt?: string; }
interface LeaseContract { id: string; contractNumber: string; tenantId: string; tenantName?: string; unitIds: string[]; startDate: string; endDate: string; monthlyRent: number; totalAmount?: number; status: string; createdAt?: string; }
interface TenantStatistics { totalTenants: number; activeTenants: number; totalContracts: number; activeContracts: number; expiringContracts: number; totalMonthlyRent: number; }
interface ServiceRequest { id: string; tenantId: string; title: string; categoryName?: string; status: string; rating?: number; createdAt: string; }
interface LeasePaymentRecord { id: string; contractId: string; paymentType: string; amount: number; paymentDate: string; paymentMethod?: string; notes?: string; }
interface TenantFormData { tenantName: string; contactPerson?: string; phone?: string; email?: string; industry?: string; businessLicense?: string; address?: string; notes?: string; entryDate?: string; }

const api = {
    list: (params: PageParams & { tenantId?: string }) => request<ApiResponse<PagedResult<ParkTenant>>>('/api/park/tenants/list', { method: 'POST', data: params }),
    get: (id: string) => request<ApiResponse<ParkTenant>>(`/api/park/tenants/${id}`),
    create: (data: TenantFormData) => request<ApiResponse<ParkTenant>>('/api/park/tenants', { method: 'POST', data }),
    update: (id: string, data: TenantFormData) => request<ApiResponse<ParkTenant>>(`/api/park/tenants/${id}`, { method: 'PUT', data }),
    delete: (id: string) => request<ApiResponse<void>>(`/api/park/tenants/${id}`, { method: 'DELETE' }),
    statistics: (startDate?: string, endDate?: string) => request<ApiResponse<TenantStatistics>>('/api/park/tenant/statistics', { params: { startDate, endDate } }),
    getContracts: (params: { page?: number; pageSize?: number; tenantId?: string }) => request<ApiResponse<PagedResult<LeaseContract>>>('/api/park/contracts/list', { method: 'POST', data: params }),
    getServiceRequests: (params: { page?: number; pageSize?: number; tenantId?: string }) => request<ApiResponse<PagedResult<ServiceRequest>>>('/api/park/services/requests/list', { method: 'POST', data: params }),
    getPaymentRecords: (contractId: string) => request<ApiResponse<LeasePaymentRecord[]>>(`/api/park/contracts/${contractId}/payments`),
};

const tenantStatusOptions = [{ label: '活跃', value: 'Active', color: 'green' }, { label: '即将到期', value: 'Expiring', color: 'orange' }, { label: '已退租', value: 'Moved', color: 'default' }];
const contractStatusOptions = [{ label: '有效', value: 'Active', color: 'green' }, { label: '待生效', value: 'Pending', color: 'blue' }, { label: '已到期', value: 'Expired', color: 'default' }, { label: '已续签', value: 'Renewed', color: 'cyan' }, { label: '已终止', value: 'Terminated', color: 'red' }];

const TenantManagement: React.FC = () => {
    const { message } = App.useApp();
    const actionRef = useRef<any>(null);
    const [state, setState] = useState({ statistics: null as TenantStatistics | null, formVisible: false, editingTenant: null as ParkTenant | null, detailVisible: false, viewingTenant: null as ParkTenant | null, sorter: undefined as { sortBy: string; sortOrder: string } | undefined, search: '' });
    const [detailData, setDetailData] = useState({ contracts: [] as LeaseContract[], serviceRequests: [] as ServiceRequest[], payments: [] as (LeasePaymentRecord & { contractNumber?: string })[], loading: false });
    const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);
    const setDetail = (partial: Partial<typeof detailData>) => setDetailData(prev => ({ ...prev, ...partial }));

    const loadStatistics = useCallback(() => { api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); }, []);
    useEffect(() => { loadStatistics(); }, [loadStatistics]);

    const columns: ProColumns<ParkTenant>[] = [
        { title: '租户名称', dataIndex: 'tenantName', sorter: true, width: 180, render: (_, record) => <Space><UserOutlined style={{ color: '#1890ff' }} /><a onClick={() => handleViewTenant(record)}>{record.tenantName}</a></Space> },
        { title: '联系人', dataIndex: 'contactPerson', sorter: true, width: 120, render: (text, record) => <div><Typography.Text>{text || '-'}</Typography.Text>{record.phone && <Typography.Text type="secondary" style={{ fontSize: 12 }}>{record.phone}</Typography.Text>}</div> },
        { title: '行业', dataIndex: 'industry', sorter: true, width: 100, render: (text) => text || '-' },
        { title: '入驻日期', dataIndex: 'entryDate', sorter: true, width: 110, render: (date) => date ? dayjs(date as string).format('YYYY-MM-DD') : '-' },
        { title: '租用单元', dataIndex: 'unitCount', sorter: true, width: 80, align: 'center' },
        { title: '有效合同', dataIndex: 'activeContracts', sorter: true, width: 80, align: 'center', render: (count) => { const c = (count as number) || 0; return <Tag color={c > 0 ? '#52c41a' : '#d9d9d9'}>{c}</Tag>; } },
        { title: '状态', dataIndex: 'status', sorter: true, width: 100, render: (_: any, record) => { const opt = tenantStatusOptions.find(o => o.value === record.status); return <Tag color={opt?.color || 'default'}>{opt?.label || record.status}</Tag>; } },
        { title: '操作', valueType: 'option', width: 220, fixed: 'right', render: (_, record) => [
            <Button key="view" type="link" icon={<EyeOutlined />} onClick={() => handleViewTenant(record)}>详情</Button>,
            <Button key="service" type="link" icon={<CustomerServiceOutlined />} onClick={() => window.location.href = `/park-management/enterprise-service?tenantId=${record.id}&tenantName=${encodeURIComponent(record.tenantName)}`}>服务</Button>,
            <Button key="edit" type="link" icon={<EditOutlined />} onClick={() => set({ editingTenant: record, formVisible: true })}>编辑</Button>,
            <Button key="delete" type="link" danger icon={<DeleteOutlined />} onClick={() => handleDeleteTenant(record.id)}>删除</Button>,
        ]},
    ];

    const handleViewTenant = async (tenant: ParkTenant) => {
        set({ viewingTenant: tenant, detailVisible: true }); setDetail({ loading: true, contracts: [], serviceRequests: [], payments: [] });
        try {
            const [serviceRes, contractRes] = await Promise.all([api.getServiceRequests({ page: 1, tenantId: tenant.id }), api.getContracts({ page: 1, tenantId: tenant.id })]);
            if (serviceRes.success && serviceRes.data) setDetail({ serviceRequests: serviceRes.data.queryable });
            if (contractRes.success && contractRes.data) {
                setDetail({ contracts: contractRes.data.queryable });
                const allPayments: (LeasePaymentRecord & { contractNumber?: string })[] = [];
                for (const contract of contractRes.data.queryable) { const paymentRes = await api.getPaymentRecords(contract.id); if (paymentRes.success && paymentRes.data) allPayments.push(...paymentRes.data.map(p => ({ ...p, contractNumber: contract.contractNumber }))); }
                setDetail({ payments: allPayments });
            }
        } catch (error) { console.error('Failed to load tenant details:', error); }
        finally { setDetail({ loading: false }); }
    };

    const handleDeleteTenant = async (id: string) => { const res = await api.delete(id); if (res.success) { message.success('删除成功'); actionRef.current?.reload(); loadStatistics(); } else message.error('删除失败'); };

    return (
        <PageContainer title={<Space><UserOutlined />租户管理</Space>}
            breadcrumb={{ routes: [{ path: '/', breadcrumbName: '首页' }, { path: '/park', breadcrumbName: '园区管理' }, { path: '/park/tenant', breadcrumbName: '租户管理' }] }}
        >
            {state.statistics && <ProCard gutter={16} style={{ marginBottom: 16 }}>
                <ProCard colSpan={{ xs: 24, sm: 12, md: 6 }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold' }}>{state.statistics.totalTenants}</div>
                    <div style={{ color: '#8c8c8c', fontSize: 12 }}>租户总数</div>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>活跃: {state.statistics.activeTenants}</Typography.Text>
                </ProCard>
                <ProCard colSpan={{ xs: 24, sm: 12, md: 6 }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>{state.statistics.totalContracts}</div>
                    <div style={{ color: '#8c8c8c', fontSize: 12 }}>合同总数</div>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>有效: {state.statistics.activeContracts}</Typography.Text>
                </ProCard>
                <ProCard colSpan={{ xs: 24, sm: 12, md: 6 }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: state.statistics.expiringContracts > 0 ? '#f5222d' : '#52c41a' }}>{state.statistics.expiringContracts}</div>
                    <div style={{ color: '#8c8c8c', fontSize: 12 }}>即将到期</div>
                </ProCard>
                <ProCard colSpan={{ xs: 24, sm: 12, md: 6 }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#722ed1' }}>¥{state.statistics.totalMonthlyRent?.toLocaleString()}</div>
                    <div style={{ color: '#8c8c8c', fontSize: 12 }}>月租金收入</div>
                </ProCard>
            </ProCard>}

            <ProTable actionRef={actionRef} request={async (params: any) => {
                const { current, pageSize } = params; const sortParams = state.sorter?.sortBy && state.sorter?.sortOrder ? state.sorter : undefined;
                const res = await api.list({ page: current, pageSize, search: state.search, ...sortParams });
                return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
            }} columns={columns} rowKey="id" search={false}
                onChange={(_p, _f, s: any) => set({ sorter: s?.order ? { sortBy: s.field, sortOrder: s.order === 'ascend' ? 'asc' : 'desc' } : undefined })}
                toolBarRender={() => [
                    <Input.Search
                        key="search"
                        placeholder="搜索..."
                        allowClear
                        value={state.search}
                        onChange={(e) => set({ search: e.target.value })}
                        onSearch={(value) => { set({ search: value }); actionRef.current?.reload(); }}
                        style={{ width: 260, marginRight: 8 }}
                        prefix={<SearchOutlined />}
                    />,
                    <Button key="refresh" icon={<ReloadOutlined />} onClick={() => { actionRef.current?.reload(); loadStatistics(); }}>刷新</Button>,
                    <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => set({ editingTenant: null, formVisible: true })}>新增租户</Button>
                ]}
            />

            <ModalForm key={state.editingTenant?.id || 'create'} title={state.editingTenant ? '编辑租户' : '新增租户'} open={state.formVisible}
                onOpenChange={(open) => { if (!open) set({ formVisible: false, editingTenant: null }); }}
                initialValues={state.editingTenant ? { tenantName: state.editingTenant.tenantName, contactPerson: state.editingTenant.contactPerson, phone: state.editingTenant.phone, email: state.editingTenant.email, industry: state.editingTenant.industry, businessLicense: state.editingTenant.businessLicense, address: state.editingTenant.address, notes: state.editingTenant.notes, entryDate: state.editingTenant.entryDate ? dayjs(state.editingTenant.entryDate) : undefined } : undefined}
                onFinish={async (values) => { const data = { ...values, entryDate: values.entryDate?.toISOString() } as any; const res = state.editingTenant ? await api.update(state.editingTenant.id, data) : await api.create(data); if (res.success) { message.success(state.editingTenant ? '更新成功' : '创建成功'); set({ formVisible: false, editingTenant: null }); actionRef.current?.reload(); loadStatistics(); } return res.success; }} autoFocusFirstInput width={640}>
                <Row gutter={16}><Col span={12}><ProFormText name="tenantName" label="租户名称" placeholder="请输入租户名称" rules={[{ required: true, message: '请输入租户名称' }]} /></Col><Col span={12}><ProFormText name="industry" label="行业" placeholder="请输入行业" /></Col></Row>
                <Row gutter={16}><Col span={8}><ProFormText name="contactPerson" label="联系人" placeholder="联系人" /></Col><Col span={8}><ProFormText name="phone" label="电话" placeholder="电话" /></Col><Col span={8}><ProFormText name="email" label="邮箱" placeholder="邮箱" /></Col></Row>
                <Row gutter={16}><Col span={12}><ProFormText name="businessLicense" label="营业执照号" placeholder="营业执照号" /></Col><Col span={12}><ProFormDatePicker name="entryDate" label="入驻日期" style={{ width: '100%' }} /></Col></Row>
                <ProFormText name="address" label="地址" placeholder="请输入地址" />
                <ProFormText name="notes" label="备注" placeholder="备注信息" />
            </ModalForm>

            <Drawer title={state.viewingTenant?.tenantName || '租户详情'} open={state.detailVisible} onClose={(open) => { if (!open) set({ detailVisible: false, viewingTenant: null }); }} width={720} loading={detailData.loading}>
                {state.viewingTenant && <div>
                    <Typography.Text strong style={{ fontSize: 16, marginBottom: 12, display: 'block' }}>基本信息</Typography.Text>
                    <ProDescriptions column={2} bordered size="small" style={{ marginBottom: 24 }}>
                        <ProDescriptions.Item label="租户名称">{state.viewingTenant.tenantName}</ProDescriptions.Item>
                        <ProDescriptions.Item label="行业">{state.viewingTenant.industry || '-'}</ProDescriptions.Item>
                        <ProDescriptions.Item label="联系人">{state.viewingTenant.contactPerson || '-'}</ProDescriptions.Item>
                        <ProDescriptions.Item label="电话">{state.viewingTenant.phone || '-'}</ProDescriptions.Item>
                        <ProDescriptions.Item label="邮箱" span={2}>{state.viewingTenant.email || '-'}</ProDescriptions.Item>
                        <ProDescriptions.Item label="入驻日期">{state.viewingTenant.entryDate ? dayjs(state.viewingTenant.entryDate).format('YYYY-MM-DD') : '-'}</ProDescriptions.Item>
                        <ProDescriptions.Item label="状态"><Tag color={tenantStatusOptions.find(o => o.value === state.viewingTenant?.status)?.color}>{tenantStatusOptions.find(o => o.value === state.viewingTenant?.status)?.label || state.viewingTenant?.status}</Tag></ProDescriptions.Item>
                        <ProDescriptions.Item label="租用单元">{state.viewingTenant.unitCount}个</ProDescriptions.Item>
                        <ProDescriptions.Item label="有效合同">{state.viewingTenant.activeContracts}份</ProDescriptions.Item>
                    </ProDescriptions>

                    <Typography.Text strong style={{ fontSize: 16, marginBottom: 12, display: 'block' }}>合同记录 ({detailData.contracts.length})</Typography.Text>
                    {detailData.contracts.length > 0 ? <ProTable size="small" dataSource={detailData.contracts} rowKey="id" search={false} pagination={false} options={false} toolBarRender={false} style={{ marginBottom: 24 }} columns={[{ title: '合同编号', dataIndex: 'contractNumber', width: 120 }, { title: '月租金', dataIndex: 'monthlyRent', width: 100, render: (_: any, r: LeaseContract) => `¥${(r.monthlyRent as number)?.toLocaleString()}` }, { title: '预估总额', dataIndex: 'totalAmount', width: 100, render: (_: any, r: LeaseContract) => r.totalAmount ? `¥${(r.totalAmount as number)?.toLocaleString()}` : '-' }, { title: '起止日期', key: 'dates', width: 180, render: (_: any, r: LeaseContract) => `${dayjs(r.startDate).format('YYYY-MM-DD')} ~ ${dayjs(r.endDate).format('YYYY-MM-DD')}` }, { title: '状态', dataIndex: 'status', width: 80, render: (_: any, r: LeaseContract) => { const s = r.status as string; return <Tag color={contractStatusOptions.find(o => o.value === s)?.color}>{contractStatusOptions.find(o => o.value === s)?.label || s}</Tag>; } }]} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />}

                    <Typography.Text strong style={{ fontSize: 16, marginBottom: 12, display: 'block' }}>服务申请 ({detailData.serviceRequests.length})</Typography.Text>
                    {detailData.serviceRequests.length > 0 ? <ProTable size="small" dataSource={detailData.serviceRequests} rowKey="id" search={false} pagination={false} options={false} toolBarRender={false} style={{ marginBottom: 24 }} columns={[{ title: '标题', dataIndex: 'title', ellipsis: true }, { title: '类别', dataIndex: 'categoryName', width: 80 }, { title: '状态', dataIndex: 'status', width: 80, render: (_: any, r: ServiceRequest) => { const s = r.status as string; const statusMap: Record<string, { label: string; color: string }> = { Pending: { label: '待处理', color: 'orange' }, Processing: { label: '处理中', color: 'processing' }, Completed: { label: '已完成', color: 'green' }, Cancelled: { label: '已取消', color: 'default' } }; return <Tag color={statusMap[s]?.color}>{statusMap[s]?.label || s}</Tag>; } }, { title: '评分', dataIndex: 'rating', width: 100, render: (_: any, r: ServiceRequest) => r.rating ? <Rate disabled value={r.rating} style={{ fontSize: 12 }} /> : '-' }, { title: '创建时间', dataIndex: 'createdAt', width: 100, render: (_: any, r: ServiceRequest) => dayjs(r.createdAt).format('MM-DD HH:mm') }]} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无服务申请" />}

                    <Typography.Text strong style={{ fontSize: 16, marginBottom: 12, display: 'block' }}>缴费记录 ({detailData.payments.length})</Typography.Text>
                    {detailData.payments.length > 0 ? <ProTable size="small" dataSource={detailData.payments} rowKey="id" search={false} pagination={false} options={false} toolBarRender={false} columns={[{ title: '合同', dataIndex: 'contractNumber', width: 100 }, { title: '类型', dataIndex: 'paymentType', width: 80, render: (_: any, r: LeasePaymentRecord & { contractNumber?: string }) => { const t = r.paymentType as string; const typeMap: Record<string, { label: string; color: string }> = { Rent: { label: '房租', color: 'blue' }, PropertyFee: { label: '物业费', color: 'orange' }, Deposit: { label: '押金', color: 'purple' }, Other: { label: '其他', color: 'default' } }; return <Tag color={typeMap[t]?.color || 'default'}>{typeMap[t]?.label || t || '房租'}</Tag>; } }, { title: '金额', dataIndex: 'amount', width: 100, render: (_: any, r: LeasePaymentRecord & { contractNumber?: string }) => <Typography.Text type="success">¥{(r.amount as number)?.toLocaleString()}</Typography.Text> }, { title: '缴费日期', dataIndex: 'paymentDate', width: 100, render: (_: any, r: LeasePaymentRecord & { contractNumber?: string }) => dayjs(r.paymentDate).format('YYYY-MM-DD') }, { title: '方式', dataIndex: 'paymentMethod', width: 80 }, { title: '备注', dataIndex: 'notes', ellipsis: true }]} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无缴费记录" />}
                </div>}
            </Drawer>
        </PageContainer>
    );
};

export default TenantManagement;
