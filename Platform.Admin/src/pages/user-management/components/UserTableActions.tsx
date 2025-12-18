import React from 'react';
import { Space, Button } from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  KeyOutlined,
} from '@ant-design/icons';
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
  return (
    <Space size="small">
      <PermissionControl resource="user" action="read">
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => onViewDetail(record)}
        >
          查看
        </Button>
      </PermissionControl>
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
      <PermissionControl resource="user" action="update">
        <Button
          type="link"
          size="small"
          icon={<KeyOutlined />}
          onClick={() => onPermission(record)}
        >
          权限
        </Button>
      </PermissionControl>
    </Space>
  );
};

export default React.memo(UserTableActions);
















































