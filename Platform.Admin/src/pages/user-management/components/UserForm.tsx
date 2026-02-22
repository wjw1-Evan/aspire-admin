import React, { useEffect, useState } from 'react';
import { Form, Input, Select, Switch, Button, Space, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { request, useIntl } from '@umijs/max';
import { getAllRoles } from '@/services/role/api';
import type { ApiResponse } from '@/types/unified-api';
import type { AppUser, CreateUserRequest, UpdateUserRequest, UserListResponse } from '../types';
import type { Role } from '@/services/role/types';

interface UserFormProps {
  user?: AppUser | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const UserForm: React.FC<UserFormProps> = ({ user, onSuccess, onCancel }) => {
  const intl = useIntl();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [userOptions, setUserOptions] = useState<AppUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

  const isEdit = !!user;

  const roleOptions = roles
    .filter((role): role is Role & { id: string } => Boolean(role.id))
    .map((role) => ({
      label: role.name,
      value: role.id,
    }));

  // 加载角色列表
  useEffect(() => {
    const fetchRoles = async () => {
      setLoadingRoles(true);
      try {
        const response = await getAllRoles();
        if (response.success && response.data) {
          setRoles(response.data.roles.filter((r) => r.isActive));
        }
        // 错误由全局错误处理统一处理
      } finally {
        setLoadingRoles(false);
      }
    };
    fetchRoles();
  }, []);

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        roleIds: user.roleIds || [],
        isActive: user.isActive,
        remark: user.remark,
      });
      setSelectedUser(user);
    } else {
      form.resetFields();
      setSelectedUser(null);
    }
  }, [user, form]);

  const handleUserSearch = async (value: string) => {
    if (!value || value.length < 2) {
      setUserOptions([]);
      return;
    }
    setSearchingUsers(true);
    try {
      // 使用更全局的用户搜索接口
      const response = await request<ApiResponse<UserListResponse>>('/api/users/all', {
        method: 'GET',
        params: { search: value },
      });
      if (response.success && response.data) {
        const users = response.data.users || [];
        setUserOptions(users);
      }
    } catch (error) {
      console.error('搜索用户失败:', error);
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleUserSelect = (username: string, option: any) => {
    const u = option.user;
    setSelectedUser(u);
    form.setFieldsValue({
      email: u.email,
      phoneNumber: u.phoneNumber,
    });
  };

  const handleUserChange = (value: string) => {
    if (!value) {
      setSelectedUser(null);
      form.setFieldsValue({
        email: undefined,
        phoneNumber: undefined,
      });
    }
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      if (isEdit) {
        // 更新用户（包含基本信息和角色）
        const updateData: UpdateUserRequest = {
          username: values.username,
          email: values.email,
          phoneNumber: values.phoneNumber || undefined,
          roleIds: values.roleIds || [],
          isActive: values.isActive,
          remark: values.remark,
        };

        const response = await request<ApiResponse<AppUser>>(
          `/api/users/${user.id}`,
          {
            method: 'PUT',
            data: updateData,
          },
        );

        if (!response.success) {
          console.error('Update user failed:', response);
          throw new Error(response.message || intl.formatMessage({ id: 'pages.message.updateFailed' }));
        }
        // 成功提示由 onSuccess 回调处理
      } else {
        // 创建用户
        const createData: CreateUserRequest = {
          username: values.username,
          email: values.email,
          phoneNumber: values.phoneNumber || undefined,
          password: values.password,
          roleIds: values.roleIds || [],
          isActive: values.isActive,
          remark: values.remark,
        };

        const response = await request<ApiResponse<AppUser>>(
          '/api/users/management',
          {
            method: 'POST',
            data: createData,
          },
        );

        if (!response.success) {
          throw new Error(response.message || intl.formatMessage({ id: 'pages.message.createFailed' }));
        }
        // 成功提示由 onSuccess 回调处理
      }

      onSuccess();
      // 错误由全局错误处理统一处理，这里不需要 catch
    } finally {
      setLoading(false);
    }
  };


  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        isActive: true,
      }}
    >
      {!isEdit && (
        <>
          <Form.Item
            name="username"
            label="选择用户"
            tooltip={!isEdit ? "请通过用户名搜索并添加系统中已存在的用户" : undefined}
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, max: 20, message: '用户名长度为3-20个字符' },
              { pattern: /^\w+$/, message: '用户名只能包含字母、数字和下划线' },
            ]}
          >
            <Select
              showSearch
              placeholder="搜索系统已有用户"
              onSearch={handleUserSearch}
              onSelect={handleUserSelect}
              onChange={handleUserChange}
              filterOption={false}
              allowClear
              suffixIcon={<SearchOutlined />}
              notFoundContent={searchingUsers ? <Spin size="small" /> : '未找到相关用户'}
            >
              {userOptions.map((u) => (
                <Select.Option key={u.id} value={u.username} user={u}>
                  <Space>
                    <span>{u.username}</span>
                    <span style={{ color: '#aaa', fontSize: '12px' }}>
                      {u.email ? `(${u.email})` : (u.phoneNumber ? `(${u.phoneNumber})` : '')}
                    </span>
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </>
      )}



      <Form.Item
        name="remark"
        label="备注"
        rules={[{ max: 200, message: '备注最多200个字符' }]}
      >
        <Input.TextArea placeholder="请输入备注（选填）" rows={3} maxLength={200} showCount />
      </Form.Item>

      <Form.Item
        name="roleIds"
        label="角色"
        rules={[{ required: true, message: '请选择至少一个角色' }]}
        tooltip="从角色管理系统中选择角色，支持多选"
      >
        <Select
          mode="multiple"
          placeholder="请选择角色"
          loading={loadingRoles}
          allowClear
          showSearch
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={roleOptions}
        />
      </Form.Item>

      <Form.Item name="isActive" label="状态" valuePropName="checked">
        <Switch checkedChildren="启用" unCheckedChildren="禁用" />
      </Form.Item>

      <Form.Item>
        <Space>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            disabled={!isEdit && !selectedUser}
          >
            {isEdit ? '更新' : '添加成员'}
          </Button>
          <Button onClick={onCancel}>取消</Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default UserForm;
