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
import DataTable from '@/components/DataTable';
import type { ActionType } from '@/types/pro-components';
import { useIntl } from '@umijs/max';
import { Badge, Button, Input, Modal, message, Space, Tag, Row, Col, Card, Grid, type TableColumnsType } from 'antd';

const { useBreakpoint } = Grid;
import { type ChangeEvent, type FC, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { deleteRole, getAllRolesWithStats } from '@/services/role/api';
import type { Role } from '@/services/role/types';
import RoleForm from './components/RoleForm';
import { StatCard } from '@/components';

const RoleManagement: FC = () => {
  const intl = useIntl();
  const screens = useBreakpoint();
  const isMobile = !screens.md; // md 以下为移动端
  const actionRef = useRef<ActionType>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentRole, setCurrentRole] = useState<Role | undefined>();
  const [statistics, setStatistics] = useState<{
    totalRoles: number;
    activeRoles: number;
    totalUsers: number;
    totalMenus: number;
  } | null>(null);

  /**
   * 加载角色数据（带统计信息）- 使用 useCallback 避免死循环
   */
  const loadRoleData = useCallback(async (_params: any, _sort?: Record<string, any>) => {
    try {
      const response = await getAllRolesWithStats();
      if (response.success && response.data) {
        const roles = response.data.roles || [];

        // 计算统计信息，统一用于顶部统计卡片
        const totalRoles = roles.length;
        const activeRoles = roles.filter((r: any) => r.isActive).length;
        const totalUsers = roles.reduce(
          (sum: number, r: any) => sum + (r.userCount || 0),
          0,
        );
        const totalMenus = roles.reduce(
          (sum: number, r: any) => sum + (r.menuCount || 0),
          0,
        );

        setStatistics({
          totalRoles,
          activeRoles,
          totalUsers,
          totalMenus,
        });

        return {
          data: roles,
          total: response.data.total,
          success: true,
        };
      }
      return {
        data: [],
        total: 0,
        success: false,
      };
    } catch (error) {
      // 错误由全局错误处理统一处理
      // 这里返回空数据，避免表格显示错误
      return {
        data: [],
        total: 0,
        success: false,
      };
    }
  }, []); // 空依赖数组，因为函数内部只调用 API 和 setState

  /**
   * 删除角色（带删除原因）
   */
  const handleDelete = useCallback(async (id: string, roleName: string) => {
    let deleteReason = '';
    Modal.confirm({
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
            if (actionRef.current?.reload) {
              actionRef.current.reload();
            }
          } else {
            // 失败时抛出错误，由全局错误处理统一处理
            throw new Error(
              response.errorMessage ||
                intl.formatMessage({ id: 'pages.message.deleteFailed' }),
            );
          }
        } catch (error) {
          // 错误已被全局错误处理捕获并显示
          // 重新抛出以确保 Modal.confirm 在错误时不关闭（Ant Design 默认行为）
          throw error;
        }
      },
    });
  }, [intl]);

  // 刷新处理
  const handleRefresh = useCallback(() => {
    if (actionRef.current?.reload) {
      actionRef.current.reload();
    }
  }, []);

  // 打开创建角色表单
  const handleCreateRole = useCallback(() => {
    setCurrentRole(undefined);
    setModalVisible(true);
  }, []);

  // 打开编辑角色表单
  const handleEditRole = useCallback((record: Role) => {
    setCurrentRole(record);
    setModalVisible(true);
  }, []);

  // 关闭表单
  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setCurrentRole(undefined);
  }, []);

  // 表单成功处理
  const handleFormSuccess = useCallback(() => {
    setModalVisible(false);
    setCurrentRole(undefined);
    if (actionRef.current?.reload) {
      actionRef.current.reload();
    }
  }, []);

  /**
   * 初始化列宽调整功能
   */
  useEffect(() => {
    if (!tableRef.current) return;

    // 共享状态
    let isResizing = false;
    let currentHeader: HTMLElement | null = null;
    let startX = 0;
    let startWidth = 0;

    // 创建表头鼠标移动处理函数（显示调整光标）
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

    // 创建表头鼠标按下处理函数（开始调整）
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

    // 全局鼠标移动处理（调整列宽）
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isResizing || !currentHeader) return;

      const diff = e.clientX - startX;
      const newWidth = Math.max(50, startWidth + diff); // 最小宽度 50px
      currentHeader.style.width = `${newWidth}px`;
      currentHeader.style.minWidth = `${newWidth}px`;
      currentHeader.style.maxWidth = `${newWidth}px`;
    };

    // 全局鼠标释放处理
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

    // 延迟初始化，确保表格已渲染
    let timer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
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

  /**
   * 表格列定义（使用 useMemo 避免每次渲染都重新创建）
   */
  const columns: TableColumnsType<Role> = useMemo(() => [
    {
      title: intl.formatMessage({ id: 'pages.table.roleName' }),
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Role) => (
        <Space>
          {text}
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
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.table.status' }),
      dataIndex: 'isActive',
      key: 'isActive',
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
      render: (_, record: any) => (
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
      render: (value: string) => value ? new Date(value).toLocaleString() : '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.table.actions' }),
      key: 'action',
      fixed: 'right',
      width: 150,
      render: (_, record) => {
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
                  // 数据校验失败，抛出错误
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
  ], [intl, handleEditRole, handleDelete]);

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
      {/* 角色统计信息：统一使用 StatCard 风格 */}
      {statistics && (
        <Card style={{ marginBottom: 16, borderRadius: 12 }}>
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

      <div ref={tableRef}>
        <DataTable<Role>
          actionRef={actionRef}
          rowKey="id"
          scroll={{ x: 'max-content' }}
          search={false}
          request={loadRoleData}
          columns={columns}
          pagination={{
            pageSize: 20,
            pageSizeOptions: [10, 20, 50, 100],
            showSizeChanger: true,
            showQuickJumper: true,
          }}
        />
      </div>

      {modalVisible && (
        <RoleForm
          visible={modalVisible}
          current={currentRole}
          onCancel={handleCloseModal}
          onSuccess={handleFormSuccess}
        />
      )}
    </PageContainer>
  );
};

export default RoleManagement;
