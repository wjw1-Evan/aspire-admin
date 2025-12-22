import { PageContainer } from '@/components';
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
import { getUserAvatar } from '@/utils/avatar';
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
import * as Icons from '@ant-design/icons';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StatCard } from '@/components';
import { getUserStatistics, getUserActivityLogs } from '@/services/ant-design-pro/api';
import { getTaskStatistics, getMyTodoTasks } from '@/services/task/api';
import { getCurrentCompany } from '@/services/company';
import { getSystemResources } from '@/services/system/api';
import type { CurrentUser } from '@/types/unified-api';
import type { SystemResources } from '@/services/system/api';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

/**
 * 根据图标名称获取图标组件
 */
const getIconComponent = (iconName?: string): React.ReactNode => {
  if (!iconName) return <MenuOutlined />;

  // 将图标名称转换为 PascalCase + 'Outlined' 格式
  const formatIconName = (name: string) => {
    return name
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  };

  // 尝试多种图标后缀
  const suffixes = ['Outlined', 'Filled', 'TwoTone', ''];

  for (const suffix of suffixes) {
    const iconComponentName = formatIconName(iconName) + suffix;
    const IconComponent = (Icons as any)[iconComponentName];

    if (IconComponent) {
      return React.createElement(IconComponent);
    }
  }

  return <MenuOutlined />;
};

/**
 * 根据路径获取菜单颜色
 */
const getMenuColor = (path: string): string => {
  const colorMap: Record<string, string> = {
    '/system/user-management': '#1890ff',
    '/system/role-management': '#52c41a',
    '/system/company-settings': '#faad14',
    '/system/user-log': '#fa8c16',
    '/system/my-activity': '#eb2f96',
    '/task-management': '#13c2c2',
    '/iot-platform': '#52c41a',
    '/account/center': '#722ed1',
  };

  // 精确匹配
  if (colorMap[path]) {
    return colorMap[path];
  }

  // 路径前缀匹配
  if (path.startsWith('/system/')) {
    return '#1890ff';
  }
  if (path.startsWith('/iot-platform')) {
    return '#52c41a';
  }
  if (path.startsWith('/task-management')) {
    return '#13c2c2';
  }
  if (path.startsWith('/project-management')) {
    return '#722ed1';
  }
  if (path.startsWith('/xiaoke-management')) {
    return '#eb2f96';
  }

  // 默认颜色
  return '#1890ff';
};

/**
 * 扁平化菜单树，提取所有可访问的菜单项
 */
