import React, { useRef, useState, useCallback, useEffect } from 'react';
import { PageContainer, StatCard } from '@/components';
import SearchBar from '@/components/SearchBar';
import { useIntl } from '@umijs/max';
import { Grid, Tag, Space, Modal, Drawer, Row, Col, Card, Input, Descriptions, Spin, App, Button, Table } from 'antd';
import {
  PlusOutlined, ExportOutlined, ReloadOutlined, LockOutlined, FolderOutlined,
  ClockCircleOutlined, GlobalOutlined, UserOutlined, KeyOutlined, TagOutlined,
  CalendarOutlined, CopyOutlined, EditOutlined, DeleteOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getPasswordBookList, deletePasswordBookEntry, getPasswordBookStatistics, getPasswordBookEntry } from '@/services/password-book/api';
import type { PageParams } from '@/types/page-params';
import type { PasswordBookEntry, PasswordBookEntryDetail, PasswordBookStatistics } from './types';
import PasswordBookForm from './components/PasswordBookForm';
import ExportDialog from './components/ExportDialog';
import useCommonStyles from '@/hooks/useCommonStyles';
import type { ColumnsType } from 'antd/es/table';

const PasswordBook: React.FC = () => {
  const intl = useIntl();
  const { message, modal } = App.useApp();
  const { styles } = useCommonStyles();
  const isMobile = !Grid.useBreakpoint().md;

  const [data, setData] = useState<PasswordBookEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });
  const [statistics, setStatistics] = useState<PasswordBookStatistics | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [exportVisible, setExportVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PasswordBookEntryDetail | null>(null);
  const [viewingEntry, setViewingEntry] = useState<PasswordBookEntryDetail | null>(null);

  const searchParamsRef = useRef<PageParams>({ page: 1, pageSize: 10, search: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getPasswordBookList(searchParamsRef.current);
      if (response.success && response.data) {
        setData(response.data.queryable || []);
        setPagination(prev => ({
          ...prev,
          page: searchParamsRef.current.page ?? prev.page,
          pageSize: searchParamsRef.current.pageSize ?? prev.pageSize,
          total: response.data!.rowCount ?? 0,
        }));
      } else {
        setData([]);
        setPagination(prev => ({ ...prev, total: 0 }));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStatistics = useCallback(async () => {
    const res = await getPasswordBookStatistics();
    if (res.success && res.data) setStatistics(res.data);
  }, []);

  const refreshAll = useCallback(() => {
    fetchData();
    fetchStatistics();
  }, [fetchData, fetchStatistics]);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  const handleView = async (entry: PasswordBookEntry) => {
    const res = await getPasswordBookEntry(entry.id);
    if (res.success && res.data) {
      setViewingEntry(res.data);
      setDetailVisible(true);
    } else {
      message.error('获取详情失败');
    }
  };

  const handleEdit = async (entry: PasswordBookEntry) => {
    const res = await getPasswordBookEntry(entry.id);
    if (res.success && res.data) {
      setEditingEntry(res.data);
      setFormVisible(true);
    } else {
      message.error('获取详情失败');
    }
  };

  const handleDelete = (entry: PasswordBookEntry) => {
    modal.confirm({
      title: '确认删除',
      content: '不可逆操作，确定要删除此条目吗？',
      okText: '确定',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        const res = await deletePasswordBookEntry(entry.id);
        if (res.success) {
          message.success('删除成功');
          refreshAll();
        }
      },
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('已复制到剪贴板');
  };

  const statsConfig = [
    { title: '总条目数', value: statistics?.totalEntries, icon: <LockOutlined />, color: '#1890ff' },
    { title: '分类数量', value: statistics?.categoryCount, icon: <FolderOutlined />, color: '#52c41a' },
    { title: '标签数量', value: statistics?.tagCount, icon: <TagOutlined />, color: '#722ed1' },
    { title: '最近使用（7天）', value: statistics?.recentUsedCount, icon: <ClockCircleOutlined />, color: '#faad14' },
  ];

  const columns: ColumnsType<PasswordBookEntry> = [
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      sorter: true,
      render: (text: string, record: PasswordBookEntry) => (
        <a onClick={() => handleView(record)} style={{ cursor: 'pointer', fontWeight: 'bold' }}>{text}</a>
      ),
    },
    { title: '账号', dataIndex: 'account', key: 'account', sorter: true },
    {
      title: '网址',
      dataIndex: 'url',
      key: 'url',
      sorter: true,
      render: (url: string) => url ? <a href={url} target="_blank" rel="noopener noreferrer">{url}</a> : '-',
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      sorter: true,
      render: (category: string) => category ? <Tag color="blue">{category}</Tag> : '-',
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => tags?.length ? (
        <Space size={[0, 8]} wrap>{tags.map(tag => <Tag key={tag}>{tag}</Tag>)}</Space>
      ) : '-',
    },
    {
      title: '最后使用',
      dataIndex: 'lastUsedAt',
      key: 'lastUsedAt',
      sorter: true,
      render: (date: string) => date ? new Date(date).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_, record: PasswordBookEntry) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>删除</Button>
        </Space>
      ),
    },
  ];

  const DetailItem = ({ label, value, copyableText }: { label: React.ReactNode, value: React.ReactNode, copyableText?: string }) => (
    <Descriptions.Item label={label} span={2}>
      <Space>
        {value}
        {copyableText && (
          <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => copyToClipboard(copyableText)} />
        )}
      </Space>
    </Descriptions.Item>
  );

  return (
    <PageContainer
      title={<Space><LockOutlined />{intl.formatMessage({ id: 'menu.password-book' })}</Space>}
      extra={
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={refreshAll}>{intl.formatMessage({ id: 'pages.button.refresh' })}</Button>
          <Button icon={<ExportOutlined />} onClick={() => setExportVisible(true)}>导出</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingEntry(null); setFormVisible(true); }}>新建</Button>
        </Space>
      }
    >
      {statistics && (
        <Card className={styles.card} style={{ marginBottom: 16 }}>
          <Row gutter={[12, 12]}>
            {statsConfig.map((stat, idx) => (
              <Col xs={24} sm={12} md={6} key={idx}>
                <StatCard title={stat.title} value={stat.value ?? 0} icon={stat.icon} color={stat.color} />
              </Col>
            ))}
          </Row>
        </Card>
      )}

      <SearchBar
        initialParams={searchParamsRef.current}
        style={{ marginBottom: 16 }}
        onSearch={(params: PageParams) => {
          searchParamsRef.current = { ...searchParamsRef.current, ...params, page: 1 };
          fetchData();
        }}
      />

      <Table<PasswordBookEntry>
        dataSource={data}
        columns={columns}
        rowKey="id"
        loading={loading}
        scroll={{ x: 'max-content' }}
        onChange={(pag: any, _filters: any, sorter: any) => {
          searchParamsRef.current = {
            ...searchParamsRef.current,
            page: pag.current,
            pageSize: pag.pageSize,
            sortBy: sorter?.field,
            sortOrder: sorter?.order === 'ascend' ? 'asc' : sorter?.order === 'descend' ? 'desc' : undefined,
          };
          fetchData();
        }}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
        }}
      />

      <Modal
        title={editingEntry ? '编辑密码本条目' : '新建密码本条目'}
        open={formVisible}
        onCancel={() => { setFormVisible(false); setEditingEntry(null); }}
        footer={null}
        width={isMobile ? '100%' : 600}
        destroyOnHidden
      >
        <PasswordBookForm
          entry={editingEntry}
          onCancel={() => { setFormVisible(false); setEditingEntry(null); }}
          onSuccess={() => { setFormVisible(false); setEditingEntry(null); refreshAll(); }}
        />
      </Modal>

      <Drawer
        title="密码本条目"
        placement="right"
        open={detailVisible}
        onClose={() => { setDetailVisible(false); setViewingEntry(null); }}
        size={isMobile ? '100%' : 600}
      >
        <Spin spinning={loading}>
          {viewingEntry && (
            <>
              <Card title="基本信息" style={{ marginBottom: 16 }}>
                <Descriptions column={isMobile ? 1 : 2} size="small">
                  <DetailItem label={<><LockOutlined /> 平台</>} value={<strong>{viewingEntry.platform}</strong>} />
                  <DetailItem label={<><UserOutlined /> 账号</>} value={viewingEntry.account} copyableText={viewingEntry.account} />
                  <DetailItem label={<><KeyOutlined /> 密码</>} value={<Input.Password value={viewingEntry.password} variant="borderless" readOnly />} copyableText={viewingEntry.password} />
                  {viewingEntry.url && <DetailItem label={<><GlobalOutlined /> 网址</>} value={<a href={viewingEntry.url} target="_blank" rel="noopener noreferrer">{viewingEntry.url}</a>} />}
                  {viewingEntry.category && <DetailItem label={<><FolderOutlined /> 分类</>} value={<Tag color="blue">{viewingEntry.category}</Tag>} />}
                </Descriptions>
              </Card>

              {viewingEntry.notes && (
                <Card title="备注信息" style={{ marginBottom: 16 }}>
                  <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{viewingEntry.notes}</div>
                </Card>
              )}

              <Card title="时间信息">
                <Descriptions column={isMobile ? 1 : 2} size="small">
                  {viewingEntry.lastUsedAt && <Descriptions.Item label={<><ClockCircleOutlined /> 最后使用</>}>{dayjs(viewingEntry.lastUsedAt).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>}
                  <Descriptions.Item label={<><CalendarOutlined /> 创建时间</>}>{dayjs(viewingEntry.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
                  <Descriptions.Item label={<><CalendarOutlined /> 更新时间</>}>{dayjs(viewingEntry.updatedAt).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
                </Descriptions>
              </Card>
            </>
          )}
        </Spin>
      </Drawer>

      <ExportDialog open={exportVisible} onClose={() => setExportVisible(false)} />
    </PageContainer>
  );
};

export default PasswordBook;