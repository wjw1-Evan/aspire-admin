import React, { useEffect } from 'react';
import { Tag, Spin, Row, Col } from 'antd';
import { ModalForm, ProFormText, ProFormTextArea, ProFormSelect, ProFormDatePicker, ProFormDigit } from '@ant-design/pro-form';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { createTask, updateTask, TaskPriority, getTaskTree, type TaskDto, type CreateTaskRequest, type UpdateTaskRequest } from '@/services/task/api';
import { getUserList, type AppUser } from '@/services/user/api';
import { message } from 'antd';
import { getErrorMessage } from '@/utils/getErrorMessage';

interface TaskFormProps {
  open?: boolean; task?: TaskDto | null; projects?: { id: string; name: string }[];
  onClose?: () => void; onSuccess?: () => void; onCancel?: () => void;
  projectId?: string; parentTaskId?: string;
}

interface TaskFormValues {
  taskName: string; description?: string; taskType: string | string[]; priority?: number;
  assignedUserIds?: string[]; participantIds?: string[]; plannedStartTime?: Dayjs;
  plannedEndTime?: Dayjs; estimatedDuration?: number; tags?: string[]; remarks?: string;
  projectId?: string; parentTaskId?: string; sortOrder?: number; duration?: number;
}

const TaskForm: React.FC<TaskFormProps> = ({
  open = false, task, projects = [], onClose, onSuccess, onCancel, projectId, parentTaskId,
}) => {
  const [loading, setLoading] = React.useState(false);
  const [users, setUsers] = React.useState<AppUser[]>([]);
  const [usersLoading, setUsersLoading] = React.useState(false);
  const [tasks, setTasks] = React.useState<TaskDto[]>([]);

  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open]);

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await getUserList({ page: 1 });
      setUsers(response.success && response.data ? response.data.queryable || [] : []);
    } catch (error) { console.error('加载用户列表失败:', error); setUsers([]); }
    finally { setUsersLoading(false); }
  };

  const loadTasks = async (projId?: string) => {
    try {
      const response = await getTaskTree(projId);
      if (response.success && response.data) setTasks(response.data);
    } catch (error) { console.error('加载任务列表失败:', error); }
  };

  const handleSubmit = async (values: TaskFormValues) => {
    setLoading(true);
    try {
      const assignedUserIds = values.assignedUserIds || [];
      const assignedTo = assignedUserIds.length > 0 ? assignedUserIds[0] : undefined;
      const participantIds = Array.from(new Set([...assignedUserIds, ...(values.participantIds || [])]));

      const data: CreateTaskRequest | UpdateTaskRequest = {
        taskName: values.taskName, description: values.description,
        taskType: Array.isArray(values.taskType) ? values.taskType[0] : (values.taskType || '其他'),
        priority: values.priority, 
        plannedStartTime: values.plannedStartTime ? (dayjs.isDayjs(values.plannedStartTime) ? values.plannedStartTime.format('YYYY-MM-DDTHH:mm:ss') : values.plannedStartTime) : undefined,
        plannedEndTime: values.plannedEndTime ? (dayjs.isDayjs(values.plannedEndTime) ? values.plannedEndTime.format('YYYY-MM-DDTHH:mm:ss') : values.plannedEndTime) : undefined, 
        estimatedDuration: values.estimatedDuration,
        participantIds, tags: values.tags, remarks: values.remarks,
      };
      if (assignedTo) (data as any).assignedTo = assignedTo;

      const extendedData = { ...data, ...(values.projectId || projectId ? { projectId: values.projectId || projectId } : {}), ...(values.parentTaskId || parentTaskId ? { parentTaskId: values.parentTaskId || parentTaskId } : {}), ...(values.sortOrder !== undefined ? { sortOrder: values.sortOrder } : {}), ...(values.duration !== undefined ? { duration: values.duration } : {}) } as CreateTaskRequest;

      let res;
      if (task?.id) { res = await updateTask({ taskId: task.id, ...extendedData }); }
      else { res = await createTask(extendedData); }
      
      if (res.success) { onSuccess?.(); return true; }
      else { message.error(getErrorMessage(res, 'pages.taskManagement.message.submitFailed')); return false; }
    } catch (error) { console.error('提交表单错误:', error); message.error('操作失败'); return false; }
    finally { setLoading(false); }
  };

  const initialValues = task ? {
    taskName: task.taskName,
    description: task.description,
    taskType: task.taskType ? [task.taskType] : undefined,
    priority: task.priority,
    assignedUserIds: Array.from(new Set([task.assignedTo, ...(task.participantIds as string[] | undefined) || []].filter(Boolean) as string[])),
    plannedStartTime: task.plannedStartTime ? dayjs(task.plannedStartTime) : undefined,
    plannedEndTime: task.plannedEndTime ? dayjs(task.plannedEndTime) : undefined,
    estimatedDuration: task.estimatedDuration,
    participantIds: task.participantIds,
    tags: task.tags,
    remarks: task.remarks,
    projectId: task.projectId,
    parentTaskId: task.parentTaskId,
  } : {
    priority: TaskPriority.Medium,
    projectId: projectId,
    parentTaskId: parentTaskId,
  };

  const userOptions = users.map(user => ({
    label: user.name ? `${user.username} (${user.name})` : user.username,
    value: user.id,
  }));

  return (
    <ModalForm
      title={task?.id ? '编辑任务' : '创建任务'}
      open={open}
      onOpenChange={(isOpen) => { if (!isOpen) { onClose?.() || onCancel?.(); } }}
      onFinish={handleSubmit}
      initialValues={initialValues}
      autoFocusFirstInput
      width={800}
      submitter={{ render: (_, defaultDom) => [<Spin key="spin" spinning={usersLoading || loading}>{defaultDom}</Spin>] }}
    >
      <Row gutter={16}>
        <Col xs={24} sm={24} md={12}>
          <ProFormText name="taskName" label="任务名称" placeholder="请输入任务名称" rules={[{ required: true, message: '请输入任务名称' }]} />
        </Col>
        <Col xs={24} sm={24} md={12}>
          <ProFormSelect
            name="taskType"
            label="任务类型"
            mode="tags"
            fieldProps={{ maxCount: 1 }}
            placeholder="请输入或选择任务类型"
            options={[
              { label: '开发', value: '开发' }, { label: '设计', value: '设计' }, { label: '测试', value: '测试' }, { label: '文档', value: '文档' }, { label: '其他', value: '其他' },
            ]}
            rules={[{ required: true, message: '请输入或选择任务类型' }]}
          />
        </Col>
      </Row>
      <ProFormTextArea name="description" label="任务描述" placeholder="请输入任务描述" fieldProps={{ autoSize: { minRows: 3, maxRows: 6 } }} />
      <Row gutter={16}>
        <Col xs={24} sm={24} md={8}>
          <ProFormSelect
            name="priority"
            label="优先级"
            options={[
              { label: '低', value: TaskPriority.Low }, { label: '中', value: TaskPriority.Medium }, { label: '高', value: TaskPriority.High }, { label: '紧急', value: TaskPriority.Urgent },
            ]}
          />
        </Col>
        <Col xs={24} sm={24} md={8}>
          <ProFormSelect
            name="assignedUserIds"
            label="分配给（可多选）"
            mode="multiple"
            showSearch
            placeholder="请选择分配用户（可多选）"
            options={userOptions}
            fieldProps={{ filterOption: (input, option) => (option?.label as string)?.toLowerCase().includes(input.toLowerCase()) }}
            allowClear
          />
        </Col>
        <Col xs={24} sm={24} md={8}>
          <ProFormDigit name="estimatedDuration" label="预计耗时（分钟）" placeholder="请输入预计耗时" min={0} fieldProps={{ style: { width: '100%' } }} />
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} sm={24} md={12}>
          <ProFormDatePicker name="plannedStartTime" label="计划开始时间" showTime format="YYYY-MM-DD HH:mm" placeholder="请选择计划开始时间" fieldProps={{ style: { width: '100%' } }} />
        </Col>
        <Col xs={24} sm={24} md={12}>
          <ProFormDatePicker name="plannedEndTime" label="计划完成时间" showTime format="YYYY-MM-DD HH:mm" placeholder="请选择计划完成时间" fieldProps={{ style: { width: '100%' } }} />
        </Col>
      </Row>
      <ProFormSelect
        name="participantIds"
        label="参与者"
        mode="multiple"
        placeholder="请选择参与者"
        showSearch
        options={userOptions}
        fieldProps={{ filterOption: (input, option) => (option?.label as string)?.toLowerCase().includes(input.toLowerCase()) }}
      />
      <ProFormSelect
        name="tags"
        label="标签"
        mode="tags"
        placeholder="请输入或选择标签"
        options={[
          { label: 'UI', value: 'UI' }, { label: 'API', value: 'API' }, { label: 'Bug', value: 'Bug' }, { label: 'Feature', value: 'Feature' }, { label: 'Performance', value: 'Performance' },
        ]}
      />
      <ProFormTextArea name="remarks" label="备注" placeholder="请输入备注信息" />
      <ProFormSelect
        name="projectId"
        label="所属项目"
        placeholder="请选择项目（可选）"
        allowClear
        options={projects.map(p => ({ label: p.name, value: p.id }))}
        fieldProps={{
          onChange: (value) => { if (value) loadTasks(value as string); else setTasks([]); },
        }}
        initialValue={projectId}
      />
      <ProFormSelect
        name="parentTaskId"
        label="父任务"
        placeholder="请选择父任务（可选）"
        allowClear
        options={tasks.filter(t => t.id !== task?.id).map(t => ({ label: t.taskName, value: t.id }))}
        initialValue={parentTaskId}
      />
    </ModalForm>
  );
};

export default TaskForm;
