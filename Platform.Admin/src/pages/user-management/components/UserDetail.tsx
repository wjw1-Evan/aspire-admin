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
  Timeline,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { request, useIntl } from '@umijs/max';
import { getAllRoles } from '@/services/role/api';
import type { Role } from '@/services/role/api';
import type { AppUser, UserActivityLog } from '../types';
import { formatDateTime } from '@/utils/format';
import { getActionTagColor, getActionText } from '@/utils/activityLog';

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
        const roles = response.data.queryable || [];
        roles.forEach((role: Role) => {
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
      }>(`/api/users/${user.id}/activity-logs`, {
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

  return (
    <div>
      {/* 基本信息 */}
      <Card title={intl.formatMessage({ id: 'pages.userDetail.basicInfo' })} style={{ marginBottom: 16 }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label={intl.formatMessage({ id: 'pages.userDetail.username' })}>
            {user.username}
          </Descriptions.Item>

          <Descriptions.Item label={intl.formatMessage({ id: 'pages.account.center.name', defaultMessage: 'Name' })}>
            {user.name || '-'}
          </Descriptions.Item>

          <Descriptions.Item label={intl.formatMessage({ id: 'pages.userDetail.email' })}>
            {user.email || '-'}
          </Descriptions.Item>

          <Descriptions.Item label="手机号">
            {user.phoneNumber || '-'}
          </Descriptions.Item>

          <Descriptions.Item label={intl.formatMessage({ id: 'pages.account.center.age', defaultMessage: 'Age' })}>
            {user.age || '-'}
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

          <Descriptions.Item label={intl.formatMessage({ id: 'pages.userDetail.organization' })}>
            {!user.organizations || user.organizations.length === 0 ? (
              <Text type="secondary">
                {intl.formatMessage({ id: 'pages.userManagement.organization.empty' })}
              </Text>
            ) : (
              <Space direction="vertical" size={4} wrap>
                {user.organizations.map((org) => (
                  <Space key={org.id || org.fullPath || org.name} size={4} wrap>
                    <Text>{org.fullPath || org.name || '-'}</Text>
                    {org.isPrimary ? (
                      <Tag color="gold" variant="filled">
                        {intl.formatMessage({ id: 'pages.userManagement.organization.primary' })}
                      </Tag>
                    ) : null}
                  </Space>
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

          <Descriptions.Item label={intl.formatMessage({ id: 'pages.userDetail.createdAt' })}>
            {formatDateTime(user.createdAt)}
          </Descriptions.Item>

          <Descriptions.Item label={intl.formatMessage({ id: 'pages.userDetail.updatedAt' })}>
            {formatDateTime(user.updatedAt)}
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
              {formatDateTime(user.lastLoginAt)}
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
            <div style={{ padding: '16px 8px 0' }}>
              <Timeline
                items={activityLogs.map((log) => ({
                  color:
                    log.statusCode && log.statusCode >= 400
                      ? 'red'
                      : log.statusCode && log.statusCode < 300
                        ? 'green'
                        : 'blue',
                  content: (
                    <Flex vertical gap={4}>
                      <Space wrap>
                        <Tag color={getActionTagColor(log.action)}>
                          {getActionText(log.action)}
                        </Tag>
                        {log.httpMethod && (
                          <Tag
                            color={
                              log.httpMethod === 'GET'
                                ? 'cyan'
                                : log.httpMethod === 'POST'
                                  ? 'blue'
                                  : 'orange'
                            }
                          >
                            {log.httpMethod}
                          </Tag>
                        )}
                        <Text strong style={{ fontSize: '13px' }}>
                          {log.description}
                        </Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {formatDateTime(log.createdAt)}
                        </Text>
                      </Space>

                      <Space
                        separator={<Text type="secondary">|</Text>}
                        wrap
                        style={{ fontSize: '12px' }}
                      >
                        {log.statusCode && (
                          <Text
                            type={log.statusCode >= 400 ? 'danger' : 'secondary'}
                          >
                            {intl.formatMessage({ id: 'pages.logDetail.responseStatus' })}: {log.statusCode}
                          </Text>
                        )}
                        {log.duration && (
                          <Text type="secondary">
                            {intl.formatMessage(
                              { id: 'pages.logDetail.durationMs' },
                              { ms: log.duration },
                            )}
                          </Text>
                        )}
                        {log.ipAddress && (
                          <Text type="secondary">
                            {intl.formatMessage(
                              { id: 'pages.userDetail.ipPrefix' },
                              { ip: log.ipAddress },
                            )}
                          </Text>
                        )}
                      </Space>
                      {log.path && (
                        <Text
                          type="secondary"
                          style={{
                            fontSize: '11px',
                            wordBreak: 'break-all',
                            fontFamily: 'monospace',
                            backgroundColor: '#f5f5f5',
                            padding: '2px 4px',
                            borderRadius: '4px',
                          }}
                        >
                          {log.path}
                        </Text>
                      )}
                    </Flex>
                  ),
                }))}
              />
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
