import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, Platform, RefreshControl, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppStyles } from '../../constants/AppStyles';
import { useTheme } from '../../utils/theme';

interface PageContainerProps {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: ViewStyle;
}

export default function PageContainer({
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  style,
}: PageContainerProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    contentContainer: {
      flexGrow: 1,
      paddingBottom: AppStyles.spacing.xl,
    },
  }), [colors]);

  if (!scroll) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }, style]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }, style]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </View>
  );
}
