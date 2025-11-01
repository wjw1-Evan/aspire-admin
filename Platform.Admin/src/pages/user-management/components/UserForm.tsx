import React, { useEffect, useState } from 'react';
import { Form, Input, Select, Switch, Button, Space, message } from 'antd';
import { request } from '@umijs/max';
import { getAllRoles } from '@/services/role/api';
import type { ApiResponse } from '@/types/unified-api';
import type { AppUser, CreateUserRequest, UpdateUserRequest } from '../types';
import type { Role } from '@/services/role/types';

interface UserFormProps {
  user?: AppUser | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const UserForm: React.FC<UserFormProps> = ({ user, onSuccess, onCancel }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  const isEdit = !!user;

  // 加载角色列表
  useEffect(() => {
    const fetchRoles = async () => {
      setLoadingRoles(true);
      try {
        const response = await getAllRoles();
        if (response.success && response.data) {
          setRoles(response.data.roles.filter((r) => r.isActive));
        }
      } catch (error) {
        console.error('加载角色列表失败:', error);
        message.error('加载角色列表失败');
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
        roleIds: user.roleIds || [],
        isActive: user.isActive,
      });
    } else {
      form.resetFields();
    }
  }, [user, form]);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      if (isEdit) {
        // 更新用户（包含基本信息和角色）
        const updateData: UpdateUserRequest = {
          username: values.username,
          email: values.email,
          roleIds: values.roleIds || [],
          isActive: values.isActive,
        };

        const response = await request<ApiResponse<AppUser>>(
          `/api/user/${user.id}`,
          {
            method: 'PUT',
            data: updateData,
          },
        );

        if (response.success) {
          message.success('用户更新成功');
        } else {
          throw new Error(response.errorMessage || '更新失败');
        }
      } else {
        // 创建用户
        const createData: CreateUserRequest = {
          username: values.username,
          email: values.email,
          password: values.password,
          roleIds: values.roleIds || [],
          isActive: values.isActive,
        };

        const response = await request<ApiResponse<AppUser>>(
          '/api/user/management',
          {
            method: 'POST',
            data: createData,
          },
        );

        if (response.success) {
          message.success('用户创建成功');
        } else {
          throw new Error('创建失败');
        }
      }

      onSuccess();
    } catch (error: any) {
      console.error('用户操作失败:', error);
      message.error(error.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const validateUsername = async (_: any, value: string) => {
    if (!value) return Promise.resolve();

    try {
      const response = await request<ApiResponse<{ exists: boolean }>>(
        '/api/user/check-username',
        {
          method: 'GET',
          params: {
            username: value,
            excludeUserId: user?.id,
          },
        },
      );

      if (response.success && response.data?.exists) {
        return Promise.reject(new Error('用户名已存在'));
      }
      return Promise.resolve();
    } catch (error) {
      console.error('验证用户名失败:', error);
      return Promise.resolve();
    }
  };

  const validateEmail = async (_: any, value: string) => {
    if (!value) return Promise.resolve();

    try {
      const response = await request<ApiResponse<{ exists: boolean }>>(
        '/api/user/check-email',
        {
          method: 'GET',
          params: {
            email: value,
            excludeUserId: user?.id,
          },
        },
      );

      if (response.success && response.data?.exists) {
        return Promise.reject(new Error('邮箱已存在'));
      }
      return Promise.resolve();
    } catch (error) {
      console.error('验证邮箱失败:', error);
      return Promise.resolve();
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
      <Form.Item
        name="username"
        label="用户名"
        rules={[
          { required: true, message: '请输入用户名' },
          { min: 3, max: 20, message: '用户名长度为3-20个字符' },
          { pattern: /^\w+$/, message: '用户名只能包含字母、数字和下划线' },
          { validator: validateUsername },
        ]}
      >
        <Input placeholder="请输入用户名" />
      </Form.Item>

      <Form.Item
        name="email"
        label="邮箱"
        rules={[
          { type: 'email', message: '请输入有效的邮箱地址' },
          { validator: validateEmail },
        ]}
      >
        <Input placeholder="请输入邮箱地址" />
      </Form.Item>

      {!isEdit && (
        <Form.Item
          name="password"
          label="密码"
          rules={[
            { required: true, message: '请输入密码' },
            { min: 6, message: '密码长度至少6个字符' },
          ]}
        >
          <Input.Password placeholder="请输入密码" />
        </Form.Item>
      )}

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
          options={roles.map((role) => ({
            label: role.name,
            value: role.id!,
          }))}
        />
      </Form.Item>

      <Form.Item name="isActive" label="状态" valuePropName="checked">
        <Switch checkedChildren="启用" unCheckedChildren="禁用" />
      </Form.Item>

      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            {isEdit ? '更新' : '创建'}
          </Button>
          <Button onClick={onCancel}>取消</Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default UserForm;
