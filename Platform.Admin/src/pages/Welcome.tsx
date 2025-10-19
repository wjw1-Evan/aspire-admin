import { PageContainer } from '@ant-design/pro-components';
import { useModel, history } from '@umijs/max';
import { 
  Card, 
  Row, 
  Col, 
  Avatar, 
  Typography, 
  Space, 
  Tag,
  Alert,
  Timeline,
  theme
} from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  SafetyOutlined,
  MenuOutlined,
  PlusOutlined,
  SettingOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  RocketOutlined,
  ThunderboltOutlined,
  CrownOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import React, { useState, useEffect } from 'react';
import { getUserStatistics } from '@/services/ant-design-pro/api';
import { getCurrentCompany } from '@/services/company';
import type { CurrentUser } from '@/types/unified-api';

const { Title, Text, Paragraph } = Typography;

// 统计卡片组件
const StatCard: React.FC<{
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color?: string;
  suffix?: string;
  loading?: boolean;
  token?: any;
}> = ({ title, value, icon, color = '#1890ff', suffix = '', loading = false, token }) => (
  <Card 
    size="small" 
      style={{
      textAlign: 'center',
      borderRadius: '12px',
      boxShadow: token?.boxShadow || '0 2px 8px rgba(0,0,0,0.06)',
      border: `1px solid ${token?.colorBorderSecondary || '#f0f0f0'}`,
      backgroundColor: token?.colorBgContainer || '#ffffff'
    }}
    loading={loading}
  >
    <div style={{ color, fontSize: '24px', marginBottom: '8px' }}>
      {icon}
    </div>
    <div style={{ 
      fontSize: '28px', 
            fontWeight: 'bold',
      color: token?.colorText || '#262626', 
      marginBottom: '4px' 
    }}>
      {value}{suffix}
        </div>
    <div style={{ 
      fontSize: '14px', 
      color: token?.colorTextSecondary || '#8c8c8c' 
    }}>
          {title}
        </div>
  </Card>
);

// 快速操作按钮组件
const QuickAction: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  color?: string;
  disabled?: boolean;
}> = ({ title, description, icon, onClick, color = '#1890ff', disabled = false }) => (
  <Card
    hoverable={!disabled}
    size="small"
        style={{
      textAlign: 'center',
      borderRadius: '12px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      border: `2px solid ${disabled ? '#f0f0f0' : color}`,
      background: disabled ? '#fafafa' : '#fff'
    }}
    onClick={disabled ? undefined : onClick}
  >
    <div style={{ color, fontSize: '32px', marginBottom: '12px' }}>
      {icon}
    </div>
    <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>
      {title}
      </div>
    <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
      {description}
    </div>
  </Card>
);

// 系统状态组件
const SystemStatus: React.FC<{
  status: 'healthy' | 'warning' | 'error';
  message: string;
  lastUpdate: string;
}> = ({ status, message, lastUpdate }) => {
  const statusConfig = {
    healthy: { color: '#52c41a', icon: <CheckCircleOutlined />, text: '系统正常' },
    warning: { color: '#faad14', icon: <ExclamationCircleOutlined />, text: '系统警告' },
    error: { color: '#ff4d4f', icon: <ExclamationCircleOutlined />, text: '系统异常' }
  };

  const config = statusConfig[status];
  
  let alertType: 'success' | 'warning' | 'error';
  if (status === 'healthy') {
    alertType = 'success';
  } else if (status === 'warning') {
    alertType = 'warning';
  } else {
    alertType = 'error';
  }

  return (
    <Alert
      message={
        <Space>
          {config.icon}
          <span>{config.text}</span>
          <Text type="secondary">- {message}</Text>
        </Space>
      }
      description={`最后更新: ${lastUpdate}`}
      type={alertType}
      showIcon
      style={{ borderRadius: '8px' }}
    />
  );
};

