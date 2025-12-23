import React, { useEffect } from 'react';
import { Form, Input, Select, DatePicker, InputNumber, Button, Space } from 'antd';
import {
  createProject,
  updateProject,
  type ProjectDto,
  type CreateProjectRequest,
  type UpdateProjectRequest,
  ProjectStatus,
  ProjectPriority,
} from '@/services/task/project';
import dayjs from 'dayjs';

interface ProjectFormProps {
  project?: ProjectDto | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const ProjectForm: React.FC<ProjectFormProps> = ({ project, onSuccess, onCancel }) => {
  const [form] = Form.useForm();
  const isEditing = !!project;

  useEffect(() => {
    if (project) {
      form.setFieldsValue({
        name: project.name,
        description: project.description,
        status: project.status,
        startDate: project.startDate ? dayjs(project.startDate) : undefined,
        endDate: project.endDate ? dayjs(project.endDate) : undefined,
        managerId: project.managerId,
        budget: project.budget,
        priority: project.priority,
      });
    }
  }, [project, form]);

  const handleSubmit = async (values: any) => {
    try {
      const requestData: CreateProjectRequest | UpdateProjectRequest = {
        ...(isEditing ? { projectId: project!.id! } : {}),
        name: values.name,
        description: values.description,
        status: values.status ?? ProjectStatus.Planning,
        startDate: values.startDate?.format('YYYY-MM-DD'),
        endDate: values.endDate?.format('YYYY-MM-DD'),
        managerId: values.managerId,
        budget: values.budget,
        priority: values.priority ?? ProjectPriority.Medium,
      };

      if (isEditing) {
        const response = await updateProject(project!.id!, requestData as UpdateProjectRequest);
        if (response.success) {
          onSuccess();
        } else {
          console.error('更新项目失败:', response.errorMessage);
        }
      } else {
        const response = await createProject(requestData as CreateProjectRequest);
        if (response.success) {
          onSuccess();
        } else {
          console.error('创建项目失败:', response.errorMessage);
        }
      }
    } catch (error) {
      console.error('保存项目失败:', error);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        status: ProjectStatus.Planning,
        priority: ProjectPriority.Medium,
      }}
    >
      <Form.Item
        name="name"
        label="项目名称"
        rules={[{ required: true, message: '请输入项目名称' }]}
      >
        <Input placeholder="请输入项目名称" />
      </Form.Item>

      <Form.Item name="description" label="项目描述">
        <Input.TextArea rows={4} placeholder="请输入项目描述" />
      </Form.Item>

      <Form.Item name="status" label="项目状态">
        <Select>
          <Select.Option value={ProjectStatus.Planning}>规划中</Select.Option>
          <Select.Option value={ProjectStatus.InProgress}>进行中</Select.Option>
          <Select.Option value={ProjectStatus.OnHold}>暂停</Select.Option>
          <Select.Option value={ProjectStatus.Completed}>已完成</Select.Option>
          <Select.Option value={ProjectStatus.Cancelled}>已取消</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item name="priority" label="优先级">
        <Select>
          <Select.Option value={ProjectPriority.Low}>低</Select.Option>
          <Select.Option value={ProjectPriority.Medium}>中</Select.Option>
          <Select.Option value={ProjectPriority.High}>高</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item name="startDate" label="开始日期">
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item name="endDate" label="结束日期">
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item name="budget" label="预算">
        <InputNumber
          style={{ width: '100%' }}
          placeholder="请输入预算"
          min={0}
          precision={2}
        />
      </Form.Item>

      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit">
            {isEditing ? '更新' : '创建'}
          </Button>
          <Button onClick={onCancel}>取消</Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default ProjectForm;
