import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
            if (Platform.OS === 'web') {
                window.alert('错误\n\n请输入用户名和密码');
            } else {
                Alert.alert('错误', '请输入用户名和密码');
            }
            return;
        }

        if (needCaptcha && !captchaAnswer.trim()) {
            if (Platform.OS === 'web') {
                window.alert('错误\n\n请输入验证码');
            } else {
                Alert.alert('错误', '请输入验证码');
            }
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

                // Use window.alert for Web compatibility
                if (Platform.OS === 'web') {
                    window.alert(`登录失败\n\n${errorMsg}`);
                } else {
                    Alert.alert('登录失败', errorMsg);
                }
            }
        } catch (error: any) {
            console.error('Login error:', error);
            // Display error message - could be from network error or API error
            const errorMsg = error.errorMessage
                || error.message
                || '登录过程中发生错误，请稍后重试';

            // Fetch captcha on error
            await fetchCaptcha();

            // Use window.alert for Web compatibility
            if (Platform.OS === 'web') {
                window.alert(`登录失败\n\n${errorMsg}`);
            } else {
                Alert.alert('登录失败', errorMsg);
            }
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
                    colors={['#667eea', '#764ba2']}
                    style={styles.header}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
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
                        <View style={styles.inputWrapper}>
                            <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="请输入用户名"
                                placeholderTextColor="#999"
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!loading}
                            />
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>密码</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="请输入密码"
                                placeholderTextColor="#999"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                autoCapitalize="none"
                                editable={!loading}
                            />
                        </View>
                    </View>

                    {needCaptcha && (
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>验证码</Text>
                            <View style={styles.captchaContainer}>
                                <View style={[styles.inputWrapper, { flex: 1 }]}>
                                    <Ionicons name="shield-outline" size={20} color="#999" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="请输入验证码"
                                        placeholderTextColor="#999"
                                        value={captchaAnswer}
                                        onChangeText={setCaptchaAnswer}
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
                                >
                                    {captchaImage ? (
                                        <img
                                            src={`data:image/png;base64,${captchaImage}`}
                                            alt="验证码"
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'contain',
                                            }}
                                        />
                                    ) : (
                                        <Text style={styles.captchaPlaceholder}>点击刷新</Text>
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
                            colors={loading ? ['#999', '#999'] : ['#667eea', '#764ba2']}
                            style={styles.button}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
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
        backgroundColor: '#f8f9fa',
    },
    scrollContent: {
        flexGrow: 1,
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 40,
        paddingHorizontal: 20,
        alignItems: 'center',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    logoContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
    },
    formContainer: {
        padding: 24,
        marginTop: -20,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e1e8ed',
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        padding: 16,
        fontSize: 16,
        color: '#333',
    },
    button: {
        borderRadius: 12,
        padding: 18,
        alignItems: 'center',
        marginTop: 12,
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    registerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
    },
    registerText: {
        fontSize: 14,
        color: '#666',
    },
    registerLink: {
        fontSize: 14,
        color: '#667eea',
        fontWeight: '600',
        marginLeft: 4,
    },
    captchaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    captchaImageContainer: {
        width: 120,
        height: 56,
        borderWidth: 1,
        borderColor: '#e1e8ed',
        borderRadius: 12,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    captchaPlaceholder: {
        fontSize: 12,
        color: '#999',
    },
    captchaHint: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
    },
});
