import {
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  MenuOutlined,
  RocketOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components/es/card';
import { history, useIntl } from '@umijs/max';
import { Alert, Checkbox, Col, Row, Space, Tag, Typography, theme } from 'antd';
import React, { useState } from 'react';
import useCommonStyles from '@/hooks/useCommonStyles';
import { useMessage } from '@/hooks/useMessage';
import type { TaskDto, TaskStatistics } from '@/services/task/api';
import { completeTask } from '@/services/task/api';
import * as API from '@/types';
import StatCard from './StatCard';

const { Text } = Typography;

interface TaskOverviewCardProps {
  readonly taskStatistics: TaskStatistics | null;
  readonly todoTasks: TaskDto[];
  readonly loading: boolean;
  readonly currentUser?: API.CurrentUser;
  readonly onTaskComplete?: () => void;
}

const TaskOverviewCard: React.FC<TaskOverviewCardProps> = ({
  taskStatistics,
  todoTasks,
  loading,
  currentUser,
  onTaskComplete,
}) => {
  const intl = useIntl();
  const message = useMessage();
  const { token } = theme.useToken();
  const { styles } = useCommonStyles();
  const [completingTaskIds, setCompletingTaskIds] = useState<Set<string>>(new Set());

  const handleCompleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (completingTaskIds.has(taskId)) return;

    setCompletingTaskIds((prev) => new Set(prev).add(taskId));
    try {
      await completeTask({ taskId, executionResult: 1 });
      message.success('任务已完成');
      onTaskComplete?.();
    } catch (error) {
      console.error('完成任务失败:', error);
      message.error('完成任务失败，请重试');
    } finally {
      setCompletingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  return (
    <ProCard
      title={
        <Space>
          <BarChartOutlined />
          <span>{intl.formatMessage({ id: 'pages.welcome.taskOverview' })}</span>
        </Space>
      }
      className={styles.card}
      style={{ height: '100%', borderRadius: '12px' }}
    >
      <Row gutter={[12, 12]}>
        <Col xs={24} sm={8}>
          <StatCard
            title={intl.formatMessage({ id: 'pages.taskManagement.statistics.totalTasks' })}
            value={taskStatistics?.totalTasks ?? 0}
            icon={<BarChartOutlined />}
            color={token.colorPrimary}
            loading={loading}
            token={token}
            onClick={() => history.push('/project-management/task-management')}
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            title={intl.formatMessage({ id: 'pages.taskManagement.statistics.pendingTasks' })}
            value={taskStatistics?.pendingTasks ?? 0}
            icon={<ClockCircleOutlined />}
            color={token.colorWarning}
            loading={loading}
            token={token}
            onClick={() => history.push('/project-management/task-management?status=0')}
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            title={intl.formatMessage({ id: 'pages.taskManagement.statistics.inProgressTasks' })}
            value={taskStatistics?.inProgressTasks ?? 0}
            icon={<RocketOutlined />}
            color={token.colorSuccess}
            loading={loading}
            token={token}
            onClick={() => history.push('/project-management/task-management?status=2')}
          />
        </Col>
      </Row>
      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col xs={24} sm={8}>
          <StatCard
            title={intl.formatMessage({ id: 'pages.taskManagement.statistics.completedTasks' })}
            value={taskStatistics?.completedTasks ?? 0}
            icon={<CheckCircleOutlined />}
            color={token.colorSuccess}
            loading={loading}
            token={token}
            onClick={() => history.push('/project-management/task-management?status=3')}
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            title={intl.formatMessage({ id: 'pages.taskManagement.statistics.failedTasks' })}
            value={taskStatistics?.failedTasks ?? 0}
            icon={<CloseCircleOutlined />}
            color={token.colorError}
            loading={loading}
            token={token}
            onClick={() => history.push('/project-management/task-management?status=5')}
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            title={intl.formatMessage({ id: 'pages.taskManagement.statistics.completionRate' })}
            value={taskStatistics ? `${taskStatistics.completionRate.toFixed(1)}` : '0'}
            suffix="%"
            icon={<SafetyOutlined />}
            color={token.colorPrimary}
            loading={loading}
            token={token}
            onClick={() => history.push('/project-management/task-management')}
          />
        </Col>
      </Row>
      <div style={{ marginTop: 16 }}>
        <Space style={{ marginBottom: 8 }}>
          <MenuOutlined />
          <span>{intl.formatMessage({ id: 'pages.welcome.myTodoTasks' })}</span>
        </Space>
        {todoTasks.length === 0 ? (
          <Alert type="info" title={intl.formatMessage({ id: 'pages.welcome.myTodoTasks.empty' })} showIcon />
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {todoTasks.slice(0, 5).map((task) => (
              <li
                key={task.id}
                style={{
                  padding: '6px 0',
                  borderBottom: '1px solid #f0f0f0',
                  cursor: 'pointer',
                }}
                onClick={() => history.push(`/project-management/task-management?taskId=${task.id}`)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div onClick={(e) => task.id && handleCompleteTask(task.id, e)} style={{ paddingTop: 2 }}>
                    <Checkbox checked={false} disabled={!task.id || completingTaskIds.has(task.id)} />
                  </div>
                  <Space orientation="vertical" size={2} style={{ flex: 1, minWidth: 0 }}>
                    <Space>
                      <Text strong style={{ fontSize: 13 }}>
                        {task.taskName}
                      </Text>
                      {task.priorityName && (
                        <Tag color="processing" style={{ paddingInline: 6, lineHeight: '20px', fontSize: 12 }}>
                          {task.priorityName}
                        </Tag>
                      )}
                    </Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {task.statusName} · {task.assignedToName || currentUser?.displayName || currentUser?.username}
                    </Text>
                  </Space>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ProCard>
  );
};

export default TaskOverviewCard;
