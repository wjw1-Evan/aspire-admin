import React, { useState, useRef } from 'react';
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
import DataTable from '@/components/DataTable';
import SearchFormCard from '@/components/SearchFormCard';
import * as kbService from '@/services/workflow/knowledge-base';
import type { KnowledgeDocument } from '@/services/workflow/knowledge-base';
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
  const [searchForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [kbInfo, setKbInfo] = useState<{ name: string } | null>(null);
  const actionRef = useRef<any>(null);

  React.useEffect(() => {
    if (knowledgeBaseId) {
      kbService.getKnowledgeBase(knowledgeBaseId).then((res) => {
        if (res.success && res.data) {
          setKbInfo({ name: res.data.name });
        }
      });
    }
  }, [knowledgeBaseId]);

  const handleSearch = () => {
    actionRef.current?.reload?.();
  };

  const handleReset = () => {
    searchForm.resetFields();
    handleSearch();
  };

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
            actionRef.current?.reload?.();
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
      render: (t: string) => t || '-',
    },
    {
      title: '内容预览',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      width: 280,
      render: (text: string) => (text ? (text.length > 80 ? `${text.slice(0, 80)}...` : text) : '-'),
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 80,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
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
            onClick={() => actionRef.current?.reload?.()}
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
      <SearchFormCard>
        <Form form={searchForm} layout="inline" onFinish={handleSearch}>
          <Form.Item name="keyword">
            <Input placeholder="搜索标题或内容..." style={{ width: 300 }} allowClear />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                搜索
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </SearchFormCard>

      <Card>
        <DataTable<KnowledgeDocument>
          columns={columns}
          request={async (params: { current?: number; pageSize?: number }) => {
            const searchValues = searchForm.getFieldsValue();
            const res = await kbService.getKnowledgeDocuments(knowledgeBaseId, {
              page: params.current ?? 1,
              pageSize: params.pageSize ?? 10,
              ...searchValues,
            });
            if (res.success && res.data) {
              const d = res.data as any;
              return { data: d.queryable ??  [], total: d.rowCount  ?? 0, success: true };
            }
            return { data: [], total: 0, success: false };
          }}
          actionRef={actionRef}
          rowKey="id"
          search={false}
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
              ? await kbService.updateKnowledgeDocument(knowledgeBaseId, editingDoc.id, values)
              : await kbService.createKnowledgeDocument(knowledgeBaseId, values);
            if (res.success) {
              message.success('保存成功');
              setIsModalVisible(false);
              actionRef.current?.reload?.();
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
