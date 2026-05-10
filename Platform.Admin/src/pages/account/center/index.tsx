import { EditOutlined, UserOutlined, MailOutlined, MobileOutlined, CalendarOutlined, CameraOutlined, DeleteOutlined, LockOutlined } from '@ant-design/icons';
import { FormattedMessage, useIntl, request, useModel } from '@umijs/max';
import { App, Avatar, Button, Card, Divider, Space, Tag, Typography, Form, Input, InputNumber, Tooltip, Alert, Modal } from 'antd';
import { ProDescriptions } from '@ant-design/pro-components';
import useCommonStyles from '@/hooks/useCommonStyles';
import { createStyles } from 'antd-style';
import React, { useEffect, useState } from 'react';
import { getUserAvatar } from '@/utils/avatar';
import dayjs from 'dayjs';
import { getCurrentUserProfile, updateUserProfile } from '@/services/ant-design-pro/api';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { changePassword } from '@/services/ant-design-pro/api';
import { PasswordEncryption } from '@/utils/encryption';
import type { ApiResponse, ChangePasswordResult, ChangePasswordParams } from '@/types';
import Settings from '../../../../config/defaultSettings';

const { Title, Text } = Typography;

const useStyles = createStyles(({ token }) => ({
  container: { padding: token.paddingLG, width: '100%' },
  profileCard: { marginBottom: token.marginLG },
  avatarSection: { textAlign: 'center', padding: token.paddingLG },
}));

interface UserProfile {
  id: string; username: string; name?: string; displayName?: string; email?: string; phoneNumber?: string;
  age?: number; avatar?: string; role: string; isActive: boolean;
  createdAt: string; updatedAt: string; lastLoginAt?: string;
}

