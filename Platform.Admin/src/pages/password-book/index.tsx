import React, { useRef, useState, useCallback, useEffect } from 'react';
import { PageContainer } from '@/components';
import { useIntl } from '@umijs/max';
import { Grid, Table } from 'antd';
import {
  Button,
  Tag,
  Space,
  Modal,
  Drawer,
  Row,
  Col,
  Card,
  Form,
  Input,
  Select,
  Descriptions,
  Spin,
} from 'antd';
import { useMessage } from '@/hooks/useMessage';
import { useModal } from '@/hooks/useModal';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  ReloadOutlined,
  LockOutlined,
  FolderOutlined,
  ClockCircleOutlined,
  GlobalOutlined,
  UserOutlined,
  KeyOutlined,
  TagOutlined,
  FileTextOutlined,
  CalendarOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { useBreakpoint } = Grid;
import {
  getPasswordBookList,
  deletePasswordBookEntry,
  getPasswordBookStatistics,
  getCategories,
  getTags,
} from '@/services/password-book/api';
import type { ApiResponse } from '@/types/unified-api';
import type {
  PasswordBookEntry,
  PasswordBookEntryDetail,
  PasswordBookStatistics,
} from './types';
import PasswordBookForm from './components/PasswordBookForm';
import ExportDialog from './components/ExportDialog';
import { StatCard } from '@/components';
import { getPasswordBookEntry } from '@/services/password-book/api';
import useCommonStyles from '@/hooks/useCommonStyles';
import SearchBar from '@/components/SearchBar';
import type { PageParams } from '@/types/page-params';

