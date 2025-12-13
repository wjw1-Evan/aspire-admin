import { CheckCircleOutlined, CloseCircleOutlined, LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { history, Link, useIntl } from '@umijs/max';
import { Alert, App, Space } from 'antd';
import { createStyles } from 'antd-style';
import React, { useState, useRef } from 'react';
import { Footer } from '@/components';
import { register, checkUsernameExists } from '@/services/ant-design-pro/api';
import ImageCaptcha, { type ImageCaptchaRef } from '@/components/ImageCaptcha';

const useStyles = createStyles(({ token }) => {
  return {
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
    infoBox: {
      marginTop: 16,
      textAlign: 'center',
      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
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

export default function Register() {
  const intl = useIntl();
  const { message } = App.useApp();
  const { styles } = useStyles();
  const [registerError, setRegisterError] = useState<string>('');
  const [captchaId, setCaptchaId] = useState<string>('');
  const [captchaAnswer, setCaptchaAnswer] = useState<string>('');
  const [showCaptcha, setShowCaptcha] = useState<boolean>(false); // 控制验证码显示
  const captchaRef = useRef<ImageCaptchaRef>(null);
  
  // 用户名检测状态
  const [usernameStatus, setUsernameStatus] = useState<'checking' | 'available' | 'exists' | null>(null);
  const [usernameMessage, setUsernameMessage] = useState<string>('');
  const [usernameValue, setUsernameValue] = useState<string>('');

  const handleSubmit = async (values: API.RegisterParams) => {
    try {
      setRegisterError('');

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
      const errorMsg = response.errorMessage || '注册失败';
      
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
      
      // 设置错误状态（用于表单显示）
      const errorMsg = 
        error?.info?.errorMessage || 
        error?.response?.data?.errorMessage || 
        error?.message || 
        '注册失败，请重试';
      setRegisterError(errorMsg);
      
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
      
      // 重新抛出错误，确保全局错误处理能够处理
      throw error;
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
    setUsernameMessage('正在检测用户名...');

    try {
      const response = await checkUsernameExists(username);
      
      if (response.success && response.data) {
        if (response.data.exists) {
          setUsernameStatus('exists');
          setUsernameMessage('用户名已存在，请更换');
        } else {
          setUsernameStatus('available');
          setUsernameMessage('用户名可用');
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
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        <div className={styles.formWrapper}>
          <LoginForm
            logo={<img alt="logo" src="/logo.svg" />}
            title="用户注册"
            subTitle="注册即自动创建您的个人企业"
            onFinish={async (values) => {
              await handleSubmit(values as API.RegisterParams);
            }}
            submitter={{
              searchConfig: {
                submitText: '立即注册',
              },
            }}
          >
            {registerError && (
              <Alert
                style={{ marginBottom: 24 }}
                message={registerError}
                type="error"
                showIcon
                closable
                onClose={() => setRegisterError('')}
              />
            )}

            <ProFormText
              name="username"
              fieldProps={{
                size: 'large',
                prefix: <UserOutlined />,
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                  handleUsernameChange(e.target.value);
                },
                onBlur: handleUsernameBlur,
                suffix: usernameStatus === 'checking' ? (
                  <span style={{ color: '#1890ff' }}>检测中...</span>
                ) : usernameStatus === 'available' ? (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                ) : usernameStatus === 'exists' ? (
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                ) : null,
              }}
              placeholder="用户名（全局唯一）"
              extra={
                usernameMessage ? (
                  <Space style={{ color: usernameStatus === 'exists' ? '#ff4d4f' : '#52c41a', fontSize: '12px', marginTop: '4px' }}>
                    {usernameStatus === 'checking' && '⏳ 正在检测用户名...'}
                    {usernameStatus === 'available' && '✅ 用户名可用'}
                    {usernameStatus === 'exists' && '❌ 用户名已存在'}
                  </Space>
                ) : null
              }
              rules={[
                {
                  required: true,
                  message: '请输入用户名！',
                },
                {
                  min: 3,
                  message: '用户名至少3个字符',
                },
                {
                  pattern: /^\w+$/,
                  message: '用户名只能包含字母、数字和下划线',
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
                      return Promise.reject(new Error('用户名已存在'));
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
                            setUsernameMessage('用户名已存在，请更换');
                            setUsernameValue(value);
                            return Promise.reject(new Error('用户名已存在'));
                          } else {
                            // 更新状态
                            setUsernameStatus('available');
                            setUsernameMessage('用户名可用');
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
            />

            <ProFormText
              name="email"
              fieldProps={{
                size: 'large',
                prefix: <MailOutlined />,
              }}
              placeholder="邮箱地址（可选）"
              rules={[
                {
                  type: 'email',
                  message: '邮箱格式不正确',
                },
              ]}
            />

            <ProFormText.Password
              name="password"
              fieldProps={{
                size: 'large',
                prefix: <LockOutlined />,
              }}
              placeholder="密码（至少6个字符）"
              rules={[
                {
                  required: true,
                  message: '请输入密码！',
                },
                {
                  min: 6,
                  message: '密码至少6个字符',
                },
              ]}
            />

            {showCaptcha && (
              <ImageCaptcha
                ref={captchaRef}
                value={captchaAnswer}
                onChange={setCaptchaAnswer}
                onCaptchaIdChange={setCaptchaId}
                type="register"
                placeholder="请输入图形验证码"
                size="large"
              />
            )}

            <div className={styles.infoBox}>
              <div className="info-title">💡 注册成功后系统将为您：</div>
              <div className="info-item">✅ 自动创建个人企业（您是管理员）</div>
              <div className="info-item">✅ 配置默认权限和菜单</div>
              <div className="info-item">✅ 您可以邀请成员或申请加入其他企业</div>
            </div>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Link to="/user/login" style={{ color: '#667eea', fontWeight: 500 }}>
                已有账号？立即登录
              </Link>
            </div>
          </LoginForm>
        </div>
      </div>
      <Footer />
    </div>
  );
}
