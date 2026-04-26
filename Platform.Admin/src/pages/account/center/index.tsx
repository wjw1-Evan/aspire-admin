import { EditOutlined, UserOutlined, MailOutlined, MobileOutlined, CalendarOutlined, CameraOutlined, DeleteOutlined } from '@ant-design/icons';
import { FormattedMessage, useIntl, request, useModel } from '@umijs/max';
import { App, Avatar, Button, Card, Divider, Space, Tag, Typography, Form, Input, InputNumber, Tooltip } from 'antd';
import { ProDescriptions } from '@ant-design/pro-components';
import useCommonStyles from '@/hooks/useCommonStyles';
import { createStyles } from 'antd-style';
import React, { useEffect, useState } from 'react';
import { getUserAvatar } from '@/utils/avatar';
import dayjs from 'dayjs';
import { getCurrentUserProfile, updateUserProfile } from '@/services/ant-design-pro/api';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { ApiResponse } from '@/types';
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
      message.success(intl.formatMessage({ id: 'pages.account.center.updateSuccess', defaultMessage: '个人信息更新成功' }));
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
    if (file.size > 5 * 1024 * 1024) { message.error('图片大小不能超过 5MB'); e.target.value = ''; return; }
    if (!file.type.startsWith('image/')) { message.error('只能上传图片文件'); e.target.value = ''; return; }

    const localPreviewUrl = URL.createObjectURL(file);
    setAvatarPreview(localPreviewUrl);

    const hide = message.loading('正在上传...', 0);
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
        message.success('头像上传成功');
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

  if (loading) {
    return <div><FormattedMessage id="pages.account.center.loading" defaultMessage="加载中..." /></div>;
  }

  if (!userProfile) {
    return <div><FormattedMessage id="pages.account.center.userNotExist" defaultMessage="用户信息不存在" /></div>;
  }

  const pageTitle = intl.formatMessage({ id: 'menu.account.center', defaultMessage: '个人中心' }) + (Settings.title ? ` - ${Settings.title}` : '');

  return (
    <>
      <title>{pageTitle}</title>
      <div className={styles.container}>
        <Title level={2}><UserOutlined style={{ marginRight: '8px' }} /><FormattedMessage id="pages.account.center.title" defaultMessage="个人中心" /></Title>

        <Card title={<FormattedMessage id="pages.account.center.profile" defaultMessage="个人信息" />} className={`${commonStyles.card} ${styles.profileCard}`}
          extra={<Button type="primary" icon={<EditOutlined />} onClick={() => setEditing(true)} disabled={editing}><FormattedMessage id="pages.account.center.editProfile" defaultMessage="编辑资料" /></Button>}>
          <div className={styles.avatarSection}>
            {editing ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <Avatar size={80} src={getUserAvatar(typeof avatarPreview === 'string' ? avatarPreview : userProfile?.avatar)} icon={<UserOutlined />} />
                <label style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: '50%', backgroundColor: '#1890ff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', zIndex: 10 }}>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
                  <CameraOutlined style={{ color: '#fff', fontSize: 14 }} />
                </label>
                {(typeof avatarPreview === 'string' ? avatarPreview : userProfile?.avatar) && (
                  <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={handleAvatarDelete} style={{ position: 'absolute', top: -8, right: -8, minWidth: 24, height: 24, padding: 0, zIndex: 10 }} title="删除头像" />
                )}
              </div>
            ) : (
              <Avatar size={80} src={getUserAvatar(userProfile?.avatar)} icon={<UserOutlined />} />
            )}
            <div style={{ marginTop: '16px' }}>
              <Title level={4}>{userProfile.name || userProfile.displayName || userProfile.username}</Title>
              <Tag color={getRoleTagColor(userProfile.role)}>
                {userProfile.role === 'admin' ? <FormattedMessage id="pages.account.center.admin" defaultMessage="管理员" /> : <FormattedMessage id="pages.account.center.user" defaultMessage="普通用户" />}
              </Tag>
            </div>
          </div>

          <Divider />

          {editing ? (
            <Form form={form} onFinish={handleUpdateProfile} layout="vertical">
              <Form.Item name="username" label={<span><FormattedMessage id="pages.account.center.username" defaultMessage="用户名" /><Tooltip title="用户名不可修改"><span style={{ marginLeft: 4, cursor: 'help' }}>ℹ️</span></Tooltip></span>}>
                <Input disabled style={{ color: 'rgba(0, 0, 0, 0.45)' }} />
              </Form.Item>
              <Form.Item name="name" label={<FormattedMessage id="pages.account.center.name" defaultMessage="姓名" />}><Input placeholder="请输入姓名" /></Form.Item>
              <Form.Item name="email" label={<FormattedMessage id="pages.account.center.email" defaultMessage="邮箱" />} rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}><Input /></Form.Item>
              <Form.Item name="phoneNumber" label="手机号" rules={[{ pattern: /^1[3-9]\d{9}$/, message: '请输入有效的中国手机号（11位数字，以1开头）' }]}><Input placeholder="请输入手机号" maxLength={11} /></Form.Item>
              <Form.Item name="age" label={<FormattedMessage id="pages.account.center.age" defaultMessage="年龄" />} rules={[{ type: 'number', min: 1, max: 150, message: '年龄必须在 1-150 之间' }]}>
                <InputNumber min={1} max={150} placeholder="请输入年龄" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="avatar" hidden><Input /></Form.Item>
              <Form.Item>
                <div style={{ textAlign: 'right' }}>
                  <Space><Button onClick={handleCancelEdit}>取消</Button><Button type="primary" htmlType="submit">保存</Button></Space>
                </div>
              </Form.Item>
            </Form>
          ) : (
            <ProDescriptions column={2} bordered>
              <ProDescriptions.Item label={<FormattedMessage id="pages.account.center.username" defaultMessage="用户名" />}><Text strong>{userProfile.username}</Text></ProDescriptions.Item>
              <ProDescriptions.Item label={<FormattedMessage id="pages.account.center.name" defaultMessage="姓名" />}>{userProfile.name || <FormattedMessage id="pages.account.center.notSet" defaultMessage="未设置" />}</ProDescriptions.Item>
              <ProDescriptions.Item label={<FormattedMessage id="pages.account.center.email" defaultMessage="邮箱" />}><MailOutlined style={{ marginRight: '4px' }} />{userProfile.email || <FormattedMessage id="pages.account.center.notSet" defaultMessage="未设置" />}</ProDescriptions.Item>
              <ProDescriptions.Item label={<Space><MobileOutlined />手机号</Space>}>{userProfile.phoneNumber || <FormattedMessage id="pages.account.center.notSet" defaultMessage="未设置" />}</ProDescriptions.Item>
              <ProDescriptions.Item label={<FormattedMessage id="pages.account.center.age" defaultMessage="年龄" />}>{userProfile.age || <FormattedMessage id="pages.account.center.notSet" defaultMessage="未设置" />}</ProDescriptions.Item>
              <ProDescriptions.Item label={<FormattedMessage id="pages.account.center.role" defaultMessage="角色" />}><Tag color={getRoleTagColor(userProfile.role)}>{userProfile.role === 'admin' ? <FormattedMessage id="pages.account.center.admin" defaultMessage="管理员" /> : <FormattedMessage id="pages.account.center.user" defaultMessage="普通用户" />}</Tag></ProDescriptions.Item>
              <ProDescriptions.Item label={<FormattedMessage id="pages.account.center.status" defaultMessage="状态" />}><Tag color={userProfile.isActive ? 'green' : 'red'}>{userProfile.isActive ? <FormattedMessage id="pages.account.center.active" defaultMessage="正常" /> : <FormattedMessage id="pages.account.center.inactive" defaultMessage="禁用" />}</Tag></ProDescriptions.Item>
              <ProDescriptions.Item label={<FormattedMessage id="pages.account.center.registerTime" defaultMessage="注册时间" />}><CalendarOutlined style={{ marginRight: '4px' }} />{userProfile.createdAt ? dayjs(userProfile.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</ProDescriptions.Item>
              <ProDescriptions.Item label={<FormattedMessage id="pages.account.center.lastUpdate" defaultMessage="最后更新" />}><CalendarOutlined style={{ marginRight: '4px' }} />{userProfile.updatedAt ? dayjs(userProfile.updatedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</ProDescriptions.Item>
              {userProfile.lastLoginAt && <ProDescriptions.Item label={<FormattedMessage id="pages.account.center.lastLogin" defaultMessage="最后登录" />}><CalendarOutlined style={{ marginRight: '4px' }} />{dayjs(userProfile.lastLoginAt).format('YYYY-MM-DD HH:mm:ss')}</ProDescriptions.Item>}
            </ProDescriptions>
          )}
        </Card>
      </div>
    </>
  );
};

export default UserCenter;
