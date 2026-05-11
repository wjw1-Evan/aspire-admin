import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button, Space, Tag, App, Popconfirm, Grid, Input } from 'antd';
import { Drawer } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  FileTextOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useIntl, useParams, history } from '@umijs/max';
import { PageContainer, ProCard, ProDescriptions } from '@ant-design/pro-components';
import { ProTable, ActionType, ProColumns } from '@ant-design/pro-table';
import { ModalForm, ProFormText, ProFormTextArea, ProFormDigit } from '@ant-design/pro-components';
import * as kbService from '@/services/workflow/knowledge-base';
import type { KnowledgeDocument } from '@/services/workflow/knowledge-base';
import { getErrorMessage } from '@/utils/getErrorMessage';
import dayjs from 'dayjs';

const { useBreakpoint } = Grid;

const KnowledgeBaseDocuments: React.FC = () => {
  const intl = useIntl();
  const { message } = App.useApp();
  const { knowledgeBaseId } = useParams<{ knowledgeBaseId: string }>();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [keyword, setKeyword] = useState('');

  const [state, setState] = useState({
    formVisible: false,
    editingDoc: null as KnowledgeDocument | null,
    detailVisible: false,
    viewingDoc: null as KnowledgeDocument | null,
    detailLoading: false,
    kbInfo: null as { name: string; itemCount: number } | null,
  });
  const set = useCallback(
    (partial: Partial<typeof state>) => setState((prev) => ({ ...prev, ...partial })),
    [],
  );

  useEffect(() => {
    if (knowledgeBaseId) {
      kbService.getKnowledgeBase(knowledgeBaseId).then((res) => {
        if (res.success && res.data) {
          set({ kbInfo: { name: res.data.name, itemCount: res.data.itemCount } });
        }
      });
    }
  }, [knowledgeBaseId, set]);

  const handleView = useCallback(
    async (id: string) => {
      if (!knowledgeBaseId) return;
      set({ detailVisible: true, viewingDoc: null, detailLoading: true });
      try {
        const res = await kbService.getKnowledgeDocument(knowledgeBaseId, id);
        if (res.success && res.data) {
          set({ viewingDoc: res.data });
        }
      } finally {
        set({ detailLoading: false });
      }
    },
    [knowledgeBaseId, set],
  );

  const handleFinish = useCallback(
    async (values: Record<string, any>) => {
      if (!knowledgeBaseId) return false;
      try {
        const docData = {
          title: values.title,
          content: values.content,
          summary: values.summary,
          sortOrder: values.sortOrder,
        };
        if (state.editingDoc) {
          await kbService.updateKnowledgeDocument(knowledgeBaseId, state.editingDoc.id, docData);
          message.success(intl.formatMessage({ id: 'pages.workflow.knowledgeBase.updateSuccess' }));
        } else {
          await kbService.createKnowledgeDocument(knowledgeBaseId, docData);
          message.success(intl.formatMessage({ id: 'pages.workflow.knowledgeBase.createSuccess' }));
        }
        set({ formVisible: false, editingDoc: null });
        actionRef.current?.reload();
        return true;
      } catch (err) {
        message.error(getErrorMessage(err as any, 'pages.workflow.knowledgeBase.document.submitFailed'));
        return false;
      }
    },
    [knowledgeBaseId, state.editingDoc, intl, message, set],
  );

  const handleDelete = useCallback(
    async (record: KnowledgeDocument) => {
      if (!knowledgeBaseId) return;
      try {
        const res = await kbService.deleteKnowledgeDocument(knowledgeBaseId, record.id);
        if (res.success) {
          message.success(intl.formatMessage({ id: 'pages.workflow.knowledgeBase.deleteSuccess' }));
          actionRef.current?.reload();
        }
      } catch (err) {
        message.error(getErrorMessage(err as any, 'pages.workflow.knowledgeBase.document.deleteFailed'));
      }
    },
    [knowledgeBaseId, intl, message],
  );

  const columns: ProColumns<KnowledgeDocument>[] = [
    {
      title: intl.formatMessage({ id: 'pages.workflow.knowledge.form.title' }),
      dataIndex: 'title',
      key: 'title',
      sorter: true,
      render: (dom: any, record: KnowledgeDocument) => (
        <a onClick={() => handleView(record.id)}>
          <Space>
            <FileTextOutlined style={{ color: '#1890ff' }} />
            <span style={{ fontWeight: 500 }}>{dom}</span>
          </Space>
        </a>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.knowledge.summary' }),
      dataIndex: 'summary',
      key: 'summary',
      ellipsis: true,
      responsive: ['md'],
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.knowledge.contentPreview' }),
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      width: 280,
      responsive: ['lg'],
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.knowledge.sortOrder' }),
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 80,
      valueType: 'digit',
      sorter: true,
      responsive: ['md'],
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.knowledgeBase.createdAt' }),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      valueType: 'dateTime',
      sorter: true,
      responsive: ['md'],
    },
    {
      title: intl.formatMessage({ id: 'pages.table.action' }),
      key: 'action',
      valueType: 'option',
      fixed: 'right',
      width: 160,
      render: (_: unknown, record: KnowledgeDocument) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => set({ editingDoc: record, formVisible: true })}
          >
            {intl.formatMessage({ id: 'pages.workflow.action.edit' })}
          </Button>
          <Popconfirm
            title={intl.formatMessage({ id: 'pages.workflow.knowledge.confirmDeleteContent' })}
            onConfirm={() => handleDelete(record)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              {intl.formatMessage({ id: 'pages.workflow.knowledge.confirmDelete' })}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (!knowledgeBaseId) {
    return (
      <PageContainer>
        <ProCard>{intl.formatMessage({ id: 'pages.workflow.knowledgeBase.document.noId' })}</ProCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      extra={
        <Button icon={<ArrowLeftOutlined />} onClick={() => history.push('/workflow/knowledge-base')}>
          {intl.formatMessage({ id: 'pages.workflow.knowledgeBase.document.back' })}
        </Button>
      }
    >
      <ProTable
        actionRef={actionRef}
        headerTitle={
          <Space size={24}>
            <Space>
              <FileTextOutlined />
              {intl.formatMessage({ id: 'pages.workflow.knowledgeBase.document.title' })}
            </Space>
            <Tag color="blue">
              {intl.formatMessage({ id: 'pages.workflow.knowledgeBase.document.statistics.total' })}{' '}
              {state.kbInfo?.itemCount || 0}
            </Tag>
          </Space>
        }
        rowKey="id"
        search={false}
        request={async (params: any, sort: any, filter: any) => {
          const res = await kbService.getKnowledgeDocuments(knowledgeBaseId!, { ...params, search: keyword, sort, filter });
          if (res.success && res.data) {
            return { data: res.data.queryable || [], total: res.data.rowCount || 0, success: true };
          }
          return { data: [], total: 0, success: false };
        }}
        columns={columns}
        scroll={{ x: 'max-content' }}
        toolBarRender={() => [
          <Input.Search
            key="search"
            placeholder={intl.formatMessage({ id: 'pages.common.search' })}
            allowClear
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onSearch={(value) => { setKeyword(value); actionRef.current?.reload(); }}
            style={{ width: 260, marginRight: 8 }}
            prefix={<SearchOutlined />}
          />,
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => set({ editingDoc: null, formVisible: true })}>
            {intl.formatMessage({ id: 'pages.workflow.knowledgeBase.document.create' })}
          </Button>,
        ]}
      />

      <ModalForm
        key={state.editingDoc?.id || 'create'}
        title={
          state.editingDoc
            ? intl.formatMessage({ id: 'pages.workflow.knowledgeBase.document.editForm' })
            : intl.formatMessage({ id: 'pages.workflow.knowledgeBase.document.create' })
        }
        open={state.formVisible}
        onOpenChange={(open) => {
          if (!open) set({ formVisible: false, editingDoc: null });
        }}
        onFinish={handleFinish}
        initialValues={state.editingDoc || undefined}
        autoFocusFirstInput
        width={720}
      >
        <ProFormText
          name="title"
          label={intl.formatMessage({ id: 'pages.workflow.knowledge.form.title' })}
          rules={[{ required: true, message: intl.formatMessage({ id: 'pages.workflow.knowledge.form.titleRequired' }) }]}
          placeholder={intl.formatMessage({ id: 'pages.workflow.knowledge.form.titlePlaceholder' })}
        />
        <ProFormTextArea
          name="content"
          label={intl.formatMessage({ id: 'pages.workflow.knowledge.form.content' })}
          rules={[{ required: true, message: intl.formatMessage({ id: 'pages.workflow.knowledge.form.contentRequired' }) }]}
          placeholder={intl.formatMessage({ id: 'pages.workflow.knowledge.form.contentPlaceholder' })}
          fieldProps={{ rows: 6 }}
        />
        <ProFormTextArea
          name="summary"
          label={intl.formatMessage({ id: 'pages.workflow.knowledge.summary' })}
          placeholder={intl.formatMessage({ id: 'pages.workflow.knowledge.form.summaryPlaceholder' })}
        />
        <ProFormDigit
          name="sortOrder"
          label={intl.formatMessage({ id: 'pages.workflow.knowledge.sortOrder' })}
          fieldProps={{ min: 0, style: { width: '100%' } }}
          placeholder={intl.formatMessage({ id: 'pages.workflow.knowledge.form.sortOrderPlaceholder' })}
        />
      </ModalForm>

      <Drawer
        title={intl.formatMessage({ id: 'pages.workflow.knowledgeBase.document.detail.title' })}
        placement="right"
        open={state.detailVisible}
        onClose={() => set({ detailVisible: false, viewingDoc: null })}
        size="large"
        destroyOnClose
      >
        {state.viewingDoc ? (
          <ProDescriptions column={isMobile ? 1 : 2} bordered size="small">
            <ProDescriptions.Item
              label={intl.formatMessage({ id: 'pages.workflow.knowledge.form.title' })}
              span={2}
            >
              <Space>
                <FileTextOutlined style={{ color: '#1890ff' }} />
                <strong>{state.viewingDoc.title}</strong>
              </Space>
            </ProDescriptions.Item>
            <ProDescriptions.Item
              label={intl.formatMessage({ id: 'pages.workflow.knowledge.summary' })}
              span={2}
            >
              {state.viewingDoc.summary || '-'}
            </ProDescriptions.Item>
            <ProDescriptions.Item
              label={intl.formatMessage({ id: 'pages.workflow.knowledge.form.content' })}
              span={2}
            >
              <div style={{ whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto' }}>
                {state.viewingDoc.content}
              </div>
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.workflow.knowledge.sortOrder' })}>
              {state.viewingDoc.sortOrder}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.workflow.knowledgeBase.createdAt' })}>
              {dayjs(state.viewingDoc.createdAt).format('YYYY-MM-DD HH:mm')}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.workflow.knowledgeBase.updatedAt' })}>
              {state.viewingDoc.updatedAt ? dayjs(state.viewingDoc.updatedAt).format('YYYY-MM-DD HH:mm') : '-'}
            </ProDescriptions.Item>
          </ProDescriptions>
        ) : null}
      </Drawer>
    </PageContainer>
  );
};

export default KnowledgeBaseDocuments;
