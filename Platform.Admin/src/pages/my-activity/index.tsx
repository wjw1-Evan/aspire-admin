import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { request } from '@umijs/max';
import { Tag, Space, Button, Drawer, Input } from 'antd';
import { ProDescriptions } from '@ant-design/pro-components';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import { HistoryOutlined, CheckCircleOutlined, CloseCircleOutlined, ThunderboltOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { ApiResponse, PagedResult, PageParams } from '@/types';
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
  list: (params: PageParams) =>
    request<ApiResponse<PagedResult<UserActivityLog>>>('/api/users/me/activity-logs-paged', { params }),
  statistics: (search?: string) =>
    request<ApiResponse<ActivityStats>>('/api/users/me/activity-logs/statistics', { params: { search } }),
};


// ==================== Main ====================
const MyActivity: React.FC = () => {
  const intl = useIntl();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [state, setState] = useState({
    statistics: null as ActivityStats | null,
    detailDrawerOpen: false,
    selectedLogId: null as string | null,
    sorter: undefined as { sortBy: string; sortOrder: string } | undefined,
    search: '',
  });
  const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

  const handleViewDetail = useCallback((record: UserActivityLog) => {
    set({ selectedLogId: record.id, detailDrawerOpen: true });
  }, []);

  const handleCloseDetail = useCallback(() => {
    set({ detailDrawerOpen: false, selectedLogId: null });
  }, []);

  const handleRefresh = useCallback(() => {
    actionRef.current?.reload();
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
            <Space><HistoryOutlined />我的活动</Space>
            <Space size={12}>
              <Tag color="blue">总记录 {state.statistics?.total || 0}</Tag>
              <Tag color="green">成功 {state.statistics?.successCount || 0}</Tag>
              <Tag color="red">错误 {state.statistics?.errorCount || 0}</Tag>
              <Tag color="orange">操作类型 {state.statistics?.actionTypes?.length || 0}</Tag>
              <Tag color="purple">平均耗时 {Math.round(state.statistics?.avgDuration || 0)}ms</Tag>
            </Space>
          </Space>
        }
        request={async (params: any) => {
          const { current, pageSize } = params;
          const sortParams = state.sorter?.sortBy && state.sorter?.sortOrder ? state.sorter : undefined;
          const res = await api.list({ page: current, pageSize, search: state.search, ...sortParams });
          api.statistics(state.search).then(r => { if (r.success && r.data) set({ statistics: r.data }); });
          return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
        }} columns={columns} rowKey="id" search={false}
        onChange={(_p, _f, s: any) => set({ sorter: s?.order ? { sortBy: s.field, sortOrder: s.order === 'ascend' ? 'asc' : 'desc' } : undefined })}
        scroll={{ x: 'max-content' }}
        toolBarRender={() => [
          <Input.Search
            key="search"
            placeholder="搜索..."
            allowClear
            value={state.search}
            onChange={(e) => set({ search: e.target.value })}
            onSearch={(value) => { set({ search: value }); actionRef.current?.reload(); }}
            style={{ width: 260, marginRight: 8 }}
            prefix={<SearchOutlined />}
          />,
          <Button key="refresh" icon={<ReloadOutlined />} onClick={handleRefresh}>{intl.formatMessage({ id: 'pages.button.refresh' })}</Button>,
        ]}
      />

      <LogDetailDrawer open={state.detailDrawerOpen} logId={state.selectedLogId || undefined} fetchFromApi={true} onClose={handleCloseDetail} />
    </PageContainer>
  );
};


// ==================== LogDetailDrawer ====================
const LogDetailDrawer: React.FC<{ open: boolean; logId?: string; fetchFromApi?: boolean; onClose: () => void }> = ({ open, logId, fetchFromApi, onClose }) => {
  const [log, setLog] = useState<UserActivityLog | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && logId && fetchFromApi) {
      setLoading(true);
      request<ApiResponse<UserActivityLog>>(`/api/user-activity-log/${logId}`).then(r => {
        if (r.success && r.data) setLog(r.data);
      }).finally(() => setLoading(false));
    }
  }, [open, logId, fetchFromApi]);

  if (!open) return null;

  return (
    <Drawer title="日志详情" placement="right" open={open} onClose={onClose} styles={{ wrapper: { width: 600 } }}>
      {loading ? <div>加载中...</div> : log ? (
        <ProDescriptions column={1} size="small" bordered>
          <ProDescriptions.Item label="操作">{getActionText(log.action)}</ProDescriptions.Item>
          <ProDescriptions.Item label="HTTP 方法">{log.httpMethod ? <Tag color={getMethodColor(log.httpMethod)}>{log.httpMethod}</Tag> : '-'}</ProDescriptions.Item>
          <ProDescriptions.Item label="状态码">{getStatusBadge(log.statusCode)}</ProDescriptions.Item>
          <ProDescriptions.Item label="请求URL">{log.fullUrl || '-'}</ProDescriptions.Item>
          <ProDescriptions.Item label="耗时">{log.duration !== undefined ? `${log.duration}ms` : '-'}</ProDescriptions.Item>
          <ProDescriptions.Item label="IP地址">{log.ipAddress || '-'}</ProDescriptions.Item>
          <ProDescriptions.Item label="操作时间">{log.createdAt ? dayjs(log.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</ProDescriptions.Item>
        </ProDescriptions>
      ) : <div>未找到日志</div>}
    </Drawer>
  );
};

export default MyActivity;