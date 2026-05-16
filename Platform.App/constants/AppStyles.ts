import { StyleSheet, Platform } from 'react-native';
import Colors from './Colors';

/**
 * 统一的页面样式常量
 * 用于保持整个应用的设计一致性
 */

export const AppStyles = {
    colors: {
        primary: '#667eea',
        primaryDark: '#764ba2',
        primaryLight: '#f093fb',
        background: '#ffffff',
        cardBackground: '#f2f2f7',
        text: '#000000',
        textSecondary: '#6e6e73',
        textTertiary: '#aeaeb2',
        border: '#d1d1d6',
        borderLight: '#e5e5ea',
        error: '#ef4444',
        success: '#10b981',
        warning: '#f59e0b',
    },

    // 间距
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
    },

    // 圆角
    borderRadius: {
        sm: 10,
        md: 14,
        lg: 18,
        xl: 24,
        full: 9999,
    },

    // 字体大小
    fontSize: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 20,
        xxl: 24,
        xxxl: 28,
    },

    // 阴影
    shadows: {
        sm: {
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
            elevation: 2,
        },
        md: {
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            elevation: 3,
        },
        lg: {
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            elevation: 5,
        },
    },
};

export function createCommonStyles(colors: typeof Colors.light) {
    return StyleSheet.create({
        pageContainer: {
            flex: 1,
            backgroundColor: colors.background,
        },
        card: {
            backgroundColor: colors.cardBackground,
            borderRadius: AppStyles.borderRadius.lg,
            padding: AppStyles.spacing.lg,
            marginBottom: AppStyles.spacing.md,
            ...AppStyles.shadows.md,
        },
        cardHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: AppStyles.spacing.md,
            paddingBottom: AppStyles.spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
        },
        cardTitle: {
            fontSize: AppStyles.fontSize.lg,
            fontWeight: 'bold',
            color: colors.text,
            marginLeft: AppStyles.spacing.sm,
        },
        infoRow: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: AppStyles.spacing.md,
        },
        infoIconContainer: {
            width: 44,
            height: 44,
            borderRadius: 22,
            borderWidth: 1.5,
            borderColor: colors.border,
            backgroundColor: colors.cardBackground,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: AppStyles.spacing.md,
        },
        infoLabel: {
            flex: 1,
            fontSize: AppStyles.fontSize.sm,
            color: colors.textSecondary,
            fontWeight: '500',
        },
        infoValue: {
            flex: 2,
            fontSize: AppStyles.fontSize.md,
            color: colors.text,
            fontWeight: '600',
        },
        inputContainer: {
            marginBottom: AppStyles.spacing.lg,
        },
        inputLabel: {
            fontSize: AppStyles.fontSize.sm,
            fontWeight: '600',
            color: colors.text,
            marginBottom: AppStyles.spacing.sm,
            letterSpacing: 0.3,
        },
        inputWrapper: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.cardBackground,
            borderRadius: AppStyles.borderRadius.md,
            borderWidth: 1.5,
            borderColor: colors.border,
            paddingHorizontal: AppStyles.spacing.lg,
            minHeight: 56,
            ...AppStyles.shadows.sm,
        },
        inputWrapperFocused: {
            borderColor: colors.primary,
            borderWidth: 2,
            boxShadow: `0 4px 8px ${colors.primary}26`,
            elevation: 4,
        },
        input: {
            flex: 1,
            paddingVertical: AppStyles.spacing.md,
            paddingHorizontal: AppStyles.spacing.xs,
            fontSize: AppStyles.fontSize.md,
            color: colors.text,
            fontWeight: '400',
        },
        button: {
            borderRadius: AppStyles.borderRadius.md,
            padding: AppStyles.spacing.lg,
            alignItems: 'center',
            marginTop: AppStyles.spacing.md,
            ...AppStyles.shadows.lg,
        },
        buttonText: {
            color: '#fff',
            fontSize: AppStyles.fontSize.lg,
            fontWeight: '700',
            letterSpacing: 0.5,
        },
    });
}

