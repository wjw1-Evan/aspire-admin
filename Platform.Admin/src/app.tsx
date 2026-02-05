import * as Icons from '@ant-design/icons';
import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import type { LayoutSettings } from '@/types/layout';
import { history, request as requestClient } from '@umijs/max';
import React, { useEffect, useRef } from 'react';
import { App } from 'antd';
import { setAppInstance } from '@/utils/antdAppInstance';
import {
  AvatarDropdown,
  AvatarName,
  CompanySwitcher,
  Footer,
  NoticeIcon,
  SelectLang,
  Question,
} from '@/components';
import AiAssistant from '@/components/AiAssistant';
import { currentUser as queryCurrentUser } from '@/services/ant-design-pro/api';
import { getUserMenus } from '@/services/menu/api';
import { getMyPermissions } from '@/services/permission';
import LocationService from '@/services/social/locationService';
import { getUserAvatar } from '@/utils/avatar';
import { tokenUtils } from '@/utils/token';
import TokenRefreshManager from '@/utils/tokenRefreshManager';
import defaultSettings from '../config/defaultSettings';
import { errorConfig } from './request-error-config';

const isDev = process.env.NODE_ENV === 'development';
const loginPath = '/user/login';

/**
 * @see https://umijs.org/docs/api/runtime-config#getinitialstate
 * */
export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: API.CurrentUser;
  loading?: boolean;
  fetchUserInfo?: () => Promise<API.CurrentUser | undefined>;
}> {
  // 从 localStorage 读取主题设置
  // ProLayout 只支持 'light' | 'realDark'，将 'dark' 映射为 'realDark'
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
  const initialTheme = savedTheme === 'dark' ? 'realDark' : (savedTheme || 'light');
  const fetchUserInfo = async () => {
    // 检查是否有 token
    if (!tokenUtils.hasToken()) {
      return undefined;
    }

    // 不在初始化时主动检查 token 是否过期，而是直接尝试获取用户信息
    // 如果 token 过期，会在请求拦截器中自动触发刷新逻辑
    // 这样可以避免不必要的初始化延迟，提升用户体验
    try {
      const msg = await queryCurrentUser({
        // ✅ 特殊场景：初始化时需要静默失败，不显示错误提示
        // 如果 token 过期或用户不存在，应该静默失败，让 onPageChange 处理跳转
        skipErrorHandler: true,
      });

      const userInfo = msg.data;

      // 检查用户是否有效（后端返回 IsLogin = false 表示用户不存在或被禁用）
      if (!userInfo || userInfo.isLogin === false) {
        tokenUtils.clearAllTokens();
        return undefined;
      }

      // 获取用户菜单
      try {
        const menuResponse = await getUserMenus({
          // ✅ 特殊场景：初始化时需要静默失败，菜单获取失败不影响登录
          skipErrorHandler: true,
        } as any);
        if (menuResponse.success && menuResponse.data) {
          (userInfo as any).menus = menuResponse.data;
        }
      } catch (_menuError) {
        // 菜单获取失败，使用空菜单
      }

      // 获取用户权限
      try {
        const permissionsResponse = await getMyPermissions();
        if (permissionsResponse.success && permissionsResponse.data) {
          (userInfo as any).permissions =
            permissionsResponse.data.allPermissionCodes || [];
        }
      } catch (_permissionsError) {
        // 权限获取失败，使用空权限
      }

      // ❌ 移除登录时的立即上报，改为只在特定页面访问时才上报

      return userInfo;
    } catch (_error) {
      // 如果获取用户信息失败（包括 token 过期），清除 token
      // 响应拦截器已经处理了 token 刷新，如果走到这里说明刷新也失败了
      tokenUtils.clearAllTokens();
      // 不在这里跳转，让 onPageChange 处理跳转，避免重复错误处理
      return undefined;
    }
  };

  // 如果不是登录页面，执行
  const { location } = history;
  const whiteListPages = [loginPath, '/user/register', '/user/register-result'];

  // 合并默认设置和主题设置
  const settings = {
    ...defaultSettings,
    navTheme: initialTheme,
  } as Partial<LayoutSettings>;

  if (!whiteListPages.includes(location.pathname)) {
    const currentUser = await fetchUserInfo();
    return {
      fetchUserInfo,
      currentUser,
      settings,
    };
  }
  return {
    fetchUserInfo,
    settings,
  };
}

