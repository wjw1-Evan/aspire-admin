import React, { useState } from 'react';
import { Button, Space, Modal, Form, Input, Switch, Tag, App } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, BookOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { useIntl, history } from '@umijs/max';
import { PageContainer } from '@ant-design/pro-components';
import { ProTable, ProColumns } from '@ant-design/pro-table';
import * as kbService from '@/services/workflow/knowledge-base';
import type { KnowledgeBase } from '@/services/workflow/knowledge-base';
import type { PageParams } from '@/types';
import dayjs from 'dayjs';

const KnowledgeBaseManagement: React.FC = () => {
  const intl = useIntl();
  const { message } = App.useApp();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingKb, setEditingKb] = useState<KnowledgeBase | null>(null);
  const [form] = Form.useForm();

  const handleDelete = (record: KnowledgeBase) => {
    Modal.confirm({
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
          }
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const columns: ProColumns<KnowledgeBase>[] = [
    {
      title: intl.formatMessage({ id: 'pages.workflow.knowledgeBase.name' }),
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (dom: any) => (
        <Space>
          <BookOutlined style={{ color: '#1890ff' }} />
          <span style={{ fontWeight: 500 }}>{dom}</span>
        </Space>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.knowledgeBase.description' }),
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      sorter: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.knowledgeBase.category' }),
      dataIndex: 'category',
      key: 'category',
      width: 120,
      sorter: true,
      render: (dom: any) => <Tag color="blue">{dom || '通用'}</Tag>,
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.knowledgeBase.itemCount' }),
      dataIndex: 'itemCount',
      key: 'itemCount',
      width: 100,
      sorter: true,
      render: (dom: any) => <Tag color="cyan">{dom || 0}</Tag>,
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.knowledgeBase.status' }),
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      sorter: true,
      valueType: 'switch',
      render: (dom: any, record: KnowledgeBase) => (
        <Tag color={record.isActive ? 'success' : 'default'}>{record.isActive ? '启用' : '禁用'}</Tag>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.knowledgeBase.createdAt' }),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      sorter: true,
      valueType: 'dateTime',
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      fixed: 'right',
      valueType: 'option',
      render: (_: any, record: KnowledgeBase) => (
        <Space>
          <Button type="link" size="small" icon={<FolderOpenOutlined />} onClick={() => history.push(`/workflow/knowledge-base/documents/${record.id}`)}>管理内容</Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { setEditingKb(record); form.setFieldsValue(record); setIsModalVisible(true); }}>编辑</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title={intl.formatMessage({ id: 'pages.workflow.knowledgeBase.title' })}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingKb(null); form.resetFields(); setIsModalVisible(true); }}>
          {intl.formatMessage({ id: 'pages.workflow.knowledgeBase.add' })}
        </Button>
      }
    >
      <ProTable
        headerTitle="知识库列表"
        rowKey="id"
        search={{ labelWidth: 'auto' }}
        request={async (params: any) => {
          const { current, pageSize, ...rest } = params;
          const res = await kbService.getKnowledgeBases({ page: current, pageSize, ...rest } as PageParams);
          if (res.success && res.data) {
            return { data: res.data.queryable || [], total: res.data.rowCount || 0, success: true };
          }
          return { data: [], total: 0, success: false };
        }}
        columns={columns}
        scroll={{ x: 'max-content' }}
      />

      <Modal
        title={editingKb ? intl.formatMessage({ id: 'pages.workflow.knowledgeBase.edit' }) : intl.formatMessage({ id: 'pages.workflow.knowledgeBase.add' })}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={async () => {
          const values = await form.validateFields();
          try {
            if (editingKb) {
              await kbService.updateKnowledgeBase(editingKb.id, values);
            } else {
              await kbService.createKnowledgeBase(values);
            }
            message.success(editingKb ? '更新成功' : '创建成功');
            setIsModalVisible(false);
          } catch {
            message.error('操作失败');
          }
        }}
      >
        <Form form={form} layout="vertical" initialValues={editingKb || undefined}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入知识库名称' }]}>
            <Input placeholder="请输入知识库名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="请输入描述" rows={3} />
          </Form.Item>
          <Form.Item name="category" label="分类">
            <Input placeholder="请输入分类" />
          </Form.Item>
          <Form.Item name="isActive" label="启用" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default KnowledgeBaseManagement;
