import * as API from '@/types';
import {
  LockOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  FormattedMessage,
  Link,
  useIntl,
  useModel,
  history,
} from '@umijs/max';
import { SelectLang } from '@/components';
import { Alert, App, Form, Input, Space } from 'antd';
import { ProCard, ProForm, ProFormText } from '@ant-design/pro-components';
import { createStyles } from 'antd-style';
import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { Footer } from '@/components';
import { login } from '@/services/ant-design-pro/api';
import { tokenUtils } from '@/utils/token';
import { PasswordEncryption } from '@/utils/encryption';
import Settings from '../../../../config/defaultSettings';
import { LOGIN_KNOWN_ERRORS, INVALID_CREDENTIALS } from '@/constants/errorCodes';

const useStyles = createStyles(({ token }) => {
  return {
    lang: {
      width: 42,
      height: 42,
      lineHeight: '42px',
      position: 'fixed',
      right: 16,
      top: 16,
      zIndex: 100,
    },
    container: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      overflow: 'auto',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    contentWrapper: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
    },
    formWrapper: {
      width: '100%',
      maxWidth: 440,
    },
    card: {
      width: '100%',
      maxWidth: '100%',
    },
  };
});

const Lang = () => {
  const { styles } = useStyles();

  return (
    <div className={styles.lang} data-lang>
      {SelectLang && <SelectLang />}
    </div>
  );
};