/**
 * 根据图标名称获取图标组件
 */
function getIconComponent(iconName?: string): React.ReactNode {
  if (!iconName) return undefined;

  // 将图标名称转换为 PascalCase + 'Outlined' 格式
  // 例如: 'smile' -> 'SmileOutlined', 'user' -> 'UserOutlined'
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

  console.warn(`Icon not found: ${iconName}`);
  return undefined;
}

/**
 * 将菜单树转换为 ProLayout 菜单格式
 * 生成正确的 locale 键用于多语言支持
 */
function convertMenuTreeToProLayout(menus: API.MenuTreeNode[]): any[] {
  return menus
    .filter((menu) => !menu.hideInMenu)
    .map((menu) => {
      // 生成 locale 键：根据菜单路径和名称生成，例如：
      // /system/user-management -> menu.system.user-management
      // /welcome -> menu.welcome
      // /project-management/task -> menu.project-management.task
      // /project-management/project -> menu.project-management.project
      let localeKey = '';
      if (menu.path.startsWith('/system/')) {
        // 系统管理子菜单
        localeKey = `menu.system.${menu.name}`;
      } else if (menu.path.startsWith('/iot-platform/')) {
        // IoT 平台子菜单：从菜单名称中提取子菜单名称（去掉 iot-platform- 前缀）
        const shortName = menu.name.replace(/^iot-platform-/, '');
        localeKey = `menu.iot-platform.${shortName}`;
      } else if (menu.path.startsWith('/project-management/') || menu.name.startsWith('project-management-')) {
        // 项目管理子菜单：根据路径或菜单名称判断
        const shortName = menu.name.replace(/^project-management-/, '');
        localeKey = `menu.project-management.${shortName}`;
      } else if (menu.path.startsWith('/xiaoke-management/') || menu.name.startsWith('xiaoke-management-')) {
        // 小科管理子菜单：从菜单名称中提取子菜单名称（去掉 xiaoke-management- 前缀）
        const shortName = menu.name.replace(/^xiaoke-management-/, '');
        localeKey = `menu.xiaoke-management.${shortName}`;
      } else if (menu.path.startsWith('/workflow/') || menu.name.startsWith('workflow-') || menu.name.startsWith('workflow:')) {
        // 工作流管理子菜单：从菜单名称中提取子菜单名称（去掉 workflow- 或 workflow: 前缀）
        const shortName = menu.name.replace(/^workflow[-:]/, '');
        localeKey = `menu.workflow.${shortName}`;
      } else if (menu.path.startsWith('/document/') || menu.name.startsWith('document-') || menu.name.startsWith('document:')) {
        // 公文管理子菜单：从菜单名称中提取子菜单名称（去掉 document- 或 document: 前缀）
        const shortName = menu.name.replace(/^document[-:]/, '');
        localeKey = `menu.document.${shortName}`;
      } else if (menu.path.startsWith('/cloud-storage/') || menu.name.startsWith('cloud-storage-') || menu.name.startsWith('cloud-storage:')) {
        // 网盘管理子菜单：从菜单名称中提取子菜单名称（去掉 cloud-storage- 或 cloud-storage: 前缀）
        const shortName = menu.name.replace(/^cloud-storage[-:]/, '');
        localeKey = `menu.cloud-storage.${shortName}`;
      } else if (menu.path === '/welcome') {
        localeKey = 'menu.welcome';
      } else if (menu.path.startsWith('/company/')) {
        // 企业相关菜单
        localeKey = `menu.${menu.name}`;
      } else if (menu.path.startsWith('/join-requests/')) {
        // 加入申请相关菜单
        localeKey = `menu.${menu.name}`;
      } else if (menu.path.startsWith('/account/')) {
        // 账户相关菜单
        localeKey = `menu.${menu.path.replace(/^\//, '').replaceAll('/', '.')}`;
      } else {
        // 默认：使用 menu.{name}
        localeKey = `menu.${menu.name}`;
      }

      const menuItem: any = {
        name: menu.name,
        path: menu.path,
        icon: getIconComponent(menu.icon),
        // 使用 locale 键进行多语言翻译
        locale: localeKey,
      };

      if (menu.isExternal) {
        menuItem.target = menu.openInNewTab ? '_blank' : '_self';
      }

      if (menu.children && menu.children.length > 0) {
        menuItem.routes = convertMenuTreeToProLayout(menu.children);
      }

      return menuItem;
    });
}

