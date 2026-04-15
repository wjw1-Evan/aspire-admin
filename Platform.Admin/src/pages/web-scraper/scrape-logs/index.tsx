import React, { useRef, useState, useCallback } from 'react';
import { request } from '@umijs/max';
import { Tag, Space, Button, Input, Timeline, Card, Row, Col, Descriptions, Modal, Progress, Statistic } from 'antd';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, WarningOutlined, HistoryOutlined } from '@ant-design/icons';
import { ApiResponse, PagedResult, PageParams } from '@/types';

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

const statusIcons = {
  Idle: <Tag icon={<HistoryOutlined />} color="default">空闲</Tag>,
  Running: <Tag icon={<PlayCircleOutlined spin />} color="processing">运行中</Tag>,
  Success: <Tag icon={<CheckCircleOutlined />} color="success">成功</Tag>,
  Failed: <Tag icon={<CloseCircleOutlined />} color="error">失败</Tag>,
  PartialSuccess: <Tag icon={<WarningOutlined />} color="warning">部分成功</Tag>,
};

const statusText = {
  Idle: '空闲',
  Running: '运行中',
  Success: '成功',
  Failed: '失败',
  PartialSuccess: '部分成功',
};

const WebScraperLogs: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [taskId, setTaskId] = useState<string | undefined>();
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentLog, setCurrentLog] = useState<WebScrapingLog | null>(null);

  const api = {
    list: (params: PageParams & { taskId?: string }) =>
      request<ApiResponse<PagedResult<WebScrapingLog>>>('/apiservice/api/web-scraper/logs', { params }),
    get: (id: string) =>
      request<ApiResponse<WebScrapingLog>>(`/apiservice/api/web-scraper/logs/${id}`),
    getTasks: () =>
      request<ApiResponse<PagedResult<{ id: string; name: string }>>>('/apiservice/api/web-scraper/tasks', {
        params: { page: 1, pageSize: 100 },
      }),
  };

  const loadTasks = useCallback(async () => {
    const res = await api.getTasks();
    if (res.success && res.data?.queryable) {
      setTasks(res.data.queryable.map((t) => ({ id: t.id, name: t.name })));
    }
  }, []);

  React.useEffect(() => {
    loadTasks();
  }, [loadTasks]);

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

  const columns: ProColumns<WebScrapingLog>[] = [
    {
      title: '任务名称',
      dataIndex: 'taskName',
      width: 150,
      ellipsis: true,
      render: (_, record) => <Tag color="blue">{record.taskName}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (status) => statusIcons[status as keyof typeof statusIcons] || status,
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      width: 160,
      render: (_: any, record: WebScrapingLog) => record.startTime ? new Date(record.startTime).toLocaleString() : '-',
    },
    {
      title: '持续时间',
      dataIndex: 'duration',
      width: 100,
      render: (_: any, record: WebScrapingLog) => formatDuration(record.duration),
    },
    {
      title: '抓取进度',
      dataIndex: 'pagesCrawled',
      width: 200,
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
      title: '成功/失败',
      dataIndex: 'successCount',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tag color="success">{record.successCount} 成功</Tag>
          {record.failedCount > 0 && <Tag color="error">{record.failedCount} 失败</Tag>}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          onClick={() => handleViewDetail(record)}
        >
          详情
        </Button>
      ),
    },
  ];

  return (
    <PageContainer>
      <ProTable<WebScrapingLog>
        headerTitle="抓取日志"
        actionRef={actionRef}
        rowKey="id"
        search={false}
        request={async (params: any) => {
          const res = await api.list({
            page: params.current || 1,
            pageSize: params.pageSize || 10,
            taskId: taskId,
          });
          return {
            data: res.data?.queryable || [],
            success: res.success,
            total: res.data?.rowCount || 0,
          };
        }}
        toolBarRender={() => [
          <Input.Search
            key="search"
            placeholder="搜索..."
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={(value) => { setSearch(value); actionRef.current?.reload(); }}
            style={{ width: 260, marginRight: 8 }}
          />,
        ]}
        columns={columns}
      />

      <Modal
        title="日志详情"
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
                  title="任务名称"
                  value={currentLog.taskName}
                  prefix={<Tag color="blue">{currentLog.taskName}</Tag>}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="状态"
                  value={statusText[currentLog.status as keyof typeof statusText]}
                  prefix={statusIcons[currentLog.status as keyof typeof statusIcons]}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="持续时间"
                  value={formatDuration(currentLog.duration)}
                />
              </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Statistic title="开始时间" value={currentLog.startTime ? new Date(currentLog.startTime).toLocaleString() : '-'} />
              </Col>
              <Col span={8}>
                <Statistic title="结束时间" value={currentLog.endTime ? new Date(currentLog.endTime).toLocaleString() : '-'} />
              </Col>
              <Col span={8}>
                <Statistic
                  title="抓取页面"
                  value={currentLog.pagesCrawled}
                />
              </Col>
            </Row>

            <Card title="抓取统计" size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="成功"
                    value={currentLog.successCount}
                    valueStyle={{ color: '#3f8600' }}
                    prefix={<CheckCircleOutlined />}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="失败"
                    value={currentLog.failedCount}
                    valueStyle={{ color: '#cf1322' }}
                    prefix={<CloseCircleOutlined />}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="成功率"
                    value={currentLog.pagesCrawled > 0
                      ? ((currentLog.successCount / currentLog.pagesCrawled) * 100).toFixed(1)
                      : 0}
                    suffix="%"
                  />
                </Col>
              </Row>
            </Card>

            {currentLog.errorMessage && (
              <Card title="错误信息" size="small" style={{ marginBottom: 16 }}>
                <Tag color="error">{currentLog.errorMessage}</Tag>
              </Card>
            )}

            <Timeline
              items={[
                {
                  color: 'blue',
                  children: `开始抓取: ${currentLog.startTime ? new Date(currentLog.startTime).toLocaleString() : '-'}`,
                },
                {
                  color: currentLog.status === 'Success' || currentLog.status === 'PartialSuccess' ? 'green' : currentLog.status === 'Failed' ? 'red' : 'gray',
                  children: `抓取完成: ${currentLog.endTime ? new Date(currentLog.endTime).toLocaleString() : '-'}`,
                },
                {
                  color: 'gray',
                  children: `共抓取 ${currentLog.pagesCrawled} 个页面，成功 ${currentLog.successCount} 个，失败 ${currentLog.failedCount} 个`,
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
