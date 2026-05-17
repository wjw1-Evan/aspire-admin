import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { AppStyles } from '../../constants/AppStyles';
import { useTheme } from '../../utils/theme';
import { authService } from '../../services/authService';
import { taskService } from '../../services/taskService';
import { projectService } from '../../services/projectService';
import { sseService } from '../../services/sseService';
import { ProjectStatus } from '../../types/project';
import MenuItemCard from '../../components/ui/MenuItemCard';
import { changeLanguage, getCurrentLanguage } from '../../utils/i18n';

const quickActions = [
  { icon: 'add-circle-outline' as const, key: 'create_task', link: '/task/create' },
  { icon: 'folder-open-outline' as const, key: 'create_project', link: '/project/create' },
  { icon: 'checkbox-outline' as const, key: 'my_todo', link: '/(tabs)/tasks' },
  { icon: 'folder-outline' as const, key: 'active_projects', link: '/(tabs)/projects' },
  { icon: 'list-outline' as const, key: 'all_tasks', link: '/(tabs)/tasks' },
  { icon: 'briefcase-outline' as const, key: 'all_projects', link: '/(tabs)/projects' },
  { icon: 'business-outline' as const, key: 'enterprise_service', link: '/enterprise-service', ns: 'enterprise_service' },
  { icon: 'chatbubbles-outline' as const, key: 'xiaoke', link: '/xiaoke', ns: 'xiaoke' },
];

export default function HomeScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [todoCount, setTodoCount] = useState(0);
  const [activeProjectCount, setActiveProjectCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lang, setLang] = useState<'zh' | 'en'>(getCurrentLanguage());

  const fetchUser = useCallback(async () => {
    const res = await authService.getCurrentUser();
    if (res.success && res.data) setUser(res.data);
  }, []);

  const fetchTodoCount = useCallback(async () => {
    try {
      const res = await taskService.getMyTodoTasks();
      if (res.success && res.data) setTodoCount(res.data.length);
    } catch {}
  }, []);

  const fetchActiveProjectCount = useCallback(async () => {
    try {
      const res = await projectService.getProjectList({ status: ProjectStatus.InProgress, page: 1, pageSize: 1 });
      if (res.success && res.data) setActiveProjectCount(res.data.rowCount || 0);
    } catch {}
  }, []);

  const load = useCallback(async () => {
    await fetchUser();
    setLoading(false);
  }, [fetchUser]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchUser(), fetchTodoCount(), fetchActiveProjectCount()]);
    setRefreshing(false);
  }, [fetchUser, fetchTodoCount, fetchActiveProjectCount]);

  useEffect(() => { load(); }, [load]);

  useFocusEffect(useCallback(() => {
    fetchTodoCount();
    fetchActiveProjectCount();
  }, [fetchTodoCount, fetchActiveProjectCount]));

  useEffect(() => {
    sseService.connect({ onStats: (stats) => setUnreadCount(stats.UnreadTotal ?? stats.Total ?? 0) });
    return () => sseService.disconnect();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const userName = user?.realName || user?.username || t('home.user');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        keyboardShouldPersistTaps="always"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <View style={{ paddingHorizontal: AppStyles.spacing.lg, paddingTop: insets.top + AppStyles.spacing.lg, paddingBottom: AppStyles.spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: AppStyles.fontSize.sm, color: colors.textSecondary, marginBottom: 4 }}>{t('home.greeting')}</Text>
              <Text style={{ fontSize: AppStyles.fontSize.xxxl, fontWeight: 'bold', color: colors.text }}>{userName}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity style={{ padding: 8 }} onPress={() => {
                const next = lang === 'zh' ? 'en' : 'zh';
                changeLanguage(next);
                setLang(next);
              }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>{lang === 'zh' ? 'EN' : '中'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ padding: 8 }} onPress={() => router.push('/notifications')}>
                <Ionicons name="notifications-outline" size={24} color={colors.text} />
                {unreadCount > 0 && (
                  <View style={{ position: 'absolute', top: 0, right: 0, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                    <Text style={{ color: '#fff', fontSize: AppStyles.fontSize.xs, fontWeight: '700' }}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: AppStyles.spacing.lg, paddingBottom: 100 }}>
          {quickActions.map(({ icon, key, link, ns }) => (
            <MenuItemCard
              key={key}
              icon={icon}
              title={t(`${ns || 'home'}.${key === 'enterprise_service' || key === 'xiaoke' ? 'title' : key}`)}
              description={t(`${ns || 'home'}.${key === 'enterprise_service' ? 'list_title' : key === 'xiaoke' ? 'subtitle' : key + '_desc'}`)}
              badge={key === 'my_todo' ? todoCount : key === 'active_projects' ? activeProjectCount : undefined}
              onPress={() => router.push(link as any)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