const flattenMenus = (menus: API.MenuTreeNode[]): API.MenuTreeNode[] => {
  const result: API.MenuTreeNode[] = [];

  const traverse = (menuList: API.MenuTreeNode[]) => {
    for (const menu of menuList) {
      // 跳过隐藏的菜单、外部链接、welcome 页面
      if (
        menu.hideInMenu ||
        menu.isExternal ||
        menu.path === '/welcome' ||
        !menu.isEnabled
      ) {
        // 继续遍历子菜单
        if (menu.children && menu.children.length > 0) {
          traverse(menu.children);
        }
        continue;
      }

      // 跳过没有组件路径的父菜单（这些通常是分组菜单，不应该显示在快速操作中）
      // 只有当菜单有组件路径或者是叶子节点时才添加到结果中
      const hasComponent = !!menu.component;
      const hasChildren = menu.children && menu.children.length > 0;
      
      // 如果有组件路径，说明这是一个可访问的页面菜单
      // 如果没有组件路径但有子菜单，说明这是一个分组菜单，只遍历子菜单
      if (hasComponent) {
        result.push(menu);
      }

      // 递归处理子菜单
      if (hasChildren) {
        traverse(menu.children);
      }
    }
  };

  traverse(menus);
  return result;
};

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
    styles={{ body: { padding: '12px', minHeight: '72px', display: 'flex', alignItems: 'center' } }}
    style={{
      borderRadius: '12px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      border: `2px solid ${disabled ? '#f0f0f0' : color}`,
      background: disabled ? '#fafafa' : '#fff',
      height: '100%',
      width: '100%',
      transition: 'all 0.3s ease'
    }}
    onClick={disabled ? undefined : onClick}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%'
      }}
    >
      <div style={{ color, fontSize: 24, flexShrink: 0, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 'bold',
            marginBottom: 4,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: '20px'
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: '#8c8c8c',
            lineHeight: 1.4,
            height: 32,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
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
    styles={{ body: { padding: '10px 12px' } }}
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
    } catch (error) {
      // 重新抛出错误，确保全局错误处理能够处理
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取系统资源数据
  const fetchSystemResources = useCallback(async () => {
    try {
      const res = await getSystemResources();
      if (res.success && res.data) {
        setSystemResources(res.data);
      }
    } catch (error) {
      // 错误由全局错误处理处理，这里只记录但不阻止后续轮询
      console.error('获取系统资源失败:', error);
    }
  }, []);

  // 初始数据加载
  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  // 定时轮询系统资源更新（每 5 秒）
  useEffect(() => {
    if (!currentUser) return;

    // 立即获取一次
    fetchSystemResources();

    // 设置定时器，每 5 秒轮询一次
    const intervalId = setInterval(() => {
      fetchSystemResources();
    }, 5000);

    // 清理定时器
    return () => {
      clearInterval(intervalId);
    };
  }, [currentUser, fetchSystemResources]);

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
  const handleQuickAction = (path: string) => {
    history.push(path);
  };

  // 从用户菜单中提取快速操作项
  const getQuickActionMenus = (): API.MenuTreeNode[] => {
    if (!currentUser?.menus) {
      return [];
    }

    // 扁平化菜单树
    const flatMenus = flattenMenus(currentUser.menus);

    // 按 sortOrder 排序，限制最多显示 12 个
    return flatMenus
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .slice(0, 12);
  };

  const quickActionMenus = getQuickActionMenus();

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
                src={getUserAvatar(currentUser?.avatar)}
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
              <Space orientation="vertical" size="large">
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

        {/* 快速操作 - 放在最前面，用户最常使用 */}
        <Card
          title={
            <Space>
              <RocketOutlined />
              <span>{intl.formatMessage({ id: 'pages.welcome.quickActions' })}</span>
            </Space>
          }
          style={{ borderRadius: '12px', marginBottom: '16px' }}
        >
          {quickActionMenus.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {quickActionMenus.map((menu) => {
                // 生成 locale 键用于多语言
                let localeKey = '';
                if (menu.path.startsWith('/system/')) {
                  localeKey = `menu.system.${menu.name}`;
                } else if (menu.path.startsWith('/iot-platform/')) {
                  const shortName = menu.name.replace(/^iot-platform-/, '');
                  localeKey = `menu.iot-platform.${shortName}`;
                } else if (menu.path.startsWith('/project-management/')) {
              const shortName = menu.name.replace(/^project-management-/, '');
              localeKey = `menu.project-management.${shortName}`;
            } else if (menu.path.startsWith('/xiaoke-management/') || menu.name.startsWith('xiaoke-management-')) {
              const shortName = menu.name.replace(/^xiaoke-management-/, '');
              localeKey = `menu.xiaoke-management.${shortName}`;
            } else if (menu.path.startsWith('/workflow/') || menu.name.startsWith('workflow-') || menu.name.startsWith('workflow:')) {
              const shortName = menu.name.replace(/^workflow[-:]/, '');
              localeKey = `menu.workflow.${shortName}`;
            } else if (menu.path.startsWith('/document/') || menu.name.startsWith('document-') || menu.name.startsWith('document:')) {
              const shortName = menu.name.replace(/^document[-:]/, '');
              localeKey = `menu.document.${shortName}`;
            } else if (menu.path.startsWith('/account/')) {
              localeKey = `menu.${menu.path.replace(/^\//, '').replaceAll('/', '.')}`;
            } else {
              localeKey = `menu.${menu.name}`;
            }

                // 尝试获取多语言标题，如果不存在则使用菜单的 title
                const menuTitle = intl.formatMessage({ id: localeKey }, { defaultMessage: menu.title || menu.name });
                const menuDescription = intl.formatMessage(
                  { id: `${localeKey}.desc` },
                  { defaultMessage: menuTitle }
                );

                return (
                  <div
                    key={menu.path || menu.id}
                    style={{
                      flex: '1 1 200px',
                      minWidth: '200px',
                      maxWidth: '280px'
                    }}
                  >
                    <QuickAction
                      title={menuTitle}
                      description={menuDescription}
                      icon={getIconComponent(menu.icon)}
                      onClick={() => handleQuickAction(menu.path)}
                      color={getMenuColor(menu.path)}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <Alert
              title={intl.formatMessage({ id: 'pages.welcome.quickActions.empty' }, { defaultMessage: '暂无快速操作' })}
              type="info"
              showIcon
            />
          )}
        </Card>

        <Row gutter={[16, 16]}>
          {/* 任务概览与待办任务 - 工作重点，放在快速操作之后 */}
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
                    title={intl.formatMessage({ id: 'pages.welcome.myTodoTasks.empty' })}
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
                        <Space orientation="vertical" size={2} style={{ width: '100%' }}>
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
                  const formattedDate = activity.createdAt
                    ? dayjs(activity.createdAt).format('YYYY-MM-DD HH:mm:ss')
                    : intl.formatMessage({ id: 'pages.welcome.recentActivities.unknownTime' });

                  const urlDisplay = activity.fullUrl
                    || (activity.path && activity.queryString ? `${activity.path}${activity.queryString}` : activity.path);

                  return {
                    color: getActivityColor(activity.action),
                    content: (
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
                    content: (
                      <div>
                        <Text strong>{intl.formatMessage({ id: 'pages.welcome.recentActivities.systemStart.title' })}</Text>
                        <br />
                        <Text type="secondary">{intl.formatMessage({ id: 'pages.welcome.recentActivities.systemStart.desc' })}</Text>
                        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                          {dayjs().format('YYYY-MM-DD HH:mm:ss')}
                        </div>
                      </div>
                    ),
                  },
                  {
                    color: 'blue',
                    content: (
                      <div>
                        <Text strong>{intl.formatMessage({ id: 'pages.welcome.recentActivities.userLogin.title' })}</Text>
                        <br />
                        <Text type="secondary">
                          {intl.formatMessage({ id: 'pages.welcome.recentActivities.userLogin.desc' }, { username: currentUser?.displayName || currentUser?.username || intl.formatMessage({ id: 'pages.welcome.user' }) })}
                        </Text>
                        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                          {dayjs().format('YYYY-MM-DD HH:mm:ss')}
                        </div>
                      </div>
                    ),
                  },
                  {
                    color: 'orange',
                    content: (
                      <div>
                        <Text strong>{intl.formatMessage({ id: 'pages.welcome.recentActivities.dataSync.title' })}</Text>
                        <br />
                        <Text type="secondary">{intl.formatMessage({ id: 'pages.welcome.recentActivities.dataSync.desc' })}</Text>
                        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                          {dayjs().format('YYYY-MM-DD HH:mm:ss')}
                        </div>
                      </div>
                    ),
                  },
                ]}
              />
            </Card>
          </Col>
        </Row>

        {/* 统计概览 - 数据展示，放在任务和活动之后 */}
        <Card
          title={
            <Space>
              <BarChartOutlined />
              <span>{intl.formatMessage({ id: 'pages.welcome.overview' })}</span>
            </Space>
          }
          style={{ marginTop: '16px', marginBottom: '16px', borderRadius: '12px' }}
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
              title={intl.formatMessage({ id: 'pages.welcome.systemResources.unavailable' })}
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