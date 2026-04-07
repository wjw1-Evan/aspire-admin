import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { useIntl, request } from '@umijs/max';
import { Form, Input, Select, Button, App, Space, Row, Col, Tag, Typography, InputNumber, Tabs, Popconfirm, DatePicker, Flex, Progress } from 'antd';
import { Drawer } from 'antd';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import { ModalForm, ProFormText, ProFormSelect, ProFormDatePicker, ProFormDigit, ProFormTextArea } from '@ant-design/pro-form';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, SwapOutlined, TeamOutlined, ProjectOutlined, PhoneOutlined, SearchOutlined } from '@ant-design/icons';
import { ProDescriptions } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import { ApiResponse, PagedResult, PageParams } from '@/types';

const { Text } = Typography;

interface InvestmentLead { id: string; companyName: string; contactPerson?: string; phone?: string; email?: string; industry?: string; source: string; intendedArea?: number; status: string; priority: string; assignedTo?: string; assignedToName?: string; nextFollowUpDate?: string; budget?: number; requirements?: string; createdAt: string; }
interface InvestmentProject { id: string; leadId?: string; projectName: string; companyName: string; contactPerson?: string; phone?: string; intendedArea?: number; proposedRent?: number; stage: string; expectedSignDate?: string; probability?: number; notes?: string; assignedTo?: string; assignedToName?: string; createdAt: string; }
interface InvestmentStatistics { totalLeads: number; newLeadsThisMonth: number; totalProjects: number; projectsInNegotiation: number; signedProjects: number; conversionRate: number; leadsByStatus: Record<string, number>; projectsByStage: Record<string, number>; }

const api = {
    getStatistics: () => request<ApiResponse<InvestmentStatistics>>('/api/park/investment/statistics'),
    getLeads: (params: PageParams) => request<ApiResponse<PagedResult<InvestmentLead>>>('/api/park/investment/leads/list', { params }),
    createLead: (data: Partial<InvestmentLead>) => request<ApiResponse<InvestmentLead>>('/api/park/investment/leads', { method: 'POST', data }),
    updateLead: (id: string, data: Partial<InvestmentLead>) => request<ApiResponse<InvestmentLead>>(`/api/park/investment/leads/${id}`, { method: 'PUT', data }),
    deleteLead: (id: string) => request<ApiResponse<boolean>>(`/api/park/investment/leads/${id}`, { method: 'DELETE' }),
    convertLeadToProject: (id: string) => request<ApiResponse<InvestmentProject>>(`/api/park/investment/leads/${id}/convert`, { method: 'POST' }),
    getProjects: (params: PageParams) => request<ApiResponse<PagedResult<InvestmentProject>>>('/api/park/investment/projects/list', { params }),
    createProject: (data: Partial<InvestmentProject>) => request<ApiResponse<InvestmentProject>>('/api/park/investment/projects', { method: 'POST', data }),
    updateProject: (id: string, data: Partial<InvestmentProject>) => request<ApiResponse<InvestmentProject>>(`/api/park/investment/projects/${id}`, { method: 'PUT', data }),
    deleteProject: (id: string) => request<ApiResponse<boolean>>(`/api/park/investment/projects/${id}`, { method: 'DELETE' }),
};

const priorityOptions = [{ label: '高', value: 'High', color: 'red' }, { label: '中', value: 'Medium', color: 'orange' }, { label: '低', value: 'Low', color: 'green' }];
const leadStatusOptions = [{ label: '新建', value: 'New', color: 'blue' }, { label: '跟进中', value: 'Following', color: 'processing' }, { label: '已报价', value: 'Quoted', color: 'orange' }, { label: '已成交', value: 'Qualified', color: 'green' }, { label: '已流失', value: 'Lost', color: 'default' }];
const projectStageOptions = [{ label: '初步接洽', value: 'Initial', color: 'blue' }, { label: '需求分析', value: 'Analysis', color: 'cyan' }, { label: '方案制定', value: 'Proposal', color: 'orange' }, { label: '商务谈判', value: 'Negotiation', color: 'gold' }, { label: '合同签订', value: 'Contract', color: 'lime' }, { label: '已完成', value: 'Completed', color: 'green' }, { label: '已终止', value: 'Cancelled', color: 'default' }];
const sourceMap: Record<string, string> = { Direct: '直接咨询', Referral: '客户推荐', Exhibition: '展会', Website: '官网', Other: '其他' };

