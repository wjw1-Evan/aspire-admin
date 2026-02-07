import React from 'react';
import { Card, Typography, theme } from 'antd';
import { RightOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;
const { useToken } = theme;

interface QuickActionProps {
    readonly title: string;
    readonly description: string;
    readonly icon: React.ReactNode;
    readonly onClick: () => void;
    readonly color?: string;
    readonly disabled?: boolean;
    readonly token: any;
}

const QuickAction: React.FC<QuickActionProps> = ({ title, description, icon, onClick, color = '#1890ff', disabled = false, token }) => {
    return (
        <Card
            hoverable
            className="quick-action-card"
            onClick={disabled ? undefined : onClick}
            style={{
                width: '100%',
                cursor: disabled ? 'not-allowed' : 'pointer',
                borderRadius: '12px',
                border: `1px solid ${token?.colorBorderSecondary || '#f0f0f0'}`,
                transition: 'all 0.3s',
                opacity: disabled ? 0.6 : 1,
                backgroundColor: token?.colorBgContainer || '#ffffff',
            }}
            styles={{ body: { padding: '16px', display: 'flex', flexDirection: 'column' } }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: '10px',
                        background: `${color}15`, // Keep shallow background
                        color: color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        marginRight: 12,
                        transition: 'transform 0.3s',
                    }}
                >
                    {icon}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <Text strong style={{ fontSize: '15px', color: token?.colorText || 'rgba(0, 0, 0, 0.88)', display: 'block', marginBottom: 4 }} ellipsis>
                        {title}
                    </Text>
                    <Paragraph
                        type="secondary"
                        style={{ fontSize: '12px', lineHeight: '1.5', margin: 0,  overflow: 'hidden' }}
                        ellipsis={{ rows: 2 }}
                    >
                        {description}
                    </Paragraph>
                </div>
            </div>

        </Card>
    );
};

export default QuickAction;
