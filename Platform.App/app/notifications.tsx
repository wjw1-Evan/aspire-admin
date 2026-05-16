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
import { AppStyles, createCommonStyles } from '@/constants/AppStyles';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { notificationService } from '@/services/notificationService';
import { AppNotification, NotificationLevel, NotificationCategory } from '@/types/notification';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';

const PAGE_SIZE = 50;

const formatRelativeTime = (input: string, t: (key: string, options?: any) => string) => {
    const date = new Date(input);
    const now = Date.now();
    const diff = now - date.getTime();
    if (Number.isNaN(diff)) return '';

    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diff < minute) return t('notifications.just_now');
    if (diff < hour) return t('notifications.minutes_ago', { count: Math.floor(diff / minute) });
    if (diff < day) return t('notifications.hours_ago', { count: Math.floor(diff / hour) });
    if (diff < 7 * day) return t('notifications.days_ago', { count: Math.floor(diff / day) });
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date
        .getDate()
        .toString()
        .padStart(2, '0')}`;
};

const getCategoryMeta = (category: NotificationCategory, colors: any) => {
    switch (category) {
        case NotificationCategory.Work:
            return { icon: 'briefcase-outline' as const, color: colors.primary, bg: colors.primary + '20' };
        case NotificationCategory.System:
            return { icon: 'alert-circle-outline' as const, color: colors.warning, bg: colors.warning + '20' };
        case NotificationCategory.Security:
            return { icon: 'shield-checkmark-outline' as const, color: colors.error, bg: colors.error + '20' };
        default:
            return { icon: 'notifications-outline' as const, color: colors.success, bg: colors.success + '20' };
    }
};

const getLevelMeta = (level: NotificationLevel, colors: any, t: (key: string, options?: any) => string) => {
  switch (level) {
    case NotificationLevel.Success: return { label: t('notifications.level_success'), color: colors.success, bg: colors.success + '20' };
    case NotificationLevel.Warning: return { label: t('notifications.level_warning'), color: colors.warning, bg: colors.warning + '20' };
    case NotificationLevel.Error: return { label: t('notifications.level_error'), color: colors.error, bg: colors.error + '20' };
    default: return null;
  }
}

export default function NotificationsScreen() {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const comStyles = useMemo(() => createCommonStyles(colors), [colors]);
    const styles = useMemo(() => StyleSheet.create({
        listContent: { padding: AppStyles.spacing.lg },
        filterBar: { flexDirection: 'row', padding: AppStyles.spacing.lg, alignItems: 'center' },
        filterChip: {
            paddingHorizontal: AppStyles.spacing.md,
            paddingVertical: AppStyles.spacing.sm,
            borderRadius: AppStyles.borderRadius.md,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.cardBackground,
            marginRight: AppStyles.spacing.sm,
        },
        filterChipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '20' },
        filterChipText: { color: colors.text, fontSize: AppStyles.fontSize.md, fontWeight: '600' },
        filterChipTextActive: { color: colors.primary },
        separator: { height: AppStyles.spacing.sm },
        card: {
            backgroundColor: colors.cardBackground,
            borderRadius: AppStyles.borderRadius.lg,
            padding: AppStyles.spacing.md,
            borderWidth: 1,
            borderColor: colors.borderLight,
            ...AppStyles.shadows.sm,
        },
        unreadCard: { borderColor: colors.primary, backgroundColor: colors.primary + '20' },
        rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: AppStyles.spacing.sm },
        leftWrap: { flexDirection: 'row', alignItems: 'center', flex: 1 },
        iconWrap: { width: 32, height: 32, borderRadius: AppStyles.borderRadius.full, alignItems: 'center', justifyContent: 'center', marginRight: AppStyles.spacing.sm },
        title: { flex: 1, fontSize: AppStyles.fontSize.lg, fontWeight: '600', color: colors.text },
        unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginLeft: 4 },
        time: { marginLeft: AppStyles.spacing.sm, fontSize: AppStyles.fontSize.sm, color: colors.textSecondary },
        desc: { fontSize: AppStyles.fontSize.md, color: colors.textSecondary, lineHeight: 20 },
        levelTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
        emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
        emptyText: { marginTop: AppStyles.spacing.sm, color: colors.textSecondary },
        loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    }), [colors]);
    
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
                    text1: t('notifications.load_failed'),
                    text2: error?.message || t('common.network_error'),
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
        const meta = getCategoryMeta(item.category, colors);
        const levelMeta = getLevelMeta(item.level, colors, t);
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
                    <RNText style={styles.time}>{formatRelativeTime(item.datetime, t)}</RNText>
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
        <View style={comStyles.pageContainer}>
            <View style={styles.filterBar}>
                {[
                  { key: 'all' as const, label: t('notifications.all') },
                  { key: 'unread' as const, label: t('notifications.unread') },
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
                    <ActivityIndicator size="large" color={colors.primary} />
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
                            <Ionicons name="notifications-off-outline" size={36} color={colors.textSecondary} />
                            <Text style={styles.emptyText}>{t('notifications.no_notifications')}</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
