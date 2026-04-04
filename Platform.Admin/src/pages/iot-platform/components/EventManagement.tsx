import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback, useMemo, useRef as useRefHook } from 'react';
import type { ActionType, ProColumns } from '@/types/pro-components';
import { Table, type TableColumnsType } from 'antd';
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
import useCommonStyles from '@/hooks/useCommonStyles';
import SearchBar from '@/components/SearchBar';

export interface EventManagementRef {
  reload: () => void;
  refreshStats: () => void;
}

const EventManagement = forwardRef<EventManagementRef>((props, ref) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md; // md 以下为移动端
  const { styles } = useCommonStyles();
  const actionRef = useRef<ActionType>(null);
  const [dataSource, setDataSource] = useState<IoTDeviceEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<IoTDeviceEvent | null>(null);
  const [form] = Form.useForm();

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
      const response = await iotService.getUnhandledEventCount();
      if (response.success && response.data) {
        setOverviewStats({
          total: response.data.Count || 0,
          unhandled: response.data.Count || 0,
          handled: 0,
          critical: 0,
        });
      }
    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  }, []);

  // 获取事件列表
  const fetchData = useCallback(async (page?: number, pageSize?: number, sort?: Record<string, any>) => {
    const targetPage = page || pagination.page;
    const targetPageSize = pageSize || pagination.pageSize;
    const formValues = searchParamsRef.current;

    const filters: any = {
      page: targetPage,
      pageSize: targetPageSize,
    };

    if (formValues.search) {
      filters.search = formValues.search;
    }

    if (sort && Object.keys(sort).length > 0) {
      const sortBy = Object.keys(sort)[0];
      filters.sortBy = sortBy;
      filters.sortOrder = sort[sortBy] === 'ascend' ? 'asc' : 'desc';
    }

    setLoading(true);
    try {
      const response = await iotService.queryEvents(filters);
      if (response.success && response.data) {
        setDataSource(response.data.queryable || []);
        setPagination(prev => ({
          ...prev,
          page: targetPage,
          pageSize: targetPageSize,
          total: response.data.rowCount || 0,
        }));
      }
    } catch (error) {
      console.error('加载事件列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize]);

  const loadDevices = useCallback(async () => {
    try {
      const response = await iotService.getDevices(undefined, 1, 1000);
      if (response.success && response.data) {
        setDevices(response.data.queryable || []);
      } else {
        setDevices([]);
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
      setDevices([]);
    }
  }, []);

  // 初始化
  useEffect(() => {
    loadDevices();
    fetchOverviewStats();
    fetchData();
  }, [loadDevices, fetchOverviewStats, fetchData]);

  // 表格分页和排序处理
  const handleTableChange = useCallback((pag: any, _filters: any, sorter: any) => {
    const newPage = pag.current;
    const newPageSize = pag.pageSize;
    const sortBy = sorter?.field;
    const sortOrder = sorter?.order === 'ascend' ? 'asc' : sorter?.order === 'descend' ? 'desc' : undefined;
    
    const sortParams = sortBy ? { [sortBy]: sortOrder } : {};
    fetchData(newPage, newPageSize, sortParams);
  }, [fetchData]);

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    reload: () => fetchData(),
    refreshStats: () => fetchOverviewStats(),
  }), [fetchData, fetchOverviewStats]);

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
        fetchData();
        fetchOverviewStats();
      }
    } catch (error) {
      message.error('处理失败');
    }
  }, [selectedEvent, fetchData, fetchOverviewStats]);

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
      sorter: true,
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
      sorter: true,
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      sorter: true,
      render: (level: string) => getLevelTag(level),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true,
      sorter: true,
    },
    {
      title: '发生时间',
      dataIndex: 'occurredAt',
      key: 'occurredAt',
      width: 180,
      sorter: true,
      render: (time: string) => {
        if (!time) return '-';
        try {
          const date = dayjs(time);
          if (!date.isValid()) return time;
          return date.format('YYYY-MM-DD HH:mm:ss');
        } catch (error) {
          console.error('日期格式化错误:', error, time);
          return time;
        }
      },
    },
    {
      title: '状态',
      dataIndex: 'isHandled',
      key: 'isHandled',
      width: 100,
      sorter: true,
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
      <Card className={styles.card} style={{ marginBottom: 16 }}>
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

      {/* 搜索 */}
      <SearchBar
        initialParams={searchParamsRef.current}
        onSearch={(params) => {
          searchParamsRef.current = params;
          fetchData(1);
          fetchOverviewStats();
        }}
        style={{ marginBottom: 16 }}
      />

      {/* 事件列表表格 */}
      <Table<IoTDeviceEvent>
        columns={columns}
        dataSource={dataSource}
        rowKey="id"
        loading={loading}
        scroll={{ x: 'max-content' }}
        onChange={handleTableChange}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          pageSizeOptions: [10, 20, 50, 100],
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
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
                  {dayjs(selectedEvent.occurredAt).format('YYYY-MM-DD HH:mm:ss')}
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

