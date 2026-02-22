import {
  LockOutlined,
  MobileOutlined,
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
import { Alert, App, Button, Tabs, Form, Input, Checkbox, Card, Space } from 'antd';
import { createStyles } from 'antd-style';
import React, { useState, useRef } from 'react';
import { flushSync } from 'react-dom';
import { Footer } from '@/components';
import ImageCaptcha, { type ImageCaptchaRef } from '@/components/ImageCaptcha';
import { login } from '@/services/ant-design-pro/api';
import { getFakeCaptcha } from '@/services/ant-design-pro/login';
import { tokenUtils } from '@/utils/token';
import { PasswordEncryption } from '@/utils/encryption';
import Settings from '../../../../config/defaultSettings';

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
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(118, 75, 162, 0.3) 0%, transparent 50%)',
        pointerEvents: 'none',
      },
    },
    contentWrapper: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
      position: 'relative',
      zIndex: 1,
    },
    formWrapper: {
      width: '100%',
      maxWidth: '440px',
      '& .ant-pro-form-login-container': {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        padding: '40px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
      },
      '& .ant-pro-form-login-logo': {
        marginBottom: '24px',
        '& img': {
          width: '64px',
          height: '64px',
        },
      },
      '& .ant-pro-form-login-title': {
        fontSize: '28px',
        fontWeight: 600,
        color: '#1a1a1a',
        marginBottom: '8px',
      },
      '& .ant-pro-form-login-desc': {
        fontSize: '14px',
        color: '#666',
        marginBottom: '32px',
      },
      '& .ant-tabs': {
        marginBottom: '24px',
        '& .ant-tabs-tab': {
          fontSize: '15px',
          fontWeight: 500,
        },
      },
      '& .ant-input-affix-wrapper': {
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
        transition: 'all 0.3s',
        '&:hover': {
          borderColor: '#667eea',
        },
        '&.ant-input-affix-wrapper-focused': {
          borderColor: '#667eea',
          boxShadow: '0 0 0 2px rgba(102, 126, 234, 0.1)',
        },
      },
      '& .ant-btn-primary': {
        height: '44px',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: 500,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        border: 'none',
        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
        transition: 'all 0.3s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 6px 16px rgba(102, 126, 234, 0.5)',
        },
      },
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
      // 🔒 安全增强：在发送前加密密码
      const encryptedPassword = values.password
        ? await PasswordEncryption.encrypt(values.password)
        : undefined;

      // 如果显示了验证码但未填写，提示用户
      if (showCaptcha && !captchaAnswer) {
        message.error(
          intl.formatMessage({
            id: 'pages.login.imageCaptcha.required',
            defaultMessage: '请输入图形验证码',
          })
        );
        return;
      }

      // 登录
      const loginData = {
        ...values,
        password: encryptedPassword,
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

      // 如果失败，处理业务逻辑（显示验证码），然后显示友好的错误提示
      const errorCode = response.code;
      const backendMessage = response.message;

      const knownErrors = ['INVALID_CREDENTIALS', 'ACCOUNT_LOCKED', 'ACCOUNT_DISABLED', 'USER_NOT_FOUND', 'PASSWORD_EXPIRED', 'TOO_MANY_ATTEMPTS', 'UNKNOWN', 'CAPTCHA_INVALID', 'CAPTCHA_REQUIRED', 'CAPTCHA_REQUIRED_AFTER_FAILED_LOGIN', 'LOGIN_FAILED'];
      let errorMsg = backendMessage;
      if (errorCode && knownErrors.includes(errorCode)) {
        errorMsg = intl.formatMessage({
          id: `pages.login.error.${errorCode}`,
          defaultMessage: backendMessage || intl.formatMessage({ id: 'pages.login.failure', defaultMessage: '登录失败，请重试！' }),
        });
      } else if (!errorMsg) {
        errorMsg = intl.formatMessage({ id: 'pages.login.failure', defaultMessage: '登录失败，请重试！' });
      }

      // 登录失败后显示验证码（业务逻辑）
      if (errorCode === 'INVALID_CREDENTIALS' || errorCode === 'LOGIN_FAILED' || errorCode === 'CAPTCHA_INVALID' || errorCode === 'CAPTCHA_REQUIRED' || errorCode === 'CAPTCHA_REQUIRED_AFTER_FAILED_LOGIN') {
        setShowCaptcha(true);
        // 如果是验证码错误，自动刷新验证码
        if (errorCode === 'CAPTCHA_INVALID' || errorCode === 'CAPTCHA_REQUIRED' || errorCode === 'CAPTCHA_REQUIRED_AFTER_FAILED_LOGIN') {
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

      // 设置错误状态（用于表单显示）
      setUserLoginState({ status: 'error', message: errorMsg });
      // 显示友好的错误提示
      message.error(errorMsg);

      // 登录错误已在当前函数中处理，直接返回，不抛出错误
      // 避免触发全局错误处理器的技术性错误页面
      return;
    } catch (error: any) {
      // 标记错误已被登录页面处理
      error.skipGlobalHandler = true;

      // 从错误对象中提取 errorCode
      // 优先从 error.response.data 获取（HTTP 错误响应）
      const errorCode =
        error?.response?.data?.code ||
        error?.info?.code ||
        error?.code;

      // 设置错误状态（用于表单显示）
      const backendMessage = error?.response?.data?.message || error?.info?.message || error?.message;

      const knownErrors = ['INVALID_CREDENTIALS', 'ACCOUNT_LOCKED', 'ACCOUNT_DISABLED', 'USER_NOT_FOUND', 'PASSWORD_EXPIRED', 'TOO_MANY_ATTEMPTS', 'UNKNOWN', 'CAPTCHA_INVALID', 'CAPTCHA_REQUIRED', 'CAPTCHA_REQUIRED_AFTER_FAILED_LOGIN', 'LOGIN_FAILED'];
      let errorMsg = backendMessage;
      if (errorCode && knownErrors.includes(errorCode)) {
        errorMsg = intl.formatMessage({
          id: `pages.login.error.${errorCode}`,
          defaultMessage: backendMessage || intl.formatMessage({ id: 'pages.login.failure', defaultMessage: '登录失败，请重试！' }),
        });
      } else if (!errorMsg) {
        errorMsg = intl.formatMessage({ id: 'pages.login.failure', defaultMessage: '登录失败，请重试！' });
      }
      setUserLoginState({ status: 'error', message: errorMsg });

      // 登录失败后显示验证码（业务逻辑）
      if (errorCode === 'INVALID_CREDENTIALS' || errorCode === 'LOGIN_FAILED' || errorCode === 'CAPTCHA_INVALID' || errorCode === 'CAPTCHA_REQUIRED' || errorCode === 'CAPTCHA_REQUIRED_AFTER_FAILED_LOGIN') {
        setShowCaptcha(true);
        // 如果是验证码错误，自动刷新验证码
        if (errorCode === 'CAPTCHA_INVALID' || errorCode === 'CAPTCHA_REQUIRED' || errorCode === 'CAPTCHA_REQUIRED_AFTER_FAILED_LOGIN') {
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

      // 显示友好的错误提示，不再抛出错误，避免显示技术性错误页面
      message.error(errorMsg);
    }
  };
  const { status, type: loginType } = userLoginState;
  const [form] = Form.useForm();
  const [captchaCountdown, setCaptchaCountdown] = useState(0);

  const pageTitle = intl.formatMessage({
    id: 'menu.login',
    defaultMessage: '登录页',
  }) + (Settings.title ? ` - ${Settings.title}` : '');

  // 获取验证码
  const handleGetCaptcha = async () => {
    try {
      const mobile = form.getFieldValue('mobile');
      if (!mobile) {
        message.error('请先输入手机号');
        return;
      }

      const result = await getFakeCaptcha({ phone: mobile });
      if (result.success && result.data) {
        message.success(
          `验证码已生成：${result.data.captcha}（${result.data.expiresIn}秒内有效）`,
          5,
        );
        setCaptchaCountdown(result.data.expiresIn || 60);
        // 倒计时
        const timer = setInterval(() => {
          setCaptchaCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        throw new Error(result.message || '获取验证码失败');
      }
    } catch (error) {
      throw error;
    }
  };

  return (
    <>
      <title>{pageTitle}</title>
      <div className={styles.container}>
        <Lang />
        <div className={styles.contentWrapper}>
          <div className={styles.formWrapper}>
            <Card
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                minWidth: 280,
                maxWidth: '100%',
              }}
            >
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
              <Form
                form={form}
                initialValues={{
                  autoLogin: true,
                }}
                onFinish={async (values) => {
                  await handleSubmit(values as API.LoginParams);
                }}
                layout="vertical"
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
                    <Form.Item
                      name="username"
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
                    >
                      <Input
                        size="large"
                        prefix={<UserOutlined />}
                        placeholder={intl.formatMessage({
                          id: 'pages.login.username.placeholder',
                          defaultMessage: '用户名',
                        })}
                      />
                    </Form.Item>
                    <Form.Item
                      name="password"
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
                    >
                      <Input.Password
                        size="large"
                        prefix={<LockOutlined />}
                        placeholder={intl.formatMessage({
                          id: 'pages.login.password.placeholder',
                          defaultMessage: '密码: ant.design',
                        })}
                      />
                    </Form.Item>
                    {showCaptcha && (
                      <Form.Item
                        name="captchaAnswer"
                        rules={[
                          {
                            required: true,
                            message: (
                              <FormattedMessage
                                id="pages.login.imageCaptcha.required"
                                defaultMessage="请输入图形验证码"
                              />
                            ),
                          },
                        ]}
                      >
                        <ImageCaptcha
                          ref={captchaRef}
                          value={captchaAnswer}
                          onChange={(value) => {
                            setCaptchaAnswer(value);
                            form.setFieldValue('captchaAnswer', value);
                          }}
                          onCaptchaIdChange={setCaptchaId}
                          type="login"
                          placeholder={intl.formatMessage({
                            id: 'pages.login.imageCaptcha.placeholder',
                            defaultMessage: '请输入图形验证码',
                          })}
                          size="large"
                        />
                      </Form.Item>
                    )}
                  </>
                )}

                {status === 'error' && loginType === 'mobile' && (
                  <LoginMessage content="验证码错误" />
                )}
                {type === 'mobile' && (
                  <>
                    <Form.Item
                      name="mobile"
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
                    >
                      <Input
                        size="large"
                        prefix={<MobileOutlined />}
                        placeholder={intl.formatMessage({
                          id: 'pages.login.phoneNumber.placeholder',
                          defaultMessage: '手机号',
                        })}
                      />
                    </Form.Item>
                    <Form.Item
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
                    >
                      <Space.Compact style={{ width: '100%' }}>
                        <Input
                          size="large"
                          prefix={<LockOutlined />}
                          placeholder={intl.formatMessage({
                            id: 'pages.login.captcha.placeholder',
                            defaultMessage: '请输入验证码',
                          })}
                        />
                        <Button
                          size="large"
                          onClick={handleGetCaptcha}
                          disabled={captchaCountdown > 0}
                        >
                          {captchaCountdown > 0
                            ? `${captchaCountdown} ${intl.formatMessage({
                              id: 'pages.getCaptchaSecondText',
                              defaultMessage: '获取验证码',
                            })}`
                            : intl.formatMessage({
                              id: 'pages.login.phoneLogin.getVerificationCode',
                              defaultMessage: '获取验证码',
                            })}
                        </Button>
                      </Space.Compact>
                    </Form.Item>
                  </>
                )}
                <div style={{ marginBottom: 24 }}>
                  <Form.Item name="autoLogin" valuePropName="checked" style={{ marginBottom: 0 }}>
                    <Checkbox>
                      <FormattedMessage
                        id="pages.login.rememberMe"
                        defaultMessage="自动登录"
                      />
                    </Checkbox>
                  </Form.Item>
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
                </div>
                <Form.Item>
                  <Button type="primary" htmlType="submit" size="large" block>
                    <FormattedMessage
                      id="pages.login.submit"
                      defaultMessage="登录"
                    />
                  </Button>
                </Form.Item>
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <Link to="/user/register">
                    <FormattedMessage
                      id="pages.login.register"
                      defaultMessage="没有账号？立即注册"
                    />
                  </Link>
                </div>
              </Form>
            </Card>
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
};

export default Login;
