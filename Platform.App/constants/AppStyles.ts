import { StyleSheet, Platform } from 'react-native';

/**
 * 统一的页面样式常量
 * 用于保持整个应用的设计一致性
 */

export const AppStyles = {
    // 颜色
    colors: {
        primary: '#667eea',
        primaryDark: '#764ba2',
        primaryLight: '#f093fb',
        background: '#f5f7fa',
        cardBackground: '#fff',
        text: '#333',
        textSecondary: '#666',
        textTertiary: '#999',
        border: '#e2e8f0',
        borderLight: '#f0f0f0',
        error: '#ef4444',
        success: '#10b981',
        warning: '#f59e0b',
    },

    // 渐变颜色
    gradients: {
        primary: ['#667eea', '#764ba2', '#f093fb'],
        primaryShort: ['#667eea', '#764ba2'],
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
        sm: 8,
        md: 12,
        lg: 16,
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
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
        },
        md: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
        },
        lg: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 5,
        },
    },
};

/**
 * 通用样式
 */
export const commonStyles = StyleSheet.create({
    // 页面容器
    pageContainer: {
        flex: 1,
        backgroundColor: AppStyles.colors.cardBackground,
    },

    // 渐变头部
    gradientHeader: {
        paddingTop: Platform.OS === 'ios' ? 60 : 50,
        paddingBottom: 40,
        paddingHorizontal: AppStyles.spacing.lg,
        borderBottomLeftRadius: 35,
        borderBottomRightRadius: 35,
        width: '100%',
        alignSelf: 'stretch',
        maxWidth: '100%',
        ...AppStyles.shadows.lg,
    },

    // 卡片
    card: {
        backgroundColor: AppStyles.colors.cardBackground,
        borderRadius: AppStyles.borderRadius.lg,
        padding: AppStyles.spacing.lg,
        marginBottom: AppStyles.spacing.md,
        ...AppStyles.shadows.md,
    },

    // 卡片头部
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: AppStyles.spacing.md,
        paddingBottom: AppStyles.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: AppStyles.colors.borderLight,
    },

    // 卡片标题
    cardTitle: {
        fontSize: AppStyles.fontSize.lg,
        fontWeight: 'bold',
        color: AppStyles.colors.text,
        marginLeft: AppStyles.spacing.sm,
    },

    // 信息行
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: AppStyles.spacing.md,
    },

    // 信息图标容器
    infoIconContainer: {
        width: 32,
        height: 32,
        borderRadius: AppStyles.borderRadius.sm,
        backgroundColor: '#f5f7ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: AppStyles.spacing.md,
    },

    // 信息标签
    infoLabel: {
        flex: 1,
        fontSize: AppStyles.fontSize.sm,
        color: AppStyles.colors.textSecondary,
        fontWeight: '500',
    },

    // 信息值
    infoValue: {
        flex: 2,
        fontSize: AppStyles.fontSize.md,
        color: AppStyles.colors.text,
        fontWeight: '600',
    },

    // 输入框容器
    inputContainer: {
        marginBottom: AppStyles.spacing.lg,
    },

    // 输入框标签
    inputLabel: {
        fontSize: AppStyles.fontSize.sm,
        fontWeight: '600',
        color: AppStyles.colors.text,
        marginBottom: AppStyles.spacing.sm,
        letterSpacing: 0.3,
    },

    // 输入框包装器
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: AppStyles.colors.cardBackground,
        borderRadius: AppStyles.borderRadius.md,
        borderWidth: 1.5,
        borderColor: AppStyles.colors.border,
        paddingHorizontal: AppStyles.spacing.lg,
        minHeight: 56,
        ...AppStyles.shadows.sm,
    },

    // 输入框包装器（聚焦状态）
    inputWrapperFocused: {
        borderColor: AppStyles.colors.primary,
        borderWidth: 2,
        shadowColor: AppStyles.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },

    // 输入框
    input: {
        flex: 1,
        paddingVertical: AppStyles.spacing.md,
        paddingHorizontal: AppStyles.spacing.xs,
        fontSize: AppStyles.fontSize.md,
        color: AppStyles.colors.text,
        fontWeight: '400',
    },

    // 按钮
    button: {
        borderRadius: AppStyles.borderRadius.md,
        padding: AppStyles.spacing.lg,
        alignItems: 'center',
        marginTop: AppStyles.spacing.md,
        ...AppStyles.shadows.lg,
    },

    // 按钮文本
    buttonText: {
        color: '#fff',
        fontSize: AppStyles.fontSize.lg,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});

