import React, { useState } from 'react';
import { App, Spin, Alert, Space, Button, Divider, Tag } from 'antd';
import { ModalForm, ProFormText, ProFormSelect, ProFormSlider, ProDescriptions, ProCard } from '@ant-design/pro-components';
import { executeTask, completeTask, TaskStatus, TaskExecutionResult, type TaskDto, type ExecuteTaskRequest, type CompleteTaskRequest } from '@/services/task/api';

interface TaskExecutionPanelProps { open: boolean; task?: TaskDto | null; onClose: () => void; onSuccess: () => void; }

type ExecutionMode = 'progress' | 'complete';

const TaskExecutionPanel: React.FC<TaskExecutionPanelProps> = ({ open, task, onClose, onSuccess }) => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<ExecutionMode>('progress');
  const [completionPercentage, setCompletionPercentage] = useState(task?.completionPercentage || 0);

  const handleFinish = async (values: any) => {
    if (!task?.id) return false;
    setLoading(true);
    try {
      if (mode === 'progress') {
        await executeTask({ taskId: task.id, status: TaskStatus.InProgress, completionPercentage: values.completionPercentage, message: values.message });
        message.success('任务进度已更新');
      } else {
        await completeTask({ taskId: task.id, executionResult: values.executionResult, remarks: values.remarks, errorMessage: values.errorMessage });
        message.success('任务已完成');
      }
      setCompletionPercentage(0);
      onSuccess();
      return true;
    } catch { message.error(mode === 'progress' ? '更新任务进度失败' : '完成任务失败'); return false; }
    finally { setLoading(false); }
  };

  return (
    <ModalForm
      title="执行任务"
      open={open}
      onOpenChange={(visible) => { if (!visible) onClose(); }}
      onFinish={handleFinish}
      width={700}
      initialValues={task ? { completionPercentage: task.completionPercentage, executionResult: TaskExecutionResult.Success } : undefined}
      autoFocusFirstInput={false}
    >
      <Spin spinning={loading}>
        {task && (
          <>
            <ProCard style={{ marginBottom: 16 }}>
              <ProDescriptions size="small" column={1}>
                <ProDescriptions.Item label="任务名称">{task.taskName}</ProDescriptions.Item>
                <ProDescriptions.Item label="当前状态"><Tag>{task.statusName}</Tag></ProDescriptions.Item>
                <ProDescriptions.Item label="当前进度">{task.completionPercentage}%</ProDescriptions.Item>
              </ProDescriptions>
            </ProCard>
            <Divider />
            <ProFormSelect
              label="执行模式"
              name="mode"
              initialValue={mode}
              onChange={(value) => setMode(value as ExecutionMode)}
              options={[
                { label: '更新进度', value: 'progress' }, { label: '完成任务', value: 'complete' },
              ]}
            />
            {mode === 'progress' ? (
              <>
                <Alert title="更新进度" description="更新任务的执行进度，任务状态将变为'执行中'" type="info" style={{ marginBottom: 16 }} />
                <ProFormSlider
                  label="完成百分比"
                  name="completionPercentage"
                  min={0}
                  max={100}
                  step={5}
                  marks={{ 0: '0%', 25: '25%', 50: '50%', 75: '75%', 100: '100%' }}
                  fieldProps={{ onChange: setCompletionPercentage }}
                  rules={[{ required: true, message: '请设置完成百分比' }]}
                />
                <ProFormText name="message" label="执行消息" placeholder="请输入执行过程中的消息或备注" />
              </>
            ) : (
              <>
                <Alert title="完成任务" description="标记任务为已完成，需要指定执行结果" type="warning" style={{ marginBottom: 16 }} />
                <ProFormSelect
                  label="执行结果"
                  name="executionResult"
                  rules={[{ required: true, message: '请选择执行结果' }]}
                  options={[
                    { label: '成功', value: TaskExecutionResult.Success }, { label: '失败', value: TaskExecutionResult.Failed },
                    { label: '超时', value: TaskExecutionResult.Timeout }, { label: '被中断', value: TaskExecutionResult.Interrupted },
                  ]}
                />
                <ProFormText name="errorMessage" label="错误信息" placeholder="请输入失败原因或错误信息" />
                <ProFormText name="remarks" label="完成备注" placeholder="请输入任务完成的备注信息" />
              </>
            )}
          </>
        )}
      </Spin>
    </ModalForm>
  );
};

export default TaskExecutionPanel;
