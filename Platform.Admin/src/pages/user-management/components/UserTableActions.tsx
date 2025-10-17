import React from 'react';
import { Space, Dropdown, Button } from 'antd';
import type { MenuProps } from 'antd';
import { EditOutlined, DeleteOutlined, KeyOutlined, EyeOutlined, MoreOutlined } from '@ant-design/icons';
import PermissionControl from '@/components/PermissionControl';
import type { AppUser } from '../types';

interface UserTableActionsProps {
  /** 用户记录 */
  readonly record: AppUser;
  /** 编辑回调 */
  readonly onEdit: (user: AppUser) => void;
  /** 删除回调 */
  readonly onDelete: (user: AppUser) => void;
  /** 配置权限回调 */
  readonly onPermission: (user: AppUser) => void;
  /** 查看详情回调 */
  readonly onViewDetail: (user: AppUser) => void;
}

/**
 * 用户表格操作列组件
 * 
 * 提供编辑、删除、配置权限、查看详情等操作
 */
const UserTableActions: React.FC<UserTableActionsProps> = ({
  record,
  onEdit,
  onDelete,
  onPermission,
  onViewDetail,
}) => {
  const menuItems: MenuProps['items'] = [
    {
      key: 'detail',
      label: '查看详情',
      icon: <EyeOutlined />,
      onClick: () => onViewDetail(record),
    },
    {
      key: 'permission',
      label: '配置权限',
      icon: <KeyOutlined />,
      onClick: () => onPermission(record),
    },
  ];

  return (
    <Space size="small">
      <PermissionControl resource="user" action="update">
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => onEdit(record)}
        >
          编辑
        </Button>
      </PermissionControl>

      <PermissionControl resource="user" action="delete">
        <Button
          type="link"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => onDelete(record)}
        >
          删除
        </Button>
      </PermissionControl>

      <Dropdown menu={{ items: menuItems }} placement="bottomRight">
        <Button type="link" size="small" icon={<MoreOutlined />} />
      </Dropdown>
    </Space>
  );
};

export default React.memo(UserTableActions);












