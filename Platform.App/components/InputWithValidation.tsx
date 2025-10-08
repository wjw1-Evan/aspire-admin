// 带验证的输入组件 - 提供实时输入验证和错误提示

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { ThemedInput } from '@/components/themed-input';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { IconSymbolName } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/useThemeColor';

interface ValidationRule {
  readonly required?: boolean;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: RegExp;
  readonly custom?: (value: string) => string | null;
}

interface InputWithValidationProps extends Omit<TextInputProps, 'onChangeText'> {
  readonly value: string;
  readonly onChangeText: (text: string) => void;
  readonly label?: string;
  readonly placeholder?: string;
  readonly validation?: ValidationRule;
  readonly showValidation?: boolean;
  readonly errorMessage?: string;
  readonly successMessage?: string;
  readonly leftIcon?: IconSymbolName;
  readonly rightIcon?: IconSymbolName;
  readonly onRightIconPress?: () => void;
}

export function InputWithValidation({
  value,
  onChangeText,
  label,
  placeholder,
  validation,
  showValidation = true,
  errorMessage,
  successMessage,
  leftIcon,
  rightIcon,
  onRightIconPress,
  ...props
}: InputWithValidationProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  const errorColor = useThemeColor(
    { light: '#FF3B30', dark: '#FF6B6B' },
    'error'
  );
  const successColor = useThemeColor(
    { light: '#34C759', dark: '#30D158' },
    'success'
  );
  const iconColor = useThemeColor({}, 'icon');

  // 验证输入值
  const validateInput = (inputValue: string): string | null => {
    if (!validation) return null;

    // 必填验证
    if (validation.required && !inputValue.trim()) {
      return '此字段为必填项';
    }

    // 最小长度验证
    if (validation.minLength && inputValue.length < validation.minLength) {
      return `至少需要 ${validation.minLength} 个字符`;
    }

    // 最大长度验证
    if (validation.maxLength && inputValue.length > validation.maxLength) {
      return `最多允许 ${validation.maxLength} 个字符`;
    }

    // 正则表达式验证
    if (validation.pattern && !validation.pattern.test(inputValue)) {
      return '格式不正确';
    }

    // 自定义验证
    if (validation.custom) {
      return validation.custom(inputValue);
    }

    return null;
  };

  // 处理输入变化
  const handleTextChange = (text: string) => {
    onChangeText(text);
    
    if (showValidation && validation) {
      const error = validateInput(text);
      setValidationError(error);
      setIsValid(error === null && text.length > 0);
    }
  };

  // 处理焦点变化
  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    
    if (showValidation && validation) {
      const error = validateInput(value);
      setValidationError(error);
      setIsValid(error === null && value.length > 0);
    }
  };

  // 获取当前状态
  const getCurrentState = () => {
    if (errorMessage || validationError) return 'error';
    if (successMessage && isValid) return 'success';
    if (isFocused) return 'focused';
    return 'default';
  };

  const currentState = getCurrentState();
  const hasError = !!(errorMessage || validationError);
  const hasSuccess = !!(successMessage && isValid);

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelContainer}>
          {leftIcon && (
            <IconSymbol
              name={leftIcon}
              size={16}
              color={iconColor}
              style={styles.labelIcon}
            />
          )}
          <ThemedText style={styles.label}>{label}</ThemedText>
        </View>
      )}
      
      <View style={styles.inputContainer}>
        <ThemedInput
          value={value}
          onChangeText={handleTextChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          style={[
            styles.input,
            currentState === 'focused' && styles.inputFocused,
            hasError && styles.inputError,
            hasSuccess && styles.inputSuccess,
          ]}
          {...props}
        />
        
        {rightIcon && (
          <TouchableOpacity 
            style={styles.rightIconContainer}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
          >
            <IconSymbol
              name={rightIcon}
              size={20}
              color={iconColor}
            />
          </TouchableOpacity>
        )}
      </View>
      
      {/* 错误消息 */}
      {hasError && (
        <View style={styles.messageContainer}>
          <IconSymbol
            name="exclamationmark.circle.fill"
            size={14}
            color={errorColor}
            style={styles.messageIcon}
          />
          <ThemedText style={[styles.errorText, { color: errorColor }]}>
            {errorMessage || validationError}
          </ThemedText>
        </View>
      )}
      
      {/* 成功消息 */}
      {hasSuccess && !hasError && (
        <View style={styles.messageContainer}>
          <IconSymbol
            name="checkmark.circle.fill"
            size={14}
            color={successColor}
            style={styles.messageIcon}
          />
          <ThemedText style={[styles.successText, { color: successColor }]}>
            {successMessage}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelIcon: {
    marginRight: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    borderRadius: 12,
  },
  inputFocused: {
    borderWidth: 2,
  },
  inputError: {
    borderColor: '#FF3B30',
    borderWidth: 1,
  },
  inputSuccess: {
    borderColor: '#34C759',
    borderWidth: 1,
  },
  rightIconContainer: {
    position: 'absolute',
    right: 15,
    top: '50%',
    transform: [{ translateY: -10 }],
    padding: 5,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  messageIcon: {
    marginRight: 6,
  },
  errorText: {
    fontSize: 12,
    flex: 1,
  },
  successText: {
    fontSize: 12,
    flex: 1,
  },
});
