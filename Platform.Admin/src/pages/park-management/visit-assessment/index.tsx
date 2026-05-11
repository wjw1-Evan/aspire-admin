import React, { useRef, useState, useCallback, useEffect } from 'react';
import { PageContainer, ModalForm, ProFormText, ProFormTextArea } from '@ant-design/pro-components';
import { useIntl, request } from '@umijs/max';
import { Space, Button, Tag, Rate, App, Divider, Typography, Input } from 'antd';
import { Drawer } from 'antd';
import { ProDescriptions } from '@ant-design/pro-components';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import { StarFilled, FileSearchOutlined, StarOutlined, SearchOutlined, ReloadOutlined, TeamOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ApiResponse, PagedResult } from '@/types';

const { Text } = Typography;

interface VisitTask { id: string; title: string; managerName: string; phone: string; visitType: string; tenantName?: string; visitLocation?: string; visitDate?: string; status: string; intervieweeName?: string; assessmentScore?: number; assessmentId?: string; feedback?: string; createdAt: string; }
interface VisitAssessment { id: string; taskId: string; visitorName: string; phone: string; location: string; taskDescription: string; score: number; comments?: string; createdAt: string; }
interface AssessmentFormData { taskId: string; visitorName: string; phone?: string; location?: string; taskDescription: string; score: number; comments?: string; }

const api = {
    list: (params: any) => request<ApiResponse<PagedResult<VisitTask>>>('/apiservice/api/park-management/visit/tasks', { params }),
    createAssessment: (data: AssessmentFormData) => request<ApiResponse<VisitAssessment>>('/apiservice/api/park-management/visit/assessment', { method: 'POST', data }),
};

interface Statistics { totalTasks: number; pendingAssessments: number; completedAssessments: number; averageScore: number; }

