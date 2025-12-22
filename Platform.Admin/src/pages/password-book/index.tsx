import React, { useRef, useState, useCallback, useEffect } from 'react';
import { PageContainer } from '@/components';
import DataTable from '@/components/DataTable';
import type { ActionType } from '@/types/pro-components';
import { useIntl } from '@umijs/max';
import { Grid } from 'antd';
import {
  Button,
  Tag,
  Space,
  message,
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
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
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
} from '@/services/password-book/api';
import type { ApiResponse } from '@/types/unified-api';
import type {
  PasswordBookEntry,
  PasswordBookEntryDetail,
  PasswordBookQueryRequest,
  PasswordBookListResponse,
  PasswordBookStatistics,
} from './types';
import PasswordBookForm from './components/PasswordBookForm';
import ExportDialog from './components/ExportDialog';
import { StatCard } from '@/components';
import { getPasswordBookEntry } from '@/services/password-book/api';

const PasswordBook: React.FC = () => {
  const intl = useIntl();
  const screens = useBreakpoint();
  const isMobile = !screens.md; // md 以下为移动端
  const actionRef = useRef<ActionType>(null);
  const [searchForm] = Form.useForm();
  const [formVisible, setFormVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [exportVisible, setExportVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PasswordBookEntryDetail | null>(null);
  const [viewingEntry, setViewingEntry] = useState<PasswordBookEntryDetail | null>(null);
  const [statistics, setStatistics] = useState<PasswordBookStatistics | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchParams, setSearchParams] = useState<PasswordBookQueryRequest>({
    current: 1,
    pageSize: 10,
  });

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

  useEffect(() => {
    fetchStatistics();
    fetchCategories();
  }, [fetchStatistics, fetchCategories]);

  // 获取密码本列表
  const fetchEntries = useCallback(
    async (params: any) => {
      const requestData: PasswordBookQueryRequest = {
        current: params.current || searchParams.current,
        pageSize: params.pageSize || searchParams.pageSize,
        platform: searchParams.platform,
        account: searchParams.account,
        category: searchParams.category,
        tags: searchParams.tags,
        keyword: searchParams.keyword,
      };

      try {
        const response = await getPasswordBookList(requestData);
        if (response.success && response.data) {
          return {
            data: response.data.data,
            success: true,
            total: response.data.total,
          };
        }
        return { data: [], success: false, total: 0 };
      } catch (error) {
        return { data: [], success: false, total: 0 };
      }
    },
    [searchParams],
  );

  // 搜索
  const handleSearch = useCallback(
    (values: any) => {
      const newParams: PasswordBookQueryRequest = {
        current: 1,
        pageSize: searchParams.pageSize,
        platform: values.platform,
        account: values.account,
        category: values.category,
        tags: values.tags,
        keyword: values.keyword,
      };
      setSearchParams(newParams);
      actionRef.current?.reload();
    },
    [searchParams.pageSize],
  );

  // 重置搜索
  const handleReset = useCallback(() => {
    searchForm.resetFields();
    const resetParams: PasswordBookQueryRequest = {
      current: 1,
      pageSize: searchParams.pageSize,
    };
    setSearchParams(resetParams);
    actionRef.current?.reload();
  }, [searchForm, searchParams.pageSize]);

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
      Modal.confirm({
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
              actionRef.current?.reload();
              fetchStatistics();
            }
          } catch (error) {
            // 错误由全局错误处理统一处理
          }
        },
      });
    },
    [fetchStatistics],
  );

  // 表单成功回调
  const handleFormSuccess = useCallback(() => {
    setFormVisible(false);
    setEditingEntry(null);
    actionRef.current?.reload();
    fetchStatistics();
  }, [fetchStatistics]);

  // 刷新处理
  const handleRefresh = useCallback(() => {
    actionRef.current?.reload();
    fetchStatistics();
  }, [fetchStatistics]);

  // 表格列定义
  const columns = [
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      width: 150,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: '账号',
      dataIndex: 'account',
      key: 'account',
      width: 200,
    },
    {
      title: '网址',
      dataIndex: 'url',
      key: 'url',
      width: 200,
      ellipsis: true,
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
      width: 120,
      render: (category: string) =>
        category ? <Tag color="blue">{category}</Tag> : '-',
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 200,
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
      width: 180,
      render: (date: string) => (date ? new Date(date).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: PasswordBookEntry) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            查看
          </Button>
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
        <Card style={{ marginBottom: 16, borderRadius: 12 }}>
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
      <Card style={{ marginBottom: 16 }}>
        <Form
          form={searchForm}
          layout={isMobile ? 'vertical' : 'inline'}
          onFinish={handleSearch}
          style={{ marginBottom: 16 }}
        >
          <Form.Item name="keyword" label="关键词">
            <Input placeholder="关键词搜索（平台、账号、备注）" allowClear style={{ width: isMobile ? '100%' : 200 }} />
          </Form.Item>
          <Form.Item name="platform" label="平台名称">
            <Input placeholder="平台名称" allowClear style={{ width: isMobile ? '100%' : 150 }} />
          </Form.Item>
          <Form.Item name="category" label="分类">
            <Select
              placeholder="选择分类"
              allowClear
              style={{ width: isMobile ? '100%' : 150 }}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={categories.map((cat) => ({ label: cat, value: cat }))}
            />
          </Form.Item>
          <Form.Item>
            <Space wrap>
              <Button 
                type="primary" 
                htmlType="submit"
                style={isMobile ? { width: '100%' } : {}}
              >
                搜索
              </Button>
              <Button 
                onClick={handleReset}
                style={isMobile ? { width: '100%' } : {}}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* 数据表格 */}
      <DataTable<PasswordBookEntry>
        actionRef={actionRef}
        request={fetchEntries}
        columns={columns}
        rowKey="id"
        scroll={{ x: 'max-content' }}
        search={false}
        pagination={{
          defaultPageSize: 10,
          pageSizeOptions: [10, 20, 50, 100],
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />

      {/* 创建/编辑表单 */}
      <Drawer
        title={editingEntry ? '编辑密码本条目' : '新建密码本条目'}
        open={formVisible}
        onClose={() => {
          setFormVisible(false);
          setEditingEntry(null);
        }}
        width={isMobile ? '100%' : 600}
        destroyOnClose
      >
        <PasswordBookForm
          entry={editingEntry}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setFormVisible(false);
            setEditingEntry(null);
          }}
        />
      </Drawer>

      {/* 查看详情 */}
      <Drawer
        title="密码本条目详情"
        placement="right"
        open={detailVisible}
        onClose={() => {
          setDetailVisible(false);
          setViewingEntry(null);
        }}
        width={isMobile ? '100%' : 600}
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
        visible={exportVisible}
        onClose={() => setExportVisible(false)}
      />
    </PageContainer>
  );
};

export default PasswordBook;
