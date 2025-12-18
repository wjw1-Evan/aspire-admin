import { PageContainer } from '@/components';
import DataTable from '@/components/DataTable';
import type { ActionType, ProColumns } from '@/types/pro-components';
import { Button, Tag, Badge, Row, Col, Card, Space, Form, Input, Select, DatePicker } from 'antd';
import {
  HistoryOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import React, { useRef, useState, useEffect } from 'react';
import { useIntl } from '@umijs/max';
import { getCurrentUserActivityLogs } from '@/services/user-log/api';
import type { UserActivityLog } from '@/services/user-log/types';
import LogDetailDrawer from '../user-log/components/LogDetailDrawer';
import { StatCard } from '@/components';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const MyActivity: React.FC = () => {
  const intl = useIntl();
  const actionRef = useRef<ActionType>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<{
    total: number;
    successCount: number;
    errorCount: number;
    actionTypes: number;
  } | null>(null);
  const [searchForm] = Form.useForm();
  const [searchParams, setSearchParams] = useState<any>({});
  // 使用 useRef 存储最新的搜索参数，确保 request 函数能立即访问到最新值
  const searchParamsRef = useRef<any>({});

  const handleViewDetail = (record: UserActivityLog) => {
    // ✅ 只传递 logId，让 LogDetailDrawer 从 API 获取完整数据
    setSelectedLogId(record.id);
    setDetailDrawerOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailDrawerOpen(false);
    setSelectedLogId(null);
  };

  // 处理搜索
  const handleSearch = () => {
    const values = searchForm.getFieldsValue();
    // 处理日期范围
    if (values.dateRange && Array.isArray(values.dateRange) && values.dateRange.length === 2) {
      const [start, end] = values.dateRange;
      values.startDate = start ? dayjs(start).toISOString() : undefined;
      values.endDate = end ? dayjs(end).toISOString() : undefined;
      delete values.dateRange;
    }
    // 同时更新 state 和 ref，ref 确保 request 函数能立即访问到最新值
    searchParamsRef.current = values;
    setSearchParams(values);
    // 重置到第一页并重新加载数据
    if (actionRef.current?.reloadAndReset) {
      actionRef.current.reloadAndReset();
    } else if (actionRef.current?.reload) {
      actionRef.current.reload();
    }
  };

  // 处理重置
  const handleReset = () => {
    searchForm.resetFields();
    // 同时更新 state 和 ref
    searchParamsRef.current = {};
    setSearchParams({});
    if (actionRef.current?.reloadAndReset) {
      actionRef.current.reloadAndReset();
    } else if (actionRef.current?.reload) {
      actionRef.current.reload();
    }
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

      // 菜单相关
      view_menus: '查看菜单',
      create_menu: '创建菜单',
      update_menu: '更新菜单',
      delete_menu: '删除菜单',

      // 通知相关
      view_notices: '查看通知',
      create_notice: '创建通知',
      update_notice: '更新通知',
      delete_notice: '删除通知',

      // 标签相关
      view_tags: '查看标签',
      create_tag: '创建标签',
      update_tag: '更新标签',
      delete_tag: '删除标签',

      // 规则相关
      view_rules: '查看规则',
      create_rule: '创建规则',
      update_rule: '更新规则',
      delete_rule: '删除规则',

      // 权限相关
      view_permissions: '查看权限',
      create_permission: '创建权限',
      update_permission: '更新权限',
      delete_permission: '删除权限',

      // 其他
      view_current_user: '查看当前用户',
    };
    return textMap[action] || action;
  };

  const columns: ProColumns<UserActivityLog>[] = [
    {
      title: intl.formatMessage({ id: 'pages.table.action' }),
      dataIndex: 'action',
      key: 'action',
      valueType: 'text',
      render: (_, record) => (
        <a
          onClick={() => handleViewDetail(record)}
          style={{ cursor: 'pointer' }}
        >
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
      valueType: 'select',
      valueEnum: {
        GET: { text: 'GET' },
        POST: { text: 'POST' },
        PUT: { text: 'PUT' },
        DELETE: { text: 'DELETE' },
        PATCH: { text: 'PATCH' },
      },
      render: (_, record) => {
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
      valueType: 'text',
      render: (_, record) => getStatusBadge(record.statusCode),
    },
   
    {
      title: intl.formatMessage({ id: 'pages.table.fullUrl' }),
      dataIndex: 'fullUrl',
      key: 'fullUrl',
      search: false,
      ellipsis: true,
      render: (_, record) => {
        if (!record.fullUrl) return '-';
        return <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{record.fullUrl}</span>;
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.table.ipAddress' }),
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.table.userAgent' }),
      dataIndex: 'userAgent',
      key: 'userAgent',
      search: false,
      ellipsis: true,
      hideInTable: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.table.actionTime' }),
      dataIndex: 'createdAt',
      key: 'createdAt',
      valueType: 'dateTimeRange',
      sorter: true,
      hideInTable: false,
      fieldProps: {
        showTime: {
          format: 'HH:mm:ss',
        },
        format: 'YYYY-MM-DD HH:mm:ss',
      },
      render: (_, record) => {
        if (!record.createdAt) return '-';
        const date = new Date(record.createdAt);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      },
      search: {
        transform: (value: any) => {
          if (!value || !Array.isArray(value) || value.length !== 2) {
            return {};
          }
          return {
            startDate: value[0] ? new Date(value[0]).toISOString() : undefined,
            endDate: value[1] ? new Date(value[1]).toISOString() : undefined,
          };
        },
      },
    },
  ];

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
        <Space>
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => {
              actionRef.current?.reload();
            }}
          >
            {intl.formatMessage({ id: 'pages.button.refresh' })}
          </Button>
        </Space>
      }
    >
      {/* 活动统计信息：统一使用 StatCard 风格 */}
      {statistics && (
        <Card style={{ marginBottom: 16, borderRadius: 12 }}>
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.myActivity.statistics.totalLogs' })}
                value={statistics.total}
                icon={<HistoryOutlined />}
                color="#1890ff"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.myActivity.statistics.successCount' })}
                value={statistics.successCount}
                icon={<CheckCircleOutlined />}
                color="#52c41a"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.myActivity.statistics.errorCount' })}
                value={statistics.errorCount}
                icon={<CloseCircleOutlined />}
                color="#ff4d4f"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.myActivity.statistics.actionTypes' })}
                value={statistics.actionTypes}
                icon={<ThunderboltOutlined />}
                color="#faad14"
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* 搜索表单 */}
      <Card style={{ marginBottom: 16 }}>
        <Form form={searchForm} layout="inline" onFinish={handleSearch}>
          <Form.Item name="action" label={intl.formatMessage({ id: 'pages.table.action' })}>
            <Input 
              placeholder={intl.formatMessage({ id: 'pages.table.action' })} 
              style={{ width: 150 }} 
              allowClear 
            />
          </Form.Item>
          <Form.Item name="httpMethod" label={intl.formatMessage({ id: 'pages.table.httpMethod' })}>
            <Select
              placeholder={intl.formatMessage({ id: 'pages.table.httpMethod' })}
              style={{ width: 120 }}
              allowClear
            >
              <Select.Option value="GET">GET</Select.Option>
              <Select.Option value="POST">POST</Select.Option>
              <Select.Option value="PUT">PUT</Select.Option>
              <Select.Option value="DELETE">DELETE</Select.Option>
              <Select.Option value="PATCH">PATCH</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="statusCode" label={intl.formatMessage({ id: 'pages.table.statusCode' })}>
            <Input 
              placeholder={intl.formatMessage({ id: 'pages.table.statusCode' })} 
              style={{ width: 120 }} 
              allowClear 
            />
          </Form.Item>
          <Form.Item name="ipAddress" label={intl.formatMessage({ id: 'pages.table.ipAddress' })}>
            <Input 
              placeholder={intl.formatMessage({ id: 'pages.table.ipAddress' })} 
              style={{ width: 150 }} 
              allowClear 
            />
          </Form.Item>
          <Form.Item name="dateRange" label={intl.formatMessage({ id: 'pages.table.actionTime' })}>
            <RangePicker
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              style={{ width: 400 }}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                {intl.formatMessage({ id: 'pages.button.search' })}
              </Button>
              <Button onClick={handleReset} icon={<ReloadOutlined />}>
                {intl.formatMessage({ id: 'pages.userManagement.reset' })}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <div ref={tableRef}>
        <DataTable<UserActivityLog>
          actionRef={actionRef}
          rowKey="id"
          scroll={{ x: 'max-content' }}
          search={false}
          request={async (params, sort) => {
          const { current = 1, pageSize = 20 } = params;
          
          // 合并搜索参数，使用 ref 确保获取最新的搜索参数
          const mergedParams = { ...searchParamsRef.current, ...params };
          const { action, httpMethod, statusCode, ipAddress, startDate, endDate } = mergedParams;

          // 处理排序参数
          let sortBy = 'createdAt'; // 默认按创建时间排序
          let sortOrder: 'asc' | 'desc' = 'desc'; // 默认降序

          if (sort && Object.keys(sort).length > 0) {
            // ProTable 的 sort 格式: { fieldName: 'ascend' | 'descend' }
            const sortKey = Object.keys(sort)[0];
            const sortValue = sort[sortKey];
            
            // 将驼峰命名转换为后端字段名（如果需要）
            sortBy = sortKey === 'createdAt' ? 'createdAt' : sortKey;
            sortOrder = sortValue === 'ascend' ? 'asc' : 'desc';
          }

          // 处理日期范围参数
          let formattedStartDate: string | undefined;
          let formattedEndDate: string | undefined;

          if (startDate) {
            formattedStartDate = typeof startDate === 'string' 
              ? startDate 
              : new Date(startDate).toISOString();
          }

          if (endDate) {
            formattedEndDate = typeof endDate === 'string' 
              ? endDate 
              : new Date(endDate).toISOString();
          }

          try {
            const response = await getCurrentUserActivityLogs({
              page: current,
              pageSize,
              action,
              httpMethod,
              statusCode: statusCode && statusCode !== '' ? Number(statusCode) : undefined,
              ipAddress,
              startDate: formattedStartDate,
              endDate: formattedEndDate,
              sortBy,
              sortOrder,
            });

            if (response.success && response.data) {
              // 后端返回的数据结构：{ data: { data: [...], total: xxx, ... } }
              const result = response.data as any;
              const list: UserActivityLog[] = result.data || [];
              const total: number = result.total || 0;

              // 基于当前页数据和总数计算统计信息
              const successCount = list.filter(
                (x) => x.statusCode && x.statusCode >= 200 && x.statusCode < 300,
              ).length;
              const errorCount = list.filter(
                (x) => x.statusCode && x.statusCode >= 400,
              ).length;
              const actionTypes = new Set(
                list.map((x) => x.action).filter(Boolean),
              ).size;

              setStatistics({
                total,
                successCount,
                errorCount,
                actionTypes,
              });

              return {
                data: list,
                total,
                success: true,
              };
            }

            return {
              data: [],
              total: 0,
              success: false,
            };
          } catch (error) {
            console.error('Failed to load activity logs:', error);
            // 注意：这是 ProTable request 函数的特殊处理模式
            // 错误已被全局错误处理捕获并显示错误提示，这里返回空数据让表格显示空状态
            // 这是为了在错误已由全局处理显示的情况下，避免表格显示错误状态
            return {
              data: [],
              total: 0,
              success: false,
            };
          }
        }}
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
        logId={selectedLogId || undefined}
        fetchFromApi={true}
        onClose={handleCloseDetail}
      />
    </PageContainer>
  );
};

export default MyActivity;

