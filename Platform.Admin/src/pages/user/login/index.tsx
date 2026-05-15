import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { FormattedMessage, getIntl, history, Link, useIntl, useModel } from '@umijs/max';
import { Alert, App, Form } from 'antd';
import { createStyles } from 'antd-style';
import React, { useState } from 'react';
import { flushSync } from 'react-dom';
import { Footer, SelectLang } from '@/components';
import { LOGIN_KNOWN_ERRORS } from '@/constants/errorCodes';
import { login } from '@/services/ant-design-pro/api';
import * as API from '@/types';
import { PasswordEncryption } from '@/utils/encryption';
import { tokenUtils } from '@/utils/token';
import Settings from '../../../../config/defaultSettings';
import { ProCard, ProForm, ProFormText } from '@ant-design/pro-components';


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
        message={<span style={{ color: '#ff4d4f', fontWeight: 500 }}>{content}</span>}
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
  const [form] = Form.useForm();

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
      tokenUtils.clearAllTokens();

      const encryptedPassword = values.password ? await PasswordEncryption.encrypt(values.password) : undefined;

      const loginData = {
        ...values,
        password: encryptedPassword,
        type,
      };
      const response = await login(loginData);

      // 处理统一的 API 响应格式
      if (response?.success && response?.data) {
        const msg = response.data;

        // 保存 token 和刷新token到本地存储
        if (msg.token && msg.refreshToken) {
          const expiresAt = msg.expiresAt ? new Date(msg.expiresAt).getTime() : undefined;
          tokenUtils.setTokens(msg.token, msg.refreshToken, expiresAt);
        } else if (msg.token) {
          // 兼容旧版本，只保存token
          tokenUtils.setToken(msg.token);
        }

        const defaultLoginSuccessMessage = intl.formatMessage({
          id: 'pages.login.success',
        });
        message.success(defaultLoginSuccessMessage);

        try {
          await fetchUserInfo();
        } catch (fetchError) {
          console.warn('[login] fetchUserInfo failed after login:', fetchError);
        }

        // 使用 UmiJS history 进行客户端路由跳转，保持 SPA 特性
        const urlParams = new URL(window.location.href).searchParams;
        const redirect = urlParams.get('redirect');
        history.push(redirect || '/');
        return;
      }

      const backendMessage = response?.message;
      const errorCode = response?.errorCode;

      let errorMsg = backendMessage;
      if (errorCode) {
        errorMsg = intl.formatMessage({
          id: errorCode,
        });
      } else if (LOGIN_KNOWN_ERRORS.includes(backendMessage as any)) {
        errorMsg = intl.formatMessage({
          id: `pages.login.error.${backendMessage}`,
        });
      } else if (!errorMsg) {
        errorMsg = intl.formatMessage({ id: 'pages.login.failure' });
      }

      // 处理字段级验证错误
      if (response?.errors) {
        console.log('[login] response.errors:', response.errors);
        const fieldErrors = Object.entries(response.errors).map(([field, msgs]) => {
          const errMsg = Array.isArray(msgs) ? msgs[0] : msgs;
          const translatedErr = intl.formatMessage({ id: errMsg as string });
          console.log('[login] field error:', field, translatedErr);
          return { name: field as any, errors: [translatedErr] };
        });
        console.log('[login] calling form.setFields:', fieldErrors);
        form.setFields(fieldErrors);
        // 验证错误已在输入框下显示
        setLoading(false);
        return;
      }

      // 打印响应用于调试
      console.log('[login] response:', response);

      setUserLoginState({ status: 'error', message: errorMsg });
      message.error(errorMsg);
    } catch (error: any) {
      const intl = getIntl();
      const response = error?.response?.data;

      // 处理字段级验证错误
      if (response?.errors) {
        const fieldErrors = Object.entries(response.errors).map(([field, msgs]) => {
          const errMsg = Array.isArray(msgs) ? msgs[0] : msgs;
          const translatedErr = intl.formatMessage({ id: errMsg as string });
          return { name: field as any, errors: [translatedErr] };
        });
        form.setFields(fieldErrors);
        setLoading(false);
        return;
      }

      // 处理普通错误（errorCode 优先）
      const backendMessage = response?.message || error?.message;
      const errorCode = response?.errorCode || error?.info?.errorCode;

      let errorMsg = backendMessage;
      if (errorCode) {
        errorMsg = intl.formatMessage({
          id: errorCode,
        });
      } else if (!errorMsg) {
        errorMsg = intl.formatMessage({ id: 'pages.login.failure' });
      }

      setUserLoginState({ status: 'error', message: errorMsg });
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  const { status, type: loginType } = userLoginState;

  const pageTitle =
    intl.formatMessage({
      id: 'menu.login',
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
                <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--ant-color-text)', marginBottom: 8 }}>{Settings.title}</div>
                <div style={{ fontSize: 14, color: 'var(--ant-color-text-description)', marginBottom: 32 }}>
                  {intl.formatMessage({
                    id: 'pages.login.subTitle',
                  })}
                </div>
              </div>
              <ProForm
                form={form}
                onFinish={async (values) => {
                  await handleSubmit(values as API.LoginParams);
                }}
                submitter={{
                  submitButtonProps: { loading, block: true },
                }}
              >
                {status === 'error' && loginType === 'account' && (
                  <LoginMessage
                    content={intl.formatMessage({
                      id: 'pages.login.accountLogin.errorMessage',
                    })}
                  />
                )}
                {type === 'account' && (
                  <>
                    <ProFormText
                      name="username"
                      placeholder={intl.formatMessage({
                        id: 'pages.login.username.placeholder',
                      })}
                      fieldProps={{ prefix: <UserOutlined /> }}
                      rules={[{ required: true, message: intl.formatMessage({ id: 'pages.login.username.required' }) }]}
                    />
                    <ProFormText
                      name="password"
                      placeholder={intl.formatMessage({
                        id: 'pages.login.password.placeholder',
                      })}
                      fieldProps={{ prefix: <LockOutlined />, type: 'password' }}
                      rules={[{ required: true, message: intl.formatMessage({ id: 'pages.login.password.required' }) }]}
                    />
                  </>
                )}
              </ProForm>
              <div style={{ marginBottom: 24, textAlign: 'right' }}>
                <Link to="/user/forgot-password">
                  <FormattedMessage id="pages.login.forgotPassword" />
                </Link>
              </div>
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Link to="/user/register">
                  <FormattedMessage id="pages.login.register" />
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
