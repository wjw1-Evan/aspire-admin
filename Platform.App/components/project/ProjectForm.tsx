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
import { useTranslation } from 'react-i18next';

interface ProjectFormProps {
  initialValues?: ProjectDto;
  onSave: (data: CreateProjectRequest | UpdateProjectRequest) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}

export default function ProjectForm({
  initialValues,
  onSave,
  onCancel,
  saving,
}: ProjectFormProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  const STATUS_OPTIONS = [
    { value: ProjectStatus.Planning, label: t('project_form.status_planning') },
    { value: ProjectStatus.InProgress, label: t('project_form.status_in_progress') },
    { value: ProjectStatus.OnHold, label: t('project_form.status_on_hold') },
    { value: ProjectStatus.Completed, label: t('project_form.status_completed') },
    { value: ProjectStatus.Cancelled, label: t('project_form.status_cancelled') },
  ];

  const PRIORITY_OPTIONS = [
    { value: ProjectPriority.Low, label: t('project_form.priority_low') },
    { value: ProjectPriority.Medium, label: t('project_form.priority_medium') },
    { value: ProjectPriority.High, label: t('project_form.priority_high') },
  ];

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
          <Text style={styles.cancelText}>{t('project_form.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{isEditing ? t('project_form.title_edit') : t('project_form.title_create')}</Text>
        <TouchableOpacity onPress={handleSave} disabled={!canSave}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>{t('project_form.save')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>{t('project_form.project_name')} *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t('project_form.project_name_placeholder')}
            placeholderTextColor={colors.textTertiary}
            editable={!saving}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('project_form.status')}</Text>
          <TouchableOpacity
            style={styles.picker}
            onPress={() => setShowStatusPicker(!showStatusPicker)}
            disabled={saving}
          >
            <Text style={styles.pickerText}>
              {STATUS_OPTIONS.find(s => s.value === status)?.label || t('project_form.status')}
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
          <Text style={styles.label}>{t('project_form.priority')}</Text>
          <TouchableOpacity
            style={styles.picker}
            onPress={() => setShowPriorityPicker(!showPriorityPicker)}
            disabled={saving}
          >
            <Text style={styles.pickerText}>
              {PRIORITY_OPTIONS.find(p => p.value === priority)?.label || t('project_form.priority')}
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
          <Text style={styles.label}>{t('project_form.description')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder={t('project_form.description_placeholder')}
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!saving}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('project_form.start_date')}</Text>
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
          <Text style={styles.label}>{t('project_form.end_date')}</Text>
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
          <Text style={styles.label}>{t('project_form.budget')}</Text>
          <TextInput
            style={styles.input}
            value={budget}
            onChangeText={setBudget}
            placeholder={t('project_form.budget_placeholder')}
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
            editable={!saving}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
