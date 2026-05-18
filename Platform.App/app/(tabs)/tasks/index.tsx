import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppStyles } from '../../../constants/AppStyles';
import { useTheme } from '../../../utils/theme';
import { taskService } from '../../../services/taskService';
import { projectService } from '../../../services/projectService';
import { TaskDto, TaskStatus, TaskQueryParams } from '../../../types/task';
import { ProjectDto } from '../../../types/project';
import TaskCard from '../../../components/task/TaskCard';
import SearchBar from '../../../components/ui/SearchBar';
import EmptyState from '../../../components/ui/EmptyState';
import ErrorView from '../../../components/ui/ErrorView';
import StatCard from '../../../components/ui/StatCard';
import { useRefresh } from '../../../hooks/useRefresh';

const STATUS_TABS = (t: any) => [
  { value: undefined, label: t('tasks.all') },
  { value: TaskStatus.InProgress, label: t('tasks.in_progress') },
  { value: TaskStatus.Pending, label: t('tasks.pending') },
  { value: TaskStatus.Completed, label: t('tasks.completed') },
];

export default function TasksListScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    fab: {
      position: 'absolute',
      right: AppStyles.spacing.lg,
      bottom: insets.bottom + 90,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...AppStyles.shadows.lg,
    },
    list: {
      paddingBottom: 100,
    },
    itemWrapper: {
      marginHorizontal: AppStyles.spacing.md,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    statRow: {
      flexDirection: 'row',
      paddingHorizontal: AppStyles.spacing.md,
      paddingVertical: AppStyles.spacing.sm,
    },
    statGap: {
      width: AppStyles.spacing.sm,
    },
    tabRow: {
      flexDirection: 'row',
      paddingHorizontal: AppStyles.spacing.md,
      marginBottom: AppStyles.spacing.sm,
    },
    tab: {
      paddingHorizontal: AppStyles.spacing.md,
      paddingVertical: AppStyles.spacing.sm - 2,
      borderRadius: AppStyles.borderRadius.full,
      marginRight: AppStyles.spacing.sm,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    tabText: {
      fontSize: AppStyles.fontSize.xs,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    tabTextActive: {
      color: colors.white,
    },
    footerLoader: {
      paddingVertical: AppStyles.spacing.lg,
    },
  }), [colors, insets]);
  
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalTasks, setTotalTasks] = useState(0);
  const [inProgressCount, setInProgressCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [projects, setProjects] = useState<ProjectDto[]>([]);

  const fetchTasks = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1 && !append) setLoading(true);
      setError(null);

      const params: TaskQueryParams = {
        page: pageNum,
        pageSize: 20,
        keyword: keyword || undefined,
        status: statusFilter,
      };

      const res = await taskService.getTaskList(params);
      if (res.success && res.data) {
        const items = res.data.queryable || [];
        if (append) {
          setTasks(prev => [...prev, ...items]);
        } else {
          setTasks(items);
        }
        setHasMore(pageNum < res.data.pageCount);
        setTotalTasks(res.data.rowCount);
      } else {
        setError(res.message || t('common.error'));
      }
    } catch (err: any) {
      setError(err?.message || t('common.network_error'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [keyword, statusFilter]);

  const fetchStatistics = useCallback(async () => {
    try {
      const res = await taskService.getTaskStatistics();
      if (res.success && res.data) {
        setInProgressCount(res.data.inProgressTasks);
        setCompletedCount(res.data.completedTasks);
      }
    } catch (e) {
      if (__DEV__) console.warn('Failed to fetch task statistics:', e);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await projectService.getProjectList({ page: 1, pageSize: 100 });
      if (res.success && res.data) {
        setProjects(res.data.queryable || []);
      }
    } catch (e) {
      if (__DEV__) console.warn('Failed to fetch projects:', e);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchTasks(1);
    fetchStatistics();
    fetchProjects();
  }, [statusFilter]);

  useFocusEffect(
    useCallback(() => {
      setPage(1);
      fetchTasks(1);
      fetchStatistics();
    }, [fetchTasks, fetchStatistics])
  );

  const handleSearch = (text: string) => {
    setKeyword(text);
    setPage(1);
    fetchTasks(1);
  };

  const handleLoadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchTasks(nextPage, true);
  };

  const { refreshing, onRefresh } = useRefresh(async () => {
    setPage(1);
    await fetchTasks(1);
    await fetchStatistics();
  });

  const renderHeader = () => (
    <View>
      <SearchBar onSearch={handleSearch} placeholder={t('tasks.search_placeholder')} />
      <View style={styles.statRow}>
        <StatCard title={t('tasks.all_tasks')} value={totalTasks} icon="list-outline" />
        <View style={styles.statGap} />
        <StatCard title={t('tasks.in_progress')} value={inProgressCount} icon="play-circle-outline" color={colors.primary} />
        <View style={styles.statGap} />
        <StatCard title={t('tasks.completed')} value={completedCount} icon="checkmark-circle-outline" color={colors.success} />
      </View>
      <View style={styles.tabRow}>
        {STATUS_TABS(t).map(tab => (
          <TouchableOpacity
            key={tab.value ?? 'all'}
            style={[styles.tab, statusFilter === tab.value && styles.tabActive]}
            onPress={() => setStatusFilter(tab.value)}
          >
            <Text style={[styles.tabText, statusFilter === tab.value && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (error && tasks.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {renderHeader()}
        <ErrorView message={error} onRetry={() => fetchTasks(1)} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={tasks}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.itemWrapper}>
            <TaskCard
              task={item}
              onPress={(task) => router.push(`/task/${task.id}`)}
            />
          </View>
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={<EmptyState title={t('tasks.no_tasks')} message={t('tasks.create_task_hint')} />}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={styles.footerLoader} size="small" color={colors.primary} />
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push({ pathname: '/task/create', params: { projects: JSON.stringify(projects) } })}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}
