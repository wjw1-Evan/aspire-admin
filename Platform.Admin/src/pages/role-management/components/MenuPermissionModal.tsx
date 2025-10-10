import { Modal, Tree, message, Spin, Button } from 'antd';
import React, { useEffect, useState } from 'react';
import { getMenuTree } from '@/services/menu/api';
import { assignMenusToRole, getRoleMenus } from '@/services/role/api';
import type { MenuTreeNode } from '@/services/menu/types';
import type { Role } from '@/services/role/types';
import type { DataNode } from 'antd/es/tree';

interface MenuPermissionModalProps {
  visible: boolean;
  role?: Role;
  onCancel: () => void;
  onSuccess: () => void;
}

const MenuPermissionModal: React.FC<MenuPermissionModalProps> = ({
  visible,
  role,
  onCancel,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [menuTree, setMenuTree] = useState<DataNode[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  /**
   * 加载数据
   */
  useEffect(() => {
    if (visible && role) {
      loadData();
    }
  }, [visible, role]);

  /**
   * 加载菜单树和角色权限
   */
  const loadData = async () => {
    if (!role) return;

    setLoading(true);
    try {
      // 加载菜单树
      const menuResponse = await getMenuTree();
      if (menuResponse.success && menuResponse.data) {
        const treeData = convertToTreeData(menuResponse.data);
        setMenuTree(treeData);
        
        // 展开所有节点
        const allKeys = getAllKeys(menuResponse.data);
        setExpandedKeys(allKeys);
      }

      // 加载角色已有权限
      const permissionResponse = await getRoleMenus(role.id!);
      if (permissionResponse.success && permissionResponse.data) {
        setCheckedKeys(permissionResponse.data);
      }
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 将菜单树转换为 Tree 组件数据格式
   */
  const convertToTreeData = (menus: MenuTreeNode[]): DataNode[] => {
    return menus.map(menu => ({
      key: menu.id!,
      title: menu.name,
      children: menu.children && menu.children.length > 0 
        ? convertToTreeData(menu.children) 
        : undefined,
    }));
  };

  /**
   * 获取所有节点的 key
   */
  const getAllKeys = (menus: MenuTreeNode[]): string[] => {
    let keys: string[] = [];
    menus.forEach(menu => {
      if (menu.id) {
        keys.push(menu.id);
      }
      if (menu.children && menu.children.length > 0) {
        keys = keys.concat(getAllKeys(menu.children));
      }
    });
    return keys;
  };

  /**
   * 保存权限
   */
  const handleSave = async () => {
    if (!role) return;

    setSaving(true);
    try {
      const response = await assignMenusToRole(role.id!, {
        menuIds: checkedKeys,
      });

      if (response.success) {
        message.success('权限分配成功');
        onSuccess();
      } else {
        message.error(response.errorMessage || '权限分配失败');
      }
    } catch (error: any) {
      message.error(error.message || '权限分配失败');
    } finally {
      setSaving(false);
    }
  };

  /**
   * 全选/反选
   */
  const handleSelectAll = () => {
    if (checkedKeys.length === expandedKeys.length) {
      setCheckedKeys([]);
    } else {
      setCheckedKeys(expandedKeys);
    }
  };

  return (
    <Modal
      title={`分配权限 - ${role?.name}`}
      open={visible}
      onCancel={onCancel}
      onOk={handleSave}
      confirmLoading={saving}
      width={600}
      destroyOnClose
    >
      <div style={{ marginBottom: 16 }}>
        <Button type="link" onClick={handleSelectAll} style={{ padding: 0 }}>
          {checkedKeys.length === expandedKeys.length ? '取消全选' : '全选'}
        </Button>
      </div>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin />
        </div>
      ) : (
        <Tree
          checkable
          defaultExpandAll
          treeData={menuTree}
          checkedKeys={checkedKeys}
          expandedKeys={expandedKeys}
          onExpand={setExpandedKeys}
          onCheck={(checked) => {
            if (Array.isArray(checked)) {
              setCheckedKeys(checked as string[]);
            } else {
              setCheckedKeys(checked.checked as string[]);
            }
          }}
        />
      )}
    </Modal>
  );
};

export default MenuPermissionModal;

