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
    { title: intl.formatMessage({ id: 'pages.iotPlatform.gateway.name', defaultMessage: '网关名称' }), dataIndex: 'title', sorter: true, render: (dom, record) => <a onClick={() => set({ viewingGateway: record, detailVisible: true })}>{dom}</a> },
    { title: intl.formatMessage({ id: 'pages.iotPlatform.gateway.protocolType', defaultMessage: '协议类型' }), dataIndex: 'protocolType', sorter: true },
    { title: intl.formatMessage({ id: 'pages.iotPlatform.gateway.httpMethod', defaultMessage: '请求方式' }), render: (_, record) => <Tag color="blue">{(record?.config?.httpMethod as string) || '-'}</Tag> },
    { title: intl.formatMessage({ id: 'pages.iotPlatform.gateway.address', defaultMessage: '地址' }), dataIndex: 'address', sorter: true },
    { title: intl.formatMessage({ id: 'pages.iotPlatform.gateway.columns.status', defaultMessage: '状态' }), dataIndex: 'status', sorter: true, render: (dom) => { const normalized = normalizeStatus(dom as string); const config = statusMap[normalized] || { color: 'default', label: (dom as string) || intl.formatMessage({ id: 'pages.iotPlatform.gateway.unknown', defaultMessage: '未知' }) }; return <Tag color={config.color}>{config.label}</Tag>; } },
    { title: intl.formatMessage({ id: 'pages.iotPlatform.gateway.deviceCount', defaultMessage: '设备数' }), dataIndex: 'deviceCount', sorter: true, align: 'center' },
    { title: intl.formatMessage({ id: 'pages.iotPlatform.gateway.columns.enabled', defaultMessage: '启用' }), dataIndex: 'isEnabled', sorter: true, render: (dom) => <Tag color={dom ? 'green' : 'red'}>{dom ? intl.formatMessage({ id: 'pages.iotPlatform.datapoint.yes', defaultMessage: '是' }) : intl.formatMessage({ id: 'pages.iotPlatform.datapoint.no', defaultMessage: '否' })}</Tag> },
    { title: intl.formatMessage({ id: 'pages.iotPlatform.table.action', defaultMessage: '操作' }), valueType: 'option', fixed: 'right', width: 180, render: (_, record) => (
      <Space size={4}>
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { set({ editingGateway: record, formVisible: true }); form.setFieldsValue({ ...record, config: record.config || undefined }); }}>{intl.formatMessage({ id: 'pages.iotPlatform.gateway.edit', defaultMessage: '编辑' })}</Button>
        <Popconfirm title={intl.formatMessage({ id: 'pages.iotPlatform.gateway.deleteConfirm', defaultMessage: '确定删除「{name}」？' }, { name: record.title })} onConfirm={async () => { const res = await iotService.deleteGateway(record.id); if (res.success) { message.success(intl.formatMessage({ id: 'pages.iotPlatform.gateway.message.deleteSuccess', defaultMessage: '删除成功' })); actionRef.current?.reload(); fetchStatistics(); } }}>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>{intl.formatMessage({ id: 'pages.iotPlatform.gateway.delete', defaultMessage: '删除' })}</Button>
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
    if (res.success) message.success(state.editingGateway ? intl.formatMessage({ id: 'pages.iotPlatform.gateway.message.updateSuccess', defaultMessage: '更新成功' }) : intl.formatMessage({ id: 'pages.iotPlatform.gateway.message.createSuccess', defaultMessage: '创建成功' }));
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
          <Space><CloudServerOutlined />{intl.formatMessage({ id: 'pages.iotPlatform.gateway.tabTitle', defaultMessage: '网关管理' })}</Space>
          <Space size={12}>
            <Tag color="blue">{intl.formatMessage({ id: 'pages.iotPlatform.statistics.total', defaultMessage: '总数' })} {state.statistics?.total || 0}</Tag>
            <Tag color="green">{intl.formatMessage({ id: 'pages.iotPlatform.statistics.online', defaultMessage: '在线' })} {state.statistics?.online || 0}</Tag>
            <Tag color="default">{intl.formatMessage({ id: 'pages.iotPlatform.statistics.offline', defaultMessage: '离线' })} {state.statistics?.offline || 0}</Tag>
          </Space>
        </Space>
      } request={async (params: any, sort: any, filter: any) => {
        const res = await iotService.getGateways({ ...params, search: state.search, sort, filter });
        return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
      }} columns={columns} rowKey="id" search={false}
        scroll={{ x: 'max-content' }}
        toolBarRender={() => [
          <Input.Search
            key="search"
            placeholder={intl.formatMessage({ id: 'pages.iotPlatform.searchPlaceholder', defaultMessage: '搜索...' })}
            allowClear
            value={state.search}
            onChange={(e) => set({ search: e.target.value })}
            onSearch={(value) => { set({ search: value }); actionRef.current?.reload(); }}
            style={{ width: 260, marginRight: 8 }}
          />,
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => { set({ editingGateway: null, formVisible: true }); form.resetFields(); }}>{intl.formatMessage({ id: 'pages.iotPlatform.button.create', defaultMessage: '新建' })}</Button>,
        ]}
      />

      <ModalForm key={state.editingGateway?.id || 'create'} title={state.editingGateway ? intl.formatMessage({ id: 'pages.iotPlatform.gateway.edit', defaultMessage: '编辑网关' }) : intl.formatMessage({ id: 'pages.iotPlatform.gateway.create', defaultMessage: '新建网关' })} open={state.formVisible} onOpenChange={(open) => { if (!open) set({ formVisible: false, editingGateway: null }); }}
        form={form} onFinish={handleSubmit} width={isMobile ? '100%' : 600}
      >
        <ProFormText name="title" label={intl.formatMessage({ id: 'pages.iotPlatform.gateway.name', defaultMessage: '网关名称' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.iotPlatform.gateway.nameRequired', defaultMessage: '请输入网关名称' }) }]} placeholder={intl.formatMessage({ id: 'pages.iotPlatform.gateway.namePlaceholder', defaultMessage: '请输入网关名称' })} />
        <ProFormText name="description" label={intl.formatMessage({ id: 'pages.iotPlatform.gateway.description', defaultMessage: '描述' })} placeholder={intl.formatMessage({ id: 'pages.iotPlatform.gateway.descriptionPlaceholder', defaultMessage: '请输入描述' })} />
        <ProFormSelect name="protocolType" label={intl.formatMessage({ id: 'pages.iotPlatform.gateway.protocolType', defaultMessage: '协议类型' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.iotPlatform.gateway.protocolTypeRequired', defaultMessage: '请选择协议类型' }) }]} options={[{ label: 'MQTT', value: 'MQTT' }, { label: 'HTTP', value: 'HTTP' }, { label: 'Modbus', value: 'Modbus' }, { label: 'CoAP', value: 'CoAP' }]} placeholder={intl.formatMessage({ id: 'pages.iotPlatform.gateway.protocolTypePlaceholder', defaultMessage: '请选择协议类型' })} />
        <Form.Item noStyle shouldUpdate={(prev, curr) => prev.protocolType !== curr.protocolType}>
          {() => form.getFieldValue('protocolType') === 'HTTP' && (
            <ProFormSelect name={['config', 'httpMethod']} label={intl.formatMessage({ id: 'pages.iotPlatform.gateway.httpMethod', defaultMessage: '请求方式' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.iotPlatform.gateway.httpMethodRequired', defaultMessage: '请选择请求方式' }) }]} initialValue="GET" options={httpMethods.map(m => ({ label: m, value: m }))} placeholder={intl.formatMessage({ id: 'pages.iotPlatform.gateway.httpMethodPlaceholder', defaultMessage: '请选择请求方式' })} />
          )}
        </Form.Item>
        <ProFormText name="address" label={intl.formatMessage({ id: 'pages.iotPlatform.gateway.address', defaultMessage: '网关地址' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.iotPlatform.gateway.addressRequired', defaultMessage: '请输入网关地址' }) }]} placeholder={intl.formatMessage({ id: 'pages.iotPlatform.gateway.addressPlaceholder', defaultMessage: '请输入网关地址或IP' })} />
        <ProFormText name="username" label={intl.formatMessage({ id: 'pages.iotPlatform.gateway.username', defaultMessage: '用户名' })} placeholder={intl.formatMessage({ id: 'pages.iotPlatform.gateway.usernamePlaceholder', defaultMessage: '请输入用户名' })} />
        <ProFormText name="password" label={intl.formatMessage({ id: 'pages.iotPlatform.gateway.password', defaultMessage: '密码' })} placeholder={intl.formatMessage({ id: 'pages.iotPlatform.gateway.passwordPlaceholder', defaultMessage: '请输入密码' })} />
        <ProFormText name="remarks" label={intl.formatMessage({ id: 'pages.iotPlatform.gateway.remarks', defaultMessage: '备注' })} placeholder={intl.formatMessage({ id: 'pages.iotPlatform.gateway.remarksPlaceholder', defaultMessage: '请输入备注' })} />
      </ModalForm>

      <Drawer title={intl.formatMessage({ id: 'pages.iotPlatform.gateway.detail', defaultMessage: '网关详情' })} placement="right" open={state.detailVisible} onClose={() => set({ detailVisible: false, viewingGateway: null, gatewayStats: null })} size="large">
        {state.viewingGateway && (
          <>
            <ProCard title={intl.formatMessage({ id: 'pages.iotPlatform.gateway.basicInfo', defaultMessage: '基本信息' })} style={{ marginBottom: 16 }}>
              <ProDescriptions column={isMobile ? 1 : 2} size="small">
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.gateway.name', defaultMessage: '网关名称' })} span={2}>{state.viewingGateway.title}</ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.gateway.gatewayId', defaultMessage: '网关ID' })}>{state.viewingGateway.gatewayId}</ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.gateway.columns.status', defaultMessage: '状态' })}>{(() => { const normalized = normalizeStatus(state.viewingGateway.status); const config = statusMap[normalized] || { color: 'default', label: state.viewingGateway.status || intl.formatMessage({ id: 'pages.iotPlatform.gateway.unknown', defaultMessage: '未知' }) }; return <Tag color={config.color}>{config.label}</Tag>; })()}</ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.gateway.protocolType', defaultMessage: '协议类型' })}>{state.viewingGateway.protocolType || '-'}</ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.gateway.address', defaultMessage: '地址' })}>{state.viewingGateway.address || '-'}</ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.gateway.enabledStatus', defaultMessage: '启用状态' })}><Tag color={state.viewingGateway.isEnabled ? 'green' : 'red'}>{state.viewingGateway.isEnabled ? intl.formatMessage({ id: 'pages.iotPlatform.datapoint.yes', defaultMessage: '是' }) : intl.formatMessage({ id: 'pages.iotPlatform.datapoint.no', defaultMessage: '否' })}</Tag></ProDescriptions.Item>
              </ProDescriptions>
            </ProCard>
            {state.gatewayStats && (
              <ProCard title={intl.formatMessage({ id: 'pages.iotPlatform.gateway.deviceStats', defaultMessage: '设备统计' })} style={{ marginBottom: 16 }}>
                <ProDescriptions column={isMobile ? 1 : 2} size="small">
                  <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.statistics.total', defaultMessage: '总数' })}>{state.gatewayStats.totalDevices}</ProDescriptions.Item>
                  <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.statistics.online', defaultMessage: '在线' })}><Tag color="green">{state.gatewayStats.onlineDevices}</Tag></ProDescriptions.Item>
                  <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.statistics.offline', defaultMessage: '离线' })}><Tag color="default">{state.gatewayStats.offlineDevices}</Tag></ProDescriptions.Item>
                  <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.statistics.fault', defaultMessage: '故障' })}><Tag color="red">{state.gatewayStats.faultDevices}</Tag></ProDescriptions.Item>
                </ProDescriptions>
              </ProCard>
            )}
            <ProCard title={intl.formatMessage({ id: 'pages.iotPlatform.gateway.timeInfo', defaultMessage: '时间信息' })}>
              <ProDescriptions column={isMobile ? 1 : 2} size="small">
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.gateway.createdAt', defaultMessage: '创建时间' })}>{state.viewingGateway.createdAt ? dayjs(state.viewingGateway.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</ProDescriptions.Item>
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
