import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback, useMemo } from 'react';
import { Table, type TableColumnsType, Button, Modal, Form, Input, Space, message, Tag, Card, Row, Col, Grid } from 'antd';
import { CheckOutlined, AlertOutlined, CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { iotService, IoTDeviceEvent, IoTDevice } from '@/services/iotService';
import dayjs from 'dayjs';
import { StatCard } from '@/components';
import useCommonStyles from '@/hooks/useCommonStyles';
import SearchBar from '@/components/SearchBar';
import type { PageParams } from '@/types/api-response';
import { useIotTable } from '../hooks/useIotTable';

const { useBreakpoint } = Grid;

export interface EventManagementRef { reload: () => void; refreshStats: () => void; }

const LEVEL_MAP: Record<string, { color: string; label: string }> = { Info: { color: 'blue', label: '信息' }, Warning: { color: 'orange', label: '警告' }, Error: { color: 'red', label: '错误' }, Critical: { color: 'red', label: '严重' } };

const EventManagement = forwardRef<EventManagementRef>((props, ref) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { styles } = useCommonStyles();
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<IoTDeviceEvent | null>(null);
  const [form] = Form.useForm();
  const [overviewStats, setOverviewStats] = useState({ total: 0, unhandled: 0, handled: 0, critical: 0 });

  const { data, loading, pagination, searchParamsRef, fetchData, handleSearch, handleTableChange } =
    useIotTable<IoTDeviceEvent>(params => iotService.queryEvents(params));

  const fetchOverviewStats = useCallback(async () => {
    try {
      const response = await iotService.getUnhandledEventCount();
      if (response.success && response.data) setOverviewStats(prev => ({ ...prev, unhandled: response.data.Count || 0 }));
    } catch (error) { console.error('获取统计信息失败:', error); }
  }, []);

  const loadDevices = useCallback(async () => {
    try {
      const response = await iotService.getDevices({ page: 1, pageSize: 1000 });
      setDevices(response.success && response.data ? response.data.queryable || [] : []);
    } catch { setDevices([]); }
  }, []);

  useEffect(() => { loadDevices(); fetchData(); fetchOverviewStats(); }, [loadDevices, fetchData, fetchOverviewStats]);

  useImperativeHandle(ref, () => ({ reload: () => { fetchData(); fetchOverviewStats(); }, refreshStats: () => fetchOverviewStats() }), [fetchData, fetchOverviewStats]);

  const handleHandle = useCallback((event: IoTDeviceEvent) => { setSelectedEvent(event); form.resetFields(); setIsModalVisible(true); }, [form]);

  const handleSubmit = useCallback(async (values: any) => {
    if (!selectedEvent) return;
    try {
      const response = await iotService.handleEvent(selectedEvent.id, values.remarks || '');
      if (response.success) { message.success('事件已处理'); setIsModalVisible(false); setSelectedEvent(null); form.resetFields(); fetchData(); fetchOverviewStats(); }
    } catch { message.error('处理失败'); }
  }, [selectedEvent, fetchData, fetchOverviewStats]);

  const getLevelTag = useCallback((level: string) => {
    const config = LEVEL_MAP[level] || { color: 'default', label: level };
    return <Tag color={config.color}>{config.label}</Tag>;
  }, []);

  const columns: TableColumnsType<IoTDeviceEvent> = useMemo(() => [
    { title: '所属设备', dataIndex: 'deviceId', key: 'deviceId', width: 150, sorter: true, render: (deviceId: string) => devices.find(d => d.deviceId === deviceId)?.title || deviceId },
    { title: '事件类型', dataIndex: 'eventType', key: 'eventType', width: 120, sorter: true },
    { title: '级别', dataIndex: 'level', key: 'level', width: 100, sorter: true, render: (level: string) => getLevelTag(level) },
    { title: '描述', dataIndex: 'description', key: 'description', width: 200, ellipsis: true, sorter: true },
    {
      title: '发生时间', dataIndex: 'occurredAt', key: 'occurredAt', width: 180, sorter: true,
      render: (time: string) => { if (!time) return '-'; try { const date = dayjs(time); return date.isValid() ? date.format('YYYY-MM-DD HH:mm:ss') : time; } catch { return time; } },
    },
    { title: '状态', dataIndex: 'isHandled', key: 'isHandled', width: 100, sorter: true, render: (isHandled: boolean) => <Tag color={isHandled ? 'green' : 'red'}>{isHandled ? '已处理' : '未处理'}</Tag> },
    {
      title: '操作', key: 'action', width: 150, fixed: 'right',
      render: (_: any, record: IoTDeviceEvent) => !record.isHandled ? <Button type="link" size="small" icon={<CheckOutlined />} onClick={() => handleHandle(record)}>处理</Button> : null,
    },
  ], [handleHandle, getLevelTag, devices]);

  return (
    <>
      <Card className={styles.card} style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={6}><StatCard title="事件总数" value={overviewStats.total} icon={<AlertOutlined />} color="#1890ff" /></Col>
          <Col xs={24} sm={12} md={6}><StatCard title="未处理" value={overviewStats.unhandled} icon={<CloseCircleOutlined />} color="#ff4d4f" /></Col>
          <Col xs={24} sm={12} md={6}><StatCard title="已处理" value={overviewStats.handled} icon={<CheckCircleOutlined />} color="#52c41a" /></Col>
          <Col xs={24} sm={12} md={6}><StatCard title="严重事件" value={overviewStats.critical} icon={<ExclamationCircleOutlined />} color="#ff4d4f" /></Col>
        </Row>
      </Card>
      <SearchBar initialParams={searchParamsRef.current} onSearch={handleSearch} style={{ marginBottom: 16 }} />
      <Table<IoTDeviceEvent> columns={columns} dataSource={data} rowKey="id" loading={loading} scroll={{ x: 'max-content' }} onChange={handleTableChange} pagination={{ current: pagination.page, pageSize: pagination.pageSize, total: pagination.total }} />
      <Modal title="处理事件" open={isModalVisible} onOk={() => form.submit()} onCancel={() => { setIsModalVisible(false); setSelectedEvent(null); form.resetFields(); }} width={isMobile ? '100%' : 600}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {selectedEvent && (
            <>
              <div style={{ marginBottom: 16 }}><div style={{ color: '#666', marginBottom: 4 }}>事件类型</div><div style={{ fontSize: 14 }}>{selectedEvent.eventType}</div></div>
              <div style={{ marginBottom: 16 }}><div style={{ color: '#666', marginBottom: 4 }}>事件描述</div><div style={{ fontSize: 14 }}>{selectedEvent.description}</div></div>
              <div style={{ marginBottom: 16 }}><div style={{ color: '#666', marginBottom: 4 }}>发生时间</div><div style={{ fontSize: 14 }}>{dayjs(selectedEvent.occurredAt).format('YYYY-MM-DD HH:mm:ss')}</div></div>
            </>
          )}
          <Form.Item label="处理备注" name="remarks" rules={[{ required: true, message: '请输入处理备注' }]}><Input.TextArea placeholder="请输入处理备注" rows={4} /></Form.Item>
        </Form>
      </Modal>
    </>
  );
});

EventManagement.displayName = 'EventManagement';

export default EventManagement;
