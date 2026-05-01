import React, { useRef, useState, useCallback, useEffect } from 'react';
import { request, useIntl } from '@umijs/max';
import { Tag, Space, Button, Input, Timeline, Card, Row, Col, Descriptions, Modal, Progress, Statistic } from 'antd';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, WarningOutlined, HistoryOutlined, FileTextOutlined, ScheduleOutlined } from '@ant-design/icons';
import { ApiResponse, PagedResult } from '@/types';

interface WebScrapingLog {
  id: string;
  taskId: string;
  taskName: string;
  startTime: string;
  endTime?: string;
  status: 'Idle' | 'Running' | 'Success' | 'Failed' | 'PartialSuccess';
  duration: number;
  pagesCrawled: number;
  successCount: number;
  failedCount: number;
  errorMessage?: string;
  extractedData?: string;
  createdAt: string;
}

interface TaskOption {
  id: string;
  name: string;
}

interface LogStatistics {
  totalLogs: number;
  successLogs: number;
  failedLogs: number;
  partialSuccessLogs: number;
  runningLogs: number;
  totalPagesCrawled: number;
  averageDuration: number;
}

const WebScraperLogs: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [taskId, setTaskId] = useState<string | undefined>();
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentLog, setCurrentLog] = useState<WebScrapingLog | null>(null);
  const [statistics, setStatistics] = useState<LogStatistics | null>(null);
  const intl = useIntl();

  const api = {
    list: (params: any) =>
      request<ApiResponse<PagedResult<WebScrapingLog>>>('/apiservice/api/web-scraper/logs', { params }),
    get: (id: string) =>
      request<ApiResponse<WebScrapingLog>>(`/apiservice/api/web-scraper/logs/${id}`),
    getTasks: () =>
      request<ApiResponse<PagedResult<{ id: string; name: string }>>>('/apiservice/api/web-scraper/tasks', {
        params: { page: 1, pageSize: 100 },
      }),
    statistics: () =>
      request<ApiResponse<LogStatistics>>('/apiservice/api/web-scraper/logs/statistics'),
  };

  const loadTasks = useCallback(async () => {
    const res = await api.getTasks();
    if (res.success && res.data?.queryable) {
      setTasks(res.data.queryable.map((t) => ({ id: t.id, name: t.name })));
    }
  }, []);

  const loadStatistics = useCallback(() => {
    api.statistics().then(r => {
      if (r.success && r.data) setStatistics(r.data);
    });
  }, []);

  useEffect(() => { loadTasks(); loadStatistics(); }, [loadTasks, loadStatistics]);

  const handleViewDetail = useCallback(async (record: WebScrapingLog) => {
    const res = await api.get(record.id);
    if (res.success && res.data) {
      setCurrentLog(res.data);
      setDetailVisible(true);
    }
  }, []);

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  };

  const getStatusText = (status: string, intl: any) => {
    const statusTextMap: Record<string, string> = {
      Idle: intl.formatMessage({ id: 'pages.webScraper.status.idle' }),
      Running: intl.formatMessage({ id: 'pages.webScraper.status.running' }),
      Success: intl.formatMessage({ id: 'pages.webScraper.status.success' }),
      Failed: intl.formatMessage({ id: 'pages.webScraper.status.failed' }),
      PartialSuccess: intl.formatMessage({ id: 'pages.webScraper.status.partialSuccess' }),
    };
    return statusTextMap[status] || status;
  };

  const getStatusIcon = (status: string, intl: any) => {
    const statusConfig: Record<string, { icon: React.ReactNode; color: string }> = {
      Idle: { icon: <HistoryOutlined />, color: 'default' },
      Running: { icon: <PlayCircleOutlined spin />, color: 'processing' },
      Success: { icon: <CheckCircleOutlined />, color: 'success' },
      Failed: { icon: <CloseCircleOutlined />, color: 'error' },
      PartialSuccess: { icon: <WarningOutlined />, color: 'warning' },
    };
    return statusConfig[status] || { icon: null, color: 'default' };
  };

  const renderStatusTag = (status: string, intl: any) => {
    const config = getStatusIcon(status, intl);
    const text = getStatusText(status, intl);
    return <Tag icon={config.icon} color={config.color}>{text}</Tag>;
  };

  const columns: ProColumns<WebScrapingLog>[] = [
    {
      title: intl.formatMessage({ id: 'pages.webScraper.logs.table.taskName' }),
      dataIndex: 'taskName',
      ellipsis: true,
      sorter: true,
      render: (_, record) => <Tag color="blue">{record.taskName}</Tag>,
    },
    {
      title: intl.formatMessage({ id: 'pages.webScraper.logs.table.status' }),
      dataIndex: 'status',
      sorter: true,
      render: (status) => renderStatusTag(status as string, intl),
    },
    {
      title: intl.formatMessage({ id: 'pages.webScraper.logs.table.startTime' }),
      dataIndex: 'startTime',
      sorter: true,
      valueType: 'dateTime',
      render: (_: any, record: WebScrapingLog) => record.startTime ? new Date(record.startTime).toLocaleString() : '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.webScraper.logs.table.duration' }),
      dataIndex: 'duration',
      sorter: true,
      render: (_: any, record: WebScrapingLog) => formatDuration(record.duration),
    },
    {
      title: intl.formatMessage({ id: 'pages.webScraper.logs.table.progress' }),
      dataIndex: 'pagesCrawled',
      sorter: true,
      render: (pages, record) => {
        const total = record.successCount + record.failedCount;
        const successRate = total > 0 ? (record.successCount / total) * 100 : 0;
        return (
          <div>
            <Progress
              percent={successRate}
              success={{ percent: successRate }}
              size="small"
              format={() => `${record.successCount}/${total}`}
            />
          </div>
        );
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.webScraper.logs.table.successFailed' }),
      dataIndex: 'successCount',
      sorter: true,
      render: (_, record) => (
        <Space>
          <Tag color="success">{intl.formatMessage({ id: 'pages.webScraper.logs.successPages' }, { count: record.successCount })}</Tag>
          {record.failedCount > 0 && <Tag color="error">{intl.formatMessage({ id: 'pages.webScraper.logs.failedPages' }, { count: record.failedCount })}</Tag>}
        </Space>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.webScraper.logs.table.action' }),
      key: 'action',
      fixed: 'right',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<FileTextOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          {intl.formatMessage({ id: 'pages.webScraper.action.detail' })}
        </Button>
      ),
    },
  ];

  return (
    <PageContainer>
      <ProTable<WebScrapingLog>
        headerTitle={
          <Space size={24}>
            <Space><ScheduleOutlined />{intl.formatMessage({ id: 'pages.webScraper.logs.title' })}</Space>
            <Space size={12}>
              <Tag color="blue">{intl.formatMessage({ id: 'pages.webScraper.statistics.totalLogs' })} {statistics?.totalLogs || 0}</Tag>
              <Tag color="success">{intl.formatMessage({ id: 'pages.webScraper.statistics.successLogs' })} {statistics?.successLogs || 0}</Tag>
              <Tag color="error">{intl.formatMessage({ id: 'pages.webScraper.statistics.failedLogs' })} {statistics?.failedLogs || 0}</Tag>
              <Tag color="warning">{intl.formatMessage({ id: 'pages.webScraper.statistics.partialSuccessLogs' })} {statistics?.partialSuccessLogs || 0}</Tag>
            </Space>
          </Space>
        }
        actionRef={actionRef}
        rowKey="id"
        search={false}
        request={async (params: any, sort: any, filter: any) => {
          const res = await api.list({ ...params, taskId, search, sort, filter });
          return {
            data: res.data?.queryable || [],
            success: res.success,
            total: res.data?.rowCount || 0,
          };
        }}
        toolBarRender={() => [
          <Input.Search
            key="search"
            placeholder={intl.formatMessage({ id: 'pages.webScraper.logs.search.placeholder' })}
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={(value) => { setSearch(value); actionRef.current?.reload(); }}
            style={{ width: 260, marginRight: 8 }}
          />,
        ]}
        columns={columns}
        scroll={{ x: 'max-content' }}
      />

      <Modal
        title={intl.formatMessage({ id: 'pages.webScraper.logs.title.logDetail' })}
        open={detailVisible}
        onCancel={() => {
          setDetailVisible(false);
          setCurrentLog(null);
        }}
        footer={null}
        width={800}
      >
        {currentLog && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Statistic
                  title={intl.formatMessage({ id: 'pages.webScraper.logs.detail.taskName' })}
                  value={currentLog.taskName}
                  prefix={<Tag color="blue">{currentLog.taskName}</Tag>}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title={intl.formatMessage({ id: 'pages.webScraper.logs.detail.status' })}
                  value={getStatusText(currentLog.status, intl)}
                  prefix={getStatusIcon(currentLog.status, intl).icon}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title={intl.formatMessage({ id: 'pages.webScraper.logs.detail.duration' })}
                  value={formatDuration(currentLog.duration)}
                />
              </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Statistic title={intl.formatMessage({ id: 'pages.webScraper.logs.detail.startTime' })} value={currentLog.startTime ? new Date(currentLog.startTime).toLocaleString() : '-'} />
              </Col>
              <Col span={8}>
                <Statistic title={intl.formatMessage({ id: 'pages.webScraper.logs.detail.endTime' })} value={currentLog.endTime ? new Date(currentLog.endTime).toLocaleString() : '-'} />
              </Col>
              <Col span={8}>
                <Statistic
                  title={intl.formatMessage({ id: 'pages.webScraper.logs.detail.pagesCrawled' })}
                  value={currentLog.pagesCrawled}
                />
              </Col>
            </Row>

            <Card title={intl.formatMessage({ id: 'pages.webScraper.logs.detail.scrapeStats' })} size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title={intl.formatMessage({ id: 'pages.webScraper.logs.detail.success' })}
                    value={currentLog.successCount}
                    valueStyle={{ color: '#3f8600' }}
                    prefix={<CheckCircleOutlined />}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title={intl.formatMessage({ id: 'pages.webScraper.logs.detail.failed' })}
                    value={currentLog.failedCount}
                    valueStyle={{ color: '#cf1322' }}
                    prefix={<CloseCircleOutlined />}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title={intl.formatMessage({ id: 'pages.webScraper.logs.detail.successRate' })}
                    value={currentLog.pagesCrawled > 0
                      ? ((currentLog.successCount / currentLog.pagesCrawled) * 100).toFixed(1)
                      : 0}
                    suffix="%"
                  />
                </Col>
              </Row>
            </Card>

            {currentLog.errorMessage && (
              <Card title={intl.formatMessage({ id: 'pages.webScraper.logs.detail.errorInfo' })} size="small" style={{ marginBottom: 16 }}>
                <Tag color="error">{currentLog.errorMessage}</Tag>
              </Card>
            )}

            <Timeline
              items={[
                {
                  color: 'blue',
                  children: `${intl.formatMessage({ id: 'pages.webScraper.logs.timeline.startScrape' })}: ${currentLog.startTime ? new Date(currentLog.startTime).toLocaleString() : '-'}`,
                },
                {
                  color: currentLog.status === 'Success' || currentLog.status === 'PartialSuccess' ? 'green' : currentLog.status === 'Failed' ? 'red' : 'gray',
                  children: `${intl.formatMessage({ id: 'pages.webScraper.logs.timeline.scrapeComplete' })}: ${currentLog.endTime ? new Date(currentLog.endTime).toLocaleString() : '-'}`,
                },
                {
                  color: 'gray',
                  children: intl.formatMessage({ id: 'pages.webScraper.logs.timeline.scrapeSummary' }, { total: currentLog.pagesCrawled, success: currentLog.successCount, failed: currentLog.failedCount }),
                },
              ]}
            />
          </>
        )}
      </Modal>
    </PageContainer>
  );
};

export default WebScraperLogs;