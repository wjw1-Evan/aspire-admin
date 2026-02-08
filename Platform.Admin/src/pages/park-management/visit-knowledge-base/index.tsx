import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Tabs,
    Button,
    Space,
    Modal,
    Form,
    Input,
    Select,
    Switch,
    App,
    Card,
    List,
    Typography,
    Tag,
    Row,
    Col,
    Grid,
    Empty,
    Drawer,
    Descriptions,
    Divider,
} from 'antd';
import {
    PlusOutlined,
    ReloadOutlined,
    QuestionCircleOutlined,
    FileTextOutlined,
    StarOutlined,
    StarFilled,
    EditOutlined,
    DeleteOutlined,
    InfoCircleOutlined,
    EyeOutlined,
} from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import PageContainer from '@/components/PageContainer';
import DataTable from '@/components/DataTable';
import StatCard from '@/components/StatCard';
import SearchFormCard from '@/components/SearchFormCard';
import * as visitService from '@/services/visit';
import type { VisitQuestion, VisitQuestionnaire, VisitStatistics } from '@/services/visit';
import dayjs from 'dayjs';
import styles from './index.less';

const { Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

const VisitKnowledgeBase: React.FC = () => {
    const intl = useIntl();
    const { message, modal } = App.useApp();
    const [activeTab, setActiveTab] = useState('questions');
    const [isQuestionModalVisible, setIsQuestionModalVisible] = useState(false);
    const [isQuestionnaireModalVisible, setIsQuestionnaireModalVisible] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<VisitQuestion | null>(null);
    const [editingQuestionnaire, setEditingQuestionnaire] = useState<VisitQuestionnaire | null>(null);
    const [questionForm] = Form.useForm();
    const [questionnaireForm] = Form.useForm();
    const [searchForm] = Form.useForm();
    const [statistics, setStatistics] = useState<VisitStatistics | null>(null);
    const [loading, setLoading] = useState(false);
    const [questionDetailVisible, setQuestionDetailVisible] = useState(false);
    const [selectedQuestion, setSelectedQuestion] = useState<VisitQuestion | null>(null);
    const [questionnaireDetailVisible, setQuestionnaireDetailVisible] = useState(false);
    const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<VisitQuestionnaire | null>(null);
    const actionRef = useRef<any>(null);
    const screens = useBreakpoint();

    const loadStatistics = useCallback(async () => {
        try {
            const res = await visitService.getVisitStatistics();
            if (res.success && res.data) {
                setStatistics(res.data);
            }
        } catch (error) {
            console.error('Failed to load statistics:', error);
        }
    }, []);

    useEffect(() => {
        loadStatistics();
    }, [loadStatistics]);

    const handleSearch = () => {
        actionRef.current?.reload();
    };

    const handleReset = () => {
        searchForm.resetFields();
        handleSearch();
    };

    const questionColumns = [
        {
            title: '问题内容',
            dataIndex: 'content',
            key: 'content',
            ellipsis: true,
            render: (text: string) => (
                <Space>
                    <QuestionCircleOutlined style={{ color: '#1890ff' }} />
                    <Text strong>{text}</Text>
                </Space>
            )
        },
        {
            title: '分类',
            dataIndex: 'category',
            key: 'category',
            width: 120,
            render: (text: string) => <Tag color="blue">{text || '通用'}</Tag>,
        },
        {
            title: '常用',
            dataIndex: 'isFrequentlyUsed',
            key: 'isFrequentlyUsed',
            width: 100,
            render: (checked: boolean) => checked ? <StarFilled style={{ color: '#fadb14' }} /> : <StarOutlined style={{ color: '#d9d9d9' }} />,
        },
        {
            title: '操作',
            key: 'action',
            width: 120,
            render: (_: any, record: VisitQuestion) => (
                <Space>
                    <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => { setSelectedQuestion(record); setQuestionDetailVisible(true); }}>查看</Button>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { setEditingQuestion(record); questionForm.setFieldsValue(record); setIsQuestionModalVisible(true); }}>编辑</Button>
                    <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteQuestion(record.id)}>删除</Button>
                </Space>
            ),
        },
    ];

    const questionnaireColumns = [
        {
            title: '问卷名称',
            dataIndex: 'title',
            key: 'title',
            render: (text: string) => (
                <Space>
                    <FileTextOutlined style={{ color: '#52c41a' }} />
                    <Text strong>{text}</Text>
                </Space>
            )
        },
        {
            title: '走访目的',
            dataIndex: 'purpose',
            key: 'purpose',
            ellipsis: true,
        },
        {
            title: '题目数量',
            dataIndex: 'questionCount',
            key: 'questionCount',
            width: 100,
            render: (count: number) => <Tag color="cyan">{count} 题</Tag>,
        },
        {
            title: '创建时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 120,
            render: (text: string) => dayjs(text).format('YYYY-MM-DD'),
        },
        {
            title: '操作',
            key: 'action',
            width: 100,
            render: (_: any, record: VisitQuestionnaire) => (
                <Space>
                    <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => { setSelectedQuestionnaire(record); setQuestionnaireDetailVisible(true); }}>查看</Button>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { setEditingQuestionnaire(record); questionnaireForm.setFieldsValue(record); setIsQuestionnaireModalVisible(true); }}>编辑</Button>
                </Space>
            ),
        },
    ];

    const handleDeleteQuestion = (id: string) => {
        modal.confirm({
            title: '确定要删除这个办公问题吗？',
            icon: <InfoCircleOutlined />,
            content: '删除后将无法在问卷组题中使用',
            okText: '确定',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                try {
                    const res = await visitService.deleteQuestion(id);
                    if (res.success) {
                        message.success('删除成功');
                        actionRef.current?.reload();
                    }
                } catch (error) {
                    message.error('删除失败');
                }
            },
        });
    };

    return (
        <PageContainer
            title="走访知识库"
            extra={
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={() => { actionRef.current?.reload(); loadStatistics(); }}>
                        刷新
                    </Button>
                    {activeTab === 'questions' ? (
                        <Button key="add-q" type="primary" icon={<PlusOutlined />} onClick={() => { setEditingQuestion(null); questionForm.resetFields(); setIsQuestionModalVisible(true); }}>
                            新增问题
                        </Button>
                    ) : (
                        <Button key="add-template" type="primary" icon={<PlusOutlined />} onClick={() => { setEditingQuestionnaire(null); questionnaireForm.resetFields(); setIsQuestionnaireModalVisible(true); }}>
                            新增问卷
                        </Button>
                    )}
                </Space>
            }
        >
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                    {
                        key: 'questions',
                        label: '高频问题库',
                        children: (
                            <>
                                <SearchFormCard>
                                    <Form form={searchForm} layout="inline" onFinish={handleSearch}>
                                        <Form.Item name="search">
                                            <Input placeholder="搜索问题内容..." style={{ width: 250 }} allowClear />
                                        </Form.Item>
                                        <Form.Item name="category">
                                            <Select placeholder="所有分类" style={{ width: 150 }} allowClear>
                                                <Select.Option value="政策咨询">政策咨询</Select.Option>
                                                <Select.Option value="物业服务">物业服务</Select.Option>
                                                <Select.Option value="政务代办">政务代办</Select.Option>
                                            </Select>
                                        </Form.Item>
                                        <Form.Item>
                                            <Space>
                                                <Button type="primary" htmlType="submit">搜索</Button>
                                                <Button onClick={handleReset} icon={<ReloadOutlined />}>重置</Button>
                                            </Space>
                                        </Form.Item>
                                    </Form>
                                </SearchFormCard>
                                <Card>
                                    <DataTable<VisitQuestion>
                                        columns={questionColumns as any}
                                        request={async (params: any) => {
                                            const searchValues = searchForm.getFieldsValue();
                                            const res = await visitService.getQuestions({
                                                page: params.current || 1,
                                                pageSize: params.pageSize || 10,
                                                ...searchValues,
                                            });
                                            if (res.success && res.data) {
                                                return { data: res.data.questions, total: res.data.total, success: true };
                                            }
                                            return { data: [], total: 0, success: false };
                                        }}
                                        actionRef={actionRef}
                                        rowKey="id"
                                        search={false}
                                    />
                                </Card>
                            </>
                        )
                    },
                    {
                        key: 'templates',
                        label: '问卷模板',
                        children: (
                            <Card>
                                <DataTable<VisitQuestionnaire>
                                    columns={questionnaireColumns as any}
                                    request={async () => {
                                        const res = await visitService.getQuestionnaires();
                                        if (res.success && res.data) {
                                            return { data: res.data.questionnaires, total: res.data.total, success: true };
                                        }
                                        return { data: [], total: 0, success: false };
                                    }}
                                    actionRef={actionRef}
                                    rowKey="id"
                                    search={false}
                                />
                            </Card>
                        )
                    }
                ]}
            />

            <Modal
                title={editingQuestion ? '编辑问题' : '新增问题'}
                open={isQuestionModalVisible}
                onCancel={() => setIsQuestionModalVisible(false)}
                onOk={async () => {
                    const values = await questionForm.validateFields();
                    setLoading(true);
                    try {
                        const res = editingQuestion
                            ? await visitService.updateQuestion(editingQuestion.id, values)
                            : await visitService.createQuestion(values);
                        if (res.success) {
                            message.success('保存成功');
                            setIsQuestionModalVisible(false);
                            actionRef.current?.reload();
                        }
                    } finally {
                        setLoading(false);
                    }
                }}
                width={600}
                confirmLoading={loading}
            >
                <Form form={questionForm} layout="vertical">
                    <Form.Item name="content" label="问题内容" rules={[{ required: true, message: '请输入问题内容' }]}>
                        <Input.TextArea rows={2} placeholder="请输入走访过程中可能遇到的问题" />
                    </Form.Item>
                    <Form.Item name="category" label="分类">
                        <Select placeholder="请选择分类">
                            <Select.Option value="政策咨询">政策咨询</Select.Option>
                            <Select.Option value="物业服务">物业服务</Select.Option>
                            <Select.Option value="政务代办">政务代办</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="answer" label="标准回答/解析">
                        <Input.TextArea rows={4} placeholder="请输入针对该问题的标准回答或处理建议" />
                    </Form.Item>
                    <Form.Item name="isFrequentlyUsed" label="标记为常用" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={editingQuestionnaire ? '编辑问卷' : '新增问卷'}
                open={isQuestionnaireModalVisible}
                onCancel={() => setIsQuestionnaireModalVisible(false)}
                onOk={async () => {
                    const values = await questionnaireForm.validateFields();
                    setLoading(true);
                    try {
                        const res = await visitService.createQuestionnaire(values);
                        if (res.success) {
                            message.success('保存成功');
                            setIsQuestionnaireModalVisible(false);
                            actionRef.current?.reload();
                        }
                    } finally {
                        setLoading(false);
                    }
                }}
                width={800}
                confirmLoading={loading}
            >
                <Form form={questionnaireForm} layout="vertical">
                    <Form.Item name="title" label="问卷名称" rules={[{ required: true, message: '请输入问卷名称' }]}>
                        <Input placeholder="例如：新入驻企业满意度调研" />
                    </Form.Item>
                    <Form.Item name="purpose" label="走访目的">
                        <Input placeholder="例如：收集企业诉求，改进物业服务" />
                    </Form.Item>
                    <Form.Item label="选择题目">
                        <Card size="small" className={styles.selectionCard}>
                            <List
                                size="small"
                                dataSource={[]}
                                locale={{ emptyText: '暂无可选题目' }}
                                renderItem={item => (
                                    <List.Item extra={<Button type="link" size="small" icon={<PlusOutlined />}>添加</Button>}>
                                        {item}
                                    </List.Item>
                                )}
                            />
                        </Card>
                    </Form.Item>
                </Form>
            </Modal>

            <Drawer
                title="问题详情"
                open={questionDetailVisible}
                onClose={() => setQuestionDetailVisible(false)}
                width={640}
                extra={<Button onClick={() => setQuestionDetailVisible(false)}>关闭</Button>}
            >
                {selectedQuestion ? (
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        <Descriptions title="基本信息" bordered column={1}>
                            <Descriptions.Item label="分类">
                                <Tag color="blue">{selectedQuestion.category || '通用'}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="常用标记">
                                {selectedQuestion.isFrequentlyUsed ? <StarFilled style={{ color: '#fadb14' }} /> : <StarOutlined style={{ color: '#d9d9d9' }} />}
                            </Descriptions.Item>
                        </Descriptions>
                        <Divider />
                        <Descriptions title="问题与回答" bordered column={1}>
                            <Descriptions.Item label="问题内容">{selectedQuestion.content}</Descriptions.Item>
                            <Descriptions.Item label="标准回答/解析">
                                <Text style={{ whiteSpace: 'pre-wrap' }}>{selectedQuestion.answer || '暂无解析'}</Text>
                            </Descriptions.Item>
                        </Descriptions>
                    </Space>
                ) : <Empty />}
            </Drawer>

            <Drawer
                title="问卷详情"
                open={questionnaireDetailVisible}
                onClose={() => setQuestionnaireDetailVisible(false)}
                width={640}
                extra={<Button onClick={() => setQuestionnaireDetailVisible(false)}>关闭</Button>}
            >
                {selectedQuestionnaire ? (
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        <Descriptions title="基本信息" bordered column={1}>
                            <Descriptions.Item label="问卷名称">{selectedQuestionnaire.title}</Descriptions.Item>
                            <Descriptions.Item label="走访目的">{selectedQuestionnaire.purpose || '-'}</Descriptions.Item>
                            <Descriptions.Item label="题目数量">{selectedQuestionnaire.questionCount} 题</Descriptions.Item>
                            <Descriptions.Item label="创建时间">{dayjs(selectedQuestionnaire.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
                        </Descriptions>
                        <Divider />
                        <Card title="包含题目" size="small">
                            {/* Note: This is a placeholder since we don't have a direct expanded question list here yet */}
                            <Text type="secondary">该问卷共包含 {selectedQuestionnaire.questionCount} 个题目。详细题目内容可通过编辑功能查看。</Text>
                        </Card>
                    </Space>
                ) : <Empty />}
            </Drawer>
        </PageContainer>
    );
};

export default VisitKnowledgeBase;
