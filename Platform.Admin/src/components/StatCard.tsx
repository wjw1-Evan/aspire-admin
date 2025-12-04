import React from 'react';
import { Card, theme } from 'antd';

export interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color?: string;
  suffix?: string;
  loading?: boolean;
  /**
   * 可选的主题 token（例如从外部获取的 token），不传则使用内部的 theme token
   */
  token?: any;
}

/**
 * 统一的统计卡片组件
 * - 图标在左，数值和标题在右侧垂直排列
 * - 卡片内边距：10px 12px
 * - 图标尺寸：20px，数值字号：20px，标题字号：12px
 */
const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color = '#1890ff',
  suffix = '',
  loading = false,
  token: propToken,
}) => {
  const { token: themeToken } = theme.useToken();
  const token = propToken || themeToken;

  return (
    <Card
      size="small"
      styles={{ body: { padding: '10px 12px' } }}
      style={{
        borderRadius: '12px',
        border: `1px solid ${token?.colorBorderSecondary || '#f0f0f0'}`,
        backgroundColor: token?.colorBgContainer || '#ffffff',
      }}
      loading={loading}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div style={{ color, fontSize: '20px', flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ textAlign: 'right', flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: token?.colorText || '#262626',
              lineHeight: 1.2,
            }}
          >
            {value}
            {suffix}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: token?.colorTextSecondary || '#8c8c8c',
              marginTop: 2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default StatCard;


