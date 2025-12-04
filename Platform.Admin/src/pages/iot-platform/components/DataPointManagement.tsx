import React, { useState, useEffect, useRef } from 'react';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import {
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
  DatabaseOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { iotService, IoTDataPoint, IoTDevice } from '@/services/iotService';
import { StatCard } from '@/components';

const DataPointManagement: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [selectedDataPoint, setSelectedDataPoint] = useState<IoTDataPoint | null>(null);
  const [form] = Form.useForm();
  const [overviewStats, setOverviewStats] = useState({
    total: 0,
    enabled: 0,
    disabled: 0,
    withAlarm: 0,
  });

  // 确保 devices 始终是数组
  const safeDevices = Array.isArray(devices) ? devices : [];

  useEffect(() => {
    loadDevices();
    fetchOverviewStats();
  }, []);

  // 获取概览统计
  const fetchOverviewStats = async () => {
    try {
      // 获取所有数据点用于统计
      const response = await iotService.getDataPoints(undefined, 1, 1000);
      if (response.success && response.data) {
        const list = Array.isArray(response.data.list) ? response.data.list : [];
        setOverviewStats({
          total: list.length,
          enabled: list.filter((dp: IoTDataPoint) => dp.isEnabled).length,
          disabled: list.filter((dp: IoTDataPoint) => !dp.isEnabled).length,
          withAlarm: list.filter((dp: IoTDataPoint) => dp.alarmConfig?.isEnabled).length,
        });
      }
    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  };

  // 获取数据点列表（用于 ProTable）
  const fetchDataPoints = async (params: any) => {
    try {
      const response = await iotService.getDataPoints(undefined, params.current || 1, params.pageSize || 20);
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
      console.error('加载数据点列表失败:', error);
      message.error('加载数据点列表失败');
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  };

  const loadDevices = async () => {
    try {
      const response = await iotService.getDevices(undefined, 1, 1000); // 加载所有设备用于下拉选择
      if (response.success && response.data) {
        const list = Array.isArray(response.data.list) ? response.data.list : [];
        setDevices(list);
      } else {
        setDevices([]);
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
      setDevices([]);
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
        actionRef.current?.reload();
        fetchOverviewStats();
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
      actionRef.current?.reload();
      fetchOverviewStats();
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

  const columns: ProColumns<IoTDataPoint>[] = [
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
        const device = safeDevices.find((d) => d.deviceId === deviceId);
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
      fixed: 'right',
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
    <>
      {/* 统计卡片：与其他页面保持一致的紧凑横向布局 */}
      <Card style={{ marginBottom: 16, borderRadius: 12 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={6}>
            <StatCard
              title="数据点总数"
              value={overviewStats.total}
              icon={<DatabaseOutlined />}
              color="#1890ff"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatCard
              title="已启用"
              value={overviewStats.enabled}
              icon={<CheckCircleOutlined />}
              color="#52c41a"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatCard
              title="已禁用"
              value={overviewStats.disabled}
              icon={<CloseCircleOutlined />}
              color="#8c8c8c"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatCard
              title="告警配置"
              value={overviewStats.withAlarm}
              icon={<ExclamationCircleOutlined />}
              color="#faad14"
            />
          </Col>
        </Row>
      </Card>

      {/* 数据点列表表格 */}
      <ProTable<IoTDataPoint>
        actionRef={actionRef}
        columns={columns}
        request={fetchDataPoints}
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
              新建数据点
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
              {safeDevices.map((device) => (
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
    </>
  );
};

export default DataPointManagement;

