import React, { useEffect, useState } from 'react';
import { ModalForm, ProFormText, ProFormTextArea, ProFormSelect, ProFormDatePicker, ProFormDigit } from '@ant-design/pro-form';
import type { Dayjs } from 'dayjs';
import type { UserDto } from '@/types';
import {
  createProject,
  updateProject,
  type ProjectDto,
  type CreateProjectRequest,
  type UpdateProjectRequest,
  ProjectStatus,
  ProjectPriority,
} from '@/services/task/project';
import { getUserList } from '@/services/task/user';
import dayjs from 'dayjs';

interface ProjectFormProps {
  open?: boolean;
  project?: ProjectDto | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const ProjectForm: React.FC<ProjectFormProps> = ({ open, project, onSuccess, onCancel }) => {
  const isEditing = !!project;
  const [users, setUsers] = useState<UserDto[]>([]);
  const [userOptions, setUserOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await getUserList();
        if (response.success && response.data) {
          setUsers(response.data);
          setUserOptions(response.data.map(user => ({
            label: user.name || user.username || '',
            value: user.id
          })));
        }
      } catch (error) {
        console.error('获取用户列表失败:', error);
      }
    };

    fetchUsers();
  }, []);

  const handleSubmit = async (values: Record<string, any>) => {
    try {
      const requestData: CreateProjectRequest | UpdateProjectRequest = {
        ...(isEditing ? { projectId: project!.id! } : {}),
        name: values.name,
        description: values.description,
        status: values.status ?? ProjectStatus.Planning,
        startDate: values.startDate ? (dayjs.isDayjs(values.startDate) ? values.startDate.format('YYYY-MM-DD') : values.startDate) : undefined,
        endDate: values.endDate ? (dayjs.isDayjs(values.endDate) ? values.endDate.format('YYYY-MM-DD') : values.endDate) : undefined,
        managerId: values.managerId,
        budget: values.budget,
        priority: values.priority ?? ProjectPriority.Medium,
      };

      if (isEditing) {
        const response = await updateProject(project!.id!, requestData as UpdateProjectRequest);
        if (response.success) {
          onSuccess();
          return true;
        }
        return false;
      } else {
        const response = await createProject(requestData as CreateProjectRequest);
        if (response.success) {
          onSuccess();
          return true;
        }
        return false;
      }
    } catch (error) {
      console.error('保存项目失败:', error);
      return false;
    }
  };

  const initialValues = project ? {
    name: project.name,
    description: project.description,
    status: project.status,
    startDate: project.startDate ? dayjs(project.startDate) : undefined,
    endDate: project.endDate ? dayjs(project.endDate) : undefined,
    managerId: project.managerId,
    budget: project.budget,
    priority: project.priority,
  } : {
    status: ProjectStatus.Planning,
    priority: ProjectPriority.Medium,
  };

  return (
    <ModalForm
      title={isEditing ? '编辑项目' : '创建项目'}
      open={open}
      onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}
      onFinish={handleSubmit}
      initialValues={initialValues}
      autoFocusFirstInput
      width={600}
    >
      <ProFormText
        name="name"
        label="项目名称"
        placeholder="请输入项目名称"
        rules={[{ required: true, message: '请输入项目名称' }]}
      />

      <ProFormTextArea
        name="description"
        label="项目描述"
        placeholder="请输入项目描述"
        fieldProps={{ rows: 4 }}
      />

      <ProFormSelect
        name="status"
        label="项目状态"
        options={[
          { label: '规划中', value: ProjectStatus.Planning },
          { label: '进行中', value: ProjectStatus.InProgress },
          { label: '暂停', value: ProjectStatus.OnHold },
          { label: '已完成', value: ProjectStatus.Completed },
          { label: '已取消', value: ProjectStatus.Cancelled },
        ]}
      />

       <ProFormSelect
        name="priority"
        label="优先级"
        options={[
          { label: '低', value: ProjectPriority.Low },
          { label: '中', value: ProjectPriority.Medium },
          { label: '高', value: ProjectPriority.High },
        ]}
      />

      <ProFormSelect
        name="managerId"
        label="项目经理"
        placeholder="请选择项目经理"
        options={userOptions}
        fieldProps={{ allowClear: true }}
      />

      <ProFormDatePicker
        name="startDate"
        label="开始日期"
        fieldProps={{ style: { width: '100%' } }}
      />

      <ProFormDatePicker
        name="endDate"
        label="结束日期"
        fieldProps={{ style: { width: '100%' } }}
      />

      <ProFormDigit
        name="budget"
        label="预算"
        placeholder="请输入预算"
        min={0}
        fieldProps={{ precision: 2, style: { width: '100%' } }}
      />
    </ModalForm>
  );
};

export default ProjectForm;
