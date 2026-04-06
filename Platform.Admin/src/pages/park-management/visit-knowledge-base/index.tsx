import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { StatCard } from '@/components';
import { request } from '@umijs/max';
import { Tag, Space, Row, Col, Button, Input, InputNumber, Select, Switch, App, List, Typography, Drawer, Transfer, Empty, Tabs } from 'antd';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import { ProCard } from '@ant-design/pro-components';
import { ModalForm, ProFormText, ProFormSelect } from '@ant-design/pro-form';
import { PlusOutlined, ReloadOutlined, QuestionCircleOutlined, FileTextOutlined, StarOutlined, StarFilled, EditOutlined, DeleteOutlined, EyeOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { ProDescriptions } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import { ApiResponse, PagedResult, PageParams } from '@/types';

const { Text } = Typography;

interface VisitQuestion { id: string; content: string; category?: string; answer?: string; isFrequentlyUsed: boolean; sortOrder: number; createdAt?: string; updatedAt?: string; }
interface VisitQuestionnaire { id: string; title: string; purpose?: string; questionIds: string[]; questionCount: number; createdAt: string; sortOrder: number; }
interface VisitStatistics { pendingTasks: number; completedTasksThisMonth: number; activeManagers: number; completionRate: number; totalAssessments: number; averageScore: number; tasksByType: Record<string, number>; tasksByStatus: Record<string, number>; }
interface QuestionFormData { content: string; category?: string; answer?: string; isFrequentlyUsed?: boolean; sortOrder?: number; }
interface QuestionnaireFormData { title: string; purpose?: string; sortOrder?: number; questionIds?: string[]; }

const api = {
    questions: (params: PageParams & { sortBy?: string; sortOrder?: string }) => request<ApiResponse<PagedResult<VisitQuestion>>>('/api/park-management/visit/questions', { params }),
    createQuestion: (data: QuestionFormData) => request<ApiResponse<VisitQuestion>>('/api/park-management/visit/question', { method: 'POST', data }),
    updateQuestion: (id: string, data: QuestionFormData) => request<ApiResponse<VisitQuestion>>(`/api/park-management/visit/question/${id}`, { method: 'PUT', data }),
    deleteQuestion: (id: string) => request<ApiResponse<boolean>>(`/api/park-management/visit/question/${id}`, { method: 'DELETE' }),
    questionnaires: (params?: PageParams) => request<ApiResponse<PagedResult<VisitQuestionnaire>>>('/api/park-management/visit/questionnaires', { params }),
    createQuestionnaire: (data: QuestionnaireFormData) => request<ApiResponse<VisitQuestionnaire>>('/api/park-management/visit/questionnaire', { method: 'POST', data }),
    updateQuestionnaire: (id: string, data: QuestionnaireFormData) => request<ApiResponse<VisitQuestionnaire>>(`/api/park-management/visit/questionnaire/${id}`, { method: 'PUT', data }),
    deleteQuestionnaire: (id: string) => request<ApiResponse<boolean>>(`/api/park-management/visit/questionnaire/${id}`, { method: 'DELETE' }),
    statistics: () => request<ApiResponse<VisitStatistics>>('/api/park-management/visit/statistics'),
};

const VisitKnowledgeBase: React.FC = () => {
    const { message, modal } = App.useApp();
    const actionRef = useRef<ActionType | undefined>(undefined);
    const [state, setState] = useState({
        activeTab: 'questions', questionModalVisible: false, questionnaireModalVisible: false,
        editingQuestion: null as VisitQuestion | null, editingQuestionnaire: null as VisitQuestionnaire | null,
        questionDetailVisible: false, selectedQuestion: null as VisitQuestion | null,
        questionnaireDetailVisible: false, selectedQuestionnaire: null as VisitQuestionnaire | null,
        allQuestions: [] as VisitQuestion[], targetKeys: [] as string[],
        statistics: null as VisitStatistics | null, searchText: '',
        sorter: undefined as { sortBy: string; sortOrder: string } | undefined,
    });
    const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

    const questionColumns: ProColumns<VisitQuestion>[] = [
        { title: '问题内容', dataIndex: 'content', key: 'content', sorter: true, ellipsis: true, render: (dom, r) => <Space><QuestionCircleOutlined style={{ color: '#1890ff' }} /><Text strong>{dom}</Text></Space> },
        { title: '分类', dataIndex: 'category', key: 'category', sorter: true, width: 120, render: (dom) => <Tag color="blue">{dom || '通用'}</Tag> },
        { title: '常用', dataIndex: 'isFrequentlyUsed', key: 'isFrequentlyUsed', sorter: true, width: 100, render: (dom) => dom ? <StarFilled style={{ color: '#fadb14' }} /> : <StarOutlined style={{ color: '#d9d9d9' }} /> },
        { title: '操作', key: 'action', width: 150, render: (_, r) => [
            <Button key="view" type="link" icon={<EyeOutlined />} onClick={() => set({ selectedQuestion: r, questionDetailVisible: true })}>查看</Button>,
            <Button key="edit" type="link" icon={<EditOutlined />} onClick={() => set({ editingQuestion: r, questionModalVisible: true })}>编辑</Button>,
            <Button key="delete" type="link" danger icon={<DeleteOutlined />} onClick={() => handleDeleteQuestion(r.id)}>删除</Button>,
        ]},
    ];

    const questionnaireColumns: ProColumns<VisitQuestionnaire>[] = [
        { title: '问卷名称', dataIndex: 'title', key: 'title', sorter: true, render: (dom) => <Space><FileTextOutlined style={{ color: '#52c41a' }} /><Text strong>{dom}</Text></Space> },
        { title: '走访目的', dataIndex: 'purpose', key: 'purpose', sorter: true, ellipsis: true },
        { title: '题目数量', dataIndex: 'questionCount', key: 'questionCount', sorter: true, width: 100, render: (dom) => <Tag color="cyan">{dom} 题</Tag> },
        { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', sorter: true, width: 120, render: (dom: any) => dayjs(dom as string).format('YYYY-MM-DD') },
        { title: '操作', key: 'action', width: 150, render: (_, r) => [
            <Button key="view" type="link" icon={<EyeOutlined />} onClick={() => { set({ selectedQuestionnaire: r, questionnaireDetailVisible: true }); if (state.allQuestions.length === 0) loadAllQuestions(); }}>查看</Button>,
            <Button key="edit" type="link" icon={<EditOutlined />} onClick={async () => { set({ editingQuestionnaire: r, targetKeys: r.questionIds || [] }); await loadAllQuestions(); set({ questionnaireModalVisible: true }); }}>编辑</Button>,
            <Button key="delete" type="link" danger icon={<DeleteOutlined />} onClick={() => handleDeleteQuestionnaire(r.id)}>删除</Button>,
        ]},
    ];

    const loadAllQuestions = async () => { const res = await api.questions({ page: 1 }); if (res.success && res.data) set({ allQuestions: res.data.queryable }); };
    const handleDeleteQuestion = (id: string) => { modal.confirm({ title: '确定要删除这个走访问题吗？', icon: <QuestionCircleOutlined />, content: '删除后将无法在问卷组题中使用', okText: '确定', okType: 'danger', cancelText: '取消', onOk: async () => { const res = await api.deleteQuestion(id); if (res.success) { message.success('删除成功'); actionRef.current?.reload(); loadStatistics(); } } }); };
    const handleDeleteQuestionnaire = (id: string) => { modal.confirm({ title: '确定要删除这个问卷模板吗？', icon: <QuestionCircleOutlined />, content: '删除后将无法使用该模版创建走访任务', okText: '确定', okType: 'danger', cancelText: '取消', onOk: async () => { const res = await api.deleteQuestionnaire(id); if (res.success) { message.success('删除成功'); actionRef.current?.reload(); loadStatistics(); } } }); };
    const handleMoveQuestion = (index: number, direction: 'up' | 'down') => { const newTargetKeys = [...state.targetKeys]; const swapIndex = direction === 'up' ? index - 1 : index + 1; if (swapIndex >= 0 && swapIndex < newTargetKeys.length) { [newTargetKeys[index], newTargetKeys[swapIndex]] = [newTargetKeys[swapIndex], newTargetKeys[index]]; set({ targetKeys: newTargetKeys as string[] }); } };
    const loadStatistics = () => { api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); };

    useEffect(() => { loadStatistics(); loadAllQuestions(); }, []);

    return (
        <PageContainer title="走访知识库" extra={
            <Space>
                <Button icon={<ReloadOutlined />} onClick={() => { actionRef.current?.reload(); loadStatistics(); }}>刷新</Button>
                {state.activeTab === 'questions' ? (<Button type="primary" icon={<PlusOutlined />} onClick={() => set({ editingQuestion: null, questionModalVisible: true })}>新增问题</Button>)
                    : (<Button type="primary" icon={<PlusOutlined />} onClick={async () => { set({ editingQuestionnaire: null, targetKeys: [] }); await loadAllQuestions(); set({ questionnaireModalVisible: true }); }}>新增问卷</Button>)}
            </Space>
        }>
            <Tabs activeKey={state.activeTab} onChange={(k) => set({ activeTab: k })} items={[
                { key: 'questions', label: '高频问题库', children: (<ProCard><ProTable actionRef={actionRef} rowKey="id" request={async (params: any) => { const { current, pageSize } = params; const sortParams = state.sorter?.sortBy && state.sorter?.sortOrder ? state.sorter : undefined; const res = await api.questions({ page: current, pageSize, search: state.searchText, ...sortParams }); loadStatistics(); return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success }; }} columns={questionColumns} search={false} toolBarRender={() => [<Input.Search key="search" placeholder="搜索..." style={{ width: 200 }} allowClear value={state.searchText} onChange={(e) => set({ searchText: e.target.value })} onSearch={(v) => { set({ searchText: v }); actionRef.current?.reload(); }} />]} onChange={(_p, _f, s: any) => set({ sorter: s?.order ? { sortBy: s.field, sortOrder: s.order === 'ascend' ? 'asc' : 'desc' } : undefined })} /></ProCard>) },
                { key: 'templates', label: '问卷模板', children: (<ProCard><ProTable actionRef={actionRef} rowKey="id" request={async (params: any) => { const { current, pageSize } = params; const res = await api.questionnaires({ page: current, pageSize }); return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success }; }} columns={questionnaireColumns} search={false} toolBarRender={() => [<Button key="refresh" icon={<ReloadOutlined />} onClick={() => actionRef.current?.reload()}>刷新</Button>]} /></ProCard>) }
            ]} />

            <ModalForm key={state.editingQuestion?.id || 'create-question'} title={state.editingQuestion ? '编辑问题' : '新增问题'} open={state.questionModalVisible} onOpenChange={(open) => { if (!open) set({ questionModalVisible: false, editingQuestion: null }); }}
                initialValues={state.editingQuestion ? { content: state.editingQuestion.content, category: state.editingQuestion.category ? [state.editingQuestion.category] : [], answer: state.editingQuestion.answer, isFrequentlyUsed: state.editingQuestion.isFrequentlyUsed, sortOrder: state.editingQuestion.sortOrder } : undefined}
                onFinish={async (values) => { const data = { content: values.content, category: Array.isArray(values.category) ? values.category[0] : values.category, answer: values.answer, isFrequentlyUsed: values.isFrequentlyUsed, sortOrder: values.sortOrder }; const res = state.editingQuestion ? await api.updateQuestion(state.editingQuestion.id, data) : await api.createQuestion(data); if (res.success) { message.success('保存成功'); set({ questionModalVisible: false, editingQuestion: null }); actionRef.current?.reload(); loadStatistics(); } return res.success; }} autoFocusFirstInput width={600}>
                <ProFormText name="content" label="问题内容" placeholder="请输入走访过程中可能遇到的问题" rules={[{ required: true, message: '请输入问题内容' }]} />
                <ProFormSelect name="category" label="分类" placeholder="请选择分类" options={[{ label: '政策咨询', value: '政策咨询' }, { label: '物业服务', value: '物业服务' }, { label: '政务代办', value: '政务代办' }]} />
                <ProFormText name="answer" label="标准回答/解析" placeholder="请输入针对该问题的标准回答或处理建议" />
                <ProFormSelect name="isFrequentlyUsed" label="标记为常用" valueEnum={{ true: '是', false: '否' }} />
                <ProFormText name="sortOrder" label="排序值" placeholder="数值越小越靠前" fieldProps={{ type: 'number' }} />
            </ModalForm>

            <ModalForm key={state.editingQuestionnaire?.id || 'create-questionnaire'} title={state.editingQuestionnaire ? '编辑问卷' : '新增问卷'} open={state.questionnaireModalVisible} onOpenChange={(open) => { if (!open) set({ questionnaireModalVisible: false, editingQuestionnaire: null, targetKeys: [] }); }}
                initialValues={state.editingQuestionnaire ? { title: state.editingQuestionnaire.title, purpose: state.editingQuestionnaire.purpose, sortOrder: state.editingQuestionnaire.sortOrder } : undefined}
                onFinish={async (values) => { const data = { title: values.title, purpose: values.purpose, sortOrder: values.sortOrder, questionIds: state.targetKeys }; const res = state.editingQuestionnaire ? await api.updateQuestionnaire(state.editingQuestionnaire.id, data) : await api.createQuestionnaire(data); if (res.success) { message.success('保存成功'); set({ questionnaireModalVisible: false, editingQuestionnaire: null, targetKeys: [] }); actionRef.current?.reload(); loadStatistics(); } return res.success; }} autoFocusFirstInput width={800}>
                <ProFormText name="title" label="问卷名称" placeholder="例如：新入驻企业满意度调研" rules={[{ required: true, message: '请输入问卷名称' }]} />
                <ProFormText name="purpose" label="走访目的" placeholder="例如：收集企业诉求，改进物业服务" />
                <ProFormText name="sortOrder" label="排序值" placeholder="数值越小越靠前" fieldProps={{ type: 'number' }} />
                <div style={{ marginBottom: 24 }}><Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>选择题目</Typography.Text>
                    <Transfer {...{
                        dataSource: state.allQuestions,
                        showSearch: true,
                        listStyle: { width: 350, height: 400 },
                        titles: ['待选题目', '已选题目'],
                        targetKeys: state.targetKeys,
                        onChange: (keys: any) => set({ targetKeys: keys as string[] }),
                        rowKey: (item: any) => item.id,
                    } as any}
                        render={({ direction, filteredItems, onItemSelect }: any) => {
                            if (direction === 'left') return <List size="small" dataSource={filteredItems} style={{ height: '100%', overflow: 'auto' }} renderItem={(item: any) => <List.Item onClick={() => onItemSelect(item.id as string, !state.targetKeys.includes(item.id))} style={{ cursor: 'pointer', padding: '8px 12px' }}><Space>{state.targetKeys.includes(item.id) ? <Tag color="blue">已选</Tag> : <div style={{ width: 34 }} />}<Text ellipsis style={{ width: 240 }}>{item.content}</Text></Space></List.Item>} />;
                            const sortedItems = state.targetKeys.map(key => state.allQuestions.find(q => q.id === key)).filter((item): item is VisitQuestion => !!item);
                            return <List size="small" dataSource={sortedItems} style={{ height: '100%', overflow: 'auto' }} renderItem={(item, index) => <List.Item actions={[<Button key="up" type="text" size="small" icon={<ArrowUpOutlined />} disabled={index === 0} onClick={(e) => { e.stopPropagation(); handleMoveQuestion(index, 'up'); }} />, <Button key="down" type="text" size="small" icon={<ArrowDownOutlined />} disabled={index === sortedItems.length - 1} onClick={(e) => { e.stopPropagation(); handleMoveQuestion(index, 'down'); }} />, <Button key="del" type="text" size="small" danger icon={<DeleteOutlined />} onClick={(e) => { e.stopPropagation(); onItemSelect(item.id, false); }} />]} style={{ padding: '8px 12px' }}><Space><Tag color="#108ee9">{index + 1}</Tag><Text ellipsis={{ tooltip: item.content }} style={{ width: 180 }}>{item.content}</Text></Space></List.Item>} />;
                        }} />
                </div>
            </ModalForm>

            <Drawer title="问题详情" open={state.questionDetailVisible} onClose={() => set({ questionDetailVisible: false, selectedQuestion: null })} size={640} extra={<Button onClick={() => set({ questionDetailVisible: false })}>关闭</Button>}>
                {state.selectedQuestion ? (                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <ProDescriptions title="基本信息" bordered column={1}><ProDescriptions.Item label="分类"><Tag color="blue">{state.selectedQuestion.category || '通用'}</Tag></ProDescriptions.Item><ProDescriptions.Item label="常用标记">{state.selectedQuestion.isFrequentlyUsed ? <StarFilled style={{ color: '#fadb14' }} /> : <StarOutlined style={{ color: '#d9d9d9' }} />}</ProDescriptions.Item></ProDescriptions>
                    <ProDescriptions title="问题与回答" bordered column={1}><ProDescriptions.Item label="问题内容">{state.selectedQuestion.content}</ProDescriptions.Item><ProDescriptions.Item label="标准回答/解析"><Text style={{ whiteSpace: 'pre-wrap' }}>{state.selectedQuestion.answer || '暂无解析'}</Text></ProDescriptions.Item></ProDescriptions>
                </Space>) : <Empty />}
            </Drawer>

            <Drawer title="问卷详情" open={state.questionnaireDetailVisible} onClose={() => set({ questionnaireDetailVisible: false, selectedQuestionnaire: null })} size={640} extra={<Button onClick={() => set({ questionnaireDetailVisible: false })}>关闭</Button>}>
                {state.selectedQuestionnaire ? (                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <ProDescriptions title="基本信息" bordered column={1}><ProDescriptions.Item label="问卷名称">{state.selectedQuestionnaire.title}</ProDescriptions.Item><ProDescriptions.Item label="走访目的">{state.selectedQuestionnaire.purpose || '-'}</ProDescriptions.Item><ProDescriptions.Item label="题目数量">{state.selectedQuestionnaire.questionCount} 题</ProDescriptions.Item><ProDescriptions.Item label="创建时间">{dayjs(state.selectedQuestionnaire.createdAt).format('YYYY-MM-DD HH:mm:ss')}</ProDescriptions.Item></ProDescriptions>
                    <ProCard title="包含题目" size="small"><List size="small" dataSource={state.allQuestions.filter(q => state.selectedQuestionnaire?.questionIds?.includes(q.id))} renderItem={(item, index) => <List.Item><Space direction="vertical" style={{ width: '100%' }}><Space><Tag color="#108ee9">{index + 1}</Tag><Text strong>{item.content}</Text></Space>{item.answer && <div style={{ paddingLeft: 30, color: '#666', fontSize: 13 }}><Text type="secondary">解析：</Text><Text style={{ whiteSpace: 'pre-wrap' }}>{item.answer}</Text></div>}</Space></List.Item>} locale={{ emptyText: '该问卷暂无题目' }} /></ProCard>
                </Space>) : <Empty />}
            </Drawer>
        </PageContainer>
    );
};

export default VisitKnowledgeBase;
