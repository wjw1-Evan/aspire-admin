import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppStyles } from '../../constants/AppStyles';
import { TaskExecutionResult } from '../../types/task';
import { useTheme } from '../../utils/theme';
import { useTranslation } from 'react-i18next';

type Mode = 'progress' | 'complete';

interface TaskExecutionFormProps {
  taskName: string;
  currentProgress: number;
  onProgressUpdate: (percentage: number, message?: string) => Promise<void>;
  onComplete: (result: TaskExecutionResult, remarks?: string, errorMessage?: string) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}

export default function TaskExecutionForm({
  taskName,
  currentProgress,
  onProgressUpdate,
  onComplete,
  onCancel,
  saving,
}: TaskExecutionFormProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: AppStyles.spacing.md,
      paddingVertical: AppStyles.spacing.md,
      backgroundColor: colors.cardBackground,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: AppStyles.fontSize.lg,
      fontWeight: '600',
      color: colors.text,
    },
    cancelText: {
      fontSize: AppStyles.fontSize.md,
      color: colors.textSecondary,
    },
    content: {
      flex: 1,
      padding: AppStyles.spacing.md,
    },
    taskName: {
      fontSize: AppStyles.fontSize.lg,
      fontWeight: '600',
      color: colors.text,
      marginBottom: AppStyles.spacing.md,
      textAlign: 'center',
    },
    segmentRow: {
      flexDirection: 'row',
      backgroundColor: colors.cardBackground,
      borderRadius: AppStyles.borderRadius.md,
      padding: 3,
      marginBottom: AppStyles.spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    segment: {
      flex: 1,
      paddingVertical: AppStyles.spacing.sm + 2,
      borderRadius: AppStyles.borderRadius.sm,
      alignItems: 'center',
    },
    segmentActive: {
      backgroundColor: colors.primary,
    },
    segmentText: {
      fontSize: AppStyles.fontSize.sm,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    segmentTextActive: {
      color: colors.cardBackground,
    },
    section: {},
    progressLabel: {
      fontSize: AppStyles.fontSize.md,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
      marginBottom: AppStyles.spacing.md,
    },
    quickProgressRow: {
      flexDirection: 'row',
      gap: AppStyles.spacing.sm,
      marginBottom: AppStyles.spacing.lg,
    },
    quickPctBtn: {
      flex: 1,
      paddingVertical: AppStyles.spacing.sm + 4,
      borderRadius: AppStyles.borderRadius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
    },
    quickPctBtnActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '10',
    },
    quickPctText: {
      fontSize: AppStyles.fontSize.sm,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    quickPctTextActive: {
      color: colors.primary,
    },
    field: {
      marginBottom: AppStyles.spacing.lg,
    },
    label: {
      fontSize: AppStyles.fontSize.sm,
      fontWeight: '600',
      color: colors.text,
      marginBottom: AppStyles.spacing.sm,
    },
    input: {
      backgroundColor: colors.cardBackground,
      borderRadius: AppStyles.borderRadius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingHorizontal: AppStyles.spacing.md,
      paddingVertical: AppStyles.spacing.md - 4,
      fontSize: AppStyles.fontSize.md,
      color: colors.text,
      minHeight: 48,
    },
    textArea: {
      minHeight: 80,
      paddingTop: AppStyles.spacing.md - 4,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: AppStyles.borderRadius.md,
      paddingVertical: AppStyles.spacing.md,
      alignItems: 'center',
      marginTop: AppStyles.spacing.md,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: colors.cardBackground,
      fontSize: AppStyles.fontSize.md,
      fontWeight: '600',
    },
    resultRow: {
      flexDirection: 'row',
      gap: AppStyles.spacing.sm,
      marginBottom: AppStyles.spacing.lg,
    },
    resultCard: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: AppStyles.spacing.md,
      borderRadius: AppStyles.borderRadius.md,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.cardBackground,
    },
    resultLabel: {
      fontSize: AppStyles.fontSize.xs,
      fontWeight: '600',
      marginTop: AppStyles.spacing.xs,
    },
  }), [colors]);

  const EXECUTION_RESULTS = [
    { value: TaskExecutionResult.Success, label: '成功', icon: 'checkmark-circle', color: colors.success },
    { value: TaskExecutionResult.Failed, label: '失败', icon: 'close-circle', color: colors.error },
    { value: TaskExecutionResult.Timeout, label: '超时', icon: 'time', color: colors.warning },
    { value: TaskExecutionResult.Interrupted, label: '中断', icon: 'pause-circle', color: colors.textTertiary },
  ];

  const [mode, setMode] = useState<Mode>('progress');
  const [progress, setProgress] = useState(currentProgress);
  const [progressMessage, setProgressMessage] = useState('');
  const [executionResult, setExecutionResult] = useState<TaskExecutionResult>(TaskExecutionResult.Success);
  const [errorMessage, setErrorMessage] = useState('');
  const [completeRemarks, setCompleteRemarks] = useState('');

  const handleProgressUpdate = async () => {
    await onProgressUpdate(progress, progressMessage.trim() || undefined);
  };

  const handleComplete = async () => {
    await onComplete(executionResult, completeRemarks.trim() || undefined, errorMessage.trim() || undefined);
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} disabled={saving}>
          <Text style={styles.cancelText}>{t('task_execution.cancel')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('task_execution.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.taskName}>{taskName}</Text>

        <View style={styles.segmentRow}>
          <TouchableOpacity
            style={[styles.segment, mode === 'progress' && styles.segmentActive]}
            onPress={() => setMode('progress')}
            disabled={saving}
          >
            <Text style={[styles.segmentText, mode === 'progress' && styles.segmentTextActive]}>
              {t('task_execution.update_progress')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segment, mode === 'complete' && styles.segmentActive]}
            onPress={() => setMode('complete')}
            disabled={saving}
          >
            <Text style={[styles.segmentText, mode === 'complete' && styles.segmentTextActive]}>
              {t('task_execution.complete_task')}
            </Text>
          </TouchableOpacity>
        </View>

        {mode === 'progress' ? (
          <View style={styles.section}>
            <Text style={styles.progressLabel}>进度: {Math.round(progress)}%</Text>
            <View style={styles.quickProgressRow}>
              {[0, 25, 50, 75, 100].map(pct => (
                <TouchableOpacity
                  key={pct}
                  style={[styles.quickPctBtn, progress === pct && styles.quickPctBtnActive]}
                  onPress={() => setProgress(pct)}
                  disabled={saving}
                >
                  <Text style={[styles.quickPctText, progress === pct && styles.quickPctTextActive]}>
                    {pct}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>自定义进度</Text>
              <TextInput
                style={styles.input}
                value={String(Math.round(progress))}
                onChangeText={(text) => {
                  const val = parseInt(text, 10);
                  if (!isNaN(val)) setProgress(Math.max(0, Math.min(100, val)));
                }}
                placeholder="0-100"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
                editable={!saving}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>进度说明</Text>
              <TextInput
                style={styles.input}
                value={progressMessage}
                onChangeText={setProgressMessage}
                placeholder="可选，说明当前进度"
                placeholderTextColor={colors.textTertiary}
                editable={!saving}
              />
            </View>
            <TouchableOpacity
              style={[styles.button, saving && styles.buttonDisabled]}
              onPress={handleProgressUpdate}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.cardBackground} />
              ) : (
                <Text style={styles.buttonText}>确认更新</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.label}>执行结果</Text>
            <View style={styles.resultRow}>
              {EXECUTION_RESULTS.map(result => (
                <TouchableOpacity
                  key={result.value}
                  style={[
                    styles.resultCard,
                    executionResult === result.value && { borderColor: result.color, backgroundColor: result.color + '10' },
                  ]}
                  onPress={() => setExecutionResult(result.value)}
                  disabled={saving}
                >
                  <Ionicons name={result.icon as keyof typeof Ionicons.glyphMap} size={24} color={result.color} />
                  <Text style={[styles.resultLabel, { color: result.color }]}>{result.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {executionResult !== TaskExecutionResult.Success && (
              <View style={styles.field}>
                <Text style={styles.label}>错误信息</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={errorMessage}
                  onChangeText={setErrorMessage}
                  placeholder="请输入错误信息"
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!saving}
                />
              </View>
            )}
            <View style={styles.field}>
              <Text style={styles.label}>完成备注</Text>
              <TextInput
                style={styles.input}
                value={completeRemarks}
                onChangeText={setCompleteRemarks}
                placeholder="可选，完成备注"
                placeholderTextColor={colors.textTertiary}
                editable={!saving}
              />
            </View>
            <TouchableOpacity
              style={[styles.button, saving && styles.buttonDisabled]}
              onPress={handleComplete}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.cardBackground} />
              ) : (
                <Text style={styles.buttonText}>确认完成</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
