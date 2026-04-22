import * as API from '@/types';
import { LockOutlined } from '@ant-design/icons';
import { FormattedMessage, useIntl } from '@umijs/max';
import { Alert, App, Form, Input, Button } from 'antd';
import { ProCard } from '@ant-design/pro-components';
import { createStyles } from 'antd-style';
import React, { useState } from 'react';
import { changePassword } from '@/services/ant-design-pro/api';
import { PasswordEncryption } from '@/utils/encryption';
import Settings from '../../../../config/defaultSettings';

const useStyles = createStyles(() => {
  return {
    container: {
      padding: '24px',
      maxWidth: '600px',
      margin: '0 auto',
    },
    card: {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    },
  };
});

const ChangePasswordMessage: React.FC<{
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

const ChangePassword: React.FC = () => {
  const [changePasswordState, setChangePasswordState] =
    useState<API.ChangePasswordResult>({});
  const { styles } = useStyles();
  const { message } = App.useApp();
  const intl = useIntl();

  const handleSubmit = async (values: API.ChangePasswordParams) => {
    try {
      // 🔒 安全增强：在发送前加密密码
      const encryptedCurrentPassword = await PasswordEncryption.encrypt(values.currentPassword || '');
      const encryptedNewPassword = await PasswordEncryption.encrypt(values.newPassword || '');

      // 修改密码
      const result = await changePassword({
        ...values,
        currentPassword: encryptedCurrentPassword,
        newPassword: encryptedNewPassword,
      });
      if (result.success) {
        const defaultChangePasswordSuccessMessage = intl.formatMessage({
          id: 'pages.changePassword.success',
          defaultMessage: '密码修改成功！',
        });
        message.success(defaultChangePasswordSuccessMessage);

        // 修改成功后清空表单
        setChangePasswordState({});
        return;
      }

      // 如果失败，设置用户错误信息（用于表单显示）并抛出错误
      setChangePasswordState(result);
      throw new Error(result.message || intl.formatMessage({
        id: 'pages.changePassword.failure',
        defaultMessage: '密码修改失败，请重试！',
      }));
    } catch (error: any) {
      // 设置错误状态用于表单显示
      const errorCode = error?.info?.errorCode || error?.response?.data?.errorCode;
      if (errorCode || error?.info?.code || error?.code) {
        setChangePasswordState({
          code: errorCode || error.info?.code || error.code,
          message: error.info?.message || error.message,
        });
      }
      // 错误提示由全局错误处理统一处理，这里重新抛出确保全局处理能够捕获
      throw error;
    }
  };

  const { code, message: errorMsg } = changePasswordState;

  const pageTitle = intl.formatMessage({
    id: 'menu.account.changePassword',
    defaultMessage: '修改密码',
  }) + (Settings.title ? ` - ${Settings.title}` : '');

  return (
    <>
      <title>{pageTitle}</title>
      <div className={styles.container}>
        <ProCard
          title={intl.formatMessage({
            id: 'menu.account.changePassword',
            defaultMessage: '修改密码',
          })}
          className={styles.card}
        >
          <Form
            onFinish={async (values) => {
              await handleSubmit(values as API.ChangePasswordParams);
            }}
            layout="vertical"
          >
            {code && (
              <ChangePasswordMessage content={errorMsg || '密码修改失败'} />
            )}

            <Form.Item
              name="currentPassword"
              rules={[
                {
                  required: true,
                  message: (
                    <FormattedMessage
                      id="pages.changePassword.currentPassword.required"
                      defaultMessage="请输入当前密码!"
                    />
                  ),
                },
              ]}
            >
              <Input.Password
                size="middle"
                prefix={<LockOutlined />}
                placeholder={intl.formatMessage({
                  id: 'pages.changePassword.currentPassword.placeholder',
                  defaultMessage: '请输入当前密码',
                })}
              />
            </Form.Item>

            <Form.Item
              name="newPassword"
              rules={[
                {
                  required: true,
                  message: (
                    <FormattedMessage
                      id="pages.changePassword.newPassword.required"
                      defaultMessage="请输入新密码！"
                    />
                  ),
                },
                {
                  min: 6,
                  message: (
                    <FormattedMessage
                      id="pages.changePassword.newPassword.length"
                      defaultMessage="密码长度至少6个字符"
                    />
                  ),
                },
              ]}
            >
              <Input.Password
                size="middle"
                prefix={<LockOutlined />}
                placeholder={intl.formatMessage({
                  id: 'pages.changePassword.newPassword.placeholder',
                  defaultMessage: '请输入新密码',
                })}
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              dependencies={['newPassword']}
              rules={[
                {
                  required: true,
                  message: (
                    <FormattedMessage
                      id="pages.changePassword.confirmPassword.required"
                      defaultMessage="请确认新密码！"
                    />
                  ),
                },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不一致！'));
                  },
                }),
              ]}
            >
              <Input.Password
                size="middle"
                prefix={<LockOutlined />}
                placeholder={intl.formatMessage({
                  id: 'pages.changePassword.confirmPassword.placeholder',
                  defaultMessage: '请确认新密码',
                })}
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                size="middle"
                block
              >
                {intl.formatMessage({
                  id: 'pages.changePassword.submit',
                  defaultMessage: '修改密码',
                })}
              </Button>
            </Form.Item>
          </Form>
        </ProCard>
      </div>
    </>
  );
};

export default ChangePassword;
