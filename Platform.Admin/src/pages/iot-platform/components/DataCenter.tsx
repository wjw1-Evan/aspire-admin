import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useIntl } from '@umijs/max';
import { type ProColumns, ActionType, ProTable } from '@ant-design/pro-table';
import { Button, Drawer, Grid, Input, Space, Tag, Typography, message } from 'antd';
import { ProCard, ProDescriptions } from '@ant-design/pro-components';
import { ReloadOutlined, SearchOutlined, DatabaseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { iotService, IoTDataRecord } from '@/services/iotService';

const { useBreakpoint } = Grid;
const { Paragraph } = Typography;

export interface DataCenterRef { reload: () => void; }

const dataTypeLabels: Record<string, string> = { Numeric: '数值', Boolean: '布尔', String: '字符串', Enum: '枚举', Json: 'JSON' };

const DataCenter = React.forwardRef<DataCenterRef, any>((props, ref) => {
  const intl = useIntl();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const actionRef = useRef<ActionType | undefined>(undefined);

  const [state, setState] = useState({
    detailVisible: false,
    viewingRecord: null as IoTDataRecord | null,
    sorter: undefined as { sortBy: string; sortOrder: string } | undefined,
    search: '',
  });
  const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

  const columns: ProColumns<IoTDataRecord>[] = [
    { title: '设备ID', dataIndex: 'deviceId', sorter: true, ellipsis: true, render: (dom, record) => <a onClick={() => set({ viewingRecord: record, detailVisible: true })}>{dom as string}</a> },
    { title: '数据点ID', dataIndex: 'dataPointId', sorter: true, ellipsis: true, render: (dom) => <a onClick={() => { navigator.clipboard.writeText(String(dom)); message.success('已复制到剪贴板'); }}>{dom as string}</a> },
    { title: '数据类型', dataIndex: 'dataType', sorter: true, render: (_, record) => <Tag>{dataTypeLabels[record.dataType] || record.dataType}</Tag> },
    { title: '数据值', dataIndex: 'value', sorter: true, ellipsis: { showTitle: false }, width: 250, render: (dom, record) => {
      const val = dom as string;
      if (record.dataType?.toLowerCase() === 'json') {
        try { const parsed = JSON.parse(val); return <span title={val} style={{ fontFamily: 'monospace', fontSize: '12px' }}>{JSON.stringify(parsed).substring(0, 100)}{val.length > 100 ? '...' : ''}</span>; }
        catch { return <span title={val}>{val}</span>; }
      }
      return <span title={val}>{val}</span>;
    }},
    { title: '上报时间', dataIndex: 'reportedAt', sorter: true, render: (dom) => dom ? dayjs(dom as string).format('YYYY-MM-DD HH:mm:ss') : '-' },
    { title: '告警', dataIndex: 'isAlarm', render: (dom) => dom ? <Tag color="red">告警</Tag> : <Tag color="green">正常</Tag> },
  ];

  return (
    <>
      <ProTable actionRef={actionRef} request={async (params: any) => {
        const { current, pageSize } = params;
        const sortParams = state.sorter?.sortBy && state.sorter?.sortOrder ? state.sorter : undefined;
        const res = await iotService.queryDataRecords({ page: current, pageSize, search: state.search, ...sortParams });
        return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
      }} columns={columns} rowKey={(record) => record.id || `${record.deviceId}-${record.dataPointId}-${record.reportedAt}`} search={false}
        onChange={(_p, _f, s: any) => set({ sorter: s?.order ? { sortBy: s.field, sortOrder: s.order === 'ascend' ? 'asc' : 'desc' } : undefined })}
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

      <Drawer title="数据记录详情" placement="right" open={state.detailVisible} onClose={() => set({ detailVisible: false, viewingRecord: null })} size={isMobile ? 'large' : 800}>
        {state.viewingRecord && (
          <>
            <ProCard title="基本信息" style={{ marginBottom: 16 }}>
              <ProDescriptions column={isMobile ? 1 : 2} size="small">
                <ProDescriptions.Item label="记录ID" span={2}>{state.viewingRecord.id}</ProDescriptions.Item>
                <ProDescriptions.Item label="设备ID">{state.viewingRecord.deviceId}</ProDescriptions.Item>
                <ProDescriptions.Item label="数据点ID">{state.viewingRecord.dataPointId}</ProDescriptions.Item>
                <ProDescriptions.Item label="数据类型"><Tag>{dataTypeLabels[state.viewingRecord.dataType] || state.viewingRecord.dataType}</Tag></ProDescriptions.Item>
                <ProDescriptions.Item label="采样间隔">{state.viewingRecord.samplingInterval} 秒</ProDescriptions.Item>
              </ProDescriptions>
            </ProCard>
            <ProCard title="数据值" style={{ marginBottom: 16 }}>
              <ProDescriptions column={1} size="small">
                <ProDescriptions.Item label="值">
                  {state.viewingRecord.dataType?.toLowerCase() === 'json' ? (() => {
                    try {
                      const parsed = JSON.parse(state.viewingRecord.value);
                      return <Paragraph copyable={{ text: state.viewingRecord.value }} style={{ width: '100%', maxHeight: 400, overflow: 'auto', fontFamily: 'monospace', whiteSpace: 'pre-wrap', marginBottom: 0 }}>{JSON.stringify(parsed, null, 2)}</Paragraph>;
                    } catch { return <div style={{ wordBreak: 'break-all', color: '#ff4d4f' }}>{state.viewingRecord.value}<div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>(JSON 解析失败，显示原始值)</div></div>; }
                  })() : <div style={{ wordBreak: 'break-all' }}>{state.viewingRecord.value}</div>}
                </ProDescriptions.Item>
              </ProDescriptions>
            </ProCard>
            {(state.viewingRecord.isAlarm || state.viewingRecord.alarmLevel) && (
              <ProCard title="告警信息" style={{ marginBottom: 16 }}>
                <ProDescriptions column={isMobile ? 1 : 2} size="small">
                  <ProDescriptions.Item label="告警状态">{state.viewingRecord.isAlarm ? <Tag color="red">告警</Tag> : <Tag color="green">正常</Tag>}</ProDescriptions.Item>
                  {state.viewingRecord.alarmLevel && <ProDescriptions.Item label="告警级别">{state.viewingRecord.alarmLevel}</ProDescriptions.Item>}
                </ProDescriptions>
              </ProCard>
            )}
            <ProCard title="时间信息" style={{ marginBottom: 16 }}>
              <ProDescriptions column={isMobile ? 1 : 2} size="small">
                <ProDescriptions.Item label="上报时间">{state.viewingRecord.reportedAt ? dayjs(state.viewingRecord.reportedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</ProDescriptions.Item>
                <ProDescriptions.Item label="创建时间">{state.viewingRecord.createdAt ? dayjs(state.viewingRecord.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</ProDescriptions.Item>
              </ProDescriptions>
            </ProCard>
            {state.viewingRecord.remarks && <ProCard title="备注" style={{ marginBottom: 16 }}><p>{state.viewingRecord.remarks}</p></ProCard>}
          </>
        )}
      </Drawer>
    </>
  );
});

DataCenter.displayName = 'DataCenter';
export default DataCenter;
