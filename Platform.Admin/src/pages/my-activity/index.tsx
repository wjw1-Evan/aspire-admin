import {
  PageContainer,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { Button } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import React, { useRef, useState } from 'react';
import { getCurrentUserActivityLogs } from '@/services/user-log/api';
import type { UserActivityLog } from '@/services/user-log/types';
import LogDetailDrawer from '../user-log/components/LogDetailDrawer';

const MyActivity: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<UserActivityLog | null>(null);

  const handleViewDetail = (record: UserActivityLog) => {
    setSelectedLog(record);
    setDetailDrawerOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailDrawerOpen(false);
    setSelectedLog(null);
  };

  
  const columns: ProColumns<UserActivityLog>[] = [
    {
      title: '操作类型',
      dataIndex: 'action',
      key: 'action',
      search: false,
       sorter: true,
      
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      search: false,
    },
    {
      title: 'IP地址',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      search: false,
      ellipsis: true,
    },
    {
      title: '用户代理',
      dataIndex: 'userAgent',
      key: 'userAgent',
      search: false,
      ellipsis: true,
      hideInTable: true,
    },
    {
      title: '操作时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      valueType: 'dateTime',
      search: false,
      sorter: true,
    },
    {
      title: '操作',
      key: 'option',
      valueType: 'option',
      render: (_, record) => [
        <Button
          key="view"
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          详情
        </Button>,
      ],
    },
  ];

  return (
    <PageContainer
      header={{
        title: '我的活动',
        subTitle: '查看您的所有操作记录',
      }}
    >
      <ProTable<UserActivityLog>
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 120,
          optionRender: (_searchConfig, _formProps, dom) => {
            const reversed = [...dom];
            reversed.reverse();
            return reversed;
          },
        }}
        request={async (params, sort) => {
          const { current = 1, pageSize = 20, action } = params;

          // 处理排序参数
          let sortBy = 'createdAt'; // 默认按创建时间排序
          let sortOrder: 'asc' | 'desc' = 'desc'; // 默认降序

          if (sort && Object.keys(sort).length > 0) {
            // ProTable 的 sort 格式: { fieldName: 'ascend' | 'descend' }
            const sortKey = Object.keys(sort)[0];
            const sortValue = sort[sortKey];
            
            // 将驼峰命名转换为后端字段名（如果需要）
            sortBy = sortKey === 'createdAt' ? 'createdAt' : sortKey;
            sortOrder = sortValue === 'ascend' ? 'asc' : 'desc';
          }

          try {
            const response = await getCurrentUserActivityLogs({
              page: current,
              pageSize,
              action,
              sortBy,
              sortOrder,
            });

            if (response.success && response.data) {
              // 后端返回的数据结构：{ data: { data: [...], total: xxx, ... } }
              const result = response.data as any;
              return {
                data: result.data || [],
                total: result.total || 0,
                success: true,
              };
            }

            return {
              data: [],
              total: 0,
              success: false,
            };
          } catch (error) {
            console.error('Failed to load activity logs:', error);
            return {
              data: [],
              total: 0,
              success: false,
            };
          }
        }}
        columns={columns}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
      />

      <LogDetailDrawer
        open={detailDrawerOpen}
        log={selectedLog}
        onClose={handleCloseDetail}
      />
    </PageContainer>
  );
};

export default MyActivity;

