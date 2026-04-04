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
import { PageContainer } from '@/components';
import type { PagedResult } from '@/types/unified-api';
import { useIntl } from '@umijs/max';
import { Badge, Button, Modal, Space, Tag, Row, Col, Card, Grid, type TableColumnsType, Descriptions, Drawer, theme, Form, Input, Table } from 'antd';
import { useMessage } from '@/hooks/useMessage';
import useCommonStyles from '@/hooks/useCommonStyles';
import { useModal } from '@/hooks/useModal';
import SearchBar from '@/components/SearchBar';

const { useBreakpoint } = Grid;
import { type ChangeEvent, type FC, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { deleteRole, getAllRolesWithStats, getRoleStatistics } from '@/services/role/api';
import type { Role, RoleWithStats, RoleStatistics } from '@/services/role/types';
import RoleForm from './components/RoleForm';
import { StatCard } from '@/components';
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
  const message = useMessage();
  const modal = useModal();
  const { styles } = useCommonStyles();
  const { token } = theme.useToken();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const tableRef = useRef<HTMLDivElement>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentRole, setCurrentRole] = useState<RoleWithStats | undefined>();
  const [detailVisible, setDetailVisible] = useState(false);
  const [viewingRole, setViewingRole] = useState<RoleWithStats | null>(null);
  const [statistics, setStatistics] = useState<RoleStatistics | null>(null);
  const [data, setData] = useState<RoleWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });

  const searchParamsRef = useRef<PageParams>({
    page: 1,
    pageSize: 20,
    search: '',
  });

  const loadStatistics = useCallback(async () => {
    try {
      const response = await getRoleStatistics();
      if (response.success && response.data) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('加载角色统计失败:', error);
    }
  }, []);

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
          total: response.data.rowCount ?? 0,
        }));
      } else {
        setData([]);
        setPagination(prev => ({ ...prev, total: 0 }));
      }
    } catch (error) {
      setData([]);
      setPagination(prev => ({ ...prev, total: 0 }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

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
            loadStatistics();
            fetchData();
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
  }, [intl, loadStatistics, fetchData]);

  const handleRefresh = useCallback(() => {
    loadStatistics();
    fetchData();
  }, [loadStatistics, fetchData]);

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
    loadStatistics();
    fetchData();
  }, [loadStatistics, fetchData]);

  const handleViewDetail = useCallback((record: Role) => {
    setViewingRole(record);
    setDetailVisible(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailVisible(false);
    setViewingRole(null);
  }, []);

  useEffect(() => {
    if (!tableRef.current) return;

    let isResizing = false;
    let currentHeader: HTMLElement | null = null;
    let startX = 0;
    let startWidth = 0;

    const createHeaderMouseMoveHandler = (headerEl: HTMLElement) => {
      return (e: MouseEvent) => {
        const rect = headerEl.getBoundingClientRect();
        const edgeThreshold = 5;
        const isNearRightEdge = e.clientX >= rect.right - edgeThreshold;

        if (isNearRightEdge && !isResizing) {
          headerEl.style.cursor = 'col-resize';
        } else if (!isResizing) {
          headerEl.style.cursor = 'default';
        }
      };
    };

    const createHeaderMouseDownHandler = (headerEl: HTMLElement) => {
      return (e: MouseEvent) => {
        const rect = headerEl.getBoundingClientRect();
        const edgeThreshold = 5;
        const isNearRightEdge = e.clientX >= rect.right - edgeThreshold;

        if (!isNearRightEdge) return;

        e.preventDefault();
        e.stopPropagation();

        isResizing = true;
        currentHeader = headerEl;
        startX = e.clientX;
        startWidth = headerEl.offsetWidth;

        document.addEventListener('mousemove', handleGlobalMouseMove);
        document.addEventListener('mouseup', handleGlobalMouseUp);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
      };
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isResizing || !currentHeader) return;

      const diff = e.clientX - startX;
      const newWidth = Math.max(50, startWidth + diff);
      currentHeader.style.width = `${newWidth}px`;
      currentHeader.style.minWidth = `${newWidth}px`;
      currentHeader.style.maxWidth = `${newWidth}px`;
    };

    const handleGlobalMouseUp = () => {
      isResizing = false;
      currentHeader = null;
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    const initResizeHandlers = () => {
      const table = tableRef.current;
      if (!table) return;

      const thead = table.querySelector('thead');
      if (!thead) return;

      const headers = thead.querySelectorAll('th');

      for (const header of headers) {
        const headerEl = header as HTMLElement;
        headerEl.style.position = 'relative';
        headerEl.style.cursor = 'default';

        const mouseMoveHandler = createHeaderMouseMoveHandler(headerEl);
        const mouseDownHandler = createHeaderMouseDownHandler(headerEl);

        headerEl.addEventListener('mousemove', mouseMoveHandler);
        (headerEl as any)._mouseMoveHandler = mouseMoveHandler;

        headerEl.addEventListener('mousedown', mouseDownHandler);
        (headerEl as any)._mouseDownHandler = mouseDownHandler;
      }
    };

    let timer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
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
          for (const header of headers) {
            const headerEl = header as HTMLElement;
            if ((headerEl as any)._mouseMoveHandler) {
              headerEl.removeEventListener(
                'mousemove',
                (headerEl as any)._mouseMoveHandler,
              );
            }
            if ((headerEl as any)._mouseDownHandler) {
              headerEl.removeEventListener(
                'mousedown',
                (headerEl as any)._mouseDownHandler,
              );
            }
          }
        }
      }
    };
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
      />

      <div ref={tableRef}>
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
            pageSizeOptions: [10, 20, 50, 100],
            showSizeChanger: true,
            showQuickJumper: true,
          }}
        />
      </div>

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