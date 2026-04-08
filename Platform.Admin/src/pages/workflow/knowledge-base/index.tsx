import React, { useRef, useState, useCallback } from 'react';
import { Button, Space, Modal, Tag, App, Input, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, BookOutlined, FolderOpenOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useIntl, history } from '@umijs/max';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import { ModalForm, ProFormText, ProFormTextArea, ProFormSwitch } from '@ant-design/pro-components';
import * as kbService from '@/services/workflow/knowledge-base';
import type { KnowledgeBase } from '@/services/workflow/knowledge-base';
import type { PageParams } from '@/types';
import dayjs from 'dayjs';

const KnowledgeBaseManagement: React.FC = () => {
  const intl = useIntl();
  const { message } = App.useApp();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingKb, setEditingKb] = useState<KnowledgeBase | null>(null);
  const [sorter, setSorter] = useState<{ sortBy: string; sortOrder: string } | undefined>(undefined);
  const [search, setSearch] = useState('');

  const handleOpenModal = (kb: KnowledgeBase | null) => {
    setEditingKb(kb);
    setIsModalVisible(true);
  };

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
            actionRef.current?.reload();
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
      valueType: 'option',
      fixed: 'right',
      width: 180,
      render: (_: any, record: KnowledgeBase) => (
        <Space size={4}>
          <Button variant="link" color="cyan" size="small" icon={<FolderOpenOutlined />} onClick={() => history.push(`/workflow/knowledge-base/documents/${record.id}`)}>管理内容</Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleOpenModal(record)}>编辑</Button>
          <Popconfirm title={`确定删除「${record.name}」？`} onConfirm={() => handleDelete(record)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <ProTable
        actionRef={actionRef}
        rowKey="id"
        search={false}
        request={async (params: any) => {
          const { current, pageSize } = params;
          const res = await kbService.getKnowledgeBases({ page: current, pageSize, search, ...sorter } as PageParams);
          if (res.success && res.data) {
            return { data: res.data.queryable || [], total: res.data.rowCount || 0, success: true };
          }
          return { data: [], total: 0, success: false };
        }}
        columns={columns}
        onChange={(_, __, s: any) => setSorter(s?.order ? { sortBy: s.field, sortOrder: s.order === 'ascend' ? 'asc' : 'desc' } : undefined)}
        scroll={{ x: 'max-content' }}
        toolBarRender={() => [
          <Input.Search
            key="search"
            placeholder="搜索..."
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={(value) => { setSearch(value); actionRef.current?.reload(); }}
            style={{ width: 260, marginRight: 8 }}
            prefix={<SearchOutlined />}
          />,
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal(null)}>
            {intl.formatMessage({ id: 'pages.workflow.knowledgeBase.add' })}
          </Button>,
        ]}
      />

      <ModalForm
        title={editingKb ? intl.formatMessage({ id: 'pages.workflow.knowledgeBase.edit' }) : intl.formatMessage({ id: 'pages.workflow.knowledgeBase.add' })}
        open={isModalVisible}
        onOpenChange={(open) => { if (!open) setIsModalVisible(false); }}
        onFinish={async (values) => {
          try {
            if (editingKb) {
              await kbService.updateKnowledgeBase(editingKb.id, values);
            } else {
              await kbService.createKnowledgeBase(values);
            }
            message.success(editingKb ? '更新成功' : '创建成功');
            setIsModalVisible(false);
            actionRef.current?.reload();
          } catch {
            message.error('操作失败');
          }
          return true;
        }}
        initialValues={editingKb || { isActive: true }}
        width={500}
      >
        <ProFormText name="name" label="名称" rules={[{ required: true, message: '请输入知识库名称' }]} placeholder="请输入知识库名称" />
        <ProFormTextArea name="description" label="描述" placeholder="请输入描述" />
        <ProFormText name="category" label="分类" placeholder="请输入分类" />
        <ProFormSwitch name="isActive" label="启用" />
      </ModalForm>
    </PageContainer>
  );
};

export default KnowledgeBaseManagement;
