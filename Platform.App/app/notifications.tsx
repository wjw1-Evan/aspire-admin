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
import { UnifiedNotificationItem } from '@/types/notification';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';

const PAGE_SIZE = 200; // 单次取足够多，弱化分页

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
        .padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date
            .getMinutes()
            .toString()
            .padStart(2, '0')}`;
};

const getTypeMeta = (type: string) => {
    switch (type) {
        case 'Task':
            return { icon: 'document-text-outline' as const, color: '#1890ff', bg: '#e6f4ff' };
        case 'System':
            return { icon: 'alert-circle-outline' as const, color: '#faad14', bg: '#fff7e6' };
        default:
            return { icon: 'notifications-outline' as const, color: '#52c41a', bg: '#f6ffed' };
    }
};

const renderPriorityTag = (priority?: number) => {
    if (priority === undefined || priority === null) return null;
    const map: Record<number, { label: string; color: string; bg: string }> = {
        0: { label: '低', color: '#1677ff', bg: '#e6f4ff' },
        1: { label: '中', color: '#fa8c16', bg: '#fff7e6' },
        2: { label: '高', color: '#ff4d4f', bg: '#fff1f0' },
        3: { label: '紧急', color: '#d4380d', bg: '#fff2e8' },
    };
    const meta = map[priority];
    if (!meta) return null;
    return (
        <RNView style={[styles.priorityTag, { backgroundColor: meta.bg }]}>
            <RNText style={[styles.priorityText, { color: meta.color }]}>{meta.label}</RNText>
        </RNView>
    );
};

export default function NotificationsScreen() {
    const [notifications, setNotifications] = useState<UnifiedNotificationItem[]>([]);
    const [page] = useState(1);
    const [allTotal, setAllTotal] = useState(0);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore] = useState(false);
    const [hasMore] = useState(false);
    const [loadFailed, setLoadFailed] = useState(false);
    const [filterType, setFilterType] = useState<'all' | 'unread'>('all');
    const loadingRef = useRef(false);

    const fetchUnread = useCallback(async () => {
        try {
            const res = await notificationService.getUnreadStatistics();
            if (res.success && res.data) {
                setUnreadCount(res.data.total ?? 0);
            }
        } catch {
            // 静默失败
        }
    }, []);

    const loadNotifications = useCallback(
        async (targetFilter: 'all' | 'unread' = filterType) => {
            if (loadingRef.current) return;
            loadingRef.current = true;
            setLoading(true);
            setLoadFailed(false);
            try {
                const res = await notificationService.getNotifications(1, PAGE_SIZE, targetFilter);
                if (res.success && res.data) {
                    const data = res.data;
                    setNotifications(data.items);
                    if (targetFilter === 'all') {
                        setAllTotal(data.total);
                    }
                    setUnreadCount(data.unreadCount ?? 0);
                    setFilterType(targetFilter);
                    setLoadFailed(false);
                } else {
                    setLoadFailed(true);
                    Toast.show({
                        type: 'error',
                        text1: '加载通知失败',
                        text2: res.errorMessage || '请稍后重试',
                    });
                }
            } catch (error: any) {
                setLoadFailed(true);
                Toast.show({
                    type: 'error',
                    text1: '加载通知失败',
                    text2: error?.errorMessage || error?.message || '网络异常',
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
        setLoadFailed(false);
        fetchUnread();
        loadNotifications(filterType);
    }, [fetchUnread, loadNotifications, filterType]);

    useFocusEffect(
        useCallback(() => {
            onRefresh();
            const interval = setInterval(() => {
                fetchUnread();
            }, 10000);
            return () => clearInterval(interval);
        }, [onRefresh, fetchUnread])
    );

    const loadMore = useCallback(() => {
        // 分页功能已禁用
    }, []);

    const handlePress = async (item: UnifiedNotificationItem) => {
        if (!item.read) {
            try {
                const res = await notificationService.markAsRead(item.id);
                if (res.success) {
                    setNotifications((prev) =>
                        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
                    );
                    setUnreadCount((c) => (c > 0 ? c - 1 : 0));
                }
            } catch (error: any) {
                Toast.show({
                    type: 'error',
                    text1: '操作失败',
                    text2: error?.errorMessage || error?.message || '请稍后重试',
                });
            }
        }
        // TODO: 根据业务跳转到对应详情页面（如任务详情）
    };

    const renderItem = ({ item }: { item: UnifiedNotificationItem }) => {
        const meta = getTypeMeta(item.type);
        return (
            <TouchableOpacity
                style={[styles.card, !item.read && styles.unreadCard]}
                activeOpacity={0.9}
                onPress={() => handlePress(item)}
            >
                <RNView style={styles.rowHeader}>
                    <RNView style={styles.leftWrap}>
                        <RNView style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
                            <Ionicons name={meta.icon} size={18} color={meta.color} />
                        </RNView>
                        <RNText style={styles.title} numberOfLines={1}>{item.title}</RNText>
                        {!item.read && <RNView style={styles.unreadDot} />}
                        {renderPriorityTag(item.taskPriority)}
                    </RNView>
                    <RNText style={styles.time}>{formatRelativeTime(item.datetime)}</RNText>
                </RNView>
                {!!item.description && (
                    <RNText style={styles.desc} numberOfLines={2}>
                        {item.description}
                    </RNText>
                )}
                {item.extra ? (
                    <RNText style={styles.extra} numberOfLines={1}>
                        {item.extra}
                    </RNText>
                ) : null}
            </TouchableOpacity>
        );
    };

    const listEmptyComponent = (
        <View style={styles.emptyWrap}>
            <Ionicons name="notifications-off-outline" size={36} color={AppStyles.colors.textSecondary} />
            <Text style={styles.emptyText}>暂时没有通知</Text>
        </View>
    );

    const footerComponent = useMemo(() => {
        return null; // 取消分页尾部
    }, []);

    return (
        <View style={commonStyles.pageContainer}>
            <View style={styles.filterBar}>
                {(
                    [
                        { key: 'all', label: '全部' },
                        { key: 'unread', label: '未读' },
                    ] as const
                ).map((item) => {
                    const active = filterType === item.key;
                    return (
                        <TouchableOpacity
                            key={item.key}
                            style={[styles.filterChip, active && styles.filterChipActive]}
                            activeOpacity={0.85}
                            onPress={() => {
                                if (filterType === item.key) return;
                                setFilterType(item.key);
                                loadNotifications(item.key);
                            }}
                        >
                            <RNText style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                                {item.key === 'all'
                                    ? `${item.label} (${allTotal})`
                                    : `${item.label} (${unreadCount})`}
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
                    ListEmptyComponent={listEmptyComponent}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    listContent: {
        padding: AppStyles.spacing.lg,
    },
    filterBar: {
        flexDirection: 'row',
        paddingHorizontal: AppStyles.spacing.lg,
        paddingTop: AppStyles.spacing.lg,
        paddingBottom: AppStyles.spacing.sm,
        alignItems: 'center',
    },
    filterChip: {
        paddingHorizontal: AppStyles.spacing.md,
        paddingVertical: AppStyles.spacing.sm,
        borderRadius: AppStyles.borderRadius.md,
        borderWidth: 1,
        borderColor: AppStyles.colors.border,
        backgroundColor: AppStyles.colors.cardBackground,
        marginRight: AppStyles.spacing.sm,
    },
    filterChipActive: {
        borderColor: AppStyles.colors.primary,
        backgroundColor: '#f5f7ff',
    },
    filterChipText: {
        color: AppStyles.colors.text,
        fontSize: AppStyles.fontSize.md,
        fontWeight: '600',
    },
    filterChipTextActive: {
        color: AppStyles.colors.primary,
    },
    separator: {
        height: AppStyles.spacing.sm,
    },
    card: {
        backgroundColor: AppStyles.colors.cardBackground,
        borderRadius: AppStyles.borderRadius.lg,
        padding: AppStyles.spacing.md,
        borderWidth: 1,
        borderColor: AppStyles.colors.borderLight,
        ...AppStyles.shadows.sm,
    },
    unreadCard: {
        borderColor: AppStyles.colors.primary,
        backgroundColor: '#f5f7ff',
    },
    rowHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: AppStyles.spacing.sm,
    },
    leftWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconWrap: {
        width: 32,
        height: 32,
        borderRadius: AppStyles.borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: AppStyles.spacing.sm,
    },
    title: {
        flex: 1,
        fontSize: AppStyles.fontSize.lg,
        fontWeight: '600',
        color: AppStyles.colors.text,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: AppStyles.colors.primary,
        marginLeft: 4,
    },
    time: {
        marginLeft: AppStyles.spacing.sm,
        fontSize: AppStyles.fontSize.sm,
        color: AppStyles.colors.textSecondary,
    },
    desc: {
        fontSize: AppStyles.fontSize.md,
        color: AppStyles.colors.textSecondary,
        lineHeight: 20,
    },
    extra: {
        marginTop: AppStyles.spacing.xs,
        fontSize: AppStyles.fontSize.sm,
        color: AppStyles.colors.textTertiary,
    },
    priorityTag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: AppStyles.borderRadius.md,
        marginLeft: 4,
    },
    priorityText: {
        fontSize: AppStyles.fontSize.xs,
        fontWeight: '700',
    },
    emptyWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyText: {
        marginTop: AppStyles.spacing.sm,
        color: AppStyles.colors.textSecondary,
    },
    footerWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: AppStyles.spacing.md,
    },
    loadMoreButton: {
        marginVertical: AppStyles.spacing.md,
        alignSelf: 'center',
        paddingHorizontal: AppStyles.spacing.lg,
        paddingVertical: AppStyles.spacing.sm,
        borderRadius: AppStyles.borderRadius.md,
        borderWidth: 1,
        borderColor: AppStyles.colors.border,
        backgroundColor: AppStyles.colors.cardBackground,
    },
    loadMoreText: {
        color: AppStyles.colors.text,
        fontSize: AppStyles.fontSize.md,
        fontWeight: '600',
    },
    footerText: {
        marginLeft: 8,
        color: AppStyles.colors.textSecondary,
    },
    loadingWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
