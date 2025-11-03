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
import { useIntl } from '@umijs/max';
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
  const intl = useIntl();
  
  if (!log) return null;

  // 根据状态码获取显示样式
  const getStatusBadge = (statusCode?: number) => {
    if (!statusCode) return null;

    if (statusCode >= 200 && statusCode < 300) {
      return <Badge status="success" text={intl.formatMessage({ id: 'pages.logDetail.statusSuccess' }, { code: statusCode })} />;
    }
    if (statusCode >= 400 && statusCode < 500) {
      return <Badge status="warning" text={intl.formatMessage({ id: 'pages.logDetail.statusClientError' }, { code: statusCode })} />;
    }
    if (statusCode >= 500) {
      return <Badge status="error" text={intl.formatMessage({ id: 'pages.logDetail.statusServerError' }, { code: statusCode })} />;
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
    if (ms < 1000) {
      return intl.formatMessage({ id: 'pages.logDetail.durationMs' }, { ms });
    }
    return intl.formatMessage({ id: 'pages.logDetail.durationS' }, { s: (ms / 1000).toFixed(2) });
  };

  return (
    <Drawer title={intl.formatMessage({ id: 'pages.logDetail.title' })} width={720} open={open} onClose={onClose}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 基本信息 */}
        <Descriptions title={intl.formatMessage({ id: 'pages.logDetail.basicInfo' })} bordered column={1}>
          <Descriptions.Item label={intl.formatMessage({ id: 'pages.logDetail.logId' })}>
            <Text copyable>{log.id}</Text>
          </Descriptions.Item>
          <Descriptions.Item label={intl.formatMessage({ id: 'pages.logDetail.user' })}>
            <Space>
              <Text strong>{log.username}</Text>
              <Text type="secondary" copyable={{ text: log.userId }}>
                ({intl.formatMessage({ id: 'pages.logDetail.userId' }, { userId: log.userId })})
              </Text>
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label={intl.formatMessage({ id: 'pages.logDetail.actionType' })}>
            <Tag color="blue">{log.action}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label={intl.formatMessage({ id: 'pages.logDetail.actionDescription' })}>
            {log.description}
          </Descriptions.Item>
          <Descriptions.Item label={intl.formatMessage({ id: 'pages.logDetail.actionTime' })}>
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
            <Descriptions title={intl.formatMessage({ id: 'pages.logDetail.httpRequestInfo' })} bordered column={1}>
              {log.httpMethod && (
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.logDetail.requestMethod' })}>
                  <Tag
                    color={getMethodColor(log.httpMethod)}
                    icon={<ApiOutlined />}
                  >
                    {log.httpMethod}
                  </Tag>
                </Descriptions.Item>
              )}
              {log.path && (
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.logDetail.requestPath' })}>
                  <Text code copyable>
                    {log.path}
                  </Text>
                </Descriptions.Item>
              )}
              {log.queryString && (
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.logDetail.queryParams' })}>
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
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.logDetail.responseStatus' })}>
                  {getStatusBadge(log.statusCode)}
                </Descriptions.Item>
              )}
              {log.duration !== undefined && (
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.logDetail.requestDuration' })}>
                  <Space>
                    <ThunderboltOutlined />
                    <Text strong>{formatDuration(log.duration)}</Text>
                    {log.duration > 1000 && log.duration <= 3000 && (
                      <Tag color="warning">{intl.formatMessage({ id: 'pages.logDetail.responseSlow' })}</Tag>
                    )}
                    {log.duration > 3000 && <Tag color="error">{intl.formatMessage({ id: 'pages.logDetail.responseTimeout' })}</Tag>}
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
            <Descriptions title={intl.formatMessage({ id: 'pages.logDetail.networkInfo' })} bordered column={1}>
              {log.ipAddress && (
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.logDetail.ipAddress' })}>
                  <Space>
                    <GlobalOutlined />
                    <Text copyable>{log.ipAddress}</Text>
                  </Space>
                </Descriptions.Item>
              )}
              {log.userAgent && (
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.logDetail.userAgent' })}>
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
