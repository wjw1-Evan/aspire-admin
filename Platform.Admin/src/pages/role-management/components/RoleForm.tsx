import { Modal, Form, Input, Switch, message, Button, Tree, Spin, Divider } from 'antd';
import React, { useEffect, useState, useCallback } from 'react';
import { createRole, updateRole, getRoleMenus } from '@/services/role/api';
import { getMenuTree } from '@/services/menu/api';
import type {
  Role,
  CreateRoleRequest,
  UpdateRoleRequest,
} from '@/services/role/types';
import type { MenuTreeNode } from '@/services/menu/types';
import type { DataNode } from 'antd/es/tree';

interface RoleFormProps {
  visible: boolean;
  current?: Role;
  onCancel: () => void;
  onSuccess: () => void;
}

const RoleForm: React.FC<RoleFormProps> = ({
  visible,
  current,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuTree, setMenuTree] = useState<DataNode[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  /**
   * 将菜单树转换为 Tree 组件数据格式
   */
  const convertToTreeData = (menus: MenuTreeNode[]): DataNode[] => {
    return menus.map((menu) => ({
      key: menu.id!,
      title: menu.title || menu.name,
      children:
        menu.children && menu.children.length > 0
          ? convertToTreeData(menu.children)
          : undefined,
    }));
  };

  /**
   * 获取所有节点的 key
   */
  const getAllKeys = (menus: MenuTreeNode[]): string[] => {
    let keys: string[] = [];
    menus.forEach((menu) => {
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
   * 加载菜单树
   */
  const loadMenuTree = useCallback(async () => {
    setMenuLoading(true);
    try {
      const menuResponse = await getMenuTree();
      if (menuResponse.success && menuResponse.data) {
        const treeData = convertToTreeData(menuResponse.data);
        setMenuTree(treeData);

        // 展开所有节点
        const allKeys = getAllKeys(menuResponse.data);
        setExpandedKeys(allKeys);
      }
    } catch (error) {
      console.error('Failed to load menu tree:', error);
    } finally {
      setMenuLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 加载角色的菜单权限
   */
  const loadRoleMenus = useCallback(async () => {
    if (!current?.id) return;

    try {
      const permissionResponse = await getRoleMenus(current.id);
      if (permissionResponse.success && permissionResponse.data) {
        form.setFieldsValue({
          menuIds: permissionResponse.data,
        });
      }
    } catch (error) {
      console.error('Failed to load role menus:', error);
    }
  }, [current, form]);

  /**
   * 全选/反选菜单
   */
  const handleSelectAll = useCallback(() => {
    const checkedKeys = form.getFieldValue('menuIds') || [];
    const allKeys = expandedKeys;
    
    if (checkedKeys.length === allKeys.length) {
      form.setFieldsValue({ menuIds: [] });
    } else {
      form.setFieldsValue({ menuIds: allKeys });
    }
  }, [form, expandedKeys]);

  /**
   * 设置表单初始值
   */
  useEffect(() => {
    if (visible) {
      // 先重置表单，清除之前的状态
      form.resetFields();
      form.setFieldsValue({
        menuIds: [],
        isActive: true,
      });
      
      loadMenuTree();
      
      if (current) {
        // 编辑模式：设置基本字段，然后异步加载角色的菜单权限
        form.setFieldsValue({
          name: current.name,
          description: current.description,
          isActive: current.isActive,
          menuIds: [], // 先设置为空数组，等待 loadRoleMenus 加载
        });
        loadRoleMenus();
      } else {
        // 新建模式：确保所有字段都是初始值
        form.setFieldsValue({
          menuIds: [],
          isActive: true,
        });
      }
    }
  }, [visible, current, loadMenuTree, loadRoleMenus, form]);

  /**
   * 提交表单
   */
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (current) {
        // 更新角色
        const updateData: UpdateRoleRequest = {
          name: values.name,
          description: values.description,
          isActive: values.isActive,
          menuIds: values.menuIds || [],
        };

        const response = await updateRole(current.id!, updateData);
        if (response.success) {
          message.success('更新成功');
          onSuccess();
        } else {
          message.error(response.errorMessage || '更新失败');
        }
      } else {
        // 创建角色
        const createData: CreateRoleRequest = {
          name: values.name,
          description: values.description,
          menuIds: values.menuIds || [],
          isActive: values.isActive !== false,
        };

        const response = await createRole(createData);
        if (response.success) {
          message.success('创建成功');
          onSuccess();
        } else {
          message.error(response.errorMessage || '创建失败');
        }
      }
    } catch (error: any) {
      message.error(error.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={current ? '编辑角色' : '新增角色'}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={700}
      destroyOnClose={true}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="角色名称"
          name="name"
          rules={[{ required: true, message: '请输入角色名称' }]}
        >
          <Input placeholder="请输入角色名称" />
        </Form.Item>

        <Form.Item label="角色描述" name="description">
          <Input.TextArea placeholder="请输入角色描述" rows={3} />
        </Form.Item>

        <Divider orientation="left" style={{ margin: '16px 0' }}>
          菜单权限
        </Divider>

        <div style={{ marginBottom: 16 }}>
          <Button type="link" onClick={handleSelectAll} style={{ padding: 0 }}>
            {(() => {
              const checkedKeys = form.getFieldValue('menuIds') || [];
              return checkedKeys.length === expandedKeys.length
                ? '取消全选'
                : '全选';
            })()}
          </Button>
        </div>

        {menuLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin />
          </div>
        ) : (
          <Form.Item
            name="menuIds"
            initialValue={[]}
            rules={[
              {
                validator: (_, value) => {
                  if (!value || value.length === 0) {
                    return Promise.reject(new Error('请至少选择一个菜单权限'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Tree
              checkable
              defaultExpandAll
              treeData={menuTree}
              checkedKeys={form.getFieldValue('menuIds')}
              expandedKeys={expandedKeys}
              onExpand={(keys) => {
                setExpandedKeys(keys.map(String));
              }}
              onCheck={(checked) => {
                if (Array.isArray(checked)) {
                  form.setFieldsValue({ menuIds: checked as string[] });
                } else {
                  form.setFieldsValue({ menuIds: checked.checked as string[] });
                }
              }}
            />
          </Form.Item>
        )}

        <Form.Item
          label="是否启用"
          name="isActive"
          valuePropName="checked"
          initialValue={true}
        >
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default RoleForm;
