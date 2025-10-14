import { ProTable } from '@ant-design/pro-components';
import { PageContainer } from '@ant-design/pro-layout';
import { Tag, Button, Space, App, Modal, Input } from 'antd';
import React, { useRef, useState } from 'react';
import { request } from '@umijs/max';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

const { TextArea } = Input;

/**
 * v3.1: 待审核的加入申请列表（管理员）
 */
const PendingJoinRequests: React.FC = () => {
  const { message, modal } = App.useApp();
  const actionRef = useRef<ActionType>();
  const [loading, setLoading] = useState(false);

  // 审核通过
  const handleApprove = async (record: API.JoinRequestDetail) => {
    Modal.confirm({
      title: `确定通过 ${record.username} 的申请吗？`,
      content: (
        <div>
          <p>申请理由：{record.reason || '无'}</p>
          <p>通过后，该用户将成为企业成员。</p>
        </div>
      ),
      okText: '通过',
      cancelText: '取消',
      onOk: async () => {
        setLoading(true);
        try {
          const response = await request<API.ApiResponse<boolean>>(
            `/api/join-request/${record.id}/approve`,
            {
              method: 'POST',
              data: {},
            }
          );

          if (response.success) {
            message.success('申请已通过');
            actionRef.current?.reload();
          } else {
            message.error(response.errorMessage || '操作失败');
          }
        } catch (error: any) {
          message.error(error.message || '操作失败');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // 拒绝申请
  const handleReject = (record: API.JoinRequestDetail) => {
    let rejectReason = '';

    modal.confirm({
      title: `拒绝 ${record.username} 的申请`,
      content: (
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 8 }}>请说明拒绝理由：</div>
          <TextArea
            rows={4}
            placeholder="请输入拒绝理由..."
            onChange={(e) => {
              rejectReason = e.target.value;
            }}
          />
        </div>
      ),
      okText: '确定拒绝',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        if (!rejectReason.trim()) {
          message.warning('请输入拒绝理由');
          return Promise.reject();
        }

        setLoading(true);
        try {
          const response = await request<API.ApiResponse<boolean>>(
            `/api/join-request/${record.id}/reject`,
            {
              method: 'POST',
              data: {
                rejectReason: rejectReason.trim(),
              },
            }
          );

          if (response.success) {
            message.success('申请已拒绝');
            actionRef.current?.reload();
          } else {
            message.error(response.errorMessage || '操作失败');
          }
        } catch (error: any) {
          message.error(error.message || '操作失败');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const columns: ProColumns<API.JoinRequestDetail>[] = [
    {
      title: '申请人',
      dataIndex: 'username',
      width: 150,
      render: (_, record) => (
        <div>
          <div><strong>{record.username}</strong></div>
          {record.userEmail && (
            <div style={{ fontSize: 12, color: '#999' }}>{record.userEmail}</div>
          )}
        </div>
      ),
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
      width: 100,
      hideInTable: true,
      valueEnum: {
        pending: {
          text: '待审核',
          status: 'Processing',
        },
      },
    },
    {
      title: '操作',
      valueType: 'option',
      width: 180,
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            onClick={() => handleApprove(record)}
            loading={loading}
            icon={<CheckCircleOutlined />}
          >
            通过
          </Button>
          <Button
            danger
            size="small"
            onClick={() => handleReject(record)}
            loading={loading}
            icon={<CloseCircleOutlined />}
          >
            拒绝
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      header={{
        title: '待审核申请',
        subTitle: '审核企业加入申请',
      }}
    >
      <ProTable<API.JoinRequestDetail>
        columns={columns}
        actionRef={actionRef}
        request={async (params, sort) => {
          try {
            const response = await request<API.ApiResponse<API.JoinRequestDetail[]>>(
              '/api/join-request/pending',
              {
                method: 'GET',
              }
            );

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
      />
    </PageContainer>
  );
};

export default PendingJoinRequests;

