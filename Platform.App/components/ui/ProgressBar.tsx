import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppStyles } from '../../constants/AppStyles';
import { getProgressColor } from '../../utils/task';

interface ProgressBarProps {
  percentage: number;
  showLabel?: boolean;
  height?: number;
  color?: string;
}

export default function ProgressBar({
  percentage,
  showLabel = true,
  height = 8,
  color,
}: ProgressBarProps) {
  const barColor = color || getProgressColor(percentage);
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  return (
    <View style={styles.container}>
      <View style={[styles.track, { height }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${clampedPercentage}%`,
              backgroundColor: barColor,
              height,
            },
          ]}
        />
      </View>
      {showLabel && (
        <Text style={[styles.label, { color: barColor }]}>
          {Math.round(clampedPercentage)}%
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  track: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 4,
  },
  label: {
    marginLeft: AppStyles.spacing.sm,
    fontSize: AppStyles.fontSize.xs,
    fontWeight: '600',
    minWidth: 36,
    textAlign: 'right',
  },
});
