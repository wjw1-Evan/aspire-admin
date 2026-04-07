import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useIntl } from '@umijs/max';
import { type ProColumns, ActionType, ProTable } from '@ant-design/pro-table';
import { ModalForm, ProFormText, ProFormSelect, ProFormDigit, ProFormSwitch, ProFormTextArea } from '@ant-design/pro-components';
import { Button, Col, Drawer, Form, Grid, Input, Row, Space, Tag, message, Popconfirm } from 'antd';
import { ProCard, ProDescriptions } from '@ant-design/pro-components';
import { PlusOutlined, EditOutlined, DeleteOutlined, DatabaseOutlined, CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { iotService, IoTDataPoint, IoTDevice } from '@/services/iotService';
import { useModal } from '@/hooks/useModal';

const { useBreakpoint } = Grid;

export interface DataPointManagementRef { reload: () => void; refreshStats: () => void; handleAdd: () => void; }

const DATA_TYPE_OPTIONS = [
  { label: '数值', value: 'Numeric' },
  { label: '布尔', value: 'Boolean' },
  { label: '字符串', value: 'String' },
  { label: '枚举', value: 'Enum' },
  { label: 'JSON', value: 'Json' },
];

const DATA_TYPE_LABELS: Record<string, string> = { Numeric: '数值', Boolean: '布尔', String: '字符串', Enum: '枚举', Json: 'JSON' };

const DataPointManagement = React.forwardRef<DataPointManagementRef, any>((props, ref) => {
  const intl = useIntl();
  const { confirm } = useModal();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [form] = Form.useForm();

  const [state, setState] = useState({
    devices: [] as IoTDevice[],
    statistics: null as { total: number; enabled: number; disabled: number; withAlarm: number } | null,
    editingDataPoint: null as IoTDataPoint | null,
    formVisible: false,
    detailVisible: false,
    viewingDataPoint: null as IoTDataPoint | null,
    sorter: undefined as { sortBy: string; sortOrder: string } | undefined,
    search: '',
  });
  const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

  const fetchStatistics = useCallback(async () => {
    try {
      const response = await iotService.getDataPoints({});
      if (response.success && response.data) {
        set({ statistics: { total: response.data.rowCount || 0, enabled: 0, disabled: 0, withAlarm: 0 } });
      }
    } catch {}
  }, []);

  const loadDevices = useCallback(async () => {
    try {
      const response = await iotService.getDevices({});
      if (response.success && response.data) set({ devices: response.data.queryable || [] });
    } catch {}
  }, []);

  useEffect(() => { loadDevices(); fetchStatistics(); }, [loadDevices, fetchStatistics]);

  const columns: ProColumns<IoTDataPoint>[] = [
    { title: '数据点名称', dataIndex: 'title', sorter: true, ellipsis: true, render: (dom, record) => <a onClick={() => set({ viewingDataPoint: record, detailVisible: true })}>{dom as string}</a> },
    { title: '所属设备', dataIndex: 'deviceId', sorter: true, render: (dom) => state.devices.find(d => d.deviceId === (dom as string))?.title || (dom as string) },
    { title: '数据类型', dataIndex: 'dataType', sorter: true, render: (dom) => DATA_TYPE_LABELS[dom as string] || (dom as string) },
    { title: '单位', dataIndex: 'unit', sorter: true },
    { title: '采样间隔(秒)', dataIndex: 'samplingInterval', sorter: true },
    { title: '最后采集值', dataIndex: 'lastValue', width: 150, render: (dom, record) => {
      const val = dom as string | null | undefined;
      if (!val) return <span style={{ color: '#999' }}>暂无数据</span>;
      if (record.dataType?.toLowerCase() === 'json') {
        try { const parsed = JSON.parse(val); return <span title={val} style={{ fontFamily: 'monospace', fontSize: '12px' }}>{JSON.stringify(parsed).substring(0, 50)}{val.length > 50 ? '...' : ''}</span>; }
        catch { return <span title={val}>{val.substring(0, 30)}{val.length > 30 ? '...' : ''}</span>; }
      }
      return <span title={val}>{val}{record.unit && <span style={{ color: '#999', marginLeft: 4 }}>{record.unit}</span>}</span>;
    }},
    { title: '最后采集时间', dataIndex: 'lastUpdatedAt', sorter: true, render: (dom) => {
      const dt = dom as string | null | undefined;
      if (!dt) return <span style={{ color: '#999' }}>暂无</span>;
      const date = new Date(dt);
      const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      const timeAgo = diffMins < 1 ? '刚刚' : diffMins < 60 ? `${diffMins}分钟前` : diffHours < 24 ? `${diffHours}小时前` : diffDays < 7 ? `${diffDays}天前` : '';
      return <div><div>{dayjs(dt).format('YYYY-MM-DD HH:mm:ss')}</div>{timeAgo && <div style={{ fontSize: '12px', color: '#999', marginTop: 2 }}>{timeAgo}</div>}</div>;
    }},
    { title: '告警配置', dataIndex: 'alarmConfig', sorter: true, render: (dom) => (dom as any)?.isEnabled ? <Tag color="orange">已配置</Tag> : <Tag color="default">未配置</Tag> },
    { title: '启用', dataIndex: 'isEnabled', sorter: true, render: (dom) => <Tag color={dom ? 'success' : 'default'}>{dom ? '启用' : '禁用'}</Tag> },
    { title: '操作', valueType: 'option', fixed: 'right', width: 180, render: (_, record) => (
      <Space size={4}>
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { set({ editingDataPoint: record, formVisible: true }); form.setFieldsValue(record); }}>编辑</Button>
        <Popconfirm title={`确定删除「${record.name}」？`} onConfirm={async () => { const res = await iotService.deleteDataPoint(record.id); if (res.success) { message.success('删除成功'); actionRef.current?.reload(); fetchStatistics(); } }}>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      </Space>
    )},
  ];

  const handleSubmit = useCallback(async (values: any) => {
    const res = state.editingDataPoint ? await iotService.updateDataPoint(state.editingDataPoint.id, values) : await iotService.createDataPoint(values);
    if (res.success) message.success(state.editingDataPoint ? '更新成功' : '创建成功');
    set({ formVisible: false, editingDataPoint: null });
    actionRef.current?.reload();
    fetchStatistics();
  }, [state.editingDataPoint, fetchStatistics]);

  return (
    <>
      <ProTable actionRef={actionRef} headerTitle={
        <Space size={24}>
          <Space><DatabaseOutlined />数据点管理</Space>
          <Space size={12}>
            <Tag color="blue">总数 {state.statistics?.total || 0}</Tag>
            <Tag color="green">已启用 {state.statistics?.enabled || 0}</Tag>
            <Tag color="default">已禁用 {state.statistics?.disabled || 0}</Tag>
            <Tag color="orange">已配置告警 {state.statistics?.withAlarm || 0}</Tag>
          </Space>
        </Space>
      } request={async (params: any) => {
        const { current, pageSize } = params;
        const sortParams = state.sorter?.sortBy && state.sorter?.sortOrder ? state.sorter : undefined;
        const res = await iotService.getDataPoints({ page: current, pageSize, search: state.search, ...sortParams });
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
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => { set({ editingDataPoint: null, formVisible: true }); form.resetFields(); }}>新建</Button>,
        ]}
      />

      <ModalForm title={state.editingDataPoint ? '编辑数据点' : '新建数据点'} open={state.formVisible} onOpenChange={(open) => { if (!open) set({ formVisible: false, editingDataPoint: null }); }}
        form={form} onFinish={handleSubmit} width={isMobile ? '100%' : 700}
      >
        <Row gutter={12}>
          <Col span={12}><ProFormText name="name" label="数据点名称" rules={[{ required: true, message: '请输入数据点名称' }]} placeholder="请输入数据点名称" /></Col>
          <Col span={12}><ProFormText name="title" label="数据点标题" rules={[{ required: true, message: '请输入数据点标题' }]} placeholder="请输入数据点标题" /></Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}><ProFormSelect name="deviceId" label="所属设备" rules={[{ required: true, message: '请选择所属设备' }]} options={state.devices.map(d => ({ label: d.title, value: d.deviceId }))} placeholder="请选择所属设备" /></Col>
          <Col span={12}><ProFormSelect name="dataType" label="数据类型" rules={[{ required: true, message: '请选择数据类型' }]} options={DATA_TYPE_OPTIONS} placeholder="请选择数据类型" /></Col>
        </Row>
        <Row gutter={12}>
          <Col span={8}><ProFormText name="unit" label="单位" placeholder="请输入单位" /></Col>
          <Col span={8}><ProFormDigit name="minValue" label="最小值" placeholder="请输入最小值" /></Col>
          <Col span={8}><ProFormDigit name="maxValue" label="最大值" placeholder="请输入最大值" /></Col>
        </Row>
        <Row gutter={12}>
          <Col span={8}><ProFormDigit name="precision" label="精度" initialValue={2} min={0} max={10} placeholder="请输入精度" /></Col>
          <Col span={8}><ProFormDigit name="samplingInterval" label="采样间隔(秒)" initialValue={60} min={1} placeholder="请输入采样间隔" /></Col>
          <Col span={4}><ProFormSwitch name="isReadOnly" label="只读" initialValue={true} /></Col>
          <Col span={4}><ProFormSwitch name="isEnabled" label="启用" initialValue={true} /></Col>
        </Row>
        <ProFormTextArea name="description" label="描述" placeholder="请输入描述" />
        <ProFormTextArea name="remarks" label="备注" placeholder="请输入备注" />
      </ModalForm>

      <Drawer title="数据点详情" placement="right" open={state.detailVisible} onClose={() => set({ detailVisible: false, viewingDataPoint: null })} size={isMobile ? 'large' : 800}>
        {state.viewingDataPoint && (
          <>
            <ProCard title="基本信息" style={{ marginBottom: 16 }}>
              <ProDescriptions column={isMobile ? 1 : 2} size="small">
                <ProDescriptions.Item label="数据点名称" span={2}>{state.viewingDataPoint.title}</ProDescriptions.Item>
                <ProDescriptions.Item label="数据点ID">{state.viewingDataPoint.dataPointId}</ProDescriptions.Item>
                <ProDescriptions.Item label="所属设备">{state.devices.find(d => d.deviceId === state.viewingDataPoint!.deviceId)?.title || state.viewingDataPoint!.deviceId || '-'}</ProDescriptions.Item>
                <ProDescriptions.Item label="数据类型"><Tag>{DATA_TYPE_LABELS[state.viewingDataPoint.dataType] || state.viewingDataPoint.dataType}</Tag></ProDescriptions.Item>
                <ProDescriptions.Item label="单位">{state.viewingDataPoint.unit || '-'}</ProDescriptions.Item>
                <ProDescriptions.Item label="采样间隔">{state.viewingDataPoint.samplingInterval} 秒</ProDescriptions.Item>
                <ProDescriptions.Item label="只读"><Tag color={state.viewingDataPoint.isReadOnly ? 'orange' : 'green'}>{state.viewingDataPoint.isReadOnly ? '是' : '否'}</Tag></ProDescriptions.Item>
                <ProDescriptions.Item label="启用状态"><Tag color={state.viewingDataPoint.isEnabled ? 'green' : 'red'}>{state.viewingDataPoint.isEnabled ? '启用' : '禁用'}</Tag></ProDescriptions.Item>
              </ProDescriptions>
            </ProCard>
            {(state.viewingDataPoint.minValue !== undefined || state.viewingDataPoint.maxValue !== undefined) && (
            <ProCard title="数值范围" style={{ marginBottom: 16 }}>
              <ProDescriptions column={isMobile ? 1 : 2} size="small">
                <ProDescriptions.Item label="最小值">{state.viewingDataPoint.minValue !== undefined ? state.viewingDataPoint.minValue : '-'}</ProDescriptions.Item>
                <ProDescriptions.Item label="最大值">{state.viewingDataPoint.maxValue !== undefined ? state.viewingDataPoint.maxValue : '-'}</ProDescriptions.Item>
              </ProDescriptions>
            </ProCard>
            )}
            {state.viewingDataPoint.alarmConfig?.isEnabled && (
            <ProCard title="告警配置" style={{ marginBottom: 16 }}>
              <ProDescriptions column={isMobile ? 1 : 2} size="small">
                <ProDescriptions.Item label="告警状态"><Tag color="orange">已启用</Tag></ProDescriptions.Item>
                <ProDescriptions.Item label="告警类型">{state.viewingDataPoint.alarmConfig.alarmType || '-'}</ProDescriptions.Item>
                <ProDescriptions.Item label="阈值">{state.viewingDataPoint.alarmConfig.threshold || '-'}</ProDescriptions.Item>
                <ProDescriptions.Item label="级别">{state.viewingDataPoint.alarmConfig.level || '-'}</ProDescriptions.Item>
              </ProDescriptions>
            </ProCard>
            )}
            <ProCard title="最后采集数据" style={{ marginBottom: 16 }}>
              {state.viewingDataPoint.lastValue ? (
                <ProDescriptions column={1} size="small">
                  <ProDescriptions.Item label="数据值">{state.viewingDataPoint.lastValue}{state.viewingDataPoint.unit && <span style={{ color: '#999', marginLeft: 4 }}>{state.viewingDataPoint.unit}</span>}</ProDescriptions.Item>
                  {state.viewingDataPoint.lastUpdatedAt && <ProDescriptions.Item label="采集时间">{dayjs(state.viewingDataPoint.lastUpdatedAt).format('YYYY-MM-DD HH:mm:ss')}</ProDescriptions.Item>}
                </ProDescriptions>
              ) : <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>暂无采集数据</div>}
            </ProCard>
            <ProCard title="时间信息">
              <ProDescriptions column={isMobile ? 1 : 2} size="small">
                <ProDescriptions.Item label="创建时间">{state.viewingDataPoint.createdAt ? dayjs(state.viewingDataPoint.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</ProDescriptions.Item>
              </ProDescriptions>
            </ProCard>
          </>
        )}
      </Drawer>
    </>
  );
});

DataPointManagement.displayName = 'DataPointManagement';
export default DataPointManagement;
