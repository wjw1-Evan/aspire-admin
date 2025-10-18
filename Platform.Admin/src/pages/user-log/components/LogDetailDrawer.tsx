import React from 'react';
import {
  Drawer,
  Descriptions,
  Tag,
  Badge,
  Space,
  Typography,
  Divider,
} from 'antd';
import {
  ClockCircleOutlined,
  GlobalOutlined,
  ApiOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import type { UserActivityLog } from '@/services/user-log/types';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Text, Paragraph } = Typography;

interface LogDetailDrawerProps {
  readonly open: boolean;
  readonly log: UserActivityLog | null;
  readonly onClose: () => void;
}

export default function LogDetailDrawer({
  open,
  log,
  onClose,
}: LogDetailDrawerProps) {
  if (!log) return null;

  // 根据状态码获取显示样式
  const getStatusBadge = (statusCode?: number) => {
    if (!statusCode) return null;

    if (statusCode >= 200 && statusCode < 300) {
      return <Badge status="success" text={`${statusCode} 成功`} />;
    }
    if (statusCode >= 400 && statusCode < 500) {
      return <Badge status="warning" text={`${statusCode} 客户端错误`} />;
    }
    if (statusCode >= 500) {
      return <Badge status="error" text={`${statusCode} 服务器错误`} />;
    }
    return <Badge status="default" text={`${statusCode}`} />;
  };

  // 获取HTTP方法的颜色
  const getMethodColor = (method?: string) => {
    const colors: Record<string, string> = {
      GET: 'blue',
      POST: 'green',
      PUT: 'orange',
      DELETE: 'red',
      PATCH: 'purple',
    };
    return colors[method || ''] || 'default';
  };

  // 格式化耗时
  const formatDuration = (ms?: number) => {
    if (ms === undefined || ms === null) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <Drawer title="日志详情" width={720} open={open} onClose={onClose}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 基本信息 */}
        <Descriptions title="基本信息" bordered column={1}>
          <Descriptions.Item label="日志ID">
            <Text copyable>{log.id}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="用户">
            <Space>
              <Text strong>{log.username}</Text>
              <Text type="secondary" copyable={{ text: log.userId }}>
                (ID: {log.userId})
              </Text>
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="操作类型">
            <Tag color="blue">{log.action}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="操作描述">
            {log.description}
          </Descriptions.Item>
          <Descriptions.Item label="操作时间">
            <Space>
              <ClockCircleOutlined />
              <Text>{dayjs(log.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Text>
              <Text type="secondary">({dayjs(log.createdAt).fromNow()})</Text>
            </Space>
          </Descriptions.Item>
        </Descriptions>

        {/* HTTP 请求信息 */}
        {(log.httpMethod ||
          log.path ||
          log.statusCode ||
          log.duration !== undefined) && (
          <>
            <Divider />
            <Descriptions title="HTTP 请求信息" bordered column={1}>
              {log.httpMethod && (
                <Descriptions.Item label="请求方法">
                  <Tag
                    color={getMethodColor(log.httpMethod)}
                    icon={<ApiOutlined />}
                  >
                    {log.httpMethod}
                  </Tag>
                </Descriptions.Item>
              )}
              {log.path && (
                <Descriptions.Item label="请求路径">
                  <Text code copyable>
                    {log.path}
                  </Text>
                </Descriptions.Item>
              )}
              {log.queryString && (
                <Descriptions.Item label="查询参数">
                  <Paragraph
                    code
                    copyable
                    ellipsis={{ rows: 2, expandable: true }}
                    style={{ marginBottom: 0 }}
                  >
                    {log.queryString}
                  </Paragraph>
                </Descriptions.Item>
              )}
              {log.statusCode !== undefined && (
                <Descriptions.Item label="响应状态">
                  {getStatusBadge(log.statusCode)}
                </Descriptions.Item>
              )}
              {log.duration !== undefined && (
                <Descriptions.Item label="请求耗时">
                  <Space>
                    <ThunderboltOutlined />
                    <Text strong>{formatDuration(log.duration)}</Text>
                    {log.duration > 1000 && log.duration <= 3000 && (
                      <Tag color="warning">响应较慢</Tag>
                    )}
                    {log.duration > 3000 && <Tag color="error">响应超时</Tag>}
                  </Space>
                </Descriptions.Item>
              )}
            </Descriptions>
          </>
        )}

        {/* 网络信息 */}
        {(log.ipAddress || log.userAgent) && (
          <>
            <Divider />
            <Descriptions title="网络信息" bordered column={1}>
              {log.ipAddress && (
                <Descriptions.Item label="IP 地址">
                  <Space>
                    <GlobalOutlined />
                    <Text copyable>{log.ipAddress}</Text>
                  </Space>
                </Descriptions.Item>
              )}
              {log.userAgent && (
                <Descriptions.Item label="用户代理">
                  <Paragraph
                    copyable
                    ellipsis={{ rows: 3, expandable: true }}
                    style={{ marginBottom: 0 }}
                  >
                    {log.userAgent}
                  </Paragraph>
                </Descriptions.Item>
              )}
            </Descriptions>
          </>
        )}
      </Space>
    </Drawer>
  );
}