// ProLayout 支持的api https://procomponents.ant.design/components/layout
export const layout: RunTimeLayoutConfig = ({
  initialState,
  setInitialState,
}) => {
  return {
    actionsRender: () => {
      const actions = [
        <SelectLang key="SelectLang" />,

      ];
      // 只在用户已登录时渲染通知图标，避免在登录页面调用需要认证的 API
      if (initialState?.currentUser) {
        actions.push(<NoticeIcon key="NoticeIcon" />);
      }
      return actions;
    },
    avatarProps: {
      src: getUserAvatar(initialState?.currentUser?.avatar),
      icon: <Icons.UserOutlined />,
      title: <AvatarName />,
      style: {
        margin: 0,
        padding: 0,
      },
      render: (_: any, avatarChildren: React.ReactNode) => {
        return <AvatarDropdown menu>{avatarChildren}</AvatarDropdown>;
      },
    },
    waterMarkProps: {
      content: '',
    },
    footerRender: () => <Footer />,
    onPageChange: () => {
      const { location } = history;

      // 白名单：不需要登录的页面
      const whiteList = [loginPath, '/user/register', '/user/register-result'];
      if (whiteList.includes(location.pathname)) {
        return;
      }

      // 检查当前路径是否已经是登录页面，避免循环跳转
      if (location.pathname === loginPath) {
        return;
      }

      // 1. 检查是否有 currentUser
      if (!initialState?.currentUser) {
        history.push(loginPath);
        return;
      }

      // 2. 检查是否有 token
      if (!tokenUtils.hasToken()) {
        tokenUtils.clearAllTokens();
        history.push(loginPath);
        return;
      }

      // 3. 检查 token 是否过期（仅在有token且有用户信息时检查）
      if (tokenUtils.isTokenExpired()) {
        // 不在这里跳转，让响应拦截器处理刷新逻辑
        // 这样可以避免重复的错误处理和跳转
      }
    },
    // 动态渲染菜单（完全从数据库加载）
    menuDataRender: () => {
      // v5.0: 菜单完全从数据库加载，不使用静态路由
      if (
        initialState?.currentUser?.menus &&
        initialState.currentUser.menus.length > 0
      ) {
        // 顶部菜单显示顺序统一为：
        // 1. 工作台（/welcome）
        // 2. 项目管理（/project-management）
        // 3. 用户管理（/system/user-management 或 /user-management）
        // 4. IoT 平台（/iot-platform）
        // 5. 系统设置（/system 开头的其他菜单）
        const desiredOrder = [
          '/welcome',
          '/project-management',
          '/task-management',
          '/user-management',
          '/cloud-storage',
          '/iot-platform',
          '/system',
        ];

        const getMenuOrder = (menu: API.MenuTreeNode) => {
          // 根据 path 前缀匹配所属分组
          const index = desiredOrder.findIndex((prefix) => {
            if (prefix === '/system') {
              // 系统设置：匹配 /system 或 /system/*
              return menu.path === '/system' || menu.path.startsWith('/system/');
            }
            if (prefix === '/project-management') {
              // 项目管理：匹配 /project-management 或 /project-management/*
              return menu.path === '/project-management' || menu.path.startsWith('/project-management/');
            }
            if (prefix === '/cloud-storage') {
              // 网盘管理：匹配 /cloud-storage 或 /cloud-storage/*
              return menu.path === '/cloud-storage' || menu.path.startsWith('/cloud-storage/');
            }
            // 其他：精确匹配或子路径匹配
            return (
              menu.path === prefix || menu.path.startsWith(`${prefix}/`)
            );
          });

          // 未匹配到的菜单排在最后，保持原有顺序（通过原数组下标兜底）
          return index === -1
            ? desiredOrder.length +
            initialState.currentUser!.menus!.indexOf(menu)
            : index;
        };

        const sortedMenus = [...initialState.currentUser.menus].sort(
          (a, b) => getMenuOrder(a as any) - getMenuOrder(b as any),
        );

        const dynamicMenus = convertMenuTreeToProLayout(sortedMenus as any);
        return dynamicMenus;
      }

      // 数据库没有菜单时，返回空数组（不使用 routes.ts 作为后备）
      return [];
    },
    bgLayoutImgList: [
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/D2LWSqNny4sAAAAAAAAAAAAAFl94AQBr',
        left: 85,
        bottom: 100,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/C2TWRpJpiC0AAAAAAAAAAAAAFl94AQBr',
        bottom: -68,
        right: -45,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/F6vSTbj8KpYAAAAAAAAAAAAAFl94AQBr',
        bottom: 0,
        left: 0,
        width: '331px',
      },
    ],
    links: [],
    headerTitleRender: (logo, _, props) => {
      const systemName =
        initialState?.currentUser?.currentCompanyDisplayName ||
        initialState?.currentUser?.currentCompanyName ||
        defaultSettings.title;
      const companyName = initialState?.currentUser?.currentCompanyName;

      if (props?.collapsed) {
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {logo}
          </div>
        );
      }

      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            padding: '4px 0',
            lineHeight: 1,
          }}
          onClick={() => history.push('/')}
        >
          {logo}
          <div
            style={{
              marginLeft: 12,
              display: 'flex',
              flexDirection: 'column',
              lineHeight: 1.2,
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                fontWeight: 600,
                fontSize: '16px',
                color: 'var(--ant-color-text-heading)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {systemName}
            </span>
            {companyName && companyName !== systemName && (
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--ant-color-text-description)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {companyName}
              </span>
            )}
          </div>
        </div>
      );
    },
    menuHeaderRender: false,
    childrenRender: (children) => {
      // ✅ 位置上报组件：只在特定页面访问时才启动定期上报
      const LocationReporter = () => {
        const hasStartedRef = useRef(false);
        const { location } = history;

        useEffect(() => {
          // 只在特定页面访问时才启动上报
          const shouldReportPages = ['/welcome'];
          const shouldReport = shouldReportPages.some(page => location.pathname === page || location.pathname.startsWith(page));

          // 仅在用户登录后、且在特定页面时启动定期上报
          // 延迟启动，让页面先渲染完成
          if (initialState?.currentUser && shouldReport && !hasStartedRef.current) {
            hasStartedRef.current = true;
            // 延迟 1 秒后启动位置上报，避免阻塞页面加载
            setTimeout(() => {
              LocationService.startPeriodicReporting(true).catch(() => {
                // 静默失败，不影响页面加载
              });
            }, 1000);
          } else if ((!shouldReport || !initialState?.currentUser) && hasStartedRef.current) {
            // 离开特定页面或用户登出时停止上报
            LocationService.stopPeriodicReporting();
            hasStartedRef.current = false;
          }
        }, [initialState?.currentUser, location.pathname]);

        return null;
      };

      // 使用 App 组件包裹，以支持动态主题
      const AppWrapper = () => {
        const app = App.useApp();

        // 设置全局实例，供 errorInterceptor 等非组件代码使用
        useEffect(() => {
          setAppInstance(app);
        }, [app]);

        return (
          <>
            {children}
            {/* SettingDrawer 已移除，因为 @ant-design/pro-components 与 antd 6 不兼容 */}
            {/* 如需主题切换功能，可以使用 antd 的 ConfigProvider 和自定义主题切换组件 */}
            {/* AI 助手组件 - 仅在用户登录后显示 */}
            {initialState?.currentUser && <AiAssistant />}
            {/* 位置上报组件 - 仅在用户登录后启动 */}
            {initialState?.currentUser && <LocationReporter />}
          </>
        );
      };

      return (
        <App>
          <AppWrapper />
        </App>
      );
    },
    ...(initialState?.settings
      ? {
        ...initialState.settings,
        // ProLayout 只支持 'light' | 'realDark'，将 'dark' 映射为 'realDark'
        navTheme:
          initialState.settings.navTheme === 'dark'
            ? ('realDark' as const)
            : initialState.settings.navTheme === 'light' || initialState.settings.navTheme === 'realDark'
              ? initialState.settings.navTheme
              : undefined,
      } as Partial<Omit<LayoutSettings, 'navTheme'> & { navTheme?: 'light' | 'realDark' }>
      : {}),
    onCollapse: (collapsed: boolean) => {
      setInitialState((preInitialState) => ({
        ...preInitialState,
        settings: {
          ...preInitialState?.settings,
          collapsed,
        },
      }));

      // 移动端菜单打开时锁定滚动
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        const root = document.getElementById('root');
        if (root) {
          if (!collapsed) {
            // 菜单展开（打开），锁定滚动
            root.style.overflow = 'hidden';
            root.style.height = '100vh'; // 确保高度限制
            document.body.style.overflow = 'hidden';
          } else {
            // 菜单折叠（关闭），恢复滚动
            root.style.overflow = '';
            root.style.height = '';
            document.body.style.overflow = '';
          }
        }
      }
    },
    title: initialState?.currentUser?.currentCompanyDisplayName || initialState?.currentUser?.currentCompanyName || defaultSettings.title,
  };
};

