import React, { useRef, useState, useCallback, useMemo } from 'react';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import * as Icons from '@ant-design/icons';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, message, Space, Tag } from 'antd';
import { getMenuTree, deleteMenu } from '@/services/menu/api';
import type { MenuTreeNode } from '@/services/menu/types';
import MenuForm from './components/MenuForm';
import PermissionControl from '@/components/PermissionControl';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';

/**
 * 菜单管理页面组件（优化版本）
 * 
 * 优化点：
 * 1. 使用 DeleteConfirmModal 和 useDeleteConfirm
 * 2. 使用 useCallback 和 useMemo 优化性能
 */
const MenuManagement: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [modalVisible, setModalVisible] = useState(false);
  const [currentMenu, setCurrentMenu] = useState<MenuTreeNode | undefined>();

  // 使用删除确认 Hook
  const deleteConfirm = useDeleteConfirm({
    requireReason: true,
    onSuccess: () => {
      message.success('删除成功');
      actionRef.current?.reload();
    },
    onError: (error: any) => {
      message.error(error.message || '删除失败');
    },
  });

  /**
   * 根据图标名称获取图标组件
   */
  const getIconComponent = useCallback((iconName?: string): React.ReactNode => {
    if (!iconName) return null;

    const formatIconName = (name: string) => {
      return name
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
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
  }, []);

  /**
   * 加载菜单数据
   */
  const loadMenuData = useCallback(async () => {
    try {
      const response = await getMenuTree();
      if (response.success && response.data) {
        return {
          data: response.data,
          success: true,
        };
      }
      return {
        data: [],
        success: false,
      };
    } catch (error) {
      message.error('加载菜单失败');
      return {
        data: [],
        success: false,
      };
    }
  }, []);

  /**
   * 删除菜单
   */
  const handleDelete = useCallback(
    (menu: MenuTreeNode) => {
      deleteConfirm.showConfirm({
        id: menu.id,
        name: menu.name,
        description: '删除菜单将自动从所有角色的菜单列表中移除此菜单。如果有子菜单，请先删除子菜单。',
      });
    },
    [deleteConfirm],
  );

  /**
   * 打开编辑对话框
   */
  const handleEdit = useCallback((menu: MenuTreeNode) => {
    setCurrentMenu(menu);
    setModalVisible(true);
  }, []);

  /**
   * 表格列定义（优化：使用 useMemo）
   */
  const columns: ProColumns<MenuTreeNode>[] = useMemo(
    () => [
      {
        title: '菜单名称',
        dataIndex: 'name',
        key: 'name',
        width: 200,
      },
      {
        title: '图标',
        dataIndex: 'icon',
        key: 'icon',
        width: 80,
        align: 'center',
        render: (icon: string) => getIconComponent(icon),
      },
      {
        title: '路径',
        dataIndex: 'path',
        key: 'path',
        ellipsis: true,
      },
      {
        title: '排序',
        dataIndex: 'sortOrder',
        key: 'sortOrder',
        width: 80,
        align: 'center',
      },
      {
        title: '状态',
        dataIndex: 'isEnabled',
        key: 'isEnabled',
        width: 100,
        align: 'center',
        render: (isEnabled: boolean) => (
          <Tag color={isEnabled ? 'success' : 'default'}>
            {isEnabled ? '启用' : '禁用'}
          </Tag>
        ),
      },
      {
        title: '隐藏',
        dataIndex: 'hideInMenu',
        key: 'hideInMenu',
        width: 100,
        align: 'center',
        render: (hideInMenu: boolean) => (
          <Tag color={hideInMenu ? 'warning' : 'default'}>
            {hideInMenu ? '是' : '否'}
          </Tag>
        ),
      },
      {
        title: '外部链接',
        dataIndex: 'isExternal',
        key: 'isExternal',
        width: 100,
        align: 'center',
        render: (isExternal: boolean) => (
          <Tag color={isExternal ? 'blue' : 'default'}>
            {isExternal ? '是' : '否'}
          </Tag>
        ),
      },
      {
        title: '操作',
        key: 'action',
        fixed: 'right',
        width: 150,
        render: (_, record) => (
          <Space size="small">
            <PermissionControl resource="menu" action="update">
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              >
                编辑
              </Button>
            </PermissionControl>

            <PermissionControl resource="menu" action="delete">
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(record)}
              >
                删除
              </Button>
            </PermissionControl>
          </Space>
        ),
      },
    ],
    [getIconComponent, handleEdit, handleDelete],
  );

  return (
    <PageContainer>
      <ProTable<MenuTreeNode>
        headerTitle="菜单管理"
        actionRef={actionRef}
        rowKey="id"
        search={false}
        request={loadMenuData}
        columns={columns}
        pagination={false}
        expandable={{
          defaultExpandAllRows: true,
        }}
        toolBarRender={() => [
          <PermissionControl key="create" resource="menu" action="create">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setCurrentMenu(undefined);
                setModalVisible(true);
              }}
            >
              新建菜单
            </Button>
          </PermissionControl>,
        ]}
      />

      {/* 菜单表单对话框 */}
      <MenuForm
        visible={modalVisible}
        menu={currentMenu}
        onSubmit={async () => {
          setModalVisible(false);
          setCurrentMenu(undefined);
          actionRef.current?.reload();
        }}
        onCancel={() => {
          setModalVisible(false);
          setCurrentMenu(undefined);
        }}
      />

      {/* 删除确认对话框 */}
      <DeleteConfirmModal
        visible={deleteConfirm.state.visible}
        itemName={deleteConfirm.state.currentItem?.name}
        description={deleteConfirm.state.currentItem?.description}
        requireReason
        reasonPlaceholder="请输入删除原因（选填，最多200字）"
        onConfirm={async (reason) => {
          await deleteConfirm.handleConfirm(async () => {
            const response = await deleteMenu(deleteConfirm.state.currentItem!.id!, reason);
            if (!response.success) {
              throw new Error(response.errorMessage || '删除失败');
            }
          });
        }}
        onCancel={deleteConfirm.hideConfirm}
      />
    </PageContainer>
  );
};

export default MenuManagement;



