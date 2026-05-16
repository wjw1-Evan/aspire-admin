import React, { useState, useEffect, useMemo } from 'react';
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
import { AppStyles, createCommonStyles } from '../../constants/AppStyles';
import { useTheme } from '../../utils/theme';
import { taskService } from '../../services/taskService';
import { TaskDto, TaskStatus, TaskExecutionLogDto } from '../../types/task';
import { useTranslation } from 'react-i18next';
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
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const comStyles = useMemo(() => createCommonStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: AppStyles.spacing.md,
      paddingBottom: 100,
    },
    header: {
      marginBottom: AppStyles.spacing.md,
    },
    name: {
      fontSize: AppStyles.fontSize.xxl,
      fontWeight: 'bold',
      color: colors.text,
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
      backgroundColor: colors.primary + '15',
    },
    typeText: {
      fontSize: AppStyles.fontSize.xs,
      color: colors.primary,
      fontWeight: '500',
    },
    sectionTitle: {
      fontSize: AppStyles.fontSize.md,
      fontWeight: '600',
      color: colors.text,
      marginBottom: AppStyles.spacing.md,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: AppStyles.spacing.sm,
    },
    infoIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: AppStyles.spacing.sm,
    },
    infoLabel: {
      fontSize: AppStyles.fontSize.sm,
      color: colors.textSecondary,
      flex: 1,
    },
    infoValue: {
      fontSize: AppStyles.fontSize.sm,
      color: colors.text,
      fontWeight: '500',
      flex: 2,
      textAlign: 'right',
    },
    descBlock: {
      marginBottom: AppStyles.spacing.sm,
    },
    descLabel: {
      fontSize: AppStyles.fontSize.sm,
      color: colors.textSecondary,
      marginBottom: AppStyles.spacing.xs,
    },
    descText: {
      fontSize: AppStyles.fontSize.sm,
      color: colors.text,
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
      backgroundColor: colors.primary + '15',
    },
    participantText: {
      fontSize: AppStyles.fontSize.xs,
      color: colors.primary,
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
      backgroundColor: colors.primary + '15',
    },
    tagText: {
      fontSize: AppStyles.fontSize.xs,
      color: colors.primary,
      fontWeight: '500',
    },
    remarksText: {
      fontSize: AppStyles.fontSize.sm,
      color: colors.text,
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
      backgroundColor: colors.primary,
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
      color: colors.text,
    },
    logTime: {
      fontSize: AppStyles.fontSize.xs,
      color: colors.textTertiary,
    },
    logMessage: {
      fontSize: AppStyles.fontSize.sm,
      color: colors.text,
      marginTop: 4,
    },
    logError: {
      fontSize: AppStyles.fontSize.sm,
      color: colors.error,
      marginTop: 4,
    },
    logProgress: {
      fontSize: AppStyles.fontSize.xs,
      color: colors.textTertiary,
      marginTop: 4,
    },
    bottomBar: {
      flexDirection: 'row',
      padding: AppStyles.spacing.md,
      backgroundColor: colors.cardBackground,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      gap: AppStyles.spacing.sm,
    },
    primaryButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
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
      backgroundColor: colors.error + '10',
      paddingVertical: AppStyles.spacing.md - 2,
      borderRadius: AppStyles.borderRadius.md,
      borderWidth: 1,
      borderColor: colors.error,
    },
    dangerButtonText: {
      color: colors.error,
      fontSize: AppStyles.fontSize.md,
      fontWeight: '600',
    },
  }), [colors]);
  
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [task, setTask] = useState<TaskDto | null>(null);
  const [logs, setLogs] = useState<TaskExecutionLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelConfirmVisible, setCancelConfirmVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

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
        setError(taskRes.message || t('tasks.load_failed'));
      }

      if (logsRes.success && logsRes.data) {
        setLogs(logsRes.data);
      }
    } catch (err: any) {
      setError(err?.message || t('common.network_error'));
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
  if (!task) return <ErrorView message={t('tasks.not_found')} />;

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
              <Ionicons name="pencil-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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

        <View style={comStyles.card}>
          <Text style={styles.sectionTitle}>{t('tasks.progress')}</Text>
          <ProgressBar percentage={task.completionPercentage} height={10} />
        </View>

        <View style={comStyles.card}>
          <Text style={styles.sectionTitle}>{t('tasks.basic_info')}</Text>
          {task.description && (
            <View style={styles.descBlock}>
              <Text style={styles.descLabel}>{t('tasks.description')}</Text>
              <Text style={styles.descText}>{task.description}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
            </View>
            <Text style={styles.infoLabel}>{t('tasks.creator')}</Text>
            <Text style={styles.infoValue}>{task.createdByName || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="person-circle-outline" size={16} color={colors.textSecondary} />
            </View>
            <Text style={styles.infoLabel}>{t('tasks.assignee')}</Text>
            <Text style={styles.infoValue}>{task.assignedToName || t('tasks.unassigned')}</Text>
          </View>
          {task.projectName && (
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="folder-outline" size={16} color={colors.textSecondary} />
              </View>
              <Text style={styles.infoLabel}>{t('tasks.related_project')}</Text>
              <TouchableOpacity onPress={() => task.projectId && router.push(`/project/${task.projectId}`)}>
                <Text style={[styles.infoValue, { color: colors.primary }]}>
                  {task.projectName}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={comStyles.card}>
          <Text style={styles.sectionTitle}>{t('tasks.time_info')}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('tasks.planned_start')}</Text>
            <Text style={styles.infoValue}>{formatDate(task.plannedStartTime)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('tasks.planned_end')}</Text>
            <Text style={styles.infoValue}>{formatDate(task.plannedEndTime)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('tasks.actual_start')}</Text>
            <Text style={styles.infoValue}>{formatDate(task.actualStartTime)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('tasks.actual_end')}</Text>
            <Text style={styles.infoValue}>{formatDate(task.actualEndTime)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('tasks.estimated_duration')}</Text>
            <Text style={styles.infoValue}>
              {task.estimatedDuration ? `${task.estimatedDuration} ${t('tasks.minutes')}` : '-'}
            </Text>
          </View>
        </View>

        {task.participants && task.participants.length > 0 && (
          <View style={comStyles.card}>
            <Text style={styles.sectionTitle}>{t('tasks.participants')}</Text>
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
          <View style={comStyles.card}>
            <Text style={styles.sectionTitle}>{t('tasks.tags')}</Text>
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
          <View style={comStyles.card}>
            <Text style={styles.sectionTitle}>{t('tasks.remarks')}</Text>
            <Text style={styles.remarksText}>{task.remarks}</Text>
          </View>
        )}

        {logs.length > 0 && (
          <View style={comStyles.card}>
            <Text style={styles.sectionTitle}>{t('tasks.execution_logs')}</Text>
            {logs.map((log, i) => (
              <View key={log.id || i} style={styles.logItem}>
                <View style={styles.logDot} />
                <View style={styles.logContent}>
                  <View style={styles.logHeader}>
                    <Text style={styles.logUser}>{log.executedByName || t('tasks.system')}</Text>
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
                  <Text style={styles.logProgress}>{t('tasks.log_progress')}: {log.progressPercentage}%</Text>
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
            <Text style={styles.primaryButtonText}>{t('tasks.execute_task')}</Text>
          </TouchableOpacity>
        )}
        {canCancel && (
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={() => setCancelConfirmVisible(true)}
          >
            <Text style={styles.dangerButtonText}>{t('tasks.cancel_task')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ConfirmModal
        visible={cancelConfirmVisible}
        title={t('tasks.cancel_confirm_title')}
        message={t('tasks.cancel_confirm_message', { name: task.taskName })}
        icon="close-circle-outline"
        iconColor={colors.warning}
        confirmText={t('tasks.cancel_confirm_btn')}
        confirmColor={colors.warning}
        onConfirm={handleCancel}
        onCancel={() => setCancelConfirmVisible(false)}
      />

      <ConfirmModal
        visible={deleteConfirmVisible}
        title={t('tasks.delete_confirm_title')}
        message={t('tasks.delete_confirm_message', { name: task.taskName })}
        icon="trash-outline"
        iconColor={colors.error}
        confirmText={t('tasks.delete_confirm_btn')}
        confirmColor={colors.error}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmVisible(false)}
      />
    </>
  );
}
