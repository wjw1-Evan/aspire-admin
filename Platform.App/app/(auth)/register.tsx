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
} from 'react-native';
import { router } from 'expo-router';
import { authService } from '../../services/authService';
import { RegisterRequest } from '../../types/auth';

export default function RegisterScreen() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [email, setEmail] = useState('');
    const [realName, setRealName] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);

    const validateForm = (): string | null => {
        if (!username.trim()) return '请输入用户名';
        if (username.length < 3) return '用户名至少3个字符';
        if (!password) return '请输入密码';
        if (password.length < 6) return '密码至少6个字符';
        if (password !== confirmPassword) return '两次输入的密码不一致';
        if (!email.trim()) return '请输入邮箱';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '邮箱格式不正确';
        return null;
    };

    const handleRegister = async () => {
        const error = validateForm();
        if (error) {
            Alert.alert('验证失败', error);
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
                Alert.alert(
                    '注册成功',
                    '您的账户已创建，请登录',
                    [
                        {
                            text: '确定',
                            onPress: () => router.replace('/(auth)/login'),
                        },
                    ]
                );
            } else {
                Alert.alert('注册失败', response.errorMessage || '注册失败，请稍后重试');
            }
        } catch (error: any) {
            console.error('Register error:', error);
            Alert.alert(
                '注册失败',
                error.errorMessage || '注册过程中发生错误，请稍后重试'
            );
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
                <View style={styles.formContainer}>
                    <Text style={styles.title}>创建账户</Text>
                    <Text style={styles.subtitle}>填写您的信息以开始使用</Text>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>
                            用户名 <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholder="请输入用户名（至少3个字符）"
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!loading}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>
                            邮箱 <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholder="请输入邮箱地址"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!loading}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>
                            密码 <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholder="请输入密码（至少6个字符）"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoCapitalize="none"
                            editable={!loading}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>
                            确认密码 <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholder="请再次输入密码"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                            autoCapitalize="none"
                            editable={!loading}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>真实姓名</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="请输入您的真实姓名（可选）"
                            value={realName}
                            onChangeText={setRealName}
                            editable={!loading}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>手机号</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="请输入手机号（可选）"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            editable={!loading}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>注册</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.loginContainer}>
                        <Text style={styles.loginText}>已有账户？</Text>
                        <TouchableOpacity onPress={navigateToLogin} disabled={loading}>
                            <Text style={styles.loginLink}>立即登录</Text>
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
        marginBottom: 24,
        textAlign: 'center',
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    required: {
        color: '#ff4d4f',
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
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
    },
    loginText: {
        fontSize: 14,
        color: '#666',
    },
    loginLink: {
        fontSize: 14,
        color: '#1890ff',
        fontWeight: '600',
        marginLeft: 4,
    },
});
