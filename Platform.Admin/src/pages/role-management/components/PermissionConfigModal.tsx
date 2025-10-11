import { Checkbox, message, Modal, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useEffect, useState } from 'react';
import { getPermissionsGrouped, getRolePermissions, assignPermissionsToRole } from '@/services/permission';
import type { Permission, PermissionGroup } from '@/services/permission/types';

interface PermissionConfigModalProps {
  visible: boolean;
  role: any;
  onCancel: () => void;
  onSuccess: () => void;
}

interface PermissionRow {
  resourceName: string;
  resourceTitle: string;
  permissions: Permission[];
  selectedIds: string[];
}

const PermissionConfigModal: React.FC<PermissionConfigModalProps> = ({
  visible,
  role,
  onCancel,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [permissionRows, setPermissionRows] = useState<PermissionRow[]>([]);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);

  /**
   * 加载数据
   */
  useEffect(() => {
    if (visible && role) {
      loadData();
    }
  }, [visible, role]);

  /**
   * 加载权限数据和角色已有权限
   */
  const loadData = async () => {
    if (!role) return;

    setLoading(true);
    try {
      // 加载所有权限（按资源分组）
      const groupsResponse = await getPermissionsGrouped();
      if (!groupsResponse.success || !groupsResponse.data) {
        message.error('加载权限列表失败');
        return;
      }

      // 加载角色已有权限
      const rolePermsResponse = await getRolePermissions(role.id!);
      const rolePermissionIds = rolePermsResponse.success && rolePermsResponse.data
        ? rolePermsResponse.data.map((p: Permission) => p.id!)
        : [];

      // 构建表格数据
      const rows: PermissionRow[] = groupsResponse.data.map((group: PermissionGroup) => ({
        resourceName: group.resourceName,
        resourceTitle: group.resourceTitle,
        permissions: group.permissions,
        selectedIds: rolePermissionIds.filter((id: string) =>
          group.permissions.some((p: Permission) => p.id === id),
        ),
      }));

      setPermissionRows(rows);
      setSelectedPermissionIds(rolePermissionIds);
    } catch (error) {
      console.error('Failed to load permission data:', error);
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 保存权限配置
   */
  const handleSave = async () => {
    if (!role) return;

    setSaving(true);
    try {
      const response = await assignPermissionsToRole(role.id!, {
        permissionIds: selectedPermissionIds,
      });

      if (response.success) {
        message.success('权限配置保存成功');
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to save permissions:', error);
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  /**
   * 切换单个权限
   */
  const togglePermission = (permissionId: string, checked: boolean) => {
    if (checked) {
      setSelectedPermissionIds([...selectedPermissionIds, permissionId]);
    } else {
      setSelectedPermissionIds(selectedPermissionIds.filter((id) => id !== permissionId));
    }
  };

  /**
   * 切换资源的所有权限
   */
  const toggleResourceAll = (resourceName: string, checked: boolean) => {
    const row = permissionRows.find((r) => r.resourceName === resourceName);
    if (!row) return;

    const permissionIds = row.permissions.map((p) => p.id!);
    if (checked) {
      // 添加该资源的所有权限
      const newIds = [...selectedPermissionIds];
      for (const id of permissionIds) {
        if (!newIds.includes(id)) {
          newIds.push(id);
        }
      }
      setSelectedPermissionIds(newIds);
    } else {
      // 移除该资源的所有权限
      setSelectedPermissionIds(selectedPermissionIds.filter((id) => !permissionIds.includes(id)));
    }
  };

  const columns: ColumnsType<PermissionRow> = [
    {
      title: '资源',
      dataIndex: 'resourceTitle',
      key: 'resourceTitle',
      width: 150,
      render: (text: string, record: PermissionRow) => {
        const allSelected = record.permissions.every((p) =>
          selectedPermissionIds.includes(p.id!),
        );
        const someSelected = record.permissions.some((p) =>
          selectedPermissionIds.includes(p.id!),
        );

        return (
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected && !allSelected}
            onChange={(e) => toggleResourceAll(record.resourceName, e.target.checked)}
          >
            <strong>{text}</strong>
          </Checkbox>
        );
      },
    },
    {
      title: '创建',
      key: 'create',
      width: 80,
      align: 'center' as const,
      render: (_: any, record: PermissionRow) => {
        const permission = record.permissions.find((p) => p.action === 'create');
        if (!permission) return '-';
        return (
          <Checkbox
            checked={selectedPermissionIds.includes(permission.id!)}
            onChange={(e) => togglePermission(permission.id!, e.target.checked)}
          />
        );
      },
    },
    {
      title: '查看',
      key: 'read',
      width: 80,
      align: 'center' as const,
      render: (_: any, record: PermissionRow) => {
        const permission = record.permissions.find((p) => p.action === 'read');
        if (!permission) return '-';
        return (
          <Checkbox
            checked={selectedPermissionIds.includes(permission.id!)}
            onChange={(e) => togglePermission(permission.id!, e.target.checked)}
          />
        );
      },
    },
    {
      title: '修改',
      key: 'update',
      width: 80,
      align: 'center' as const,
      render: (_: any, record: PermissionRow) => {
        const permission = record.permissions.find((p) => p.action === 'update');
        if (!permission) return '-';
        return (
          <Checkbox
            checked={selectedPermissionIds.includes(permission.id!)}
            onChange={(e) => togglePermission(permission.id!, e.target.checked)}
          />
        );
      },
    },
    {
      title: '删除',
      key: 'delete',
      width: 80,
      align: 'center' as const,
      render: (_: any, record: PermissionRow) => {
        const permission = record.permissions.find((p) => p.action === 'delete');
        if (!permission) return '-';
        return (
          <Checkbox
            checked={selectedPermissionIds.includes(permission.id!)}
            onChange={(e) => togglePermission(permission.id!, e.target.checked)}
          />
        );
      },
    },
  ];

  return (
    <Modal
      title={`配置权限 - ${role?.name || ''}`}
      open={visible}
      width={800}
      onCancel={onCancel}
      onOk={handleSave}
      confirmLoading={saving}
      okText="保存"
      cancelText="取消"
    >
      <div style={{ marginBottom: 16, color: '#666' }}>
        为角色分配操作权限，勾选后该角色的用户将拥有对应的操作权限。
      </div>

      <Table
        columns={columns}
        dataSource={permissionRows}
        rowKey="resourceName"
        loading={loading}
        pagination={false}
        size="small"
      />
    </Modal>
  );
};

export default PermissionConfigModal;

