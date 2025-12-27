import { Modal, Form, Input, Switch, App, Button, Tree, Spin, Divider } from 'antd';
import React, { useEffect, useState, useCallback } from 'react';
import { useIntl } from '@umijs/max';
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
  open: boolean;
  current?: Role;
  onCancel: () => void;
  onSuccess: () => void;
}

const RoleForm: React.FC<RoleFormProps> = ({
  open,
  current,
  onCancel,
  onSuccess,
}) => {
  const intl = useIntl();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuTree, setMenuTree] = useState<DataNode[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]); // 使用独立状态管理选中项

  /**
   * 将菜单树转换为 Tree 组件数据格式
   */
  const convertToTreeData = (menus: MenuTreeNode[]): DataNode[] => {
    return menus
      .filter((menu): menu is MenuTreeNode & { id: string } => Boolean(menu.id))
      .map((menu) => ({
        key: menu.id,
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
  const loadMenuTree = useCallback(async (): Promise<DataNode[]> => {
    setMenuLoading(true);
    try {
      const menuResponse = await getMenuTree();
      if (menuResponse.success && menuResponse.data) {
        const treeData = convertToTreeData(menuResponse.data);
        setMenuTree(treeData);

        // 展开所有节点
        const allKeys = getAllKeys(menuResponse.data);
        setExpandedKeys(allKeys);

        return treeData;
      }
      return [];
    } catch (error) {
      console.error('Failed to load menu tree:', error);
      return [];
    } finally {
      setMenuLoading(false);
    }
  }, []);

  /**
   * 加载角色的菜单权限
   */
  const loadRoleMenus = useCallback(async () => {
    if (!current?.id) return;

    try {
      const permissionResponse = await getRoleMenus(current.id);
      if (permissionResponse.success && permissionResponse.data) {
        // 过滤掉空值和无效值
        const roleMenuIds = (permissionResponse.data || [])
          .filter((id): id is string => Boolean(id && typeof id === 'string'));

        // 获取菜单树中所有有效的菜单ID
        const getAllMenuIdsFromTree = (nodes: DataNode[]): string[] => {
          let ids: string[] = [];
          nodes.forEach((node) => {
            if (node.key) {
              ids.push(String(node.key));
            }
            if (node.children && node.children.length > 0) {
              ids = ids.concat(getAllMenuIdsFromTree(node.children));
            }
          });
          return ids;
        };

        const validMenuIdsInTree = getAllMenuIdsFromTree(menuTree);

        // 只保留在菜单树中存在的菜单ID
        const validMenuIds = roleMenuIds.filter((id) => validMenuIdsInTree.includes(id));

        // 直接设置选中状态，不通过表单
        setCheckedKeys(validMenuIds);
        // 同时更新表单值，用于提交
        form.setFieldsValue({ menuIds: validMenuIds });

        console.log(
          `角色 ${current.id} 加载菜单权限：后端返回 ${roleMenuIds.length} 个菜单ID，` +
          `菜单树中有 ${validMenuIdsInTree.length} 个菜单，` +
          `最终设置 ${validMenuIds.length} 个选中菜单`
        );
      } else {
        setCheckedKeys([]);
        form.setFieldsValue({ menuIds: [] });
      }
    } catch (error) {
      console.error('Failed to load role menus:', error);
      setCheckedKeys([]);
      form.setFieldsValue({ menuIds: [] });
    }
  }, [current, form, menuTree]);

  /**
   * 全选/反选菜单
   */
  const handleSelectAll = useCallback(() => {
    // 获取菜单树中所有菜单ID
    const getAllMenuIdsFromTree = (nodes: DataNode[]): string[] => {
      let ids: string[] = [];
      nodes.forEach((node) => {
        if (node.key) {
          ids.push(String(node.key));
        }
        if (node.children && node.children.length > 0) {
          ids = ids.concat(getAllMenuIdsFromTree(node.children));
        }
      });
      return ids;
    };

    const allMenuIds = getAllMenuIdsFromTree(menuTree);
    // 从表单获取当前选中状态，而不是依赖 checkedKeys 状态
    const currentMenuIds = form.getFieldValue('menuIds') || [];

    if (currentMenuIds.length === allMenuIds.length) {
      setCheckedKeys([]);
      form.setFieldsValue({ menuIds: [] });
    } else {
      setCheckedKeys(allMenuIds);
      form.setFieldsValue({ menuIds: allMenuIds });
    }
  }, [form, menuTree]);

  /**
   * 处理 Tree 组件的选中变化
   */
  const handleTreeCheck = useCallback((checked: any) => {
    const newCheckedKeys = Array.isArray(checked)
      ? (checked as string[])
      : (checked.checked as string[]);

    // 更新选中状态和表单值
    setCheckedKeys(newCheckedKeys);
    form.setFieldsValue({ menuIds: newCheckedKeys });
  }, [form]);

  /**
   * 设置表单初始值
   */
  useEffect(() => {
    if (!open) {
      // Modal 关闭时重置
      form.resetFields();
      setExpandedKeys([]);
      setCheckedKeys([]);
      return;
    }

    // Modal 打开时初始化
    form.resetFields();
    setCheckedKeys([]);

    const initializeForm = async () => {
      // 先加载菜单树
      const treeData = await loadMenuTree();

      if (current) {
        // 编辑模式：设置基本字段
        form.setFieldsValue({
          name: current.name,
          description: current.description,
          isActive: current.isActive,
          menuIds: [],
        });
        // 菜单树加载完成后，直接加载角色菜单权限
        // 使用 treeData 而不是依赖 menuTree 状态，避免循环依赖
        if (treeData.length > 0) {
          // 临时设置 menuTree，以便 loadRoleMenus 可以使用
          setMenuTree(treeData);
          // 直接调用，传入 treeData
          loadRoleMenusWithTreeData(treeData);
        }
      } else {
        // 新建模式
        form.setFieldsValue({
          menuIds: [],
          isActive: true,
        });
        setCheckedKeys([]);
      }
    };

    initializeForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, current?.id, loadMenuTree, form]);

  /**
   * 使用菜单树数据加载角色菜单权限（避免循环依赖）
   */
  const loadRoleMenusWithTreeData = useCallback(async (treeData: DataNode[]) => {
    if (!current?.id) return;

    try {
      const permissionResponse = await getRoleMenus(current.id);
      if (permissionResponse.success && permissionResponse.data) {
        // 过滤掉空值和无效值
        const roleMenuIds = (permissionResponse.data || [])
          .filter((id): id is string => Boolean(id && typeof id === 'string'));

        // 获取菜单树中所有有效的菜单ID
        const getAllMenuIdsFromTree = (nodes: DataNode[]): string[] => {
          let ids: string[] = [];
          nodes.forEach((node) => {
            if (node.key) {
              ids.push(String(node.key));
            }
            if (node.children && node.children.length > 0) {
              ids = ids.concat(getAllMenuIdsFromTree(node.children));
            }
          });
          return ids;
        };

        const validMenuIdsInTree = getAllMenuIdsFromTree(treeData);

        // 只保留在菜单树中存在的菜单ID
        const validMenuIds = roleMenuIds.filter((id) => validMenuIdsInTree.includes(id));

        // 直接设置选中状态，不通过表单
        setCheckedKeys(validMenuIds);
        // 同时更新表单值，用于提交
        form.setFieldsValue({ menuIds: validMenuIds });

        console.log(
          `角色 ${current.id} 加载菜单权限：后端返回 ${roleMenuIds.length} 个菜单ID，` +
          `菜单树中有 ${validMenuIdsInTree.length} 个菜单，` +
          `最终设置 ${validMenuIds.length} 个选中菜单`
        );
      } else {
        setCheckedKeys([]);
        form.setFieldsValue({ menuIds: [] });
      }
    } catch (error) {
      console.error('Failed to load role menus:', error);
      setCheckedKeys([]);
      form.setFieldsValue({ menuIds: [] });
    }
  }, [current, form]);

  /**
   * 提交表单
   */
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (current) {
        if (!current.id) {
          throw new Error('当前角色缺少唯一标识，无法更新');
        }
        // 更新角色
        const updateData: UpdateRoleRequest = {
          name: values.name,
          description: values.description,
          isActive: values.isActive,
          menuIds: checkedKeys, // 使用 checkedKeys 状态，确保数据准确
        };

        const response = await updateRole(current.id, updateData);
        if (response.success) {
          message.success(intl.formatMessage({ id: 'pages.roleForm.updateSuccess' }));
          onSuccess();
        } else {
          throw new Error(response.errorMessage || intl.formatMessage({ id: 'pages.roleForm.updateFailed' }));
        }
      } else {
        // 创建角色
        const createData: CreateRoleRequest = {
          name: values.name,
          description: values.description,
          menuIds: checkedKeys, // 使用 checkedKeys 状态
          isActive: values.isActive !== false,
        };

        const response = await createRole(createData);
        if (response.success) {
          message.success(intl.formatMessage({ id: 'pages.roleForm.createSuccess' }));
          onSuccess();
        } else {
          throw new Error(response.errorMessage || intl.formatMessage({ id: 'pages.roleForm.createFailed' }));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={current ? intl.formatMessage({ id: 'pages.roleForm.editTitle' }) : intl.formatMessage({ id: 'pages.roleForm.createTitle' })}
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={700}
      destroyOnHidden={true}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label={intl.formatMessage({ id: 'pages.roleForm.nameLabel' })}
          name="name"
          rules={[{ required: true, message: intl.formatMessage({ id: 'pages.roleForm.nameRequired' }) }]}
        >
          <Input placeholder={intl.formatMessage({ id: 'pages.roleForm.namePlaceholder' })} />
        </Form.Item>

        <Form.Item label={intl.formatMessage({ id: 'pages.roleForm.descriptionLabel' })} name="description">
          <Input.TextArea placeholder={intl.formatMessage({ id: 'pages.roleForm.descriptionPlaceholder' })} rows={3} />
        </Form.Item>

        <Divider style={{ margin: '16px 0' }}>
          {intl.formatMessage({ id: 'pages.roleForm.menuPermission' })}
        </Divider>

        <div style={{ marginBottom: 16 }}>
          <Button type="link" onClick={handleSelectAll} style={{ padding: 0 }}>
            {(() => {
              // 获取菜单树中所有菜单ID
              const getAllMenuIdsFromTree = (nodes: DataNode[]): string[] => {
                let ids: string[] = [];
                nodes.forEach((node) => {
                  if (node.key) {
                    ids.push(String(node.key));
                  }
                  if (node.children && node.children.length > 0) {
                    ids = ids.concat(getAllMenuIdsFromTree(node.children));
                  }
                });
                return ids;
              };
              const allMenuIds = getAllMenuIdsFromTree(menuTree);
              return checkedKeys.length === allMenuIds.length
                ? intl.formatMessage({ id: 'pages.roleForm.deselectAll' })
                : intl.formatMessage({ id: 'pages.roleForm.selectAll' });
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
            rules={[
              {
                validator: (_, value) => {
                  if (!value || value.length === 0) {
                    return Promise.reject(new Error(intl.formatMessage({ id: 'pages.roleForm.menuRequired' })));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Tree
              checkable
              checkStrictly
              defaultExpandAll
              treeData={menuTree}
              checkedKeys={checkedKeys}
              expandedKeys={expandedKeys}
              onExpand={(keys) => {
                setExpandedKeys(keys.map(String));
              }}
              onCheck={handleTreeCheck}
            />
          </Form.Item>
        )}

        <Form.Item
          label={intl.formatMessage({ id: 'pages.roleForm.isActiveLabel' })}
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
