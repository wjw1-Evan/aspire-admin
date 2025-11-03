import { PageContainer } from '@ant-design/pro-components';
import { useModel, history, useIntl } from '@umijs/max';
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
  RocketOutlined,
  ThunderboltOutlined,
  CrownOutlined,
  GlobalOutlined,
  DatabaseOutlined,
  HddOutlined,
  CiOutlined,
  MonitorOutlined,
  LinkOutlined
} from '@ant-design/icons';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getUserStatistics, getUserActivityLogs } from '@/services/ant-design-pro/api';
import { getCurrentCompany } from '@/services/company';
import { getSystemResources } from '@/services/system/api';
import type { CurrentUser } from '@/types/unified-api';
import type { SystemResources } from '@/services/system/api';

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

// 系统资源卡片组件
const ResourceCard: React.FC<{
  title: string;
  value: string;
  icon: React.ReactNode;
  color?: string;
  loading?: boolean;
  token?: any;
}> = ({ title, value, icon, color = '#1890ff', loading = false, token }) => (
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
      fontSize: '20px', 
      fontWeight: 'bold',
      color: token?.colorText || '#262626', 
      marginBottom: '4px' 
    }}>
      {value}
    </div>
    <div style={{ 
      fontSize: '12px', 
      color: token?.colorTextSecondary || '#8c8c8c' 
    }}>
      {title}
    </div>
  </Card>
);

