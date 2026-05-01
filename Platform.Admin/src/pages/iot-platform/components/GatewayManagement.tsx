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
    { title: intl.formatMessage({ id: 'pages.iotPlatform.gateway.name' }), dataIndex: 'title', sorter: true, render: (dom, record) => <a onClick={() => set({ viewingGateway: record, detailVisible: true })}>{dom}</a> },
    { title: intl.formatMessage({ id: 'pages.iotPlatform.gateway.protocolType' }), dataIndex: 'protocolType', sorter: true },
    { title: intl.formatMessage({ id: 'pages.iotPlatform.gateway.httpMethod' }), render: (_, record) => <Tag color="blue">{(record?.config?.httpMethod as string) || '-'}</Tag> },
    { title: intl.formatMessage({ id: 'pages.iotPlatform.gateway.address' }), dataIndex: 'address', sorter: true },
    { title: intl.formatMessage({ id: 'pages.iotPlatform.gateway.columns.status' }), dataIndex: 'status', sorter: true, render: (dom) => { const normalized = normalizeStatus(dom as string); const config = statusMap[normalized] || { color: 'default', label: (dom as string) || intl.formatMessage({ id: 'pages.iotPlatform.gateway.unknown' }) }; return <Tag color={config.color}>{config.label}</Tag>; } },
    { title: intl.formatMessage({ id: 'pages.iotPlatform.gateway.deviceCount' }), dataIndex: 'deviceCount', sorter: true, align: 'center' },
    { title: intl.formatMessage({ id: 'pages.iotPlatform.gateway.columns.enabled' }), dataIndex: 'isEnabled', sorter: true, render: (dom) => <Tag color={dom ? 'green' : 'red'}>{dom ? intl.formatMessage({ id: 'pages.iotPlatform.datapoint.yes' }) : intl.formatMessage({ id: 'pages.iotPlatform.datapoint.no' })}</Tag> },
    { title: intl.formatMessage({ id: 'pages.iotPlatform.table.action' }), valueType: 'option', fixed: 'right', width: 180, render: (_, record) => (
      <Space size={4}>
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { set({ editingGateway: record, formVisible: true }); form.setFieldsValue({ ...record, config: record.config || undefined }); }}>{intl.formatMessage({ id: 'pages.iotPlatform.gateway.edit' })}</Button>
        <Popconfirm title={intl.formatMessage({ id: 'pages.iotPlatform.gateway.deleteConfirm' }, { name: record.title })} onConfirm={async () => { const res = await iotService.deleteGateway(record.id); if (res.success) { message.success(intl.formatMessage({ id: 'pages.iotPlatform.gateway.message.deleteSuccess' })); actionRef.current?.reload(); fetchStatistics(); } }}>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>{intl.formatMessage({ id: 'pages.iotPlatform.gateway.delete' })}</Button>
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
    if (res.success) message.success(state.editingGateway ? intl.formatMessage({ id: 'pages.iotPlatform.gateway.message.updateSuccess' }) : intl.formatMessage({ id: 'pages.iotPlatform.gateway.message.createSuccess' }));
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
          <Space><CloudServerOutlined />{intl.formatMessage({ id: 'pages.iotPlatform.gateway.tabTitle' })}</Space>
          <Space size={12}>
            <Tag color="blue">{intl.formatMessage({ id: 'pages.iotPlatform.statistics.total' })} {state.statistics?.total || 0}</Tag>
            <Tag color="green">{intl.formatMessage({ id: 'pages.iotPlatform.statistics.online' })} {state.statistics?.online || 0}</Tag>
            <Tag color="default">{intl.formatMessage({ id: 'pages.iotPlatform.statistics.offline' })} {state.statistics?.offline || 0}</Tag>
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
            placeholder={intl.formatMessage({ id: 'pages.iotPlatform.searchPlaceholder' })}
            allowClear
            value={state.search}
            onChange={(e) => set({ search: e.target.value })}
            onSearch={(value) => { set({ search: value }); actionRef.current?.reload(); }}
            style={{ width: 260, marginRight: 8 }}
          />,
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => { set({ editingGateway: null, formVisible: true }); form.resetFields(); }}>{intl.formatMessage({ id: 'pages.iotPlatform.button.create' })}</Button>,
        ]}
      />

      <ModalForm key={state.editingGateway?.id || 'create'} title={state.editingGateway ? intl.formatMessage({ id: 'pages.iotPlatform.gateway.edit' }) : intl.formatMessage({ id: 'pages.iotPlatform.gateway.create' })} open={state.formVisible} onOpenChange={(open) => { if (!open) set({ formVisible: false, editingGateway: null }); }}
        form={form} onFinish={handleSubmit} width={isMobile ? '100%' : 600}
      >
        <ProFormText name="title" label={intl.formatMessage({ id: 'pages.iotPlatform.gateway.name' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.iotPlatform.gateway.nameRequired' }) }]} placeholder={intl.formatMessage({ id: 'pages.iotPlatform.gateway.namePlaceholder' })} />
        <ProFormText name="description" label={intl.formatMessage({ id: 'pages.iotPlatform.gateway.description' })} placeholder={intl.formatMessage({ id: 'pages.iotPlatform.gateway.descriptionPlaceholder' })} />
        <ProFormSelect name="protocolType" label={intl.formatMessage({ id: 'pages.iotPlatform.gateway.protocolType' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.iotPlatform.gateway.protocolTypeRequired' }) }]} options={[{ label: 'MQTT', value: 'MQTT' }, { label: 'HTTP', value: 'HTTP' }, { label: 'Modbus', value: 'Modbus' }, { label: 'CoAP', value: 'CoAP' }]} placeholder={intl.formatMessage({ id: 'pages.iotPlatform.gateway.protocolTypePlaceholder' })} />
        <Form.Item noStyle shouldUpdate={(prev, curr) => prev.protocolType !== curr.protocolType}>
          {() => form.getFieldValue('protocolType') === 'HTTP' && (
            <ProFormSelect name={['config', 'httpMethod']} label={intl.formatMessage({ id: 'pages.iotPlatform.gateway.httpMethod' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.iotPlatform.gateway.httpMethodRequired' }) }]} initialValue="GET" options={httpMethods.map(m => ({ label: m, value: m }))} placeholder={intl.formatMessage({ id: 'pages.iotPlatform.gateway.httpMethodPlaceholder' })} />
          )}
        </Form.Item>
        <ProFormText name="address" label={intl.formatMessage({ id: 'pages.iotPlatform.gateway.address' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.iotPlatform.gateway.addressRequired' }) }]} placeholder={intl.formatMessage({ id: 'pages.iotPlatform.gateway.addressPlaceholder' })} />
        <ProFormText name="username" label={intl.formatMessage({ id: 'pages.iotPlatform.gateway.username' })} placeholder={intl.formatMessage({ id: 'pages.iotPlatform.gateway.usernamePlaceholder' })} />
        <ProFormText name="password" label={intl.formatMessage({ id: 'pages.iotPlatform.gateway.password' })} placeholder={intl.formatMessage({ id: 'pages.iotPlatform.gateway.passwordPlaceholder' })} />
        <ProFormText name="remarks" label={intl.formatMessage({ id: 'pages.iotPlatform.gateway.remarks' })} placeholder={intl.formatMessage({ id: 'pages.iotPlatform.gateway.remarksPlaceholder' })} />
      </ModalForm>

      <Drawer title={intl.formatMessage({ id: 'pages.iotPlatform.gateway.detail' })} placement="right" open={state.detailVisible} onClose={() => set({ detailVisible: false, viewingGateway: null, gatewayStats: null })} size="large">
        {state.viewingGateway && (
          <>
            <ProCard title={intl.formatMessage({ id: 'pages.iotPlatform.gateway.basicInfo' })} style={{ marginBottom: 16 }}>
              <ProDescriptions column={isMobile ? 1 : 2} size="small">
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.gateway.name' })} span={2}>{state.viewingGateway.title}</ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.gateway.gatewayId' })}>{state.viewingGateway.gatewayId}</ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.gateway.columns.status' })}>{(() => { const normalized = normalizeStatus(state.viewingGateway.status); const config = statusMap[normalized] || { color: 'default', label: state.viewingGateway.status || intl.formatMessage({ id: 'pages.iotPlatform.gateway.unknown' }) }; return <Tag color={config.color}>{config.label}</Tag>; })()}</ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.gateway.protocolType' })}>{state.viewingGateway.protocolType || '-'}</ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.gateway.address' })}>{state.viewingGateway.address || '-'}</ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.gateway.enabledStatus' })}><Tag color={state.viewingGateway.isEnabled ? 'green' : 'red'}>{state.viewingGateway.isEnabled ? intl.formatMessage({ id: 'pages.iotPlatform.datapoint.yes' }) : intl.formatMessage({ id: 'pages.iotPlatform.datapoint.no' })}</Tag></ProDescriptions.Item>
              </ProDescriptions>
            </ProCard>
            {state.gatewayStats && (
              <ProCard title={intl.formatMessage({ id: 'pages.iotPlatform.gateway.deviceStats' })} style={{ marginBottom: 16 }}>
                <ProDescriptions column={isMobile ? 1 : 2} size="small">
                  <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.statistics.total' })}>{state.gatewayStats.totalDevices}</ProDescriptions.Item>
                  <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.statistics.online' })}><Tag color="green">{state.gatewayStats.onlineDevices}</Tag></ProDescriptions.Item>
                  <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.statistics.offline' })}><Tag color="default">{state.gatewayStats.offlineDevices}</Tag></ProDescriptions.Item>
                  <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.statistics.fault' })}><Tag color="red">{state.gatewayStats.faultDevices}</Tag></ProDescriptions.Item>
                </ProDescriptions>
              </ProCard>
            )}
            <ProCard title={intl.formatMessage({ id: 'pages.iotPlatform.gateway.timeInfo' })}>
              <ProDescriptions column={isMobile ? 1 : 2} size="small">
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.gateway.createdAt' })}>{state.viewingGateway.createdAt ? dayjs(state.viewingGateway.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</ProDescriptions.Item>
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
