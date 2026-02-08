import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Button,
    Space,
    Tag,
    Modal,
    Form,
    Input,
    App,
    Typography,
    Card,
    Row,
    Col,
    Rate,
    Empty,
    Grid,
    Drawer,
    Descriptions,
    Divider,
} from 'antd';
import {
    ReloadOutlined,
    UserOutlined,
    EnvironmentOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    StarOutlined,
    FieldTimeOutlined,
    EyeOutlined,
    SyncOutlined,
} from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import PageContainer from '@/components/PageContainer';
import DataTable from '@/components/DataTable';
import StatCard from '@/components/StatCard';
import SearchFormCard from '@/components/SearchFormCard';
import * as visitService from '@/services/visit';
import type { VisitAssessment as VisitAssessmentType, VisitStatistics } from '@/services/visit';
import dayjs from 'dayjs';
import styles from './index.less';

const { Text } = Typography;
const { useBreakpoint } = Grid;

const VisitAssessment: React.FC = () => {
    const intl = useIntl();
    const { message } = App.useApp();
    const [searchForm] = Form.useForm();
    const [statistics, setStatistics] = useState<VisitStatistics | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);
    const [selectedAssessment, setSelectedAssessment] = useState<VisitAssessmentType | null>(null);
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

    const columns = [
        {
            title: '受访者',
            dataIndex: 'visitorName',
            key: 'visitorName',
            width: 150,
            render: (text: string) => (
                <Space>
                    <UserOutlined style={{ color: '#1890ff' }} />
                    {text}
                </Space>
            ),
        },
        {
            title: '手机号',
            dataIndex: 'phone',
            key: 'phone',
            width: 130,
        },
        {
            title: '走访地点',
            dataIndex: 'location',
            key: 'location',
            ellipsis: true,
        },
        {
            title: '评分',
            dataIndex: 'score',
            key: 'score',
            width: 160,
            render: (score: number) => <Rate disabled defaultValue={score} />,
        },
        {
            title: '评价',
            dataIndex: 'comments',
            key: 'comments',
            ellipsis: true,
        },
        {
            title: '考核时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 180,
            render: (text: string) => text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-',
        },
        {
            title: '操作',
            key: 'action',
            width: 100,
            fixed: 'right',
            render: (_: any, record: VisitAssessmentType) => (
                <Button
                    type="link"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => { setSelectedAssessment(record); setDetailVisible(true); }}
                >
                    查看
                </Button>
            ),
        },
    ];

    const handleSearch = () => {
        actionRef.current?.reload();
    };

    const handleReset = () => {
        searchForm.resetFields();
        handleSearch();
    };

    return (
        <PageContainer
            title="走访考核管理"
            extra={
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={() => { actionRef.current?.reload(); loadStatistics(); }}>
                        刷新
                    </Button>
                </Space>
            }
        >
            {statistics && (
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} sm={12} md={6}>
                        <StatCard
                            title="累计评价数"
                            value={statistics.totalAssessments ?? 0}
                            icon={<CheckCircleOutlined />}
                            color="#1890ff"
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <StatCard
                            title="平均评分"
                            value={statistics.averageScore ?? 0}
                            icon={<StarOutlined />}
                            suffix="分"
                            color="#fadb14"
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <StatCard
                            title="本月走访数"
                            value={statistics.completedTasksThisMonth ?? 0}
                            icon={<FieldTimeOutlined />}
                            color="#52c41a"
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <StatCard
                            title="待评价任务"
                            value={statistics.pendingTasks ?? 0}
                            icon={<SyncOutlined />}
                            color="#faad14"
                        />
                    </Col>
                </Row>
            )}

            <SearchFormCard>
                <Form form={searchForm} layout="inline" onFinish={handleSearch}>
                    <Form.Item name="search">
                        <Input placeholder="搜索受访者/地点..." style={{ width: 200 }} allowClear />
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
                <DataTable<VisitAssessmentType>
                    columns={columns as any}
                    request={async (params: any) => {
                        const searchValues = searchForm.getFieldsValue();
                        const res = await visitService.getAssessments({
                            page: params.current || 1,
                            pageSize: params.pageSize || 10,
                            ...searchValues,
                        });
                        if (res.success && res.data) {
                            return { data: res.data.assessments, total: res.data.total, success: true };
                        }
                        return { data: [], total: 0, success: false };
                    }}
                    actionRef={actionRef}
                    rowKey="id"
                    search={false}
                    scroll={{ x: 1000 }}
                />
            </Card>

            <Drawer
                title="走访考核详情"
                open={detailVisible}
                onClose={() => setDetailVisible(false)}
                width={640}
                extra={
                    <Button onClick={() => setDetailVisible(false)}>关闭</Button>
                }
            >
                {selectedAssessment ? (
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        <Descriptions title="基本信息" bordered column={1}>
                            <Descriptions.Item label="受访者">{selectedAssessment.visitorName}</Descriptions.Item>
                            <Descriptions.Item label="联系电话">{selectedAssessment.phone}</Descriptions.Item>
                            <Descriptions.Item label="走访地点">{selectedAssessment.location}</Descriptions.Item>
                            <Descriptions.Item label="考核时间">{dayjs(selectedAssessment.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
                        </Descriptions>

                        <Divider />

                        <Descriptions title="评分评价" bordered column={1}>
                            <Descriptions.Item label="满意度评分">
                                <Rate disabled defaultValue={selectedAssessment.score} />
                            </Descriptions.Item>
                            <Descriptions.Item label="走访内容/目的">
                                <Text style={{ whiteSpace: 'pre-wrap' }}>{selectedAssessment.taskDescription || '-'}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="评价详情">
                                <Text style={{ whiteSpace: 'pre-wrap' }}>{selectedAssessment.comments || '-'}</Text>
                            </Descriptions.Item>
                        </Descriptions>
                    </Space>
                ) : <Empty />}
            </Drawer>
        </PageContainer>
    );
};

export default VisitAssessment;
