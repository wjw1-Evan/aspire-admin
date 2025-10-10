import { Modal, Form, Input, InputNumber, Switch, TreeSelect, message, Space } from 'antd';
import * as Icons from '@ant-design/icons';
import React, { useEffect, useState } from 'react';
import { createMenu, updateMenu, getMenuTree } from '@/services/menu/api';
import type { MenuTreeNode, CreateMenuRequest, UpdateMenuRequest } from '@/services/menu/types';

interface MenuFormProps {
  visible: boolean;
  current?: MenuTreeNode;
  onCancel: () => void;
  onSuccess: () => void;
}

const MenuForm: React.FC<MenuFormProps> = ({ visible, current, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [menuTree, setMenuTree] = useState<MenuTreeNode[]>([]);
  const [iconPreview, setIconPreview] = useState<string>('');

  /**
   * 根据图标名称获取图标组件
   */
  const getIconComponent = (iconName?: string): React.ReactNode => {
    if (!iconName) return null;
    
    const formatIconName = (name: string) => {
      return name
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
    };
    
    const suffixes = ['Outlined', 'Filled', 'TwoTone', ''];
    
    for (const suffix of suffixes) {
      const iconComponentName = formatIconName(iconName) + suffix;
      const IconComponent = (Icons as any)[iconComponentName];
      
      if (IconComponent) {
        return React.createElement(IconComponent);
      }
    }
    
    return null;
  };

  /**
   * 加载菜单树数据
   */
  useEffect(() => {
    if (visible) {
      loadMenuTree();
    }
  }, [visible]);

  /**
   * 设置表单初始值
   */
  useEffect(() => {
    if (visible && current) {
      form.setFieldsValue({
        name: current.name,
        path: current.path,
        component: current.component,
        icon: current.icon,
        sortOrder: current.sortOrder,
        isEnabled: current.isEnabled,
        isExternal: current.isExternal,
        openInNewTab: current.openInNewTab,
        hideInMenu: current.hideInMenu,
        parentId: current.parentId || undefined,
      });
      setIconPreview(current.icon || '');
    } else if (visible) {
      form.resetFields();
      setIconPreview('');
    }
  }, [visible, current, form]);

  /**
   * 加载菜单树
   */
  const loadMenuTree = async () => {
    try {
      const response = await getMenuTree();
      if (response.success && response.data) {
        setMenuTree(response.data);
      }
    } catch (error) {
      message.error('加载菜单树失败');
    }
  };

  /**
   * 将菜单树转换为 TreeSelect 数据格式
   */
  const convertToTreeSelectData = (menus: MenuTreeNode[], excludeId?: string): any[] => {
    return menus
      .filter(menu => menu.id !== excludeId)
      .map(menu => ({
        title: menu.name,
        value: menu.id,
        children: menu.children && menu.children.length > 0 
          ? convertToTreeSelectData(menu.children, excludeId) 
          : undefined,
      }));
  };

  /**
   * 提交表单
   */
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (current) {
        // 更新菜单
        const updateData: UpdateMenuRequest = {
          name: values.name,
          path: values.path,
          component: values.component,
          icon: values.icon,
          sortOrder: values.sortOrder,
          isEnabled: values.isEnabled,
          isExternal: values.isExternal,
          openInNewTab: values.openInNewTab,
          hideInMenu: values.hideInMenu,
          parentId: values.parentId || null,
        };

        const response = await updateMenu(current.id!, updateData);
        if (response.success) {
          message.success('更新成功');
          onSuccess();
        } else {
          message.error(response.errorMessage || '更新失败');
        }
      } else {
        // 创建菜单
        const createData: CreateMenuRequest = {
          name: values.name,
          path: values.path,
          component: values.component,
          icon: values.icon,
          sortOrder: values.sortOrder || 0,
          isEnabled: values.isEnabled !== false,
          isExternal: values.isExternal || false,
          openInNewTab: values.openInNewTab || false,
          hideInMenu: values.hideInMenu || false,
          parentId: values.parentId || null,
          permissions: [],
        };

        const response = await createMenu(createData);
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
      title={current ? '编辑菜单' : '新增菜单'}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={600}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="菜单名称"
          name="name"
          rules={[{ required: true, message: '请输入菜单名称' }]}
        >
          <Input placeholder="请输入菜单名称" />
        </Form.Item>

        <Form.Item
          label="菜单路径"
          name="path"
          rules={[{ required: true, message: '请输入菜单路径' }]}
        >
          <Input placeholder="请输入菜单路径，如：/system/menu" />
        </Form.Item>

        <Form.Item
          label="组件路径"
          name="component"
        >
          <Input placeholder="请输入组件路径，如：./menu-management" />
        </Form.Item>

        <Form.Item
          label="菜单图标"
          name="icon"
        >
          <Input 
            placeholder="请输入图标名称，如：menu, user, setting" 
            onChange={(e) => setIconPreview(e.target.value)}
            suffix={
              iconPreview && (
                <Space>
                  {getIconComponent(iconPreview)}
                </Space>
              )
            }
          />
        </Form.Item>

        <Form.Item
          label="父级菜单"
          name="parentId"
        >
          <TreeSelect
            treeData={convertToTreeSelectData(menuTree, current?.id)}
            placeholder="请选择父级菜单（不选则为顶级菜单）"
            allowClear
            treeDefaultExpandAll
          />
        </Form.Item>

        <Form.Item
          label="排序"
          name="sortOrder"
          initialValue={0}
        >
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          label="是否启用"
          name="isEnabled"
          valuePropName="checked"
          initialValue={true}
        >
          <Switch />
        </Form.Item>

        <Form.Item
          label="是否外部链接"
          name="isExternal"
          valuePropName="checked"
          initialValue={false}
        >
          <Switch />
        </Form.Item>

        <Form.Item
          label="新窗口打开"
          name="openInNewTab"
          valuePropName="checked"
          initialValue={false}
        >
          <Switch />
        </Form.Item>

        <Form.Item
          label="隐藏菜单"
          name="hideInMenu"
          valuePropName="checked"
          initialValue={false}
        >
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default MenuForm;

