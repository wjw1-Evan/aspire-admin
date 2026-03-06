import React, { useState, useRef } from 'react';
import {
  Button,
  Space,
  Modal,
  Form,
  Input,
  App,
  Card,
  Typography,
  Tag,
  Switch,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  BookOutlined,
} from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import PageContainer from '@/components/PageContainer';
import DataTable from '@/components/DataTable';
import SearchFormCard from '@/components/SearchFormCard';
import * as kbService from '@/services/workflow/knowledge-base';
import type { KnowledgeBase } from '@/services/workflow/knowledge-base';
import dayjs from 'dayjs';

const { Text } = Typography;

const KnowledgeBaseManagement: React.FC = () => {
  const intl = useIntl();
  const { message, modal } = App.useApp();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingKb, setEditingKb] = useState<KnowledgeBase | null>(null);
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const actionRef = useRef<any>(null);

  const handleSearch = () => {
    actionRef.current?.reload?.();
  };

  const handleReset = () => {
    searchForm.resetFields();
    handleSearch();
  };

  const handleDelete = (record: KnowledgeBase) => {
    modal.confirm({
      title: '确定要删除这个知识库吗？',
      content: '删除后将无法在工作流中使用该知识库进行内容检索。',
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const res = await kbService.deleteKnowledgeBase(record.id);
          if (res.success) {
            message.success('删除成功');
            actionRef.current?.reload?.();
          }
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const columns = [
    {
      title: intl.formatMessage({ id: 'pages.workflow.knowledgeBase.name' }),
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <Space>
          <BookOutlined style={{ color: '#1890ff' }} />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.knowledgeBase.description' }),
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.knowledgeBase.category' }),
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (text: string) => <Tag color="blue">{text || '通用'}</Tag>,
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.knowledgeBase.itemCount' }),
      dataIndex: 'itemCount',
      key: 'itemCount',
      width: 100,
      render: (count: number) => <Tag color="cyan">{count || 0}</Tag>,
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.knowledgeBase.status' }),
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (active: boolean) => (
        <Tag color={active ? 'success' : 'default'}>{active ? '启用' : '禁用'}</Tag>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.knowledgeBase.createdAt' }),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right',
      render: (_: any, record: KnowledgeBase) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingKb(record);
              form.setFieldsValue(record);
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

  return (
    <PageContainer
      title={intl.formatMessage({ id: 'pages.workflow.knowledgeBase.title' })}
      extra={
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              actionRef.current?.reload?.();
            }}
          >
            {intl.formatMessage({ id: 'pages.park.common.refresh' })}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingKb(null);
              form.resetFields();
              setIsModalVisible(true);
            }}
          >
            {intl.formatMessage({ id: 'pages.workflow.knowledgeBase.add' })}
          </Button>
        </Space>
      }
    >
      <SearchFormCard>
        <Form form={searchForm} layout="inline" onFinish={handleSearch}>
          <Form.Item name="keyword">
            <Input placeholder="搜索知识库名称或描述..." style={{ width: 300 }} allowClear />
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
        <DataTable<KnowledgeBase>
          columns={columns as any}
          request={async (params: any) => {
            const searchValues = searchForm.getFieldsValue();
            const res = await kbService.getKnowledgeBases({
              current: params.current || 1,
              pageSize: params.pageSize || 10,
              ...searchValues,
            });
            if (res.success && res.data) {
              return { data: res.data.list, total: res.data.total, success: true };
            }
            return { data: [], total: 0, success: false };
          }}
          actionRef={actionRef}
          rowKey="id"
          search={false}
        />
      </Card>

      <Modal
        title={
          editingKb
            ? intl.formatMessage({ id: 'pages.workflow.knowledgeBase.edit' })
            : intl.formatMessage({ id: 'pages.workflow.knowledgeBase.add' })
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={async () => {
          const values = await form.validateFields();
          setLoading(true);
          try {
            const res = editingKb
              ? await kbService.updateKnowledgeBase(editingKb.id, values)
              : await kbService.createKnowledgeBase(values);
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
        width={600}
      >
        <Form form={form} layout="vertical" initialValues={{ isActive: true }}>
          <Form.Item
            name="name"
            label={intl.formatMessage({ id: 'pages.workflow.knowledgeBase.name' })}
            rules={[{ required: true, message: '请输入知识库名称' }]}
          >
            <Input placeholder="请输入知识库名称，如：财务制度库" />
          </Form.Item>
          <Form.Item
            name="category"
            label={intl.formatMessage({ id: 'pages.workflow.knowledgeBase.category' })}
          >
            <Input placeholder="请输入分类，如：规章制度" />
          </Form.Item>
          <Form.Item
            name="description"
            label={intl.formatMessage({ id: 'pages.workflow.knowledgeBase.description' })}
          >
            <Input.TextArea rows={4} placeholder="请输入知识库描述" />
          </Form.Item>
          <Form.Item
            name="isActive"
            label={intl.formatMessage({ id: 'pages.workflow.knowledgeBase.status' })}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default KnowledgeBaseManagement;
