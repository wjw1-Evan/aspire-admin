import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback, useMemo } from 'react';
import { useIntl } from '@umijs/max';
import { Table, Typography, Grid, type TableColumnsType, Button, Modal, Form, Input, InputNumber, Select, Space, App, Drawer, Tag, Card, Row, Col, Descriptions, Switch } from 'antd';
import dayjs from 'dayjs';
import { PlusOutlined, EditOutlined, DeleteOutlined, DatabaseOutlined, CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { iotService, IoTDataPoint, IoTDevice } from '@/services/iotService';
import { StatCard } from '@/components';
import useCommonStyles from '@/hooks/useCommonStyles';
import SearchBar from '@/components/SearchBar';
import type { PageParams } from '@/types';
import { useIotTable } from '../hooks/useIotTable';

const { Paragraph } = Typography;
const { useBreakpoint } = Grid;

export interface DataPointManagementRef {
  reload: () => void;
  refreshStats: () => void;
  handleAdd: () => void;
}

const DATA_TYPE_OPTIONS = [
  { label: '数值', value: 'Numeric' },
  { label: '布尔', value: 'Boolean' },
  { label: '字符串', value: 'String' },
  { label: '枚举', value: 'Enum' },
  { label: 'JSON', value: 'Json' },
];

const DATA_TYPE_LABELS: Record<string, string> = { Numeric: '数值', Boolean: '布尔', String: '字符串', Enum: '枚举', Json: 'JSON' };

const DataPointManagement = forwardRef<DataPointManagementRef>((props, ref) => {
  const intl = useIntl();
  const { message, modal } = App.useApp();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { styles } = useCommonStyles();
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [selectedDataPoint, setSelectedDataPoint] = useState<IoTDataPoint | null>(null);
  const [form] = Form.useForm();
  const [overviewStats, setOverviewStats] = useState({ total: 0, enabled: 0, disabled: 0, withAlarm: 0 });

  const { data, loading, pagination, searchParamsRef, fetchData, handleSearch, handleTableChange } =
    useIotTable<IoTDataPoint>(iotService.getDataPoints);

  const fetchOverviewStats = useCallback(async () => {
    try {
      const response = await iotService.getDataPoints({});
      if (response.success && response.data) {
        setOverviewStats(prev => ({ ...prev, total: response.data?.rowCount || 0 }));
      }
    } catch (error) { console.error('获取统计信息失败:', error); }
  }, []);

  const loadDevices = useCallback(async () => {
    try {
      const response = await iotService.getDevices({});
      setDevices(response.success && response.data ? response.data.queryable || [] : []);
    } catch { setDevices([]); }
  }, []);

  useEffect(() => { loadDevices(); fetchOverviewStats(); }, [loadDevices, fetchOverviewStats]);

  useEffect(() => {
    fetchData();
  }, []);

  useImperativeHandle(ref, () => ({ reload: () => fetchData(), refreshStats: () => fetchOverviewStats(), handleAdd: () => handleAdd() }), [fetchData, fetchOverviewStats]);

  const handleAdd = useCallback(() => { form.resetFields(); setSelectedDataPoint(null); setIsModalVisible(true); }, [form]);

  const handleEdit = useCallback((dataPoint: IoTDataPoint) => { setSelectedDataPoint(dataPoint); form.setFieldsValue(dataPoint); setIsModalVisible(true); }, [form]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const response = await iotService.deleteDataPoint(id);
      if (response.success) { message.success('删除成功'); fetchData(); fetchOverviewStats(); }
      else { message.error((response as any).message || '删除失败'); }
    } catch (error: any) { message.error(error?.message || '删除失败'); }
  }, [fetchData, fetchOverviewStats]);

  const handleSubmit = useCallback(async (values: any) => {
    try {
      const response = selectedDataPoint
        ? await iotService.updateDataPoint(selectedDataPoint.id, values)
        : await iotService.createDataPoint(values);
      if (response.success) { message.success(selectedDataPoint ? '更新成功' : '创建成功'); setIsModalVisible(false); fetchData(); fetchOverviewStats(); }
      else { message.error((response as any).message || '操作失败'); }
    } catch (error: any) { message.error(error?.message || '操作失败'); }
  }, [selectedDataPoint, fetchData, fetchOverviewStats]);

  const columns: TableColumnsType<IoTDataPoint> = useMemo(() => [
    {
      title: '数据点名称', dataIndex: 'title', key: 'title', width: 150, ellipsis: true, sorter: true,
      render: (text, record) => <a onClick={() => { setSelectedDataPoint(record); setIsDetailDrawerVisible(true); }}>{text}</a>,
    },
    {
      title: '所属设备', dataIndex: 'deviceId', key: 'deviceId', width: 150, sorter: true,
      render: (deviceId: string) => devices.find(d => d.deviceId === deviceId)?.title || deviceId,
    },
    { title: '数据类型', dataIndex: 'dataType', key: 'dataType', width: 100, sorter: true, render: (type: string) => DATA_TYPE_LABELS[type] || type },
    { title: '单位', dataIndex: 'unit', key: 'unit', width: 80, sorter: true },
    { title: '采样间隔(秒)', dataIndex: 'samplingInterval', key: 'samplingInterval', width: 120, sorter: true },
    {
      title: '最后采集值', dataIndex: 'lastValue', key: 'lastValue', width: 150, sorter: true,
      render: (value: string, record: IoTDataPoint) => {
        if (!value) return <span style={{ color: '#999' }}>暂无数据</span>;
        if (record.dataType?.toLowerCase() === 'json') {
          try { const parsed = JSON.parse(value); return <span title={value} style={{ fontFamily: 'monospace', fontSize: '12px' }}>{JSON.stringify(parsed).substring(0, 50)}{value.length > 50 ? '...' : ''}</span>; }
          catch { return <span title={value}>{value.substring(0, 30)}{value.length > 30 ? '...' : ''}</span>; }
        }
        return <span title={value}>{value}{record.unit && <span style={{ color: '#999', marginLeft: 4 }}>{record.unit}</span>}</span>;
      },
    },
    {
      title: '最后采集时间', dataIndex: 'lastUpdatedAt', key: 'lastUpdatedAt', width: 180, sorter: true,
      render: (time: string) => {
        if (!time) return <span style={{ color: '#999' }}>暂无</span>;
        const date = new Date(time);
        const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        const timeAgo = diffMins < 1 ? '刚刚' : diffMins < 60 ? `${diffMins}分钟前` : diffHours < 24 ? `${diffHours}小时前` : diffDays < 7 ? `${diffDays}天前` : '';
        return <div><div>{dayjs(date).format('YYYY-MM-DD HH:mm:ss')}</div>{timeAgo && <div style={{ fontSize: '12px', color: '#999', marginTop: 2 }}>{timeAgo}</div>}</div>;
      },
    },
    {
      title: '告警配置', dataIndex: 'alarmConfig', key: 'alarmConfig', width: 100, sorter: true,
      render: (alarmConfig: any) => alarmConfig?.isEnabled ? <Tag color="orange">已配置</Tag> : <Tag color="default">未配置</Tag>,
    },
    {
      title: '启用状态', dataIndex: 'isEnabled', key: 'isEnabled', width: 100, sorter: true,
      render: (value: boolean) => <Tag color={value ? 'success' : 'default'}>{value ? '启用' : '禁用'}</Tag>,
    },
    {
      title: '操作', key: 'action', width: 150, fixed: 'right',
      render: (_: any, record: IoTDataPoint) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => { modal.confirm({ title: '删除数据点', content: '确定要删除此数据点吗？', onOk: () => handleDelete(record.id), okButtonProps: { danger: true } }); }}>删除</Button>
        </Space>
      ),
    },
  ], [devices, handleEdit, handleDelete]);

  const renderJsonField = useCallback((value: string, unit?: string) => {
    if (value?.toLowerCase() === 'json') {
      try { const parsed = JSON.parse(value); return <Paragraph copyable={{ text: value }} style={{ width: '100%', maxHeight: 400, overflow: 'auto', fontFamily: 'monospace', whiteSpace: 'pre-wrap', marginBottom: 0 }}>{JSON.stringify(parsed, null, 2)}</Paragraph>; }
      catch { return <div style={{ wordBreak: 'break-all', color: '#ff4d4f' }}>{value}<div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>(JSON 解析失败)</div></div>; }
    }
    return <div>{value}{unit && <span style={{ color: '#999', marginLeft: 4 }}>{unit}</span>}</div>;
  }, []);

  return (
    <>
      <Card className={styles.card} style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={6}><StatCard title={intl.formatMessage({ id: 'pages.iotPlatform.status.totalDatapoints' })} value={overviewStats.total} icon={<DatabaseOutlined />} color="#1890ff" /></Col>
          <Col xs={24} sm={12} md={6}><StatCard title={intl.formatMessage({ id: 'pages.table.activated' })} value={overviewStats.enabled} icon={<CheckCircleOutlined />} color="#52c41a" /></Col>
          <Col xs={24} sm={12} md={6}><StatCard title={intl.formatMessage({ id: 'pages.table.deactivated' })} value={overviewStats.disabled} icon={<CloseCircleOutlined />} color="#8c8c8c" /></Col>
          <Col xs={24} sm={12} md={6}><StatCard title={intl.formatMessage({ id: 'pages.iotPlatform.status.withAlarm' })} value={overviewStats.withAlarm} icon={<ExclamationCircleOutlined />} color="#faad14" /></Col>
        </Row>
      </Card>
      <SearchBar initialParams={searchParamsRef.current} onSearch={handleSearch} style={{ marginBottom: 16 }} />
      <Table<IoTDataPoint> columns={columns} dataSource={data} rowKey="id" loading={loading} scroll={{ x: 'max-content' }} onChange={handleTableChange} pagination={{ current: pagination.page, pageSize: pagination.pageSize, total: pagination.total }} />

      <Modal title={selectedDataPoint ? '编辑数据点' : '新建数据点'} open={isModalVisible} onOk={() => form.submit()} onCancel={() => { setIsModalVisible(false); setSelectedDataPoint(null); form.resetFields(); }} width={isMobile ? '100%' : 700}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="数据点名称" name="name" rules={[{ required: true, message: '请输入数据点名称' }]}><Input placeholder="请输入数据点名称" /></Form.Item>
          <Form.Item label="数据点标题" name="title" rules={[{ required: true, message: '请输入数据点标题' }]}><Input placeholder="请输入数据点标题" /></Form.Item>
          <Form.Item label="所属设备" name="deviceId" rules={[{ required: true, message: '请选择所属设备' }]}><Select placeholder="请选择所属设备">{devices.map(d => <Select.Option key={d.deviceId} value={d.deviceId}>{d.title}</Select.Option>)}</Select></Form.Item>
          <Form.Item label="数据类型" name="dataType" rules={[{ required: true, message: '请选择数据类型' }]}><Select placeholder="请选择数据类型" options={DATA_TYPE_OPTIONS} /></Form.Item>
          <Form.Item label="单位" name="unit"><Input placeholder="请输入单位" /></Form.Item>
          <Form.Item label="最小值" name="minValue"><InputNumber placeholder="请输入最小值" /></Form.Item>
          <Form.Item label="最大值" name="maxValue"><InputNumber placeholder="请输入最大值" /></Form.Item>
          <Form.Item label="精度" name="precision" initialValue={2}><InputNumber placeholder="请输入精度" min={0} max={10} /></Form.Item>
          <Form.Item label="采样间隔(秒)" name="samplingInterval" initialValue={60}><InputNumber placeholder="请输入采样间隔" min={1} /></Form.Item>
          <Form.Item label="只读" name="isReadOnly" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
          <Form.Item label="启用" name="isEnabled" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
          <Form.Item label="描述" name="description"><Input.TextArea placeholder="请输入描述" rows={2} /></Form.Item>
          <Form.Item label="备注" name="remarks"><Input.TextArea placeholder="请输入备注" rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Drawer title="数据点详情" placement="right" onClose={() => { setIsDetailDrawerVisible(false); setSelectedDataPoint(null); }} open={isDetailDrawerVisible} size={isMobile ? 'large' : 800}>
        {selectedDataPoint ? (
          <>
            <Card title="基本信息" className={styles.card} style={{ marginBottom: 16 }}>
              <Descriptions column={isMobile ? 1 : 2} size="small">
                <Descriptions.Item label="数据点名称" span={2}>{selectedDataPoint.title}</Descriptions.Item>
                <Descriptions.Item label="数据点ID">{selectedDataPoint.dataPointId}</Descriptions.Item>
                <Descriptions.Item label="所属设备">{devices.find(d => d.deviceId === selectedDataPoint.deviceId)?.title || selectedDataPoint.deviceId || '-'}</Descriptions.Item>
                <Descriptions.Item label="数据类型"><Tag>{DATA_TYPE_LABELS[selectedDataPoint.dataType] || selectedDataPoint.dataType}</Tag></Descriptions.Item>
                <Descriptions.Item label="单位">{selectedDataPoint.unit || '-'}</Descriptions.Item>
                <Descriptions.Item label="采样间隔">{selectedDataPoint.samplingInterval} 秒</Descriptions.Item>
                <Descriptions.Item label="只读"><Tag color={selectedDataPoint.isReadOnly ? 'orange' : 'green'}>{selectedDataPoint.isReadOnly ? '是' : '否'}</Tag></Descriptions.Item>
                <Descriptions.Item label="启用状态"><Tag color={selectedDataPoint.isEnabled ? 'green' : 'red'}>{selectedDataPoint.isEnabled ? '启用' : '禁用'}</Tag></Descriptions.Item>
              </Descriptions>
            </Card>
            {(selectedDataPoint.minValue !== undefined || selectedDataPoint.maxValue !== undefined) && (
              <Card title="数值范围" className={styles.card} style={{ marginBottom: 16 }}>
                <Descriptions column={isMobile ? 1 : 2} size="small">
                  <Descriptions.Item label="最小值">{selectedDataPoint.minValue !== undefined ? selectedDataPoint.minValue : '-'}</Descriptions.Item>
                  <Descriptions.Item label="最大值">{selectedDataPoint.maxValue !== undefined ? selectedDataPoint.maxValue : '-'}</Descriptions.Item>
                </Descriptions>
              </Card>
            )}
            {selectedDataPoint.alarmConfig?.isEnabled && (
              <Card title="告警配置" className={styles.card} style={{ marginBottom: 16 }}>
                <Descriptions column={isMobile ? 1 : 2} size="small">
                  <Descriptions.Item label="告警状态"><Tag color="orange">已启用</Tag></Descriptions.Item>
                  <Descriptions.Item label="告警类型">{selectedDataPoint.alarmConfig.alarmType || '-'}</Descriptions.Item>
                  <Descriptions.Item label="阈值">{selectedDataPoint.alarmConfig.threshold || '-'}</Descriptions.Item>
                  <Descriptions.Item label="级别">{selectedDataPoint.alarmConfig.level || '-'}</Descriptions.Item>
                </Descriptions>
              </Card>
            )}
            <Card title="最后采集数据" className={styles.card} style={{ marginBottom: 16 }}>
              {selectedDataPoint.lastValue ? (
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="数据值">{renderJsonField(selectedDataPoint.lastValue, selectedDataPoint.unit)}</Descriptions.Item>
                  {selectedDataPoint.lastUpdatedAt && <Descriptions.Item label="采集时间">{dayjs(selectedDataPoint.lastUpdatedAt).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>}
                </Descriptions>
              ) : <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>暂无采集数据</div>}
            </Card>
            <Card title="时间信息" className={styles.card} style={{ marginBottom: 16 }}>
              <Descriptions column={isMobile ? 1 : 2} size="small">
                <Descriptions.Item label="创建时间">{dayjs(selectedDataPoint.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
              </Descriptions>
            </Card>
          </>
        ) : <div>未加载数据点信息</div>}
      </Drawer>
    </>
  );
});

DataPointManagement.displayName = 'DataPointManagement';

export default DataPointManagement;
