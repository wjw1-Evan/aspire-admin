import React, { useMemo } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { AppStyles } from '../../constants/AppStyles';
import { useTheme } from '../../utils/theme';

interface LoadingViewProps {
  text?: string;
  fullScreen?: boolean;
}

export default function LoadingView({
  text = '加载中...',
  fullScreen = true,
}: LoadingViewProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: AppStyles.spacing.xl,
    },
    fullScreen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    text: {
      marginTop: AppStyles.spacing.md,
      fontSize: AppStyles.fontSize.sm,
      color: colors.textSecondary,
    },
  }), [colors]);

  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size="large" color={colors.primary} />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
}
