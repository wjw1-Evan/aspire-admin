/**
 * 表单输入组件 - 使用原生 TextInput
 */

import React from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';

interface FormInputProps {
  readonly label: string;
  readonly value: string;
  readonly onChangeText: (text: string) => void;
  readonly placeholder?: string;
  readonly type?: 'text' | 'password' | 'email';
  readonly showPassword?: boolean;
  readonly onTogglePassword?: () => void;
  readonly disabled?: boolean;
  readonly autoFocus?: boolean;
  readonly hasError?: boolean;
  readonly onClearError?: () => void;
  readonly onSubmitEditing?: () => void;
}

export function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  type = 'text',
  showPassword,
  onTogglePassword,
  disabled = false,
  autoFocus = false,
  hasError = false,
  onClearError,
  onSubmitEditing,
}: FormInputProps) {
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({ light: '#FFFFFF', dark: '#1E293B' }, 'card');
  const borderColor = useThemeColor({}, 'border');
  const errorColor = useThemeColor({ light: '#EF4444', dark: '#F87171' }, 'error');
  const placeholderColor = useThemeColor({}, 'icon');

  const handleChangeText = (text: string) => {
    onChangeText(text);
    if (hasError && onClearError) {
      onClearError();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      {type === 'password' ? (
        <View style={styles.passwordWrapper}>
          <TextInput
            value={value}
            onChangeText={handleChangeText}
            placeholder={placeholder}
            placeholderTextColor={placeholderColor}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!disabled}
            autoFocus={autoFocus}
            onSubmitEditing={onSubmitEditing}
            returnKeyType={onSubmitEditing ? 'next' : 'done'}
            style={[
              styles.input,
              {
                color: textColor,
                backgroundColor,
                borderColor: hasError ? errorColor : borderColor,
              },
            ]}
          />
          {onTogglePassword && (
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={onTogglePassword}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.eyeIcon, { color: placeholderColor }]}>
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <TextInput
          value={value}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          keyboardType={type === 'email' ? 'email-address' : 'default'}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!disabled}
          autoFocus={autoFocus}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={onSubmitEditing ? 'next' : 'done'}
          style={[
            styles.input,
            {
              color: textColor,
              backgroundColor,
              borderColor: hasError ? errorColor : borderColor,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  passwordWrapper: {
    position: 'relative',
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -12 }],
    padding: 4,
  },
  eyeIcon: {
    fontSize: 20,
  },
});
