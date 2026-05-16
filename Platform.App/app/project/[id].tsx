import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppStyles, createCommonStyles } from '../../constants/AppStyles';
import { useTheme } from '../../utils/theme';
import { projectService } from '../../services/projectService';
import { taskService } from '../../services/taskService';
import { ProjectDto, ProjectMemberDto, ProjectStatus } from '../../types/project';
import { TaskDto } from '../../types/task';
import StatusTag from '../../components/ui/StatusTag';
import PriorityTag from '../../components/ui/PriorityTag';
import ProgressBar from '../../components/ui/ProgressBar';
import LoadingView from '../../components/ui/LoadingView';
import ErrorView from '../../components/ui/ErrorView';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';
import ProjectMemberList from '../../components/project/ProjectMemberList';
import { getProjectStatusColor, getProjectStatusBgColor, formatDate } from '../../utils/task';

export default function ProjectDetailScreen() {
  const { colors, isDark } = useTheme();
  const comStyles = useMemo(() => createCommonStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: AppStyles.spacing.md,
      paddingBottom: 20,
    },
    header: {
      marginBottom: AppStyles.spacing.md,
    },
    headerActions: {
      flexDirection: 'row',
      gap: 8,
    },
    headerButton: {
      padding: 8,
    },
    name: {
      fontSize: AppStyles.fontSize.xxl,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: AppStyles.spacing.sm,
    },
    tags: {
      flexDirection: 'row',
      alignItems: 'center',
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
    descRow: {
      paddingVertical: AppStyles.spacing.sm,
    },
    descText: {
      fontSize: AppStyles.fontSize.sm,
      color: colors.text,
      lineHeight: 22,
      marginTop: AppStyles.spacing.xs,
    },
    taskStatsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: AppStyles.spacing.md,
    },
    taskStat: {
      alignItems: 'center',
    },
    taskStatValue: {
      fontSize: AppStyles.fontSize.xxl,
      fontWeight: 'bold',
      color: colors.text,
    },
    taskStatLabel: {
      fontSize: AppStyles.fontSize.xs,
      color: colors.textTertiary,
      marginTop: 2,
    },
    viewTasksButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: AppStyles.spacing.sm,
      paddingTop: AppStyles.spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderLight,
    },
    viewTasksText: {
      fontSize: AppStyles.fontSize.sm,
      color: colors.primary,
      marginRight: 4,
      fontWeight: '500',
    },
  }), [colors]);
  
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<ProjectDto | null>(null);
  const [members, setMembers] = useState<ProjectMemberDto[]>([]);
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [projectRes, membersRes, tasksRes] = await Promise.all([
        projectService.getProjectById(id),
        projectService.getProjectMembers(id),
        taskService.getTasksByProject(id),
      ]);

      if (projectRes.success && projectRes.data) {
        setProject(projectRes.data);
      } else {
        setError(projectRes.message || '加载项目失败');
      }

      if (membersRes.success && membersRes.data) {
        setMembers(membersRes.data);
      }

      if (tasksRes.success && tasksRes.data) {
        setTasks(tasksRes.data);
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

  const handleDelete = async () => {
    setDeleteConfirmVisible(false);
    try {
      await projectService.deleteProject(id);
      router.back();
    } catch {}
  };

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} onRetry={loadData} />;
  if (!project) return <ErrorView message="项目不存在" />;

  const activeTasks = tasks.filter(
    t => t.status === 0 || t.status === 2
  ).length;
  const completedTasks = tasks.filter(t => t.status === 3).length;

  return (
    <>
      <Stack.Screen
        options={{
          title: project.name,
          headerRight: () => (
            <View style={styles.headerActions}>
              {project.canEdit && (
                <TouchableOpacity
                  onPress={() => router.push(`/project/edit/${id}`)}
                  style={styles.headerButton}
                >
                  <Ionicons name="pencil-outline" size={22} color={colors.primary} />
                </TouchableOpacity>
              )}
              {project.canDelete && (
                <TouchableOpacity
                  onPress={() => setDeleteConfirmVisible(true)}
                  style={styles.headerButton}
                >
                  <Ionicons name="trash-outline" size={22} color={colors.error} />
                </TouchableOpacity>
              )}
            </View>
          ),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.name}>{project.name}</Text>
          <View style={styles.tags}>
            <StatusTag
              text={project.statusName}
              color={getProjectStatusColor(project.status)}
              backgroundColor={getProjectStatusBgColor(project.status)}
              size="md"
            />
            <View style={{ marginLeft: 8 }}>
              <PriorityTag priority={project.priority} text={project.priorityName} size="md" />
            </View>
          </View>
        </View>

        <View style={comStyles.card}>
          <Text style={styles.sectionTitle}>进度</Text>
          <ProgressBar percentage={project.progress} height={10} />
        </View>

        <View style={comStyles.card}>
          <Text style={styles.sectionTitle}>基本信息</Text>
          {project.startDate && (
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
              </View>
              <Text style={styles.infoLabel}>时间</Text>
              <Text style={styles.infoValue}>
                {formatDate(project.startDate, 'date')}
                {project.endDate ? ` ~ ${formatDate(project.endDate, 'date')}` : ''}
              </Text>
            </View>
          )}
          {project.budget !== undefined && project.budget !== null && (
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="cash-outline" size={16} color={colors.textSecondary} />
              </View>
              <Text style={styles.infoLabel}>预算</Text>
              <Text style={styles.infoValue}>¥{project.budget.toLocaleString()}</Text>
            </View>
          )}
          {project.description && (
            <View style={styles.descRow}>
              <Text style={styles.infoLabel}>描述</Text>
              <Text style={styles.descText}>{project.description}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
            </View>
            <Text style={styles.infoLabel}>创建人</Text>
            <Text style={styles.infoValue}>{project.createdByName || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            </View>
            <Text style={styles.infoLabel}>创建时间</Text>
            <Text style={styles.infoValue}>{formatDate(project.createdAt)}</Text>
          </View>
        </View>

        <View style={comStyles.card}>
          <Text style={styles.sectionTitle}>项目成员</Text>
          <ProjectMemberList members={members} />
        </View>

        <View style={comStyles.card}>
          <Text style={styles.sectionTitle}>任务概览</Text>
          <View style={styles.taskStatsRow}>
            <View style={styles.taskStat}>
              <Text style={styles.taskStatValue}>{tasks.length}</Text>
              <Text style={styles.taskStatLabel}>全部</Text>
            </View>
            <View style={styles.taskStat}>
              <Text style={[styles.taskStatValue, { color: colors.primary }]}>{activeTasks}</Text>
              <Text style={styles.taskStatLabel}>进行中</Text>
            </View>
            <View style={styles.taskStat}>
              <Text style={[styles.taskStatValue, { color: colors.success }]}>{completedTasks}</Text>
              <Text style={styles.taskStatLabel}>已完成</Text>
            </View>
          </View>
          {tasks.length > 0 && (
            <TouchableOpacity
              style={styles.viewTasksButton}
              onPress={() => router.push('/(tabs)/tasks')}
            >
              <Text style={styles.viewTasksText}>查看全部任务</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <ConfirmModal
        visible={deleteConfirmVisible}
        title="删除项目"
        message={`确定要删除项目「${project.name}」吗？此操作不可撤销。`}
        icon="trash-outline"
        iconColor={colors.error}
        confirmText="删除"
        confirmColor={colors.error}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmVisible(false)}
      />
    </>
  );
}
