import React, { useRef, useState, useCallback, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { StatCard } from '@/components';
import { useIntl } from '@umijs/max';
import { request } from '@umijs/max';
import { Tag, Space, Card, Row, Col, Button, Input } from 'antd';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import { ReloadOutlined, FileTextOutlined, CheckCircleOutlined, CloseCircleOutlined, ThunderboltOutlined, DashboardOutlined, SearchOutlined } from '@ant-design/icons';
import { ApiResponse, PagedResult, PageParams } from '@/types';
import dayjs from 'dayjs';
import { getActionTagColor, getActionText, getMethodColor, getStatusBadge } from '@/utils/activityLog';
import LogDetailDrawer from './components/LogDetailDrawer';


// ==================== Types ====================
interface UserActivityLog {
  id: string;
  createdBy?: string;
  username?: string;
  action: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  httpMethod?: string;
  path?: string;
  queryString?: string;
  fullUrl?: string;
  statusCode?: number;
  duration?: number;
  responseBody?: string;
  createdAt: string;
}

interface ActivityLogStatistics {
  total: number;
  successCount: number;
  errorCount: number;
  avgDuration: number;
  actionTypes: Array<{ action: string; count: number }>;
}

interface LogStats {
  total: number;
  success: number;
  error: number;
  actions: number;
  avgDuration: number;
}


// ==================== API ====================
const api = {
  list: (params: PageParams) =>
    request<ApiResponse<PagedResult<UserActivityLog>>>('/api/users/activity-logs', { params }),
  statistics: () =>
    request<ApiResponse<ActivityLogStatistics>>('/api/users/activity-logs/statistics'),
  getById: (id: string) =>
    request<ApiResponse<UserActivityLog>>(`/api/users/activity-logs/${id}`),
};


// ==================== Main ====================
const UserLog: React.FC = () => {
  const intl = useIntl();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [state, setState] = useState({
    statistics: null as LogStats | null,
    detailDrawerOpen: false,
    selectedLog: null as UserActivityLog | null,
    sorter: undefined as { sortBy: string; sortOrder: string } | undefined,
    search: '',
  });
  const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

  useEffect(() => {
    api.statistics().then(r => {
      if (r.success && r.data) {
        set({
          statistics: {
            total: r.data.total || 0,
            success: r.data.successCount || 0,
            error: r.data.errorCount || 0,
            actions: r.data.actionTypes?.length || 0,
            avgDuration: Math.round(r.data.avgDuration || 0),
          }
        });
      }
    });
  }, []);

  const columns: ProColumns<UserActivityLog>[] = [
    { title: intl.formatMessage({ id: 'pages.table.user' }), dataIndex: 'username', key: 'username', ellipsis: true, sorter: true, render: (dom: any, r) => <a onClick={() => set({ selectedLog: r, detailDrawerOpen: true })}>{dom}</a> },
    { title: intl.formatMessage({ id: 'pages.table.action' }), dataIndex: 'action', key: 'action', sorter: true, render: (_: any, r: UserActivityLog) => <Tag color={getActionTagColor(r.action)}>{getActionText(r.action)}</Tag> },
    { title: intl.formatMessage({ id: 'pages.table.httpMethod' }), dataIndex: 'httpMethod', key: 'httpMethod', sorter: true, render: (_: any, r: UserActivityLog) => r.httpMethod ? <Tag color={getMethodColor(r.httpMethod)}>{r.httpMethod}</Tag> : '-' },
    { title: intl.formatMessage({ id: 'pages.table.statusCode' }), dataIndex: 'statusCode', key: 'statusCode', sorter: true, render: (_: any, r: UserActivityLog) => getStatusBadge(r.statusCode) },
    { title: intl.formatMessage({ id: 'pages.table.fullUrl' }), dataIndex: 'fullUrl', key: 'fullUrl', ellipsis: true, sorter: true, render: (_: any, r: UserActivityLog) => r.fullUrl ? <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{r.fullUrl}</span> : '-' },
    { title: intl.formatMessage({ id: 'pages.table.duration' }), dataIndex: 'duration', key: 'duration', sorter: true, render: (_: any, r: UserActivityLog) => {
      if (r.duration === undefined || r.duration === null) return '-';
      let color = 'green';
      if (r.duration > 1000) color = 'orange';
      if (r.duration > 3000) color = 'red';
      return <span style={{ color }}>{r.duration}ms</span>;
    }},
    { title: intl.formatMessage({ id: 'pages.table.ipAddress' }), dataIndex: 'ipAddress', key: 'ipAddress', ellipsis: true, sorter: true },
    { title: intl.formatMessage({ id: 'pages.table.actionTime' }), dataIndex: 'createdAt', key: 'createdAt', sorter: true, defaultSortOrder: 'descend', render: (_: any, r: UserActivityLog) => r.createdAt ? dayjs(r.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-' },
  ];

  const handleRefresh = useCallback(() => {
    actionRef.current?.reload();
  }, []);

  return (
    <PageContainer
      title={<Space><FileTextOutlined />{intl.formatMessage({ id: 'pages.userLog.title' })}</Space>}
      extra={<Space wrap><Button key="refresh" icon={<ReloadOutlined />} onClick={handleRefresh}>{intl.formatMessage({ id: 'pages.button.refresh' })}</Button></Space>}
    >
      {state.statistics && <Card style={{ marginBottom: 16 }}><Row gutter={[12, 12]}>
        <Col xs={24} sm={12} md={6} lg={6} xl={4} xxl={4}><StatCard title={intl.formatMessage({ id: 'pages.userLog.stats.total', defaultMessage: '总记录数' })} value={state.statistics.total} icon={<DashboardOutlined />} color="#1890ff" /></Col>
        <Col xs={24} sm={12} md={6} lg={6} xl={4} xxl={4}><StatCard title={intl.formatMessage({ id: 'pages.userLog.stats.success', defaultMessage: '成功次数' })} value={state.statistics.success} icon={<CheckCircleOutlined />} color="#52c41a" /></Col>
        <Col xs={24} sm={12} md={6} lg={6} xl={4} xxl={4}><StatCard title={intl.formatMessage({ id: 'pages.userLog.stats.error', defaultMessage: '错误次数' })} value={state.statistics.error} icon={<CloseCircleOutlined />} color="#ff4d4f" /></Col>
        <Col xs={24} sm={12} md={6} lg={6} xl={4} xxl={4}><StatCard title={intl.formatMessage({ id: 'pages.userLog.stats.actions', defaultMessage: '操作类型数' })} value={state.statistics.actions} icon={<ThunderboltOutlined />} color="#faad14" /></Col>
        <Col xs={24} sm={12} md={6} lg={6} xl={4} xxl={4}><StatCard title={intl.formatMessage({ id: 'pages.userLog.stats.avgDuration', defaultMessage: '平均耗时(ms)' })} value={state.statistics.avgDuration} suffix="ms" icon={<DashboardOutlined />} color="#722ed1" /></Col>
      </Row></Card>}

      <ProTable actionRef={actionRef} request={async (params: any) => {
        const { current, pageSize } = params;
        const sortParams = state.sorter?.sortBy && state.sorter?.sortOrder ? state.sorter : undefined;
        const res = await api.list({ page: current, pageSize, search: state.search, ...sortParams });
        api.statistics().then(r => {
          if (r.success && r.data) {
            set({
              statistics: {
                total: r.data.total || 0,
                success: r.data.successCount || 0,
                error: r.data.errorCount || 0,
                actions: r.data.actionTypes?.length || 0,
                avgDuration: Math.round(r.data.avgDuration || 0),
              }
            });
          }
        });
        return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
      }} columns={columns} rowKey="id" search={false}
        onChange={(_p, _f, s: any) => set({ sorter: s?.order ? { sortBy: s.field, sortOrder: s.order === 'ascend' ? 'asc' : 'desc' } : undefined })}
        toolBarRender={() => [
          <Input.Search
            key="search"
            placeholder="搜索..."
            allowClear
            value={state.search}
            onChange={(e) => set({ search: e.target.value })}
            onSearch={(value) => { set({ search: value }); actionRef.current?.reload(); }}
            style={{ width: 260, marginRight: 8 }}
          />,
        ]}
      />

      <LogDetailDrawer
        open={state.detailDrawerOpen}
        log={state.selectedLog}
        logId={state.selectedLog?.id}
        onClose={() => set({ detailDrawerOpen: false, selectedLog: null })}
        fetcher={api.getById}
      />
    </PageContainer>
  );
};

export default UserLog;
