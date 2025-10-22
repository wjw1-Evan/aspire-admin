import React from 'react';
import { Card, Statistic, Row, Col } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import type { UserStatisticsResponse } from '../types';

interface UserStatisticsProps {
  /** 统计数据 */
  readonly statistics: UserStatisticsResponse | null;
  /** 加载状态 */
  readonly loading?: boolean;
}

/**
 * 用户统计卡片组件
 *
 * 显示用户总数、活跃用户、管理员等统计信息
 */
const UserStatistics: React.FC<UserStatisticsProps> = ({
  statistics,
  loading,
}) => {
  return (
    <Card loading={loading} style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title="总用户数"
            value={statistics?.totalUsers || 0}
            prefix={<UserOutlined />}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title="活跃用户"
            value={statistics?.activeUsers || 0}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title="停用用户"
            value={statistics?.inactiveUsers || 0}
            prefix={<StopOutlined />}
            valueStyle={{ color: '#faad14' }}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title="管理员"
            value={statistics?.adminUsers || 0}
            prefix={<TeamOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Col>
      </Row>
    </Card>
  );
};

export default React.memo(UserStatistics);








