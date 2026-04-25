import React, { useRef, useState, useCallback } from 'react';
import { request } from '@umijs/max';
import { Tag, Space, Button, Popconfirm, Modal, message, Switch, Input } from 'antd';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { PlusOutlined, PlayCircleOutlined, DeleteOutlined, EyeOutlined, PauseCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ApiResponse, PagedResult } from '@/types';
import TaskForm from './components/TaskForm';
import ResultPreview from './components/ResultPreview';
import { getIntl } from '@umijs/max';

interface WebScrapingTask {
  id: string;
  name: string;
  targetUrl: string;
  description?: string;
  crawlDepth: number;
  maxPagesPerLevel: number;
  lastStatus: 'idle' | 'running' | 'success' | 'failed' | 'partialSuccess' | 'Idle' | 'Running' | 'Success' | 'Failed' | 'PartialSuccess';
  lastRunAt?: string;
  lastDuration?: number;
  lastError?: string;
  totalPagesCrawled: number;
  resultCount: number;
  matchedCount?: number;
  isEnabled: boolean;
  scheduleCron?: string;
  followExternalLinks?: boolean;
  deduplicate?: boolean;
  mode?: 'SinglePage' | 'DepthFirst' | 'BreadthFirst';
  filterPrompt?: string;
  enableFilter?: boolean;
  notifyOnMatch?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PageResult {
  level: number;
  url: string;
  title?: string;
  content?: string;
  images: string[];
  links: string[];
  success: boolean;
  error?: string;
}

interface CrawlResult {
  totalPages: number;
  successCount: number;
  failedCount: number;
  pages: PageResult[];
  totalDuration?: string;
}

interface ScrapeResult {
  success: boolean;
  message?: string;
  data?: CrawlResult;
}

const api = {
  list: (params: any) =>
    request<ApiResponse<PagedResult<WebScrapingTask>>>('/apiservice/api/web-scraper/tasks', { params }),
  get: (id: string) =>
    request<ApiResponse<WebScrapingTask>>(`/apiservice/api/web-scraper/tasks/${id}`),
  delete: (id: string) =>
    request<ApiResponse<void>>(`/apiservice/api/web-scraper/tasks/${id}`, { method: 'DELETE' }),
  create: (data: Partial<WebScrapingTask>) =>
    request<ApiResponse<WebScrapingTask>>('/apiservice/api/web-scraper/tasks', { method: 'POST', data }),
  update: (id: string, data: Partial<WebScrapingTask>) =>
    request<ApiResponse<WebScrapingTask>>(`/apiservice/api/web-scraper/tasks/${id}`, { method: 'PUT', data }),
  toggle: (id: string) =>
    request<ApiResponse<WebScrapingTask>>(`/apiservice/api/web-scraper/tasks/${id}/toggle`, { method: 'POST' }),
  execute: (id: string) =>
    request<ApiResponse<any>>(`/apiservice/api/web-scraper/execute/${id}`, { method: 'POST' }),
  stop: (id: string) =>
    request<ApiResponse<void>>(`/apiservice/api/web-scraper/tasks/${id}/stop`, { method: 'POST' }),
};

const statusColors: Record<string, string> = {
  Idle: 'default',
  idle: 'default',
  Running: 'processing',
  running: 'processing',
  Success: 'success',
  success: 'success',
  Failed: 'error',
  failed: 'error',
  PartialSuccess: 'warning',
  partialSuccess: 'warning',
};

const statusText: Record<string, string> = {
  Idle: '空闲',
  idle: '空闲',
  Running: '运行中',
  running: '运行中',
  Success: '成功',
  success: '成功',
  Failed: '失败',
  failed: '失败',
  PartialSuccess: '部分成功',
  partialSuccess: '部分成功',
};

const explainCron = (cron: string): string => {
  const parts = cron?.trim().split(/\s+/);
  if (parts?.length !== 5) return cron;
  const [min, hour, day, month, week] = parts;
  if (min === '*' && hour === '*') return '每分钟执行';
  if (min === '0' && hour === '*') return '每小时整点执行';
  if (min === '0' && hour === '0' && day === '*') return '每天凌晨执行';
  if (week === '1' && min === '0' && hour === '0') return '每周一执行';
  if (day === '1' && month === '*' && min === '0' && hour === '0') return '每月1号执行';
  return `${hour}:${min.padStart(2, '0')} 执行`;
};

const WebScraper: React.FC = () => {
  const intl = getIntl();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [formVisible, setFormVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<WebScrapingTask | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewData, setPreviewData] = useState<CrawlResult | null | undefined>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const handleEdit = useCallback((record: WebScrapingTask) => {
    setEditingTask(record);
    setFormVisible(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    await api.delete(id);
    actionRef.current?.reload();
    message.success(intl.formatMessage({ id: 'pages.message.deleteSuccess' }));
  }, []);

  const handleToggle = useCallback(async (record: WebScrapingTask) => {
    await api.toggle(record.id);
    actionRef.current?.reload();
    message.success(record.isEnabled ? intl.formatMessage({ id: 'pages.webScraper.message.disabled' }) : intl.formatMessage({ id: 'pages.webScraper.message.enabled' }));
  }, []);

  const handleExecute = useCallback(async (record: WebScrapingTask) => {
    try {
      const res = await api.execute(record.id);
      message.success(res.data?.message || intl.formatMessage({ id: 'pages.webScraper.message.started' }));
      actionRef.current?.reload();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || intl.formatMessage({ id: 'pages.webScraper.message.executeFailed' }));
    }
  }, []);

  const handleStop = useCallback(async (record: WebScrapingTask) => {
    try {
      await api.stop(record.id);
      message.success(intl.formatMessage({ id: 'pages.webScraper.message.stopped' }));
      actionRef.current?.reload();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || intl.formatMessage({ id: 'pages.webScraper.message.stopFailed' }));
    }
  }, []);

