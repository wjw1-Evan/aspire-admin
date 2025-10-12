import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import * as Icons from '@ant-design/icons';
import { PageContainer, ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Space, Tag, Modal, Input } from 'antd';
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
   * 删除菜单（带删除原因和级联提示）
   */
  const handleDelete = async (id: string, menuName: string) => {
    let deleteReason = '';
    Modal.confirm({
      title: `确定要删除菜单"${menuName}"吗？`,
      content: (
        <div>
          <p style={{ color: '#ff4d4f' }}>
            删除菜单将自动从所有角色的菜单列表中移除此菜单
          </p>
          <p style={{ color: '#ff4d4f' }}>
            如果有子菜单，必须先删除所有子菜单
          </p>
          <p>请输入删除原因：</p>
          <Input.TextArea
            rows={3}
            placeholder="请输入删除原因（选填）"
            onChange={(e) => { deleteReason = e.target.value; }}
            maxLength={200}
          />
        </div>
      ),
      okText: '确定删除',
      cancelText: '取消',
      okType: 'danger',
      width: 520,
      onOk: async () => {
        try {
          const response = await deleteMenu(id, deleteReason);
          if (response.success) {
            message.success('删除成功');
            actionRef.current?.reload();
          } else {
            message.error(response.errorMessage || '删除失败');
          }
        } catch (error: any) {
          message.error(error.message || '删除失败');
        }
      },
    });
  };

  /**
   * 表格列定义
   */
  const columns: ProColumns<MenuTreeNode>[] = [
    {
      title: '菜单名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '路径',
      dataIndex: 'path',
      key: 'path',
    },
    {
      title: '图标',
      dataIndex: 'icon',
      key: 'icon',
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
      ellipsis: true,
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
    },
    {
      title: '状态',
      dataIndex: 'isEnabled',
      key: 'isEnabled',
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
            <Button 
              type="link" 
              size="small" 
              danger 
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id!, record.name)}
            >
              删除
            </Button>
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

