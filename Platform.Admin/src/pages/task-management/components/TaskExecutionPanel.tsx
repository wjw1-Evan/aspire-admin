import React, { useState } from 'react';
import {
  App,
  Modal,
  Form,
  Input,
  Slider,
  Select,
  Spin,
  Alert,
  Space,
  Button,
  Divider,
  Card,
  Descriptions,
  Tag,
} from 'antd';
import dayjs from 'dayjs';
import {
  executeTask,
  completeTask,
  TaskStatus,
  TaskExecutionResult,
  type TaskDto,
} from '@/services/task/api';

interface TaskExecutionPanelProps {
  visible: boolean;
  task?: TaskDto | null;
  onClose: () => void;
  onSuccess: () => void;
}

type ExecutionMode = 'progress' | 'complete';

const TaskExecutionPanel: React.FC<TaskExecutionPanelProps> = ({
  visible,
  task,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<ExecutionMode>('progress');
  const [completionPercentage, setCompletionPercentage] = useState(
    task?.completionPercentage || 0,
  );

  const handleExecuteProgress = async (values: any) => {
    if (!task?.id) return;

    setLoading(true);
    try {
      await executeTask({
        taskId: task.id,
        status: TaskStatus.InProgress,
        completionPercentage: values.completionPercentage,
        message: values.message,
      });

      message.success('任务进度已更新');
      form.resetFields();
      setCompletionPercentage(0);
      onSuccess();
    } catch (error) {
      message.error('更新任务进度失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async (values: any) => {
    if (!task?.id) return;

    setLoading(true);
    try {
      await completeTask({
        taskId: task.id,
        executionResult: values.executionResult,
        remarks: values.remarks,
        errorMessage: values.errorMessage,
      });

      message.success('任务已完成');
      form.resetFields();
      setCompletionPercentage(0);
      onSuccess();
    } catch (error) {
      message.error('完成任务失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    if (mode === 'progress') {
      await handleExecuteProgress(values);
    } else {
      await handleCompleteTask(values);
    }
  };

  return (
    <Modal
      title="执行任务"
      open={visible}
      onCancel={onClose}
      width={700}
      footer={null}
    >
      <Spin spinning={loading}>
        {task && (
          <>
            {/* 任务信息 */}
            <Card style={{ marginBottom: 16 }}>
              <Descriptions size="small" column={1}>
                <Descriptions.Item label="任务名称">
                  {task.taskName}
                </Descriptions.Item>
                <Descriptions.Item label="当前状态">
                  <Tag>{task.statusName}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="当前进度">
                  {task.completionPercentage}%
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Divider />

            {/* 执行模式选择 */}
            <Form.Item label="执行模式">
              <Select
                value={mode}
                onChange={setMode}
                options={[
                  { label: '更新进度', value: 'progress' },
                  { label: '完成任务', value: 'complete' },
                ]}
              />
            </Form.Item>

            {/* 表单 */}
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
            >
              {mode === 'progress' ? (
                <>
                  <Alert
                    message="更新进度"
                    description="更新任务的执行进度，任务状态将变为'执行中'"
                    type="info"
                    style={{ marginBottom: 16 }}
                  />

                  <Form.Item
                    label="完成百分比"
                    name="completionPercentage"
                    initialValue={task.completionPercentage}
                    rules={[{ required: true, message: '请设置完成百分比' }]}
                  >
                    <Slider
                      min={0}
                      max={100}
                      step={5}
                      marks={{
                        0: '0%',
                        25: '25%',
                        50: '50%',
                        75: '75%',
                        100: '100%',
                      }}
                      onChange={setCompletionPercentage}
                      value={completionPercentage}
                    />
                  </Form.Item>

                  <Form.Item
                    label="执行消息"
                    name="message"
                  >
                    <Input.TextArea
                      placeholder="请输入执行过程中的消息或备注"
                      rows={3}
                    />
                  </Form.Item>

                  <Form.Item>
                    <Space>
                      <Button type="primary" htmlType="submit" loading={loading}>
                        更新进度
                      </Button>
                      <Button onClick={onClose}>取消</Button>
                    </Space>
                  </Form.Item>
                </>
              ) : (
                <>
                  <Alert
                    message="完成任务"
                    description="标记任务为已完成，需要指定执行结果"
                    type="warning"
                    style={{ marginBottom: 16 }}
                  />

                  <Form.Item
                    label="执行结果"
                    name="executionResult"
                    initialValue={TaskExecutionResult.Success}
                    rules={[{ required: true, message: '请选择执行结果' }]}
                  >
                    <Select
                      options={[
                        { label: '成功', value: TaskExecutionResult.Success },
                        { label: '失败', value: TaskExecutionResult.Failed },
                        { label: '超时', value: TaskExecutionResult.Timeout },
                        { label: '被中断', value: TaskExecutionResult.Interrupted },
                      ]}
                    />
                  </Form.Item>

                  <Form.Item
                    noStyle
                    shouldUpdate={(prevValues, currentValues) =>
                      prevValues.executionResult !== currentValues.executionResult
                    }
                  >
                    {({ getFieldValue }) =>
                      getFieldValue('executionResult') === TaskExecutionResult.Failed ? (
                        <Form.Item
                          label="错误信息"
                          name="errorMessage"
                          rules={[{ required: true, message: '请输入错误信息' }]}
                        >
                          <Input.TextArea
                            placeholder="请输入失败原因或错误信息"
                            rows={3}
                          />
                        </Form.Item>
                      ) : null
                    }
                  </Form.Item>

                  <Form.Item
                    label="完成备注"
                    name="remarks"
                  >
                    <Input.TextArea
                      placeholder="请输入任务完成的备注信息"
                      rows={3}
                    />
                  </Form.Item>

                  <Form.Item>
                    <Space>
                      <Button type="primary" htmlType="submit" loading={loading}>
                        完成任务
                      </Button>
                      <Button onClick={onClose}>取消</Button>
                    </Space>
                  </Form.Item>
                </>
              )}
            </Form>
          </>
        )}
      </Spin>
    </Modal>
  );
};

export default TaskExecutionPanel;

