import { CheckCircleOutlined, CloseCircleOutlined, LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { history, Link, useIntl } from '@umijs/max';
import { Alert, App, Space } from 'antd';
import React, { useState, useRef } from 'react';
import { Footer } from '@/components';
import { register, checkUsernameExists } from '@/services/ant-design-pro/api';
import ImageCaptcha, { type ImageCaptchaRef } from '@/components/ImageCaptcha';

export default function Register() {
  const intl = useIntl();
  const { message } = App.useApp();
  const [registerError, setRegisterError] = useState<string>('');
  const [captchaId, setCaptchaId] = useState<string>('');
  const [captchaAnswer, setCaptchaAnswer] = useState<string>('');
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

      // 注册失败
      const errorMsg = response.errorMessage || '注册失败';
      setRegisterError(errorMsg);
      
      // 如果是验证码错误，自动刷新验证码
      if (response.errorCode === 'CAPTCHA_INVALID' || response.errorCode === 'CAPTCHA_REQUIRED') {
        if (captchaRef.current) {
          await captchaRef.current.refresh();
        }
      }
    } catch (error: any) {
      const errorMsg = error.message || '注册失败，请重试';
      setRegisterError(errorMsg);
      
      // 从错误对象中提取 errorCode（错误拦截器会在 error.info 中存储）
      const errorCode = error?.info?.errorCode || error?.errorCode;
      
      // 如果是验证码错误，自动刷新验证码
      if (errorCode === 'CAPTCHA_INVALID' || errorCode === 'CAPTCHA_REQUIRED') {
        if (captchaRef.current) {
          await captchaRef.current.refresh();
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'auto',
        backgroundImage:
          "url('https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/V-_oS6r-i7wAAAAAAAAAAAAAFl94AQBr')",
        backgroundSize: '100% 100%',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
        }}
      >
        <div style={{ width: '100%', maxWidth: '400px' }}>
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

            <ImageCaptcha
              ref={captchaRef}
              value={captchaAnswer}
              onChange={setCaptchaAnswer}
              onCaptchaIdChange={setCaptchaId}
              type="register"
              placeholder="请输入图形验证码"
              size="large"
            />

            <div
              style={{
                marginTop: 16,
                textAlign: 'center',
                background: '#f0f2f5',
                padding: '12px',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#666',
              }}
            >
              <div style={{ marginBottom: 8 }}>💡 注册成功后系统将为您：</div>
              <div>✅ 自动创建个人企业（您是管理员）</div>
              <div>✅ 配置默认权限和菜单</div>
              <div>✅ 您可以邀请成员或申请加入其他企业</div>
            </div>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Link to="/user/login">已有账号？立即登录</Link>
            </div>
          </LoginForm>
        </div>
      </div>
      <Footer />
    </div>
  );
}
