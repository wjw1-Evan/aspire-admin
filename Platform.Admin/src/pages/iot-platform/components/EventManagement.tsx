import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useIntl } from '@umijs/max';
import { type ProColumns, ActionType, ProTable } from '@ant-design/pro-table';
import { ModalForm, ProFormTextArea } from '@ant-design/pro-components';
import { Button, Form, Grid, Input, Space, Tag, message } from 'antd';
import { CheckOutlined, AlertOutlined, CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { iotService, IoTDeviceEvent, IoTDevice } from '@/services/iotService';

const { useBreakpoint } = Grid;

export interface EventManagementRef { reload: () => void; refreshStats: () => void; }

const LEVEL_MAP: Record<string, { color: string; label: string }> = { Info: { color: 'blue', label: '信息' }, Warning: { color: 'orange', label: '警告' }, Error: { color: 'red', label: '错误' }, Critical: { color: 'red', label: '严重' } };

const EventManagement = React.forwardRef<EventManagementRef, any>((props, ref) => {
  const intl = useIntl();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [form] = Form.useForm();

  const [state, setState] = useState({
    devices: [] as IoTDevice[],
    statistics: null as { total: number; unhandled: number; handled: number; critical: number } | null,
    editingEvent: null as IoTDeviceEvent | null,
    formVisible: false,
    sorter: undefined as { sortBy: string; sortOrder: string } | undefined,
    search: '',
  });
  const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

  const fetchStatistics = useCallback(async () => {
    try {
      const response = await iotService.getUnhandledEventCount();
      if (response.success && response.data) set({ statistics: { total: 0, unhandled: response.data.count || 0, handled: 0, critical: 0 } });
    } catch {}
  }, []);

  const loadDevices = useCallback(async () => {
    try {
      const response = await iotService.getDevices({});
      if (response.success && response.data) set({ devices: response.data.queryable || [] });
    } catch {}
  }, []);

  useEffect(() => { loadDevices(); fetchStatistics(); }, [loadDevices, fetchStatistics]);

  const columns: ProColumns<IoTDeviceEvent>[] = [
    { title: '所属设备', dataIndex: 'deviceId', sorter: true, render: (dom) => state.devices.find(d => d.deviceId === dom)?.title || dom },
    { title: '事件类型', dataIndex: 'eventType', sorter: true },
    { title: '级别', dataIndex: 'level', sorter: true, render: (dom) => { const config = LEVEL_MAP[dom as string] || { color: 'default', label: dom as string }; return <Tag color={config.color}>{config.label}</Tag>; } },
    { title: '描述', dataIndex: 'description', sorter: true, ellipsis: true },
    { title: '发生时间', dataIndex: 'occurredAt', sorter: true, render: (dom) => dom ? dayjs(dom as string).format('YYYY-MM-DD HH:mm:ss') : '-' },
    { title: '状态', dataIndex: 'isHandled', sorter: true, render: (dom) => <Tag color={dom ? 'green' : 'red'}>{dom ? '已处理' : '未处理'}</Tag> },
    { title: '操作', valueType: 'option', fixed: 'right', width: 100, render: (_, record) => !record.isHandled ? <Button type="link" size="small" icon={<CheckOutlined />} onClick={() => set({ editingEvent: record, formVisible: true })}>处理</Button> : null },
  ];

  const handleSubmit = useCallback(async (values: any) => {
    if (!state.editingEvent) return;
    const res = await iotService.handleEvent(state.editingEvent.id, values.remarks || '');
    if (res.success) message.success('事件已处理');
    set({ formVisible: false, editingEvent: null });
    actionRef.current?.reload();
    fetchStatistics();
  }, [state.editingEvent, fetchStatistics]);

  return (
    <>
      <ProTable actionRef={actionRef} headerTitle={
        <Space size={24}>
          <Space><AlertOutlined />事件管理</Space>
          <Space size={12}>
            <Tag color="blue">总数 {state.statistics?.total || 0}</Tag>
            <Tag color="red">未处理 {state.statistics?.unhandled || 0}</Tag>
            <Tag color="green">已处理 {state.statistics?.handled || 0}</Tag>
            <Tag color="orange">严重 {state.statistics?.critical || 0}</Tag>
          </Space>
        </Space>
      } request={async (params: any) => {
        const { current, pageSize } = params;
        const sortParams = state.sorter?.sortBy && state.sorter?.sortOrder ? state.sorter : undefined;
        const res = await iotService.queryEvents({ page: current, pageSize, search: state.search, ...sortParams });
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
            style={{ width: 260 }}
          />,
        ]}
      />

      <ModalForm title="处理事件" open={state.formVisible} onOpenChange={(open) => { if (!open) set({ formVisible: false, editingEvent: null }); }}
        form={form} onFinish={handleSubmit} width={isMobile ? '100%' : 600}
      >
        {state.editingEvent && (
          <>
            <div style={{ marginBottom: 16 }}><div style={{ color: '#666', marginBottom: 4 }}>事件类型</div><div style={{ fontSize: 14 }}>{state.editingEvent.eventType}</div></div>
            <div style={{ marginBottom: 16 }}><div style={{ color: '#666', marginBottom: 4 }}>事件描述</div><div style={{ fontSize: 14 }}>{state.editingEvent.description}</div></div>
            <div style={{ marginBottom: 16 }}><div style={{ color: '#666', marginBottom: 4 }}>发生时间</div><div style={{ fontSize: 14 }}>{dayjs(state.editingEvent.occurredAt).format('YYYY-MM-DD HH:mm:ss')}</div></div>
          </>
        )}
        <ProFormTextArea name="remarks" label="处理备注" rules={[{ required: true, message: '请输入处理备注' }]} placeholder="请输入处理备注" />
      </ModalForm>
    </>
  );
});

EventManagement.displayName = 'EventManagement';
export default EventManagement;
