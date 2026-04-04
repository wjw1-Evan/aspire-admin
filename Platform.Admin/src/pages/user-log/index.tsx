import { PageContainer, StatCard } from '@/components';
import { Tag, Button, Badge, Space, Grid, Form, Select, DatePicker, Card, Row, Col, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { useBreakpoint } = Grid;
import { ReloadOutlined, FileTextOutlined, CheckCircleOutlined, CloseCircleOutlined, ThunderboltOutlined, DashboardOutlined } from '@ant-design/icons';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useIntl } from '@umijs/max';
import { getActivityLogById, getUserActivityLogs, getActivityLogStatistics } from '@/services/user-log/api';
import type { UserActivityLog } from '@/services/user-log/types';
import useCommonStyles from '@/hooks/useCommonStyles';
import SearchBar from '@/components/SearchBar';
import LogDetailDrawer from './components/LogDetailDrawer';
import dayjs from 'dayjs';
import type { PageParams } from '@/types/page-params';

const formatDateTime = (dateTime: string | null | undefined): string => {
  if (!dateTime) return '-';
  try {
    const date = dayjs(dateTime);
    if (!date.isValid()) return dateTime;
    return date.format('YYYY-MM-DD HH:mm:ss');
  } catch (error) {
    console.error('日期格式化错误:', error, dateTime);
    return dateTime || '-';
  }
};

const UserLog: React.FC = () => {
  const intl = useIntl();
  const { styles } = useCommonStyles();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const tableRef = useRef<HTMLDivElement>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<UserActivityLog | null>(null);
  const [data, setData] = useState<UserActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    error: 0,
    actions: 0,
    avgDuration: 0,
  });

  const searchParamsRef = useRef<PageParams>({
    page: 1,
    pageSize: 20,
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
    const textMap: Record<string, string> = {
      login: '登录',
      logout: '登出',
      refresh_token: '刷新Token',
      register: '注册',
      view_profile: '查看个人信息',
      update_profile: '更新个人信息',
      change_password: '修改密码',
      view_activity_logs: '查看活动日志',
      activate_user: '启用用户',
      deactivate_user: '禁用用户',
      bulk_action: '批量操作',
      update_user_role: '更新用户角色',
      create_user: '创建用户',
      view_users: '查看用户列表',
      view_statistics: '查看统计',
      view_user: '查看用户',
      update_user: '更新用户',
      delete_user: '删除用户',
      view_roles: '查看角色',
      create_role: '创建角色',
      update_role: '更新角色',
      delete_role: '删除角色',
      view_menus: '查看菜单',
      create_menu: '创建菜单',
      update_menu: '更新菜单',
      delete_menu: '删除菜单',
      view_notices: '查看通知',
      create_notice: '创建通知',
      update_notice: '更新通知',
      delete_notice: '删除通知',
      view_tags: '查看标签',
      create_tag: '创建标签',
      update_tag: '更新标签',
      delete_tag: '删除标签',
      view_rules: '查看规则',
      create_rule: '创建规则',
      update_rule: '更新规则',
      delete_rule: '删除规则',
      view_permissions: '查看权限',
      create_permission: '创建权限',
      update_permission: '更新权限',
      delete_permission: '删除权限',
      view_current_user: '查看当前用户',
    };
    return textMap[action] || action;
  };

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

  const columns: ColumnsType<UserActivityLog> = [
    {
      title: intl.formatMessage({ id: 'pages.table.user' }),
      dataIndex: 'username',
      key: 'username',
      ellipsis: true,
      sorter: true,
      render: (text: string, record: UserActivityLog) => (
        <a onClick={() => handleViewDetail(record)} style={{ cursor: 'pointer' }}>
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
            pageSizeOptions: [10, 20, 50, 100],
            showSizeChanger: true,
            showQuickJumper: true,
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