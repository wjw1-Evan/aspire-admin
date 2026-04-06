import React, { useRef, useState, useEffect } from 'react';
import { PageContainer, StatCard } from '@/components';
import { useIntl, request } from '@umijs/max';
import { Tag, Space, Card, Row, Col, Button, Popconfirm, Drawer, Descriptions, Typography, AutoComplete, Input, Divider, Form, App } from 'antd';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import { ModalForm, ProFormText, ProFormSelect, ProFormDateTimePicker } from '@ant-design/pro-form';
import { PlusOutlined, ReloadOutlined, UserOutlined, CheckCircleOutlined, SyncOutlined, CloseCircleOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ApiResponse, PagedResult, PageParams } from '@/types/api-response';

interface VisitTask { id: string; title: string; visitType: string; visitMethod?: string; tenantId?: string; tenantName?: string; managerName?: string; phone?: string; visitDate?: string; visitLocation?: string; intervieweeName?: string; intervieweePosition?: string; intervieweePhone?: string; visitor?: string; details?: string; status: string; content?: string; feedback?: string; createdAt: string; updatedAt?: string; }
interface VisitStatistics { pendingTasks: number; completedTasksThisMonth: number; activeManagers: number; completionRate: number; }
interface ParkTenant { id: string; tenantName: string; }
interface VisitTaskFormData { title: string; managerName: string; phone?: string; visitType: string; visitMethod: string; details?: string; tenantName: string; visitLocation?: string; intervieweeName?: string; intervieweePosition?: string; intervieweePhone?: string; visitDate: string; visitor?: string; status?: string; content?: string; feedback?: string; }

const api = {
    list: (params: PageParams) => request<ApiResponse<PagedResult<VisitTask>>>('/api/visit/tasks', { params }),
    get: (id: string) => request<ApiResponse<VisitTask>>(`/api/visit/tasks/${id}`),
    delete: (id: string) => request<ApiResponse<void>>(`/api/visit/tasks/${id}`, { method: 'DELETE' }),
    create: (data: VisitTaskFormData) => request<ApiResponse<VisitTask>>('/api/visit/tasks', { method: 'POST', data }),
    update: (id: string, data: VisitTaskFormData) => request<ApiResponse<VisitTask>>(`/api/visit/tasks/${id}`, { method: 'PUT', data }),
    statistics: () => request<ApiResponse<VisitStatistics>>('/api/visit/statistics'),
    tenants: (params: PageParams) => request<ApiResponse<PagedResult<ParkTenant>>>('/api/park/tenants', { params }),
};

const statusMap: Record<string, { text: string; color: string; icon: React.ReactNode }> = {
    'Pending': { text: '待派发', color: 'orange', icon: <SyncOutlined spin /> },
    'InProgress': { text: '进行中', color: 'blue', icon: <SyncOutlined spin /> },
    'Completed': { text: '已完成', color: 'success', icon: <CheckCircleOutlined /> },
    'Cancelled': { text: '已取消', color: 'error', icon: <CloseCircleOutlined /> },
};

