import React from 'react';
import { Card, Typography } from 'antd';

const { Text } = Typography;

interface StatCardProps {
    readonly title: string;
    readonly value: number | string;
    readonly suffix?: React.ReactNode;
    readonly icon: React.ReactNode;
    readonly color: string;
    readonly loading: boolean;
    readonly token: any;
    readonly onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = React.memo(({ title, value, suffix, icon, color, loading, token, onClick }) => (
    <Card
        className="quick-action-card"
        styles={{ body: { padding: '16px', position: 'relative', overflow: 'hidden' } }}
        style={{
            borderRadius: '16px',
            border: `1px solid ${token?.colorBorderSecondary || '#f0f0f0'}`,
            backgroundColor: token?.colorBgContainer || '#ffffff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            cursor: onClick ? 'pointer' : 'default',
            transition: 'all 0.3s',
            height: '100%'
        }}
        onClick={onClick}
        hoverable={!!onClick}
    >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ marginBottom: 4 }}>
                    <Text type="secondary" style={{ fontSize: '13px', display: 'block', overflowWrap: 'break-word' }}>
                        {title}
                    </Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '24px', fontWeight: 700, color: token?.colorText || '#000000', lineHeight: 1.2 }}>
                        {value}
                    </span>
                    {suffix && <span style={{ fontSize: '12px', color: token?.colorTextSecondary || '#8c8c8c' }}>{suffix}</span>}
                </div>
            </div>
            <div style={{ flexShrink: 0 }}>
                <span style={{
                    fontSize: '20px',
                    color: color,
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    background: `${color}12`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {icon}
                </span>
            </div>
        </div>
    </Card>
));

export default StatCard;
