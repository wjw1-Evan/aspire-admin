import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppStyles } from '../../constants/AppStyles';

interface StatusTagProps {
  text: string;
  color?: string;
  backgroundColor?: string;
  size?: 'sm' | 'md';
}

export default function StatusTag({
  text,
  color = AppStyles.colors.textSecondary,
  backgroundColor = '#f5f5f5',
  size = 'sm',
}: StatusTagProps) {
  return (
    <View style={[styles.tag, { backgroundColor }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text
        style={[
          styles.text,
          { color, fontSize: size === 'sm' ? AppStyles.fontSize.xs : AppStyles.fontSize.sm },
        ]}
        numberOfLines={1}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AppStyles.spacing.sm,
    paddingVertical: 3,
    borderRadius: AppStyles.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  text: {
    fontWeight: '500',
  },
});
