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
} from 'antd';
import {
    SearchOutlined,
    ReloadOutlined,
    StarFilled,
    FileSearchOutlined,
} from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import PageContainer from '@/components/PageContainer';
import * as visitService from '@/services/visit';
import type { VisitAssessment } from '@/services/visit';
import styles from './index.less';

const { Text } = Typography;

const VisitAssessmentList: React.FC = () => {
    const intl = useIntl();
    const { message } = App.useApp();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<VisitAssessment[]>([]);
    const [total, setTotal] = useState(0);
    const [current, setCurrent] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState('');

    const [detailVisible, setDetailVisible] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<VisitAssessment | null>(null);

    const loadData = useCallback(async (page: number, size: number, query: string) => {
        setLoading(true);
        try {
            const res = await visitService.getAssessments({
                page,
                pageSize: size,
                search: query,
            });
            if (res.success && res.data) {
                setData(res.data.assessments);
                setTotal(res.data.total);
            }
        } catch (error) {
            console.error('Failed to load assessments:', error);
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

    const showDetail = (record: VisitAssessment) => {
        setSelectedRecord(record);
        setDetailVisible(true);
    };

    const columns = [
        {
            title: intl.formatMessage({ id: 'pages.park.common.time', defaultMessage: '评价时间' }),
            dataIndex: 'createdAt',
            width: 180,
            render: (text: string) => text ? new Date(text).toLocaleString() : '-',
        },
        {
            title: intl.formatMessage({ id: 'pages.park.visit.visitor', defaultMessage: '受访人/企业' }),
            dataIndex: 'visitorName',
            width: 150,
            ellipsis: true,
            render: (text: string, record: VisitAssessment) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{text || '-'}</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>{record.location || '-'}</Text>
                </Space>
            ),
        },
        {
            title: intl.formatMessage({ id: 'pages.park.visit.task', defaultMessage: '关联任务' }),
            dataIndex: 'taskDescription',
            ellipsis: true,
            render: (text: string) => text || '-',
        },
        {
            title: intl.formatMessage({ id: 'pages.park.visit.score', defaultMessage: '满意度' }),
            dataIndex: 'score',
            width: 150,
            render: (score: number) => (
                <Rate disabled defaultValue={score} character={<StarFilled />} style={{ fontSize: 14 }} />
            ),
        },
        {
            title: intl.formatMessage({ id: 'pages.park.visit.comments', defaultMessage: '评语' }),
            dataIndex: 'comments',
            ellipsis: true,
            render: (text: string) => text || '-',
        },
        {
            title: intl.formatMessage({ id: 'pages.park.common.actions', defaultMessage: '操作' }),
            key: 'action',
            width: 100,
            fixed: 'right' as const,
            render: (_: any, record: VisitAssessment) => (
                <Button
                    type="link"
                    onClick={() => showDetail(record)}
                    icon={<FileSearchOutlined />}
                >
                    {intl.formatMessage({ id: 'pages.park.common.view', defaultMessage: '详情' })}
                </Button>
            ),
        },
    ];

    return (
        <PageContainer
            title={intl.formatMessage({ id: 'pages.park.visit.assessment', defaultMessage: '走访评价明细' })}
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

            <Card className={styles.tableCard} styles={{ body: { padding: 0 } }}>
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
                width={500}
            >
                {selectedRecord && (
                    <div className={styles.detailContainer}>
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <Text type="secondary">{intl.formatMessage({ id: 'pages.park.visit.score', defaultMessage: '总体满意程度' })}</Text>
                            <div style={{ marginTop: 8 }}>
                                <Rate disabled value={selectedRecord.score} style={{ fontSize: 24 }} />
                            </div>
                        </div>

                        <Divider />

                        <Descriptions column={1} bordered size="small">
                            <Descriptions.Item label={intl.formatMessage({ id: 'pages.park.visit.visitor', defaultMessage: '受访对象' })}>
                                {selectedRecord.visitorName}
                            </Descriptions.Item>
                            <Descriptions.Item label={intl.formatMessage({ id: 'pages.park.visit.phone', defaultMessage: '联系电话' })}>
                                {selectedRecord.phone || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label={intl.formatMessage({ id: 'pages.park.visit.location', defaultMessage: '走访地点' })}>
                                {selectedRecord.location || '-'}
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
                                {selectedRecord.taskDescription || '-'}
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
                                {selectedRecord.comments || intl.formatMessage({ id: 'pages.park.common.noData', defaultMessage: '暂无评价内容' })}
                            </div>
                        </div>

                        <Divider />
                        <Space direction="vertical" size={2} style={{ width: '100%', textAlign: 'right' }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {intl.formatMessage({ id: 'pages.park.common.createdAt', defaultMessage: '提交时间' })}: {new Date(selectedRecord.createdAt).toLocaleString()}
                            </Text>
                        </Space>
                    </div>
                )}
            </Drawer>
        </PageContainer>
    );
};

export default VisitAssessmentList;
