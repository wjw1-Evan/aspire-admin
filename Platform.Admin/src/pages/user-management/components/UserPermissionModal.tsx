import { InfoCircleOutlined } from '@ant-design/icons';
import { Alert, Checkbox, message, Modal, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useEffect, useState } from 'react';
import {
  getPermissionsGrouped,
  getUserPermissions,
  assignCustomPermissions,
} from '@/services/permission';
import type { Permission, PermissionGroup } from '@/services/permission/types';

interface UserPermissionModalProps {
  visible: boolean;
  user: any;
  onCancel: () => void;
  onSuccess: () => void;
}

interface PermissionRow {
  resourceName: string;
  resourceTitle: string;
  permissions: Permission[];
  rolePermissionIds: string[]; // 从角色继承的权限
  customPermissionIds: string[]; // 用户自定义权限
}

const UserPermissionModal: React.FC<UserPermissionModalProps> = ({
  visible,
  user,
  onCancel,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [permissionRows, setPermissionRows] = useState<PermissionRow[]>([]);
  const [customPermissionIds, setCustomPermissionIds] = useState<string[]>([]);
  const [rolePermissionIds, setRolePermissionIds] = useState<string[]>([]);

  /**
   * 加载数据
   */
  useEffect(() => {
    if (visible && user) {
      loadData();
    }
  }, [visible, user]);

  /**
   * 加载权限数据和用户已有权限
   */
  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // 加载所有权限（按资源分组）
      const groupsResponse = await getPermissionsGrouped();
      if (!groupsResponse.success || !groupsResponse.data) {
        message.error('加载权限列表失败');
        return;
      }

      // 加载用户权限
      const userPermsResponse = await getUserPermissions(user.id!);
      if (!userPermsResponse.success || !userPermsResponse.data) {
        message.error('加载用户权限失败');
        return;
      }

      const rolePermIds = userPermsResponse.data.rolePermissions.map((p: Permission) => p.id!);
      const customPermIds = userPermsResponse.data.customPermissions.map((p: Permission) => p.id!);

      // 构建表格数据
      const rows: PermissionRow[] = groupsResponse.data.map((group: PermissionGroup) => ({
        resourceName: group.resourceName,
        resourceTitle: group.resourceTitle,
        permissions: group.permissions,
        rolePermissionIds: rolePermIds.filter((id: string) =>
          group.permissions.some((p: Permission) => p.id === id),
        ),
        customPermissionIds: customPermIds.filter((id: string) =>
          group.permissions.some((p: Permission) => p.id === id),
        ),
      }));

      setPermissionRows(rows);
      setRolePermissionIds(rolePermIds);
      setCustomPermissionIds(customPermIds);
    } catch (error) {
      console.error('Failed to load permission data:', error);
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 保存自定义权限
   */
  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const response = await assignCustomPermissions(user.id!, {
        permissionIds: customPermissionIds,
      });

      if (response.success) {
        message.success('自定义权限保存成功');
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
   * 切换单个自定义权限
   */
  const toggleCustomPermission = (permissionId: string, checked: boolean) => {
    if (checked) {
      setCustomPermissionIds([...customPermissionIds, permissionId]);
    } else {
      setCustomPermissionIds(customPermissionIds.filter((id) => id !== permissionId));
    }
  };

  /**
   * 检查权限是否来自角色
   */
  const isFromRole = (permissionId: string): boolean => {
    return rolePermissionIds.includes(permissionId);
  };

  /**
   * 检查权限是否为自定义
   */
  const isCustom = (permissionId: string): boolean => {
    return customPermissionIds.includes(permissionId);
  };

  /**
   * 渲染权限复选框
   */
  const renderPermissionCheckbox = (permission: Permission | undefined) => {
    if (!permission) return '-';

    const fromRole = isFromRole(permission.id!);
    const isCustomPerm = isCustom(permission.id!);
    const checked = fromRole || isCustomPerm;

    return (
      <Space direction="vertical" size={0}>
        <Checkbox
          checked={checked}
          disabled={fromRole}
          onChange={(e) => toggleCustomPermission(permission.id!, e.target.checked)}
        />
        {fromRole && (
          <Tag color="default" style={{ fontSize: '10px', padding: '0 4px' }}>
            继承
          </Tag>
        )}
        {!fromRole && isCustomPerm && (
          <Tag color="blue" style={{ fontSize: '10px', padding: '0 4px' }}>
            自定义
          </Tag>
        )}
      </Space>
    );
  };

  const columns: ColumnsType<PermissionRow> = [
    {
      title: '资源',
      dataIndex: 'resourceTitle',
      key: 'resourceTitle',
      width: 150,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: '创建',
      key: 'create',
      width: 80,
      align: 'center' as const,
      render: (_: any, record: PermissionRow) => {
        const permission = record.permissions.find((p) => p.action === 'create');
        return renderPermissionCheckbox(permission);
      },
    },
    {
      title: '查看',
      key: 'read',
      width: 80,
      align: 'center' as const,
      render: (_: any, record: PermissionRow) => {
        const permission = record.permissions.find((p) => p.action === 'read');
        return renderPermissionCheckbox(permission);
      },
    },
    {
      title: '修改',
      key: 'update',
      width: 80,
      align: 'center' as const,
      render: (_: any, record: PermissionRow) => {
        const permission = record.permissions.find((p) => p.action === 'update');
        return renderPermissionCheckbox(permission);
      },
    },
    {
      title: '删除',
      key: 'delete',
      width: 80,
      align: 'center' as const,
      render: (_: any, record: PermissionRow) => {
        const permission = record.permissions.find((p) => p.action === 'delete');
        return renderPermissionCheckbox(permission);
      },
    },
  ];

  return (
    <Modal
      title={`配置用户权限 - ${user?.username || ''}`}
      open={visible}
      width={800}
      onCancel={onCancel}
      onOk={handleSave}
      confirmLoading={saving}
      okText="保存"
      cancelText="取消"
    >
      <Alert
        message="权限说明"
        description={
          <Space direction="vertical" size="small">
            <div>
              <InfoCircleOutlined /> 用户最终权限 = 角色权限 + 自定义权限
            </div>
            <div>
              <Tag color="default">继承</Tag> 表示从角色继承的权限（不可修改）
            </div>
            <div>
              <Tag color="blue">自定义</Tag> 表示用户独有的自定义权限（可修改）
            </div>
          </Space>
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

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

export default UserPermissionModal;

