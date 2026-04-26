import React, { useState, useEffect } from 'react';
import { Button, Space, Modal, App, Breadcrumb, Popconfirm } from 'antd';
import { ProCard } from '@ant-design/pro-components';
import { PlusOutlined, EditOutlined, DeleteOutlined, ArrowLeftOutlined, FileTextOutlined } from '@ant-design/icons';
import { useIntl, useParams, history } from '@umijs/max';
import { PageContainer } from '@ant-design/pro-components';
import { ProTable, ProColumns } from '@ant-design/pro-table';
import { ModalForm, ProFormText, ProFormTextArea, ProFormDigit } from '@ant-design/pro-components';
import * as kbService from '@/services/workflow/knowledge-base';
import type { KnowledgeDocument } from '@/services/workflow/knowledge-base';
import { getErrorMessage } from '@/utils/getErrorMessage';

import dayjs from 'dayjs';

const KnowledgeBaseDocuments: React.FC = () => {
  const intl = useIntl();
  const { knowledgeBaseId } = useParams<{ knowledgeBaseId: string }>();
  const { message } = App.useApp();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingDoc, setEditingDoc] = useState<KnowledgeDocument | null>(null);
  const [kbInfo, setKbInfo] = useState<{ name: string } | null>(null);

  const handleOpenModal = (doc: KnowledgeDocument | null) => {
    setEditingDoc(doc);
    setIsModalVisible(true);
  };

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
        } catch (err) {
          message.error(getErrorMessage(err as any, 'pages.workflow.knowledgeBase.document.deleteFailed'));
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
      valueType: 'option',
      fixed: 'right',
      width: 180,
      render: (_: unknown, record: KnowledgeDocument) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleOpenModal(record)}>编辑</Button>
          <Popconfirm title={`确定删除「${record.title}」？`} onConfirm={() => handleDelete(record)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (!knowledgeBaseId) {
    return (
      <PageContainer>
        <ProCard>缺少知识库 ID，请从知识库列表进入。</ProCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer extra={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => history.push('/workflow/knowledge-base')}>返回知识库</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal(null)}>录入内容</Button>
        </Space>
      }
    >
      <ProTable
        headerTitle="文档列表"
        rowKey="id"
        search={{ labelWidth: 'auto' }}
        request={async (params: any, sort: any, filter: any) => {
          const res = await kbService.getKnowledgeDocuments(knowledgeBaseId!, { ...params, sort, filter });
          if (res.success && res.data) {
            return { data: res.data.queryable || [], total: res.data.rowCount || 0, success: true };
          }
          return { data: [], total: 0, success: false };
        }}
        columns={columns}
        scroll={{ x: 'max-content' }}
      />

      <ModalForm
        title={editingDoc ? '编辑文档' : '录入内容'}
        open={isModalVisible}
        onOpenChange={(open) => { if (!open) setIsModalVisible(false); }}
        onFinish={async (values) => {
          try {
            const docData = values as { title: string; content: string; summary?: string; sortOrder?: number };
            if (editingDoc) {
              await kbService.updateKnowledgeDocument(knowledgeBaseId!, editingDoc.id, docData);
            } else {
              await kbService.createKnowledgeDocument(knowledgeBaseId!, docData);
            }
            message.success(editingDoc ? '更新成功' : '创建成功');
            setIsModalVisible(false);
          } catch (err) {
            message.error(getErrorMessage(err as any, 'pages.workflow.knowledgeBase.document.submitFailed'));
          }
          return true;
        }}
        initialValues={editingDoc || undefined}
        width={720}
      >
        <ProFormText name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]} placeholder="请输入文档标题" />
        <ProFormTextArea name="content" label="内容" rules={[{ required: true, message: '请输入内容' }]} placeholder="请输入文档内容" />
        <ProFormTextArea name="summary" label="摘要" placeholder="请输入摘要（可选）" />
        <ProFormDigit name="sortOrder" label="排序" fieldProps={{ min: 0, style: { width: '100%' } }} placeholder="数值越小越靠前" />
      </ModalForm>
    </PageContainer>
  );
};

export default KnowledgeBaseDocuments;
