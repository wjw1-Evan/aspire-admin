import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback, useMemo } from 'react';
import { useIntl } from '@umijs/max';
import { type TableColumnsType, Table, Button, Modal, Form, Input, Select, Space, message, Drawer, Tag, Card, Row, Col, Descriptions, Grid } from 'antd';
import type { PageParams } from '@/types';
import dayjs from 'dayjs';
import { PlusOutlined, EditOutlined, DeleteOutlined, CloudServerOutlined, CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { iotService, IoTGateway, GatewayStatistics, IoTDeviceStatus } from '@/services/iotService';
import { StatCard } from '@/components';
import useCommonStyles from '@/hooks/useCommonStyles';
import SearchBar from '@/components/SearchBar';
import { useModal } from '@/hooks/useModal';
import { useIotTable } from '../hooks/useIotTable';

const { useBreakpoint } = Grid;

export interface GatewayManagementRef { reload: () => void; refreshStats: () => void; handleAdd: () => void; }

const normalizeStatus = (status?: string) => (status ? (status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()) : '') as IoTDeviceStatus;
const statusMap: Record<IoTDeviceStatus, { color: string; label: string }> = { Online: { color: 'green', label: '在线' }, Offline: { color: 'default', label: '离线' }, Fault: { color: 'red', label: '故障' }, Maintenance: { color: 'orange', label: '维护中' } };
const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'PULL'];

