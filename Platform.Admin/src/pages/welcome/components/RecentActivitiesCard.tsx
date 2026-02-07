import React from 'react';
import { Card, Space, Timeline, Typography, Button } from 'antd';
import { ClockCircleOutlined, LinkOutlined, RightOutlined } from '@ant-design/icons';
import { useIntl, history } from '@umijs/max';
import useCommonStyles from '@/hooks/useCommonStyles';
import dayjs from 'dayjs';
import { getActivityColor } from '../utils';
import { useInfiniteScroll } from 'ahooks';
import { getCurrentUserActivityLogs } from '@/services/user-log/api';
import { Spin } from 'antd';


const { Text } = Typography;

interface RecentActivitiesCardProps {
    readonly currentUser?: API.CurrentUser;
}

const RecentActivitiesCard: React.FC<RecentActivitiesCardProps> = ({ currentUser }) => {
    const intl = useIntl();
    const { styles } = useCommonStyles();
    const scrollRef = React.useRef<HTMLDivElement>(null);

    // 使用 useInfiniteScroll 加载数据
    const { data, loading, loadingMore, noMore } = useInfiniteScroll(
        async (d) => {
            const nextPage = d ? (Math.floor(d.list.length / 10) + 1) : 1;
            const res = await getCurrentUserActivityLogs({
                page: nextPage,
                pageSize: 10,
            });

            return {
                list: res?.data?.data || [],
                total: res?.data?.total || 0,
            };
        },
        {
            target: scrollRef,
            isNoMore: (d) => (d?.list?.length || 0) >= (d?.total || 0),
        },
    );

    const activities = data?.list || [];

    return (
        <Card
            title={
                <Space>
                    <ClockCircleOutlined />
                    <span>{intl.formatMessage({ id: 'pages.welcome.recentActivities' })}</span>
                </Space>
            }
            extra={
                <Button
                    type="link"
                    size="small"
                    onClick={() => history.push('/system/my-activity')}
                    style={{ padding: 0 }}
                >
                    <Space size={4}>
                        {intl.formatMessage({ id: 'pages.common.more', defaultMessage: '更多' })}
                        <RightOutlined style={{ fontSize: '10px' }} />
                    </Space>
                </Button>
            }
            className={styles.card}
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            bodyStyle={{ flex: 1, overflow: 'hidden', padding: '12px 24px' }}
        >
            <div
                ref={scrollRef}
                style={{
                    height: '400px',
                    overflowY: 'auto',
                    paddingRight: '8px'
                }}
            >
                {loading && !loadingMore ? (
                    <div style={{ padding: '24px', textAlign: 'center' }}>
                        <Spin size="small" />
                    </div>
                ) : (
                    <Timeline
                        items={activities.length > 0 ? activities.map(activity => {
                            const formattedDate = activity.createdAt
                                ? dayjs(activity.createdAt).format('YYYY-MM-DD HH:mm:ss')
                                : intl.formatMessage({ id: 'pages.welcome.recentActivities.unknownTime' });

                            const urlDisplay = activity.fullUrl
                                || (activity.path && activity.queryString ? `${activity.path}${activity.queryString}` : activity.path);

                            return {
                                color: getActivityColor(activity.action),
                                content: (
                                    <div>
                                        <Text strong>{activity.action || intl.formatMessage({ id: 'pages.welcome.recentActivities.systemActivity' })}</Text>
                                        {(activity.fullUrl || activity.path) && (
                                            <div style={{ marginTop: '4px', fontSize: '12px' }}>
                                                <Space size={4}>
                                                    <LinkOutlined style={{ fontSize: '11px', color: '#8c8c8c' }} />
                                                    <Text
                                                        type="secondary"
                                                        style={{
                                                            fontFamily: 'monospace',
                                                            fontSize: '11px',
                                                            wordBreak: 'break-all',
                                                            maxWidth: '100%'
                                                        }}
                                                        title={urlDisplay || ''}
                                                    >
                                                        {urlDisplay}
                                                    </Text>
                                                </Space>
                                            </div>
                                        )}
                                        <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                                            {formattedDate}
                                        </div>
                                    </div>
                                ),
                            };
                        }) : [
                            {
                                color: 'green',
                                content: (
                                    <div>
                                        <Text strong>{intl.formatMessage({ id: 'pages.welcome.recentActivities.systemStart.title' })}</Text>
                                        <br />
                                        <Text type="secondary">{intl.formatMessage({ id: 'pages.welcome.recentActivities.systemStart.desc' })}</Text>
                                        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                                            {dayjs().format('YYYY-MM-DD HH:mm:ss')}
                                        </div>
                                    </div>
                                ),
                            },
                            {
                                color: 'blue',
                                content: (
                                    <div>
                                        <Text strong>{intl.formatMessage({ id: 'pages.welcome.recentActivities.userLogin.title' })}</Text>
                                        <br />
                                        <Text type="secondary">
                                            {intl.formatMessage({ id: 'pages.welcome.recentActivities.userLogin.desc' }, { username: currentUser?.name || currentUser?.userid || intl.formatMessage({ id: 'pages.welcome.user' }) })}
                                        </Text>
                                        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                                            {dayjs().format('YYYY-MM-DD HH:mm:ss')}
                                        </div>
                                    </div>
                                ),
                            },
                            {
                                color: 'orange',
                                content: (
                                    <div>
                                        <Text strong>{intl.formatMessage({ id: 'pages.welcome.recentActivities.dataSync.title' })}</Text>
                                        <br />
                                        <Text type="secondary">{intl.formatMessage({ id: 'pages.welcome.recentActivities.dataSync.desc' })}</Text>
                                        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                                            {dayjs().format('YYYY-MM-DD HH:mm:ss')}
                                        </div>
                                    </div>
                                ),
                            },
                        ]}
                    />
                )}
                {loadingMore && (
                    <div style={{ padding: '12px', textAlign: 'center' }}>
                        <Spin size="small" />
                    </div>
                )}
                {noMore && activities.length > 0 && (
                    <div style={{ padding: '12px', textAlign: 'center', color: '#bfbfbf', fontSize: '12px' }}>
                        {intl.formatMessage({ id: 'pages.welcome.recentActivities.noMore', defaultMessage: '没有更多记录了' })}
                    </div>
                )}
            </div>
        </Card>
    );
};

export default RecentActivitiesCard;
