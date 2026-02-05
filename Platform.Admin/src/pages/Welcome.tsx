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
  theme,
  Tooltip,
  Statistic,
} from 'antd';
import useCommonStyles from '@/hooks/useCommonStyles';
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
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getUserStatistics, getUserActivityLogs } from '@/services/ant-design-pro/api';
import { getTaskStatistics, getMyTodoTasks } from '@/services/task/api';
import { getCurrentCompany } from '@/services/company';
import { getSystemResources } from '@/services/system/api';

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
  token?: any;
}> = ({ title, description, icon, onClick, color = '#1890ff', disabled = false, token }) => (
  <Card
    hoverable={!disabled}
    size="small"
    styles={{ body: { padding: '16px', minHeight: '80px', display: 'flex', alignItems: 'center' } }}
    style={{
      borderRadius: '16px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      border: `1px solid ${token?.colorBorderSecondary || '#f0f0f0'}`,
      background: token?.colorBgContainer || '#fff',
      height: '100%',
      width: '100%',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    }}
    className="quick-action-card"
    onClick={disabled ? undefined : onClick}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        width: '100%'
      }}
    >
      <div style={{
        color,
        fontSize: 28,
        flexShrink: 0,
        width: 48,
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `${color}15`,
        borderRadius: '12px',
        transition: 'transform 0.3s ease'
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            marginBottom: 4,
            transition: 'color 0.3s ease',
            color: token?.colorText || '#262626'
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 13,
            color: token?.colorTextSecondary || '#8c8c8c',
            lineHeight: 1.5,
            height: 38,
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

// Tiny Area Chart Component
const TinyAreaChart: React.FC<{ data: { value: number; time: string }[]; color: string; height?: number }> = React.memo(({ data, color, height = 45 }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const max = 100;
  const width = 100;

  // Calculate step safely for useMemo and rendering
  const step = data && data.length > 1 ? width / (data.length - 1) : 0;

  const points = useMemo(() => {
    if (!data || data.length < 2) return '';

    return data.map((item, i) => {
      const x = i * step;
      const y = height - (Math.min(Math.max(item.value, 0), max) / max) * height;
      return `${x},${y}`;
    }).join(' ');
  }, [data, height, step]);

  if (!data || data.length < 2) return <div style={{ height }} />;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height, overflow: 'visible' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.05} />
        </linearGradient>
      </defs>
      <path d={`M0,${height} ${points.replace(/ /g, ' L')} L${width},${height} Z`} fill={`url(#gradient-${color.replace('#', '')})`} />
      <path d={`M${points.replace(/ /g, ' L')}`} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />

      {/* Active Point */}
      {hoverIndex !== null && data[hoverIndex] !== undefined && (
        <circle
          cx={hoverIndex * step}
          cy={height - (Math.min(Math.max(data[hoverIndex].value, 0), max) / max) * height}
          r={3}
          fill="#fff"
          stroke={color}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      )}

      {/* Interaction Layer */}
      {data.map((item, i) => {
        // Calculate rect area for each point
        const startX = i === 0 ? 0 : (i - 0.5) * step;
        const endX = i === data.length - 1 ? width : (i + 0.5) * step;
        const rectWidth = endX - startX;

        return (
          <Tooltip title={<div><div>{item.time}</div><div style={{ fontWeight: 'bold' }}>{item.value}%</div></div>} key={i}>
            <rect
              x={startX}
              y={0}
              width={rectWidth}
              height={height}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
            />
          </Tooltip>
        );
      })}
    </svg>
  );
});

