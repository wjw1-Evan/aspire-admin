import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppStyles } from '../../constants/AppStyles';
import { useTheme } from '../../utils/theme';
import { TaskPriority } from '../../types/task';

interface PriorityTagProps {
  priority: number;
  text?: string;
  size?: 'sm' | 'md';
}

export default function PriorityTag({
  priority,
  text,
  size = 'sm',
}: PriorityTagProps) {
  const { colors } = useTheme();

  const priorityConfig = useMemo(() => ({
    [TaskPriority.Low]: { color: colors.textTertiary, bg: colors.borderLight, label: '低' },
    [TaskPriority.Medium]: { color: colors.primary, bg: colors.primary + '18', label: '中' },
    [TaskPriority.High]: { color: colors.error, bg: colors.error + '15', label: '高' },
    [TaskPriority.Urgent]: { color: '#ef4444', bg: '#fef2f2', label: '紧急' },
  }), [colors]);

  const config = priorityConfig[priority as TaskPriority] || priorityConfig[TaskPriority.Low];

  const styles = useMemo(() => StyleSheet.create({
    tag: {
      paddingHorizontal: AppStyles.spacing.sm,
      paddingVertical: 2,
      borderRadius: AppStyles.borderRadius.sm,
      alignSelf: 'flex-start',
    },
    text: {
      fontWeight: '600',
    },
  }), []);

  return (
    <View style={[styles.tag, { backgroundColor: config.bg }]}>
      <Text
        style={[
          styles.text,
          { color: config.color, fontSize: size === 'sm' ? AppStyles.fontSize.xs : AppStyles.fontSize.sm },
        ]}
      >
        {text || config.label}
      </Text>
    </View>
  );
}
