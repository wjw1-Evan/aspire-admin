import React, { useRef, useState, useMemo, useEffect } from 'react';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable, ProCard } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import {
  Button,
  Tag,
  Space,
  message,
  Modal,
  Select,
  Switch,
  Drawer,
  Statistic,
  Row,
  Col,
  Badge,
  Form,
  Input,
  Card,
  Dropdown,
  DatePicker,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  ReloadOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { request } from '@umijs/max';
import { getAllRoles } from '@/services/role/api';
import { getUserStatistics } from '@/services/ant-design-pro/api';
import type { ApiResponse } from '@/types/unified-api';
import type { AppUser, UserListRequest, UserStatisticsResponse } from './types';
import UserForm from './components/UserForm';
import UserDetail from './components/UserDetail';

const UserManagement: React.FC = () => {
  const intl = useIntl();
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
  const fetchStatistics = async () => {
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
  };

  // 获取用户列表
  const fetchUsers = async (params: any, sort?: Record<string, any>) => {
    // 处理排序参数
    let sortBy = searchParams.SortBy;
    let sortOrder = searchParams.SortOrder;
    
    if (sort && Object.keys(sort).length > 0) {
      // ProTable 的 sort 格式: { fieldName: 'ascend' | 'descend' }
      const sortKey = Object.keys(sort)[0];
      const sortValue = sort[sortKey];
      
      // 后端使用小写字段名
      sortBy = sortKey;
      sortOrder = sortValue === 'ascend' ? 'asc' : 'desc';
    }

    const requestData: UserListRequest = {
      Page: params.current || searchParams.Page,
      PageSize: params.pageSize || searchParams.PageSize,
      Search: searchParams.Search,
      RoleIds: searchParams.RoleIds,
      IsActive: searchParams.IsActive,
      SortBy: sortBy,
      SortOrder: sortOrder,
      StartDate: searchParams.StartDate,
      EndDate: searchParams.EndDate,
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
      // 不在这里显示错误消息，让全局错误处理器统一处理
      // 这样可以避免重复显示错误提示
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  };

  // 处理搜索
  const handleSearch = (values: any) => {
    const newSearchParams: UserListRequest = {
      Page: 1,
      PageSize: searchParams.PageSize,
      Search: values.search,
      RoleIds: values.roleIds
        ? Array.isArray(values.roleIds)
          ? values.roleIds
          : [values.roleIds]
        : undefined,
      IsActive: values.isActive,
      SortBy: searchParams.SortBy,
      SortOrder: searchParams.SortOrder,
      StartDate: values.dateRange?.[0]?.format('YYYY-MM-DD'),
      EndDate: values.dateRange?.[1]?.format('YYYY-MM-DD'),
    };
    setSearchParams(newSearchParams);
    actionRef.current?.reload();
  };

  // 重置搜索
  const handleReset = () => {
    searchForm.resetFields();
    const resetParams: UserListRequest = {
      Page: 1,
      PageSize: searchParams.PageSize,
      SortBy: 'CreatedAt',
      SortOrder: 'desc',
    };
    setSearchParams(resetParams);
    actionRef.current?.reload();
  };

  // 删除用户（带删除原因）
  const handleDelete = async (userId: string) => {
    let deleteReason = '';
    Modal.confirm({
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
          actionRef.current?.reload();
          fetchStatistics();
        } catch (error) {
          console.error('删除用户失败:', error);
          // 不在这里显示错误消息，让全局错误处理器统一处理
          // 这样可以避免重复显示错误提示
        }
      },
    });
  };

  // 批量操作
  const handleBulkAction = async (action: string) => {
    if (selectedRows.length === 0) {
      message.warning(intl.formatMessage({ id: 'pages.message.pleaseSelect' }));
      return;
    }

    // 如果是删除操作，弹窗输入删除原因
    if (action === 'delete') {
      let deleteReason = '';
      Modal.confirm({
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
            actionRef.current?.reload();
            fetchStatistics();
          } catch (error) {
            console.error('批量删除失败:', error);
            // 不在这里显示错误消息，让全局错误处理器统一处理
            // 这样可以避免重复显示错误提示
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
      actionRef.current?.reload();
      fetchStatistics();
    } catch (error) {
      console.error('批量操作失败:', error);
      // 不在这里显示错误消息，让全局错误处理器统一处理
      // 这样可以避免重复显示错误提示
    }
  };

  // 切换用户状态
  const handleToggleStatus = async (user: AppUser) => {
    try {
      const endpoint = user.isActive ? 'deactivate' : 'activate';
      await request(`/api/user/${user.id}/${endpoint}`, {
        method: 'PUT',
      });

      message.success(user.isActive ? intl.formatMessage({ id: 'pages.userManagement.userActivated' }) : intl.formatMessage({ id: 'pages.userManagement.userDeactivated' }));
      actionRef.current?.reload();
      fetchStatistics();
    } catch (error) {
      console.error('切换用户状态失败:', error);
      // 不在这里显示错误消息，让全局错误处理器统一处理
      // 这样可以避免重复显示错误提示
    }
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

  // 表格列定义（记忆化，避免不必要渲染）
  const columns: ProColumns<AppUser>[] = useMemo(() => [
    {
      title: intl.formatMessage({ id: 'pages.table.username' }),
      dataIndex: 'username',
      key: 'username',
      render: (text, _record) => (
        <Space>
          <UserOutlined />
          {text}
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
      title: intl.formatMessage({ id: 'pages.table.role' }),
      dataIndex: 'roleIds',
      key: 'roleIds',
      render: (_, record) => {
        if (!record.roleIds || record.roleIds.length === 0) {
          return <Tag color="default">{intl.formatMessage({ id: 'pages.table.unassigned' })}</Tag>;
        }
        return (
          <Space wrap>
            {record.roleIds.map((roleId) => (
              <Tag key={roleId} color="blue">
                {roleMap[roleId] || roleId}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.table.status' }),
      dataIndex: 'isActive',
      key: 'isActive',
      render: (_, record) => (
        <Badge
          status={record.isActive ? 'success' : 'error'}
          text={record.isActive ? intl.formatMessage({ id: 'pages.table.activated' }) : intl.formatMessage({ id: 'pages.table.deactivated' })}
        />
      ),
      renderFormItem: (_, { record }) => (
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
      valueType: 'dateTime',
      sorter: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.table.lastLogin' }),
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      valueType: 'dateTime',
      render: (text) => text || '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.table.actions' }),
      key: 'action',
      fixed: 'right',
      render: (_, record) => {
        const items: MenuProps['items'] = [
          {
            key: 'view',
            icon: <EyeOutlined />,
            label: intl.formatMessage({ id: 'pages.table.viewDetail' }),
            onClick: () => {
              setViewingUser(record);
              setDetailVisible(true);
            },
          },
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: intl.formatMessage({ id: 'pages.table.edit' }),
            onClick: () => {
              setEditingUser(record);
              setFormVisible(true);
            },
          },
          {
            type: 'divider',
          },
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: intl.formatMessage({ id: 'pages.table.delete' }),
            danger: true,
            onClick: () => {
              record.id && handleDelete(record.id);
            },
          },
        ];

        return (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setViewingUser(record);
                setDetailVisible(true);
              }}
              aria-label={intl.formatMessage({ id: 'pages.table.viewDetail' })}
            >
              {intl.formatMessage({ id: 'pages.table.view' })}
            </Button>
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
            <Dropdown menu={{ items: items.slice(2) }} trigger={["click"]}>
              <Button type="link" size="small" icon={<MoreOutlined />}>
                {intl.formatMessage({ id: 'pages.table.more' })}
              </Button>
            </Dropdown>
          </Space>
        );
      },
    },
  ], [roleMap, intl]);

  React.useEffect(() => {
    fetchStatistics();
  }, []);

  return (
    <PageContainer
      title={intl.formatMessage({ id: 'pages.userManagement.title' })}
      extra={[
        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          aria-label={intl.formatMessage({ id: 'pages.userManagement.refresh' })}
          onClick={() => {
            actionRef.current?.reload();
            fetchStatistics();
          }}
        >
          {intl.formatMessage({ id: 'pages.userManagement.refresh' })}
        </Button>,
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
        </Button>,
      ]}
    >
      {/* 统计卡片 */}
      {statistics && (
        <ProCard style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title={intl.formatMessage({ id: 'pages.userManagement.statistics.totalUsers' })}
                value={statistics.totalUsers}
                prefix={<TeamOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title={intl.formatMessage({ id: 'pages.userManagement.statistics.activeUsers' })}
                value={statistics.activeUsers}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title={intl.formatMessage({ id: 'pages.userManagement.statistics.adminUsers' })}
                value={statistics.adminUsers}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#cf1322' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title={intl.formatMessage({ id: 'pages.userManagement.statistics.newUsersThisMonth' })}
                value={statistics.newUsersThisMonth}
                prefix={<PlusOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
          </Row>
        </ProCard>
      )}

      {/* 搜索表单 */}
      <Card style={{ marginBottom: 16 }}>
        <Form
          form={searchForm}
          layout="inline"
          onFinish={handleSearch}
          style={{ marginBottom: 16 }}
        >
          <Form.Item name="search" label={intl.formatMessage({ id: 'pages.userManagement.search.label' })}>
            <Input placeholder={intl.formatMessage({ id: 'pages.userManagement.search.placeholder' })} style={{ width: 200 }} aria-label={intl.formatMessage({ id: 'pages.userManagement.search.placeholder' })} />
          </Form.Item>
          <Form.Item name="roleIds" label={intl.formatMessage({ id: 'pages.userManagement.role.label' })}>
            <Select
              mode="multiple"
              placeholder={intl.formatMessage({ id: 'pages.userManagement.role.placeholder' })}
              style={{ width: 200 }}
              allowClear
              loading={Object.keys(roleMap).length === 0}
              aria-label={intl.formatMessage({ id: 'pages.userManagement.role.label' })}
            >
              {Object.entries(roleMap).map(([id, name]) => (
                <Select.Option key={id} value={id}>
                  {name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="isActive" label={intl.formatMessage({ id: 'pages.userManagement.status.label' })}>
            <Select placeholder={intl.formatMessage({ id: 'pages.userManagement.status.placeholder' })} style={{ width: 120 }} allowClear aria-label={intl.formatMessage({ id: 'pages.userManagement.status.label' })}>
              <Select.Option value={true}>{intl.formatMessage({ id: 'pages.table.activated' })}</Select.Option>
              <Select.Option value={false}>{intl.formatMessage({ id: 'pages.table.deactivated' })}</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="dateRange" label={intl.formatMessage({ id: 'pages.userManagement.createdAt.label' })}>
            <DatePicker.RangePicker style={{ width: 240 }} aria-label={intl.formatMessage({ id: 'pages.userManagement.createdAt.label' })} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" aria-label={intl.formatMessage({ id: 'pages.userManagement.query' })}>
                {intl.formatMessage({ id: 'pages.userManagement.query' })}
              </Button>
              <Button onClick={handleReset} aria-label={intl.formatMessage({ id: 'pages.userManagement.reset' })}>{intl.formatMessage({ id: 'pages.userManagement.reset' })}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* 用户列表表格 */}
      <div ref={tableRef}>
        <ProTable<AppUser>
          actionRef={actionRef}
          rowKey="id"
          scroll={{ x: 'max-content' }}
          search={false}
        toolBarRender={() => [
          <Button
            key="activate"
            onClick={() => handleBulkAction('activate')}
            disabled={selectedRows.length === 0}
            aria-label={intl.formatMessage({ id: 'pages.userManagement.bulkActivate' })}
          >
            {intl.formatMessage({ id: 'pages.userManagement.bulkActivate' })}
          </Button>,
          <Button
            key="deactivate"
            onClick={() => handleBulkAction('deactivate')}
            disabled={selectedRows.length === 0}
            aria-label={intl.formatMessage({ id: 'pages.userManagement.bulkDeactivate' })}
          >
            {intl.formatMessage({ id: 'pages.userManagement.bulkDeactivate' })}
          </Button>,
          <Button
            key="delete"
            danger
            onClick={() => handleBulkAction('delete')}
            disabled={selectedRows.length === 0}
            aria-label={intl.formatMessage({ id: 'pages.userManagement.bulkDelete' })}
          >
            {intl.formatMessage({ id: 'pages.userManagement.bulkDelete' })}
          </Button>,
        ]}
        request={fetchUsers}
        columns={columns}
        rowSelection={{
          onChange: (_, selectedRows) => {
            setSelectedRows(selectedRows);
          },
        }}
        pagination={{
          defaultPageSize: 10,
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
          onCancel={() => setFormVisible(false)}
          footer={null}
          width={600}
          destroyOnHidden={true}
        >
          <UserForm
            user={editingUser}
            onSuccess={() => {
              setFormVisible(false);
              actionRef.current?.reload();
              fetchStatistics();
            }}
            onCancel={() => setFormVisible(false)}
          />
        </Modal>
      )}

      {/* 用户详情抽屉 */}
      <Drawer
        title={intl.formatMessage({ id: 'pages.userDetail.title' })}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={600}
      >
        {viewingUser && (
          <UserDetail
            user={viewingUser}
            onClose={() => setDetailVisible(false)}
          />
        )}
      </Drawer>
    </PageContainer>
  );
};

export default UserManagement;
