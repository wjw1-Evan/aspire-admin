import React, { useRef, useState, useCallback } from 'react';
import { Button, Space, Modal, Tag, App, Input, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, BookOutlined, FolderOpenOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useIntl, history } from '@umijs/max';
import { PageContainer, ProCard, ProTable, ProColumns, ActionType, ModalForm, ProFormText, ProFormTextArea, ProFormSwitch } from '@ant-design/pro-components';
import * as kbService from '@/services/workflow/knowledge-base';
import type { KnowledgeBase } from '@/services/workflow/knowledge-base';
import { getErrorMessage } from '@/utils/getErrorMessage';

import dayjs from 'dayjs';

const KnowledgeBaseManagement: React.FC = () => {
  const intl = useIntl();
  const { message } = App.useApp();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingKb, setEditingKb] = useState<KnowledgeBase | null>(null);
  const [search, setSearch] = useState('');

  const handleOpenModal = (kb: KnowledgeBase | null) => {
    setEditingKb(kb);
    setIsModalVisible(true);
  };

  const handleDelete = (record: KnowledgeBase) => {
    Modal.confirm({
      title: intl.formatMessage({ id: 'pages.workflow.knowledgeBase.deleteConfirm' }),
      content: intl.formatMessage({ id: 'pages.workflow.knowledgeBase.deleteContent' }),
      okText: intl.formatMessage({ id: 'pages.workflow.knowledgeBase.deleteOk' }),
      okType: 'danger',
      cancelText: intl.formatMessage({ id: 'pages.workflow.knowledgeBase.deleteCancel' }),
      onOk: async () => {
        try {
          const res = await kbService.deleteKnowledgeBase(record.id);
          if (res.success) {
            message.success(intl.formatMessage({ id: 'pages.workflow.knowledgeBase.deleteSuccess' }));
            actionRef.current?.reload();
          }
        } catch (error) {
          message.error(getErrorMessage(error as any, 'pages.workflow.knowledgeBase.deleteFailed'));
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
      render: (dom: any, record: KnowledgeBase) => (
        <a onClick={() => history.push(`/workflow/knowledge-base/documents/${record.id}`)}>
          <Space>
            <BookOutlined style={{ color: '#1890ff' }} />
            <span style={{ fontWeight: 500 }}>{dom}</span>
          </Space>
        </a>
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
      render: (dom: any) => <Tag color="blue">{dom || intl.formatMessage({ id: 'pages.workflow.knowledgeBase.categoryDefault' })}</Tag>,
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
        <Tag color={record.isActive ? 'success' : 'default'}>{record.isActive ? intl.formatMessage({ id: 'pages.workflow.knowledgeBase.statusEnabled' }) : intl.formatMessage({ id: 'pages.workflow.knowledgeBase.statusDisabled' })}</Tag>
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
      title: intl.formatMessage({ id: 'pages.workflow.knowledgeBase.action' }),
      key: 'action',
      valueType: 'option',
      fixed: 'right',
      width: 180,
      render: (_: any, record: KnowledgeBase) => (
        <Space size={4}>
          <Button variant="link" color="cyan" size="small" icon={<FolderOpenOutlined />} onClick={() => history.push(`/workflow/knowledge-base/documents/${record.id}`)}>{intl.formatMessage({ id: 'pages.workflow.knowledgeBase.manageContent' })}</Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleOpenModal(record)}>{intl.formatMessage({ id: 'pages.workflow.knowledgeBase.edit' })}</Button>
          <Popconfirm title={intl.formatMessage({ id: 'pages.workflow.knowledgeBase.deleteConfirmWithName' }, { name: record.name })} onConfirm={() => handleDelete(record)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>{intl.formatMessage({ id: 'pages.workflow.knowledgeBase.delete' })}</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <ProTable
        actionRef={actionRef}
        headerTitle={<Space><BookOutlined />{intl.formatMessage({ id: 'pages.workflow.knowledgeBase.title' })}</Space>}
        rowKey="id"
        search={false}
        request={async (params: any, sort: any, filter: any) => {
          const res = await kbService.getKnowledgeBases({ ...params, search, sort, filter });
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
            message.success(editingKb ? intl.formatMessage({ id: 'pages.workflow.knowledgeBase.updateSuccess' }) : intl.formatMessage({ id: 'pages.workflow.knowledgeBase.createSuccess' }));
            setIsModalVisible(false);
            actionRef.current?.reload();
          } catch (err) {
            message.error(getErrorMessage(err as any, 'pages.workflow.knowledgeBase.submitFailed'));
          }
          return true;
        }}
        initialValues={editingKb || { isActive: true }}
        width={500}
      >
        <ProFormText name="name" label={intl.formatMessage({ id: 'pages.workflow.knowledgeBase.form.name' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.workflow.knowledgeBase.form.nameRequired' }) }]} placeholder={intl.formatMessage({ id: 'pages.workflow.knowledgeBase.form.namePlaceholder' })} />
        <ProFormTextArea name="description" label={intl.formatMessage({ id: 'pages.workflow.knowledgeBase.form.description' })} placeholder={intl.formatMessage({ id: 'pages.workflow.knowledgeBase.form.descriptionPlaceholder' })} />
        <ProFormText name="category" label={intl.formatMessage({ id: 'pages.workflow.knowledgeBase.form.category' })} placeholder={intl.formatMessage({ id: 'pages.workflow.knowledgeBase.form.categoryPlaceholder' })} />
        <ProFormSwitch name="isActive" label={intl.formatMessage({ id: 'pages.workflow.knowledgeBase.form.enabled' })} />
      </ModalForm>
    </PageContainer>
  );
};

export default KnowledgeBaseManagement;

