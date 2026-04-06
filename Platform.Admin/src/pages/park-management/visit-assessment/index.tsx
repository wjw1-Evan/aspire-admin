import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PageContainer } from '@/components';
import { useIntl, request } from '@umijs/max';
import { Card, Space, Button, Tag, Rate, App, Drawer, Descriptions, Divider, Form, Modal, Input, Typography } from 'antd';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import { ReloadOutlined, StarFilled, FileSearchOutlined, StarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ApiResponse, PagedResult, PageParams } from '@/types';

const { Text } = Typography;

interface VisitTask { id: string; title: string; managerName: string; phone: string; visitType: string; tenantName?: string; visitLocation?: string; visitDate?: string; status: string; intervieweeName?: string; assessmentScore?: number; assessmentId?: string; feedback?: string; createdAt: string; }
interface VisitAssessment { id: string; taskId: string; visitorName: string; phone: string; location: string; taskDescription: string; score: number; comments?: string; createdAt: string; }
interface AssessmentFormData { taskId: string; visitorName: string; phone?: string; location?: string; taskDescription: string; score: number; comments?: string; }

const api = {
    list: (params: PageParams & { status?: string }) => request<ApiResponse<PagedResult<VisitTask>>>('/api/park-management/visit/tasks', { params }),
    createAssessment: (data: AssessmentFormData) => request<ApiResponse<VisitAssessment>>('/api/park-management/visit/assessment', { method: 'POST', data }),
};

