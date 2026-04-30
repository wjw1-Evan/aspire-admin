import React, { useState } from 'react';
import { App, Spin, Alert, Space, Button, Divider, Tag } from 'antd';
import { ModalForm, ProFormText, ProFormSelect, ProFormSlider, ProDescriptions, ProCard } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { executeTask, completeTask, TaskStatus, TaskExecutionResult, type TaskDto, type ExecuteTaskRequest, type CompleteTaskRequest } from '@/services/task/api';

interface TaskExecutionPanelProps { open: boolean; task?: TaskDto | null; onClose: () => void; onSuccess: () => void; }

type ExecutionMode = 'progress' | 'complete';

const TaskExecutionPanel: React.FC<TaskExecutionPanelProps> = ({ open, task, onClose, onSuccess }) => {
  const intl = useIntl();
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
        message.success(intl.formatMessage({ id: 'pages.taskManagement.execution.progressUpdated' }));
      } else {
        await completeTask({ taskId: task.id, executionResult: values.executionResult, remarks: values.remarks, errorMessage: values.errorMessage });
        message.success(intl.formatMessage({ id: 'pages.taskManagement.execution.taskCompleted' }));
      }
      setCompletionPercentage(0);
      onSuccess();
      return true;
    } catch { message.error(mode === 'progress' ? intl.formatMessage({ id: 'pages.taskManagement.execution.updateProgressFailed' }) : intl.formatMessage({ id: 'pages.taskManagement.execution.completeTaskFailed' })); return false; }
    finally { setLoading(false); }
  };

  return (
    <ModalForm
      title={intl.formatMessage({ id: 'pages.taskManagement.execution.title' })}
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
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.table.name' })}>{task.taskName}</ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.execution.currentStatus' })}><Tag>{task.statusName}</Tag></ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.execution.currentProgress' })}>{task.completionPercentage}%</ProDescriptions.Item>
              </ProDescriptions>
            </ProCard>
            <Divider />
            <ProFormSelect
              label={intl.formatMessage({ id: 'pages.taskManagement.execution.mode' })}
              name="mode"
              initialValue={mode}
              onChange={(value) => setMode(value as ExecutionMode)}
              options={[
                { label: intl.formatMessage({ id: 'pages.taskManagement.execution.modeProgress' }), value: 'progress' }, { label: intl.formatMessage({ id: 'pages.taskManagement.execution.modeComplete' }), value: 'complete' },
              ]}
            />
            {mode === 'progress' ? (
              <>
                <Alert title={intl.formatMessage({ id: 'pages.taskManagement.execution.modeProgress' })} description={intl.formatMessage({ id: 'pages.taskManagement.execution.updateProgressDesc' })} type="info" style={{ marginBottom: 16 }} />
                <ProFormSlider
                  label={intl.formatMessage({ id: 'pages.taskManagement.execution.completionPercentage' })}
                  name="completionPercentage"
                  min={0}
                  max={100}
                  step={5}
                  marks={{ 0: '0%', 25: '25%', 50: '50%', 75: '75%', 100: '100%' }}
                  fieldProps={{ onChange: setCompletionPercentage }}
                  rules={[{ required: true, message: intl.formatMessage({ id: 'pages.taskManagement.execution.completionPercentageRequired' }) }]}
                />
                <ProFormText name="message" label={intl.formatMessage({ id: 'pages.taskManagement.execution.message' })} placeholder={intl.formatMessage({ id: 'pages.taskManagement.execution.messagePlaceholder' })} />
              </>
            ) : (
              <>
                <Alert title={intl.formatMessage({ id: 'pages.taskManagement.execution.modeComplete' })} description={intl.formatMessage({ id: 'pages.taskManagement.execution.completeTaskDesc' })} type="warning" style={{ marginBottom: 16 }} />
                <ProFormSelect
                  label={intl.formatMessage({ id: 'pages.taskManagement.execution.result' })}
                  name="executionResult"
                  rules={[{ required: true, message: intl.formatMessage({ id: 'pages.taskManagement.execution.resultRequired' }) }]}
                  options={[
                    { label: intl.formatMessage({ id: 'pages.taskManagement.execution.resultSuccess' }), value: TaskExecutionResult.Success }, { label: intl.formatMessage({ id: 'pages.taskManagement.execution.resultFailed' }), value: TaskExecutionResult.Failed },
                    { label: intl.formatMessage({ id: 'pages.taskManagement.execution.resultTimeout' }), value: TaskExecutionResult.Timeout }, { label: intl.formatMessage({ id: 'pages.taskManagement.execution.resultInterrupted' }), value: TaskExecutionResult.Interrupted },
                  ]}
                />
                <ProFormText name="errorMessage" label={intl.formatMessage({ id: 'pages.taskManagement.execution.errorMessage' })} placeholder={intl.formatMessage({ id: 'pages.taskManagement.execution.errorMessagePlaceholder' })} />
                <ProFormText name="remarks" label={intl.formatMessage({ id: 'pages.taskManagement.execution.remarks' })} placeholder={intl.formatMessage({ id: 'pages.taskManagement.execution.remarksPlaceholder' })} />
              </>
            )}
          </>
        )}
      </Spin>
    </ModalForm>
  );
};

export default TaskExecutionPanel;
