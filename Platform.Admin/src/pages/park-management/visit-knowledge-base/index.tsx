import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl, request } from '@umijs/max';
import { Tag, Space, Button, Input, App, Typography, Empty, Popconfirm, Spin } from 'antd';
import { Drawer } from 'antd';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import { ModalForm, ProFormText, ProFormTextArea, ProFormSelect, ProFormSwitch, ProForm } from '@ant-design/pro-form';
import { PlusOutlined, ReloadOutlined, QuestionCircleOutlined, StarOutlined, StarFilled, EditOutlined, DeleteOutlined, EyeOutlined, SearchOutlined, BookOutlined, RobotOutlined } from '@ant-design/icons';
import { ProDescriptions } from '@ant-design/pro-components';
import { marked } from 'marked';
import dayjs from 'dayjs';
import { ApiResponse, PagedResult } from '@/types';

const { Text, Paragraph } = Typography;

interface VisitQuestion { id: string; content: string; category?: string; answer?: string; isFrequentlyUsed: boolean; createdAt?: string; updatedAt?: string; }
interface VisitStatistics { pendingTasks: number; completedTasksThisMonth: number; activeManagers: number; completionRate: number; totalAssessments: number; averageScore: number; tasksByType: Record<string, number>; tasksByStatus: Record<string, number>; }
interface QuestionFormData { content: string; category?: string; answer?: string; isFrequentlyUsed?: boolean; }

const api = {
    questions: (params: any) => request<ApiResponse<PagedResult<VisitQuestion>>>('/apiservice/api/park-management/visit/questions', { params }),
    createQuestion: (data: QuestionFormData) => request<ApiResponse<VisitQuestion>>('/apiservice/api/park-management/visit/question', { method: 'POST', data }),
    updateQuestion: (id: string, data: QuestionFormData) => request<ApiResponse<VisitQuestion>>(`/apiservice/api/park-management/visit/question/${id}`, { method: 'PUT', data }),
    deleteQuestion: (id: string) => request<ApiResponse<boolean>>(`/apiservice/api/park-management/visit/question/${id}`, { method: 'DELETE' }),
    statistics: () => request<ApiResponse<VisitStatistics>>('/apiservice/api/park-management/visit/statistics'),
    generateAnswer: (content: string, category?: string) => request<ApiResponse<string>>('/apiservice/api/park-management/visit/question/generate-answer', { method: 'POST', data: { content, category } }),
};

