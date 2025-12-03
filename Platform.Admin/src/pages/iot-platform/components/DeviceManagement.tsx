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
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { iotService, IoTDevice, IoTGateway, DeviceStatistics } from '@/services/iotService';
import styles from '../index.less';

const DeviceManagement: React.FC = () => {
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [gateways, setGateways] = useState<IoTGateway[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<IoTDevice | null>(null);
  const [statistics, setStatistics] = useState<DeviceStatistics | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadDevices();
    loadGateways();
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      const response = await iotService.getDevices();
      if (response.success) {
        setDevices(response.data);
      }
    } catch (error) {
      message.error('加载设备列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadGateways = async () => {
    try {
      const response = await iotService.getGateways();
      if (response.success) {
        setGateways(response.data);
      }
    } catch (error) {
      console.error('Failed to load gateways:', error);
    }
  };

  const handleAdd = () => {
    form.resetFields();
    setSelectedDevice(null);
    setIsModalVisible(true);
  };

  const handleEdit = (device: IoTDevice) => {
    setSelectedDevice(device);
    form.setFieldsValue(device);
    setIsModalVisible(true);
  };

  const handleView = async (device: IoTDevice) => {
    setSelectedDevice(device);
    try {
      const response = await iotService.getDeviceStatistics(device.deviceId);
      if (response.success) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
    setIsDetailDrawerVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await iotService.deleteDevice(id);
      if (response.success) {
        message.success('删除成功');
        loadDevices();
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (selectedDevice) {
        const response = await iotService.updateDevice(selectedDevice.id, values);
        if (response.success) {
          message.success('更新成功');
        }
      } else {
        const response = await iotService.createDevice(values);
        if (response.success) {
          message.success('创建成功');
        }
      }
      setIsModalVisible(false);
      loadDevices();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      Online: { color: 'green', label: '在线' },
      Offline: { color: 'default', label: '离线' },
      Fault: { color: 'red', label: '故障' },
      Maintenance: { color: 'orange', label: '维护中' },
    };
    const config = statusMap[status] || { color: 'default', label: status };
    return <Tag color={config.color}>{config.label}</Tag>;
  };

  const getDeviceTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      Sensor: '传感器',
      Actuator: '执行器',
      Gateway: '网关',
      Other: '其他',
    };
    return typeMap[type] || type;
  };

  const columns = [
    {
      title: '设备名称',
      dataIndex: 'title',
      key: 'title',
      width: 150,
    },
    {
      title: '设备类型',
      dataIndex: 'deviceType',
      key: 'deviceType',
      width: 100,
      render: (type: string) => getDeviceTypeLabel(type),
    },
    {
      title: '所属网关',
      dataIndex: 'gatewayId',
      key: 'gatewayId',
      width: 150,
      render: (gatewayId: string) => {
        const gateway = gateways.find((g) => g.gatewayId === gatewayId);
        return gateway?.title || gatewayId;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '数据点',
      dataIndex: 'dataPoints',
      key: 'dataPoints',
      width: 80,
      align: 'center' as const,
      render: (dataPoints: string[]) => dataPoints?.length || 0,
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
      render: (_: any, record: IoTDevice) => (
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
            title="删除设备"
            description="确定要删除此设备吗？"
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
    <div className={styles.deviceManagement}>
      <div className={styles.toolbar}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新建设备
          </Button>
          <Button icon={<ReloadOutlined />} onClick={loadDevices} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      <Table
        className={styles.table}
        columns={columns}
        dataSource={devices}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 20 }}
        scroll={{ x: 1200 }}
      />

      <Modal
        title={selectedDevice ? '编辑设备' : '新建设备'}
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={() => setIsModalVisible(false)}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className={styles.modal}
        >
          <Form.Item
            label="设备名称"
            name="name"
            rules={[{ required: true, message: '请输入设备名称' }]}
          >
            <Input placeholder="请输入设备名称" />
          </Form.Item>

          <Form.Item
            label="设备标题"
            name="title"
            rules={[{ required: true, message: '请输入设备标题' }]}
          >
            <Input placeholder="请输入设备标题" />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <Input.TextArea placeholder="请输入描述" rows={2} />
          </Form.Item>

          <Form.Item
            label="所属网关"
            name="gatewayId"
            rules={[{ required: true, message: '请选择所属网关' }]}
          >
            <Select placeholder="请选择所属网关">
              {gateways.map((gateway) => (
                <Select.Option key={gateway.gatewayId} value={gateway.gatewayId}>
                  {gateway.title}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="设备类型"
            name="deviceType"
            rules={[{ required: true, message: '请选择设备类型' }]}
          >
            <Select placeholder="请选择设备类型">
              <Select.Option value="Sensor">传感器</Select.Option>
              <Select.Option value="Actuator">执行器</Select.Option>
              <Select.Option value="Gateway">网关</Select.Option>
              <Select.Option value="Other">其他</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="型号" name="model">
            <Input placeholder="请输入设备型号" />
          </Form.Item>

          <Form.Item label="制造商" name="manufacturer">
            <Input placeholder="请输入制造商" />
          </Form.Item>

          <Form.Item label="序列号" name="serialNumber">
            <Input placeholder="请输入序列号" />
          </Form.Item>

          <Form.Item label="位置" name="location">
            <Input placeholder="请输入设备位置" />
          </Form.Item>

          <Form.Item label="备注" name="remarks">
            <Input.TextArea placeholder="请输入备注" rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="设备详情"
        placement="right"
        onClose={() => setIsDetailDrawerVisible(false)}
        open={isDetailDrawerVisible}
        width={400}
      >
        {selectedDevice && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#666', marginBottom: 4 }}>设备名称</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{selectedDevice.title}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#666', marginBottom: 4 }}>设备ID</div>
              <div style={{ fontSize: 14 }}>{selectedDevice.deviceId}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#666', marginBottom: 4 }}>状态</div>
              <div>{getStatusTag(selectedDevice.status)}</div>
            </div>

            {statistics && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#666', marginBottom: 4 }}>数据点统计</div>
                  <div>
                    <div>总数: {statistics.totalDataPoints}</div>
                    <div>启用: {statistics.enabledDataPoints}</div>
                    <div>数据记录: {statistics.totalDataRecords}</div>
                    <div>未处理告警: {statistics.unhandledAlarms}</div>
                  </div>
                </div>
              </>
            )}

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#666', marginBottom: 4 }}>设备类型</div>
              <div>{getDeviceTypeLabel(selectedDevice.deviceType)}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#666', marginBottom: 4 }}>型号</div>
              <div>{selectedDevice.model || '-'}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#666', marginBottom: 4 }}>制造商</div>
              <div>{selectedDevice.manufacturer || '-'}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#666', marginBottom: 4 }}>创建时间</div>
              <div>{new Date(selectedDevice.createdAt).toLocaleString()}</div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default DeviceManagement;

