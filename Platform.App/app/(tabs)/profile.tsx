import React, { useState, useCallback } from 'react';
import { ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
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

const MODAL_OVERLAY = { flex: 1, justifyContent: 'flex-end' } as const;
const MODAL_CONTENT_BASE = { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, maxHeight: '80%' } as const;
const BTN_BASE = { flex: 1, borderRadius: 12, padding: 16, alignItems: 'center' as const };
const themeOrder: ThemeMode[] = ['light', 'dark', 'auto'];

export default function ProfileScreen() {
  const { mode, setThemeMode, colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [currentCompany, setCurrentCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [lang, setLang] = useState<'zh' | 'en'>(getCurrentLanguage());

  const loadData = useCallback(async () => {
    try {
      const [userRes, companyRes, companiesRes] = await Promise.all([
        authService.getCurrentUser(),
        companyService.getCurrentCompany(),
        companyService.getMyCompanies(),
      ]);
      if (userRes.success && userRes.data) {
        setUser(userRes.data);
        setEditForm({ realName: userRes.data.realName || userRes.data.name || '', email: userRes.data.email || '', phone: userRes.data.phone || '' });
      }
      if (companyRes.success && companyRes.data) setCurrentCompany(companyRes.data);
      if (companiesRes.success && companiesRes.data) setCompanies(companiesRes.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleSwitchCompany = async (companyId: string) => {
    if (companyId === currentCompany?.id) return;
    setSwitching(true);
    try {
      const res = await companyService.switchCompany(companyId);
      if (res?.success) { await authService.getCurrentUser(); await loadData(); }
      else Toast.show({ type: 'error', text1: t('profile.switch_company_failed'), text2: res?.message || t('common.retry'), position: 'top', visibilityTime: 3000 });
    } catch (err: any) {
      Toast.show({ type: 'error', text1: t('profile.switch_company_failed'), text2: err?.message || t('profile.switch_company_error'), position: 'top', visibilityTime: 3000 });
    } finally { setSwitching(false); }
  };

  const handleUpdateProfile = async () => {
    if (!editForm.realName) {
      Toast.show({ type: 'error', text1: t('profile.validation_failed'), text2: t('profile.name_required'), position: 'top', visibilityTime: 3000 });
      return;
    }
    setSaving(true);
    try {
      const res = await userService.updateProfile(editForm);
      if (res.success) { setEditVisible(false); loadData(); Toast.show({ type: 'success', text1: t('profile.update_success'), text2: t('profile.update_success_message'), position: 'top', visibilityTime: 2000 }); }
      else Toast.show({ type: 'error', text1: t('profile.update_failed'), text2: res.message || t('common.retry'), position: 'top', visibilityTime: 3000 });
    } catch (err: any) {
      Toast.show({ type: 'error', text1: t('profile.update_failed'), text2: err.message || t('profile.update_failed'), position: 'top', visibilityTime: 3000 });
    } finally { setSaving(false); }
  };

  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>;
  }

  const cardStyle = { backgroundColor: colors.cardBackground, borderRadius: AppStyles.borderRadius.lg, padding: AppStyles.spacing.lg, marginBottom: AppStyles.spacing.md };
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}>
        <View style={{ paddingHorizontal: AppStyles.spacing.lg, paddingTop: insets.top + AppStyles.spacing.lg, paddingBottom: AppStyles.spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.cardBackground, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.text }}>{user?.realName?.charAt(0) || user?.name?.charAt(0) || user?.username?.charAt(0) || 'U'}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>{user?.realName || user?.name || user?.username}</Text>
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>{user?.username}</Text>
            </View>
            <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }} onPress={() => setEditVisible(true)}>
              <Ionicons name="pencil" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ padding: AppStyles.spacing.lg, paddingTop: 0 }}>
          {/* Current Company */}
          <Text style={{ fontSize: AppStyles.fontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: AppStyles.spacing.sm, marginLeft: AppStyles.spacing.xs }}>{t('profile.current_company')}</Text>
          {currentCompany ? (
            <View style={cardStyle}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBackground, alignItems: 'center', justifyContent: 'center', marginRight: AppStyles.spacing.md }}>
                  <Ionicons name="business-outline" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: AppStyles.fontSize.md, fontWeight: '600', color: colors.text }}>{currentCompany.name}</Text>
                  <Text style={{ fontSize: AppStyles.fontSize.sm, color: colors.textSecondary }}>{t('profile.company_code')}: {currentCompany.code}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              </View>
            </View>
          ) : (
            <View style={[cardStyle, { alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' }]}>
              <Text style={{ color: colors.textTertiary, fontSize: AppStyles.fontSize.sm }}>{t('profile.no_company')}</Text>
            </View>
          )}

          {/* Switch Company */}
          {companies.length > 1 && (
            <>
              <Text style={{ fontSize: AppStyles.fontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: AppStyles.spacing.sm, marginLeft: AppStyles.spacing.xs, marginTop: AppStyles.spacing.lg }}>{t('profile.switch_company')}</Text>
              {companies.filter(c => c.companyId !== currentCompany?.id).map((c, i) => (
                <TouchableOpacity key={`${c.companyId}-${i}`} style={cardStyle} onPress={() => handleSwitchCompany(c.companyId)} disabled={switching}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBackground, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.textSecondary }}>{c.companyName?.charAt(0) || '?'}</Text>
                    </View>
                    <View><Text style={{ fontSize: AppStyles.fontSize.md, fontWeight: '600', color: colors.text }}>{c.companyName}</Text><Text style={{ fontSize: AppStyles.fontSize.sm, color: colors.textSecondary }}>{c.companyCode}</Text></View>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Settings */}
          <Text style={{ fontSize: AppStyles.fontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: AppStyles.spacing.sm, marginLeft: AppStyles.spacing.xs, marginTop: AppStyles.spacing.lg }}>{t('profile.settings')}</Text>
          <MenuItemCard icon={mode === 'dark' ? 'moon-outline' : mode === 'auto' ? 'settings-outline' : 'sunny-outline'} title={t('profile.theme_mode')} description={mode === 'light' ? t('profile.light') : mode === 'dark' ? t('profile.dark') : t('profile.auto')} onPress={() => setThemeMode(themeOrder[(themeOrder.indexOf(mode) + 1) % themeOrder.length])} />
          <MenuItemCard icon="language-outline" title={t('home.language')} description={lang === 'zh' ? t('home.language_en') : t('home.language_zh')} onPress={async () => { const next = lang === 'zh' ? 'en' : 'zh'; await changeLanguage(next); setLang(next); }} />

          {/* Logout */}
          <TouchableOpacity style={{ backgroundColor: colors.primary, borderRadius: AppStyles.borderRadius.lg, padding: AppStyles.spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: AppStyles.spacing.lg }} onPress={() => setLogoutVisible(true)}>
            <Ionicons name="log-out-outline" size={20} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={{ color: colors.white, fontSize: AppStyles.fontSize.md, fontWeight: '600' }}>{t('profile.logout')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal animationType="slide" transparent visible={editVisible} onRequestClose={() => setEditVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={MODAL_OVERLAY}>
          <View style={[MODAL_CONTENT_BASE, { backgroundColor: colors.cardBackground }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>{t('profile.edit_profile')}</Text>
              <TouchableOpacity onPress={() => setEditVisible(false)}><Ionicons name="close" size={24} color={colors.textSecondary} /></TouchableOpacity>
            </View>
            <ScrollView>
              {['realName', 'email', 'phone'].map(field => (
                <View key={field} style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>{t(`profile.${field}`)}</Text>
                  <TextInput
                    style={{ backgroundColor: colors.background, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 16, fontSize: 16, color: colors.text }}
                    value={(editForm as any)[field]}
                    onChangeText={(text) => setEditForm({ ...editForm, [field]: text })}
                    placeholder={t(`profile.${field}_placeholder`)}
                    placeholderTextColor={colors.textTertiary}
                    keyboardType={field === 'email' ? 'email-address' as any : field === 'phone' ? 'phone-pad' as any : 'default'}
                    autoCapitalize="none"
                  />
                </View>
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={[BTN_BASE, { backgroundColor: colors.borderLight }]} onPress={() => setEditVisible(false)}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textSecondary }}>{t('profile.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[BTN_BASE, { backgroundColor: colors.primary }, saving && { opacity: 0.7 }]} onPress={handleUpdateProfile} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={{ fontSize: 16, fontWeight: '600', color: colors.white }}>{t('profile.save')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Logout Modal */}
      <Modal animationType="fade" transparent visible={logoutVisible} onRequestClose={() => setLogoutVisible(false)}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: colors.cardBackground, borderRadius: 16, padding: 24, width: '85%', maxWidth: 400, alignItems: 'center' }}>
            <Ionicons name="log-out-outline" size={48} color={colors.primary} style={{ marginBottom: 16 }} />
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>{t('profile.logout')}</Text>
            <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>{t('auth.logout_message')}</Text>
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity style={[BTN_BASE, { backgroundColor: colors.borderLight }]} onPress={() => setLogoutVisible(false)}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textSecondary }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[BTN_BASE, { backgroundColor: colors.primary }]} onPress={async () => { setLogoutVisible(false); await authService.logout(); }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.white }}>{t('common.confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
