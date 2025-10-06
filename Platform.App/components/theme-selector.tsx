import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme, ThemeMode } from '@/contexts/ThemeContext';
import { useThemeColor } from '@/hooks/use-theme-color';

interface ThemeSelectorProps {
  readonly trigger?: React.ReactNode;
  readonly style?: any;
}

export function ThemeSelector({ trigger, style }: ThemeSelectorProps) {
  const { themeMode, setThemeMode, isDark } = useTheme();
  const [isVisible, setIsVisible] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const cardBackground = useThemeColor(
    { light: '#f8f9fa', dark: '#2c2c2e' },
    'background'
  );

  const themeOptions: {
    mode: ThemeMode;
    label: string;
    icon: string;
    description: string;
  }[] = [
    {
      mode: 'light',
      label: '浅色模式',
      icon: 'sun.max.fill',
      description: '始终使用浅色主题',
    },
    {
      mode: 'dark',
      label: '深色模式',
      icon: 'moon.fill',
      description: '始终使用深色主题',
    },
    {
      mode: 'system',
      label: '跟随系统',
      icon: 'gear',
      description: '根据系统设置自动切换',
    },
  ];

  const handleSelectTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    setIsVisible(false);
  };

  const defaultTrigger = (
    <TouchableOpacity
      style={[styles.trigger, { backgroundColor }, style]}
      onPress={() => setIsVisible(true)}
    >
      <IconSymbol
        name={isDark ? 'moon.fill' : 'sun.max.fill'}
        size={24}
        color={tintColor}
      />
    </TouchableOpacity>
  );

  return (
    <>
      {trigger || defaultTrigger}
      
      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: cardBackground }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: textColor }]}>
                选择主题
              </Text>
              <TouchableOpacity
                onPress={() => setIsVisible(false)}
                style={styles.closeButton}
              >
                <IconSymbol name="xmark" size={20} color={textColor} />
              </TouchableOpacity>
            </View>

            <View style={styles.options}>
              {themeOptions.map((option) => (
                <TouchableOpacity
                  key={option.mode}
                  style={[
                    styles.option,
                    {
                      backgroundColor: themeMode === option.mode ? tintColor + '20' : 'transparent',
                      borderColor: themeMode === option.mode ? tintColor : 'transparent',
                    },
                  ]}
                  onPress={() => handleSelectTheme(option.mode)}
                >
                  <View style={styles.optionContent}>
                    <View style={styles.optionLeft}>
                      <IconSymbol
                        name={option.icon}
                        size={24}
                        color={themeMode === option.mode ? tintColor : textColor}
                      />
                      <View style={styles.optionText}>
                        <Text
                          style={[
                            styles.optionLabel,
                            {
                              color: themeMode === option.mode ? tintColor : textColor,
                              fontWeight: themeMode === option.mode ? '600' : '400',
                            },
                          ]}
                        >
                          {option.label}
                        </Text>
                        <Text style={[styles.optionDescription, { color: textColor }]}>
                          {option.description}
                        </Text>
                      </View>
                    </View>
                    {themeMode === option.mode && (
                      <IconSymbol name="checkmark.circle.fill" size={20} color={tintColor} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  options: {
    gap: 12,
  },
  option: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionText: {
    marginLeft: 12,
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  trigger: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
