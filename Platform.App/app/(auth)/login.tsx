import React, { useState } from 'react';
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
    Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { authService } from '../../services/authService';
import { LoginRequest } from '../../types/auth';

export default function LoginScreen() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [captchaId, setCaptchaId] = useState('');
    const [captchaImage, setCaptchaImage] = useState('');
    const [captchaAnswer, setCaptchaAnswer] = useState('');
    const [needCaptcha, setNeedCaptcha] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [usernameFocused, setUsernameFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [captchaFocused, setCaptchaFocused] = useState(false);

    // 显示错误消息
    const showErrorToast = (message: string) => {
        Toast.show({
            type: 'error',
            text1: '错误',
            text2: message,
            position: 'top',
            visibilityTime: 3000,
        });
    };

    // Fetch captcha image
    const fetchCaptcha = async () => {
        try {
            const response = await authService.getImageCaptcha('login');
            if (response.success && response.data) {
                setCaptchaId(response.data.captchaId);
                setCaptchaImage(response.data.imageData); // Fixed: use imageData not imageBase64
                setNeedCaptcha(true);
            }
        } catch (error) {
            console.error('Failed to fetch captcha:', error);
        }
    };

    const handleLogin = async () => {
        // Basic validation
        if (!username.trim() || !password.trim()) {
            showErrorToast('请输入用户名和密码');
            return;
        }

        if (needCaptcha && !captchaAnswer.trim()) {
            showErrorToast('请输入验证码');
            return;
        }

        setLoading(true);

        try {
            const request: LoginRequest = {
                username: username.trim(),
                password: password,
                captchaId: needCaptcha ? captchaId : undefined,
                captchaAnswer: needCaptcha ? captchaAnswer.trim() : undefined,
            };

            const response = await authService.login(request);

            console.log('Login response:', response);

            if (response.success) {
                // Fetch user info after successful login
                await authService.getCurrentUser();

                // Notify auth listeners to trigger redirect in _layout
                authService.notifyLoginSuccess();
            } else {
                // Display error message from backend
                const errorMsg = response.errorMessage || '用户名或密码错误，请检查后重试';
                console.error('Login failed:', errorMsg);

                // Always fetch captcha on login failure
                await fetchCaptcha();

                // Clear captcha answer
                setCaptchaAnswer('');

                // Show error message using Toast
                showErrorToast(errorMsg);
            }
        } catch (error: any) {
            console.error('Login error:', error);
            // Display error message - could be from network error or API error
            const errorMsg = error.errorMessage
                || error.message
                || '登录过程中发生错误，请稍后重试';

            // Fetch captcha on error
            await fetchCaptcha();

            // Show error message using Toast
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
                {/* Gradient Header */}
                <LinearGradient
                    colors={['#667eea', '#764ba2', '#f093fb']}
                    style={styles.header}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    locations={[0, 0.5, 1]}
                >
                    <View style={styles.logoContainer}>
                        <Ionicons name="shield-checkmark" size={60} color="#fff" />
                    </View>
                    <Text style={styles.title}>欢迎回来</Text>
                    <Text style={styles.subtitle}>登录您的账户开始使用</Text>
                </LinearGradient>

                <View style={styles.formContainer}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>用户名</Text>
                        <View style={[
                            styles.inputWrapper,
                            usernameFocused && styles.inputWrapperFocused
                        ]}>
                            <Ionicons 
                                name="person-outline" 
                                size={20} 
                                color={usernameFocused ? '#667eea' : '#999'} 
                                style={styles.inputIcon} 
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="请输入用户名"
                                placeholderTextColor="#999"
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
                        <Text style={styles.label}>密码</Text>
                        <View style={[
                            styles.inputWrapper,
                            passwordFocused && styles.inputWrapperFocused
                        ]}>
                            <Ionicons 
                                name="lock-closed-outline" 
                                size={20} 
                                color={passwordFocused ? '#667eea' : '#999'} 
                                style={styles.inputIcon} 
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="请输入密码"
                                placeholderTextColor="#999"
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
                                    color="#999" 
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {needCaptcha && (
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>验证码</Text>
                            <View style={styles.captchaContainer}>
                                <View style={[
                                    styles.inputWrapper, 
                                    { flex: 1 },
                                    captchaFocused && styles.inputWrapperFocused
                                ]}>
                                    <Ionicons 
                                        name="shield-outline" 
                                        size={20} 
                                        color={captchaFocused ? '#667eea' : '#999'} 
                                        style={styles.inputIcon} 
                                    />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="请输入验证码"
                                        placeholderTextColor="#999"
                                        value={captchaAnswer}
                                        onChangeText={setCaptchaAnswer}
                                        onFocus={() => setCaptchaFocused(true)}
                                        onBlur={() => setCaptchaFocused(false)}
                                        autoCapitalize="characters"
                                        autoCorrect={false}
                                        editable={!loading}
                                        maxLength={6}
                                    />
                                </View>
                                <TouchableOpacity
                                    style={styles.captchaImageContainer}
                                    onPress={fetchCaptcha}
                                    disabled={loading}
                                    activeOpacity={0.7}
                                >
                                    {captchaImage ? (
                                        <Image
                                            source={{ uri: `data:image/png;base64,${captchaImage}` }}
                                            style={styles.captchaImage}
                                            resizeMode="contain"
                                        />
                                    ) : (
                                        <View style={styles.captchaPlaceholderContainer}>
                                            <Ionicons name="refresh-outline" size={20} color="#999" />
                                            <Text style={styles.captchaPlaceholder}>点击刷新</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.captchaHint}>点击图片可刷新验证码</Text>
                        </View>
                    )}

                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        <LinearGradient
                            colors={loading ? ['#cbd5e0', '#a0aec0'] : ['#667eea', '#764ba2', '#f093fb']}
                            style={styles.button}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            locations={loading ? undefined : [0, 0.5, 1]}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <View style={styles.buttonContent}>
                                    <Text style={styles.buttonText}>登录</Text>
                                    <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
                                </View>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.registerContainer}>
                        <Text style={styles.registerText}>还没有账户？</Text>
                        <TouchableOpacity onPress={navigateToRegister} disabled={loading}>
                            <Text style={styles.registerLink}>立即注册</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7fa',
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
        paddingTop: Platform.OS === 'ios' ? 70 : 50,
        paddingBottom: 50,
        paddingHorizontal: 20,
        alignItems: 'center',
        borderBottomLeftRadius: 35,
        borderBottomRightRadius: 35,
        marginBottom: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    logoContainer: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.4)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    title: {
        fontSize: 36,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 10,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.95)',
        textAlign: 'center',
        fontWeight: '400',
    },
    formContainer: {
        padding: 28,
        paddingTop: 48,
        marginTop: -25,
    },
    inputContainer: {
        marginBottom: 22,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        color: '#2d3748',
        marginBottom: 10,
        letterSpacing: 0.3,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        paddingHorizontal: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
        minHeight: 56,
    },
    inputWrapperFocused: {
        borderColor: '#667eea',
        borderWidth: 2,
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    inputIcon: {
        marginRight: 14,
    },
    input: {
        flex: 1,
        paddingVertical: 16,
        paddingHorizontal: 4,
        fontSize: 16,
        color: '#1a202c',
        fontWeight: '400',
    },
    eyeIcon: {
        padding: 4,
        marginLeft: 8,
    },
    button: {
        borderRadius: 14,
        padding: 18,
        alignItems: 'center',
        marginTop: 16,
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 8,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    registerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 28,
        paddingVertical: 8,
    },
    registerText: {
        fontSize: 15,
        color: '#64748b',
        fontWeight: '400',
    },
    registerLink: {
        fontSize: 15,
        color: '#667eea',
        fontWeight: '700',
        marginLeft: 6,
        textDecorationLine: 'underline',
    },
    captchaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    captchaImageContainer: {
        width: 130,
        height: 56,
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        borderRadius: 14,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
    },
    captchaImage: {
        width: '100%',
        height: '100%',
    },
    captchaPlaceholderContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    captchaPlaceholder: {
        fontSize: 11,
        color: '#94a3b8',
        fontWeight: '500',
        marginTop: 2,
    },
    captchaHint: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 6,
        textAlign: 'center',
        fontStyle: 'italic',
    },
});