const UserCenter: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined);
  const [lastUploadedAvatar, setLastUploadedAvatar] = useState<string | undefined>(undefined);
  const [form] = Form.useForm();
  const { styles } = useStyles();
  const { styles: commonStyles } = useCommonStyles();
  const intl = useIntl();
  const { initialState, setInitialState } = useModel('@@initialState');
  const { message } = App.useApp();

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await getCurrentUserProfile();
      if (response.success && response.data) {
        const apiUser = response.data as any;
        const profile: UserProfile = {
          id: apiUser.id || apiUser.userid || '',
          username: apiUser.username || '',
          name: apiUser.name || apiUser.displayName || apiUser.username || '',
          displayName: apiUser.displayName,
          email: apiUser.email,
          phoneNumber: apiUser.phoneNumber || apiUser.phone,
          age: apiUser.age || 18,
          avatar: apiUser.avatar,
          role: apiUser.access || (apiUser.roles && apiUser.roles.includes('管理员') ? 'admin' : 'user'),
          isActive: apiUser.isActive ?? apiUser.isLogin ?? true,
          createdAt: apiUser.createdAt || '',
          updatedAt: apiUser.updatedAt || apiUser.updateAt || '',
          lastLoginAt: apiUser.lastLoginAt || '',
        };
        setUserProfile(profile);
        setAvatarPreview(apiUser.avatar);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUserProfile(); }, []);

  useEffect(() => {
    if (editing && userProfile) {
      form.setFieldsValue({
        username: userProfile.username, name: userProfile.name, email: userProfile.email,
        phoneNumber: userProfile.phoneNumber, age: userProfile.age, avatar: userProfile.avatar,
      });
      setAvatarPreview(userProfile.avatar);
    } else {
      setAvatarPreview(userProfile?.avatar);
    }
  }, [editing, userProfile, form]);

  const handleUpdateProfile = async (values: any) => {
    const { username: _username, ...formValues } = values;
    const updateData = { ...formValues, avatar: lastUploadedAvatar || formValues.avatar };
    const response = await updateUserProfile(updateData);
    if (response.success) {
      message.success(intl.formatMessage({ id: 'pages.account.center.updateSuccess' }));
      setEditing(false);
      setLastUploadedAvatar(undefined);
      fetchUserProfile();
      setInitialState((s) => {
        if (!s || !s.currentUser) return s;
        return { ...s, currentUser: { ...s.currentUser, ...updateData, displayName: updateData.displayName || s.currentUser.displayName, avatar: updateData.avatar || s.currentUser.avatar } };
      });
    } else {
      throw new Error(getErrorMessage(response, 'pages.account.center.updateFailed'));
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setAvatarPreview(userProfile?.avatar);
    setLastUploadedAvatar(undefined);
    form.resetFields();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { message.error(intl.formatMessage({ id: 'pages.account.center.avatar.sizeTooLarge' })); e.target.value = ''; return; }
    if (!file.type.startsWith('image/')) { message.error(intl.formatMessage({ id: 'pages.account.center.avatar.invalidType' })); e.target.value = ''; return; }

    const localPreviewUrl = URL.createObjectURL(file);
    setAvatarPreview(localPreviewUrl);

    const hide = message.loading(intl.formatMessage({ id: 'pages.account.center.avatar.uploading' }), 0);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await request<ApiResponse<{ url: string }>>('/apiservice/api/avatar/upload', {
        method: 'POST',
        data: formData,
        requestType: 'form',
      });
      hide();
      const avatarUrl = response?.data?.url;
      if (avatarUrl) {
        message.success(intl.formatMessage({ id: 'pages.account.center.avatar.uploadSuccess' }));
        form.setFieldsValue({ avatar: avatarUrl });
        setLastUploadedAvatar(avatarUrl);
        setAvatarPreview(avatarUrl);
      }
    } catch (error) {
      hide();
      message.error(getErrorMessage(error as any, 'pages.account.avatar.uploadFailed'));
      console.error('Avatar upload failed:', error);
    }
    e.target.value = '';
  };

  const handleAvatarDelete = () => {
    setAvatarPreview('');
    setLastUploadedAvatar(undefined);
    form.setFieldsValue({ avatar: '' });
  };

  const getRoleTagColor = (role: string) => {
    switch (role) {
      case 'admin': return 'red';
      case 'user': return 'blue';
      default: return 'default';
    }
  };

  // Change Password State
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [changePasswordState, setChangePasswordState] = useState<ChangePasswordResult>({});
  const [changePasswordForm] = Form.useForm();

  const handleChangePassword = async (values: ChangePasswordParams) => {
    try {
      const encryptedCurrentPassword = await PasswordEncryption.encrypt(values.currentPassword || '');
      const encryptedNewPassword = await PasswordEncryption.encrypt(values.newPassword || '');
      const result = await changePassword({
        ...values,
        currentPassword: encryptedCurrentPassword,
        newPassword: encryptedNewPassword,
      });
      if (result.success) {
        message.success(intl.formatMessage({ id: 'pages.changePassword.success' }));
        setChangePasswordModalVisible(false);
        setChangePasswordState({});
        changePasswordForm.resetFields();
        return;
      }
      setChangePasswordState(result);
      throw new Error(result.message || intl.formatMessage({ id: 'pages.changePassword.failure' }));
    } catch (error: any) {
      const errorCode = error?.info?.errorCode || error?.response?.data?.errorCode;
      if (errorCode) {
        setChangePasswordState({
          code: errorCode,
          message: error.info?.message || error.message,
        });
      }
      throw error;
    }
  };

  const handleOpenChangePassword = () => {
    setChangePasswordState({});
    changePasswordForm.resetFields();
    setChangePasswordModalVisible(true);
  };

  const handleCancelChangePassword = () => {
    setChangePasswordModalVisible(false);
    setChangePasswordState({});
    changePasswordForm.resetFields();
  };

  if (loading) {
    return <div><FormattedMessage id="pages.account.center.loading" /></div>;
  }

  if (!userProfile) {
    return <div><FormattedMessage id="pages.account.center.userNotExist" /></div>;
  }

  const pageTitle = intl.formatMessage({ id: 'menu.account.center' }) + (Settings.title ? ` - ${Settings.title}` : '');

  return (
    <>
      <title>{pageTitle}</title>
      <div className={styles.container}>
        <Title level={2}><UserOutlined style={{ marginRight: '8px' }} /><FormattedMessage id="pages.account.center.title" /></Title>

        <Card title={<FormattedMessage id="pages.account.center.profile" />} className={`${commonStyles.card} ${styles.profileCard}`}
          extra={<Button type="primary" icon={<EditOutlined />} onClick={() => setEditing(true)} disabled={editing}><FormattedMessage id="pages.account.center.editProfile" /></Button>}>
          <div className={styles.avatarSection}>
            {editing ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <Avatar size={80} src={getUserAvatar(typeof avatarPreview === 'string' ? avatarPreview : userProfile?.avatar)} icon={<UserOutlined />} />
                <label style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: '50%', backgroundColor: '#1890ff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', zIndex: 10 }}>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
                  <CameraOutlined style={{ color: '#fff', fontSize: 14 }} />
                </label>
                 {(typeof avatarPreview === 'string' ? avatarPreview : userProfile?.avatar) && (
                   <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={handleAvatarDelete} style={{ position: 'absolute', top: -8, right: -8, minWidth: 24, height: 24, padding: 0, zIndex: 10 }} title={intl.formatMessage({ id: 'pages.account.center.avatar.delete' })} />
                 )}
              </div>
            ) : (
              <Avatar size={80} src={getUserAvatar(userProfile?.avatar)} icon={<UserOutlined />} />
            )}
            <div style={{ marginTop: '16px' }}>
              <Title level={4}>{userProfile.name || userProfile.displayName || userProfile.username}</Title>
              <Tag color={getRoleTagColor(userProfile.role)}>
                {userProfile.role === 'admin' ? <FormattedMessage id="pages.account.center.admin" /> : <FormattedMessage id="pages.account.center.user" />}
              </Tag>
            </div>
          </div>

          <Divider />

           {editing ? (
            <Form form={form} onFinish={handleUpdateProfile} layout="vertical">
              <Form.Item name="username" label={<span><FormattedMessage id="pages.account.center.username" /><Tooltip title={intl.formatMessage({ id: 'pages.account.center.username.notEditable' })}><span style={{ marginLeft: 4, cursor: 'help' }}>ℹ️</span></Tooltip></span>}>
                <Input disabled style={{ color: 'rgba(0, 0, 0, 0.45)' }} />
              </Form.Item>
              <Form.Item name="name" label={<FormattedMessage id="pages.account.center.name" />}><Input placeholder={intl.formatMessage({ id: 'pages.account.center.name.placeholder' })} /></Form.Item>
              <Form.Item name="email" label={<FormattedMessage id="pages.account.center.email" />} rules={[{ type: 'email', message: intl.formatMessage({ id: 'pages.account.center.email.invalid' }) }]}><Input /></Form.Item>
              <Form.Item name="phoneNumber" label={intl.formatMessage({ id: 'pages.account.center.phoneNumber' })} rules={[{ pattern: /^1[3-9]\d{9}$/, message: intl.formatMessage({ id: 'pages.account.center.phoneNumber.invalid' }) }]}><Input placeholder={intl.formatMessage({ id: 'pages.account.center.phoneNumber.placeholder' })} maxLength={11} /></Form.Item>
              <Form.Item name="age" label={<FormattedMessage id="pages.account.center.age" />} rules={[{ type: 'number', min: 1, max: 150, message: intl.formatMessage({ id: 'pages.account.center.age.invalid' }) }]}>
                <InputNumber min={1} max={150} placeholder={intl.formatMessage({ id: 'pages.account.center.age.placeholder' })} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="avatar" hidden><Input /></Form.Item>
              <Form.Item>
                <div style={{ textAlign: 'right' }}>
                  <Space><Button onClick={handleCancelEdit}><FormattedMessage id="pages.account.center.cancel" /></Button><Button type="primary" htmlType="submit"><FormattedMessage id="pages.account.center.save" /></Button></Space>
                </div>
              </Form.Item>
            </Form>
          ) : (
            <ProDescriptions column={2} bordered>
              <ProDescriptions.Item label={<FormattedMessage id="pages.account.center.username" />}><Text strong>{userProfile.username}</Text></ProDescriptions.Item>
              <ProDescriptions.Item label={<FormattedMessage id="pages.account.center.name" />}>{userProfile.name || <FormattedMessage id="pages.account.center.notSet" />}</ProDescriptions.Item>
              <ProDescriptions.Item label={<FormattedMessage id="pages.account.center.email" />}><MailOutlined style={{ marginRight: '4px' }} />{userProfile.email || <FormattedMessage id="pages.account.center.notSet" />}</ProDescriptions.Item>
              <ProDescriptions.Item label={<Space><MobileOutlined /><FormattedMessage id="pages.account.center.phoneNumber" /></Space>}>{userProfile.phoneNumber || <FormattedMessage id="pages.account.center.notSet" />}</ProDescriptions.Item>
              <ProDescriptions.Item label={<FormattedMessage id="pages.account.center.age" />}>{userProfile.age || <FormattedMessage id="pages.account.center.notSet" />}</ProDescriptions.Item>
              <ProDescriptions.Item label={<FormattedMessage id="pages.account.center.role" />}><Tag color={getRoleTagColor(userProfile.role)}>{userProfile.role === 'admin' ? <FormattedMessage id="pages.account.center.admin" /> : <FormattedMessage id="pages.account.center.user" />}</Tag></ProDescriptions.Item>
              <ProDescriptions.Item label={<FormattedMessage id="pages.account.center.status" />}><Tag color={userProfile.isActive ? 'green' : 'red'}>{userProfile.isActive ? <FormattedMessage id="pages.account.center.active" /> : <FormattedMessage id="pages.account.center.inactive" />}</Tag></ProDescriptions.Item>
              <ProDescriptions.Item label={<FormattedMessage id="pages.account.center.registerTime" />}><CalendarOutlined style={{ marginRight: '4px' }} />{userProfile.createdAt ? dayjs(userProfile.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</ProDescriptions.Item>
              <ProDescriptions.Item label={<FormattedMessage id="pages.account.center.lastUpdate" />}><CalendarOutlined style={{ marginRight: '4px' }} />{userProfile.updatedAt ? dayjs(userProfile.updatedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</ProDescriptions.Item>
              {userProfile.lastLoginAt && <ProDescriptions.Item label={<FormattedMessage id="pages.account.center.lastLogin" />}><CalendarOutlined style={{ marginRight: '4px' }} />{dayjs(userProfile.lastLoginAt).format('YYYY-MM-DD HH:mm:ss')}</ProDescriptions.Item>}
            </ProDescriptions>
          )}
        </Card>

        <Card className={commonStyles.card} style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <LockOutlined style={{ fontSize: 18, color: '#1890ff' }} />
              <span style={{ fontWeight: 500 }}><FormattedMessage id="menu.account.changePassword" /></span>
            </Space>
            <Button type="primary" ghost icon={<LockOutlined />} onClick={handleOpenChangePassword}>
              <FormattedMessage id="menu.account.changePassword" />
            </Button>
          </div>
        </Card>

        <Modal
          title={<Space><LockOutlined /><FormattedMessage id="menu.account.changePassword" /></Space>}
          open={changePasswordModalVisible}
          onCancel={handleCancelChangePassword}
          footer={null}
          destroyOnClose
          width={480}
        >
          {changePasswordState.code && (
            <Alert
              style={{ marginBottom: 24 }}
              message={changePasswordState.message || intl.formatMessage({ id: 'pages.changePassword.failure' })}
              type="error"
              showIcon
            />
          )}
          <Form
            form={changePasswordForm}
            onFinish={handleChangePassword}
            layout="vertical"
          >
            <Form.Item
              name="currentPassword"
              rules={[{ required: true, message: <FormattedMessage id="pages.changePassword.currentPassword.required" /> }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={intl.formatMessage({ id: 'pages.changePassword.currentPassword.placeholder' })}
                size="middle"
              />
            </Form.Item>

            <Form.Item
              name="newPassword"
              rules={[
                { required: true, message: <FormattedMessage id="pages.changePassword.newPassword.required" /> },
                { min: 6, message: <FormattedMessage id="pages.changePassword.newPassword.length" /> },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={intl.formatMessage({ id: 'pages.changePassword.newPassword.placeholder' })}
                size="middle"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: <FormattedMessage id="pages.changePassword.confirmPassword.required" /> },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error(intl.formatMessage({ id: 'pages.changePassword.confirmPassword.mismatch' })));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={intl.formatMessage({ id: 'pages.changePassword.confirmPassword.placeholder' })}
                size="middle"
              />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block size="middle">
                <FormattedMessage id="pages.changePassword.submit" />
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </>
  );
};

export default UserCenter;
