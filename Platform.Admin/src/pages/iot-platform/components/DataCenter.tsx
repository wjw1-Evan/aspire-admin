import React, { useRef } from 'react';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { Tag, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { iotService, IoTDataRecord } from '@/services/iotService';

const dataTypeLabels: Record<string, string> = {
  Numeric: '数值',
  Boolean: '布尔',
  String: '字符串',
  Enum: '枚举',
  Json: 'JSON',
};

const DataCenter: React.FC = () => {
  const actionRef = useRef<ActionType>();

  const fetchRecords = async (params: any) => {
    const { current = 1, pageSize = 20, reportedAt } = params;
    const payload: any = {
      deviceId: params.deviceId,
      dataPointId: params.dataPointId,
      pageIndex: current,
      pageSize,
    };

    if (Array.isArray(reportedAt) && reportedAt.length === 2) {
      const [start, end] = reportedAt;
      payload.startTime = start?.toISOString?.();
      payload.endTime = end?.toISOString?.();
    }

    const response = await iotService.queryDataRecords(payload);
    if (response.success && response.data) {
      return {
        data: response.data.Records || [],
        total: response.data.Total || 0,
        success: true,
      };
    }
    return {
      data: [],
      total: 0,
      success: false,
    };
  };

  const columns: ProColumns<IoTDataRecord>[] = [
    {
      title: '设备ID',
      dataIndex: 'deviceId',
      width: 180,
      copyable: true,
    },
    {
      title: '数据点ID',
      dataIndex: 'dataPointId',
      width: 180,
      copyable: true,
    },
    {
      title: '数据类型',
      dataIndex: 'dataType',
      width: 120,
      valueType: 'select',
      valueEnum: Object.keys(dataTypeLabels).reduce(
        (acc, key) => ({ ...acc, [key]: { text: dataTypeLabels[key] } }),
        {}
      ),
      render: (_, record) => <Tag>{dataTypeLabels[record.dataType] || record.dataType}</Tag>,
    },
    {
      title: '采样间隔(秒)',
      dataIndex: 'samplingInterval',
      width: 120,
      hideInSearch: true,
    },
    {
      title: '值',
      dataIndex: 'value',
      width: 200,
      ellipsis: true,
    },
    {
      title: '上报时间',
      dataIndex: 'reportedAt',
      valueType: 'dateTime',
      width: 180,
      sorter: true,
      hideInSearch: true,
    },
    {
      title: '时间范围',
      dataIndex: 'reportedAtRange',
      valueType: 'dateTimeRange',
      hideInTable: true,
      search: {
        transform: (value: any) => ({
          reportedAt: value,
        }),
      },
    },
    {
      title: '告警',
      dataIndex: 'isAlarm',
      width: 100,
      valueType: 'select',
      valueEnum: {
        true: { text: '告警', status: 'Error' },
        false: { text: '正常', status: 'Success' },
      },
      render: (dom, record) =>
        record.isAlarm ? <Tag color="red">告警</Tag> : <Tag color="green">正常</Tag>,
    },
  ];

  return (
    <ProTable<IoTDataRecord>
      actionRef={actionRef}
      columns={columns}
      request={fetchRecords}
      rowKey="id"
      search={{
        labelWidth: 90,
      }}
      pagination={{
        pageSize: 20,
        pageSizeOptions: [10, 20, 50, 100],
      }}
      toolbar={{
        title: '数据中心',
        actions: [
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => {
              actionRef.current?.reload();
            }}
          >
            刷新
          </Button>,
        ],
      }}
    />
  );
};

export default DataCenter;

