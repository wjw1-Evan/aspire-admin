import React, { useEffect, useState } from 'react';
import { Card, Space, Tag, Empty, Table, Button, Badge, theme, Typography, Alert } from 'antd';
import { BellOutlined, AlertOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useAccess, useNavigate } from '@umijs/max';
import { queryIoTEvents, getUnhandledEventCount } from '@/services/iot/api';
import type { IoTDeviceEvent } from '@/services/iot/api';

const { Text } = Typography;

interface IoTEventAlertsCardProps {
    readonly loading?: boolean;
}

const IoTEventAlertsCard: React.FC<IoTEventAlertsCardProps> = ({ loading: externalLoading = false }) => {
    const { token } = theme.useToken();
    const access = useAccess();
    const navigate = useNavigate();
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
            'Connected': '已连接',
            'Disconnected': '已断开',
            'DataReceived': '数据接收',
            'Alarm': '告警',
            'Error': '错误',
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

        if (minutes < 1) return '刚刚';
        if (minutes < 60) return `${minutes}分钟前`;
        if (hours < 24) return `${hours}小时前`;
        if (days < 7) return `${days}天前`;
        return d.toLocaleDateString();
    };

    if (!canAccessIoT) {
        return null;
    }

    const columns = [
        {
            title: '级别',
            dataIndex: 'level',
            key: 'level',
            width: '12%',
            render: (level: string) => (
                <Tag color={getLevelColor(level)}>{level}</Tag>
            ),
        },
        {
            title: '事件类型',
            dataIndex: 'eventType',
            key: 'eventType',
            width: '18%',
            render: (eventType: string) => (
                <Text strong>{getEventTypeLabel(eventType)}</Text>
            ),
        },
        {
            title: '描述',
            dataIndex: 'description',
            key: 'description',
            width: '35%',
            render: (description: string) => (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                    {description || '无描述'}
                </Text>
            ),
        },
        {
            title: '设备',
            dataIndex: 'deviceId',
            key: 'deviceId',
            width: '15%',
            render: (deviceId: string) => (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                    {deviceId || '-'}
                </Text>
            ),
        },
        {
            title: '时间',
            dataIndex: 'occurredAt',
            key: 'occurredAt',
            width: '20%',
            render: (occurredAt: string) => (
                <Space size={4} style={{ fontSize: '12px', color: token.colorTextSecondary }}>
                    <ClockCircleOutlined />
                    <span>{formatTime(occurredAt)}</span>
                </Space>
            ),
        },
    ];

    return (
        <Card
            title={
                <Space>
                    {unhandledCount > 0 && (
                        <Badge count={unhandledCount} color={token.colorError}>
                            <BellOutlined />
                        </Badge>
                    )}
                    {unhandledCount === 0 && <BellOutlined />}
                    <span>物联网事件告警</span>
                </Space>
            }
            style={{ height: '100%', borderRadius: '12px' }}
            loading={externalLoading || loading}
        >
            {unhandledCount === 0 && events.length === 0 ? (
                <Empty
                    description="暂无告警事件"
                    style={{ marginTop: '20px' }}
                />
            ) : (
                <Space style={{ width: '100%' }} orientation="vertical" size={12}>
                    {unhandledCount > 0 && (
                        <Alert
                            message={`有 ${unhandledCount} 个未处理的事件`}
                            type="warning"
                            showIcon
                            icon={<AlertOutlined />}
                            style={{ borderRadius: '8px' }}
                        />
                    )}
                    <Table
                        columns={columns}
                        dataSource={events}
                        rowKey="id"
                        pagination={false}
                        size="small"
                        style={{ marginTop: '12px' }}
                    />
                    {events.length > 0 && (
                        <div style={{ marginTop: '12px', textAlign: 'center' }}>
                            <Button
                                type="link"
                                size="small"
                                onClick={() => {
                                    navigate('/iot-platform/event-management');
                                }}
                            >
                                查看全部
                            </Button>
                        </div>
                    )}
                </Space>
            )}
        </Card>
    );
};

export default IoTEventAlertsCard;
