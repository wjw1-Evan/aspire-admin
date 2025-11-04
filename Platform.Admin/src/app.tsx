import { LinkOutlined } from '@ant-design/icons';
import * as Icons from '@ant-design/icons';
import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';
import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { history, Link, request as requestClient } from '@umijs/max';
import React from 'react';
import {
  AvatarDropdown,
  AvatarName,
  CompanySwitcher,
  Footer,
  NoticeIcon,
  Question,
  SelectLang,
} from '@/components';
import { currentUser as queryCurrentUser } from '@/services/ant-design-pro/api';
import { getUserMenus } from '@/services/menu/api';
import { getMyPermissions } from '@/services/permission';
import { tokenUtils } from '@/utils/token';
import defaultSettings from '../config/defaultSettings';
import { errorConfig } from './request-error-config';
import '@ant-design/v5-patch-for-react-19';

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
  const initialTheme = savedTheme || 'light';
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
        skipErrorHandler: true, // 跳过全局错误处理，由这里自己处理
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
          skipErrorHandler: true, // 跳过全局错误处理
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
      let localeKey = '';
      if (menu.path.startsWith('/system/')) {
        // 系统管理子菜单
        localeKey = `menu.system.${menu.name}`;
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
    actionsRender: () => [
      <NoticeIcon key="NoticeIcon" />,
      <CompanySwitcher key="CompanySwitcher" />,
      <Question key="doc" />,
      <SelectLang key="SelectLang" />,
    ],
    avatarProps: {
      src: initialState?.currentUser?.avatar,
      title: <AvatarName />,
      render: (_, avatarChildren) => {
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
        const dynamicMenus = convertMenuTreeToProLayout(
          initialState.currentUser.menus,
        );
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
    links: isDev
      ? [
          <Link key="openapi" to="/umi/plugin/openapi" target="_blank">
            <LinkOutlined />
            <span>OpenAPI 文档</span>
          </Link>,
        ]
      : [],
    menuHeaderRender: undefined,
    childrenRender: (children) => {
      return (
        <>
          {children}
          {isDev && (
            <SettingDrawer
              disableUrlParams
              enableDarkTheme
              settings={initialState?.settings}
              onSettingChange={(settings) => {
                setInitialState((preInitialState) => ({
                  ...preInitialState,
                  settings,
                }));
              }}
            />
          )}
        </>
      );
    },
    ...initialState?.settings,
  };
};

/**
 * 检查当前用户响应是否有效
 */
function handleCurrentUserResponse(response: any): any {
  const isCurrentUserRequest =
    response.config.url?.includes('/api/currentUser');
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
 * 处理404错误 - 用户不存在
 */
function handle404Error(error: any): Promise<never> | null {
  const is404Error = error.response?.status === 404;
  if (!is404Error) {
    return null;
  }

  const isCurrentUserRequest = error.config?.url?.includes('/api/currentUser');
  const isNotFoundError = error.response?.data?.errorCode === 'NOT_FOUND';

  if (isCurrentUserRequest && isNotFoundError) {
    tokenUtils.clearAllTokens();
    // 不在这里跳转，让响应拦截器的统一错误处理来处理
    throw new Error('User not found');
  }

  return null;
}

/**
 * 保存刷新后的token
 */
function saveRefreshedTokens(refreshResult: any) {
  const expiresAt = refreshResult.expiresAt
    ? new Date(refreshResult.expiresAt).getTime()
    : undefined;
  tokenUtils.setTokens(
    refreshResult.token,
    refreshResult.refreshToken,
    expiresAt,
  );
}

/**
 * 重试原始请求
 */
function retryOriginalRequest(originalRequest: any, newToken: string) {
  originalRequest._retry = true;
  originalRequest.headers.Authorization = `Bearer ${newToken}`;
  return requestClient(originalRequest);
}

/**
 * 尝试刷新token
 */
async function attemptTokenRefresh(refreshToken: string, originalRequest: any) {
  try {
    const { refreshToken: refreshTokenAPI } = await import(
      '@/services/ant-design-pro/api'
    );
    const refreshResponse = await refreshTokenAPI({ refreshToken });

    if (!refreshResponse.success || !refreshResponse.data) {
      return null;
    }

    const refreshResult = refreshResponse.data;
    const hasValidTokens =
      refreshResult.status === 'ok' &&
      refreshResult.token &&
      refreshResult.refreshToken;

    if (hasValidTokens && refreshResult.token) {
      saveRefreshedTokens(refreshResult);
      return retryOriginalRequest(originalRequest, refreshResult.token);
    }

    return null;
  } catch (_refreshError) {
    return null;
  }
}

/**
 * 处理401错误 - Token过期或无效
 */
async function handle401Error(error: any): Promise<any> {
  const is401Error = error.response?.status === 401;
  if (!is401Error) {
    return null;
  }

  const isRefreshTokenRequest = error.config?.url?.includes('/refresh-token');
  const isRetryRequest = error.config?._retry;
  const shouldNotRetry = isRefreshTokenRequest || isRetryRequest;

  // 避免刷新token递归和重试循环
  if (shouldNotRetry) {
    tokenUtils.clearAllTokens();
    // 返回特殊值表示认证失败，不抛出错误
    return { __authFailed: true };
  }

  // 尝试刷新token
  const refreshToken = tokenUtils.getRefreshToken();
  if (refreshToken) {
    const result = await attemptTokenRefresh(refreshToken, error.config);
    if (result) {
      return result;
    }
  }

  // 刷新失败，清除token
  tokenUtils.clearAllTokens();
  // 返回特殊值表示认证失败，不抛出错误
  return { __authFailed: true };
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

  // 响应拦截器，处理 token 过期和用户不存在
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

      // 处理404错误（用户不存在）
      const notFoundResult = handle404Error(error);
      if (notFoundResult !== null) {
        // 如果是认证相关的404错误，跳转到登录页面
        const isCurrentUserRequest =
          error.config?.url?.includes('/api/currentUser');
        if (isCurrentUserRequest) {
          // 使用 setTimeout 确保错误处理完成后再跳转，避免循环
          setTimeout(() => {
            history.push('/user/login');
          }, 100);
        }
        return notFoundResult;
      }

      // 处理401错误（Token过期或无效）
      const unauthorizedResult = await handle401Error(error);
      if (unauthorizedResult !== null) {
        // 检查是否是认证失败的特殊标记
        if (unauthorizedResult.__authFailed) {
          // 认证失败，跳转到登录页面，不抛出错误
          setTimeout(() => {
            history.push('/user/login');
          }, 100);
          // 返回一个静默的错误，不显示给用户
          throw new Error('Authentication handled silently');
        }
        // 如果是token刷新成功的结果，直接返回
        return unauthorizedResult;
      }

      // 检查是否是认证相关的错误，如果是则不抛出错误（避免显示401提示）
      const isAuthError = error.response?.status === 401 || error.response?.status === 404;
      if (isAuthError) {
        // 认证错误已经在上面处理过了，不抛出错误避免显示401提示
        throw new Error('Authentication handled');
      }

      // 对于其他错误，检查错误消息是否包含敏感信息
      const errorMessage = error.message || 'Request failed';
      if (errorMessage.includes('status code 401') || errorMessage.includes('status code 404')) {
        // 如果是包含状态码的错误消息，使用通用消息
        throw new Error('Request failed');
      }

      throw new Error(errorMessage);
    },
  ],

  ...errorConfig,
};
