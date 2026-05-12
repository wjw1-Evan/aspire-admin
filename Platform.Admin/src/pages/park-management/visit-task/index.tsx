import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl, request } from '@umijs/max';
import { Tag, Space, Row, Col, Button, Popconfirm, Typography, AutoComplete, Input, Divider, Form, App } from 'antd';
import { Drawer } from 'antd';
import { ProDescriptions } from '@ant-design/pro-components';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import { ModalForm, ProFormText, ProFormSelect, ProFormDateTimePicker } from '@ant-design/pro-form';
import { PlusOutlined, UserOutlined, CheckCircleOutlined, SyncOutlined, CloseCircleOutlined, EditOutlined, DeleteOutlined, EyeOutlined, SearchOutlined, TeamOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ApiResponse, PagedResult } from '@/types';

interface VisitTask { id: string; title: string; visitType: string; visitMethod?: string; tenantId?: string; tenantName?: string; managerName?: string; phone?: string; visitDate?: string; visitLocation?: string; intervieweeName?: string; intervieweePosition?: string; intervieweePhone?: string; visitor?: string; details?: string; status: string; content?: string; feedback?: string; createdAt: string; updatedAt?: string; }
interface VisitStatistics { pendingTasks: number; completedTasksThisMonth: number; activeManagers: number; completionRate: number; }
interface ParkTenant { id: string; tenantName: string; }
interface VisitTaskFormData { title: string; managerName: string; phone?: string; visitType: string; visitMethod: string; details?: string; tenantName: string; visitLocation?: string; intervieweeName?: string; intervieweePosition?: string; intervieweePhone?: string; visitDate: string; visitor?: string; status?: string; content?: string; feedback?: string; }

const api = {
    list: (params: any) => request<ApiResponse<PagedResult<VisitTask>>>('/apiservice/api/park-management/visit/tasks', { params }),
    get: (id: string) => request<ApiResponse<VisitTask>>(`/apiservice/api/park-management/visit/task/${id}`),
    delete: (id: string) => request<ApiResponse<void>>(`/apiservice/api/park-management/visit/task/${id}`, { method: 'DELETE' }),
    create: (data: VisitTaskFormData) => request<ApiResponse<VisitTask>>('/apiservice/api/park-management/visit/task', { method: 'POST', data }),
    update: (id: string, data: VisitTaskFormData) => request<ApiResponse<VisitTask>>(`/apiservice/api/park-management/visit/task/${id}`, { method: 'PUT', data }),
    statistics: () => request<ApiResponse<VisitStatistics>>('/apiservice/api/park-management/visit/statistics'),
    tenants: (params: any) => request<ApiResponse<PagedResult<ParkTenant>>>('/apiservice/api/park/tenants/list', { params }),
};

const statusMap: Record<string, { textId: string; defaultText: string; color: string; icon: React.ReactNode }> = {
    'Pending': { textId: 'pages.park.visitTask.status.pending', defaultText: '待派发', color: 'orange', icon: <SyncOutlined spin /> },
    'InProgress': { textId: 'pages.park.visitTask.status.inProgress', defaultText: '进行中', color: 'blue', icon: <SyncOutlined spin /> },
    'Completed': { textId: 'pages.park.visitTask.status.completed', defaultText: '已完成', color: 'success', icon: <CheckCircleOutlined /> },
    'Cancelled': { textId: 'pages.park.visitTask.status.cancelled', defaultText: '已取消', color: 'error', icon: <CloseCircleOutlined /> },
};

