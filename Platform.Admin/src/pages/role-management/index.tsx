import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  TeamOutlined,
  UserOutlined,
  MenuOutlined,
  ReloadOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { PageContainer, StatCard } from '@/components';
import type { PagedResult } from '@/types/unified-api';
import { useIntl } from '@umijs/max';
import { Badge, Button, Space, Tag, Row, Col, Card, Grid, type TableColumnsType, Descriptions, Drawer, Form, Input, Table, App } from 'antd';
import useCommonStyles from '@/hooks/useCommonStyles';
import SearchBar from '@/components/SearchBar';

const { useBreakpoint } = Grid;
import { type ChangeEvent, type FC, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { deleteRole, getAllRolesWithStats, getRoleStatistics } from '@/services/role/api';
import type { Role, RoleWithStats, RoleStatistics } from '@/services/role/types';
import RoleForm from './components/RoleForm';
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

const RoleManagement: FC = () => {
  const intl = useIntl();
  const { message, modal } = App.useApp();
  const { styles } = useCommonStyles();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [modalVisible, setModalVisible] = useState(false);
  const [currentRole, setCurrentRole] = useState<RoleWithStats | undefined>();
  const [detailVisible, setDetailVisible] = useState(false);
  const [viewingRole, setViewingRole] = useState<RoleWithStats | null>(null);
  const [statistics, setStatistics] = useState<RoleStatistics | null>(null);
  const [data, setData] = useState<RoleWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });

  const searchParamsRef = useRef<PageParams>({
    search: '',
  });

  const fetchData = useCallback(async () => {
    const currentParams = searchParamsRef.current;

    setLoading(true);
    try {
      const response = await getAllRolesWithStats({
        params: {
          page: currentParams.page,
          pageSize: currentParams.pageSize,
          keyword: currentParams.search,
        },
      });
      if (response.success && response.data) {
        const roles = (response.data as PagedResult<RoleWithStats>).queryable || [];
        setData(roles);
        setPagination(prev => ({
          ...prev,
          page: currentParams.page ?? prev.page,
          pageSize: currentParams.pageSize ?? prev.pageSize,
          total: response.data!.rowCount ?? 0,
        }));
      } else {
        setData([]);
        setPagination(prev => ({ ...prev, total: 0 }));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStatistics = useCallback(() => {
    getRoleStatistics().then((res) => {
      if (res.success && res.data) setStatistics(res.data);
    });
  }, []);

  const refreshAll = useCallback(() => {
    fetchData();
    fetchStatistics();
  }, [fetchData, fetchStatistics]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

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

  const handleDelete = useCallback(async (id: string, roleName: string) => {
    let deleteReason = '';
    modal.confirm({
      title: intl.formatMessage(
        { id: 'pages.modal.confirmDeleteRole' },
        { roleName },
      ),
      content: (
        <div>
          <p>{intl.formatMessage({ id: 'pages.modal.deleteRoleWarning' })}</p>
          <p>{intl.formatMessage({ id: 'pages.modal.pleaseEnterReason' })}</p>
          <Input.TextArea
            rows={3}
            placeholder={intl.formatMessage({
              id: 'pages.modal.pleaseEnterReasonOptional',
            })}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
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
          const response = await deleteRole(id, deleteReason);
          if (response.success) {
            message.success(
              intl.formatMessage({ id: 'pages.message.deleteSuccess' }),
            );
            refreshAll();
          } else {
            throw new Error(
              response.message ||
              intl.formatMessage({ id: 'pages.message.deleteFailed' }),
            );
          }
        } catch (error) {
          throw error;
        }
      },
    });
  }, [intl, modal, message, refreshAll]);

  const handleRefresh = useCallback(() => {
    refreshAll();
  }, [refreshAll]);

  const handleCreateRole = useCallback(() => {
    setCurrentRole(undefined);
    setModalVisible(true);
  }, []);

  const handleEditRole = useCallback((record: Role) => {
    setCurrentRole(record);
    setModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setCurrentRole(undefined);
  }, []);

  const handleFormSuccess = useCallback(() => {
    setModalVisible(false);
    setCurrentRole(undefined);
    refreshAll();
  }, [refreshAll]);

  const handleViewDetail = useCallback((record: Role) => {
    setViewingRole(record);
    setDetailVisible(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailVisible(false);
    setViewingRole(null);
  }, []);

  const columns: TableColumnsType<RoleWithStats> = useMemo(() => [
    {
      title: intl.formatMessage({ id: 'pages.table.roleName' }),
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (text: string, record: RoleWithStats) => (
        <Space>
          <a
            onClick={() => handleViewDetail(record)}
            style={{ cursor: 'pointer' }}
          >
            {text}
          </a>
          {(record.userCount ?? 0) > 0 && (
            <Badge
              count={record.userCount ?? 0}
              style={{ backgroundColor: '#52c41a' }}
              title={intl.formatMessage(
                { id: 'pages.table.userCount' },
                { count: record.userCount ?? 0 },
              )}
            />
          )}
        </Space>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.table.description' }),
      dataIndex: 'description',
      key: 'description',
      sorter: true,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.table.status' }),
      dataIndex: 'isActive',
      key: 'isActive',
      sorter: true,
      render: (_, record) => (
        <Tag color={record.isActive ? 'success' : 'default'}>
          {record.isActive
            ? intl.formatMessage({ id: 'pages.table.activated' })
            : intl.formatMessage({ id: 'pages.table.deactivated' })}
        </Tag>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.table.stats' }),
      key: 'stats',
      render: (_, record: RoleWithStats) => (
        <Space separator="|">
          <span>
            {intl.formatMessage({ id: 'pages.table.user' })}:{' '}
            {record.userCount || 0}
          </span>
          <span>
            {intl.formatMessage({ id: 'pages.table.menu' })}:{' '}
            {record.menuCount || 0}
          </span>
        </Space>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.table.createdAt' }),
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: true,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: intl.formatMessage({ id: 'pages.table.actions' }),
      key: 'action',
      fixed: 'right',
      width: 150,
      render: (_, record: RoleWithStats) => {
        return (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditRole(record)}
            >
              {intl.formatMessage({ id: 'pages.table.edit' })}
            </Button>
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                if (record.id) {
                  handleDelete(record.id, record.name);
                } else {
                  throw new Error('角色缺少唯一标识，无法删除');
                }
              }}
            >
              {intl.formatMessage({ id: 'pages.table.delete' })}
            </Button>
          </Space>
        );
      },
    },
  ], [intl, handleEditRole, handleDelete, handleViewDetail]);

  return (
    <PageContainer
      title={
        <Space>
          <SafetyOutlined />
          {intl.formatMessage({ id: 'pages.roleManagement.title' })}
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
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateRole}
          >
            {intl.formatMessage({ id: 'pages.button.addRole' })}
          </Button>
        </Space>
      }
    >
      {statistics && (
        <Card className={styles.card} style={{ marginBottom: 16 }}>
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.roleManagement.statistics.totalRoles' })}
                value={statistics.totalRoles}
                icon={<TeamOutlined />}
                color="#1890ff"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.roleManagement.statistics.activeRoles' })}
                value={statistics.activeRoles}
                icon={<TeamOutlined />}
                color="#52c41a"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.roleManagement.statistics.totalUsers' })}
                value={statistics.totalUsers}
                icon={<UserOutlined />}
                color="#faad14"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.roleManagement.statistics.totalMenus' })}
                value={statistics.totalMenus}
                icon={<MenuOutlined />}
                color="#722ed1"
              />
            </Col>
          </Row>
        </Card>
      )}

      <SearchBar
        initialParams={searchParamsRef.current}
        onSearch={handleSearch}
        showResetButton={false}
        style={{ marginBottom: 16 }}
      />

      <Table<RoleWithStats>
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

      {modalVisible && (
        <RoleForm
          open={modalVisible}
          current={currentRole}
          onCancel={handleCloseModal}
          onSuccess={handleFormSuccess}
        />
      )}

      <Drawer
        title={
          viewingRole
            ? `${intl.formatMessage({ id: 'pages.roleManagement.title' })} - ${viewingRole.name}`
            : intl.formatMessage({ id: 'pages.roleManagement.title' })
        }
        open={detailVisible}
        onClose={handleCloseDetail}
        size={isMobile ? 'large' : 600}
      >
        {viewingRole && (
          <div>
            <Card
              title={intl.formatMessage({ id: 'pages.userDetail.basicInfo' })}
              className={styles.card}
              style={{ marginBottom: 16 }}
            >
              <Descriptions column={1} size="small">
                <Descriptions.Item
                  label={intl.formatMessage({ id: 'pages.table.roleName' })}
                >
                  {viewingRole.name}
                </Descriptions.Item>
                <Descriptions.Item
                  label={intl.formatMessage({ id: 'pages.table.description' })}
                >
                  {viewingRole.description || '-'}
                </Descriptions.Item>
                <Descriptions.Item
                  label={intl.formatMessage({ id: 'pages.table.status' })}
                >
                  <Tag color={viewingRole.isActive ? 'success' : 'default'}>
                    {viewingRole.isActive
                      ? intl.formatMessage({ id: 'pages.table.activated' })
                      : intl.formatMessage({ id: 'pages.table.deactivated' })}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item
                  label={intl.formatMessage({ id: 'pages.table.stats' })}
                >
                  <Space>
                    <span>
                      {intl.formatMessage({ id: 'pages.table.user' })}:{' '}
                      {viewingRole.userCount || 0}
                    </span>
                    <span style={{ marginLeft: 16 }}>
                      {intl.formatMessage({ id: 'pages.table.menu' })}:{' '}
                      {viewingRole.menuCount || 0}
                    </span>
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item
                  label={intl.formatMessage({ id: 'pages.table.createdAt' })}
                >
                  {formatDateTime(viewingRole.createdAt)}
                </Descriptions.Item>
                {viewingRole.updatedAt && (
                  <Descriptions.Item
                    label={intl.formatMessage({ id: 'pages.userDetail.updatedAt' })}
                  >
                    {formatDateTime(viewingRole.updatedAt)}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          </div>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default RoleManagement;