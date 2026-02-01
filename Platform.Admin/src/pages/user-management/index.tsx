import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { PageContainer } from '@/components';
import DataTable from '@/components/DataTable';
import type { ActionType } from '@/types/pro-components';
import type { ColumnsType } from 'antd/es/table';
import { useIntl } from '@umijs/max';
import { useMessage } from '@/hooks/useMessage';
import { useModal } from '@/hooks/useModal';
import {
  Button,
  Tag,
  Space,
  Modal,
  Select,
  Switch,
  Drawer,
  Row,
  Col,
  Badge,
  Form,
  Input,
  Card,
  DatePicker,
  Grid,
  Typography,
  theme,
} from 'antd';

const { useBreakpoint } = Grid;
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { request } from '@umijs/max';
import useCommonStyles from '@/hooks/useCommonStyles';
import SearchFormCard from '@/components/SearchFormCard';
import { getAllRoles } from '@/services/role/api';
import { getUserStatistics } from '@/services/ant-design-pro/api';
import type { ApiResponse } from '@/types/unified-api';
import type { AppUser, UserListRequest, UserStatisticsResponse } from './types';
import UserForm from './components/UserForm';
import UserDetail from './components/UserDetail';
import { StatCard } from '@/components';
import dayjs from 'dayjs';

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

