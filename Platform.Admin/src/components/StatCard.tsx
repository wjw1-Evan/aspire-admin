import React from 'react';
import { Card, theme } from 'antd';

export interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color?: string;
  suffix?: React.ReactNode;
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = React.memo(({
  title,
  value,
  icon,
  color = '#1890ff',
  suffix = null,
  loading = false,
}) => {
  const { token } = theme.useToken();

  return (
    <Card
      size="small"
      styles={{ body: { padding: '10px 12px' } }}
      style={{
        borderRadius: '12px',
        border: `1px solid ${token.colorBorderSecondary}`,
        backgroundColor: token.colorBgContainer,
      }}
      loading={loading}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ color, fontSize: '20px', flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ textAlign: 'right', flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: token.colorText, lineHeight: 1.2 }}>
            {value}
            {suffix}
          </div>
          <div style={{ fontSize: '12px', color: token.colorTextSecondary, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {title}
          </div>
        </div>
      </div>
    </Card>
  );
});

StatCard.displayName = 'StatCard';

export default StatCard;
