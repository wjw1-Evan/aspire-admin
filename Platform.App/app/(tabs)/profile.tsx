import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    View as RNView,
    Text as RNText,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppStyles, commonStyles } from '../../constants/AppStyles';
import { authService } from '../../services/authService';
import { companyService } from '../../services/companyService';
import { userService } from '../../services/userService';
import { User, UpdateProfileRequest } from '../../types/auth';
import { Company, UserCompany } from '../../types/company';

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

    const handleSwitchCompany = async (companyId: string, companyName: string) => {
        console.log('Attempting to switch company:', companyId, companyName);
        if (companyId === currentCompany?.id) {
            return; // Already on this company
        }
        setSwitchingCompany(true);
        console.log('Calling switchCompany API with id:', companyId);
        try {
            const response = await companyService.switchCompany(companyId);
            console.log('SwitchCompany response:', response);
            if (response && response.success) {
                // Refresh user info (including currentCompanyId)
                await authService.getCurrentUser();
                await loadData();
            } else {
                alert(response?.errorMessage || '切换企业失败');
            }
        } catch (error: any) {
            console.error('SwitchCompany error:', error);
            alert(error?.errorMessage || error?.message || '切换企业时发生错误');
        } finally {
            setSwitchingCompany(false);
        }
    };

    const handleLogout = () => {
        if (confirm('确定要退出登录吗？')) {
            (async () => {
                await authService.logout();
            })();
        }
    };

    const handleUpdateProfile = async () => {
        if (!editForm.realName) {
            alert('请输入真实姓名');
            return;
        }

        setSaving(true);
        try {
            const response = await userService.updateProfile(editForm);
            if (response.success) {
                setEditModalVisible(false);
                loadData();
            } else {
                alert(response.errorMessage || '更新失败');
            }
        } catch (error: any) {
            alert(error.errorMessage || '更新时发生错误');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={commonStyles.pageContainer}>
                <ActivityIndicator size="large" color={AppStyles.colors.primary} />
            </View>
        );
    }

    return (
        <View style={commonStyles.pageContainer}>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
                <LinearGradient
                    colors={AppStyles.gradients.primary}
                    style={commonStyles.gradientHeader}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    locations={[0, 0.5, 1]}
                >
                    <RNView style={styles.headerContent}>
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
                                <Ionicons name="pencil" size={20} color="#fff" />
                            </TouchableOpacity>
                        </RNView>

                        <RNView style={styles.statsContainer}>
                            <RNView style={styles.statItem}>
                                <RNText style={styles.statLabel}>邮箱</RNText>
                                <RNText style={styles.statValue}>{user?.email || '未设置'}</RNText>
                            </RNView>
                            <RNView style={styles.statDivider} />
                            <RNView style={styles.statItem}>
                                <RNText style={styles.statLabel}>手机号</RNText>
                                <RNText style={styles.statValue}>{user?.phone || '未设置'}</RNText>
                            </RNView>
                        </RNView>
                    </RNView>
                </LinearGradient>
                {/* Content Section */}
                <View style={styles.contentSection}>
                {/* Current Company Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>当前企业</Text>
                    {currentCompany ? (
                        <View style={commonStyles.card}>
                            <View style={styles.companyCardContent}>
                                <View style={styles.companyIcon}>
                                    <Ionicons name="business" size={24} color={AppStyles.colors.primary} />
                                </View>
                                <View style={styles.companyInfo}>
                                    <Text style={styles.companyName}>{currentCompany.name}</Text>
                                    <Text style={styles.companyCode}>编码: {currentCompany.code}</Text>
                                </View>
                                <Ionicons name="checkmark-circle" size={24} color={AppStyles.colors.primary} />
                            </View>
                        </View>
                    ) : (
                        <View style={[commonStyles.card, styles.emptyCard]}>
                            <Text style={styles.emptyText}>未加入任何企业</Text>
                        </View>
                    )}
                </View>

                {/* Switch Company Section */}
                {companies.length > 1 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>切换企业</Text>
                        {companies
                            .filter(company => company.companyId !== currentCompany?.id)
                            .map((company, index) => (
                                <TouchableOpacity
                                    key={`${company.companyId || 'company'}-${index}`}
                                    style={[
                                        commonStyles.card,
                                        styles.companyItem,
                                        company.companyId === currentCompany?.id && styles.companyItemActive,
                                    ]}
                                    onPress={() => {
                                        console.log('调试', `点击了 ${company.companyName}`);
                                        console.log('Company item pressed:', company.companyId, company.companyName);
                                        handleSwitchCompany(company.companyId, company.companyName);
                                    }}
                                    disabled={switchingCompany || company.companyId === currentCompany?.id}
                                >
                                    <View style={styles.companyItemLeft}>
                                        <View style={[
                                            styles.companyItemIcon,
                                            company.companyId === currentCompany?.id && styles.companyItemIconActive
                                        ]}>
                                            <Text style={[
                                                styles.companyItemIconText,
                                                company.companyId === currentCompany?.id && styles.companyItemIconTextActive
                                            ]}>
                                                {company.companyName?.charAt(0) || '?'}
                                            </Text>
                                        </View>
                                        <View>
                                            <Text style={[
                                                styles.companyItemName,
                                                company.companyId === currentCompany?.id && styles.companyItemNameActive
                                            ]}>
                                                {company.companyName}
                                            </Text>
                                            <Text style={styles.companyItemCode}>{company.companyCode}</Text>
                                        </View>
                                    </View>
                                    {company.companyId === currentCompany?.id && (
                                        <View style={styles.activeTag}>
                                            <Text style={styles.activeTagText}>当前</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                    </View>
                )}

                {/* Actions Section */}
                <View style={styles.section}>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={20} color="#ff4d4f" style={{ marginRight: 8 }} />
                        <Text style={styles.logoutButtonText}>退出登录</Text>
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
                            <Text style={styles.modalTitle}>修改个人信息</Text>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.formContainer}>
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>真实姓名</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editForm.realName}
                                    onChangeText={(text) => setEditForm({ ...editForm, realName: text })}
                                    placeholder="请输入真实姓名"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>邮箱</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editForm.email}
                                    onChangeText={(text) => setEditForm({ ...editForm, email: text })}
                                    placeholder="请输入邮箱"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>手机号</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editForm.phone}
                                    onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
                                    placeholder="请输入手机号"
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setEditModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>取消</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                                onPress={handleUpdateProfile}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.saveButtonText}>保存</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
    </View>
    );
}

