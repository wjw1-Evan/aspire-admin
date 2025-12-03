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
import { iotService, IoTGateway, GatewayStatistics } from '@/services/iotService';
import styles from '../index.less';

const GatewayManagement: React.FC = () => {
  const [gateways, setGateways] = useState<IoTGateway[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<IoTGateway | null>(null);
  const [statistics, setStatistics] = useState<GatewayStatistics | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadGateways();
  }, []);

  const loadGateways = async () => {
    try {
      setLoading(true);
      const response = await iotService.getGateways();
      if (response.success) {
        setGateways(response.data);
      }
    } catch (error) {
      message.error('加载网关列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    form.resetFields();
    setSelectedGateway(null);
    setIsModalVisible(true);
  };

  const handleEdit = (gateway: IoTGateway) => {
    setSelectedGateway(gateway);
    form.setFieldsValue(gateway);
    setIsModalVisible(true);
  };

  const handleView = async (gateway: IoTGateway) => {
    setSelectedGateway(gateway);
    try {
      const response = await iotService.getGatewayStatistics(gateway.gatewayId);
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
      const response = await iotService.deleteGateway(id);
      if (response.success) {
        message.success('删除成功');
        loadGateways();
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (selectedGateway) {
        const response = await iotService.updateGateway(selectedGateway.id, values);
        if (response.success) {
          message.success('更新成功');
        }
      } else {
        const response = await iotService.createGateway(values);
        if (response.success) {
          message.success('创建成功');
        }
      }
      setIsModalVisible(false);
      loadGateways();
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

  const columns = [
    {
      title: '网关名称',
      dataIndex: 'title',
      key: 'title',
      width: 150,
    },
    {
      title: '协议类型',
      dataIndex: 'protocolType',
      key: 'protocolType',
      width: 100,
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      width: 150,
    },
    {
      title: '端口',
      dataIndex: 'port',
      key: 'port',
      width: 80,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '设备数',
      dataIndex: 'deviceCount',
      key: 'deviceCount',
      width: 80,
      align: 'center' as const,
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
      render: (_: any, record: IoTGateway) => (
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
            title="删除网关"
            description="确定要删除此网关吗？"
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
    <div className={styles.gatewayManagement}>
      <div className={styles.toolbar}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新建网关
          </Button>
          <Button icon={<ReloadOutlined />} onClick={loadGateways} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      <Table
        className={styles.table}
        columns={columns}
        dataSource={gateways}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 20 }}
        scroll={{ x: 1200 }}
      />

      <Modal
        title={selectedGateway ? '编辑网关' : '新建网关'}
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
            label="网关名称"
            name="name"
            rules={[{ required: true, message: '请输入网关名称' }]}
          >
            <Input placeholder="请输入网关名称" />
          </Form.Item>

          <Form.Item
            label="网关标题"
            name="title"
            rules={[{ required: true, message: '请输入网关标题' }]}
          >
            <Input placeholder="请输入网关标题" />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <Input.TextArea placeholder="请输入描述" rows={3} />
          </Form.Item>

          <Form.Item
            label="协议类型"
            name="protocolType"
            rules={[{ required: true, message: '请选择协议类型' }]}
          >
            <Select placeholder="请选择协议类型">
              <Select.Option value="MQTT">MQTT</Select.Option>
              <Select.Option value="HTTP">HTTP</Select.Option>
              <Select.Option value="Modbus">Modbus</Select.Option>
              <Select.Option value="CoAP">CoAP</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="网关地址"
            name="address"
            rules={[{ required: true, message: '请输入网关地址' }]}
          >
            <Input placeholder="请输入网关地址或IP" />
          </Form.Item>

          <Form.Item
            label="端口"
            name="port"
            rules={[{ required: true, message: '请输入端口号' }]}
          >
            <InputNumber placeholder="请输入端口号" min={1} max={65535} />
          </Form.Item>

          <Form.Item label="用户名" name="username">
            <Input placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item label="密码" name="password">
            <Input.Password placeholder="请输入密码" />
          </Form.Item>

          <Form.Item label="备注" name="remarks">
            <Input.TextArea placeholder="请输入备注" rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="网关详情"
        placement="right"
        onClose={() => setIsDetailDrawerVisible(false)}
        open={isDetailDrawerVisible}
        width={400}
      >
        {selectedGateway && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#666', marginBottom: 4 }}>网关名称</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{selectedGateway.title}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#666', marginBottom: 4 }}>网关ID</div>
              <div style={{ fontSize: 14 }}>{selectedGateway.gatewayId}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#666', marginBottom: 4 }}>状态</div>
              <div>{getStatusTag(selectedGateway.status)}</div>
            </div>

            {statistics && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#666', marginBottom: 4 }}>设备统计</div>
                  <div>
                    <div>总数: {statistics.totalDevices}</div>
                    <div>在线: {statistics.onlineDevices}</div>
                    <div>离线: {statistics.offlineDevices}</div>
                    <div>故障: {statistics.faultDevices}</div>
                  </div>
                </div>
              </>
            )}

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#666', marginBottom: 4 }}>协议类型</div>
              <div>{selectedGateway.protocolType}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#666', marginBottom: 4 }}>地址</div>
              <div>{selectedGateway.address}:{selectedGateway.port}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#666', marginBottom: 4 }}>创建时间</div>
              <div>{new Date(selectedGateway.createdAt).toLocaleString()}</div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default GatewayManagement;

