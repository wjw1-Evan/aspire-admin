import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppStyles } from '../../constants/AppStyles';
import { TaskPriority } from '../../types/task';

interface PriorityTagProps {
  priority: number;
  text?: string;
  size?: 'sm' | 'md';
}

const priorityConfig: Record<number, { color: string; bg: string; label: string }> = {
  [TaskPriority.Low]: { color: '#999', bg: '#f5f5f5', label: '低' },
  [TaskPriority.Medium]: { color: '#1890ff', bg: '#e6f7ff', label: '中' },
  [TaskPriority.High]: { color: '#ff4d4f', bg: '#fff2f0', label: '高' },
  [TaskPriority.Urgent]: { color: '#ff0000', bg: '#fff0f0', label: '紧急' },
};

export default function PriorityTag({
  priority,
  text,
  size = 'sm',
}: PriorityTagProps) {
  const config = priorityConfig[priority] || priorityConfig[0];

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

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: AppStyles.spacing.sm,
    paddingVertical: 2,
    borderRadius: AppStyles.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
  },
});
