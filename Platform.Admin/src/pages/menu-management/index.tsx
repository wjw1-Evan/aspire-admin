import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import * as Icons from '@ant-design/icons';
import { PageContainer, ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Space, Tag } from 'antd';
import React, { useRef, useState } from 'react';
import { getMenuTree, deleteMenu } from '@/services/menu/api';
import type { MenuTreeNode } from '@/services/menu/types';
import MenuForm from './components/MenuForm';
import PermissionControl from '@/components/PermissionControl';

const MenuManagement: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [modalVisible, setModalVisible] = useState(false);
  const [currentMenu, setCurrentMenu] = useState<MenuTreeNode | undefined>();

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
   * 加载菜单数据
   */
  const loadMenuData = async () => {
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
  };

  /**
   * 删除菜单
   */
  const handleDelete = async (id: string) => {
    try {
      const response = await deleteMenu(id);
      if (response.success) {
        message.success('删除成功');
        actionRef.current?.reload();
      } else {
        message.error(response.errorMessage || '删除失败');
      }
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  /**
   * 表格列定义
   */
  const columns: ProColumns<MenuTreeNode>[] = [
    {
      title: '菜单名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '路径',
      dataIndex: 'path',
      key: 'path',
      width: 200,
    },
    {
      title: '图标',
      dataIndex: 'icon',
      key: 'icon',
      width: 100,
      render: (_, record) => (
        <Space>
          {getIconComponent(record.icon)}
          <span>{record.icon || '-'}</span>
        </Space>
      ),
    },
    {
      title: '组件',
      dataIndex: 'component',
      key: 'component',
      width: 200,
      ellipsis: true,
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 80,
    },
    {
      title: '状态',
      dataIndex: 'isEnabled',
      key: 'isEnabled',
      width: 80,
      render: (_, record) => (
        <Tag color={record.isEnabled ? 'success' : 'default'}>
          {record.isEnabled ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '外部链接',
      dataIndex: 'isExternal',
      key: 'isExternal',
      width: 100,
      render: (_, record) => (
        <Tag color={record.isExternal ? 'blue' : 'default'}>
          {record.isExternal ? '是' : '否'}
        </Tag>
      ),
    },
    {
      title: '隐藏菜单',
      dataIndex: 'hideInMenu',
      key: 'hideInMenu',
      width: 100,
      render: (_, record) => (
        <Tag color={record.hideInMenu ? 'warning' : 'default'}>
          {record.hideInMenu ? '是' : '否'}
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
          <PermissionControl permission="menu:update">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setCurrentMenu(record);
                setModalVisible(true);
              }}
            >
              编辑
            </Button>
          </PermissionControl>
          <PermissionControl permission="menu:delete">
            <Popconfirm
              title="确定要删除这个菜单吗？"
              onConfirm={() => handleDelete(record.id!)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </PermissionControl>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      header={{
        title: '菜单管理',
        subTitle: '系统菜单配置和层级管理',
      }}
    >
      <ProTable<MenuTreeNode>
        actionRef={actionRef}
        rowKey="id"
        search={false}
        toolBarRender={() => [
          <PermissionControl permission="menu:create" key="create">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setCurrentMenu(undefined);
                setModalVisible(true);
              }}
            >
              新增菜单
            </Button>
          </PermissionControl>,
        ]}
        request={loadMenuData}
        columns={columns}
        pagination={false}
        expandable={{
          defaultExpandAllRows: true,
        }}
      />
      
      <MenuForm
        visible={modalVisible}
        current={currentMenu}
        onCancel={() => {
          setModalVisible(false);
          setCurrentMenu(undefined);
        }}
        onSuccess={() => {
          setModalVisible(false);
          setCurrentMenu(undefined);
          actionRef.current?.reload();
        }}
      />
    </PageContainer>
  );
};

export default MenuManagement;

