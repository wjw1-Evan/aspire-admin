import React, { useEffect, useState } from 'react';
import { useIntl } from '@umijs/max';
import { ModalForm, ProFormText, ProFormTextArea, ProFormSelect, ProFormDatePicker, ProFormDigit } from '@ant-design/pro-components/es/form';
import type { Dayjs } from 'dayjs';
import type { AppUser } from '@/services/user/api';
import {
  createProject,
  updateProject,
  type ProjectDto,
  type CreateProjectRequest,
  type UpdateProjectRequest,
  ProjectStatus,
  ProjectPriority,
} from '@/services/task/project';
import { getUserList } from '@/services/user/api';
import dayjs from 'dayjs';

interface ProjectFormProps {
  open?: boolean;
  project?: ProjectDto | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const ProjectForm: React.FC<ProjectFormProps> = ({ open, project, onSuccess, onCancel }) => {
  const intl = useIntl();
  const isEditing = !!project;
  const [users, setUsers] = useState<AppUser[]>([]);
  const [userOptions, setUserOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await getUserList({});
        if (response.success && response.data && response.data.queryable) {
          const userList = response.data.queryable;
          setUsers(userList);
          setUserOptions(userList.map((user: AppUser) => ({
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
        memberIds: values.memberIds,
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
    memberIds: project.memberIds,
    budget: project.budget,
    priority: project.priority,
  } : {
    status: ProjectStatus.Planning,
    priority: ProjectPriority.Medium,
  };

  return (
    <ModalForm
      title={isEditing ? intl.formatMessage({ id: 'pages.task.project.editTitle' }) : intl.formatMessage({ id: 'pages.task.project.createTitle' })}
      open={open}
      onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}
      onFinish={handleSubmit}
      initialValues={initialValues}
      autoFocusFirstInput
      width={600}
    >
      <ProFormText
        name="name"
        label={intl.formatMessage({ id: 'pages.task.project.name' })}
        placeholder={intl.formatMessage({ id: 'pages.task.project.namePlaceholder' })}
        rules={[{ required: true, message: intl.formatMessage({ id: 'pages.task.project.nameRequired' }) }]}
      />

      <ProFormTextArea
        name="description"
        label={intl.formatMessage({ id: 'pages.task.project.description' })}
        placeholder={intl.formatMessage({ id: 'pages.task.project.descriptionPlaceholder' })}
        fieldProps={{ rows: 4 }}
      />

      <ProFormSelect
        name="status"
        label={intl.formatMessage({ id: 'pages.task.project.status' })}
        options={[
          { label: intl.formatMessage({ id: 'pages.task.project.planning' }), value: ProjectStatus.Planning },
          { label: intl.formatMessage({ id: 'pages.task.project.active' }), value: ProjectStatus.InProgress },
          { label: intl.formatMessage({ id: 'pages.task.project.paused' }), value: ProjectStatus.OnHold },
          { label: intl.formatMessage({ id: 'pages.task.project.completed' }), value: ProjectStatus.Completed },
          { label: intl.formatMessage({ id: 'pages.task.project.cancelled' }), value: ProjectStatus.Cancelled },
        ]}
      />

      <ProFormSelect
        name="priority"
        label={intl.formatMessage({ id: 'pages.task.priority.label' })}
        options={[
          { label: intl.formatMessage({ id: 'pages.task.priority.low' }), value: ProjectPriority.Low },
          { label: intl.formatMessage({ id: 'pages.task.priority.medium' }), value: ProjectPriority.Medium },
          { label: intl.formatMessage({ id: 'pages.task.priority.high' }), value: ProjectPriority.High },
        ]}
      />

      <ProFormSelect
        name="memberIds"
        label={intl.formatMessage({ id: 'pages.task.project.members' })}
        placeholder={intl.formatMessage({ id: 'pages.task.project.selectMembers' })}
        options={userOptions}
        fieldProps={{ allowClear: true, mode: 'multiple', placeholder: intl.formatMessage({ id: 'pages.task.project.selectMembers' }) }}
      />

      <ProFormDatePicker
        name="startDate"
        label={intl.formatMessage({ id: 'pages.task.project.startDate' })}
        fieldProps={{ style: { width: '100%' } }}
      />

      <ProFormDatePicker
        name="endDate"
        label={intl.formatMessage({ id: 'pages.task.project.endDate' })}
        fieldProps={{ style: { width: '100%' } }}
      />

      <ProFormDigit
        name="budget"
        label={intl.formatMessage({ id: 'pages.task.project.budget' })}
        placeholder={intl.formatMessage({ id: 'pages.task.project.budgetPlaceholder' })}
        min={0}
        fieldProps={{ precision: 2, style: { width: '100%' } }}
      />
    </ModalForm>
  );
};

export default ProjectForm;
