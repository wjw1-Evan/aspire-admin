import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useIntl } from '@umijs/max';
import { type ProColumns, ActionType, ProTable } from '@ant-design/pro-table';
import { Button, Grid, Input, Space, Tag, Typography, message } from 'antd';
import { Drawer } from 'antd';
import { ProCard, ProDescriptions } from '@ant-design/pro-components';
import { ReloadOutlined, SearchOutlined, DatabaseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { iotService, IoTDataRecord } from '@/services/iotService';

const { useBreakpoint } = Grid;
const { Paragraph } = Typography;

export interface DataCenterRef { reload: () => void; }

const dataTypeLabels: Record<string, string> = { Numeric: 'pages.iotPlatform.datapoint.type.numeric', Boolean: 'pages.iotPlatform.datapoint.type.boolean', String: 'pages.iotPlatform.datapoint.type.string', Enum: 'pages.iotPlatform.datapoint.type.enum', Json: 'pages.iotPlatform.datapoint.type.json' };

const DataCenter = React.forwardRef<DataCenterRef, any>((props, ref) => {
  const intl = useIntl();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const actionRef = useRef<ActionType | undefined>(undefined);

  const [state, setState] = useState({
    detailVisible: false,
    viewingRecord: null as IoTDataRecord | null,
    search: '',
  });
  const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

  const columns: ProColumns<IoTDataRecord>[] = [
    { title: intl.formatMessage({ id: 'pages.iotPlatform.datacenter.deviceId', defaultMessage: '设备ID' }), dataIndex: 'deviceId', sorter: true, ellipsis: true, render: (dom, record) => <a onClick={() => set({ viewingRecord: record, detailVisible: true })}>{dom as string}</a> },
    { title: intl.formatMessage({ id: 'pages.iotPlatform.datacenter.dataPointId', defaultMessage: '数据点ID' }), dataIndex: 'dataPointId', sorter: true, ellipsis: true, render: (dom) => <a onClick={() => { navigator.clipboard.writeText(String(dom)); message.success(intl.formatMessage({ id: 'pages.iotPlatform.datacenter.copied', defaultMessage: '已复制到剪贴板' })); }}>{dom as string}</a> },
    { title: intl.formatMessage({ id: 'pages.iotPlatform.datapoint.dataType', defaultMessage: '数据类型' }), dataIndex: 'dataType', sorter: true, render: (_, record) => <Tag>{intl.formatMessage({ id: dataTypeLabels[record.dataType], defaultMessage: record.dataType })}</Tag> },
    { title: intl.formatMessage({ id: 'pages.iotPlatform.datacenter.dataValue', defaultMessage: '数据值' }), dataIndex: 'value', sorter: true, ellipsis: { showTitle: false }, width: 250, render: (dom, record) => {
      const val = dom as string;
      if (record.dataType?.toLowerCase() === 'json') {
        try { const parsed = JSON.parse(val); return <span title={val} style={{ fontFamily: 'monospace', fontSize: '12px' }}>{JSON.stringify(parsed).substring(0, 100)}{val.length > 100 ? '...' : ''}</span>; }
        catch { return <span title={val}>{val}</span>; }
      }
      return <span title={val}>{val}</span>;
    }},
    { title: intl.formatMessage({ id: 'pages.iotPlatform.datacenter.reportedAt', defaultMessage: '上报时间' }), dataIndex: 'reportedAt', sorter: true, render: (dom) => dom ? dayjs(dom as string).format('YYYY-MM-DD HH:mm:ss') : '-' },
    { title: intl.formatMessage({ id: 'pages.iotPlatform.datacenter.alarm', defaultMessage: '告警' }), dataIndex: 'isAlarm', render: (dom) => dom ? <Tag color="red">{intl.formatMessage({ id: 'pages.iotPlatform.datacenter.alarm', defaultMessage: '告警' })}</Tag> : <Tag color="green">{intl.formatMessage({ id: 'pages.iotPlatform.datacenter.normal', defaultMessage: '正常' })}</Tag> },
  ];

  return (
    <>
      <ProTable actionRef={actionRef} headerTitle={
        <Space size={24}>
          <Space><DatabaseOutlined />{intl.formatMessage({ id: 'pages.iotPlatform.datacenter.tabTitle', defaultMessage: '数据中心' })}</Space>
        </Space>
      } request={async (params: any, sort: any, filter: any) => {
        const res = await iotService.queryDataRecords({ ...params, search: state.search, sort, filter });
        return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
      }} columns={columns} rowKey={(record) => record.id || `${record.deviceId}-${record.dataPointId}-${record.reportedAt}`} search={false}
        scroll={{ x: 'max-content' }}
        toolBarRender={() => [
          <Input.Search
            key="search"
            placeholder={intl.formatMessage({ id: 'pages.iotPlatform.searchPlaceholder', defaultMessage: '搜索...' })}
            allowClear
            value={state.search}
            onChange={(e) => set({ search: e.target.value })}
            onSearch={(value) => { set({ search: value }); actionRef.current?.reload(); }}
            style={{ width: 260 }}
          />,
        ]}
      />

      <Drawer title={intl.formatMessage({ id: 'pages.iotPlatform.datacenter.detail', defaultMessage: '数据记录详情' })} placement="right" open={state.detailVisible} onClose={() => set({ detailVisible: false, viewingRecord: null })} size="large">
        {state.viewingRecord && (
          <>
            <ProCard title={intl.formatMessage({ id: 'pages.iotPlatform.datacenter.basicInfo', defaultMessage: '基本信息' })} style={{ marginBottom: 16 }}>
              <ProDescriptions column={isMobile ? 1 : 2} size="small">
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.datacenter.recordId', defaultMessage: '记录ID' })} span={2}>{state.viewingRecord.id}</ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.datacenter.deviceId', defaultMessage: '设备ID' })}>{state.viewingRecord.deviceId}</ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.datacenter.dataPointId', defaultMessage: '数据点ID' })}>{state.viewingRecord.dataPointId}</ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.datapoint.dataType', defaultMessage: '数据类型' })}><Tag>{intl.formatMessage({ id: dataTypeLabels[state.viewingRecord.dataType], defaultMessage: state.viewingRecord.dataType })}</Tag></ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.datacenter.samplingInterval', defaultMessage: '采样间隔' })}>{state.viewingRecord.samplingInterval} {intl.formatMessage({ id: 'pages.iotPlatform.datapoint.seconds', defaultMessage: '秒' })}</ProDescriptions.Item>
              </ProDescriptions>
            </ProCard>
            <ProCard title={intl.formatMessage({ id: 'pages.iotPlatform.datacenter.dataValue', defaultMessage: '数据值' })} style={{ marginBottom: 16 }}>
              <ProDescriptions column={1} size="small">
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.datacenter.value', defaultMessage: '值' })}>
                  {state.viewingRecord.dataType?.toLowerCase() === 'json' ? (() => {
                    try {
                      const parsed = JSON.parse(state.viewingRecord.value);
                      return <Paragraph copyable={{ text: state.viewingRecord.value }} style={{ width: '100%', maxHeight: 400, overflow: 'auto', fontFamily: 'monospace', whiteSpace: 'pre-wrap', marginBottom: 0 }}>{JSON.stringify(parsed, null, 2)}</Paragraph>;
                    } catch { return <div style={{ wordBreak: 'break-all', color: '#ff4d4f' }}>{state.viewingRecord.value}<div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>({intl.formatMessage({ id: 'pages.iotPlatform.datacenter.jsonParseFailed', defaultMessage: 'JSON 解析失败，显示原始值' })})</div></div>; }
                  })() : <div style={{ wordBreak: 'break-all' }}>{state.viewingRecord.value}</div>}
                </ProDescriptions.Item>
              </ProDescriptions>
            </ProCard>
            {(state.viewingRecord.isAlarm || state.viewingRecord.alarmLevel) && (
              <ProCard title={intl.formatMessage({ id: 'pages.iotPlatform.datacenter.alarmInfo', defaultMessage: '告警信息' })} style={{ marginBottom: 16 }}>
                <ProDescriptions column={isMobile ? 1 : 2} size="small">
                  <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.datacenter.alarmStatus', defaultMessage: '告警状态' })}>{state.viewingRecord.isAlarm ? <Tag color="red">{intl.formatMessage({ id: 'pages.iotPlatform.datacenter.alarm', defaultMessage: '告警' })}</Tag> : <Tag color="green">{intl.formatMessage({ id: 'pages.iotPlatform.datacenter.normal', defaultMessage: '正常' })}</Tag>}</ProDescriptions.Item>
                  {state.viewingRecord.alarmLevel && <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.datacenter.alarmLevel', defaultMessage: '告警级别' })}>{state.viewingRecord.alarmLevel}</ProDescriptions.Item>}
                </ProDescriptions>
              </ProCard>
            )}
            <ProCard title={intl.formatMessage({ id: 'pages.iotPlatform.datacenter.timeInfo', defaultMessage: '时间信息' })} style={{ marginBottom: 16 }}>
              <ProDescriptions column={isMobile ? 1 : 2} size="small">
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.datacenter.reportedAt', defaultMessage: '上报时间' })}>{state.viewingRecord.reportedAt ? dayjs(state.viewingRecord.reportedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.iotPlatform.datacenter.createdAt', defaultMessage: '创建时间' })}>{state.viewingRecord.createdAt ? dayjs(state.viewingRecord.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</ProDescriptions.Item>
              </ProDescriptions>
            </ProCard>
            {state.viewingRecord.remarks && <ProCard title={intl.formatMessage({ id: 'pages.iotPlatform.datacenter.remarks', defaultMessage: '备注' })} style={{ marginBottom: 16 }}><p>{state.viewingRecord.remarks}</p></ProCard>}
          </>
        )}
      </Drawer>
    </>
  );
});

DataCenter.displayName = 'DataCenter';
export default DataCenter;
