import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { request } from '@umijs/max';
import { Tag, Space, Button, Input, App, Typography, Drawer, Empty } from 'antd';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import { ModalForm, ProFormText, ProFormSelect } from '@ant-design/pro-form';
import { PlusOutlined, ReloadOutlined, QuestionCircleOutlined, StarOutlined, StarFilled, EditOutlined, DeleteOutlined, EyeOutlined, SearchOutlined, BookOutlined } from '@ant-design/icons';
import { ProDescriptions } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import { ApiResponse, PagedResult, PageParams } from '@/types';

const { Text } = Typography;

interface VisitQuestion { id: string; content: string; category?: string; answer?: string; isFrequentlyUsed: boolean; sortOrder: number; createdAt?: string; updatedAt?: string; }
interface VisitStatistics { pendingTasks: number; completedTasksThisMonth: number; activeManagers: number; completionRate: number; totalAssessments: number; averageScore: number; tasksByType: Record<string, number>; tasksByStatus: Record<string, number>; }
interface QuestionFormData { content: string; category?: string; answer?: string; isFrequentlyUsed?: boolean; sortOrder?: number; }

const api = {
    questions: (params: PageParams & { sortBy?: string; sortOrder?: string }) => request<ApiResponse<PagedResult<VisitQuestion>>>('/api/park-management/visit/questions', { params }),
    createQuestion: (data: QuestionFormData) => request<ApiResponse<VisitQuestion>>('/api/park-management/visit/question', { method: 'POST', data }),
    updateQuestion: (id: string, data: QuestionFormData) => request<ApiResponse<VisitQuestion>>(`/api/park-management/visit/question/${id}`, { method: 'PUT', data }),
    deleteQuestion: (id: string) => request<ApiResponse<boolean>>(`/api/park-management/visit/question/${id}`, { method: 'DELETE' }),
    statistics: () => request<ApiResponse<VisitStatistics>>('/api/park-management/visit/statistics'),
};

