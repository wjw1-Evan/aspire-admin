import React from 'react';
import { Card, Row, Col, Space, Tag, Alert, Typography, theme } from 'antd';
import { DatabaseOutlined, ThunderboltOutlined, CiOutlined, HddOutlined, MonitorOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import ResourceCard from './ResourceCard';
import TinyAreaChart from './TinyAreaChart';
import type { SystemResources } from '@/services/system/api';
import { getResourceColor, formatDuration } from '../utils';

const { Title, Text } = Typography;

interface SystemResourcesCardProps {
    readonly systemResources: SystemResources | null;
    readonly loading: boolean;
    readonly memoryHistory: { value: number; time: string }[];
    readonly cpuHistory: { value: number; time: string }[];
    readonly diskHistory: { value: number; time: string }[];
}

const SystemResourcesCard: React.FC<SystemResourcesCardProps> = ({
    systemResources,
    loading,
    memoryHistory,
    cpuHistory,
    diskHistory
}) => {
    const intl = useIntl();
    const { token } = theme.useToken();

    if (!systemResources) {
        return (
            <Card
                title={
                    <Space>
                        <DatabaseOutlined />
                        <span>{intl.formatMessage({ id: 'pages.welcome.systemResources' })}</span>
                    </Space>
                }
                style={{ marginTop: '16px', borderRadius: '12px' }}
            >
                <Alert
                    title={intl.formatMessage({ id: 'pages.welcome.systemResources.unavailable' })}
                    description={intl.formatMessage({ id: 'pages.welcome.systemResources.unavailableDesc' })}
                    type="warning"
                    showIcon
                    style={{ borderRadius: '8px' }}
                />
            </Card>
        );
    }

    return (
        <Card
            title={
                <Space>
                    <DatabaseOutlined />
                    <span>{intl.formatMessage({ id: 'pages.welcome.systemResources' })}</span>
                </Space>
            }
            style={{ marginTop: '16px', borderRadius: '12px' }}
        >
            <Row gutter={[12, 12]}>
                {/* 系统内存使用率 */}
                {systemResources.memory && (
                    <Col xs={24} sm={12} md={8}>
                        <ResourceCard
                            title={intl.formatMessage({ id: 'pages.welcome.systemResources.memoryUsage' })}
                            value={`${systemResources.memory?.usagePercent || 0}%`}
                            icon={<ThunderboltOutlined />}
                            color={getResourceColor(systemResources.memory?.usagePercent || 0)}
                            loading={loading}
                            token={token}
                            chart={<TinyAreaChart data={memoryHistory} color={getResourceColor(systemResources.memory?.usagePercent || 0)} />}
                        >
                            <div style={{ fontSize: '12px', color: '#8c8c8c', textAlign: 'center' }}>
                                {intl.formatMessage(
                                    { id: 'pages.welcome.systemResources.systemMemory' },
                                    {
                                        used: ((systemResources.memory?.totalMemoryMB || 0) - (systemResources.memory?.availableMemoryMB || 0)).toFixed(2),
                                        total: (systemResources.memory?.totalMemoryMB || 0).toFixed(2),
                                    }
                                )}
                            </div>
                            <div style={{ fontSize: '11px', color: '#1890ff', textAlign: 'center', marginTop: '2px' }}>
                                {intl.formatMessage(
                                    { id: 'pages.welcome.systemResources.processMemory' },
                                    {
                                        memory: (systemResources.memory?.processMemoryMB || 0).toFixed(2),
                                        percent: (systemResources.memory?.processUsagePercent || 0).toFixed(2),
                                    }
                                )}
                            </div>
                        </ResourceCard>
                    </Col>
                )}
                {/* CPU 使用率 */}
                {systemResources.cpu && (
                    <Col xs={24} sm={12} md={8}>
                        <ResourceCard
                            title={intl.formatMessage({ id: 'pages.welcome.systemResources.cpuUsage' })}
                            value={`${systemResources.cpu?.usagePercent || 0}%`}
                            icon={<CiOutlined />}
                            color={getResourceColor(systemResources.cpu?.usagePercent || 0)}
                            loading={loading}
                            token={token}
                            chart={<TinyAreaChart data={cpuHistory} color={getResourceColor(systemResources.cpu?.usagePercent || 0)} />}
                        >
                            <div style={{ fontSize: '12px', color: '#8c8c8c', textAlign: 'center' }}>
                                {intl.formatMessage({ id: 'pages.welcome.systemResources.uptime' })}
                                {formatDuration(systemResources.cpu?.uptime || 0)}
                            </div>
                            <div style={{ fontSize: '11px', color: '#52c41a', textAlign: 'center', marginTop: '2px' }}>
                                {intl.formatMessage(
                                    { id: 'pages.welcome.systemResources.processCpu' },
                                    { percent: (systemResources.cpu?.processUsagePercent || 0).toFixed(2) }
                                )}
                                <span style={{ margin: '0 4px', opacity: 0.5 }}>|</span>
                                {intl.formatMessage(
                                    { id: 'pages.welcome.systemResources.cpuCores' },
                                    { count: systemResources.system?.processorCount || 0 }
                                )}
                            </div>
                        </ResourceCard>
                    </Col>
                )}

                {/* 磁盘使用率 */}
                {systemResources.disk && (
                    <Col xs={24} sm={12} md={8}>
                        <ResourceCard
                            title={intl.formatMessage({ id: 'pages.welcome.systemResources.diskUsage' })}
                            value={`${systemResources.disk?.usagePercent || 0}%`}
                            icon={<HddOutlined />}
                            color={getResourceColor(systemResources.disk?.usagePercent || 0)}
                            loading={loading}
                            token={token}
                            chart={<TinyAreaChart data={diskHistory} color={getResourceColor(systemResources.disk?.usagePercent || 0)} />}
                        >
                            <div style={{ fontSize: '12px', color: '#8c8c8c', textAlign: 'center' }}>
                                {intl.formatMessage(
                                    { id: 'pages.welcome.systemResources.diskSize' },
                                    {
                                        used: (systemResources.disk?.usedSizeGB || 0).toFixed(2),
                                        total: (systemResources.disk?.totalSizeGB || 0).toFixed(2),
                                    }
                                )}
                            </div>
                            <div style={{ fontSize: '11px', color: '#fa8c16', textAlign: 'center', marginTop: '2px' }}>
                                {intl.formatMessage(
                                    { id: 'pages.welcome.systemResources.diskDrive' },
                                    {
                                        name: systemResources.disk?.driveName || '-',
                                        type: systemResources.disk?.driveType || '-'
                                    }
                                )}
                            </div>
                        </ResourceCard>
                    </Col>
                )}
            </Row>

            {/* 系统详细信息 */}
            {systemResources?.system && (
                <div style={{
                    marginTop: '16px',
                    padding: '16px',
                    backgroundColor: token.colorFillAlter || '#fafafa',
                    borderRadius: '12px',
                    border: `1px solid ${token.colorBorderSecondary || '#f0f0f0'}`
                }}>
                    <Title level={5} style={{ marginBottom: 12, fontSize: '14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MonitorOutlined style={{ color: token.colorPrimary }} />
                        {intl.formatMessage({ id: 'pages.welcome.systemDetails' }, { defaultMessage: '系统运行详情' })}
                    </Title>
                    <Row gutter={[16, 12]}>
                        {[
                            { label: 'machineName', value: systemResources.system?.machineName },
                            { label: 'osVersion', value: systemResources.system?.osVersion, large: true },
                            { label: 'frameworkVersion', value: systemResources.system?.frameworkVersion },
                            { label: 'processorCount', value: systemResources.system?.processorCount },
                            { label: 'architecture', value: systemResources.system?.is64BitOperatingSystem ? intl.formatMessage({ id: 'pages.welcome.systemDetails.bit64' }) : intl.formatMessage({ id: 'pages.welcome.systemDetails.bit32' }) },
                            { label: 'userName', value: systemResources.system?.userName },
                            { label: 'systemUpTime', value: formatDuration(systemResources.system?.systemUpTime || 0) },
                        ].map((item, idx) => (
                            <Col key={idx} xs={24} sm={12} md={item.large ? 12 : 6}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>{intl.formatMessage({ id: `pages.welcome.systemDetails.${item.label}` })}</Text>
                                    <Text strong style={{ fontSize: '13px', wordBreak: 'break-all' }}>{item.value || '-'}</Text>
                                </div>
                            </Col>
                        ))}
                        <Col xs={24} sm={12} md={6}>
                            <Tag variant="filled" color="blue" style={{ borderRadius: '4px', marginTop: 4 }}>
                                64-Bit Process: {systemResources.system?.is64BitProcess ? 'Yes' : 'No'}
                            </Tag>
                        </Col>
                    </Row>
                    <div style={{
                        marginTop: 12,
                        paddingTop: 8,
                        borderTop: `1px dashed ${token.colorBorderSecondary || '#f0f0f0'}`,
                        fontSize: '12px',
                        color: token.colorTextSecondary
                    }}>
                        <Space>
                            <span style={{ opacity: 0.7 }}>{intl.formatMessage({ id: 'pages.welcome.systemDetails.workingDirectory', defaultMessage: '运行目录:' })}</span>
                            <Text code style={{ fontSize: '11px' }}>{systemResources.system?.workingDirectory}</Text>
                        </Space>
                    </div>
                </div>
            )}
        </Card>
    );
};

export default SystemResourcesCard;