const VisitTaskPage: React.FC = () => {
    const intl = useIntl();
    const { message } = App.useApp();
    const actionRef = useRef<ActionType | undefined>(undefined);
    const [state, setState] = useState({
        statistics: null as VisitStatistics | null, formVisible: false, editingTask: null as VisitTask | null,
        detailVisible: false, selectedTask: null as VisitTask | null, detailLoading: false, tenants: [] as ParkTenant[],
        search: '',
    });
    const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

    useEffect(() => { api.tenants({}).then(r => { if (r.success && r.data) set({ tenants: r.data.queryable }); }).catch(() => { /* API 未实现，忽略错误 */ }); }, []);

    const handleViewTask = async (id: string) => {
        set({ selectedTask: null, detailVisible: true, detailLoading: true });
        try {
            const res = await api.get(id);
            if (res.success && res.data) {
                set({ selectedTask: res.data });
            }
        } catch (error) {
            console.error('Failed to load task details:', error);
        } finally {
            set({ detailLoading: false });
        }
    };

    const columns: ProColumns<VisitTask>[] = [
        { title: intl.formatMessage({ id: 'pages.park.visitTask.taskTitle' }), dataIndex: 'title', key: 'title', sorter: true, width: 200, ellipsis: true, render: (dom: any, r: VisitTask) => <a onClick={() => handleViewTask(r.id)}>{dom}</a> },
        { title: intl.formatMessage({ id: 'pages.park.visitTask.visitType' }), dataIndex: 'visitType', key: 'visitType', sorter: true, width: 120 },
        { title: intl.formatMessage({ id: 'pages.park.visitTask.tenant' }), dataIndex: 'tenantName', key: 'tenantName', sorter: true, width: 150, ellipsis: true, render: (dom: any) => dom || '-' },
        { title: intl.formatMessage({ id: 'pages.park.visitTask.managerName' }), dataIndex: 'managerName', key: 'managerName', sorter: true, width: 120 },
        { title: intl.formatMessage({ id: 'pages.park.visitTask.visitDate' }), dataIndex: 'visitDate', key: 'visitDate', sorter: true, width: 120, render: (dom: any) => dom ? dayjs(dom).format('YYYY-MM-DD') : '-' },
        { title: intl.formatMessage({ id: 'pages.park.visitTask.status' }), dataIndex: 'status', key: 'status', sorter: true, width: 100, render: (_: any, r: VisitTask) => { const config = statusMap[r.status] || { textId: 'pages.park.visitTask.status.unknown', defaultText: r.status, color: 'default', icon: null }; return <Tag color={config.color} icon={config.icon}>{intl.formatMessage({ id: config.textId})}</Tag>; } },
        {
            title: intl.formatMessage({ id: 'pages.park.visitTask.action' }), valueType: 'option', fixed: 'right', width: 180, render: (_: any, r: VisitTask) => (
                <Space size={4}>
                    {r.status !== 'Completed' && <Button type="link" size="small" icon={<EditOutlined />} onClick={() => set({ editingTask: r, formVisible: true })}>{intl.formatMessage({ id: 'pages.table.edit' })}</Button>}
                    {r.status !== 'Completed' && <Popconfirm title={intl.formatMessage({ id: 'pages.park.visitTask.deleteConfirm' }, { title: r.title })} onConfirm={() => handleDelete(r.id)} okText={intl.formatMessage({ id: 'pages.park.visitTask.ok' })} cancelText={intl.formatMessage({ id: 'pages.park.visitTask.cancel' })}><Button type="link" size="small" danger icon={<DeleteOutlined />}>{intl.formatMessage({ id: 'pages.park.visitTask.delete' })}</Button></Popconfirm>}
                </Space>
            )
        },
    ];

    const handleDelete = async (id: string) => { const res = await api.delete(id); if (res.success) { message.success(intl.formatMessage({ id: 'pages.park.visitTask.message.deleteSuccess' })); actionRef.current?.reload(); api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); } };

    return (
        <PageContainer>
            <ProTable actionRef={actionRef} request={async (params: any, sort: any, filter: any) => {
                const res = await api.list({ ...params, search: state.search, sort, filter });
                api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); });
                return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
            }} columns={columns} rowKey="id" search={false}
                headerTitle={
                    <Space size={24}>
                        <Space><TeamOutlined />{intl.formatMessage({ id: 'pages.park.visitTask.tabTitle' })}</Space>
                        <Space size={12}>
                            <Tag color="orange">{intl.formatMessage({ id: 'pages.park.visitTask.statistics.pending' })} {state.statistics?.pendingTasks || 0}</Tag>
                            <Tag color="green">{intl.formatMessage({ id: 'pages.park.visitTask.statistics.completedThisMonth' })} {state.statistics?.completedTasksThisMonth || 0}</Tag>
                            <Tag color="blue">{intl.formatMessage({ id: 'pages.park.visitTask.statistics.activeManagers' })} {state.statistics?.activeManagers || 0}</Tag>
                            <Tag color="purple">{intl.formatMessage({ id: 'pages.park.visitTask.statistics.completionRate' })} {state.statistics?.completionRate || 0}%</Tag>
                        </Space>
                    </Space>
                }
                scroll={{ x: 'max-content' }}
                toolBarRender={() => [
                    <Input.Search
                        key="search"
                        placeholder={intl.formatMessage({ id: 'pages.common.search' })}
                        allowClear
                        value={state.search}
                        onChange={(e) => set({ search: e.target.value })}
                        onSearch={(value) => { set({ search: value }); actionRef.current?.reload(); }}
                        style={{ width: 260, marginRight: 8 }}
                        prefix={<SearchOutlined />}
                    />,
                    <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => set({ editingTask: null, formVisible: true })}>{intl.formatMessage({ id: 'pages.park.visitTask.addTask' })}</Button>,
                ]}
            />

            <ModalForm key={state.editingTask?.id || 'create'} title={state.editingTask ? intl.formatMessage({ id: 'pages.park.visitTask.edit' }) : intl.formatMessage({ id: 'pages.park.visitTask.create' })} open={state.formVisible}
                onOpenChange={(open) => { if (!open) set({ formVisible: false, editingTask: null }); }}
                initialValues={state.editingTask ? { title: state.editingTask.title, managerName: state.editingTask.managerName, phone: state.editingTask.phone, visitType: state.editingTask.visitType, visitMethod: state.editingTask.visitMethod || '实地走访', details: state.editingTask.details, tenantName: state.editingTask.tenantName || '', visitLocation: state.editingTask.visitLocation, intervieweeName: state.editingTask.intervieweeName, intervieweePosition: state.editingTask.intervieweePosition, intervieweePhone: state.editingTask.intervieweePhone, visitDate: state.editingTask.visitDate ? dayjs(state.editingTask.visitDate) : undefined, visitor: state.editingTask.visitor, status: state.editingTask.status, content: state.editingTask.content, feedback: state.editingTask.feedback } : { visitType: '日常走访', visitMethod: '实地走访', visitDate: dayjs() }}
                onFinish={async (values) => {
                    try {
                        const targetTenant = state.tenants.find(t => t.tenantName === values.tenantName);
                        let finalTenantId = targetTenant?.id;
                        if (state.editingTask && values.tenantName === state.editingTask.tenantName) finalTenantId = state.editingTask.tenantId;
                        let visitDateValue = '';
                        if (values.visitDate) {
                            if (dayjs.isDayjs(values.visitDate)) {
                                visitDateValue = values.visitDate.toISOString();
                            } else if (values.visitDate instanceof Date) {
                                visitDateValue = values.visitDate.toISOString();
                            } else if (typeof values.visitDate === 'string') {
                                visitDateValue = dayjs(values.visitDate).toISOString();
                            }
                        }
                        const submitData = { ...values, visitDate: visitDateValue, tenantId: finalTenantId } as unknown as VisitTaskFormData;
                        console.log('Submit data:', JSON.stringify(submitData));
                        const res = state.editingTask ? await api.update(state.editingTask.id, submitData) : await api.create(submitData);
                        if (res.success) { message.success(state.editingTask ? intl.formatMessage({ id: 'pages.park.visitTask.message.updateSuccess' }) : intl.formatMessage({ id: 'pages.park.visitTask.message.createSuccess' })); set({ formVisible: false, editingTask: null }); actionRef.current?.reload(); api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); return true; }
                        else { message.error(res.message || (state.editingTask ? intl.formatMessage({ id: 'pages.park.visitTask.message.updateFailed' }) : intl.formatMessage({ id: 'pages.park.visitTask.message.createFailed' }))); return false; }
                    } catch (e: any) { message.error(e.message || (state.editingTask ? intl.formatMessage({ id: 'pages.park.visitTask.message.updateFailed' }) : intl.formatMessage({ id: 'pages.park.visitTask.message.createFailed' }))); return false; }
                }} autoFocusFirstInput width={640}>
                <div style={{ marginBottom: 16 }}><Typography.Text type="secondary">{intl.formatMessage({ id: 'pages.park.visitTask.basicInfo' })}</Typography.Text></div>
                <ProFormText name="title" label={intl.formatMessage({ id: 'pages.park.visitTask.taskTitle' })} placeholder={intl.formatMessage({ id: 'pages.park.visitTask.taskTitlePlaceholder' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.park.visitTask.taskTitleRequired' }) }]} />
                <Row gutter={16}><Col span={12}><ProFormText name="managerName" label={intl.formatMessage({ id: 'pages.park.visitTask.managerName' })} placeholder={intl.formatMessage({ id: 'pages.park.visitTask.managerNamePlaceholder' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.park.visitTask.managerNameRequired' }) }]} /></Col><Col span={12}><ProFormText name="phone" label={intl.formatMessage({ id: 'pages.park.visitTask.phone' })} placeholder={intl.formatMessage({ id: 'pages.park.visitTask.phonePlaceholder' })} /></Col></Row>
                <Row gutter={16}><Col span={12}><ProFormSelect name="visitType" label={intl.formatMessage({ id: 'pages.park.visitTask.visitType' })} options={[{ value: '日常走访', label: intl.formatMessage({ id: 'pages.park.visitTask.visitType.daily' }) }, { value: '安全检查', label: intl.formatMessage({ id: 'pages.park.visitTask.visitType.safety' }) }, { value: '政策宣讲', label: intl.formatMessage({ id: 'pages.park.visitTask.visitType.policy' }) }, { value: '需求调研', label: intl.formatMessage({ id: 'pages.park.visitTask.visitType.survey' }) }, { value: '其他', label: intl.formatMessage({ id: 'pages.park.visitTask.visitType.other' }) }]} /></Col><Col span={12}><ProFormSelect name="visitMethod" label={intl.formatMessage({ id: 'pages.park.visitTask.visitMethod' })} options={[{ value: '实地走访', label: intl.formatMessage({ id: 'pages.park.visitTask.visitMethod.field' }) }, { value: '电话沟通', label: intl.formatMessage({ id: 'pages.park.visitTask.visitMethod.phone' }) }, { value: '微信联系', label: intl.formatMessage({ id: 'pages.park.visitTask.visitMethod.wechat' }) }]} /></Col></Row>
                <ProFormText name="details" label={intl.formatMessage({ id: 'pages.park.visitTask.details' })} placeholder={intl.formatMessage({ id: 'pages.park.visitTask.detailsPlaceholder' })} />
                <Row gutter={16}><Col span={12}><div style={{ marginBottom: 8 }}><Typography.Text type="secondary" style={{ fontSize: 12 }}>{intl.formatMessage({ id: 'pages.park.visitTask.tenant' })} <span style={{ color: '#ff4d4f' }}>*</span></Typography.Text></div><Form.Item name="tenantName" rules={[{ required: true, message: intl.formatMessage({ id: 'pages.park.visitTask.tenantRequired' }) }]}><AutoComplete placeholder={intl.formatMessage({ id: 'pages.park.visitTask.tenantPlaceholder' })} options={state.tenants.map(t => ({ value: t.tenantName }))} /></Form.Item></Col><Col span={12}><ProFormText name="visitLocation" label={intl.formatMessage({ id: 'pages.park.visitTask.visitLocation' })} placeholder={intl.formatMessage({ id: 'pages.park.visitTask.visitLocationPlaceholder' })} /></Col></Row>
                <Row gutter={16}><Col span={8}><ProFormText name="intervieweeName" label={intl.formatMessage({ id: 'pages.park.visitTask.intervieweeName' })} placeholder={intl.formatMessage({ id: 'pages.park.visitTask.intervieweeNamePlaceholder' })} /></Col><Col span={8}><ProFormText name="intervieweePosition" label={intl.formatMessage({ id: 'pages.park.visitTask.intervieweePosition' })} placeholder={intl.formatMessage({ id: 'pages.park.visitTask.intervieweePositionPlaceholder' })} /></Col><Col span={8}><ProFormText name="intervieweePhone" label={intl.formatMessage({ id: 'pages.park.visitTask.intervieweePhone' })} placeholder={intl.formatMessage({ id: 'pages.park.visitTask.intervieweePhonePlaceholder' })} /></Col></Row>
                <Row gutter={16}><Col span={12}><ProFormDateTimePicker name="visitDate" label={intl.formatMessage({ id: 'pages.park.visitTask.visitDate' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.park.visitTask.visitDateRequired' }) }]} fieldProps={{ style: { width: '100%' }, format: 'YYYY-MM-DD HH:mm' }} placeholder={intl.formatMessage({ id: 'pages.park.visitTask.visitDatePlaceholder' })} /></Col><Col span={12}><ProFormText name="visitor" label={intl.formatMessage({ id: 'pages.park.visitTask.visitor' })} placeholder={intl.formatMessage({ id: 'pages.park.visitTask.visitorPlaceholder' })} /></Col></Row>
                {state.editingTask && (<><Row gutter={16}><Col span={12}><ProFormSelect name="status" label={intl.formatMessage({ id: 'pages.park.visitTask.status' })} options={[{ value: 'Pending', label: intl.formatMessage({ id: 'pages.park.visitTask.status.pending' }) }, { value: 'InProgress', label: intl.formatMessage({ id: 'pages.park.visitTask.status.inProgress' }) }, { value: 'Completed', label: intl.formatMessage({ id: 'pages.park.visitTask.status.completed' }) }, { value: 'Cancelled', label: intl.formatMessage({ id: 'pages.park.visitTask.status.cancelled' }) }]} /></Col></Row><ProFormText name="content" label={intl.formatMessage({ id: 'pages.park.visitTask.content' })} placeholder={intl.formatMessage({ id: 'pages.park.visitTask.contentPlaceholder' })} /><ProFormText name="feedback" label={intl.formatMessage({ id: 'pages.park.visitTask.feedback' })} placeholder={intl.formatMessage({ id: 'pages.park.visitTask.feedbackPlaceholder' })} /></>)}
            </ModalForm>

            <Drawer title={intl.formatMessage({ id: 'pages.park.visitTask.detail' })} placement="right" open={state.detailVisible} onClose={() => { set({ detailVisible: false, selectedTask: null }); }} size="large" loading={state.detailLoading}
                extra={<Space><Button onClick={() => set({ detailVisible: false })}>{intl.formatMessage({ id: 'pages.park.visitTask.close' })}</Button><Button type="primary" icon={<EditOutlined />} onClick={() => { set({ detailVisible: false, editingTask: state.selectedTask, formVisible: true }); }}>{intl.formatMessage({ id: 'pages.park.visitTask.edit' })}</Button></Space>}>
                {state.selectedTask ? (<Space orientation="vertical" size="large" style={{ width: '100%' }}>
                    <ProDescriptions title={intl.formatMessage({ id: 'pages.park.visitTask.basicInfo' })} bordered column={2}>
                        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.visitTask.taskTitle' })} span={2}>{state.selectedTask.title}</ProDescriptions.Item>
                        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.visitTask.visitType' })}>{state.selectedTask.visitType}</ProDescriptions.Item>
                        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.visitTask.visitMethod' })}>{state.selectedTask.visitMethod}</ProDescriptions.Item>
                        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.visitTask.managerName' })}>{state.selectedTask.managerName}</ProDescriptions.Item>
                        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.visitTask.phone' })}>{state.selectedTask.phone}</ProDescriptions.Item>
                        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.visitTask.status' })}><Tag color={statusMap[state.selectedTask.status]?.color} icon={statusMap[state.selectedTask.status]?.icon}>{intl.formatMessage({ id: statusMap[state.selectedTask.status]?.textId})}</Tag></ProDescriptions.Item>
                        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.visitTask.createdAt' })}>{dayjs(state.selectedTask.createdAt).format('YYYY-MM-DD')}</ProDescriptions.Item>
                        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.visitTask.details' })} span={2}>{state.selectedTask.details || '-'}</ProDescriptions.Item>
                    </ProDescriptions>
                    <ProDescriptions title={intl.formatMessage({ id: 'pages.park.visitTask.visitInfo' })} bordered column={2}>
                        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.visitTask.tenant' })} span={2}>{state.selectedTask.tenantName || '-'}</ProDescriptions.Item>
                        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.visitTask.intervieweeName' })}>{state.selectedTask.intervieweeName || '-'}</ProDescriptions.Item>
                        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.visitTask.intervieweePosition' })}>{state.selectedTask.intervieweePosition || '-'}</ProDescriptions.Item>
                        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.visitTask.visitLocation' })} span={2}>{state.selectedTask.visitLocation || '-'}</ProDescriptions.Item>
                        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.visitTask.visitDate' })}>{state.selectedTask.visitDate ? dayjs(state.selectedTask.visitDate).format('YYYY-MM-DD HH:mm') : '-'}</ProDescriptions.Item>
                        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.visitTask.visitor' })}>{state.selectedTask.visitor || '-'}</ProDescriptions.Item>
                    </ProDescriptions>
                    <ProDescriptions title={intl.formatMessage({ id: 'pages.park.visitTask.visitResult' })} bordered column={1}>
                        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.visitTask.content' })}><Typography.Text style={{ whiteSpace: 'pre-wrap' }}>{state.selectedTask.content || intl.formatMessage({ id: 'pages.park.visitTask.noContent' })}</Typography.Text></ProDescriptions.Item>
                        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.visitTask.feedback' })}><Typography.Text style={{ whiteSpace: 'pre-wrap' }}>{state.selectedTask.feedback || intl.formatMessage({ id: 'pages.park.visitTask.noFeedback' })}</Typography.Text></ProDescriptions.Item>
                    </ProDescriptions>
                </Space>) : null}
            </Drawer>
        </PageContainer>
    );
};

export default VisitTaskPage;