const VisitKnowledgeBase: React.FC = () => {
    const { message, modal } = App.useApp();
    const actionRef = useRef<ActionType | undefined>(undefined);
    const [state, setState] = useState({
        formVisible: false,
        editingQuestion: null as VisitQuestion | null,
        detailVisible: false,
        selectedQuestion: null as VisitQuestion | null,
        allQuestions: [] as VisitQuestion[],
        statistics: null as VisitStatistics | null,
        search: '',
        sorter: undefined as { sortBy: string; sortOrder: string } | undefined,
    });
    const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

    const loadAllQuestions = async () => { const res = await api.questions({ page: 1, pageSize: 1000 }); if (res.success && res.data) set({ allQuestions: res.data.queryable }); };
    const handleDeleteQuestion = (id: string) => { modal.confirm({ title: '确定要删除这个走访问题吗？', icon: <QuestionCircleOutlined />, content: '删除后将无法在问卷组题中使用', okText: '确定', okType: 'danger', cancelText: '取消', onOk: async () => { const res = await api.deleteQuestion(id); if (res.success) { message.success('删除成功'); actionRef.current?.reload(); loadStatistics(); } } }); };
    const loadStatistics = () => { api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); };

    useEffect(() => { loadStatistics(); loadAllQuestions(); }, []);

    const columns: ProColumns<VisitQuestion>[] = [
        { title: '问题内容', dataIndex: 'content', key: 'content', sorter: true, ellipsis: true, render: (dom, r) => <Space><QuestionCircleOutlined style={{ color: '#1890ff' }} /><Text strong>{dom}</Text></Space> },
        { title: '分类', dataIndex: 'category', key: 'category', sorter: true, width: 120, render: (dom) => <Tag color="blue">{dom || '通用'}</Tag> },
        { title: '常用', dataIndex: 'isFrequentlyUsed', key: 'isFrequentlyUsed', sorter: true, width: 100, render: (dom) => dom ? <StarFilled style={{ color: '#fadb14' }} /> : <StarOutlined style={{ color: '#d9d9d9' }} /> },
        { title: '操作', key: 'action', width: 150, render: (_, r) => [
            <Button key="view" type="link" icon={<EyeOutlined />} onClick={() => set({ selectedQuestion: r, detailVisible: true })}>查看</Button>,
            <Button key="edit" type="link" icon={<EditOutlined />} onClick={() => set({ editingQuestion: r, formVisible: true })}>编辑</Button>,
            <Button key="delete" type="link" danger icon={<DeleteOutlined />} onClick={() => handleDeleteQuestion(r.id)}>删除</Button>,
        ]},
    ];

    return (
        <PageContainer>
            <ProTable actionRef={actionRef} rowKey="id" headerTitle={
              <Space size={24}>
                <Space><BookOutlined />走访知识库</Space>
                <Space size={12}>
                  <Tag color="blue">问题 {state.allQuestions.length}</Tag>
                  <Tag color="green">常用 {state.allQuestions.filter((q) => q.isFrequentlyUsed).length}</Tag>
                  <Tag color="cyan">评价 {state.statistics?.totalAssessments || 0}</Tag>
                  <Tag color="purple">均分 {state.statistics?.averageScore?.toFixed(1) || '0.0'}</Tag>
                </Space>
              </Space>
            }
                request={async (params: any) => {
                    const { current, pageSize } = params;
                    const sortParams = state.sorter?.sortBy && state.sorter?.sortOrder ? state.sorter : undefined;
                    const res = await api.questions({ page: current, pageSize, search: state.search, ...sortParams });
                    return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
                }}
                columns={columns} search={false}
                scroll={{ x: 'max-content' }}
                toolBarRender={() => [
                    <Input.Search
                        key="search"
                        placeholder="搜索..."
                        allowClear
                        value={state.search}
                        onChange={(e) => set({ search: e.target.value })}
                        onSearch={(v) => { set({ search: v }); actionRef.current?.reload(); }}
                        style={{ width: 260, marginRight: 8 }}
                        prefix={<SearchOutlined />}
                    />,
                    <Button key="refresh" icon={<ReloadOutlined />} onClick={() => actionRef.current?.reload()}>刷新</Button>,
                    <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => set({ editingQuestion: null, formVisible: true })}>新增问题</Button>,
                ]}
                onChange={(_p, _f, s: any) => set({ sorter: s?.order ? { sortBy: s.field, sortOrder: s.order === 'ascend' ? 'asc' : 'desc' } : undefined })}
            />

            <ModalForm key={state.editingQuestion?.id || 'create-question'} title={state.editingQuestion ? '编辑问题' : '新增问题'} open={state.formVisible} onOpenChange={(open) => { if (!open) set({ formVisible: false, editingQuestion: null }); }}
                initialValues={state.editingQuestion ? { content: state.editingQuestion.content, category: state.editingQuestion.category ? [state.editingQuestion.category] : [], answer: state.editingQuestion.answer, isFrequentlyUsed: state.editingQuestion.isFrequentlyUsed, sortOrder: state.editingQuestion.sortOrder } : undefined}
                onFinish={async (values) => { const data = { content: values.content, category: Array.isArray(values.category) ? values.category[0] : values.category, answer: values.answer, isFrequentlyUsed: values.isFrequentlyUsed, sortOrder: values.sortOrder }; const res = state.editingQuestion ? await api.updateQuestion(state.editingQuestion.id, data) : await api.createQuestion(data); if (res.success) { message.success('保存成功'); set({ formVisible: false, editingQuestion: null }); actionRef.current?.reload(); loadStatistics(); } return res.success; }} autoFocusFirstInput width={600}>
                <ProFormText name="content" label="问题内容" placeholder="请输入走访过程中可能遇到的问题" rules={[{ required: true, message: '请输入问题内容' }]} />
                <ProFormSelect name="category" label="分类" placeholder="请选择分类" options={[{ label: '政策咨询', value: '政策咨询' }, { label: '物业服务', value: '物业服务' }, { label: '政务代办', value: '政务代办' }]} />
                <ProFormText name="answer" label="标准回答/解析" placeholder="请输入针对该问题的标准回答或处理建议" />
                <ProFormSelect name="isFrequentlyUsed" label="标记为常用" valueEnum={{ true: '是', false: '否' }} />
                <ProFormText name="sortOrder" label="排序值" placeholder="数值越小越靠前" fieldProps={{ type: 'number' }} />
            </ModalForm>

            <Drawer title="问题详情" open={state.detailVisible} onClose={() => set({ detailVisible: false, selectedQuestion: null })} size={640} extra={<Button onClick={() => set({ detailVisible: false })}>关闭</Button>}>
                {state.selectedQuestion ? (
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        <ProDescriptions title="基本信息" bordered column={1}>
                            <ProDescriptions.Item label="分类"><Tag color="blue">{state.selectedQuestion.category || '通用'}</Tag></ProDescriptions.Item>
                            <ProDescriptions.Item label="常用标记">{state.selectedQuestion.isFrequentlyUsed ? <StarFilled style={{ color: '#fadb14' }} /> : <StarOutlined style={{ color: '#d9d9d9' }} />}</ProDescriptions.Item>
                        </ProDescriptions>
                        <ProDescriptions title="问题与回答" bordered column={1}>
                            <ProDescriptions.Item label="问题内容">{state.selectedQuestion.content}</ProDescriptions.Item>
                            <ProDescriptions.Item label="标准回答/解析"><Text style={{ whiteSpace: 'pre-wrap' }}>{state.selectedQuestion.answer || '暂无解析'}</Text></ProDescriptions.Item>
                        </ProDescriptions>
                    </Space>
                ) : <Empty />}
            </Drawer>
        </PageContainer>
    );
};

export default VisitKnowledgeBase;
