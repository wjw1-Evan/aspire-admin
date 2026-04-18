import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    TouchableOpacity,
    View as RNView,
    Text as RNText,
} from 'react-native';
import { View, Text } from '@/components/Themed';
import { AppStyles, commonStyles } from '@/constants/AppStyles';
import { notificationService } from '@/services/notificationService';
import { AppNotification, NotificationLevel, NotificationCategory } from '@/types/notification';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';

const PAGE_SIZE = 50;

const formatRelativeTime = (input: string) => {
    const date = new Date(input);
    const now = Date.now();
    const diff = now - date.getTime();
    if (Number.isNaN(diff)) return '';

    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diff < minute) return '刚刚';
    if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
    if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
    if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date
        .getDate()
        .toString()
        .padStart(2, '0')}`;
};

const getCategoryMeta = (category: NotificationCategory) => {
    switch (category) {
        case NotificationCategory.Work:
            return { icon: 'briefcase-outline' as const, color: '#1890ff', bg: '#e6f4ff' };
        case NotificationCategory.System:
            return { icon: 'alert-circle-outline' as const, color: '#faad14', bg: '#fff7e6' };
        case NotificationCategory.Security:
            return { icon: 'shield-checkmark-outline' as const, color: '#ff4d4f', bg: '#fff1f0' };
        default:
            return { icon: 'notifications-outline' as const, color: '#52c41a', bg: '#f6ffed' };
    }
};

const getLevelMeta = (level: NotificationLevel) => {
  switch (level) {
    case NotificationLevel.Success: return { label: '成功', color: '#52c41a', bg: '#f6ffed' };
    case NotificationLevel.Warning: return { label: '警告', color: '#fa8c16', bg: '#fff7e6' };
    case NotificationLevel.Error: return { label: '错误', color: '#ff4d4f', bg: '#fff1f0' };
    default: return null;
  }
}

export default function NotificationsScreen() {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [filterType, setFilterType] = useState<'all' | 'unread'>('all');
    const loadingRef = useRef(false);

    const loadData = useCallback(
        async (targetFilter: 'all' | 'unread' = filterType) => {
            if (loadingRef.current) return;
            loadingRef.current = true;
            setLoading(true);
            try {
                const [listRes, statsRes] = await Promise.all([
                   notificationService.getNotifications(1, PAGE_SIZE, targetFilter),
                   notificationService.getStatistics()
                ]);
                
                if (listRes.success && listRes.data) {
                    setNotifications(listRes.data.queryable);
                    if (targetFilter === 'all') {
                        setTotal(listRes.data.rowCount);
                    }
                }
                
                if (statsRes.success && statsRes.data) {
                    setUnreadCount(statsRes.data.Total);
                }
            } catch (error: any) {
                Toast.show({
                    type: 'error',
                    text1: '加载通知失败',
                    text2: error?.message || '网络异常',
                });
            } finally {
                setLoading(false);
                setRefreshing(false);
                loadingRef.current = false;
            }
        },
        [filterType]
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData(filterType);
    }, [loadData, filterType]);

    useFocusEffect(
        useCallback(() => {
            onRefresh();
            const interval = setInterval(() => {
                notificationService.getStatistics().then(res => {
                    if (res.success && res.data) setUnreadCount(res.data.Total);
                });
            }, 10000);
            return () => clearInterval(interval);
        }, [onRefresh])
    );

    const handlePress = async (item: AppNotification) => {
        if (item.status === 0) { // 0=Unread
            try {
                const res = await notificationService.markAsRead(item.id);
                if (res.success) {
                    setNotifications((prev) =>
                        prev.map((n) => (n.id === item.id ? { ...n, status: 1 } : n))
                    );
                    setUnreadCount((c) => (c > 0 ? c - 1 : 0));
                }
            } catch (error: any) {
                console.error('Mark as read failed', error);
            }
        }
        // TODO: Handle navigation via item.actionUrl
    };

    const renderItem = ({ item }: { item: AppNotification }) => {
        const meta = getCategoryMeta(item.category);
        const levelMeta = getLevelMeta(item.level);
        const isRead = item.status === 1;

        return (
            <TouchableOpacity
                style={[styles.card, !isRead && styles.unreadCard]}
                activeOpacity={0.9}
                onPress={() => handlePress(item)}
            >
                <RNView style={styles.rowHeader}>
                    <RNView style={styles.leftWrap}>
                        <RNView style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
                            <Ionicons name={meta.icon} size={18} color={meta.color} />
                        </RNView>
                        <RNText style={styles.title} numberOfLines={1}>{item.title}</RNText>
                        {!isRead && <RNView style={styles.unreadDot} />}
                    </RNView>
                    <RNText style={styles.time}>{formatRelativeTime(item.datetime)}</RNText>
                </RNView>
                {!!item.content && (
                    <RNText style={styles.desc} numberOfLines={2}>
                        {item.content}
                    </RNText>
                )}
                {levelMeta && (
                  <RNView style={[styles.levelTag, { backgroundColor: levelMeta.bg, marginTop: 8, alignSelf: 'flex-start' }]}>
                    <RNText style={{ color: levelMeta.color, fontSize: 10, fontWeight: '700' }}>{levelMeta.label}</RNText>
                  </RNView>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={commonStyles.pageContainer}>
            <View style={styles.filterBar}>
                {[
                  { key: 'all' as const, label: '全部' },
                  { key: 'unread' as const, label: '未读' },
                ].map((item) => {
                    const active = filterType === item.key;
                    return (
                        <TouchableOpacity
                            key={item.key}
                            style={[styles.filterChip, active && styles.filterChipActive]}
                            onPress={() => {
                                setFilterType(item.key);
                                loadData(item.key);
                            }}
                        >
                            <RNText style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                                {item.key === 'all' ? `${item.label} (${total})` : `${item.label} (${unreadCount})`}
                            </RNText>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {loading && notifications.length === 0 ? (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color={AppStyles.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <Ionicons name="notifications-off-outline" size={36} color={AppStyles.colors.textSecondary} />
                            <Text style={styles.emptyText}>暂时没有通知</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    listContent: { padding: AppStyles.spacing.lg },
    filterBar: { flexDirection: 'row', padding: AppStyles.spacing.lg, alignItems: 'center' },
    filterChip: {
        paddingHorizontal: AppStyles.spacing.md,
        paddingVertical: AppStyles.spacing.sm,
        borderRadius: AppStyles.borderRadius.md,
        borderWidth: 1,
        borderColor: AppStyles.colors.border,
        backgroundColor: AppStyles.colors.cardBackground,
        marginRight: AppStyles.spacing.sm,
    },
    filterChipActive: { borderColor: AppStyles.colors.primary, backgroundColor: '#f5f7ff' },
    filterChipText: { color: AppStyles.colors.text, fontSize: AppStyles.fontSize.md, fontWeight: '600' },
    filterChipTextActive: { color: AppStyles.colors.primary },
    separator: { height: AppStyles.spacing.sm },
    card: {
        backgroundColor: AppStyles.colors.cardBackground,
        borderRadius: AppStyles.borderRadius.lg,
        padding: AppStyles.spacing.md,
        borderWidth: 1,
        borderColor: AppStyles.colors.borderLight,
        ...AppStyles.shadows.sm,
    },
    unreadCard: { borderColor: AppStyles.colors.primary, backgroundColor: '#f5f7ff' },
    rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: AppStyles.spacing.sm },
    leftWrap: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    iconWrap: { width: 32, height: 32, borderRadius: AppStyles.borderRadius.full, alignItems: 'center', justifyContent: 'center', marginRight: AppStyles.spacing.sm },
    title: { flex: 1, fontSize: AppStyles.fontSize.lg, fontWeight: '600', color: AppStyles.colors.text },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: AppStyles.colors.primary, marginLeft: 4 },
    time: { marginLeft: AppStyles.spacing.sm, fontSize: AppStyles.fontSize.sm, color: AppStyles.colors.textSecondary },
    desc: { fontSize: AppStyles.fontSize.md, color: AppStyles.colors.textSecondary, lineHeight: 20 },
    levelTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
    emptyText: { marginTop: AppStyles.spacing.sm, color: AppStyles.colors.textSecondary },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
