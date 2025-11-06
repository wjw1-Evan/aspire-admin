/**
 * 图形验证码组件（手机端）
 * 用于登录和注册时的验证码输入
 */

import React, { useState, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { ThemedInput } from './themed-input';
import { ThemedText } from './themed-text';
import { IconSymbol } from './ui/icon-symbol';
import { useThemeColor } from '@/hooks/useThemeColor';
import { apiService } from '@/services/api';

export interface ImageCaptchaProps {
  value?: string;
  onChange?: (value: string) => void;
  onCaptchaIdChange?: (captchaId: string) => void;
  type?: 'login' | 'register';
  placeholder?: string;
}

export interface ImageCaptchaRef {
  refresh: () => Promise<void>;
}

interface CaptchaResponse {
  success: boolean;
  data?: {
    captchaId: string;
    imageData: string;
    expiresIn?: number;
  };
  errorMessage?: string;
  errorCode?: string;
}

const ImageCaptcha = forwardRef<ImageCaptchaRef, ImageCaptchaProps>(({
  value = '',
  onChange,
  onCaptchaIdChange,
  type = 'login',
  placeholder = '请输入图形验证码',
}, ref) => {
  const [captchaId, setCaptchaId] = useState<string>('');
  const [imageData, setImageData] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'border');
  const iconColor = useThemeColor({}, 'icon');
  const tintColor = useThemeColor({}, 'tint');

  // 获取图形验证码
  const fetchCaptcha = async () => {
    try {
      setLoading(true);
      const response = await apiService.get<CaptchaResponse>(`/api/captcha/image?type=${type}`);
      
      if (response.success && response.data) {
        setCaptchaId(response.data.captchaId);
        setImageData(response.data.imageData);
        onCaptchaIdChange?.(response.data.captchaId);
        
        // 清空输入框
        onChange?.('');
      } else {
        Alert.alert('错误', response.errorMessage || '获取验证码失败，请重试');
      }
    } catch (error) {
      console.error('获取图形验证码失败:', error);
      Alert.alert('错误', '获取验证码失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 暴露刷新方法给父组件
  useImperativeHandle(ref, () => ({
    refresh: fetchCaptcha,
  }));

  // 组件挂载时获取验证码
  useEffect(() => {
    fetchCaptcha();
  }, [type]);

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <ThemedInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          autoCapitalize="characters"
          autoCorrect={false}
          style={styles.input}
        />
      </View>
      
      <View style={[styles.captchaContainer, { borderColor }]}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={tintColor} />
          </View>
        ) : imageData ? (
          <TouchableOpacity
            onPress={fetchCaptcha}
            style={styles.imageContainer}
            activeOpacity={0.7}
          >
            <Image
              source={{ uri: `data:image/png;base64,${imageData}` }}
              style={styles.captchaImage}
              contentFit="contain"
            />
            <View style={styles.refreshOverlay}>
              <IconSymbol name="arrow.clockwise" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={fetchCaptcha}
            style={[styles.refreshButton, { backgroundColor: tintColor }]}
            activeOpacity={0.7}
          >
            <IconSymbol name="arrow.clockwise" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

ImageCaptcha.displayName = 'ImageCaptcha';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputContainer: {
    flex: 1,
  },
  input: {
    borderRadius: 12,
  },
  captchaContainer: {
    width: 120,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  captchaImage: {
    width: '100%',
    height: '100%',
  },
  refreshOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
});

export default ImageCaptcha;

