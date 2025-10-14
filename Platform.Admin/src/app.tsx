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
        skipErrorHandler: true,
      });
      
      let userInfo = msg.data;
      
      // 检查用户是否有效（后端返回 IsLogin = false 表示用户不存在或被禁用）
      if (!userInfo || userInfo.isLogin === false) {
        console.log('User not found or inactive, clearing tokens');
        tokenUtils.clearAllTokens();
        return undefined;
      }
      
      // 获取用户菜单
      try {
        const menuResponse = await getUserMenus({
          skipErrorHandler: true,
        } as any);
        if (menuResponse.success && menuResponse.data) {
          (userInfo as any).menus = menuResponse.data;
        }
      } catch (menuError) {
        console.log('Failed to fetch user menus, using default menus:', menuError);
      }
      
      // 获取用户权限
      try {
        const permissionsResponse = await getMyPermissions();
        if (permissionsResponse.success && permissionsResponse.data) {
          (userInfo as any).permissions = permissionsResponse.data.allPermissionCodes || [];
        }
      } catch (permissionsError) {
        console.log('Failed to fetch user permissions, using default permissions:', permissionsError);
      }
      
      return userInfo;
    } catch (error) {
      // 如果获取用户信息失败（包括 token 过期），清除 token
      // 响应拦截器已经处理了 token 刷新，如果走到这里说明刷新也失败了
      console.log('Failed to fetch user info:', error);
      tokenUtils.clearAllTokens();
      history.push(loginPath);
      return undefined;
    }
  };
  
  // 如果不是登录页面，执行
  const { location } = history;
  const whiteListPages = [loginPath, '/user/register', '/user/register-result'];
  if (!whiteListPages.includes(location.pathname)) {
    const currentUser = await fetchUserInfo();
    return {
      fetchUserInfo,
      currentUser,
      settings: defaultSettings as Partial<LayoutSettings>,
    };
  }
  return {
    fetchUserInfo,
    settings: defaultSettings as Partial<LayoutSettings>,
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
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
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
 */
function convertMenuTreeToProLayout(menus: API.MenuTreeNode[]): any[] {
  return menus
    .filter(menu => !menu.hideInMenu)
    .map(menu => {
      const menuItem: any = {
        name: menu.name,
        path: menu.path,
        icon: getIconComponent(menu.icon),
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
      
      // 1. 检查是否有 currentUser
      if (!initialState?.currentUser) {
        console.log('No current user, redirecting to login');
        history.push(loginPath);
        return;
      }
      
      // 2. 检查是否有 token
      if (!tokenUtils.hasToken()) {
        console.log('No token found, redirecting to login');
        tokenUtils.clearAllTokens();
        history.push(loginPath);
        return;
      }
      
      // 3. 检查 token 是否过期
      if (tokenUtils.isTokenExpired()) {
        console.log('Token expired, attempting to refresh or redirecting to login');
        const refreshToken = tokenUtils.getRefreshToken();
        
        if (!refreshToken) {
          // 没有刷新token，直接跳转登录
          console.log('No refresh token, redirecting to login');
          tokenUtils.clearAllTokens();
          history.push(loginPath);
          return;
        }
        
        // 有刷新token，让响应拦截器处理刷新逻辑
        // 这里不主动刷新，因为下一个API请求会自动触发刷新
        console.log('Token expired but refresh token exists, will refresh on next request');
      }
    },
    // 动态渲染菜单（完全从数据库加载）
    menuDataRender: () => {
      // v5.0: 菜单完全从数据库加载，不使用静态路由
      if (initialState?.currentUser?.menus && initialState.currentUser.menus.length > 0) {
        const dynamicMenus = convertMenuTreeToProLayout(initialState.currentUser.menus);
        console.log('✅ 使用数据库菜单:', dynamicMenus);
        return dynamicMenus;
      }
      
      // 数据库没有菜单时，返回空数组（不使用 routes.ts 作为后备）
      console.warn('⚠️ 数据库中没有菜单，请检查系统初始化是否完成');
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
  const isCurrentUserRequest = response.config.url?.includes('/api/currentUser');
  if (!isCurrentUserRequest) {
    return response;
  }
  
  const userData = response.data?.data;
  
  // 如果用户不存在或被禁用（IsLogin = false）
  if (userData?.isLogin === false) {
    console.log('User not found or inactive, clearing tokens and redirecting to login');
    tokenUtils.clearAllTokens();
    history.push('/user/login');
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
    console.log('User not found (404), clearing tokens and redirecting to login');
    tokenUtils.clearAllTokens();
    history.push('/user/login');
    return Promise.reject(new Error('User not found'));
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
  tokenUtils.setTokens(refreshResult.token, refreshResult.refreshToken, expiresAt);
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
    const { refreshToken: refreshTokenAPI } = await import('@/services/ant-design-pro/api');
    const refreshResponse = await refreshTokenAPI({ refreshToken });

    if (!refreshResponse.success || !refreshResponse.data) {
      return null;
    }

    const refreshResult = refreshResponse.data;
    const hasValidTokens = refreshResult.status === 'ok' 
      && refreshResult.token 
      && refreshResult.refreshToken;

    if (hasValidTokens) {
      console.log('Token refreshed successfully');
      saveRefreshedTokens(refreshResult);
      return retryOriginalRequest(originalRequest, refreshResult.token!);
    }

    return null;
  } catch (refreshError) {
    console.log('Token refresh failed:', refreshError);
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
    console.log('Refresh token failed or already retried, redirecting to login');
    tokenUtils.clearAllTokens();
    history.push('/user/login');
    return Promise.reject(new Error('Authentication failed'));
  }
  
  console.log('401 Unauthorized - attempting to refresh token');
  
  // 尝试刷新token
  const refreshToken = tokenUtils.getRefreshToken();
  if (refreshToken) {
    const result = await attemptTokenRefresh(refreshToken, error.config);
    if (result) {
      return result;
    }
  }
  
  // 刷新失败，清除token并跳转登录
  console.log('Clearing tokens and redirecting to login');
  tokenUtils.clearAllTokens();
  history.push('/user/login');
  return Promise.reject(new Error('Authentication failed'));
}

/**
 * @name request 配置，可以配置错误处理
 * 它基于 axios 和 ahooks 的 useRequest 提供了一套统一的网络请求和错误处理方案。
 * @doc https://umijs.org/docs/max/request#配置
 */
export const request: RequestConfig = {
  // 开发环境使用代理，生产环境需要配置实际的API地址
  baseURL: process.env.NODE_ENV === 'development' ? '' : 'https://proapi.azurewebsites.net',
  
  // 请求拦截器，自动添加 Authorization 头
  requestInterceptors: [
    (config: any) => {
      const token = tokenUtils.getToken();
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
        console.log('Request with token:', config.url, token.substring(0, 20) + '...');
      } else {
        console.log('Request without token:', config.url);
      }
      return config;
    },
  ],

  // 响应拦截器，处理 token 过期和用户不存在
  responseInterceptors: [
    (response) => {
      console.log('Response received:', response.config.url, response.status);
      return handleCurrentUserResponse(response);
    },
    async (error: any) => {
      console.log('Response error:', error.config?.url, error.response?.status, error.message);
      
      // 处理404错误（用户不存在）
      const notFoundResult = handle404Error(error);
      if (notFoundResult !== null) {
        return notFoundResult;
      }
      
      // 处理401错误（Token过期或无效）
      const unauthorizedResult = await handle401Error(error);
      if (unauthorizedResult !== null) {
        return unauthorizedResult;
      }
      
      return Promise.reject(new Error(error.message || 'Request failed'));
    },
  ],
  
  ...errorConfig,
};
