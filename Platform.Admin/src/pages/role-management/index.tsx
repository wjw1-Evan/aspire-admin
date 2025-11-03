import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  Button,
  message,
  Space,
  Tag,
  Modal,
  Input,
  Badge,
} from 'antd';
import React, { useRef, useState, useEffect } from 'react';
import { useIntl } from '@umijs/max';
import {
  getAllRolesWithStats,
  deleteRole,
} from '@/services/role/api';
import type { Role } from '@/services/role/types';
import RoleForm from './components/RoleForm';

const RoleManagement: React.FC = () => {
  const intl = useIntl();
  const actionRef = useRef<ActionType>();
  const tableRef = useRef<HTMLDivElement>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentRole, setCurrentRole] = useState<Role | undefined>();

  /**
   * 加载角色数据（带统计信息）
   */
  const loadRoleData = async (_params: any, _sort?: Record<string, any>) => {
    try {
      const response = await getAllRolesWithStats();
      if (response.success && response.data) {
        return {
          data: response.data.roles,
          total: response.data.total,
          success: true,
        };
      }
      return {
        data: [],
        total: 0,
        success: false,
      };
    } catch (_error) {
      message.error('加载角色失败');
      return {
        data: [],
        total: 0,
        success: false,
      };
    }
  };

  /**
   * 删除角色（带删除原因）
   */
  const handleDelete = async (id: string, roleName: string) => {
    let deleteReason = '';
    Modal.confirm({
      title: intl.formatMessage({ id: 'pages.modal.confirmDeleteRole' }, { roleName }),
      content: (
        <div>
          <p>{intl.formatMessage({ id: 'pages.modal.deleteRoleWarning' })}</p>
          <p>{intl.formatMessage({ id: 'pages.modal.pleaseEnterReason' })}</p>
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
          const response = await deleteRole(id, deleteReason);
          if (response.success) {
            message.success(intl.formatMessage({ id: 'pages.message.deleteSuccess' }));
            actionRef.current?.reload();
          } else {
            message.error(response.errorMessage || intl.formatMessage({ id: 'pages.message.deleteFailed' }));
          }
        } catch (error: any) {
          message.error(error.message || intl.formatMessage({ id: 'pages.message.deleteFailed' }));
        }
      },
    });
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
   * 表格列定义
   */
  const columns: ProColumns<Role>[] = [
    {
      title: intl.formatMessage({ id: 'pages.table.roleName' }),
      dataIndex: 'name',
      key: 'name',
      render: (text, record: any) => (
        <Space>
          {text}
          {record.userCount > 0 && (
            <Badge
              count={record.userCount}
              style={{ backgroundColor: '#52c41a' }}
              title={intl.formatMessage(
                { id: 'pages.table.userCount' },
                { count: record.userCount },
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
          {record.isActive ? intl.formatMessage({ id: 'pages.table.activated' }) : intl.formatMessage({ id: 'pages.table.deactivated' })}
        </Tag>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.table.stats' }),
      key: 'stats',
      render: (_, record: any) => (
        <Space split="|">
          <span>{intl.formatMessage({ id: 'pages.table.user' })}: {record.userCount || 0}</span>
          <span>{intl.formatMessage({ id: 'pages.table.menu' })}: {record.menuCount || 0}</span>
        </Space>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.table.createdAt' }),
      dataIndex: 'createdAt',
      key: 'createdAt',
      valueType: 'dateTime',
    },
    {
      title: intl.formatMessage({ id: 'pages.table.actions' }),
      key: 'action',
      fixed: 'right',
      render: (_, record) => {
        return (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setCurrentRole(record);
                setModalVisible(true);
              }}
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
                  message.error('角色缺少唯一标识，无法删除');
                }
              }}
            >
              {intl.formatMessage({ id: 'pages.table.delete' })}
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <PageContainer
      header={{
        title: intl.formatMessage({ id: 'pages.roleManagement.title' }),
        subTitle: intl.formatMessage({ id: 'pages.roleManagement.subTitle' }),
      }}
    >
      <div ref={tableRef}>
        <ProTable<Role>
          actionRef={actionRef}
          rowKey="id"
          scroll={{ x: 'max-content' }}
          search={false}
        toolBarRender={() => [
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setCurrentRole(undefined);
              setModalVisible(true);
            }}
          >
            {intl.formatMessage({ id: 'pages.button.addRole' })}
          </Button>,
        ]}
        request={loadRoleData}
        columns={columns}
        />
      </div>

      <RoleForm
        visible={modalVisible}
        current={currentRole}
        onCancel={() => {
          setModalVisible(false);
          setCurrentRole(undefined);
        }}
        onSuccess={() => {
          setModalVisible(false);
          setCurrentRole(undefined);
          actionRef.current?.reload();
        }}
      />
    </PageContainer>
  );
};

export default RoleManagement;
