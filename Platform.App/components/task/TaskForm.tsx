import React, { useState } from 'react';
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

interface TaskFormProps {
  initialValues?: TaskDto;
  projects?: { id: string; name: string }[];
  onSave: (data: CreateTaskRequest | UpdateTaskRequest) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}

const TASK_TYPES = ['开发', '设计', '测试', '文档', '其他'];
const PRIORITY_OPTIONS = [
  { value: TaskPriority.Low, label: '低' },
  { value: TaskPriority.Medium, label: '中' },
  { value: TaskPriority.High, label: '高' },
  { value: TaskPriority.Urgent, label: '紧急' },
];
const TAG_OPTIONS = ['UI', 'API', 'Bug', 'Feature', 'Performance'];

export default function TaskForm({
  initialValues,
  projects = [],
  onSave,
  onCancel,
  saving,
}: TaskFormProps) {
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
          <Text style={styles.cancelText}>取消</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{isEditing ? '编辑任务' : '创建任务'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={!canSave}>
          {saving ? (
            <ActivityIndicator size="small" color={AppStyles.colors.primary} />
          ) : (
            <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>保存</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>任务名称 *</Text>
          <TextInput
            style={styles.input}
            value={taskName}
            onChangeText={setTaskName}
            placeholder="请输入任务名称"
            placeholderTextColor={AppStyles.colors.textTertiary}
            editable={!saving}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>任务类型</Text>
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
          <Text style={styles.label}>优先级</Text>
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
            <Text style={styles.label}>关联项目</Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowProjectPicker(!showProjectPicker)}
              disabled={saving}
            >
              <Text style={[styles.pickerText, !projectId && styles.placeholderText]}>
                {projectId
                  ? projects.find(p => p.id === projectId)?.name || '未知项目'
                  : '选择关联项目'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={AppStyles.colors.textSecondary} />
            </TouchableOpacity>
            {showProjectPicker && (
              <View style={styles.pickerOptions}>
                <TouchableOpacity
                  style={styles.pickerOption}
                  onPress={() => { setProjectId(''); setShowProjectPicker(false); }}
                >
                  <Text style={styles.pickerOptionText}>不关联项目</Text>
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
          <Text style={styles.label}>描述</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="请输入任务描述"
            placeholderTextColor={AppStyles.colors.textTertiary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            editable={!saving}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, styles.halfField]}>
            <Text style={styles.label}>计划开始</Text>
            <TextInput
              style={styles.input}
              value={plannedStartTime}
              onChangeText={setPlannedStartTime}
              placeholder="YYYY-MM-DD HH:mm"
              placeholderTextColor={AppStyles.colors.textTertiary}
              editable={!saving}
            />
          </View>
          <View style={styles.fieldGap} />
          <View style={[styles.field, styles.halfField]}>
            <Text style={styles.label}>计划结束</Text>
            <TextInput
              style={styles.input}
              value={plannedEndTime}
              onChangeText={setPlannedEndTime}
              placeholder="YYYY-MM-DD HH:mm"
              placeholderTextColor={AppStyles.colors.textTertiary}
              editable={!saving}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>预估时长（分钟）</Text>
          <TextInput
            style={styles.input}
            value={estimatedDuration}
            onChangeText={setEstimatedDuration}
            placeholder="请输入预估时长"
            placeholderTextColor={AppStyles.colors.textTertiary}
            keyboardType="number-pad"
            editable={!saving}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>标签</Text>
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
          <Text style={styles.label}>备注</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={remarks}
            onChangeText={setRemarks}
            placeholder="请输入备注"
            placeholderTextColor={AppStyles.colors.textTertiary}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppStyles.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: AppStyles.spacing.md,
    paddingVertical: AppStyles.spacing.md,
    backgroundColor: AppStyles.colors.cardBackground,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppStyles.colors.border,
  },
  title: {
    fontSize: AppStyles.fontSize.lg,
    fontWeight: '600',
    color: AppStyles.colors.text,
  },
  cancelText: {
    fontSize: AppStyles.fontSize.md,
    color: AppStyles.colors.textSecondary,
  },
  saveText: {
    fontSize: AppStyles.fontSize.md,
    color: AppStyles.colors.primary,
    fontWeight: '600',
  },
  saveTextDisabled: {
    color: AppStyles.colors.textTertiary,
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
    color: AppStyles.colors.text,
    marginBottom: AppStyles.spacing.sm,
  },
  input: {
    backgroundColor: AppStyles.colors.cardBackground,
    borderRadius: AppStyles.borderRadius.md,
    borderWidth: 1.5,
    borderColor: AppStyles.colors.border,
    paddingHorizontal: AppStyles.spacing.md,
    paddingVertical: AppStyles.spacing.md - 4,
    fontSize: AppStyles.fontSize.md,
    color: AppStyles.colors.text,
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
    backgroundColor: AppStyles.colors.cardBackground,
    borderRadius: AppStyles.borderRadius.md,
    borderWidth: 1.5,
    borderColor: AppStyles.colors.border,
    paddingHorizontal: AppStyles.spacing.md,
    paddingVertical: AppStyles.spacing.md - 4,
    minHeight: 48,
  },
  pickerText: {
    fontSize: AppStyles.fontSize.md,
    color: AppStyles.colors.text,
  },
  placeholderText: {
    color: AppStyles.colors.textTertiary,
  },
  pickerOptions: {
    marginTop: AppStyles.spacing.xs,
    backgroundColor: AppStyles.colors.cardBackground,
    borderRadius: AppStyles.borderRadius.md,
    borderWidth: 1.5,
    borderColor: AppStyles.colors.border,
    overflow: 'hidden',
  },
  pickerOption: {
    paddingHorizontal: AppStyles.spacing.md,
    paddingVertical: AppStyles.spacing.md - 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppStyles.colors.borderLight,
  },
  pickerOptionActive: {
    backgroundColor: AppStyles.colors.primary + '10',
  },
  pickerOptionText: {
    fontSize: AppStyles.fontSize.md,
    color: AppStyles.colors.text,
  },
  pickerOptionTextActive: {
    color: AppStyles.colors.primary,
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
    backgroundColor: AppStyles.colors.cardBackground,
    borderWidth: 1.5,
    borderColor: AppStyles.colors.border,
  },
  chipActive: {
    backgroundColor: AppStyles.colors.primary,
    borderColor: AppStyles.colors.primary,
  },
  chipText: {
    fontSize: AppStyles.fontSize.sm,
    color: AppStyles.colors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
  },
});
