import {
  LockOutlined,
  MobileOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  LoginForm,
  ProFormCaptcha,
  ProFormCheckbox,
  ProFormText,
} from '@ant-design/pro-components';
import {
  FormattedMessage,
  Helmet,
  Link,
  SelectLang,
  useIntl,
  useModel,
  history,
} from '@umijs/max';
import { Alert, App, Button, Tabs } from 'antd';
import { createStyles } from 'antd-style';
import React, { useState, useRef } from 'react';
import { flushSync } from 'react-dom';
import { Footer } from '@/components';
import ImageCaptcha, { type ImageCaptchaRef } from '@/components/ImageCaptcha';
import { login } from '@/services/ant-design-pro/api';
import { getFakeCaptcha } from '@/services/ant-design-pro/login';
import { tokenUtils } from '@/utils/token';
import Settings from '../../../../config/defaultSettings';

const useStyles = createStyles(({ token }) => {
  return {
    lang: {
      width: 42,
      height: 42,
      lineHeight: '42px',
      position: 'fixed',
      right: 16,
      borderRadius: token.borderRadius,
      ':hover': {
        backgroundColor: token.colorBgTextHover,
      },
    },
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'auto',
      backgroundImage:
        "url('https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/V-_oS6r-i7wAAAAAAAAAAAAAFl94AQBr')",
      backgroundSize: '100% 100%',
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
    <Alert
      style={{
        marginBottom: 24,
      }}
      message={content}
      type="error"
      showIcon
    />
  );
};

const Login: React.FC = () => {
  const [userLoginState, setUserLoginState] = useState<API.LoginResult>({});
  const [type, setType] = useState<string>('account');
  const [captchaId, setCaptchaId] = useState<string>('');
  const [captchaAnswer, setCaptchaAnswer] = useState<string>('');
  const [showCaptcha, setShowCaptcha] = useState<boolean>(false); // 控制验证码显示
  const captchaRef = useRef<ImageCaptchaRef>(null);
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
    try {
      // 登录
      const loginData = { 
        ...values, 
        type,
        captchaId: captchaId || undefined,
        captchaAnswer: captchaAnswer || undefined,
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
        return;
      }

      // 如果失败，处理错误信息
      const errorMsg = response.errorMessage || '登录失败，请重试！';
      setUserLoginState({ status: 'error', errorMessage: errorMsg });
      
      // 登录失败后显示验证码
      if (response.errorCode === 'LOGIN_FAILED' || response.errorCode === 'CAPTCHA_INVALID' || response.errorCode === 'CAPTCHA_REQUIRED') {
        setShowCaptcha(true);
        // 如果是验证码错误，自动刷新验证码
        if (response.errorCode === 'CAPTCHA_INVALID' || response.errorCode === 'CAPTCHA_REQUIRED') {
          if (captchaRef.current) {
            await captchaRef.current.refresh();
          }
        } else {
          // 第一次失败，获取新的验证码
          if (captchaRef.current) {
            await captchaRef.current.refresh();
          }
        }
      }
    } catch (error: any) {
      const defaultLoginFailureMessage = intl.formatMessage({
        id: 'pages.login.failure',
        defaultMessage: '登录失败，请重试！',
      });
      
      const errorMsg = error?.message || defaultLoginFailureMessage;
      setUserLoginState({ status: 'error', errorMessage: errorMsg });
      message.error(errorMsg);
      
      // 从错误对象中提取 errorCode（错误拦截器会在 error.info 中存储）
      const errorCode = error?.info?.errorCode || error?.errorCode;
      
      // 登录失败后显示验证码
      if (errorCode === 'LOGIN_FAILED' || errorCode === 'CAPTCHA_INVALID' || errorCode === 'CAPTCHA_REQUIRED') {
        setShowCaptcha(true);
        // 如果是验证码错误，自动刷新验证码
        if (errorCode === 'CAPTCHA_INVALID' || errorCode === 'CAPTCHA_REQUIRED') {
          if (captchaRef.current) {
            await captchaRef.current.refresh();
          }
        } else {
          // 第一次失败，获取新的验证码
          if (captchaRef.current) {
            await captchaRef.current.refresh();
          }
        }
      }
    }
  };
  const { status, type: loginType } = userLoginState;

  return (
    <div className={styles.container}>
      <Helmet>
        <title>
          {intl.formatMessage({
            id: 'menu.login',
            defaultMessage: '登录页',
          })}
          {Settings.title && ` - ${Settings.title}`}
        </title>
      </Helmet>
      <Lang />
      <div
        style={{
          flex: '1',
          padding: '32px 0',
        }}
      >
        <LoginForm
          contentStyle={{
            minWidth: 280,
            maxWidth: '75vw',
          }}
          logo={<img alt="logo" src="/logo.svg" />}
          title={intl.formatMessage({
            id: 'pages.login.title',
            defaultMessage: 'Aspire Admin Platform',
          })}
          subTitle={intl.formatMessage({
            id: 'pages.login.subTitle',
            defaultMessage: '企业级多租户微服务管理平台',
          })}
          initialValues={{
            autoLogin: true,
          }}
          onFinish={async (values) => {
            await handleSubmit(values as API.LoginParams);
          }}
        >
          <Tabs
            activeKey={type}
            onChange={setType}
            centered
            items={[
              {
                key: 'account',
                label: intl.formatMessage({
                  id: 'pages.login.accountLogin.tab',
                  defaultMessage: '账户密码登录',
                }),
              },
              {
                key: 'mobile',
                label: intl.formatMessage({
                  id: 'pages.login.phoneLogin.tab',
                  defaultMessage: '手机号登录',
                }),
              },
            ]}
          />

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
                fieldProps={{
                  size: 'large',
                  prefix: <UserOutlined />,
                }}
                placeholder={intl.formatMessage({
                  id: 'pages.login.username.placeholder',
                  defaultMessage: '用户名',
                })}
                rules={[
                  {
                    required: true,
                    message: (
                      <FormattedMessage
                        id="pages.login.username.required"
                        defaultMessage="请输入用户名!"
                      />
                    ),
                  },
                ]}
              />
              <ProFormText.Password
                name="password"
                fieldProps={{
                  size: 'large',
                  prefix: <LockOutlined />,
                }}
                placeholder={intl.formatMessage({
                  id: 'pages.login.password.placeholder',
                  defaultMessage: '密码: ant.design',
                })}
                rules={[
                  {
                    required: true,
                    message: (
                      <FormattedMessage
                        id="pages.login.password.required"
                        defaultMessage="请输入密码！"
                      />
                    ),
                  },
                ]}
              />
              {showCaptcha && (
                <ImageCaptcha
                  ref={captchaRef}
                  value={captchaAnswer}
                  onChange={setCaptchaAnswer}
                  onCaptchaIdChange={setCaptchaId}
                  type="login"
                  placeholder={intl.formatMessage({
                    id: 'pages.login.imageCaptcha.placeholder',
                    defaultMessage: '请输入图形验证码',
                  })}
                  size="large"
                />
              )}
            </>
          )}

          {status === 'error' && loginType === 'mobile' && (
            <LoginMessage content="验证码错误" />
          )}
          {type === 'mobile' && (
            <>
              <ProFormText
                fieldProps={{
                  size: 'large',
                  prefix: <MobileOutlined />,
                }}
                name="mobile"
                placeholder={intl.formatMessage({
                  id: 'pages.login.phoneNumber.placeholder',
                  defaultMessage: '手机号',
                })}
                rules={[
                  {
                    required: true,
                    message: (
                      <FormattedMessage
                        id="pages.login.phoneNumber.required"
                        defaultMessage="请输入手机号！"
                      />
                    ),
                  },
                  {
                    pattern: /^1\d{10}$/,
                    message: (
                      <FormattedMessage
                        id="pages.login.phoneNumber.invalid"
                        defaultMessage="手机号格式错误！"
                      />
                    ),
                  },
                ]}
              />
              <ProFormCaptcha
                fieldProps={{
                  size: 'large',
                  prefix: <LockOutlined />,
                }}
                captchaProps={{
                  size: 'large',
                }}
                placeholder={intl.formatMessage({
                  id: 'pages.login.captcha.placeholder',
                  defaultMessage: '请输入验证码',
                })}
                captchaTextRender={(timing, count) => {
                  if (timing) {
                    return `${count} ${intl.formatMessage({
                      id: 'pages.getCaptchaSecondText',
                      defaultMessage: '获取验证码',
                    })}`;
                  }
                  return intl.formatMessage({
                    id: 'pages.login.phoneLogin.getVerificationCode',
                    defaultMessage: '获取验证码',
                  });
                }}
                name="captcha"
                rules={[
                  {
                    required: true,
                    message: (
                      <FormattedMessage
                        id="pages.login.captcha.required"
                        defaultMessage="请输入验证码！"
                      />
                    ),
                  },
                ]}
                onGetCaptcha={async (phone) => {
                  try {
                    const result = await getFakeCaptcha({ phone });

                    if (result.success && result.data) {
                      // 开发环境显示验证码（生产环境应该发送短信）
                      message.success(
                        `验证码已生成：${result.data.captcha}（${result.data.expiresIn}秒内有效）`,
                        5,
                      );
                    } else {
                      message.error('获取验证码失败');
                    }
                  } catch (_error) {
                    message.error('获取验证码失败，请稍后重试');
                  }
                }}
              />
            </>
          )}
          <div
            style={{
              marginBottom: 24,
            }}
          >
            <ProFormCheckbox noStyle name="autoLogin">
              <FormattedMessage
                id="pages.login.rememberMe"
                defaultMessage="自动登录"
              />
            </ProFormCheckbox>
            <Button
              type="link"
              style={{
                float: 'right',
                padding: 0,
                height: 'auto',
              }}
              disabled
              onClick={() => {
                // 忘记密码功能待实现
                message.info('忘记密码功能开发中');
              }}
            >
              <FormattedMessage
                id="pages.login.forgotPassword"
                defaultMessage="忘记密码"
              />
            </Button>
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Link to="/user/register">
                <FormattedMessage
                  id="pages.login.register"
                  defaultMessage="没有账号？立即注册"
                />
              </Link>
            </div>
          </div>
        </LoginForm>
      </div>
      <Footer />
    </div>
  );
};

export default Login;
