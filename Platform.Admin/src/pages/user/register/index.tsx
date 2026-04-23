import * as API from '@/types';
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
import { App, Button, Form, Input, Space } from 'antd';
import { ProCard, ProForm, ProFormText } from '@ant-design/pro-components';
import { createStyles } from 'antd-style';
import React, { useState } from 'react';
import { Footer } from '@/components';
import { checkUsernameExists, register } from '@/services/ant-design-pro/api';
import { PasswordEncryption } from '@/utils/encryption';
import Settings from '../../../../config/defaultSettings';
import { REGISTER_KNOWN_ERRORS } from '@/constants/errorCodes';

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
    header: {
      textAlign: 'center',
      marginBottom: 24,
    },
    title: {
      fontSize: 28,
      fontWeight: 600,
      color: '#1a1a1a',
      marginBottom: 8,
    },
    subTitle: {
      fontSize: 14,
      color: '#666',
      marginBottom: 32,
    },
    infoBox: {
      marginTop: 16,
      textAlign: 'center',
      background:
        'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
      padding: '16px',
      borderRadius: '12px',
      color: '#666',
      border: '1px solid rgba(102, 126, 234, 0.2)',
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
  const [form] = Form.useForm();

  // 用户名检测状态
  const [usernameStatus, setUsernameStatus] = useState<
    'checking' | 'available' | 'exists' | null
  >(null);
  const [usernameMessage, setUsernameMessage] = useState<string>('');
  const [usernameValue, setUsernameValue] = useState<string>('');

  const pageTitle = `${intl.formatMessage({ id: 'pages.register.title' })} - ${Settings.title}`;

  const handleSubmit = async (values: API.RegisterParams) => {
    try {
      const encryptedPassword = values.password
        ? await PasswordEncryption.encrypt(values.password)
        : '';

      const response = await register({
        ...values,
        password: encryptedPassword,
      });

      if (response.success && response.data) {
        message.success(intl.formatMessage({ id: 'pages.message.registerSuccess' }));

        setTimeout(() => {
          history.push('/user/login');
        }, 1500);

        return;
      }

      const errorMsg = response.message || intl.formatMessage({ id: 'pages.login.failure' });

      throw new Error(errorMsg);
    } catch (error: any) {
      const validationErrors = error?.response?.data?.errors;
      const isValidationError = error?.response?.status === 400 && validationErrors;

      if (isValidationError && validationErrors) {
        const fieldErrors = Object.entries(validationErrors).map(([field, msgs]) => ({
          name: field as any,
          errors: Array.isArray(msgs) ? [msgs[0] as string] : [msgs as string],
        }));
        form.setFields(fieldErrors);
      } else {
        const errorMsg = error?.info?.message || error?.message || error?.response?.data?.message;
        if (errorMsg) {
          message.error(errorMsg);
        }
      }
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

  return (
    <>
      <title>{pageTitle}</title>
      <div className={styles.container}>
        <Lang />
        <div className={styles.contentWrapper}>
          <div className={styles.formWrapper}>
            <ProCard className={styles.card}>
              <div className={styles.header}>
                <img alt="logo" src="/logo.svg" style={{ width: 64, height: 64, marginBottom: 16 }} />
                <div className={styles.title}>
                  <FormattedMessage id="pages.register.title" />
                </div>
                <div className={styles.subTitle}>
                  <FormattedMessage id="pages.register.subTitle" />
                </div>
              </div>
              <ProForm
                form={form}
                onFinish={async (values) => {
                  await handleSubmit(values as API.RegisterParams);
                }}
                submitter={{
                  submitButtonProps: { size: 'middle', block: true },
                }}
              >
                <ProFormText
                  name="username"
                  placeholder={intl.formatMessage({ id: 'pages.register.username.placeholder' })}
                  fieldProps={{
                    prefix: <UserOutlined />,
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleUsernameChange(e.target.value),
                    onBlur: handleUsernameBlur,
                    suffix: usernameStatus === 'checking' ? (
                      <span style={{ color: '#1890ff' }}>
                        <FormattedMessage id="pages.register.username.checking" />
                      </span>
                    ) : usernameStatus === 'available' ? (
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    ) : null,
                  }}
                  extra={usernameMessage ? (
                    <Space style={{ color: usernameStatus === 'exists' ? '#ff4d4f' : '#52c41a', fontSize: '12px', marginTop: '4px' }}>
                      {usernameMessage}
                    </Space>
                  ) : null}
                  rules={[
                    { required: true, message: <FormattedMessage id="pages.register.username.required" /> },
                    { min: 3, message: <FormattedMessage id="pages.register.username.min" /> },
                    { pattern: /^\w+$/, message: <FormattedMessage id="pages.register.username.pattern" /> },
                  ]}
                />

                <ProFormText
                  name="email"
                  placeholder={intl.formatMessage({ id: 'pages.register.email.placeholder' })}
                  fieldProps={{ prefix: <MailOutlined /> }}
                  rules={[
                    { required: true, message: <FormattedMessage id="pages.register.email.required" /> },
                    { type: 'email', message: <FormattedMessage id="pages.register.email.invalid" /> },
                  ]}
                />

<ProFormText
                  name="password"
                  placeholder={intl.formatMessage({ id: 'pages.register.password.placeholder' })}
                  fieldProps={{ prefix: <LockOutlined />, type: 'password' }}
                  rules={[
                    { required: true, message: <FormattedMessage id="pages.register.password.required" /> },
                    { min: 6, message: <FormattedMessage id="pages.register.password.min" /> },
                  ]}
                />

                <ProFormText
                  name="confirmPassword"
                  placeholder={intl.formatMessage({ id: 'pages.register.confirmPassword.placeholder' })}
                  fieldProps={{ prefix: <LockOutlined />, type: 'password' }}
                  rules={[
                    { required: true, message: <FormattedMessage id="pages.register.confirmPassword.required" /> },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error(intl.formatMessage({ id: 'pages.register.confirmPassword.mismatch' })));
                      },
                    }),
                  ]}
                />


              </ProForm>
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Link to="/user/login" style={{ color: '#667eea', fontWeight: 500 }}>
                  <FormattedMessage id="pages.register.login" />
                </Link>
              </div>
            </ProCard>
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
}
