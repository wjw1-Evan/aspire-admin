import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LockOutlined,
  MailOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  FormattedMessage,
  history,
  Link,
  useIntl,
} from '@umijs/max';
import { SelectLang } from '@/components';
import { App, Button, Card, Form, Input, Space } from 'antd';
import { createStyles } from 'antd-style';
import React, { useRef, useState } from 'react';
import { Footer } from '@/components';
import ImageCaptcha, { type ImageCaptchaRef } from '@/components/ImageCaptcha';
import { checkUsernameExists, register } from '@/services/ant-design-pro/api';
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
        background:
          'radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(118, 75, 162, 0.3) 0%, transparent 50%)',
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
    card: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      borderRadius: '16px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      minWidth: 280,
      maxWidth: '100%',
    },
    header: {
      textAlign: 'center',
      marginBottom: 24,
      '& img': {
        width: '64px',
        height: '64px',
        marginBottom: '16px',
      },
      '& .title': {
        fontSize: '28px',
        fontWeight: 600,
        color: '#1a1a1a',
        marginBottom: '8px',
      },
      '& .subTitle': {
        fontSize: '14px',
        color: '#666',
        marginBottom: '32px',
      },
    },
    infoBox: {
      marginTop: 16,
      textAlign: 'center',
      background:
        'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
      padding: '16px',
      borderRadius: '12px',
      fontSize: '13px',
      color: '#666',
      border: '1px solid rgba(102, 126, 234, 0.2)',
      '& .info-title': {
        marginBottom: 12,
        fontSize: '14px',
        fontWeight: 500,
        color: '#667eea',
      },
      '& .info-item': {
        marginBottom: 6,
        '&:last-child': {
          marginBottom: 0,
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

export default function Register() {
  const intl = useIntl();
  const { message } = App.useApp();
  const { styles } = useStyles();
  const [captchaId, setCaptchaId] = useState<string>('');
  const [captchaAnswer, setCaptchaAnswer] = useState<string>('');
  const [showCaptcha, setShowCaptcha] = useState<boolean>(false); // 控制验证码显示
  const captchaRef = useRef<ImageCaptchaRef>(null);

  // 用户名检测状态
  const [usernameStatus, setUsernameStatus] = useState<
    'checking' | 'available' | 'exists' | null
  >(null);
  const [usernameMessage, setUsernameMessage] = useState<string>('');
  const [usernameValue, setUsernameValue] = useState<string>('');

  const pageTitle = `${intl.formatMessage({ id: 'pages.register.title' })} - ${Settings.title}`;

  const handleSubmit = async (values: API.RegisterParams) => {
    try {
      const response = await register({
        ...values,
        captchaId: captchaId || undefined,
        captchaAnswer: captchaAnswer || undefined,
      });

      if (response.success && response.data) {
        message.success(intl.formatMessage({ id: 'pages.message.registerSuccess' }));

        // 自动登录（注册成功后）
        setTimeout(() => {
          history.push('/user/login');
        }, 1500);

        return;
      }

      // 注册失败，处理业务逻辑（显示验证码），然后抛出错误让全局错误处理显示错误提示
      const errorCode = response.errorCode;
      const errorMsg = response.errorMessage || intl.formatMessage({ id: 'pages.login.failure' }); // Using existing login failure as fallback or add new one

      // 注册失败后显示验证码（业务逻辑）
      if (errorCode === 'USER_EXISTS' || errorCode === 'EMAIL_EXISTS' ||
        errorCode === 'CAPTCHA_INVALID' || errorCode === 'CAPTCHA_REQUIRED' ||
        errorCode === 'SERVER_ERROR') {
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

      // 抛出错误，由全局错误处理统一显示错误提示
      throw new Error(errorMsg);
    } catch (error: any) {
      // 从错误对象中提取 errorCode
      const errorCode =
        error?.info?.errorCode ||
        error?.errorCode ||
        error?.response?.data?.errorCode;

      // 注册失败后显示验证码（业务逻辑）
      if (errorCode === 'USER_EXISTS' || errorCode === 'EMAIL_EXISTS' ||
        errorCode === 'CAPTCHA_INVALID' || errorCode === 'CAPTCHA_REQUIRED' ||
        errorCode === 'SERVER_ERROR') {
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

      // 不再重新抛出错误，避免触发 Unhandled Rejection Overlay
      // 错误已经通过 setRegisterError 显示在界面上了
    }
  };

  // 检测用户名是否存在
  const handleUsernameCheck = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameStatus(null);
      setUsernameMessage('');
      return;
    }

    // 验证用户名格式
    if (!/^\w+$/.test(username)) {
      setUsernameStatus(null);
      setUsernameMessage('');
      return;
    }

    setUsernameStatus('checking');
    setUsernameMessage(
      intl.formatMessage({ id: 'pages.register.username.checking' }),
    );

    try {
      const response = await checkUsernameExists(username);

      if (response.success && response.data) {
        if (response.data.exists) {
          setUsernameStatus('exists');
          setUsernameMessage('');
        } else {
          setUsernameStatus('available');
          setUsernameMessage(
            intl.formatMessage({ id: 'pages.register.username.available' }),
          );
        }
      } else {
        setUsernameStatus(null);
        setUsernameMessage('');
      }
    } catch (error) {
      console.error('检测用户名失败:', error);
      setUsernameStatus(null);
      setUsernameMessage('');
    }
  };

  // 处理用户名输入变化
  const handleUsernameChange = (value: string) => {
    setUsernameValue(value);
    // 清空之前的状态
    setUsernameStatus(null);
    setUsernameMessage('');
  };

  // 处理用户名失焦
  const handleUsernameBlur = () => {
    if (usernameValue && usernameValue.length >= 3) {
      handleUsernameCheck(usernameValue);
    }
  };

  const [form] = Form.useForm();

  return (
    <>
      <title>{pageTitle}</title>
      <div className={styles.container}>
        <Lang />
        <div className={styles.contentWrapper}>
          <div className={styles.formWrapper}>
            <Card className={styles.card}>
              <div className={styles.header}>
                <img alt="logo" src="/logo.svg" />
                <div className="title">
                  <FormattedMessage id="pages.register.title" />
                </div>
                <div className="subTitle">
                  <FormattedMessage id="pages.register.subTitle" />
                </div>
              </div>
              <Form
                form={form}
                onFinish={async (values) => {
                  await handleSubmit(values as API.RegisterParams);
                }}
                layout="vertical"
              >
                <Form.Item
                  name="username"
                  extra={
                    usernameMessage ? (
                      <Space style={{ color: usernameStatus === 'exists' ? '#ff4d4f' : '#52c41a', fontSize: '12px', marginTop: '4px' }}>
                        {usernameMessage}
                      </Space>
                    ) : null
                  }
                  rules={[
                    {
                      required: true,
                      message: <FormattedMessage id="pages.register.username.required" />,
                    },
                    {
                      min: 3,
                      message: <FormattedMessage id="pages.register.username.min" />,
                    },
                    {
                      pattern: /^\w+$/,
                      message: <FormattedMessage id="pages.register.username.pattern" />,
                    },
                    {
                      validator: async (_: any, value: string) => {
                        if (!value || value.length < 3) {
                          return Promise.resolve();
                        }

                        // 如果用户名格式不正确，不进行检测
                        if (!/^\w+$/.test(value)) {
                          return Promise.resolve();
                        }

                        // 如果已经检测过且存在，直接拒绝
                        if (usernameStatus === 'exists' && usernameValue === value) {
                          return Promise.reject(new Error(intl.formatMessage({ id: 'pages.register.username.exists' })));
                        }

                        // 如果检测结果为可用，通过验证
                        if (usernameStatus === 'available' && usernameValue === value) {
                          return Promise.resolve();
                        }

                        // 如果用户名变化了或还没检测过，进行检测
                        if (usernameValue !== value || usernameStatus === null) {
                          try {
                            const response = await checkUsernameExists(value);

                            if (response.success && response.data) {
                              if (response.data.exists) {
                                // 更新状态
                                setUsernameStatus('exists');
                                setUsernameMessage('');
                                setUsernameValue(value);
                                return Promise.reject(new Error(intl.formatMessage({ id: 'pages.register.username.exists' })));
                              } else {
                                // 更新状态
                                setUsernameStatus('available');
                                setUsernameMessage(intl.formatMessage({ id: 'pages.register.username.available' }));
                                setUsernameValue(value);
                                return Promise.resolve();
                              }
                            }
                          } catch (error) {
                            console.error('验证用户名失败:', error);
                            // 检测失败时允许提交，后端会再次验证
                            return Promise.resolve();
                          }
                        }

                        // 如果检测失败或未检测，允许提交（后端会再次验证）
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <Input
                    size="large"
                    prefix={<UserOutlined />}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      handleUsernameChange(e.target.value);
                    }}
                    onBlur={handleUsernameBlur}
                    suffix={usernameStatus === 'checking' ? (
                      <span style={{ color: '#1890ff' }}>
                        <FormattedMessage id="pages.register.username.checking" />
                      </span>
                    ) : usernameStatus === 'available' ? (
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    ) : null}
                    placeholder={intl.formatMessage({
                      id: 'pages.register.username.placeholder',
                    })}
                  />
                </Form.Item>

                <Form.Item
                  name="email"
                  rules={[
                    {
                      required: true,
                      message: <FormattedMessage id="pages.register.email.required" />,
                    },
                    {
                      type: 'email',
                      message: <FormattedMessage id="pages.register.email.invalid" />,
                    },
                  ]}
                >
                  <Input
                    size="large"
                    prefix={<MailOutlined />}
                    placeholder={intl.formatMessage({
                      id: 'pages.register.email.placeholder',
                    })}
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  rules={[
                    {
                      required: true,
                      message: <FormattedMessage id="pages.register.password.required" />,
                    },
                    {
                      min: 6,
                      message: <FormattedMessage id="pages.register.password.min" />,
                    },
                  ]}
                >
                  <Input.Password
                    size="large"
                    prefix={<LockOutlined />}
                    placeholder={intl.formatMessage({
                      id: 'pages.register.password.placeholder',
                    })}
                  />
                </Form.Item>

                {showCaptcha && (
                  <ImageCaptcha
                    ref={captchaRef}
                    value={captchaAnswer}
                    onChange={setCaptchaAnswer}
                    onCaptchaIdChange={setCaptchaId}
                    type="register"
                    placeholder={intl.formatMessage({
                      id: 'pages.register.captcha.placeholder',
                    })}
                    size="large"
                  />
                )}

                <div className={styles.infoBox}>
                  <div className="info-title">
                    <FormattedMessage id="pages.register.info.title" />
                  </div>
                  <div className="info-item">
                    <FormattedMessage id="pages.register.info.item1" />
                  </div>
                  <div className="info-item">
                    <FormattedMessage id="pages.register.info.item2" />
                  </div>
                  <div className="info-item">
                    <FormattedMessage id="pages.register.info.item3" />
                  </div>
                </div>

                <Form.Item>
                  <Button type="primary" htmlType="submit" size="large" block>
                    <FormattedMessage id="pages.register.submit" />
                  </Button>
                </Form.Item>

                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <Link
                    to="/user/login"
                    style={{ color: '#667eea', fontWeight: 500 }}
                  >
                    <FormattedMessage id="pages.register.login" />
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
}
