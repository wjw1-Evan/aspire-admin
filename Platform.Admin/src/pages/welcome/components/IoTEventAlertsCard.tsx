import React, { useEffect, useState } from 'react';
import { Card, Space, Tag, Empty, List, Button, Badge, theme, Typography, Alert } from 'antd';
import { BellOutlined, AlertOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useIntl, useAccess } from '@umijs/max';
import { queryIoTEvents, getUnhandledEventCount } from '@/services/iot/api';
import type { IoTDeviceEvent } from '@/services/iot/api';

const { Text } = Typography;

interface IoTEventAlertsCardProps {
    readonly loading?: boolean;
}

const IoTEventAlertsCard: React.FC<IoTEventAlertsCardProps> = ({ loading: externalLoading = false }) => {
    const intl = useIntl();
    const { token } = theme.useToken();
    const access = useAccess();
    const [events, setEvents] = useState<IoTDeviceEvent[]>([]);
    const [unhandledCount, setUnhandledCount] = useState(0);
    const [loading, setLoading] = useState(false);

    // 检查用户是否有权限访问 IoT 平台
    const canAccessIoT = access.canAccessPath('/iot-platform');

    // 获取未处理事件数量
    const fetchUnhandledCount = async () => {
        try {
            const res = await getUnhandledEventCount();
            if (res?.data) {
                setUnhandledCount(res.data);
            }
        } catch (error) {
            console.warn('获取未处理事件数量失败:', error);
        }
    };

    // 获取最近的事件
    const fetchEvents = async () => {
        try {
            setLoading(true);
            const res = await queryIoTEvents({
                isHandled: false,
                pageIndex: 1,
                pageSize: 5,
                sortBy: 'occurredAt',
                sortOrder: 'desc'
            });
            if (res?.data?.list) {
                setEvents(res.data.list);
            }
        } catch (error) {
            console.warn('获取 IoT 事件失败:', error);
        } finally {
            setLoading(false);
        }
    };

    // 初始化加载
    useEffect(() => {
        if (!canAccessIoT) return;
        fetchUnhandledCount();
        fetchEvents();

        // 定时刷新（每 30 秒）
        const intervalId = setInterval(() => {
            if (document.visibilityState === 'visible') {
                fetchUnhandledCount();
                fetchEvents();
            }
        }, 30000);

        // 监听可见性变化
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchUnhandledCount();
                fetchEvents();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [canAccessIoT]);

    // 获取事件级别的颜色
    const getLevelColor = (level: string) => {
        switch (level?.toLowerCase()) {
            case 'critical':
                return 'red';
            case 'error':
                return 'orange';
            case 'warning':
                return 'gold';
            case 'info':
            default:
                return 'blue';
        }
    };

    // 获取事件类型的显示文本
    const getEventTypeLabel = (eventType: string) => {
        const typeMap: Record<string, string> = {
            'Connected': intl.formatMessage({ id: 'pages.welcome.iotEvents.type.connected', defaultMessage: '已连接' }),
            'Disconnected': intl.formatMessage({ id: 'pages.welcome.iotEvents.type.disconnected', defaultMessage: '已断开' }),
            'DataReceived': intl.formatMessage({ id: 'pages.welcome.iotEvents.type.dataReceived', defaultMessage: '数据接收' }),
            'Alarm': intl.formatMessage({ id: 'pages.welcome.iotEvents.type.alarm', defaultMessage: '告警' }),
            'Error': intl.formatMessage({ id: 'pages.welcome.iotEvents.type.error', defaultMessage: '错误' }),
        };
        return typeMap[eventType] || eventType;
    };

    // 格式化时间
    const formatTime = (date: string | Date) => {
        const d = new Date(date);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return intl.formatMessage({ id: 'pages.welcome.iotEvents.time.justNow', defaultMessage: '刚刚' });
        if (minutes < 60) return intl.formatMessage({ id: 'pages.welcome.iotEvents.time.minutesAgo', defaultMessage: '{minutes}分钟前' }, { minutes });
        if (hours < 24) return intl.formatMessage({ id: 'pages.welcome.iotEvents.time.hoursAgo', defaultMessage: '{hours}小时前' }, { hours });
        if (days < 7) return intl.formatMessage({ id: 'pages.welcome.iotEvents.time.daysAgo', defaultMessage: '{days}天前' }, { days });
        return d.toLocaleDateString();
    };

    if (!canAccessIoT) {
        return null;
    }

    return (
        <Card
            title={
                <Space>
                    <Badge count={unhandledCount} color={token.colorError}>
                        <BellOutlined />
                    </Badge>
                    <span>{intl.formatMessage({ id: 'pages.welcome.iotEvents.title', defaultMessage: '物联网事件告警' })}</span>
                </Space>
            }
            style={{ height: '100%', borderRadius: '12px' }}
            loading={externalLoading || loading}
        >
            {unhandledCount === 0 && events.length === 0 ? (
                <Empty
                    description={intl.formatMessage({ id: 'pages.welcome.iotEvents.empty', defaultMessage: '暂无告警事件' })}
                    style={{ marginTop: '20px' }}
                />
            ) : (
                <Space direction="vertical" style={{ width: '100%' }} size={0}>
                    {unhandledCount > 0 && (
                        <Alert
                            message={intl.formatMessage(
                                { id: 'pages.welcome.iotEvents.unhandledAlert', defaultMessage: '有 {count} 个未处理的事件' },
                                { count: unhandledCount }
                            )}
                            type="warning"
                            showIcon
                            icon={<AlertOutlined />}
                            style={{ marginBottom: '12px', borderRadius: '8px' }}
                        />
                    )}
                    <List
                        dataSource={events}
                        renderItem={(event) => (
                            <List.Item
                                style={{
                                    padding: '12px 0',
                                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                                }}
                                key={event.id}
                            >
                                <List.Item.Meta
                                    avatar={
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <AlertOutlined style={{
                                                color: getLevelColor(event.level) === 'red' ? token.colorError :
                                                    getLevelColor(event.level) === 'orange' ? token.colorWarning :
                                                        getLevelColor(event.level) === 'gold' ? token.colorWarning :
                                                            token.colorInfo
                                            }} />
                                        </div>
                                    }
                                    title={
                                        <Space size={8}>
                                            <Tag color={getLevelColor(event.level)}>{event.level}</Tag>
                                            <Text strong>{getEventTypeLabel(event.eventType)}</Text>
                                        </Space>
                                    }
                                    description={
                                        <Space direction="vertical" size={2} style={{ width: '100%' }}>
                                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                                {event.description || intl.formatMessage({ id: 'pages.welcome.iotEvents.noDescription', defaultMessage: '无描述' })}
                                            </Text>
                                            <Space size={12} style={{ fontSize: '11px', color: token.colorTextSecondary }}>
                                                <span>
                                                    <ClockCircleOutlined style={{ marginRight: '4px' }} />
                                                    {formatTime(event.occurredAt)}
                                                </span>
                                                {event.deviceId && (
                                                    <span>
                                                        {intl.formatMessage({ id: 'pages.welcome.iotEvents.device', defaultMessage: '设备' })}: {event.deviceId}
                                                    </span>
                                                )}
                                            </Space>
                                        </Space>
                                    }
                                />
                            </List.Item>
                        )}
                    />
                    {events.length > 0 && (
                        <div style={{ marginTop: '12px', textAlign: 'center' }}>
                            <Button
                                type="link"
                                size="small"
                                onClick={() => {
                                    // 导航到事件管理页面
                                    window.location.href = '/iot-platform/event-management';
                                }}
                            >
                                {intl.formatMessage({ id: 'pages.welcome.iotEvents.viewAll', defaultMessage: '查看全部' })}
                            </Button>
                        </div>
                    )}
                </Space>
            )}
        </Card>
    );
};

export default IoTEventAlertsCard;
