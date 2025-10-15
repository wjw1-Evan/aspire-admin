import React, { useMemo } from 'react';
import { Form, Input, Select, DatePicker, Button, Space, Card } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import type { Role } from '@/services/role/api';

const { RangePicker } = DatePicker;

interface UserSearchFormProps {
  /** 角色列表 */
  readonly roles: Role[];
  /** 搜索提交回调 */
  readonly onSearch: (values: any) => void;
  /** 重置回调 */
  readonly onReset: () => void;
  /** 加载状态 */
  readonly loading?: boolean;
}

/**
 * 用户搜索表单组件
 * 
 * 支持按用户名、邮箱、角色、状态、创建时间等条件搜索
 */
const UserSearchForm: React.FC<UserSearchFormProps> = ({
  roles,
  onSearch,
  onReset,
  loading,
}) => {
  const [form] = Form.useForm();

  // 缓存角色选项
  const roleOptions = useMemo(
    () =>
      roles.map((role) => ({
        label: role.name,
        value: role.id,
      })),
    [roles],
  );

  const handleReset = () => {
    form.resetFields();
    onReset();
  };

  return (
    <Card style={{ marginBottom: 16 }}>
      <Form form={form} onFinish={onSearch} layout="inline">
        <Form.Item name="search" label="搜索">
          <Input placeholder="用户名或邮箱" style={{ width: 200 }} allowClear />
        </Form.Item>

        <Form.Item name="roleIds" label="角色">
          <Select
            mode="multiple"
            placeholder="选择角色"
            style={{ width: 200 }}
            options={roleOptions}
            allowClear
            maxTagCount="responsive"
          />
        </Form.Item>

        <Form.Item name="dateRange" label="创建时间">
          <RangePicker format="YYYY-MM-DD" />
        </Form.Item>

        <Form.Item name="isActive" label="状态">
          <Select placeholder="全部" style={{ width: 120 }} allowClear>
            <Select.Option value={true}>启用</Select.Option>
            <Select.Option value={false}>禁用</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={loading}>
              搜索
            </Button>
            <Button onClick={handleReset} icon={<ReloadOutlined />}>
              重置
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default React.memo(UserSearchForm);






