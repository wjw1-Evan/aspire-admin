import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Tag, Space, message, Badge, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import {
  PlusOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { request } from '@umijs/max';
import { getAllRoles } from '@/services/role/api';
import type { AppUser, UserListRequest, UserStatisticsResponse } from './types';
import UserForm from './components/UserForm';
import UserDetail from './components/UserDetail';
import UserPermissionModal from './components/UserPermissionModal';
import UserStatistics from './components/UserStatistics';
import UserSearchForm from './components/UserSearchForm';
import UserTableActions from './components/UserTableActions';
import PermissionControl from '@/components/PermissionControl';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import BulkActionModal from '@/components/BulkActionModal';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import { useBulkAction } from '@/hooks/useBulkAction';

/**
 * 用户管理页面组件（优化版本）
 * 
 * 优化点：
 * 1. 拆分为子组件（UserStatistics, UserSearchForm, UserTableActions）
 * 2. 使用公共组件（DeleteConfirmModal, BulkActionModal）
 * 3. 使用自定义 Hooks（useDeleteConfirm, useBulkAction）
 * 4. 性能优化（useMemo, useCallback, React.memo）
 */
const UserManagement: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [selectedRows, setSelectedRows] = useState<AppUser[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [viewingUser, setViewingUser] = useState<AppUser | null>(null);
  const [configuringUser, setConfiguringUser] = useState<AppUser | null>(null);
  const [statistics, setStatistics] = useState<UserStatisticsResponse | null>(null);
  const [statisticsLoading, setStatisticsLoading] = useState(false);
  const [roleMap, setRoleMap] = useState<Record<string, string>>({});
  const [roleList, setRoleList] = useState<any[]>([]);
  const [searchParams, setSearchParams] = useState<UserListRequest>({
    Page: 1,
    PageSize: 10,
    SortBy: 'CreatedAt',
    SortOrder: 'desc',
  });

  // 使用删除确认 Hook
  const deleteConfirm = useDeleteConfirm({
    requireReason: true,
    onSuccess: () => {
      message.success('删除成功');
      actionRef.current?.reload();
      fetchStatistics();
    },
    onError: () => {
      message.error('删除失败');
    },
  });

  // 使用批量操作 Hook
  const bulkActionConfirm = useBulkAction({
    requireReason: true,
    onSuccess: () => {
      message.success('批量操作成功');
      setSelectedRows([]);
      actionRef.current?.reload();
      fetchStatistics();
    },
    onError: () => {
      message.error('批量操作失败');
    },
  });

  // 加载角色列表
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await getAllRoles();
        if (response.success && response.data) {
          setRoleList(response.data.roles);
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
    setStatisticsLoading(true);
    try {
      const response = await request<{ success: boolean; data: UserStatisticsResponse }>(
        '/api/user/statistics',
        {
          method: 'GET',
        },
      );
      setStatistics(response.data);
    } catch (error) {
      console.error('获取统计信息失败:', error);
    } finally {
      setStatisticsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  // 获取用户列表（优化：使用 useCallback）
  const fetchUsers = useCallback(
    async (params: any) => {
      const requestData: UserListRequest = {
        Page: params.current || searchParams.Page,
        PageSize: params.pageSize || searchParams.PageSize,
        Search: searchParams.Search,
        RoleIds: searchParams.RoleIds,
        IsActive: searchParams.IsActive,
        SortBy: params.sortBy || searchParams.SortBy,
        SortOrder: params.sortOrder || searchParams.SortOrder,
        StartDate: searchParams.StartDate,
        EndDate: searchParams.EndDate,
      };

      try {
        const response = await request<{ success: boolean; data: any }>('/api/user/list', {
          method: 'POST',
          data: requestData,
        });

        return {
          data: response.data.users || [],
          success: true,
          total: response.data.total || 0,
        };
      } catch (error) {
        console.error('获取用户列表失败:', error);
        message.error('获取用户列表失败');
        return {
          data: [],
          success: false,
          total: 0,
        };
      }
    },
    [searchParams],
  );

  // 处理搜索（优化：使用 useCallback）
  const handleSearch = useCallback(
    (values: any) => {
      // 处理角色 ID 数组
      let roleIds: string[] | undefined;
      if (values.roleIds) {
        roleIds = Array.isArray(values.roleIds) ? values.roleIds : [values.roleIds];
      }

      const newSearchParams: UserListRequest = {
        Page: 1,
        PageSize: searchParams.PageSize,
        Search: values.search,
        RoleIds: roleIds,
        IsActive: values.isActive,
        SortBy: searchParams.SortBy,
        SortOrder: searchParams.SortOrder,
        StartDate: values.dateRange?.[0]?.format('YYYY-MM-DD'),
        EndDate: values.dateRange?.[1]?.format('YYYY-MM-DD'),
      };
      setSearchParams(newSearchParams);
      actionRef.current?.reload();
    },
    [searchParams.PageSize, searchParams.SortBy, searchParams.SortOrder],
  );

  // 重置搜索（优化：使用 useCallback）
  const handleReset = useCallback(() => {
    const resetParams: UserListRequest = {
      Page: 1,
      PageSize: searchParams.PageSize,
      SortBy: 'CreatedAt',
      SortOrder: 'desc',
    };
    setSearchParams(resetParams);
    actionRef.current?.reload();
  }, [searchParams.PageSize]);

  // 删除用户（使用新的 Hook）
  const handleDelete = useCallback(
    (user: AppUser) => {
      deleteConfirm.showConfirm({
        id: user.id,
        name: user.username,
        description: '删除后将无法恢复，请谨慎操作',
      });
    },
    [deleteConfirm],
  );

  // 批量删除
  const handleBulkDelete = useCallback(() => {
    if (selectedRows.length === 0) {
      message.warning('请选择要删除的用户');
      return;
    }

    bulkActionConfirm.showConfirm({
      actionType: 'delete',
      selectedCount: selectedRows.length,
      description: '批量删除后将无法恢复，请谨慎操作',
    });
  }, [selectedRows.length, bulkActionConfirm]);

  // 批量激活/停用
  const handleBulkAction = useCallback(
    (action: 'activate' | 'deactivate') => {
      if (selectedRows.length === 0) {
        message.warning('请选择要操作的用户');
        return;
      }

      bulkActionConfirm.showConfirm({
        actionType: action,
        selectedCount: selectedRows.length,
      });
    },
    [selectedRows.length, bulkActionConfirm],
  );

  // 表格警告渲染（优化：使用 useCallback）
  const renderTableAlert = useCallback(
    ({ selectedRowKeys }: any) => (
      <Space size={24}>
        <span>
          已选择 <span style={{ fontWeight: 600 }}>{selectedRowKeys.length}</span> 项
        </span>
      </Space>
    ),
    [],
  );

  // 表格列定义（优化：使用 useMemo）
  const columns: ProColumns<AppUser>[] = useMemo(
    () => [
      {
        title: '用户名',
        dataIndex: 'username',
        key: 'username',
        ellipsis: true,
        copyable: true,
      },
      {
        title: '邮箱',
        dataIndex: 'email',
        key: 'email',
        ellipsis: true,
        copyable: true,
      },
      {
        title: '角色',
        dataIndex: 'roleIds',
        key: 'roleIds',
        render: (_, record) => {
          if (!record.roleIds || record.roleIds.length === 0) {
            return <Tag color="default">未分配</Tag>;
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
        title: '状态',
        dataIndex: 'isActive',
        key: 'isActive',
        render: (_, record) => (
          <Badge
            status={record.isActive ? 'success' : 'error'}
            text={record.isActive ? '启用' : '禁用'}
          />
        ),
      },
      {
        title: '操作',
        key: 'action',
        fixed: 'right',
        width: 150,
        render: (_, record) => (
          <UserTableActions
            record={record}
            onEdit={(user) => {
              setEditingUser(user);
              setFormVisible(true);
            }}
            onDelete={handleDelete}
            onPermission={(user) => {
              setConfiguringUser(user);
              setPermissionModalVisible(true);
            }}
            onViewDetail={(user) => {
              setViewingUser(user);
              setDetailVisible(true);
            }}
          />
        ),
      },
    ],
    [roleMap, handleDelete],
  );

  // 批量操作菜单项（优化：使用 useMemo）
  const bulkActionMenuItems: MenuProps['items'] = useMemo(
    () => [
      {
        key: 'activate',
        label: '批量启用',
        onClick: () => handleBulkAction('activate'),
      },
      {
        key: 'deactivate',
        label: '批量停用',
        onClick: () => handleBulkAction('deactivate'),
      },
      {
        key: 'delete',
        label: '批量删除',
        danger: true,
        onClick: handleBulkDelete,
      },
    ],
    [handleBulkAction, handleBulkDelete],
  );

  // 处理表单提交
  const handleFormSubmit = useCallback(
    async (values: any) => {
      try {
        if (editingUser) {
          await request(`/api/user/${editingUser.id}`, {
            method: 'PUT',
            data: values,
          });
          message.success('更新成功');
        } else {
          await request('/api/user/management', {
            method: 'POST',
            data: values,
          });
          message.success('创建成功');
        }
        setFormVisible(false);
        setEditingUser(null);
        actionRef.current?.reload();
        fetchStatistics();
      } catch (error) {
        console.error('保存用户失败:', error);
        message.error('保存失败');
      }
    },
    [editingUser, fetchStatistics],
  );

  return (
    <PageContainer>
      {/* 统计卡片 */}
      <UserStatistics statistics={statistics} loading={statisticsLoading} />

      {/* 搜索表单 */}
      <UserSearchForm
        roles={roleList}
        onSearch={handleSearch}
        onReset={handleReset}
        loading={false}
      />

      {/* 用户表格 */}
      <ProTable<AppUser>
        headerTitle="用户列表"
        actionRef={actionRef}
        rowKey="id"
        search={false}
        request={fetchUsers}
        columns={columns}
        rowSelection={{
          selectedRowKeys: selectedRows.map((row) => row.id || ''),
          onChange: (_, rows) => setSelectedRows(rows),
        }}
        toolBarRender={() => [
          <PermissionControl key="create" resource="user" action="create">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingUser(null);
                setFormVisible(true);
              }}
            >
              新建用户
            </Button>
          </PermissionControl>,
          <PermissionControl key="bulk" resource="user" action="update">
            <Dropdown
              menu={{ items: bulkActionMenuItems }}
              disabled={selectedRows.length === 0}
            >
              <Button>
                批量操作 <DownOutlined />
              </Button>
            </Dropdown>
          </PermissionControl>,
        ]}
        tableAlertRender={renderTableAlert}
      />

      {/* 用户表单对话框 */}
      <UserForm
        visible={formVisible}
        user={editingUser}
        roleList={roleList}
        onSubmit={handleFormSubmit}
        onCancel={() => {
          setFormVisible(false);
          setEditingUser(null);
        }}
      />

      {/* 用户详情抽屉 */}
      <UserDetail
        visible={detailVisible}
        user={viewingUser}
        roleMap={roleMap}
        onClose={() => {
          setDetailVisible(false);
          setViewingUser(null);
        }}
      />

      {/* 用户权限配置对话框 */}
      <UserPermissionModal
        visible={permissionModalVisible}
        user={configuringUser}
        onClose={() => {
          setPermissionModalVisible(false);
          setConfiguringUser(null);
        }}
      />

      {/* 删除确认对话框 */}
      <DeleteConfirmModal
        visible={deleteConfirm.state.visible}
        itemName={deleteConfirm.state.currentItem?.name}
        description={deleteConfirm.state.currentItem?.description}
        requireReason
        onConfirm={async (reason) => {
          await deleteConfirm.handleConfirm(async () => {
            await request(`/api/user/${deleteConfirm.state.currentItem!.id}`, {
              method: 'DELETE',
              params: { reason },
            });
          });
        }}
        onCancel={deleteConfirm.hideConfirm}
      />

      {/* 批量操作确认对话框 */}
      <BulkActionModal
        visible={bulkActionConfirm.state.visible}
        actionType={bulkActionConfirm.state.actionType}
        selectedCount={bulkActionConfirm.state.selectedCount}
        description={bulkActionConfirm.state.description}
        requireReason={bulkActionConfirm.state.actionType === 'delete'}
        onConfirm={async (reason) => {
          await bulkActionConfirm.handleConfirm(async () => {
            const action = bulkActionConfirm.state.actionType;
            await request('/api/user/bulk-action', {
              method: 'POST',
              data: {
                UserIds: selectedRows.map((user) => user.id),
                Action: action,
                Reason: reason,
              },
            });
          });
        }}
        onCancel={bulkActionConfirm.hideConfirm}
      />
    </PageContainer>
  );
};

export default UserManagement;



