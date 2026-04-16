import React, { useRef, useState, useCallback } from 'react';
import { request } from '@umijs/max';
import { Tag, Space, Button, Popconfirm, Modal, message, Switch, Input } from 'antd';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { PlusOutlined, PlayCircleOutlined, DeleteOutlined, EyeOutlined, PauseCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ApiResponse, PagedResult, PageParams } from '@/types';
import TaskForm from './components/TaskForm';
import ResultPreview from './components/ResultPreview';

interface WebScrapingTask {
  id: string;
  name: string;
  targetUrl: string;
  description?: string;
  crawlDepth: number;
  maxPagesPerLevel: number;
  lastStatus: 'Idle' | 'Running' | 'Success' | 'Failed' | 'PartialSuccess';
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
  list: (params: PageParams & { keyword?: string; status?: string }) =>
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
    request<ApiResponse<CrawlResult>>(`/apiservice/api/web-scraper/execute/${id}`, { method: 'POST' }),
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
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [formVisible, setFormVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<WebScrapingTask | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewData, setPreviewData] = useState<CrawlResult | null | undefined>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sorter, setSorter] = useState<{ sortBy: string; sortOrder: string } | undefined>(undefined);

  const handleEdit = useCallback((record: WebScrapingTask) => {
    setEditingTask(record);
    setFormVisible(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    await api.delete(id);
    actionRef.current?.reload();
    message.success('删除成功');
  }, []);

  const handleToggle = useCallback(async (record: WebScrapingTask) => {
    await api.toggle(record.id);
    actionRef.current?.reload();
    message.success(record.isEnabled ? '已禁用' : '已启用');
  }, []);

  const handleExecute = useCallback(async (record: WebScrapingTask) => {
    try {
      const res = await api.execute(record.id);
      if (res.success) {
        message.success(res.message || '抓取任务已启动');
      } else {
        message.error(res.message || '抓取失败');
      }
    } catch {
      message.error('抓取失败');
    }
  }, []);

  const handleStop = useCallback(async (record: WebScrapingTask) => {
    try {
      const res = await api.stop(record.id);
      if (res.success) {
        message.success('任务已停止');
        actionRef.current?.reload();
      }
    } catch {
      message.error('停止失败');
    }
  }, []);

  const handleFormSuccess = useCallback(() => {
    setFormVisible(false);
    setEditingTask(null);
    actionRef.current?.reload();
    message.success(editingTask ? '更新成功' : '创建成功');
  }, [editingTask]);

  const columns: ProColumns<WebScrapingTask>[] = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (dom, record) => (
        <a onClick={() => handleEdit(record)}>{dom}</a>
      ),
    },
    {
      title: '目标URL',
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
      title: '状态',
      dataIndex: 'lastStatus',
      key: 'lastStatus',
      sorter: true,
      render: (dom) => (
        <Tag color={statusColors[dom as string]}>{statusText[dom as string]}</Tag>
      ),
    },
    {
      title: '已抓取',
      dataIndex: 'totalPagesCrawled',
      key: 'totalPagesCrawled',
      sorter: true,
      render: (dom) => `${dom} 页`,
    },
    {
      title: '匹配',
      dataIndex: 'matchedCount',
      key: 'matchedCount',
      sorter: true,
      render: (dom, record) => {
        if (record.enableFilter && (dom as number) > 0) {
          return <Tag color="green">{dom} 页</Tag>;
        }
        return '-';
      },
      hideInSearch: true,
    },
    {
      title: '抓取深度',
      dataIndex: 'crawlDepth',
      key: 'crawlDepth',
      render: (dom) => `深度${dom}`,
      hideInSearch: true,
    },
    {
      title: '每层最大',
      dataIndex: 'maxPagesPerLevel',
      key: 'maxPagesPerLevel',
      render: (dom) => `${dom} 页`,
      hideInSearch: true,
    },
    {
      title: '抓取模式',
      dataIndex: 'mode',
      key: 'mode',
      render: (dom) => {
        const modeMap: Record<string, string> = {
          'singlepage': '单页',
          'depthfirst': '深度优先',
          'breadthfirst': '广度优先',
        };
        return modeMap[dom?.toString().toLowerCase() as string] || dom || '-';
      },
      hideInSearch: true,
    },
    {
      title: '定时',
      dataIndex: 'scheduleCron',
      key: 'scheduleCron',
      render: (dom) => dom ? (
        <Space>
          <Tag color="orange">{dom}</Tag>
          <span style={{ color: '#999', fontSize: 12 }}>({explainCron(dom as string)})</span>
        </Space>
      ) : '-',
      hideInSearch: true,
    },
    {
      title: '最后执行',
      dataIndex: 'lastRunAt',
      key: 'lastRunAt',
      sorter: true,
      render: (dom) => dom ? dayjs(String(dom)).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '耗时',
      dataIndex: 'lastDuration',
      key: 'lastDuration',
      sorter: true,
      render: (dom) => dom ? `${Math.round((dom as number) / 1000)}s` : '-',
    },
    {
      title: '启用',
      dataIndex: 'isEnabled',
      key: 'isEnabled',
      render: (dom, record) => (
        <Switch checked={dom as boolean} onChange={() => handleToggle(record)} />
      ),
    },
    {
      title: '操作',
      key: 'action',
      valueType: 'option',
      fixed: 'right',
      width: 240,
      render: (_, record) => {
        const isRunning = record.lastStatus === 'Running';
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
                停止
              </Button>
            ) : (
              <Button
                type="link"
                size="small"
                icon={<PlayCircleOutlined />}
                onClick={() => handleExecute(record)}
                loading={loading}
              >
                执行
              </Button>
            )}
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
            <Popconfirm
              title="确认删除"
              description="删除后无法恢复"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
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
        headerTitle="网页抓取任务"
        actionRef={actionRef}
        rowKey="id"
        search={false}
        request={async (params: any) => {
          const sortParams = sorter?.sortBy && sorter?.sortOrder ? sorter : undefined;
          const res = await api.list({
            page: params.current,
            keyword: search,
            search: search,
            sortBy: sortParams?.sortBy,
            sortOrder: sortParams?.sortOrder,
          });
          return {
            data: res.data?.queryable || [],
            success: res.success,
            total: res.data?.rowCount || 0,
          };
        }}
        onChange={(_, __, s) => {
          const sorterData = Array.isArray(s) ? s[0] : s;
          setSorter(sorterData?.order ? { sortBy: sorterData.field as string, sortOrder: sorterData.order === 'ascend' ? 'asc' : 'desc' } : undefined);
        }}
        toolBarRender={() => [
          <Input.Search
            key="search"
            placeholder="搜索任务名称或URL..."
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
            新建任务
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
