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
import { AppStyles } from '../../../constants/AppStyles';
import { useTheme } from '../../../utils/theme';
import { projectService } from '../../../services/projectService';
import { ProjectDto, ProjectStatus, ProjectQueryParams } from '../../../types/project';
import ProjectCard from '../../../components/project/ProjectCard';
import SearchBar from '../../../components/ui/SearchBar';
import EmptyState from '../../../components/ui/EmptyState';
import ErrorView from '../../../components/ui/ErrorView';
import StatCard from '../../../components/ui/StatCard';
import { useRefresh } from '../../../hooks/useRefresh';

const STATUS_TABS = [
  { value: undefined, label: '全部' },
  { value: ProjectStatus.InProgress, label: '进行中' },
  { value: ProjectStatus.Completed, label: '已完成' },
  { value: ProjectStatus.Planning, label: '规划中' },
];

export default function ProjectsListScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
      color: '#fff',
    },
    footerLoader: {
      paddingVertical: AppStyles.spacing.lg,
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
  }), [colors, insets]);
  
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalProjects, setTotalProjects] = useState(0);
  const [inProgressCount, setInProgressCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  const fetchProjects = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1 && !append) setLoading(true);
      setError(null);

      const params: ProjectQueryParams = {
        page: pageNum,
        pageSize: 20,
        keyword: keyword || undefined,
        status: statusFilter,
      };

      const res = await projectService.getProjectList(params);
      if (res.success && res.data) {
        const items = res.data.queryable || [];
        if (append) {
          setProjects(prev => [...prev, ...items]);
        } else {
          setProjects(items);
        }
        setHasMore(pageNum < res.data.pageCount);
        setTotalProjects(res.data.rowCount);
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
      const res = await projectService.getProjectStatistics();
      if (res.success && res.data) {
        setInProgressCount(res.data.inProgressProjects);
        setCompletedCount(res.data.completedProjects);
      }
    } catch {}
  }, []);

  useEffect(() => {
    setPage(1);
    fetchProjects(1);
    fetchStatistics();
  }, [statusFilter]);

  useFocusEffect(
    useCallback(() => {
      setPage(1);
      fetchProjects(1);
      fetchStatistics();
    }, [fetchProjects, fetchStatistics])
  );

  const handleSearch = (text: string) => {
    setKeyword(text);
    setPage(1);
    fetchProjects(1);
  };

  const handleLoadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProjects(nextPage, true);
  };

  const { refreshing, onRefresh } = useRefresh(async () => {
    setPage(1);
    await fetchProjects(1);
    await fetchStatistics();
  });

  const renderHeader = () => (
    <View>
      <SearchBar onSearch={handleSearch} placeholder="搜索项目名称" />
      <View style={styles.statRow}>
        <StatCard title="全部项目" value={totalProjects} icon="folder-outline" />
        <View style={styles.statGap} />
        <StatCard title="进行中" value={inProgressCount} icon="play-circle-outline" color={colors.primary} />
        <View style={styles.statGap} />
        <StatCard title="已完成" value={completedCount} icon="checkmark-circle-outline" color={colors.success} />
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
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (error && projects.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {renderHeader()}
        <ErrorView message={error} onRetry={() => fetchProjects(1)} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={projects}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.itemWrapper}>
            <ProjectCard
              project={item}
              onPress={(project) => router.push(`/project/${project.id}`)}
            />
          </View>
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={<EmptyState title="暂无项目" message="点击右上角 + 创建新项目" />}
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
        onPress={() => router.push('/project/create')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