/**
 * 检查当前用户响应是否有效
 */
function handleCurrentUserResponse(response: any): any {
  // 如果是获取当前用户的请求，不显示错误提示（因为可能是未登录状态）
  const isCurrentUserRequest =
    response.config.url?.includes('/api/auth/current-user') ||
    response.config.url?.includes('/api/currentUser'); // 兼容旧路径
  if (!isCurrentUserRequest) {
    return response;
  }

  const userData = response.data?.data;

  // 如果用户不存在或被禁用（IsLogin = false）
  if (userData?.isLogin === false) {
    tokenUtils.clearAllTokens();
    // 不在这里跳转，让响应拦截器的统一错误处理来处理
    throw new Error('User not found or inactive');
  }

  return response;
}

/**
 * 处理401错误 - Token过期或无效
 * 只负责 token 刷新，其他错误交给 errorHandler 处理
 */
async function handle401Error(error: any): Promise<any> {
  const is401Error = error.response?.status === 401;
  if (!is401Error) {
    return null;
  }

  const isRefreshTokenRequest = error.config?.url?.includes('/refresh-token');
  const isRetryRequest = error.config?._retry;

  // 避免刷新 token 递归和重试循环
  // 如果是刷新 token 请求本身失败，或已经是重试请求，不再尝试刷新
  if (isRefreshTokenRequest || isRetryRequest) {
    // 刷新失败，交给 errorHandler 统一处理认证错误
    return null;
  }

  // 尝试刷新 token
  const refreshToken = tokenUtils.getRefreshToken();
  if (!refreshToken) {
    // 没有 refresh token，交给 errorHandler 统一处理
    return null;
  }

  // 使用 TokenRefreshManager 刷新 token（防止并发刷新）
  const refreshResult = await TokenRefreshManager.refresh(refreshToken);

  if (refreshResult?.success && refreshResult.token) {
    // token 刷新成功，重试原始请求
    return TokenRefreshManager.retryRequest(error.config, refreshResult.token);
  }

  // token 刷新失败，交给 errorHandler 统一处理
  return null;
}

