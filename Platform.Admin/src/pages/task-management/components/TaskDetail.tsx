import React, { useEffect, useState } from 'react';
import {
  Drawer,
  Descriptions,
  Tag,
  Divider,
  Empty,
  Spin,
  Timeline,
  Card,
  Row,
  Col,
  Avatar,
  Space,
  Button,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { getTaskById, getTaskExecutionLogs, TaskStatus, TaskPriority, type TaskDto, type TaskExecutionLogDto } from '@/services/task/api';

interface TaskDetailProps {
  open: boolean;
  task?: TaskDto | null;
  onClose: () => void;
}

const TaskDetail: React.FC<TaskDetailProps> = ({ open, task, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [taskDetail, setTaskDetail] = useState<TaskDto | null>(null);
  const [executionLogs, setExecutionLogs] = useState<TaskExecutionLogDto[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // 加载任务详情
  useEffect(() => {
    if (open && task?.id) {
      loadTaskDetail();
      loadExecutionLogs();
    }
  }, [open, task?.id]);

  const loadTaskDetail = async () => {
    if (!task?.id) return;
    setLoading(true);
    try {
      const response = await getTaskById(task.id);
      if (response.success && response.data) {
        setTaskDetail(response.data);
      }
    } catch (error) {
      message.error('加载任务详情失败');
    } finally {
      setLoading(false);
    }
  };

  const loadExecutionLogs = async () => {
    if (!task?.id) return;
    setLogsLoading(true);
    try {
      const response = await getTaskExecutionLogs(task.id, 1, 100);
      if (response.success && response.data?.logs) {
        setExecutionLogs(response.data.logs);
      }
    } catch (error) {
      console.error('加载执行日志失败:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case TaskStatus.Pending:
        return 'default';
      case TaskStatus.Assigned:
        return 'processing';
      case TaskStatus.InProgress:
        return 'processing';
      case TaskStatus.Completed:
        return 'success';
      case TaskStatus.Cancelled:
        return 'error';
      case TaskStatus.Failed:
        return 'error';
      case TaskStatus.Paused:
        return 'warning';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case TaskPriority.Low:
        return 'blue';
      case TaskPriority.Medium:
        return 'cyan';
      case TaskPriority.High:
        return 'orange';
      case TaskPriority.Urgent:
        return 'red';
      default:
        return 'blue';
    }
  };

  const getExecutionResultColor = (result: number) => {
    switch (result) {
      case 1: // Success
        return 'success';
      case 2: // Failed
        return 'error';
      case 3: // Timeout
        return 'warning';
      case 4: // Interrupted
        return 'warning';
      default:
        return 'default';
    }
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <Drawer
      title="任务详情"
      placement="right"
      onClose={onClose}
      open={open}
      size={isMobile ? 'large' : 800}
    >
      <Spin spinning={loading}>
        {taskDetail ? (
          <>
            {/* 基本信息 */}
            <Card title="基本信息" style={{ marginBottom: 16 }}>
              <Descriptions column={isMobile ? 1 : 2} size="small">
                <Descriptions.Item label="任务名称" span={2}>
                  {taskDetail.taskName}
                </Descriptions.Item>
                <Descriptions.Item label="任务类型">
                  <Tag>{taskDetail.taskType}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={getStatusColor(taskDetail.status)}>
                    {taskDetail.statusName}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="优先级">
                  <Tag color={getPriorityColor(taskDetail.priority)}>
                    {taskDetail.priorityName}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="进度">
                  {taskDetail.completionPercentage}%
                </Descriptions.Item>
                <Descriptions.Item label="描述" span={2}>
                  {taskDetail.description || '-'}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* 分配信息 */}
            <Card title="分配信息" style={{ marginBottom: 16 }}>
              <Descriptions column={isMobile ? 1 : 2} size="small">
                <Descriptions.Item label="创建者">
                  {taskDetail.createdByName || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">
                  {dayjs(taskDetail.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
                <Descriptions.Item label="分配给">
                  {taskDetail.assignedToName || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="分配时间">
                  {taskDetail.assignedAt ? dayjs(taskDetail.assignedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* 时间信息 */}
            <Card title="时间信息" style={{ marginBottom: 16 }}>
              <Descriptions column={isMobile ? 1 : 2} size="small">
                <Descriptions.Item label="计划开始">
                  {taskDetail.plannedStartTime ? dayjs(taskDetail.plannedStartTime).format('YYYY-MM-DD HH:mm:ss') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="计划完成">
                  {taskDetail.plannedEndTime ? dayjs(taskDetail.plannedEndTime).format('YYYY-MM-DD HH:mm:ss') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="实际开始">
                  {taskDetail.actualStartTime ? dayjs(taskDetail.actualStartTime).format('YYYY-MM-DD HH:mm:ss') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="实际完成">
                  {taskDetail.actualEndTime ? dayjs(taskDetail.actualEndTime).format('YYYY-MM-DD HH:mm:ss') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="预计耗时">
                  {taskDetail.estimatedDuration ? `${taskDetail.estimatedDuration} 分钟` : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="实际耗时">
                  {taskDetail.actualDuration ? `${taskDetail.actualDuration} 分钟` : '-'}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* 参与者 */}
            {taskDetail.participants && taskDetail.participants.length > 0 && (
              <Card title="参与者" style={{ marginBottom: 16 }}>
                <Space wrap>
                  {taskDetail.participants.map(participant => (
                    <Tag key={participant.userId}>
                      {participant.username}
                    </Tag>
                  ))}
                </Space>
              </Card>
            )}

            {/* 标签 */}
            {taskDetail.tags && taskDetail.tags.length > 0 && (
              <Card title="标签" style={{ marginBottom: 16 }}>
                <Space wrap>
                  {taskDetail.tags.map(tag => (
                    <Tag key={tag} color="blue">
                      {tag}
                    </Tag>
                  ))}
                </Space>
              </Card>
            )}

            {/* 备注 */}
            {taskDetail.remarks && (
              <Card title="备注" style={{ marginBottom: 16 }}>
                <p>{taskDetail.remarks}</p>
              </Card>
            )}

            <Divider />

            {/* 执行日志 */}
            <Card title="执行日志" loading={logsLoading}>
              {executionLogs.length > 0 ? (
                <Timeline
                  items={executionLogs.map(log => ({
                    icon: <Tag color={getExecutionResultColor(log.status)}>{log.statusName}</Tag>,
                    content: (
                      <div>
                        <p>
                          <strong>{log.executedByName}</strong> 在{' '}
                          {dayjs(log.startTime).format('YYYY-MM-DD HH:mm:ss')} 执行
                        </p>
                        {log.message && <p>消息: {log.message}</p>}
                        {log.errorMessage && <p style={{ color: 'red' }}>错误: {log.errorMessage}</p>}
                        <p>进度: {log.progressPercentage}%</p>
                      </div>
                    ),
                  }))}
                />
              ) : (
                <Empty description="暂无执行日志" />
              )}
            </Card>
          </>
        ) : (
          <Empty description="未加载任务信息" />
        )}
      </Spin>
    </Drawer>
  );
};

export default TaskDetail;

