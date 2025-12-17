import React, { useRef, useState } from 'react';
import type { ActionType, ProColumns } from '@/types/pro-components';
import DataTable from '@/components/DataTable';
import { Tag, Button, Drawer, Descriptions, Space, message, type TableColumnsType } from 'antd';
import { ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import { iotService, IoTDataRecord } from '@/services/iotService';

const getDataTypeLabel = (type: string) => {
  // 支持 camelCase (后端返回) 和首字母大写格式
  const normalizedType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  const typeMap: Record<string, string> = {
    Numeric: '数值',
    Boolean: '布尔',
    String: '字符串',
    Enum: '枚举',
    Json: 'JSON',
  };
  return typeMap[normalizedType] || type;
};

const dataTypeLabels: Record<string, string> = {
  Numeric: '数值',
  Boolean: '布尔',
  String: '字符串',
  Enum: '枚举',
  Json: 'JSON',
};

const DataCenter: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<IoTDataRecord | null>(null);

  const fetchRecords = async (params: any) => {
    try {
      const { current = 1, pageSize = 20, reportedAt } = params;
      const payload: any = {
        pageIndex: current,
        pageSize,
      };

      // 只添加非空参数
      if (params.deviceId) {
        payload.deviceId = params.deviceId;
      }
      if (params.dataPointId) {
        payload.dataPointId = params.dataPointId;
      }

      // 处理时间范围
      if (Array.isArray(reportedAt) && reportedAt.length === 2) {
        const [start, end] = reportedAt;
        if (start) {
          // 处理 dayjs 对象或 Date 对象
          payload.startTime = start.format ? start.format('YYYY-MM-DDTHH:mm:ss.SSS[Z]') : (start.toISOString ? start.toISOString() : start);
        }
        if (end) {
          payload.endTime = end.format ? end.format('YYYY-MM-DDTHH:mm:ss.SSS[Z]') : (end.toISOString ? end.toISOString() : end);
        }
      }

      const response = await iotService.queryDataRecords(payload);
      
      console.log('DataCenter fetchRecords response:', response);
      
      if (response && response.success && response.data) {
        // 处理不同的数据格式：优先检查小写格式（后端实际返回的格式）
        let records: IoTDataRecord[] = [];
        let total = 0;
        
        // 优先检查大写格式（后端实际返回的格式）
        if (response.data.Records && Array.isArray(response.data.Records)) {
          // 如果是 { Records: [], Total: 0 } 格式（大写）
          records = response.data.Records;
          total = response.data.Total || 0;
        } else if (Array.isArray(response.data)) {
          // 如果 data 直接是数组
          records = response.data;
          total = response.data.length;
        } else {
          // 兼容其他可能的格式
          const data = response.data as any;
          if (data.records && Array.isArray(data.records)) {
            records = data.records;
            total = data.total || 0;
          } else if (data.list && Array.isArray(data.list)) {
            records = data.list;
            total = data.total || 0;
          }
        }
        
        console.log('DataCenter parsed records:', records.length, 'total:', total, 'first record:', records[0]);
        
        // 确保返回的数据格式符合 ProTable 的要求
        return {
          data: records || [],
          total: total || 0,
          success: true,
        };
      }
      
      console.warn('DataCenter fetchRecords failed:', response);
      return {
        data: [],
        total: 0,
        success: false,
      };
    } catch (error) {
      console.error('查询数据记录异常:', error);
      return {
        data: [],
        total: 0,
        success: false,
      };
    }
  };

  const columns: TableColumnsType<IoTDataRecord> = [
    {
      title: '设备ID',
      dataIndex: 'deviceId',
      width: 200,
      ellipsis: true,
      render: (text: string) => (
        <span
          style={{ cursor: 'pointer' }}
          onClick={() => {
            navigator.clipboard.writeText(text);
            message.success('已复制到剪贴板');
          }}
        >
          {text}
        </span>
      ),
    },
    {
      title: '数据点ID',
      dataIndex: 'dataPointId',
      width: 200,
      ellipsis: true,
      render: (text: string) => (
        <span
          style={{ cursor: 'pointer' }}
          onClick={() => {
            navigator.clipboard.writeText(text);
            message.success('已复制到剪贴板');
          }}
        >
          {text}
        </span>
      ),
    },
    {
      title: '数据类型',
      dataIndex: 'dataType',
      width: 100,
      render: (_: any, record: IoTDataRecord) => <Tag>{getDataTypeLabel(record.dataType)}</Tag>,
    },
    {
      title: '数据值',
      dataIndex: 'value',
      width: 250,
      ellipsis: {
        showTitle: false,
      },
      render: (value: string, record: IoTDataRecord) => {
        // 如果是 JSON 类型，尝试格式化显示
        if (record.dataType?.toLowerCase() === 'json') {
          try {
            const parsed = JSON.parse(value);
            return (
              <span title={value} style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                {JSON.stringify(parsed, null, 2).substring(0, 100)}
                {value.length > 100 ? '...' : ''}
              </span>
            );
          } catch {
            return <span title={value}>{value}</span>;
          }
        }
        return <span title={value}>{value}</span>;
      },
    },
    {
      title: '上报时间',
      dataIndex: 'reportedAt',
      width: 180,
      sorter: true,
      render: (_: any, record: IoTDataRecord) => {
        const time = record.reportedAt;
        if (!time) return '-';
        try {
          const date = new Date(time);
          if (isNaN(date.getTime())) return time; // 如果无法解析，返回原始值
          return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          });
        } catch (error) {
          console.error('日期格式化错误:', error, time);
          return time;
        }
      },
    },
    {
      title: '告警',
      dataIndex: 'isAlarm',
      width: 100,
      render: (_: any, record: IoTDataRecord) =>
        record.isAlarm ? <Tag color="red">告警</Tag> : <Tag color="green">正常</Tag>,
    },
    {
      title: '操作',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: IoTDataRecord) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedRecord(record);
              setIsDetailDrawerVisible(true);
            }}
          >
            详情
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
    <DataTable<IoTDataRecord>
      actionRef={actionRef}
      columns={columns}
      request={fetchRecords}
      rowKey={(record) => record.id || `${record.deviceId}-${record.dataPointId}-${record.reportedAt}`}
      search={false}
      pagination={{
        pageSize: 20,
        pageSizeOptions: [10, 20, 50, 100],
        showSizeChanger: true,
        showQuickJumper: true,
      }}
      toolbar={{
        actions: [
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => {
              if (actionRef.current?.reload) {
                actionRef.current.reload();
              }
            }}
          >
            刷新
          </Button>,
        ],
      }}
    />
    <Drawer
      title="数据记录详情"
      placement="right"
      onClose={() => setIsDetailDrawerVisible(false)}
      open={isDetailDrawerVisible}
      width={600}
    >
      {selectedRecord && (
        <Descriptions column={1} bordered>
          <Descriptions.Item label="记录ID">
            {selectedRecord.id}
          </Descriptions.Item>
          <Descriptions.Item label="设备ID">
            {selectedRecord.deviceId}
          </Descriptions.Item>
          <Descriptions.Item label="数据点ID">
            {selectedRecord.dataPointId}
          </Descriptions.Item>
          <Descriptions.Item label="数据类型">
            <Tag>{getDataTypeLabel(selectedRecord.dataType)}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="数据值">
            {selectedRecord.dataType?.toLowerCase() === 'json' ? (
              (() => {
                try {
                  const parsed = JSON.parse(selectedRecord.value);
                  return (
                    <pre
                      style={{
                        margin: 0,
                        padding: '8px',
                        backgroundColor: '#f5f5f5',
                        borderRadius: '4px',
                        fontSize: '12px',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        maxHeight: '400px',
                        overflow: 'auto',
                      }}
                    >
                      {JSON.stringify(parsed, null, 2)}
                    </pre>
                  );
                } catch (error) {
                  return (
                    <div style={{ wordBreak: 'break-all', color: '#ff4d4f' }}>
                      {selectedRecord.value}
                      <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                        (JSON 解析失败，显示原始值)
                      </div>
                    </div>
                  );
                }
              })()
            ) : (
              <div style={{ wordBreak: 'break-all' }}>{selectedRecord.value}</div>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="采样间隔">
            {selectedRecord.samplingInterval} 秒
          </Descriptions.Item>
          <Descriptions.Item label="上报时间">
            {selectedRecord.reportedAt
              ? new Date(selectedRecord.reportedAt).toLocaleString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false,
                })
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="告警状态">
            {selectedRecord.isAlarm ? (
              <Tag color="red">告警</Tag>
            ) : (
              <Tag color="green">正常</Tag>
            )}
          </Descriptions.Item>
          {selectedRecord.alarmLevel && (
            <Descriptions.Item label="告警级别">
              {selectedRecord.alarmLevel}
            </Descriptions.Item>
          )}
          {selectedRecord.remarks && (
            <Descriptions.Item label="备注">
              {selectedRecord.remarks}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="创建时间">
            {selectedRecord.createdAt
              ? new Date(selectedRecord.createdAt).toLocaleString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false,
                })
              : '-'}
          </Descriptions.Item>
        </Descriptions>
      )}
    </Drawer>
  </>
  );
};

export default DataCenter;

