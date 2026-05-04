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
            message.success(intl.formatMessage({ id: 'pages.workflow.knowledgeBase.deleteSuccess' }));
          }
        } catch (err) {
          message.error(getErrorMessage(err as any, 'pages.workflow.knowledgeBase.document.deleteFailed'));
        }
      },
    });
  };

  const columns: ProColumns<KnowledgeDocument>[] = [
    {
      title: intl.formatMessage({ id: 'pages.workflow.knowledge.title' }),
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
      title: intl.formatMessage({ id: 'pages.workflow.knowledge.summary' }),
      dataIndex: 'summary',
      key: 'summary',
      ellipsis: true,
      sorter: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.knowledge.contentPreview' }),
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      width: 280,
      sorter: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.knowledge.sortOrder' }),
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 80,
      valueType: 'digit',
      sorter: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.knowledge.updatedAt' }),
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      valueType: 'dateTime',
      sorter: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.table.action' }),
      key: 'action',
      valueType: 'option',
      fixed: 'right',
      width: 180,
      render: (_: unknown, record: KnowledgeDocument) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleOpenModal(record)}>编辑</Button>
          <Popconfirm title={intl.formatMessage({ id: 'pages.workflow.knowledge.confirmDeleteContent' }, { title: record.title })} onConfirm={() => handleDelete(record)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} >{intl.formatMessage({ id: 'pages.workflow.knowledge.confirmDelete' })}</Button>
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
              message.success(intl.formatMessage({ id: 'pages.workflow.knowledgeBase.updateSuccess' }));
            } else {
              await kbService.createKnowledgeDocument(knowledgeBaseId!, docData);
              message.success(intl.formatMessage({ id: 'pages.workflow.knowledgeBase.createSuccess' }));
            }
            setIsModalVisible(false);
          } catch (err) {
            message.error(getErrorMessage(err as any, 'pages.workflow.knowledgeBase.document.submitFailed'));
          }
          return true;
        }}
        initialValues={editingDoc || undefined}
        width={720}
      >
        <ProFormText name="title" label={intl.formatMessage({ id: 'pages.workflow.knowledge.form.title' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.workflow.knowledge.form.titleRequired' }) }]} placeholder={intl.formatMessage({ id: 'pages.workflow.knowledge.form.titlePlaceholder' })} />
        <ProFormTextArea name="content" label={intl.formatMessage({ id: 'pages.workflow.knowledge.form.content' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.workflow.knowledge.form.contentRequired' }) }]} placeholder={intl.formatMessage({ id: 'pages.workflow.knowledge.form.contentPlaceholder' })} />
        <ProFormTextArea name="summary" label={intl.formatMessage({ id: 'pages.workflow.knowledge.summary' })} placeholder={intl.formatMessage({ id: 'pages.workflow.knowledge.form.summaryPlaceholder' })} />
        <ProFormDigit name="sortOrder" label={intl.formatMessage({ id: 'pages.workflow.knowledge.sortOrder' })} fieldProps={{ min: 0, style: { width: '100%' } }} placeholder={intl.formatMessage({ id: 'pages.workflow.knowledge.form.sortOrderPlaceholder' })} />
      </ModalForm>
    </PageContainer>
  );
};

export default KnowledgeBaseDocuments;
