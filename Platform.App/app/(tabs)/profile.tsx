import React, { useState, useEffect, useMemo } from 'react';
import {
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    View as RNView,
    Text as RNText,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { AppStyles, createCommonStyles } from '../../constants/AppStyles';
import { useTheme, ThemeMode } from '../../contexts/ThemeContext';
import { authService } from '../../services/authService';
import { companyService } from '../../services/companyService';
import { userService } from '../../services/userService';
import { User, UpdateProfileRequest } from '../../types/auth';
import { Company, UserCompany } from '../../types/company';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MenuItemCard from '../../components/ui/MenuItemCard';
import { useTranslation } from 'react-i18next';
import { changeLanguage, getCurrentLanguage } from '../../utils/i18n';

export default function ProfileScreen() {
    const [user, setUser] = useState<User | null>(null);
    const [companies, setCompanies] = useState<UserCompany[]>([]);
    const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
    const [loading, setLoading] = useState(true);
    const [switchingCompany, setSwitchingCompany] = useState(false);

    // Edit Profile State
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editForm, setEditForm] = useState<UpdateProfileRequest>({});
    const [saving, setSaving] = useState(false);
    
    // Logout Confirmation Modal State
    const [logoutModalVisible, setLogoutModalVisible] = useState(false);

    const { mode, setThemeMode, colors: themeColors } = useTheme();
    const { t } = useTranslation();
    const [currentLang, setCurrentLang] = useState<'zh' | 'en'>(getCurrentLanguage());
    const insets = useSafeAreaInsets();
    const comStyles = useMemo(() => createCommonStyles(themeColors), [themeColors]);
    const styles = useMemo(() => StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: themeColors.background,
        },
        header: {
            paddingHorizontal: AppStyles.spacing.lg,
            paddingTop: insets.top + AppStyles.spacing.lg,
            paddingBottom: AppStyles.spacing.lg,
        },
        headerTop: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        avatarContainer: {
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: themeColors.cardBackground,
            alignItems: 'center',
            justifyContent: 'center',
        },
        avatarText: {
            fontSize: 28,
            fontWeight: 'bold',
            color: themeColors.text,
        },
        userInfo: {
            flex: 1,
            marginLeft: 16,
        },
        userName: {
            fontSize: 24,
            fontWeight: 'bold',
            color: themeColors.text,
            marginBottom: 4,
        },
        userRole: {
            fontSize: 14,
            color: themeColors.textSecondary,
        },
        editButton: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: themeColors.cardBackground,
            borderWidth: 1,
            borderColor: themeColors.border,
            alignItems: 'center',
            justifyContent: 'center',
        },
        contentSection: {
            padding: AppStyles.spacing.lg,
            paddingTop: 0,
        },
        section: {
            marginBottom: AppStyles.spacing.lg,
        },
        sectionTitle: {
            fontSize: AppStyles.fontSize.sm,
            fontWeight: '600',
            color: themeColors.textSecondary,
            marginBottom: AppStyles.spacing.sm,
            marginLeft: AppStyles.spacing.xs,
        },
        companyIcon: {
            width: 44,
            height: 44,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: themeColors.border,
            backgroundColor: themeColors.cardBackground,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: AppStyles.spacing.md,
        },
        companyInfo: {
            flex: 1,
        },
        companyName: {
            fontSize: AppStyles.fontSize.md,
            fontWeight: '600',
            color: themeColors.text,
        },
        companyCode: {
            fontSize: AppStyles.fontSize.sm,
            color: themeColors.textSecondary,
        },
        companyItem: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        companyItemLeft: {
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
        },
        companyItemIcon: {
            width: 40,
            height: 40,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: themeColors.border,
            backgroundColor: themeColors.cardBackground,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
        },
        companyItemIconText: {
            fontSize: 18,
            fontWeight: 'bold',
            color: themeColors.textSecondary,
        },
        logoutButton: {
            backgroundColor: themeColors.primary,
            borderRadius: AppStyles.borderRadius.lg,
            padding: AppStyles.spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
        },
        logoutButtonText: {
            color: themeColors.white,
            fontSize: AppStyles.fontSize.md,
            fontWeight: '600',
        },
        // Modal Styles
        modalContainer: {
            flex: 1,
            backgroundColor: themeColors.overlay,
            justifyContent: 'flex-end',
        },
        modalContent: {
            backgroundColor: themeColors.cardBackground,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            padding: 24,
            maxHeight: '80%',
        },
        modalHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
        },
        modalTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: themeColors.text,
        },
        formGroup: {
            marginBottom: 20,
        },
        label: {
            fontSize: 14,
            fontWeight: '600',
            color: themeColors.textSecondary,
            marginBottom: 8,
        },
        input: {
            backgroundColor: themeColors.background,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: themeColors.border,
            padding: 16,
            fontSize: 16,
            color: themeColors.text,
        },
        cancelButton: {
            flex: 1,
            backgroundColor: themeColors.borderLight,
            borderRadius: 12,
            padding: 16,
            alignItems: 'center',
        },
        cancelButtonText: {
            fontSize: 16,
            fontWeight: '600',
            color: themeColors.textSecondary,
        },
        saveButton: {
            flex: 1,
            backgroundColor: themeColors.primary,
            borderRadius: 12,
            padding: 16,
            alignItems: 'center',
        },
        saveButtonText: {
            fontSize: 16,
            fontWeight: '600',
            color: themeColors.white,
        },
        logoutModalOverlay: {
            flex: 1,
            backgroundColor: themeColors.overlay,
            justifyContent: 'center',
            alignItems: 'center',
        },
        logoutModalContent: {
            backgroundColor: themeColors.cardBackground,
            borderRadius: 16,
            padding: 24,
            width: '85%',
            maxWidth: 400,
            alignItems: 'center',
        },
        logoutModalTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: themeColors.text,
            marginBottom: 8,
        },
        logoutModalMessage: {
            fontSize: 16,
            color: themeColors.textSecondary,
            textAlign: 'center',
            marginBottom: 24,
        },
    }), [themeColors, insets]);

    const loadData = async () => {
        try {
            // Load user info
            const userResponse = await authService.getCurrentUser();
            if (userResponse.success && userResponse.data) {
                const userData = userResponse.data;
                setUser(userData);
                setEditForm({
                    realName: userData.realName || userData.name || '',
                    email: userData.email || '',
                    phone: userData.phone || '',
                });
            }

            // Load current company
            const companyResponse = await companyService.getCurrentCompany();
            if (companyResponse.success && companyResponse.data) {
                setCurrentCompany(companyResponse.data);
            }

            // Load all companies
            const companiesResponse = await companyService.getMyCompanies();
            if (companiesResponse.success && companiesResponse.data) {
                setCompanies(companiesResponse.data);
            }
        } catch (error) {
            console.error('Error loading profile data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSwitchCompany = async (companyId: string) => {
        if (companyId === currentCompany?.id) {
            return;
        }
        setSwitchingCompany(true);
        try {
            const response = await companyService.switchCompany(companyId);
            if (response && response.success) {
                // Refresh user info (including currentCompanyId)
                await authService.getCurrentUser();
                await loadData();
            } else {
                Toast.show({
                    type: 'error',
                    text1: t('profile.switch_company_failed'),
                    text2: response?.message || t('common.retry'),
                    position: 'top',
                    visibilityTime: 3000,
                });
            }
        } catch (error: any) {
            console.error('SwitchCompany error:', error);
            Toast.show({
                type: 'error',
                text1: t('profile.switch_company_failed'),
                text2: error?.message || t('profile.switch_company_error'),
                position: 'top',
                visibilityTime: 3000,
            });
        } finally {
            setSwitchingCompany(false);
        }
    };

    const handleLogout = () => {
        setLogoutModalVisible(true);
    };

    const confirmLogout = async () => {
        setLogoutModalVisible(false);
        await authService.logout();
    };

    const handleUpdateProfile = async () => {
        if (!editForm.realName) {
            Toast.show({
                type: 'error',
                text1: t('profile.validation_failed'),
                text2: t('profile.name_required'),
                position: 'top',
                visibilityTime: 3000,
            });
            return;
        }

        setSaving(true);
        try {
            const response = await userService.updateProfile(editForm);
            if (response.success) {
                setEditModalVisible(false);
                loadData();
                Toast.show({
                    type: 'success',
                    text1: t('profile.update_success'),
                    text2: t('profile.update_success_message'),
                    position: 'top',
                    visibilityTime: 2000,
                });
            } else {
                Toast.show({
                    type: 'error',
                    text1: t('profile.update_failed'),
                    text2: response.message || t('common.retry'),
                    position: 'top',
                    visibilityTime: 3000,
                });
            }
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: t('profile.update_failed'),
                text2: error.message || t('profile.update_failed'),
                position: 'top',
                visibilityTime: 3000,
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={themeColors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}>
                {/* Header */}
                <View style={styles.header}>
                    <RNView style={styles.headerTop}>
                        <RNView style={styles.avatarContainer}>
                            <RNText style={styles.avatarText}>
                                {user?.realName?.charAt(0) || user?.name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                            </RNText>
                        </RNView>
                        <RNView style={styles.userInfo}>
                            <RNText style={styles.userName}>{user?.realName || user?.name || user?.username}</RNText>
                            <RNText style={styles.userRole}>{user?.username}</RNText>
                        </RNView>
                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => setEditModalVisible(true)}
                        >
                            <Ionicons name="pencil" size={20} color={themeColors.text} />
                        </TouchableOpacity>
                    </RNView>
                </View>

                {/* Content Section */}
                <View style={styles.contentSection}>
                    {/* Current Company Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('profile.current_company')}</Text>
                        {currentCompany ? (
                            <View style={comStyles.card}>
                                <RNView style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <RNView style={styles.companyIcon}>
                                        <Ionicons name="business-outline" size={22} color={themeColors.primary} />
                                    </RNView>
                                    <RNView style={styles.companyInfo}>
                                        <RNText style={styles.companyName}>{currentCompany.name}</RNText>
                                        <RNText style={styles.companyCode}>{t('profile.company_code')}: {currentCompany.code}</RNText>
                                    </RNView>
                                    <Ionicons name="checkmark-circle" size={24} color={themeColors.primary} />
                                </RNView>
                            </View>
                        ) : (
                            <View style={[comStyles.card, { alignItems: 'center', borderWidth: 1, borderColor: themeColors.border, borderStyle: 'dashed' }]}>
                                <RNText style={{ color: themeColors.textTertiary, fontSize: AppStyles.fontSize.sm }}>{t('profile.no_company')}</RNText>
                            </View>
                        )}
                    </View>

                    {/* Switch Company Section */}
                    {companies.length > 1 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('profile.switch_company')}</Text>
                            {companies
                                .filter(company => company.companyId !== currentCompany?.id)
                                .map((company, index) => (
                                    <TouchableOpacity
                                        key={`${company.companyId || 'company'}-${index}`}
                                        style={[comStyles.card, styles.companyItem]}
                                        onPress={() => handleSwitchCompany(company.companyId)}
                                        disabled={switchingCompany || company.companyId === currentCompany?.id}
                                    >
                                        <RNView style={styles.companyItemLeft}>
                                            <RNView style={styles.companyItemIcon}>
                                                <RNText style={styles.companyItemIconText}>
                                                    {company.companyName?.charAt(0) || '?'}
                                                </RNText>
                                            </RNView>
                                            <RNView>
                                                <RNText style={styles.companyName}>{company.companyName}</RNText>
                                                <RNText style={styles.companyCode}>{company.companyCode}</RNText>
                                            </RNView>
                                        </RNView>
                                    </TouchableOpacity>
                                ))}
                        </View>
                    )}

                    {/* Theme Settings Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('profile.settings')}</Text>
                        <MenuItemCard
                            icon={mode === 'dark' ? 'moon-outline' : mode === 'auto' ? 'settings-outline' : 'sunny-outline'}
                            title={t('profile.theme_mode')}
                            description={mode === 'light' ? t('profile.light') : mode === 'dark' ? t('profile.dark') : t('profile.auto')}
                            onPress={() => {
                                const order: ThemeMode[] = ['light', 'dark', 'auto'];
                                const nextIndex = (order.indexOf(mode) + 1) % order.length;
                                setThemeMode(order[nextIndex]);
                            }}
                        />
                        <MenuItemCard
                            icon="language-outline"
                            title={t('home.language')}
                            description={currentLang === 'zh' ? t('home.language_en') : t('home.language_zh')}
                            onPress={async () => {
                                const newLang = currentLang === 'zh' ? 'en' : 'zh';
                                await changeLanguage(newLang);
                                setCurrentLang(newLang);
                            }}
                        />
                    </View>

                    {/* Actions Section */}
                    <View style={styles.section}>
                        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                            <Ionicons name="log-out-outline" size={20} color={themeColors.white} style={{ marginRight: 8 }} />
                            <RNText style={styles.logoutButtonText}>{t('profile.logout')}</RNText>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Edit Profile Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={editModalVisible}
                onRequestClose={() => setEditModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalContainer}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('profile.edit_profile')}</Text>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                <Ionicons name="close" size={24} color={themeColors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>{t('profile.real_name')}</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editForm.realName}
                                    onChangeText={(text) => setEditForm({ ...editForm, realName: text })}
                                    placeholder={t('profile.real_name_placeholder')}
                                    placeholderTextColor={themeColors.textTertiary}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>{t('profile.email')}</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editForm.email}
                                    onChangeText={(text) => setEditForm({ ...editForm, email: text })}
                                    placeholder={t('profile.email_placeholder')}
                                    placeholderTextColor={themeColors.textTertiary}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>{t('profile.phone')}</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editForm.phone}
                                    onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
                                    placeholder={t('profile.phone_placeholder')}
                                    placeholderTextColor={themeColors.textTertiary}
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </ScrollView>

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setEditModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>{t('profile.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.saveButton, saving && { opacity: 0.7 }]}
                                onPress={handleUpdateProfile}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color={themeColors.white} />
                                ) : (
                                    <Text style={styles.saveButtonText}>{t('profile.save')}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Logout Confirmation Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={logoutModalVisible}
                onRequestClose={() => setLogoutModalVisible(false)}
            >
                <RNView style={styles.logoutModalOverlay}>
                    <RNView style={styles.logoutModalContent}>
                        <Ionicons name="log-out-outline" size={48} color={themeColors.primary} style={{ marginBottom: 16 }} />
                        <RNText style={styles.logoutModalTitle}>{t('profile.logout')}</RNText>
                        <RNText style={styles.logoutModalMessage}>{t('auth.logout_message')}</RNText>
                        <RNView style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setLogoutModalVisible(false)}
                            >
                                <RNText style={styles.cancelButtonText}>{t('common.cancel')}</RNText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={confirmLogout}
                            >
                                <RNText style={styles.saveButtonText}>{t('common.confirm')}</RNText>
                            </TouchableOpacity>
                        </RNView>
                    </RNView>
                </RNView>
            </Modal>
        </View>
    );
}
