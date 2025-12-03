import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  message,
  Tag,
  Popconfirm,
  DatePicker,
} from 'antd';
import {
  CheckOutlined,
  ReloadOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { iotService, IoTDeviceEvent, IoTDevice } from '@/services/iotService';
import dayjs from 'dayjs';
import styles from '../index.less';

const EventManagement: React.FC = () => {
  const [events, setEvents] = useState<IoTDeviceEvent[]>([]);
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<IoTDeviceEvent | null>(null);
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();

  useEffect(() => {
    loadEvents();
    loadDevices();
  }, []);

  const loadEvents = async (filters?: any) => {
    try {
      setLoading(true);
      const queryData = {
        pageIndex: 1,
        pageSize: 50,
        ...filters,
      };
      const response = await iotService.queryEvents(queryData);
      if (response.success) {
        setEvents(response.data.Events);
      }
    } catch (error) {
      message.error('加载事件列表失败');
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

  const handleSearch = (values: any) => {
    const filters: any = {};
    if (values.deviceId) filters.deviceId = values.deviceId;
    if (values.eventType) filters.eventType = values.eventType;
    if (values.level) filters.level = values.level;
    if (values.isHandled !== undefined) filters.isHandled = values.isHandled;
    if (values.dateRange && values.dateRange.length === 2) {
      filters.startTime = values.dateRange[0].toISOString();
      filters.endTime = values.dateRange[1].toISOString();
    }
    loadEvents(filters);
  };

  const handleHandle = (event: IoTDeviceEvent) => {
    setSelectedEvent(event);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleSubmit = async (values: any) => {
    if (!selectedEvent) return;
    try {
      const response = await iotService.handleEvent(selectedEvent.id, values.remarks || '');
      if (response.success) {
        message.success('事件已处理');
        setIsModalVisible(false);
        loadEvents();
      }
    } catch (error) {
      message.error('处理失败');
    }
  };

  const getLevelTag = (level: string) => {
    const levelMap: Record<string, { color: string; label: string }> = {
      Info: { color: 'blue', label: '信息' },
      Warning: { color: 'orange', label: '警告' },
      Error: { color: 'red', label: '错误' },
      Critical: { color: 'red', label: '严重' },
    };
    const config = levelMap[level] || { color: 'default', label: level };
    return <Tag color={config.color}>{config.label}</Tag>;
  };

  const columns = [
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
      title: '事件类型',
      dataIndex: 'eventType',
      key: 'eventType',
      width: 120,
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (level: string) => getLevelTag(level),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true,
    },
    {
      title: '发生时间',
      dataIndex: 'occurredAt',
      key: 'occurredAt',
      width: 180,
      render: (time: string) => new Date(time).toLocaleString(),
    },
    {
      title: '状态',
      dataIndex: 'isHandled',
      key: 'isHandled',
      width: 100,
      render: (isHandled: boolean) => (
        <Tag color={isHandled ? 'green' : 'red'}>{isHandled ? '已处理' : '未处理'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: IoTDeviceEvent) => (
        <Space size="small">
          {!record.isHandled && (
            <Button
              type="text"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => handleHandle(record)}
            >
              处理
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.eventManagement}>
      <div className={styles.toolbar}>
        <Form
          form={searchForm}
          layout="inline"
          onFinish={handleSearch}
          className={styles.searchForm}
        >
          <Form.Item name="deviceId">
            <Select placeholder="选择设备" allowClear style={{ width: 150 }}>
              {devices.map((device) => (
                <Select.Option key={device.deviceId} value={device.deviceId}>
                  {device.title}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="eventType">
            <Select placeholder="选择事件类型" allowClear style={{ width: 120 }}>
              <Select.Option value="Connected">连接</Select.Option>
              <Select.Option value="Disconnected">断开</Select.Option>
              <Select.Option value="DataReceived">数据接收</Select.Option>
              <Select.Option value="Alarm">告警</Select.Option>
              <Select.Option value="Error">错误</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="level">
            <Select placeholder="选择级别" allowClear style={{ width: 100 }}>
              <Select.Option value="Info">信息</Select.Option>
              <Select.Option value="Warning">警告</Select.Option>
              <Select.Option value="Error">错误</Select.Option>
              <Select.Option value="Critical">严重</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="isHandled">
            <Select placeholder="选择状态" allowClear style={{ width: 100 }}>
              <Select.Option value={false}>未处理</Select.Option>
              <Select.Option value={true}>已处理</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="dateRange">
            <DatePicker.RangePicker
              format="YYYY-MM-DD"
              placeholder={['开始日期', '结束日期']}
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              查询
            </Button>
          </Form.Item>
        </Form>

        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => loadEvents()} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      <Table
        className={styles.table}
        columns={columns}
        dataSource={events}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 20 }}
        scroll={{ x: 1200 }}
      />

      <Modal
        title="处理事件"
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
          {selectedEvent && (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: '#666', marginBottom: 4 }}>事件类型</div>
                <div style={{ fontSize: 14 }}>{selectedEvent.eventType}</div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ color: '#666', marginBottom: 4 }}>事件描述</div>
                <div style={{ fontSize: 14 }}>{selectedEvent.description}</div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ color: '#666', marginBottom: 4 }}>发生时间</div>
                <div style={{ fontSize: 14 }}>
                  {new Date(selectedEvent.occurredAt).toLocaleString()}
                </div>
              </div>
            </>
          )}

          <Form.Item
            label="处理备注"
            name="remarks"
            rules={[{ required: true, message: '请输入处理备注' }]}
          >
            <Input.TextArea placeholder="请输入处理备注" rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default EventManagement;

