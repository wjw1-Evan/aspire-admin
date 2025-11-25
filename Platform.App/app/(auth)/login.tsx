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

                // Navigate to main app
                router.replace('/(tabs)');
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
                <View style={styles.formContainer}>
                    <Text style={styles.title}>欢迎回来</Text>
                    <Text style={styles.subtitle}>登录您的账户</Text>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>用户名</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="请输入用户名"
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!loading}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>密码</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="请输入密码"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoCapitalize="none"
                            editable={!loading}
                        />
                    </View>

                    {needCaptcha && (
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>验证码</Text>
                            <View style={styles.captchaContainer}>
                                <TextInput
                                    style={[styles.input, styles.captchaInput]}
                                    placeholder="请输入验证码"
                                    value={captchaAnswer}
                                    onChangeText={setCaptchaAnswer}
                                    autoCapitalize="characters"
                                    autoCorrect={false}
                                    editable={!loading}
                                    maxLength={6}
                                />
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
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>登录</Text>
                        )}
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
        backgroundColor: '#f5f5f5',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    formContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 32,
        textAlign: 'center',
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
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fafafa',
    },
    button: {
        backgroundColor: '#1890ff',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
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
        color: '#1890ff',
        fontWeight: '600',
        marginLeft: 4,
    },
    captchaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    captchaInput: {
        flex: 1,
    },
    captchaImageContainer: {
        width: 120,
        height: 48,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: '#fafafa',
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
