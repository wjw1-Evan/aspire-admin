import { PageContainer, StatCard } from '@/components';
import DataTable from '@/components/DataTable';
import type { ActionType, ProColumns } from '@/types/pro-components';
import { Tag, Button, Badge, Space, Grid, Form, Select, DatePicker, Card, Row, Col, Input } from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { useBreakpoint } = Grid;
import { ReloadOutlined, FileTextOutlined, CheckCircleOutlined, CloseCircleOutlined, ThunderboltOutlined, DashboardOutlined } from '@ant-design/icons';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useIntl } from '@umijs/max';
import { getUserActivityLogs } from '@/services/user-log/api';
import type { UserActivityLog } from '@/services/user-log/types';
import LogDetailDrawer from './components/LogDetailDrawer';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

// 统一的日期时间格式化函数
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
  const screens = useBreakpoint();
  const isMobile = !screens.md; // md 以下为移动端
  const actionRef = useRef<ActionType>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<UserActivityLog | null>(null);
  const [form] = Form.useForm();
  const [filters, setFilters] = useState<{
    action?: string;
    startDate?: string;
    endDate?: string;
    username?: string;
    httpMethod?: string;
    statusCode?: number;
    ipAddress?: string;
  }>({});
  const initialLoadRef = useRef(true);
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    error: 0,
    avgDuration: 0,
    actions: 0,
  });

  const handleViewDetail = useCallback((record: UserActivityLog) => {
    setSelectedLog(record);
    setDetailDrawerOpen(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailDrawerOpen(false);
    setSelectedLog(null);
  }, []);

  // 获取用户活动日志列表（使用 useCallback 避免死循环）
  const fetchUserLogs = useCallback(async (params: any, _sort?: Record<string, any>) => {
    const { current = 1, pageSize = 20 } = params;

    try {
      const response = await getUserActivityLogs({
        page: current,
        pageSize,
        action: filters.action,
        httpMethod: filters.httpMethod,
        statusCode: filters.statusCode,
        ipAddress: filters.ipAddress,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });

      if (response.success && response.data) {
        // 后端返回的数据结构：{ data: { data: [...], total: xxx, ... } }
        const result = response.data as any;
        let list: UserActivityLog[] = result.data || [];

        if (filters.username) {
          const keyword = filters.username.trim().toLowerCase();
          list = list.filter((item) => (item.username || '').toLowerCase().includes(keyword));
        }

        const successCount = list.filter((item) => (item.statusCode ?? 0) >= 200 && (item.statusCode ?? 0) < 400).length;
        const errorCount = list.filter((item) => (item.statusCode ?? 0) >= 400).length;
        const avgDuration = list.length
          ? Math.round(list.reduce((sum, item) => sum + (item.duration || 0), 0) / list.length)
          : 0;
        const actionKinds = new Set(list.map((item) => item.action || 'unknown')).size;

        setStats({
          total: result.total || list.length || 0,
          success: successCount,
          error: errorCount,
          avgDuration,
          actions: actionKinds,
        });

        return {
          data: list,
          total: filters.username ? list.length : result.total || list.length || 0,
          success: true,
        };
      }

      return {
        data: [],
        total: 0,
        success: false,
      };
    } catch (error) {
      console.error('Failed to load user activity logs:', error);
      // 注意：这是 ProTable request 函数的特殊处理模式
      // 错误已被全局错误处理捕获并显示错误提示，这里返回空数据让表格显示空状态
      // 这是为了在错误已由全局处理显示的情况下，避免表格显示错误状态
      return {
        data: [],
        total: 0,
        success: false,
      };
    }
  }, [filters]);

  // 刷新处理
  const handleRefresh = useCallback(() => {
    actionRef.current?.reload?.();
  }, []);

  // 提交筛选
  const handleSearch = useCallback(() => {
    const { dateRange, statusCode, ...rest } = form.getFieldsValue();
    const [start, end]: [Dayjs | undefined, Dayjs | undefined] = dateRange || [];
    const parsedStatus = statusCode === '' || statusCode === undefined || statusCode === null
      ? undefined
      : Number(statusCode);

    setFilters({
      ...rest,
      username: rest.username?.trim() || undefined,
      action: rest.action || undefined,
      httpMethod: rest.httpMethod?.trim() || undefined,
      ipAddress: rest.ipAddress?.trim() || undefined,
      statusCode: Number.isNaN(parsedStatus) ? undefined : parsedStatus,
      startDate: start ? start.toISOString() : undefined,
      endDate: end ? end.toISOString() : undefined,
    });
  }, [form]);

  // 筛选变更后刷新表格（跳过首次渲染，避免双请求）
  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }
    actionRef.current?.reload?.();
  }, [filters]);

  const handleReset = useCallback(() => {
    form.resetFields();
    setFilters({});
  }, [form]);

  /**
   * 获取操作类型标签颜色
   */
  const getActionTagColor = (action: string): string => {
    const colorMap: Record<string, string> = {
      // 认证相关
      login: 'green',
      logout: 'default',
      refresh_token: 'geekblue',
      register: 'blue',

      // 用户相关
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

      // 角色相关
      view_roles: 'cyan',
      create_role: 'blue',
      update_role: 'orange',
      delete_role: 'red',

      // 菜单相关
      view_menus: 'cyan',
      create_menu: 'blue',
      update_menu: 'orange',
      delete_menu: 'red',

      // 通知相关
      view_notices: 'cyan',
      create_notice: 'blue',
      update_notice: 'orange',
      delete_notice: 'red',

      // 标签相关
      view_tags: 'cyan',
      create_tag: 'blue',
      update_tag: 'orange',
      delete_tag: 'red',

      // 规则相关
      view_rules: 'cyan',
      create_rule: 'blue',
      update_rule: 'orange',
      delete_rule: 'red',

      // 权限相关
      view_permissions: 'cyan',
      create_permission: 'blue',
      update_permission: 'orange',
      delete_permission: 'red',

      // 其他
      view_current_user: 'lime',
    };
    return colorMap[action] || 'default';
  };

  /**
   * 获取操作类型显示文本
   */
  const getActionText = (action: string): string => {
    const textMap: Record<string, string> = {
      // 认证相关
      login: '登录',
      logout: '登出',
      refresh_token: '刷新Token',
      register: '注册',

      // 用户相关
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

      // 角色相关
      view_roles: '查看角色',
      create_role: '创建角色',
      update_role: '更新角色',
      delete_role: '删除角色',
      role_operation: '角色操作',

      // 菜单相关
      view_menus: '查看菜单',
      create_menu: '创建菜单',
      update_menu: '更新菜单',
      delete_menu: '删除菜单',
      menu_operation: '菜单操作',

      // 通知相关
      view_notices: '查看通知',
      create_notice: '创建通知',
      update_notice: '更新通知',
      delete_notice: '删除通知',
      notice_operation: '通知操作',

      // 标签相关
      view_tags: '查看标签',
      create_tag: '创建标签',
      update_tag: '更新标签',
      delete_tag: '删除标签',
      tag_operation: '标签操作',

      // 规则相关
      view_rules: '查看规则',
      create_rule: '创建规则',
      update_rule: '更新规则',
      delete_rule: '删除规则',
      rule_operation: '规则操作',

      // 权限相关
      view_permissions: '查看权限',
      create_permission: '创建权限',
      update_permission: '更新权限',
      delete_permission: '删除权限',
      permission_operation: '权限操作',

      // 其他
      view_current_user: '查看当前用户',
      user_operation: '用户操作',

      // 默认HTTP操作
      get_request: 'GET请求',
      post_request: 'POST请求',
      put_request: 'PUT请求',
      delete_request: 'DELETE请求',
      patch_request: 'PATCH请求',
    };
    return textMap[action] || action;
  };

  /**
   * 获取 HTTP 方法的颜色
   */
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

  /**
   * 获取状态码的 Badge 状态
   */
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

  /**
   * 初始化列宽调整功能
   */
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
        // 只允许在表头右边缘 5px 内拖动
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
        const newWidth = Math.max(50, startWidth + diff); // 最小宽度 50px
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

    // 延迟初始化，确保表格已渲染
    let timer: NodeJS.Timeout | null = setTimeout(() => {
      initResizeHandlers();
    }, 300);

    // 监听表格变化，重新初始化
    const observer = new MutationObserver(() => {
      // 防抖，避免频繁初始化
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

      // 清理事件监听器
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
      render: (text: string, record: UserActivityLog) => (
        <a
          onClick={() => handleViewDetail(record)}
          style={{ cursor: 'pointer' }}
        >
          {text}
        </a>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.table.action' }),
      dataIndex: 'action',
      key: 'action',
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
      render: (_: any, record: UserActivityLog) => getStatusBadge(record.statusCode),
    },
    {
      title: intl.formatMessage({ id: 'pages.table.path' }),
      dataIndex: 'path',
      key: 'path',
      ellipsis: true,
      render: (_: any, record: UserActivityLog) => {
        if (!record.path) return '-';
        return <span style={{ fontFamily: 'monospace' }}>{record.path}</span>;
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.table.queryString' }),
      dataIndex: 'queryString',
      key: 'queryString',
      ellipsis: true,
      render: (_: any, record: UserActivityLog) => {
        if (!record.queryString) return '-';
        return <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{record.queryString}</span>;
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.table.fullUrl' }),
      dataIndex: 'fullUrl',
      key: 'fullUrl',
      ellipsis: true,
      render: (_: any, record: UserActivityLog) => {
        if (!record.fullUrl) return '-';
        return <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{record.fullUrl}</span>;
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.table.ipAddress' }),
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.table.actionTime' }),
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: true,
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
      {/* 筛选区域 */}
      <Form
        form={form}
        layout={isMobile ? 'vertical' : 'inline'}
        style={{ marginBottom: 12 }}
        onFinish={handleSearch}
      >
        <Form.Item name="action" label={intl.formatMessage({ id: 'pages.table.action' })}>
          <Input
            allowClear
            placeholder={intl.formatMessage({ id: 'pages.table.action' })}
            style={{ minWidth: 160 }}
          />
        </Form.Item>

        <Form.Item name="httpMethod" label={intl.formatMessage({ id: 'pages.table.httpMethod' })}>
          <Select
            allowClear
            placeholder={intl.formatMessage({ id: 'pages.placeholder.select' })}
            style={{ minWidth: 140 }}
            options={['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((m) => ({ label: m, value: m }))}
          />
        </Form.Item>

        <Form.Item name="statusCode" label={intl.formatMessage({ id: 'pages.table.statusCode' })}>
          <Input
            allowClear
            placeholder={intl.formatMessage({ id: 'pages.table.statusCode' })}
            style={{ minWidth: 120 }}
            type="number"
          />
        </Form.Item>

        <Form.Item name="ipAddress" label={intl.formatMessage({ id: 'pages.table.ipAddress' })}>
          <Input
            allowClear
            placeholder={intl.formatMessage({ id: 'pages.table.ipAddress' })}
            style={{ minWidth: 160 }}
          />
        </Form.Item>

        <Form.Item name="username" label={intl.formatMessage({ id: 'pages.table.username' })}>
          <Input
            allowClear
            placeholder={intl.formatMessage({ id: 'pages.table.username' })}
            style={{ minWidth: 180 }}
          />
        </Form.Item>

        <Form.Item name="dateRange" label={intl.formatMessage({ id: 'pages.logDetail.actionTime' })}>
          <DatePicker.RangePicker showTime style={{ minWidth: 280 }} />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              {intl.formatMessage({ id: 'pages.search.submit' }, { defaultMessage: '查询' })}
            </Button>
            <Button onClick={handleReset}>
              {intl.formatMessage({ id: 'pages.search.reset' }, { defaultMessage: '重置' })}
            </Button>
          </Space>
        </Form.Item>
      </Form>

      {/* 当前页统计：对齐“我的活动”StatCard 风格 */}
      <Card style={{ marginBottom: 16, borderRadius: 12 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={6} lg={6} xl={4} xxl={4}>
            <StatCard
              title={intl.formatMessage({ id: 'pages.userLog.stats.total', defaultMessage: '当前页记录' })}
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
        <DataTable<UserActivityLog>
          actionRef={actionRef}
          rowKey="id"
          scroll={{ x: 'max-content' }}
          search={false}
          request={fetchUserLogs}
          columns={columns}
          pagination={{
            pageSize: 20,
            pageSizeOptions: [10, 20, 50, 100],
            showSizeChanger: true,
            showQuickJumper: true,
          }}
        />
      </div>

      <LogDetailDrawer
        open={detailDrawerOpen}
        log={selectedLog}
        onClose={handleCloseDetail}
      />
    </PageContainer>
  );
};

export default UserLog;