const Welcome: React.FC = () => {
  const { token } = theme.useToken();
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser as CurrentUser;
  
  const [statistics, setStatistics] = useState<any>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [systemStatus] = useState<'healthy' | 'warning' | 'error'>('healthy');

  // 获取统计数据
  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const [statsRes, companyRes] = await Promise.all([
        getUserStatistics(),
        getCurrentCompany()
      ]);
      
      if (statsRes.success) {
        setStatistics(statsRes.data);
      }
      
      if (companyRes.success) {
        setCompanyInfo(companyRes.data);
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
  }, []);

  // 获取当前时间问候语
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return '夜深了';
    if (hour < 12) return '早上好';
    if (hour < 14) return '中午好';
    if (hour < 18) return '下午好';
    if (hour < 22) return '晚上好';
    return '夜深了';
  };

  // 获取用户角色标签
  const getUserRoleTags = () => {
    if (!currentUser?.roles) return [];
    
    return currentUser.roles.map(role => {
      const isAdmin = role === 'admin' || role === '管理员';
      const tagColor = isAdmin ? 'red' : 'blue';
      const tagIcon = isAdmin ? <CrownOutlined /> : <UserOutlined />;
      
      return (
        <Tag 
          key={role} 
          color={tagColor} 
          icon={tagIcon}
        >
          {role}
        </Tag>
      );
    });
  };

  // 快速操作处理
  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'user-management':
        history.push('/system/user-management');
        break;
      case 'role-management':
        history.push('/system/role-management');
        break;
      case 'company-settings':
        history.push('/system/company-settings');
        break;
      case 'account-center':
        history.push('/account/center');
        break;
      default:
        break;
    }
  };

  return (
    <PageContainer
      title={false}
      style={{ background: 'transparent' }}
    >
      <div style={{ padding: '0 24px' }}>
        {/* 个性化欢迎区域 */}
      <Card
        style={{
            marginBottom: '24px',
            borderRadius: '16px',
            background: token.colorBgContainer === '#ffffff' 
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : 'linear-gradient(135deg, #1f1f1f 0%, #2d2d2d 100%)',
            border: 'none',
            color: 'white',
            boxShadow: token.boxShadow
          }}
          styles={{ body: { padding: '32px' } }}
        >
          <Row align="middle" gutter={24}>
            <Col>
              <Avatar 
                size={80} 
                icon={<UserOutlined />} 
                src={currentUser?.avatar}
            style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  border: '3px solid rgba(255,255,255,0.3)'
                }}
              />
            </Col>
            <Col flex={1}>
              <Title level={2} style={{ color: 'white', margin: 0 }}>
                {getGreeting()}，{currentUser?.displayName || currentUser?.username || '用户'}！
              </Title>
              <Paragraph style={{ color: 'rgba(255,255,255,0.8)', margin: '8px 0 16px 0' }}>
                欢迎回到 Aspire Admin Platform 企业级管理平台
                {companyInfo?.name && ` - ${companyInfo.name}`}
              </Paragraph>
              <Space wrap>
                {getUserRoleTags()}
                <Tag color="green" icon={<GlobalOutlined />}>
                  在线
                </Tag>
              </Space>
            </Col>
            <Col>
              <Space direction="vertical" size="large">
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                    {new Date().toLocaleDateString('zh-CN', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div style={{ fontSize: '14px', opacity: 0.8 }}>
                    {new Date().toLocaleDateString('zh-CN', { weekday: 'long' })}
                  </div>
          </div>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 系统状态 */}
        <SystemStatus
          status={systemStatus}
          message="所有服务运行正常"
          lastUpdate={new Date().toLocaleTimeString('zh-CN')}
        />

        <div style={{ margin: '24px 0' }} />

        {/* 统计概览 */}
        <Card 
          title={
            <Space>
              <BarChartOutlined />
              <span>系统概览</span>
            </Space>
          }
          style={{ marginBottom: '24px', borderRadius: '12px' }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title="总用户数"
                value={statistics?.totalUsers || 0}
                icon={<TeamOutlined />}
                color={token.colorPrimary}
                loading={loading}
                token={token}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title="活跃用户"
                value={statistics?.activeUsers || 0}
                icon={<ThunderboltOutlined />}
                color={token.colorSuccess}
                loading={loading}
                token={token}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title="管理员"
                value={statistics?.adminUsers || 0}
                icon={<CrownOutlined />}
                color={token.colorWarning}
                loading={loading}
                token={token}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title="今日新增"
                value={statistics?.newUsersToday || 0}
                icon={<RocketOutlined />}
                color={token.colorError}
                loading={loading}
                token={token}
              />
            </Col>
          </Row>
        </Card>

        <Row gutter={[24, 24]}>
          {/* 快速操作 */}
          <Col xs={24} lg={12}>
            <Card 
              title={
                <Space>
                  <RocketOutlined />
                  <span>快速操作</span>
                </Space>
              }
              style={{ borderRadius: '12px' }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={12} sm={8}>
                  <QuickAction
                    title="用户管理"
                    description="管理系统用户"
                    icon={<TeamOutlined />}
                    onClick={() => handleQuickAction('user-management')}
                    color="#1890ff"
                  />
                </Col>
                <Col xs={12} sm={8}>
                  <QuickAction
                    title="角色管理"
                    description="配置用户角色"
                    icon={<SafetyOutlined />}
                    onClick={() => handleQuickAction('role-management')}
                    color="#52c41a"
                  />
                </Col>
                <Col xs={12} sm={8}>
                  <QuickAction
                    title="企业设置"
                    description="配置企业信息"
                    icon={<SettingOutlined />}
                    onClick={() => handleQuickAction('company-settings')}
                    color="#faad14"
                  />
                </Col>
                <Col xs={12} sm={8}>
                  <QuickAction
                    title="个人中心"
                    description="管理个人信息"
                    icon={<UserOutlined />}
                    onClick={() => handleQuickAction('account-center')}
                    color="#722ed1"
                  />
                </Col>
                <Col xs={12} sm={8}>
                  <QuickAction
                    title="系统菜单"
                    description="配置系统菜单"
                    icon={<MenuOutlined />}
                    onClick={() => handleQuickAction('menu-management')}
                    color="#13c2c2"
                    disabled={!currentUser?.roles?.includes('admin')}
                  />
                </Col>
                <Col xs={12} sm={8}>
                  <QuickAction
                    title="添加用户"
                    description="创建新用户"
                    icon={<PlusOutlined />}
                    onClick={() => handleQuickAction('add-user')}
                    color="#eb2f96"
                    disabled={!currentUser?.roles?.includes('admin')}
                  />
                </Col>
              </Row>
            </Card>
          </Col>

          {/* 最近活动 */}
          <Col xs={24} lg={12}>
            <Card 
              title={
                <Space>
                  <ClockCircleOutlined />
                  <span>最近活动</span>
                </Space>
              }
              style={{ borderRadius: '12px' }}
            >
              <Timeline
                items={[
                  {
                    color: 'green',
                    children: (
                      <div>
                        <Text strong>系统启动</Text>
                        <br />
                        <Text type="secondary">系统已成功启动并运行</Text>
                        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                          {new Date().toLocaleString('zh-CN')}
                        </div>
                      </div>
                    ),
                  },
                  {
                    color: 'blue',
                    children: (
                      <div>
                        <Text strong>用户登录</Text>
                        <br />
                        <Text type="secondary">
                          {currentUser?.displayName || currentUser?.username} 已登录系统
                        </Text>
                        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                          {new Date().toLocaleString('zh-CN')}
                        </div>
                      </div>
                    ),
                  },
                  {
                    color: 'orange',
                    children: (
                      <div>
                        <Text strong>数据同步</Text>
                        <br />
                        <Text type="secondary">用户权限数据已同步</Text>
                        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                          {new Date().toLocaleString('zh-CN')}
          </div>
        </div>
                    ),
                  },
                ]}
              />
            </Card>
          </Col>
        </Row>

        {/* 系统信息 */}
        <Card 
          title="系统信息"
          style={{ marginTop: '24px', borderRadius: '12px' }}
        >
          <Row gutter={[24, 16]}>
            <Col xs={24} sm={12} md={6}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff' }}>
                  .NET 9
                </div>
                <div style={{ fontSize: '14px', color: '#8c8c8c' }}>后端框架</div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a' }}>
                  React 19
                </div>
                <div style={{ fontSize: '14px', color: '#8c8c8c' }}>前端框架</div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#faad14' }}>
                  MongoDB
                </div>
                <div style={{ fontSize: '14px', color: '#8c8c8c' }}>数据库</div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#722ed1' }}>
                  Aspire
                </div>
                <div style={{ fontSize: '14px', color: '#8c8c8c' }}>微服务编排</div>
              </div>
            </Col>
          </Row>
      </Card>
      </div>
    </PageContainer>
  );
};

export default Welcome;