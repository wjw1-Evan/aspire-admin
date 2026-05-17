import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { AppStyles } from '../../constants/AppStyles';
import { useTheme } from '../../utils/theme';
import { notificationService } from '../../services/notificationService';
import { AppNotification, NotificationLevel, NotificationCategory } from '../../types/notification';
import { getCurrentLanguage } from '../../utils/i18n';

const getCategoryMeta = (category: NotificationCategory, colors: any) => {
  switch (category) {
    case NotificationCategory.Work:
      return { icon: 'briefcase-outline' as const, color: colors.primary, bg: colors.primary + '18', label: 'notifications.category_work' };
    case NotificationCategory.System:
      return { icon: 'alert-circle-outline' as const, color: colors.warning, bg: colors.warning + '18', label: 'notifications.category_system' };
    case NotificationCategory.Security:
      return { icon: 'shield-checkmark-outline' as const, color: colors.error, bg: colors.error + '18', label: 'notifications.category_security' };
    default:
      return { icon: 'notifications-outline' as const, color: colors.success, bg: colors.success + '18', label: 'notifications.category_social' };
  }
};

const getLevelMeta = (level: NotificationLevel, colors: any, t: (key: string) => string) => {
  switch (level) {
    case NotificationLevel.Success: return { label: t('notifications.level_success'), color: colors.success, bg: colors.success + '18' };
    case NotificationLevel.Warning: return { label: t('notifications.level_warning'), color: colors.warning, bg: colors.warning + '18' };
    case NotificationLevel.Error: return { label: t('notifications.level_error'), color: colors.error, bg: colors.error + '18' };
    default: return null;
  }
};

export default function NotificationDetailScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [notification, setNotification] = useState<AppNotification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cardBg = isDark
    ? 'rgba(28,28,30,0.85)'
    : 'rgba(250, 250, 250, 0.85)';

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: AppStyles.spacing.md,
      paddingBottom: 40,
    },
    headerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: cardBg,
      borderRadius: 20,
      padding: AppStyles.spacing.md,
      marginBottom: AppStyles.spacing.md,
      marginTop: AppStyles.spacing.md,
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: AppStyles.spacing.md,
    },
    headerInfo: {
      flex: 1,
    },
    title: {
      fontSize: AppStyles.fontSize.lg,
      fontWeight: '700',
      color: colors.text,
    },
    time: {
      fontSize: AppStyles.fontSize.sm,
      color: colors.textSecondary,
      marginTop: 4,
    },
    section: {
      backgroundColor: cardBg,
      borderRadius: 20,
      padding: AppStyles.spacing.md,
      marginBottom: AppStyles.spacing.md,
    },
    sectionTitle: {
      fontSize: AppStyles.fontSize.md,
      fontWeight: '600',
      color: colors.text,
      marginBottom: AppStyles.spacing.sm,
    },
    contentText: {
      fontSize: AppStyles.fontSize.sm,
      color: colors.text,
      lineHeight: 22,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: AppStyles.spacing.sm - 2,
    },
    metaIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: AppStyles.spacing.sm,
    },
    metaLabel: {
      fontSize: AppStyles.fontSize.sm,
      color: colors.textSecondary,
      flex: 1,
    },
    metaValue: {
      fontSize: AppStyles.fontSize.sm,
      color: colors.text,
      fontWeight: '500',
    },
    tag: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    tagText: {
      fontSize: AppStyles.fontSize.xs,
      fontWeight: '600',
    },
    tagRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: AppStyles.spacing.lg,
    },
    errorText: {
      fontSize: AppStyles.fontSize.sm,
      color: colors.textSecondary,
      marginTop: AppStyles.spacing.sm,
      textAlign: 'center',
    },
  }), [colors, cardBg]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await notificationService.getNotificationById(id);
      if (res.success && res.data) {
        setNotification(res.data);
      } else {
        setError(res.message || t('notifications.load_failed'));
      }
    } catch (err: any) {
      setError(err?.message || t('common.network_error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (notification && notification.status === 'unread') {
      notificationService.markAsRead(notification.id).then(res => {
        if (res.success) {
          setNotification(prev => prev ? { ...prev, status: 'read' } : null);
        }
      });
    }
  }, [notification?.id]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: t('notifications.detail') }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (error || !notification) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: t('notifications.detail') }} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.errorText}>{error || t('notifications.load_failed')}</Text>
        </View>
      </View>
    );
  }

  const formatLocalDateTime = (iso: string) => {
    const date = new Date(iso);
    const lang = getCurrentLanguage();
    const locale = lang === 'zh' ? 'zh-CN' : 'en-US';
    return date.toLocaleDateString(locale, {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const categoryMeta = getCategoryMeta(notification.category, colors);
  const levelMeta = getLevelMeta(notification.level, colors, t);

  return (
    <>
      <Stack.Screen options={{ title: t('notifications.detail') }} />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headerCard}>
            <View style={[styles.iconWrap, { backgroundColor: categoryMeta.bg }]}>
              <Ionicons name={categoryMeta.icon} size={24} color={categoryMeta.color} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.title}>{notification.title}</Text>
              <Text style={styles.time}>{notification.datetime}</Text>
            </View>
          </View>

          {!!notification.content && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('notifications.content')}</Text>
              <Text style={styles.contentText}>{notification.content}</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('notifications.detail_info')}</Text>
            <View style={styles.tagRow}>
              <View style={[styles.tag, { backgroundColor: categoryMeta.bg }]}>
                <Text style={[styles.tagText, { color: categoryMeta.color }]}>
                  {t(categoryMeta.label)}
                </Text>
              </View>
              {levelMeta && (
                <View style={[styles.tag, { backgroundColor: levelMeta.bg }]}>
                  <Text style={[styles.tagText, { color: levelMeta.color }]}>{levelMeta.label}</Text>
                </View>
              )}
              <View style={[styles.tag, { backgroundColor: ['read', 'archived'].includes(notification.status) ? colors.success + '18' : colors.borderLight }]}>
                <Text style={[styles.tagText, { color: ['read', 'archived'].includes(notification.status) ? colors.success : colors.textTertiary }]}>
                  {['read', 'archived'].includes(notification.status) ? t('notifications.read') : t('notifications.unread')}
                </Text>
              </View>
            </View>
            {notification.readAt && (
              <View style={styles.metaRow}>
                <View style={styles.metaIcon}>
                  <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
                </View>
                <Text style={styles.metaLabel}>{t('notifications.read_at')}</Text>
                <Text style={styles.metaValue}>{formatLocalDateTime(notification.readAt)}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </>
  );
}
