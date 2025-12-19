import React, { useState, useEffect } from 'react';
import {
  Descriptions,
  Tag,
  Badge,
  Card,
  Typography,
  Space,
  Button,
  Spin,
  Flex,
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { request, useIntl } from '@umijs/max';
import { getAllRoles } from '@/services/role/api';
import type { AppUser, UserActivityLog } from '../types';
import dayjs from 'dayjs';

const { Text } = Typography;

interface UserDetailProps {
  user: AppUser;
  onClose: () => void;
}

const UserDetail: React.FC<UserDetailProps> = ({ user, onClose }) => {
  const intl = useIntl();
  const [activityLogs, setActivityLogs] = useState<UserActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [roleMap, setRoleMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    fetchActivityLogs();
  }, [user.id]);

  const fetchRoles = async () => {
    try {
      const response = await getAllRoles();
      if (response.success && response.data) {
        const map: Record<string, string> = {};
        response.data.roles.forEach((role) => {
          if (role.id) {
            map[role.id] = role.name;
          }
        });
        setRoleMap(map);
      }
      // 错误由全局错误处理统一处理，这里不需要 catch
    } catch (error) {
      console.error('加载角色列表失败:', error);
      // 重新抛出错误，确保全局错误处理能够处理
      throw error;
    }
  };

  const fetchActivityLogs = async () => {
    if (!user.id) return;

    setLoading(true);
    try {
      const response = await request<{
        success: boolean;
        data: UserActivityLog[];
      }>(`/api/user/${user.id}/activity-logs`, {
        method: 'GET',
        params: { limit: 20 },
      });
      if (response.success && response.data) {
        setActivityLogs(response.data);
      } else {
        setActivityLogs([]);
      }
      // 错误由全局错误处理统一处理，这里不需要 catch
    } catch (error) {
      console.error('获取活动日志失败:', error);
      setActivityLogs([]);
      // 重新抛出错误，确保全局错误处理能够处理
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    const actionColors: Record<string, string> = {
      login: 'green',
      logout: 'orange',
      update_profile: 'blue',
      change_password: 'purple',
      view_profile: 'purple',
      // 用户管理操作
      create_user: 'cyan',
      update_user: 'blue',
      delete_user: 'red',
      activate_user: 'green',
      deactivate_user: 'orange',
      update_user_role: 'purple',
      bulk_action: 'geekblue',
    };
    return actionColors[action] || 'default';
  };

  const getActionText = (action: string) => {
    const actionTexts: Record<string, string> = {
      login: '登录',
      logout: '登出',
      update_profile: '更新资料',
      change_password: '修改密码',
      view_profile: '查看资料',
      // 用户管理操作
      create_user: '创建用户',
      update_user: '更新用户',
      delete_user: '删除用户',
      activate_user: '启用用户',
      deactivate_user: '禁用用户',
      update_user_role: '更新角色',
      bulk_action: '批量操作',
    };
    return actionTexts[action] || action;
  };

  return (
    <div>
      {/* 基本信息 */}
      <Card title={intl.formatMessage({ id: 'pages.userDetail.basicInfo' })} style={{ marginBottom: 16 }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item
            label={
              <Space>
                <UserOutlined />
                {intl.formatMessage({ id: 'pages.userDetail.username' })}
              </Space>
            }
          >
            {user.username}
          </Descriptions.Item>

          <Descriptions.Item
            label={
              <Space>
                <MailOutlined />
                {intl.formatMessage({ id: 'pages.userDetail.email' })}
              </Space>
            }
          >
            {user.email || '-'}
          </Descriptions.Item>

          <Descriptions.Item label={intl.formatMessage({ id: 'pages.userDetail.role' })}>
            {!user.roleIds || user.roleIds.length === 0 ? (
              <Tag color="default">{intl.formatMessage({ id: 'pages.table.unassigned' })}</Tag>
            ) : (
              <Space wrap>
                {user.roleIds.map((roleId) => (
                  <Tag key={roleId} color="blue">
                    {roleMap[roleId] || roleId}
                  </Tag>
                ))}
              </Space>
            )}
          </Descriptions.Item>

          <Descriptions.Item label={intl.formatMessage({ id: 'pages.userDetail.status' })}>
            <Badge
              status={user.isActive ? 'success' : 'error'}
              text={
                <Space>
                  {user.isActive ? (
                    <CheckCircleOutlined />
                  ) : (
                    <CloseCircleOutlined />
                  )}
                  {user.isActive ? intl.formatMessage({ id: 'pages.table.activated' }) : intl.formatMessage({ id: 'pages.table.deactivated' })}
                </Space>
              }
            />
          </Descriptions.Item>

          <Descriptions.Item
            label={
              <Space>
                <CalendarOutlined />
                {intl.formatMessage({ id: 'pages.userDetail.createdAt' })}
              </Space>
            }
          >
            {dayjs(user.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>

          <Descriptions.Item
            label={
              <Space>
                <ClockCircleOutlined />
                {intl.formatMessage({ id: 'pages.userDetail.updatedAt' })}
              </Space>
            }
          >
            {dayjs(user.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>

          {user.lastLoginAt && (
            <Descriptions.Item
              label={
                <Space>
                  <ClockCircleOutlined />
                  {intl.formatMessage({ id: 'pages.userDetail.lastLogin' })}
                </Space>
              }
            >
              {dayjs(user.lastLoginAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {/* 活动日志 */}
      <Card
        title={
          <Space>
            <HistoryOutlined />
            {intl.formatMessage({ id: 'pages.userDetail.recentActivity' })}
          </Space>
        }
        extra={
          <Button size="small" onClick={fetchActivityLogs}>
            {intl.formatMessage({ id: 'pages.userDetail.refresh' })}
          </Button>
        }
      >
        <Spin spinning={loading}>
          {activityLogs.length > 0 ? (
            <div>
              {activityLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                >
                  <Flex vertical gap={4}>
                    <Space>
                      <Tag color={getActionColor(log.action)}>
                        {getActionText(log.action)}
                      </Tag>
                      <Text type="secondary">
                        {dayjs(log.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                      </Text>
                    </Space>
                    <div>{log.description}</div>
                    {log.ipAddress && (
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {intl.formatMessage({ id: 'pages.userDetail.ipPrefix' }, { ip: log.ipAddress })}
                      </Text>
                    )}
                  </Flex>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{ textAlign: 'center', padding: '20px', color: '#999' }}
            >
              {intl.formatMessage({ id: 'pages.userDetail.noActivity' })}
            </div>
          )}
        </Spin>
      </Card>

      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <Button onClick={onClose}>{intl.formatMessage({ id: 'pages.userDetail.close' })}</Button>
      </div>
    </div>
  );
};

export default UserDetail;
