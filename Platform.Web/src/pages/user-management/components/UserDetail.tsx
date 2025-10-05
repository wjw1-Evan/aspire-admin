import React, { useState, useEffect } from 'react';
import {
  Descriptions,
  Tag,
  Badge,
  Card,
  List,
  Typography,
  Space,
  Button,
  Spin,
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
import { request } from '@umijs/max';
import type { AppUser, UserActivityLog } from '../types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface UserDetailProps {
  user: AppUser;
  onClose: () => void;
}

const UserDetail: React.FC<UserDetailProps> = ({ user, onClose }) => {
  const [activityLogs, setActivityLogs] = useState<UserActivityLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchActivityLogs();
  }, [user.id]);

  const fetchActivityLogs = async () => {
    if (!user.id) return;

    setLoading(true);
    try {
      const response = await request<{ data: UserActivityLog[] }>(`/api/user/${user.id}/activity-logs`, {
        method: 'GET',
        params: { limit: 20 },
      });
      setActivityLogs(response.data || []);
    } catch (error) {
      console.error('获取活动日志失败:', error);
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
      create: 'cyan',
      update: 'blue',
      delete: 'red',
    };
    return actionColors[action] || 'default';
  };

  const getActionText = (action: string) => {
    const actionTexts: Record<string, string> = {
      login: '登录',
      logout: '登出',
      update_profile: '更新资料',
      change_password: '修改密码',
      create: '创建',
      update: '更新',
      delete: '删除',
    };
    return actionTexts[action] || action;
  };

  return (
    <div>
      {/* 基本信息 */}
      <Card title="基本信息" style={{ marginBottom: 16 }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item
            label={
              <Space>
                <UserOutlined />
                用户名
              </Space>
            }
          >
            {user.username}
          </Descriptions.Item>
          
          <Descriptions.Item
            label={
              <Space>
                <MailOutlined />
                邮箱
              </Space>
            }
          >
            {user.email || '-'}
          </Descriptions.Item>

          <Descriptions.Item label="角色">
            <Tag color={user.role === 'admin' ? 'red' : 'blue'}>
              {user.role === 'admin' ? '管理员' : '普通用户'}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label="状态">
            <Badge
              status={user.isActive ? 'success' : 'error'}
              text={
                <Space>
                  {user.isActive ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                  {user.isActive ? '启用' : '禁用'}
                </Space>
              }
            />
          </Descriptions.Item>

          <Descriptions.Item
            label={
              <Space>
                <CalendarOutlined />
                创建时间
              </Space>
            }
          >
            {dayjs(user.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>

          <Descriptions.Item
            label={
              <Space>
                <ClockCircleOutlined />
                更新时间
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
                  最后登录
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
            最近活动
          </Space>
        }
        extra={
          <Button size="small" onClick={fetchActivityLogs}>
            刷新
          </Button>
        }
      >
        <Spin spinning={loading}>
          {activityLogs.length > 0 ? (
            <List
              size="small"
              dataSource={activityLogs}
              renderItem={(log) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <Space>
                        <Tag color={getActionColor(log.action)}>
                          {getActionText(log.action)}
                        </Tag>
                        <Text type="secondary">
                          {dayjs(log.createdAt).format('MM-DD HH:mm:ss')}
                        </Text>
                      </Space>
                    }
                    description={
                      <div>
                        <div>{log.description}</div>
                        {log.ipAddress && (
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            IP: {log.ipAddress}
                          </Text>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
              暂无活动记录
            </div>
          )}
        </Spin>
      </Card>

      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <Button onClick={onClose}>
          关闭
        </Button>
      </div>
    </div>
  );
};

export default UserDetail;
