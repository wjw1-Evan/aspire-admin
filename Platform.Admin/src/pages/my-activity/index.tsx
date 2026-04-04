import { PageContainer } from '@/components';
import SearchBar from '@/components/SearchBar';
import useCommonStyles from '@/hooks/useCommonStyles';
import type { ColumnsType } from 'antd/es/table';
import { Button, Tag, Badge, Row, Col, Card, Space, Table } from 'antd';

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
import dayjs from 'dayjs';
import type { PageParams } from '@/types/page-params';
import { Grid } from 'antd';

const { RangePicker } = DatePicker;
const { useBreakpoint: useBreakpointGrid } = Grid;

const getMethodColor = (method?: string): string => {
  const colors: Record<string, string> = {
    GET: 'blue',
    POST: 'green',
    PUT: 'orange',
    DELETE: 'red',
    PATCH: 'purple',
  };
  return colors[method || ''] || 'default';
};

const getStatusBadge = (statusCode?: number) => {
  if (statusCode === undefined || statusCode === null) return null;
  if (statusCode >= 200 && statusCode < 300) {
    return <Badge status="success" text={statusCode} />;
  }
  if (statusCode >= 400 && statusCode < 500) {
    return <Badge status="warning" text={statusCode} />;
  }
  if (statusCode >= 500) {
    return <Badge status="error" text={statusCode} />;
  }
  return <Badge status="default" text={statusCode} />;
};

const getActionTagColor = (action: string): string => {
  const colorMap: Record<string, string> = {
    login: 'green',
    logout: 'default',
    refresh_token: 'geekblue',
    register: 'blue',
    view_profile: 'lime',
    update_profile: 'purple',
    change_password: 'orange',
    view_activity_logs: 'cyan',
    activate_user: 'green',
    deactivate_user: 'volcano',
    bulk_action: 'magenta',
    update_user_role: 'gold',
    create_user: 'blue',
    view_users: 'cyan',
    view_statistics: 'purple',
    view_user: 'cyan',
    update_user: 'blue',
    delete_user: 'red',
    view_roles: 'cyan',
    create_role: 'blue',
    update_role: 'orange',
    delete_role: 'red',
    view_menus: 'cyan',
    create_menu: 'blue',
    update_menu: 'orange',
    delete_menu: 'red',
    view_notices: 'cyan',
    create_notice: 'blue',
    update_notice: 'orange',
    delete_notice: 'red',
    view_tags: 'cyan',
    create_tag: 'blue',
    update_tag: 'orange',
    delete_tag: 'red',
    view_rules: 'cyan',
    create_rule: 'blue',
    update_rule: 'orange',
    delete_rule: 'red',
    view_permissions: 'cyan',
    create_permission: 'blue',
    update_permission: 'orange',
    delete_permission: 'red',
    view_current_user: 'lime',
  };
  return colorMap[action] || 'default';
};

const getActionText = (action: string): string => {
  if (!action) return '-';
  const a = action.toLowerCase();
  const textMap: Record<string, string> = {
    'login': '登录',
    'logout': '登出',
    'refresh_token': '刷新令牌',
    'register': '注册',
    'create': '创建',
    'update': '更新',
    'delete': '删除',
    'view': '查看',
    'export': '导出数据',
    'import': '导入数据',
    'view_profile': '查看个人信息',
    'update_profile': '更新个人资料',
    'change_password': '修改密码',
    'view_activity_logs': '查看活动日志',
    'activate_user': '启用用户',
    'deactivate_user': '禁用用户',
    'update_user_role': '分配角色',
    'create_user': '创建用户',
    'view_users': '查询用户',
    'view_statistics': '查看统计',
    'view_user': '查看用户详情',
    'update_user': '完善用户信息',
    'delete_user': '注销用户',
    'view_current_user': '查询当前用户',
    'view_roles': '查询角色',
    'create_role': '创建角色',
    'update_role': '修改角色',
    'delete_role': '删除角色',
    'view_menus': '查询菜单',
    'create_menu': '添加菜单',
    'update_menu': '配置菜单',
    'delete_menu': '删除菜单',
    'view_notices': '浏览通知',
    'create_notice': '发布通知',
    'update_notice': '修改通知',
    'delete_notice': '撤回通知',
    'view_rules': '查询规则',
    'create_rule': '新建规则',
    'update_rule': '调整规则',
    'delete_rule': '移除规则',
    'view_permissions': '查询权限',
    'create_permission': '定义权限',
    'update_permission': '配置权限',
    'delete_permission': '注回权限',
    'bulk_action': '执行批量操作',
  };
  if (textMap[a]) return textMap[a];
  if (a.startsWith('create_')) return `创建${textMap[a.replace('create_', '')] || action.replace('create_', '')}`;
  if (a.startsWith('update_')) return `更新${textMap[a.replace('update_', '')] || action.replace('update_', '')}`;
  if (a.startsWith('delete_')) return `删除${textMap[a.replace('delete_', '')] || action.replace('delete_', '')}`;
  if (a.startsWith('view_')) return `查看${textMap[a.replace('view_', '')] || action.replace('view_', '')}`;
  return action;
};

