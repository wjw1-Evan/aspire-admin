import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { authService } from '../../services/authService';
import { RegisterRequest } from '../../types/auth';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

export default function RegisterScreen() {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const styles = useMemo(() => StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
            width: '100%',
            ...Platform.select({
                web: {
                    maxWidth: '100%',
                },
                default: {},
            }),
        },
        scrollContent: {
            flexGrow: 1,
            width: '100%',
            ...Platform.select({
                web: {
                    maxWidth: '100%',
                },
                default: {},
            }),
        },
        header: {
            paddingTop: Platform.OS === 'ios' ? 80 : 60,
            paddingBottom: 40,
            paddingHorizontal: 20,
            alignItems: 'center',
        },
        logoContainer: {
            width: 80,
            height: 80,
            borderRadius: 40,
            borderWidth: 2,
            borderColor: colors.border,
            backgroundColor: colors.cardBackground,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
        },
        title: {
            fontSize: 28,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: 8,
            textAlign: 'center',
        },
        subtitle: {
            fontSize: 16,
            color: colors.textSecondary,
            textAlign: 'center',
        },
        formContainer: {
            padding: 24,
        },
        inputContainer: {
            marginBottom: 16,
        },
        label: {
            fontSize: 14,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 8,
        },
        required: {
            color: colors.error,
        },
        inputWrapper: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.cardBackground,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: colors.border,
            paddingHorizontal: 16,
            minHeight: 52,
        },
        inputIcon: {
            marginRight: 12,
        },
        input: {
            flex: 1,
            paddingVertical: 14,
            paddingHorizontal: 4,
            fontSize: 16,
            color: colors.text,
        },
        button: {
            borderRadius: 14,
            padding: 16,
            alignItems: 'center',
            marginTop: 12,
            backgroundColor: colors.primary,
        },
        buttonContent: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        buttonText: {
            color: colors.white,
            fontSize: 16,
            fontWeight: '600',
        },
        loginContainer: {
            flexDirection: 'row',
            justifyContent: 'center',
            marginTop: 24,
        },
        loginText: {
            fontSize: 14,
            color: colors.textSecondary,
        },
        loginLink: {
            fontSize: 14,
            color: colors.primary,
            fontWeight: '600',
            marginLeft: 4,
        },
    }), [colors]);
    
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [email, setEmail] = useState('');
    const [realName, setRealName] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);

    const validateForm = (): string | null => {
        if (!username.trim()) return t('auth.username_required');
        if (username.length < 3) return t('auth.username_min_length');
        if (!password) return t('auth.password_required');
        if (password.length < 6) return t('auth.password_min_length');
        if (password !== confirmPassword) return t('auth.password_mismatch');
        if (!email.trim()) return t('auth.email_required');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return t('auth.email_invalid');
        return null;
    };

    const handleRegister = async () => {
        const error = validateForm();
        if (error) {
            Toast.show({
                type: 'error',
                text1: t('auth.validation_failed'),
                text2: error,
                position: 'top',
                visibilityTime: 3000,
            });
            return;
        }

        setLoading(true);

        try {
            const request: RegisterRequest = {
                username: username.trim(),
                password: password,
                email: email.trim(),
                phone: phone.trim() || undefined,
                realName: realName.trim() || undefined,
            };

            const response = await authService.register(request);

            if (response.success) {
                Toast.show({
                    type: 'success',
                    text1: t('auth.register_success'),
                    text2: t('auth.register_success_message'),
                    position: 'top',
                    visibilityTime: 2000,
                    onHide: () => {
                        router.replace('/(auth)/login');
                    },
                });
            } else {
                Toast.show({
                type: 'error',
                text1: t('auth.register_failed'),
                text2: response.message || t('auth.register_failed_message'),
                    position: 'top',
                    visibilityTime: 3000,
                });
            }
        } catch (error: any) {
            console.error('Register error:', error);
            Toast.show({
                type: 'error',
                text1: t('auth.register_failed'),
                text2: error.message || t('auth.register_failed_message'),
                position: 'top',
                visibilityTime: 3000,
            });
        } finally {
            setLoading(false);
        }
    };

    const navigateToLogin = () => {
        router.back();
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <Ionicons name="person-add" size={40} color={colors.primary} />
                    </View>
                    <Text style={styles.title}>{t('auth.create_account')}</Text>
                    <Text style={styles.subtitle}>{t('auth.register_subtitle')}</Text>
                </View>

                <View style={styles.formContainer}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>
                            {t('auth.username')} <Text style={styles.required}>*</Text>
                        </Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="person-outline" size={20} color={colors.textTertiary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder={t('auth.username_placeholder')}
                                placeholderTextColor={colors.textTertiary}
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!loading}
                            />
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>
                            {t('auth.email')} <Text style={styles.required}>*</Text>
                        </Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="mail-outline" size={20} color={colors.textTertiary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder={t('auth.email_placeholder')}
                                placeholderTextColor={colors.textTertiary}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!loading}
                            />
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>
                            {t('auth.password')} <Text style={styles.required}>*</Text>
                        </Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="lock-closed-outline" size={20} color={colors.textTertiary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder={t('auth.password_placeholder')}
                                placeholderTextColor={colors.textTertiary}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                autoCapitalize="none"
                                editable={!loading}
                            />
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>
                            {t('auth.confirm_password')} <Text style={styles.required}>*</Text>
                        </Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="lock-open-outline" size={20} color={colors.textTertiary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder={t('auth.confirm_password_placeholder')}
                                placeholderTextColor={colors.textTertiary}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                                autoCapitalize="none"
                                editable={!loading}
                            />
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t('auth.real_name')}</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="person" size={20} color={colors.textTertiary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder={t('auth.real_name_placeholder')}
                                placeholderTextColor={colors.textTertiary}
                                value={realName}
                                onChangeText={setRealName}
                                editable={!loading}
                            />
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t('auth.phone')}</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="call-outline" size={20} color={colors.textTertiary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder={t('auth.phone_placeholder')}
                                placeholderTextColor={colors.textTertiary}
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
                                editable={!loading}
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        <View style={[styles.button, loading && { opacity: 0.7 }]}>
                            {loading ? (
                                <ActivityIndicator color={colors.white} />
                            ) : (
                                <View style={styles.buttonContent}>
                                    <Text style={styles.buttonText}>{t('auth.register_button')}</Text>
                                    <Ionicons name="checkmark" size={20} color={colors.white} style={{ marginLeft: 8 }} />
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>

                    <View style={styles.loginContainer}>
                        <Text style={styles.loginText}>{t('auth.has_account')}</Text>
                        <TouchableOpacity onPress={navigateToLogin} disabled={loading}>
                            <Text style={styles.loginLink}>{t('auth.login_now')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
