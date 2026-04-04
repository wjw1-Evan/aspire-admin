import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Tabs,
    Button,
    Space,
    Modal,
    Form,
    Input,
    InputNumber,
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
    Transfer,
    Table,
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
    ArrowUpOutlined,
    ArrowDownOutlined,
} from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import PageContainer from '@/components/PageContainer';
import StatCard from '@/components/StatCard';
import SearchBar from '@/components/SearchBar';
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
    const searchParamsRef = useRef<any>({ search: '' });
    const [allQuestions, setAllQuestions] = useState<VisitQuestion[]>([]);
    const [targetKeys, setTargetKeys] = useState<string[]>([]);
    const [statistics, setStatistics] = useState<VisitStatistics | null>(null);
    const [loading, setLoading] = useState(false);
    const [questionDetailVisible, setQuestionDetailVisible] = useState(false);
    const [selectedQuestion, setSelectedQuestion] = useState<VisitQuestion | null>(null);
    const [questionnaireDetailVisible, setQuestionnaireDetailVisible] = useState(false);
    const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<VisitQuestionnaire | null>(null);
    const actionRef = useRef<any>(null);
    const screens = useBreakpoint();

    const [questionsData, setQuestionsData] = useState<VisitQuestion[]>([]);
    const [questionnairesData, setQuestionnairesData] = useState<VisitQuestionnaire[]>([]);
    const [questionsLoading, setQuestionsLoading] = useState(false);
    const [questionnairesLoading, setQuestionnairesLoading] = useState(false);
    const [questionsPagination, setQuestionsPagination] = useState({ page: 1, pageSize: 10, total: 0 });
    const [questionnairesPagination, setQuestionnairesPagination] = useState({ page: 1, pageSize: 10, total: 0 });

    const fetchQuestions = useCallback(async () => {
        setQuestionsLoading(true);
        try {
            const res = await visitService.getQuestions({
                page: questionsPagination.page,
                pageSize: questionsPagination.pageSize,
                ...searchParamsRef.current,
            });
            if (res.success && res.data) {
                setQuestionsData(res.data.queryable || []);
                setQuestionsPagination(prev => ({ ...prev, total: res.data.rowCount ?? 0 }));
            } else {
                setQuestionsData([]);
                setQuestionsPagination(prev => ({ ...prev, total: 0 }));
            }
        } catch {
            setQuestionsData([]);
            setQuestionsPagination(prev => ({ ...prev, total: 0 }));
        } finally {
            setQuestionsLoading(false);
        }
    }, [questionsPagination.page, questionsPagination.pageSize]);

    const fetchQuestionnaires = useCallback(async () => {
        setQuestionnairesLoading(true);
        try {
            const res = await visitService.getQuestionnaires({
                page: questionnairesPagination.page,
                pageSize: questionnairesPagination.pageSize,
            });
            if (res.success && res.data) {
                setQuestionnairesData(res.data.queryable || []);
                setQuestionnairesPagination(prev => ({ ...prev, total: res.data.rowCount ?? 0 }));
            } else {
                setQuestionnairesData([]);
                setQuestionnairesPagination(prev => ({ ...prev, total: 0 }));
            }
        } catch {
            setQuestionnairesData([]);
            setQuestionnairesPagination(prev => ({ ...prev, total: 0 }));
        } finally {
            setQuestionnairesLoading(false);
        }
    }, [questionnairesPagination.page, questionnairesPagination.pageSize]);

    const handleQuestionsTableChange = useCallback((pag: any, _filters: any, sorter: any) => {
        const newPage = pag.current;
        const newPageSize = pag.pageSize;
        const sortBy = sorter?.field;
        const sortOrder = sorter?.order === 'ascend' ? 'asc' : sorter?.order === 'descend' ? 'desc' : undefined;
        
        setQuestionsPagination(prev => ({ ...prev, page: newPage, pageSize: newPageSize }));
        
        (async () => {
            setQuestionsLoading(true);
            try {
                const res = await visitService.getQuestions({
                    page: newPage,
                    pageSize: newPageSize,
                    ...searchParamsRef.current,
                    sortBy,
                    sortOrder,
                });
                if (res.success && res.data) {
                    setQuestionsData(res.data.queryable || []);
                    setQuestionsPagination(prev => ({ ...prev, total: res.data.rowCount ?? 0 }));
                } else {
                    setQuestionsData([]);
                }
            } finally {
                setQuestionsLoading(false);
            }
        })();
    }, []);

    const handleQuestionnairesTableChange = useCallback((pag: any) => {
        const newPage = pag.current;
        const newPageSize = pag.pageSize;
        setQuestionnairesPagination(prev => ({ ...prev, page: newPage, pageSize: newPageSize }));
        fetchQuestionnaires();
    }, [fetchQuestionnaires]);

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

    const loadAllQuestions = async () => {
        try {
            const res = await visitService.getQuestions({ page: 1, pageSize: 1000 });
            if (res.success && res.data) {
                setAllQuestions(res.data.queryable);
            }
        } catch (error) {
            console.error('Failed to load questions:', error);
        }
    };

    useEffect(() => {
        loadStatistics();
    }, [loadStatistics]);

    useEffect(() => {
        fetchQuestions();
        fetchQuestionnaires();
    }, [fetchQuestions, fetchQuestionnaires]);


    const questionColumns = [
        {
            title: '问题内容',
            dataIndex: 'content',
            key: 'content',
            sorter: true,
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
            sorter: true,
            width: 120,
            render: (text: string) => <Tag color="blue">{text || '通用'}</Tag>,
        },
        {
            title: '常用',
            dataIndex: 'isFrequentlyUsed',
            key: 'isFrequentlyUsed',
            sorter: true,
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
            sorter: true,
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
            sorter: true,
            ellipsis: true,
        },
        {
            title: '题目数量',
            dataIndex: 'questionCount',
            key: 'questionCount',
            sorter: true,
            width: 100,
            render: (count: number) => <Tag color="cyan">{count} 题</Tag>,
        },
        {
            title: '创建时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            sorter: true,
            width: 120,
            render: (text: string) => dayjs(text).format('YYYY-MM-DD'),
        },
        {
            title: '操作',
            key: 'action',
            width: 100,
            render: (_: any, record: VisitQuestionnaire) => (
                <Space>
                    <Button type="link" size="small" icon={<EyeOutlined />} onClick={async () => {
                        setSelectedQuestionnaire(record);
                        setQuestionnaireDetailVisible(true);
                        if (allQuestions.length === 0) {
                            await loadAllQuestions();
                        }
                    }}>查看</Button>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={async () => {
                        setEditingQuestionnaire(record);
                        questionnaireForm.setFieldsValue(record);
                        setTargetKeys(record.questionIds || []);
                        await loadAllQuestions();
                        setIsQuestionnaireModalVisible(true);
                    }}>编辑</Button>
                    <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteQuestionnaire(record.id)}>删除</Button>
                </Space>
            ),
        },
    ];

    const handleDeleteQuestion = (id: string) => {
        modal.confirm({
            title: '确定要删除这个走访问题吗？',
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
                        fetchQuestions();
                    }
                } catch (error) {
                    message.error('删除失败');
                }
            },
        });
    };

    const handleDeleteQuestionnaire = (id: string) => {
        modal.confirm({
            title: '确定要删除这个问卷模板吗？',
            icon: <InfoCircleOutlined />,
            content: '删除后将无法使用该模版创建走访任务',
            okText: '确定',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                try {
                    const res = await visitService.deleteQuestionnaire(id);
                    if (res.success) {
                        message.success('删除成功');
                        fetchQuestionnaires();
                    }
                } catch (error) {
                    message.error('删除失败');
                }
            },
        });
    };

    const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
        const newTargetKeys = [...targetKeys];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;

        if (swapIndex >= 0 && swapIndex < newTargetKeys.length) {
            [newTargetKeys[index], newTargetKeys[swapIndex]] = [newTargetKeys[swapIndex], newTargetKeys[index]];
            setTargetKeys(newTargetKeys as string[]);
            questionnaireForm.setFieldsValue({ questionIds: newTargetKeys });
        }
    };

    return (
        <PageContainer
            title="走访知识库"
            extra={
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={() => { fetchQuestions(); fetchQuestionnaires(); loadStatistics(); }}>
                        刷新
                    </Button>
                    {activeTab === 'questions' ? (
                        <Button key="add-q" type="primary" icon={<PlusOutlined />} onClick={() => { setEditingQuestion(null); questionForm.resetFields(); setIsQuestionModalVisible(true); }}>
                            新增问题
                        </Button>
                    ) : (
                        <Button key="add-template" type="primary" icon={<PlusOutlined />} onClick={async () => {
                            setEditingQuestionnaire(null);
                            questionnaireForm.resetFields();
                            setTargetKeys([]);
                            await loadAllQuestions();
                            setIsQuestionnaireModalVisible(true);
                        }}>
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
                                <SearchBar
                                    initialParams={searchParamsRef.current}
                                    onSearch={(params) => {
                                        searchParamsRef.current = { ...searchParamsRef.current, ...params };
                                        setQuestionsPagination(prev => ({ ...prev, page: 1 }));
                                        fetchQuestions();
                                    }}
                                    style={{ marginBottom: 16 }}
                                />
                                <Card>
                                    <Table<VisitQuestion>
                                        dataSource={questionsData}
                                        columns={questionColumns as any}
                                        rowKey="id"
                                        loading={questionsLoading}
                                        onChange={handleQuestionsTableChange}
                                        pagination={{
                                            current: questionsPagination.page,
                                            pageSize: questionsPagination.pageSize,
                                            total: questionsPagination.total,
                                            pageSizeOptions: [10, 20, 50, 100],
                                            showSizeChanger: true,
                                            showQuickJumper: true,
                                            showTotal: (total) => `共 ${total} 条`,
                                        }}
                                        scroll={{ x: 800 }}
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
                                <Table<VisitQuestionnaire>
                                    dataSource={questionnairesData}
                                    columns={questionnaireColumns as any}
                                    rowKey="id"
                                    loading={questionnairesLoading}
                                    onChange={handleQuestionnairesTableChange}
                                    pagination={{
                                        current: questionnairesPagination.page,
                                        pageSize: questionnairesPagination.pageSize,
                                        total: questionnairesPagination.total,
                                        pageSizeOptions: [10, 20, 50, 100],
                                        showSizeChanger: true,
                                        showQuickJumper: true,
                                        showTotal: (total) => `共 ${total} 条`,
                                    }}
                                    scroll={{ x: 800 }}
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
                            fetchQuestions();
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
                    <Form.Item name="sortOrder" label="排序值" extra="数值越小越靠前" initialValue={0}>
                        <InputNumber style={{ width: '100%' }} precision={0} />
                    </Form.Item>
                    <Form.Item name="questionIds" hidden>
                        <Select mode="multiple" />
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
                        const res = editingQuestionnaire
                            ? await visitService.updateQuestionnaire(editingQuestionnaire.id, values)
                            : await visitService.createQuestionnaire(values);
                        if (res.success) {
                            message.success('保存成功');
                            setIsQuestionnaireModalVisible(false);
                            fetchQuestionnaires();
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
                    <Form.Item name="sortOrder" label="排序值" extra="数值越小越靠前" initialValue={0}>
                        <InputNumber style={{ width: '100%' }} precision={0} />
                    </Form.Item>
                    <Form.Item label="选择题目" required>
                        <Transfer
                            dataSource={allQuestions}
                            showSearch
                            listStyle={{
                                width: 350,
                                height: 400,
                            }}
                            titles={['待选题目', '已选题目']}
                            targetKeys={targetKeys}
                            onChange={(nextTargetKeys) => {
                                setTargetKeys(nextTargetKeys as string[]);
                                questionnaireForm.setFieldsValue({ questionIds: nextTargetKeys });
                            }}
                            render={item => item.content}
                            rowKey={item => item.id}
                        >
                            {({ direction, filteredItems, onItemSelect }) => {
                                if (direction === 'left') {
                                    return (
                                        <List
                                            size="small"
                                            dataSource={filteredItems}
                                            style={{ height: '100%', overflow: 'auto' }}
                                            renderItem={(item) => (
                                                <List.Item
                                                    onClick={() => onItemSelect(item.id as string, !targetKeys.includes(item.id))}
                                                    style={{ cursor: 'pointer', padding: '8px 12px' }}
                                                >
                                                    <Space>
                                                        {targetKeys.includes(item.id) ?
                                                            <Tag color="blue">已选</Tag> :
                                                            <div style={{ width: 34 }} />
                                                        }
                                                        <Text ellipsis style={{ width: 240 }}>{item.content}</Text>
                                                    </Space>
                                                </List.Item>
                                            )}
                                        />
                                    );
                                } else {
                                    // Use targetKeys to maintain order
                                    const sortedItems = targetKeys
                                        .map(key => allQuestions.find(q => q.id === key))
                                        .filter((item): item is VisitQuestion => !!item);

                                    return (
                                        <List
                                            size="small"
                                            dataSource={sortedItems}
                                            style={{ height: '100%', overflow: 'auto' }}
                                            renderItem={(item, index) => (
                                                <List.Item
                                                    actions={[
                                                        <Button
                                                            key="up"
                                                            type="text"
                                                            size="small"
                                                            icon={<ArrowUpOutlined />}
                                                            disabled={index === 0}
                                                            onClick={(e) => { e.stopPropagation(); handleMoveQuestion(index, 'up'); }}
                                                        />,
                                                        <Button
                                                            key="down"
                                                            type="text"
                                                            size="small"
                                                            icon={<ArrowDownOutlined />}
                                                            disabled={index === sortedItems.length - 1}
                                                            onClick={(e) => { e.stopPropagation(); handleMoveQuestion(index, 'down'); }}
                                                        />,
                                                        <Button
                                                            key="del"
                                                            type="text"
                                                            size="small"
                                                            danger
                                                            icon={<DeleteOutlined />}
                                                            onClick={(e) => { e.stopPropagation(); onItemSelect(item.id, false); }}
                                                        />
                                                    ]}
                                                    style={{ padding: '8px 12px' }}
                                                >
                                                    <Space>
                                                        <Tag color="#108ee9">{index + 1}</Tag>
                                                        <Text ellipsis={{ tooltip: item.content }} style={{ width: 180 }}>{item.content}</Text>
                                                    </Space>
                                                </List.Item>
                                            )}
                                        />
                                    );
                                }
                            }}
                        </Transfer>
                    </Form.Item>
                    <Form.Item name="questionIds" hidden>
                        <Select mode="multiple" />
                    </Form.Item>
                </Form>
            </Modal>

            <Drawer
                title="问题详情"
                open={questionDetailVisible}
                onClose={() => setQuestionDetailVisible(false)}
                size={640}
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
                size={640}
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
                            <List
                                size="small"
                                dataSource={allQuestions.filter(q => selectedQuestionnaire.questionIds?.includes(q.id))}
                                renderItem={(item, index) => (
                                    <List.Item>
                                        <Space direction="vertical" style={{ width: '100%' }}>
                                            <Space>
                                                <Tag color="#108ee9">{index + 1}</Tag>
                                                <Text strong>{item.content}</Text>
                                            </Space>
                                            {item.answer && (
                                                <div style={{ paddingLeft: 30, color: '#666', fontSize: 13 }}>
                                                    <Text type="secondary">解析：</Text>
                                                    <Text style={{ whiteSpace: 'pre-wrap' }}>{item.answer}</Text>
                                                </div>
                                            )}
                                        </Space>
                                    </List.Item>
                                )}
                                locale={{ emptyText: '该问卷暂无题目' }}
                            />
                        </Card>
                    </Space>
                ) : <Empty />}
            </Drawer>
        </PageContainer>
    );
};

export default VisitKnowledgeBase;
