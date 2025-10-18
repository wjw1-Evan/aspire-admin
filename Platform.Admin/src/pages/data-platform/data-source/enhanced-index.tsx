import React, { useRef, useState } from 'react';
import {
  PlusOutlined,
  DatabaseOutlined,
  TableOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type {
  ActionType,
  ProColumns,
  ProFormInstance,
} from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import {
  Button,
  message,
  Popconfirm,
  Space,
  Tag,
  Modal,
  Tabs,
  Descriptions,
  Badge,
  Table,
} from 'antd';
import { DataSourceType, DataSourceStatus } from './types';
import {
  getDataSourceList,
  testDataSource,
  deleteDataSource,
  getTables,
  getSchema,
  getData,
} from './service';
import DataSourceForm from './components/DataSourceForm';

const EnhancedDataSourceList: React.FC = () => {
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [updateModalOpen, setUpdateModalOpen] = useState<boolean>(false);
  const [currentRow, setCurrentRow] = useState<API.DataSource>();
  const [detailVisible, setDetailVisible] = useState<boolean>(false);
  const [selectedDataSource, setSelectedDataSource] =
    useState<API.DataSource | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [schema, setSchema] = useState<any[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const actionRef = useRef<ActionType>();
  const formRef = useRef<ProFormInstance>();

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

  const handleTestConnection = async (record: API.DataSource) => {
    try {
      const result = await testDataSource({ id: record.id });
      if (result.success) {
        message.success('连接测试成功');
        actionRef.current?.reload();
      } else {
        message.error(`连接测试失败: ${result.error}`);
      }
    } catch (error) {
      message.error('连接测试失败');
      console.error('Test connection error:', error);
    }
  };

  const handleDelete = async (record: API.DataSource) => {
    try {
      const result = await deleteDataSource({ id: record.id });
      if (result.success) {
        message.success('删除成功');
        actionRef.current?.reload();
      } else {
        message.error(`删除失败: ${result.error}`);
      }
    } catch (error) {
      message.error('删除失败');
      console.error('Delete error:', error);
    }
  };

  const handleViewDetail = async (record: API.DataSource) => {
    setSelectedDataSource(record);
    setDetailVisible(true);
    setTablesLoading(true);

    try {
      const response = await getTables({ id: record.id });
      if (response.success) {
        setTables(response.data || []);
      } else {
        message.error('获取表列表失败');
      }
    } catch (error) {
      message.error('获取表列表失败');
      console.error('Get tables error:', error);
    } finally {
      setTablesLoading(false);
    }
  };

  const handleTableSelect = async (tableName: string) => {
    if (!selectedDataSource) return;

    setSchemaLoading(true);
    try {
      const response = await getSchema({
        id: selectedDataSource.id,
        tableName,
      });
      if (response.success) {
        setSchema(response.data || []);
      } else {
        message.error('获取表结构失败');
      }
    } catch (error) {
      message.error('获取表结构失败');
      console.error('Get schema error:', error);
    } finally {
      setSchemaLoading(false);
    }
  };

  const handleViewData = async (tableName: string) => {
    if (!selectedDataSource) return;

    setDataLoading(true);
    try {
      const response = await getData({
        id: selectedDataSource.id,
        tableName,
        limit: 100,
      });
      if (response.success) {
        setTableData(response.data?.data || []);
      } else {
        message.error('获取表数据失败');
      }
    } catch (error) {
      message.error('获取表数据失败');
      console.error('Get data error:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const columns: ProColumns<API.DataSource>[] = [
    {
      title: '数据源名称',
      dataIndex: 'name',
      tip: '数据源的唯一标识名称',
      render: (dom, entity) => {
        return (
          <Button
            type="link"
            onClick={() => {
              setCurrentRow(entity);
              setUpdateModalOpen(true);
            }}
          >
            {dom}
          </Button>
        );
      },
    },
    {
      title: '显示标题',
      dataIndex: 'title',
      valueType: 'text',
    },
    {
      title: '数据源类型',
      dataIndex: 'dataSourceType',
      hideInForm: true,
      valueEnum: dataSourceTypeOptions.reduce(
        (acc, item) => {
          acc[item.value] = { text: item.label };
          return acc;
        },
        {} as Record<number, { text: string }>,
      ),
      render: (_, record) => {
        const typeOption = dataSourceTypeOptions.find(
          (opt) => opt.value === record.dataSourceType,
        );
        return <Tag color="blue">{typeOption?.label || '未知'}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      hideInForm: true,
      valueEnum: statusOptions.reduce(
        (acc, item) => {
          acc[item.value] = { text: item.label, status: item.color };
          return acc;
        },
        {} as Record<number, { text: string; status: string }>,
      ),
      render: (_, record) => {
        const statusOption = statusOptions.find(
          (opt) => opt.value === record.status,
        );
        return (
          <Tag color={statusOption?.color}>{statusOption?.label || '未知'}</Tag>
        );
      },
    },
    {
      title: '最后测试时间',
      dataIndex: 'lastTestedAt',
      valueType: 'dateTime',
      hideInForm: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      hideInForm: true,
      hideInSearch: true,
    },
    {
      title: '操作',
      dataIndex: 'option',
      valueType: 'option',
      render: (_, record) => [
        <Button
          key="detail"
          type="link"
          icon={<DatabaseOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          详情
        </Button>,
        <Button
          key="test"
          type="link"
          onClick={() => handleTestConnection(record)}
        >
          测试连接
        </Button>,
        <Button
          key="edit"
          type="link"
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
          onConfirm={() => handleDelete(record)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" danger>
            删除
          </Button>
        </Popconfirm>,
      ],
    },
  ];

  const tableColumns = tables.map((tableName) => ({
    title: tableName,
    key: tableName,
    render: () => (
      <Space>
        <Button
          size="small"
          icon={<TableOutlined />}
          onClick={() => handleTableSelect(tableName)}
          loading={schemaLoading}
        >
          查看结构
        </Button>
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewData(tableName)}
          loading={dataLoading}
        >
          查看数据
        </Button>
      </Space>
    ),
  }));

  const schemaColumns = [
    {
      title: '字段名',
      dataIndex: 'fieldName',
      key: 'fieldName',
    },
    {
      title: '数据类型',
      dataIndex: 'dataType',
      key: 'dataType',
    },
    {
      title: '可空',
      dataIndex: 'isNullable',
      key: 'isNullable',
      render: (nullable: boolean) => (
        <Badge
          status={nullable ? 'warning' : 'success'}
          text={nullable ? '是' : '否'}
        />
      ),
    },
    {
      title: '主键',
      dataIndex: 'isPrimaryKey',
      key: 'isPrimaryKey',
      render: (isPrimary: boolean) => (
        <Badge
          status={isPrimary ? 'success' : 'default'}
          text={isPrimary ? '是' : '否'}
        />
      ),
    },
    {
      title: '最大长度',
      dataIndex: 'maxLength',
      key: 'maxLength',
      render: (length: number) => length || '-',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
  ];

  return (
    <PageContainer>
      <ProTable<API.DataSource, API.PageParams>
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
              setCreateModalOpen(true);
            }}
          >
            <PlusOutlined /> 新建数据源
          </Button>,
        ]}
        request={getDataSourceList}
        columns={columns}
        rowSelection={{}}
      />

      <DataSourceForm
        formRef={formRef}
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSubmit={async (value) => {
          const success = await handleAdd(value);
          if (success) {
            setCreateModalOpen(false);
            if (actionRef.current) {
              actionRef.current.reload();
            }
          }
        }}
      />

      <DataSourceForm
        formRef={formRef}
        open={updateModalOpen}
        onOpenChange={setUpdateModalOpen}
        onSubmit={async (value) => {
          const success = await handleUpdate(value);
          if (success) {
            setUpdateModalOpen(false);
            setCurrentRow(undefined);
            if (actionRef.current) {
              actionRef.current.reload();
            }
          }
        }}
        values={currentRow || {}}
      />

      <Modal
        title={`数据源详情 - ${selectedDataSource?.title}`}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={1000}
      >
        {selectedDataSource && (
          <Tabs
            items={[
              {
                key: 'info',
                label: '基本信息',
                children: (
                  <Descriptions column={2} bordered>
                    <Descriptions.Item label="名称">
                      {selectedDataSource.name}
                    </Descriptions.Item>
                    <Descriptions.Item label="标题">
                      {selectedDataSource.title}
                    </Descriptions.Item>
                    <Descriptions.Item label="类型">
                      {dataSourceTypeOptions.find(
                        (opt) =>
                          opt.value === selectedDataSource.dataSourceType,
                      )?.label || '未知'}
                    </Descriptions.Item>
                    <Descriptions.Item label="状态">
                      {statusOptions.find(
                        (opt) => opt.value === selectedDataSource.status,
                      )?.label || '未知'}
                    </Descriptions.Item>
                    <Descriptions.Item label="创建时间">
                      {selectedDataSource.createdAt
                        ? new Date(
                            selectedDataSource.createdAt,
                          ).toLocaleString()
                        : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="最后测试时间">
                      {selectedDataSource.lastTestedAt
                        ? new Date(
                            selectedDataSource.lastTestedAt,
                          ).toLocaleString()
                        : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="描述" span={2}>
                      {selectedDataSource.description || '-'}
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: 'tables',
                label: '表列表',
                children: (
                  <Table
                    columns={tableColumns}
                    dataSource={tables.map((name) => ({ key: name, name }))}
                    loading={tablesLoading}
                    pagination={false}
                    size="small"
                  />
                ),
              },
              {
                key: 'schema',
                label: '表结构',
                children: (
                  <Table
                    columns={schemaColumns}
                    dataSource={schema}
                    loading={schemaLoading}
                    pagination={false}
                    size="small"
                    scroll={{ y: 400 }}
                  />
                ),
              },
              {
                key: 'data',
                label: '表数据',
                children: (
                  <Table
                    columns={
                      tableData.length > 0
                        ? Object.keys(tableData[0]).map((key) => ({
                            title: key,
                            dataIndex: key,
                            key: key,
                            ellipsis: true,
                          }))
                        : []
                    }
                    dataSource={tableData}
                    loading={dataLoading}
                    pagination={{ pageSize: 10 }}
                    size="small"
                    scroll={{ x: 'max-content' }}
                  />
                ),
              },
            ]}
          />
        )}
      </Modal>
    </PageContainer>
  );
};

export default EnhancedDataSourceList;
