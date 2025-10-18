import { ProTable } from '@ant-design/pro-components';
import { PageContainer } from '@ant-design/pro-layout';
import { Tag, Button, Space, App, Popconfirm } from 'antd';
import React, { useRef, useState } from 'react';
import { getMyRequests, cancelRequest } from '@/services/company';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';

/**
 * v3.1: 我的加入申请列表
 */
const MyJoinRequests: React.FC = () => {
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>();
  const [loading, setLoading] = useState(false);

  // 撤回申请
  const handleCancel = async (id: string) => {
    setLoading(true);
    try {
      const response = await cancelRequest(id);

      if (response.success) {
        message.success('申请已撤回');
        actionRef.current?.reload();
      } else {
        message.error(response.errorMessage || '撤回失败');
      }
    } catch (error: any) {
      message.error(error.message || '撤回失败');
    } finally {
      setLoading(false);
    }
  };

  const columns: ProColumns<API.JoinRequestDetail>[] = [
    {
      title: '企业名称',
      dataIndex: 'companyName',
      width: 200,
      render: (_, record) => <strong>{record.companyName}</strong>,
    },
    {
      title: '申请理由',
      dataIndex: 'reason',
      ellipsis: true,
      search: false,
      render: (text) => text || <span style={{ color: '#999' }}>无</span>,
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      width: 180,
      valueType: 'dateTime',
      sorter: true,
      search: false,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      valueEnum: {
        pending: {
          text: '待审核',
          status: 'Processing',
        },
        approved: {
          text: '已通过',
          status: 'Success',
        },
        rejected: {
          text: '已拒绝',
          status: 'Error',
        },
        cancelled: {
          text: '已撤回',
          status: 'Default',
        },
      },
      render: (_, record) => {
        const statusConfig: Record<
          string,
          { icon: React.ReactNode; color: string }
        > = {
          pending: { icon: <ClockCircleOutlined />, color: 'processing' },
          approved: { icon: <CheckCircleOutlined />, color: 'success' },
          rejected: { icon: <CloseCircleOutlined />, color: 'error' },
          cancelled: { icon: null, color: 'default' },
        };
        const config = statusConfig[record.status] || statusConfig.pending;

        return (
          <Tag icon={config.icon} color={config.color}>
            {record.status === 'pending' && '待审核'}
            {record.status === 'approved' && '已通过'}
            {record.status === 'rejected' && '已拒绝'}
            {record.status === 'cancelled' && '已撤回'}
          </Tag>
        );
      },
    },
    {
      title: '审核结果',
      dataIndex: 'rejectReason',
      ellipsis: true,
      search: false,
      render: (_, record) => {
        if (record.status === 'approved') {
          return (
            <span style={{ color: '#52c41a' }}>
              ✓ 通过{' '}
              {record.reviewedByName && `（审核人：${record.reviewedByName}）`}
            </span>
          );
        }
        if (record.status === 'rejected') {
          return (
            <span style={{ color: '#ff4d4f' }}>
              ✗ 拒绝理由：{record.rejectReason || '无'}
            </span>
          );
        }
        return <span style={{ color: '#999' }}>-</span>;
      },
    },
    {
      title: '操作',
      valueType: 'option',
      width: 120,
      render: (_, record) => {
        if (record.status === 'pending') {
          return (
            <Popconfirm
              title="确定撤回申请吗？"
              onConfirm={() => handleCancel(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" danger loading={loading}>
                撤回
              </Button>
            </Popconfirm>
          );
        }
        return null;
      },
    },
  ];

  return (
    <PageContainer
      header={{
        title: '我的申请',
        subTitle: '查看我提交的加入企业申请',
      }}
    >
      <ProTable<API.JoinRequestDetail>
        columns={columns}
        actionRef={actionRef}
        request={async (params, sort) => {
          try {
            const response = await getMyRequests();

            if (response.success && response.data) {
              return {
                data: response.data,
                success: true,
                total: response.data.length,
              };
            }

            return {
              data: [],
              success: false,
            };
          } catch (error) {
            return {
              data: [],
              success: false,
            };
          }
        }}
        rowKey="id"
        search={false}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
        }}
        dateFormatter="string"
        toolBarRender={() => [
          <Button
            key="search"
            type="primary"
            onClick={() => {
              window.location.href = '/company/search';
            }}
          >
            搜索企业
          </Button>,
        ]}
      />
    </PageContainer>
  );
};

export default MyJoinRequests;