/**
 * @name request 配置，可以配置错误处理
 * 它基于 axios 和 ahooks 的 useRequest 提供了一套统一的网络请求和错误处理方案。
 * @doc https://umijs.org/docs/max/request#配置
 */
export const request: RequestConfig = {
  // 🔒 安全修复：使用环境变量配置生产环境API地址
  // 开发环境使用代理，生产环境从环境变量读取
  baseURL:
    process.env.NODE_ENV === 'development'
      ? ''
      : process.env.REACT_APP_API_BASE_URL || '',

  // 请求拦截器，自动添加 Authorization 头
  requestInterceptors: [
    (config: any) => {
      const token = tokenUtils.getToken();
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
      }
      // ✅ 完全移除token相关日志，避免敏感信息泄露
      return config;
    },
  ],

  // 响应拦截器 - 只处理 token 刷新，其他错误交给 errorHandler 统一处理
  responseInterceptors: [
    (response) => {
      // ✅ 移除响应日志，避免敏感信息泄露
      return handleCurrentUserResponse(response);
    },
    async (error: any) => {
      // ✅ 只在开发环境输出错误（不包含敏感信息）
      if (process.env.NODE_ENV === 'development') {
        console.error('Request failed:', error.config?.url, error.response?.status);
      }

      // 只处理 401 错误，尝试刷新 token
      // 其他错误（包括 404、500 等）都交给 errorHandler 统一处理
      const tokenRefreshResult = await handle401Error(error);
      if (tokenRefreshResult) {
        // token 刷新成功，返回重试结果
        return tokenRefreshResult;
      }

      // 其他错误直接抛出，让 errorHandler 统一处理
      throw error;
    },
  ],

  ...errorConfig,
};