const Welcome: React.FC = () => {
  const intl = useIntl();
  const { token } = theme.useToken();
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser as CurrentUser;
  
  const [statistics, setStatistics] = useState<any>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  // 扩展类型以包含 fullUrl 字段（后端实际返回的字段）
  const [recentActivities, setRecentActivities] = useState<(API.UserActivityLog & { fullUrl?: string; path?: string; queryString?: string; httpMethod?: string })[]>([]);
  const [systemResources, setSystemResources] = useState<SystemResources | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 定时器引用
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 获取系统资源数据
  const fetchSystemResources = useCallback(async () => {
    try {
      const resourcesRes = await getSystemResources();
      
      if (resourcesRes.success && resourcesRes.data) {
        const resources = resourcesRes.data;
        const memoryUsage = resources.memory?.usagePercent || 0;
        
        // 更新系统资源状态（只在数据变化时更新）
        setSystemResources(prevResources => {
          if (prevResources?.memory?.usagePercent === memoryUsage) {
            return prevResources; // 避免不必要的更新
          }
          return resources;
        });
      }
    } catch (error) {
      console.error('Failed to fetch system resources:', error);
    }
  }, []);

  // 获取统计数据
  const fetchStatistics = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, companyRes, activitiesRes] = await Promise.all([
        getUserStatistics(),
        getCurrentCompany(),
        getUserActivityLogs({ limit: 5 })
      ]);
      
      if (statsRes.success) {
        setStatistics(statsRes.data);
      }
      
      if (companyRes.success) {
        setCompanyInfo(companyRes.data);
      }

      if (activitiesRes.success) {
        setRecentActivities(activitiesRes.data || []);
      }

      // 获取初始系统资源数据
      await fetchSystemResources();
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchSystemResources]);

  // 初始数据加载
  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  // 定时器设置
  useEffect(() => {
    // 设置定时器，每5秒更新一次系统资源数据（减少抖动）
    intervalRef.current = setInterval(() => {
      fetchSystemResources();
    }, 5000);
    
    // 清理函数
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchSystemResources]);

  // 获取活动类型对应的颜色
  const getActivityColor = (action?: string): string => {
    if (!action) return 'blue';
    
    const colorMap: Record<string, string> = {
      'login': 'green',
      'logout': 'red',
      'create': 'blue',
      'update': 'orange',
      'delete': 'red',
      'view': 'cyan',
      'export': 'purple',
      'import': 'purple',
      'change_password': 'orange',
      'refresh_token': 'blue'
    };
    
    return colorMap[action.toLowerCase()] || 'blue';
  };

  // 获取资源使用率对应的颜色
  const getResourceColor = (usagePercent: number): string => {
    if (usagePercent > 80) return '#ff4d4f';
    if (usagePercent > 60) return '#faad14';
    return '#52c41a';
  };

  // 获取当前时间问候语
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return intl.formatMessage({ id: 'pages.welcome.greeting.lateNight' });
    if (hour < 12) return intl.formatMessage({ id: 'pages.welcome.greeting.morning' });
    if (hour < 14) return intl.formatMessage({ id: 'pages.welcome.greeting.noon' });
    if (hour < 18) return intl.formatMessage({ id: 'pages.welcome.greeting.afternoon' });
    if (hour < 22) return intl.formatMessage({ id: 'pages.welcome.greeting.evening' });
    return intl.formatMessage({ id: 'pages.welcome.greeting.lateNight' });
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
                {getGreeting()}，{currentUser?.displayName || currentUser?.username || intl.formatMessage({ id: 'pages.welcome.user' })}！
              </Title>
              <Paragraph style={{ color: 'rgba(255,255,255,0.8)', margin: '8px 0 16px 0' }}>
                {intl.formatMessage({ id: 'pages.welcome.welcomeText' })}
                {companyInfo?.name && ` - ${companyInfo.name}`}
              </Paragraph>
              <Space wrap>
                {getUserRoleTags()}
                <Tag color="green" icon={<GlobalOutlined />}>
                  {intl.formatMessage({ id: 'pages.welcome.online' })}
                </Tag>
              </Space>
            </Col>
            <Col>
              <Space direction="vertical" size="large">
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                    {new Date().toLocaleDateString(intl.locale === 'zh-CN' ? 'zh-CN' : 'en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div style={{ fontSize: '14px', opacity: 0.8 }}>
                    {new Date().toLocaleDateString(intl.locale === 'zh-CN' ? 'zh-CN' : 'en-US', { weekday: 'long' })}
                  </div>
          </div>
              </Space>
            </Col>
          </Row>
        </Card>

        <div style={{ margin: '24px 0' }} />

        {/* 统计概览 */}
        <Card 
          title={
            <Space>
              <BarChartOutlined />
              <span>{intl.formatMessage({ id: 'pages.welcome.overview' })}</span>
            </Space>
          }
          style={{ marginBottom: '24px', borderRadius: '12px' }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.welcome.stats.totalUsers' })}
                value={statistics?.totalUsers || 0}
                icon={<TeamOutlined />}
                color={token.colorPrimary}
                loading={loading}
                token={token}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.welcome.stats.activeUsers' })}
                value={statistics?.activeUsers || 0}
                icon={<ThunderboltOutlined />}
                color={token.colorSuccess}
                loading={loading}
                token={token}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.welcome.stats.adminUsers' })}
                value={statistics?.adminUsers || 0}
                icon={<CrownOutlined />}
                color={token.colorWarning}
                loading={loading}
                token={token}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.welcome.stats.newUsersToday' })}
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
                  <span>{intl.formatMessage({ id: 'pages.welcome.quickActions' })}</span>
                </Space>
              }
              style={{ borderRadius: '12px' }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={12} sm={8}>
                  <QuickAction
                    title={intl.formatMessage({ id: 'pages.welcome.quickActions.userManagement.title' })}
                    description={intl.formatMessage({ id: 'pages.welcome.quickActions.userManagement.desc' })}
                    icon={<TeamOutlined />}
                    onClick={() => handleQuickAction('user-management')}
                    color="#1890ff"
                  />
                </Col>
                <Col xs={12} sm={8}>
                  <QuickAction
                    title={intl.formatMessage({ id: 'pages.welcome.quickActions.roleManagement.title' })}
                    description={intl.formatMessage({ id: 'pages.welcome.quickActions.roleManagement.desc' })}
                    icon={<SafetyOutlined />}
                    onClick={() => handleQuickAction('role-management')}
                    color="#52c41a"
                  />
                </Col>
                <Col xs={12} sm={8}>
                  <QuickAction
                    title={intl.formatMessage({ id: 'pages.welcome.quickActions.companySettings.title' })}
                    description={intl.formatMessage({ id: 'pages.welcome.quickActions.companySettings.desc' })}
                    icon={<SettingOutlined />}
                    onClick={() => handleQuickAction('company-settings')}
                    color="#faad14"
                  />
                </Col>
                <Col xs={12} sm={8}>
                  <QuickAction
                    title={intl.formatMessage({ id: 'pages.welcome.quickActions.accountCenter.title' })}
                    description={intl.formatMessage({ id: 'pages.welcome.quickActions.accountCenter.desc' })}
                    icon={<UserOutlined />}
                    onClick={() => handleQuickAction('account-center')}
                    color="#722ed1"
                  />
                </Col>
                <Col xs={12} sm={8}>
                  <QuickAction
                    title={intl.formatMessage({ id: 'pages.welcome.quickActions.menuManagement.title' })}
                    description={intl.formatMessage({ id: 'pages.welcome.quickActions.menuManagement.desc' })}
                    icon={<MenuOutlined />}
                    onClick={() => handleQuickAction('menu-management')}
                    color="#13c2c2"
                    disabled={!currentUser?.roles?.includes('admin')}
                  />
                </Col>
                <Col xs={12} sm={8}>
                  <QuickAction
                    title={intl.formatMessage({ id: 'pages.welcome.quickActions.addUser.title' })}
                    description={intl.formatMessage({ id: 'pages.welcome.quickActions.addUser.desc' })}
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
                  <span>{intl.formatMessage({ id: 'pages.welcome.recentActivities' })}</span>
                </Space>
              }
              style={{ borderRadius: '12px' }}
            >
              <Timeline
                items={recentActivities.length > 0 ? recentActivities.map(activity => {
                  const locale = intl.locale === 'zh-CN' ? 'zh-CN' : 'en-US';
                  const formattedDate = activity.createdAt 
                    ? new Date(activity.createdAt).toLocaleString(locale)
                    : intl.formatMessage({ id: 'pages.welcome.recentActivities.unknownTime' });
                  
                  const urlDisplay = activity.fullUrl 
                    || (activity.path && activity.queryString ? `${activity.path}${activity.queryString}` : activity.path);
                  
                  return {
                    color: getActivityColor(activity.action),
                    children: (
                      <div>
                        <Text strong>{activity.action || intl.formatMessage({ id: 'pages.welcome.recentActivities.systemActivity' })}</Text>
                        {(activity.fullUrl || activity.path) && (
                          <div style={{ marginTop: '4px', fontSize: '12px' }}>
                            <Space size={4}>
                              <LinkOutlined style={{ fontSize: '11px', color: '#8c8c8c' }} />
                              <Text 
                                type="secondary" 
                                style={{ 
                                  fontFamily: 'monospace', 
                                  fontSize: '11px',
                                  wordBreak: 'break-all',
                                  maxWidth: '100%'
                                }}
                                title={urlDisplay || ''}
                              >
                                {urlDisplay}
                              </Text>
                            </Space>
                          </div>
                        )}
                        <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                          {formattedDate}
                        </div>
                      </div>
                    ),
                  };
                }) : [
                  {
                    color: 'green',
                    children: (
                      <div>
                        <Text strong>{intl.formatMessage({ id: 'pages.welcome.recentActivities.systemStart.title' })}</Text>
                        <br />
                        <Text type="secondary">{intl.formatMessage({ id: 'pages.welcome.recentActivities.systemStart.desc' })}</Text>
                        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                          {new Date().toLocaleString(intl.locale === 'zh-CN' ? 'zh-CN' : 'en-US')}
                        </div>
                      </div>
                    ),
                  },
                  {
                    color: 'blue',
                    children: (
                      <div>
                        <Text strong>{intl.formatMessage({ id: 'pages.welcome.recentActivities.userLogin.title' })}</Text>
                        <br />
                        <Text type="secondary">
                          {intl.formatMessage({ id: 'pages.welcome.recentActivities.userLogin.desc' }, { username: currentUser?.displayName || currentUser?.username || intl.formatMessage({ id: 'pages.welcome.user' }) })}
                        </Text>
                        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                          {new Date().toLocaleString(intl.locale === 'zh-CN' ? 'zh-CN' : 'en-US')}
                        </div>
                      </div>
                    ),
                  },
                  {
                    color: 'orange',
                    children: (
                      <div>
                        <Text strong>{intl.formatMessage({ id: 'pages.welcome.recentActivities.dataSync.title' })}</Text>
                        <br />
                        <Text type="secondary">{intl.formatMessage({ id: 'pages.welcome.recentActivities.dataSync.desc' })}</Text>
                        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                          {new Date().toLocaleString(intl.locale === 'zh-CN' ? 'zh-CN' : 'en-US')}
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
          title={
            <Space>
              <MonitorOutlined />
              <span>{intl.formatMessage({ id: 'pages.welcome.systemInfo' })}</span>
            </Space>
          }
          style={{ marginTop: '24px', borderRadius: '12px' }}
        >
          <Row gutter={[24, 16]}>
            <Col xs={24} sm={12} md={6}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff' }}>                                                                        
                  .NET 9
                </div>
                <div style={{ fontSize: '14px', color: '#8c8c8c' }}>{intl.formatMessage({ id: 'pages.welcome.systemInfo.backendFramework' })}</div>                                                                              
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a' }}>                                                                        
                  React 19
                </div>
                <div style={{ fontSize: '14px', color: '#8c8c8c' }}>{intl.formatMessage({ id: 'pages.welcome.systemInfo.frontendFramework' })}</div>                                                                              
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#faad14' }}>                                                                        
                  MongoDB
                </div>
                <div style={{ fontSize: '14px', color: '#8c8c8c' }}>{intl.formatMessage({ id: 'pages.welcome.systemInfo.database' })}</div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#722ed1' }}>                                                                        
                  Aspire
                </div>
                <div style={{ fontSize: '14px', color: '#8c8c8c' }}>{intl.formatMessage({ id: 'pages.welcome.systemInfo.orchestration' })}</div>                                                                            
              </div>
            </Col>
          </Row>
        </Card>

        {/* 系统资源监控 */}
        {systemResources ? (
          <Card 
            title={
              <Space>
                <DatabaseOutlined />
                <span>{intl.formatMessage({ id: 'pages.welcome.systemResources' })}</span>
                <Tag color="blue">{intl.formatMessage({ id: 'pages.welcome.systemResources.updateInterval' })}</Tag>
              </Space>
            }
            style={{ marginTop: '24px', borderRadius: '12px' }}
          >
            <Row gutter={[16, 16]}>
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
                  />
                  <div style={{ fontSize: '12px', color: '#8c8c8c', textAlign: 'center', marginTop: '8px' }}>
                    {intl.formatMessage(
                      { id: 'pages.welcome.systemResources.systemMemory' },
                      {
                        used: ((systemResources.memory?.totalMemoryMB || 0) - (systemResources.memory?.availableMemoryMB || 0)).toFixed(2),
                        total: (systemResources.memory?.totalMemoryMB || 0).toFixed(2),
                      }
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#1890ff', textAlign: 'center', marginTop: '4px' }}>
                    {intl.formatMessage(
                      { id: 'pages.welcome.systemResources.processMemory' },
                      {
                        memory: (systemResources.memory?.processMemoryMB || 0).toFixed(2),
                        percent: (systemResources.memory?.processUsagePercent || 0).toFixed(2),
                      }
                    )}
                  </div>
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
                  />
                  <div style={{ fontSize: '12px', color: '#8c8c8c', textAlign: 'center', marginTop: '8px' }}>
                    {intl.formatMessage(
                      { id: 'pages.welcome.systemResources.uptime' },
                      { hours: Math.round((systemResources.cpu?.uptime || 0) / 3600) }
                    )}
                  </div>
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
                  />
                  <div style={{ fontSize: '12px', color: '#8c8c8c', textAlign: 'center', marginTop: '8px' }}>
                    {intl.formatMessage(
                      { id: 'pages.welcome.systemResources.diskSize' },
                      {
                        used: systemResources.disk?.usedSizeGB || 0,
                        total: systemResources.disk?.totalSizeGB || 0,
                      }
                    )}
                  </div>
                </Col>
              )}
            </Row>
            
            {/* 系统详细信息 */}
            {systemResources?.system && (
              <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#fafafa', borderRadius: '8px' }}>
                <Row gutter={[16, 8]}>
                  <Col xs={24} sm={12} md={6}>
                    <Text type="secondary">{intl.formatMessage({ id: 'pages.welcome.systemDetails.machineName' })} </Text>
                    <Text strong>{systemResources.system?.machineName || intl.formatMessage({ id: 'pages.welcome.systemDetails.unknown' })}</Text>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Text type="secondary">{intl.formatMessage({ id: 'pages.welcome.systemDetails.processorCount' })} </Text>
                    <Text strong>{systemResources.system?.processorCount || 0}</Text>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Text type="secondary">{intl.formatMessage({ id: 'pages.welcome.systemDetails.architecture' })} </Text>
                    <Text strong>{systemResources.system?.is64BitOperatingSystem ? intl.formatMessage({ id: 'pages.welcome.systemDetails.bit64' }) : intl.formatMessage({ id: 'pages.welcome.systemDetails.bit32' })}</Text>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Text type="secondary">{intl.formatMessage({ id: 'pages.welcome.systemDetails.systemUpTime' })} </Text>
                    <Text strong>{Math.round((systemResources.system?.systemUpTime || 0) / 3600)}{intl.formatMessage({ id: 'pages.welcome.systemDetails.hours' })}</Text>
                  </Col>
                </Row>
              </div>
            )}
          </Card>
        ) : (
          <Card 
            title={
              <Space>
                <DatabaseOutlined />
                <span>{intl.formatMessage({ id: 'pages.welcome.systemResources' })}</span>
                <Tag color="blue">{intl.formatMessage({ id: 'pages.welcome.systemResources.updateInterval' })}</Tag>
              </Space>
            }
            style={{ marginTop: '24px', borderRadius: '12px' }}
          >
            <Alert
              message={intl.formatMessage({ id: 'pages.welcome.systemResources.unavailable' })}
              description={intl.formatMessage({ id: 'pages.welcome.systemResources.unavailableDesc' })}
              type="warning"
              showIcon
              style={{ borderRadius: '8px' }}
            />
          </Card>
        )}
      </div>
    </PageContainer>
  );
};

export default Welcome;