const MyActivity: React.FC = () => {
  const intl = useIntl();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const tableRef = useRef<HTMLDivElement>(null);
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
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const searchParamsRef = useRef<PageParams>({
    page: 1,
    pageSize: 20,
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

  useEffect(() => {
    if (!tableRef.current) return;

    const initResizeHandlers = () => {
      const table = tableRef.current;
      if (!table) return;

      const thead = table.querySelector('thead');
      if (!thead) return;

      const headers = thead.querySelectorAll('th');
      let isResizing = false;
      let currentHeader: HTMLElement | null = null;
      let startX = 0;
      let startWidth = 0;

      const handleMouseDown = (e: MouseEvent, header: HTMLElement) => {
        const rect = header.getBoundingClientRect();
        const edgeThreshold = 5;
        const isNearRightEdge = e.clientX >= rect.right - edgeThreshold;

        if (!isNearRightEdge) return;

        e.preventDefault();
        e.stopPropagation();

        isResizing = true;
        currentHeader = header;
        startX = e.clientX;
        startWidth = header.offsetWidth;

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing || !currentHeader) return;

        const diff = e.clientX - startX;
        const newWidth = Math.max(50, startWidth + diff);
        currentHeader.style.width = `${newWidth}px`;
        currentHeader.style.minWidth = `${newWidth}px`;
        currentHeader.style.maxWidth = `${newWidth}px`;
      };

      const handleMouseUp = () => {
        isResizing = false;
        currentHeader = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      headers.forEach((header) => {
        const headerEl = header as HTMLElement;
        headerEl.style.position = 'relative';
        headerEl.style.cursor = 'default';

        const mouseMoveHandler = (e: MouseEvent) => {
          const rect = headerEl.getBoundingClientRect();
          const edgeThreshold = 5;
          const isNearRightEdge = e.clientX >= rect.right - edgeThreshold;

          if (isNearRightEdge && !isResizing) {
            headerEl.style.cursor = 'col-resize';
          } else if (!isResizing) {
            headerEl.style.cursor = 'default';
          }
        };

        headerEl.addEventListener('mousemove', mouseMoveHandler);
        (headerEl as any)._mouseMoveHandler = mouseMoveHandler;

        const mouseDownHandler = (e: MouseEvent) => {
          handleMouseDown(e, headerEl);
        };
        headerEl.addEventListener('mousedown', mouseDownHandler);
        (headerEl as any)._mouseDownHandler = mouseDownHandler;
      });
    };

    let timer: NodeJS.Timeout | null = setTimeout(() => {
      initResizeHandlers();
    }, 300);

    const observer = new MutationObserver(() => {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        initResizeHandlers();
      }, 300);
    });

    if (tableRef.current) {
      observer.observe(tableRef.current, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      observer.disconnect();

      if (tableRef.current) {
        const thead = tableRef.current.querySelector('thead');
        if (thead) {
          const headers = thead.querySelectorAll('th');
          headers.forEach((header) => {
            const headerEl = header as HTMLElement;
            if ((headerEl as any)._mouseMoveHandler) {
              headerEl.removeEventListener('mousemove', (headerEl as any)._mouseMoveHandler);
            }
            if ((headerEl as any)._mouseDownHandler) {
              headerEl.removeEventListener('mousedown', (headerEl as any)._mouseDownHandler);
            }
          });
        }
      }
    };
  }, []);

  const columns: ColumnsType<UserActivityLog> = useMemo(() => [
    {
      title: intl.formatMessage({ id: 'pages.table.action' }),
      dataIndex: 'action',
      key: 'action',
      render: (_, record: UserActivityLog) => (
        <a onClick={() => handleViewDetail(record)} style={{ cursor: 'pointer' }}>
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
      render: (_, record: UserActivityLog) => {
        if (!record.createdAt) return '-';
        try {
          const date = dayjs(record.createdAt);
          if (!date.isValid()) return record.createdAt;
          return date.format('YYYY-MM-DD HH:mm:ss');
        } catch (error) {
          return record.createdAt;
        }
      },
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
      style={{ paddingBlock: 12 }}
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
        showResetButton={false}
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
            pageSizeOptions: [10, 20, 50, 100],
            showSizeChanger: true,
            showQuickJumper: true,
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