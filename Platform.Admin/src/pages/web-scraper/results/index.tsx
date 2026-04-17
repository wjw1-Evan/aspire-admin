import React, { useRef, useState, useCallback } from 'react';
import { request } from '@umijs/max';
import { Tag, Space, Button, Modal, message, Input, Descriptions, Card, Row, Col, Tabs } from 'antd';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { EyeOutlined, FileTextOutlined, PictureOutlined, LinkOutlined } from '@ant-design/icons';
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

const WebScraperResults: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentResult, setCurrentResult] = useState<WebScrapingResult | null>(null);
  const [search, setSearch] = useState('');
  const [taskId, setTaskId] = useState<string | undefined>();
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [activeTab, setActiveTab] = useState('content');

  const api = {
    list: (params: any) =>
      request<ApiResponse<PagedResult<WebScrapingResult>>>('/apiservice/api/web-scraper/results', { params }),
    get: (id: string) =>
      request<ApiResponse<WebScrapingResult>>(`/apiservice/api/web-scraper/results/${id}`),
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
      title: '任务名称',
      dataIndex: 'taskName',
      ellipsis: true,
      sorter: true,
      render: (_, record) => <Tag color="blue">{record.taskName}</Tag>,
    },
    {
      title: '层级',
      dataIndex: 'level',
      sorter: true,
      render: (level) => <Tag>第{level}层</Tag>,
    },
    {
      title: 'URL',
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
      title: '标题',
      dataIndex: 'title',
      ellipsis: true,
      sorter: true,
    },
    {
      title: '状态',
      dataIndex: 'success',
      sorter: true,
      render: (success) => (
        <Tag color={success ? 'success' : 'error'}>{success ? '成功' : '失败'}</Tag>
      ),
    },
    {
      title: '匹配',
      dataIndex: 'isMatched',
      sorter: true,
      render: (_: any, record: WebScrapingResult) => (
        record.isFiltered ? (
          <Tag color={record.isMatched ? 'green' : 'default'}>
            {record.isMatched ? `匹配 ${record.relevanceScore || 0}%` : '未匹配'}
          </Tag>
        ) : '-'
      ),
    },
    {
      title: '内容长度',
      dataIndex: 'contentLength',
      sorter: true,
      render: (_: any, record: WebScrapingResult) => `${(record.contentLength / 1024).toFixed(2)} KB`,
    },
    {
      title: '图片数',
      dataIndex: 'imageCount',
      sorter: true,
    },
    {
      title: '链接数',
      dataIndex: 'linkCount',
      sorter: true,
    },
    {
      title: '抓取时间',
      dataIndex: 'createdAt',
      sorter: true,
      valueType: 'dateTime',
      render: (_: any, record: WebScrapingResult) => record.createdAt ? new Date(record.createdAt).toLocaleString() : '-',
    },
    {
      title: '操作',
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
          查看
        </Button>
      ),
    },
  ];

  const detailColumns = [
    { title: '标题', dataIndex: 'title' },
    { title: 'URL', dataIndex: 'url' },
    { title: '状态', dataIndex: 'success', render: (v: boolean) => v ? '成功' : '失败' },
    { title: '内容长度', dataIndex: 'contentLength', render: (v: number) => `${(v / 1024).toFixed(2)} KB` },
    { title: '图片数', dataIndex: 'imageCount' },
    { title: '链接数', dataIndex: 'linkCount' },
  ];

  return (
    <PageContainer>
      <ProTable<WebScrapingResult>
        headerTitle="抓取结果"
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
            placeholder="搜索URL或标题..."
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
        title="抓取结果详情"
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
              <Descriptions.Item label="任务名称">{currentResult.taskName}</Descriptions.Item>
              <Descriptions.Item label="URL">
                <a href={currentResult.url} target="_blank" rel="noopener noreferrer">
                  {currentResult.url}
                </a>
              </Descriptions.Item>
              <Descriptions.Item label="标题">{currentResult.title || '-'}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={currentResult.success ? 'success' : 'error'}>
                  {currentResult.success ? '成功' : '失败'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="内容长度">
                {(currentResult.contentLength / 1024).toFixed(2)} KB
              </Descriptions.Item>
              <Descriptions.Item label="抓取时间">
                {currentResult.createdAt ? new Date(currentResult.createdAt).toLocaleString() : '-'}
              </Descriptions.Item>
            </Descriptions>

            {currentResult.error && (
              <Card title="错误信息" size="small" style={{ marginBottom: 16 }}>
                <Tag color="error">{currentResult.error}</Tag>
              </Card>
            )}

            {currentResult.isFiltered && (
              <Card title="AI筛选结果" size="small" style={{ marginBottom: 16 }}>
                <Space direction="vertical">
                  <Space>
                    <Tag color={currentResult.isMatched ? 'green' : 'default'}>
                      {currentResult.isMatched ? '匹配' : '未匹配'}
                    </Tag>
                    <span>相关度：{currentResult.relevanceScore ?? 0}%</span>
                  </Space>
                  {currentResult.matchReason && (
                    <span style={{ color: '#666' }}>原因：{currentResult.matchReason}</span>
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
                      <FileTextOutlined /> 内容
                    </span>
                  ),
                  children: (
                    <Card size="small">
                      <pre style={{ maxHeight: 400, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {currentResult.content || '无内容'}
                      </pre>
                    </Card>
                  ),
                },
                {
                  key: 'images',
                  label: (
                    <span>
                      <PictureOutlined /> 图片 ({currentResult.images?.length || 0})
                    </span>
                  ),
                  children: (
                    <Row gutter={[8, 8]}>
                      {currentResult.images?.map((img, idx) => (
                        <Col span={8} key={idx}>
                          <Card size="small" cover={<img src={img} alt="" style={{ height: 120, objectFit: 'cover' }} />}>
                            <Card.Meta
                              title={`图片 ${idx + 1}`}
                              description={
                                <a href={img} target="_blank" rel="noopener noreferrer">
                                  查看原图
                                </a>
                              }
                            />
                          </Card>
                        </Col>
                      ))}
                      {(!currentResult.images || currentResult.images.length === 0) && (
                        <Col span={24}>
                          <div style={{ textAlign: 'center', color: '#999' }}>无图片</div>
                        </Col>
                      )}
                    </Row>
                  ),
                },
                {
                  key: 'links',
                  label: (
                    <span>
                      <LinkOutlined /> 链接 ({currentResult.links?.length || 0})
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
                        <div style={{ textAlign: 'center', color: '#999' }}>无链接</div>
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