const VisitKnowledgeBase: React.FC = () => {
    const intl = useIntl();
    const { message, modal } = App.useApp();
    const actionRef = useRef<ActionType | undefined>(undefined);
    const [form] = ProForm.useForm();
    const [state, setState] = useState({
        formVisible: false,
        editingQuestion: null as VisitQuestion | null,
        detailVisible: false,
        selectedQuestion: null as VisitQuestion | null,
        allQuestions: [] as VisitQuestion[],
        statistics: null as VisitStatistics | null,
        search: '',
        sorter: undefined as { sortBy: string; sortOrder: string } | undefined,
        generatingAnswer: false,
    });
    const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

    const loadAllQuestions = async () => { const res = await api.questions({ page: 1, pageSize: 1000 }); if (res.success && res.data) set({ allQuestions: res.data.queryable }); };
    const handleDeleteQuestion = (id: string) => { modal.confirm({ title: intl.formatMessage({ id: 'pages.park.visitKnowledge.confirmDelete' }), icon: <QuestionCircleOutlined />, content: intl.formatMessage({ id: 'pages.park.visitKnowledge.deleteWarning' }), okText: intl.formatMessage({ id: 'common.ok' }), okType: 'danger', cancelText: intl.formatMessage({ id: 'common.cancel' }), onOk: async () => { const res = await api.deleteQuestion(id); if (res.success) { message.success(intl.formatMessage({ id: 'pages.park.visitKnowledge.message.deleteSuccess' })); actionRef.current?.reload(); loadStatistics(); } } }); };
    const loadStatistics = () => { api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); };

    const handleGenerateAnswer = async () => {
        const values = form.getFieldsValue(['content', 'category']);
        if (!values.content) { message.warning(intl.formatMessage({ id: 'pages.park.visitKnowledge.message.fillContentFirst' })); return; }
        set({ generatingAnswer: true });
        try {
            const categoryValue = Array.isArray(values.category) ? values.category[0] : values.category;
            const res = await api.generateAnswer(values.content, categoryValue);
            if (res.success && res.data) { form.setFieldValue('answer', res.data); message.success(intl.formatMessage({ id: 'pages.park.visitKnowledge.message.aiGenerated' })); }
            else { message.error(res.message || intl.formatMessage({ id: 'pages.park.visitKnowledge.message.generateFailed' })); }
        } catch { message.error(intl.formatMessage({ id: 'pages.park.visitKnowledge.message.generateFailedRetry' })); }
        finally { set({ generatingAnswer: false }); }
    };

    useEffect(() => { loadStatistics(); loadAllQuestions(); }, []);

    const columns: ProColumns<VisitQuestion>[] = [
        { title: intl.formatMessage({ id: 'pages.park.visitKnowledge.columns.content' }), dataIndex: 'content', key: 'content', sorter: true, ellipsis: true, render: (dom, r) => <Space><QuestionCircleOutlined style={{ color: '#1890ff' }} /><Text strong>{dom}</Text></Space> },
        { title: intl.formatMessage({ id: 'pages.park.visitKnowledge.columns.category' }), dataIndex: 'category', key: 'category', sorter: true, width: 120, render: (dom) => <Tag color="blue">{dom || intl.formatMessage({ id: 'pages.park.visitKnowledge.category.general' })}</Tag> },
        { title: intl.formatMessage({ id: 'pages.park.visitKnowledge.columns.frequent' }), dataIndex: 'isFrequentlyUsed', key: 'isFrequentlyUsed', sorter: true, width: 100, render: (dom) => dom ? <StarFilled style={{ color: '#fadb14' }} /> : <StarOutlined style={{ color: '#d9d9d9' }} /> },
        { title: intl.formatMessage({ id: 'common.action' }), key: 'action', valueType: 'option', fixed: 'right', width: 180, render: (_, r) => (
            <Space size={4}>
                <Button variant="link" color="cyan" size="small" icon={<EyeOutlined />} onClick={() => set({ selectedQuestion: r, detailVisible: true })}>{intl.formatMessage({ id: 'common.view' })}</Button>
                <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { form.setFieldsValue({ content: r.content, category: r.category ? [r.category] : [], answer: r.answer, isFrequentlyUsed: r.isFrequentlyUsed }); set({ editingQuestion: r, formVisible: true }); }}>{intl.formatMessage({ id: 'common.edit' })}</Button>
                <Popconfirm title={intl.formatMessage({ id: 'pages.park.visitKnowledge.confirmDelete' })} onConfirm={() => handleDeleteQuestion(r.id)}>
                    <Button type="link" size="small" danger icon={<DeleteOutlined />}>{intl.formatMessage({ id: 'common.delete' })}</Button>
                </Popconfirm>
            </Space>
        )},
    ];

    return (
        <PageContainer>
            <ProTable actionRef={actionRef} rowKey="id" headerTitle={
              <Space size={24}>
                <Space><BookOutlined />{intl.formatMessage({ id: 'pages.park.visitKnowledge.knowledgeBase' })}</Space>
                <Space size={12}>
                  <Tag color="blue">{intl.formatMessage({ id: 'pages.park.visitKnowledge.questions' })} {state.allQuestions.length}</Tag>
                  <Tag color="green">{intl.formatMessage({ id: 'pages.park.visitKnowledge.frequent' })} {state.allQuestions.filter((q) => q.isFrequentlyUsed).length}</Tag>
                  <Tag color="cyan">{intl.formatMessage({ id: 'pages.park.visitKnowledge.assessments' })} {state.statistics?.totalAssessments || 0}</Tag>
                  <Tag color="purple">{intl.formatMessage({ id: 'pages.park.visitKnowledge.averageScore' })} {state.statistics?.averageScore?.toFixed(1) || '0.0'}</Tag>
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
                        placeholder={intl.formatMessage({ id: 'common.search' })}
                        allowClear
                        value={state.search}
                        onChange={(e) => set({ search: e.target.value })}
                        onSearch={(v) => { set({ search: v }); actionRef.current?.reload(); }}
                        style={{ width: 260, marginRight: 8 }}
                        prefix={<SearchOutlined />}
                    />,
                    <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => { set({ editingQuestion: null }); setTimeout(() => form.resetFields(), 0); set({ formVisible: true }); }}>{intl.formatMessage({ id: 'pages.park.visitKnowledge.addQuestion' })}</Button>,
                ]}
                onChange={(_p, _f, s: any) => set({ sorter: s?.order ? { sortBy: s.field, sortOrder: s.order === 'ascend' ? 'asc' : 'desc' } : undefined })}
            />

            <ModalForm form={form} key={state.editingQuestion?.id || 'create-question'} title={state.editingQuestion ? intl.formatMessage({ id: 'pages.park.visitKnowledge.editQuestion' }) : intl.formatMessage({ id: 'pages.park.visitKnowledge.addQuestion' })} open={state.formVisible} onOpenChange={(open) => { if (!open) { form.resetFields(); set({ formVisible: false, editingQuestion: null }); } }}
                initialValues={state.editingQuestion ? { content: state.editingQuestion.content, category: state.editingQuestion.category ? [state.editingQuestion.category] : [], answer: state.editingQuestion.answer, isFrequentlyUsed: state.editingQuestion.isFrequentlyUsed } : { isFrequentlyUsed: false }}
                onFinish={async (values) => { const data = { content: values.content, category: Array.isArray(values.category) ? values.category[0] : values.category, answer: values.answer, isFrequentlyUsed: values.isFrequentlyUsed }; const res = state.editingQuestion ? await api.updateQuestion(state.editingQuestion.id, data) : await api.createQuestion(data); if (res.success) { message.success(intl.formatMessage({ id: 'pages.park.visitKnowledge.message.saveSuccess' })); set({ formVisible: false, editingQuestion: null }); actionRef.current?.reload(); loadStatistics(); } return res.success; }} autoFocusFirstInput width={600}>
                <ProFormText name="content" label={intl.formatMessage({ id: 'pages.park.visitKnowledge.columns.content' })} placeholder={intl.formatMessage({ id: 'pages.park.visitKnowledge.contentPlaceholder' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.park.visitKnowledge.contentRequired' }) }]} />
                <ProFormSelect name="category" label={intl.formatMessage({ id: 'pages.park.visitKnowledge.columns.category' })} placeholder={intl.formatMessage({ id: 'pages.park.visitKnowledge.categoryPlaceholder' })} options={[{ label: intl.formatMessage({ id: 'pages.park.visitKnowledge.category.policy' }), value: '政策咨询' }, { label: intl.formatMessage({ id: 'pages.park.visitKnowledge.category.property' }), value: '物业服务' }, { label: intl.formatMessage({ id: 'pages.park.visitKnowledge.category.government' }), value: '政务代办' }]} />
                <ProFormTextArea name="answer" label={<><span>{intl.formatMessage({ id: 'pages.park.visitKnowledge.answerLabel' })}</span><Button type="link" size="small" icon={<RobotOutlined />} loading={state.generatingAnswer} onClick={(e) => { e.stopPropagation(); handleGenerateAnswer(); }}>{intl.formatMessage({ id: 'pages.park.visitKnowledge.aiGenerate' })}</Button></>} placeholder={intl.formatMessage({ id: 'pages.park.visitKnowledge.answerPlaceholder' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.park.visitKnowledge.answerRequired' })}]} fieldProps={{ rows: 4 }} />
                <ProFormSwitch name="isFrequentlyUsed" label={intl.formatMessage({ id: 'pages.park.visitKnowledge.markFrequent' })} />
            </ModalForm>

            <Drawer title={intl.formatMessage({ id: 'pages.park.visitKnowledge.questionDetail' })} placement="right" open={state.detailVisible} onClose={() => set({ detailVisible: false, selectedQuestion: null })} size="large" extra={<Button onClick={() => set({ detailVisible: false })}>{intl.formatMessage({ id: 'common.close' })}</Button>}>
                {state.selectedQuestion ? (
                    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                        <ProDescriptions title={intl.formatMessage({ id: 'pages.park.visitKnowledge.basicInfo' })} bordered column={1}>
                            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.visitKnowledge.columns.category' })}><Tag color="blue">{state.selectedQuestion.category || intl.formatMessage({ id: 'pages.park.visitKnowledge.category.general' })}</Tag></ProDescriptions.Item>
                            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.visitKnowledge.frequentMark' })}>{state.selectedQuestion.isFrequentlyUsed ? <StarFilled style={{ color: '#fadb14' }} /> : <StarOutlined style={{ color: '#d9d9d9' }} />}</ProDescriptions.Item>
                        </ProDescriptions>
                        <ProDescriptions title={intl.formatMessage({ id: 'pages.park.visitKnowledge.questionAndAnswer' })} bordered column={1}>
                            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.visitKnowledge.columns.content' })}>{state.selectedQuestion.content}</ProDescriptions.Item>
                            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.park.visitKnowledge.answerLabel' })}>
                                {state.selectedQuestion.answer ? (
                                    <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked(state.selectedQuestion.answer) }} />
                                ) : <Text type="secondary">{intl.formatMessage({ id: 'pages.park.visitKnowledge.noAnswer' })}</Text>}
                            </ProDescriptions.Item>
                        </ProDescriptions>
                    </Space>
                ) : <Empty />}
            </Drawer>
        </PageContainer>
    );
};

export default VisitKnowledgeBase;
