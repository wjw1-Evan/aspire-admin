import { useState } from 'react';
import { history } from '@umijs/max';
import { LoginForm, ProFormText, ProFormTextArea } from '@ant-design/pro-components';
import { message, Typography, Tabs } from 'antd';
import {
  BankOutlined,
  UserOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import { registerCompany, checkCompanyCode } from '@/services/company';
import { tokenUtils } from '@/utils/token';
import { Footer } from '@/components';

const { Text, Link } = Typography;

export default function CompanyRegister() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  const handleSubmit = async (values: API.RegisterCompanyRequest) => {
    setLoading(true);

    try {
      const response = await registerCompany(values);

      if (response.success && response.data) {
        message.success('企业注册成功！正在为您登录...');

        // 保存登录凭证
        const { token, refreshToken, expiresAt } = response.data;
        if (token && refreshToken) {
          const expiresAtTime = expiresAt ? new Date(expiresAt).getTime() : undefined;
          tokenUtils.setTokens(token, refreshToken, expiresAtTime);

          // 延迟跳转
          setTimeout(() => {
            history.push('/');
          }, 800);
        }
      } else {
        message.error(response.errorMessage || '企业注册失败');
      }
    } catch (error: any) {
      message.error(error.message || '企业注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 验证企业代码可用性
  const validateCompanyCode = async (_: any, value: string) => {
    if (!value || value.length < 3) {
      return Promise.resolve();
    }

    try {
      const response = await checkCompanyCode(value);
      if (response.success && response.data) {
        if (!response.data.available) {
          return Promise.reject(new Error('企业代码已被使用'));
        }
      }
      return Promise.resolve();
    } catch (error) {
      return Promise.resolve();
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
      <div style={{ flex: 1, padding: '32px 0' }}>
        <LoginForm
          contentStyle={{
            minWidth: 280,
            maxWidth: '75vw',
          }}
          logo={<img alt="logo" src="/logo.svg" />}
          title="企业注册"
          subTitle="创建您的企业账户，开始使用系统"
          submitter={{
            searchConfig: {
              submitText: '立即注册',
            },
            submitButtonProps: {
              loading,
              size: 'large',
              style: { width: '100%' },
            },
          }}
          onFinish={async (values) => {
            await handleSubmit(values as API.RegisterCompanyRequest);
          }}
        >
          <Tabs
            centered
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'info',
                label: '企业信息',
              },
              {
                key: 'admin',
                label: '管理员设置',
              },
            ]}
          />

          {activeTab === 'info' && (
            <>
              <ProFormText
                name="companyName"
                placeholder="企业名称"
                fieldProps={{
                  size: 'large',
                  prefix: <BankOutlined />,
                }}
                rules={[
                  { required: true, message: '请输入企业名称' },
                  { min: 2, max: 100, message: '企业名称长度必须在2-100个字符之间' },
                ]}
              />

              <ProFormText
                name="companyCode"
                placeholder="企业代码（字母、数字、下划线、横线）"
                tooltip="企业代码用于唯一标识您的企业，注册后不可修改"
                fieldProps={{
                  size: 'large',
                  prefix: <BankOutlined />,
                }}
                rules={[
                  { required: true, message: '请输入企业代码' },
                  { min: 3, max: 20, message: '企业代码长度必须在3-20个字符之间' },
                  {
                    pattern: /^[a-zA-Z0-9_-]+$/,
                    message: '企业代码只能包含字母、数字、下划线和横线',
                  },
                  { validator: validateCompanyCode },
                ]}
              />

              <ProFormText
                name="industry"
                placeholder="所属行业（选填）"
                fieldProps={{
                  size: 'large',
                  prefix: <BankOutlined />,
                }}
                rules={[{ max: 50, message: '行业名称不能超过50个字符' }]}
              />

              <ProFormText
                name="contactName"
                placeholder="联系人姓名（选填）"
                fieldProps={{
                  size: 'large',
                  prefix: <UserOutlined />,
                }}
                rules={[{ max: 50, message: '联系人长度不能超过50个字符' }]}
              />

              <ProFormText
                name="contactPhone"
                placeholder="联系电话（选填）"
                fieldProps={{
                  size: 'large',
                  prefix: <PhoneOutlined />,
                }}
                rules={[
                  {
                    pattern: /^1[3-9]\d{9}$/,
                    message: '请输入有效的手机号码',
                  },
                ]}
              />
            </>
          )}

          {activeTab === 'admin' && (
            <>
              <ProFormText
                name="adminUsername"
                placeholder="管理员用户名"
                fieldProps={{
                  size: 'large',
                  prefix: <UserOutlined />,
                }}
                rules={[
                  { required: true, message: '请输入管理员用户名' },
                  { min: 3, max: 50, message: '用户名长度必须在3-50个字符之间' },
                ]}
              />

              <ProFormText.Password
                name="adminPassword"
                placeholder="管理员密码（至少6个字符）"
                fieldProps={{
                  size: 'large',
                  prefix: <LockOutlined />,
                }}
                rules={[
                  { required: true, message: '请输入管理员密码' },
                  { min: 6, max: 100, message: '密码长度至少6个字符' },
                ]}
              />

              <ProFormText.Password
                name="confirmPassword"
                placeholder="确认密码"
                fieldProps={{
                  size: 'large',
                  prefix: <LockOutlined />,
                }}
                rules={[
                  { required: true, message: '请再次输入密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('adminPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'));
                    },
                  }),
                ]}
              />

              <ProFormText
                name="adminEmail"
                placeholder="管理员邮箱"
                fieldProps={{
                  size: 'large',
                  prefix: <MailOutlined />,
                }}
                rules={[
                  { required: true, message: '请输入管理员邮箱' },
                  { type: 'email', message: '邮箱格式不正确' },
                ]}
              />
            </>
          )}

          <div style={{ marginTop: 24, marginBottom: 24, textAlign: 'center' }}>
            <Text type="secondary">已有账户？</Text>
            <Link onClick={() => history.push('/user/login')} style={{ marginLeft: 8 }}>
              立即登录
            </Link>
          </div>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              注册即表示您同意我们的服务条款和隐私政策
            </Text>
          </div>
        </LoginForm>
      </div>
      <Footer />
    </div>
  );
}

