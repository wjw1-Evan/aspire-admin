import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import {
  LoginForm,
  ProFormText,
} from '@ant-design/pro-components';
import { history, Link } from '@umijs/max';
import { Alert, App } from 'antd';
import React, { useState } from 'react';
import { Footer } from '@/components';
import { register } from '@/services/ant-design-pro/api';
import { tokenUtils } from '@/utils/token';

export default function Register() {
  const { message } = App.useApp();
  const [registerError, setRegisterError] = useState<string>('');

  const handleSubmit = async (values: API.RegisterParams) => {
    try {
      setRegisterError('');
      
      const response = await register(values);

      if (response.success && response.data) {
        message.success('注册成功！已为您自动创建个人企业，正在跳转...');
        
        // 自动登录（注册成功后）
        setTimeout(() => {
          history.push('/user/login');
        }, 1500);
        
        return;
      }

      // 注册失败
      setRegisterError(response.errorMessage || '注册失败');
    } catch (error: any) {
      setRegisterError(error.message || '注册失败，请重试');
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
              }}
              placeholder="用户名（全局唯一）"
              rules={[
                {
                  required: true,
                  message: '请输入用户名！',
                },
                {
                  min: 3,
                  message: '用户名至少3个字符',
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
              <div style={{ marginBottom: 8 }}>
                💡 注册成功后系统将为您：
              </div>
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
