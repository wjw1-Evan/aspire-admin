import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { request } from '@umijs/max';
import { Tag, Space, Input } from 'antd';
import { Drawer } from 'antd';
import { ProDescriptions } from '@ant-design/pro-components';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import { HistoryOutlined, CheckCircleOutlined, CloseCircleOutlined, ThunderboltOutlined, SearchOutlined } from '@ant-design/icons';
import { ApiResponse, PagedResult } from '@/types';
import dayjs from 'dayjs';
import { getActionTagColor, getActionText, getMethodColor, getStatusBadge } from '@/utils/activityLog';


// ==================== Types ====================
interface UserActivityLog {
  id: string;
  userId?: string;
  action: string;
  httpMethod?: string;
  statusCode?: number;
  fullUrl?: string;
  duration?: number;
  ipAddress?: string;
  createdAt: string;
  updatedAt?: string;
}

interface ActivityStats {
  total: number;
  successCount: number;
  errorCount: number;
  actionTypes: string[];
  avgDuration: number;
}


// ==================== API ====================
const api = {
  list: (params: any) =>
    request<ApiResponse<PagedResult<UserActivityLog>>>('/apiservice/api/users/me/activity-logs-paged', { params }),
  statistics: (search?: string) =>
    request<ApiResponse<ActivityStats>>('/apiservice/api/users/me/activity-logs/statistics', { params: { search } }),
};


