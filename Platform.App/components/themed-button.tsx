import React from 'react';
import { TouchableOpacity, Text, type TouchableOpacityProps, StyleSheet } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedButtonProps = TouchableOpacityProps & {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  lightColor?: string;
  darkColor?: string;
  lightBackgroundColor?: string;
  darkBackgroundColor?: string;
  lightBorderColor?: string;
  darkBorderColor?: string;
};

export function ThemedButton({
  title,
  variant = 'primary',
  size = 'medium',
  style,
  lightColor,
  darkColor,
  lightBackgroundColor,
  darkBackgroundColor,
  lightBorderColor,
  darkBorderColor,
  disabled,
  ...rest
}: ThemedButtonProps) {
  const getVariantColors = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: { light: '#007AFF', dark: '#0A84FF' },
          textColor: { light: '#fff', dark: '#fff' },
        };
      case 'secondary':
        return {
          backgroundColor: { light: '#f0f0f0', dark: '#2c2c2e' },
          textColor: { light: '#333', dark: '#fff' },
        };
      case 'danger':
        return {
          backgroundColor: { light: '#FF3B30', dark: '#FF453A' },
          textColor: { light: '#fff', dark: '#fff' },
        };
      default:
        return {
          backgroundColor: { light: '#007AFF', dark: '#0A84FF' },
          textColor: { light: '#fff', dark: '#fff' },
        };
    }
  };

  const variantColors = getVariantColors();
  
  const customBackgroundColor = useThemeColor(
    { light: lightBackgroundColor, dark: darkBackgroundColor },
    'tint'
  );
  const defaultBackgroundColor = useThemeColor(variantColors.backgroundColor, 'tint');
  const backgroundColor = customBackgroundColor || defaultBackgroundColor;
  
  const customTextColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    'text'
  );
  const defaultTextColor = useThemeColor(variantColors.textColor, 'text');
  const textColor = customTextColor || defaultTextColor;

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { padding: 8, fontSize: 14 };
      case 'large':
        return { padding: 16, fontSize: 18 };
      default:
        return { padding: 12, fontSize: 16 };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: disabled ? '#ccc' : backgroundColor,
          padding: sizeStyles.padding,
        },
        style,
      ]}
      disabled={disabled}
      {...rest}
    >
      <Text
        style={[
          styles.buttonText,
          {
            color: disabled ? '#666' : textColor,
            fontSize: sizeStyles.fontSize,
          },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: '600',
  },
});
