import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useIntl } from '@umijs/max';
import { type ProColumns, ActionType, ProTable } from '@ant-design/pro-table';
import { ModalForm, ProFormText, ProFormSelect } from '@ant-design/pro-components';
import { Button, Col, Form, Grid, Input, Row, Space, Tag, message, Popconfirm } from 'antd';
import { ProForm } from '@ant-design/pro-components';
import { Drawer } from 'antd';
import { ProCard, ProDescriptions } from '@ant-design/pro-components';
import { PlusOutlined, EditOutlined, DeleteOutlined, CloudServerOutlined, CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { iotService, IoTGateway, GatewayStatistics, IoTDeviceStatus } from '@/services/iotService';
import { useModal } from '@/hooks/useModal';

const { useBreakpoint } = Grid;

export interface GatewayManagementRef { reload: () => void; refreshStats: () => void; handleAdd: () => void; }

const normalizeStatus = (status?: string) => (status ? (status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()) : '') as IoTDeviceStatus;
const statusMap: Record<IoTDeviceStatus, { color: string; label: string }> = { Online: { color: 'green', label: '在线' }, Offline: { color: 'default', label: '离线' }, Fault: { color: 'red', label: '故障' }, Maintenance: { color: 'orange', label: '维护中' } };
const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'PULL'];

const GatewayManagement = React.forwardRef<GatewayManagementRef, any>((props, ref) => {
  const intl = useIntl();
  const { confirm } = useModal();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [form] = ProForm.useForm();

  const [state, setState] = useState({
    statistics: null as { total: number; online: number; offline: number; fault: number } | null,
    editingGateway: null as IoTGateway | null,
    formVisible: false,
    detailVisible: false,
    viewingGateway: null as IoTGateway | null,
    gatewayStats: null as GatewayStatistics | null,
    sorter: undefined as { sortBy: string; sortOrder: string } | undefined,
    search: '',
  });
  const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

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
    { title: '请求方式', render: (_, record) => <Tag color="blue">{(record?.config?.httpMethod as string) || '-'}</Tag> },
    { title: '地址', dataIndex: 'address', sorter: true },
    { title: '状态', dataIndex: 'status', sorter: true, render: (dom) => { const normalized = normalizeStatus(dom as string); const config = statusMap[normalized] || { color: 'default', label: (dom as string) || '未知' }; return <Tag color={config.color}>{config.label}</Tag>; } },
    { title: '设备数', dataIndex: 'deviceCount', sorter: true, align: 'center' },
    { title: '启用', dataIndex: 'isEnabled', sorter: true, render: (dom) => <Tag color={dom ? 'green' : 'red'}>{dom ? '是' : '否'}</Tag> },
    { title: '操作', valueType: 'option', fixed: 'right', width: 180, render: (_, record) => (
      <Space size={4}>
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { set({ editingGateway: record, formVisible: true }); form.setFieldsValue({ ...record, config: record.config || undefined }); }}>编辑</Button>
        <Popconfirm title={`确定删除「${record.title}」？`} onConfirm={async () => { const res = await iotService.deleteGateway(record.id); if (res.success) { message.success('删除成功'); actionRef.current?.reload(); fetchStatistics(); } }}>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      </Space>
    )},
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
    <>
      <ProTable actionRef={actionRef} headerTitle={
        <Space size={24}>
          <Space><CloudServerOutlined />网关管理</Space>
          <Space size={12}>
            <Tag color="blue">总数 {state.statistics?.total || 0}</Tag>
            <Tag color="green">在线 {state.statistics?.online || 0}</Tag>
            <Tag color="default">离线 {state.statistics?.offline || 0}</Tag>
          </Space>
        </Space>
      } request={async (params: any) => {
        const { current, pageSize } = params;
        const sortParams = state.sorter?.sortBy && state.sorter?.sortOrder ? state.sorter : undefined;
        const res = await iotService.getGateways({ page: current, pageSize, search: state.search, ...sortParams });
        return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
      }} columns={columns} rowKey="id" search={false}
        onChange={(_p, _f, s: any) => set({ sorter: s?.order ? { sortBy: s.field, sortOrder: s.order === 'ascend' ? 'asc' : 'desc' } : undefined })}
        scroll={{ x: 'max-content' }}
        toolBarRender={() => [
          <Input.Search
            key="search"
            placeholder="搜索..."
            allowClear
            value={state.search}
            onChange={(e) => set({ search: e.target.value })}
            onSearch={(value) => { set({ search: value }); actionRef.current?.reload(); }}
            style={{ width: 260, marginRight: 8 }}
          />,
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => { set({ editingGateway: null, formVisible: true }); form.resetFields(); }}>新建</Button>,
        ]}
      />

      <ModalForm key={state.editingGateway?.id || 'create'} title={state.editingGateway ? '编辑网关' : '新建网关'} open={state.formVisible} onOpenChange={(open) => { if (!open) set({ formVisible: false, editingGateway: null }); }}
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

      <Drawer title="网关详情" placement="right" open={state.detailVisible} onClose={() => set({ detailVisible: false, viewingGateway: null, gatewayStats: null })} size="large">
        {state.viewingGateway && (
          <>
            <ProCard title="基本信息" style={{ marginBottom: 16 }}>
              <ProDescriptions column={isMobile ? 1 : 2} size="small">
                <ProDescriptions.Item label="网关名称" span={2}>{state.viewingGateway.title}</ProDescriptions.Item>
                <ProDescriptions.Item label="网关ID">{state.viewingGateway.gatewayId}</ProDescriptions.Item>
                <ProDescriptions.Item label="状态">{(() => { const normalized = normalizeStatus(state.viewingGateway.status); const config = statusMap[normalized] || { color: 'default', label: state.viewingGateway.status || '未知' }; return <Tag color={config.color}>{config.label}</Tag>; })()}</ProDescriptions.Item>
                <ProDescriptions.Item label="协议类型">{state.viewingGateway.protocolType || '-'}</ProDescriptions.Item>
                <ProDescriptions.Item label="地址">{state.viewingGateway.address || '-'}</ProDescriptions.Item>
                <ProDescriptions.Item label="启用状态"><Tag color={state.viewingGateway.isEnabled ? 'green' : 'red'}>{state.viewingGateway.isEnabled ? '是' : '否'}</Tag></ProDescriptions.Item>
              </ProDescriptions>
            </ProCard>
            {state.gatewayStats && (
              <ProCard title="设备统计" style={{ marginBottom: 16 }}>
                <ProDescriptions column={isMobile ? 1 : 2} size="small">
                  <ProDescriptions.Item label="总数">{state.gatewayStats.totalDevices}</ProDescriptions.Item>
                  <ProDescriptions.Item label="在线"><Tag color="green">{state.gatewayStats.onlineDevices}</Tag></ProDescriptions.Item>
                  <ProDescriptions.Item label="离线"><Tag color="default">{state.gatewayStats.offlineDevices}</Tag></ProDescriptions.Item>
                  <ProDescriptions.Item label="故障"><Tag color="red">{state.gatewayStats.faultDevices}</Tag></ProDescriptions.Item>
                </ProDescriptions>
              </ProCard>
            )}
            <ProCard title="时间信息">
              <ProDescriptions column={isMobile ? 1 : 2} size="small">
                <ProDescriptions.Item label="创建时间">{state.viewingGateway.createdAt ? dayjs(state.viewingGateway.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</ProDescriptions.Item>
              </ProDescriptions>
            </ProCard>
          </>
        )}
      </Drawer>
    </>
  );
});

GatewayManagement.displayName = 'GatewayManagement';

export default GatewayManagement;
