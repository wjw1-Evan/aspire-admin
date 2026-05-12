import React, { useEffect } from 'react';
import { useIntl } from '@umijs/max';
import { Tag, Spin, Row, Col } from 'antd';
import { ModalForm, ProFormText, ProFormTextArea, ProFormSelect, ProFormDatePicker, ProFormDigit } from '@ant-design/pro-components';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { createTask, updateTask, TaskPriority, getTaskTree, type TaskDto, type CreateTaskRequest, type UpdateTaskRequest } from '@/services/task/api';
import { getUserList, type AppUser } from '@/services/user/api';
import { useMessage } from '@/hooks/useMessage';
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
  const intl = useIntl();
  const message = useMessage();
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
        taskType: Array.isArray(values.taskType) ? values.taskType[0] : (values.taskType || intl.formatMessage({ id: 'pages.taskManagement.taskTypeOther' })),
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
    } catch (error) { console.error('提交表单错误:', error); message.error(intl.formatMessage({ id: 'pages.taskManagement.message.operationFailed' })); return false; }
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
      title={task?.id ? intl.formatMessage({ id: 'pages.taskManagement.editTask' }) : intl.formatMessage({ id: 'pages.taskManagement.createTask' })}
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
          <ProFormText name="taskName" label={intl.formatMessage({ id: 'pages.taskManagement.form.taskName' })} placeholder={intl.formatMessage({ id: 'pages.taskManagement.form.taskNamePlaceholder' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.taskManagement.form.taskNameRequired' }) }]} />
        </Col>
        <Col xs={24} sm={24} md={12}>
          <ProFormSelect
            name="taskType"
            label={intl.formatMessage({ id: 'pages.taskManagement.form.taskType' })}
            mode="tags"
            fieldProps={{ maxCount: 1 }}
            placeholder={intl.formatMessage({ id: 'pages.taskManagement.form.taskTypePlaceholder' })}
            options={[
              { label: intl.formatMessage({ id: 'pages.taskManagement.taskType.development' }), value: '开发' }, { label: intl.formatMessage({ id: 'pages.taskManagement.taskType.design' }), value: '设计' }, { label: intl.formatMessage({ id: 'pages.taskManagement.taskType.testing' }), value: '测试' }, { label: intl.formatMessage({ id: 'pages.taskManagement.taskType.documentation' }), value: '文档' }, { label: intl.formatMessage({ id: 'pages.taskManagement.taskTypeOther' }), value: '其他' },
            ]}
            rules={[{ required: true, message: intl.formatMessage({ id: 'pages.taskManagement.form.taskTypeRequired' }) }]}
          />
        </Col>
      </Row>
      <ProFormTextArea name="description" label={intl.formatMessage({ id: 'pages.taskManagement.form.description' })} placeholder={intl.formatMessage({ id: 'pages.taskManagement.form.descriptionPlaceholder' })} fieldProps={{ autoSize: { minRows: 3, maxRows: 6 } }} />
      <Row gutter={16}>
        <Col xs={24} sm={24} md={8}>
          <ProFormSelect
            name="priority"
            label={intl.formatMessage({ id: 'pages.taskManagement.form.priority' })}
            options={[
              { label: intl.formatMessage({ id: 'pages.taskManagement.priority.low' }), value: TaskPriority.Low }, { label: intl.formatMessage({ id: 'pages.taskManagement.priority.medium' }), value: TaskPriority.Medium }, { label: intl.formatMessage({ id: 'pages.taskManagement.priority.high' }), value: TaskPriority.High }, { label: intl.formatMessage({ id: 'pages.taskManagement.priority.urgent' }), value: TaskPriority.Urgent },
            ]}
          />
        </Col>
        <Col xs={24} sm={24} md={8}>
          <ProFormSelect
            name="assignedUserIds"
            label={intl.formatMessage({ id: 'pages.taskManagement.assignTo' })}
            mode="multiple"
            showSearch
            placeholder={intl.formatMessage({ id: 'pages.taskManagement.assignToPlaceholder' })}
            options={userOptions}
            fieldProps={{ filterOption: (input, option) => (option?.label as string)?.toLowerCase().includes(input.toLowerCase()) }}
            allowClear
          />
        </Col>
        <Col xs={24} sm={24} md={8}>
          <ProFormDigit name="estimatedDuration" label={intl.formatMessage({ id: 'pages.taskManagement.form.estimatedDuration' })} placeholder={intl.formatMessage({ id: 'pages.taskManagement.estimatedDurationPlaceholder' })} min={0} fieldProps={{ style: { width: '100%' } }} />
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} sm={24} md={12}>
          <ProFormDatePicker name="plannedStartTime" label={intl.formatMessage({ id: 'pages.taskManagement.form.plannedStartTime' })} showTime format="YYYY-MM-DD HH:mm" placeholder={intl.formatMessage({ id: 'pages.taskManagement.plannedStartTimePlaceholder' })} fieldProps={{ style: { width: '100%' } }} />
        </Col>
        <Col xs={24} sm={24} md={12}>
          <ProFormDatePicker name="plannedEndTime" label={intl.formatMessage({ id: 'pages.taskManagement.form.plannedEndTime' })} showTime format="YYYY-MM-DD HH:mm" placeholder={intl.formatMessage({ id: 'pages.taskManagement.plannedEndTimePlaceholder' })} fieldProps={{ style: { width: '100%' } }} />
        </Col>
      </Row>
      <ProFormSelect
        name="participantIds"
        label={intl.formatMessage({ id: 'pages.taskManagement.form.participants' })}
        mode="multiple"
        placeholder={intl.formatMessage({ id: 'pages.taskManagement.participantsPlaceholder' })}
        showSearch
        options={userOptions}
        fieldProps={{ filterOption: (input, option) => (option?.label as string)?.toLowerCase().includes(input.toLowerCase()) }}
      />
      <ProFormSelect
        name="tags"
        label={intl.formatMessage({ id: 'pages.taskManagement.tags' })}
        mode="tags"
        placeholder={intl.formatMessage({ id: 'pages.taskManagement.tagsPlaceholder' })}
        options={[
          { label: 'UI', value: 'UI' }, { label: 'API', value: 'API' }, { label: 'Bug', value: 'Bug' }, { label: 'Feature', value: 'Feature' }, { label: 'Performance', value: 'Performance' },
        ]}
      />
      <ProFormTextArea name="remarks" label={intl.formatMessage({ id: 'pages.taskManagement.remarks' })} placeholder={intl.formatMessage({ id: 'pages.taskManagement.remarksPlaceholder' })} />
      <ProFormSelect
        name="projectId"
        label={intl.formatMessage({ id: 'pages.taskManagement.project' })}
        placeholder={intl.formatMessage({ id: 'pages.taskManagement.projectPlaceholder' })}
        allowClear
        options={projects.map(p => ({ label: p.name, value: p.id }))}
        fieldProps={{
          onChange: (value) => { if (value) loadTasks(value as string); else setTasks([]); },
        }}
        initialValue={projectId}
      />
      <ProFormSelect
        name="parentTaskId"
        label={intl.formatMessage({ id: 'pages.taskManagement.parentTask' })}
        placeholder={intl.formatMessage({ id: 'pages.taskManagement.parentTaskPlaceholder' })}
        allowClear
        options={tasks.filter(t => t.id !== task?.id).map(t => ({ label: t.taskName, value: t.id }))}
        initialValue={parentTaskId}
      />
    </ModalForm>
  );
};

export default TaskForm;
