import React, { useState, useEffect } from 'react';
import { Button, Space, Modal, Form, Input, InputNumber, App, Card, Breadcrumb } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ArrowLeftOutlined, FileTextOutlined } from '@ant-design/icons';
import { useIntl, useParams, history } from '@umijs/max';
import PageContainer from '@/components/PageContainer';
import { ProTable, ProColumns } from '@ant-design/pro-table';
import * as kbService from '@/services/workflow/knowledge-base';
import type { KnowledgeDocument } from '@/services/workflow/knowledge-base';
import type { PageParams } from '@/types';
import dayjs from 'dayjs';

const { TextArea } = Input;

const KnowledgeBaseDocuments: React.FC = () => {
  const intl = useIntl();
  const { knowledgeBaseId } = useParams<{ knowledgeBaseId: string }>();
  const { message } = App.useApp();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingDoc, setEditingDoc] = useState<KnowledgeDocument | null>(null);
  const [form] = Form.useForm();
  const [kbInfo, setKbInfo] = useState<{ name: string } | null>(null);

  useEffect(() => {
    if (knowledgeBaseId) {
      kbService.getKnowledgeBase(knowledgeBaseId).then((res) => {
        if (res.success && res.data) {
          setKbInfo({ name: res.data.name });
        }
      });
    }
  }, [knowledgeBaseId]);

  const handleDelete = (record: KnowledgeDocument) => {
    Modal.confirm({
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
          }
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  const columns: ProColumns<KnowledgeDocument>[] = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      sorter: true,
      render: (dom: any) => (
        <Space>
          <FileTextOutlined style={{ color: '#1890ff' }} />
          <span style={{ fontWeight: 500 }}>{dom}</span>
        </Space>
      ),
    },
    {
      title: '摘要',
      dataIndex: 'summary',
      key: 'summary',
      ellipsis: true,
      sorter: true,
    },
    {
      title: '内容预览',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      width: 280,
      sorter: true,
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 80,
      valueType: 'digit',
      sorter: true,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      valueType: 'dateTime',
      sorter: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right',
      valueType: 'option',
      render: (_: unknown, record: KnowledgeDocument) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => {
            setEditingDoc(record);
            form.setFieldsValue({
              title: record.title,
              content: record.content,
              summary: record.summary,
              sortOrder: record.sortOrder,
            });
            setIsModalVisible(true);
          }}>编辑</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>删除</Button>
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
        <Breadcrumb items={[
          { title: <a onClick={() => history.push('/workflow/knowledge-base')}>知识库</a> },
          { title: `${kbInfo?.name ?? '知识库'} - 内容管理` },
        ]} />
      }
      extra={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => history.push('/workflow/knowledge-base')}>返回知识库</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingDoc(null); form.resetFields(); setIsModalVisible(true); }}>录入内容</Button>
        </Space>
      }
    >
      <ProTable
        headerTitle="文档列表"
        rowKey="id"
        search={{ labelWidth: 'auto' }}
        request={async (params: any) => {
          const { current, pageSize, ...rest } = params;
          const res = await kbService.getKnowledgeDocuments(knowledgeBaseId!, { page: current, pageSize, ...rest } as PageParams);
          if (res.success && res.data) {
            return { data: res.data.queryable || [], total: res.data.rowCount || 0, success: true };
          }
          return { data: [], total: 0, success: false };
        }}
        columns={columns}
        scroll={{ x: 'max-content' }}
      />

      <Modal
        title={editingDoc ? '编辑文档' : '录入内容'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        width={720}
        onOk={async () => {
          const values = await form.validateFields();
          try {
            if (editingDoc) {
              await kbService.updateKnowledgeDocument(knowledgeBaseId!, editingDoc.id, values);
            } else {
              await kbService.createKnowledgeDocument(knowledgeBaseId!, values);
            }
            message.success(editingDoc ? '更新成功' : '创建成功');
            setIsModalVisible(false);
          } catch {
            message.error('操作失败');
          }
        }}
      >
        <Form form={form} layout="vertical" initialValues={editingDoc ? { title: editingDoc.title, content: editingDoc.content, summary: editingDoc.summary, sortOrder: editingDoc.sortOrder } : undefined}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="请输入文档标题" />
          </Form.Item>
          <Form.Item name="content" label="内容" rules={[{ required: true, message: '请输入内容' }]}>
            <TextArea placeholder="请输入文档内容" rows={6} />
          </Form.Item>
          <Form.Item name="summary" label="摘要">
            <Input.TextArea placeholder="请输入摘要（可选）" rows={2} />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序">
            <InputNumber placeholder="数值越小越靠前" min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default KnowledgeBaseDocuments;
