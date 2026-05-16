import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { StyleSheet, ScrollView, RefreshControl, ActivityIndicator, View as RNView, Text as RNText, Platform, TouchableOpacity } from 'react-native';
import { Text, View } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppStyles } from '../../constants/AppStyles';
import { useTheme } from '../../utils/theme';
import { authService } from '../../services/authService';
import { taskService } from '../../services/taskService';
import { projectService } from '../../services/projectService';
import { sseService } from '../../services/sseService';
import { User } from '../../types/auth';
import { TaskDto, TaskStatus } from '../../types/task';
import { ProjectDto, ProjectStatus } from '../../types/project';
import { Link, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MenuItemCard from '../../components/ui/MenuItemCard';
import ErrorView from '../../components/ui/ErrorView';
import { changeLanguage, getCurrentLanguage } from '../../utils/i18n';

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [currentLang, setCurrentLang] = useState<'zh' | 'en'>(getCurrentLanguage());
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: AppStyles.spacing.lg,
      paddingTop: insets.top + AppStyles.spacing.lg,
      paddingBottom: AppStyles.spacing.lg,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    greeting: {
      fontSize: AppStyles.fontSize.sm,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    userName: {
      fontSize: AppStyles.fontSize.xxxl,
      fontWeight: 'bold',
      color: colors.text,
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
      top: 0,
      right: 0,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.error,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    noticeBadgeText: {
      color: '#fff',
      fontSize: AppStyles.fontSize.xs,
      fontWeight: '700',
    },
    contentSection: {
      paddingHorizontal: AppStyles.spacing.lg,
      paddingBottom: 100,
    },
  }), [colors, insets]);
  
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [todoCount, setTodoCount] = useState(0);
  const [activeProjectCount, setActiveProjectCount] = useState(0);

  const toggleLanguage = async () => {
    const newLang = currentLang === 'zh' ? 'en' : 'zh';
    await changeLanguage(newLang);
    setCurrentLang(newLang);
  };

  const fetchTodoCount = useCallback(async () => {
    try {
      const res = await taskService.getMyTodoTasks();
      if (res.success && res.data) {
        setTodoCount(res.data.length);
      }
    } catch {}
  }, []);

  const fetchActiveProjectCount = useCallback(async () => {
    try {
      const res = await projectService.getProjectList({
        status: ProjectStatus.InProgress,
        page: 1,
        pageSize: 1,
      });
      if (res.success && res.data) {
        setActiveProjectCount(res.data.rowCount || 0);
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
    fetchTodoCount();
    fetchActiveProjectCount();
    sseService.connect({
      onStats: (stats) => {
        setUnreadCount(stats.UnreadTotal ?? stats.Total ?? 0);
      },
    });
    return () => {
      sseService.disconnect();
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTodoCount();
      fetchActiveProjectCount();
      sseService.connect({
        onStats: (stats) => {
          setUnreadCount(stats.UnreadTotal ?? stats.Total ?? 0);
        },
      });
      return () => sseService.disconnect();
    }, [fetchTodoCount, fetchActiveProjectCount])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    fetchTodoCount();
    fetchActiveProjectCount();
  };

  useEffect(() => {
    if (loading) {
      loadingTimerRef.current = setTimeout(() => {
        setLoadingTimedOut(true);
      }, 15000);
    } else {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    }
    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
    };
  }, [loading]);

  if (loading) {
    if (loadingTimedOut) {
      return (
        <ErrorView
          message="加载超时，请检查网络连接后重试"
          onRetry={() => {
            setLoadingTimedOut(false);
            setLoading(true);
            loadData();
          }}
        />
      );
    }
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <RNView style={styles.headerTop}>
            <RNView>
              <RNText style={styles.greeting}>{t('home.greeting')}</RNText>
              <RNText style={styles.userName}>
                {user?.realName || user?.username || t('home.user')}
              </RNText>
            </RNView>
            <RNView style={styles.headerRight}>
              <TouchableOpacity style={styles.noticeButton} onPress={toggleLanguage}>
                <RNText style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>
                  {currentLang === 'zh' ? 'EN' : '中'}
                </RNText>
              </TouchableOpacity>
              <Link href="/notifications" asChild>
                <TouchableOpacity style={styles.noticeButton}>
                  <Ionicons name="notifications-outline" size={24} color={colors.text} />
                  {unreadCount > 0 && (
                    <RNView style={styles.noticeBadge}>
                      <RNText style={styles.noticeBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</RNText>
                    </RNView>
                  )}
                </TouchableOpacity>
              </Link>
            </RNView>
          </RNView>
        </View>

        <View style={styles.contentSection}>
          <MenuItemCard
            icon="add-circle-outline"
            title={t('home.create_task')}
            description={t('home.create_task_desc')}
            onPress={() => router.push('/task/create')}
          />
          <MenuItemCard
            icon="folder-open-outline"
            title={t('home.create_project')}
            description={t('home.create_project_desc')}
            onPress={() => router.push('/project/create')}
          />
          <MenuItemCard
            icon="checkbox-outline"
            title={t('home.my_todo')}
            description={t('home.my_todo_desc')}
            badge={todoCount}
            onPress={() => router.push('/(tabs)/tasks')}
          />
          <MenuItemCard
            icon="folder-outline"
            title={t('home.active_projects')}
            description={t('home.active_projects_desc')}
            badge={activeProjectCount}
            onPress={() => router.push('/(tabs)/projects')}
          />
          <MenuItemCard
            icon="list-outline"
            title={t('home.all_tasks')}
            description={t('home.all_tasks_desc')}
            onPress={() => router.push('/(tabs)/tasks')}
          />
          <MenuItemCard
            icon="briefcase-outline"
            title={t('home.all_projects')}
            description={t('home.all_projects_desc')}
            onPress={() => router.push('/(tabs)/projects')}
          />
          <MenuItemCard
            icon="business-outline"
            title={t('enterprise_service.title')}
            description={t('enterprise_service.list_title')}
            onPress={() => router.push('/enterprise-service')}
          />
        </View>
      </ScrollView>
    </View>
  );
}
