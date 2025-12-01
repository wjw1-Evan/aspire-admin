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

interface TaskFormProps {
  visible: boolean;
  task?: TaskDto | null;
  onClose: () => void;
  onSuccess: () => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ visible, task, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);
  const [users, setUsers] = React.useState<AppUser[]>([]);
  const [usersLoading, setUsersLoading] = React.useState(false);

  // 加载用户列表
  useEffect(() => {
    if (visible) {
      loadUsers();
    }
  }, [visible]);

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

  // 当编辑任务时，填充表单
  useEffect(() => {
    if (visible && task) {
      const assignedUserIds = Array.from(
        new Set([
          task.assignedTo,
          ...((task.participantIds as string[] | undefined) || []),
        ].filter(Boolean) as string[])
      );
      form.setFieldsValue({
        taskName: task.taskName,
        description: task.description,
        taskType: task.taskType,
        priority: task.priority,
        assignedUserIds,
        plannedStartTime: task.plannedStartTime ? dayjs(task.plannedStartTime) : undefined,
        plannedEndTime: task.plannedEndTime ? dayjs(task.plannedEndTime) : undefined,
        estimatedDuration: task.estimatedDuration,
        participantIds: task.participantIds,
        tags: task.tags,
        remarks: task.remarks,
      });
    } else if (visible) {
      form.resetFields();
    }
  }, [visible, task, form]);

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

      const data = {
        taskName: values.taskName,
        description: values.description,
        taskType: values.taskType,
        priority: values.priority,
        assignedTo,
        plannedStartTime: values.plannedStartTime?.toISOString(),
        plannedEndTime: values.plannedEndTime?.toISOString(),
        estimatedDuration: values.estimatedDuration,
        participantIds,
        tags: values.tags,
        remarks: values.remarks,
      };

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

      onSuccess();
    } catch (error) {
      console.error('提交表单错误:', error);
      message.error(task?.id ? '更新任务失败' : '创建任务失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={task?.id ? '编辑任务' : '创建任务'}
      open={visible}
      onCancel={onClose}
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
                rules={[{ required: true, message: '请选择任务类型' }]}
              >
                <Select
                  placeholder="请选择任务类型"
                  options={[
                    { label: '开发', value: 'Development' },
                    { label: '设计', value: 'Design' },
                    { label: '测试', value: 'Testing' },
                    { label: '文档', value: 'Documentation' },
                    { label: '其他', value: 'Other' },
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
                    label: user.username,
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
              options={users.map(user => ({
                label: user.username,
                value: user.id,
              }))}
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
        </Form>
      </Spin>
    </Modal>
  );
};

export default TaskForm;