const LoginMessage: React.FC<{
  content: string;
}> = ({ content }) => {
  return (
    <div
      style={{
        animation: 'ant-pro-form-login-message-fade-in 0.3s cubic-bezier(0.215, 0.61, 0.355, 1)',
      }}
    >
      <Alert
        style={{
          marginBottom: 24,
          borderRadius: '8px',
          backgroundColor: 'rgba(255, 77, 79, 0.1)',
          border: '1px solid rgba(255, 77, 79, 0.2)',
          backdropFilter: 'blur(10px)',
        }}
        message={
          <span style={{ color: '#ff4d4f', fontWeight: 500 }}>{content}</span>
        }
        type="error"
        showIcon
      />
      <style>{`
        @keyframes ant-pro-form-login-message-fade-in {
          0% {
            opacity: 0;
            transform: translateY(-8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

const Login: React.FC = () => {
  const [userLoginState, setUserLoginState] = useState<API.LoginResult>({});
  const [loading, setLoading] = useState(false);
  const type = 'account';
  const { initialState, setInitialState } = useModel('@@initialState');
  const { styles } = useStyles();
  const { message } = App.useApp();
  const intl = useIntl();

  const fetchUserInfo = async () => {
    const userInfo = await initialState?.fetchUserInfo?.();
    if (userInfo) {
      flushSync(() => {
        setInitialState((s) => ({
          ...s,
          currentUser: userInfo,
        }));
      });
    }
  };
  const handleSubmit = async (values: API.LoginParams) => {
    setLoading(true);
    try {
      const encryptedPassword = values.password
        ? await PasswordEncryption.encrypt(values.password)
        : undefined;

      const loginData = {
        ...values,
        password: encryptedPassword,
        type,
      };
      const response = await login(loginData);

      // 处理统一的 API 响应格式
      if (response.success && response.data) {
        const msg = response.data;

        // 保存 token 和刷新token到本地存储
        if (msg.token && msg.refreshToken) {
          const expiresAt = msg.expiresAt
            ? new Date(msg.expiresAt).getTime()
            : undefined;
          tokenUtils.setTokens(msg.token, msg.refreshToken, expiresAt);
        } else if (msg.token) {
          // 兼容旧版本，只保存token
          tokenUtils.setToken(msg.token);
        }

        const defaultLoginSuccessMessage = intl.formatMessage({
          id: 'pages.login.success',
          defaultMessage: '登录成功！',
        });
        message.success(defaultLoginSuccessMessage);
        await fetchUserInfo();

        // 使用 UmiJS history 进行客户端路由跳转，保持 SPA 特性
        const urlParams = new URL(window.location.href).searchParams;
        const redirect = urlParams.get('redirect');
        history.push(redirect || '/');
        setLoading(false);
        return;
      }

      const errorCode = response.code;
      const backendMessage = response.message;

      setLoading(false);

      let errorMsg = backendMessage;
      if (errorCode && LOGIN_KNOWN_ERRORS.includes(errorCode as any)) {
        errorMsg = intl.formatMessage({
          id: `pages.login.error.${errorCode}`,
          defaultMessage: backendMessage || intl.formatMessage({ id: 'pages.login.failure', defaultMessage: '登录失败，请重试！' }),
        });
      } else if (!errorMsg) {
        errorMsg = intl.formatMessage({ id: 'pages.login.failure', defaultMessage: '登录失败，请重试！' });
      }

      setUserLoginState({ status: 'error', message: errorMsg });
      message.error(errorMsg);

      return;
    } catch (error: any) {
      error.skipGlobalHandler = true;
      setLoading(false);

      const errorCode =
        error?.response?.data?.code ||
        error?.info?.code ||
        error?.code;

      const validationErrors = error?.response?.data?.errors;
      const isValidationError = error?.response?.status === 400 && validationErrors;

      if (isValidationError) {
        const firstError = Object.values(validationErrors).flat().find((msg: any) => msg) as string | undefined;
        if (firstError) {
          message.error(firstError as string);
        } else {
          message.error(intl.formatMessage({ id: 'pages.login.failure', defaultMessage: '登录失败，请重试！' }));
        }
        return;
      }

      const backendMessage = error?.response?.data?.message || error?.info?.message || error?.message;

      let errorMsg = backendMessage;
      if (errorCode && LOGIN_KNOWN_ERRORS.includes(errorCode as any)) {
        errorMsg = intl.formatMessage({
          id: `pages.login.error.${errorCode}`,
          defaultMessage: backendMessage || intl.formatMessage({ id: 'pages.login.failure', defaultMessage: '登录失败，请重试！' }),
        });
      } else if (!errorMsg) {
        errorMsg = intl.formatMessage({ id: 'pages.login.failure', defaultMessage: '登录失败，请重试！' });
      }
      setUserLoginState({ status: 'error', message: errorMsg });

      message.error(errorMsg);
    }
  };
  const { status, type: loginType } = userLoginState;

  const pageTitle = intl.formatMessage({
    id: 'menu.login',
    defaultMessage: '登录页',
  }) + (Settings.title ? ` - ${Settings.title}` : '');



  return (
    <>
      <title>{pageTitle}</title>
      <div className={styles.container}>
        <Lang />
        <div className={styles.contentWrapper}>
          <div className={styles.formWrapper}>
            <ProCard className={styles.card}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <img alt="logo" src="/logo.svg" style={{ width: 64, height: 64, marginBottom: 16 }} />
                <div style={{ fontSize: 28, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>
                  {Settings.title}
                </div>
                <div style={{ fontSize: 14, color: '#666', marginBottom: 32 }}>
                  {intl.formatMessage({
                    id: 'pages.login.subTitle',
                    defaultMessage: '企业级多租户微服务管理平台',
                  })}
                </div>
              </div>
              <ProForm
                onFinish={async (values) => {
                  await handleSubmit(values as API.LoginParams);
                }}
                submitter={{
                  submitButtonProps: { loading, size: 'middle', block: true },
                }}
              >
                {status === 'error' && loginType === 'account' && (
                  <LoginMessage
                    content={intl.formatMessage({
                      id: 'pages.login.accountLogin.errorMessage',
                      defaultMessage: '账户或密码错误',
                    })}
                  />
                )}
                {type === 'account' && (
                  <>
                    <ProFormText
                      name="username"
                      placeholder={intl.formatMessage({
                        id: 'pages.login.username.placeholder',
                        defaultMessage: '用户名',
                      })}
                      fieldProps={{ prefix: <UserOutlined /> }}
                      rules={[{ required: true, message: intl.formatMessage({ id: 'pages.login.username.required', defaultMessage: '请输入用户名!' }) }]}
                    />
                    <ProForm.Item name="password" rules={[{ required: true, message: intl.formatMessage({ id: 'pages.login.password.required', defaultMessage: '请输入密码！' }) }]}>
                      <Input.Password
                        size="middle"
                        prefix={<LockOutlined />}
                        placeholder={intl.formatMessage({
                          id: 'pages.login.password.placeholder',
                          defaultMessage: '密码',
                        })}
                      />
                    </ProForm.Item>
                  </>
                )}

                <div style={{ marginBottom: 24, textAlign: 'right' }}>
                  <Link to="/user/forgot-password">
                    <FormattedMessage id="pages.login.forgotPassword" defaultMessage="忘记密码" />
                  </Link>
                </div>
              </ProForm>
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Link to="/user/register">
                  <FormattedMessage id="pages.login.register" defaultMessage="没有账号？立即注册" />
                </Link>
              </div>
            </ProCard>
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
};

export default Login;
