import * as API from '@/types';
import { LockOutlined, MailOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { FormattedMessage, Link, useIntl, history } from '@umijs/max';
import { App, Button, Form, Input, Space, Steps } from 'antd';
import { ProCard } from '@ant-design/pro-components';
import { createStyles } from 'antd-style';
import React, { useState, useEffect } from 'react';
import { Footer, SelectLang } from '@/components';
import { sendResetCode, resetPassword } from '@/services/ant-design-pro/api';
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
      maxWidth: 500,
    },
    card: {
      width: '100%',
      maxWidth: '100%',
    },
  };
});

const ForgotPasswordContainer: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const [formEmail] = Form.useForm();
  const [formReset] = Form.useForm();
  
  const { styles } = useStyles();
  const { message } = App.useApp();
  const intl = useIntl();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

  const handleSendCode = async (values: { email: string }) => {
    try {
      setLoading(true);
      const res = await sendResetCode({ email: values.email });
      if (res.success) {
        message.success(intl.formatMessage({ id: 'pages.forgotPassword.sendCodeSuccess', defaultMessage: '验证码已发送至您的邮箱' }));
        setEmail(values.email);
        setCurrentStep(1);
        setCountdown(60);
      } else {
        message.error(res.message || intl.formatMessage({ id: 'pages.forgotPassword.sendCodeFailed', defaultMessage: '验证码发送失败，请检查邮箱是否正确' }));
      }
    } catch (error: any) {
      error.skipGlobalHandler = true;
      const validationErrors = error?.response?.data?.errors;
      const isValidationError = error?.response?.status === 400 && validationErrors;

      if (isValidationError && validationErrors) {
        formEmail.setFields(
          Object.entries(validationErrors).map(([field, msgs]) => ({
            name: field as any,
            errors: Array.isArray(msgs) ? [msgs[0] as string] : [msgs as string],
          }))
        );
      } else {
        const errorMsg = error?.response?.data?.message || error?.message || '验证码发送失败';
        message.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) return;
    try {
      const res = await sendResetCode({ email });
      if (res.success) {
        message.success(intl.formatMessage({ id: 'pages.forgotPassword.sendCodeSuccess', defaultMessage: '验证码已发送至您的邮箱' }));
        setCountdown(60);
      } else {
        message.error(res.message || '获取验证码失败');
      }
    } catch (error: any) {
      error.skipGlobalHandler = true;
      message.error('获取验证码失败');
    }
  };

  const handleResetPassword = async (values: API.ResetPasswordParams) => {
    try {
      setLoading(true);
      // 🔒 安全增强：加密密码
      // 注意：加密必须是确定性的，或者在这里只加密一次并重用，
      // 因为后端会使用 [Compare] 特性校验 newPassword 和 confirmPassword 的原始值（此处为密文）。
      const encryptedPassword = values.newPassword ? await PasswordEncryption.encrypt(values.newPassword) : '';

      const res = await resetPassword({
        email,
        code: values.code,
        newPassword: encryptedPassword,
        confirmPassword: encryptedPassword,
      });

      if (res.success) {
        message.success(intl.formatMessage({ id: 'pages.forgotPassword.resetSuccess', defaultMessage: '重置密码成功，请使用新密码重新登录' }));
        setCurrentStep(2);
      } else {
        message.error(res.message || intl.formatMessage({ id: 'pages.forgotPassword.resetFailed', defaultMessage: '重置密码失败，验证码错误或已过期' }));
      }
    } catch (error: any) {
      error.skipGlobalHandler = true;
      const validationErrors = error?.response?.data?.errors;
      const isValidationError = error?.response?.status === 400 && validationErrors;

      if (isValidationError && validationErrors) {
        formReset.setFields(
          Object.entries(validationErrors).map(([field, msgs]) => ({
            name: field as any,
            errors: Array.isArray(msgs) ? [msgs[0] as string] : [msgs as string],
          }))
        );
      } else {
        const errorMsg = error?.response?.data?.message || error?.message || '重置密码失败';
        message.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.lang} data-lang>
        {SelectLang && <SelectLang />}
      </div>
      <div className={styles.contentWrapper}>
        <div className={styles.formWrapper}>
          <ProCard className={styles.card}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <img alt="logo" src="/logo.svg" style={{ width: 64, height: 64, marginBottom: 16 }} />
              <div style={{ fontSize: 24, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>
                <FormattedMessage id="pages.forgotPassword.title" defaultMessage="找回密码" />
              </div>
            </div>

            <Steps
              current={currentStep}
              items={[
                { title: intl.formatMessage({ id: 'pages.forgotPassword.step1', defaultMessage: '填写邮箱' }) },
                { title: intl.formatMessage({ id: 'pages.forgotPassword.step2', defaultMessage: '重置密码' }) },
                { title: intl.formatMessage({ id: 'pages.forgotPassword.step3', defaultMessage: '完成' }) },
              ]}
              style={{ marginBottom: 32 }}
            />

            {currentStep === 0 && (
              <Form
                form={formEmail}
                layout="vertical"
                onFinish={handleSendCode}
              >
                <Form.Item
                  name="email"
                  rules={[
                    { required: true, message: <FormattedMessage id="pages.forgotPassword.emailRequired" defaultMessage="请输入注册邮箱！" /> },
                    { type: 'email', message: <FormattedMessage id="pages.forgotPassword.emailInvalid" defaultMessage="请输入有效的邮箱地址！" /> },
                  ]}
                >
                  <Input
                    size="middle"
                    prefix={<MailOutlined />}
                    placeholder={intl.formatMessage({ id: 'pages.forgotPassword.emailPlaceholder', defaultMessage: '注册时使用的邮箱' })}
                  />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" size="middle" block loading={loading}>
                    <FormattedMessage id="pages.forgotPassword.nextStep" defaultMessage="下一步" />
                  </Button>
                </Form.Item>
              </Form>
            )}

            {currentStep === 1 && (
              <Form
                form={formReset}
                layout="vertical"
                onFinish={handleResetPassword}
              >
                <Form.Item
                  name="code"
                  rules={[{ required: true, message: <FormattedMessage id="pages.forgotPassword.codeRequired" defaultMessage="请输入验证码！" /> }]}
                >
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      size="middle"
                      prefix={<SafetyCertificateOutlined />}
                      placeholder={intl.formatMessage({ id: 'pages.forgotPassword.codePlaceholder', defaultMessage: '6位邮箱验证码' })}
                      maxLength={6}
                    />
                    <Button 
                      size="middle" 
                      onClick={handleResendCode} 
                      disabled={countdown > 0}
                      style={{ width: '120px' }}
                    >
                      {countdown > 0 ? `${countdown}s` : intl.formatMessage({ id: 'pages.forgotPassword.resendCode', defaultMessage: '重新获取' })}
                    </Button>
                  </Space.Compact>
                </Form.Item>
                <Form.Item
                  name="newPassword"
                  rules={[
                    { required: true, message: <FormattedMessage id="pages.forgotPassword.passwordRequired" defaultMessage="请输入新密码！" /> },
                    { min: 6, message: <FormattedMessage id="pages.forgotPassword.passwordMinLength" defaultMessage="密码长度不能小于6位！" /> },
                  ]}
                >
                  <Input.Password
                    size="middle"
                    prefix={<LockOutlined />}
                    placeholder={intl.formatMessage({ id: 'pages.forgotPassword.newPasswordPlaceholder', defaultMessage: '新密码' })}
                  />
                </Form.Item>
                <Form.Item
                  name="confirmPassword"
                  dependencies={['newPassword']}
                  rules={[
                    { required: true, message: <FormattedMessage id="pages.forgotPassword.confirmPasswordRequired" defaultMessage="请确认新密码！" /> },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('newPassword') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error(intl.formatMessage({ id: 'pages.forgotPassword.passwordMismatch', defaultMessage: '两次输入的密码不匹配！' })));
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    size="middle"
                    prefix={<LockOutlined />}
                    placeholder={intl.formatMessage({ id: 'pages.forgotPassword.confirmPasswordPlaceholder', defaultMessage: '确认新密码' })}
                  />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" size="middle" block loading={loading}>
                    <FormattedMessage id="pages.forgotPassword.submit" defaultMessage="重置密码" />
                  </Button>
                </Form.Item>
              </Form>
            )}

            {currentStep === 2 && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 16, color: '#52c41a', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <SafetyCertificateOutlined style={{ fontSize: 24 }} />
                  <span>
                    <FormattedMessage id="pages.forgotPassword.successTitle" defaultMessage="密码重置成功！" />
                  </span>
                </div>
                <Button type="primary" size="middle" onClick={() => history.push('/user/login')} block>
                  <FormattedMessage id="pages.forgotPassword.backToLogin" defaultMessage="返回登录界面" />
                </Button>
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Link to="/user/login">
                <FormattedMessage id="pages.forgotPassword.loginLink" defaultMessage="想起密码了？返回登录" />
              </Link>
            </div>
          </ProCard>
        </div>
      </div>
      <Footer />
    </div>
  );
};

const ForgotPassword: React.FC = () => {
  return (
    <App>
      <ForgotPasswordContainer />
    </App>
  );
};

export default ForgotPassword;
