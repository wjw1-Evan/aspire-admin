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
  GlobalOutlined,
  DatabaseOutlined,
  HddOutlined,
  CiOutlined,
  MonitorOutlined
} from '@ant-design/icons';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getUserStatistics, getUserActivityLogs } from '@/services/ant-design-pro/api';
import { getCurrentCompany } from '@/services/company';
import { getSystemStatus, getSystemResources } from '@/services/system/api';
import type { CurrentUser } from '@/types/unified-api';
import type { SystemStatus, SystemResources } from '@/services/system/api';

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

// 系统状态组件
const SystemStatusCard: React.FC<{
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
  const [recentActivities, setRecentActivities] = useState<API.UserActivityLog[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
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
      const [statsRes, companyRes, activitiesRes, statusRes] = await Promise.all([
        getUserStatistics(),
        getCurrentCompany(),
        getUserActivityLogs({ limit: 5 }),
        getSystemStatus()
      ]);
      
      console.log('API 响应结果:', {
        stats: statsRes,
        company: companyRes,
        activities: activitiesRes,
        status: statusRes
      });
      
      if (statsRes.success) {
        setStatistics(statsRes.data);
      }
      
      if (companyRes.success) {
        setCompanyInfo(companyRes.data);
      }

      if (activitiesRes.success) {
        setRecentActivities(activitiesRes.data || []);
      }

      if (statusRes.success) {
        setSystemStatus(statusRes.data || null);
      }

      // 获取初始系统资源数据
      await fetchSystemResources();
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
      // 如果系统状态获取失败，设置默认状态
      setSystemStatus({
        status: 'warning',
        message: '无法获取系统状态',
        timestamp: new Date().toISOString()
      });
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
        <SystemStatusCard
          status={systemStatus?.status || 'warning'}
          message={systemStatus?.message || '系统状态未知'}
          lastUpdate={systemStatus?.timestamp ? new Date(systemStatus.timestamp).toLocaleTimeString('zh-CN') : new Date().toLocaleTimeString('zh-CN')}
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
                items={recentActivities.length > 0 ? recentActivities.map(activity => ({
                  color: getActivityColor(activity.action),
                  children: (
                    <div>
                      <Text strong>{activity.description || activity.action}</Text>
                      <br />
                      <Text type="secondary">
                        {activity.action && activity.action !== activity.description ? activity.action : '系统活动'}
                      </Text>
                      <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                        {activity.createdAt ? new Date(activity.createdAt).toLocaleString('zh-CN') : '未知时间'}
                      </div>
                    </div>
                  ),
                })) : [
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
          title={
            <Space>
              <MonitorOutlined />
              <span>系统信息</span>
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

        {/* 系统资源监控 */}
        {systemResources ? (
          <Card 
            title={
              <Space>
                <DatabaseOutlined />
                <span>系统资源监控</span>
                <Tag color="blue">5秒更新</Tag>
              </Space>
            }
            style={{ marginTop: '24px', borderRadius: '12px' }}
          >
            <Row gutter={[16, 16]}>
              {/* 内存使用率 */}
              {systemResources.memory && (
                <Col xs={24} sm={12} md={8}>
                  <ResourceCard
                    title="内存使用率"
                    value={`${systemResources.memory?.usagePercent || 0}%`}
                    icon={<ThunderboltOutlined />}
                    color={getResourceColor(systemResources.memory?.usagePercent || 0)}
                    loading={loading}
                    token={token}
                  />
                  <div style={{ fontSize: '12px', color: '#8c8c8c', textAlign: 'center', marginTop: '8px' }}>
                    {systemResources.memory?.processMemoryMB || 0}MB / {systemResources.memory?.totalMemoryMB || 0}MB
                  </div>
                </Col>
              )}
              {/* CPU 使用率 */}
              {systemResources.cpu && (
                <Col xs={24} sm={12} md={8}>
                  <ResourceCard
                    title="CPU 使用率"
                    value={`${systemResources.cpu?.usagePercent || 0}%`}
                    icon={<CiOutlined />}
                    color={getResourceColor(systemResources.cpu?.usagePercent || 0)}
                    loading={loading}
                    token={token}
                  />
                  <div style={{ fontSize: '12px', color: '#8c8c8c', textAlign: 'center', marginTop: '8px' }}>
                    运行时间: {Math.round((systemResources.cpu?.uptime || 0) / 3600)}h
                  </div>
                </Col>
              )}
              
              {/* 磁盘使用率 */}
              {systemResources.disk && (
                <Col xs={24} sm={12} md={8}>
                  <ResourceCard
                    title="磁盘使用率"
                    value={`${systemResources.disk?.usagePercent || 0}%`}
                    icon={<HddOutlined />}
                    color={getResourceColor(systemResources.disk?.usagePercent || 0)}
                    loading={loading}
                    token={token}
                  />
                  <div style={{ fontSize: '12px', color: '#8c8c8c', textAlign: 'center', marginTop: '8px' }}>
                    {systemResources.disk?.usedSizeGB || 0}GB / {systemResources.disk?.totalSizeGB || 0}GB
                  </div>
                </Col>
              )}

              {/* 系统状态 */}
              <Col xs={24} sm={12} md={8}>
                <ResourceCard
                  title="系统状态"
                  value={(() => {
                    if (systemStatus?.status === 'healthy') return '正常';
                    if (systemStatus?.status === 'warning') return '警告';
                    return '异常';
                  })()}
                  icon={<MonitorOutlined />}
                  color={(() => {
                    if (systemStatus?.status === 'healthy') return '#52c41a';
                    if (systemStatus?.status === 'warning') return '#faad14';
                    return '#ff4d4f';
                  })()}
                  loading={loading}
                  token={token}
                />
                <div style={{ fontSize: '12px', color: '#8c8c8c', textAlign: 'center', marginTop: '8px' }}>
                  {systemStatus?.message || '状态未知'}
                </div>
              </Col>
            </Row>
            
            {/* 系统详细信息 */}
            {systemResources?.system && (
              <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#fafafa', borderRadius: '8px' }}>
                <Row gutter={[16, 8]}>
                  <Col xs={24} sm={12} md={6}>
                    <Text type="secondary">机器名: </Text>
                    <Text strong>{systemResources.system?.machineName || 'Unknown'}</Text>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Text type="secondary">CPU 核心: </Text>
                    <Text strong>{systemResources.system?.processorCount || 0}</Text>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Text type="secondary">系统架构: </Text>
                    <Text strong>{systemResources.system?.is64BitOperatingSystem ? '64位' : '32位'}</Text>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Text type="secondary">系统运行时间: </Text>
                    <Text strong>{Math.round((systemResources.system?.systemUpTime || 0) / 3600)}小时</Text>
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
                <span>系统资源监控</span>
                <Tag color="blue">5秒更新</Tag>
              </Space>
            }
            style={{ marginTop: '24px', borderRadius: '12px' }}
          >
            <Alert
              message="系统资源数据不可用"
              description="无法获取系统资源信息，请检查后端服务是否正常运行。"
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