import React, { useEffect } from 'react';
import {
  ModalForm,
  ProFormText,
  ProFormTextArea,
  ProFormSelect,
  type ProFormInstance,
} from '@ant-design/pro-components';
import { Form, Card, Row, Col, Input, Button, Space, message } from 'antd';
import {
  DataSourceType,
  type DataSource,
  type CreateDataSourceRequest,
  type UpdateDataSourceRequest,
} from '../types';

interface DataSourceFormProps {
  formRef: React.RefObject<ProFormInstance>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    values: CreateDataSourceRequest | UpdateDataSourceRequest,
  ) => Promise<void>;
  current?: DataSource;
}

const DataSourceForm: React.FC<DataSourceFormProps> = ({
  formRef,
  open,
  onOpenChange,
  onSubmit,
  current,
}) => {
  const [_form] = Form.useForm();
  const [dataSourceType, setDataSourceType] = React.useState<DataSourceType>();

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

  useEffect(() => {
    if (open && current) {
      formRef.current?.setFieldsValue(current);
      setDataSourceType(current.dataSourceType);
    } else if (open) {
      formRef.current?.resetFields();
      setDataSourceType(undefined);
    }
  }, [open, current, formRef]);

  const handleDataSourceTypeChange = (value: DataSourceType) => {
    setDataSourceType(value);
  };

  const renderConnectionConfig = () => {
    switch (dataSourceType) {
      case DataSourceType.MySql:
      case DataSourceType.PostgreSQL:
      case DataSourceType.Oracle:
        return (
          <Card title="数据库连接配置" size="small">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="主机地址" name={['connectionConfig', 'host']}>
                  <Input placeholder="localhost" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="端口" name={['connectionConfig', 'port']}>
                  <Input placeholder="3306" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="数据库名"
                  name={['connectionConfig', 'database']}
                >
                  <Input placeholder="database_name" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="用户名"
                  name={['connectionConfig', 'username']}
                >
                  <Input placeholder="username" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="密码" name={['connectionConfig', 'password']}>
                  <Input.Password placeholder="password" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="表名"
                  name={['connectionConfig', 'tableName']}
                >
                  <Input placeholder="table_name" />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        );

      case DataSourceType.MongoDB:
        return (
          <Card title="MongoDB连接配置" size="small">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="主机地址" name={['connectionConfig', 'host']}>
                  <Input placeholder="localhost" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="端口" name={['connectionConfig', 'port']}>
                  <Input placeholder="27017" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="数据库名"
                  name={['connectionConfig', 'database']}
                >
                  <Input placeholder="database_name" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="集合名"
                  name={['connectionConfig', 'collectionName']}
                >
                  <Input placeholder="collection_name" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="用户名"
                  name={['connectionConfig', 'username']}
                >
                  <Input placeholder="username" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="密码" name={['connectionConfig', 'password']}>
                  <Input.Password placeholder="password" />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        );

      case DataSourceType.RestApi:
        return (
          <Card title="REST API配置" size="small">
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  label="基础URL"
                  name={['connectionConfig', 'baseUrl']}
                >
                  <Input placeholder="https://api.example.com" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="端点路径"
                  name={['connectionConfig', 'endpoint']}
                >
                  <Input placeholder="/api/data" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="认证类型"
                  name={['connectionConfig', 'authType']}
                >
                  <ProFormSelect
                    options={[
                      { label: '无认证', value: 'none' },
                      { label: 'Bearer Token', value: 'bearer' },
                      { label: 'Basic Auth', value: 'basic' },
                      { label: 'API Key', value: 'apikey' },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Token/Key"
                  name={['connectionConfig', 'token']}
                >
                  <Input.Password placeholder="your_token_or_key" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="用户名"
                  name={['connectionConfig', 'username']}
                >
                  <Input placeholder="username" />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        );

      case DataSourceType.IoT:
        return (
          <Card title="IoT设备配置" size="small">
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  label="MQTT Broker URL"
                  name={['connectionConfig', 'brokerUrl']}
                >
                  <Input placeholder="mqtt://broker.example.com:1883" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Exchange名称"
                  name={['connectionConfig', 'exchangeName']}
                >
                  <Input placeholder="iot.exchange" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="设备ID"
                  name={['connectionConfig', 'deviceId']}
                >
                  <Input placeholder="device_001" />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        );

      case DataSourceType.LogFile:
        return (
          <Card title="日志文件配置" size="small">
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  label="文件路径"
                  name={['connectionConfig', 'filePath']}
                >
                  <Input placeholder="/path/to/logfile.log" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="日志格式"
                  name={['connectionConfig', 'logFormat']}
                >
                  <ProFormSelect
                    options={[
                      { label: '标准格式', value: 'standard' },
                      { label: 'JSON格式', value: 'json' },
                      { label: 'Apache格式', value: 'apache' },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="编码格式"
                  name={['connectionConfig', 'encoding']}
                >
                  <ProFormSelect
                    options={[
                      { label: 'UTF-8', value: 'UTF-8' },
                      { label: 'UTF-16', value: 'UTF-16' },
                      { label: 'ASCII', value: 'ASCII' },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <ModalForm
      title={current ? '编辑数据源' : '新建数据源'}
      width={800}
      open={open}
      onOpenChange={onOpenChange}
      formRef={formRef}
      onFinish={async (values) => {
        await onSubmit(values);
      }}
    >
      <ProFormText
        rules={[
          {
            required: true,
            message: '数据源名称为必填项',
          },
        ]}
        label="数据源名称"
        name="name"
        placeholder="请输入数据源名称"
      />

      <ProFormText
        rules={[
          {
            required: true,
            message: '数据源标题为必填项',
          },
        ]}
        label="数据源标题"
        name="title"
        placeholder="请输入数据源标题"
      />

      <ProFormTextArea
        label="描述"
        name="description"
        placeholder="请输入数据源描述"
        fieldProps={{
          rows: 3,
        }}
      />

      <ProFormSelect
        rules={[
          {
            required: true,
            message: '数据源类型为必填项',
          },
        ]}
        label="数据源类型"
        name="dataSourceType"
        placeholder="请选择数据源类型"
        options={dataSourceTypeOptions}
        fieldProps={{
          onChange: handleDataSourceTypeChange,
        }}
      />

      {dataSourceType && renderConnectionConfig()}

      <ProFormText
        label="标签"
        name="tags"
        placeholder="请输入标签，多个标签用逗号分隔"
      />
    </ModalForm>
  );
};

export default DataSourceForm;
