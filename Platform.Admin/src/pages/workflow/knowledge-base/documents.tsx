import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  App,
  Card,
  Typography,
  Breadcrumb,
  Table,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useIntl, useParams, history } from '@umijs/max';
import PageContainer from '@/components/PageContainer';
import SearchBar from '@/components/SearchBar';
import * as kbService from '@/services/workflow/knowledge-base';
import type { KnowledgeDocument } from '@/services/workflow/knowledge-base';
import type { PageParams } from '@/types/page-params';
import dayjs from 'dayjs';

const { Text } = Typography;
const { TextArea } = Input;

const KnowledgeBaseDocuments: React.FC = () => {
  const intl = useIntl();
  const { knowledgeBaseId } = useParams<{ knowledgeBaseId: string }>();
  const { message, modal } = App.useApp();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingDoc, setEditingDoc] = useState<KnowledgeDocument | null>(null);
  const [form] = Form.useForm();
  const [data, setData] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });
  const [kbInfo, setKbInfo] = useState<{ name: string } | null>(null);

  const searchParamsRef = useRef<PageParams>({
    search: '',
  });

  const fetchData = useCallback(async () => {
    const currentParams = searchParamsRef.current;

    setLoading(true);
    try {
      const res = await kbService.getKnowledgeDocuments(knowledgeBaseId!, {
        page: currentParams.page,
        pageSize: currentParams.pageSize,
        search: currentParams.search,
      });
      if (res.success && res.data) {
        const d = res.data as any;
        setData(d.queryable ?? []);
        setPagination(prev => ({
          ...prev,
          page: currentParams.page ?? prev.page,
          pageSize: currentParams.pageSize ?? prev.pageSize,
          total: d.rowCount ?? 0,
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
  }, [knowledgeBaseId]);

  const handleSearch = useCallback((params: PageParams) => {
    searchParamsRef.current = { ...searchParamsRef.current, ...params, page: 1 };
    fetchData();
  }, [fetchData]);

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

  useEffect(() => {
    if (knowledgeBaseId) {
      kbService.getKnowledgeBase(knowledgeBaseId).then((res) => {
        if (res.success && res.data) {
          setKbInfo({ name: res.data.name });
        }
      });
    }
  }, [knowledgeBaseId]);

  useEffect(() => {
    if (knowledgeBaseId) {
      fetchData();
    }
  }, [knowledgeBaseId, fetchData]);


  const handleDelete = (record: KnowledgeDocument) => {
    modal.confirm({
      title: '确定要删除这篇文档吗？',
      content: '删除后该内容将无法在知识检索中使用。',
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        if (!knowledgeBaseId) return;
        try {
          const res = await kbService.deleteKnowledgeDocument(knowledgeBaseId, record.id);
          if (res.success) {
            message.success('删除成功');
            fetchData();
          }
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      sorter: true,
      render: (text: string) => (
        <Space>
          <FileTextOutlined style={{ color: '#1890ff' }} />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: '摘要',
      dataIndex: 'summary',
      key: 'summary',
      ellipsis: true,
      sorter: true,
      render: (t: string) => t || '-',
    },
    {
      title: '内容预览',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      width: 280,
      sorter: true,
      render: (text: string) => (text ? (text.length > 80 ? `${text.slice(0, 80)}...` : text) : '-'),
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 80,
      sorter: true,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      sorter: true,
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right' as const,
      render: (_: unknown, record: KnowledgeDocument) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingDoc(record);
              form.setFieldsValue({
                title: record.title,
                content: record.content,
                summary: record.summary,
                sortOrder: record.sortOrder,
              });
              setIsModalVisible(true);
            }}
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

  if (!knowledgeBaseId) {
    return (
      <PageContainer>
        <Card>缺少知识库 ID，请从知识库列表进入。</Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={
        <Breadcrumb
          items={[
            { title: <a onClick={() => history.push('/workflow/knowledge-base')}>知识库</a> },
            { title: `${kbInfo?.name ?? '知识库'} - 内容管理` },
          ]}
        />
      }
      extra={
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => history.push('/workflow/knowledge-base')}
          >
            返回知识库
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetchData()}
          >
            刷新
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingDoc(null);
              form.resetFields();
              setIsModalVisible(true);
            }}
          >
            录入内容
          </Button>
        </Space>
      }
    >
      <SearchBar
        initialParams={searchParamsRef.current}
        onSearch={handleSearch}
        style={{ marginBottom: 16 }}
      />

      <Card>
        <Table<KnowledgeDocument>
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
          }}
        />
      </Card>

      <Modal
        title={editingDoc ? '编辑文档' : '录入内容'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={async () => {
          const values = await form.validateFields();
          setLoading(true);
          try {
            const res = editingDoc
              ? await kbService.updateKnowledgeDocument(knowledgeBaseId!, editingDoc.id, values)
              : await kbService.createKnowledgeDocument(knowledgeBaseId!, values);
            if (res.success) {
              message.success('保存成功');
              setIsModalVisible(false);
              fetchData();
            }
          } finally {
            setLoading(false);
          }
        }}
        confirmLoading={loading}
        width={720}
      >
        <Form form={form} layout="vertical" initialValues={{ sortOrder: 0 }}>
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入文档标题" />
          </Form.Item>
          <Form.Item
            name="summary"
            label="摘要（可选）"
          >
            <Input placeholder="简短摘要，便于检索" />
          </Form.Item>
          <Form.Item
            name="content"
            label="内容"
            rules={[{ required: true, message: '请输入具体内容' }]}
          >
            <TextArea
              rows={12}
              placeholder="请输入知识库的具体内容，支持多行文本。工作流中的知识检索节点将基于这些内容进行匹配。"
            />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序">
            <InputNumber style={{ width: '100%' }} min={0} placeholder="数字越小越靠前" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default KnowledgeBaseDocuments;
