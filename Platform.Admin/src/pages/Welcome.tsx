import { PageContainer } from '@ant-design/pro-components';
import { useModel, history, useIntl, useAccess } from '@umijs/max';
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
import { useSignalRConnection } from '@/hooks/useSignalRConnection';
// import { getApiBaseUrl } from '@/utils/request';
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
  LinkOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  CloudOutlined,
  HistoryOutlined,
  UnorderedListOutlined
} from '@ant-design/icons';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StatCard } from '@/components';
import { getUserStatistics, getUserActivityLogs } from '@/services/ant-design-pro/api';
import { getTaskStatistics, getMyTodoTasks } from '@/services/task/api';
import { getCurrentCompany } from '@/services/company';
// import { getSystemResources } from '@/services/system/api';
import type { CurrentUser } from '@/types/unified-api';
import type { SystemResources } from '@/services/system/api';

const { Title, Text, Paragraph } = Typography;

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
    bodyStyle={{ padding: '10px 12px' }}
    style={{
      borderRadius: '12px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      border: `2px solid ${disabled ? '#f0f0f0' : color}`,
      background: disabled ? '#fafafa' : '#fff'
    }}
    onClick={disabled ? undefined : onClick}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <div style={{ color, fontSize: 20, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 'bold',
            marginBottom: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: '#8c8c8c',
            lineHeight: 1.4,
            maxHeight: 34,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {description}
        </div>
      </div>
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
    bodyStyle={{ padding: '10px 12px' }}
    style={{
      borderRadius: '12px',
      border: `1px solid ${token?.colorBorderSecondary || '#f0f0f0'}`,
      backgroundColor: token?.colorBgContainer || '#ffffff'
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

const Welcome: React.FC = () => {
  const intl = useIntl();
  const { token } = theme.useToken();
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser as CurrentUser;
  const access = useAccess();

  const [statistics, setStatistics] = useState<any>(null);
  const [taskStatistics, setTaskStatistics] = useState<import('@/services/task/api').TaskStatistics | null>(null);
  const [todoTasks, setTodoTasks] = useState<import('@/services/task/api').TaskDto[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  // 扩展类型以包含 fullUrl 字段（后端实际返回的字段）
  const [recentActivities, setRecentActivities] = useState<(API.UserActivityLog & { fullUrl?: string; path?: string; queryString?: string; httpMethod?: string })[]>([]);
  const [systemResources, setSystemResources] = useState<SystemResources | null>(null);
  const [loading, setLoading] = useState(true);

  // SignalR 连接管理
  const { isConnected, on, off, invoke } = useSignalRConnection({
    hubUrl: '/hubs/system-resource',
    autoConnect: !!currentUser,
    onConnected: () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('系统资源监控 SignalR 连接已建立');
      }
    },
    onError: (error) => {
      console.error('系统资源监控 SignalR 连接错误:', error);
    },
  });


  // 获取统计数据
  const fetchStatistics = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, companyRes, activitiesRes, taskStatsRes, todoTasksRes] = await Promise.all([
        getUserStatistics(),
        getCurrentCompany(),
        getUserActivityLogs({ limit: 5 }),
        getTaskStatistics(),
        getMyTodoTasks()
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

      if (taskStatsRes.success) {
        setTaskStatistics(taskStatsRes.data || null);
      }

      if (todoTasksRes.success) {
        setTodoTasks(todoTasksRes.data || []);
      }

      // 系统资源采用 SignalR 实时推送，无需额外轮询
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
      // 重新抛出错误，确保全局错误处理能够处理
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始数据加载
  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  // 订阅系统资源更新
  useEffect(() => {
    if (!isConnected) return;

    // 订阅系统资源更新（间隔 5 秒）
    invoke('SubscribeResourceUpdatesAsync', 5000).catch((error) => {
      console.error('订阅系统资源更新失败:', error);
    });

    // 监听资源更新事件
    on('ResourceUpdated', (resources: SystemResources) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('收到系统资源更新:', resources);
      }
      setSystemResources(resources);
    });

    return () => {
      off('ResourceUpdated');
    };
  }, [isConnected, invoke, on, off]);

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
          style={{ paddingInline: 6, lineHeight: '20px', fontSize: 12 }}
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
      case 'task-management':
        history.push('/task-management');
        break;
      case 'iot-platform':
        history.push('/iot-platform');
        break;
      case 'user-log':
        history.push('/system/user-log');
        break;
      case 'my-activity':
        history.push('/system/my-activity');
        break;
      default:
        break;
    }
  };

  return (
    <PageContainer
      title={false}
      style={{ background: 'transparent', paddingBlock: 12 }}
    >
      <div>
        {/* 个性化欢迎区域 */}
        <Card
          style={{
            marginBottom: '16px',
            borderRadius: '16px',
            background: token.colorBgContainer === '#ffffff'
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : 'linear-gradient(135deg, #1f1f1f 0%, #2d2d2d 100%)',
            border: 'none',
            color: 'white',
          }}
          styles={{ body: { padding: '24px' } }}
        >
          <Row align="middle" gutter={16}>
            <Col>
              <Avatar
                size={64}
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
                <Tag
                  color="green"
                  icon={<GlobalOutlined />}
                  style={{ paddingInline: 6, lineHeight: '20px', fontSize: 12 }}
                >
                  {intl.formatMessage({ id: 'pages.welcome.online' })}
                </Tag>
              </Space>
            </Col>
            <Col>
              <Space direction="vertical" size="large">
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
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

        <div style={{ margin: '12px 0' }} />

        {/* 统计概览 */}
        <Card
          title={
            <Space>
              <BarChartOutlined />
              <span>{intl.formatMessage({ id: 'pages.welcome.overview' })}</span>
            </Space>
          }
          style={{ marginBottom: '16px', borderRadius: '12px' }}
        >
          <Row gutter={[12, 12]}>
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

        {/* 快速操作 */}
        <Card
          title={
            <Space>
              <RocketOutlined />
              <span>{intl.formatMessage({ id: 'pages.welcome.quickActions' })}</span>
            </Space>
          }
          style={{ borderRadius: '12px', marginBottom: '16px' }}
        >
          <Row gutter={[12, 12]}>
            {access.canAccessPath?.('/system/user-management') && (
              <Col xs={12} sm={8} md={4}>
                <QuickAction
                  title={intl.formatMessage({ id: 'pages.welcome.quickActions.userManagement.title' })}
                  description={intl.formatMessage({ id: 'pages.welcome.quickActions.userManagement.desc' })}
                  icon={<TeamOutlined />}
                  onClick={() => handleQuickAction('user-management')}
                  color="#1890ff"
                />
              </Col>
            )}
            {access.canAccessPath?.('/system/role-management') && (
              <Col xs={12} sm={8} md={4}>
                <QuickAction
                  title={intl.formatMessage({ id: 'pages.welcome.quickActions.roleManagement.title' })}
                  description={intl.formatMessage({ id: 'pages.welcome.quickActions.roleManagement.desc' })}
                  icon={<SafetyOutlined />}
                  onClick={() => handleQuickAction('role-management')}
                  color="#52c41a"
                />
              </Col>
            )}
            {access.canAccessPath?.('/system/company-settings') && (
              <Col xs={12} sm={8} md={4}>
                <QuickAction
                  title={intl.formatMessage({ id: 'pages.welcome.quickActions.companySettings.title' })}
                  description={intl.formatMessage({ id: 'pages.welcome.quickActions.companySettings.desc' })}
                  icon={<SettingOutlined />}
                  onClick={() => handleQuickAction('company-settings')}
                  color="#faad14"
                />
              </Col>
            )}
            {currentUser && (
              <Col xs={12} sm={8} md={4}>
                <QuickAction
                  title={intl.formatMessage({ id: 'pages.welcome.quickActions.accountCenter.title' })}
                  description={intl.formatMessage({ id: 'pages.welcome.quickActions.accountCenter.desc' })}
                  icon={<UserOutlined />}
                  onClick={() => handleQuickAction('account-center')}
                  color="#722ed1"
                />
              </Col>
            )}
            {access.canAccessPath?.('/task-management') && (
              <Col xs={12} sm={8} md={4}>
                <QuickAction
                  title={intl.formatMessage({ id: 'pages.welcome.quickActions.taskManagement.title' })}
                  description={intl.formatMessage({ id: 'pages.welcome.quickActions.taskManagement.desc' })}
                  icon={<UnorderedListOutlined />}
                  onClick={() => handleQuickAction('task-management')}
                  color="#13c2c2"
                />
              </Col>
            )}
            {access.canAccessPath?.('/iot-platform') && (
              <Col xs={12} sm={8} md={4}>
                <QuickAction
                  title={intl.formatMessage({ id: 'pages.welcome.quickActions.iotPlatform.title' })}
                  description={intl.formatMessage({ id: 'pages.welcome.quickActions.iotPlatform.desc' })}
                  icon={<CloudOutlined />}
                  onClick={() => handleQuickAction('iot-platform')}
                  color="#52c41a"
                />
              </Col>
            )}
            {access.canAccessPath?.('/system/user-log') && (
              <Col xs={12} sm={8} md={4}>
                <QuickAction
                  title={intl.formatMessage({ id: 'pages.welcome.quickActions.userLog.title' })}
                  description={intl.formatMessage({ id: 'pages.welcome.quickActions.userLog.desc' })}
                  icon={<FileTextOutlined />}
                  onClick={() => handleQuickAction('user-log')}
                  color="#fa8c16"
                />
              </Col>
            )}
            {access.canAccessPath?.('/system/my-activity') && (
              <Col xs={12} sm={8} md={4}>
                <QuickAction
                  title={intl.formatMessage({ id: 'pages.welcome.quickActions.myActivity.title' })}
                  description={intl.formatMessage({ id: 'pages.welcome.quickActions.myActivity.desc' })}
                  icon={<HistoryOutlined />}
                  onClick={() => handleQuickAction('my-activity')}
                  color="#eb2f96"
                />
              </Col>
            )}
          </Row>
        </Card>

        <Row gutter={[16, 16]}>
          {/* 任务概览与待办任务 */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <Space>
                  <BarChartOutlined />
                  <span>{intl.formatMessage({ id: 'pages.welcome.taskOverview' })}</span>
                </Space>
              }
              style={{ borderRadius: '12px', height: '100%' }}
            >
              <Row gutter={[12, 12]}>
                <Col xs={24} sm={8}>
                  <StatCard
                    title={intl.formatMessage({ id: 'pages.taskManagement.statistics.totalTasks' })}
                    value={taskStatistics?.totalTasks ?? 0}
                    icon={<BarChartOutlined />}
                    color={token.colorPrimary}
                    loading={loading}
                    token={token}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <StatCard
                    title={intl.formatMessage({ id: 'pages.taskManagement.statistics.pendingTasks' })}
                    value={taskStatistics?.pendingTasks ?? 0}
                    icon={<ClockCircleOutlined />}
                    color={token.colorWarning}
                    loading={loading}
                    token={token}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <StatCard
                    title={intl.formatMessage({ id: 'pages.taskManagement.statistics.inProgressTasks' })}
                    value={taskStatistics?.inProgressTasks ?? 0}
                    icon={<RocketOutlined />}
                    color={token.colorSuccess}
                    loading={loading}
                    token={token}
                  />
                </Col>
              </Row>
              <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
                <Col xs={24} sm={8}>
                  <StatCard
                    title={intl.formatMessage({ id: 'pages.taskManagement.statistics.completedTasks' })}
                    value={taskStatistics?.completedTasks ?? 0}
                    icon={<CheckCircleOutlined />}
                    color={token.colorSuccess}
                    loading={loading}
                    token={token}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <StatCard
                    title={intl.formatMessage({ id: 'pages.taskManagement.statistics.failedTasks' })}
                    value={taskStatistics?.failedTasks ?? 0}
                    icon={<CloseCircleOutlined />}
                    color={token.colorError}
                    loading={loading}
                    token={token}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <StatCard
                    title={intl.formatMessage({ id: 'pages.taskManagement.statistics.completionRate' })}
                    value={taskStatistics ? `${taskStatistics.completionRate.toFixed(1)}` : '0'}
                    suffix="%"
                    icon={<SafetyOutlined />}
                    color={token.colorPrimary}
                    loading={loading}
                    token={token}
                  />
                </Col>
              </Row>
              <div style={{ marginTop: 16 }}>
                <Space style={{ marginBottom: 8 }}>
                  <MenuOutlined />
                  <span>{intl.formatMessage({ id: 'pages.welcome.myTodoTasks' })}</span>
                </Space>
                {todoTasks.length === 0 ? (
                  <Alert
                    type="info"
                    message={intl.formatMessage({ id: 'pages.welcome.myTodoTasks.empty' })}
                    showIcon
                  />
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {todoTasks.slice(0, 5).map((task) => (
                      <li
                        key={task.id}
                        style={{
                          padding: '6px 0',
                          borderBottom: '1px solid #f0f0f0',
                          cursor: 'pointer'
                        }}
                        onClick={() => history.push(`/task-management?taskId=${task.id}`)}
                      >
                        <Space direction="vertical" size={2} style={{ width: '100%' }}>
                          <Space>
                            <Text strong>{task.taskName}</Text>
                            {task.priorityName && (
                              <Tag
                                color="processing"
                                style={{ paddingInline: 6, lineHeight: '20px', fontSize: 12 }}
                              >
                                {task.priorityName}
                              </Tag>
                            )}
                          </Space>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {task.statusName} · {task.assignedToName || currentUser?.displayName || currentUser?.username}
                          </Text>
                        </Space>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
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
              style={{ borderRadius: '12px', height: '100%' }}
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



        {/* 系统资源监控 */}
        {systemResources ? (
          <Card
            title={
              <Space>
                <DatabaseOutlined />
                <span>{intl.formatMessage({ id: 'pages.welcome.systemResources' })}</span>
                <Tag
                  color="blue"
                  style={{ paddingInline: 6, lineHeight: '20px', fontSize: 12 }}
                >
                  {intl.formatMessage({ id: 'pages.welcome.systemResources.updateInterval' })}
                </Tag>
              </Space>
            }
            style={{ marginTop: '16px', borderRadius: '12px' }}
          >
            <Row gutter={[12, 12]}>
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
                  <div style={{ fontSize: '12px', color: '#8c8c8c', textAlign: 'center', marginTop: '6px' }}>
                    {intl.formatMessage(
                      { id: 'pages.welcome.systemResources.systemMemory' },
                      {
                        used: ((systemResources.memory?.totalMemoryMB || 0) - (systemResources.memory?.availableMemoryMB || 0)).toFixed(2),
                        total: (systemResources.memory?.totalMemoryMB || 0).toFixed(2),
                      }
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#1890ff', textAlign: 'center', marginTop: '2px' }}>
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
                  <div style={{ fontSize: '12px', color: '#8c8c8c', textAlign: 'center', marginTop: '6px' }}>
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
                  <div style={{ fontSize: '12px', color: '#8c8c8c', textAlign: 'center', marginTop: '6px' }}>
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
              <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#fafafa', borderRadius: '8px' }}>
                <Row gutter={[12, 8]}>
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
                <Tag
                  color="blue"
                  style={{ paddingInline: 6, lineHeight: '20px', fontSize: 12 }}
                >
                  {intl.formatMessage({ id: 'pages.welcome.systemResources.updateInterval' })}
                </Tag>
              </Space>
            }
            style={{ marginTop: '16px', borderRadius: '12px' }}
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