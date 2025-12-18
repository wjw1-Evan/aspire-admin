import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import type { ActionType, ProColumns } from '@/types/pro-components';
import DataTable from '@/components/DataTable';
import { type TableColumnsType } from 'antd';
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
import {
  iotService,
  IoTDevice,
  IoTGateway,
  DeviceStatistics,
} from '@/services/iotService';
import { StatCard } from '@/components';

export interface DeviceManagementRef {
  reload: () => void;
  refreshStats: () => void;
  handleAdd: () => void;
}

const DeviceManagement = forwardRef<DeviceManagementRef>((props, ref) => {
  const actionRef = useRef<ActionType>(null);
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

  // 基于 lastReportedAt 判断设备是否在线（5分钟内上报过视为在线）
  const isDeviceOnline = (device: IoTDevice) => {
    if (!device.lastReportedAt) return false;
    const reportedAt = new Date(device.lastReportedAt);
    const now = new Date();
    const diffMinutes = (now.getTime() - reportedAt.getTime()) / (1000 * 60);
    return diffMinutes <= 5;
  };

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
          online: list.filter((d: IoTDevice) => isDeviceOnline(d)).length,
          offline: list.filter((d: IoTDevice) => !isDeviceOnline(d)).length,
          fault: 0, // 不再维护故障状态
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

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    reload: () => {
      if (actionRef.current?.reload) {
        actionRef.current.reload();
      }
    },
    refreshStats: () => {
      fetchOverviewStats();
    },
    handleAdd,
  }));

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
        if (actionRef.current?.reload) {
          actionRef.current.reload();
        }
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
      if (actionRef.current?.reload) {
        actionRef.current.reload();
      }
      fetchOverviewStats();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const getStatusTag = (device: IoTDevice) => {
    const isOnline = isDeviceOnline(device);
    return <Tag color={isOnline ? 'green' : 'default'}>{isOnline ? '在线' : '离线'}</Tag>;
  };

  const columns: TableColumnsType<IoTDevice> = [
    {
      title: '设备名称',
      dataIndex: 'title',
      key: 'title',
      width: 150,
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
      key: 'status',
      width: 100,
      render: (_: any, device: IoTDevice) => getStatusTag(device),
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
      <DataTable<IoTDevice>
        actionRef={actionRef}
        columns={columns}
        request={fetchDevices}
        rowKey="id"
        search={false}
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

          <Form.Item
            label="设备标识符"
            name="deviceId"
            tooltip="设备的唯一标识符，不提供则自动生成"
          >
            <Input placeholder="留空则自动生成" />
          </Form.Item>

          <Form.Item
            label="所属网关"
            name="gatewayId"
            tooltip="设备可以独立存在，也可以关联到网关"
          >
            <Select placeholder="请选择所属网关（可选）" allowClear>
              {safeGateways.map((gateway) => (
                <Select.Option key={gateway.gatewayId} value={gateway.gatewayId}>
                  {gateway.title}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="设备详情"
        placement="right"
        onClose={() => setIsDetailDrawerVisible(false)}
        open={isDetailDrawerVisible}
        size={400}
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
              <div>{getStatusTag(selectedDevice)}</div>
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
              <div style={{ color: '#666', marginBottom: 4 }}>最后上报时间</div>
              <div>{selectedDevice.lastReportedAt ? new Date(selectedDevice.lastReportedAt).toLocaleString() : '-'}</div>
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
});

DeviceManagement.displayName = 'DeviceManagement';

export default DeviceManagement;