const PasswordBook: React.FC = () => {
  const intl = useIntl();
  const message = useMessage();
  const modal = useModal();
  const { styles } = useCommonStyles();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [formVisible, setFormVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [exportVisible, setExportVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PasswordBookEntryDetail | null>(null);
  const [viewingEntry, setViewingEntry] = useState<PasswordBookEntryDetail | null>(null);
  const [statistics, setStatistics] = useState<PasswordBookStatistics | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [data, setData] = useState<PasswordBookEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });

  const searchParamsRef = useRef<PageParams>({
    page: 1,
    pageSize: 10,
    search: '',
  });

  const fetchData = useCallback(async () => {
    const currentParams = searchParamsRef.current;

    setLoading(true);
    try {
      const response = await getPasswordBookList(currentParams);
      if (response.success && response.data) {
        setData(response.data.queryable || []);
        setPagination(prev => ({
          ...prev,
          page: currentParams.page ?? prev.page,
          pageSize: currentParams.pageSize ?? prev.pageSize,
          total: response.data.rowCount ?? 0,
        }));
      } else {
        setData([]);
        setPagination(prev => ({ ...prev, total: 0 }));
      }
    } catch {
      setData([]);
      setPagination(prev => ({ ...prev, total: 0 }));
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取统计信息
  const fetchStatistics = useCallback(async () => {
    try {
      const response = await getPasswordBookStatistics();
      if (response.success && response.data) {
        setStatistics(response.data);
      }
    } catch (error) {
      // 错误由全局错误处理统一处理
    }
  }, []);

  // 获取分类列表
  const fetchCategories = useCallback(async () => {
    try {
      const response = await getCategories();
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      // 错误由全局错误处理统一处理
    }
  }, []);

  // 获取标签列表
  const fetchTags = useCallback(async () => {
    try {
      const response = await getTags();
      if (response.success && response.data) {
        setTags(response.data);
      }
    } catch (error) {
      // 错误由全局错误处理统一处理
    }
  }, []);

  useEffect(() => {
    fetchStatistics();
    fetchCategories();
    fetchTags();
    fetchData();
  }, [fetchStatistics, fetchCategories, fetchTags]);

  // 创建
  const handleCreate = useCallback(() => {
    setEditingEntry(null);
    setFormVisible(true);
  }, []);

  // 编辑
  const handleEdit = useCallback(async (entry: PasswordBookEntry) => {
    try {
      const response = await getPasswordBookEntry(entry.id);
      if (response.success && response.data) {
        setEditingEntry(response.data);
        setFormVisible(true);
      }
    } catch (error) {
      message.error('获取条目详情失败');
    }
  }, []);

  // 查看详情
  const handleView = useCallback(async (entry: PasswordBookEntry) => {
    try {
      const response = await getPasswordBookEntry(entry.id);
      if (response.success && response.data) {
        setViewingEntry(response.data);
        setDetailVisible(true);
      }
    } catch (error) {
      message.error('获取条目详情失败');
    }
  }, []);

  // 删除
  const handleDelete = useCallback(
    async (entry: PasswordBookEntry) => {
      modal.confirm({
        title: '确认删除',
        content: `确定要删除平台"${entry.platform}"的账号"${entry.account}"吗？`,
        okText: '删除',
        cancelText: '取消',
        okType: 'danger',
        onOk: async () => {
          try {
            const response = await deletePasswordBookEntry(entry.id);
            if (response.success) {
              message.success('删除成功');
              fetchData();
              fetchStatistics();
            }
          } catch (error) {
            // 错误由全局错误处理统一处理
          }
        },
      });
    },
    [fetchData, fetchStatistics],
  );

  // 表单成功回调
  const handleFormSuccess = useCallback(() => {
    setFormVisible(false);
    setEditingEntry(null);
    fetchData();
    fetchStatistics();
  }, [fetchData, fetchStatistics]);

  // 刷新处理
  const handleRefresh = useCallback(() => {
    fetchData();
    fetchStatistics();
  }, [fetchData, fetchStatistics]);

  // 搜索处理
  const handleSearch = useCallback((params: PageParams) => {
    searchParamsRef.current = { ...searchParamsRef.current, ...params, page: 1 };
    fetchData();
  }, [fetchData]);

  // 表格分页和排序处理
  const handleTableChange = useCallback((pag: any, _filters: any, sorter: any) => {
    const newPage = pag.current;
    const newPageSize = pag.pageSize;
    const sortBy = sorter?.field;
    const sortOrder = sorter?.order === 'ascend' ? 'asc' : sorter?.order === 'descend' ? 'desc' : undefined;
    
    searchParamsRef.current = {
      ...searchParamsRef.current,
      page: newPage,
      pageSize: newPageSize,
      sortBy,
      sortOrder,
    };
    fetchData();
  }, [fetchData]);

  // 表格列定义
  const columns = [
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      sorter: true,
      render: (text: string, record: PasswordBookEntry) => (
        <a
          onClick={() => handleView(record)}
          style={{ cursor: 'pointer', fontWeight: 'bold' }}
        >
          {text}
        </a>
      ),
    },
    {
      title: '账号',
      dataIndex: 'account',
      key: 'account',
      sorter: true,
    },
    {
      title: '网址',
      dataIndex: 'url',
      key: 'url',
      sorter: true,
      render: (url: string) =>
        url ? (
          <a href={url} target="_blank" rel="noopener noreferrer">
            {url}
          </a>
        ) : (
          '-'
        ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      sorter: true,
      render: (category: string) =>
        category ? <Tag color="blue">{category}</Tag> : '-',
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) =>
        tags && tags.length > 0 ? (
          <Space size={[0, 8]} wrap>
            {tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </Space>
        ) : (
          '-'
        ),
    },
    {
      title: '最后使用',
      dataIndex: 'lastUsedAt',
      key: 'lastUsedAt',
      sorter: true,
      render: (date: string) => (date ? new Date(date).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      render: (_: any, record: PasswordBookEntry) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title={
        <Space>
          <LockOutlined />
          {intl.formatMessage({ id: 'menu.password-book' })}
        </Space>
      }
      style={{ paddingBlock: 12 }}
      extra={
        <Space wrap>
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
          >
            {intl.formatMessage({ id: 'pages.button.refresh' })}
          </Button>
          <Button
            key="export"
            icon={<ExportOutlined />}
            onClick={() => setExportVisible(true)}
          >
            导出
          </Button>
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            新建
          </Button>
        </Space>
      }
    >
      {/* 统计卡片区域 */}
      {statistics && (
        <Card className={styles.card} style={{ marginBottom: 16 }}>
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title="总条目数"
                value={statistics.totalEntries}
                icon={<LockOutlined />}
                color="#1890ff"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title="分类数量"
                value={statistics.categoryCount}
                icon={<FolderOutlined />}
                color="#52c41a"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title="标签数量"
                value={statistics.tagCount}
                icon={<TagOutlined />}
                color="#722ed1"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title="最近使用（7天）"
                value={statistics.recentUsedCount}
                icon={<ClockCircleOutlined />}
                color="#faad14"
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* 搜索表单 */}
      <SearchBar
        initialParams={searchParamsRef.current}
        onSearch={handleSearch}
        showResetButton={false}
        style={{ marginBottom: 16 }}
      />

      {/* 数据表格 */}
      <Table<PasswordBookEntry>
        dataSource={data}
        columns={columns}
        rowKey="id"
        loading={loading}
        scroll={{ x: 'max-content' }}
        onChange={handleTableChange}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          pageSizeOptions: [10, 20, 50, 100],
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />

      {/* 创建/编辑表单 */}
      {formVisible && (
        <Modal
          title={editingEntry ? '编辑密码本条目' : '新建密码本条目'}
          open={formVisible}
          onCancel={() => {
            setFormVisible(false);
            setEditingEntry(null);
          }}
          footer={null}
          width={isMobile ? '100%' : 600}
          destroyOnHidden
        >
          <PasswordBookForm
            entry={editingEntry}
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setFormVisible(false);
              setEditingEntry(null);
            }}
          />
        </Modal>
      )}

      {/* 查看详情 */}
      <Drawer
        title="密码本条目详情"
        placement="right"
        open={detailVisible}
        onClose={() => {
          setDetailVisible(false);
          setViewingEntry(null);
        }}
        size={isMobile ? '100%' : 600}
      >
        <Spin spinning={false}>
          {viewingEntry ? (
            <>
              {/* 基本信息 */}
              <Card title="基本信息" style={{ marginBottom: 16 }}>
                <Descriptions column={isMobile ? 1 : 2} size="small">
                  <Descriptions.Item
                    label={
                      <Space>
                        <LockOutlined />
                        平台
                      </Space>
                    }
                    span={2}
                  >
                    <strong>{viewingEntry.platform}</strong>
                  </Descriptions.Item>
                  <Descriptions.Item
                    label={
                      <Space>
                        <UserOutlined />
                        账号
                      </Space>
                    }
                    span={2}
                  >
                    <Space>
                      <span>{viewingEntry.account}</span>
                      <Button
                        type="text"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => {
                          navigator.clipboard.writeText(viewingEntry.account);
                          message.success('账号已复制到剪贴板');
                        }}
                      />
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item
                    label={
                      <Space>
                        <KeyOutlined />
                        密码
                      </Space>
                    }
                    span={2}
                  >
                    <Space.Compact style={{ maxWidth: 400 }}>
                      <Input.Password
                        value={viewingEntry.password}
                        readOnly
                        style={{ flex: 1 }}
                      />
                      <Button
                        type="text"
                        icon={<CopyOutlined />}
                        onClick={() => {
                          navigator.clipboard.writeText(viewingEntry.password);
                          message.success('密码已复制到剪贴板');
                        }}
                      >
                        复制
                      </Button>
                    </Space.Compact>
                  </Descriptions.Item>
                  {viewingEntry.url && (
                    <Descriptions.Item
                      label={
                        <Space>
                          <GlobalOutlined />
                          网址
                        </Space>
                      }
                      span={2}
                    >
                      <a
                        href={viewingEntry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {viewingEntry.url}
                      </a>
                    </Descriptions.Item>
                  )}
                  {viewingEntry.category && (
                    <Descriptions.Item
                      label={
                        <Space>
                          <FolderOutlined />
                          分类
                        </Space>
                      }
                    >
                      <Tag color="blue">{viewingEntry.category}</Tag>
                    </Descriptions.Item>
                  )}
                  {viewingEntry.tags && viewingEntry.tags.length > 0 && (
                    <Descriptions.Item
                      label={
                        <Space>
                          <TagOutlined />
                          标签
                        </Space>
                      }
                      span={viewingEntry.category ? 1 : 2}
                    >
                      <Space wrap>
                        {viewingEntry.tags.map((tag) => (
                          <Tag key={tag}>{tag}</Tag>
                        ))}
                      </Space>
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>

              {/* 备注信息 */}
              {viewingEntry.notes && (
                <Card title="备注信息" style={{ marginBottom: 16 }}>
                  <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {viewingEntry.notes}
                  </div>
                </Card>
              )}

              {/* 时间信息 */}
              <Card title="时间信息" style={{ marginBottom: 16 }}>
                <Descriptions column={isMobile ? 1 : 2} size="small">
                  {viewingEntry.lastUsedAt && (
                    <Descriptions.Item
                      label={
                        <Space>
                          <ClockCircleOutlined />
                          最后使用
                        </Space>
                      }
                    >
                      {dayjs(viewingEntry.lastUsedAt).format('YYYY-MM-DD HH:mm:ss')}
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item
                    label={
                      <Space>
                        <CalendarOutlined />
                        创建时间
                      </Space>
                    }
                  >
                    {dayjs(viewingEntry.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                  </Descriptions.Item>
                  <Descriptions.Item
                    label={
                      <Space>
                        <CalendarOutlined />
                        更新时间
                      </Space>
                    }
                    span={viewingEntry.lastUsedAt ? 1 : 2}
                  >
                    {dayjs(viewingEntry.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              未加载数据
            </div>
          )}
        </Spin>
      </Drawer>

      {/* 导出对话框 */}
      <ExportDialog
        open={exportVisible}
        onClose={() => setExportVisible(false)}
      />
    </PageContainer>
  );
};

export default PasswordBook;
