import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppStyles, commonStyles } from '../../constants/AppStyles';
import { taskService } from '../../services/taskService';
import { TaskDto, TaskStatus, TaskExecutionLogDto } from '../../types/task';
import StatusTag from '../../components/ui/StatusTag';
import PriorityTag from '../../components/ui/PriorityTag';
import ProgressBar from '../../components/ui/ProgressBar';
import LoadingView from '../../components/ui/LoadingView';
import ErrorView from '../../components/ui/ErrorView';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';
import {
  getTaskStatusColor,
  getTaskStatusBgColor,
  getProgressColor,
  formatDate,
} from '../../utils/task';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [task, setTask] = useState<TaskDto | null>(null);
  const [logs, setLogs] = useState<TaskExecutionLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelConfirmVisible, setCancelConfirmVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [taskRes, logsRes] = await Promise.all([
        taskService.getTaskById(id),
        taskService.getTaskLogs(id),
      ]);

      if (taskRes.success && taskRes.data) {
        setTask(taskRes.data);
      } else {
        setError(taskRes.message || '加载任务失败');
      }

      if (logsRes.success && logsRes.data) {
        setLogs(logsRes.data);
      }
    } catch (err: any) {
      setError(err?.message || '网络错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleCancel = async () => {
    setCancelConfirmVisible(false);
    try {
      await taskService.cancelTask(id);
      loadData();
    } catch {}
  };

  const handleDelete = async () => {
    setDeleteConfirmVisible(false);
    try {
      await taskService.deleteTask(id);
      router.back();
    } catch {}
  };

  const canExecute = task && (
    task.status === TaskStatus.Pending ||
    task.status === TaskStatus.Assigned ||
    task.status === TaskStatus.InProgress
  );

  const canCancel = task && (
    task.status !== TaskStatus.Completed &&
    task.status !== TaskStatus.Cancelled
  );

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} onRetry={loadData} />;
  if (!task) return <ErrorView message="任务不存在" />;

  return (
    <>
      <Stack.Screen
        options={{
          title: task.taskName,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push(`/task/edit/${id}`)}
              style={{ padding: 8 }}
            >
              <Ionicons name="pencil-outline" size={22} color={AppStyles.colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={{ padding: AppStyles.spacing.md, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.name}>{task.taskName}</Text>
          <View style={styles.tagsRow}>
            <StatusTag
              text={task.statusName}
              color={getTaskStatusColor(task.status)}
              backgroundColor={getTaskStatusBgColor(task.status)}
              size="md"
            />
            <View style={{ marginLeft: 8 }}>
              <PriorityTag priority={task.priority} text={task.priorityName} size="md" />
            </View>
            {task.taskType && (
              <View style={styles.typeTag}>
                <Text style={styles.typeText}>{task.taskType}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={commonStyles.card}>
          <Text style={styles.sectionTitle}>进度</Text>
          <ProgressBar percentage={task.completionPercentage} height={10} />
        </View>

        <View style={commonStyles.card}>
          <Text style={styles.sectionTitle}>基本信息</Text>
          {task.description && (
            <View style={styles.descBlock}>
              <Text style={styles.descLabel}>描述</Text>
              <Text style={styles.descText}>{task.description}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={16} color={AppStyles.colors.textSecondary} />
            <Text style={styles.infoLabel}>创建人</Text>
            <Text style={styles.infoValue}>{task.createdByName || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="person-circle-outline" size={16} color={AppStyles.colors.textSecondary} />
            <Text style={styles.infoLabel}>负责人</Text>
            <Text style={styles.infoValue}>{task.assignedToName || '未分配'}</Text>
          </View>
          {task.projectName && (
            <View style={styles.infoRow}>
              <Ionicons name="folder-outline" size={16} color={AppStyles.colors.textSecondary} />
              <Text style={styles.infoLabel}>关联项目</Text>
              <TouchableOpacity onPress={() => task.projectId && router.push(`/project/${task.projectId}`)}>
                <Text style={[styles.infoValue, { color: AppStyles.colors.primary }]}>
                  {task.projectName}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={commonStyles.card}>
          <Text style={styles.sectionTitle}>时间信息</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>计划开始</Text>
            <Text style={styles.infoValue}>{formatDate(task.plannedStartTime)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>计划结束</Text>
            <Text style={styles.infoValue}>{formatDate(task.plannedEndTime)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>实际开始</Text>
            <Text style={styles.infoValue}>{formatDate(task.actualStartTime)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>实际结束</Text>
            <Text style={styles.infoValue}>{formatDate(task.actualEndTime)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>预估时长</Text>
            <Text style={styles.infoValue}>
              {task.estimatedDuration ? `${task.estimatedDuration} 分钟` : '-'}
            </Text>
          </View>
        </View>

        {task.participants && task.participants.length > 0 && (
          <View style={commonStyles.card}>
            <Text style={styles.sectionTitle}>参与者</Text>
            <View style={styles.participantsRow}>
              {task.participants.map((p, i) => (
                <View key={p.userId || i} style={styles.participantTag}>
                  <Text style={styles.participantText}>{p.username}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {task.tags && task.tags.length > 0 && (
          <View style={commonStyles.card}>
            <Text style={styles.sectionTitle}>标签</Text>
            <View style={styles.tagsContainer}>
              {task.tags.map((tag, i) => (
                <View key={i} style={styles.tagItem}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {task.remarks && (
          <View style={commonStyles.card}>
            <Text style={styles.sectionTitle}>备注</Text>
            <Text style={styles.remarksText}>{task.remarks}</Text>
          </View>
        )}

        {logs.length > 0 && (
          <View style={commonStyles.card}>
            <Text style={styles.sectionTitle}>执行日志</Text>
            {logs.map((log, i) => (
              <View key={log.id || i} style={styles.logItem}>
                <View style={styles.logDot} />
                <View style={styles.logContent}>
                  <View style={styles.logHeader}>
                    <Text style={styles.logUser}>{log.executedByName || '系统'}</Text>
                    <Text style={styles.logTime}>{formatDate(log.createdAt)}</Text>
                  </View>
                  <StatusTag
                    text={log.statusName}
                    color={getTaskStatusColor(log.status as TaskStatus)}
                    backgroundColor={getTaskStatusBgColor(log.status as TaskStatus)}
                  />
                  {log.message && <Text style={styles.logMessage}>{log.message}</Text>}
                  {log.errorMessage && (
                    <Text style={styles.logError}>{log.errorMessage}</Text>
                  )}
                  <Text style={styles.logProgress}>进度: {log.progressPercentage}%</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + AppStyles.spacing.md }]}>
        {canExecute && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push(`/task/execute/${id}`)}
          >
            <Ionicons name="play-circle-outline" size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>执行任务</Text>
          </TouchableOpacity>
        )}
        {canCancel && (
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={() => setCancelConfirmVisible(true)}
          >
            <Text style={styles.dangerButtonText}>取消任务</Text>
          </TouchableOpacity>
        )}
      </View>

      <ConfirmModal
        visible={cancelConfirmVisible}
        title="取消任务"
        message={`确定要取消任务「${task.taskName}」吗？`}
        icon="close-circle-outline"
        iconColor={AppStyles.colors.warning}
        confirmText="确定取消"
        confirmColor={AppStyles.colors.warning}
        onConfirm={handleCancel}
        onCancel={() => setCancelConfirmVisible(false)}
      />

      <ConfirmModal
        visible={deleteConfirmVisible}
        title="删除任务"
        message={`确定要删除任务「${task.taskName}」吗？此操作不可撤销。`}
        icon="trash-outline"
        iconColor={AppStyles.colors.error}
        confirmText="删除"
        confirmColor={AppStyles.colors.error}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppStyles.colors.background,
  },
  header: {
    marginBottom: AppStyles.spacing.md,
  },
  name: {
    fontSize: AppStyles.fontSize.xxl,
    fontWeight: 'bold',
    color: AppStyles.colors.text,
    marginBottom: AppStyles.spacing.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  typeTag: {
    marginLeft: AppStyles.spacing.sm,
    paddingHorizontal: AppStyles.spacing.sm,
    paddingVertical: 3,
    borderRadius: AppStyles.borderRadius.sm,
    backgroundColor: '#f0f5ff',
  },
  typeText: {
    fontSize: AppStyles.fontSize.xs,
    color: '#667eea',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: AppStyles.fontSize.md,
    fontWeight: '600',
    color: AppStyles.colors.text,
    marginBottom: AppStyles.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: AppStyles.spacing.sm,
  },
  infoLabel: {
    fontSize: AppStyles.fontSize.sm,
    color: AppStyles.colors.textSecondary,
    marginLeft: AppStyles.spacing.sm,
    flex: 1,
  },
  infoValue: {
    fontSize: AppStyles.fontSize.sm,
    color: AppStyles.colors.text,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  descBlock: {
    marginBottom: AppStyles.spacing.sm,
  },
  descLabel: {
    fontSize: AppStyles.fontSize.sm,
    color: AppStyles.colors.textSecondary,
    marginBottom: AppStyles.spacing.xs,
  },
  descText: {
    fontSize: AppStyles.fontSize.sm,
    color: AppStyles.colors.text,
    lineHeight: 22,
  },
  participantsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AppStyles.spacing.sm,
  },
  participantTag: {
    paddingHorizontal: AppStyles.spacing.md,
    paddingVertical: AppStyles.spacing.xs + 2,
    borderRadius: AppStyles.borderRadius.full,
    backgroundColor: AppStyles.colors.primary + '15',
  },
  participantText: {
    fontSize: AppStyles.fontSize.xs,
    color: AppStyles.colors.primary,
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AppStyles.spacing.sm,
  },
  tagItem: {
    paddingHorizontal: AppStyles.spacing.sm,
    paddingVertical: 3,
    borderRadius: AppStyles.borderRadius.sm,
    backgroundColor: '#e6f7ff',
  },
  tagText: {
    fontSize: AppStyles.fontSize.xs,
    color: '#1890ff',
    fontWeight: '500',
  },
  remarksText: {
    fontSize: AppStyles.fontSize.sm,
    color: AppStyles.colors.text,
    lineHeight: 22,
  },
  logItem: {
    flexDirection: 'row',
    marginBottom: AppStyles.spacing.md,
  },
  logDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: AppStyles.colors.primary,
    marginTop: 4,
    marginRight: AppStyles.spacing.md,
  },
  logContent: {
    flex: 1,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logUser: {
    fontSize: AppStyles.fontSize.sm,
    fontWeight: '600',
    color: AppStyles.colors.text,
  },
  logTime: {
    fontSize: AppStyles.fontSize.xs,
    color: AppStyles.colors.textTertiary,
  },
  logMessage: {
    fontSize: AppStyles.fontSize.sm,
    color: AppStyles.colors.text,
    marginTop: 4,
  },
  logError: {
    fontSize: AppStyles.fontSize.sm,
    color: AppStyles.colors.error,
    marginTop: 4,
  },
  logProgress: {
    fontSize: AppStyles.fontSize.xs,
    color: AppStyles.colors.textTertiary,
    marginTop: 4,
  },
  bottomBar: {
    flexDirection: 'row',
    padding: AppStyles.spacing.md,
    backgroundColor: AppStyles.colors.cardBackground,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: AppStyles.colors.border,
    gap: AppStyles.spacing.sm,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppStyles.colors.primary,
    paddingVertical: AppStyles.spacing.md - 2,
    borderRadius: AppStyles.borderRadius.md,
    gap: 6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: AppStyles.fontSize.md,
    fontWeight: '600',
  },
  dangerButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppStyles.colors.error + '10',
    paddingVertical: AppStyles.spacing.md - 2,
    borderRadius: AppStyles.borderRadius.md,
    borderWidth: 1,
    borderColor: AppStyles.colors.error,
  },
  dangerButtonText: {
    color: AppStyles.colors.error,
    fontSize: AppStyles.fontSize.md,
    fontWeight: '600',
  },
});
