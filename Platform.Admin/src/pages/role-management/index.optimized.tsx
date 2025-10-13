import React, { useRef, useState, useCallback, useMemo } from 'react';
import { PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined, KeyOutlined } from '@ant-design/icons';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, message, Space, Tag, Badge } from 'antd';
import { getAllRolesWithStats } from '@/services/role/api';
import type { Role } from '@/services/role/types';
import RoleForm from './components/RoleForm';
import MenuPermissionModal from './components/MenuPermissionModal';
import PermissionConfigModal from './components/PermissionConfigModal';
import PermissionControl from '@/components/PermissionControl';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import { deleteRole } from '@/services/role/api';

/**
 * 角色管理页面组件（优化版本）
 * 
 * 优化点：
 * 1. 使用 DeleteConfirmModal 和 useDeleteConfirm
 * 2. 使用 useCallback 和 useMemo 优化性能
 * 3. 代码结构更清晰
 */
const RoleManagement: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [modalVisible, setModalVisible] = useState(false);
  const [menuPermissionModalVisible, setMenuPermissionModalVisible] = useState(false);
  const [operationPermissionModalVisible, setOperationPermissionModalVisible] = useState(false);
  const [currentRole, setCurrentRole] = useState<Role | undefined>();

  // 使用删除确认 Hook
  const deleteConfirm = useDeleteConfirm({
    requireReason: true,
    onSuccess: () => {
      message.success('删除成功');
      actionRef.current?.reload();
    },
    onError: (error: any) => {
      message.error(error.message || '删除失败');
    },
  });

  /**
   * 加载角色数据（带统计信息）
   */
  const loadRoleData = useCallback(async () => {
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
    } catch (error) {
      message.error('加载角色失败');
      return {
        data: [],
        total: 0,
        success: false,
      };
    }
  }, []);

  /**
   * 删除角色
   */
  const handleDelete = useCallback(
    (role: Role) => {
      deleteConfirm.showConfirm({
        id: role.id,
        name: role.name,
        description: '删除角色将自动从所有用户的角色列表中移除此角色',
      });
    },
    [deleteConfirm],
  );

  /**
   * 打开编辑对话框
   */
  const handleEdit = useCallback((role: Role) => {
    setCurrentRole(role);
    setModalVisible(true);
  }, []);

  /**
   * 配置菜单权限
   */
  const handleMenuPermission = useCallback((role: Role) => {
    setCurrentRole(role);
    setMenuPermissionModalVisible(true);
  }, []);

  /**
   * 配置操作权限
   */
  const handleOperationPermission = useCallback((role: Role) => {
    setCurrentRole(role);
    setOperationPermissionModalVisible(true);
  }, []);

  /**
   * 表格列定义（优化：使用 useMemo）
   */
  const columns: ProColumns<Role>[] = useMemo(
    () => [
      {
        title: '角色名称',
        dataIndex: 'name',
        key: 'name',
        render: (text, record: any) => (
          <Space>
            {text}
            {record.userCount > 0 && (
              <Badge
                count={record.userCount}
                style={{ backgroundColor: '#52c41a' }}
                title={`${record.userCount} 个用户`}
              />
            )}
          </Space>
        ),
      },
      {
        title: '描述',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
      },
      {
        title: '用户数',
        dataIndex: 'userCount',
        key: 'userCount',
        width: 100,
        align: 'center',
        render: (count: number) => <Tag color="blue">{count || 0}</Tag>,
      },
      {
        title: '菜单数',
        dataIndex: 'menuCount',
        key: 'menuCount',
        width: 100,
        align: 'center',
        render: (count: number) => <Tag color="green">{count || 0}</Tag>,
      },
      {
        title: '权限数',
        dataIndex: 'permissionCount',
        key: 'permissionCount',
        width: 100,
        align: 'center',
        render: (count: number) => <Tag color="orange">{count || 0}</Tag>,
      },
      {
        title: '状态',
        dataIndex: 'isActive',
        key: 'isActive',
        width: 100,
        render: (isActive: boolean) => (
          <Tag color={isActive ? 'success' : 'default'}>
            {isActive ? '启用' : '禁用'}
          </Tag>
        ),
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        valueType: 'dateTime',
        width: 180,
      },
      {
        title: '操作',
        key: 'action',
        fixed: 'right',
        width: 220,
        render: (_, record) => (
          <Space size="small">
            <PermissionControl resource="role" action="update">
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              >
                编辑
              </Button>
            </PermissionControl>

            <PermissionControl resource="role" action="update">
              <Button
                type="link"
                size="small"
                icon={<SettingOutlined />}
                onClick={() => handleMenuPermission(record)}
              >
                菜单
              </Button>
            </PermissionControl>

            <PermissionControl resource="role" action="update">
              <Button
                type="link"
                size="small"
                icon={<KeyOutlined />}
                onClick={() => handleOperationPermission(record)}
              >
                权限
              </Button>
            </PermissionControl>

            <PermissionControl resource="role" action="delete">
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(record)}
              >
                删除
              </Button>
            </PermissionControl>
          </Space>
        ),
      },
    ],
    [handleEdit, handleMenuPermission, handleOperationPermission, handleDelete],
  );

  return (
    <PageContainer>
      <ProTable<Role>
        headerTitle="角色列表"
        actionRef={actionRef}
        rowKey="id"
        search={false}
        request={loadRoleData}
        columns={columns}
        toolBarRender={() => [
          <PermissionControl key="create" resource="role" action="create">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setCurrentRole(undefined);
                setModalVisible(true);
              }}
            >
              新建角色
            </Button>
          </PermissionControl>,
        ]}
      />

      {/* 角色表单对话框 */}
      <RoleForm
        visible={modalVisible}
        role={currentRole}
        onSubmit={async () => {
          setModalVisible(false);
          setCurrentRole(undefined);
          actionRef.current?.reload();
        }}
        onCancel={() => {
          setModalVisible(false);
          setCurrentRole(undefined);
        }}
      />

      {/* 菜单权限配置 */}
      <MenuPermissionModal
        visible={menuPermissionModalVisible}
        role={currentRole}
        onClose={() => {
          setMenuPermissionModalVisible(false);
          setCurrentRole(undefined);
          actionRef.current?.reload();
        }}
      />

      {/* 操作权限配置 */}
      <PermissionConfigModal
        visible={operationPermissionModalVisible}
        role={currentRole}
        onClose={() => {
          setOperationPermissionModalVisible(false);
          setCurrentRole(undefined);
          actionRef.current?.reload();
        }}
      />

      {/* 删除确认对话框 */}
      <DeleteConfirmModal
        visible={deleteConfirm.state.visible}
        itemName={deleteConfirm.state.currentItem?.name}
        description={deleteConfirm.state.currentItem?.description}
        requireReason
        reasonPlaceholder="请输入删除原因（选填，最多200字）"
        onConfirm={async (reason) => {
          await deleteConfirm.handleConfirm(async () => {
            const response = await deleteRole(deleteConfirm.state.currentItem!.id!, reason);
            if (!response.success) {
              throw new Error(response.errorMessage || '删除失败');
            }
          });
        }}
        onCancel={deleteConfirm.hideConfirm}
      />
    </PageContainer>
  );
};

export default RoleManagement;


