import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  View as RNView,
  Text as RNText,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { BlurView } from 'expo-blur';
import Toast from 'react-native-toast-message';
import { AppStyles, commonStyles } from '../../../constants/AppStyles';
import { projectService } from '../../../services/projectService';
import { ProjectDto, UpdateProjectRequest } from '../../../types/project';
import { authService } from '../../../services/authService';
import { formatDate } from '../../../utils/dateUtils';

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [project, setProject] = useState<ProjectDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UpdateProjectRequest>>({});
  const [isSaving, setIsSaving] = useState(false);

  const loadProject = async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await projectService.getProjectDetail(id!);
      if (response.success) {
        setProject(response.data);
        setEditForm({
          projectId: id!,
          name: response.data.name,
          description: response.data.description,
          status: response.data.status,
          startDate: response.data.startDate,
          endDate: response.data.endDate,
          priority: response.data.priority,
        });
      }
    } catch (error: any) {
      console.error('加载项目失败:', error);
      Toast.show({
        type: 'error',
        text1: '加载项目失败',
        text2: error.message || '请稍后重试',
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProject();
  }, [id]);

  const onRefresh = () => {
    loadProject(true);
  };

  const handleSaveEdit = () => {
    if (!editForm.name?.trim()) {
      Toast.show({
        type: 'error',
        text1: '验证失败',
        text2: '项目名称不能为空',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }

    setIsSaving(true);

    projectService.updateProject({
      projectId: id!,
      name: editForm.name,
      description: editForm.description,
      status: editForm.status,
      startDate: editForm.startDate,
      endDate: editForm.endDate,
      priority: editForm.priority,
    })
      .then((response) => {
        if (response.success) {
          setShowEditModal(false);
          loadProject();
          Toast.show({
            type: 'success',
            text1: '保存成功',
            text2: '项目信息已更新',
            position: 'top',
            visibilityTime: 2000,
          });
        } else {
          Toast.show({
            type: 'error',
            text1: '保存失败',
            text2: response.message,
            position: 'top',
            visibilityTime: 3000,
          });
        }
      })
      .catch((error) => {
        console.error('保存失败:', error);
        Toast.show({
          type: 'error',
          text1: '保存失败',
          text2: error.message || '请稍后重试',
          position: 'top',
          visibilityTime: 3000,
        });
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const handleDelete = () => {
    Alert.alert(
      '确认删除',
      '确定要删除这个项目吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            projectService.deleteProject(id!)
              .then((response) => {
                if (response.success) {
                  Toast.show({
                    type: 'success',
                    text1: '删除成功',
                    text2: '项目已删除',
                    position: 'top',
                    visibilityTime: 2000,
                  });
                  router.back();
                } else {
                  Toast.show({
                    type: 'error',
                    text1: '删除失败',
                    text2: response.message,
                    position: 'top',
                    visibilityTime: 3000,
                  });
                }
              })
              .catch((error) => {
                console.error('删除失败:', error);
                Toast.show({
                  type: 'error',
                  text1: '删除失败',
                  text2: error.message || '请稍后重试',
                  position: 'top',
                  visibilityTime: 3000,
                });
              });
          }
        }
      ]
    );
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  if (loading) {
    return (
      <View style={commonStyles.pageContainer}>
        <ActivityIndicator size="large" color={AppStyles.colors.primary} />
      </View>
    );
  }

  if (!project) {
    return (
      <View style={commonStyles.pageContainer}>
        <RNText style={styles.emptyText}>项目不存在</RNText>
      </View>
    );
  }

  const statusOptions = [
    { value: 0, label: '规划中', color: '#999' },
    { value: 1, label: '进行中', color: '#1890ff' },
    { value: 2, label: '暂停', color: '#faad14' },
    { value: 3, label: '已完成', color: '#52c41a' },
    { value: 4, label: '已取消', color: '#d9d9d9' }
  ];

  const priorityOptions = [
    { value: 0, label: '低', color: '#52c41a' },
    { value: 1, label: '中', color: '#1890ff' },
    { value: 2, label: '高', color: '#faad14' }
  ];

  const getStatusColor = (status: number): string => {
    const colors: Record<number, string> = {
      0: '#999',       // planning
      1: '#1890ff',    // in_progress
      2: '#faad14',    // on_hold
      3: '#52c41a',    // completed
      4: '#d9d9d9'     // cancelled
    };
    return colors[status] || '#999';
  };

  const getPriorityColor = (priority: number): string => {
    const colors: Record<number, string> = {
      0: '#52c41a',    // low
      1: '#1890ff',    // medium
      2: '#faad14'     // high
    };
    return colors[priority] || '#999';
  };

  const formatDateDisplay = (dateString?: string) => {
    if (!dateString) return '未设置';
    return formatDate(dateString);
  };

  return (
    <View style={commonStyles.pageContainer}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={AppStyles.gradients.primary as unknown as readonly [string, string, ...string[]]}
          style={commonStyles.gradientHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <RNView style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <RNText style={styles.headerTitle}>项目详情</RNText>
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEdit}
            >
              <Ionicons name="create-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </RNView>
        </LinearGradient>

        {project && (
          <>
            {/* Project Info Card */}
            <View style={styles.infoCard}>
              <RNView style={styles.infoRow}>
                <RNView style={styles.infoIconContainer}>
                  <Ionicons name="folder-outline" size={20} color={AppStyles.colors.primary} />
                </RNView>
                <View style={styles.infoContent}>
                  <RNText style={styles.infoLabel}>项目名称</RNText>
                  <RNText style={styles.infoValue}>{project.name}</RNText>
                </View>
              </RNView>

              <RNView style={styles.infoDivider} />

              <RNView style={styles.infoRow}>
                <RNView style={styles.infoIconContainer}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={AppStyles.colors.primary} />
                </RNView>
                <View style={styles.infoContent}>
                  <RNText style={styles.infoLabel}>状态</RNText>
                  <RNText style={[styles.infoValue, { color: getStatusColor(project.status) }]}>
                    {project.statusName}
                  </RNText>
                </View>
              </RNView>

              <RNView style={styles.infoDivider} />

              <RNView style={styles.infoRow}>
                <RNView style={styles.infoIconContainer}>
                  <Ionicons name="flag-outline" size={20} color={AppStyles.colors.primary} />
                </RNView>
                <View style={styles.infoContent}>
                  <RNText style={styles.infoLabel}>优先级</RNText>
                  <RNText style={[styles.infoValue, { color: getPriorityColor(project.priority) }]}>
                    {project.priorityName}
                  </RNText>
                </View>
              </RNView>

              <RNView style={styles.infoDivider} />

              {project.progress > 0 && (
                <>
                  <RNView style={styles.infoRow}>
                    <RNView style={styles.infoIconContainer}>
                      <Ionicons name="analytics-outline" size={20} color={AppStyles.colors.primary} />
                    </RNView>
                    <View style={styles.infoContent}>
                      <RNText style={styles.infoLabel}>完成进度</RNText>
                      <RNText style={styles.infoValue}>
                        {project.progress}%
                      </RNText>
                    </View>
                  </RNView>

                  <RNView style={styles.progressBarContainer}>
                    <RNView style={styles.progressBar}>
                      <RNView
                        style={[
                          styles.progressFill,
                          { width: `${project.progress}%` }
                        ]}
                      />
                    </RNView>
                  </RNView>
                </>
              )}
            </View>

            {/* Description */}
            {project.description && (
              <View style={styles.sectionCard}>
                <RNText style={styles.sectionTitle}>项目描述</RNText>
                <RNText style={styles.sectionContent}>{project.description}</RNText>
              </View>
            )}

            {/* Dates */}
            {(project.startDate || project.endDate) && (
              <View style={styles.sectionCard}>
                <RNText style={styles.sectionTitle}>时间安排</RNText>
                <RNView style={styles.dateRow}>
                  <Ionicons name="calendar-outline" size={20} color={AppStyles.colors.textSecondary} />
                  <RNView style={styles.dateContent}>
                    <RNText style={styles.dateLabel}>开始日期</RNText>
                    <RNText style={styles.dateValue}>{formatDateDisplay(project.startDate)}</RNText>
                  </RNView>
                </RNView>
                <RNView style={styles.dateDivider} />
                <RNView style={styles.dateRow}>
                  <Ionicons name="calendar-outline" size={20} color={AppStyles.colors.textSecondary} />
                  <RNView style={styles.dateContent}>
                    <RNText style={styles.dateLabel}>结束日期</RNText>
                    <RNText style={styles.dateValue}>{formatDateDisplay(project.endDate)}</RNText>
                  </RNView>
                </RNView>
              </View>
            )}

            {/* Budget */}
            {project.budget !== undefined && project.budget !== null && project.budget > 0 && (
              <View style={styles.sectionCard}>
                <RNText style={styles.sectionTitle}>预算</RNText>
                <RNView style={styles.infoRow}>
                  <Ionicons name="cash-outline" size={20} color={AppStyles.colors.textSecondary} />
                  <RNText style={styles.budgetValue}>
                    ¥{project.budget.toLocaleString()}
                  </RNText>
                </RNView>
              </View>
            )}

            {/* Members */}
            {project.projectMembers && project.projectMembers.length > 0 && (
              <View style={styles.sectionCard}>
                <RNText style={styles.sectionTitle}>团队成员</RNText>
                <RNView style={styles.membersList}>
                  {project.projectMembers.map((member, index) => (
                    <RNView key={`${member.userId}-${index}`} style={styles.memberItem}>
                      <RNView style={styles.memberAvatar}>
                        <RNText style={styles.memberAvatarText}>
                          {member.userName?.charAt(0) || 'U'}
                        </RNText>
                      </RNView>
                      <RNView style={styles.memberInfo}>
                        <RNText style={styles.memberName}>{member.userName}</RNText>
                        <RNText style={styles.memberEmail}>{member.userEmail}</RNText>
                        <RNView style={styles.memberRoleBadge}>
                          <RNText style={styles.memberRoleText}>
                            {member.roleName}
                          </RNText>
                        </RNView>
                      </RNView>
                    </RNView>
                  ))}
                </RNView>
              </View>
            )}

            {/* Create Info */}
            {project.createdByName && (
              <View style={styles.sectionCard}>
                <RNText style={styles.sectionTitle}>创建信息</RNText>
                <RNView style={styles.createInfoRow}>
                  <RNView style={styles.createInfoIconContainer}>
                    <Ionicons name="person-outline" size={20} color={AppStyles.colors.textSecondary} />
                  </RNView>
                  <RNView style={styles.createInfoContent}>
                    <RNText style={styles.createInfoLabel}>创建人</RNText>
                    <RNText style={styles.createInfoValue}>{project.createdByName}</RNText>
                  </RNView>
                </RNView>
                {project.createdAt && (
                  <RNView style={styles.createInfoDivider} />
                )}
                {project.createdAt && (
                  <RNView style={styles.createInfoRow}>
                    <RNView style={styles.createInfoIconContainer}>
                      <Ionicons name="time-outline" size={20} color={AppStyles.colors.textSecondary} />
                    </RNView>
                    <RNView style={styles.createInfoContent}>
                      <RNText style={styles.createInfoLabel}>创建时间</RNText>
                      <RNText style={styles.createInfoValue}>
                        {new Date(project.createdAt).toLocaleString('zh-CN')}
                      </RNText>
                    </RNView>
                  </RNView>
                )}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {project.canEdit && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setShowEditModal(true)}
                >
                  <Ionicons name="create-outline" size={24} color="#fff" />
                  <RNText style={styles.actionButtonText}>编辑</RNText>
                </TouchableOpacity>
              )}

              {project.canDelete && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonDanger]}
                  onPress={handleDelete}
                >
                  <Ionicons name="trash-outline" size={24} color="#fff" />
                  <RNText style={styles.actionButtonText}>删除</RNText>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Edit Project Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showEditModal}
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <BlurView intensity={20} style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <RNText style={styles.modalTitle}>编辑项目</RNText>
                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.formContainer}>
                <View style={styles.formGroup}>
                  <RNText style={styles.label}>项目名称</RNText>
                  <TextInput
                    style={styles.input}
                    value={editForm.name}
                    onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                    placeholder="请输入项目名称"
                    placeholderTextColor={AppStyles.colors.textSecondary}
                  />
                </View>

                <View style={styles.formGroup}>
                  <RNText style={styles.label}>描述</RNText>
                  <TextInput
                    style={styles.textArea}
                    value={editForm.description}
                    onChangeText={(text) => setEditForm({ ...editForm, description: text })}
                    placeholder="请输入项目描述（可选）"
                    placeholderTextColor={AppStyles.colors.textSecondary}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.formGroup}>
                  <RNText style={styles.label}>状态</RNText>
                  <View style={styles.statusOptions}>
                    {statusOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.statusOption,
                          editForm.status === option.value && styles.statusOptionActive
                        ]}
                        onPress={() => setEditForm({ ...editForm, status: option.value })}
                      >
                        <RNText
                          style={[
                            styles.statusText,
                            editForm.status === option.value && styles.statusTextActive
                          ]}
                        >
                          {option.label}
                        </RNText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <RNText style={styles.label}>优先级</RNText>
                  <View style={styles.priorityOptions}>
                    {priorityOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.priorityOption,
                          editForm.priority === option.value && styles.priorityOptionActive
                        ]}
                        onPress={() => setEditForm({ ...editForm, priority: option.value })}
                      >
                        <RNText
                          style={[
                            styles.priorityText,
                            editForm.priority === option.value && styles.priorityTextActive
                          ]}
                        >
                          {option.label}
                        </RNText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowEditModal(false)}
                >
                  <RNText style={styles.cancelButtonText}>取消</RNText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmButton, isSaving && styles.confirmButtonDisabled]}
                  onPress={handleSaveEdit}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <RNText style={styles.confirmButtonText}>保存</RNText>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    width: '100%',
  },
  contentContainer: {
    flexGrow: 1,
    width: '100%',
    paddingBottom: 40,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: AppStyles.borderRadius.lg,
    padding: AppStyles.spacing.lg,
    marginHorizontal: AppStyles.spacing.lg,
    marginTop: AppStyles.spacing.lg,
    ...AppStyles.shadows.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: AppStyles.colors.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: AppStyles.colors.text,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 12,
  },
  progressBarContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: AppStyles.colors.primary,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: AppStyles.borderRadius.lg,
    padding: AppStyles.spacing.lg,
    marginHorizontal: AppStyles.spacing.lg,
    marginTop: AppStyles.spacing.md,
    ...AppStyles.shadows.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: AppStyles.colors.text,
    marginBottom: AppStyles.spacing.md,
  },
  sectionContent: {
    fontSize: 15,
    color: AppStyles.colors.textSecondary,
    lineHeight: 22,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dateContent: {
    marginLeft: 12,
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    color: AppStyles.colors.textSecondary,
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 16,
    fontWeight: '500',
    color: AppStyles.colors.text,
  },
  dateDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 12,
  },
  budgetValue: {
    fontSize: 16,
    fontWeight: '600',
    color: AppStyles.colors.text,
  },
  membersList: {
    flexDirection: 'column',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppStyles.colors.primary,
  },
  memberInfo: {
    marginLeft: 12,
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500',
    color: AppStyles.colors.text,
  },
  memberEmail: {
    fontSize: 13,
    color: AppStyles.colors.textSecondary,
    marginTop: 2,
  },
  memberRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  memberRoleText: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
    backgroundColor: '#f0f7ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  createInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createInfoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  createInfoContent: {
    flex: 1,
  },
  createInfoLabel: {
    fontSize: 14,
    color: AppStyles.colors.textSecondary,
    marginBottom: 4,
  },
  createInfoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: AppStyles.colors.text,
  },
  createInfoDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: AppStyles.spacing.lg,
    paddingVertical: AppStyles.spacing.md,
    gap: 12,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    borderRadius: AppStyles.borderRadius.lg,
    padding: 16,
    ...AppStyles.shadows.md,
  },
  actionButtonDanger: {
    backgroundColor: '#ff4d4f',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  formContainer: {
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#f5f7fa',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: AppStyles.colors.text,
  },
  textArea: {
    backgroundColor: '#f5f7fa',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: AppStyles.colors.text,
    textAlignVertical: 'top',
  },
  statusOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  statusOption: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  statusOptionActive: {
    backgroundColor: '#f0f7ff',
    borderWidth: 1,
    borderColor: '#667eea',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  statusTextActive: {
    color: '#667eea',
    fontWeight: '600',
  },
  priorityOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  priorityOptionActive: {
    backgroundColor: '#f0f7ff',
    borderWidth: 1,
    borderColor: '#667eea',
  },
  priorityText: {
    fontSize: 14,
    color: '#666',
  },
  priorityTextActive: {
    color: '#667eea',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  emptyText: {
    fontSize: 14,
    color: AppStyles.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});
