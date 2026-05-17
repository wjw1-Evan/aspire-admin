import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppStyles } from '../../constants/AppStyles';
import { useTheme } from '../../utils/theme';
import { authService } from '../../services/authService';
import { taskService } from '../../services/taskService';
import { projectService } from '../../services/projectService';
import { ProjectStatus } from '../../types/project';
import MenuItemCard from '../../components/ui/MenuItemCard';
import { changeLanguage, getCurrentLanguage } from '../../utils/i18n';

export default function HomeScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [todoCount, setTodoCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lang, setLang] = useState<'zh' | 'en'>(getCurrentLanguage());

  const fetchData = () => {
    authService.getCurrentUser().then(r => { if (r.success && r.data) setUser(r.data); }).finally(() => setLoading(false));
    taskService.getMyTodoTasks().then(r => { if (r.success && r.data) setTodoCount(r.data.length); }).catch(() => {});
    projectService.getProjectList({ status: ProjectStatus.InProgress, page: 1, pageSize: 1 }).then(r => {
      if (r.success && r.data) setActiveCount(r.data.rowCount || 0);
    }).catch(() => {});
  };

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([
      authService.getCurrentUser().then(r => { if (r.success && r.data) setUser(r.data); }),
      taskService.getMyTodoTasks().then(r => { if (r.success && r.data) setTodoCount(r.data.length); }).catch(() => {}),
      projectService.getProjectList({ status: ProjectStatus.InProgress, page: 1, pageSize: 1 }).then(r => {
        if (r.success && r.data) setActiveCount(r.data.rowCount || 0);
      }).catch(() => {}),
    ]).finally(() => setRefreshing(false));
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <View style={[s.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const name = user?.realName || user?.username || t('home.user');

  return (
    <View style={[s.page, { backgroundColor: colors.background }]}>
      <ScrollView keyboardShouldPersistTaps="always" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={{ paddingHorizontal: AppStyles.spacing.lg, paddingTop: insets.top + AppStyles.spacing.lg, paddingBottom: AppStyles.spacing.lg }}>
          <View style={s.headerRow}>
            <View>
              <Text style={[s.greeting, { color: colors.textSecondary }]}>{t('home.greeting')}</Text>
              <Text style={[s.name, { color: colors.text }]}>{name}</Text>
            </View>
            <View style={s.headerRight}>
              <TouchableOpacity style={s.iconBtn} onPress={() => {
                const next = lang === 'zh' ? 'en' : 'zh';
                changeLanguage(next);
                setLang(next);
              }}>
                <Text style={[s.langText, { color: colors.primary }]}>{lang === 'zh' ? 'EN' : '中'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/notifications')}>
                <Ionicons name="notifications-outline" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <View style={s.actions}>
          <MenuItemCard icon="add-circle-outline" title={t('home.create_task')} description={t('home.create_task_desc')} onPress={() => router.push('/task/create')} />
          <MenuItemCard icon="folder-open-outline" title={t('home.create_project')} description={t('home.create_project_desc')} onPress={() => router.push('/project/create')} />
          <MenuItemCard icon="checkbox-outline" title={t('home.my_todo')} description={t('home.my_todo_desc')} badge={todoCount} onPress={() => router.push('/(tabs)/tasks')} />
          <MenuItemCard icon="folder-outline" title={t('home.active_projects')} description={t('home.active_projects_desc')} badge={activeCount} onPress={() => router.push('/(tabs)/projects')} />
          <MenuItemCard icon="list-outline" title={t('home.all_tasks')} description={t('home.all_tasks_desc')} onPress={() => router.push('/(tabs)/tasks')} />
          <MenuItemCard icon="briefcase-outline" title={t('home.all_projects')} description={t('home.all_projects_desc')} onPress={() => router.push('/(tabs)/projects')} />
          <MenuItemCard icon="business-outline" title={t('enterprise_service.title')} description={t('enterprise_service.list_title')} onPress={() => router.push('/enterprise-service')} />
          <MenuItemCard icon="chatbubbles-outline" title={t('xiaoke.title')} description={t('xiaoke.subtitle')} onPress={() => router.push('/xiaoke')} />
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 8 },
  greeting: { fontSize: AppStyles.fontSize.sm, marginBottom: 4 },
  name: { fontSize: AppStyles.fontSize.xxxl, fontWeight: 'bold' },
  langText: { fontSize: 14, fontWeight: '600' },
  actions: { paddingHorizontal: AppStyles.spacing.lg, paddingBottom: 100 },
});
