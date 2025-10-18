import {
  EditOutlined,
  UserOutlined,
  MailOutlined,
  CalendarOutlined,
  SafetyOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import {
  ProCard,
  ProForm,
  ProFormText,
  ProFormDigit,
} from '@ant-design/pro-components';
import { FormattedMessage, Helmet, useIntl } from '@umijs/max';
import {
  Avatar,
  Button,
  Descriptions,
  Divider,
  List,
  message,
  Space,
  Tag,
  Typography,
} from 'antd';
import { createStyles } from 'antd-style';
import React, { useEffect, useState } from 'react';
import {
  getCurrentUserProfile,
  updateUserProfile,
  getUserActivityLogs,
} from '@/services/ant-design-pro/api';
import Settings from '../../../../config/defaultSettings';

const { Title, Text } = Typography;

const useStyles = createStyles(({ token: _token }) => {
  return {
    container: {
      padding: '24px',
      width: '100%',
    },
    profileCard: {
      marginBottom: '24px',
    },
    avatarSection: {
      textAlign: 'center',
      padding: '24px',
    },
    infoSection: {
      padding: '24px',
    },
    activityCard: {
      marginTop: '24px',
    },
    editButton: {
      marginBottom: '16px',
    },
  };
});

interface UserProfile {
  id: string;
  username: string;
  name?: string;
  email?: string;
  age?: number;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

interface ActivityLog {
  id: string;
  action: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

const UserCenter: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form] = ProForm.useForm();
  const { styles } = useStyles();
  const intl = useIntl();

  // 获取用户信息
  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await getCurrentUserProfile();
      if (response.success && response.data) {
        // API 返回的是 AppUser 对象，包含 username, name, email 等字段
        const apiUser = response.data as any;
        const profile: UserProfile = {
          id: apiUser.id || apiUser.userid || '',
          username: apiUser.username || '', // ✅ 使用 username 字段
          name: apiUser.name || apiUser.username || '', // name 可选，降级到 username
          email: apiUser.email,
          age: apiUser.age || 18,
          role: apiUser.access || 'user',
          isActive: apiUser.isActive || apiUser.isLogin || false,
          createdAt: apiUser.createdAt || '',
          updatedAt: apiUser.updatedAt || apiUser.updateAt || '',
          lastLoginAt: apiUser.lastLoginAt || '',
        };
        setUserProfile(profile);
        form.setFieldsValue({
          username: apiUser.username, // ✅ 设置 username（只读，不可修改）
          name: apiUser.name || apiUser.username, // 表单使用 name，如果没有则用 username
          email: apiUser.email,
          age: apiUser.age || 18,
        });
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      message.error(
        intl.formatMessage({
          id: 'pages.account.center.fetchFailed',
          defaultMessage: '获取用户信息失败',
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  // 获取活动日志
  const fetchActivityLogs = async () => {
    try {
      const response = await getUserActivityLogs();
      if (response.success && response.data) {
        // 将 UserActivityLog[] 转换为 ActivityLog[] 格式
        const logs: ActivityLog[] = response.data.map((log) => ({
          id: log.id || '',
          action: log.action || '',
          description: log.description || '',
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          createdAt: log.createdAt || '',
        }));
        setActivityLogs(logs);
      }
    } catch (error) {
      console.error('获取活动日志失败:', error);
      message.error(
        intl.formatMessage({
          id: 'pages.account.center.activityFailed',
          defaultMessage: '获取活动日志失败',
        }),
      );
    }
  };

  useEffect(() => {
    fetchUserProfile();
    fetchActivityLogs();
  }, []);

  // 当打开编辑模式时，重新设置表单值
  useEffect(() => {
    if (editing && userProfile) {
      form.setFieldsValue({
        username: userProfile.username,
        name: userProfile.name,
        email: userProfile.email,
        age: userProfile.age,
      });
    }
  }, [editing, userProfile, form]);

  // 更新用户信息
  const handleUpdateProfile = async (values: any) => {
    try {
      // ✅ 过滤掉 username 字段，因为后端不允许修改用户名
      const { username: _username, ...updateData } = values;

      const response = await updateUserProfile(updateData);
      if (response.success) {
        message.success(
          intl.formatMessage({
            id: 'pages.account.center.updateSuccess',
            defaultMessage: '个人信息更新成功',
          }),
        );
        setEditing(false);
        fetchUserProfile(); // 重新获取用户信息
      } else {
        message.error(
          response.errorMessage ||
            intl.formatMessage({
              id: 'pages.account.center.updateFailed',
              defaultMessage: '更新失败',
            }),
        );
      }
    } catch (error) {
      console.error('更新用户信息失败:', error);
      message.error(
        intl.formatMessage({
          id: 'pages.account.center.updateFailed',
          defaultMessage: '个人信息更新失败',
        }),
      );
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditing(false);
    form.resetFields();
  };

  // 格式化时间
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  // 获取角色标签颜色
  const getRoleTagColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'red';
      case 'user':
        return 'blue';
      default:
        return 'default';
    }
  };

  // 获取活动类型标签
  const getActivityTag = (action: string) => {
    const actionMap: { [key: string]: { text: string; color: string } } = {
      login: {
        text: intl.formatMessage({
          id: 'pages.account.center.activity.login',
          defaultMessage: '登录',
        }),
        color: 'green',
      },
      logout: {
        text: intl.formatMessage({
          id: 'pages.account.center.activity.logout',
          defaultMessage: '退出',
        }),
        color: 'orange',
      },
      update_profile: {
        text: intl.formatMessage({
          id: 'pages.account.center.activity.updateProfile',
          defaultMessage: '更新资料',
        }),
        color: 'blue',
      },
      change_password: {
        text: intl.formatMessage({
          id: 'pages.account.center.activity.changePassword',
          defaultMessage: '修改密码',
        }),
        color: 'red',
      },
      view_profile: {
        text: intl.formatMessage({
          id: 'pages.account.center.activity.viewProfile',
          defaultMessage: '查看资料',
        }),
        color: 'purple',
      },
      // 用户管理操作
      create_user: { text: '创建用户', color: 'cyan' },
      update_user: { text: '更新用户', color: 'blue' },
      delete_user: { text: '删除用户', color: 'red' },
      activate_user: { text: '启用用户', color: 'green' },
      deactivate_user: { text: '禁用用户', color: 'orange' },
      update_user_role: { text: '更新角色', color: 'purple' },
      bulk_action: { text: '批量操作', color: 'geekblue' },
    };
    return actionMap[action] || { text: action, color: 'default' };
  };

  if (loading) {
    return (
      <div>
        <FormattedMessage
          id="pages.account.center.loading"
          defaultMessage="加载中..."
        />
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div>
        <FormattedMessage
          id="pages.account.center.userNotExist"
          defaultMessage="用户信息不存在"
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Helmet>
        <title>
          {intl.formatMessage({
            id: 'menu.account.center',
            defaultMessage: '个人中心',
          })}
          {Settings.title && ` - ${Settings.title}`}
        </title>
      </Helmet>

      <Title level={2}>
        <UserOutlined style={{ marginRight: '8px' }} />
        <FormattedMessage
          id="pages.account.center.title"
          defaultMessage="个人中心"
        />
      </Title>

      {/* 个人信息卡片 */}
      <ProCard
        title={
          <FormattedMessage
            id="pages.account.center.profile"
            defaultMessage="个人信息"
          />
        }
        className={styles.profileCard}
        extra={
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => setEditing(true)}
            disabled={editing}
          >
            <FormattedMessage
              id="pages.account.center.editProfile"
              defaultMessage="编辑资料"
            />
          </Button>
        }
      >
        <div className={styles.avatarSection}>
          <Avatar size={80} icon={<UserOutlined />} />
          <div style={{ marginTop: '16px' }}>
            <Title level={4}>{userProfile.name || userProfile.username}</Title>
            <Tag color={getRoleTagColor(userProfile.role)}>
              {userProfile.role === 'admin' ? (
                <FormattedMessage
                  id="pages.account.center.admin"
                  defaultMessage="管理员"
                />
              ) : (
                <FormattedMessage
                  id="pages.account.center.user"
                  defaultMessage="普通用户"
                />
              )}
            </Tag>
          </div>
        </div>

        <Divider />

        {editing ? (
          <ProForm
            form={form}
            onFinish={handleUpdateProfile}
            submitter={{
              searchConfig: {
                submitText: '保存',
                resetText: '取消',
              },
              render: (_props, _doms) => {
                return (
                  <div style={{ textAlign: 'right' }}>
                    <Space>
                      <Button onClick={handleCancelEdit}>取消</Button>
                      <Button type="primary" htmlType="submit">
                        保存
                      </Button>
                    </Space>
                  </div>
                );
              },
              resetButtonProps: {
                style: { display: 'none' },
              },
              submitButtonProps: {
                style: { display: 'none' },
              },
            }}
          >
            <ProFormText
              name="username"
              label={
                <FormattedMessage
                  id="pages.account.center.username"
                  defaultMessage="用户名"
                />
              }
              disabled
              tooltip="用户名不可修改"
              fieldProps={{
                style: { color: 'rgba(0, 0, 0, 0.45)' },
              }}
            />
            <ProFormText
              name="name"
              label={
                <FormattedMessage
                  id="pages.account.center.name"
                  defaultMessage="姓名"
                />
              }
              placeholder="请输入姓名"
            />
            <ProFormText
              name="email"
              label={
                <FormattedMessage
                  id="pages.account.center.email"
                  defaultMessage="邮箱"
                />
              }
              rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}
            />
            <ProFormDigit
              name="age"
              label={
                <FormattedMessage
                  id="pages.account.center.age"
                  defaultMessage="年龄"
                />
              }
              min={1}
              max={150}
              placeholder="请输入年龄"
            />
          </ProForm>
        ) : (
          <Descriptions column={2} bordered>
            <Descriptions.Item
              label={
                <FormattedMessage
                  id="pages.account.center.username"
                  defaultMessage="用户名"
                />
              }
            >
              <Text strong>{userProfile.username}</Text>
            </Descriptions.Item>
            <Descriptions.Item
              label={
                <FormattedMessage
                  id="pages.account.center.name"
                  defaultMessage="姓名"
                />
              }
            >
              {userProfile.name || (
                <FormattedMessage
                  id="pages.account.center.notSet"
                  defaultMessage="未设置"
                />
              )}
            </Descriptions.Item>
            <Descriptions.Item
              label={
                <FormattedMessage
                  id="pages.account.center.email"
                  defaultMessage="邮箱"
                />
              }
            >
              <MailOutlined style={{ marginRight: '4px' }} />
              {userProfile.email || (
                <FormattedMessage
                  id="pages.account.center.notSet"
                  defaultMessage="未设置"
                />
              )}
            </Descriptions.Item>
            <Descriptions.Item
              label={
                <FormattedMessage
                  id="pages.account.center.age"
                  defaultMessage="年龄"
                />
              }
            >
              {userProfile.age || (
                <FormattedMessage
                  id="pages.account.center.notSet"
                  defaultMessage="未设置"
                />
              )}
            </Descriptions.Item>
            <Descriptions.Item
              label={
                <FormattedMessage
                  id="pages.account.center.role"
                  defaultMessage="角色"
                />
              }
            >
              <Tag color={getRoleTagColor(userProfile.role)}>
                {userProfile.role === 'admin' ? (
                  <FormattedMessage
                    id="pages.account.center.admin"
                    defaultMessage="管理员"
                  />
                ) : (
                  <FormattedMessage
                    id="pages.account.center.user"
                    defaultMessage="普通用户"
                  />
                )}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item
              label={
                <FormattedMessage
                  id="pages.account.center.status"
                  defaultMessage="状态"
                />
              }
            >
              <Tag color={userProfile.isActive ? 'green' : 'red'}>
                {userProfile.isActive ? (
                  <FormattedMessage
                    id="pages.account.center.active"
                    defaultMessage="正常"
                  />
                ) : (
                  <FormattedMessage
                    id="pages.account.center.inactive"
                    defaultMessage="禁用"
                  />
                )}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item
              label={
                <FormattedMessage
                  id="pages.account.center.registerTime"
                  defaultMessage="注册时间"
                />
              }
            >
              <CalendarOutlined style={{ marginRight: '4px' }} />
              {formatDateTime(userProfile.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item
              label={
                <FormattedMessage
                  id="pages.account.center.lastUpdate"
                  defaultMessage="最后更新"
                />
              }
            >
              <CalendarOutlined style={{ marginRight: '4px' }} />
              {formatDateTime(userProfile.updatedAt)}
            </Descriptions.Item>
            {userProfile.lastLoginAt && (
              <Descriptions.Item
                label={
                  <FormattedMessage
                    id="pages.account.center.lastLogin"
                    defaultMessage="最后登录"
                  />
                }
                span={2}
              >
                <CalendarOutlined style={{ marginRight: '4px' }} />
                {formatDateTime(userProfile.lastLoginAt)}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </ProCard>

      {/* 活动日志卡片 */}
      <ProCard
        title={
          <Space>
            <HistoryOutlined />
            <FormattedMessage
              id="pages.account.center.recentActivity"
              defaultMessage="最近活动"
            />
          </Space>
        }
        className={styles.activityCard}
      >
        <List
          dataSource={activityLogs}
          renderItem={(item) => {
            const activityTag = getActivityTag(item.action);
            return (
              <List.Item>
                <List.Item.Meta
                  avatar={<SafetyOutlined />}
                  title={
                    <Space>
                      <Tag color={activityTag.color}>{activityTag.text}</Tag>
                      <Text>{item.description}</Text>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size="small">
                      <Text type="secondary">
                        {formatDateTime(item.createdAt)}
                      </Text>
                      {item.ipAddress && (
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          IP: {item.ipAddress}
                        </Text>
                      )}
                    </Space>
                  }
                />
              </List.Item>
            );
          }}
        />
      </ProCard>
    </div>
  );
};

export default UserCenter;
