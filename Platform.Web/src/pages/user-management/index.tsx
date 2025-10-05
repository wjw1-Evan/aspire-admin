import React, { useRef, useState } from 'react';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  PageContainer,
  ProTable,
  ProCard,
} from '@ant-design/pro-components';
import {
  Button,
  Tag,
  Space,
  Popconfirm,
  message,
  Modal,
  Select,
  Switch,
  Drawer,
  Statistic,
  Row,
  Col,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { request } from '@umijs/max';
import type { AppUser, UserListRequest, UserStatisticsResponse } from './types';
import UserForm from './components/UserForm';
import UserDetail from './components/UserDetail';

const UserManagement: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [selectedRows, setSelectedRows] = useState<AppUser[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [viewingUser, setViewingUser] = useState<AppUser | null>(null);
  const [statistics, setStatistics] = useState<UserStatisticsResponse | null>(null);

  // 获取用户统计信息
  const fetchStatistics = async () => {
    try {
      const response = await request<{ success: boolean; data: UserStatisticsResponse }>('/api/user/statistics', {
        method: 'GET',
      });
      setStatistics(response.data);
    } catch (error) {
      console.error('获取统计信息失败:', error);
      message.error('获取统计信息失败');
    }
  };

  // 获取用户列表
  const fetchUsers = async (params: any) => {
    const requestData: UserListRequest = {
      Page: params.current || 1,
      PageSize: params.pageSize || 10,
      Search: params.search,
      Role: params.role,
      IsActive: params.isActive,
      SortBy: params.sortBy || 'CreatedAt',
      SortOrder: params.sortOrder || 'desc',
    };

    try {
      const response = await request<{ success: boolean; data: UserListResponse }>('/api/user/list', {
        method: 'POST',
        data: requestData,
      });

      return {
        data: response.data.users || [],
        success: true,
        total: response.data.total || 0,
      };
    } catch (error) {
      console.error('获取用户列表失败:', error);
      message.error('获取用户列表失败');
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  };

  // 删除用户
  const handleDelete = async (userId: string) => {
    try {
      await request(`/api/user/${userId}`, {
        method: 'DELETE',
      });
      message.success('删除成功');
      actionRef.current?.reload();
      fetchStatistics();
    } catch (error) {
      console.error('删除用户失败:', error);
      message.error('删除失败');
    }
  };

  // 批量操作
  const handleBulkAction = async (action: string) => {
    if (selectedRows.length === 0) {
      message.warning('请选择要操作的用户');
      return;
    }

    try {
      await request('/api/user/bulk-action', {
        method: 'POST',
        data: {
          UserIds: selectedRows.map(user => user.id),
          Action: action,
        },
      });

      const actionText = {
        activate: '启用',
        deactivate: '禁用',
        delete: '删除',
      }[action] || '操作';

      message.success(`批量${actionText}成功`);
      setSelectedRows([]);
      actionRef.current?.reload();
      fetchStatistics();
    } catch (error) {
      console.error('批量操作失败:', error);
      message.error('批量操作失败');
    }
  };

  // 切换用户状态
  const handleToggleStatus = async (user: AppUser) => {
    try {
      const endpoint = user.isActive ? 'deactivate' : 'activate';
      await request(`/api/user/${user.id}/${endpoint}`, {
        method: 'PUT',
      });

      message.success(`用户已${user.isActive ? '禁用' : '启用'}`);
      actionRef.current?.reload();
      fetchStatistics();
    } catch (error) {
      console.error('切换用户状态失败:', error);
      message.error('操作失败');
    }
  };

  // 更新用户角色
  const handleUpdateRole = async (userId: string, role: string) => {
    try {
      await request(`/api/user/${userId}/role`, {
        method: 'PUT',
        data: { Role: role },
      });

      message.success('角色更新成功');
      actionRef.current?.reload();
    } catch (error) {
      console.error('更新用户角色失败:', error);
      message.error('角色更新失败');
    }
  };

  // 表格列定义
  const columns: ProColumns<AppUser>[] = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120,
      render: (text, record) => (
        <Space>
          <UserOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 200,
      ellipsis: true,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'red' : 'blue'}>
          {role === 'admin' ? '管理员' : '普通用户'}
        </Tag>
      ),
      renderFormItem: (_, { record }) => (
        <Select
          defaultValue={record?.role}
          onChange={(value) => record?.id && handleUpdateRole(record.id, value)}
        >
          <Select.Option value="user">普通用户</Select.Option>
          <Select.Option value="admin">管理员</Select.Option>
        </Select>
      ),
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean, record) => (
        <Badge
          status={isActive ? 'success' : 'error'}
          text={isActive ? '启用' : '禁用'}
        />
      ),
      renderFormItem: (_, { record }) => (
        <Switch
          checked={record?.isActive}
          onChange={() => record && handleToggleStatus(record)}
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      valueType: 'dateTime',
      sorter: true,
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 180,
      valueType: 'dateTime',
      render: (text) => text || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => {
              setViewingUser(record);
              setDetailVisible(true);
            }}
          >
            查看
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingUser(record);
              setFormVisible(true);
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个用户吗？"
            onConfirm={() => record.id && handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  React.useEffect(() => {
    fetchStatistics();
  }, []);

  return (
    <PageContainer
      title="用户管理"
      extra={[
        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          onClick={() => {
            actionRef.current?.reload();
            fetchStatistics();
          }}
        >
          刷新
        </Button>,
        <Button
          key="add"
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingUser(null);
            setFormVisible(true);
          }}
        >
          新增用户
        </Button>,
      ]}
    >
      {/* 统计卡片 */}
      {statistics && (
        <ProCard style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="总用户数"
                value={statistics.totalUsers}
                prefix={<TeamOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="活跃用户"
                value={statistics.activeUsers}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="管理员"
                value={statistics.adminUsers}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#cf1322' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="本月新增"
                value={statistics.newUsersThisMonth}
                prefix={<PlusOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
          </Row>
        </ProCard>
      )}

      {/* 用户列表表格 */}
      <ProTable<AppUser>
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 'auto',
          defaultCollapsed: false,
        }}
        toolBarRender={() => [
          <Button
            key="activate"
            onClick={() => handleBulkAction('activate')}
            disabled={selectedRows.length === 0}
          >
            批量启用
          </Button>,
          <Button
            key="deactivate"
            onClick={() => handleBulkAction('deactivate')}
            disabled={selectedRows.length === 0}
          >
            批量禁用
          </Button>,
          <Button
            key="delete"
            danger
            onClick={() => handleBulkAction('delete')}
            disabled={selectedRows.length === 0}
          >
            批量删除
          </Button>,
        ]}
        request={fetchUsers}
        columns={columns}
        rowSelection={{
          onChange: (_, selectedRows) => {
            setSelectedRows(selectedRows);
          },
        }}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `第 ${range[0]}-${range[1]} 条/总共 ${total} 条`,
        }}
      />

      {/* 用户表单弹窗 */}
      <Modal
        title={editingUser ? '编辑用户' : '新增用户'}
        open={formVisible}
        onCancel={() => setFormVisible(false)}
        footer={null}
        width={600}
      >
        <UserForm
          user={editingUser}
          onSuccess={() => {
            setFormVisible(false);
            actionRef.current?.reload();
            fetchStatistics();
          }}
          onCancel={() => setFormVisible(false)}
        />
      </Modal>

      {/* 用户详情抽屉 */}
      <Drawer
        title="用户详情"
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={600}
      >
        {viewingUser && (
          <UserDetail
            user={viewingUser}
            onClose={() => setDetailVisible(false)}
          />
        )}
      </Drawer>
    </PageContainer>
  );
};

export default UserManagement;
