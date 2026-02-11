import {
  EditOutlined,
  UserOutlined,
  MailOutlined,
  MobileOutlined,
  CalendarOutlined,
  CameraOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { FormattedMessage, useIntl, request, useModel } from '@umijs/max';
import {
  App,
  Avatar,
  Button,
  Card,
  Descriptions,
  Divider,
  Space,
  Tag,
  Typography,
  Form,
  Input,
  InputNumber,
  Tooltip,
  Flex,
} from 'antd';
import useCommonStyles from '@/hooks/useCommonStyles';
import { createStyles } from 'antd-style';
import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { getUserAvatar } from '@/utils/avatar';
import {
  getCurrentUserProfile,
  updateUserProfile,
} from '@/services/ant-design-pro/api';
import Settings from '../../../../config/defaultSettings';

const { Title, Text } = Typography;

const useStyles = createStyles(({ token }) => {
  return {
    container: {
      padding: token.paddingLG,
      width: '100%',
    },
    profileCard: {
      marginBottom: token.marginLG,
    },
    avatarSection: {
      textAlign: 'center',
      padding: token.paddingLG,
    },
    infoSection: {
      padding: token.paddingLG,
    },
    editButton: {
      marginBottom: token.marginMD,
    },
  };
});

interface UserProfile {
  id: string;
  username: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  age?: number;
  avatar?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}



const UserCenter: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined);
  // const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined); // Removed obsolete state
  const [form] = Form.useForm();
  const { styles } = useStyles();
  const { styles: commonStyles } = useCommonStyles();
  const intl = useIntl();
  const { initialState, setInitialState } = useModel('@@initialState');
  const { message } = App.useApp();

  // 以前的 loadProtectedAvatar 逻辑已移除，因为头像现在是公开访问的


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
          phoneNumber: apiUser.phoneNumber || apiUser.phone,
          age: apiUser.age || 18,
          avatar: apiUser.avatar, // ✅ 保存头像字段
          role: apiUser.access || (apiUser.roles && apiUser.roles.includes('管理员') ? 'admin' : 'user'),
          isActive: apiUser.isActive ?? apiUser.isLogin ?? true,
          createdAt: apiUser.createdAt || '',
          updatedAt: apiUser.updatedAt || apiUser.updateAt || '',
          lastLoginAt: apiUser.lastLoginAt || '',
        };
        setUserProfile(profile);
        // 设置头像预览
        setAvatarPreview(apiUser.avatar);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      // 错误由全局错误处理统一处理
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  // 当打开编辑模式时，重新设置表单值
  useEffect(() => {
    if (editing && userProfile) {
      form.setFieldsValue({
        username: userProfile.username,
        name: userProfile.name,
        email: userProfile.email,
        phoneNumber: userProfile.phoneNumber,
        age: userProfile.age,
        avatar: userProfile.avatar,
      });
      setAvatarPreview(userProfile.avatar);
    } else {
      // 退出编辑模式时重置
      setAvatarPreview(userProfile?.avatar);
    }
  }, [editing, userProfile, form]);


  // 用一个引用来存储最新上传的头像URL，避免 Form 字段同步问题
  const [lastUploadedAvatar, setLastUploadedAvatar] = useState<string | undefined>(undefined);

  // 更新用户信息
  const handleUpdateProfile = async (values: any) => {
    try {
      // ✅ 过滤掉 username 字段，因为后端不允许修改用户名
      const { username: _username, ...formValues } = values;

      // 如果有新上传的头像，优先使用
      const updateData = {
        ...formValues,
        avatar: lastUploadedAvatar || formValues.avatar,
      };

      const response = await updateUserProfile(updateData);
      if (response.success) {
        message.success(
          intl.formatMessage({
            id: 'pages.account.center.updateSuccess',
            defaultMessage: '个人信息更新成功',
          }),
        );
        setEditing(false);
        setLastUploadedAvatar(undefined); // 清除上传状态
        fetchUserProfile(); // 重新获取用户信息

        // 保存成功后，同步更新全局用户状态（包括头像）
        setInitialState((s) => {
          if (!s || !s.currentUser) return s;
          return {
            ...s,
            currentUser: {
              ...s.currentUser,
              ...updateData,
              name: updateData.name || s.currentUser.name,
              avatar: updateData.avatar || s.currentUser.avatar,
            },
          };
        });
      } else {
        // 失败时抛出错误，由全局错误处理统一处理
        throw new Error(
          response.errorMessage ||
          intl.formatMessage({
            id: 'pages.account.center.updateFailed',
            defaultMessage: '更新失败',
          })
        );
      }
      // 错误由全局错误处理统一处理，这里不需要 catch
    } catch (error: any) {
      // 如果确实需要特殊处理（如显示验证错误），可以在这里处理业务逻辑
      // 但错误提示已由全局错误处理统一显示
      console.error('更新用户信息失败:', error);
      // 重新抛出错误，确保全局错误处理能够处理
      throw error;
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditing(false);
    setAvatarPreview(userProfile?.avatar);
    setLastUploadedAvatar(undefined);
    form.resetFields();
  };

  // 统一的日期时间格式化函数
  const formatDateTime = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    try {
      const date = dayjs(dateString);
      if (!date.isValid()) return dateString;
      return date.format('YYYY-MM-DD HH:mm:ss');
    } catch (error) {
      console.error('日期格式化错误:', error, dateString);
      return dateString || '-';
    }
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

  const pageTitle = intl.formatMessage({
    id: 'menu.account.center',
    defaultMessage: '个人中心',
  }) + (Settings.title ? ` - ${Settings.title}` : '');

  return (
    <>
      <title>{pageTitle}</title>
      <div className={styles.container}>
        <Title level={2}>
          <UserOutlined style={{ marginRight: '8px' }} />
          <FormattedMessage
            id="pages.account.center.title"
            defaultMessage="个人中心"
          />
        </Title>

        {/* 个人信息卡片 */}
        <Card
          title={
            <FormattedMessage
              id="pages.account.center.profile"
              defaultMessage="个人信息"
            />
          }
          className={`${commonStyles.card} ${styles.profileCard}`}
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
            {editing ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <Avatar
                  size={80}
                  src={getUserAvatar(typeof avatarPreview === 'string' ? avatarPreview : userProfile?.avatar)}
                  icon={<UserOutlined />}
                />
                <label
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: '#1890ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    border: '2px solid #fff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    zIndex: 10,
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      // 检查文件大小（5MB）
                      if (file.size > 5 * 1024 * 1024) {
                        message.error('图片大小不能超过 5MB');
                        e.target.value = ''; // 清空选择
                        return;
                      }

                      // 检查文件类型
                      if (!file.type.startsWith('image/')) {
                        message.error('只能上传图片文件');
                        e.target.value = ''; // 清空选择
                        return;
                      }

                      // ✅ 立即显示本地预览，无需等待上传完成，体验更好
                      const localPreviewUrl = URL.createObjectURL(file);
                      setAvatarPreview(localPreviewUrl);

                      const hide = message.loading('正在上传...', 0);
                      try {
                        const formData = new FormData();
                        formData.append('file', file);

                        const response = await request<any>('/api/avatar/upload', { // Use any to be safe
                          method: 'POST',
                          data: formData,
                          requestType: 'form',
                        });

                        hide();

                        // 兼容两种响应结构：直接返回数据 或 包含在 data 字段中
                        // 1. { url: "..." }
                        // 2. { data: { url: "..." }, success: true }
                        const newUrl = response?.url || response?.data?.url;

                        if (newUrl) {
                          message.success('头像上传成功');

                          // 更新表单值，准备保存
                          form.setFieldsValue({ avatar: newUrl });
                          setLastUploadedAvatar(newUrl); // Store in local state for safe submission

                          // 直接显示新的 URL (后端已设置为公开访问，无需手动 fetch Blob)
                          setAvatarPreview(newUrl);

                          // 全局状态更新已移至保存操作之后
                          // setInitialState((s) => ...);
                        }
                      } catch (error) {
                        hide();
                        message.error('头像上传失败');
                        console.error('Avatar upload failed:', error);
                      }

                      e.target.value = ''; // 清空选择，允许重复上传同一文件
                    }}
                  />
                  <CameraOutlined style={{ color: '#fff', fontSize: 14 }} />
                </label>
                {(typeof avatarPreview === 'string' ? avatarPreview : userProfile?.avatar) && (
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      setAvatarPreview(''); // Explicitly set to empty string to indicate deletion
                      setLastUploadedAvatar(undefined);
                      form.setFieldsValue({ avatar: '' });
                    }}
                    style={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      minWidth: 24,
                      height: 24,
                      padding: 0,
                      zIndex: 10,
                    }}
                    title="删除头像"
                  />
                )}
              </div>
            ) : (
              <Avatar
                size={80}
                src={getUserAvatar(userProfile?.avatar)}
                icon={<UserOutlined />}
              />
            )}
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
            <Form
              form={form}
              onFinish={handleUpdateProfile}
              layout="vertical"
            >
              <Form.Item
                name="username"
                label={
                  <span>
                    <FormattedMessage
                      id="pages.account.center.username"
                      defaultMessage="用户名"
                    />
                    <Tooltip title="用户名不可修改">
                      <span style={{ marginLeft: 4, cursor: 'help' }}>ℹ️</span>
                    </Tooltip>
                  </span>
                }
              >
                <Input
                  disabled
                  style={{ color: 'rgba(0, 0, 0, 0.45)' }}
                />
              </Form.Item>
              <Form.Item
                name="name"
                label={
                  <FormattedMessage
                    id="pages.account.center.name"
                    defaultMessage="姓名"
                  />
                }
              >
                <Input placeholder="请输入姓名" />
              </Form.Item>
              <Form.Item
                name="email"
                label={
                  <FormattedMessage
                    id="pages.account.center.email"
                    defaultMessage="邮箱"
                  />
                }
                rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="phoneNumber"
                label="手机号"
                rules={[
                  {
                    pattern: /^1[3-9]\d{9}$/,
                    message: '请输入有效的中国手机号（11位数字，以1开头）',
                  },
                ]}
              >
                <Input placeholder="请输入手机号" maxLength={11} />
              </Form.Item>
              <Form.Item
                name="age"
                label={
                  <FormattedMessage
                    id="pages.account.center.age"
                    defaultMessage="年龄"
                  />
                }
                rules={[
                  { type: 'number', min: 1, max: 150, message: '年龄必须在 1-150 之间' }
                ]}
              >
                <InputNumber
                  min={1}
                  max={150}
                  placeholder="请输入年龄"
                  style={{ width: '100%' }}
                />
              </Form.Item>
              {/* 隐藏的头像字段，用于表单提交 */}
              <Form.Item name="avatar" hidden>
                <Input />
              </Form.Item>
              <Form.Item>
                <div style={{ textAlign: 'right' }}>
                  <Space>
                    <Button onClick={handleCancelEdit}>取消</Button>
                    <Button type="primary" htmlType="submit">
                      保存
                    </Button>
                  </Space>
                </div>
              </Form.Item>
            </Form>
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
                  <Space>
                    <MobileOutlined />
                    手机号
                  </Space>
                }
              >
                {userProfile.phoneNumber || (
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
                >
                  <CalendarOutlined style={{ marginRight: '4px' }} />
                  {formatDateTime(userProfile.lastLoginAt)}
                </Descriptions.Item>
              )}
            </Descriptions>
          )}
        </Card>
      </div>
    </>
  );
};

export default UserCenter;