// ==================== Main ====================
const MyActivity: React.FC = () => {
  const intl = useIntl();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [state, setState] = useState({
    statistics: null as ActivityStats | null,
    detailDrawerOpen: false,
    selectedLogId: null as string | null,
    search: '',
  });
  const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

  const handleViewDetail = useCallback((record: UserActivityLog) => {
    set({ selectedLogId: record.id, detailDrawerOpen: true });
  }, []);

  const handleCloseDetail = useCallback(() => {
    set({ detailDrawerOpen: false, selectedLogId: null });
  }, []);

  const columns: ProColumns<UserActivityLog>[] = useMemo(() => [
    { title: intl.formatMessage({ id: 'pages.table.action' }), dataIndex: 'action', key: 'action', sorter: true, render: (dom: any, r) => <a onClick={() => handleViewDetail(r)}><Tag color={getActionTagColor(r.action)}>{getActionText(r.action)}</Tag></a> },
    { title: intl.formatMessage({ id: 'pages.table.httpMethod' }), dataIndex: 'httpMethod', key: 'httpMethod', sorter: true, render: (dom: any, r) => r.httpMethod ? <Tag color={getMethodColor(r.httpMethod)}>{r.httpMethod}</Tag> : '-' },
    { title: intl.formatMessage({ id: 'pages.table.statusCode' }), dataIndex: 'statusCode', key: 'statusCode', sorter: true, render: (dom: any, r) => getStatusBadge(r.statusCode) },
    { title: intl.formatMessage({ id: 'pages.table.fullUrl' }), dataIndex: 'fullUrl', key: 'fullUrl', ellipsis: true, sorter: true, render: (dom: any, r) => r.fullUrl ? <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{r.fullUrl}</span> : '-' },
    { title: intl.formatMessage({ id: 'pages.table.duration' }), dataIndex: 'duration', key: 'duration', sorter: true, render: (dom: any, r) => { if (r.duration === undefined || r.duration === null) return '-'; let color = 'green'; if (r.duration > 1000) color = 'orange'; if (r.duration > 3000) color = 'red'; return <span style={{ color }}>{r.duration}ms</span>; } },
    { title: intl.formatMessage({ id: 'pages.table.ipAddress' }), dataIndex: 'ipAddress', key: 'ipAddress', ellipsis: true, sorter: true },
    { title: intl.formatMessage({ id: 'pages.table.actionTime' }), dataIndex: 'createdAt', key: 'createdAt', sorter: true, defaultSortOrder: 'descend', render: (dom: any, r) => r.createdAt ? dayjs(r.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-' },
  ], [intl, handleViewDetail]);

  return (
    <PageContainer>
      <ProTable
        actionRef={actionRef}
        headerTitle={
          <Space size={24}>
            <Space><HistoryOutlined />{intl.formatMessage({ id: 'pages.myActivity.title' })}</Space>
            <Space size={12}>
              <Tag color="blue">{intl.formatMessage({ id: 'pages.myActivity.totalRecords' })} {state.statistics?.total || 0}</Tag>
              <Tag color="green">{intl.formatMessage({ id: 'pages.myActivity.successCount' })} {state.statistics?.successCount || 0}</Tag>
              <Tag color="red">{intl.formatMessage({ id: 'pages.myActivity.errorCount' })} {state.statistics?.errorCount || 0}</Tag>
              <Tag color="orange">{intl.formatMessage({ id: 'pages.myActivity.actionTypes' })} {state.statistics?.actionTypes?.length || 0}</Tag>
              <Tag color="purple">{intl.formatMessage({ id: 'pages.myActivity.avgDuration' })} {Math.round(state.statistics?.avgDuration || 0)}ms</Tag>
            </Space>
          </Space>
        }
        request={async (params: any, sort: any, filter: any) => {
          const res = await api.list({ ...params, search: state.search, sort, filter });
          api.statistics(state.search).then(r => { if (r.success && r.data) set({ statistics: r.data }); });
          return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
        }} columns={columns} rowKey="id" search={false}
        scroll={{ x: 'max-content' }}
        toolBarRender={() => [
          <Input.Search
            key="search"
            placeholder={intl.formatMessage({ id: 'pages.common.search' })}
            allowClear
            value={state.search}
            onChange={(e) => set({ search: e.target.value })}
            onSearch={(value) => { set({ search: value }); actionRef.current?.reload(); }}
            style={{ width: 260, marginRight: 8 }}
            prefix={<SearchOutlined />}
          />,
        ]}
      />

      <LogDetailDrawer open={state.detailDrawerOpen} logId={state.selectedLogId || undefined} fetchFromApi={true} onClose={handleCloseDetail} />
    </PageContainer>
  );
};


// ==================== LogDetailDrawer ====================
const LogDetailDrawer: React.FC<{ open: boolean; logId?: string; fetchFromApi?: boolean; onClose: () => void }> = ({ open, logId, fetchFromApi, onClose }) => {
  const intl = useIntl();
  const [log, setLog] = useState<UserActivityLog | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && logId && fetchFromApi) {
      setLoading(true);
      request<ApiResponse<UserActivityLog>>(`/apiservice/api/users/me/activity-logs/${logId}`).then(r => {
        if (r.success && r.data) setLog(r.data);
      }).finally(() => setLoading(false));
    }
  }, [open, logId, fetchFromApi]);

  if (!open) return null;

  return (
    <Drawer title={intl.formatMessage({ id: 'pages.myActivity.logDetailTitle' })} placement="right" open={open} onClose={onClose} size="large">
      {loading ? <div>{intl.formatMessage({ id: 'pages.myActivity.loading' })}</div> : log ? (
        <ProDescriptions column={1} size="small" bordered>
          <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.myActivity.action' })}>{getActionText(log.action)}</ProDescriptions.Item>
          <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.myActivity.httpMethod' })}>{log.httpMethod ? <Tag color={getMethodColor(log.httpMethod)}>{log.httpMethod}</Tag> : '-'}</ProDescriptions.Item>
          <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.myActivity.statusCode' })}>{getStatusBadge(log.statusCode)}</ProDescriptions.Item>
          <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.myActivity.requestUrl' })}>{log.fullUrl || '-'}</ProDescriptions.Item>
          <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.myActivity.duration' })}>{log.duration !== undefined ? `${log.duration}ms` : '-'}</ProDescriptions.Item>
          <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.myActivity.ipAddress' })}>{log.ipAddress || '-'}</ProDescriptions.Item>
          <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.myActivity.actionTime' })}>{log.createdAt ? dayjs(log.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</ProDescriptions.Item>
        </ProDescriptions>
      ) : <div>{intl.formatMessage({ id: 'pages.myActivity.logNotFound' })}</div>}
    </Drawer>
  );
};

export default MyActivity;
