import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { PageContainer, StatCard } from '@/components';
import { useIntl } from '@umijs/max';
import { request } from '@umijs/max';
import { Tag, Row, Col, Card, Space, Button, Drawer, Descriptions } from 'antd';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import { HistoryOutlined, CheckCircleOutlined, CloseCircleOutlined, ThunderboltOutlined, ReloadOutlined, DashboardOutlined } from '@ant-design/icons';
import { ApiResponse, PagedResult, PageParams } from '@/types';
import { formatDateTime } from '@/utils/format';
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
    searchText: '',
  });
  const set = (partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial }));

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
    { title: intl.formatMessage({ id: 'pages.table.actionTime' }), dataIndex: 'createdAt', key: 'createdAt', sorter: true, defaultSortOrder: 'descend', render: (dom: any, r) => formatDateTime(r.createdAt) },
  ], [intl, handleViewDetail]);

  return (
    <PageContainer title={<Space><HistoryOutlined />{intl.formatMessage({ id: 'pages.myActivity.title' })}</Space>} extra={<Space wrap><Button key="refresh" icon={<ReloadOutlined />} onClick={handleRefresh}>{intl.formatMessage({ id: 'pages.button.refresh' })}</Button></Space>}>
      {state.statistics && <Card style={{ marginBottom: 16 }}><Row gutter={[12, 12]}>
        {[{ key: 'total', title: intl.formatMessage({ id: 'pages.myActivity.statistics.totalLogs' }), icon: <HistoryOutlined />, color: '#1890ff' },
          { key: 'successCount', title: intl.formatMessage({ id: 'pages.myActivity.statistics.successCount' }), icon: <CheckCircleOutlined />, color: '#52c41a' },
          { key: 'errorCount', title: intl.formatMessage({ id: 'pages.myActivity.statistics.errorCount' }), icon: <CloseCircleOutlined />, color: '#ff4d4f' },
          { key: 'actionTypes', title: intl.formatMessage({ id: 'pages.myActivity.statistics.actionTypes' }), icon: <ThunderboltOutlined />, color: '#faad14' },
          { key: 'avgDuration', title: intl.formatMessage({ id: 'pages.myActivity.statistics.avgDuration' }), suffix: 'ms', icon: <DashboardOutlined />, color: '#722ed1' }
        ].map(i => (
          <Col xs={24} sm={12} md={6} lg={6} xl={4} xxl={4} key={i.key}><StatCard title={i.title} value={i.key === 'actionTypes' ? (Array.isArray(state.statistics![i.key as keyof ActivityStats]) ? (state.statistics![i.key as keyof ActivityStats] as string[]).length : state.statistics![i.key as keyof ActivityStats] as number) : i.key === 'avgDuration' ? Math.round((state.statistics![i.key as keyof ActivityStats] as number) || 0) : (state.statistics![i.key as keyof ActivityStats] as string | number)} suffix={i.suffix} icon={i.icon} color={i.color} /></Col>
        ))}
      </Row></Card>}

      <ProTable actionRef={actionRef} request={async (params: any) => {
        const { current } = params;
        const sortParams = state.sorter?.sortBy && state.sorter?.sortOrder ? state.sorter : undefined;
        const res = await api.list({ page: current, search: state.searchText, ...sortParams });
        api.statistics(state.searchText).then(r => { if (r.success && r.data) set({ statistics: r.data }); });
        return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
      }} columns={columns} rowKey="id" search={false}
        onChange={(_p, _f, s: any) => set({ sorter: s?.order ? { sortBy: s.field, sortOrder: s.order === 'ascend' ? 'asc' : 'desc' } : undefined })}
        toolBarRender={() => [
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
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="操作">{getActionText(log.action)}</Descriptions.Item>
          <Descriptions.Item label="HTTP 方法">{log.httpMethod ? <Tag color={getMethodColor(log.httpMethod)}>{log.httpMethod}</Tag> : '-'}</Descriptions.Item>
          <Descriptions.Item label="状态码">{getStatusBadge(log.statusCode)}</Descriptions.Item>
          <Descriptions.Item label="请求URL">{log.fullUrl || '-'}</Descriptions.Item>
          <Descriptions.Item label="耗时">{log.duration !== undefined ? `${log.duration}ms` : '-'}</Descriptions.Item>
          <Descriptions.Item label="IP地址">{log.ipAddress || '-'}</Descriptions.Item>
          <Descriptions.Item label="操作时间">{formatDateTime(log.createdAt)}</Descriptions.Item>
        </Descriptions>
      ) : <div>未找到日志</div>}
    </Drawer>
  );
};

export default MyActivity;