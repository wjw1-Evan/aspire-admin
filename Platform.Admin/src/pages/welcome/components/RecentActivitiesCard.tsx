import React from 'react';
import { Card, Space, Timeline, Typography } from 'antd';
import { ClockCircleOutlined, LinkOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import useCommonStyles from '@/hooks/useCommonStyles';
import dayjs from 'dayjs';
import { getActivityColor } from '../utils';


const { Text } = Typography;

interface RecentActivitiesCardProps {
    readonly recentActivities: (API.UserActivityLog & { fullUrl?: string; path?: string; queryString?: string; httpMethod?: string })[];
    readonly currentUser?: API.CurrentUser;
}

const RecentActivitiesCard: React.FC<RecentActivitiesCardProps> = ({ recentActivities, currentUser }) => {
    const intl = useIntl();
    const { styles } = useCommonStyles();

    return (
        <Card
            title={
                <Space>
                    <ClockCircleOutlined />
                    <span>{intl.formatMessage({ id: 'pages.welcome.recentActivities' })}</span>
                </Space>
            }
            className={styles.card}
            style={{ height: '100%' }}
        >
            <Timeline
                items={recentActivities.length > 0 ? recentActivities.map(activity => {
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
        </Card>
    );
};

export default RecentActivitiesCard;
