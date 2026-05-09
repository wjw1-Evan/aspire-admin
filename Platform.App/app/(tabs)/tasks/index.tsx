import React, { useState, useEffect, useCallback } from 'react';
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
import { AppStyles } from '../../../constants/AppStyles';
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

const STATUS_TABS = [
  { value: undefined, label: '全部' },
  { value: TaskStatus.InProgress, label: '进行中' },
  { value: TaskStatus.Pending, label: '待办' },
  { value: TaskStatus.Completed, label: '已完成' },
];

export default function TasksListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
        setError(res.message || '加载失败');
      }
    } catch (err: any) {
      setError(err?.message || '网络错误');
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
    } catch {}
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await projectService.getProjectList({ page: 1, pageSize: 100 });
      if (res.success && res.data) {
        setProjects(res.data.queryable || []);
      }
    } catch {}
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
      <SearchBar onSearch={handleSearch} placeholder="搜索任务名称" />
      <View style={styles.statRow}>
        <StatCard title="全部任务" value={totalTasks} icon="list-outline" />
        <View style={styles.statGap} />
        <StatCard title="进行中" value={inProgressCount} icon="play-circle-outline" color="#1890ff" />
        <View style={styles.statGap} />
        <StatCard title="已完成" value={completedCount} icon="checkmark-circle-outline" color="#10b981" />
      </View>
      <View style={styles.tabRow}>
        {STATUS_TABS.map(tab => (
          <TouchableOpacity
            key={tab.label}
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
          <ActivityIndicator size="large" color={AppStyles.colors.primary} />
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
        ListEmptyComponent={<EmptyState title="暂无任务" message="点击右上角 + 创建新任务" />}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={styles.footerLoader} size="small" color={AppStyles.colors.primary} />
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + AppStyles.spacing.lg }]}
        onPress={() => router.push({ pathname: '/task/create', params: { projects: JSON.stringify(projects) } })}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppStyles.colors.cardBackground,
  },
  fab: {
    position: 'absolute',
    right: AppStyles.spacing.lg,
    bottom: AppStyles.spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: AppStyles.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...AppStyles.shadows.lg,
  },
  list: {
    paddingBottom: 80,
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
    backgroundColor: AppStyles.colors.cardBackground,
    borderWidth: 1,
    borderColor: AppStyles.colors.border,
  },
  tabActive: {
    backgroundColor: AppStyles.colors.primary,
    borderColor: AppStyles.colors.primary,
  },
  tabText: {
    fontSize: AppStyles.fontSize.xs,
    color: AppStyles.colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
  },
  footerLoader: {
    paddingVertical: AppStyles.spacing.lg,
  },
});
