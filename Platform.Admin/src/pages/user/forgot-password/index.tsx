import { LockOutlined, MailOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { FormattedMessage, history, Link, useIntl } from '@umijs/max';
import { App, Button, Form, Input, Space, Steps } from 'antd';
import { createStyles } from 'antd-style';
import React, { useEffect, useState } from 'react';
import { Footer, SelectLang } from '@/components';
import { resetPassword, sendResetCode } from '@/services/ant-design-pro/api';
import * as API from '@/types';
import { PasswordEncryption } from '@/utils/encryption';
import { ProCard } from '@ant-design/pro-components';


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
        message.success(intl.formatMessage({ id: 'pages.forgotPassword.sendCodeSuccess' }));
        setEmail(values.email);
        setCurrentStep(1);
        setCountdown(60);
      } else {
        message.error(res.message || intl.formatMessage({ id: 'pages.forgotPassword.sendCodeFailed' }));
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
          })),
        );
      } else {
        const errorMsg =
          error?.response?.data?.message ||
          error?.message ||
          intl.formatMessage({ id: 'pages.forgotPassword.sendCodeError' });
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
        message.success(intl.formatMessage({ id: 'pages.forgotPassword.sendCodeSuccess' }));
        setCountdown(60);
      } else {
        message.error(res.message || intl.formatMessage({ id: 'pages.forgotPassword.sendCodeError' }));
      }
    } catch (error: any) {
      error.skipGlobalHandler = true;
      message.error(intl.formatMessage({ id: 'pages.forgotPassword.sendCodeError' }));
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
        message.success(intl.formatMessage({ id: 'pages.forgotPassword.resetSuccess' }));
        setCurrentStep(2);
      } else {
        message.error(res.message || intl.formatMessage({ id: 'pages.forgotPassword.resetFailed' }));
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
          })),
        );
      } else {
        const errorMsg =
          error?.response?.data?.message ||
          error?.message ||
          intl.formatMessage({ id: 'pages.forgotPassword.resetError' });
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
              <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--ant-color-text)', marginBottom: 8 }}>
                <FormattedMessage id="pages.forgotPassword.title" />
              </div>
            </div>

            <Steps
              current={currentStep}
              items={[
                { title: intl.formatMessage({ id: 'pages.forgotPassword.step1' }) },
                { title: intl.formatMessage({ id: 'pages.forgotPassword.step2' }) },
                { title: intl.formatMessage({ id: 'pages.forgotPassword.step3' }) },
              ]}
              style={{ marginBottom: 32 }}
            />

            {currentStep === 0 && (
              <Form form={formEmail} layout="vertical" onFinish={handleSendCode}>
                <Form.Item
                  name="email"
                  rules={[
                    { required: true, message: <FormattedMessage id="pages.forgotPassword.emailRequired" /> },
                    { type: 'email', message: <FormattedMessage id="pages.forgotPassword.emailInvalid" /> },
                  ]}
                >
                  <Input
                    size="middle"
                    prefix={<MailOutlined />}
                    placeholder={intl.formatMessage({ id: 'pages.forgotPassword.emailPlaceholder' })}
                  />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" size="middle" block loading={loading}>
                    <FormattedMessage id="pages.forgotPassword.nextStep" />
                  </Button>
                </Form.Item>
              </Form>
            )}

            {currentStep === 1 && (
              <Form form={formReset} layout="vertical" onFinish={handleResetPassword}>
                <Form.Item
                  name="code"
                  rules={[{ required: true, message: <FormattedMessage id="pages.forgotPassword.codeRequired" /> }]}
                >
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      size="middle"
                      prefix={<SafetyCertificateOutlined />}
                      placeholder={intl.formatMessage({ id: 'pages.forgotPassword.codePlaceholder' })}
                      maxLength={6}
                    />
                    <Button
                      size="middle"
                      onClick={handleResendCode}
                      disabled={countdown > 0}
                      style={{ width: '120px' }}
                    >
                      {countdown > 0 ? `${countdown}s` : intl.formatMessage({ id: 'pages.forgotPassword.resendCode' })}
                    </Button>
                  </Space.Compact>
                </Form.Item>
                <Form.Item
                  name="newPassword"
                  rules={[
                    { required: true, message: <FormattedMessage id="pages.forgotPassword.passwordRequired" /> },
                    { min: 6, message: <FormattedMessage id="pages.forgotPassword.passwordMinLength" /> },
                  ]}
                >
                  <Input.Password
                    size="middle"
                    prefix={<LockOutlined />}
                    placeholder={intl.formatMessage({ id: 'pages.forgotPassword.newPasswordPlaceholder' })}
                  />
                </Form.Item>
                <Form.Item
                  name="confirmPassword"
                  dependencies={['newPassword']}
                  rules={[
                    { required: true, message: <FormattedMessage id="pages.forgotPassword.confirmPasswordRequired" /> },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('newPassword') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(
                          new Error(intl.formatMessage({ id: 'pages.forgotPassword.passwordMismatch' })),
                        );
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    size="middle"
                    prefix={<LockOutlined />}
                    placeholder={intl.formatMessage({ id: 'pages.forgotPassword.confirmPasswordPlaceholder' })}
                  />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" size="middle" block loading={loading}>
                    <FormattedMessage id="pages.forgotPassword.submit" />
                  </Button>
                </Form.Item>
              </Form>
            )}

            {currentStep === 2 && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div
                  style={{
                    fontSize: 16,
                    color: '#52c41a',
                    marginBottom: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <SafetyCertificateOutlined style={{ fontSize: 24 }} />
                  <span>
                    <FormattedMessage id="pages.forgotPassword.successTitle" />
                  </span>
                </div>
                <Button type="primary" size="middle" onClick={() => history.push('/user/login')} block>
                  <FormattedMessage id="pages.forgotPassword.backToLogin" />
                </Button>
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Link to="/user/login">
                <FormattedMessage id="pages.forgotPassword.loginLink" />
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
