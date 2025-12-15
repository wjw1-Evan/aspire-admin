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
  CloudServerOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { iotService, IoTGateway, GatewayStatistics, IoTDeviceStatus } from '@/services/iotService';
import { StatCard } from '@/components';

const GatewayManagement: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<IoTGateway | null>(null);
  const [statistics, setStatistics] = useState<GatewayStatistics | null>(null);
  const [form] = Form.useForm();
  const [overviewStats, setOverviewStats] = useState({
    total: 0,
    online: 0,
    offline: 0,
    fault: 0,
  });

  const normalizeStatus = (status?: string) => (status || '').toLowerCase() as IoTDeviceStatus;
  const statusMap: Record<IoTDeviceStatus, { color: string; label: string }> = {
    online: { color: 'green', label: '在线' },
    offline: { color: 'default', label: '离线' },
    fault: { color: 'red', label: '故障' },
    maintenance: { color: 'orange', label: '维护中' },
  };

  // 获取概览统计
  const fetchOverviewStats = async () => {
    try {
      const response = await iotService.getGateways(1, 1);
      if (response.success && response.data) {
        // 获取所有网关用于统计
        const allResponse = await iotService.getGateways(1, 1000);
        if (allResponse.success && allResponse.data) {
          const list = Array.isArray(allResponse.data.list) ? allResponse.data.list : [];
          setOverviewStats({
            total: list.length,
            online: list.filter((g: IoTGateway) => normalizeStatus(g.status) === 'online').length,
            offline: list.filter((g: IoTGateway) => normalizeStatus(g.status) === 'offline').length,
            fault: list.filter((g: IoTGateway) => normalizeStatus(g.status) === 'fault').length,
          });
        }
      }
    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  };

  useEffect(() => {
    fetchOverviewStats();
  }, []);

  // 获取网关列表（用于 ProTable）
  const fetchGateways = async (params: any) => {
    try {
      const response = await iotService.getGateways(params.current || 1, params.pageSize || 20);
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
      console.error('加载网关列表失败:', error);
      message.error('加载网关列表失败');
      return {
        data: [],
        success: false,
        total: 0,
      };
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
        actionRef.current?.reload();
        fetchOverviewStats();
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async (values: any) => {
    // 后端仍可能需要 name 字段，这里与 title 保持一致
    const payload = { ...values, name: values.title };
    try {
      if (selectedGateway) {
        const response = await iotService.updateGateway(selectedGateway.id, payload);
        if (response.success) {
          message.success('更新成功');
        }
      } else {
        const response = await iotService.createGateway(payload);
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
    const normalized = normalizeStatus(status);
    const config = statusMap[normalized] || { color: 'default', label: status || '未知' };
    return <Tag color={config.color}>{config.label}</Tag>;
  };

  const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'PULL'];

  const columns: ProColumns<IoTGateway>[] = [
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
      title: '请求方式',
      dataIndex: ['config', 'httpMethod'],
      key: 'httpMethod',
      width: 110,
      render: (_, record) => {
        const method = record?.config?.httpMethod || '-';
        return <Tag color="blue">{method}</Tag>;
      },
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      width: 150,
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
      align: 'center',
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
    <>
      {/* 统计卡片：与其他页面保持一致的紧凑横向布局 */}
      <Card style={{ marginBottom: 16, borderRadius: 12 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={6}>
            <StatCard
              title="网关总数"
              value={overviewStats.total}
              icon={<CloudServerOutlined />}
              color="#1890ff"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatCard
              title="在线网关"
              value={overviewStats.online}
              icon={<CheckCircleOutlined />}
              color="#52c41a"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatCard
              title="离线网关"
              value={overviewStats.offline}
              icon={<CloseCircleOutlined />}
              color="#8c8c8c"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatCard
              title="故障网关"
              value={overviewStats.fault}
              icon={<ExclamationCircleOutlined />}
              color="#ff4d4f"
            />
          </Col>
        </Row>
      </Card>

      {/* 网关列表表格 */}
      <ProTable<IoTGateway>
        actionRef={actionRef}
        columns={columns}
        request={fetchGateways}
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
              新建网关
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
        >
          <Form.Item
            label="网关名称"
            name="title"
            rules={[{ required: true, message: '请输入网关名称' }]}
          >
            <Input placeholder="请输入网关名称" />
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
            label="请求方式"
            name={['config', 'httpMethod']}
            rules={[{ required: true, message: '请选择请求方式' }]}
            initialValue="GET"
          >
            <Select placeholder="请选择请求方式">
              {httpMethods.map((m) => (
                <Select.Option key={m} value={m}>
                  {m}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="网关地址"
            name="address"
            rules={[{ required: true, message: '请输入网关地址' }]}
          >
            <Input placeholder="请输入网关地址或IP" />
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
              <div>{selectedGateway.address}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#666', marginBottom: 4 }}>创建时间</div>
              <div>{new Date(selectedGateway.createdAt).toLocaleString()}</div>
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
};

export default GatewayManagement;