// 系统资源卡片组件
const ResourceCard: React.FC<{
  title: string;
  value: string;
  icon: React.ReactNode;
  color?: string;
  loading?: boolean;
  token?: any;
  chart?: React.ReactNode;
  children?: React.ReactNode;
}> = React.memo(({ title, value, icon, color = '#1890ff', loading = false, token, chart, children }) => (
  <Card
    size="small"
    styles={{ body: { padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' } }}
    style={{
      borderRadius: '16px',
      border: `1px solid ${token?.colorBorderSecondary || '#f0f0f0'}`,
      backgroundColor: token?.colorBgContainer || '#ffffff',
      height: '100%',
      overflow: 'hidden'
    }}
    loading={loading}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12
      }}
    >
      <div style={{
        color,
        fontSize: '24px',
        flexShrink: 0,
        width: 44,
        height: 44,
        borderRadius: '10px',
        background: `${color}12`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {icon}
      </div>
      <div style={{ textAlign: 'right', flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '22px',
            fontWeight: 700,
            color: token?.colorText || '#262626',
            lineHeight: 1.1,
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: token?.colorTextSecondary || '#8c8c8c',
            marginTop: 4,
            fontWeight: 500,
          }}
        >
          {title}
        </div>
      </div>
    </div>
    {chart && <div style={{ marginTop: 4, marginBottom: 8 }}>{chart}</div>}
    {children && (
      <div style={{
        borderTop: `1px solid ${token?.colorBorderSecondary || '#f0f0f0'}`,
        paddingTop: 12,
        marginTop: 'auto'
      }}>
        {children}
      </div>
    )}
  </Card>
));

const StatCard: React.FC<{
  title: string;
  value: number | string;
  suffix?: React.ReactNode;
  icon: React.ReactNode;
  color: string;
  loading: boolean;
  token: any;
  onClick?: () => void;
}> = React.memo(({ title, value, suffix, icon, color, loading, token, onClick }) => (
  <Card
    size="small"
    hoverable={!!onClick}
    styles={{ body: { padding: '16px' } }}
    style={{
      borderRadius: '16px',
      border: `1px solid ${token.colorBorderSecondary || '#f0f0f0'}`,
      backgroundColor: token.colorBgContainer || '#ffffff',
      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.3s'
    }}
    onClick={onClick}
  >
    <Statistic
      title={<span style={{ color: token.colorTextSecondary, fontSize: '13px', fontWeight: 500 }}>{title}</span>}
      value={value}
      suffix={suffix}
      styles={{ content: { color: token.colorText, fontWeight: 700, fontSize: '24px' } }}
      prefix={<span style={{
        color,
        marginRight: 12,
        fontSize: '24px',
        width: 40,
        height: 40,
        borderRadius: '8px',
        background: `${color}12`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        verticalAlign: 'middle'
      }}>{icon}</span>}
      loading={loading}
    />
  </Card>
));

const Welcome: React.FC = () => {
  const intl = useIntl();
  const { token } = theme.useToken();
  const { styles } = useCommonStyles();
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser as API.CurrentUser;
  const access = useAccess();

  // 格式化持续时间
  const formatDuration = (seconds: number) => {
    if (seconds <= 0) return '0m';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const [statistics, setStatistics] = useState<any>(null);
  const [taskStatistics, setTaskStatistics] = useState<import('@/services/task/api').TaskStatistics | null>(null);
  const [todoTasks, setTodoTasks] = useState<import('@/services/task/api').TaskDto[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  // 扩展类型以包含 fullUrl 字段（后端实际返回的字段）
  const [recentActivities, setRecentActivities] = useState<(API.UserActivityLog & { fullUrl?: string; path?: string; queryString?: string; httpMethod?: string })[]>([]);
  const [systemResources, setSystemResources] = useState<SystemResources | null>(null);
  const [loading, setLoading] = useState(true);

  // Resource History for Charts
  const [cpuHistory, setCpuHistory] = useState<{ value: number; time: string }[]>([]);
  const [memoryHistory, setMemoryHistory] = useState<{ value: number; time: string }[]>([]);
  const [diskHistory, setDiskHistory] = useState<{ value: number; time: string }[]>([]);

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
        const data = res.data;
        const currentTime = dayjs().format('HH:mm:ss');
        setSystemResources(data);
        if (data.cpu) {
          setCpuHistory(prev => [...prev, { value: data.cpu.usagePercent, time: currentTime }].slice(-20)); // Keep last 20 points
        }
        if (data.memory) {
          setMemoryHistory(prev => [...prev, { value: data.memory.usagePercent, time: currentTime }].slice(-20)); // Keep last 20 points
        }
        if (data.disk) {
          setDiskHistory(prev => [...prev, { value: data.disk.usagePercent, time: currentTime }].slice(-20)); // Keep last 20 points
        }
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

  // 定时轮询系统资源更新（每 1 秒）
  useEffect(() => {
    if (!currentUser) return;

    const performFetch = () => {
      // 只有在页面可见时才进行轮询，节省客户端和服务器资源
      if (document.visibilityState === 'visible') {
        fetchSystemResources();
      }
    };

    // 立即获取一次
    performFetch();

    // 设置定时器，每 1 秒轮询一次
    const intervalId = setInterval(performFetch, 1000);

    // 监听可见性变化，当回到页面时立即刷新
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchSystemResources();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 清理定时器
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
      showBreadcrumb={false}
      style={{ background: 'transparent', paddingBlock: 12 }}
    >
      <style>{`
        .ant-breadcrumb, 
        .ant-page-header-breadcrumb,
        .ant-page-header-heading { 
          display: none !important; 
        }
        .ant-page-header {
          padding-top: 0 !important;
          padding-bottom: 0 !important;
        }
        .quick-action-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.08) !important;
          border-color: rgba(0,0,0,0.1) !important;
        }
        .quick-action-card:hover .ant-card-body > div > div:first-child {
          transform: scale(1.1);
        }
      `}</style>
      <div>
        {/* 个性化欢迎区域 */}
        <Card
          className={styles.card}
          style={{
            background: token.colorBgContainer === '#ffffff'
              ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
              : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            border: 'none',
            color: 'white',
            borderRadius: '20px',
            overflow: 'hidden',
            position: 'relative'
          }}
          styles={{ body: { padding: '32px', position: 'relative', zIndex: 1 } }}
        >
          {/* Decorative elements */}
          <div style={{
            position: 'absolute',
            top: '-20%',
            right: '-10%',
            width: '300px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)',
            borderRadius: '50%',
          }} />

          <Row align="middle" gutter={32}>
            <Col>
              <Avatar
                size={88}
                icon={<UserOutlined />}
                src={getUserAvatar(currentUser?.avatar)}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  border: '4px solid rgba(255,255,255,0.3)',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                }}
              />
            </Col>
            <Col flex={1}>
              <Title level={1} style={{ color: 'white', margin: 0, fontSize: '28px', fontWeight: 700 }}>
                {getGreeting()}，{currentUser?.name || currentUser?.userid || intl.formatMessage({ id: 'pages.welcome.user' })}！
              </Title>
              <Paragraph style={{ color: 'rgba(255,255,255,0.85)', margin: '12px 0 20px 0', fontSize: '16px' }}>
                {intl.formatMessage({ id: 'pages.welcome.welcomeText' })}
                {(companyInfo?.displayName || companyInfo?.name) && (
                  <Tag style={{ marginLeft: 8, background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }}>
                    {companyInfo.displayName || companyInfo.name}
                  </Tag>
                )}
              </Paragraph>
              <Space wrap size={12}>
                {getUserRoleTags()}
                <Tag
                  color="green"
                  variant="filled"
                  icon={<GlobalOutlined />}
                  style={{ borderRadius: '6px', border: 'none' }}
                >
                  {intl.formatMessage({ id: 'pages.welcome.online' })}
                </Tag>
              </Space>
            </Col>
            <Col>
              <div style={{
                textAlign: 'right',
                background: 'rgba(255,255,255,0.1)',
                padding: '16px 24px',
                borderRadius: '16px',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 800 }}>
                  {new Date().toLocaleDateString(intl.locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
                    day: 'numeric'
                  })}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 500, opacity: 0.9 }}>
                  {new Date().toLocaleDateString(intl.locale === 'zh-CN' ? 'zh-CN' : 'en-US', { month: 'short', weekday: 'short' })}
                </div>
              </div>
            </Col>
          </Row>
        </Card>

        <div style={{ margin: '12px 0' }} />

        {/* 快速操作 - 放在最前面，用户最常使用 */}
        <Card
          title={
            <Space>
              <RocketOutlined style={{ color: token.colorPrimary }} />
              <span style={{ fontWeight: 600 }}>{intl.formatMessage({ id: 'pages.welcome.quickActions' })}</span>
            </Space>
          }
          className={styles.card}
          style={{ borderRadius: '16px' }}
        >
          {quickActionMenus.length > 0 ? (
            <Row gutter={[16, 16]}>
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
                  <Col
                    key={menu.path || menu.id}
                    xs={24}
                    sm={12}
                    md={8}
                    lg={6}
                    xl={4}
                  >
                    <QuickAction
                      title={menuTitle}
                      description={menuDescription}
                      icon={getIconComponent(menu.icon)}
                      onClick={() => handleQuickAction(menu.path)}
                      color={getMenuColor(menu.path)}
                      token={token}
                    />
                  </Col>
                );
              })}
            </Row>
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
              className={styles.card}
              style={{ height: '100%' }}
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
                    onClick={() => history.push('/task-management')}
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
                    onClick={() => history.push('/task-management?status=0')}
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
                    onClick={() => history.push('/task-management?status=2')}
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
                    onClick={() => history.push('/task-management?status=3')}
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
                    onClick={() => history.push('/task-management?status=5')}
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
                    onClick={() => history.push('/task-management')}
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
                            {task.statusName} · {task.assignedToName || currentUser?.name || currentUser?.userid}
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
              className={styles.card}
              style={{ height: '100%' }}
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
                          {intl.formatMessage({ id: 'pages.welcome.recentActivities.userLogin.desc' }, { username: currentUser?.name || currentUser?.userid || intl.formatMessage({ id: 'pages.welcome.user' }) })}
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
                    chart={<TinyAreaChart data={memoryHistory} color={getResourceColor(systemResources.memory?.usagePercent || 0)} />}
                  >
                    <div style={{ fontSize: '12px', color: '#8c8c8c', textAlign: 'center' }}>
                      {intl.formatMessage(
                        { id: 'pages.welcome.systemResources.systemMemory' },
                        {
                          used: ((systemResources.memory?.totalMemoryMB || 0) - (systemResources.memory?.availableMemoryMB || 0)).toFixed(2),
                          total: (systemResources.memory?.totalMemoryMB || 0).toFixed(2),
                        }
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: '#1890ff', textAlign: 'center', marginTop: '2px' }}>
                      {intl.formatMessage(
                        { id: 'pages.welcome.systemResources.processMemory' },
                        {
                          memory: (systemResources.memory?.processMemoryMB || 0).toFixed(2),
                          percent: (systemResources.memory?.processUsagePercent || 0).toFixed(2),
                        }
                      )}
                    </div>
                  </ResourceCard>
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
                    chart={<TinyAreaChart data={cpuHistory} color={getResourceColor(systemResources.cpu?.usagePercent || 0)} />}
                  >
                    <div style={{ fontSize: '12px', color: '#8c8c8c', textAlign: 'center' }}>
                      {intl.formatMessage({ id: 'pages.welcome.systemResources.uptime' })}
                      {formatDuration(systemResources.cpu?.uptime || 0)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#52c41a', textAlign: 'center', marginTop: '2px' }}>
                      {intl.formatMessage(
                        { id: 'pages.welcome.systemResources.processCpu' },
                        { percent: (systemResources.cpu?.processUsagePercent || 0).toFixed(2) }
                      )}
                      <span style={{ margin: '0 4px', opacity: 0.5 }}>|</span>
                      {intl.formatMessage(
                        { id: 'pages.welcome.systemResources.cpuCores' },
                        { count: systemResources.system?.processorCount || 0 }
                      )}
                    </div>
                  </ResourceCard>
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
                    chart={<TinyAreaChart data={diskHistory} color={getResourceColor(systemResources.disk?.usagePercent || 0)} />}
                  >
                    <div style={{ fontSize: '12px', color: '#8c8c8c', textAlign: 'center' }}>
                      {intl.formatMessage(
                        { id: 'pages.welcome.systemResources.diskSize' },
                        {
                          used: (systemResources.disk?.usedSizeGB || 0).toFixed(2),
                          total: (systemResources.disk?.totalSizeGB || 0).toFixed(2),
                        }
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: '#fa8c16', textAlign: 'center', marginTop: '2px' }}>
                      {intl.formatMessage(
                        { id: 'pages.welcome.systemResources.diskDrive' },
                        {
                          name: systemResources.disk?.driveName || '-',
                          type: systemResources.disk?.driveType || '-'
                        }
                      )}
                    </div>
                  </ResourceCard>
                </Col>
              )}
            </Row>

            {/* 系统详细信息 */}
            {systemResources?.system && (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                backgroundColor: token.colorFillAlter || '#fafafa',
                borderRadius: '12px',
                border: `1px solid ${token.colorBorderSecondary || '#f0f0f0'}`
              }}>
                <Title level={5} style={{ marginBottom: 12, fontSize: '14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MonitorOutlined style={{ color: token.colorPrimary }} />
                  {intl.formatMessage({ id: 'pages.welcome.systemDetails' }, { defaultMessage: '系统运行详情' })}
                </Title>
                <Row gutter={[16, 12]}>
                  {[
                    { label: 'machineName', value: systemResources.system?.machineName },
                    { label: 'osVersion', value: systemResources.system?.osVersion, large: true },
                    { label: 'frameworkVersion', value: systemResources.system?.frameworkVersion },
                    { label: 'processorCount', value: systemResources.system?.processorCount },
                    { label: 'architecture', value: systemResources.system?.is64BitOperatingSystem ? intl.formatMessage({ id: 'pages.welcome.systemDetails.bit64' }) : intl.formatMessage({ id: 'pages.welcome.systemDetails.bit32' }) },
                    { label: 'userName', value: systemResources.system?.userName },
                    { label: 'systemUpTime', value: formatDuration(systemResources.system?.systemUpTime || 0) },
                  ].map((item, idx) => (
                    <Col key={idx} xs={24} sm={12} md={item.large ? 12 : 6}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>{intl.formatMessage({ id: `pages.welcome.systemDetails.${item.label}` })}</Text>
                        <Text strong style={{ fontSize: '13px', wordBreak: 'break-all' }}>{item.value || '-'}</Text>
                      </div>
                    </Col>
                  ))}
                  <Col xs={24} sm={12} md={6}>
                    <Tag variant="filled" color="blue" style={{ borderRadius: '4px', marginTop: 4 }}>
                      64-Bit Process: {systemResources.system?.is64BitProcess ? 'Yes' : 'No'}
                    </Tag>
                  </Col>
                </Row>
                <div style={{
                  marginTop: 12,
                  paddingTop: 8,
                  borderTop: `1px dashed ${token.colorBorderSecondary || '#f0f0f0'}`,
                  fontSize: '12px',
                  color: token.colorTextSecondary
                }}>
                  <Space>
                    <span style={{ opacity: 0.7 }}>{intl.formatMessage({ id: 'pages.welcome.systemDetails.workingDirectory', defaultMessage: '运行目录:' })}</span>
                    <Text code style={{ fontSize: '11px' }}>{systemResources.system?.workingDirectory}</Text>
                  </Space>
                </div>
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