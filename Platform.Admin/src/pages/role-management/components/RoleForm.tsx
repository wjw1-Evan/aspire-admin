import { App, Button, Tree, Spin, Divider, Form } from 'antd';
import React, { useEffect, useState, useCallback } from 'react';
import { useIntl } from '@umijs/max';
import { ModalForm, ProFormText, ProFormTextArea, ProFormSwitch } from '@ant-design/pro-components';
import { createRole, updateRole, getRoleMenus } from '@/services/role/api';
import { getMenuTree } from '@/services/menu/api';
import type {
  Role,
  CreateRoleRequest,
  UpdateRoleRequest,
} from '@/services/role/api';
import type { MenuTreeNode } from '@/services/menu/api';
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
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);

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

  const loadMenuTree = useCallback(async (): Promise<DataNode[]> => {
    setMenuLoading(true);
    try {
      const menuResponse = await getMenuTree();
      if (menuResponse.success && menuResponse.data) {
        const treeData = convertToTreeData(menuResponse.data);
        setMenuTree(treeData);

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

  const loadRoleMenus = useCallback(async () => {
    if (!current?.id) return;

    try {
      const permissionResponse = await getRoleMenus(current.id);
      if (permissionResponse.success && permissionResponse.data) {
        const roleMenuIds = (permissionResponse.data || [])
          .filter((id): id is string => Boolean(id && typeof id === 'string'));

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
        const validMenuIds = roleMenuIds.filter((id) => validMenuIdsInTree.includes(id));

        setCheckedKeys(validMenuIds);
        form.setFieldsValue({ menuIds: validMenuIds });
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

  const handleSelectAll = useCallback(() => {
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
    const currentMenuIds = form.getFieldValue('menuIds') || [];

    if (currentMenuIds.length === allMenuIds.length) {
      setCheckedKeys([]);
      form.setFieldsValue({ menuIds: [] });
    } else {
      setCheckedKeys(allMenuIds);
      form.setFieldsValue({ menuIds: allMenuIds });
    }
  }, [form, menuTree]);

  const handleTreeCheck = useCallback((checked: any) => {
    const newCheckedKeys = Array.isArray(checked)
      ? (checked as string[])
      : (checked.checked as string[]);

    setCheckedKeys(newCheckedKeys);
    form.setFieldsValue({ menuIds: newCheckedKeys });
  }, [form]);

  const loadRoleMenusWithTreeData = useCallback(async (treeData: DataNode[]) => {
    if (!current?.id) return;

    try {
      const permissionResponse = await getRoleMenus(current.id);
      if (permissionResponse.success && permissionResponse.data) {
        const roleMenuIds = (permissionResponse.data || [])
          .filter((id): id is string => Boolean(id && typeof id === 'string'));

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
        const validMenuIds = roleMenuIds.filter((id) => validMenuIdsInTree.includes(id));

        setCheckedKeys(validMenuIds);
        form.setFieldsValue({ menuIds: validMenuIds });
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

  const handleSubmit = async (values: Record<string, any>) => {
    try {
      setLoading(true);

      if (current) {
        if (!current.id) {
          throw new Error('当前角色缺少唯一标识，无法更新');
        }
        const updateData: UpdateRoleRequest = {
          name: values.name,
          description: values.description,
          isActive: values.isActive,
          menuIds: checkedKeys,
        };

        const response = await updateRole(current.id, updateData);
        if (response.success) {
          message.success(intl.formatMessage({ id: 'pages.roleForm.updateSuccess' }));
          onSuccess();
        } else {
          message.error(response.message || intl.formatMessage({ id: 'pages.roleForm.updateFailed' }));
        }
      } else {
        const createData: CreateRoleRequest = {
          name: values.name,
          description: values.description,
          menuIds: checkedKeys,
          isActive: values.isActive !== false,
        };

        const response = await createRole(createData);
        if (response.success) {
          message.success(intl.formatMessage({ id: 'pages.roleForm.createSuccess' }));
          onSuccess();
        } else {
          message.error(response.message || intl.formatMessage({ id: 'pages.roleForm.createFailed' }));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) {
      form.resetFields();
      setExpandedKeys([]);
      setCheckedKeys([]);
      return;
    }

    form.resetFields();
    setCheckedKeys([]);

    const initializeForm = async () => {
      const treeData = await loadMenuTree();

      if (current) {
        form.setFieldsValue({
          name: current.name,
          description: current.description,
          isActive: current.isActive,
          menuIds: [],
        });
        if (treeData.length > 0) {
          setMenuTree(treeData);
          loadRoleMenusWithTreeData(treeData);
        }
      } else {
        form.setFieldsValue({
          menuIds: [],
          isActive: true,
        });
        setCheckedKeys([]);
      }
    };

    initializeForm();
  }, [open, current?.id, loadMenuTree, form, loadRoleMenusWithTreeData]);

  const initialValues = current ? {
    name: current.name,
    description: current.description,
    isActive: current.isActive,
  } : {
    isActive: true,
  };

  return (
    <ModalForm
      title={current ? intl.formatMessage({ id: 'pages.roleForm.editTitle' }) : intl.formatMessage({ id: 'pages.roleForm.createTitle' })}
      open={open}
      onOpenChange={(visible) => { if (!visible) onCancel(); }}
      onFinish={async (values) => {
        await handleSubmit({ ...values, menuIds: checkedKeys });
        return true;
      }}
      initialValues={initialValues}
      width={700}
    >
      <ProFormText
        label={intl.formatMessage({ id: 'pages.roleForm.nameLabel' })}
        name="name"
        rules={[{ required: true, message: intl.formatMessage({ id: 'pages.roleForm.nameRequired' }) }]}
        placeholder={intl.formatMessage({ id: 'pages.roleForm.namePlaceholder' })}
      />

      <ProFormTextArea
        label={intl.formatMessage({ id: 'pages.roleForm.descriptionLabel' })}
        name="description"
        placeholder={intl.formatMessage({ id: 'pages.roleForm.descriptionPlaceholder' })}
        rows={3}
      />

      <Divider style={{ margin: '16px 0' }}>
        {intl.formatMessage({ id: 'pages.roleForm.menuPermission' })}
      </Divider>

      <div style={{ marginBottom: 16 }}>
        <Button type="link" onClick={handleSelectAll} style={{ padding: 0 }}>
          {(() => {
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

      <ProFormSwitch
        label={intl.formatMessage({ id: 'pages.roleForm.isActiveLabel' })}
        name="isActive"
        initialValue={true}
      />
    </ModalForm>
  );
};

export default RoleForm;
