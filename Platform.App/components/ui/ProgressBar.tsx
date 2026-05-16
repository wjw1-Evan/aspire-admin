import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppStyles } from '../../constants/AppStyles';
import { useTheme } from '../../utils/theme';
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
  const { colors } = useTheme();
  const barColor = color || getProgressColor(percentage);
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    track: {
      flex: 1,
      backgroundColor: colors.borderLight,
      borderRadius: height / 2,
      overflow: 'hidden',
    },
    fill: {
      borderRadius: height / 2,
    },
    label: {
      marginLeft: AppStyles.spacing.sm,
      fontSize: AppStyles.fontSize.xs,
      fontWeight: '600',
      minWidth: 36,
      textAlign: 'right',
    },
  }), [colors, height]);

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