const VisitAssessmentList: React.FC = () => {
    const intl = useIntl();
    const { message } = App.useApp();
    const actionRef = useRef<ActionType | undefined>(undefined);
    const [form] = Form.useForm();
    const [state, setState] = useState({ detailVisible: false, assessmentVisible: false, selectedAssessment: null as VisitAssessment | null, selectedTask: null as VisitTask | null, searchText: '' });
    const set = (partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial }));

    const columns: ProColumns<VisitTask>[] = [
        { title: intl.formatMessage({ id: 'pages.park.visit.visitDate', defaultMessage: '走访时间' }), dataIndex: 'visitDate', width: 170, render: (dom: any) => dom ? dayjs(dom).format('YYYY-MM-DD HH:mm') : '-' },
        { title: intl.formatMessage({ id: 'pages.park.visit.visitor', defaultMessage: '受访人/企业' }), dataIndex: 'tenantName', width: 180, ellipsis: true, render: (dom: any, r: VisitTask) => <Space direction="vertical" size={0}><Text strong>{dom || '-'}</Text><Text type="secondary" style={{ fontSize: 12 }}>{r.visitLocation || '-'}</Text></Space> },
        { title: intl.formatMessage({ id: 'pages.park.visit.task', defaultMessage: '走访任务' }), dataIndex: 'title', ellipsis: true, render: (dom: any) => dom || '-' },
        { title: intl.formatMessage({ id: 'pages.park.visit.score', defaultMessage: '满意度' }), dataIndex: 'assessmentScore', width: 150, render: (dom: React.ReactNode) => dom !== undefined && dom !== null ? <Rate disabled value={dom as number} character={<StarFilled />} style={{ fontSize: 14 }} /> : <Tag color="warning">待评价</Tag> },
        { title: intl.formatMessage({ id: 'pages.park.common.actions', defaultMessage: '操作' }), valueType: 'option', fixed: 'right', width: 120, render: (_: any, r: VisitTask) => [
            r.assessmentId ? <Button key="view" type="link" size="small" onClick={() => { const d: VisitAssessment = { id: r.assessmentId!, taskId: r.id, visitorName: r.intervieweeName || r.tenantName || '', phone: r.phone, location: r.visitLocation || '', taskDescription: r.title, score: r.assessmentScore || 0, comments: r.feedback || '', createdAt: r.createdAt }; set({ selectedAssessment: d, detailVisible: true }); }} icon={<FileSearchOutlined />}>{intl.formatMessage({ id: 'pages.park.common.view', defaultMessage: '详情' })}</Button>
            : <Button key="assess" type="link" size="small" onClick={() => { set({ selectedTask: r, assessmentVisible: true }); form.setFieldsValue({ visitorName: r.intervieweeName || r.tenantName, phone: r.phone, location: r.visitLocation, score: 5, comments: '' }); }} icon={<StarOutlined />} style={{ color: '#52c41a' }}>{intl.formatMessage({ id: 'pages.park.visit.assess', defaultMessage: '评价' })}</Button>,
        ]},
    ];

    const handleAssessmentSubmit = async (values: any) => {
        if (!state.selectedTask) return;
        const res = await api.createAssessment({ taskId: state.selectedTask.id, ...values });
        if (res.success) { message.success(intl.formatMessage({ id: 'pages.park.common.success', defaultMessage: '评价提交成功' })); set({ assessmentVisible: false, selectedTask: null }); form.resetFields(); actionRef.current?.reload(); }
        else message.error(intl.formatMessage({ id: 'pages.park.common.failed', defaultMessage: '评价提交失败' }));
    };

    return (
        <PageContainer title={intl.formatMessage({ id: 'pages.park.visit.assessment', defaultMessage: '走访评价管理' })}>
            <Card styles={{ body: { padding: '16px 24px' } }}>
                <ProTable actionRef={actionRef} request={async (params: any) => { const { pageSize, current } = params; const res = await api.list({ page: current, pageSize, search: state.searchText, status: 'Completed' }); return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success }; }} columns={columns} rowKey="id" search={false} pagination={{ pageSizeOptions: ['10', '20', '50', '100'], defaultPageSize: 10 }} toolBarRender={() => [<Button key="refresh" icon={<ReloadOutlined />} onClick={() => actionRef.current?.reload()}>{intl.formatMessage({ id: 'pages.park.common.refresh', defaultMessage: '刷新' })}</Button>]} />
            </Card>

            <Drawer title={intl.formatMessage({ id: 'pages.park.visit.assessmentDetail', defaultMessage: '走访评价详情' })} placement="right" open={state.detailVisible} onClose={() => set({ detailVisible: false, selectedAssessment: null })} size={500}>
                {state.selectedAssessment && <div style={{ padding: '0 4px' }}>
                    <div style={{ textAlign: 'center', marginBottom: 24 }}><Text type="secondary">{intl.formatMessage({ id: 'pages.park.visit.score', defaultMessage: '总体满意程度' })}</Text><div style={{ marginTop: 8 }}><Rate disabled value={state.selectedAssessment.score} style={{ fontSize: 24 }} /></div></div>
                    <Divider />
                    <Descriptions column={1} bordered size="small">
                        <Descriptions.Item label={intl.formatMessage({ id: 'pages.park.visit.visitor', defaultMessage: '受访对象' })}>{state.selectedAssessment.visitorName}</Descriptions.Item>
                        <Descriptions.Item label={intl.formatMessage({ id: 'pages.park.visit.phone', defaultMessage: '联系电话' })}>{state.selectedAssessment.phone || '-'}</Descriptions.Item>
                        <Descriptions.Item label={intl.formatMessage({ id: 'pages.park.visit.location', defaultMessage: '走访地点' })}>{state.selectedAssessment.location || '-'}</Descriptions.Item>
                    </Descriptions>
                    <Divider titlePlacement="left" plain><Text type="secondary" style={{ fontSize: 12 }}>{intl.formatMessage({ id: 'pages.park.visit.taskInfo', defaultMessage: '走访任务信息' })}</Text></Divider>
                    <div><Text strong>{intl.formatMessage({ id: 'pages.park.visit.taskDescription', defaultMessage: '任务内容描述' })}：</Text><div style={{ marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>{state.selectedAssessment.taskDescription || '-'}</div></div>
                    <Divider titlePlacement="left" plain><Text type="secondary" style={{ fontSize: 12 }}>{intl.formatMessage({ id: 'pages.park.visit.assessmentComments', defaultMessage: '评价与建议' })}</Text></Divider>
                    <div style={{ marginBottom: 24 }}><Text strong>{intl.formatMessage({ id: 'pages.park.visit.comments', defaultMessage: '详细评语' })}：</Text><div style={{ marginTop: 8, padding: 12, border: '1px solid #f0f0f0', borderRadius: 8, minHeight: 100 }}>{state.selectedAssessment.comments || intl.formatMessage({ id: 'pages.park.common.noData', defaultMessage: '暂无评价内容' })}</div></div>
                    <Divider />
                    <Space direction="vertical" size={2} style={{ width: '100%', textAlign: 'right' }}><Text type="secondary" style={{ fontSize: 12 }}>{intl.formatMessage({ id: 'pages.park.common.createdAt', defaultMessage: '走访发生时间' })}: {dayjs(state.selectedAssessment.createdAt).format('YYYY-MM-DD HH:mm')}</Text></Space>
                </div>}
            </Drawer>

            <Modal title={intl.formatMessage({ id: 'pages.park.visit.assessment', defaultMessage: '添加走访评价' })} open={state.assessmentVisible} onCancel={() => set({ assessmentVisible: false, selectedTask: null })} footer={null} width={600} destroyOnClose>
                {state.selectedTask && <Form form={form} layout="vertical" onFinish={handleAssessmentSubmit}>
                    <Form.Item label={intl.formatMessage({ id: 'pages.park.visit.visitor', defaultMessage: '受访人/企业' })} name="visitorName" rules={[{ required: true, message: '请输入受访人/企业名称' }]}><Input placeholder="请输入受访人/企业名称" /></Form.Item>
                    <Form.Item label={intl.formatMessage({ id: 'pages.park.visit.phone', defaultMessage: '联系电话' })} name="phone"><Input placeholder="请输入联系电话" /></Form.Item>
                    <Form.Item label={intl.formatMessage({ id: 'pages.park.visit.location', defaultMessage: '走访地点' })} name="location"><Input placeholder="请输入走访地点" /></Form.Item>
                    <Form.Item label={intl.formatMessage({ id: 'pages.park.visit.score', defaultMessage: '满意度评分' })} name="score" rules={[{ required: true, message: '请选择满意度评分' }]}><Rate /></Form.Item>
                    <Form.Item label={intl.formatMessage({ id: 'pages.park.visit.comments', defaultMessage: '评价意见' })} name="comments"><Input.TextArea rows={4} placeholder="请输入评价意见（选填）" /></Form.Item>
                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}><Space><Button onClick={() => set({ assessmentVisible: false, selectedTask: null })}>{intl.formatMessage({ id: 'pages.park.common.cancel', defaultMessage: '取消' })}</Button><Button type="primary" htmlType="submit">{intl.formatMessage({ id: 'pages.park.common.submit', defaultMessage: '提交评价' })}</Button></Space></Form.Item>
                </Form>}
            </Modal>
        </PageContainer>
    );
};

export default VisitAssessmentList;
