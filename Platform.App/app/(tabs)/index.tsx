import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, ScrollView, RefreshControl, ActivityIndicator, View as RNView, Text as RNText, Platform, TouchableOpacity } from 'react-native';
import { Text, View } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppStyles, commonStyles } from '../../constants/AppStyles';
import { authService } from '../../services/authService';
import { taskService } from '../../services/taskService';
import { projectService } from '../../services/projectService';
import { sseService } from '../../services/sseService';
import { User } from '../../types/auth';
import { TaskDto, TaskStatus } from '../../types/task';
import { ProjectDto, ProjectStatus } from '../../types/project';
import { Link, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import TaskCard from '../../components/task/TaskCard';
import ProgressBar from '../../components/ui/ProgressBar';
import { getTaskStatusColor } from '../../utils/task';

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [todoTasks, setTodoTasks] = useState<TaskDto[]>([]);
  const [activeProjects, setActiveProjects] = useState<ProjectDto[]>([]);

  const fetchTodoTasks = useCallback(async () => {
    try {
      const res = await taskService.getMyTodoTasks();
      if (res.success && res.data) {
        setTodoTasks(res.data.slice(0, 5));
      }
    } catch {}
  }, []);

  const fetchActiveProjects = useCallback(async () => {
    try {
      const res = await projectService.getProjectList({
        status: ProjectStatus.InProgress,
        page: 1,
        pageSize: 5,
      });
      if (res.success && res.data) {
        setActiveProjects(res.data.queryable || []);
      }
    } catch {}
  }, []);

  const loadData = async () => {
    try {
      const userResponse = await authService.getCurrentUser();
      if (userResponse.success && userResponse.data) {
        setUser(userResponse.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    fetchTodoTasks();
    fetchActiveProjects();
    sseService.connect({
      onStats: (stats) => {
        setUnreadCount(stats.UnreadTotal ?? stats.Total ?? 0);
      },
    });
    return () => sseService.disconnect();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTodoTasks();
      fetchActiveProjects();
      sseService.connect({
        onStats: (stats) => {
          setUnreadCount(stats.UnreadTotal ?? stats.Total ?? 0);
        },
      });
      return () => sseService.disconnect();
    }, [fetchTodoTasks, fetchActiveProjects])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    fetchTodoTasks();
    fetchActiveProjects();
  };

  if (loading) {
    return (
      <View style={commonStyles.pageContainer}>
        <ActivityIndicator size="large" color={AppStyles.colors.primary} />
      </View>
    );
  }

  return (
    <View style={commonStyles.pageContainer}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <LinearGradient
          colors={AppStyles.gradients.primary as unknown as readonly [string, string, ...string[]]}
          style={commonStyles.gradientHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.5, 1]}
        >
          <RNView style={styles.headerContent}>
            <RNView>
              <RNText style={styles.greeting}>欢迎回来</RNText>
              <RNText style={styles.userName}>
                {user?.realName || user?.username || '用户'}
              </RNText>
            </RNView>
            <RNView style={styles.headerRight}>
              <Link href="/notifications" asChild>
                <TouchableOpacity style={styles.noticeButton}>
                  <Ionicons name="notifications-outline" size={24} color="#fff" />
                  {unreadCount > 0 && (
                    <RNView style={styles.noticeBadge}>
                      <RNText style={styles.noticeBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</RNText>
                    </RNView>
                  )}
                </TouchableOpacity>
              </Link>
              <RNView style={styles.avatarContainer}>
                <RNText style={styles.avatarText}>
                  {(user?.realName || user?.username || 'U').charAt(0).toUpperCase()}
                </RNText>
              </RNView>
            </RNView>
          </RNView>
        </LinearGradient>

        <View style={styles.contentSection}>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/task/create')}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#667eea18' }]}>
                <Ionicons name="add-circle-outline" size={22} color="#667eea" />
              </View>
              <Text style={styles.quickActionText}>创建任务</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/project/create')}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#10b98118' }]}>
                <Ionicons name="folder-open-outline" size={22} color="#10b981" />
              </View>
              <Text style={styles.quickActionText}>创建项目</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/(tabs)/tasks')}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#f59e0b18' }]}>
                <Ionicons name="list-outline" size={22} color="#f59e0b" />
              </View>
              <Text style={styles.quickActionText}>全部任务</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/(tabs)/projects')}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#ef444418' }]}>
                <Ionicons name="briefcase-outline" size={22} color="#ef4444" />
              </View>
              <Text style={styles.quickActionText}>全部项目</Text>
            </TouchableOpacity>
          </View>

          {todoTasks.length > 0 && (
            <View style={styles.sectionCard}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => router.push('/(tabs)/tasks')}
              >
                <View style={styles.sectionHeaderLeft}>
                  <Ionicons name="checkbox-outline" size={20} color={AppStyles.colors.primary} />
                  <Text style={styles.sectionTitle}>我的待办</Text>
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>{todoTasks.length}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={AppStyles.colors.textTertiary} />
              </TouchableOpacity>
              {todoTasks.map(task => (
                <TouchableOpacity
                  key={task.id}
                  style={styles.todoItem}
                  onPress={() => router.push(`/task/${task.id}`)}
                >
                  <Ionicons
                    name={task.status === TaskStatus.Completed ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={getTaskStatusColor(task.status)}
                    style={{ marginRight: 10 }}
                  />
                  <Text style={styles.todoText} numberOfLines={1}>{task.taskName}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {activeProjects.length > 0 && (
            <View style={styles.sectionCard}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => router.push('/(tabs)/projects')}
              >
                <View style={styles.sectionHeaderLeft}>
                  <Ionicons name="folder-outline" size={20} color={AppStyles.colors.primary} />
                  <Text style={styles.sectionTitle}>进行中项目</Text>
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>{activeProjects.length}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={AppStyles.colors.textTertiary} />
              </TouchableOpacity>
              {activeProjects.map(project => (
                <TouchableOpacity
                  key={project.id}
                  style={styles.projectItem}
                  onPress={() => router.push(`/project/${project.id}`)}
                >
                  <View style={styles.projectItemLeft}>
                    <Ionicons name="folder" size={16} color={AppStyles.colors.primary} />
                    <Text style={styles.projectName} numberOfLines={1}>{project.name}</Text>
                  </View>
                  <View style={styles.projectProgress}>
                    <ProgressBar percentage={project.progress} showLabel={false} height={4} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}


        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  greeting: {
    fontSize: AppStyles.fontSize.md,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: AppStyles.spacing.xs,
  },
  userName: {
    fontSize: AppStyles.fontSize.xxxl,
    fontWeight: 'bold',
    color: '#fff',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    marginLeft: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noticeButton: {
    position: 'relative',
    padding: 8,
  },
  noticeBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ff4d4f',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  noticeBadgeText: {
    color: '#fff',
    fontSize: AppStyles.fontSize.xs,
    fontWeight: '700',
  },
  avatarText: {
    fontSize: AppStyles.fontSize.xl,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
    width: '100%',
    ...Platform.select({
      web: {
        overflowY: 'auto',
        maxWidth: '100%',
      },
      default: {},
    }),
  },
  contentContainer: {
    flexGrow: 1,
    width: '100%',
    ...Platform.select({
      web: {
        maxWidth: '100%',
      },
      default: {},
    }),
  },
  contentSection: {
    padding: AppStyles.spacing.lg,
    paddingTop: AppStyles.spacing.lg,
  },
  quickActionsRow: {
    flexDirection: 'row',
    marginBottom: AppStyles.spacing.lg,
    gap: AppStyles.spacing.sm,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: AppStyles.colors.cardBackground,
    borderRadius: AppStyles.borderRadius.md,
    padding: AppStyles.spacing.md,
    ...AppStyles.shadows.sm,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: AppStyles.spacing.sm,
  },
  quickActionText: {
    fontSize: AppStyles.fontSize.xs,
    color: AppStyles.colors.textSecondary,
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: AppStyles.colors.cardBackground,
    borderRadius: AppStyles.borderRadius.lg,
    padding: AppStyles.spacing.md,
    marginBottom: AppStyles.spacing.md,
    ...AppStyles.shadows.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AppStyles.spacing.sm,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: AppStyles.fontSize.md,
    fontWeight: '600',
    color: AppStyles.colors.text,
    marginLeft: AppStyles.spacing.sm,
  },
  sectionBadge: {
    marginLeft: AppStyles.spacing.sm,
    backgroundColor: AppStyles.colors.primary + '15',
    paddingHorizontal: AppStyles.spacing.sm,
    paddingVertical: 2,
    borderRadius: AppStyles.borderRadius.full,
  },
  sectionBadgeText: {
    fontSize: AppStyles.fontSize.xs,
    color: AppStyles.colors.primary,
    fontWeight: '600',
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: AppStyles.spacing.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: AppStyles.colors.borderLight,
  },
  todoText: {
    flex: 1,
    fontSize: AppStyles.fontSize.sm,
    color: AppStyles.colors.text,
  },
  projectItem: {
    paddingVertical: AppStyles.spacing.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: AppStyles.colors.borderLight,
  },
  projectItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AppStyles.spacing.sm,
  },
  projectName: {
    fontSize: AppStyles.fontSize.sm,
    color: AppStyles.colors.text,
    fontWeight: '500',
    marginLeft: AppStyles.spacing.sm,
    flex: 1,
  },
  projectProgress: {
    paddingLeft: 22,
  },
});
