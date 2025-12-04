import React, { useState, useEffect, useRef } from 'react';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import {
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  message,
  Drawer,
  Tag,
  Popconfirm,
  Card,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  DesktopOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { iotService, IoTDevice, IoTGateway, DeviceStatistics } from '@/services/iotService';
import { StatCard } from '@/components';

const DeviceManagement: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [gateways, setGateways] = useState<IoTGateway[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<IoTDevice | null>(null);
  const [statistics, setStatistics] = useState<DeviceStatistics | null>(null);
  const [form] = Form.useForm();
  const [overviewStats, setOverviewStats] = useState({
    total: 0,
    online: 0,
    offline: 0,
    fault: 0,
  });

  // 确保 gateways 始终是数组
  const safeGateways = Array.isArray(gateways) ? gateways : [];

  useEffect(() => {
    loadGateways();
    fetchOverviewStats();
  }, []);

  // 获取概览统计
  const fetchOverviewStats = async () => {
    try {
      // 获取所有设备用于统计
      const response = await iotService.getDevices(undefined, 1, 1000);
      if (response.success && response.data) {
        const list = Array.isArray(response.data.list) ? response.data.list : [];
        setOverviewStats({
          total: list.length,
          online: list.filter((d: IoTDevice) => d.status === 'Online').length,
          offline: list.filter((d: IoTDevice) => d.status === 'Offline').length,
          fault: list.filter((d: IoTDevice) => d.status === 'Fault').length,
        });
      }
    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  };

  // 获取设备列表（用于 ProTable）
  const fetchDevices = async (params: any) => {
    try {
      const response = await iotService.getDevices(undefined, params.current || 1, params.pageSize || 20);
      if (response.success && response.data) {
        const data = response.data;
        const list = Array.isArray(data.list) ? data.list : [];
        return {
          data: list,
          success: true,
          total: data.total || 0,
        };
      }
      return {
        data: [],
        success: false,
        total: 0,
      };
    } catch (error) {
      console.error('加载设备列表失败:', error);
      message.error('加载设备列表失败');
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  };

  const loadGateways = async () => {
    try {
      const response = await iotService.getGateways(1, 1000); // 加载所有网关用于下拉选择
      if (response.success && response.data) {
        const list = Array.isArray(response.data.list) ? response.data.list : [];
        setGateways(list);
      } else {
        setGateways([]);
      }
    } catch (error) {
      console.error('Failed to load gateways:', error);
      setGateways([]);
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
        actionRef.current?.reload();
        fetchOverviewStats();
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
      actionRef.current?.reload();
      fetchOverviewStats();
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

  const columns: ProColumns<IoTDevice>[] = [
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
        const gateway = safeGateways.find((g) => g.gatewayId === gatewayId);
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
      align: 'center',
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
      fixed: 'right',
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
    <>
      {/* 统计卡片：与其他页面保持一致的紧凑横向布局 */}
      <Card style={{ marginBottom: 16, borderRadius: 12 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={6}>
            <StatCard
              title="设备总数"
              value={overviewStats.total}
              icon={<DesktopOutlined />}
              color="#1890ff"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatCard
              title="在线设备"
              value={overviewStats.online}
              icon={<CheckCircleOutlined />}
              color="#52c41a"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatCard
              title="离线设备"
              value={overviewStats.offline}
              icon={<CloseCircleOutlined />}
              color="#8c8c8c"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatCard
              title="故障设备"
              value={overviewStats.fault}
              icon={<ExclamationCircleOutlined />}
              color="#ff4d4f"
            />
          </Col>
        </Row>
      </Card>

      {/* 设备列表表格 */}
      <ProTable<IoTDevice>
        actionRef={actionRef}
        columns={columns}
        request={fetchDevices}
        rowKey="id"
        search={false}
        toolbar={{
          actions: [
            <Button
              key="create"
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              新建设备
            </Button>,
            <Button
              key="refresh"
              icon={<ReloadOutlined />}
              onClick={() => {
                actionRef.current?.reload();
                fetchOverviewStats();
              }}
            >
              刷新
            </Button>,
          ],
        }}
        pagination={{
          pageSize: 20,
          pageSizeOptions: [10, 20, 50, 100],
        }}
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
              {safeGateways.map((gateway) => (
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
    </>
  );
};

export default DeviceManagement;

