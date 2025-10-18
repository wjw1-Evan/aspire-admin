import { LockOutlined } from '@ant-design/icons';
import { ProForm, ProFormText } from '@ant-design/pro-components';
import { FormattedMessage, Helmet, useIntl } from '@umijs/max';
import { Alert, App, Card } from 'antd';
import { createStyles } from 'antd-style';
import React, { useState } from 'react';
import { changePassword } from '@/services/ant-design-pro/api';
import Settings from '../../../../config/defaultSettings';

const useStyles = createStyles(({ token }) => {
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
      // 修改密码
      const result = await changePassword(values);
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

      // 如果失败去设置用户错误信息
      setChangePasswordState(result);
    } catch (error) {
      const defaultChangePasswordFailureMessage = intl.formatMessage({
        id: 'pages.changePassword.failure',
        defaultMessage: '密码修改失败，请重试！',
      });
      console.log(error);
      message.error(defaultChangePasswordFailureMessage);
    }
  };

  const { errorCode, errorMessage } = changePasswordState;

  return (
    <div className={styles.container}>
      <Helmet>
        <title>
          {intl.formatMessage({
            id: 'menu.changePassword',
            defaultMessage: '修改密码',
          })}
          {Settings.title && ` - ${Settings.title}`}
        </title>
      </Helmet>

      <Card
        title={intl.formatMessage({
          id: 'menu.changePassword',
          defaultMessage: '修改密码',
        })}
        className={styles.card}
      >
        <ProForm
          onFinish={async (values) => {
            await handleSubmit(values as API.ChangePasswordParams);
          }}
          submitter={{
            searchConfig: {
              submitText: intl.formatMessage({
                id: 'pages.changePassword.submit',
                defaultMessage: '修改密码',
              }),
            },
          }}
        >
          {errorCode && (
            <ChangePasswordMessage content={errorMessage || '密码修改失败'} />
          )}

          <ProFormText.Password
            name="currentPassword"
            fieldProps={{
              size: 'large',
              prefix: <LockOutlined />,
            }}
            placeholder={intl.formatMessage({
              id: 'pages.changePassword.currentPassword.placeholder',
              defaultMessage: '请输入当前密码',
            })}
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
          />

          <ProFormText.Password
            name="newPassword"
            fieldProps={{
              size: 'large',
              prefix: <LockOutlined />,
            }}
            placeholder={intl.formatMessage({
              id: 'pages.changePassword.newPassword.placeholder',
              defaultMessage: '请输入新密码',
            })}
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
          />

          <ProFormText.Password
            name="confirmPassword"
            fieldProps={{
              size: 'large',
              prefix: <LockOutlined />,
            }}
            placeholder={intl.formatMessage({
              id: 'pages.changePassword.confirmPassword.placeholder',
              defaultMessage: '请确认新密码',
            })}
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
          />
        </ProForm>
      </Card>
    </div>
  );
};

export default ChangePassword;
