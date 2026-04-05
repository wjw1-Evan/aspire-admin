import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { PageContainer, StatCard } from '@/components';
import SearchBar from '@/components/SearchBar';
import { useIntl, useModel } from '@umijs/max';
import { App, Button, Tag, Space, Modal, Drawer, Row, Col, Badge, Card, Grid, Typography, Spin, Input, Switch, Table } from 'antd';
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
import { useTableResize } from '@/hooks/useTableResize';
import useCommonStyles from '@/hooks/useCommonStyles';
import { getAllRoles } from '@/services/role/api';
import type { Role } from '@/services/role/types';
import { getCurrentCompany } from '@/services/company';
import {
  getUserList,
  getUserStatistics,
  deleteUser,
  bulkAction,
  activateUser,
  deactivateUser,
  type AppUser,
  type UserStatisticsResponse,
} from '@/services/user/api';
import type { PageParams } from '@/types/page-params';
const UserForm = React.lazy(() => import('./components/UserForm'));
const UserDetail = React.lazy(() => import('./components/UserDetail'));
const JoinRequestsTable = React.lazy(() => import('./components/JoinRequestsTable'));

const { useBreakpoint } = Grid;
import { formatDateTime } from '@/utils/format';

const UserManagement: React.FC = () => {
  const intl = useIntl();
  const { message, modal } = App.useApp();
  const screens = useBreakpoint();
  const { styles } = useCommonStyles();
  const { initialState } = useModel('@@initialState');

  const tableRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState('members');
  const currentCompanyId = initialState?.currentUser?.currentCompanyId || '';
  const [selectedRows, setSelectedRows] = useState<AppUser[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [viewingUser, setViewingUser] = useState<AppUser | null>(null);
  const [statistics, setStatistics] = useState<UserStatisticsResponse | null>(null);
  const [roleMap, setRoleMap] = useState<Record<string, string>>({});
  const [currentCompany, setCurrentCompany] = useState<API.Company | null>(null);

  const searchParamsRef = useRef<PageParams>({
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const [data, setData] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });

  useEffect(() => {
    getCurrentCompany().then((res) => {
      if (res.success && res.data) {
        setCurrentCompany(res.data);
      }
    });

    getAllRoles().then((response) => {
      if (response.success && response.data) {
        const map: Record<string, string> = {};
        const roles = response.data.queryable || [];
        roles.forEach((role: Role) => {
          if (role.id) map[role.id] = role.name;
        });
        setRoleMap(map);
      }
    });
  }, []);

  const fetchStatistics = useCallback(async () => {
    try {
      const response = await getUserStatistics();
      if (response.success && response.data) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  }, []);

  const fetchData = useCallback(async () => {
    const currentParams = searchParamsRef.current;
    setLoading(true);
    try {
      const response = await getUserList(currentParams);

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
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAll = useCallback(() => {
    fetchData();
    fetchStatistics();
  }, [fetchData, fetchStatistics]);

  useEffect(() => {
    fetchStatistics();
    if (activeTab === 'members') {
      fetchData();
    }
  }, [fetchStatistics, activeTab, fetchData]);

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
            onChange={(e) => { deleteReason = e.target.value; }}
            maxLength={200}
          />
        </div>
      ),
      okText: intl.formatMessage({ id: 'pages.modal.okDelete' }),
      cancelText: intl.formatMessage({ id: 'pages.modal.cancel' }),
      okType: 'danger',
      onOk: async () => {
        const res = await deleteUser(userId, deleteReason);
        if (res.success) {
          message.success(intl.formatMessage({ id: 'pages.message.deleteSuccess' }));
          refreshAll();
        }
      },
    });
  }, [intl, modal, message, refreshAll]);

  const handleBulkAction = useCallback(async (action: string) => {
    if (selectedRows.length === 0) {
      message.warning(intl.formatMessage({ id: 'pages.message.pleaseSelect' }));
      return;
    }

    const userIds = selectedRows.map((user) => user.id);

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
              onChange={(e) => { deleteReason = e.target.value; }}
              maxLength={200}
            />
          </div>
        ),
        okText: intl.formatMessage({ id: 'pages.modal.okDelete' }),
        cancelText: intl.formatMessage({ id: 'pages.modal.cancel' }),
        okType: 'danger',
        onOk: async () => {
          const res = await bulkAction(userIds, action, deleteReason);
          if (res.success) {
            message.success(`批量删除成功`);
            setSelectedRows([]);
            refreshAll();
          }
        },
      });
      return;
    }

    const res = await bulkAction(userIds, action);
    if (res.success) {
      const actionText =
        {
          activate: intl.formatMessage({ id: 'pages.userManagement.action.activate' }),
          deactivate: intl.formatMessage({ id: 'pages.userManagement.action.deactivate' }),
        }[action] || intl.formatMessage({ id: 'pages.userManagement.action.operation' });

      message.success(intl.formatMessage({ id: 'pages.message.success' }));
      setSelectedRows([]);
      refreshAll();
    }
  }, [selectedRows, intl, modal, message, refreshAll]);

  const handleToggleStatus = useCallback(async (user: AppUser) => {
    const res = user.isActive 
      ? await deactivateUser(user.id)
      : await activateUser(user.id);
    
    if (res.success) {
      message.success(user.isActive 
        ? intl.formatMessage({ id: 'pages.userManagement.userDeactivated' })
        : intl.formatMessage({ id: 'pages.userManagement.userActivated' })
      );
      refreshAll();
    }
  }, [intl, message, refreshAll]);

  useTableResize(tableRef, activeTab === 'members');

  const columns: React.ComponentProps<typeof import('antd').Table<AppUser>>['columns'] = useMemo(() => [
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
      render: (_: unknown, record: AppUser) => (
        <Space>
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
      ),
    },
  ], [roleMap, intl, handleToggleStatus, currentCompany]);

  const handleRowSelectionChange = useCallback((_: React.Key[], selectedRows: AppUser[]) => {
    setSelectedRows(selectedRows);
  }, []);

  const handleFormSuccess = useCallback(() => {
    setFormVisible(false);
    setEditingUser(null);
    refreshAll();
    message.success(
      editingUser
        ? intl.formatMessage({ id: 'pages.message.updateSuccess' })
        : intl.formatMessage({ id: 'pages.message.createSuccess' }),
    );
  }, [editingUser, intl, message, refreshAll]);

  const statsConfig = [
    { title: intl.formatMessage({ id: 'pages.userManagement.statistics.totalUsers' }), value: statistics?.totalUsers ?? 0, icon: <TeamOutlined />, color: '#1890ff' },
    { title: intl.formatMessage({ id: 'pages.userManagement.statistics.activeUsers' }), value: statistics?.activeUsers ?? 0, icon: <CheckCircleOutlined />, color: '#52c41a' },
    { title: intl.formatMessage({ id: 'pages.userManagement.statistics.adminUsers' }), value: statistics?.adminUsers ?? 0, icon: <UserOutlined />, color: '#faad14' },
    { title: intl.formatMessage({ id: 'pages.userManagement.statistics.newUsersThisMonth' }), value: statistics?.newUsersThisMonth ?? 0, icon: <PlusOutlined />, color: '#1890ff' },
  ];

  return (
    <PageContainer
      title={
        <Space>
          <UserOutlined />
          {intl.formatMessage({ id: 'pages.userManagement.title' })}
        </Space>
      }
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
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            aria-label={intl.formatMessage({ id: 'pages.userManagement.refresh' })}
            onClick={refreshAll}
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
          {statistics && (
            <Card className={styles.card} style={{ marginBottom: 16 }}>
              <Row gutter={[12, 12]}>
                {statsConfig.map((stat, idx) => (
                  <Col xs={24} sm={12} md={6} key={idx}>
                    <StatCard title={stat.title} value={stat.value} icon={stat.icon} color={stat.color} />
                  </Col>
                ))}
              </Row>
            </Card>
          )}

          <SearchBar
            initialParams={searchParamsRef.current}
            onSearch={handleSearch}
            style={{ marginBottom: 16 }}
          />

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
              }}
            />
          </div>

          <React.Suspense fallback={null}>
            <Modal
              title={editingUser ? intl.formatMessage({ id: 'pages.userManagement.editUser' }) : "添加成员"}
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
                onSuccess={handleFormSuccess}
                onCancel={() => {
                  setFormVisible(false);
                  setEditingUser(null);
                }}
              />
            </Modal>
          </React.Suspense>

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
      )}

      {activeTab === 'requests' && (
        <React.Suspense fallback={null}>
          <JoinRequestsTable companyId={currentCompanyId} />
        </React.Suspense>
      )}
    </PageContainer >
  );
};

export default UserManagement;