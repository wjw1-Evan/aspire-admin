import React, { useRef, useState, forwardRef, useImperativeHandle, useCallback, useMemo, useEffect } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Table, Tag, Drawer, Descriptions, Space, DatePicker, Card, Typography, Grid } from 'antd';
import dayjs from 'dayjs';
import { useMessage } from '@/hooks/useMessage';
import useCommonStyles from '@/hooks/useCommonStyles';
import SearchBar from '@/components/SearchBar';
import type { PageParams } from '@/types';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { iotService, IoTDataRecord } from '@/services/iotService';
import { useIotTable } from '../hooks/useIotTable';

const { useBreakpoint } = Grid;
const { Paragraph } = Typography;
const { RangePicker } = DatePicker;

export interface DataCenterRef {
  reload: () => void;
}

const dataTypeLabels: Record<string, string> = {
  Numeric: '数值',
  Boolean: '布尔',
  String: '字符串',
  Enum: '枚举',
  Json: 'JSON',
};

const DataCenter = forwardRef<DataCenterRef>((props, ref) => {
  const message = useMessage();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { styles } = useCommonStyles();
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<IoTDataRecord | null>(null);

  const { data, loading, pagination, searchParamsRef, fetchData, handleSearch, handleTableChange } =
    useIotTable<IoTDataRecord>(params => iotService.queryDataRecords(params));

  useEffect(() => { fetchData(); }, [fetchData]);

  useImperativeHandle(ref, () => ({ reload: () => fetchData() }), [fetchData]);

  const handleViewDetail = useCallback((record: IoTDataRecord) => {
    setSelectedRecord(record);
    setIsDetailDrawerVisible(true);
  }, []);

  const columns: ColumnsType<IoTDataRecord> = useMemo(() => [
    {
      title: '设备ID',
      dataIndex: 'deviceId',
      key: 'deviceId',
      width: 200,
      ellipsis: true,
      sorter: true,
      render: (text: string, record: IoTDataRecord) => (
        <a onClick={() => handleViewDetail(record)} style={{ cursor: 'pointer' }}>{text}</a>
      ),
    },
    {
      title: '数据点ID',
      dataIndex: 'dataPointId',
      key: 'dataPointId',
      width: 200,
      ellipsis: true,
      sorter: true,
      render: (text: string) => (
        <span style={{ cursor: 'pointer' }} onClick={() => { navigator.clipboard.writeText(text); message.success('已复制到剪贴板'); }}>
          {text}
        </span>
      ),
    },
    {
      title: '数据类型',
      dataIndex: 'dataType',
      key: 'dataType',
      width: 100,
      sorter: true,
      render: (_: any, record: IoTDataRecord) => <Tag>{dataTypeLabels[record.dataType] || record.dataType}</Tag>,
    },
    {
      title: '数据值',
      dataIndex: 'value',
      key: 'value',
      width: 250,
      ellipsis: { showTitle: false },
      sorter: true,
      render: (value: string, record: IoTDataRecord) => {
        if (record.dataType?.toLowerCase() === 'json') {
          try {
            const parsed = JSON.parse(value);
            const formatted = JSON.stringify(parsed, null, 2);
            return <span title={value} style={{ fontFamily: 'monospace', fontSize: '12px' }}>{formatted.substring(0, 100)}{value.length > 100 ? '...' : ''}</span>;
          } catch { return <span title={value}>{value}</span>; }
        }
        return <span title={value}>{value}</span>;
      },
    },
    {
      title: '上报时间',
      dataIndex: 'reportedAt',
      key: 'reportedAt',
      width: 180,
      sorter: true,
      render: (_: any, record: IoTDataRecord) => {
        if (!record.reportedAt) return '-';
        try {
          const date = dayjs(record.reportedAt);
          return date.isValid() ? date.format('YYYY-MM-DD HH:mm:ss') : record.reportedAt;
        } catch { return record.reportedAt; }
      },
    },
    {
      title: '告警',
      dataIndex: 'isAlarm',
      key: 'isAlarm',
      width: 100,
      render: (_: any, record: IoTDataRecord) => record.isAlarm ? <Tag color="red">告警</Tag> : <Tag color="green">正常</Tag>,
    },
  ], [handleViewDetail]);

  return (
    <>
      <SearchBar initialParams={searchParamsRef.current} onSearch={handleSearch} style={{ marginBottom: 16 }} />
      <Table<IoTDataRecord>
        dataSource={data}
        columns={columns}
        rowKey={(record) => record.id || `${record.deviceId}-${record.dataPointId}-${record.reportedAt}`}
        loading={loading}
        scroll={{ x: 'max-content' }}
        onChange={handleTableChange}
        pagination={{ current: pagination.page, pageSize: pagination.pageSize, total: pagination.total }}
      />
      <Drawer
        title="数据记录详情"
        placement="right"
        onClose={() => { setIsDetailDrawerVisible(false); setSelectedRecord(null); }}
        open={isDetailDrawerVisible}
        size={isMobile ? 'large' : 800}
      >
        {selectedRecord ? (
          <>
            <Card title="基本信息" className={styles.card} style={{ marginBottom: 16 }}>
              <Descriptions column={isMobile ? 1 : 2} size="small">
                <Descriptions.Item label="记录ID" span={2}>{selectedRecord.id}</Descriptions.Item>
                <Descriptions.Item label="设备ID">{selectedRecord.deviceId}</Descriptions.Item>
                <Descriptions.Item label="数据点ID">{selectedRecord.dataPointId}</Descriptions.Item>
                <Descriptions.Item label="数据类型"><Tag>{dataTypeLabels[selectedRecord.dataType] || selectedRecord.dataType}</Tag></Descriptions.Item>
                <Descriptions.Item label="采样间隔">{selectedRecord.samplingInterval} 秒</Descriptions.Item>
              </Descriptions>
            </Card>
            <Card title="数据值" className={styles.card} style={{ marginBottom: 16 }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="值">
                  {selectedRecord.dataType?.toLowerCase() === 'json' ? (() => {
                    try {
                      const parsed = JSON.parse(selectedRecord.value);
                      return <Paragraph copyable={{ text: selectedRecord.value }} style={{ width: '100%', maxHeight: 400, overflow: 'auto', fontFamily: 'monospace', whiteSpace: 'pre-wrap', marginBottom: 0 }}>{JSON.stringify(parsed, null, 2)}</Paragraph>;
                    } catch { return <div style={{ wordBreak: 'break-all', color: '#ff4d4f' }}>{selectedRecord.value}<div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>(JSON 解析失败，显示原始值)</div></div>; }
                  })() : <div style={{ wordBreak: 'break-all' }}>{selectedRecord.value}</div>}
                </Descriptions.Item>
              </Descriptions>
            </Card>
            {(selectedRecord.isAlarm || selectedRecord.alarmLevel) && (
              <Card title="告警信息" className={styles.card} style={{ marginBottom: 16 }}>
                <Descriptions column={isMobile ? 1 : 2} size="small">
                  <Descriptions.Item label="告警状态">{selectedRecord.isAlarm ? <Tag color="red">告警</Tag> : <Tag color="green">正常</Tag>}</Descriptions.Item>
                  {selectedRecord.alarmLevel && <Descriptions.Item label="告警级别">{selectedRecord.alarmLevel}</Descriptions.Item>}
                </Descriptions>
              </Card>
            )}
            <Card title="时间信息" className={styles.card} style={{ marginBottom: 16 }}>
              <Descriptions column={isMobile ? 1 : 2} size="small">
                <Descriptions.Item label="上报时间">{selectedRecord.reportedAt ? dayjs(selectedRecord.reportedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</Descriptions.Item>
                <Descriptions.Item label="创建时间">{selectedRecord.createdAt ? dayjs(selectedRecord.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</Descriptions.Item>
              </Descriptions>
            </Card>
            {selectedRecord.remarks && <Card title="备注" className={styles.card} style={{ marginBottom: 16 }}><p>{selectedRecord.remarks}</p></Card>}
          </>
        ) : <div>未加载数据记录信息</div>}
      </Drawer>
    </>
  );
});

DataCenter.displayName = 'DataCenter';

export default DataCenter;