const styles = StyleSheet.create({
    headerContent: {
        backgroundColor: 'transparent',
    },
    scrollView: {
        flex: 1,
        width: '100%',
        ...Platform.select({
            web: {
                overflowY: 'auto',
                maxWidth: '100%',
            },
            default: {},
        }),
    },
    contentContainer: {
        flexGrow: 1,
        width: '100%',
        paddingBottom: AppStyles.spacing.xl * 2,
        ...Platform.select({
            web: {
                maxWidth: '100%',
            },
            default: {},
        }),
    },
    contentSection: {
        padding: AppStyles.spacing.lg,
        paddingTop: 0,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    avatarContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    avatarText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
    },
    userInfo: {
        flex: 1,
        marginLeft: 16,
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    userRole: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
    },
    editButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 16,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginHorizontal: 16,
    },
    statLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    section: {
        marginBottom: AppStyles.spacing.lg,
    },
    sectionTitle: {
        fontSize: AppStyles.fontSize.lg,
        fontWeight: 'bold',
        color: AppStyles.colors.text,
        marginBottom: AppStyles.spacing.md,
        marginLeft: AppStyles.spacing.xs,
    },
    companyCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    companyIcon: {
        width: 48,
        height: 48,
        borderRadius: AppStyles.borderRadius.md,
        backgroundColor: '#f5f7ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: AppStyles.spacing.md,
    },
    companyInfo: {
        flex: 1,
    },
    companyName: {
        fontSize: AppStyles.fontSize.lg,
        fontWeight: 'bold',
        color: AppStyles.colors.text,
        marginBottom: AppStyles.spacing.xs,
    },
    companyCode: {
        fontSize: AppStyles.fontSize.sm,
        color: AppStyles.colors.textSecondary,
    },
    emptyCard: {
        alignItems: 'center',
        borderWidth: 1,
        borderColor: AppStyles.colors.border,
        borderStyle: 'dashed',
    },
    emptyText: {
        color: AppStyles.colors.textTertiary,
        fontSize: AppStyles.fontSize.sm,
    },
    companyItem: {
        marginBottom: AppStyles.spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    companyItemActive: {
        borderColor: AppStyles.colors.primary,
        backgroundColor: '#f5f7ff',
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
        backgroundColor: '#f5f5f5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    companyItemIconActive: {
        backgroundColor: '#667eea',
    },
    companyItemIconText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#666',
    },
    companyItemIconTextActive: {
        color: '#fff',
    },
    companyItemName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    companyItemNameActive: {
        color: '#667eea',
    },
    companyItemCode: {
        fontSize: 12,
        color: '#999',
    },
    activeTag: {
        backgroundColor: AppStyles.colors.primary,
        paddingHorizontal: AppStyles.spacing.sm,
        paddingVertical: AppStyles.spacing.xs,
        borderRadius: AppStyles.borderRadius.sm,
    },
    activeTagText: {
        color: '#fff',
        fontSize: AppStyles.fontSize.xs,
        fontWeight: 'bold',
    },
    logoutButton: {
        backgroundColor: AppStyles.colors.cardBackground,
        borderRadius: AppStyles.borderRadius.lg,
        padding: AppStyles.spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: AppStyles.colors.error,
        ...AppStyles.shadows.md,
    },
    logoutButtonText: {
        color: AppStyles.colors.error,
        fontSize: AppStyles.fontSize.md,
        fontWeight: '600',
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
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
        color: '#333',
    },
    formContainer: {
        marginBottom: 24,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f5f7fa',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#333',
    },
    modalFooter: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    saveButton: {
        flex: 1,
        backgroundColor: '#667eea',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});