const InvestmentManagement: React.FC = () => {
    const intl = useIntl();
    const { message } = App.useApp();
    const leadsActionRef = useRef<ActionType | undefined>(undefined);
    const projectsActionRef = useRef<ActionType | undefined>(undefined);
    const [state, setState] = useState({
        statistics: null as InvestmentStatistics | null, activeTab: 'leads', leadModalVisible: false, projectModalVisible: false,
        leadDetailVisible: false, projectDetailVisible: false, currentLead: null as InvestmentLead | null,
        currentProject: null as InvestmentProject | null, editingLead: null as InvestmentLead | null, editingProject: null as InvestmentProject | null,
        sorter: undefined as { sortBy: string; sortOrder: string } | undefined,
        search: '',
    });
    const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

    useEffect(() => { api.getStatistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); }, []);
    useEffect(() => { if (state.activeTab === 'leads') leadsActionRef.current?.reload(); else projectsActionRef.current?.reload(); }, [state.activeTab]);

    const handleRefresh = () => { api.getStatistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); if (state.activeTab === 'leads') leadsActionRef.current?.reload(); else projectsActionRef.current?.reload(); };
    const handleDeleteLead = async (id: string) => { const res = await api.deleteLead(id); if (res.success) { message.success('删除成功'); leadsActionRef.current?.reload(); handleRefresh(); } else message.error('删除失败'); };
    const handleDeleteProject = async (id: string) => { const res = await api.deleteProject(id); if (res.success) { message.success('删除成功'); projectsActionRef.current?.reload(); handleRefresh(); } else message.error('删除失败'); };
    const handleConvertToProject = async (leadId: string) => { const res = await api.convertLeadToProject(leadId); if (res.success) { message.success('转换成功'); set({ activeTab: 'projects' }); leadsActionRef.current?.reload(); projectsActionRef.current?.reload(); handleRefresh(); } else message.error('转换失败'); };

    const leadColumns: ProColumns<InvestmentLead>[] = [
        { title: intl.formatMessage({ id: 'pages.park.investment.lead.company', defaultMessage: '意向企业' }), dataIndex: 'companyName', sorter: true, width: 180, render: (_, record) => (<Space onClick={() => set({ currentLead: record, leadDetailVisible: true })} style={{ cursor: 'pointer', color: '#1890ff' }}><TeamOutlined /><Text strong style={{ color: 'inherit' }}>{record.companyName}</Text></Space>) },
        { title: intl.formatMessage({ id: 'pages.park.investment.lead.contact', defaultMessage: '联系人' }), dataIndex: 'contactPerson', sorter: true, width: 120, render: (text, record) => (<Flex vertical gap={0}><Text>{text || '-'}</Text>{record.phone && <Text type="secondary" style={{ fontSize: 12 }}><PhoneOutlined /> {record.phone}</Text>}</Flex>) },
        { title: intl.formatMessage({ id: 'pages.park.investment.lead.industry', defaultMessage: '行业' }), dataIndex: 'industry', sorter: true, width: 100, render: (text) => text || '-' },
        { title: intl.formatMessage({ id: 'pages.park.investment.lead.source', defaultMessage: '来源' }), dataIndex: 'source', sorter: true, width: 100, render: (source) => <Tag>{sourceMap[source as string] || source}</Tag> },
        { title: intl.formatMessage({ id: 'pages.park.investment.lead.intendedArea', defaultMessage: '意向面积' }), dataIndex: 'intendedArea', sorter: true, width: 100, align: 'right', render: (area) => area ? `${area} m²` : '-' },
        { title: intl.formatMessage({ id: 'pages.park.investment.lead.priority', defaultMessage: '优先级' }), dataIndex: 'priority', sorter: true, width: 80, render: (priority) => { const opt = priorityOptions.find(o => o.value === priority); return <Tag color={opt?.color || 'default'}>{opt?.label || priority}</Tag>; } },
        { title: intl.formatMessage({ id: 'pages.park.investment.lead.status', defaultMessage: '状态' }), dataIndex: 'status', sorter: true, width: 100, render: (status) => { const opt = leadStatusOptions.find(o => o.value === status); return <Tag color={opt?.color || 'default'}>{opt?.label || status}</Tag>; } },
        { title: intl.formatMessage({ id: 'pages.park.investment.lead.nextFollowUp', defaultMessage: '下次跟进' }), dataIndex: 'nextFollowUpDate', sorter: true, width: 110, render: (date) => date ? dayjs(date as string).format('YYYY-MM-DD') : '-' },
        { title: intl.formatMessage({ id: 'common.action', defaultMessage: '操作' }), valueType: 'option', width: 180, fixed: 'right', render: (_, record) => (<Space>
            <Button type="link" icon={<EditOutlined />} onClick={() => set({ editingLead: record, leadModalVisible: true })}>{intl.formatMessage({ id: 'common.edit', defaultMessage: '编辑' })}</Button>
            <Button type="link" size="small" icon={<SwapOutlined />} onClick={() => handleConvertToProject(record.id)} disabled={record.status === 'Lost' || record.status === 'Qualified'}>{intl.formatMessage({ id: 'pages.park.investment.convertToProject', defaultMessage: '转为项目' })}</Button>
            <Popconfirm title={intl.formatMessage({ id: 'common.confirmDelete', defaultMessage: '确认删除？' })} onConfirm={() => handleDeleteLead(record.id)}><Button type="link" danger icon={<DeleteOutlined />}>{intl.formatMessage({ id: 'common.delete', defaultMessage: '删除' })}</Button></Popconfirm>
        </Space>) },
    ];

    const projectColumns: ProColumns<InvestmentProject>[] = [
        { title: intl.formatMessage({ id: 'pages.park.investment.project.name', defaultMessage: '项目名称' }), dataIndex: 'projectName', sorter: true, width: 200, render: (_, record) => (<Space onClick={() => set({ currentProject: record, projectDetailVisible: true })} style={{ cursor: 'pointer', color: '#52c41a' }}><ProjectOutlined /><Text strong style={{ color: 'inherit' }}>{record.projectName}</Text></Space>) },
        { title: intl.formatMessage({ id: 'pages.park.investment.project.company', defaultMessage: '企业名称' }), dataIndex: 'companyName', sorter: true, width: 150 },
        { title: intl.formatMessage({ id: 'pages.park.investment.project.contact', defaultMessage: '联系人' }), dataIndex: 'contactPerson', sorter: true, width: 100 },
        { title: intl.formatMessage({ id: 'pages.park.investment.project.area', defaultMessage: '意向面积' }), dataIndex: 'intendedArea', sorter: true, width: 100, align: 'right', render: (area) => area ? `${area} m²` : '-' },
        { title: intl.formatMessage({ id: 'pages.park.investment.project.rent', defaultMessage: '报价租金' }), dataIndex: 'proposedRent', sorter: true, width: 120, align: 'right', render: (rent) => rent ? `¥${rent?.toLocaleString()}/月` : '-' },
        { title: intl.formatMessage({ id: 'pages.park.investment.project.stage', defaultMessage: '阶段' }), dataIndex: 'stage', sorter: true, width: 100, render: (stage) => { const opt = projectStageOptions.find(o => o.value === stage); return <Tag color={opt?.color || 'default'}>{opt?.label || stage}</Tag>; } },
        { title: intl.formatMessage({ id: 'pages.park.investment.project.probability', defaultMessage: '成功率' }), dataIndex: 'probability', sorter: true, width: 100, render: (prob) => prob ? <Progress percent={prob as number} size="small" style={{ width: 80 }} /> : '-' },
        { title: intl.formatMessage({ id: 'pages.park.investment.project.expectedDate', defaultMessage: '预计签约' }), dataIndex: 'expectedSignDate', sorter: true, width: 110, render: (date) => date ? dayjs(date as string).format('YYYY-MM-DD') : '-' },
        { title: intl.formatMessage({ id: 'common.action', defaultMessage: '操作' }), valueType: 'option', width: 150, fixed: 'right', render: (_, record) => (<Space>
            <Button type="link" icon={<EditOutlined />} onClick={() => set({ editingProject: record, projectModalVisible: true })}>{intl.formatMessage({ id: 'common.edit', defaultMessage: '编辑' })}</Button>
            <Popconfirm title={intl.formatMessage({ id: 'common.confirmDelete', defaultMessage: '确认删除？' })} onConfirm={() => handleDeleteProject(record.id)}><Button type="link" danger icon={<DeleteOutlined />}>{intl.formatMessage({ id: 'common.delete', defaultMessage: '删除' })}</Button></Popconfirm>
        </Space>) },
    ];

    return (
        <PageContainer title={intl.formatMessage({ id: 'pages.park.investment.title', defaultMessage: '招商管理' })}
            breadcrumb={{ routes: [{ path: '/', breadcrumbName: '首页' }, { path: '/park', breadcrumbName: '园区管理' }, { path: '/park/investment', breadcrumbName: '招商管理' }] }}
        >
            {state.statistics && <ProCard gutter={16} style={{ marginBottom: 16 }}>
                <ProCard colSpan={{ xs: 24, sm: 12, md: 6 }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold' }}>{state.statistics.totalLeads}</div>
                    <div style={{ color: '#8c8c8c', fontSize: 12 }}>总线索数</div>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>本月新增: {state.statistics.newLeadsThisMonth}</Typography.Text>
                </ProCard>
                <ProCard colSpan={{ xs: 24, sm: 12, md: 6 }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>{state.statistics.totalProjects}</div>
                    <div style={{ color: '#8c8c8c', fontSize: 12 }}>项目总数</div>
                </ProCard>
                <ProCard colSpan={{ xs: 24, sm: 12, md: 6 }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#faad14' }}>{state.statistics.projectsInNegotiation}</div>
                    <div style={{ color: '#8c8c8c', fontSize: 12 }}>谈判中</div>
                </ProCard>
                <ProCard colSpan={{ xs: 24, sm: 12, md: 6 }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: state.statistics.conversionRate >= 30 ? '#52c41a' : state.statistics.conversionRate >= 15 ? '#faad14' : '#f5222d' }}>{state.statistics.conversionRate}%</div>
                    <div style={{ color: '#8c8c8c', fontSize: 12 }}>转化率</div>
                </ProCard>
            </ProCard>}

            <ProCard>
                <Tabs activeKey={state.activeTab} onChange={(key) => set({ activeTab: key })} items={[
                    { key: 'leads', label: <Space><TeamOutlined />{intl.formatMessage({ id: 'pages.park.investment.leads', defaultMessage: '招商线索' })}</Space>, children: <ProTable<InvestmentLead> actionRef={leadsActionRef} request={async (params: any) => { const { current, pageSize } = params; const sortParams = state.sorter?.sortBy && state.sorter?.sortOrder ? state.sorter : undefined; const res = await api.getLeads({ page: current, pageSize, search: state.search, ...sortParams }); return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success }; }} columns={leadColumns} rowKey="id" search={false} onChange={(_p, _f, s: any) => set({ sorter: s?.order ? { sortBy: s.field, sortOrder: s.order === 'ascend' ? 'asc' : 'desc' } : undefined })} toolBarRender={() => [<Input.Search key="search" placeholder="搜索..." allowClear value={state.search} onChange={(e) => set({ search: e.target.value })} onSearch={(v) => { set({ search: v }); leadsActionRef.current?.reload(); }} style={{ width: 260, marginRight: 8 }} prefix={<SearchOutlined />} />, <Button key="refresh" icon={<ReloadOutlined />} onClick={handleRefresh}>刷新</Button>, <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => set({ editingLead: null, leadModalVisible: true })}>新增线索</Button>]} scroll={{ x: 1400 }} /> },
                    { key: 'projects', label: <Space><ProjectOutlined />{intl.formatMessage({ id: 'pages.park.investment.projects', defaultMessage: '招商项目' })}</Space>, children: <ProTable<InvestmentProject> actionRef={projectsActionRef} request={async (params: any) => { const { current, pageSize } = params; const sortParams = state.sorter?.sortBy && state.sorter?.sortOrder ? state.sorter : undefined; const res = await api.getProjects({ page: current, pageSize, search: state.search, ...sortParams }); return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success }; }} columns={projectColumns} rowKey="id" search={false} onChange={(_p, _f, s: any) => set({ sorter: s?.order ? { sortBy: s.field, sortOrder: s.order === 'ascend' ? 'asc' : 'desc' } : undefined })} toolBarRender={() => [<Input.Search key="search" placeholder="搜索..." allowClear value={state.search} onChange={(e) => set({ search: e.target.value })} onSearch={(v) => { set({ search: v }); projectsActionRef.current?.reload(); }} style={{ width: 260, marginRight: 8 }} prefix={<SearchOutlined />} />, <Button key="refresh" icon={<ReloadOutlined />} onClick={handleRefresh}>刷新</Button>, <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => set({ editingProject: null, projectModalVisible: true })}>新增项目</Button>]} scroll={{ x: 1300 }} /> },
                ]} />
            </ProCard>

            <ModalForm key={state.editingLead?.id || 'create-lead'} title={state.editingLead ? intl.formatMessage({ id: 'pages.park.investment.editLead', defaultMessage: '编辑线索' }) : intl.formatMessage({ id: 'pages.park.investment.addLead', defaultMessage: '新增线索' })}
                open={state.leadModalVisible} onOpenChange={(open) => { if (!open) set({ leadModalVisible: false, editingLead: null }); }}
                initialValues={state.editingLead ? { companyName: state.editingLead.companyName, industry: state.editingLead.industry, contactPerson: state.editingLead.contactPerson, phone: state.editingLead.phone, email: state.editingLead.email, source: state.editingLead.source ? [state.editingLead.source] : [], priority: state.editingLead.priority, intendedArea: state.editingLead.intendedArea, budget: state.editingLead.budget, nextFollowUpDate: state.editingLead.nextFollowUpDate ? dayjs(state.editingLead.nextFollowUpDate) : undefined, requirements: state.editingLead.requirements } : undefined}
                onFinish={async (values) => {
                    const data: Partial<InvestmentLead> = { ...values, source: Array.isArray(values.source) ? values.source[0] : values.source, nextFollowUpDate: values.nextFollowUpDate?.toISOString() };
                    const res = state.editingLead ? await api.updateLead(state.editingLead.id, data) : await api.createLead(data);
                    if (res.success) { message.success(state.editingLead ? '更新成功' : '创建成功'); set({ leadModalVisible: false, editingLead: null }); leadsActionRef.current?.reload(); handleRefresh(); }
                    return res.success;
                }} autoFocusFirstInput width={640}>
                <Row gutter={16}><Col span={12}><ProFormText name="companyName" label="企业名称" placeholder="请输入企业名称" rules={[{ required: true, message: '请输入企业名称' }]} /></Col><Col span={12}><ProFormText name="industry" label="行业" placeholder="请输入行业" /></Col></Row>
                <Row gutter={16}><Col span={8}><ProFormText name="contactPerson" label="联系人" placeholder="联系人姓名" /></Col><Col span={8}><ProFormText name="phone" label="电话" placeholder="联系电话" /></Col><Col span={8}><ProFormText name="email" label="邮箱" placeholder="邮箱地址" /></Col></Row>
                <Row gutter={16}><Col span={8}><ProFormSelect name="source" label="来源" placeholder="请选择" options={[{ label: '直接咨询', value: 'Direct' }, { label: '客户推荐', value: 'Referral' }, { label: '展会', value: 'Exhibition' }, { label: '官网', value: 'Website' }, { label: '其他', value: 'Other' }]} /></Col><Col span={8}><ProFormSelect name="priority" label="优先级" placeholder="请选择" options={priorityOptions.map(o => ({ label: o.label, value: o.value }))} /></Col><Col span={8}><ProFormDigit name="intendedArea" label="意向面积 (m²)" min={0} placeholder="意向面积" /></Col></Row>
                <Row gutter={16}><Col span={12}><ProFormDigit name="budget" label="预算 (元/月)" min={0} placeholder="预算" /></Col><Col span={12}><ProFormDatePicker name="nextFollowUpDate" label="下次跟进日期" /></Col></Row>
                <ProFormTextArea name="requirements" label="需求描述" placeholder="请输入需求描述" />
            </ModalForm>

            <ModalForm key={state.editingProject?.id || 'create-project'} title={state.editingProject ? intl.formatMessage({ id: 'pages.park.investment.editProject', defaultMessage: '编辑项目' }) : intl.formatMessage({ id: 'pages.park.investment.addProject', defaultMessage: '新增项目' })}
                open={state.projectModalVisible} onOpenChange={(open) => { if (!open) set({ projectModalVisible: false, editingProject: null }); }}
                initialValues={state.editingProject ? { projectName: state.editingProject.projectName, companyName: state.editingProject.companyName, contactPerson: state.editingProject.contactPerson, phone: state.editingProject.phone, intendedArea: state.editingProject.intendedArea, proposedRent: state.editingProject.proposedRent, probability: state.editingProject.probability, stage: state.editingProject.stage ? [state.editingProject.stage] : [], expectedSignDate: state.editingProject.expectedSignDate ? dayjs(state.editingProject.expectedSignDate) : undefined, notes: state.editingProject.notes } : undefined}
                onFinish={async (values) => {
                    const data: Partial<InvestmentProject> = { ...values, stage: Array.isArray(values.stage) ? values.stage[0] : values.stage, expectedSignDate: values.expectedSignDate?.toISOString() };
                    const res = state.editingProject ? await api.updateProject(state.editingProject.id, data) : await api.createProject(data);
                    if (res.success) { message.success(state.editingProject ? '更新成功' : '创建成功'); set({ projectModalVisible: false, editingProject: null }); projectsActionRef.current?.reload(); handleRefresh(); }
                    return res.success;
                }} autoFocusFirstInput width={640}>
                <Row gutter={16}><Col span={12}><ProFormText name="projectName" label="项目名称" placeholder="请输入项目名称" rules={[{ required: true, message: '请输入项目名称' }]} /></Col><Col span={12}><ProFormText name="companyName" label="企业名称" placeholder="请输入企业名称" rules={[{ required: true, message: '请输入企业名称' }]} /></Col></Row>
                <Row gutter={16}><Col span={12}><ProFormText name="contactPerson" label="联系人" placeholder="联系人姓名" /></Col><Col span={12}><ProFormText name="phone" label="电话" placeholder="联系电话" /></Col></Row>
                <Row gutter={16}><Col span={8}><ProFormDigit name="intendedArea" label="意向面积 (m²)" min={0} placeholder="意向面积" /></Col><Col span={8}><ProFormDigit name="proposedRent" label="报价租金 (元/月)" min={0} placeholder="报价租金" /></Col><Col span={8}><ProFormDigit name="probability" label="成功率 (%)" min={0} max={100} placeholder="成功率" /></Col></Row>
                <Row gutter={16}><Col span={12}><ProFormSelect name="stage" label="项目阶段" placeholder="请选择" options={projectStageOptions.map(o => ({ label: o.label, value: o.value }))} /></Col><Col span={12}><ProFormDatePicker name="expectedSignDate" label="预计签约日期" /></Col></Row>
                <ProFormTextArea name="notes" label="备注" placeholder="请输入备注" />
            </ModalForm>

            <Drawer title="线索详情" width={600} open={state.leadDetailVisible} onClose={(open) => { if (!open) set({ leadDetailVisible: false, currentLead: null }); }}>
                {state.currentLead && (<ProDescriptions column={1} bordered size="small">
                    <ProDescriptions.Item label="企业名称">{state.currentLead.companyName}</ProDescriptions.Item>
                    <ProDescriptions.Item label="行业">{state.currentLead.industry || '-'}</ProDescriptions.Item>
                    <ProDescriptions.Item label="联系人">{state.currentLead.contactPerson || '-'}</ProDescriptions.Item>
                    <ProDescriptions.Item label="电话">{state.currentLead.phone || '-'}</ProDescriptions.Item>
                    <ProDescriptions.Item label="邮箱">{state.currentLead.email || '-'}</ProDescriptions.Item>
                    <ProDescriptions.Item label="来源">{sourceMap[state.currentLead.source] || state.currentLead.source}</ProDescriptions.Item>
                    <ProDescriptions.Item label="意向面积">{state.currentLead.intendedArea ? `${state.currentLead.intendedArea} m²` : '-'}</ProDescriptions.Item>
                    <ProDescriptions.Item label="优先级">{(() => { const opt = priorityOptions.find(o => o.value === state.currentLead?.priority); return <Tag color={opt?.color}>{opt?.label || state.currentLead?.priority}</Tag>; })()}</ProDescriptions.Item>
                    <ProDescriptions.Item label="当前状态">{(() => { const opt = leadStatusOptions.find(o => o.value === state.currentLead?.status); return <Tag color={opt?.color}>{opt?.label || state.currentLead?.status}</Tag>; })()}</ProDescriptions.Item>
                    <ProDescriptions.Item label="下次跟进日期">{state.currentLead.nextFollowUpDate ? dayjs(state.currentLead.nextFollowUpDate).format('YYYY-MM-DD') : '-'}</ProDescriptions.Item>
                    <ProDescriptions.Item label="创建时间">{dayjs(state.currentLead.createdAt).format('YYYY-MM-DD HH:mm')}</ProDescriptions.Item>
                </ProDescriptions>)}
            </Drawer>

            <Drawer title="项目详情" width={600} open={state.projectDetailVisible} onClose={(open) => { if (!open) set({ projectDetailVisible: false, currentProject: null }); }}>
                {state.currentProject && (<ProDescriptions column={1} bordered size="small">
                    <ProDescriptions.Item label="项目名称">{state.currentProject.projectName}</ProDescriptions.Item>
                    <ProDescriptions.Item label="企业名称">{state.currentProject.companyName}</ProDescriptions.Item>
                    <ProDescriptions.Item label="联系人">{state.currentProject.contactPerson || '-'}</ProDescriptions.Item>
                    <ProDescriptions.Item label="电话">{state.currentProject.phone || '-'}</ProDescriptions.Item>
                    <ProDescriptions.Item label="意向面积">{state.currentProject.intendedArea ? `${state.currentProject.intendedArea} m²` : '-'}</ProDescriptions.Item>
                    <ProDescriptions.Item label="报价租金">{state.currentProject.proposedRent ? `¥${state.currentProject.proposedRent?.toLocaleString()}/月` : '-'}</ProDescriptions.Item>
                    <ProDescriptions.Item label="当前阶段">{(() => { const opt = projectStageOptions.find(o => o.value === state.currentProject?.stage); return <Tag color={opt?.color}>{opt?.label || state.currentProject?.stage}</Tag>; })()}</ProDescriptions.Item>
                    <ProDescriptions.Item label="成功率"><Progress percent={state.currentProject.probability as number} size="small" /></ProDescriptions.Item>
                    <ProDescriptions.Item label="预计签约日期">{state.currentProject.expectedSignDate ? dayjs(state.currentProject.expectedSignDate).format('YYYY-MM-DD') : '-'}</ProDescriptions.Item>
                    <ProDescriptions.Item label="创建时间">{dayjs(state.currentProject.createdAt).format('YYYY-MM-DD HH:mm')}</ProDescriptions.Item>
                </ProDescriptions>)}
            </Drawer>
        </PageContainer>
    );
};

export default InvestmentManagement;
