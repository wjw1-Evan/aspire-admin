import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  message,
  Drawer,
  Tag,
  Popconfirm,
  Switch,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { iotService, IoTDataPoint, IoTDevice } from '@/services/iotService';
import styles from '../index.less';

const DataPointManagement: React.FC = () => {
  const [dataPoints, setDataPoints] = useState<IoTDataPoint[]>([]);
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [selectedDataPoint, setSelectedDataPoint] = useState<IoTDataPoint | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadDataPoints();
    loadDevices();
  }, []);

  const loadDataPoints = async () => {
    try {
      setLoading(true);
      const response = await iotService.getDataPoints();
      if (response.success) {
        setDataPoints(response.data);
      }
    } catch (error) {
      message.error('加载数据点列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadDevices = async () => {
    try {
      const response = await iotService.getDevices();
      if (response.success) {
        setDevices(response.data);
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
    }
  };

  const handleAdd = () => {
    form.resetFields();
    setSelectedDataPoint(null);
    setIsModalVisible(true);
  };

  const handleEdit = (dataPoint: IoTDataPoint) => {
    setSelectedDataPoint(dataPoint);
    form.setFieldsValue(dataPoint);
    setIsModalVisible(true);
  };

  const handleView = (dataPoint: IoTDataPoint) => {
    setSelectedDataPoint(dataPoint);
    setIsDetailDrawerVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await iotService.deleteDataPoint(id);
      if (response.success) {
        message.success('删除成功');
        loadDataPoints();
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (selectedDataPoint) {
        const response = await iotService.updateDataPoint(selectedDataPoint.id, values);
        if (response.success) {
          message.success('更新成功');
        }
      } else {
        const response = await iotService.createDataPoint(values);
        if (response.success) {
          message.success('创建成功');
        }
      }
      setIsModalVisible(false);
      loadDataPoints();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const getDataTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      Numeric: '数值',
      Boolean: '布尔',
      String: '字符串',
      Enum: '枚举',
      Json: 'JSON',
    };
    return typeMap[type] || type;
  };

  const columns = [
    {
      title: '数据点名称',
      dataIndex: 'title',
      key: 'title',
      width: 150,
    },
    {
      title: '所属设备',
      dataIndex: 'deviceId',
      key: 'deviceId',
      width: 150,
      render: (deviceId: string) => {
        const device = devices.find((d) => d.deviceId === deviceId);
        return device?.title || deviceId;
      },
    },
    {
      title: '数据类型',
      dataIndex: 'dataType',
      key: 'dataType',
      width: 100,
      render: (type: string) => getDataTypeLabel(type),
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
    },
    {
      title: '最后值',
      dataIndex: 'lastValue',
      key: 'lastValue',
      width: 100,
    },
    {
      title: '启用',
      dataIndex: 'isEnabled',
      key: 'isEnabled',
      width: 80,
      render: (isEnabled: boolean) => (
        <Tag color={isEnabled ? 'green' : 'red'}>{isEnabled ? '是' : '否'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: IoTDataPoint) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          />
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="删除数据点"
            description="确定要删除此数据点吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.dataPointManagement}>
      <div className={styles.toolbar}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新建数据点
          </Button>
          <Button icon={<ReloadOutlined />} onClick={loadDataPoints} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      <Table
        className={styles.table}
        columns={columns}
        dataSource={dataPoints}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 20 }}
        scroll={{ x: 1200 }}
      />

      <Modal
        title={selectedDataPoint ? '编辑数据点' : '新建数据点'}
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={() => setIsModalVisible(false)}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className={styles.modal}
        >
          <Form.Item
            label="数据点名称"
            name="name"
            rules={[{ required: true, message: '请输入数据点名称' }]}
          >
            <Input placeholder="请输入数据点名称" />
          </Form.Item>

          <Form.Item
            label="数据点标题"
            name="title"
            rules={[{ required: true, message: '请输入数据点标题' }]}
          >
            <Input placeholder="请输入数据点标题" />
          </Form.Item>

          <Form.Item
            label="所属设备"
            name="deviceId"
            rules={[{ required: true, message: '请选择所属设备' }]}
          >
            <Select placeholder="请选择所属设备">
              {devices.map((device) => (
                <Select.Option key={device.deviceId} value={device.deviceId}>
                  {device.title}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="数据类型"
            name="dataType"
            rules={[{ required: true, message: '请选择数据类型' }]}
          >
            <Select placeholder="请选择数据类型">
              <Select.Option value="Numeric">数值</Select.Option>
              <Select.Option value="Boolean">布尔</Select.Option>
              <Select.Option value="String">字符串</Select.Option>
              <Select.Option value="Enum">枚举</Select.Option>
              <Select.Option value="Json">JSON</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="单位" name="unit">
            <Input placeholder="请输入单位" />
          </Form.Item>

          <Form.Item label="最小值" name="minValue">
            <InputNumber placeholder="请输入最小值" />
          </Form.Item>

          <Form.Item label="最大值" name="maxValue">
            <InputNumber placeholder="请输入最大值" />
          </Form.Item>

          <Form.Item label="精度" name="precision" initialValue={2}>
            <InputNumber placeholder="请输入精度" min={0} max={10} />
          </Form.Item>

          <Form.Item label="采样间隔(秒)" name="samplingInterval" initialValue={60}>
            <InputNumber placeholder="请输入采样间隔" min={1} />
          </Form.Item>

          <Form.Item label="只读" name="isReadOnly" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>

          <Form.Item label="启用" name="isEnabled" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <Input.TextArea placeholder="请输入描述" rows={2} />
          </Form.Item>

          <Form.Item label="备注" name="remarks">
            <Input.TextArea placeholder="请输入备注" rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="数据点详情"
        placement="right"
        onClose={() => setIsDetailDrawerVisible(false)}
        open={isDetailDrawerVisible}
        width={400}
      >
        {selectedDataPoint && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#666', marginBottom: 4 }}>数据点名称</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{selectedDataPoint.title}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#666', marginBottom: 4 }}>数据点ID</div>
              <div style={{ fontSize: 14 }}>{selectedDataPoint.dataPointId}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#666', marginBottom: 4 }}>数据类型</div>
              <div>{getDataTypeLabel(selectedDataPoint.dataType)}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#666', marginBottom: 4 }}>最后值</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>
                {selectedDataPoint.lastValue || '-'} {selectedDataPoint.unit}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#666', marginBottom: 4 }}>最后更新时间</div>
              <div>
                {selectedDataPoint.lastUpdatedAt
                  ? new Date(selectedDataPoint.lastUpdatedAt).toLocaleString()
                  : '-'}
              </div>
            </div>

            {selectedDataPoint.minValue !== undefined && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: '#666', marginBottom: 4 }}>范围</div>
                <div>
                  {selectedDataPoint.minValue} ~ {selectedDataPoint.maxValue}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#666', marginBottom: 4 }}>创建时间</div>
              <div>{new Date(selectedDataPoint.createdAt).toLocaleString()}</div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default DataPointManagement;

