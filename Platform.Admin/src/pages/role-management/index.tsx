import { PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined, MoreOutlined, KeyOutlined } from '@ant-design/icons';
import { PageContainer, ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Space, Tag, Dropdown, Modal } from 'antd';
import type { MenuProps } from 'antd';
import React, { useRef, useState } from 'react';
import { getAllRoles, deleteRole } from '@/services/role/api';
import type { Role } from '@/services/role/types';
import RoleForm from './components/RoleForm';
import MenuPermissionModal from './components/MenuPermissionModal';
import PermissionConfigModal from './components/PermissionConfigModal';
import PermissionControl from '@/components/PermissionControl';

const RoleManagement: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [modalVisible, setModalVisible] = useState(false);
  const [menuPermissionModalVisible, setMenuPermissionModalVisible] = useState(false);
  const [operationPermissionModalVisible, setOperationPermissionModalVisible] = useState(false);
  const [currentRole, setCurrentRole] = useState<Role | undefined>();

  /**
   * 加载角色数据
   */
  const loadRoleData = async () => {
    try {
      const response = await getAllRoles();
      if (response.success && response.data) {
        return {
          data: response.data.roles,
          total: response.data.total,
          success: true,
        };
      }
      return {
        data: [],
        total: 0,
        success: false,
      };
    } catch (error) {
      message.error('加载角色失败');
      return {
        data: [],
        total: 0,
        success: false,
      };
    }
  };

  /**
   * 删除角色
   */
  const handleDelete = async (id: string) => {
    try {
      const response = await deleteRole(id);
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
  const columns: ProColumns<Role>[] = [
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (_, record) => (
        <Tag color={record.isActive ? 'success' : 'default'}>
          {record.isActive ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      valueType: 'dateTime',
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 180,
      render: (_, record) => {
        const moreItems: MenuProps['items'] = [
          {
            key: 'menu-permission',
            icon: <SettingOutlined />,
            label: '菜单权限',
            onClick: () => {
              setCurrentRole(record);
              setMenuPermissionModalVisible(true);
            },
          },
          {
            key: 'operation-permission',
            icon: <KeyOutlined />,
            label: '操作权限',
            onClick: () => {
              setCurrentRole(record);
              setOperationPermissionModalVisible(true);
            },
          },
          {
            type: 'divider',
          },
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: '删除',
            danger: true,
            onClick: () => {
              Modal.confirm({
                title: '确定要删除这个角色吗？',
                content: '删除后，已分配此角色的用户将受到影响。',
                okText: '确定',
                cancelText: '取消',
                okType: 'danger',
                onOk: () => handleDelete(record.id!),
              });
            },
          },
        ];

        return (
          <Space size="small">
            <PermissionControl permission="role:update">
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  setCurrentRole(record);
                  setModalVisible(true);
                }}
              >
                编辑
              </Button>
            </PermissionControl>
            <Dropdown menu={{ items: moreItems }} trigger={['click']}>
              <Button type="link" size="small" icon={<MoreOutlined />}>
                更多
              </Button>
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  return (
    <PageContainer
      header={{
        title: '角色管理',
        subTitle: '系统角色配置和权限管理',
      }}
    >
      <ProTable<Role>
        actionRef={actionRef}
        rowKey="id"
        search={false}
        toolBarRender={() => [
          <PermissionControl permission="role:create" key="create">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setCurrentRole(undefined);
                setModalVisible(true);
              }}
            >
              新增角色
            </Button>
          </PermissionControl>,
        ]}
        request={loadRoleData}
        columns={columns}
      />
      
      <RoleForm
        visible={modalVisible}
        current={currentRole}
        onCancel={() => {
          setModalVisible(false);
          setCurrentRole(undefined);
        }}
        onSuccess={() => {
          setModalVisible(false);
          setCurrentRole(undefined);
          actionRef.current?.reload();
        }}
      />

      <MenuPermissionModal
        visible={menuPermissionModalVisible}
        role={currentRole}
        onCancel={() => {
          setMenuPermissionModalVisible(false);
          setCurrentRole(undefined);
        }}
        onSuccess={() => {
          setMenuPermissionModalVisible(false);
          setCurrentRole(undefined);
          message.success('菜单权限分配成功');
        }}
      />

      <PermissionConfigModal
        visible={operationPermissionModalVisible}
        role={currentRole}
        onCancel={() => {
          setOperationPermissionModalVisible(false);
          setCurrentRole(undefined);
        }}
        onSuccess={() => {
          setOperationPermissionModalVisible(false);
          setCurrentRole(undefined);
          message.success('操作权限分配成功');
          actionRef.current?.reload();
        }}
      />
    </PageContainer>
  );
};

export default RoleManagement;

