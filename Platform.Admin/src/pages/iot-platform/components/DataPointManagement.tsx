import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useIntl } from '@umijs/max';
import { type ProColumns, ActionType, ProTable } from '@ant-design/pro-table';
import { ModalForm, ProFormText, ProFormSelect, ProFormDigit, ProFormSwitch, ProFormTextArea } from '@ant-design/pro-components';
import { Button, Col, Grid, Input, Row, Space, Tag, Popconfirm } from 'antd';
import { ProForm } from '@ant-design/pro-components';
import { Drawer } from 'antd';
import { ProCard, ProDescriptions } from '@ant-design/pro-components';
import { PlusOutlined, EditOutlined, DeleteOutlined, DatabaseOutlined, CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { iotService, IoTDataPoint, IoTDevice } from '@/services/iotService';
import { useModal } from '@/hooks/useModal';
import { useMessage } from '@/hooks/useMessage';

const { useBreakpoint } = Grid;

export interface DataPointManagementRef { reload: () => void; refreshStats: () => void; handleAdd: () => void; }

const DATA_TYPE_OPTIONS = [
  { label: '数值', value: 'Numeric' },
  { label: '布尔', value: 'Boolean' },
  { label: '字符串', value: 'String' },
  { label: '枚举', value: 'Enum' },
  { label: 'JSON', value: 'Json' },
];

const DATA_TYPE_LABELS: Record<string, string> = { Numeric: 'pages.iotPlatform.datapoint.type.numeric', Boolean: 'pages.iotPlatform.datapoint.type.boolean', String: 'pages.iotPlatform.datapoint.type.string', Enum: 'pages.iotPlatform.datapoint.type.enum', Json: 'pages.iotPlatform.datapoint.type.json' };

const DataPointManagement = React.forwardRef<DataPointManagementRef, any>((props, ref) => {
  const intl = useIntl();
  const { confirm } = useModal();
  const message = useMessage();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [form] = ProForm.useForm();

  const [state, setState] = useState({
    devices: [] as IoTDevice[],
    statistics: null as { total: number; enabled: number; disabled: number; withAlarm: number } | null,
    editingDataPoint: null as IoTDataPoint | null,
    formVisible: false,
    detailVisible: false,
    viewingDataPoint: null as IoTDataPoint | null,
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
    { title: intl.formatMessage({ id: 'pages.iotPlatform.datapoint.name' }), dataIndex: 'title', sorter: true, ellipsis: true, render: (dom, record) => <a onClick={() => set({ viewingDataPoint: record, detailVisible: true })}>{dom as string}</a> },
    { title: intl.formatMessage({ id: 'pages.iotPlatform.datapoint.device' }), dataIndex: 'deviceId', sorter: true, render: (dom) => state.devices.find(d => d.deviceId === (dom as string))?.title || (dom as string) },
    { title: intl.formatMessage({ id: 'pages.iotPlatform.datapoint.dataType' }), dataIndex: 'dataType', sorter: true, render: (dom) => intl.formatMessage({ id: DATA_TYPE_LABELS[dom as string]}) },
    { title: intl.formatMessage({ id: 'pages.iotPlatform.datapoint.unit' }), dataIndex: 'unit', sorter: true },
    { title: intl.formatMessage({ id: 'pages.iotPlatform.datapoint.samplingInterval' }), dataIndex: 'samplingInterval', sorter: true },
    { title: intl.formatMessage({ id: 'pages.iotPlatform.datapoint.lastValue' }), dataIndex: 'lastValue', width: 150, render: (dom, record) => {
      const val = dom as string | null | undefined;
      if (!val) return <span style={{ color: '#999' }}>{intl.formatMessage({ id: 'pages.iotPlatform.datapoint.noData' })}</span>;
      if (record.dataType?.toLowerCase() === 'json') {
        try { const parsed = JSON.parse(val); return <span title={val} style={{ fontFamily: 'monospace', fontSize: '12px' }}>{JSON.stringify(parsed).substring(0, 50)}{val.length > 50 ? '...' : ''}</span>; }
        catch { return <span title={val}>{val.substring(0, 30)}{val.length > 30 ? '...' : ''}</span>; }
      }
      return <span title={val}>{val}{record.unit && <span style={{ color: '#999', marginLeft: 4 }}>{record.unit}</span>}</span>;
    }},
    { title: intl.formatMessage({ id: 'pages.iotPlatform.datapoint.lastUpdatedAt' }), dataIndex: 'lastUpdatedAt', sorter: true, render: (dom) => {
      const dt = dom as string | null | undefined;
      if (!dt) return <span style={{ color: '#999' }}>{intl.formatMessage({ id: 'pages.iotPlatform.datapoint.noData' })}</span>;
      const date = new Date(dt);
      const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      const timeAgo = diffMins < 1 ? intl.formatMessage({ id: 'pages.iotPlatform.datapoint.justNow' }) : diffMins < 60 ? `${diffMins}${intl.formatMessage({ id: 'pages.iotPlatform.datapoint.minutesAgo' })}` : diffHours < 24 ? `${diffHours}${intl.formatMessage({ id: 'pages.iotPlatform.datapoint.hoursAgo' })}` : diffDays < 7 ? `${diffDays}${intl.formatMessage({ id: 'pages.iotPlatform.datapoint.daysAgo' })}` : '';
      return <div><div>{dayjs(dt).format('YYYY-MM-DD HH:mm:ss')}</div>{timeAgo && <div style={{ fontSize: '12px', color: '#999', marginTop: 2 }}>{timeAgo}</div>}</div>;
    }},
    { title: intl.formatMessage({ id: 'pages.iotPlatform.datapoint.alarmConfig' }), dataIndex: 'alarmConfig', sorter: true, render: (dom) => (dom as any)?.isEnabled ? <Tag color="orange">{intl.formatMessage({ id: 'pages.iotPlatform.datapoint.alarmConfigured' })}</Tag> : <Tag color="default">{intl.formatMessage({ id: 'pages.iotPlatform.datapoint.alarmNotConfigured' })}</Tag> },
    { title: intl.formatMessage({ id: 'pages.iotPlatform.datapoint.enabled' }), dataIndex: 'isEnabled', sorter: true, render: (dom) => <Tag color={dom ? 'success' : 'default'}>{dom ? intl.formatMessage({ id: 'pages.iotPlatform.datapoint.enabledStatus' }) : intl.formatMessage({ id: 'pages.iotPlatform.datapoint.disabledStatus' })}</Tag> },
    { title: intl.formatMessage({ id: 'pages.iotPlatform.table.action' }), valueType: 'option', fixed: 'right', width: 180, render: (_, record) => (
      <Space size={4}>
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { set({ editingDataPoint: record, formVisible: true }); form.setFieldsValue(record); }}>{intl.formatMessage({ id: 'pages.table.edit' })}</Button>
        <Popconfirm title={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.deleteConfirm' }, { name: record.name })} onConfirm={async () => { const res = await iotService.deleteDataPoint(record.id); if (res.success) { message.success(intl.formatMessage({ id: 'pages.iotPlatform.datapoint.message.deleteSuccess' })); actionRef.current?.reload(); fetchStatistics(); } }}>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>{intl.formatMessage({ id: 'pages.iotPlatform.datapoint.delete' })}</Button>
        </Popconfirm>
      </Space>
    )},
  ];

  const handleSubmit = useCallback(async (values: any) => {
    const res = state.editingDataPoint ? await iotService.updateDataPoint(state.editingDataPoint.id, values) : await iotService.createDataPoint(values);
    if (res.success) message.success(state.editingDataPoint ? intl.formatMessage({ id: 'pages.iotPlatform.datapoint.message.updateSuccess' }) : intl.formatMessage({ id: 'pages.iotPlatform.datapoint.message.createSuccess' }));
    set({ formVisible: false, editingDataPoint: null });
    actionRef.current?.reload();
    fetchStatistics();
  }, [state.editingDataPoint, fetchStatistics]);

  return (
    <>
      <ProTable actionRef={actionRef} headerTitle={
        <Space size={24}>
          <Space><DatabaseOutlined />{intl.formatMessage({ id: 'pages.iotPlatform.datapoint.tabTitle' })}</Space>
          <Space size={12}>
            <Tag color="blue">{intl.formatMessage({ id: 'pages.iotPlatform.statistics.total' })} {state.statistics?.total || 0}</Tag>
            <Tag color="green">{intl.formatMessage({ id: 'pages.iotPlatform.datapoint.enabledStatus' })} {state.statistics?.enabled || 0}</Tag>
            <Tag color="default">{intl.formatMessage({ id: 'pages.iotPlatform.datapoint.disabledStatus' })} {state.statistics?.disabled || 0}</Tag>
            <Tag color="orange">{intl.formatMessage({ id: 'pages.iotPlatform.datapoint.alarmConfigured' })} {state.statistics?.withAlarm || 0}</Tag>
          </Space>
        </Space>
      } request={async (params: any, sort: any, filter: any) => {
        const res = await iotService.getDataPoints({ ...params, search: state.search, sort, filter });
        return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
      }} columns={columns} rowKey="id" search={false}
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
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => { set({ editingDataPoint: null, formVisible: true }); form.resetFields(); }}>{intl.formatMessage({ id: 'pages.iotPlatform.button.create' })}</Button>,
        ]}
      />

      <ModalForm key={state.editingDataPoint?.id || 'create'} title={state.editingDataPoint ? intl.formatMessage({ id: 'pages.iotPlatform.datapoint.edit' }) : intl.formatMessage({ id: 'pages.iotPlatform.datapoint.create' })} open={state.formVisible} onOpenChange={(open) => { if (!open) set({ formVisible: false, editingDataPoint: null }); }}
        form={form} onFinish={handleSubmit} width={isMobile ? '100%' : 700}
      >
        <Row gutter={12}>
          <Col span={12}><ProFormText name="name" label={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.name' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.iotPlatform.datapoint.nameRequired' }) }]} placeholder={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.namePlaceholder' })} /></Col>
          <Col span={12}><ProFormText name="title" label={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.title' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.iotPlatform.datapoint.titleRequired' }) }]} placeholder={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.titlePlaceholder' })} /></Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}><ProFormSelect name="deviceId" label={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.device' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.iotPlatform.datapoint.deviceRequired' }) }]} options={state.devices.map(d => ({ label: d.title, value: d.deviceId }))} placeholder={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.devicePlaceholder' })} /></Col>
          <Col span={12}><ProFormSelect name="dataType" label={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.dataType' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.iotPlatform.datapoint.dataTypeRequired' }) }]} options={DATA_TYPE_OPTIONS.map(opt => ({ label: intl.formatMessage({ id: `pages.iotPlatform.datapoint.type.${opt.value.toLowerCase()}`}), value: opt.value }))} placeholder={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.dataTypePlaceholder' })} /></Col>
        </Row>
        <Row gutter={12}>
          <Col span={8}><ProFormText name="unit" label={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.unit' })} placeholder={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.unitPlaceholder' })} /></Col>
          <Col span={8}><ProFormDigit name="minValue" label={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.minValue' })} placeholder={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.minValuePlaceholder' })} /></Col>
          <Col span={8}><ProFormDigit name="maxValue" label={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.maxValue' })} placeholder={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.maxValuePlaceholder' })} /></Col>
        </Row>
        <Row gutter={12}>
          <Col span={8}><ProFormDigit name="precision" label={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.precision' })} initialValue={2} min={0} max={10} placeholder={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.precisionPlaceholder' })} /></Col>
          <Col span={8}><ProFormDigit name="samplingInterval" label={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.samplingInterval' })} initialValue={60} min={1} placeholder={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.samplingIntervalPlaceholder' })} /></Col>
          <Col span={4}><ProFormSwitch name="isReadOnly" label={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.readOnly' })} initialValue={true} /></Col>
          <Col span={4}><ProFormSwitch name="isEnabled" label={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.enabled' })} initialValue={true} /></Col>
        </Row>
        <ProFormTextArea name="description" label={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.description' })} placeholder={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.descriptionPlaceholder' })} />
        <ProFormTextArea name="remarks" label={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.remarks' })} placeholder={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.remarksPlaceholder' })} />
      </ModalForm>

      <Drawer title={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.detail' })} placement="right" open={state.detailVisible} onClose={() => set({ detailVisible: false, viewingDataPoint: null })} size="large">
        {state.viewingDataPoint && (
          <>
            <ProCard title={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.basicInfo' })} style={{ marginBottom: 16 }}>
              <ProDescriptions column={isMobile ? 1 : 2} size="small">
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.name' })} span={2}>{state.viewingDataPoint.title}</ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.dataPointId' })}>{state.viewingDataPoint.dataPointId}</ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.device' })}>{state.devices.find(d => d.deviceId === state.viewingDataPoint!.deviceId)?.title || state.viewingDataPoint!.deviceId || '-'}</ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.dataType' })}><Tag>{intl.formatMessage({ id: DATA_TYPE_LABELS[state.viewingDataPoint.dataType]})}</Tag></ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.unit' })}>{state.viewingDataPoint.unit || '-'}</ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.samplingInterval' })}>{state.viewingDataPoint.samplingInterval} {intl.formatMessage({ id: 'pages.iotPlatform.datapoint.seconds' })}</ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.readOnly' })}><Tag color={state.viewingDataPoint.isReadOnly ? 'orange' : 'green'}>{state.viewingDataPoint.isReadOnly ? intl.formatMessage({ id: 'pages.iotPlatform.datapoint.yes' }) : intl.formatMessage({ id: 'pages.iotPlatform.datapoint.no' })}</Tag></ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.enabledStatus' })}><Tag color={state.viewingDataPoint.isEnabled ? 'green' : 'red'}>{state.viewingDataPoint.isEnabled ? intl.formatMessage({ id: 'pages.iotPlatform.datapoint.enabledStatus' }) : intl.formatMessage({ id: 'pages.iotPlatform.datapoint.disabledStatus' })}</Tag></ProDescriptions.Item>
              </ProDescriptions>
            </ProCard>
            {(state.viewingDataPoint.minValue !== undefined || state.viewingDataPoint.maxValue !== undefined) && (
            <ProCard title={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.valueRange' })} style={{ marginBottom: 16 }}>
              <ProDescriptions column={isMobile ? 1 : 2} size="small">
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.minValue' })}>{state.viewingDataPoint.minValue !== undefined ? state.viewingDataPoint.minValue : '-'}</ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.maxValue' })}>{state.viewingDataPoint.maxValue !== undefined ? state.viewingDataPoint.maxValue : '-'}</ProDescriptions.Item>
              </ProDescriptions>
            </ProCard>
            )}
            {state.viewingDataPoint.alarmConfig?.isEnabled && (
            <ProCard title={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.alarmConfig' })} style={{ marginBottom: 16 }}>
              <ProDescriptions column={isMobile ? 1 : 2} size="small">
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.alarmEnabled' })}><Tag color="orange">{intl.formatMessage({ id: 'pages.iotPlatform.datapoint.alarmEnabled' })}</Tag></ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.alarmType' })}>{state.viewingDataPoint.alarmConfig.alarmType || '-'}</ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.threshold' })}>{state.viewingDataPoint.alarmConfig.threshold || '-'}</ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.level' })}>{state.viewingDataPoint.alarmConfig.level || '-'}</ProDescriptions.Item>
              </ProDescriptions>
            </ProCard>
            )}
            <ProCard title={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.lastCollection' })} style={{ marginBottom: 16 }}>
              {state.viewingDataPoint.lastValue ? (
                <ProDescriptions column={1} size="small">
                  <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.dataValue' })}>{state.viewingDataPoint.lastValue}{state.viewingDataPoint.unit && <span style={{ color: '#999', marginLeft: 4 }}>{state.viewingDataPoint.unit}</span>}</ProDescriptions.Item>
                  {state.viewingDataPoint.lastUpdatedAt && <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.collectionTime' })}>{dayjs(state.viewingDataPoint.lastUpdatedAt).format('YYYY-MM-DD HH:mm:ss')}</ProDescriptions.Item>}
                </ProDescriptions>
              ) : <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>{intl.formatMessage({ id: 'pages.iotPlatform.datapoint.noCollection' })}</div>}
            </ProCard>
            <ProCard title={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.timeInfo' })}>
              <ProDescriptions column={isMobile ? 1 : 2} size="small">
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.createdAt' })}>{state.viewingDataPoint.createdAt ? dayjs(state.viewingDataPoint.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</ProDescriptions.Item>
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
