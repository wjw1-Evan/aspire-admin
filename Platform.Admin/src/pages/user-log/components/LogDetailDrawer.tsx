import React, { useEffect, useState } from 'react';
import {
  Drawer,
  Descriptions,
  Tag,
  Badge,
  Space,
  Typography,
  Divider,
  Spin,
  Grid,
} from 'antd';

const { useBreakpoint } = Grid;
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
import { getCurrentUserActivityLogById } from '@/services/user-log/api';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Text, Paragraph } = Typography;

interface LogDetailDrawerProps {
  readonly open: boolean;
  readonly log?: UserActivityLog | null; // 可选：如果提供 logId，将从 API 获取完整数据
  readonly logId?: string; // 可选：如果提供 logId，将从 API 获取完整数据
  readonly onClose: () => void;
  readonly fetchFromApi?: boolean; // 是否从 API 获取完整数据（默认：如果提供了 logId 则自动获取）
}

export default function LogDetailDrawer({
  open,
  log: initialLog,
  logId,
  onClose,
  fetchFromApi,
}: LogDetailDrawerProps) {
  const intl = useIntl();
  const screens = useBreakpoint();
  const isMobile = !screens.md; // md 以下为移动端
  const [log, setLog] = useState<UserActivityLog | null>(initialLog || null);
  const [loading, setLoading] = useState(false);

  // 当打开抽屉且提供了 logId 时，从 API 获取完整数据
  useEffect(() => {
    const shouldFetch = fetchFromApi !== false && logId && open;
    
    if (shouldFetch) {
      setLoading(true);
      const fetchLogDetail = async () => {
        try {
          const response = await getCurrentUserActivityLogById(logId);
          if (response.success && response.data) {
            setLog(response.data);
          } else {
            setLog(null);
            // 错误由全局错误处理统一处理
          }
        } catch (error) {
          console.error('Failed to fetch log detail:', error);
          setLog(null);
          // 错误由全局错误处理统一处理
        } finally {
          setLoading(false);
        }
      };
      
      void fetchLogDetail();
    } else if (open && initialLog) {
      // 如果没有 logId，使用传入的 log 数据
      setLog(initialLog);
    } else if (!open) {
      // 关闭时重置状态
      setLog(null);
    }
  }, [open, logId, initialLog, fetchFromApi, intl]);
  const formattedResponseBody = React.useMemo(() => {
    if (!log?.responseBody) {
      return null;
    }

    try {
      const parsed = JSON.parse(log.responseBody);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return log.responseBody;
    }
  }, [log?.responseBody]);

  const isResponseTruncated = React.useMemo(
    () => Boolean(log?.responseBody && log.responseBody.endsWith('...(truncated)')),
    [log?.responseBody],
  );
  
  if (!log && !loading) return null;

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
    <Drawer 
      title={intl.formatMessage({ id: 'pages.logDetail.title' })} 
      size={isMobile ? 'large' : 720} 
      open={open} 
      onClose={onClose}
    >
      <Spin spinning={loading}>
        {log ? (
          <Space orientation="vertical" size="large" style={{ width: '100%' }}>
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

        {formattedResponseBody && (
          <>
            <Divider />
            <Descriptions title={intl.formatMessage({ id: 'pages.logDetail.responseBody' })} bordered column={1}>
              <Descriptions.Item label={intl.formatMessage({ id: 'pages.logDetail.responsePreview' })}>
                <Paragraph
                  copyable={{ text: log.responseBody ?? '' }}
                  style={{
                    width: '100%',
                    maxHeight: 320,
                    overflow: 'auto',
                    fontFamily: 'JetBrains Mono, SFMono-Regular, Consolas, Menlo, monospace',
                    whiteSpace: 'pre-wrap',
                    marginBottom: isResponseTruncated ? 8 : 0,
                  }}
                >
                  {formattedResponseBody}
                </Paragraph>
                {isResponseTruncated && (
                  <Text type="secondary">
                    {intl.formatMessage({ id: 'pages.logDetail.responseTruncated' })}
                  </Text>
                )}
              </Descriptions.Item>
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
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Text type="secondary">
              {intl.formatMessage({ id: 'pages.logDetail.noData' }) || '暂无数据'}
            </Text>
          </div>
        )}
      </Spin>
    </Drawer>
  );
}
