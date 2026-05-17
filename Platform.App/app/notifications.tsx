import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppStyles } from '../constants/AppStyles';
import { useTheme } from '../utils/theme';
import { notificationService } from '../services/notificationService';
import { AppNotification, NotificationLevel, NotificationCategory } from '../types/notification';
import EmptyState from '../components/ui/EmptyState';
import Toast from 'react-native-toast-message';

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
      return { icon: 'briefcase-outline' as const, color: colors.primary, bg: colors.primary + '18' };
    case NotificationCategory.System:
      return { icon: 'alert-circle-outline' as const, color: colors.warning, bg: colors.warning + '18' };
    case NotificationCategory.Security:
      return { icon: 'shield-checkmark-outline' as const, color: colors.error, bg: colors.error + '18' };
    default:
      return { icon: 'notifications-outline' as const, color: colors.success, bg: colors.success + '18' };
  }
};

const getLevelMeta = (level: NotificationLevel, colors: any, t: (key: string, options?: any) => string) => {
  switch (level) {
    case NotificationLevel.Success: return { label: t('notifications.level_success'), color: colors.success, bg: colors.success + '18' };
    case NotificationLevel.Warning: return { label: t('notifications.level_warning'), color: colors.warning, bg: colors.warning + '18' };
    case NotificationLevel.Error: return { label: t('notifications.level_error'), color: colors.error, bg: colors.error + '18' };
    default: return null;
  }
};

export default function NotificationsScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const loadingRef = useRef(false);

  const cardBg = isDark
    ? 'rgba(28,28,30,0.85)'
    : 'rgba(250, 250, 250, 0.85)';

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    list: {
      paddingTop: AppStyles.spacing.sm,
      paddingBottom: 100,
    },
    itemWrapper: {
      marginHorizontal: AppStyles.spacing.md,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: cardBg,
      borderRadius: 20,
      padding: AppStyles.spacing.md,
      marginBottom: AppStyles.spacing.sm,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: AppStyles.spacing.md,
    },
    cardBody: {
      flex: 1,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      fontSize: AppStyles.fontSize.md,
      fontWeight: '600',
      color: colors.text,
      flexShrink: 1,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
      marginLeft: 6,
    },
    time: {
      fontSize: AppStyles.fontSize.sm,
      color: colors.textSecondary,
      marginLeft: 'auto',
    },
    content: {
      fontSize: AppStyles.fontSize.sm,
      color: colors.textSecondary,
      lineHeight: 20,
      marginTop: 2,
    },
    levelTag: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      alignSelf: 'flex-start',
      marginTop: 6,
    },
    levelText: {
      fontSize: 10,
      fontWeight: '700',
    },
    arrow: {
      marginLeft: AppStyles.spacing.sm,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  }), [colors, cardBg]);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const listRes = await notificationService.getNotifications(1, PAGE_SIZE);

      if (listRes.success && listRes.data) {
        setNotifications(listRes.data.queryable);
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
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handlePress = async (item: AppNotification) => {
    if (item.status === 'unread') {
      try {
        const res = await notificationService.markAsRead(item.id);
        if (res.success) {
          setNotifications((prev) =>
            prev.map((n) => (n.id === item.id ? { ...n, status: 'read' } : n))
          );
        }
      } catch (_) {}
    }
    router.push(`/notifications/${item.id}`);
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const meta = getCategoryMeta(item.category, colors);
    const levelMeta = getLevelMeta(item.level, colors, t);
    const isRead = item.status === 'read' || item.status === 'archived';

    return (
      <View style={styles.itemWrapper}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => handlePress(item)}
      >
        <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={22} color={meta.color} />
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            {!isRead && <View style={styles.unreadDot} />}
            <Text style={styles.time}>{formatRelativeTime(item.createdAt || item.datetime || '', t)}</Text>
          </View>
          {!!item.content && (
            <Text style={styles.content} numberOfLines={2}>
              {item.content}
            </Text>
          )}
          {levelMeta && (
            <View style={[styles.levelTag, { backgroundColor: levelMeta.bg }]}>
              <Text style={[styles.levelText, { color: levelMeta.color }]}>{levelMeta.label}</Text>
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} style={styles.arrow} />
      </TouchableOpacity>
      </View>
    );
  };

  if (loading && notifications.length === 0) {
    return (
      <View style={[styles.container]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="notifications-off-outline"
            title={t('notifications.no_notifications')}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
