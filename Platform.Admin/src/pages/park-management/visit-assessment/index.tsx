import React, { useState, useEffect, useCallback } from 'react';
import {
    Card,
    Typography,
    Space,
    Table,
    Button,
    Tag,
    Input,
    Rate,
    App,
    Row,
    Col,
    Drawer,
    Descriptions,
    Divider,
    Form,
    Modal,
} from 'antd';
import {
    SearchOutlined,
    ReloadOutlined,
    StarFilled,
    FileSearchOutlined,
    EditOutlined,
    StarOutlined,
    HistoryOutlined,
    CheckCircleOutlined,
} from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import PageContainer from '@/components/PageContainer';
import * as visitService from '@/services/visit';
import dayjs from 'dayjs';
import styles from './index.less';

const { Text } = Typography;

const VisitAssessmentList: React.FC = () => {
    const intl = useIntl();
    const { message } = App.useApp();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<visitService.VisitTask[]>([]);
    const [total, setTotal] = useState(0);
    const [current, setCurrent] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState('');

    const [detailVisible, setDetailVisible] = useState(false);
    const [selectedAssessment, setSelectedAssessment] = useState<visitService.VisitAssessment | null>(null);

    const [assessmentVisible, setAssessmentVisible] = useState(false);
    const [selectedTask, setSelectedTask] = useState<visitService.VisitTask | null>(null);
    const [assessmentForm] = Form.useForm();

    const loadData = useCallback(async (page: number, size: number, query: string) => {
        setLoading(true);
        try {
            const res = await visitService.getTasks({
                page,
                pageSize: size,
                search: query,
                status: 'Completed',
            });

            if (res.success && res.data) {
                setData(res.data.tasks);
                setTotal(res.data.total);
            }
        } catch (error) {
            console.error('Failed to load visit data:', error);
            message.error(intl.formatMessage({ id: 'pages.park.common.failed', defaultMessage: '加载失败' }));
        } finally {
            setLoading(false);
        }
    }, [intl, message]);

    useEffect(() => {
        loadData(current, pageSize, search);
    }, [loadData, current, pageSize, search]);

    const handleSearch = (value: string) => {
        setSearch(value);
        setCurrent(1);
    };

    const handleRefresh = () => {
        loadData(current, pageSize, search);
    };

    const showDetail = async (record: visitService.VisitTask) => {
        if (!record.assessmentId) return;

        try {
            // We fetch the full assessment detail to be sure we have everything
            // or we use what we have in the task DTO.
            // Given the current Drawer needs a VisitAssessment type:
            const assessmentDetail: visitService.VisitAssessment = {
                id: record.assessmentId,
                taskId: record.id,
                visitorName: record.intervieweeName || record.tenantName || '',
                phone: record.phone,
                location: record.visitLocation || '',
                taskDescription: record.title,
                score: record.assessmentScore || 0,
                comments: record.feedback || '', // Map feedback to comments if appropriate
                createdAt: record.createdAt,
            };

            setSelectedAssessment(assessmentDetail);
            setDetailVisible(true);
        } catch (error) {
            message.error('无法加载评价详情');
        }
    };

    useEffect(() => {
        if (assessmentVisible && selectedTask) {
            assessmentForm.setFieldsValue({
                visitorName: selectedTask.intervieweeName || selectedTask.tenantName,
                phone: selectedTask.phone,
                location: selectedTask.visitLocation,
                score: 5,
                comments: '',
            });
        }
    }, [assessmentVisible, selectedTask, assessmentForm]);

    const handleAssess = (task: visitService.VisitTask) => {
        setSelectedTask(task);
        setAssessmentVisible(true);
    };

    const handleAssessmentSubmit = async (values: any) => {
        if (!selectedTask) return;

        try {
            const assessmentData = {
                taskId: selectedTask.id,
                visitorName: values.visitorName,
                phone: values.phone,
                location: values.location,
                taskDescription: selectedTask.title,
                score: values.score,
                comments: values.comments,
            };

            const res = await visitService.createAssessment(assessmentData);
            if (res.success) {
                message.success(intl.formatMessage({ id: 'pages.park.common.success', defaultMessage: '评价提交成功' }));
                setAssessmentVisible(false);
                setSelectedTask(null);
                assessmentForm.resetFields();
                loadData(current, pageSize, search);
            }
        } catch (error) {
            console.error('Failed to submit assessment:', error);
            message.error(intl.formatMessage({ id: 'pages.park.common.failed', defaultMessage: '评价提交失败' }));
        }
    };

    const columns = [
        {
            title: intl.formatMessage({ id: 'pages.park.visit.visitDate', defaultMessage: '走访时间' }),
            dataIndex: 'visitDate',
            width: 170,
            render: (text: string) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-',
        },
        {
            title: intl.formatMessage({ id: 'pages.park.visit.visitor', defaultMessage: '受访人/企业' }),
            dataIndex: 'tenantName',
            width: 180,
            ellipsis: true,
            render: (text: string, record: visitService.VisitTask) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{text || '-'}</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>{record.visitLocation || '-'}</Text>
                </Space>
            ),
        },
        {
            title: intl.formatMessage({ id: 'pages.park.visit.task', defaultMessage: '走访任务' }),
            dataIndex: 'title',
            ellipsis: true,
            render: (text: string) => text || '-',
        },
        {
            title: intl.formatMessage({ id: 'pages.park.visit.score', defaultMessage: '满意度' }),
            dataIndex: 'assessmentScore',
            width: 150,
            render: (score: number | undefined) => (
                score !== undefined && score !== null ? (
                    <Rate disabled value={score} character={<StarFilled />} style={{ fontSize: 14 }} />
                ) : (
                    <Tag color="warning">待评价</Tag>
                )
            ),
        },
        {
            title: intl.formatMessage({ id: 'pages.park.common.actions', defaultMessage: '操作' }),
            key: 'action',
            width: 120,
            fixed: 'right' as const,
            render: (_: any, record: visitService.VisitTask) => (
                <Space size="small">
                    {record.assessmentId ? (
                        <Button
                            type="link"
                            size="small"
                            onClick={() => showDetail(record)}
                            icon={<FileSearchOutlined />}
                        >
                            {intl.formatMessage({ id: 'pages.park.common.view', defaultMessage: '详情' })}
                        </Button>
                    ) : (
                        <Button
                            type="link"
                            size="small"
                            onClick={() => handleAssess(record)}
                            icon={<StarOutlined />}
                            style={{ color: '#52c41a' }}
                        >
                            {intl.formatMessage({ id: 'pages.park.visit.assess', defaultMessage: '评价' })}
                        </Button>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <PageContainer
            title={intl.formatMessage({ id: 'pages.park.visit.assessment', defaultMessage: '走访评价管理' })}
        >
            <Card className={styles.searchCard}>
                <Row gutter={16}>
                    <Col flex="auto">
                        <Input.Search
                            placeholder={intl.formatMessage({ id: 'pages.park.common.search.placeholder', defaultMessage: '搜索受访企业或企管员' })}
                            onSearch={handleSearch}
                            enterButton={<SearchOutlined />}
                            allowClear
                        />
                    </Col>
                    <Col>
                        <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
                            {intl.formatMessage({ id: 'pages.park.common.refresh', defaultMessage: '刷新' })}
                        </Button>
                    </Col>
                </Row>
            </Card>

            <Card className={styles.tableCard} styles={{ body: { padding: '16px 24px' } }}>
                <Table
                    columns={columns}
                    dataSource={data}
                    loading={loading}
                    rowKey="id"
                    pagination={{
                        total,
                        current,
                        pageSize,
                        onChange: (page, size) => {
                            setCurrent(page);
                            setPageSize(size);
                        },
                        showSizeChanger: true,
                        showTotal: (t) => `${intl.formatMessage({ id: 'pages.park.common.total', defaultMessage: '共' })} ${t} ${intl.formatMessage({ id: 'pages.park.common.items', defaultMessage: '条' })}`,
                    }}
                    scroll={{ x: 1000 }}
                />
            </Card>

            <Drawer
                title={intl.formatMessage({ id: 'pages.park.visit.assessmentDetail', defaultMessage: '走访评价详情' })}
                placement="right"
                onClose={() => setDetailVisible(false)}
                open={detailVisible}
                size={500}
            >
                {selectedAssessment && (
                    <div className={styles.detailContainer}>
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <Text type="secondary">{intl.formatMessage({ id: 'pages.park.visit.score', defaultMessage: '总体满意程度' })}</Text>
                            <div style={{ marginTop: 8 }}>
                                <Rate disabled value={selectedAssessment.score} style={{ fontSize: 24 }} />
                            </div>
                        </div>

                        <Divider />

                        <Descriptions column={1} bordered size="small">
                            <Descriptions.Item label={intl.formatMessage({ id: 'pages.park.visit.visitor', defaultMessage: '受访对象' })}>
                                {selectedAssessment.visitorName}
                            </Descriptions.Item>
                            <Descriptions.Item label={intl.formatMessage({ id: 'pages.park.visit.phone', defaultMessage: '联系电话' })}>
                                {selectedAssessment.phone || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label={intl.formatMessage({ id: 'pages.park.visit.location', defaultMessage: '走访地点' })}>
                                {selectedAssessment.location || '-'}
                            </Descriptions.Item>
                        </Descriptions>

                        <Divider orientation={"left" as any} plain>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {intl.formatMessage({ id: 'pages.park.visit.taskInfo', defaultMessage: '走访任务信息' })}
                            </Text>
                        </Divider>

                        <div style={{ padding: '0 4px' }}>
                            <Text strong>{intl.formatMessage({ id: 'pages.park.visit.taskDescription', defaultMessage: '任务内容描述' })}：</Text>
                            <div style={{ marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                                {selectedAssessment.taskDescription || '-'}
                            </div>
                        </div>

                        <Divider orientation={"left" as any} plain>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {intl.formatMessage({ id: 'pages.park.visit.assessmentComments', defaultMessage: '评价与建议' })}
                            </Text>
                        </Divider>

                        <div style={{ padding: '0 4px', marginBottom: 24 }}>
                            <Text strong>{intl.formatMessage({ id: 'pages.park.visit.comments', defaultMessage: '详细评语' })}：</Text>
                            <div style={{ marginTop: 8, padding: 12, border: '1px solid #f0f0f0', borderRadius: 8, minHeight: 100 }}>
                                {selectedAssessment.comments || intl.formatMessage({ id: 'pages.park.common.noData', defaultMessage: '暂无评价内容' })}
                            </div>
                        </div>

                        <Divider />
                        <Space direction="vertical" size={2} style={{ width: '100%', textAlign: 'right' }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {intl.formatMessage({ id: 'pages.park.common.createdAt', defaultMessage: '走访发生时间' })}: {dayjs(selectedAssessment.createdAt).format('YYYY-MM-DD HH:mm')}
                            </Text>
                        </Space>
                    </div>
                )}
            </Drawer>

            <Modal
                title={intl.formatMessage({ id: 'pages.park.visit.assessment', defaultMessage: '添加走访评价' })}
                open={assessmentVisible}
                onCancel={() => setAssessmentVisible(false)}
                footer={null}
                width={600}
                destroyOnClose
            >
                {selectedTask && (
                    <Form
                        form={assessmentForm}
                        layout="vertical"
                        onFinish={handleAssessmentSubmit}
                    >
                        <Form.Item
                            label={intl.formatMessage({ id: 'pages.park.visit.visitor', defaultMessage: '受访人/企业' })}
                            name="visitorName"
                            rules={[{ required: true, message: '请输入受访人/企业名称' }]}
                        >
                            <Input placeholder="请输入受访人/企业名称" />
                        </Form.Item>

                        <Form.Item
                            label={intl.formatMessage({ id: 'pages.park.visit.phone', defaultMessage: '联系电话' })}
                            name="phone"
                        >
                            <Input placeholder="请输入联系电话" />
                        </Form.Item>

                        <Form.Item
                            label={intl.formatMessage({ id: 'pages.park.visit.location', defaultMessage: '走访地点' })}
                            name="location"
                        >
                            <Input placeholder="请输入走访地点" />
                        </Form.Item>

                        <Form.Item
                            label={intl.formatMessage({ id: 'pages.park.visit.score', defaultMessage: '满意度评分' })}
                            name="score"
                            rules={[{ required: true, message: '请选择满意度评分' }]}
                        >
                            <Rate />
                        </Form.Item>

                        <Form.Item
                            label={intl.formatMessage({ id: 'pages.park.visit.comments', defaultMessage: '评价意见' })}
                            name="comments"
                        >
                            <Input.TextArea
                                rows={4}
                                placeholder="请输入评价意见（选填）"
                            />
                        </Form.Item>

                        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                            <Space>
                                <Button onClick={() => setAssessmentVisible(false)}>
                                    {intl.formatMessage({ id: 'pages.park.common.cancel', defaultMessage: '取消' })}
                                </Button>
                                <Button type="primary" htmlType="submit">
                                    {intl.formatMessage({ id: 'pages.park.common.submit', defaultMessage: '提交评价' })}
                                </Button>
                            </Space>
                        </Form.Item>
                    </Form>
                )}
            </Modal>
        </PageContainer>
    );
};

export default VisitAssessmentList;
