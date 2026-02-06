import React, { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Tag,
  message,
  Spin,
  Row,
  Col,
} from 'antd';
import dayjs from 'dayjs';
import { createTask, updateTask, TaskPriority, type TaskDto } from '@/services/task/api';
import { getUserList } from '@/services/user/api';
import type { AppUser } from '@/services/user/api';
import { getProjectList, type ProjectDto } from '@/services/task/project';
import { getTaskTree } from '@/services/task/api';

interface TaskFormProps {
  open?: boolean;
  task?: TaskDto | null;
  onClose?: () => void;
  onSuccess?: () => void;
  onCancel?: () => void;
  projectId?: string;
  parentTaskId?: string;
}

const TaskForm: React.FC<TaskFormProps> = ({
  open = false,
  task,
  onClose,
  onSuccess,
  onCancel,
  projectId,
  parentTaskId,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);
  const [users, setUsers] = React.useState<AppUser[]>([]);
  const [usersLoading, setUsersLoading] = React.useState(false);
  const [projects, setProjects] = React.useState<ProjectDto[]>([]);
  const [tasks, setTasks] = React.useState<TaskDto[]>([]);

  // 加载用户列表和项目/任务列表
  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open]);

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await getUserList({ page: 1, pageSize: 100, isActive: true });
      if (response.success && response.data?.users) {
        setUsers(response.data.users);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('加载用户列表失败:', error);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await getProjectList({ page: 1, pageSize: 100 });
      if (response.success && response.data) {
        setProjects(response.data.projects);
      }
    } catch (error) {
      console.error('加载项目列表失败:', error);
    }
  };

  const loadTasks = async (projId?: string) => {
    try {
      const response = await getTaskTree(projId);
      if (response.success && response.data) {
        setTasks(response.data);
      }
    } catch (error) {
      console.error('加载任务列表失败:', error);
    }
  };

  useEffect(() => {
    if (open) {
      loadProjects();
      const currentProjectId = form.getFieldValue('projectId') || projectId;
      if (currentProjectId) {
        loadTasks(currentProjectId);
      }
    }
  }, [open, projectId]);

  // 当编辑任务时，填充表单
  useEffect(() => {
    if (open && task) {
      const assignedUserIds = Array.from(
        new Set([
          task.assignedTo,
          ...((task.participantIds as string[] | undefined) || []),
        ].filter(Boolean) as string[])
      );
      form.setFieldsValue({
        taskName: task.taskName,
        description: task.description,
        taskType: task.taskType ? [task.taskType] : undefined,
        priority: task.priority,
        assignedUserIds,
        plannedStartTime: task.plannedStartTime ? dayjs(task.plannedStartTime) : undefined,
        plannedEndTime: task.plannedEndTime ? dayjs(task.plannedEndTime) : undefined,
        estimatedDuration: task.estimatedDuration,
        participantIds: task.participantIds,
        tags: task.tags,
        remarks: task.remarks,
        projectId: task.projectId,
        parentTaskId: task.parentTaskId,
      });
    } else if (open) {
      form.resetFields();
      if (projectId) {
        form.setFieldsValue({ projectId });
      }
      if (parentTaskId) {
        form.setFieldsValue({ parentTaskId });
      }
    }
  }, [open, task, form]);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const assignedUserIds: string[] = values.assignedUserIds || [];
      // 如果清空选择，使用空字符串表示需要清空后端的 AssignedTo
      const assignedTo = assignedUserIds.length > 0 ? assignedUserIds[0] : '';

      // 合并分配用户和参与者，确保没有重复
      const participantIds = Array.from(
        new Set([
          ...assignedUserIds,
          ...(values.participantIds || [])
        ])
      );

      const data: any = {
        taskName: values.taskName,
        description: values.description,
        taskType: Array.isArray(values.taskType) ? values.taskType[0] : values.taskType,
        priority: values.priority,
        assignedTo,
        plannedStartTime: values.plannedStartTime?.toISOString(),
        plannedEndTime: values.plannedEndTime?.toISOString(),
        estimatedDuration: values.estimatedDuration,
        participantIds,
        tags: values.tags,
        remarks: values.remarks,
      };

      // 添加项目和父任务字段（如果存在）
      if (values.projectId || projectId) {
        data.projectId = values.projectId || projectId;
      }
      if (values.parentTaskId || parentTaskId) {
        data.parentTaskId = values.parentTaskId || parentTaskId;
      }
      if (values.sortOrder !== undefined) {
        data.sortOrder = values.sortOrder;
      }
      if (values.duration !== undefined) {
        data.duration = values.duration;
      }

      if (task?.id) {
        // 更新任务
        await updateTask({
          taskId: task.id,
          ...data,
        });
        message.success('任务已更新');
      } else {
        // 创建任务
        await createTask(data);
        message.success('任务已创建');
      }

      onSuccess?.();
    } catch (error) {
      console.error('提交表单错误:', error);
      message.error(task?.id ? '更新任务失败' : '创建任务失败');
    } finally {
      setLoading(false);
    }
  };

  // 如果不可见，不渲染任何内容
  if (!open) {
    return null;
  }

  return (
    <Modal
      title={task?.id ? '编辑任务' : '创建任务'}
      open={open}
      onCancel={onClose || onCancel}
      onOk={() => form.submit()}
      width={800}
      confirmLoading={loading}
    >
      <Spin spinning={usersLoading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          {renderFormContent()}
        </Form>
      </Spin>
    </Modal>
  );

  function renderFormContent() {
    return (
      <>
        <Row gutter={16}>
          <Col xs={24} sm={24} md={12}>
            <Form.Item
              label="任务名称"
              name="taskName"
              rules={[{ required: true, message: '请输入任务名称' }]}
            >
              <Input placeholder="请输入任务名称" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={24} md={12}>
            <Form.Item
              label="任务类型"
              name="taskType"
              rules={[{ required: true, message: '请输入或选择任务类型' }]}
            >
              <Select
                mode="tags"
                maxCount={1}
                placeholder="请输入或选择任务类型"
                options={[
                  { label: '开发', value: '开发' },
                  { label: '设计', value: '设计' },
                  { label: '测试', value: '测试' },
                  { label: '文档', value: '文档' },
                  { label: '其他', value: '其他' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="任务描述"
          name="description"
        >
          <Input.TextArea
            placeholder="请输入任务描述"
            rows={3}
          />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} sm={24} md={8}>
            <Form.Item
              label="优先级"
              name="priority"
              initialValue={TaskPriority.Medium}
            >
              <Select
                options={[
                  { label: '低', value: TaskPriority.Low },
                  { label: '中', value: TaskPriority.Medium },
                  { label: '高', value: TaskPriority.High },
                  { label: '紧急', value: TaskPriority.Urgent },
                ]}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={24} md={8}>
            <Form.Item
              label="分配给（可多选）"
              name="assignedUserIds"
            >
              <Select
                mode="multiple"
                showSearch
                placeholder="请选择分配用户（可多选）"
                options={users.map(user => ({
                  label: user.name ? `${user.username} (${user.name})` : user.username,
                  value: user.id,
                }))}
                optionFilterProp="label"
                allowClear
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={24} md={8}>
            <Form.Item
              label="预计耗时（分钟）"
              name="estimatedDuration"
            >
              <InputNumber
                min={0}
                placeholder="请输入预计耗时"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={24} md={12}>
            <Form.Item
              label="计划开始时间"
              name="plannedStartTime"
            >
              <DatePicker
                showTime
                format="YYYY-MM-DD HH:mm"
                placeholder="请选择计划开始时间"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={24} md={12}>
            <Form.Item
              label="计划完成时间"
              name="plannedEndTime"
            >
              <DatePicker
                showTime
                format="YYYY-MM-DD HH:mm"
                placeholder="请选择计划完成时间"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="参与者"
          name="participantIds"
        >
          <Select
            mode="multiple"
            placeholder="请选择参与者"
            showSearch
            options={users.map(user => ({
              label: user.name ? `${user.username} (${user.name})` : user.username,
              value: user.id,
            }))}
            optionFilterProp="label"
          />
        </Form.Item>

        <Form.Item
          label="标签"
          name="tags"
        >
          <Select
            mode="tags"
            placeholder="请输入或选择标签"
            options={[
              { label: 'UI', value: 'UI' },
              { label: 'API', value: 'API' },
              { label: 'Bug', value: 'Bug' },
              { label: 'Feature', value: 'Feature' },
              { label: 'Performance', value: 'Performance' },
            ]}
          />
        </Form.Item>

        <Form.Item
          label="备注"
          name="remarks"
        >
          <Input.TextArea
            placeholder="请输入备注信息"
            rows={2}
          />
        </Form.Item>

        <Form.Item
          label="所属项目"
          name="projectId"
          initialValue={projectId}
        >
          <Select
            placeholder="请选择项目（可选）"
            allowClear
            onChange={(value) => {
              if (value) {
                loadTasks(value);
              } else {
                setTasks([]);
              }
              form.setFieldsValue({ parentTaskId: undefined });
            }}
            options={projects.map((p) => ({
              label: p.name,
              value: p.id,
            }))}
          />
        </Form.Item>

        <Form.Item
          label="父任务"
          name="parentTaskId"
          initialValue={parentTaskId}
        >
          <Select
            placeholder="请选择父任务（可选）"
            allowClear
            disabled={!form.getFieldValue('projectId') && !projectId}
            options={tasks
              .filter((t) => t.id !== task?.id)
              .map((t) => ({
                label: t.taskName,
                value: t.id,
              }))}
          />
        </Form.Item>
      </>
    );
  }
};

export default TaskForm;

