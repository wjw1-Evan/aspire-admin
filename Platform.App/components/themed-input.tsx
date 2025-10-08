import React from 'react';
import { TextInput, type TextInputProps, StyleSheet } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedInputProps = TextInputProps & {
  lightColor?: string;
  darkColor?: string;
  lightBackgroundColor?: string;
  darkBackgroundColor?: string;
  lightBorderColor?: string;
  darkBorderColor?: string;
  lightPlaceholderColor?: string;
  darkPlaceholderColor?: string;
};

export function ThemedInput({
  style,
  lightColor,
  darkColor,
  lightBackgroundColor,
  darkBackgroundColor,
  lightBorderColor,
  darkBorderColor,
  lightPlaceholderColor,
  darkPlaceholderColor,
  placeholderTextColor,
  ...rest
}: ThemedInputProps) {
  const textColor = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const backgroundColor = useThemeColor(
    { light: lightBackgroundColor, dark: darkBackgroundColor },
    'background'
  );
  const borderColor = useThemeColor(
    { light: lightBorderColor, dark: darkBorderColor },
    'icon'
  );
  const placeholderColor = useThemeColor(
    { light: lightPlaceholderColor, dark: darkPlaceholderColor },
    'icon'
  );

  return (
    <TextInput
      style={[
        styles.input,
        {
          color: textColor,
          backgroundColor,
          borderColor,
        },
        style,
      ]}
      placeholderTextColor={placeholderTextColor || placeholderColor}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
});
