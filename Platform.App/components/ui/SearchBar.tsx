import React, { useState, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppStyles } from '../../constants/AppStyles';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (keyword: string) => void;
  defaultValue?: string;
}

export default function SearchBar({
  placeholder = '搜索',
  onSearch,
  defaultValue = '',
}: SearchBarProps) {
  const [keyword, setKeyword] = useState(defaultValue);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleSubmit = () => {
    onSearch(keyword.trim());
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setKeyword('');
    onSearch('');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.inputWrapper, focused && styles.inputWrapperFocused]}>
        <Ionicons
          name="search"
          size={18}
          color={focused ? AppStyles.colors.primary : AppStyles.colors.textTertiary}
          style={styles.icon}
        />
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={AppStyles.colors.textTertiary}
          value={keyword}
          onChangeText={setKeyword}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={handleSubmit}
          returnKeyType="search"
          clearButtonMode="never"
          autoCorrect={false}
        />
        {keyword.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Ionicons name="close-circle" size={18} color={AppStyles.colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: AppStyles.spacing.sm,
    paddingHorizontal: AppStyles.spacing.md,
    backgroundColor: AppStyles.colors.cardBackground,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppStyles.colors.background,
    borderRadius: AppStyles.borderRadius.md,
    paddingHorizontal: AppStyles.spacing.md,
    height: 40,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputWrapperFocused: {
    borderColor: AppStyles.colors.primary,
    backgroundColor: AppStyles.colors.cardBackground,
  },
  icon: {
    marginRight: AppStyles.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: AppStyles.fontSize.sm,
    color: AppStyles.colors.text,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
});
