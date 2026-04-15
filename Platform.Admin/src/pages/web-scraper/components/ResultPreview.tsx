import React, { useState } from 'react';
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
}

interface CrawlResult {
  totalPages: number;
  successCount: number;
  failedCount: number;
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

  if (!data) return null;

  const pageColumns = [
    { title: '层级', dataIndex: 'level', key: 'level', width: 80 },
    {
      title: 'URL',
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
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string) => title || '-',
    },
    {
      title: '状态',
      dataIndex: 'success',
      key: 'success',
      width: 100,
      render: (success: boolean) => (
        <Tag color={success ? 'success' : 'error'}>{success ? '成功' : '失败'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: any, record: PageResult) => (
        <Button type="link" size="small" onClick={() => setSelectedPage(record)}>
          详情
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
      title="抓取结果"
      open={visible}
      onCancel={onClose}
      width={1000}
      footer={null}
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="概览" key="summary">
          <Descriptions bordered column={4}>
            <Descriptions.Item label="总页面数">{data.totalPages}</Descriptions.Item>
            <Descriptions.Item label="成功">{data.successCount}</Descriptions.Item>
            <Descriptions.Item label="失败">{data.failedCount}</Descriptions.Item>
            <Descriptions.Item label="总耗时">{data.totalDuration || '-'}</Descriptions.Item>
          </Descriptions>
        </TabPane>

        <TabPane tab={`页面列表 (${data.pages?.length || 0})`} key="pages">
          <Table
            dataSource={data.pages || []}
            columns={pageColumns}
            rowKey={(r, i) => `${r.url}-${i}`}
            pagination={{ pageSize: 10 }}
            size="small"
          />
        </TabPane>

        <TabPane tab={`链接 (${(data.pages || []).reduce((acc, p) => acc + (p.links?.length || 0), 0)})`} key="links">
          <Table
            dataSource={(data.pages || []).flatMap((p) => (p.links || []).map((l) => ({ url: l })))}
            columns={linkColumns}
            rowKey="url"
            pagination={{ pageSize: 20 }}
            size="small"
          />
        </TabPane>

        <TabPane tab={`图片 (${(data.pages || []).reduce((acc, p) => acc + (p.images?.length || 0), 0)})`} key="images">
          <Table
            dataSource={(data.pages || []).flatMap((p) => (p.images || []).map((src) => ({ src })))}
            columns={imageColumns}
            rowKey="src"
            pagination={{ pageSize: 20 }}
            size="small"
          />
        </TabPane>
      </Tabs>

      <Modal
        title="页面详情"
        open={!!selectedPage}
        onCancel={() => setSelectedPage(null)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setSelectedPage(null)}>
            关闭
          </Button>,
        ]}
      >
        {selectedPage && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="URL">
                <a href={selectedPage.url} target="_blank" rel="noopener noreferrer">
                  {selectedPage.url}
                </a>
              </Descriptions.Item>
              <Descriptions.Item label="层级">{selectedPage.level}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={selectedPage.success ? 'success' : 'error'}>
                  {selectedPage.success ? '成功' : '失败'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="标题">{selectedPage.title || '-'}</Descriptions.Item>
            </Descriptions>

            {selectedPage.title && (
              <Card title="标题" size="small">
                <Text strong>{selectedPage.title}</Text>
              </Card>
            )}

            {selectedPage.content && (
              <Card title="内容预览" size="small">
                <Paragraph ellipsis={{ rows: 10, expandable: true, symbol: '展开' }}>
                  {selectedPage.content}
                </Paragraph>
              </Card>
            )}

            {selectedPage.error && (
              <Card title="错误信息" size="small">
                <Text type="danger">{selectedPage.error}</Text>
              </Card>
            )}

            {(selectedPage.images?.length || 0) > 0 && (
              <Card title="图片" size="small">
                <Space wrap>
                  {selectedPage.images.map((img, i) => (
                    <img key={i} src={img} alt="" style={{ maxWidth: 120, maxHeight: 80 }} />
                  ))}
                </Space>
              </Card>
            )}

            {(selectedPage.links?.length || 0) > 0 && (
              <Card title={`链接 (${selectedPage.links.length})`} size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  {selectedPage.links.slice(0, 20).map((link, i) => (
                    <a key={i} href={link} target="_blank" rel="noopener noreferrer">
                      {link}
                    </a>
                  ))}
                  {selectedPage.links.length > 20 && (
                    <Text type="secondary">...还有 {selectedPage.links.length - 20} 个链接</Text>
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
