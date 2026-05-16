import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppStyles } from '../../constants/AppStyles';
import {
  ProjectDto,
  ProjectStatus,
  ProjectPriority,
  CreateProjectRequest,
  UpdateProjectRequest,
} from '../../types/project';
import { useTheme } from '../../utils/theme';

interface ProjectFormProps {
  initialValues?: ProjectDto;
  onSave: (data: CreateProjectRequest | UpdateProjectRequest) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}

const STATUS_OPTIONS = [
  { value: ProjectStatus.Planning, label: '规划中' },
  { value: ProjectStatus.InProgress, label: '进行中' },
  { value: ProjectStatus.OnHold, label: '暂停' },
  { value: ProjectStatus.Completed, label: '已完成' },
  { value: ProjectStatus.Cancelled, label: '已取消' },
];

const PRIORITY_OPTIONS = [
  { value: ProjectPriority.Low, label: '低' },
  { value: ProjectPriority.Medium, label: '中' },
  { value: ProjectPriority.High, label: '高' },
];

export default function ProjectForm({
  initialValues,
  onSave,
  onCancel,
  saving,
}: ProjectFormProps) {
  const { colors, isDark } = useTheme();
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
    saveText: {
      fontSize: AppStyles.fontSize.md,
      color: colors.primary,
      fontWeight: '600',
    },
    saveTextDisabled: {
      color: colors.textTertiary,
    },
    form: {
      flex: 1,
      padding: AppStyles.spacing.md,
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
      minHeight: 100,
      paddingTop: AppStyles.spacing.md - 4,
    },
    picker: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: AppStyles.borderRadius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingHorizontal: AppStyles.spacing.md,
      paddingVertical: AppStyles.spacing.md - 4,
      minHeight: 48,
    },
    pickerText: {
      fontSize: AppStyles.fontSize.md,
      color: colors.text,
    },
    pickerOptions: {
      marginTop: AppStyles.spacing.xs,
      backgroundColor: colors.cardBackground,
      borderRadius: AppStyles.borderRadius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    pickerOption: {
      paddingHorizontal: AppStyles.spacing.md,
      paddingVertical: AppStyles.spacing.md - 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    pickerOptionActive: {
      backgroundColor: colors.primary + '10',
    },
    pickerOptionText: {
      fontSize: AppStyles.fontSize.md,
      color: colors.text,
    },
    pickerOptionTextActive: {
      color: colors.primary,
      fontWeight: '600',
    },
  }), [colors]);

  const [name, setName] = useState(initialValues?.name || '');
  const [description, setDescription] = useState(initialValues?.description || '');
  const [status, setStatus] = useState<ProjectStatus>(initialValues?.status ?? ProjectStatus.Planning);
  const [priority, setPriority] = useState<ProjectPriority>(initialValues?.priority ?? ProjectPriority.Medium);
  const [startDate, setStartDate] = useState(initialValues?.startDate || '');
  const [endDate, setEndDate] = useState(initialValues?.endDate || '');
  const [budget, setBudget] = useState(initialValues?.budget?.toString() || '');
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);

  const isEditing = !!initialValues;

  const handleSave = async () => {
    if (!name.trim()) return;
    const data: any = {
      name: name.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      budget: budget ? parseFloat(budget) : undefined,
    };
    if (isEditing) {
      data.projectId = initialValues!.id;
    }
    await onSave(data);
  };

  const canSave = name.trim().length > 0 && !saving;
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} disabled={saving}>
          <Text style={styles.cancelText}>取消</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{isEditing ? '编辑项目' : '创建项目'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={!canSave}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>保存</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>项目名称 *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="请输入项目名称"
            placeholderTextColor={colors.textTertiary}
            editable={!saving}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>状态</Text>
          <TouchableOpacity
            style={styles.picker}
            onPress={() => setShowStatusPicker(!showStatusPicker)}
            disabled={saving}
          >
            <Text style={styles.pickerText}>
              {STATUS_OPTIONS.find(s => s.value === status)?.label || '选择状态'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          {showStatusPicker && (
            <View style={styles.pickerOptions}>
              {STATUS_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.pickerOption, status === opt.value && styles.pickerOptionActive]}
                  onPress={() => { setStatus(opt.value); setShowStatusPicker(false); }}
                >
                  <Text style={[styles.pickerOptionText, status === opt.value && styles.pickerOptionTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>优先级</Text>
          <TouchableOpacity
            style={styles.picker}
            onPress={() => setShowPriorityPicker(!showPriorityPicker)}
            disabled={saving}
          >
            <Text style={styles.pickerText}>
              {PRIORITY_OPTIONS.find(p => p.value === priority)?.label || '选择优先级'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          {showPriorityPicker && (
            <View style={styles.pickerOptions}>
              {PRIORITY_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.pickerOption, priority === opt.value && styles.pickerOptionActive]}
                  onPress={() => { setPriority(opt.value); setShowPriorityPicker(false); }}
                >
                  <Text style={[styles.pickerOptionText, priority === opt.value && styles.pickerOptionTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>描述</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="请输入项目描述"
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!saving}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>开始日期</Text>
          <TextInput
            style={styles.input}
            value={startDate}
            onChangeText={setStartDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textTertiary}
            editable={!saving}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>结束日期</Text>
          <TextInput
            style={styles.input}
            value={endDate}
            onChangeText={setEndDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textTertiary}
            editable={!saving}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>预算</Text>
          <TextInput
            style={styles.input}
            value={budget}
            onChangeText={setBudget}
            placeholder="请输入预算金额"
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
            editable={!saving}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
