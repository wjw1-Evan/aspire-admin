import { PageContainer, StatCard } from '@/components';
import { Tag, Button, Space, Grid, Form, Select, DatePicker, Card, Row, Col, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { useBreakpoint } = Grid;
import { ReloadOutlined, FileTextOutlined, CheckCircleOutlined, CloseCircleOutlined, ThunderboltOutlined, DashboardOutlined } from '@ant-design/icons';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useIntl } from '@umijs/max';
import { getActivityLogById, getUserActivityLogs, getActivityLogStatistics } from '@/services/user-log/api';
import type { UserActivityLog } from '@/services/user-log/types';
import useCommonStyles from '@/hooks/useCommonStyles';
import { useTableResize } from '@/hooks/useTableResize';
import SearchBar from '@/components/SearchBar';
import LogDetailDrawer from './components/LogDetailDrawer';
import type { PageParams } from '@/types/page-params';
import { formatDateTime } from '@/utils/format';
import { getActionTagColor, getActionText, getMethodColor, getStatusBadge } from '@/utils/activityLog';

const UserLog: React.FC = () => {
  const intl = useIntl();
  const { styles } = useCommonStyles();
  const screens = useBreakpoint();
  const tableRef = useRef<HTMLDivElement>(null);
  useTableResize(tableRef);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<UserActivityLog | null>(null);
  const [data, setData] = useState<UserActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    error: 0,
    actions: 0,
    avgDuration: 0,
  });

  const searchParamsRef = useRef<PageParams>({
    search: '',
  });

  const handleViewDetail = useCallback((record: UserActivityLog) => {
    setSelectedLog(record);
    setDetailDrawerOpen(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailDrawerOpen(false);
    setSelectedLog(null);
  }, []);

  const fetchData = useCallback(async () => {
    const currentParams = searchParamsRef.current;

    setLoading(true);
    try {
      const [logsResponse, statsResponse] = await Promise.all([
        getUserActivityLogs({
          page: currentParams.page,
          pageSize: currentParams.pageSize,
          search: currentParams.search as string | undefined,
        }),
        getActivityLogStatistics(),
      ]);

      if (logsResponse.success && logsResponse.data) {
        const result = logsResponse.data as any;
        const list: UserActivityLog[] = result.queryable ?? result.list ?? [];

        if (statsResponse.success && statsResponse.data) {
          const statsData = statsResponse.data;
          setStats({
            total: statsData.total || 0,
            success: statsData.successCount || 0,
            error: statsData.errorCount || 0,
            actions: statsData.actionTypes?.length || 0,
            avgDuration: Math.round(statsData.avgDuration || 0),
          });
        }

        setData(list);
        setPagination(prev => ({
          ...prev,
          page: currentParams.page ?? prev.page,
          pageSize: currentParams.pageSize ?? prev.pageSize,
          total: result.rowCount ?? result.total ?? list.length,
        }));
      } else {
        setData([]);
        setPagination(prev => ({ ...prev, total: 0 }));
      }
    } catch (error) {
      console.error('Failed to load user activity logs:', error);
      setData([]);
      setPagination(prev => ({ ...prev, total: 0 }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = useCallback((params: PageParams) => {
    searchParamsRef.current = { ...searchParamsRef.current, ...params, page: 1 };
    fetchData();
  }, [fetchData]);

  const handleTableChange = useCallback((pag: any, _filters: any, sorter: any) => {
    const newPage = pag.current;
    const newPageSize = pag.pageSize;
    const sortBy = sorter?.field;
    const sortOrder = sorter?.order === 'ascend' ? 'asc' : sorter?.order === 'descend' ? 'desc' : undefined;

    searchParamsRef.current = {
      ...searchParamsRef.current,
      page: newPage,
      pageSize: newPageSize,
      sortBy,
      sortOrder,
    };
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const columns: ColumnsType<UserActivityLog> = [
    {
      title: intl.formatMessage({ id: 'pages.table.user' }),
      dataIndex: 'username',
      key: 'username',
      ellipsis: true,
      sorter: true,
      render: (text: string, record: UserActivityLog) => (
        <a onClick={() => handleViewDetail(record)}>
          {text}
        </a>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.table.action' }),
      dataIndex: 'action',
      key: 'action',
      sorter: true,
      render: (_: any, record: UserActivityLog) => (
        <Tag color={getActionTagColor(record.action)}>
          {getActionText(record.action)}
        </Tag>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.table.httpMethod' }),
      dataIndex: 'httpMethod',
      key: 'httpMethod',
      sorter: true,
      render: (_: any, record: UserActivityLog) => {
        if (!record.httpMethod) return '-';
        return (
          <Tag color={getMethodColor(record.httpMethod)}>
            {record.httpMethod}
          </Tag>
        );
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.table.statusCode' }),
      dataIndex: 'statusCode',
      key: 'statusCode',
      sorter: true,
      render: (_: any, record: UserActivityLog) => getStatusBadge(record.statusCode),
    },
    {
      title: intl.formatMessage({ id: 'pages.table.fullUrl' }),
      dataIndex: 'fullUrl',
      key: 'fullUrl',
      ellipsis: true,
      sorter: true,
      render: (_: any, record: UserActivityLog) => {
        if (!record.fullUrl) return '-';
        return <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{record.fullUrl}</span>;
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.table.duration' }),
      dataIndex: 'duration',
      key: 'duration',
      sorter: true,
      render: (dom: any, record: UserActivityLog) => {
        if (record.duration === undefined || record.duration === null) return '-';
        let color = 'green';
        if (record.duration > 1000) color = 'orange';
        if (record.duration > 3000) color = 'red';
        return <span style={{ color }}>{record.duration}ms</span>;
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.table.ipAddress' }),
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      ellipsis: true,
      sorter: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.table.actionTime' }),
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: true,
      defaultSortOrder: 'descend',
      render: (_: any, record: UserActivityLog) => formatDateTime(record.createdAt),
    },
  ];

  return (
    <PageContainer
      title={
        <Space>
          <FileTextOutlined />
          {intl.formatMessage({ id: 'pages.userLog.title' })}
        </Space>
      }
      extra={
        <Space wrap>
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
          >
            {intl.formatMessage({ id: 'pages.button.refresh' })}
          </Button>
        </Space>
      }
    >
      <SearchBar
        initialParams={searchParamsRef.current}
        onSearch={handleSearch}
      />

      <Card className={styles.card} style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={6} lg={6} xl={4} xxl={4}>
            <StatCard
              title={intl.formatMessage({ id: 'pages.userLog.stats.total', defaultMessage: '总记录数' })}
              value={stats.total}
              icon={<DashboardOutlined />}
              color="#1890ff"
            />
          </Col>
          <Col xs={24} sm={12} md={6} lg={6} xl={4} xxl={4}>
            <StatCard
              title={intl.formatMessage({ id: 'pages.userLog.stats.success', defaultMessage: '成功次数' })}
              value={stats.success}
              icon={<CheckCircleOutlined />}
              color="#52c41a"
            />
          </Col>
          <Col xs={24} sm={12} md={6} lg={6} xl={4} xxl={4}>
            <StatCard
              title={intl.formatMessage({ id: 'pages.userLog.stats.error', defaultMessage: '错误次数' })}
              value={stats.error}
              icon={<CloseCircleOutlined />}
              color="#ff4d4f"
            />
          </Col>
          <Col xs={24} sm={12} md={6} lg={6} xl={4} xxl={4}>
            <StatCard
              title={intl.formatMessage({ id: 'pages.userLog.stats.actions', defaultMessage: '操作类型数' })}
              value={stats.actions}
              icon={<ThunderboltOutlined />}
              color="#faad14"
            />
          </Col>
          <Col xs={24} sm={12} md={6} lg={6} xl={4} xxl={4}>
            <StatCard
              title={intl.formatMessage({ id: 'pages.userLog.stats.avgDuration', defaultMessage: '平均耗时(ms)' })}
              value={stats.avgDuration}
              suffix="ms"
              icon={<DashboardOutlined />}
              color="#722ed1"
            />
          </Col>
        </Row>
      </Card>

      <div ref={tableRef}>
        <Table<UserActivityLog>
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          scroll={{ x: 'max-content' }}
          onChange={handleTableChange}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
          }}
        />
      </div>

      <LogDetailDrawer
        open={detailDrawerOpen}
        log={selectedLog}
        logId={selectedLog?.id}
        onClose={handleCloseDetail}
        fetcher={getActivityLogById}
      />
    </PageContainer>
  );
};

export default UserLog;