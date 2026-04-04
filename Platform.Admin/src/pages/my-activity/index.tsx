import { PageContainer } from '@/components';
import SearchBar from '@/components/SearchBar';
import useCommonStyles from '@/hooks/useCommonStyles';
import { useTableResize } from '@/hooks/useTableResize';
import type { ColumnsType } from 'antd/es/table';
import { Button, Tag, Row, Col, Card, Space, Table, DatePicker, Grid } from 'antd';

const { useBreakpoint } = Grid;
import {
  HistoryOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useIntl } from '@umijs/max';
import { getCurrentUserActivityLogs, getCurrentUserActivityLogStatistics } from '@/services/user-log/api';
import type { UserActivityLog } from '@/services/user-log/types';
import LogDetailDrawer from '../user-log/components/LogDetailDrawer';
import { StatCard } from '@/components';
import type { PageParams } from '@/types/page-params';
import { formatDateTime } from '@/utils/format';
import { getActionTagColor, getActionText, getMethodColor, getStatusBadge } from '@/utils/activityLog';

const { RangePicker } = DatePicker;
const { useBreakpoint: useBreakpointGrid } = Grid;

const MyActivity: React.FC = () => {
  const intl = useIntl();
  const screens = useBreakpoint();
  const tableRef = useRef<HTMLDivElement>(null);
  useTableResize(tableRef);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<{
    total: number;
    successCount: number;
    errorCount: number;
    actionTypes: number;
    avgDuration: number;
  } | null>(null);
  const [data, setData] = useState<UserActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });
  const searchParamsRef = useRef<PageParams>({
    search: '',
  });
  const { styles } = useCommonStyles();

  const handleViewDetail = useCallback((record: UserActivityLog) => {
    setSelectedLogId(record.id);
    setDetailDrawerOpen(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailDrawerOpen(false);
    setSelectedLogId(null);
  }, []);

  const fetchData = useCallback(async () => {
    const currentParams = searchParamsRef.current;

    setLoading(true);
    try {
      const [logsResponse, statsResponse] = await Promise.all([
        getCurrentUserActivityLogs({
          page: currentParams.page,
          pageSize: currentParams.pageSize,
          search: currentParams.search as string | undefined,
        }),
        getCurrentUserActivityLogStatistics({
          search: currentParams.search as string | undefined,
        }),
      ]);

      if (logsResponse.success && logsResponse.data) {
        const result = logsResponse.data as any;
        const list: UserActivityLog[] = result.queryable || [];
        const total: number = result.rowCount || 0;

        if (statsResponse.success && statsResponse.data) {
          const statsData = statsResponse.data;
          setStatistics({
            total: statsData.total || 0,
            successCount: statsData.successCount || 0,
            errorCount: statsData.errorCount || 0,
            actionTypes: statsData.actionTypes?.length || 0,
            avgDuration: Math.round(statsData.avgDuration || 0),
          });
        }

        setData(list);
        setPagination(prev => ({
          ...prev,
          page: currentParams.page ?? prev.page,
          pageSize: currentParams.pageSize ?? prev.pageSize,
          total,
        }));
      } else {
        setData([]);
        setPagination(prev => ({ ...prev, total: 0 }));
      }
    } catch (error) {
      console.error('Failed to load activity logs:', error);
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

  const columns: ColumnsType<UserActivityLog> = useMemo(() => [
    {
      title: intl.formatMessage({ id: 'pages.table.action' }),
      dataIndex: 'action',
      key: 'action',
      render: (_, record: UserActivityLog) => (
        <a onClick={() => handleViewDetail(record)}>
          <Tag color={getActionTagColor(record.action)}>
            {getActionText(record.action)}
          </Tag>
        </a>
      ),
      sorter: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.table.httpMethod' }),
      dataIndex: 'httpMethod',
      key: 'httpMethod',
      render: (_, record: UserActivityLog) => {
        if (!record.httpMethod) return '-';
        return (
          <Tag color={getMethodColor(record.httpMethod)}>
            {record.httpMethod}
          </Tag>
        );
      },
      sorter: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.table.statusCode' }),
      dataIndex: 'statusCode',
      key: 'statusCode',
      render: (_, record: UserActivityLog) => getStatusBadge(record.statusCode),
      sorter: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.table.fullUrl' }),
      dataIndex: 'fullUrl',
      key: 'fullUrl',
      ellipsis: true,
      render: (_, record: UserActivityLog) => {
        if (!record.fullUrl) return '-';
        return <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{record.fullUrl}</span>;
      },
      sorter: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.table.duration' }),
      dataIndex: 'duration',
      key: 'duration',
      sorter: true,
      render: (_, record: UserActivityLog) => {
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
      render: (_, record: UserActivityLog) => formatDateTime(record.createdAt),
    },
  ], [intl, handleViewDetail]);

  return (
    <PageContainer
      title={
        <Space>
          <HistoryOutlined />
          {intl.formatMessage({ id: 'pages.myActivity.title' })}
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

      {statistics && (
        <Card className={styles.card} style={{ marginBottom: 16 }}>
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} md={6} lg={6} xl={4} xxl={4}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.myActivity.statistics.totalLogs' })}
                value={statistics.total}
                icon={<HistoryOutlined />}
                color="#1890ff"
              />
            </Col>
            <Col xs={24} sm={12} md={6} lg={6} xl={4} xxl={4}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.myActivity.statistics.successCount' })}
                value={statistics.successCount}
                icon={<CheckCircleOutlined />}
                color="#52c41a"
              />
            </Col>
            <Col xs={24} sm={12} md={6} lg={6} xl={4} xxl={4}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.myActivity.statistics.errorCount' })}
                value={statistics.errorCount}
                icon={<CloseCircleOutlined />}
                color="#ff4d4f"
              />
            </Col>
            <Col xs={24} sm={12} md={6} lg={6} xl={4} xxl={4}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.myActivity.statistics.actionTypes' })}
                value={statistics.actionTypes}
                icon={<ThunderboltOutlined />}
                color="#faad14"
              />
            </Col>
            <Col xs={24} sm={12} md={6} lg={6} xl={4} xxl={4}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.myActivity.statistics.avgDuration' })}
                value={statistics.avgDuration}
                suffix="ms"
                icon={<DashboardOutlined />}
                color="#722ed1"
              />
            </Col>
          </Row>
        </Card>
      )}

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
        logId={selectedLogId || undefined}
        fetchFromApi={true}
        onClose={handleCloseDetail}
      />
    </PageContainer>
  );
};

export default MyActivity;