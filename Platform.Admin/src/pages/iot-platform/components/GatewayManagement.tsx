import React, { useRef, useState, useCallback, useEffect } from 'react';
import { PageContainer, StatCard } from '@/components';
import { useIntl } from '@umijs/max';
import { type ProColumns, ActionType, ProTable } from '@ant-design/pro-table';
import { ModalForm, ProFormText, ProFormSelect } from '@ant-design/pro-form';
import { Button, Card, Col, Descriptions, Drawer, Form, Grid, Input, Row, Space, Tag, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CloudServerOutlined, CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { iotService, IoTGateway, GatewayStatistics, IoTDeviceStatus } from '@/services/iotService';
import { useModal } from '@/hooks/useModal';

const { useBreakpoint } = Grid;

export interface GatewayManagementRef { reload: () => void; refreshStats: () => void; handleAdd: () => void; }

const normalizeStatus = (status?: string) => (status ? (status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()) : '') as IoTDeviceStatus;
const statusMap: Record<IoTDeviceStatus, { color: string; label: string }> = { Online: { color: 'green', label: '在线' }, Offline: { color: 'default', label: '离线' }, Fault: { color: 'red', label: '故障' }, Maintenance: { color: 'orange', label: '维护中' } };
const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'PULL'];

const GatewayManagement = (props: any, ref: React.Ref<GatewayManagementRef>) => {
  const intl = useIntl();
  const { confirm } = useModal();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [form] = Form.useForm();

  const [state, setState] = useState({
    statistics: null as { total: number; online: number; offline: number; fault: number } | null,
    editingGateway: null as IoTGateway | null,
    formVisible: false,
    detailVisible: false,
    viewingGateway: null as IoTGateway | null,
    gatewayStats: null as GatewayStatistics | null,
    sorter: undefined as { sortBy: string; sortOrder: string } | undefined,
    searchText: '',
  });
  const set = (partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial }));

  const fetchStatistics = useCallback(async () => {
    try {
      const response = await iotService.getPlatformStatistics();
      if (response.success && response.data) {
        set({ statistics: { total: response.data.totalGateways || 0, online: response.data.onlineGateways || 0, offline: (response.data.totalGateways || 0) - (response.data.onlineGateways || 0), fault: 0 } });
      }
    } catch { console.error('获取统计信息失败'); }
  }, []);

  useEffect(() => { fetchStatistics(); }, [fetchStatistics]);

  const columns: ProColumns<IoTGateway>[] = [
    { title: '网关名称', dataIndex: 'title', sorter: true, render: (dom, record) => <a onClick={() => set({ viewingGateway: record, detailVisible: true })}>{dom}</a> },
    { title: '协议类型', dataIndex: 'protocolType', sorter: true },
    { title: '请求方式', dataIndex: ['config', 'httpMethod'], render: (_, record) => <Tag color="blue">{record?.config?.httpMethod || '-'}</Tag> },
    { title: '地址', dataIndex: 'address', sorter: true },
    { title: '状态', dataIndex: 'status', sorter: true, render: (dom) => { const normalized = normalizeStatus(dom); const config = statusMap[normalized] || { color: 'default', label: dom || '未知' }; return <Tag color={config.color}>{config.label}</Tag>; } },
    { title: '设备数', dataIndex: 'deviceCount', sorter: true, align: 'center' },
    { title: '启用', dataIndex: 'isEnabled', sorter: true, render: (dom) => <Tag color={dom ? 'green' : 'red'}>{dom ? '是' : '否'}</Tag> },
    { title: '操作', valueType: 'option', fixed: 'right', width: 120, render: (_, record) => [
      <Button key="edit" type="link" icon={<EditOutlined />} onClick={() => { set({ editingGateway: record, formVisible: true }); form.setFieldsValue({ ...record, config: record.config || undefined }); }}>编辑</Button>,
      <Button key="delete" type="link" danger icon={<DeleteOutlined />} onClick={() => { confirm({ title: '删除网关', content: '确定要删除此网关吗？', onOk: async () => { const res = await iotService.deleteGateway(record.id); if (res.success) { message.success('删除成功'); actionRef.current?.reload(); fetchStatistics(); } }, okButtonProps: { danger: true } }); }}>删除</Button>,
    ]},
  ];

  const handleSubmit = useCallback(async (values: any) => {
    const payload: any = { ...values, name: values.title };
    if (values.protocolType === 'HTTP') {
      payload.config = { httpMethod: values.config?.httpMethod || 'GET', urlTemplate: values.address || values.config?.urlTemplate || '' };
      if (!payload.address && payload.config.urlTemplate) payload.address = payload.config.urlTemplate;
    } else if (values.config) { payload.config = values.config; }
    const res = state.editingGateway ? await iotService.updateGateway(state.editingGateway.id, payload) : await iotService.createGateway(payload);
    if (res.success) message.success(state.editingGateway ? '更新成功' : '创建成功');
    set({ formVisible: false, editingGateway: null });
    actionRef.current?.reload();
    fetchStatistics();
  }, [state.editingGateway, fetchStatistics]);

  const handleViewDetail = useCallback(async (gateway: IoTGateway) => {
    try {
      const response = await iotService.getGatewayStatistics(gateway.gatewayId);
      if (response.success && response.data) set({ gatewayStats: response.data });
    } catch {}
  }, []);

  useEffect(() => { if (state.detailVisible && state.viewingGateway) handleViewDetail(state.viewingGateway); }, [state.detailVisible, state.viewingGateway, handleViewDetail]);

  return (
    <PageContainer title={<Space><CloudServerOutlined />网关管理</Space>}>
      {state.statistics && <Card style={{ marginBottom: 16 }}><Row gutter={[12, 12]}>
        {[{ key: 'total', title: '网关总数', icon: <CloudServerOutlined />, color: '#1890ff' },
          { key: 'online', title: '在线', icon: <CheckCircleOutlined />, color: '#52c41a' },
          { key: 'offline', title: '离线', icon: <CloseCircleOutlined />, color: '#8c8c8c' },
          { key: 'fault', title: '故障', icon: <ExclamationCircleOutlined />, color: '#ff4d4f' }
        ].map(i => <Col xs={24} sm={12} md={6} key={i.key}><StatCard title={i.title} value={state.statistics![i.key as keyof typeof state.statistics]} icon={i.icon} color={i.color} /></Col>)}
      </Row></Card>}

      <ProTable actionRef={actionRef} request={async (params: any) => {
        const { current, pageSize } = params;
        const sortParams = state.sorter?.sortBy && state.sorter?.sortOrder ? state.sorter : undefined;
        const res = await iotService.getGateways({ page: current, pageSize, search: state.searchText, ...sortParams });
        return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
      }} columns={columns} rowKey="id" search={false}
        onChange={(_p, _f, s: any) => set({ sorter: s?.order ? { sortBy: s.field, sortOrder: s.order === 'ascend' ? 'asc' : 'desc' } : undefined })}
        toolBarRender={() => [
          <Input.Search key="search" placeholder="搜索..." style={{ width: 200 }} allowClear value={state.searchText} onChange={(e) => set({ searchText: e.target.value })} onSearch={(v) => { set({ searchText: v }); actionRef.current?.reload(); }} prefix={<SearchOutlined />} />,
          <Button key="refresh" icon={<ReloadOutlined />} onClick={() => { actionRef.current?.reload(); fetchStatistics(); }}>刷新</Button>,
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => { set({ editingGateway: null, formVisible: true }); form.resetFields(); }}>新建</Button>,
        ]}
      />

      <ModalForm title={state.editingGateway ? '编辑网关' : '新建网关'} open={state.formVisible} onOpenChange={(open) => { if (!open) set({ formVisible: false, editingGateway: null }); }}
        form={form} onFinish={handleSubmit} width={isMobile ? '100%' : 600}
      >
        <ProFormText name="title" label="网关名称" rules={[{ required: true, message: '请输入网关名称' }]} placeholder="请输入网关名称" />
        <ProFormText name="description" label="描述" placeholder="请输入描述" />
        <ProFormSelect name="protocolType" label="协议类型" rules={[{ required: true, message: '请选择协议类型' }]} options={[{ label: 'MQTT', value: 'MQTT' }, { label: 'HTTP', value: 'HTTP' }, { label: 'Modbus', value: 'Modbus' }, { label: 'CoAP', value: 'CoAP' }]} placeholder="请选择协议类型" />
        <Form.Item noStyle shouldUpdate={(prev, curr) => prev.protocolType !== curr.protocolType}>
          {() => form.getFieldValue('protocolType') === 'HTTP' && (
            <ProFormSelect name={['config', 'httpMethod']} label="请求方式" rules={[{ required: true, message: '请选择请求方式' }]} initialValue="GET" options={httpMethods.map(m => ({ label: m, value: m }))} placeholder="请选择请求方式" />
          )}
        </Form.Item>
        <ProFormText name="address" label="网关地址" rules={[{ required: true, message: '请输入网关地址' }]} placeholder="请输入网关地址或IP" />
        <ProFormText name="username" label="用户名" placeholder="请输入用户名" />
        <ProFormText name="password" label="密码" placeholder="请输入密码" />
        <ProFormText name="remarks" label="备注" placeholder="请输入备注" />
      </ModalForm>

      <Drawer title="网关详情" placement="right" open={state.detailVisible} onClose={() => set({ detailVisible: false, viewingGateway: null, gatewayStats: null })} size={isMobile ? 'large' : 800}>
        {state.viewingGateway && (
          <>
            <Card title="基本信息" style={{ marginBottom: 16 }}>
              <Descriptions column={isMobile ? 1 : 2} size="small">
                <Descriptions.Item label="网关名称" span={2}>{state.viewingGateway.title}</Descriptions.Item>
                <Descriptions.Item label="网关ID">{state.viewingGateway.gatewayId}</Descriptions.Item>
                <Descriptions.Item label="状态">{(() => { const normalized = normalizeStatus(state.viewingGateway.status); const config = statusMap[normalized] || { color: 'default', label: state.viewingGateway.status || '未知' }; return <Tag color={config.color}>{config.label}</Tag>; })()}</Descriptions.Item>
                <Descriptions.Item label="协议类型">{state.viewingGateway.protocolType || '-'}</Descriptions.Item>
                <Descriptions.Item label="地址">{state.viewingGateway.address || '-'}</Descriptions.Item>
                <Descriptions.Item label="启用状态"><Tag color={state.viewingGateway.isEnabled ? 'green' : 'red'}>{state.viewingGateway.isEnabled ? '是' : '否'}</Tag></Descriptions.Item>
              </Descriptions>
            </Card>
            {state.gatewayStats && (
              <Card title="设备统计" style={{ marginBottom: 16 }}>
                <Descriptions column={isMobile ? 1 : 2} size="small">
                  <Descriptions.Item label="总数">{state.gatewayStats.totalDevices}</Descriptions.Item>
                  <Descriptions.Item label="在线"><Tag color="green">{state.gatewayStats.onlineDevices}</Tag></Descriptions.Item>
                  <Descriptions.Item label="离线"><Tag color="default">{state.gatewayStats.offlineDevices}</Tag></Descriptions.Item>
                  <Descriptions.Item label="故障"><Tag color="red">{state.gatewayStats.faultDevices}</Tag></Descriptions.Item>
                </Descriptions>
              </Card>
            )}
            <Card title="时间信息">
              <Descriptions column={isMobile ? 1 : 2} size="small">
                <Descriptions.Item label="创建时间">{state.viewingGateway.createdAt ? dayjs(state.viewingGateway.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</Descriptions.Item>
              </Descriptions>
            </Card>
          </>
        )}
      </Drawer>
    </PageContainer>
  );
};

GatewayManagement.displayName = 'GatewayManagement';

export default GatewayManagement;