const GatewayManagement = forwardRef<GatewayManagementRef>((props, ref) => {
  const intl = useIntl();
  const { confirm } = useModal();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { styles } = useCommonStyles();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<IoTGateway | null>(null);
  const [statistics, setStatistics] = useState<GatewayStatistics | null>(null);
  const [form] = Form.useForm();
  const [overviewStats, setOverviewStats] = useState({ total: 0, online: 0, offline: 0, fault: 0 });

  const { data, loading, pagination, searchParamsRef, fetchData, handleSearch, handleTableChange } =
    useIotTable<IoTGateway>(params => iotService.getGateways(params));

  const fetchOverviewStats = useCallback(async () => {
    try {
      const response = await iotService.getPlatformStatistics();
      if (response.success && response.data) {
        setOverviewStats({ total: response.data.totalGateways || 0, online: response.data.onlineGateways || 0, offline: (response.data.totalGateways || 0) - (response.data.onlineGateways || 0), fault: 0 });
      }
    } catch (error) { console.error('获取统计信息失败:', error); }
  }, []);

  useEffect(() => { fetchOverviewStats(); fetchData(); }, [fetchOverviewStats, fetchData]);

  useImperativeHandle(ref, () => ({ reload: () => fetchData(), refreshStats: () => fetchOverviewStats(), handleAdd: () => handleAdd() }), [fetchData, fetchOverviewStats]);

  const handleAdd = useCallback(() => { form.resetFields(); setSelectedGateway(null); setIsModalVisible(true); }, [form]);

  const handleEdit = useCallback((gateway: IoTGateway) => {
    setSelectedGateway(gateway);
    form.setFieldsValue({ ...gateway, config: gateway.config || undefined });
    setIsModalVisible(true);
  }, [form]);

  const handleView = useCallback(async (gateway: IoTGateway) => {
    setSelectedGateway(gateway);
    try { const response = await iotService.getGatewayStatistics(gateway.gatewayId); if (response.success && response.data) setStatistics(response.data); } catch { console.error('Failed to load statistics'); }
    setIsDetailDrawerVisible(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    try { const response = await iotService.deleteGateway(id); if (response.success) { message.success('删除成功'); fetchData(); fetchOverviewStats(); } }
    catch { message.error('删除失败'); }
  }, [fetchData, fetchOverviewStats]);

  const handleSubmit = useCallback(async (values: any) => {
    const payload: any = { ...values, name: values.title };
    if (values.protocolType === 'HTTP') {
      payload.config = { httpMethod: values.config?.httpMethod || 'GET', urlTemplate: values.address || values.config?.urlTemplate || '' };
      if (!payload.address && payload.config.urlTemplate) payload.address = payload.config.urlTemplate;
    } else if (values.config) { payload.config = values.config; }
    try {
      const response = selectedGateway ? await iotService.updateGateway(selectedGateway.id, payload) : await iotService.createGateway(payload);
      if (response.success) message.success(selectedGateway ? '更新成功' : '创建成功');
      handleCloseModal(); fetchData(); fetchOverviewStats();
    } catch { message.error('操作失败'); }
  }, [selectedGateway, fetchData, fetchOverviewStats]);

  const getStatusTag = useCallback((status: string) => {
    const normalized = normalizeStatus(status);
    const config = statusMap[normalized] || { color: 'default', label: status || '未知' };
    return <Tag color={config.color}>{config.label}</Tag>;
  }, []);

  const columns: TableColumnsType<IoTGateway> = useMemo(() => [
    { title: '网关名称', dataIndex: 'title', key: 'title', width: 150, sorter: true, render: (text, record) => <a onClick={() => handleView(record)}>{text}</a> },
    { title: '协议类型', dataIndex: 'protocolType', key: 'protocolType', width: 100, sorter: true },
    { title: '请求方式', dataIndex: ['config', 'httpMethod'], key: 'httpMethod', width: 110, render: (_, record) => <Tag color="blue">{record?.config?.httpMethod || '-'}</Tag> },
    { title: '地址', dataIndex: 'address', key: 'address', width: 150, sorter: true },
    { title: '状态', dataIndex: 'status', key: 'status', width: 100, sorter: true, render: (status: string) => getStatusTag(status) },
    { title: '设备数', dataIndex: 'deviceCount', key: 'deviceCount', width: 80, align: 'center', sorter: true },
    { title: '启用', dataIndex: 'isEnabled', key: 'isEnabled', width: 80, sorter: true, render: (isEnabled: boolean) => <Tag color={isEnabled ? 'green' : 'red'}>{isEnabled ? '是' : '否'}</Tag> },
    {
      title: '操作', key: 'action', width: 150, fixed: 'right',
      render: (_: any, record: IoTGateway) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => { confirm({ title: '删除网关', content: '确定要删除此网关吗？', onOk: () => handleDelete(record.id), okButtonProps: { danger: true } }); }}>删除</Button>
        </Space>
      ),
    },
  ], [handleView, handleEdit, handleDelete, getStatusTag]);

  const handleCloseModal = useCallback(() => { setIsModalVisible(false); setSelectedGateway(null); form.resetFields(); }, [form]);

  return (
    <>
      <Card className={styles.card} style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={6}><StatCard title="网关总数" value={overviewStats.total} icon={<CloudServerOutlined />} color="#1890ff" /></Col>
          <Col xs={24} sm={12} md={6}><StatCard title={intl.formatMessage({ id: 'pages.iotPlatform.status.onlineGateways' })} value={overviewStats.online} icon={<CheckCircleOutlined />} color="#52c41a" /></Col>
          <Col xs={24} sm={12} md={6}><StatCard title={intl.formatMessage({ id: 'pages.iotPlatform.status.offlineGateways' })} value={overviewStats.offline} icon={<CloseCircleOutlined />} color="#8c8c8c" /></Col>
          <Col xs={24} sm={12} md={6}><StatCard title={intl.formatMessage({ id: 'pages.iotPlatform.status.faultGateways' })} value={overviewStats.fault} icon={<ExclamationCircleOutlined />} color="#ff4d4f" /></Col>
        </Row>
      </Card>
      <SearchBar initialParams={searchParamsRef.current} onSearch={handleSearch} style={{ marginBottom: 16 }} />
      <Table<IoTGateway> columns={columns} dataSource={data} rowKey="id" loading={loading} scroll={{ x: 'max-content' }} onChange={handleTableChange} pagination={{ current: pagination.page, pageSize: pagination.pageSize, total: pagination.total }} />

      <Modal title={selectedGateway ? '编辑网关' : '新建网关'} open={isModalVisible} onOk={() => form.submit()} onCancel={handleCloseModal} width={isMobile ? '100%' : 600}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="网关名称" name="title" rules={[{ required: true, message: '请输入网关名称' }]}><Input placeholder="请输入网关名称" /></Form.Item>
          <Form.Item label="描述" name="description"><Input.TextArea placeholder="请输入描述" rows={3} /></Form.Item>
          <Form.Item label="协议类型" name="protocolType" rules={[{ required: true, message: '请选择协议类型' }]}><Select placeholder="请选择协议类型"><Select.Option value="MQTT">MQTT</Select.Option><Select.Option value="HTTP">HTTP</Select.Option><Select.Option value="Modbus">Modbus</Select.Option><Select.Option value="CoAP">CoAP</Select.Option></Select></Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.protocolType !== curr.protocolType}>
            {({ getFieldValue }) => getFieldValue('protocolType') === 'HTTP' ? (
              <Form.Item label="请求方式" name={['config', 'httpMethod']} rules={[{ required: true, message: '请选择请求方式' }]} initialValue="GET">
                <Select placeholder="请选择请求方式">{httpMethods.map(m => <Select.Option key={m} value={m}>{m}</Select.Option>)}</Select>
              </Form.Item>
            ) : null}
          </Form.Item>
          <Form.Item label="网关地址" name="address" rules={[{ required: true, message: '请输入网关地址' }]}><Input placeholder="请输入网关地址或IP" /></Form.Item>
          <Form.Item label="用户名" name="username"><Input placeholder="请输入用户名" /></Form.Item>
          <Form.Item label="密码" name="password"><Input.Password placeholder="请输入密码" /></Form.Item>
          <Form.Item label="备注" name="remarks"><Input.TextArea placeholder="请输入备注" rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Drawer title="网关详情" placement="right" onClose={() => { setIsDetailDrawerVisible(false); setSelectedGateway(null); setStatistics(null); }} open={isDetailDrawerVisible} size={isMobile ? 'large' : 800}>
        {selectedGateway ? (
          <>
            <Card title="基本信息" className={styles.card} style={{ marginBottom: 16 }}>
              <Descriptions column={isMobile ? 1 : 2} size="small">
                <Descriptions.Item label="网关名称" span={2}>{selectedGateway.title}</Descriptions.Item>
                <Descriptions.Item label="网关ID">{selectedGateway.gatewayId}</Descriptions.Item>
                <Descriptions.Item label="状态">{getStatusTag(selectedGateway.status)}</Descriptions.Item>
                <Descriptions.Item label="协议类型">{selectedGateway.protocolType || '-'}</Descriptions.Item>
                <Descriptions.Item label="地址">{selectedGateway.address || '-'}</Descriptions.Item>
                <Descriptions.Item label="启用状态"><Tag color={selectedGateway.isEnabled ? 'green' : 'red'}>{selectedGateway.isEnabled ? '是' : '否'}</Tag></Descriptions.Item>
              </Descriptions>
            </Card>
            {statistics && (
              <Card title="设备统计" className={styles.card} style={{ marginBottom: 16 }}>
                <Descriptions column={isMobile ? 1 : 2} size="small">
                  <Descriptions.Item label="总数">{statistics.totalDevices}</Descriptions.Item>
                  <Descriptions.Item label="在线"><Tag color="green">{statistics.onlineDevices}</Tag></Descriptions.Item>
                  <Descriptions.Item label="离线"><Tag color="default">{statistics.offlineDevices}</Tag></Descriptions.Item>
                  <Descriptions.Item label="故障"><Tag color="red">{statistics.faultDevices}</Tag></Descriptions.Item>
                </Descriptions>
              </Card>
            )}
            <Card title="时间信息" className={styles.card} style={{ marginBottom: 16 }}>
              <Descriptions column={isMobile ? 1 : 2} size="small">
                <Descriptions.Item label="创建时间">{dayjs(selectedGateway.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
              </Descriptions>
            </Card>
          </>
        ) : <div>未加载网关信息</div>}
      </Drawer>
    </>
  );
});

GatewayManagement.displayName = 'GatewayManagement';

export default GatewayManagement;
