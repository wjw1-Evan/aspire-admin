import React, { useRef, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import type {
  ActionType,
  ProColumns,
  ProFormInstance,
} from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Space, Tag } from 'antd';
import { DataSourceType, DataSourceStatus, DataSource } from './types';
import {
  getDataSourceList,
  testDataSource,
  deleteDataSource,
  createDataSource,
  updateDataSource,
} from './service';
import DataSourceForm from './components/DataSourceForm';

const DataSourceList: React.FC = () => {
  const [createModalOpen, handleCreateModalOpen] = useState<boolean>(false);
  const [updateModalOpen, handleUpdateModalOpen] = useState<boolean>(false);
  const [currentRow, setCurrentRow] = useState<DataSource>();
  const actionRef = useRef<ActionType>(null);
  const formRef = useRef<ProFormInstance>(null);

  const dataSourceTypeOptions = [
    { label: 'MySQL', value: DataSourceType.MySql },
    { label: 'PostgreSQL', value: DataSourceType.PostgreSQL },
    { label: 'Oracle', value: DataSourceType.Oracle },
    { label: 'MongoDB', value: DataSourceType.MongoDB },
    { label: 'REST API', value: DataSourceType.RestApi },
    { label: 'IoT设备', value: DataSourceType.IoT },
    { label: '日志文件', value: DataSourceType.LogFile },
    { label: '消息队列', value: DataSourceType.MessageQueue },
  ];

  const statusOptions = [
    { label: '活跃', value: DataSourceStatus.Active, color: 'green' },
    { label: '离线', value: DataSourceStatus.Offline, color: 'red' },
    { label: '错误', value: DataSourceStatus.Error, color: 'red' },
    { label: '测试中', value: DataSourceStatus.Testing, color: 'blue' },
  ];

  const handleTestConnection = async (record: DataSource) => {
    try {
      const result = await testDataSource(record.id);
      if (result.success) {
        message.success('连接测试成功');
        actionRef.current?.reload();
      } else {
        message.error(`连接测试失败: ${result.error}`);
      }
    } catch (_error) {
      message.error('连接测试失败');
    }
  };

  const handleDelete = async (record: DataSource) => {
    try {
      const result = await deleteDataSource(record.id);
      if (result.success) {
        message.success('删除成功');
        actionRef.current?.reload();
      } else {
        message.error(`删除失败: ${result.error}`);
      }
    } catch (_error) {
      message.error('删除失败');
    }
  };

  const columns: ProColumns<DataSource>[] = [
    {
      title: '名称',
      dataIndex: 'name',
      tip: '数据源名称',
      formItemProps: {
        rules: [
          {
            required: true,
            message: '数据源名称为必填项',
          },
        ],
      },
    },
    {
      title: '标题',
      dataIndex: 'title',
      valueType: 'text',
    },
    {
      title: '类型',
      dataIndex: 'dataSourceType',
      valueType: 'select',
      valueEnum: Object.fromEntries(
        dataSourceTypeOptions.map((item) => [item.value, { text: item.label }]),
      ),
      render: (_, record) => {
        const option = dataSourceTypeOptions.find(
          (opt) => opt.value === record.dataSourceType,
        );
        return option ? (
          <Tag color="blue">{option.label}</Tag>
        ) : (
          record.dataSourceType
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: Object.fromEntries(
        statusOptions.map((item) => [item.value, { text: item.label }]),
      ),
      render: (_, record) => {
        const option = statusOptions.find((opt) => opt.value === record.status);
        return option ? (
          <Tag color={option.color}>{option.label}</Tag>
        ) : (
          record.status
        );
      },
    },
    {
      title: '最后测试时间',
      dataIndex: 'lastTestedAt',
      valueType: 'dateTime',
      search: false,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      search: false,
    },
    {
      title: '操作',
      dataIndex: 'option',
      valueType: 'option',
      render: (_, record) => [
        <Button
          key="test"
          type="link"
          size="small"
          onClick={() => handleTestConnection(record)}
          loading={record.status === DataSourceStatus.Testing}
        >
          测试连接
        </Button>,
        <Button
          key="edit"
          type="link"
          size="small"
          onClick={() => {
            setCurrentRow(record);
            handleUpdateModalOpen(true);
          }}
        >
          编辑
        </Button>,
        <Popconfirm
          key="delete"
          title="确定要删除这个数据源吗？"
          description="删除后数据源将无法恢复"
          onConfirm={() => handleDelete(record)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" size="small" danger>
            删除
          </Button>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <PageContainer
      header={{
        title: '数据源管理',
        subTitle: '管理数据中台的数据源连接配置',
      }}
    >
      <ProTable<DataSource, { current?: number; pageSize?: number; keyword?: string }>
        headerTitle="数据源列表"
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 120,
        }}
        toolBarRender={() => [
          <Button
            type="primary"
            key="primary"
            onClick={() => {
              handleCreateModalOpen(true);
            }}
          >
            <PlusOutlined /> 新建数据源
          </Button>,
        ]}
        request={async (params, _sort, _filter) => {
          const response = await getDataSourceList({
            ...params,
            keyword: params.name,
            dataSourceType: params.dataSourceType,
            status: params.status,
          });
          return {
            data: response.data.list,
            success: response.success,
            total: response.data.total,
          };
        }}
        columns={columns}
      />

      <DataSourceForm
        formRef={formRef}
        open={createModalOpen}
        onOpenChange={handleCreateModalOpen}
        onSubmit={async (value) => {
          try {
            await createDataSource(value);
            message.success('创建成功');
            handleCreateModalOpen(false);
            actionRef.current?.reload();
          } catch (_error) {
            message.error('创建失败');
          }
        }}
      />

      <DataSourceForm
        formRef={formRef}
        open={updateModalOpen}
        onOpenChange={handleUpdateModalOpen}
        onSubmit={async (value) => {
          try {
            if (currentRow?.id) {
              await updateDataSource({ id: currentRow.id }, value);
              message.success('更新成功');
            }
            handleUpdateModalOpen(false);
            setCurrentRow(undefined);
            actionRef.current?.reload();
          } catch (_error) {
            message.error('更新失败');
          }
        }}
        current={currentRow}
      />
    </PageContainer>
  );
};

export default DataSourceList;
