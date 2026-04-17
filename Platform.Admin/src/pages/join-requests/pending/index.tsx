import React, { useRef, useState, useCallback } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl, useModel } from '@umijs/max';
import { request } from '@umijs/max';
import { Button, Space, App, Modal, Input } from 'antd';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ApiResponse, PageParams } from '@/types';

const { TextArea } = Input;

// ==================== Types ====================
interface JoinRequestDetail {
  id: string; username: string; userEmail?: string; reason?: string; status: string; createdAt: string; updatedAt?: string;
}

// ==================== API ====================
const api = {
  list: (companyId: string, params: PageParams) =>
    request<ApiResponse<JoinRequestDetail[]>>(`/apiservice/api/company/${companyId}/join-requests`, { params: { status: 'pending', ...params } }),
  approve: (id: string) =>
    request<ApiResponse<string>>(`/apiservice/api/company/join-requests/${id}/approve`, { method: 'POST', data: {} }),
  reject: (id: string, data: { rejectReason: string }) =>
    request<ApiResponse<string>>(`/apiservice/api/company/join-requests/${id}/reject`, { method: 'POST', data }),
};

// ==================== Main ====================
const PendingJoinRequests: React.FC = () => {
  const intl = useIntl();
  const { message, modal } = App.useApp();
  const { initialState } = useModel('@@initialState');
  const actionRef = useRef<ActionType>(null!);
  const [state, setState] = useState({
    sorter: undefined as { sortBy: string; sortOrder: string } | undefined,
    search: '',
  });
  const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

  const columns: ProColumns<JoinRequestDetail>[] = [
    {
      title: intl.formatMessage({ id: 'pages.table.applicant' }),
      dataIndex: 'username',
      key: 'username',
      sorter: true,
      render: (_, record: JoinRequestDetail) => (
        <div>
          <div><strong>{record.username}</strong></div>
          {record.userEmail && <div style={{ fontSize: 12, color: '#999' }}>{record.userEmail}</div>}
        </div>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.table.applyReason' }),
      dataIndex: 'reason',
      key: 'reason',
      sorter: true,
      ellipsis: true,
      render: (text) => (text as React.ReactNode) || <span style={{ color: '#999' }}>{intl.formatMessage({ id: 'pages.table.noReason' })}</span>,
    },
    {
      title: intl.formatMessage({ id: 'pages.table.applyTime' }),
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: true,
      render: (_, record: JoinRequestDetail) => record.createdAt ? dayjs(record.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.table.status' }),
      dataIndex: 'status',
      key: 'status',
      sorter: true,
      render: () => (
        <Space>
          <ClockCircleOutlined style={{ color: '#faad14' }} />
          <span>{intl.formatMessage({ id: 'pages.table.status.pending' })}</span>
        </Space>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.table.actions' }),
      key: 'actions',
      render: (_, record: JoinRequestDetail) => (
        <Space>
          <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => handleApprove(record)} size="small">
            {intl.formatMessage({ id: 'pages.button.approve' })}
          </Button>
          <Button danger icon={<CloseCircleOutlined />} onClick={() => handleReject(record)} size="small">
            {intl.formatMessage({ id: 'pages.button.reject' })}
          </Button>
        </Space>
      ),
    },
  ];

  const handleApprove = async (record: JoinRequestDetail) => {
    modal.confirm({
      title: intl.formatMessage({ id: 'pages.modal.confirmApprove' }, { username: record.username }),
      content: (
        <div>
          <p>{intl.formatMessage({ id: 'pages.modal.applyReasonPrefix' })}{record.reason || intl.formatMessage({ id: 'pages.table.noReason' })}</p>
          <p>{intl.formatMessage({ id: 'pages.modal.approveWarning' })}</p>
        </div>
      ),
      okText: intl.formatMessage({ id: 'pages.modal.okApprove' }),
      cancelText: intl.formatMessage({ id: 'pages.modal.cancel' }),
      onOk: async () => {
        const res = await api.approve(record.id);
        if (res.success) {
          message.success(intl.formatMessage({ id: 'pages.message.applicationApproved' }));
          actionRef.current!.reload();
        } else {
          throw new Error(res.message || intl.formatMessage({ id: 'pages.message.operationFailed' }));
        }
      },
    });
  };

  const handleReject = (record: JoinRequestDetail) => {
    let rejectReason = '';
    modal.confirm({
      title: intl.formatMessage({ id: 'pages.modal.rejectApplication' }, { username: record.username }),
      content: (
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 8 }}>{intl.formatMessage({ id: 'pages.modal.rejectReasonLabel' })}</div>
          <TextArea
            rows={4}
            placeholder={intl.formatMessage({ id: 'pages.modal.rejectReasonPlaceholder' })}
            onChange={(e) => { rejectReason = e.target.value; }}
          />
        </div>
      ),
      okText: intl.formatMessage({ id: 'pages.modal.confirmReject' }),
      okButtonProps: { danger: true },
      cancelText: intl.formatMessage({ id: 'pages.modal.cancel' }),
      onOk: async () => {
        if (!rejectReason.trim()) {
          message.warning(intl.formatMessage({ id: 'pages.message.pleaseEnterReason' }));
          throw new Error(intl.formatMessage({ id: 'pages.message.pleaseEnterReason' }));
        }
        const res = await api.reject(record.id, { rejectReason: rejectReason.trim() });
        if (res.success) {
          message.success(intl.formatMessage({ id: 'pages.message.applicationRejected' }));
          actionRef.current!.reload();
        } else {
          throw new Error(res.message || intl.formatMessage({ id: 'pages.message.operationFailed' }));
        }
      },
    });
  };

  return (
    <PageContainer>
      <ProTable
        actionRef={actionRef}
        scroll={{ x: 'max-content' }}
        request={async (params: any) => {
          const companyId = initialState?.currentUser?.currentCompanyId || '';
          if (!companyId) return { data: [], total: 0, success: true };
          const { current, pageSize, search } = params;
          const sortParams = state.sorter?.sortBy && state.sorter?.sortOrder ? state.sorter : undefined;
          let keyword = state.search || search;
          const res = await api.list(companyId, { page: current, pageSize, search: keyword, ...sortParams });
          if (res.success && res.data) {
            let filteredData = res.data;
            if (keyword) {
              const kw = keyword.toLowerCase();
              filteredData = res.data.filter(item =>
                item.username.toLowerCase().includes(kw) ||
                (item.reason && item.reason.toLowerCase().includes(kw))
              );
            }
            return { data: filteredData, total: filteredData.length, success: true };
          }
          return { data: [], total: 0, success: false };
        }}
        columns={columns}
        rowKey="id"
        search={false}
        onChange={(_p, _f, s: any) => set({ sorter: s?.order ? { sortBy: s.field, sortOrder: s.order === 'ascend' ? 'asc' : 'desc' } : undefined })}
        toolBarRender={() => [
          <Input.Search
            key="search"
            placeholder={intl.formatMessage({ id: 'pages.search.placeholder' })}
            style={{ width: 260, marginRight: 8 }}
            allowClear
            value={state.search}
            onChange={(e) => set({ search: e.target.value })}
            onSearch={(v) => { set({ search: v }); actionRef.current!.reload(); }}
          />,
        ]}
      />
    </PageContainer>
  );
};

export default PendingJoinRequests;