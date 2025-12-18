import React from 'react';
import { Form, Select, InputNumber, Button, Space } from 'antd';
import {
  addProjectMember,
  type AddProjectMemberRequest,
  ProjectMemberRole,
} from '@/services/task/project';
import type { AppUser } from '@/services/user/api';
import type { ProjectMemberDto } from '@/services/task/project';

interface ProjectMemberFormProps {
  projectId: string;
  existingMembers: ProjectMemberDto[];
  availableUsers: AppUser[];
  onSuccess: () => void;
  onCancel: () => void;
}

const ProjectMemberForm: React.FC<ProjectMemberFormProps> = ({
  projectId,
  existingMembers,
  availableUsers,
  onSuccess,
  onCancel,
}) => {
  const [form] = Form.useForm();

  const handleSubmit = async (values: any) => {
    try {
      const request: AddProjectMemberRequest = {
        projectId,
        userId: values.userId,
        role: values.role ?? ProjectMemberRole.Member,
        allocation: values.allocation ?? 100,
      };

      await addProjectMember(projectId, request);
      onSuccess();
    } catch (error) {
      console.error('添加成员失败:', error);
    }
  };

  // 过滤掉已经是成员的用户
  const existingUserIds = new Set(existingMembers.map((m) => m.userId));
  const availableUserOptions = availableUsers
    .filter((user) => !existingUserIds.has(user.id))
    .map((user) => ({
      label: `${user.username}${user.email ? ` (${user.email})` : ''}`,
      value: user.id,
    }));

  return (
    <Form form={form} layout="vertical" onFinish={handleSubmit}>
      <Form.Item
        name="userId"
        label="用户"
        rules={[{ required: true, message: '请选择用户' }]}
      >
        <Select
          placeholder="请选择用户"
          options={availableUserOptions}
          showSearch
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
        />
      </Form.Item>

      <Form.Item
        name="role"
        label="角色"
        initialValue={ProjectMemberRole.Member}
      >
        <Select>
          <Select.Option value={ProjectMemberRole.Manager}>项目经理</Select.Option>
          <Select.Option value={ProjectMemberRole.Member}>成员</Select.Option>
          <Select.Option value={ProjectMemberRole.Viewer}>查看者</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="allocation"
        label="资源分配 (%)"
        initialValue={100}
        rules={[
          { required: true, message: '请输入资源分配' },
          { type: 'number', min: 0, max: 100, message: '资源分配必须在 0-100 之间' },
        ]}
      >
        <InputNumber
          style={{ width: '100%' }}
          min={0}
          max={100}
          placeholder="请输入资源分配百分比"
        />
      </Form.Item>

      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit">
            添加
          </Button>
          <Button onClick={onCancel}>取消</Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default ProjectMemberForm;
