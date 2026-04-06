import React from 'react';
import { ModalForm, ProFormSelect, ProFormDigit } from '@ant-design/pro-form';
import {
  addProjectMember,
  type AddProjectMemberRequest,
  ProjectMemberRole,
} from '@/services/task/project';
import type { AppUser } from '@/services/user/api';
import type { ProjectMemberDto } from '@/services/task/project';

interface ProjectMemberFormProps {
  open?: boolean;
  projectId: string;
  existingMembers: ProjectMemberDto[];
  availableUsers: AppUser[];
  onSuccess: () => void;
  onCancel: () => void;
}

const ProjectMemberForm: React.FC<ProjectMemberFormProps> = ({
  open,
  projectId,
  existingMembers,
  availableUsers,
  onSuccess,
  onCancel,
}) => {
  const handleSubmit = async (values: Record<string, any>) => {
    try {
      const request: AddProjectMemberRequest = {
        projectId,
        userId: values.userId,
        role: values.role ?? ProjectMemberRole.Member,
        allocation: values.allocation ?? 100,
      };

      await addProjectMember(projectId, request);
      onSuccess();
      return true;
    } catch (error) {
      console.error('添加成员失败:', error);
      return false;
    }
  };

  const existingUserIds = new Set(existingMembers.map((m) => m.userId));
  const availableUserOptions = availableUsers
    .filter((user) => !existingUserIds.has(user.id))
    .map((user) => ({
      label: `${user.username}${user.email ? ` (${user.email})` : ''}`,
      value: user.id,
    }));

  return (
    <ModalForm
      title="添加项目成员"
      open={open}
      onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}
      onFinish={handleSubmit}
      autoFocusFirstInput
      width={500}
    >
      <ProFormSelect
        name="userId"
        label="用户"
        placeholder="请选择用户"
        showSearch
        options={availableUserOptions}
        fieldProps={{
          filterOption: (input, option) =>
            (option?.label as string)?.toLowerCase().includes(input.toLowerCase()),
        }}
        rules={[{ required: true, message: '请选择用户' }]}
      />

      <ProFormSelect
        name="role"
        label="角色"
        initialValue={ProjectMemberRole.Member}
        options={[
          { label: '项目经理', value: ProjectMemberRole.Manager },
          { label: '成员', value: ProjectMemberRole.Member },
          { label: '查看者', value: ProjectMemberRole.Viewer },
        ]}
      />

      <ProFormDigit
        name="allocation"
        label="资源分配 (%)"
        initialValue={100}
        min={0}
        max={100}
        placeholder="请输入资源分配百分比"
        rules={[
          { required: true, message: '请输入资源分配' },
          { type: 'number', min: 0, max: 100, message: '资源分配必须在 0-100 之间' },
        ]}
        fieldProps={{ style: { width: '100%' } }}
      />
    </ModalForm>
  );
};

export default ProjectMemberForm;
