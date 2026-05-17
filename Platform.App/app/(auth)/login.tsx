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
import { LoginRequest } from '../../types/auth';
import { reportUserLocation } from '../../utils/locationReporter';
import PasswordEncryption from '../../utils/encryption';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { AppStyles } from '../../constants/AppStyles';

export default function LoginScreen() {
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
            marginBottom: 20,
        },
        label: {
            fontSize: 14,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 8,
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
        inputWrapperFocused: {
            borderColor: colors.primary,
            borderWidth: 2,
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
        eyeIcon: {
            padding: 4,
            marginLeft: 8,
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
            justifyContent: 'center',
        },
        buttonText: {
            color: colors.white,
            fontSize: 16,
            fontWeight: '600',
        },
        registerContainer: {
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 24,
            paddingVertical: 8,
        },
        registerText: {
            fontSize: 14,
            color: colors.textSecondary,
        },
        registerLink: {
            fontSize: 14,
            color: colors.primary,
            fontWeight: '600',
            marginLeft: 4,
        },
    }), [colors]);
    
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [usernameFocused, setUsernameFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);

    const showErrorToast = (message: string) => {
        Toast.show({
            type: 'error',
            text1: t('auth.login_failed'),
            text2: message,
            position: 'top',
            visibilityTime: 3000,
            topOffset: 60,
        });
    };

    const handleLogin = async () => {
        if (!username.trim() || !password.trim()) {
            showErrorToast(t('auth.login_failed_message'));
            return;
        }

        setLoading(true);

        try {
            const encryptedPassword = await PasswordEncryption.encrypt(password);

            const request: LoginRequest = {
                username: username.trim(),
                password: encryptedPassword,
            };

            const response = await authService.login(request);

            console.log('Login response:', response);

            if (response.success) {
                await authService.getCurrentUser();

                reportUserLocation().catch((error) => {
                    console.warn('位置上报失败，不影响登录:', error);
                });

                authService.notifyLoginSuccess();
            } else {
                const errorMsg = response.message || t('auth.login_failed');
                console.error('Login failed:', errorMsg);
                showErrorToast(errorMsg);
            }
        } catch (error: any) {
            console.error('Login error:', error);
            const errorMsg = error.message || t('common.error');
            showErrorToast(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const navigateToRegister = () => {
        router.push('/(auth)/register');
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
                        <Ionicons name="shield-checkmark" size={40} color={colors.primary} />
                    </View>
                    <Text style={styles.title}>{t('auth.welcome_back')}</Text>
                    <Text style={styles.subtitle}>{t('auth.login_subtitle')}</Text>
                </View>

                <View style={styles.formContainer}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t('auth.username')}</Text>
                        <View style={[
                            styles.inputWrapper,
                            usernameFocused && styles.inputWrapperFocused
                        ]}>
                            <Ionicons
                                name="person-outline"
                                size={20}
                                color={usernameFocused ? colors.primary : colors.textTertiary}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder={t('auth.username_placeholder')}
                                placeholderTextColor={colors.textTertiary}
                                value={username}
                                onChangeText={setUsername}
                                onFocus={() => setUsernameFocused(true)}
                                onBlur={() => setUsernameFocused(false)}
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!loading}
                            />
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t('auth.password')}</Text>
                        <View style={[
                            styles.inputWrapper,
                            passwordFocused && styles.inputWrapperFocused
                        ]}>
                            <Ionicons
                                name="lock-closed-outline"
                                size={20}
                                color={passwordFocused ? colors.primary : colors.textTertiary}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder={t('auth.password_placeholder')}
                                placeholderTextColor={colors.textTertiary}
                                value={password}
                                onChangeText={setPassword}
                                onFocus={() => setPasswordFocused(true)}
                                onBlur={() => setPasswordFocused(false)}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                editable={!loading}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                style={styles.eyeIcon}
                                disabled={loading}
                            >
                                <Ionicons
                                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                                    size={20}
                                    color={colors.textTertiary}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        <View style={[styles.button, loading && { opacity: 0.7 }]}>
                            {loading ? (
                                <ActivityIndicator color={colors.white} />
                            ) : (
                                <View style={styles.buttonContent}>
                                    <Text style={styles.buttonText}>{t('auth.login_button')}</Text>
                                    <Ionicons name="arrow-forward" size={20} color={colors.white} style={{ marginLeft: 8 }} />
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>

                    <View style={styles.registerContainer}>
                        <Text style={styles.registerText}>{t('auth.no_account')}</Text>
                        <TouchableOpacity onPress={navigateToRegister} disabled={loading}>
                            <Text style={styles.registerLink}>{t('auth.register_now')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
