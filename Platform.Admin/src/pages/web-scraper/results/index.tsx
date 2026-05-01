import React, { useRef, useState, useCallback, useEffect } from 'react';
import { request, useIntl } from '@umijs/max';
import { Tag, Space, Button, Modal, message, Input, Descriptions, Card, Row, Col, Tabs } from 'antd';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { EyeOutlined, FileTextOutlined, PictureOutlined, LinkOutlined, DatabaseOutlined } from '@ant-design/icons';
import { ApiResponse, PagedResult } from '@/types';

interface WebScrapingResult {
  id: string;
  taskId: string;
  taskName: string;
  logId: string;
  url: string;
  level: number;
  title?: string;
  content?: string;
  images: string[];
  links: string[];
  success: boolean;
  error?: string;
  contentLength: number;
  imageCount: number;
  linkCount: number;
  isFiltered?: boolean;
  isMatched?: boolean;
  matchReason?: string;
  relevanceScore?: number;
  createdAt: string;
}

interface TaskOption {
  id: string;
  name: string;
}

interface ResultStatistics {
  totalResults: number;
  successResults: number;
  failedResults: number;
  matchedResults: number;
  totalImages: number;
  totalLinks: number;
  totalContentLength: number;
}

const WebScraperResults: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentResult, setCurrentResult] = useState<WebScrapingResult | null>(null);
  const [search, setSearch] = useState('');
  const [taskId, setTaskId] = useState<string | undefined>();
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [activeTab, setActiveTab] = useState('content');
  const [statistics, setStatistics] = useState<ResultStatistics | null>(null);
  const intl = useIntl();

  const api = {
    list: (params: any) =>
      request<ApiResponse<PagedResult<WebScrapingResult>>>('/apiservice/api/web-scraper/results', { params }),
    get: (id: string) =>
      request<ApiResponse<WebScrapingResult>>(`/apiservice/api/web-scraper/results/${id}`),
    getTasks: () =>
      request<ApiResponse<PagedResult<{ id: string; name: string }>>>('/apiservice/api/web-scraper/tasks', {
        params: { page: 1, pageSize: 100 },
      }),
    statistics: () =>
      request<ApiResponse<ResultStatistics>>('/apiservice/api/web-scraper/results/statistics'),
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

  const handleViewDetail = useCallback(async (record: WebScrapingResult) => {
    const res = await api.get(record.id);
    if (res.success && res.data) {
      setCurrentResult(res.data);
      setDetailVisible(true);
      setActiveTab('content');
    }
  }, []);

  const columns: ProColumns<WebScrapingResult>[] = [
    {
      title: intl.formatMessage({ id: 'pages.webScraper.results.table.taskName' }),
      dataIndex: 'taskName',
      ellipsis: true,
      sorter: true,
      render: (_, record) => <Tag color="blue">{record.taskName}</Tag>,
    },
    {
      title: intl.formatMessage({ id: 'pages.webScraper.results.table.level' }),
      dataIndex: 'level',
      sorter: true,
      render: (level) => <Tag>{intl.formatMessage({ id: 'pages.webScraper.unit.level' })}{level}</Tag>,
    },
    {
      title: intl.formatMessage({ id: 'pages.webScraper.results.table.url' }),
      dataIndex: 'url',
      ellipsis: true,
      sorter: true,
      render: (_: any, record: WebScrapingResult) => (
        <a href={record.url} target="_blank" rel="noopener noreferrer">
          {record.url}
        </a>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.webScraper.results.table.title' }),
      dataIndex: 'title',
      ellipsis: true,
      sorter: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.webScraper.results.table.status' }),
      dataIndex: 'success',
      sorter: true,
      render: (success) => (
        <Tag color={success ? 'success' : 'error'}>{success ? intl.formatMessage({ id: 'pages.webScraper.results.status.success' }) : intl.formatMessage({ id: 'pages.webScraper.results.status.failed' })}</Tag>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.webScraper.results.table.match' }),
      dataIndex: 'isMatched',
      sorter: true,
      render: (_: any, record: WebScrapingResult) => (
        record.isFiltered ? (
          <Tag color={record.isMatched ? 'green' : 'default'}>
            {record.isMatched ? `${intl.formatMessage({ id: 'pages.webScraper.results.match.matched' })} ${record.relevanceScore || 0}%` : intl.formatMessage({ id: 'pages.webScraper.results.match.unmatched' })}
          </Tag>
        ) : '-'
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.webScraper.results.table.contentLength' }),
      dataIndex: 'contentLength',
      sorter: true,
      render: (_: any, record: WebScrapingResult) => `${(record.contentLength / 1024).toFixed(2)} KB`,
    },
    {
      title: intl.formatMessage({ id: 'pages.webScraper.results.table.imageCount' }),
      dataIndex: 'imageCount',
      sorter: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.webScraper.results.table.linkCount' }),
      dataIndex: 'linkCount',
      sorter: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.webScraper.results.table.scrapeTime' }),
      dataIndex: 'createdAt',
      sorter: true,
      valueType: 'dateTime',
      render: (_: any, record: WebScrapingResult) => record.createdAt ? new Date(record.createdAt).toLocaleString() : '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.webScraper.results.table.action' }),
      key: 'action',
      fixed: 'right',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          {intl.formatMessage({ id: 'pages.webScraper.action.view' })}
        </Button>
      ),
    },
  ];

  const detailColumns = [
    { title: intl.formatMessage({ id: 'pages.webScraper.results.detail.title' }), dataIndex: 'title' },
    { title: intl.formatMessage({ id: 'pages.webScraper.results.detail.url' }), dataIndex: 'url' },
    { title: intl.formatMessage({ id: 'pages.webScraper.results.detail.status' }), dataIndex: 'success', render: (v: boolean) => v ? intl.formatMessage({ id: 'pages.webScraper.results.status.success' }) : intl.formatMessage({ id: 'pages.webScraper.results.status.failed' }) },
    { title: intl.formatMessage({ id: 'pages.webScraper.results.detail.contentLength' }), dataIndex: 'contentLength', render: (v: number) => `${(v / 1024).toFixed(2)} KB` },
    { title: intl.formatMessage({ id: 'pages.webScraper.results.detail.imageCount' }), dataIndex: 'imageCount' },
    { title: intl.formatMessage({ id: 'pages.webScraper.results.detail.linkCount' }), dataIndex: 'linkCount' },
  ];

  return (
    <PageContainer>
      <ProTable<WebScrapingResult>
        headerTitle={
          <Space size={24}>
            <Space><DatabaseOutlined />{intl.formatMessage({ id: 'pages.webScraper.results.title' })}</Space>
            <Space size={12}>
              <Tag color="blue">{intl.formatMessage({ id: 'pages.webScraper.statistics.totalResults' })} {statistics?.totalResults || 0}</Tag>
              <Tag color="success">{intl.formatMessage({ id: 'pages.webScraper.statistics.successResults' })} {statistics?.successResults || 0}</Tag>
              <Tag color="error">{intl.formatMessage({ id: 'pages.webScraper.statistics.failedResults' })} {statistics?.failedResults || 0}</Tag>
              <Tag color="purple">{intl.formatMessage({ id: 'pages.webScraper.statistics.matchedResults' })} {statistics?.matchedResults || 0}</Tag>
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
            placeholder={intl.formatMessage({ id: 'pages.webScraper.results.search.placeholder' })}
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
        title={intl.formatMessage({ id: 'pages.webScraper.results.title.resultDetail' })}
        open={detailVisible}
        onCancel={() => {
          setDetailVisible(false);
          setCurrentResult(null);
        }}
        footer={null}
        width={900}
      >
        {currentResult && (
          <>
            <Descriptions bordered column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label={intl.formatMessage({ id: 'pages.webScraper.results.detail.taskName' })}>{currentResult.taskName}</Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'pages.webScraper.results.detail.url' })}>
                <a href={currentResult.url} target="_blank" rel="noopener noreferrer">
                  {currentResult.url}
                </a>
              </Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'pages.webScraper.results.detail.title' })}>{currentResult.title || '-'}</Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'pages.webScraper.results.detail.status' })}>
                <Tag color={currentResult.success ? 'success' : 'error'}>
                  {currentResult.success ? intl.formatMessage({ id: 'pages.webScraper.results.status.success' }) : intl.formatMessage({ id: 'pages.webScraper.results.status.failed' })}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'pages.webScraper.results.detail.contentLength' })}>
                {(currentResult.contentLength / 1024).toFixed(2)} KB
              </Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'pages.webScraper.results.detail.scrapeTime' })}>
                {currentResult.createdAt ? new Date(currentResult.createdAt).toLocaleString() : '-'}
              </Descriptions.Item>
            </Descriptions>

            {currentResult.error && (
              <Card title={intl.formatMessage({ id: 'pages.webScraper.results.detail.errorInfo' })} size="small" style={{ marginBottom: 16 }}>
                <Tag color="error">{currentResult.error}</Tag>
              </Card>
            )}

            {currentResult.isFiltered && (
              <Card title={intl.formatMessage({ id: 'pages.webScraper.results.detail.aiFilterResult' })} size="small" style={{ marginBottom: 16 }}>
                <Space direction="vertical">
                  <Space>
                    <Tag color={currentResult.isMatched ? 'green' : 'default'}>
                      {currentResult.isMatched ? intl.formatMessage({ id: 'pages.webScraper.results.match.matched' }) : intl.formatMessage({ id: 'pages.webScraper.results.match.unmatched' })}
                    </Tag>
                    <span>{intl.formatMessage({ id: 'pages.webScraper.results.detail.relevance' })}：{currentResult.relevanceScore ?? 0}%</span>
                  </Space>
                  {currentResult.matchReason && (
                    <span style={{ color: '#666' }}>{intl.formatMessage({ id: 'pages.webScraper.results.detail.reason' })}：{currentResult.matchReason}</span>
                  )}
                </Space>
              </Card>
            )}

            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                {
                  key: 'content',
                  label: (
                    <span>
                      <FileTextOutlined /> {intl.formatMessage({ id: 'pages.webScraper.results.tabs.content' })}
                    </span>
                  ),
                  children: (
                    <Card size="small">
                      <pre style={{ maxHeight: 400, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {currentResult.content || intl.formatMessage({ id: 'pages.webScraper.results.noContent' })}
                      </pre>
                    </Card>
                  ),
                },
                {
                  key: 'images',
                  label: (
                    <span>
                      <PictureOutlined /> {intl.formatMessage({ id: 'pages.webScraper.results.tabs.images' })} ({currentResult.images?.length || 0})
                    </span>
                  ),
                  children: (
                    <Row gutter={[8, 8]}>
                      {currentResult.images?.map((img, idx) => (
                        <Col span={8} key={idx}>
                          <Card size="small" cover={<img src={img} alt="" style={{ height: 120, objectFit: 'cover' }} />}>
                            <Card.Meta
                              title={`${intl.formatMessage({ id: 'pages.webScraper.results.tabs.images' })} ${idx + 1}`}
                              description={
                                <a href={img} target="_blank" rel="noopener noreferrer">
                                  {intl.formatMessage({ id: 'pages.webScraper.results.viewOriginal' })}
                                </a>
                              }
                            />
                          </Card>
                        </Col>
                      ))}
                      {(!currentResult.images || currentResult.images.length === 0) && (
                        <Col span={24}>
                          <div style={{ textAlign: 'center', color: '#999' }}>{intl.formatMessage({ id: 'pages.webScraper.results.noImages' })}</div>
                        </Col>
                      )}
                    </Row>
                  ),
                },
                {
                  key: 'links',
                  label: (
                    <span>
                      <LinkOutlined /> {intl.formatMessage({ id: 'pages.webScraper.results.tabs.links' })} ({currentResult.links?.length || 0})
                    </span>
                  ),
                  children: (
                    <div style={{ maxHeight: 400, overflow: 'auto' }}>
                      {currentResult.links?.map((link, idx) => (
                        <div key={idx} style={{ marginBottom: 4 }}>
                          <a href={link} target="_blank" rel="noopener noreferrer">
                            {link}
                          </a>
                        </div>
                      ))}
                      {(!currentResult.links || currentResult.links.length === 0) && (
                        <div style={{ textAlign: 'center', color: '#999' }}>{intl.formatMessage({ id: 'pages.webScraper.results.noLinks' })}</div>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </>
        )}
      </Modal>
    </PageContainer>
  );
};

export default WebScraperResults;