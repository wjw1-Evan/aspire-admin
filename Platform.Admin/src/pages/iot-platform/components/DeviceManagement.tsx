import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useIntl } from '@umijs/max';
import { type ProColumns, ActionType, ProTable } from '@ant-design/pro-table';
import { ModalForm, ProFormText, ProFormSelect, ProFormDigit, ProFormTextArea } from '@ant-design/pro-components';
import { Button, Col, Grid, Input, Row, Space, Tag, Tabs, message, Alert, Modal, Popconfirm } from 'antd';
import { ProForm } from '@ant-design/pro-components';
import { Drawer } from 'antd';
import { ProCard, ProDescriptions } from '@ant-design/pro-components';
import { PlusOutlined, EditOutlined, DeleteOutlined, DesktopOutlined, CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, KeyOutlined, BranchesOutlined, SendOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { iotService, IoTDevice, IoTGateway, DeviceStatistics, GenerateApiKeyResult } from '@/services/iotService';
import { useModal } from '@/hooks/useModal';
import { getErrorMessage } from '@/utils/getErrorMessage';
import DeviceTwinPanel from './DeviceTwinPanel';
import CommandCenterPanel from './CommandCenterPanel';

const { useBreakpoint } = Grid;

export interface DeviceManagementRef { reload: () => void; refreshStats: () => void; handleAdd: () => void; }

const DEVICE_TYPE_OPTIONS = [
  { label: '传感器 (Sensor)', value: 'Sensor' },
  { label: '执行器 (Actuator)', value: 'Actuator' },
  { label: '网关 (Gateway)', value: 'Gateway' },
  { label: '其他 (Other)', value: 'Other' },
];

const deviceTypeColor: Record<string, string> = { Sensor: 'blue', Actuator: 'orange', Gateway: 'purple', Other: 'default' };
const deviceTypeLabel: Record<string, string> = { Sensor: '传感器', Actuator: '执行器', Gateway: '网关', Other: '其他' };
const statusConfig: Record<string, { color: string; label: string }> = { Online: { color: 'green', label: '在线' }, Offline: { color: 'default', label: '离线' }, Fault: { color: 'red', label: '故障' }, Maintenance: { color: 'orange', label: '维护中' } };

const DeviceManagement = React.forwardRef<DeviceManagementRef, any>((props, ref) => {
  const intl = useIntl();
  const { confirm } = useModal();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [form] = ProForm.useForm();

  const [state, setState] = useState({
    gateways: [] as IoTGateway[],
    statistics: null as { total: number; online: number; offline: number; fault: number } | null,
    deviceStatistics: null as DeviceStatistics | null,
    editingDevice: null as IoTDevice | null,
    formVisible: false,
    detailVisible: false,
    viewingDevice: null as IoTDevice | null,
    selectedRowKeys: [] as React.Key[],
    batchDeleting: false,
    generatingKey: false,
    apiKeyResult: null as GenerateApiKeyResult | null,
    apiKeyModalVisible: false,
    search: '',
  });
  const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

  const fetchStatistics = useCallback(async () => {
    try {
      const [platformRes, statusRes] = await Promise.all([iotService.getPlatformStatistics(), iotService.getDeviceStatusStatistics()]);
      const total = platformRes.success ? (platformRes.data?.totalDevices ?? 0) : 0;
      const status = statusRes.success ? statusRes.data : null;
      set({ statistics: { total, online: status?.online ?? status?.Online ?? 0, offline: status?.offline ?? status?.Offline ?? 0, fault: status?.fault ?? status?.Fault ?? 0 } });
    } catch {}
  }, []);

  const loadGateways = useCallback(async () => {
    try {
      const response = await iotService.getGateways({});
      if (response.success && response.data) set({ gateways: response.data.queryable || [] });
    } catch {}
  }, []);

  useEffect(() => { loadGateways(); fetchStatistics(); }, [loadGateways, fetchStatistics]);

  const columns: ProColumns<IoTDevice>[] = [
    { title: intl.formatMessage({ id: 'pages.iotPlatform.device.columns.name' }), dataIndex: 'title', sorter: true, render: (dom, record) => <a onClick={() => set({ viewingDevice: record, detailVisible: true })}>{dom as string}</a> },
    { title: intl.formatMessage({ id: 'pages.iotPlatform.device.columns.type' }), dataIndex: 'deviceType', sorter: true, render: (dom) => <Tag color={deviceTypeColor[dom as string] ?? 'default'}>{deviceTypeLabel[dom as string] ?? dom}</Tag> },
    { title: intl.formatMessage({ id: 'pages.iotPlatform.device.columns.gateway' }), dataIndex: 'gatewayId', sorter: true, render: (dom) => state.gateways.find(g => g.gatewayId === (dom as string))?.title || (dom ? <Tag>{dom}</Tag> : <Tag color="default">{intl.formatMessage({ id: 'pages.iotPlatform.device.standalone' })}</Tag>) },
    { title: intl.formatMessage({ id: 'pages.iotPlatform.device.columns.location' }), dataIndex: 'location', sorter: true },
    { title: intl.formatMessage({ id: 'pages.iotPlatform.device.columns.status' }), dataIndex: 'status', sorter: true, render: (dom) => { const cfg = statusConfig[dom as string] ?? statusConfig.Offline; return <Tag color={cfg.color}>{cfg.label}</Tag>; } },
    { title: intl.formatMessage({ id: 'pages.iotPlatform.device.columns.enabled' }), dataIndex: 'isEnabled', sorter: true, render: (dom) => <Tag color={dom ? 'green' : 'red'}>{dom ? intl.formatMessage({ id: 'pages.iotPlatform.datapoint.yes' }) : intl.formatMessage({ id: 'pages.iotPlatform.datapoint.no' })}</Tag> },
    { title: intl.formatMessage({ id: 'pages.iotPlatform.table.action' }), valueType: 'option', fixed: 'right', width: 180, render: (_, record) => (
      <Space size={4}>
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { set({ editingDevice: record, formVisible: true }); form.setFieldsValue({ ...record, tagsList: record.tags ? Object.entries(record.tags).map(([k, v]) => `${k}:${v}`) : [] }); }}>{intl.formatMessage({ id: 'pages.table.edit' })}</Button>
        <Button type="link" size="small" loading={state.generatingKey} onClick={() => handleGenerateApiKey(record)}>{intl.formatMessage({ id: 'pages.iotPlatform.device.apiKey' })}</Button>
        <Popconfirm title={intl.formatMessage({ id: 'pages.iotPlatform.device.deleteConfirm' }, { name: record.name })} onConfirm={async () => { const res = await iotService.deleteDevice(record.id); if (res.success) { message.success(intl.formatMessage({ id: 'pages.iotPlatform.device.message.deleteSuccess' })); actionRef.current?.reload(); fetchStatistics(); } }}>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>{intl.formatMessage({ id: 'pages.iotPlatform.device.delete' })}</Button>
        </Popconfirm>
      </Space>
    )},
  ];

  const handleSubmit = useCallback(async (values: any) => {
    const tags: Record<string, string> = {};
    (values.tagsList || []).forEach((t: string) => { const idx = t.indexOf(':'); if (idx > 0) { tags[t.slice(0, idx).trim()] = t.slice(idx + 1).trim(); } else { tags[t.trim()] = ''; } });
    const payload = { ...values, tags, tagsList: undefined };
    const res = state.editingDevice ? await iotService.updateDevice(state.editingDevice.id, payload) : await iotService.createDevice(payload);
    if (res.success) message.success(state.editingDevice ? intl.formatMessage({ id: 'pages.iotPlatform.device.message.updateSuccess' }) : intl.formatMessage({ id: 'pages.iotPlatform.device.message.createSuccess' }));
    set({ formVisible: false, editingDevice: null });
    actionRef.current?.reload();
    fetchStatistics();
  }, [state.editingDevice, fetchStatistics]);

  const handleGenerateApiKey = useCallback(async (device: IoTDevice) => {
    set({ generatingKey: true });
    try {
      const res = await iotService.generateApiKey(device.deviceId);
      if (res.success && res.data) set({ apiKeyResult: res.data, apiKeyModalVisible: true });
      else { message.error(getErrorMessage(res, 'pages.iotPlatform.device.generateApiKeyFailed')); }
    } catch (err) { message.error(getErrorMessage(err as any, 'pages.iotPlatform.device.generateApiKeyFailed')); }
    finally { set({ generatingKey: false }); }
  }, []);

  const handleViewDetail = useCallback(async (device: IoTDevice) => {
    try {
      const response = await iotService.getDeviceStatistics(device.deviceId);
      if (response.success && response.data) set({ deviceStatistics: response.data });
    } catch {}
  }, []);

  useEffect(() => { if (state.detailVisible && state.viewingDevice) handleViewDetail(state.viewingDevice); }, [state.detailVisible, state.viewingDevice, handleViewDetail]);

  const handleBatchDelete = useCallback(async () => {
    if (state.selectedRowKeys.length === 0) return;
    confirm({
      title: intl.formatMessage({ id: 'pages.iotPlatform.device.batchDeleteConfirm' }), content: intl.formatMessage({ id: 'pages.iotPlatform.device.batchDeleteContent' }, { count: state.selectedRowKeys.length }), okButtonProps: { danger: true },
      onOk: async () => {
        set({ batchDeleting: true });
        try {
          const res = await iotService.batchDeleteDevices(state.selectedRowKeys as string[]);
          if (res.success && res.data) {
            message.success(intl.formatMessage({ id: 'pages.iotPlatform.device.message.batchDeleteSuccess' }, { count: res.data.deletedCount }));
            set({ selectedRowKeys: [] });
            actionRef.current?.reload();
            fetchStatistics();
          } else { message.error(getErrorMessage(res, 'pages.iotPlatform.device.batchDeleteFailed')); }
        } catch (err) { message.error(getErrorMessage(err as any, 'pages.iotPlatform.device.batchDeleteFailed')); }
        finally { set({ batchDeleting: false }); }
      },
    });
  }, [state.selectedRowKeys, confirm, fetchStatistics]);

  return (
    <>
      {state.selectedRowKeys.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', marginBottom: 8, background: '#e6f4ff', border: '1px solid #91caff', borderRadius: 8 }}>
          <span style={{ color: '#1677ff', fontWeight: 500 }}>{intl.formatMessage({ id: 'pages.iotPlatform.device.selectedCount' })} <strong>{state.selectedRowKeys.length}</strong> {intl.formatMessage({ id: 'pages.iotPlatform.device.selectedUnit' })}</span>
          <Button danger size="small" icon={<DeleteOutlined />} loading={state.batchDeleting} onClick={handleBatchDelete}>{intl.formatMessage({ id: 'pages.iotPlatform.device.batchDelete' })}</Button>
          <Button size="small" onClick={() => set({ selectedRowKeys: [] })}>{intl.formatMessage({ id: 'pages.iotPlatform.device.cancelSelection' })}</Button>
        </div>
      )}

      <ProTable actionRef={actionRef} headerTitle={
        <Space size={24}>
          <Space><DesktopOutlined />{intl.formatMessage({ id: 'pages.iotPlatform.device.tabTitle' })}</Space>
          <Space size={12}>
            <Tag color="blue">{intl.formatMessage({ id: 'pages.iotPlatform.statistics.total' })} {state.statistics?.total || 0}</Tag>
            <Tag color="green">{intl.formatMessage({ id: 'pages.iotPlatform.statistics.online' })} {state.statistics?.online || 0}</Tag>
            <Tag color="default">{intl.formatMessage({ id: 'pages.iotPlatform.statistics.offline' })} {state.statistics?.offline || 0}</Tag>
            <Tag color="red">{intl.formatMessage({ id: 'pages.iotPlatform.statistics.fault' })} {state.statistics?.fault || 0}</Tag>
          </Space>
        </Space>
      } request={async (params: any, sort: any, filter: any) => {
        const res = await iotService.getDevices({ ...params, search: state.search, sort, filter });
        return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
      }} columns={columns} rowKey="id" search={false}
        rowSelection={{ selectedRowKeys: state.selectedRowKeys, onChange: keys => set({ selectedRowKeys: keys }), preserveSelectedRowKeys: true }}
        scroll={{ x: 'max-content' }}
        toolBarRender={() => [
          <Input.Search
            key="search"
            placeholder={intl.formatMessage({ id: 'pages.common.search' })}
            allowClear
            value={state.search}
            onChange={(e) => set({ search: e.target.value })}
            onSearch={(value) => { set({ search: value }); actionRef.current?.reload(); }}
            style={{ width: 260, marginRight: 8 }}
          />,
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => { set({ editingDevice: null, formVisible: true }); form.resetFields(); }}>{intl.formatMessage({ id: 'pages.iotPlatform.button.create' })}</Button>,
        ]}
      />

      <ModalForm key={state.editingDevice?.id || 'create'} title={state.editingDevice ? intl.formatMessage({ id: 'pages.iotPlatform.device.edit' }) : intl.formatMessage({ id: 'pages.iotPlatform.device.create' })} open={state.formVisible} onOpenChange={(open) => { if (!open) set({ formVisible: false, editingDevice: null }); }}
        form={form} onFinish={handleSubmit} width={isMobile ? '100%' : 640}
      >
        <Row gutter={12}>
          <Col span={12}><ProFormText name="name" label={intl.formatMessage({ id: 'pages.iotPlatform.device.name' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.iotPlatform.device.nameRequired' }) }]} placeholder={intl.formatMessage({ id: 'pages.iotPlatform.device.namePlaceholder' })} /></Col>
          <Col span={12}><ProFormText name="title" label={intl.formatMessage({ id: 'pages.iotPlatform.device.title' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.iotPlatform.device.titleRequired' }) }]} placeholder={intl.formatMessage({ id: 'pages.iotPlatform.device.titlePlaceholder' })} /></Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}><ProFormText name="deviceId" label={intl.formatMessage({ id: 'pages.iotPlatform.device.deviceId' })} tooltip={intl.formatMessage({ id: 'pages.iotPlatform.device.deviceIdTooltip' })} placeholder={intl.formatMessage({ id: 'pages.iotPlatform.device.deviceIdPlaceholder' })} /></Col>
          <Col span={12}><ProFormSelect name="deviceType" label={intl.formatMessage({ id: 'pages.iotPlatform.device.type' })} initialValue="Sensor" options={DEVICE_TYPE_OPTIONS} /></Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}><ProFormSelect name="gatewayId" label={intl.formatMessage({ id: 'pages.iotPlatform.device.gateway' })} tooltip={intl.formatMessage({ id: 'pages.iotPlatform.device.gatewayTooltip' })} placeholder={intl.formatMessage({ id: 'pages.iotPlatform.device.gatewayPlaceholder' })} allowClear options={state.gateways.map(g => ({ label: g.title, value: g.gatewayId }))} /></Col>
          <Col span={12}><ProFormText name="location" label={intl.formatMessage({ id: 'pages.iotPlatform.device.location' })} placeholder={intl.formatMessage({ id: 'pages.iotPlatform.device.locationPlaceholder' })} /></Col>
        </Row>
        <ProFormTextArea name="description" label={intl.formatMessage({ id: 'pages.iotPlatform.device.description' })} placeholder={intl.formatMessage({ id: 'pages.iotPlatform.device.descriptionPlaceholder' })} />
        <ProFormSelect mode="tags" name="tagsList" label={intl.formatMessage({ id: 'pages.iotPlatform.device.tags' })} tooltip={intl.formatMessage({ id: 'pages.iotPlatform.device.tagsTooltip' })} placeholder={intl.formatMessage({ id: 'pages.iotPlatform.device.tagsPlaceholder' })} />
        <ProFormDigit name="retentionDays" label={intl.formatMessage({ id: 'pages.iotPlatform.device.retentionDays' })} initialValue={0} tooltip={intl.formatMessage({ id: 'pages.iotPlatform.device.retentionDaysTooltip' })} min={0} max={3650} fieldProps={{ addonAfter: intl.formatMessage({ id: 'pages.iotPlatform.device.retentionDaysAddon' })}} />
      </ModalForm>

      <Modal title={<><KeyOutlined style={{ color: '#faad14', marginRight: 8 }} />{intl.formatMessage({ id: 'pages.iotPlatform.device.apiKeyModalTitle' })}</>} open={state.apiKeyModalVisible} onOk={() => set({ apiKeyModalVisible: false })} onCancel={() => set({ apiKeyModalVisible: false })} cancelButtonProps={{ style: { display: 'none' } }} okText={intl.formatMessage({ id: 'pages.iotPlatform.device.apiKeyCopied' })}>
        <Alert type="warning" showIcon message={intl.formatMessage({ id: 'pages.iotPlatform.device.apiKeyWarning' })} description={intl.formatMessage({ id: 'pages.iotPlatform.device.apiKeyWarningDesc' })} style={{ marginBottom: 16 }} />
        {state.apiKeyResult && (
          <>
            <ProDescriptions size="small" column={1} bordered>
              <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.device.deviceId' })}>{state.apiKeyResult.deviceId}</ProDescriptions.Item>
              <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.device.generatedAt' })}>{dayjs(state.apiKeyResult.generatedAt).format('YYYY-MM-DD HH:mm:ss')}</ProDescriptions.Item>
            </ProDescriptions>
            <div style={{ marginTop: 12 }}>
              <span style={{ display: 'block', marginBottom: 6, color: '#666' }}>Primary Key（明文）</span>
              <div style={{ fontFamily: 'monospace', fontSize: 13, padding: '10px 14px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, wordBreak: 'break-all', userSelect: 'all' }}>{state.apiKeyResult.apiKey}</div>
            </div>
          </>
        )}
      </Modal>

      <Drawer title={<Space><DesktopOutlined />{intl.formatMessage({ id: 'pages.iotPlatform.device.detail' })} — {state.viewingDevice?.title}</Space>} placement="right" open={state.detailVisible} onClose={() => set({ detailVisible: false, viewingDevice: null, deviceStatistics: null })} size="large">
        {state.viewingDevice && (
          <Tabs defaultActiveKey="info" items={[
            { key: 'info', label: <><DesktopOutlined /> {intl.formatMessage({ id: 'pages.iotPlatform.device.basicInfo' })}</>, children: (
              <>
                <ProCard title={intl.formatMessage({ id: 'pages.iotPlatform.device.infoCard' })} size="small" style={{ marginBottom: 12 }}>
                  <ProDescriptions column={isMobile ? 1 : 2} size="small">
                    <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.device.name' })} span={2}>{state.viewingDevice.title}</ProDescriptions.Item>
                    <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.device.deviceId' })}>{state.viewingDevice.deviceId}</ProDescriptions.Item>
                    <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.device.type' })}><Tag color={deviceTypeColor[state.viewingDevice.deviceType ?? 'Sensor']}>{deviceTypeLabel[state.viewingDevice.deviceType ?? 'Sensor'] ?? state.viewingDevice.deviceType}</Tag></ProDescriptions.Item>
                    <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.device.columns.status' })}>{(() => { const cfg = statusConfig[state.viewingDevice.status ?? 'Offline'] ?? statusConfig.Offline; return <Tag color={cfg.color}>{cfg.label}</Tag>; })()}</ProDescriptions.Item>
                    <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.device.columns.enabled' })}><Tag color={state.viewingDevice.isEnabled ? 'green' : 'red'}>{state.viewingDevice.isEnabled ? intl.formatMessage({ id: 'pages.iotPlatform.datapoint.yes' }) : intl.formatMessage({ id: 'pages.iotPlatform.datapoint.no' })}</Tag></ProDescriptions.Item>
                    <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.device.gateway' })}>{state.gateways.find(g => g.gatewayId === state.viewingDevice!.gatewayId)?.title || state.viewingDevice!.gatewayId || '-'}</ProDescriptions.Item>
                    <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.device.location' })}>{state.viewingDevice.location || '-'}</ProDescriptions.Item>
                    <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.device.description' })} span={2}>{state.viewingDevice.description || '-'}</ProDescriptions.Item>
                    <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.device.tags' })} span={2}>{state.viewingDevice.tags && Object.keys(state.viewingDevice.tags).length > 0 ? <Space size={4} wrap>{Object.entries(state.viewingDevice.tags).map(([k, v]) => <Tag key={k} color="blue">{k}{v ? `:${v}` : ''}</Tag>)}</Space> : '-'}</ProDescriptions.Item>
                    <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.device.retentionDays' })}>{(!state.viewingDevice.retentionDays || state.viewingDevice.retentionDays === 0) ? intl.formatMessage({ id: 'pages.iotPlatform.device.retentionPermanent' }) : `${state.viewingDevice.retentionDays} ${intl.formatMessage({ id: 'pages.iotPlatform.device.days' })}`}</ProDescriptions.Item>
                    <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.device.lastReported' })}>{state.viewingDevice.lastReportedAt ? dayjs(state.viewingDevice.lastReportedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</ProDescriptions.Item>
                  </ProDescriptions>
                </ProCard>
                <ProCard title={<><KeyOutlined style={{ marginRight: 6 }} />{intl.formatMessage({ id: 'pages.iotPlatform.device.authKey' })}</>} size="small" style={{ marginBottom: 12 }} extra={<Button size="small" icon={<KeyOutlined />} loading={state.generatingKey} onClick={() => handleGenerateApiKey(state.viewingDevice!)}>{state.viewingDevice!.hasApiKey ? intl.formatMessage({ id: 'pages.iotPlatform.device.resetKey' }) : intl.formatMessage({ id: 'pages.iotPlatform.device.generateKey' })}</Button>}>
                  <Alert type={state.viewingDevice.hasApiKey ? 'success' : 'warning'} showIcon message={state.viewingDevice.hasApiKey ? intl.formatMessage({ id: 'pages.iotPlatform.device.keyConfigured' }) : intl.formatMessage({ id: 'pages.iotPlatform.device.keyNotConfigured' })} />
                </ProCard>
                {state.deviceStatistics && (
                  <ProCard title={intl.formatMessage({ id: 'pages.iotPlatform.device.dataStats' })} size="small">
                    <ProDescriptions column={isMobile ? 1 : 2} size="small">
                      <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.device.dataPointsTotal' })}>{state.deviceStatistics.totalDataPoints}</ProDescriptions.Item>
                      <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.enabledStatus' })}>{state.deviceStatistics.enabledDataPoints}</ProDescriptions.Item>
                      <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.device.dataRecords' })}>{state.deviceStatistics.totalDataRecords}</ProDescriptions.Item>
                      <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.device.unhandledAlarms' })}><Tag color={state.deviceStatistics.unhandledAlarms > 0 ? 'red' : 'green'}>{state.deviceStatistics.unhandledAlarms}</Tag></ProDescriptions.Item>
                    </ProDescriptions>
                  </ProCard>
                )}
              </>
            )},
            { key: 'twin', label: <><BranchesOutlined /> {intl.formatMessage({ id: 'pages.iotPlatform.device.deviceTwin' })}</>, children: <DeviceTwinPanel deviceId={state.viewingDevice!.deviceId} /> },
            { key: 'commands', label: <><SendOutlined /> {intl.formatMessage({ id: 'pages.iotPlatform.device.commandControl' })}</>, children: <CommandCenterPanel deviceId={state.viewingDevice!.deviceId} /> },
          ]} />
        )}
      </Drawer>
    </>
  );
});

DeviceManagement.displayName = 'DeviceManagement';
export default DeviceManagement;
