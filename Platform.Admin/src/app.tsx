import { UserOutlined } from '@ant-design/icons';
import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import type { LayoutSettings } from '@/types/layout';
import { history, request as requestClient } from '@umijs/max';
import React, { useEffect, useRef, useMemo } from 'react';
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
import { getIconFromMap } from '@/utils/iconMap';

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
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
  const initialTheme = savedTheme === 'dark' ? 'realDark' : (savedTheme || 'light');

  const fetchUserInfo = async () => {
    // 检查是否有 token
    if (!tokenUtils.hasToken()) {
      return undefined;
    }

    try {
      // 1. 先尝试获取基础用户信息
      const msg = await queryCurrentUser({
        skipErrorHandler: true,
      });

      const userInfo = msg.data;

      // 检查用户是否有效
      if (!userInfo || userInfo.isLogin === false) {
        tokenUtils.clearAllTokens();
        return undefined;
      }

      // 2. 并行获取菜单和权限
      try {
        const [menuResponse, permissionsResponse] = await Promise.allSettled([
          getUserMenus({ skipErrorHandler: true } as any),
          getMyPermissions(),
        ]);

        if (menuResponse.status === 'fulfilled' && menuResponse.value.success) {
          (userInfo as any).menus = menuResponse.value.data;
        }

        if (permissionsResponse.status === 'fulfilled') {
          const { success, data } = permissionsResponse.value;
          if (success && data) {
            (userInfo as any).permissions = data.allPermissionCodes || [];
          }
        }
      } catch (parallelError) {
        console.warn('Failed to fetch menus or permissions in parallel:', parallelError);
      }

      return userInfo;
    } catch (_error) {
      tokenUtils.clearAllTokens();
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

// 🔧 辅助函数：将中划线或小写名称转换为 PascalCase
const toPascalCase = (name: string) => {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
};

/**
 * 根据图标名称获取图标组件
 */
function getIconComponent(iconName?: string): React.ReactNode {
  if (!iconName) return undefined;

  const baseName = toPascalCase(iconName);
  const suffixes = ['Outlined', 'Filled', 'TwoTone', ''];
  for (const suffix of suffixes) {
    const fullName = baseName.endsWith(suffix) && suffix !== '' ? baseName : baseName + suffix;
    const icon = getIconFromMap(fullName);
    if (icon) return icon;
  }

  if (isDev) {
    console.warn(`Icon [${iconName}] not found in CORE_ICON_MAP.`);
  }
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
      let localeKey = '';
      if (menu.path.startsWith('/system/')) {
        localeKey = `menu.system.${menu.name}`;
      } else if (menu.path.startsWith('/iot-platform/')) {
        const shortName = menu.name.replace(/^iot-platform-/, '');
        localeKey = `menu.iot-platform.${shortName}`;
      } else if (menu.path.startsWith('/project-management/') || menu.name.startsWith('project-management-')) {
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
      } else if (menu.path.startsWith('/cloud-storage/') || menu.name.startsWith('cloud-storage-') || menu.name.startsWith('cloud-storage:')) {
        const shortName = menu.name.replace(/^cloud-storage[-:]/, '');
        localeKey = `menu.cloud-storage.${shortName}`;
      } else if (menu.path === '/welcome') {
        localeKey = 'menu.welcome';
      } else if (menu.path.startsWith('/company/')) {
        localeKey = `menu.${menu.name}`;
      } else if (menu.path.startsWith('/join-requests/')) {
        localeKey = `menu.${menu.name}`;
      } else if (menu.path.startsWith('/account/')) {
        localeKey = `menu.${menu.path.replace(/^\//, '').replaceAll('/', '.')}`;
      } else {
        localeKey = `menu.${menu.name}`;
      }

      const menuItem: any = {
        name: menu.name,
        path: menu.path,
        icon: getIconComponent(menu.icon),
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
      if (initialState?.currentUser) {
        actions.push(<NoticeIcon key="NoticeIcon" />);
      }
      return actions;
    },
    avatarProps: {
      src: getUserAvatar(initialState?.currentUser?.avatar),
      icon: <UserOutlined />,
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
      const whiteList = [loginPath, '/user/register', '/user/register-result'];
      if (whiteList.includes(location.pathname)) {
        return;
      }
      if (location.pathname === loginPath) {
        return;
      }
      if (!initialState?.currentUser) {
        history.push(loginPath);
        return;
      }
      if (!tokenUtils.hasToken()) {
        tokenUtils.clearAllTokens();
        history.push(loginPath);
        return;
      }
    },
    menuDataRender: () => {
      if (
        initialState?.currentUser?.menus &&
        initialState.currentUser.menus.length > 0
      ) {
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
          const index = desiredOrder.findIndex((prefix) => {
            if (prefix === '/system') {
              return menu.path === '/system' || menu.path.startsWith('/system/');
            }
            if (prefix === '/project-management') {
              return menu.path === '/project-management' || menu.path.startsWith('/project-management/');
            }
            if (prefix === '/cloud-storage') {
              return menu.path === '/cloud-storage' || menu.path.startsWith('/cloud-storage/');
            }
            return (
              menu.path === prefix || menu.path.startsWith(`${prefix}/`)
            );
          });

          return index === -1
            ? desiredOrder.length +
            initialState.currentUser!.menus!.indexOf(menu)
            : index;
        };

        const sortedMenus = [...initialState.currentUser.menus].sort(
          (a, b) => getMenuOrder(a as any) - getMenuOrder(b as any),
        );

        return convertMenuTreeToProLayout(sortedMenus as any);
      }
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

      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            padding: '4px 0',
            lineHeight: 1,
            maxWidth: isMobile ? '160px' : 'none',
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
                fontSize: isMobile ? '14px' : '16px',
                color: 'var(--ant-color-text-heading)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {systemName}
            </span>
            {companyName && companyName !== systemName && !isMobile && (
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
      const LocationReporter = () => {
        const hasStartedRef = useRef(false);
        const { location } = history;

        useEffect(() => {
          const shouldReportPages = ['/welcome'];
          const shouldReport = shouldReportPages.some(page => location.pathname === page || location.pathname.startsWith(page));

          if (initialState?.currentUser && shouldReport && !hasStartedRef.current) {
            hasStartedRef.current = true;
            setTimeout(() => {
              LocationService.startPeriodicReporting(true).catch(() => { });
            }, 1000);
          } else if ((!shouldReport || !initialState?.currentUser) && hasStartedRef.current) {
            LocationService.stopPeriodicReporting();
            hasStartedRef.current = false;
          }
        }, [initialState?.currentUser, location.pathname]);

        return null;
      };

      const AppWrapper = () => {
        const app = App.useApp();
        useEffect(() => {
          setAppInstance(app);
        }, [app]);

        return (
          <>
            {children}
            {initialState?.currentUser && <AiAssistant />}
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
        navTheme:
          initialState.settings.navTheme === 'dark'
            ? ('realDark' as const)
            : initialState.settings.navTheme === 'light' || initialState.settings.navTheme === 'realDark'
              ? initialState.settings.navTheme
              : undefined,
      } as Partial<Omit<LayoutSettings, 'navTheme'> & { navTheme?: 'light' | 'realDark' }>
      : {}),
    onCollapse: (collapsed: boolean) => {
      setInitialState((preInitialState: any) => ({
        ...preInitialState,
        settings: {
          ...preInitialState?.settings,
          collapsed,
        },
      }));

      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        const root = document.getElementById('root');
        if (root) {
          if (!collapsed) {
            root.style.overflow = 'hidden';
            root.style.height = '100vh';
            document.body.style.overflow = 'hidden';
          } else {
            root.style.overflow = '';
            root.style.height = '';
            document.body.style.overflow = '';
          }
        }
      }
    },
    title: initialState?.currentUser?.currentCompanyDisplayName || initialState?.currentUser?.currentCompanyName || defaultSettings.title,
    logo: initialState?.currentUser?.currentCompanyLogo ? (
      <img src={initialState.currentUser.currentCompanyLogo} alt="logo" />
    ) : (
      <img src={defaultSettings.logo} alt="logo" />
    ),
  };
};

function handleCurrentUserResponse(response: any): any {
  const isCurrentUserRequest =
    response.config.url?.includes('/api/auth/current-user') ||
    response.config.url?.includes('/api/currentUser');
  if (!isCurrentUserRequest) {
    return response;
  }

  const userData = response.data?.data;
  if (userData?.isLogin === false) {
    tokenUtils.clearAllTokens();
    throw new Error('User not found or inactive');
  }
  return response;
}

async function handle401Error(error: any): Promise<any> {
  const is401Error = error.response?.status === 401;
  if (!is401Error) {
    return null;
  }

  const isRefreshTokenRequest = error.config?.url?.includes('/refresh-token');
  const isRetryRequest = error.config?._retry;

  if (isRefreshTokenRequest || isRetryRequest) {
    return null;
  }

  const refreshToken = tokenUtils.getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  const refreshResult = await TokenRefreshManager.refresh(refreshToken);
  if (refreshResult?.success && refreshResult.token) {
    return TokenRefreshManager.retryRequest(error.config, refreshResult.token);
  }
  return null;
}

export const request: RequestConfig = {
  baseURL:
    process.env.NODE_ENV === 'development'
      ? ''
      : process.env.REACT_APP_API_BASE_URL || '',

  requestInterceptors: [
    (config: any) => {
      const token = tokenUtils.getToken();
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
      }
      return config;
    },
  ],

  responseInterceptors: [
    (response) => {
      return handleCurrentUserResponse(response);
    },
    async (error: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('Request failed:', error.config?.url, error.response?.status);
      }

      const tokenRefreshResult = await handle401Error(error);
      if (tokenRefreshResult) {
        return tokenRefreshResult;
      }
      throw error;
    },
  ],

  ...errorConfig,
};
