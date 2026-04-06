import React, { useState, useEffect } from 'react';
import {
  Tag,
  Badge,
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
import { ProDescriptions } from '@ant-design/pro-components';
import { getAllRoles } from '@/services/role/api';
import type { Role } from '@/services/role/api';
import type { AppUser, UserActivityLog } from '@/types';
import dayjs from 'dayjs';
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
    } catch (error) {
      console.error('加载角色列表失败:', error);
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
    } catch (error) {
      console.error('获取活动日志失败:', error);
      setActivityLogs([]);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <ProDescriptions column={1} size="small" title={intl.formatMessage({ id: 'pages.userDetail.basicInfo' })}>
        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.userDetail.username' })}>
            {user.username}
          </ProDescriptions.Item>

          <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.account.center.name', defaultMessage: 'Name' })}>
            {user.name || '-'}
          </ProDescriptions.Item>

          <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.userDetail.email' })}>
            {user.email || '-'}
          </ProDescriptions.Item>

          <ProDescriptions.Item label="手机号">
            {user.phoneNumber || '-'}
          </ProDescriptions.Item>

          <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.account.center.age', defaultMessage: 'Age' })}>
            {user.age || '-'}
          </ProDescriptions.Item>

          <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.userDetail.role' })}>
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
          </ProDescriptions.Item>

          <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.userDetail.organization' })}>
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
          </ProDescriptions.Item>

          <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.userDetail.status' })}>
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
          </ProDescriptions.Item>

          <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.userDetail.createdAt' })}>
            {user.createdAt ? dayjs(user.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </ProDescriptions.Item>

          <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.userDetail.updatedAt' })}>
            {user.updatedAt ? dayjs(user.updatedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </ProDescriptions.Item>

          {user.lastLoginAt && (
            <ProDescriptions.Item
              label={
                <Space>
                  <ClockCircleOutlined />
                  {intl.formatMessage({ id: 'pages.userDetail.lastLogin' })}
                </Space>
              }
            >
              {dayjs(user.lastLoginAt).format('YYYY-MM-DD HH:mm:ss')}
            </ProDescriptions.Item>
          )}
        </ProDescriptions>

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
                          {log.createdAt ? dayjs(log.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
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

      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <Button onClick={onClose}>{intl.formatMessage({ id: 'pages.userDetail.close' })}</Button>
      </div>
    </div>
  );
};

export default UserDetail;