const VisitAssessmentList: React.FC = () => {
    const intl = useIntl();
    const { message } = App.useApp();
    const actionRef = useRef<ActionType | undefined>(undefined);
    const [state, setState] = useState({
        detailVisible: false, assessmentVisible: false,
        selectedAssessment: null as VisitAssessment | null, selectedTask: null as VisitTask | null,
        search: '', statistics: null as Statistics | null,
    });
    const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

    const loadStatistics = useCallback(() => {
        api.list({ page: 1, pageSize: 1000 }).then(res => {
            if (res.success && res.data) {
                const tasks = res.data.queryable || [];
                const completed = tasks.filter((t: VisitTask) => t.assessmentId);
                const scores = completed.map((t: VisitTask) => t.assessmentScore).filter((s) => s !== undefined) as number[];
                const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
                set({ statistics: { totalTasks: tasks.length, pendingAssessments: tasks.length - completed.length, completedAssessments: completed.length, averageScore: avg } });
            }
        });
    }, []);

    useEffect(() => { loadStatistics(); }, [loadStatistics]);

    const columns: ProColumns<VisitTask>[] = [
        { title: intl.formatMessage({ id: 'pages.park.visit.visitDate' }), dataIndex: 'visitDate', width: 170, render: (dom: any) => dom ? dayjs(dom).format('YYYY-MM-DD HH:mm') : '-' },
        { title: intl.formatMessage({ id: 'pages.park.visit.visitor' }), dataIndex: 'tenantName', width: 180, ellipsis: true, render: (dom: any, r: VisitTask) => <Space orientation="vertical" size={0}><Text strong>{dom || '-'}</Text><Text type="secondary" style={{ fontSize: 12 }}>{r.visitLocation || '-'}</Text></Space> },
        { title: intl.formatMessage({ id: 'pages.park.visit.task' }), dataIndex: 'title', ellipsis: true, render: (dom: any) => dom || '-' },
        { title: intl.formatMessage({ id: 'pages.park.visit.score' }), dataIndex: 'assessmentScore', width: 150, render: (dom: React.ReactNode) => dom !== undefined && dom !== null ? <Rate disabled value={dom as number} character={<StarFilled />} style={{ fontSize: 14 }} /> : <Tag color="warning">待评价</Tag> },
        { title: intl.formatMessage({ id: 'pages.park.common.actions' }), valueType: 'option', fixed: 'right', width: 180, render: (_: any, r: VisitTask) => (
            <Space size={4}>
                {r.assessmentId ? <Button variant="link" color="cyan" size="small" icon={<FileSearchOutlined />} onClick={() => { const d: VisitAssessment = { id: r.assessmentId!, taskId: r.id, visitorName: r.intervieweeName || r.tenantName || '', phone: r.phone, location: r.visitLocation || '', taskDescription: r.title, score: r.assessmentScore || 0, comments: r.feedback || '', createdAt: r.createdAt }; set({ selectedAssessment: d, detailVisible: true }); }}>{intl.formatMessage({ id: 'pages.park.common.view' })}</Button>
                : <Button type="link" size="small" icon={<StarOutlined />} onClick={() => set({ selectedTask: r, assessmentVisible: true })} style={{ color: '#52c41a' }}>{intl.formatMessage({ id: 'pages.park.visit.assess' })}</Button>}
            </Space>
        )},
    ];

    return (
        <PageContainer>
            <ProTable actionRef={actionRef} request={async (params: any, sort: any, filter: any) => { const res = await api.list({ ...params, search: state.search, sort, filter }); loadStatistics(); return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success }; }} columns={columns} rowKey="id" search={false}
                headerTitle={
                    <Space size={24}>
                        <Space><TeamOutlined />{intl.formatMessage({ id: 'pages.park.visitAssessment.title' })}</Space>
                        <Space size={12}>
                            <Tag color="blue">{intl.formatMessage({ id: 'pages.park.visitAssessment.statistics.total' })} {state.statistics?.totalTasks || 0}</Tag>
                            <Tag color="orange">{intl.formatMessage({ id: 'pages.park.visitAssessment.statistics.pending' })} {state.statistics?.pendingAssessments || 0}</Tag>
                            <Tag color="green">{intl.formatMessage({ id: 'pages.park.visitAssessment.statistics.completed' })} {state.statistics?.completedAssessments || 0}</Tag>
                            <Tag color="purple">{intl.formatMessage({ id: 'pages.park.visitAssessment.statistics.average' })} {state.statistics?.averageScore?.toFixed(1) || '0.0'}</Tag>
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
                ]}
            />

            <Drawer title={intl.formatMessage({ id: 'pages.park.visit.assessmentDetail' })} placement="right" open={state.detailVisible} onClose={() => set({ detailVisible: false, selectedAssessment: null })} size="large">
                {state.selectedAssessment && <div style={{ padding: '0 4px' }}>
                    <div style={{ textAlign: 'center', marginBottom: 24 }}><Text type="secondary">{intl.formatMessage({ id: 'pages.park.visit.score' })}</Text><div style={{ marginTop: 8 }}><Rate disabled value={state.selectedAssessment.score} style={{ fontSize: 24 }} /></div></div>
                    <Divider />
                    <ProDescriptions column={1} bordered size="small">
                        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.visit.visitor' })}>{state.selectedAssessment.visitorName}</ProDescriptions.Item>
                        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.visit.phone' })}>{state.selectedAssessment.phone || '-'}</ProDescriptions.Item>
                        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.visit.location' })}>{state.selectedAssessment.location || '-'}</ProDescriptions.Item>
                    </ProDescriptions>
                    <Divider titlePlacement="left" plain><Text type="secondary" style={{ fontSize: 12 }}>{intl.formatMessage({ id: 'pages.park.visit.taskInfo' })}</Text></Divider>
                    <div><Text strong>{intl.formatMessage({ id: 'pages.park.visit.taskDescription' })}：</Text><div style={{ marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>{state.selectedAssessment.taskDescription || '-'}</div></div>
                    <Divider titlePlacement="left" plain><Text type="secondary" style={{ fontSize: 12 }}>{intl.formatMessage({ id: 'pages.park.visit.assessmentComments' })}</Text></Divider>
                    <div style={{ marginBottom: 24 }}><Text strong>{intl.formatMessage({ id: 'pages.park.visit.comments' })}：</Text><div style={{ marginTop: 8, padding: 12, border: '1px solid #f0f0f0', borderRadius: 8, minHeight: 100 }}>{state.selectedAssessment.comments || intl.formatMessage({ id: 'pages.park.common.noData' })}</div></div>
                    <Divider />
                    <Space orientation="vertical" size={2} style={{ width: '100%', textAlign: 'right' }}><Text type="secondary" style={{ fontSize: 12 }}>{intl.formatMessage({ id: 'pages.park.common.createdAt' })}: {dayjs(state.selectedAssessment.createdAt).format('YYYY-MM-DD HH:mm')}</Text></Space>
                </div>}
            </Drawer>

            <ModalForm<AssessmentFormData>
                title={intl.formatMessage({ id: 'pages.park.visit.assessment' })}
                open={state.assessmentVisible}
                onOpenChange={(open) => { if (!open) set({ assessmentVisible: false, selectedTask: null }); }}
                initialValues={state.selectedTask ? { taskId: state.selectedTask.id, visitorName: state.selectedTask.intervieweeName || state.selectedTask.tenantName, phone: state.selectedTask.phone, location: state.selectedTask.visitLocation, score: 5, comments: '' } : undefined}
                onFinish={async (values) => {
                    if (!state.selectedTask) return false;
                    const res = await api.createAssessment({ ...values });
                    if (res.success) { message.success(intl.formatMessage({ id: 'pages.park.common.success' })); actionRef.current?.reload(); }
                    else message.error(intl.formatMessage({ id: 'pages.park.common.failed' }));
                    return res.success;
                }}
                autoFocusFirstInput
                width={600}
            >
                <ProFormText name="taskId" hidden />
                <ProFormText name="visitorName" label={intl.formatMessage({ id: 'pages.park.visit.visitor' })} placeholder={intl.formatMessage({ id: 'pages.park.visitAssessment.visitorNamePlaceholder' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.park.visitAssessment.visitorNameRequired' }) }]} />
                <ProFormText name="phone" label={intl.formatMessage({ id: 'pages.park.visit.phone' })} placeholder={intl.formatMessage({ id: 'pages.park.visitAssessment.phonePlaceholder' })} />
                <ProFormText name="location" label={intl.formatMessage({ id: 'pages.park.visit.location' })} placeholder={intl.formatMessage({ id: 'pages.park.visitAssessment.locationPlaceholder' })} />
                <ProFormTextArea name="comments" label={intl.formatMessage({ id: 'pages.park.visit.comments' })} placeholder={intl.formatMessage({ id: 'pages.park.visitAssessment.commentsPlaceholder' })} />
            </ModalForm>
        </PageContainer>
    );
};

export default VisitAssessmentList;