  const handleFormSuccess = useCallback(() => {
    setFormVisible(false);
    setEditingTask(null);
    actionRef.current?.reload();
    message.success(editingTask ? intl.formatMessage({ id: 'pages.message.updateSuccess' }) : intl.formatMessage({ id: 'pages.message.createSuccess' }));
  }, [editingTask]);

  const columns: ProColumns<WebScrapingTask>[] = [
    {
      title: intl.formatMessage({ id: 'pages.webScraper.table.taskName' }),
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (dom, record) => (
        <a onClick={() => handleEdit(record)}>{dom}</a>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.webScraper.table.targetUrl' }),
      dataIndex: 'targetUrl',
      key: 'targetUrl',
      ellipsis: true,
      sorter: true,
      render: (dom) => (
        <a href={dom as string} target="_blank" rel="noopener noreferrer">
          {dom}
        </a>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.webScraper.table.status' }),
      dataIndex: 'lastStatus',
      key: 'lastStatus',
      sorter: true,
      render: (dom) => (
        <Tag color={statusColors[dom as string]}>{statusText[dom as string]}</Tag>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.webScraper.table.crawled' }),
      dataIndex: 'totalPagesCrawled',
      key: 'totalPagesCrawled',
      sorter: true,
      render: (dom) => `${dom} ${intl.formatMessage({ id: 'pages.webScraper.unit.page' })}`,
    },
    {
      title: intl.formatMessage({ id: 'pages.webScraper.table.matched' }),
      dataIndex: 'matchedCount',
      key: 'matchedCount',
      sorter: true,
      render: (dom, record) => {
        if (record.enableFilter && (dom as number) > 0) {
          return <Tag color="green">{dom} {intl.formatMessage({ id: 'pages.webScraper.unit.page' })}</Tag>;
        }
        return '-';
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.webScraper.table.crawlDepth' }),
      dataIndex: 'crawlDepth',
      key: 'crawlDepth',
      render: (dom) => `${intl.formatMessage({ id: 'pages.webScraper.unit.depth' })}${dom}`,
    },
    {
      title: intl.formatMessage({ id: 'pages.webScraper.table.maxPagesPerLevel' }),
      dataIndex: 'maxPagesPerLevel',
      key: 'maxPagesPerLevel',
      render: (dom) => `${dom} ${intl.formatMessage({ id: 'pages.webScraper.unit.page' })}`,
    },
    {
      title: intl.formatMessage({ id: 'pages.webScraper.table.mode' }),
      dataIndex: 'mode',
      key: 'mode',
      render: (dom) => {
        const modeMap: Record<string, string> = {
          'singlepage': intl.formatMessage({ id: 'pages.webScraper.mode.singlePage' }),
          'depthfirst': intl.formatMessage({ id: 'pages.webScraper.mode.depthFirst' }),
          'breadthfirst': intl.formatMessage({ id: 'pages.webScraper.mode.breadthFirst' }),
        };
        return modeMap[dom?.toString().toLowerCase() as string] || dom || '-';
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.webScraper.table.schedule' }),
      dataIndex: 'scheduleCron',
      key: 'scheduleCron',
      render: (dom) => dom ? (
        <Space>
          <Tag color="orange">{dom}</Tag>
          <span style={{ color: '#999', fontSize: 12 }}>({explainCron(dom as string)})</span>
        </Space>
      ) : '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.webScraper.table.lastRun' }),
      dataIndex: 'lastRunAt',
      key: 'lastRunAt',
      sorter: true,
      render: (dom) => dom ? dayjs(String(dom)).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.webScraper.table.duration' }),
      dataIndex: 'lastDuration',
      key: 'lastDuration',
      sorter: true,
      render: (dom) => dom ? `${Math.round((dom as number) / 1000)}s` : '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.webScraper.table.enabled' }),
      dataIndex: 'isEnabled',
      key: 'isEnabled',
      render: (dom, record) => (
        <Switch checked={dom as boolean} onChange={() => handleToggle(record)} />
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.table.action' }),
      key: 'action',
      valueType: 'option',
      fixed: 'right',
      width: 240,
      render: (_, record) => {
        const isRunning = record.lastStatus === 'Running' || record.lastStatus === 'running';
        return (
          <Space size={4}>
            {isRunning ? (
              <Button
                type="link"
                size="small"
                icon={<PauseCircleOutlined />}
                onClick={() => handleStop(record)}
                loading={loading}
                danger
              >
                {intl.formatMessage({ id: 'pages.webScraper.action.stop' })}
              </Button>
            ) : (
              <Button
                type="link"
                size="small"
                icon={<PlayCircleOutlined />}
                onClick={() => handleExecute(record)}
                loading={loading}
              >
                {intl.formatMessage({ id: 'pages.webScraper.action.execute' })}
              </Button>
            )}
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleEdit(record)}
            >
              {intl.formatMessage({ id: 'pages.table.edit' })}
            </Button>
            <Popconfirm
              title={intl.formatMessage({ id: 'pages.webScraper.modal.confirmDelete' })}
              description={intl.formatMessage({ id: 'pages.webScraper.modal.deleteDescription' })}
              onConfirm={() => handleDelete(record.id)}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                {intl.formatMessage({ id: 'pages.table.delete' })}
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <PageContainer>
      <ProTable<WebScrapingTask>
        headerTitle={intl.formatMessage({ id: 'pages.webScraper.title' })}
        actionRef={actionRef}
        rowKey="id"
        search={false}
        request={async (params: any, sort: any, filter: any) => {
          const res = await api.list({ ...params, keyword: search, search, sort, filter });
          return {
            data: res.data?.queryable || [],
            success: res.success,
            total: res.data?.rowCount || 0,
          };
        }}
        toolBarRender={() => [
          <Input.Search
            key="search"
            placeholder={intl.formatMessage({ id: 'pages.webScraper.search.placeholder' })}
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={(value) => { setSearch(value); actionRef.current?.reload(); }}
            style={{ width: 260, marginRight: 8 }}
          />,
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingTask(null);
              setFormVisible(true);
            }}
          >
            {intl.formatMessage({ id: 'pages.webScraper.button.createTask' })}
          </Button>,
        ]}
        columns={columns}
        scroll={{ x: 'max-content' }}
      />

      <TaskForm
        visible={formVisible}
        task={editingTask}
        onCancel={() => {
          setFormVisible(false);
          setEditingTask(null);
        }}
        onSuccess={handleFormSuccess}
      />

      <ResultPreview
        visible={previewVisible}
        data={previewData}
        onClose={() => {
          setPreviewVisible(false);
          setPreviewData(null);
        }}
      />
    </PageContainer>
  );
};

export default WebScraper;
