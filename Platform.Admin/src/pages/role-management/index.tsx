import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  ActionType,
  ProColumns,
} from '@ant-design/pro-components';
import {
  Button,
  message,
  Space,
  Tag,
  Modal,
  Input,
  Badge,
} from 'antd';
import React, { useRef, useState } from 'react';
import {
  getAllRolesWithStats,
  deleteRole,
} from '@/services/role/api';
import type { Role } from '@/services/role/types';
import RoleForm from './components/RoleForm';

const RoleManagement: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [modalVisible, setModalVisible] = useState(false);
  const [currentRole, setCurrentRole] = useState<Role | undefined>();

  /**
   * 加载角色数据（带统计信息）
   */
  const loadRoleData = async (params: any, sort?: Record<string, any>) => {
    try {
      const response = await getAllRolesWithStats();
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
   * 删除角色（带删除原因）
   */
  const handleDelete = async (id: string, roleName: string) => {
    let deleteReason = '';
    Modal.confirm({
      title: `确定要删除角色"${roleName}"吗？`,
      content: (
        <div>
          <p>删除角色将自动从所有用户的角色列表中移除此角色</p>
          <p>请输入删除原因：</p>
          <Input.TextArea
            rows={3}
            placeholder="请输入删除原因（选填）"
            onChange={(e) => {
              deleteReason = e.target.value;
            }}
            maxLength={200}
          />
        </div>
      ),
      okText: '确定删除',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          const response = await deleteRole(id, deleteReason);
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
  const columns: ProColumns<Role>[] = [
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record: any) => (
        <Space>
          {text}
          {record.userCount > 0 && (
            <Badge
              count={record.userCount}
              style={{ backgroundColor: '#52c41a' }}
              title={`${record.userCount} 个用户`}
            />
          )}
        </Space>
      ),
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
      title: '统计',
      key: 'stats',
      render: (_, record: any) => (
        <Space split="|">
          <span>用户: {record.userCount || 0}</span>
          <span>菜单: {record.menuCount || 0}</span>
        </Space>
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
      render: (_, record) => {
        return (
          <Space size="small">
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
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                handleDelete(record.id!, record.name);
              }}
            >
              删除
            </Button>
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
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setCurrentRole(undefined);
              setModalVisible(true);
            }}
          >
            新增角色
          </Button>,
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
    </PageContainer>
  );
};

export default RoleManagement;