const VisitTaskPage: React.FC = () => {
    const intl = useIntl();
    const { message } = App.useApp();
    const actionRef = useRef<ActionType | undefined>(undefined);
    const [state, setState] = useState({
        statistics: null as VisitStatistics | null, formVisible: false, editingTask: null as VisitTask | null,
        detailVisible: false, selectedTask: null as VisitTask | null, tenants: [] as ParkTenant[],
        sorter: undefined as { sortBy: string; sortOrder: string } | undefined, searchText: '',
    });
    const set = (partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial }));

    useEffect(() => { api.tenants({ page: 1, pageSize: 100 }).then(r => { if (r.success && r.data) set({ tenants: r.data.queryable }); }); }, []);

    const columns: ProColumns<VisitTask>[] = [
        { title: '任务标题', dataIndex: 'title', key: 'title', sorter: true, width: 200, ellipsis: true, render: (dom: any, r: VisitTask) => <a onClick={() => set({ selectedTask: r, detailVisible: true })}>{dom}</a> },
        { title: '走访类型', dataIndex: 'visitType', key: 'visitType', sorter: true, width: 120 },
        { title: '受访企业', dataIndex: 'tenantName', key: 'tenantName', sorter: true, width: 150, ellipsis: true, render: (dom: any) => dom || '-' },
        { title: '企管员', dataIndex: 'managerName', key: 'managerName', sorter: true, width: 120 },
        { title: '走访日期', dataIndex: 'visitDate', key: 'visitDate', sorter: true, width: 120, render: (dom: any) => dom ? dayjs(dom).format('YYYY-MM-DD') : '-' },
        { title: '状态', dataIndex: 'status', key: 'status', sorter: true, width: 100, render: (_: any, r: VisitTask) => { const config = statusMap[r.status] || { text: r.status, color: 'default', icon: null }; return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>; } },
        { title: '操作', valueType: 'option', fixed: 'right', width: 160, render: (_: any, r: VisitTask) => [
            <Button key="view" type="link" size="small" icon={<EyeOutlined />} onClick={() => set({ selectedTask: r, detailVisible: true })}>查看</Button>,
            r.status !== 'Completed' && <Button key="edit" type="link" size="small" icon={<EditOutlined />} onClick={() => set({ editingTask: r, formVisible: true })}>编辑</Button>,
            r.status !== 'Completed' && <Popconfirm key="delete" title="确定要删除这条走访任务吗？" onConfirm={() => handleDelete(r.id)} okText="确定" cancelText="取消"><Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button></Popconfirm>,
        ]},
    ];

    const handleDelete = async (id: string) => { const res = await api.delete(id); if (res.success) { message.success('删除成功'); actionRef.current?.reload(); api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); } };

    return (
        <PageContainer title="走访任务管理" extra={
            <Space><Button icon={<ReloadOutlined />} onClick={() => actionRef.current?.reload()}>刷新</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => set({ editingTask: null, formVisible: true })}>新增任务</Button></Space>
        }>
            {state.statistics && <Card style={{ marginBottom: 16 }}><Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={6}><StatCard title="待处理任务" value={state.statistics.pendingTasks} icon={<SyncOutlined />} color="#faad14" /></Col>
                <Col xs={24} sm={12} md={6}><StatCard title="本月走访数" value={state.statistics.completedTasksThisMonth} icon={<CheckCircleOutlined />} color="#52c41a" /></Col>
                <Col xs={24} sm={12} md={6}><StatCard title="活跃企管员" value={state.statistics.activeManagers} icon={<UserOutlined />} color="#1890ff" /></Col>
                <Col xs={24} sm={12} md={6}><StatCard title="完成率" value={`${state.statistics.completionRate}%`} icon={<SyncOutlined />} color={state.statistics.completionRate >= 90 ? '#52c41a' : '#faad14'} /></Col>
            </Row></Card>}

            <ProTable actionRef={actionRef} request={async (params: any) => {
                const { pageSize, current } = params; const sortParams = state.sorter?.sortBy && state.sorter?.sortOrder ? state.sorter : undefined;
                const res = await api.list({ page: current, pageSize, search: state.searchText, ...sortParams });
                api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); });
                return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
            }} columns={columns} rowKey="id" search={false} pagination={{ pageSizeOptions: ['10', '20', '50', '100'], defaultPageSize: 20 }}
                onChange={(_p, _f, s: any) => set({ sorter: s?.order ? { sortBy: s.field, sortOrder: s.order === 'ascend' ? 'asc' : 'desc' } : undefined })}
            />

            <ModalForm key={state.editingTask?.id || 'create'} title={state.editingTask ? '编辑走访任务' : '新增走访任务'} open={state.formVisible}
                onOpenChange={(open) => { if (!open) set({ formVisible: false, editingTask: null }); }}
                initialValues={state.editingTask ? { title: state.editingTask.title, managerName: state.editingTask.managerName, phone: state.editingTask.phone, visitType: state.editingTask.visitType, visitMethod: state.editingTask.visitMethod || '实地走访', details: state.editingTask.details, tenantName: state.editingTask.tenantName || '', visitLocation: state.editingTask.visitLocation, intervieweeName: state.editingTask.intervieweeName, intervieweePosition: state.editingTask.intervieweePosition, intervieweePhone: state.editingTask.intervieweePhone, visitDate: state.editingTask.visitDate ? dayjs(state.editingTask.visitDate) : undefined, visitor: state.editingTask.visitor, status: state.editingTask.status, content: state.editingTask.content, feedback: state.editingTask.feedback } : { visitType: '日常走访', visitMethod: '实地走访', visitDate: dayjs() }}
                onFinish={async (values) => {
                    const targetTenant = state.tenants.find(t => t.tenantName === values.tenantName);
                    let finalTenantId = targetTenant?.id;
                    if (state.editingTask && values.tenantName === state.editingTask.tenantName) finalTenantId = state.editingTask.tenantId;
                    const submitData = { ...values, visitDate: values.visitDate.toISOString(), tenantId: finalTenantId } as any;
                    const res = state.editingTask ? await api.update(state.editingTask.id, submitData) : await api.create(submitData);
                    if (res.success) { set({ formVisible: false, editingTask: null }); actionRef.current?.reload(); api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); }
                    return res.success;
                }} autoFocusFirstInput width={640}>
                <div style={{ marginBottom: 16 }}><Typography.Text type="secondary">基本信息</Typography.Text></div>
                <ProFormText name="title" label="任务标题" placeholder="如：XX企业日常走访" rules={[{ required: true, message: '请输入任务标题' }]} />
                <Row gutter={16}><Col span={12}><ProFormText name="managerName" label="企管员" placeholder="请输入姓名" rules={[{ required: true, message: '请输入企管员姓名' }]} /></Col><Col span={12}><ProFormText name="phone" label="手机号" placeholder="请输入手机号" /></Col></Row>
                <Row gutter={16}><Col span={12}><ProFormSelect name="visitType" label="走访类型" initialValue="日常走访" options={[{ value: '日常走访', label: '日常走访' }, { value: '安全检查', label: '安全检查' }, { value: '政策宣讲', label: '政策宣讲' }, { value: '需求调研', label: '需求调研' }, { value: '其他', label: '其他' }]} /></Col><Col span={12}><ProFormSelect name="visitMethod" label="走访方式" initialValue="实地走访" options={[{ value: '实地走访', label: '实地走访' }, { value: '电话沟通', label: '电话沟通' }, { value: '微信联系', label: '微信联系' }]} /></Col></Row>
                <ProFormText name="details" label="计划说明" placeholder="请输入计划说明或初始备注" />
                <Row gutter={16}><Col span={12}><div style={{ marginBottom: 8 }}><Typography.Text type="secondary" style={{ fontSize: 12 }}>受访企业 <span style={{ color: '#ff4d4f' }}>*</span></Typography.Text></div><Form.Item name="tenantName" rules={[{ required: true, message: '请输入或选择受访企业' }]}><AutoComplete placeholder="请输入或选择企业" options={state.tenants.map(t => ({ value: t.tenantName }))} /></Form.Item></Col><Col span={12}><ProFormText name="visitLocation" label="走访地点" placeholder="地址/会议室" /></Col></Row>
                <Row gutter={16}><Col span={8}><ProFormText name="intervieweeName" label="受访人姓名" placeholder="姓名" /></Col><Col span={8}><ProFormText name="intervieweePosition" label="职务" placeholder="职位" /></Col><Col span={8}><ProFormText name="intervieweePhone" label="联系方式" placeholder="电话/微信" /></Col></Row>
                <Row gutter={16}><Col span={12}><ProFormDateTimePicker name="visitDate" label="走访时间" rules={[{ required: true, message: '请选择走访时间' }]} fieldProps={{ style: { width: '100%' }, format: 'YYYY-MM-DD HH:mm' }} placeholder="请选择走访时间" /></Col><Col span={12}><ProFormText name="visitor" label="执行走访人" placeholder="实际走访人" /></Col></Row>
                {state.editingTask && (<><Row gutter={16}><Col span={12}><ProFormSelect name="status" label="任务状态" options={[{ value: 'Pending', label: '待派发' }, { value: 'InProgress', label: '进行中' }, { value: 'Completed', label: '已完成' }, { value: 'Cancelled', label: '已取消' }]} /></Col></Row><ProFormText name="content" label="走访纪要" placeholder="详细记录走访沟通内容" /><ProFormText name="feedback" label="企业诉求/反馈" placeholder="企业提出的问题或建议" /></>)}
            </ModalForm>

            <Drawer title="走访任务详情" placement="right" open={state.detailVisible} onClose={() => set({ detailVisible: false, selectedTask: null })} size={640}
                extra={<Space><Button onClick={() => set({ detailVisible: false })}>关闭</Button><Button type="primary" icon={<EditOutlined />} onClick={() => { set({ detailVisible: false, editingTask: state.selectedTask, formVisible: true }); }}>编辑</Button></Space>}>
                {state.selectedTask ? (<Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <Descriptions title="基本信息" bordered column={2}>
                        <Descriptions.Item label="任务标题" span={2}>{state.selectedTask.title}</Descriptions.Item>
                        <Descriptions.Item label="走访类型">{state.selectedTask.visitType}</Descriptions.Item>
                        <Descriptions.Item label="走访方式">{state.selectedTask.visitMethod}</Descriptions.Item>
                        <Descriptions.Item label="企管员">{state.selectedTask.managerName}</Descriptions.Item>
                        <Descriptions.Item label="联系电话">{state.selectedTask.phone}</Descriptions.Item>
                        <Descriptions.Item label="任务状态"><Tag color={statusMap[state.selectedTask.status]?.color} icon={statusMap[state.selectedTask.status]?.icon}>{statusMap[state.selectedTask.status]?.text}</Tag></Descriptions.Item>
                        <Descriptions.Item label="创建时间">{dayjs(state.selectedTask.createdAt).format('YYYY-MM-DD')}</Descriptions.Item>
                        <Descriptions.Item label="计划说明" span={2}>{state.selectedTask.details || '-'}</Descriptions.Item>
                    </Descriptions>
                    <Descriptions title="受访信息" bordered column={2}>
                        <Descriptions.Item label="受访企业" span={2}>{state.selectedTask.tenantName || '-'}</Descriptions.Item>
                        <Descriptions.Item label="受访人">{state.selectedTask.intervieweeName || '-'}</Descriptions.Item>
                        <Descriptions.Item label="职务">{state.selectedTask.intervieweePosition || '-'}</Descriptions.Item>
                        <Descriptions.Item label="走访地点" span={2}>{state.selectedTask.visitLocation || '-'}</Descriptions.Item>
                        <Descriptions.Item label="走访时间">{state.selectedTask.visitDate ? dayjs(state.selectedTask.visitDate).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
                        <Descriptions.Item label="执行人">{state.selectedTask.visitor || '-'}</Descriptions.Item>
                    </Descriptions>
                    <Descriptions title="走访结果" bordered column={1}>
                        <Descriptions.Item label="走访纪要"><Typography.Text style={{ whiteSpace: 'pre-wrap' }}>{state.selectedTask.content || '暂无记录'}</Typography.Text></Descriptions.Item>
                        <Descriptions.Item label="企业诉求/反馈"><Typography.Text style={{ whiteSpace: 'pre-wrap' }}>{state.selectedTask.feedback || '暂无反馈'}</Typography.Text></Descriptions.Item>
                    </Descriptions>
                </Space>) : null}
            </Drawer>
        </PageContainer>
    );
};

export default VisitTaskPage;
