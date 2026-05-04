import React, { useState } from 'react';
import { useIntl } from '@umijs/max';
import { Modal, Table, Tabs, Tag, Button, Card, Space, Typography, Descriptions } from 'antd';
import { DownloadOutlined, LinkOutlined, PictureOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface PageResult {
  level: number;
  url: string;
  title?: string;
  content?: string;
  images: string[];
  links: string[];
  success: boolean;
  error?: string;
  isFiltered?: boolean;
  isMatched?: boolean;
  matchReason?: string;
  relevanceScore?: number;
}

interface CrawlResult {
  totalPages: number;
  successCount: number;
  failedCount: number;
  matchedCount?: number;
  filteredCount?: number;
  pages: PageResult[];
  totalDuration?: string;
}

interface ResultPreviewProps {
  visible: boolean;
  data: CrawlResult | null | undefined;
  onClose: () => void;
}

const ResultPreview: React.FC<ResultPreviewProps> = ({ visible, data, onClose }) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [selectedPage, setSelectedPage] = useState<PageResult | null>(null);
  const intl = useIntl();

  if (!data) return null;

  const pageColumns = [
    { title: intl.formatMessage({ id: 'pages.webScraper.resultPreview.col.level' }), dataIndex: 'level', key: 'level', width: 60 },
    {
      title: intl.formatMessage({ id: 'pages.webScraper.resultPreview.col.url' }),
      dataIndex: 'url',
      key: 'url',
      ellipsis: true,
      render: (url: string) => (
        <a href={url} target="_blank" rel="noopener noreferrer">
          {url}
        </a>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.webScraper.resultPreview.col.title' }),
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string) => title || '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.webScraper.resultPreview.col.status' }),
      dataIndex: 'success',
      key: 'success',
      width: 80,
      render: (success: boolean) => (
        <Tag color={success ? 'success' : 'error'}>{success ? intl.formatMessage({ id: 'pages.webScraper.resultPreview.status.success' }) : intl.formatMessage({ id: 'pages.webScraper.resultPreview.status.failed' })}</Tag>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.webScraper.resultPreview.col.match' }),
      width: 80,
      render: (_: any, record: PageResult) => (
        record.isFiltered ? (
          <Tag color={record.isMatched ? 'green' : 'default'}>
            {record.isMatched ? `${intl.formatMessage({ id: 'pages.webScraper.resultPreview.match.matched' })} ${record.relevanceScore || 0}%` : intl.formatMessage({ id: 'pages.webScraper.resultPreview.match.unmatched' })}
          </Tag>
        ) : '-'
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.webScraper.resultPreview.col.action' }),
      key: 'action',
      width: 60,
      render: (_: any, record: PageResult) => (
        <Button type="link" size="small" onClick={() => setSelectedPage(record)}>
          {intl.formatMessage({ id: 'pages.webScraper.resultPreview.detail' })}
        </Button>
      ),
    },
  ];

  const linkColumns = [
    { title: 'URL', dataIndex: 'url', key: 'url', ellipsis: true },
  ];

  const imageColumns = [
    {
      title: '图片',
      dataIndex: 'src',
      key: 'src',
      render: (src: string) => (
        <img src={src} alt="" style={{ maxWidth: 100, maxHeight: 60 }} />
      ),
    },
    { title: '地址', dataIndex: 'src', key: 'src', ellipsis: true },
  ];

  return (
    <Modal
      title={intl.formatMessage({ id: 'pages.webScraper.resultPreview.title' })}
      open={visible}
      onCancel={onClose}
      width={1000}
      footer={null}
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab={intl.formatMessage({ id: 'pages.webScraper.resultPreview.tab.summary' })} key="summary">
          <Descriptions bordered column={4}>
            <Descriptions.Item label={intl.formatMessage({ id: 'pages.webScraper.resultPreview.summary.totalPages' })}>{data.totalPages}</Descriptions.Item>
            <Descriptions.Item label={intl.formatMessage({ id: 'pages.webScraper.resultPreview.summary.success' })}>{data.successCount}</Descriptions.Item>
            <Descriptions.Item label={intl.formatMessage({ id: 'pages.webScraper.resultPreview.summary.failed' })}>{data.failedCount}</Descriptions.Item>
            <Descriptions.Item label={intl.formatMessage({ id: 'pages.webScraper.resultPreview.summary.duration' })}>{data.totalDuration || '-'}</Descriptions.Item>
            {(data.filteredCount !== undefined || data.matchedCount !== undefined) && (
              <>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.webScraper.resultPreview.summary.filtered' })}>{data.filteredCount ?? 0}</Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.webScraper.resultPreview.summary.matched' })}>
                  <Text type="success" strong>{data.matchedCount ?? 0}</Text>
                </Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.webScraper.resultPreview.summary.unmatched' })}>{data.filteredCount! - data.matchedCount!}</Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.webScraper.resultPreview.summary.matchRate' })}>
                  {data.filteredCount! > 0 ? Math.round((data.matchedCount! / data.filteredCount!) * 100) : 0}%
                </Descriptions.Item>
              </>
            )}
          </Descriptions>
        </TabPane>

        <TabPane tab={`${intl.formatMessage({ id: 'pages.webScraper.resultPreview.tab.pages' })} (${data.pages?.length || 0})`} key="pages">
          <Table
            dataSource={data.pages || []}
            columns={pageColumns}
            rowKey={(r, i) => `${r.url}-${i}`}
            pagination={{ pageSize: 10 }}
            size="small"
          />
        </TabPane>

        <TabPane tab={`${intl.formatMessage({ id: 'pages.webScraper.resultPreview.tab.links' })} (${(data.pages || []).reduce((acc, p) => acc + (p.links?.length || 0), 0)})`} key="links">
          <Table
            dataSource={(data.pages || []).flatMap((p) => (p.links || []).map((l) => ({ url: l })))}
            columns={linkColumns}
            rowKey="url"
            pagination={{ pageSize: 20 }}
            size="small"
          />
        </TabPane>

        <TabPane tab={`${intl.formatMessage({ id: 'pages.webScraper.resultPreview.tab.images' })} (${(data.pages || []).reduce((acc, p) => acc + (p.images?.length || 0), 0)})`} key="images">
          <Table
            dataSource={(data.pages || []).flatMap((p) => (p.images || []).map((src) => ({ src })))}
            columns={imageColumns}
            rowKey="src"
            pagination={{ pageSize: 20 }}
            size="small"
          />
        </TabPane>

        {(data.matchedCount ?? 0) > 0 && (
          <TabPane tab={`${intl.formatMessage({ id: 'pages.webScraper.resultPreview.tab.matched' })} (${data.matchedCount})`} key="matched">
            <Table
              dataSource={(data.pages || []).filter((p) => p.isFiltered && p.isMatched)}
              columns={[
                { title: intl.formatMessage({ id: 'pages.webScraper.resultPreview.col.level' }), dataIndex: 'level', key: 'level', width: 60 },
                {
                  title: intl.formatMessage({ id: 'pages.webScraper.resultPreview.col.url' }),
                  dataIndex: 'url',
                  key: 'url',
                  ellipsis: true,
                  render: (url: string) => (
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      {url}
                    </a>
                  ),
                },
                {
                  title: intl.formatMessage({ id: 'pages.webScraper.resultPreview.col.title' }),
                  dataIndex: 'title',
                  key: 'title',
                  ellipsis: true,
                  render: (title: string) => title || '-',
                },
                {
                  title: intl.formatMessage({ id: 'pages.webScraper.resultPreview.col.relevance' }),
                  dataIndex: 'relevanceScore',
                  key: 'relevanceScore',
                  width: 80,
                  render: (score?: number) => `${score ?? 0}%`,
                },
                {
                  title: intl.formatMessage({ id: 'pages.webScraper.resultPreview.col.action' }),
                  key: 'action',
                  width: 60,
                  render: (_: any, record: PageResult) => (
                    <Button type="link" size="small" onClick={() => setSelectedPage(record)}>
                      {intl.formatMessage({ id: 'pages.webScraper.resultPreview.detail' })}
                    </Button>
                  ),
                },
              ]}
              rowKey={(r, i) => `${r.url}-${i}`}
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </TabPane>
        )}
      </Tabs>

      <Modal
        title={intl.formatMessage({ id: 'pages.web-scraper.components.ResultPreview.title.pageDetail' })}
        open={!!selectedPage}
        onCancel={() => setSelectedPage(null)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setSelectedPage(null)}>
            {intl.formatMessage({ id: 'pages.webScraper.resultPreview.close' })}
          </Button>,
        ]}
      >
        {selectedPage && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label={intl.formatMessage({ id: 'pages.webScraper.resultPreview.detail.url' })}>
                <a href={selectedPage.url} target="_blank" rel="noopener noreferrer">
                  {selectedPage.url}
                </a>
              </Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'pages.webScraper.resultPreview.detail.level' })}>{selectedPage.level}</Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'pages.webScraper.resultPreview.detail.status' })}>
                <Tag color={selectedPage.success ? 'success' : 'error'}>
                  {selectedPage.success ? intl.formatMessage({ id: 'pages.webScraper.resultPreview.status.success' }) : intl.formatMessage({ id: 'pages.webScraper.resultPreview.status.failed' })}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'pages.webScraper.resultPreview.detail.title' })}>{selectedPage.title || '-'}</Descriptions.Item>
            </Descriptions>

            {selectedPage.title && (
              <Card title={intl.formatMessage({ id: 'pages.webScraper.resultPreview.detail.title' })} size="small">
                <Text strong>{selectedPage.title}</Text>
              </Card>
            )}

            {selectedPage.isFiltered && (
              <Card title={intl.formatMessage({ id: 'pages.webScraper.resultPreview.detail.aiResult' })} size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space>
                    <Tag color={selectedPage.isMatched ? 'green' : 'default'}>
                      {selectedPage.isMatched ? intl.formatMessage({ id: 'pages.webScraper.resultPreview.match.matched' }) : intl.formatMessage({ id: 'pages.webScraper.resultPreview.match.unmatched' })}
                    </Tag>
                    <Text>{intl.formatMessage({ id: 'pages.webScraper.resultPreview.col.relevance' })}: {selectedPage.relevanceScore ?? 0}%</Text>
                  </Space>
                  {selectedPage.matchReason && (
                    <Text type="secondary">{selectedPage.matchReason}</Text>
                  )}
                </Space>
              </Card>
            )}

            {selectedPage.content && (
              <Card title={intl.formatMessage({ id: 'pages.webScraper.resultPreview.detail.contentPreview' })} size="small">
                <Paragraph ellipsis={{ rows: 10, expandable: true, symbol: intl.formatMessage({ id: 'pages.webScraper.resultPreview.expand' }) }}>
                  {selectedPage.content}
                </Paragraph>
              </Card>
            )}

            {selectedPage.error && (
              <Card title={intl.formatMessage({ id: 'pages.webScraper.resultPreview.detail.error' })} size="small">
                <Text type="danger">{selectedPage.error}</Text>
              </Card>
            )}

            {(selectedPage.images?.length || 0) > 0 && (
              <Card title={intl.formatMessage({ id: 'pages.webScraper.resultPreview.detail.images' })} size="small">
                <Space wrap>
                  {selectedPage.images.map((img, i) => (
                    <img key={i} src={img} alt="" style={{ maxWidth: 120, maxHeight: 80 }} />
                  ))}
                </Space>
              </Card>
            )}

            {(selectedPage.links?.length || 0) > 0 && (
              <Card title={`${intl.formatMessage({ id: 'pages.webScraper.resultPreview.detail.links' })} (${selectedPage.links.length})`} size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  {selectedPage.links.slice(0, 20).map((link, i) => (
                    <a key={i} href={link} target="_blank" rel="noopener noreferrer">
                      {link}
                    </a>
                  ))}
                  {selectedPage.links.length > 20 && (
                    <Text type="secondary">{intl.formatMessage({ id: 'pages.webScraper.resultPreview.detail.moreLinks' }, { count: selectedPage.links.length - 20 })}</Text>
                  )}
                </Space>
              </Card>
            )}
          </Space>
        )}
      </Modal>
    </Modal>
  );
};

export default ResultPreview;
