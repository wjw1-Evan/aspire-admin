import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { PageContainer } from '@/components';
import type { ActionType } from '@/types/pro-components';
import type { ColumnsType } from 'antd/es/table';
import { useIntl, useModel } from '@umijs/max';
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
  Card,
  Grid,
  Typography,
  theme,
  Spin,
  Input,
  Table,
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
  CrownOutlined,
} from '@ant-design/icons';
import { request } from '@umijs/max';
import SearchBar from '@/components/SearchBar';
import { useTableResize } from '@/hooks/useTableResize';
import useCommonStyles from '@/hooks/useCommonStyles';
import { getAllRoles } from '@/services/role/api';
import type { Role } from '@/services/role/types';
import { getCurrentCompany } from '@/services/company';
import { getUserStatistics } from '@/services/ant-design-pro/api';
import type { ApiResponse, PagedResult } from '@/types/unified-api';
import { type PageParams, toBackendPageParams } from '@/types/page-params';
import type { AppUser, UserStatisticsResponse } from './types';
const UserForm = React.lazy(() => import('./components/UserForm'));
const UserDetail = React.lazy(() => import('./components/UserDetail'));
import { StatCard } from '@/components';
import dayjs from 'dayjs';
const JoinRequestsTable = React.lazy(() => import('./components/JoinRequestsTable'));

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
  const modal = useModal();
  const screens = useBreakpoint();
  const isMobile = !screens.md; // md 以下为移动端
  const { styles } = useCommonStyles();
  const { token } = theme.useToken();
  const actionRef = useRef<ActionType>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const { initialState } = useModel('@@initialState');
  const [activeTab, setActiveTab] = useState('members');
  const currentCompanyId = initialState?.currentUser?.currentCompanyId || '';
  const [selectedRows, setSelectedRows] = useState<AppUser[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [viewingUser, setViewingUser] = useState<AppUser | null>(null);
  const [statistics, setStatistics] = useState<UserStatisticsResponse | null>(null);
  const [roleMap, setRoleMap] = useState<Record<string, string>>({});
  
  // 🔧 简化：直接使用标准 PageParams
  const searchParamsRef = useRef<PageParams>({
    page: 1,
    pageSize: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const [data, setData] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });

  // 加载角色列表
  const [currentCompany, setCurrentCompany] = useState<API.Company | null>(null);

  useEffect(() => {
    // 获取当前企业信息（用于判断是否为创建人）
    getCurrentCompany().then((res) => {
      if (res.success && res.data) {
        setCurrentCompany(res.data);
      }
    });

    const fetchRoles = async () => {
      try {
        const response = await getAllRoles();
        if (response.success && response.data) {
          const map: Record<string, string> = {};
          response.data.forEach((role: Role) => {
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
  const fetchData = useCallback(async () => {
    const currentParams = searchParamsRef.current;
    const requestData = toBackendPageParams(currentParams);

    setLoading(true);
    try {
      const response = await request<ApiResponse<PagedResult<AppUser>>>('/api/users/list', {
        method: 'POST',
        data: requestData,
      });

      if (response.success && response.data) {
        setData(response.data?.queryable || []);
        setPagination(prev => ({
          ...prev,
          page: currentParams.page ?? prev.page,
          pageSize: currentParams.pageSize ?? prev.pageSize,
          total: response.data?.rowCount || 0,
        }));
      } else {
        setData([]);
        setPagination(prev => ({ ...prev, total: 0 }));
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
      setData([]);
      setPagination(prev => ({ ...prev, total: 0 }));
    } finally {
      setLoading(false);
    }
  }, []);

  // 搜索处理
  const handleSearch = useCallback((params: PageParams) => {
    searchParamsRef.current = { ...searchParamsRef.current, ...params, page: 1 };
    fetchData();
  }, [fetchData]);

  // 表格分页和排序处理
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
          await request(`/api/users/${userId}`, {
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
            await request('/api/users/bulk-action', {
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
      await request('/api/users/bulk-action', {
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
      await request(`/api/users/${user.id}/${endpoint}`, {
        method: 'PUT',
      });

      message.success(user.isActive ? intl.formatMessage({ id: 'pages.userManagement.userActivated' }) : intl.formatMessage({ id: 'pages.userManagement.userDeactivated' }));
      fetchData();
      fetchStatistics();
    } catch (error) {
      console.error('切换用户状态失败:', error);
      // 不在这里显示错误消息，让全局错误处理器统一处理
      // 这样可以避免重复显示错误提示
    }
  }, [intl, fetchData, fetchStatistics]);

  // 🔧 使用自定义 Hook 替代繁琐的内联 DOM 逻辑，提升代码可维护性
  useTableResize(tableRef, activeTab === 'members');


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
          {currentCompany?.createdBy === record.id && (
            <Tag icon={<CrownOutlined />} color="gold" title={intl.formatMessage({ id: 'pages.userManagement.role.creator', defaultMessage: 'Creator' })}>
              {intl.formatMessage({ id: 'pages.userManagement.role.creator', defaultMessage: 'Creator' })}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.account.center.name', defaultMessage: 'Name' }),
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.table.email' }),
      dataIndex: 'email',
      key: 'email',
      ellipsis: true,
      responsive: ['md'],
    },
    {
      title: '手机号',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
      ellipsis: true,
      render: (text: string) => text || '-',
      responsive: ['lg'],
    },
    {
      title: intl.formatMessage({ id: 'pages.account.center.age', defaultMessage: 'Age' }),
      dataIndex: 'age',
      key: 'age',
      width: 80,
      render: (text: number) => text || '-',
      responsive: ['lg'],
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
      render: (text: string) => text || '-',
      responsive: ['xl'],
    },
    {
      title: intl.formatMessage({ id: 'pages.table.role' }),
      dataIndex: 'roleIds',
      key: 'roleIds',
      responsive: ['md'],
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
      responsive: ['lg'],
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
                  <Tag color="gold" variant="filled" style={{ marginInlineStart: 4 }}>
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
          </Space>
        );
      },
    },
  ], [roleMap, intl, handleToggleStatus, handleDelete, currentCompany]);

  // 行选择变化处理
  const handleRowSelectionChange = useCallback((_: React.Key[], selectedRows: AppUser[]) => {
    setSelectedRows(selectedRows);
  }, []);

  // 刷新处理
  const handleRefresh = useCallback(() => {
    fetchData();
    fetchStatistics();
  }, [fetchData, fetchStatistics]);

  // 关闭表单处理
  const handleFormClose = useCallback(() => {
    setFormVisible(false);
  }, []);

  // 表单成功处理
  const handleFormSuccess = useCallback(() => {
    setFormVisible(false);
    fetchData();
    fetchStatistics();
  }, [fetchData, fetchStatistics]);

  // 关闭详情处理
  const handleDetailClose = useCallback(() => {
    setDetailVisible(false);
  }, []);

  React.useEffect(() => {
    fetchStatistics();
    if (activeTab === 'members') {
      fetchData();
    }
  }, [fetchStatistics, activeTab]);

  return (
    <PageContainer
      title={
        <Space>
          <UserOutlined />
          {intl.formatMessage({ id: 'pages.userManagement.title' })}
        </Space>
      }
      style={{ paddingBlock: 12 }}
      tabList={[
        {
          tab: intl.formatMessage({ id: 'pages.userManagement.members.title', defaultMessage: 'Member List' }),
          key: 'members',
        },
        {
          tab: intl.formatMessage({ id: 'pages.joinRequests.pending.title', defaultMessage: 'Join Requests' }),
          key: 'requests',
        },
      ]}
      tabActiveKey={activeTab}
      onTabChange={(key: string) => setActiveTab(key)}
      extra={
        <Space wrap>
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
      {activeTab === 'members' && (
        <>
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
          <SearchBar
            initialParams={searchParamsRef.current}
            onSearch={handleSearch}
            showResetButton={false}
          />

          {/* 用户列表表格 */}
          <div ref={tableRef}>
            <Table<AppUser>
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
                showTotal: (total) =>
                  intl.formatMessage(
                    { id: 'pages.userManagement.pagination.total' },
                    { total },
                  ),
              }}
            />
          </div>

          {/* 用户表单弹窗 */}
          {/* 用户表单模态框（懒加载） */}
          <React.Suspense fallback={null}>
            <Modal
              title={editingUser ? intl.formatMessage({ id: 'pages.userManagement.editUser' }) : (editingUser === null ? "添加成员" : intl.formatMessage({ id: 'pages.userManagement.createUser' }))}
              open={formVisible}
              onCancel={() => {
                setFormVisible(false);
                setEditingUser(null);
              }}
              footer={null}
              destroyOnHidden
            >
              <UserForm
                user={editingUser}
                onSuccess={() => {
                  setFormVisible(false);
                  setEditingUser(null);
                  fetchData();
                  message.success(
                    editingUser
                      ? intl.formatMessage({ id: 'pages.message.updateSuccess' })
                      : intl.formatMessage({ id: 'pages.message.createSuccess' }),
                  );
                }}
                onCancel={() => {
                  setFormVisible(false);
                  setEditingUser(null);
                }}
              />
            </Modal>
          </React.Suspense>

          {/* 用户详情抽屉 */}
          <Drawer
            title={intl.formatMessage({ id: 'pages.userDetail.title' })}
            open={detailVisible}
            onClose={() => {
              setDetailVisible(false);
              setViewingUser(null);
            }}
            size={600}
            destroyOnClose
          >
            <React.Suspense fallback={<div style={{ textAlign: 'center', padding: '20px' }}><Spin /></div>}>
              {viewingUser && (
                <UserDetail
                  user={viewingUser}
                  onClose={() => {
                    setDetailVisible(false);
                    setViewingUser(null);
                  }}
                />
              )}
            </React.Suspense>
          </Drawer>
        </>
      )
      }

      {
        activeTab === 'requests' && (
          <React.Suspense fallback={null}>
            <JoinRequestsTable companyId={currentCompanyId} />
          </React.Suspense>
        )
      }
    </PageContainer >
  );
};

export default UserManagement;
