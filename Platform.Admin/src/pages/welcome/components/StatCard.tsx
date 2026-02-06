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
        styles={{ body: { padding: '20px 24px' } }}
        style={{
            borderRadius: '16px',
            border: `1px solid ${token?.colorBorderSecondary || '#f0f0f0'}`,
            backgroundColor: token?.colorBgContainer || '#ffffff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            cursor: onClick ? 'pointer' : 'default',
            transition: 'all 0.3s'
        }}
        onClick={onClick}
        hoverable={!!onClick}
    >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text type="secondary" style={{ fontSize: '14px' }}>{title}</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: '28px', fontWeight: 700, color: token?.colorText || '#000000' }}>
                {value}
            </span>
            {suffix && <span style={{ fontSize: '14px', color: token?.colorTextSecondary || '#8c8c8c' }}>{suffix}</span>}
        </div>
        <div style={{
            position: 'absolute',
            right: 24,
            top: '50%',
            transform: 'translateY(-50%)',
        }}>
            <span style={{
                fontSize: '28px',
                color: color,
                opacity: 0.15,
                borderRadius: '50%',
                width: '48px',
                height: '48px',
                background: `${color}12`,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                verticalAlign: 'middle'
            }}>{icon}</span>
        </div>
    </Card>
));

export default StatCard;
