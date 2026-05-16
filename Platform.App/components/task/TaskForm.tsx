import React, { useState, useMemo } from 'react';
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
  TaskDto,
  TaskPriority,
  CreateTaskRequest,
  UpdateTaskRequest,
} from '../../types/task';
import { useTheme } from '../../utils/theme';
import { useTranslation } from 'react-i18next';

interface TaskFormProps {
  initialValues?: TaskDto;
  projects?: { id: string; name: string }[];
  onSave: (data: CreateTaskRequest | UpdateTaskRequest) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}

const TAG_OPTIONS = ['UI', 'API', 'Bug', 'Feature', 'Performance'];

export default function TaskForm({
  initialValues,
  projects = [],
  onSave,
  onCancel,
  saving,
}: TaskFormProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  const TASK_TYPES = [t('task_form.type_dev'), t('task_form.type_design'), t('task_form.type_test'), t('task_form.type_doc'), t('task_form.type_other')];
  const PRIORITY_OPTIONS = [
    { value: TaskPriority.Low, label: t('task_form.priority_low') },
    { value: TaskPriority.Medium, label: t('task_form.priority_medium') },
    { value: TaskPriority.High, label: t('task_form.priority_high') },
    { value: TaskPriority.Urgent, label: t('task_form.priority_urgent') },
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
    halfField: {
      flex: 1,
    },
    fieldGap: {
      width: AppStyles.spacing.md,
    },
    row: {
      flexDirection: 'row',
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
    placeholderText: {
      color: colors.textTertiary,
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
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: AppStyles.spacing.sm,
    },
    chip: {
      paddingHorizontal: AppStyles.spacing.md,
      paddingVertical: AppStyles.spacing.sm - 2,
      borderRadius: AppStyles.borderRadius.full,
      backgroundColor: colors.cardBackground,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: AppStyles.fontSize.sm,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    chipTextActive: {
      color: colors.cardBackground,
    },
  }), [colors]);

  const [taskName, setTaskName] = useState(initialValues?.taskName || '');
  const [taskType, setTaskType] = useState(initialValues?.taskType || '开发');
  const [priority, setPriority] = useState<TaskPriority>(initialValues?.priority ?? TaskPriority.Medium);
  const [description, setDescription] = useState(initialValues?.description || '');
  const [projectId, setProjectId] = useState(initialValues?.projectId || '');
  const [plannedStartTime, setPlannedStartTime] = useState(initialValues?.plannedStartTime?.slice(0, 16) || '');
  const [plannedEndTime, setPlannedEndTime] = useState(initialValues?.plannedEndTime?.slice(0, 16) || '');
  const [estimatedDuration, setEstimatedDuration] = useState(
    initialValues?.estimatedDuration?.toString() || ''
  );
  const [tags, setTags] = useState<string[]>(initialValues?.tags || []);
  const [remarks, setRemarks] = useState(initialValues?.remarks || '');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);

  const isEditing = !!initialValues;

  const toggleTag = (tag: string) => {
    setTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    if (!taskName.trim()) return;
    const data: any = {
      taskName: taskName.trim(),
      taskType,
      priority,
      description: description.trim() || undefined,
      projectId: projectId || undefined,
      plannedStartTime: plannedStartTime || undefined,
      plannedEndTime: plannedEndTime || undefined,
      estimatedDuration: estimatedDuration ? parseInt(estimatedDuration, 10) : undefined,
      tags: tags.length > 0 ? tags : undefined,
      remarks: remarks.trim() || undefined,
    };
    if (isEditing) {
      data.taskId = initialValues!.id;
    }
    await onSave(data);
  };

  const canSave = taskName.trim().length > 0 && !saving;
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} disabled={saving}>
          <Text style={styles.cancelText}>{t('task_form.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{isEditing ? t('task_form.title_edit') : t('task_form.title_create')}</Text>
        <TouchableOpacity onPress={handleSave} disabled={!canSave}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>{t('task_form.save')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>{t('task_form.task_name')} *</Text>
          <TextInput
            style={styles.input}
            value={taskName}
            onChangeText={setTaskName}
            placeholder={t('task_form.task_name_placeholder')}
            placeholderTextColor={colors.textTertiary}
            editable={!saving}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('task_form.task_type')}</Text>
          <View style={styles.chipRow}>
            {TASK_TYPES.map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.chip, taskType === type && styles.chipActive]}
                onPress={() => setTaskType(type)}
                disabled={saving}
              >
                <Text style={[styles.chipText, taskType === type && styles.chipTextActive]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('task_form.priority')}</Text>
          <View style={styles.chipRow}>
            {PRIORITY_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, priority === opt.value && styles.chipActive]}
                onPress={() => setPriority(opt.value)}
                disabled={saving}
              >
                <Text style={[styles.chipText, priority === opt.value && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {projects.length > 0 && (
          <View style={styles.field}>
            <Text style={styles.label}>{t('task_form.project')}</Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowProjectPicker(!showProjectPicker)}
              disabled={saving}
            >
              <Text style={[styles.pickerText, !projectId && styles.placeholderText]}>
                {projectId
                  ? projects.find(p => p.id === projectId)?.name || t('task_form.no_project')
                  : t('task_form.select_project')}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            {showProjectPicker && (
              <View style={styles.pickerOptions}>
                <TouchableOpacity
                  style={styles.pickerOption}
                  onPress={() => { setProjectId(''); setShowProjectPicker(false); }}
                >
                  <Text style={styles.pickerOptionText}>{t('task_form.no_project')}</Text>
                </TouchableOpacity>
                {projects.map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.pickerOption, projectId === p.id && styles.pickerOptionActive]}
                    onPress={() => { setProjectId(p.id); setShowProjectPicker(false); }}
                  >
                    <Text style={[styles.pickerOptionText, projectId === p.id && styles.pickerOptionTextActive]}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>{t('task_form.description')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder={t('task_form.description_placeholder')}
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            editable={!saving}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, styles.halfField]}>
            <Text style={styles.label}>{t('task_form.planned_start')}</Text>
            <TextInput
              style={styles.input}
              value={plannedStartTime}
              onChangeText={setPlannedStartTime}
              placeholder="YYYY-MM-DD HH:mm"
              placeholderTextColor={colors.textTertiary}
              editable={!saving}
            />
          </View>
          <View style={styles.fieldGap} />
          <View style={[styles.field, styles.halfField]}>
            <Text style={styles.label}>{t('task_form.planned_end')}</Text>
            <TextInput
              style={styles.input}
              value={plannedEndTime}
              onChangeText={setPlannedEndTime}
              placeholder="YYYY-MM-DD HH:mm"
              placeholderTextColor={colors.textTertiary}
              editable={!saving}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('task_form.estimated_duration')}</Text>
          <TextInput
            style={styles.input}
            value={estimatedDuration}
            onChangeText={setEstimatedDuration}
            placeholder={t('task_form.estimated_duration')}
            placeholderTextColor={colors.textTertiary}
            keyboardType="number-pad"
            editable={!saving}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('task_form.tags')}</Text>
          <View style={styles.chipRow}>
            {TAG_OPTIONS.map(tag => (
              <TouchableOpacity
                key={tag}
                style={[styles.chip, tags.includes(tag) && styles.chipActive]}
                onPress={() => toggleTag(tag)}
                disabled={saving}
              >
                <Text style={[styles.chipText, tags.includes(tag) && styles.chipTextActive]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('task_form.remarks')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={remarks}
            onChangeText={setRemarks}
            placeholder={t('task_form.remarks_placeholder')}
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            editable={!saving}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
