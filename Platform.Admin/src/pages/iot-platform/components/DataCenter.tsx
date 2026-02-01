import React, { useRef, useState, forwardRef, useImperativeHandle, useCallback, useMemo } from 'react';
import type { ActionType } from '@/types/pro-components';
import type { ColumnsType } from 'antd/es/table';
import DataTable from '@/components/DataTable';
import { Tag, Button, Drawer, Descriptions, Space, Form, Input, DatePicker, Card, Spin, Empty, Typography, Grid } from 'antd';
import dayjs from 'dayjs';
import { useMessage } from '@/hooks/useMessage';
import useCommonStyles from '@/hooks/useCommonStyles';
import SearchFormCard from '@/components/SearchFormCard';

const { useBreakpoint } = Grid;
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { iotService, IoTDataRecord } from '@/services/iotService';

const { Paragraph } = Typography;
const { RangePicker } = DatePicker;

export interface DataCenterRef {
  reload: () => void;
}

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

const DataCenter = forwardRef<DataCenterRef>((props, ref) => {
  const message = useMessage();
  const screens = useBreakpoint();
  const isMobile = !screens.md; // md 以下为移动端
  const { styles } = useCommonStyles();
  const actionRef = useRef<ActionType>(null);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<IoTDataRecord | null>(null);
  const [searchForm] = Form.useForm();
  const [searchParams, setSearchParams] = useState<any>({});
  // 使用 useRef 存储最新的搜索参数，确保 request 函数能立即访问到最新值
  const searchParamsRef = useRef<any>({});

  const fetchRecords = useCallback(async (params: any) => {
    try {
      const { current = 1, pageSize = 20 } = params;
      const payload: any = {
        pageIndex: current,
        pageSize,
      };

      // 合并搜索参数，使用 ref 确保获取最新的搜索参数
      const mergedParams = { ...searchParamsRef.current, ...params };

      // 只添加非空参数
      if (mergedParams.deviceId) {
        payload.deviceId = mergedParams.deviceId;
      }
      if (mergedParams.dataPointId) {
        payload.dataPointId = mergedParams.dataPointId;
      }

      // 处理时间范围
      const timeRange = mergedParams.dateRange || mergedParams.reportedAt;
      if (Array.isArray(timeRange) && timeRange.length === 2) {
        const [start, end] = timeRange;
        if (start) {
          // 处理 dayjs 对象
          payload.startTime = dayjs(start).toISOString();
        }
        if (end) {
          payload.endTime = dayjs(end).toISOString();
        }
      }

      const response = await iotService.queryDataRecords(payload);

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

        // 确保返回的数据格式符合 ProTable 的要求
        return {
          data: records || [],
          total: total || 0,
          success: true,
        };
      }

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
  }, []);

  // 处理搜索
  const handleSearch = useCallback(() => {
    const values = searchForm.getFieldsValue();
    // 同时更新 state 和 ref，ref 确保 request 函数能立即访问到最新值
    searchParamsRef.current = values;
    setSearchParams(values);
    // 重置到第一页并重新加载数据
    if (actionRef.current?.reloadAndReset) {
      actionRef.current.reloadAndReset();
    } else if (actionRef.current?.reload) {
      actionRef.current.reload();
    }
  }, [searchForm]);

  // 处理重置
  const handleReset = useCallback(() => {
    searchForm.resetFields();
    // 同时更新 state 和 ref
    searchParamsRef.current = {};
    setSearchParams({});
    if (actionRef.current?.reloadAndReset) {
      actionRef.current.reloadAndReset();
    } else if (actionRef.current?.reload) {
      actionRef.current.reload();
    }
  }, [searchForm]);

  // 处理查看详情
  const handleViewDetail = useCallback((record: IoTDataRecord) => {
    setSelectedRecord(record);
    setIsDetailDrawerVisible(true);
  }, []);

  // 处理关闭详情
  const handleCloseDetail = useCallback(() => {
    setIsDetailDrawerVisible(false);
    setSelectedRecord(null);
  }, []);

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    reload: () => {
      if (actionRef.current?.reload) {
        actionRef.current.reload();
      }
    },
  }), []);

  const columns: ColumnsType<IoTDataRecord> = useMemo(() => [
    {
      title: '设备ID',
      dataIndex: 'deviceId',
      key: 'deviceId',
      width: 200,
      ellipsis: true,
      render: (text: string, record: IoTDataRecord) => (
        <a
          onClick={() => handleViewDetail(record)}
          style={{ cursor: 'pointer' }}
        >
          {text}
        </a>
      ),
    },
    {
      title: '数据点ID',
      dataIndex: 'dataPointId',
      key: 'dataPointId',
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
      key: 'dataType',
      width: 100,
      render: (_: any, record: IoTDataRecord) => <Tag>{getDataTypeLabel(record.dataType)}</Tag>,
    },
    {
      title: '数据值',
      dataIndex: 'value',
      key: 'value',
      width: 250,
      ellipsis: {
        showTitle: false,
      },
      search: false,
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
      key: 'reportedAt',
      width: 180,
      sorter: true,
      render: (_: any, record: IoTDataRecord) => {
        const time = record.reportedAt;
        if (!time) return '-';
        try {
          const date = dayjs(time);
          if (!date.isValid()) return time;
          return date.format('YYYY-MM-DD HH:mm:ss');
        } catch (error) {
          console.error('日期格式化错误:', error, time);
          return time;
        }
      },
    },
    {
      title: '告警',
      dataIndex: 'isAlarm',
      key: 'isAlarm',
      width: 100,
      render: (_: any, record: IoTDataRecord) =>
        record.isAlarm ? <Tag color="red">告警</Tag> : <Tag color="green">正常</Tag>,
    },
  ], [handleViewDetail]);

  return (
    <>
      {/* 搜索表单 */}
      <SearchFormCard>
        <Form form={searchForm} layout={isMobile ? 'vertical' : 'inline'} onFinish={handleSearch}>
          <Form.Item name="deviceId" label="设备ID">
            <Input placeholder="请输入设备ID" style={{ width: 200 }} allowClear />
          </Form.Item>
          <Form.Item name="dataPointId" label="数据点ID">
            <Input placeholder="请输入数据点ID" style={{ width: 200 }} allowClear />
          </Form.Item>
          <Form.Item name="dateRange" label="上报时间">
            <RangePicker
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              style={{ width: 400 }}
            />
          </Form.Item>
          <Form.Item>
            <Space wrap>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SearchOutlined />}
                style={isMobile ? { width: '100%' } : {}}
              >
                搜索
              </Button>
              <Button
                onClick={handleReset}
                icon={<ReloadOutlined />}
                style={isMobile ? { width: '100%' } : {}}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </SearchFormCard>

      <DataTable<IoTDataRecord>
        actionRef={actionRef}
        columns={columns}
        request={fetchRecords}
        rowKey={(record) => record.id || `${record.deviceId}-${record.dataPointId}-${record.reportedAt}`}
        scroll={{ x: 'max-content' }}
        search={false}
        pagination={{
          pageSize: 20,
          pageSizeOptions: [10, 20, 50, 100],
          showSizeChanger: true,
          showQuickJumper: true,
        }}
      />
      <Drawer
        title="数据记录详情"
        placement="right"
        onClose={handleCloseDetail}
        open={isDetailDrawerVisible}
        size={isMobile ? 'large' : 800}
      >
        <Spin spinning={false}>
          {selectedRecord ? (
            <>
              {/* 基本信息 */}
              <Card title="基本信息" className={styles.card} style={{ marginBottom: 16 }}>
                <Descriptions column={isMobile ? 1 : 2} size="small">
                  <Descriptions.Item label="记录ID" span={2}>
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
                  <Descriptions.Item label="采样间隔">
                    {selectedRecord.samplingInterval} 秒
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              {/* 数据值 */}
              <Card title="数据值" className={styles.card} style={{ marginBottom: 16 }}>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="值">
                    {selectedRecord.dataType?.toLowerCase() === 'json' ? (
                      (() => {
                        try {
                          const parsed = JSON.parse(selectedRecord.value);
                          const formattedJson = JSON.stringify(parsed, null, 2);
                          return (
                            <Paragraph
                              copyable={{ text: selectedRecord.value }}
                              style={{
                                width: '100%',
                                maxHeight: 400,
                                overflow: 'auto',
                                fontFamily: 'JetBrains Mono, SFMono-Regular, Consolas, Menlo, monospace',
                                whiteSpace: 'pre-wrap',
                                marginBottom: 0,
                              }}
                            >
                              {formattedJson}
                            </Paragraph>
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
                </Descriptions>
              </Card>

              {/* 告警信息 */}
              {(selectedRecord.isAlarm || selectedRecord.alarmLevel) && (
                <Card title="告警信息" className={styles.card} style={{ marginBottom: 16 }}>
                  <Descriptions column={isMobile ? 1 : 2} size="small">
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
                  </Descriptions>
                </Card>
              )}

              {/* 时间信息 */}
              <Card title="时间信息" className={styles.card} style={{ marginBottom: 16 }}>
                <Descriptions column={isMobile ? 1 : 2} size="small">
                  <Descriptions.Item label="上报时间">
                    {selectedRecord.reportedAt
                      ? dayjs(selectedRecord.reportedAt).format('YYYY-MM-DD HH:mm:ss')
                      : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="创建时间">
                    {selectedRecord.createdAt
                      ? dayjs(selectedRecord.createdAt).format('YYYY-MM-DD HH:mm:ss')
                      : '-'}
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              {/* 备注 */}
              {selectedRecord.remarks && (
                <Card title="备注" className={styles.card} style={{ marginBottom: 16 }}>
                  <p>{selectedRecord.remarks}</p>
                </Card>
              )}
            </>
          ) : (
            <Empty description="未加载数据记录信息" />
          )}
        </Spin>
      </Drawer>
    </>
  );
});

DataCenter.displayName = 'DataCenter';

export default DataCenter;

