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
    sorter: undefined as { sortBy: string; sortOrder: string } | undefined,
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
    { title: '设备名称', dataIndex: 'title', sorter: true, render: (dom, record) => <a onClick={() => set({ viewingDevice: record, detailVisible: true })}>{dom as string}</a> },
    { title: '类型', dataIndex: 'deviceType', sorter: true, render: (dom) => <Tag color={deviceTypeColor[dom as string] ?? 'default'}>{deviceTypeLabel[dom as string] ?? dom}</Tag> },
    { title: '所属网关', dataIndex: 'gatewayId', sorter: true, render: (dom) => state.gateways.find(g => g.gatewayId === (dom as string))?.title || (dom ? <Tag>{dom}</Tag> : <Tag color="default">独立设备</Tag>) },
    { title: '位置', dataIndex: 'location', sorter: true },
    { title: '状态', dataIndex: 'status', sorter: true, render: (dom) => { const cfg = statusConfig[dom as string] ?? statusConfig.Offline; return <Tag color={cfg.color}>{cfg.label}</Tag>; } },
    { title: '启用', dataIndex: 'isEnabled', sorter: true, render: (dom) => <Tag color={dom ? 'green' : 'red'}>{dom ? '是' : '否'}</Tag> },
    { title: '操作', valueType: 'option', fixed: 'right', width: 180, render: (_, record) => (
      <Space size={4}>
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { set({ editingDevice: record, formVisible: true }); form.setFieldsValue({ ...record, tagsList: record.tags ? Object.entries(record.tags).map(([k, v]) => `${k}:${v}`) : [] }); }}>编辑</Button>
        <Button type="link" size="small" loading={state.generatingKey} onClick={() => handleGenerateApiKey(record)}>密钥</Button>
        <Popconfirm title={`确定删除「${record.name}」？`} onConfirm={async () => { const res = await iotService.deleteDevice(record.id); if (res.success) { message.success('删除成功'); actionRef.current?.reload(); fetchStatistics(); } }}>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      </Space>
    )},
  ];

  const handleSubmit = useCallback(async (values: any) => {
    const tags: Record<string, string> = {};
    (values.tagsList || []).forEach((t: string) => { const idx = t.indexOf(':'); if (idx > 0) { tags[t.slice(0, idx).trim()] = t.slice(idx + 1).trim(); } else { tags[t.trim()] = ''; } });
    const payload = { ...values, tags, tagsList: undefined };
    const res = state.editingDevice ? await iotService.updateDevice(state.editingDevice.id, payload) : await iotService.createDevice(payload);
    if (res.success) message.success(state.editingDevice ? '更新成功' : '创建成功');
    set({ formVisible: false, editingDevice: null });
    actionRef.current?.reload();
    fetchStatistics();
  }, [state.editingDevice, fetchStatistics]);

  const handleGenerateApiKey = useCallback(async (device: IoTDevice) => {
    set({ generatingKey: true });
    try {
      const res = await iotService.generateApiKey(device.deviceId);
      if (res.success && res.data) set({ apiKeyResult: res.data, apiKeyModalVisible: true });
    } catch { message.error('生成 ApiKey 失败'); }
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
      title: `批量删除设备`, content: `确定要删除已选的 ${state.selectedRowKeys.length} 个设备吗？该操作不可恢复。`, okButtonProps: { danger: true },
      onOk: async () => {
        set({ batchDeleting: true });
        try {
          const res = await iotService.batchDeleteDevices(state.selectedRowKeys as string[]);
          if (res.success && res.data) {
            message.success(`成功删除 ${res.data.deletedCount} 个设备`);
            set({ selectedRowKeys: [] });
            actionRef.current?.reload();
            fetchStatistics();
          }
        } catch { message.error('批量删除失败'); }
        finally { set({ batchDeleting: false }); }
      },
    });
  }, [state.selectedRowKeys, confirm, fetchStatistics]);

  return (
    <>
      {state.selectedRowKeys.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', marginBottom: 8, background: '#e6f4ff', border: '1px solid #91caff', borderRadius: 8 }}>
          <span style={{ color: '#1677ff', fontWeight: 500 }}>已选择 <strong>{state.selectedRowKeys.length}</strong> 个设备</span>
          <Button danger size="small" icon={<DeleteOutlined />} loading={state.batchDeleting} onClick={handleBatchDelete}>批量删除</Button>
          <Button size="small" onClick={() => set({ selectedRowKeys: [] })}>取消选择</Button>
        </div>
      )}

      <ProTable actionRef={actionRef} headerTitle={
        <Space size={24}>
          <Space><DesktopOutlined />设备管理</Space>
          <Space size={12}>
            <Tag color="blue">总数 {state.statistics?.total || 0}</Tag>
            <Tag color="green">在线 {state.statistics?.online || 0}</Tag>
            <Tag color="default">离线 {state.statistics?.offline || 0}</Tag>
            <Tag color="red">故障 {state.statistics?.fault || 0}</Tag>
          </Space>
        </Space>
      } request={async (params: any) => {
        const { current, pageSize } = params;
        const sortParams = state.sorter?.sortBy && state.sorter?.sortOrder ? state.sorter : undefined;
        const res = await iotService.getDevices({ page: current, pageSize, search: state.search, ...sortParams });
        return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
      }} columns={columns} rowKey="id" search={false}
        rowSelection={{ selectedRowKeys: state.selectedRowKeys, onChange: keys => set({ selectedRowKeys: keys }), preserveSelectedRowKeys: true }}
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
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => { set({ editingDevice: null, formVisible: true }); form.resetFields(); }}>新建</Button>,
        ]}
      />

      <ModalForm title={state.editingDevice ? '编辑设备' : '新建设备'} open={state.formVisible} onOpenChange={(open) => { if (!open) set({ formVisible: false, editingDevice: null }); }}
        form={form} onFinish={handleSubmit} width={isMobile ? '100%' : 640}
      >
        <Row gutter={12}>
          <Col span={12}><ProFormText name="name" label="设备名称" rules={[{ required: true, message: '请输入设备名称' }]} placeholder="请输入设备名称" /></Col>
          <Col span={12}><ProFormText name="title" label="设备标题" rules={[{ required: true, message: '请输入设备标题' }]} placeholder="请输入设备标题" /></Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}><ProFormText name="deviceId" label="设备标识符" tooltip="设备的唯一标识符，不提供则自动生成" placeholder="留空则自动生成" /></Col>
          <Col span={12}><ProFormSelect name="deviceType" label="设备类型" initialValue="Sensor" options={DEVICE_TYPE_OPTIONS} /></Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}><ProFormSelect name="gatewayId" label="所属网关" tooltip="设备可以独立存在，也可以关联到网关" placeholder="请选择所属网关（可选）" allowClear options={state.gateways.map(g => ({ label: g.title, value: g.gatewayId }))} /></Col>
          <Col span={12}><ProFormText name="location" label="物理位置" placeholder="如: 1号楼/3层/机房A" /></Col>
        </Row>
        <ProFormTextArea name="description" label="设备描述" placeholder="设备描述（可选）" />
        <ProFormSelect mode="tags" name="tagsList" label="标签 (Tags)" tooltip='格式: "key:value" 或 "key"，支持多个' placeholder='输入标签，格式: "env:prod" 或 "building:A"' />
        <ProFormDigit name="retentionDays" label="遥测数据保留天数" initialValue={0} tooltip="0 表示永久保留，最大 3650 天" min={0} max={3650} fieldProps={{ addonAfter: '天（0=永久）' }} />
      </ModalForm>

      <Modal title={<><KeyOutlined style={{ color: '#faad14', marginRight: 8 }} />设备 ApiKey 已生成</>} open={state.apiKeyModalVisible} onOk={() => set({ apiKeyModalVisible: false })} onCancel={() => set({ apiKeyModalVisible: false })} cancelButtonProps={{ style: { display: 'none' } }} okText="我已复制，关闭">
        <Alert type="warning" showIcon message="重要提示" description="此密钥仅显示一次，关闭后将无法再次查看。请立即复制并安全保存。" style={{ marginBottom: 16 }} />
        {state.apiKeyResult && (
          <>
            <ProDescriptions size="small" column={1} bordered>
              <ProDescriptions.Item label="设备 ID">{state.apiKeyResult.deviceId}</ProDescriptions.Item>
              <ProDescriptions.Item label="生成时间">{dayjs(state.apiKeyResult.generatedAt).format('YYYY-MM-DD HH:mm:ss')}</ProDescriptions.Item>
            </ProDescriptions>
            <div style={{ marginTop: 12 }}>
              <span style={{ display: 'block', marginBottom: 6, color: '#666' }}>Primary Key（明文）</span>
              <div style={{ fontFamily: 'monospace', fontSize: 13, padding: '10px 14px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, wordBreak: 'break-all', userSelect: 'all' }}>{state.apiKeyResult.apiKey}</div>
            </div>
          </>
        )}
      </Modal>

      <Drawer title={<Space><DesktopOutlined />设备详情 — {state.viewingDevice?.title}</Space>} placement="right" open={state.detailVisible} onClose={() => set({ detailVisible: false, viewingDevice: null, deviceStatistics: null })} size="large">
        {state.viewingDevice && (
          <Tabs defaultActiveKey="info" items={[
            { key: 'info', label: <><DesktopOutlined /> 基本信息</>, children: (
              <>
                <ProCard title="设备信息" size="small" style={{ marginBottom: 12 }}>
                  <ProDescriptions column={isMobile ? 1 : 2} size="small">
                    <ProDescriptions.Item label="设备名称" span={2}>{state.viewingDevice.title}</ProDescriptions.Item>
                    <ProDescriptions.Item label="设备 ID">{state.viewingDevice.deviceId}</ProDescriptions.Item>
                    <ProDescriptions.Item label="设备类型"><Tag color={deviceTypeColor[state.viewingDevice.deviceType ?? 'Sensor']}>{deviceTypeLabel[state.viewingDevice.deviceType ?? 'Sensor'] ?? state.viewingDevice.deviceType}</Tag></ProDescriptions.Item>
                    <ProDescriptions.Item label="状态">{(() => { const cfg = statusConfig[state.viewingDevice.status ?? 'Offline'] ?? statusConfig.Offline; return <Tag color={cfg.color}>{cfg.label}</Tag>; })()}</ProDescriptions.Item>
                    <ProDescriptions.Item label="启用"><Tag color={state.viewingDevice.isEnabled ? 'green' : 'red'}>{state.viewingDevice.isEnabled ? '是' : '否'}</Tag></ProDescriptions.Item>
                    <ProDescriptions.Item label="所属网关">{state.gateways.find(g => g.gatewayId === state.viewingDevice!.gatewayId)?.title || state.viewingDevice!.gatewayId || '-'}</ProDescriptions.Item>
                    <ProDescriptions.Item label="物理位置">{state.viewingDevice.location || '-'}</ProDescriptions.Item>
                    <ProDescriptions.Item label="描述" span={2}>{state.viewingDevice.description || '-'}</ProDescriptions.Item>
                    <ProDescriptions.Item label="标签" span={2}>{state.viewingDevice.tags && Object.keys(state.viewingDevice.tags).length > 0 ? <Space size={4} wrap>{Object.entries(state.viewingDevice.tags).map(([k, v]) => <Tag key={k} color="blue">{k}{v ? `:${v}` : ''}</Tag>)}</Space> : '-'}</ProDescriptions.Item>
                    <ProDescriptions.Item label="数据保留">{(!state.viewingDevice.retentionDays || state.viewingDevice.retentionDays === 0) ? '永久保留' : `${state.viewingDevice.retentionDays} 天`}</ProDescriptions.Item>
                    <ProDescriptions.Item label="最后上报">{state.viewingDevice.lastReportedAt ? dayjs(state.viewingDevice.lastReportedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</ProDescriptions.Item>
                  </ProDescriptions>
                </ProCard>
                <ProCard title={<><KeyOutlined style={{ marginRight: 6 }} />认证密钥</>} size="small" style={{ marginBottom: 12 }} extra={<Button size="small" icon={<KeyOutlined />} loading={state.generatingKey} onClick={() => handleGenerateApiKey(state.viewingDevice!)}>{state.viewingDevice!.hasApiKey ? '重置密钥' : '生成密钥'}</Button>}>
                  <Alert type={state.viewingDevice.hasApiKey ? 'success' : 'warning'} showIcon message={state.viewingDevice.hasApiKey ? '设备 ApiKey 已配置，设备可使用密钥进行认证。' : '设备尚未配置 ApiKey，点击"生成密钥"创建认证凭据。'} />
                </ProCard>
                {state.deviceStatistics && (
                  <ProCard title="数据统计" size="small">
                    <ProDescriptions column={isMobile ? 1 : 2} size="small">
                      <ProDescriptions.Item label="数据点总数">{state.deviceStatistics.totalDataPoints}</ProDescriptions.Item>
                      <ProDescriptions.Item label="已启用">{state.deviceStatistics.enabledDataPoints}</ProDescriptions.Item>
                      <ProDescriptions.Item label="数据记录">{state.deviceStatistics.totalDataRecords}</ProDescriptions.Item>
                      <ProDescriptions.Item label="未处理告警"><Tag color={state.deviceStatistics.unhandledAlarms > 0 ? 'red' : 'green'}>{state.deviceStatistics.unhandledAlarms}</Tag></ProDescriptions.Item>
                    </ProDescriptions>
                  </ProCard>
                )}
              </>
            )},
            { key: 'twin', label: <><BranchesOutlined /> 设备孪生</>, children: <DeviceTwinPanel deviceId={state.viewingDevice!.deviceId} /> },
            { key: 'commands', label: <><SendOutlined /> 命令控制</>, children: <CommandCenterPanel deviceId={state.viewingDevice!.deviceId} /> },
          ]} />
        )}
      </Drawer>
    </>
  );
});

DeviceManagement.displayName = 'DeviceManagement';
export default DeviceManagement;
