import React from 'react';
import { Card, Typography } from 'antd';
import { createStyles } from 'antd-style';

const { Text } = Typography;

interface ResourceCardProps {
    readonly title: string;
    readonly value: string;
    readonly icon: React.ReactNode;
    readonly color?: string;
    readonly loading?: boolean;
    readonly token?: any;
    readonly chart?: React.ReactNode;
    readonly children?: React.ReactNode;
}

const ResourceCard: React.FC<ResourceCardProps> = React.memo(({ title, value, icon, color = '#1890ff', loading = false, token, chart, children }) => (
    <Card
        size="small"
        styles={{ body: { padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' } }}
        style={{
            borderRadius: '16px',
            border: `1px solid ${token?.colorBorderSecondary || '#f0f0f0'}`,
            backgroundColor: token?.colorBgContainer || '#ffffff',
            height: '100%',
            overflow: 'hidden'
        }}
        loading={loading}
    >
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 12
            }}
        >
            <div style={{
                color,
                fontSize: '24px',
                flexShrink: 0,
                width: 44,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `${color}10`,
                borderRadius: '50%'
            }}>
                {icon}
            </div>
            <div>
                <Text type="secondary" style={{ fontSize: '13px' }}>{title}</Text>
                <div style={{ fontSize: '24px', fontWeight: 600, lineHeight: 1.2 }}>
                    {value}
                </div>
            </div>
        </div>

        {/* Chart Area */}
        {chart && (
            <div style={{ flex: 1, minHeight: 60, display: 'flex', alignItems: 'flex-end', marginBottom: 12 }}>
                {chart}
            </div>
        )}

        {children && (
            <div style={{
                borderTop: `1px solid ${token?.colorBorderSecondary || '#f0f0f0'}`,
                paddingTop: 12,
                marginTop: 'auto'
            }}>
                {children}
            </div>
        )}
    </Card>
));

export default ResourceCard;