const UserManagement: React.FC = () => {
  const intl = useIntl();
  const message = useMessage();
  const { styles } = useCommonStyles();
  const { token } = theme.useToken();
  const modal = useModal();
  const screens = useBreakpoint();
  const isMobile = !screens.md; // md 以下为移动端
  const actionRef = useRef<ActionType>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const [searchForm] = Form.useForm();
  const [selectedRows, setSelectedRows] = useState<AppUser[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [viewingUser, setViewingUser] = useState<AppUser | null>(null);
  const [statistics, setStatistics] = useState<UserStatisticsResponse | null>(
    null,
  );
  const [roleMap, setRoleMap] = useState<Record<string, string>>({});
  const [searchParams, setSearchParams] = useState<UserListRequest>({
    Page: 1,
    PageSize: 10,
    SortBy: 'CreatedAt',
    SortOrder: 'desc',
  });

  // 🔧 修复：使用 ref 存储搜索参数，避免 fetchUsers 函数重新创建导致重复请求
  const searchParamsRef = useRef<UserListRequest>({
    Page: 1,
    PageSize: 10,
    SortBy: 'CreatedAt',
    SortOrder: 'desc',
  });

  // 加载角色列表
  React.useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await getAllRoles();
        if (response.success && response.data) {
          // 创建角色 ID 到名称的映射
          const map: Record<string, string> = {};
          response.data.roles.forEach((role) => {
            if (role.id) {
              map[role.id] = role.name;
            }
          });
          setRoleMap(map);
        }
      } catch (error) {
        console.error('加载角色列表失败:', error);
      }
    };
    fetchRoles();
  }, []);

  // 获取用户统计信息
  const fetchStatistics = useCallback(async () => {
    try {
      const response = await getUserStatistics();
      if (response.success && response.data) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('获取统计信息失败:', error);
      // 不在这里显示错误消息，让全局错误处理器统一处理
      // 这样可以避免重复显示错误提示
    }
  }, []);

  // 获取用户列表
  const fetchUsers = useCallback(async (params: { current?: number; pageSize?: number }, sort?: Record<string, 'ascend' | 'descend'>) => {
    // 处理排序参数
    let sortBy = searchParamsRef.current.SortBy;
    let sortOrder = searchParamsRef.current.SortOrder;

    if (sort && Object.keys(sort).length > 0) {
      // ProTable 的 sort 格式: { fieldName: 'ascend' | 'descend' }
      const sortKey = Object.keys(sort)[0];
      const sortValue = sort[sortKey];

      // 后端使用小写字段名
      sortBy = sortKey;
      sortOrder = sortValue === 'ascend' ? 'asc' : 'desc';
    }

    const requestData: UserListRequest = {
      Page: params.current || searchParamsRef.current.Page,
      PageSize: params.pageSize || searchParamsRef.current.PageSize,
      Search: searchParamsRef.current.Search,
      RoleIds: searchParamsRef.current.RoleIds,
      IsActive: searchParamsRef.current.IsActive,
      SortBy: sortBy,
      SortOrder: sortOrder,
      StartDate: searchParamsRef.current.StartDate,
      EndDate: searchParamsRef.current.EndDate,
    };

    try {
      // ✅ 后端返回 UserListWithRolesResponse，包含 Users 和 Total
      const response = await request<ApiResponse<{
        users: AppUser[];
        total: number;
        page?: number;
        pageSize?: number;
      }>>('/api/user/list', {
        method: 'POST',
        data: requestData,
      });

      // ✅ 兼容后端返回的数据结构（Users 或 users）
      const users = response.data?.users || (response.data as any)?.Users || [];
      const total = response.data?.total || (response.data as any)?.Total || 0;

      return {
        data: users,
        success: response.success,
        total: total,
      };
    } catch (error) {
      console.error('获取用户列表失败:', error);
      // 注意：这是 ProTable request 函数的特殊处理模式
      // 错误已被全局错误处理捕获并显示错误提示，这里返回空数据让表格显示空状态
      // 这是为了在错误已由全局处理显示的情况下，避免表格显示错误状态
      // 如果需要让错误传播到 ProTable，可以删除 catch，但这样表格会显示错误状态
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  }, []); // 🔧 修复：移除 searchParams 依赖，使用 ref 避免函数重新创建

  // 处理搜索
  const handleSearch = useCallback((values: { search?: string; roleIds?: string | string[]; isActive?: boolean; dateRange?: [dayjs.Dayjs | null, dayjs.Dayjs | null] }) => {
    const newSearchParams: UserListRequest = {
      Page: 1,
      PageSize: searchParamsRef.current.PageSize,
      Search: values.search,
      RoleIds: values.roleIds
        ? Array.isArray(values.roleIds)
          ? values.roleIds
          : [values.roleIds]
        : undefined,
      IsActive: values.isActive,
      SortBy: searchParamsRef.current.SortBy,
      SortOrder: searchParamsRef.current.SortOrder,
      StartDate: values.dateRange?.[0]?.format('YYYY-MM-DD'),
      EndDate: values.dateRange?.[1]?.format('YYYY-MM-DD'),
    };
    // 更新 ref 和 state
    searchParamsRef.current = newSearchParams;
    setSearchParams(newSearchParams);
    // 手动触发重新加载
    actionRef.current?.reload?.();
  }, []);

  // 重置搜索
  const handleReset = useCallback(() => {
    searchForm.resetFields();
    const resetParams: UserListRequest = {
      Page: 1,
      PageSize: searchParamsRef.current.PageSize,
      SortBy: 'CreatedAt',
      SortOrder: 'desc',
    };
    // 更新 ref 和 state
    searchParamsRef.current = resetParams;
    setSearchParams(resetParams);
    // 手动触发重新加载
    actionRef.current?.reload?.();
  }, [searchForm]);

  // 删除用户（带删除原因）
  const handleDelete = useCallback(async (userId: string) => {
    let deleteReason = '';
    modal.confirm({
      title: intl.formatMessage({ id: 'pages.modal.confirmDeleteUser' }),
      content: (
        <div>
          <p>{intl.formatMessage({ id: 'pages.modal.irreversibleOperation' })}</p>
          <Input.TextArea
            rows={3}
            placeholder={intl.formatMessage({ id: 'pages.modal.pleaseEnterReasonOptional' })}
            onChange={(e) => {
              deleteReason = e.target.value;
            }}
            maxLength={200}
          />
        </div>
      ),
      okText: intl.formatMessage({ id: 'pages.modal.okDelete' }),
      cancelText: intl.formatMessage({ id: 'pages.modal.cancel' }),
      okType: 'danger',
      onOk: async () => {
        try {
          await request(`/api/user/${userId}`, {
            method: 'DELETE',
            params: { reason: deleteReason },
          });
          message.success(intl.formatMessage({ id: 'pages.message.deleteSuccess' }));
          actionRef.current?.reload?.();
          fetchStatistics();
        } catch (error) {
          console.error('删除用户失败:', error);
          // 错误已被全局错误处理捕获并显示
          // 重新抛出以确保 Modal.confirm 在错误时不关闭（Ant Design 默认行为）
          throw error;
        }
      },
    });
  }, [intl, fetchStatistics]);

  // 批量操作
  const handleBulkAction = useCallback(async (action: string) => {
    if (selectedRows.length === 0) {
      message.warning(intl.formatMessage({ id: 'pages.message.pleaseSelect' }));
      return;
    }

    // 如果是删除操作，弹窗输入删除原因
    if (action === 'delete') {
      let deleteReason = '';
      modal.confirm({
        title: intl.formatMessage({ id: 'pages.modal.confirmBatchDelete' }, { count: selectedRows.length }),
        content: (
          <div>
            <p>{intl.formatMessage({ id: 'pages.modal.irreversibleOperation' })}</p>
            <Input.TextArea
              rows={3}
              placeholder={intl.formatMessage({ id: 'pages.modal.pleaseEnterReasonOptional' })}
              onChange={(e) => {
                deleteReason = e.target.value;
              }}
              maxLength={200}
            />
          </div>
        ),
        okText: intl.formatMessage({ id: 'pages.modal.okDelete' }),
        cancelText: intl.formatMessage({ id: 'pages.modal.cancel' }),
        okType: 'danger',
        onOk: async () => {
          try {
            await request('/api/user/bulk-action', {
              method: 'POST',
              data: {
                UserIds: selectedRows.map((user) => user.id),
                Action: action,
                Reason: deleteReason,
              },
            });

            message.success(`批量删除成功`);
            setSelectedRows([]);
            actionRef.current?.reload?.();
            fetchStatistics();
          } catch (error) {
            console.error('批量删除失败:', error);
            // 错误已被全局错误处理捕获并显示
            // 重新抛出以确保 Modal.confirm 在错误时不关闭（Ant Design 默认行为）
            throw error;
          }
        },
      });
      return;
    }

    try {
      await request('/api/user/bulk-action', {
        method: 'POST',
        data: {
          UserIds: selectedRows.map((user) => user.id),
          Action: action,
        },
      });

      const actionText =
        {
          activate: intl.formatMessage({ id: 'pages.userManagement.action.activate' }),
          deactivate: intl.formatMessage({ id: 'pages.userManagement.action.deactivate' }),
        }[action] || intl.formatMessage({ id: 'pages.userManagement.action.operation' });

      message.success(intl.formatMessage({ id: 'pages.message.success' }));
      setSelectedRows([]);
      actionRef.current?.reload?.();
      fetchStatistics();
    } catch (error) {
      console.error('批量操作失败:', error);
      // 不在这里显示错误消息，让全局错误处理器统一处理
      // 这样可以避免重复显示错误提示
    }
  }, [selectedRows, intl, fetchStatistics]);

  // 切换用户状态
  const handleToggleStatus = useCallback(async (user: AppUser) => {
    try {
      const endpoint = user.isActive ? 'deactivate' : 'activate';
      await request(`/api/user/${user.id}/${endpoint}`, {
        method: 'PUT',
      });

      message.success(user.isActive ? intl.formatMessage({ id: 'pages.userManagement.userActivated' }) : intl.formatMessage({ id: 'pages.userManagement.userDeactivated' }));
      actionRef.current?.reload?.();
      fetchStatistics();
    } catch (error) {
      console.error('切换用户状态失败:', error);
      // 不在这里显示错误消息，让全局错误处理器统一处理
      // 这样可以避免重复显示错误提示
    }
  }, [intl, fetchStatistics]);

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

  // 表格列定义（记忆化，避免不必要渲染）
  const columns: ColumnsType<AppUser> = useMemo(() => [
    {
      title: intl.formatMessage({ id: 'pages.table.username' }),
      dataIndex: 'username',
      key: 'username',
      render: (text: string, record: AppUser) => (
        <Space>
          <UserOutlined />
          <a
            onClick={() => {
              setViewingUser(record);
              setDetailVisible(true);
            }}
            style={{ cursor: 'pointer' }}
          >
            {text}
          </a>
        </Space>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.table.email' }),
      dataIndex: 'email',
      key: 'email',
      ellipsis: true,
    },
    {
      title: '手机号',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.table.role' }),
      dataIndex: 'roleIds',
      key: 'roleIds',
      render: (_: string[], record: AppUser) => {
        if (!record.roleIds || record.roleIds.length === 0) {
          return <Tag color="default">{intl.formatMessage({ id: 'pages.table.unassigned' })}</Tag>;
        }
        return (
          <Space wrap>
            {record.roleIds.map((roleId: string) => (
              <Tag key={roleId} color="blue">
                {roleMap[roleId] || roleId}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.table.organization' }),
      dataIndex: 'organizations',
      key: 'organizations',
      render: (_: unknown, record: AppUser) => {
        const orgs = record.organizations || [];
        if (!orgs.length) {
          return (
            <Typography.Text type="secondary">
              {intl.formatMessage({ id: 'pages.userManagement.organization.empty' })}
            </Typography.Text>
          );
        }
        return (
          <Space direction="vertical" size={4} wrap>
            {orgs.map((org) => (
              <Space key={org.id || org.fullPath || org.name} size={4} wrap>
                <span>{org.fullPath || org.name || '-'}</span>
                {org.isPrimary ? (
                  <Tag color="gold" bordered={false} style={{ marginInlineStart: 4 }}>
                    {intl.formatMessage({ id: 'pages.userManagement.organization.primary' })}
                  </Tag>
                ) : null}
              </Space>
            ))}
          </Space>
        );
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.table.status' }),
      dataIndex: 'isActive',
      key: 'isActive',
      render: (_: boolean, record: AppUser) => (
        <Badge
          status={record.isActive ? 'success' : 'error'}
          text={record.isActive ? intl.formatMessage({ id: 'pages.table.activated' }) : intl.formatMessage({ id: 'pages.table.deactivated' })}
        />
      ),
      renderFormItem: (_: boolean, { record }: { record?: AppUser }) => (
        <Switch
          checked={record?.isActive}
          onChange={() => record && handleToggleStatus(record)}
        />
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.table.createdAt' }),
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: true,
      render: (_: string, record: AppUser) => formatDateTime(record.createdAt),
    },
    {
      title: intl.formatMessage({ id: 'pages.table.lastLogin' }),
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      render: (_: string, record: AppUser) => formatDateTime(record.lastLoginAt),
    },
    {
      title: intl.formatMessage({ id: 'pages.table.actions' }),
      key: 'action',
      fixed: 'right',
      width: 150,
      render: (_: unknown, record: AppUser) => {
        return (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingUser(record);
                setFormVisible(true);
              }}
              aria-label={intl.formatMessage({ id: 'pages.table.edit' })}
            >
              {intl.formatMessage({ id: 'pages.table.edit' })}
            </Button>
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                record.id && handleDelete(record.id);
              }}
            >
              {intl.formatMessage({ id: 'pages.table.delete' })}
            </Button>
          </Space>
        );
      },
    },
  ], [roleMap, intl, handleToggleStatus, handleDelete]);

  // 行选择变化处理
  const handleRowSelectionChange = useCallback((_: React.Key[], selectedRows: AppUser[]) => {
    setSelectedRows(selectedRows);
  }, []);

  // 刷新处理
  const handleRefresh = useCallback(() => {
    actionRef.current?.reload?.();
    fetchStatistics();
  }, [fetchStatistics]);

  // 关闭表单处理
  const handleFormClose = useCallback(() => {
    setFormVisible(false);
  }, []);

  // 表单成功处理
  const handleFormSuccess = useCallback(() => {
    setFormVisible(false);
    actionRef.current?.reload?.();
    fetchStatistics();
  }, [fetchStatistics]);

  // 关闭详情处理
  const handleDetailClose = useCallback(() => {
    setDetailVisible(false);
  }, []);

  React.useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  return (
    <PageContainer
      title={
        <Space>
          <UserOutlined />
          {intl.formatMessage({ id: 'pages.userManagement.title' })}
        </Space>
      }
      style={{ paddingBlock: 12 }}
      extra={
        <Space wrap>
          {/* 批量操作按钮 */}
          <Button
            key="activate"
            onClick={() => handleBulkAction('activate')}
            disabled={selectedRows.length === 0}
            aria-label={intl.formatMessage({ id: 'pages.userManagement.bulkActivate' })}
          >
            {intl.formatMessage({ id: 'pages.userManagement.bulkActivate' })}
          </Button>
          <Button
            key="deactivate"
            onClick={() => handleBulkAction('deactivate')}
            disabled={selectedRows.length === 0}
            aria-label={intl.formatMessage({ id: 'pages.userManagement.bulkDeactivate' })}
          >
            {intl.formatMessage({ id: 'pages.userManagement.bulkDeactivate' })}
          </Button>
          <Button
            key="delete"
            danger
            onClick={() => handleBulkAction('delete')}
            disabled={selectedRows.length === 0}
            aria-label={intl.formatMessage({ id: 'pages.userManagement.bulkDelete' })}
          >
            {intl.formatMessage({ id: 'pages.userManagement.bulkDelete' })}
          </Button>
          {/* 刷新和添加按钮 */}
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            aria-label={intl.formatMessage({ id: 'pages.userManagement.refresh' })}
            onClick={handleRefresh}
          >
            {intl.formatMessage({ id: 'pages.userManagement.refresh' })}
          </Button>
          <Button
            key="add"
            type="primary"
            icon={<PlusOutlined />}
            aria-label={intl.formatMessage({ id: 'pages.userManagement.addUser' })}
            onClick={() => {
              setEditingUser(null);
              setFormVisible(true);
            }}
          >
            {intl.formatMessage({ id: 'pages.userManagement.addUser' })}
          </Button>
        </Space>
      }
    >
      {/* 统计卡片：参考 Welcome 页面风格 */}
      {statistics && (
        <Card className={styles.card} style={{ marginBottom: 16 }}>
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.userManagement.statistics.totalUsers' })}
                value={statistics.totalUsers}
                icon={<TeamOutlined />}
                color="#1890ff"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.userManagement.statistics.activeUsers' })}
                value={statistics.activeUsers}
                icon={<CheckCircleOutlined />}
                color="#52c41a"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.userManagement.statistics.adminUsers' })}
                value={statistics.adminUsers}
                icon={<UserOutlined />}
                color="#faad14"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.userManagement.statistics.newUsersThisMonth' })}
                value={statistics.newUsersThisMonth}
                icon={<PlusOutlined />}
                color="#1890ff"
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* 搜索表单 */}
      <SearchFormCard>
        <Form
          form={searchForm}
          layout={isMobile ? 'vertical' : 'inline'}
          onFinish={handleSearch}
          style={{ marginBottom: 16 }}
        >
          <Form.Item name="search" label={intl.formatMessage({ id: 'pages.userManagement.search.label' })}>
            <Input placeholder={intl.formatMessage({ id: 'pages.userManagement.search.placeholder' })} style={{ width: 200 }} aria-label={intl.formatMessage({ id: 'pages.userManagement.search.placeholder' })} />
          </Form.Item>
          <Form.Item name="roleIds" label={intl.formatMessage({ id: 'pages.userManagement.role.label' })}>
            <Select
              mode="multiple"
              allowClear
              placeholder={intl.formatMessage({ id: 'pages.userManagement.role.placeholder' })}
              style={{ width: 200 }}
              aria-label={intl.formatMessage({ id: 'pages.userManagement.role.placeholder' })}
            >
              {Object.entries(roleMap).map(([id, name]) => (
                <Select.Option key={id} value={id}>
                  {name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="isActive" label={intl.formatMessage({ id: 'pages.userManagement.status.label' })}>
            <Select allowClear placeholder={intl.formatMessage({ id: 'pages.userManagement.status.placeholder' })} style={{ width: 120 }} aria-label={intl.formatMessage({ id: 'pages.userManagement.status.placeholder' })}>
              <Select.Option value={true}>{intl.formatMessage({ id: 'pages.userManagement.status.activated' })}</Select.Option>
              <Select.Option value={false}>{intl.formatMessage({ id: 'pages.userManagement.status.deactivated' })}</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="dateRange" label={intl.formatMessage({ id: 'pages.userManagement.dateRange.label' })}>
            <DatePicker.RangePicker />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {intl.formatMessage({ id: 'pages.common.search', defaultMessage: 'Search' })}
              </Button>
              <Button onClick={handleReset}>
                {intl.formatMessage({ id: 'pages.common.reset', defaultMessage: 'Reset' })}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </SearchFormCard>

      {/* 用户列表表格 */}
      <div ref={tableRef}>
        <DataTable<AppUser>
          actionRef={actionRef}
          rowKey="id"
          scroll={{ x: 'max-content' }}
          search={false}
          request={fetchUsers}
          columns={columns}
          rowSelection={{
            onChange: handleRowSelectionChange,
          }}
          pagination={{
            pageSize: 10,
            pageSizeOptions: [10, 20, 50, 100],
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              intl.formatMessage(
                { id: 'pages.userManagement.pagination.total' },
                { start: range[0], end: range[1], total },
              ),
          }}
        />
      </div>

      {/* 用户表单弹窗 */}
      {formVisible && (
        <Modal
          title={editingUser ? intl.formatMessage({ id: 'pages.userManagement.editUser' }) : intl.formatMessage({ id: 'pages.userManagement.addUser' })}
          open={formVisible}
          onCancel={handleFormClose}
          footer={null}
          width={isMobile ? '100%' : 600}
          destroyOnHidden={true}
        >
          <UserForm
            user={editingUser}
            onSuccess={handleFormSuccess}
            onCancel={handleFormClose}
          />
        </Modal>
      )}

      {/* 用户详情抽屉 */}
      <Drawer
        title={intl.formatMessage({ id: 'pages.userDetail.title' })}
        open={detailVisible}
        onClose={handleDetailClose}
        size={600}
      >
        {viewingUser && (
          <UserDetail
            user={viewingUser}
            onClose={handleDetailClose}
          />
        )}
      </Drawer>
    </PageContainer>
  );
};

export default UserManagement;
