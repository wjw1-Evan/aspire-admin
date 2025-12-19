import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback, useMemo, useRef as useRefHook } from 'react';
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
  Tag,
  DatePicker,
  Card,
  Row,
  Col,
  Grid,
} from 'antd';

const { useBreakpoint } = Grid;
import {
  CheckOutlined,
  ReloadOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { iotService, IoTDeviceEvent, IoTDevice } from '@/services/iotService';
import dayjs from 'dayjs';
import { StatCard } from '@/components';

export interface EventManagementRef {
  reload: () => void;
  refreshStats: () => void;
}

const EventManagement = forwardRef<EventManagementRef>((props, ref) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md; // md 以下为移动端
  const actionRef = useRef<ActionType>(null);
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<IoTDeviceEvent | null>(null);
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();
  const [overviewStats, setOverviewStats] = useState({
    total: 0,
    unhandled: 0,
    handled: 0,
    critical: 0,
  });
  // 使用 useRef 存储最新的搜索参数，确保 request 函数能立即访问到最新值
  const searchParamsRef = useRef<any>({});

  // 确保 devices 始终是数组
  const safeDevices = Array.isArray(devices) ? devices : [];

  // 获取概览统计
  const fetchOverviewStats = useCallback(async () => {
    try {
      const response = await iotService.queryEvents({ pageIndex: 1, pageSize: 1000 });
      if (response.success && response.data) {
        const eventsList = Array.isArray(response.data.Events) ? response.data.Events : [];
        setOverviewStats({
          total: eventsList.length,
          unhandled: eventsList.filter((e: IoTDeviceEvent) => !e.isHandled).length,
          handled: eventsList.filter((e: IoTDeviceEvent) => e.isHandled).length,
          critical: eventsList.filter((e: IoTDeviceEvent) => e.level === 'Critical').length,
        });
      }
    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  }, []);

  const loadDevices = useCallback(async () => {

  // 获取事件列表（用于 ProTable）- 使用 useCallback 避免死循环
  const fetchEvents = useCallback(async (params: any, sort?: Record<string, any>) => {
    try {
      // 使用 ref 确保获取最新的搜索参数
      const formValues = searchParamsRef.current;
      const filters: any = {
        pageIndex: params.current || 1,
        pageSize: params.pageSize || 20,
      };
      
      if (formValues.deviceId) filters.deviceId = formValues.deviceId;
      if (formValues.eventType) filters.eventType = formValues.eventType;
      if (formValues.level) filters.level = formValues.level;
      if (formValues.isHandled !== undefined) filters.isHandled = formValues.isHandled;
      if (formValues.dateRange && formValues.dateRange.length === 2) {
        filters.startTime = formValues.dateRange[0].toISOString();
        filters.endTime = formValues.dateRange[1].toISOString();
      }

      const response = await iotService.queryEvents(filters);
      if (response.success && response.data) {
        const eventsList = Array.isArray(response.data.Events) ? response.data.Events : [];
        return {
          data: eventsList,
          success: true,
          total: response.data.Total || eventsList.length,
        };
      }
      return {
        data: [],
        success: false,
        total: 0,
      };
    } catch (error) {
      console.error('加载事件列表失败:', error);
      message.error('加载事件列表失败');
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  }, []);

  const loadDevices = useCallback(async () => {
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
  }, []);

  // 初始化：加载设备和统计信息
  useEffect(() => {
    loadDevices();
    fetchOverviewStats();
  }, [loadDevices, fetchOverviewStats]);

  const handleSearch = useCallback(() => {
    // 同时更新 ref，确保 request 函数能立即访问到最新值
    const values = searchForm.getFieldsValue();
    searchParamsRef.current = values;
    
    if (actionRef.current?.reload) {
      actionRef.current.reload();
    }
    fetchOverviewStats();
  }, [searchForm, fetchOverviewStats]);

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
  }), [fetchOverviewStats]);

  const handleHandle = useCallback((event: IoTDeviceEvent) => {
    setSelectedEvent(event);
    form.resetFields();
    setIsModalVisible(true);
  }, [form]);

  const handleSubmit = useCallback(async (values: any) => {
    if (!selectedEvent) return;
    try {
      const response = await iotService.handleEvent(selectedEvent.id, values.remarks || '');
      if (response.success) {
        message.success('事件已处理');
      handleCloseModal();
      if (actionRef.current?.reload) {
        actionRef.current.reload();
      }
      fetchOverviewStats();
      }
    } catch (error) {
      message.error('处理失败');
    }
  }, [selectedEvent, fetchOverviewStats]);

  const getLevelTag = useCallback((level: string) => {
    const levelMap: Record<string, { color: string; label: string }> = {
      Info: { color: 'blue', label: '信息' },
      Warning: { color: 'orange', label: '警告' },
      Error: { color: 'red', label: '错误' },
      Critical: { color: 'red', label: '严重' },
    };
    const config = levelMap[level] || { color: 'default', label: level };
    return <Tag color={config.color}>{config.label}</Tag>;
  }, []);

  const columns: TableColumnsType<IoTDeviceEvent> = useMemo(() => [
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
      fixed: 'right',
      render: (_: any, record: IoTDeviceEvent) => (
        <Space size="small">
          {!record.isHandled && (
            <Button
              type="link"
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
  ], [handleHandle, getLevelTag, safeDevices]);

  // 关闭表单弹窗
  const handleCloseModal = useCallback(() => {
    setIsModalVisible(false);
    setSelectedEvent(null);
    form.resetFields();
  }, [form]);

  return (
    <>
      {/* 统计卡片：与其他页面保持一致的紧凑横向布局 */}
      <Card style={{ marginBottom: 16, borderRadius: 12 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={6}>
            <StatCard
              title="事件总数"
              value={overviewStats.total}
              icon={<AlertOutlined />}
              color="#1890ff"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatCard
              title="未处理"
              value={overviewStats.unhandled}
              icon={<CloseCircleOutlined />}
              color="#ff4d4f"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatCard
              title="已处理"
              value={overviewStats.handled}
              icon={<CheckCircleOutlined />}
              color="#52c41a"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatCard
              title="严重事件"
              value={overviewStats.critical}
              icon={<ExclamationCircleOutlined />}
              color="#ff4d4f"
            />
          </Col>
        </Row>
      </Card>

      {/* 搜索表单 */}
      <Card style={{ marginBottom: 16 }}>
        <Form
          form={searchForm}
          layout="inline"
          onFinish={handleSearch}
        >
          <Form.Item name="deviceId">
            <Select placeholder="选择设备" allowClear style={{ width: 150 }}>
              {safeDevices.map((device) => (
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
            <Space>
              <Button type="primary" htmlType="submit">
                查询
              </Button>
              <Button onClick={() => {
                searchForm.resetFields();
                handleSearch();
              }}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* 事件列表表格 */}
      <DataTable<IoTDeviceEvent>
        actionRef={actionRef}
        columns={columns}
        request={fetchEvents}
        rowKey="id"
        scroll={{ x: 'max-content' }}
        search={false}
        pagination={{
          pageSize: 20,
          pageSizeOptions: [10, 20, 50, 100],
        }}
      />

      <Modal
        title="处理事件"
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={() => setIsModalVisible(false)}
        width={isMobile ? '100%' : 600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
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
    </>
  );
});

EventManagement.displayName = 'EventManagement';

export default EventManagement;

