import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { AppStyles } from '../../constants/AppStyles';

interface LoadingViewProps {
  text?: string;
  fullScreen?: boolean;
}

export default function LoadingView({
  text = '加载中...',
  fullScreen = true,
}: LoadingViewProps) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size="large" color={AppStyles.colors.primary} />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: AppStyles.spacing.xl,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: AppStyles.colors.background,
  },
  text: {
    marginTop: AppStyles.spacing.md,
    fontSize: AppStyles.fontSize.sm,
    color: AppStyles.colors.textSecondary,
  },
});
