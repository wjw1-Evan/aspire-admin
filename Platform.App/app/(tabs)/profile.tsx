import React, { useState, useEffect } from 'react';
import { ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { AppStyles } from '../../constants/AppStyles';
import { useTheme, ThemeMode } from '../../contexts/ThemeContext';
import { authService } from '../../services/authService';
import { companyService } from '../../services/companyService';
import { userService } from '../../services/userService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MenuItemCard from '../../components/ui/MenuItemCard';
import { useTranslation } from 'react-i18next';
import { changeLanguage, getCurrentLanguage } from '../../utils/i18n';
import { User } from '../../types/auth';

interface UserCompany {
  id: string;
  name: string;
  code: string;
}

interface ProfileEditForm {
  realName: string;
  email: string;
  phone: string;
}

const themeOrder: ThemeMode[] = ['light', 'dark', 'auto'];

export default function ProfileScreen() {
  const { mode, setThemeMode, colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [user, setUser] = useState<User | null>(null);
  const [companies, setCompanies] = useState<UserCompany[]>([]);
  const [currentCompany, setCurrentCompany] = useState<UserCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [editForm, setEditForm] = useState<ProfileEditForm>({ realName: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [lang, setLang] = useState<'zh' | 'en'>(getCurrentLanguage());

  const loadData = () => {
    setLoading(true);
    Promise.all([
      authService.getCurrentUser(),
      companyService.getCurrentCompany(),
      companyService.getMyCompanies(),
    ]).then(([userRes, companyRes, companiesRes]) => {
      if (userRes.success && userRes.data) {
        setUser(userRes.data);
        setEditForm({ realName: userRes.data.realName || userRes.data.name || '', email: userRes.data.email || '', phone: userRes.data.phone || '' });
      }
      if (companyRes.success && companyRes.data) { setCurrentCompany(companyRes.data); }
      if (companiesRes.success && companiesRes.data) { setCompanies(companiesRes.data); }
    }).catch((e) => { if (__DEV__) console.warn('Failed to load profile data:', e); }).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleSwitchCompany = (id: string) => {
    if (id === currentCompany?.id || switching) { return; }
    setSwitching(true);
    companyService.switchCompany(id).then((res) => {
      if (res?.success) { authService.getCurrentUser(); loadData(); }
      else { Toast.show({ type: 'error', text1: t('profile.switch_company_failed'), text2: res?.message || t('common.retry'), position: 'top', visibilityTime: 3000 }); }
    }).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : t('profile.switch_company_error');
      Toast.show({ type: 'error', text1: t('profile.switch_company_failed'), text2: msg, position: 'top', visibilityTime: 3000 });
    }).finally(() => setSwitching(false));
  };

  const handleUpdateProfile = () => {
    if (!editForm.realName) {
      Toast.show({ type: 'error', text1: t('profile.validation_failed'), text2: t('profile.name_required'), position: 'top', visibilityTime: 3000 });
      return;
    }
    setSaving(true);
    userService.updateProfile(editForm).then((res) => {
      if (res.success) { setEditVisible(false); loadData(); Toast.show({ type: 'success', text1: t('profile.update_success'), text2: t('profile.update_success_message'), position: 'top', visibilityTime: 2000 }); }
      else { Toast.show({ type: 'error', text1: t('profile.update_failed'), text2: res.message || t('common.retry'), position: 'top', visibilityTime: 3000 }); }
    }).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : t('profile.update_failed');
      Toast.show({ type: 'error', text1: t('profile.update_failed'), text2: msg, position: 'top', visibilityTime: 3000 });
    }).finally(() => setSaving(false));
  };

  if (loading) {
    return (
      <View style={[st.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const cardBg = { backgroundColor: colors.cardBackground, borderRadius: AppStyles.borderRadius.lg, padding: AppStyles.spacing.lg, marginBottom: AppStyles.spacing.md };
  const btnBase = { flex: 1, borderRadius: 12, padding: 16, alignItems: 'center' as const };

  return (
    <View style={[st.page, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={st.scroll}>
        <View style={{ paddingHorizontal: AppStyles.spacing.lg, paddingTop: insets.top + AppStyles.spacing.lg, paddingBottom: AppStyles.spacing.lg }}>
          <View style={st.userRow}>
            <View style={[st.avatar, { backgroundColor: colors.cardBackground }]}>
              <Text style={[st.avatarText, { color: colors.text }]}>{user?.realName?.charAt(0) || user?.name?.charAt(0) || user?.username?.charAt(0) || 'U'}</Text>
            </View>
            <View style={st.userInfo}>
              <Text style={[st.userName, { color: colors.text }]}>{user?.realName || user?.name || user?.username}</Text>
              <Text style={[st.userRole, { color: colors.textSecondary }]}>{user?.username}</Text>
            </View>
            <TouchableOpacity style={[st.editBtn, { backgroundColor: colors.cardBackground, borderColor: colors.border }]} onPress={() => setEditVisible(true)}>
              <Ionicons name="pencil" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={st.body}>
          <Text style={[st.sectionTitle, { color: colors.textSecondary }]}>{t('profile.current_company')}</Text>
          {currentCompany ? (
            <View style={cardBg}>
              <View style={st.flexRow}>
                <View style={[st.iconBox, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                  <Ionicons name="business-outline" size={22} color={colors.primary} />
                </View>
                <View style={st.flex1}>
                  <Text style={[st.companyName, { color: colors.text }]}>{currentCompany.name}</Text>
                  <Text style={[st.companyCode, { color: colors.textSecondary }]}>{t('profile.company_code')}: {currentCompany.code}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              </View>
            </View>
          ) : (
            <View style={[cardBg, { borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center' }]}>
              <Text style={[st.emptyText, { color: colors.textTertiary }]}>{t('profile.no_company')}</Text>
            </View>
          )}

          {companies.length > 1 && (
            <>
              <Text style={[st.sectionTitle, { color: colors.textSecondary, marginTop: AppStyles.spacing.lg }]}>{t('profile.switch_company')}</Text>
              {companies.filter((c) => c.id !== currentCompany?.id).map((c) => (
                <TouchableOpacity key={c.id} style={cardBg} onPress={() => handleSwitchCompany(c.id)} disabled={switching}>
                  <View style={st.flexRow}>
                    <View style={[st.smallIcon, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.textSecondary }}>{c.name?.charAt(0) || '?'}</Text>
                    </View>
                    <View>
                      <Text style={[st.companyName, { color: colors.text }]}>{c.name}</Text>
                      <Text style={[st.companyCode, { color: colors.textSecondary }]}>{c.code}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          <Text style={[st.sectionTitle, { color: colors.textSecondary, marginTop: AppStyles.spacing.lg }]}>{t('profile.settings')}</Text>
          <MenuItemCard
            icon={mode === 'dark' ? 'moon-outline' : mode === 'auto' ? 'settings-outline' : 'sunny-outline'}
            title={t('profile.theme_mode')}
            description={mode === 'light' ? t('profile.light') : mode === 'dark' ? t('profile.dark') : t('profile.auto')}
            onPress={() => setThemeMode(themeOrder[(themeOrder.indexOf(mode) + 1) % themeOrder.length])}
          />
          <MenuItemCard icon="language-outline" title={t('home.language')} description={lang === 'zh' ? t('home.language_en') : t('home.language_zh')} onPress={async () => {
            const next = lang === 'zh' ? 'en' : 'zh';
            await changeLanguage(next);
            setLang(next);
          }} />

          <TouchableOpacity style={[st.logoutBtn, { backgroundColor: colors.primary }]} onPress={() => setLogoutVisible(true)}>
            <Ionicons name="log-out-outline" size={20} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={[st.logoutText, { color: colors.white }]}>{t('profile.logout')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal animationType="slide" transparent visible={editVisible} onRequestClose={() => setEditVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={st.modalOverlay}>
          <View style={[st.modalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={st.modalHeader}>
              <Text style={[st.modalTitle, { color: colors.text }]}>{t('profile.edit_profile')}</Text>
              <TouchableOpacity onPress={() => setEditVisible(false)}><Ionicons name="close" size={24} color={colors.textSecondary} /></TouchableOpacity>
            </View>
            <ScrollView>
              {(['realName', 'email', 'phone'] as const).map((field) => (
                <View key={field} style={st.formGroup}>
                  <Text style={[st.label, { color: colors.textSecondary }]}>{t(`profile.${field}`)}</Text>
                  <TextInput
                    style={[st.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    value={editForm[field]}
                    onChangeText={(v: string) => setEditForm({ ...editForm, [field]: v })}
                    placeholder={t(`profile.${field}_placeholder`)}
                    placeholderTextColor={colors.textTertiary}
                    keyboardType={field === 'email' ? 'email-address' : field === 'phone' ? 'phone-pad' : 'default'}
                    autoCapitalize="none"
                  />
                </View>
              ))}
            </ScrollView>
            <View style={st.btnRow}>
              <TouchableOpacity style={[btnBase, { backgroundColor: colors.borderLight }]} onPress={() => setEditVisible(false)}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textSecondary }}>{t('profile.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[btnBase, { backgroundColor: colors.primary }, saving && { opacity: 0.7 }]} onPress={handleUpdateProfile} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={{ fontSize: 16, fontWeight: '600', color: colors.white }}>{t('profile.save')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Logout Modal */}
      <Modal animationType="fade" transparent visible={logoutVisible} onRequestClose={() => setLogoutVisible(false)}>
        <View style={[st.logoutOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[st.logoutBox, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="log-out-outline" size={48} color={colors.primary} style={{ marginBottom: 16 }} />
            <Text style={[st.logoutTitle, { color: colors.text }]}>{t('profile.logout')}</Text>
            <Text style={[st.logoutMsg, { color: colors.textSecondary }]}>{t('auth.logout_message')}</Text>
            <View style={st.btnRow}>
              <TouchableOpacity style={[btnBase, { backgroundColor: colors.borderLight }]} onPress={() => setLogoutVisible(false)}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textSecondary }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[btnBase, { backgroundColor: colors.primary }]} onPress={() => { setLogoutVisible(false); authService.logout(); }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.white }}>{t('common.confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  page: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flexGrow: 1, paddingBottom: 100 },
  userRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: 'bold' },
  userInfo: { flex: 1, marginLeft: 16 },
  userName: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  userRole: { fontSize: 14 },
  editBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: AppStyles.spacing.lg, paddingTop: 0 },
  sectionTitle: { fontSize: AppStyles.fontSize.sm, fontWeight: '600', marginBottom: AppStyles.spacing.sm, marginLeft: AppStyles.spacing.xs },
  flexRow: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: AppStyles.spacing.md },
  flex1: { flex: 1 },
  companyName: { fontSize: AppStyles.fontSize.md, fontWeight: '600' },
  companyCode: { fontSize: AppStyles.fontSize.sm },
  emptyText: { fontSize: AppStyles.fontSize.sm },
  smallIcon: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  logoutBtn: { borderRadius: AppStyles.borderRadius.lg, padding: AppStyles.spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: AppStyles.spacing.lg },
  logoutText: { fontSize: AppStyles.fontSize.md, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderRadius: 12, borderWidth: 1, padding: 16, fontSize: 16 },
  btnRow: { flexDirection: 'row', gap: 12 },
  logoutOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logoutBox: { borderRadius: 16, padding: 24, width: '85%', maxWidth: 400, alignItems: 'center' },
  logoutTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  logoutMsg: { fontSize: 16, textAlign: 'center', marginBottom: 24 },
});
