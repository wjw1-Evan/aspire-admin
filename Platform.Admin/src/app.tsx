import { LinkOutlined } from '@ant-design/icons';
import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';
import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { history, Link, request as requestClient } from '@umijs/max';
import React from 'react';
import {
  AvatarDropdown,
  AvatarName,
  Footer,
  Question,
  SelectLang,
} from '@/components';
import { currentUser as queryCurrentUser } from '@/services/ant-design-pro/api';
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
      return msg.data;
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
  if (
    ![loginPath, '/user/register', '/user/register-result'].includes(
      location.pathname,
    )
  ) {
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

// ProLayout 支持的api https://procomponents.ant.design/components/layout
export const layout: RunTimeLayoutConfig = ({
  initialState,
  setInitialState,
}) => {
  return {
    actionsRender: () => [
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
      // 如果没有登录，重定向到 login
      if (!initialState?.currentUser && location.pathname !== loginPath) {
        history.push(loginPath);
      }
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

  // 响应拦截器，处理 token 过期
  responseInterceptors: [
    (response) => {
      console.log('Response received:', response.config.url, response.status);
      return response;
    },
    async (error: any) => {
      console.log('Response error:', error.config?.url, error.response?.status, error.message);
      
      if (error.response?.status === 401) {
        // 检查是否已经是刷新token请求，避免递归
        const isRefreshTokenRequest = error.config?.url?.includes('/refresh-token');
        
        // 检查是否已经重试过，避免无限循环
        const isRetryRequest = error.config?._retry;
        
        if (isRefreshTokenRequest || isRetryRequest) {
          // 如果是刷新token请求失败或已经重试过，直接登出
          console.log('Refresh token failed or already retried, redirecting to login');
          tokenUtils.clearAllTokens();
          history.push('/user/login');
          return Promise.reject(error);
        }
        
        console.log('401 Unauthorized - attempting to refresh token');
        
        // 尝试刷新token
        const refreshToken = tokenUtils.getRefreshToken();
        if (refreshToken) {
          try {
            const { refreshToken: refreshTokenAPI } = await import('@/services/ant-design-pro/api');
            const refreshResponse = await refreshTokenAPI({ refreshToken });

            // 处理统一的 API 响应格式
            if (refreshResponse.success && refreshResponse.data) {
              const refreshResult = refreshResponse.data;

              if (refreshResult.status === 'ok' && refreshResult.token && refreshResult.refreshToken) {
                console.log('Token refreshed successfully');
                // 保存新的token
                const expiresAt = refreshResult.expiresAt ? new Date(refreshResult.expiresAt).getTime() : undefined;
                tokenUtils.setTokens(refreshResult.token, refreshResult.refreshToken, expiresAt);

                // 重试原始请求，标记为已重试
                const originalRequest = error.config;
                originalRequest._retry = true;
                originalRequest.headers.Authorization = `Bearer ${refreshResult.token}`;
                return requestClient(originalRequest);
              }
            }
          } catch (refreshError) {
            console.log('Token refresh failed:', refreshError);
          }
        }
        
        // 刷新失败或没有刷新token，清除本地存储并跳转到登录页
        console.log('Clearing tokens and redirecting to login');
        tokenUtils.clearAllTokens();
        history.push('/user/login');
      }
      
      return Promise.reject(new Error(error.message || 'Request failed'));
    },
  ],
  
  ...errorConfig,
};
