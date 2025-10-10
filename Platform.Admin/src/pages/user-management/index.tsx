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
  Form,
  Input,
  Card,
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
import { getAllRoles } from '@/services/role/api';
import type { AppUser, UserListRequest, UserStatisticsResponse } from './types';
import UserForm from './components/UserForm';
import UserDetail from './components/UserDetail';

const UserManagement: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [searchForm] = Form.useForm();
  const [selectedRows, setSelectedRows] = useState<AppUser[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [viewingUser, setViewingUser] = useState<AppUser | null>(null);
  const [statistics, setStatistics] = useState<UserStatisticsResponse | null>(null);
  const [roleMap, setRoleMap] = useState<Record<string, string>>({});
  const [searchParams, setSearchParams] = useState<UserListRequest>({
    Page: 1,
    PageSize: 10,
    SortBy: 'CreatedAt',
    SortOrder: 'desc',
  });

  // 加载角色列表
  React.useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await getAllRoles();
        if (response.success && response.data) {
          // 创建角色 ID 到名称的映射
          const map: Record<string, string> = {};
          response.data.roles.forEach(role => {
            if (role.id) {
              map[role.id] = role.name;
            }
          });
          setRoleMap(map);
        }
      } catch (error) {
        console.error('加载角色列表失败:', error);
      }
    };
    fetchRoles();
  }, []);

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
    console.log('fetchUsers 被调用，参数:', params);
    console.log('当前搜索参数:', searchParams);
    
    const requestData: UserListRequest = {
      Page: params.current || searchParams.Page,
      PageSize: params.pageSize || searchParams.PageSize,
      Search: searchParams.Search,
      Role: searchParams.Role,
      IsActive: searchParams.IsActive,
      SortBy: params.sortBy || searchParams.SortBy,
      SortOrder: params.sortOrder || searchParams.SortOrder,
    };

    console.log('发送请求数据:', requestData);

    try {
      const response = await request<{ success: boolean; data: any }>('/api/user/list', {
        method: 'POST',
        data: requestData,
      });

      console.log('API响应:', response);

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

  // 处理搜索
  const handleSearch = (values: any) => {
    console.log('搜索表单提交:', values);
    const newSearchParams: UserListRequest = {
      Page: 1,
      PageSize: searchParams.PageSize,
      Search: values.search,
      Role: values.role,
      IsActive: values.isActive,
      SortBy: searchParams.SortBy,
      SortOrder: searchParams.SortOrder,
    };
    setSearchParams(newSearchParams);
    actionRef.current?.reload();
  };

  // 重置搜索
  const handleReset = () => {
    searchForm.resetFields();
    const resetParams: UserListRequest = {
      Page: 1,
      PageSize: searchParams.PageSize,
      SortBy: 'CreatedAt',
      SortOrder: 'desc',
    };
    setSearchParams(resetParams);
    actionRef.current?.reload();
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
      dataIndex: 'roleIds',
      key: 'roleIds',
      width: 200,
      render: (_, record) => {
        if (!record.roleIds || record.roleIds.length === 0) {
          return <Tag color="default">未分配</Tag>;
        }
        return (
          <Space wrap>
            {record.roleIds.map(roleId => (
              <Tag key={roleId} color="blue">
                {roleMap[roleId] || roleId}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (_, record) => (
        <Badge
          status={record.isActive ? 'success' : 'error'}
          text={record.isActive ? '启用' : '禁用'}
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

      {/* 搜索表单 */}
      <Card style={{ marginBottom: 16 }}>
        <Form
          form={searchForm}
          layout="inline"
          onFinish={handleSearch}
          style={{ marginBottom: 16 }}
        >
          <Form.Item name="search" label="搜索">
            <Input placeholder="用户名或邮箱" style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="role" label="角色">
            <Select placeholder="选择角色" style={{ width: 120 }} allowClear>
              <Select.Option value="user">普通用户</Select.Option>
              <Select.Option value="admin">管理员</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="isActive" label="状态">
            <Select placeholder="选择状态" style={{ width: 120 }} allowClear>
              <Select.Option value={true}>启用</Select.Option>
              <Select.Option value={false}>禁用</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                查询
              </Button>
              <Button onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* 用户列表表格 */}
      <ProTable<AppUser>
        actionRef={actionRef}
        rowKey="id"
        search={false}
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
