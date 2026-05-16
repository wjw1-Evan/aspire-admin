import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppStyles } from '../../constants/AppStyles';
import { useTheme } from '../../utils/theme';
import { enterpriseService } from '../../services/enterpriseService';
import { ServiceRequestDto } from '../../types/enterprise-service';
import ServiceRequestCard from '../../components/enterprise-service/ServiceRequestCard';
import SearchBar from '../../components/ui/SearchBar';
import EmptyState from '../../components/ui/EmptyState';
import ErrorView from '../../components/ui/ErrorView';
import StatCard from '../../components/ui/StatCard';
import { useRefresh } from '../../hooks/useRefresh';

const STATUS_TABS = (t: any) => [
  { value: undefined, label: t('enterprise_service.all') },
  { value: 'Pending', label: t('enterprise_service.pending') },
  { value: 'Processing', label: t('enterprise_service.processing') },
  { value: 'Completed', label: t('enterprise_service.completed') },
];

export default function EnterpriseServiceListScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
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
  }), [colors, insets.bottom]);

  const router = useRouter();
  const [requests, setRequests] = useState<ServiceRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [statistics, setStatistics] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    processingRequests: 0,
    averageRating: 0,
  });

  const fetchRequests = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1 && !append) setLoading(true);
      setError(null);

      const params: any = {
        page: pageNum,
        pageSize: 20,
        search: keyword || undefined,
        status: statusFilter,
      };

      const res = await enterpriseService.getRequestList(params);
      if (res.success && res.data) {
        const items = res.data.queryable || [];
        if (append) {
          setRequests(prev => [...prev, ...items]);
        } else {
          setRequests(items);
        }
        setHasMore(pageNum < res.data.pageCount);
      } else {
        setError(res.message || t('common.error'));
      }
    } catch (err: any) {
      setError(err?.message || t('common.network_error'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [keyword, statusFilter, t]);

  const fetchStatistics = useCallback(async () => {
    try {
      const res = await enterpriseService.getStatistics();
      if (res.success && res.data) {
        setStatistics({
          totalRequests: res.data.totalRequests,
          pendingRequests: res.data.pendingRequests,
          processingRequests: res.data.processingRequests,
          averageRating: res.data.averageRating,
        });
      }
    } catch {}
  }, []);

  useEffect(() => {
    setPage(1);
    fetchRequests(1);
    fetchStatistics();
  }, [statusFilter]);

  useFocusEffect(
    useCallback(() => {
      setPage(1);
      fetchRequests(1);
      fetchStatistics();
    }, [fetchRequests, fetchStatistics])
  );

  const handleSearch = (text: string) => {
    setKeyword(text);
    setPage(1);
    fetchRequests(1);
  };

  const handleLoadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchRequests(nextPage, true);
  };

  const { refreshing, onRefresh } = useRefresh(async () => {
    setPage(1);
    await fetchRequests(1);
    await fetchStatistics();
  });

  const renderHeader = () => (
    <View>
      <SearchBar onSearch={handleSearch} placeholder={t('enterprise_service.search_placeholder')} />
      <View style={styles.statRow}>
        <StatCard
          title={t('enterprise_service.total_requests')}
          value={statistics.totalRequests}
          icon="document-text-outline"
        />
        <View style={styles.statGap} />
        <StatCard
          title={t('enterprise_service.pending_count')}
          value={statistics.pendingRequests}
          icon="time-outline"
          color={colors.warning}
        />
        <View style={styles.statGap} />
        <StatCard
          title={t('enterprise_service.processing_count')}
          value={statistics.processingRequests}
          icon="sync-outline"
          color={colors.primary}
        />
        <View style={styles.statGap} />
        <StatCard
          title={t('enterprise_service.satisfaction')}
          value={statistics.averageRating > 0 ? statistics.averageRating.toFixed(1) : '-'}
          icon="star-outline"
          color={colors.warning}
        />
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

  if (error && requests.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {renderHeader()}
        <ErrorView message={error} onRetry={() => fetchRequests(1)} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={requests}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.itemWrapper}>
            <ServiceRequestCard
              request={item}
              onPress={(request) => router.push(`/enterprise-service/${request.id}`)}
            />
          </View>
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            title={t('enterprise_service.no_requests')}
            message={t('enterprise_service.create_hint')}
          />
        }
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
        onPress={() => router.push('/enterprise-service/create')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
