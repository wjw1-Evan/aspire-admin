import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  RefreshControl,
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
import { taskService } from '../../../services/taskService';
import { projectService } from '../../../services/projectService';
import {
  TaskDto,
  ExecuteTaskRequest,
  CompleteTaskRequest,
  UpdateTaskRequest,
  TaskStatus,
  TaskPriority,
} from '../../../types/task';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [task, setTask] = useState<TaskDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showUpdateStatusModal, setShowUpdateStatusModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UpdateTaskRequest>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [assigneeOptions, setAssigneeOptions] = useState<any[]>([]);


    try {
      const response = await projectService.getMyProjects();
      if (response.success) {
        setProjects(response.data || []);
      }
    } catch (error) {
      console.error('加载项目失败:', error);
    }
  };

  const loadTask = async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await taskService.getTaskDetail(id!);
      if (response.success) {
        setTask(response.data);
        setEditForm({
          taskId: id!,
          taskName: response.data.taskName,
          description: response.data.description,
          priority: response.data.priority,
          assignedTo: response.data.assignedTo,
          plannedStartTime: response.data.plannedStartTime,
          plannedEndTime: response.data.plannedEndTime,
        });
      }
    } catch (error: any) {
      console.error('加载任务失败:', error);
      Toast.show({
        type: 'error',
        text1: '加载任务失败',
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
    
    loadTask();
  }, [id]);

  const onRefresh = () => {
    loadTask(true);
  };

  const handleUpdateStatus = (status: TaskStatus) => {
    const statusMap: Record<TaskStatus, number> = {
      todo: 0,
      assigned: 1,
      in_progress: 2,
      completed: 3,
      cancelled: 4,
      failed: 5,
      paused: 6
    };

    const executeRequest: ExecuteTaskRequest = {
      taskId: id!,
      status: statusMap[status],
      completionPercentage: task?.completionPercentage || 0
    };

    setUpdatingStatus(true);
    taskService.executeTask(executeRequest)
      .then((response) => {
        if (response.success) {
          loadTask();
          setShowUpdateStatusModal(false);
          Toast.show({
            type: 'success',
            text1: '更新成功',
            text2: `任务状态已更新为 ${response.data?.statusName}`,
            position: 'top',
            visibilityTime: 2000,
          });
        } else {
          Toast.show({
            type: 'error',
            text1: '更新失败',
            text2: response.message,
            position: 'top',
            visibilityTime: 3000,
          });
        }
      })
      .catch((error) => {
        console.error('更新状态失败:', error);
        Toast.show({
          type: 'error',
          text1: '更新失败',
          text2: error.message || '请稍后重试',
          position: 'top',
          visibilityTime: 3000,
        });
      })
      .finally(() => {
        setUpdatingStatus(false);
      });
  };

  const handleCompleteTask = () => {
    const completeRequest: CompleteTaskRequest = {
      taskId: id!,
      executionResult: 1,
      remarks: editForm.remarks || ''
    };

    setShowCompleteModal(true);
  };

  const confirmComplete = () => {
    setShowCompleteModal(false);
    setIsSaving(true);

    taskService.completeTask({
      taskId: id!,
      executionResult: 1,
      remarks: editForm.remarks || ''
    })
      .then((response) => {
        if (response.success) {
          loadTask();
          Toast.show({
            type: 'success',
            text1: '任务完成',
            text2: '任务已成功完成',
            position: 'top',
            visibilityTime: 2000,
          });
        } else {
          Toast.show({
            type: 'error',
            text1: '完成失败',
            text2: response.message,
            position: 'top',
            visibilityTime: 3000,
          });
        }
      })
      .catch((error) => {
        console.error('完成任务失败:', error);
        Toast.show({
          type: 'error',
          text1: '完成失败',
          text2: error.message || '请稍后重试',
          position: 'top',
          visibilityTime: 3000,
        });
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const handleSaveEdit = () => {
    if (!editForm.taskName?.trim()) {
      Toast.show({
        type: 'error',
        text1: '验证失败',
        text2: '任务名称不能为空',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }

    setIsSaving(true);

    taskService.updateTask({
      taskId: id!,
      taskName: editForm.taskName,
      description: editForm.description,
      priority: editForm.priority,
      assignedTo: editForm.assignedTo,
      plannedStartTime: editForm.plannedStartTime,
      plannedEndTime: editForm.plannedEndTime,
    })
      .then((response) => {
        if (response.success) {
          setShowEditModal(false);
          loadTask();
          Toast.show({
            type: 'success',
            text1: '保存成功',
            text2: '任务信息已更新',
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
      '确定要删除这个任务吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            taskService.deleteTask(id!)
              .then((response) => {
                if (response.success) {
                  Toast.show({
                    type: 'success',
                    text1: '删除成功',
                    text2: '任务已删除',
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

  if (loading) {
    return (
      <View style={commonStyles.pageContainer}>
        <ActivityIndicator size="large" color={AppStyles.colors.primary} />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={commonStyles.pageContainer}>
        <RNText style={styles.emptyText}>任务不存在</RNText>
      </View>
    );
  }

  const statusMap: Record<number, TaskStatus> = {
    0: 'todo',
    1: 'assigned',
    2: 'in_progress',
    3: 'completed',
    4: 'cancelled',
    5: 'failed',
    6: 'paused'
  };

  const priorityMap: Record<number, TaskPriority> = {
    0: 'low',
    1: 'medium',
    2: 'high',
    3: 'urgent'
  };

  const getStatusColor = (status: number): string => {
    const colors: Record<number, string> = {
      0: '#999',       // todo
      1: '#667eea',    // assigned
      2: '#1890ff',    // in_progress
      3: '#52c41a',    // completed
      4: '#d9d9d9',    // cancelled
      5: '#ff4d4f',    // failed
      6: '#faad14'     // paused
    };
    return colors[status] || '#999';
  };

  const getPriorityColor = (priority: number): string => {
    const colors: Record<number, string> = {
      0: '#52c41a',    // low
      1: '#1890ff',    // medium
      2: '#faad14',    // high
      3: '#ff4d4f'     // urgent
    };
    return colors[priority] || '#999';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '未设置';
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const statusOptions = [
    { value: 'todo', label: '待办', color: '#999' },
    { value: 'assigned', label: '已分配', color: '#667eea' },
    { value: 'in_progress', label: '进行中', color: '#1890ff' },
    { value: 'completed', label: '已完成', color: '#52c41a' },
    { value: 'cancelled', label: '已取消', color: '#d9d9d9' },
    { value: 'failed', label: '失败', color: '#ff4d4f' },
    { value: 'paused', label: '已暂停', color: '#faad14' }
  ];

  const priorityOptions = [
    { value: 'low', label: '低', color: '#52c41a' },
    { value: 'medium', label: '中', color: '#1890ff' },
    { value: 'high', label: '高', color: '#faad14' },
    { value: 'urgent', label: '紧急', color: '#ff4d4f' }
  ];

  const memberOptions = task.participants?.map(p => ({
    value: p.userId,
    label: p.username
  })) || [];

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
            <RNText style={styles.headerTitle}>任务详情</RNText>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setShowEditModal(true)}
            >
              <Ionicons name="create-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </RNView>
        </LinearGradient>

        {task && (
          <>
            {/* Task Info Card */}
            <View style={styles.infoCard}>
              <RNView style={styles.infoRow}>
                <RNView style={styles.infoIconContainer}>
                  <Ionicons name="document-text-outline" size={20} color={AppStyles.colors.primary} />
                </RNView>
                <View style={styles.infoContent}>
                  <RNText style={styles.infoLabel}>任务名称</RNText>
                  <RNText style={styles.infoValue}>{task.taskName}</RNText>
                </View>
              </RNView>

              <RNView style={styles.infoDivider} />

              <RNView style={styles.infoRow}>
                <RNView style={styles.infoIconContainer}>
                  <Ionicons name="library-outline" size={20} color={AppStyles.colors.primary} />
                </RNView>
                <View style={styles.infoContent}>
                  <RNText style={styles.infoLabel}>任务类型</RNText>
                  <RNText style={styles.infoValue}>{task.taskType}</RNText>
                </View>
              </RNView>

              <RNView style={styles.infoDivider} />

              <RNView style={styles.infoRow}>
                <RNView style={styles.infoIconContainer}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={AppStyles.colors.primary} />
                </RNView>
                <View style={styles.infoContent}>
                  <RNText style={styles.infoLabel}>状态</RNText>
                  <RNText style={[styles.infoValue, { color: getStatusColor(task.status) }]}>
                    {task.statusName}
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
                  <RNText style={[styles.infoValue, { color: getPriorityColor(task.priority) }]}>
                    {task.priorityName}
                  </RNText>
                </View>
              </RNView>

              <RNView style={styles.infoDivider} />

              {task.completionPercentage > 0 && (
                <>
                  <RNView style={styles.infoRow}>
                    <RNView style={styles.infoIconContainer}>
                      <Ionicons name="analytics-outline" size={20} color={AppStyles.colors.primary} />
                    </RNView>
                    <View style={styles.infoContent}>
                      <RNText style={styles.infoLabel}>完成进度</RNText>
                      <RNText style={styles.infoValue}>
                        {task.completionPercentage}%
                      </RNText>
                    </View>
                  </RNView>

                  <RNView style={styles.progressBarContainer}>
                    <RNView style={styles.progressBar}>
                      <RNView
                        style={[
                          styles.progressFill,
                          { width: `${task.completionPercentage}%` }
                        ]}
                      />
                    </RNView>
                  </RNView>
                </>
              )}
            </View>

            {/* Description */}
            {task.description && (
              <View style={styles.sectionCard}>
                <RNText style={styles.sectionTitle}>任务描述</RNText>
                <RNText style={styles.sectionContent}>{task.description}</RNText>
              </View>
            )}

            {/* Project */}
            {task.projectId && task.projectName && (
              <View style={styles.sectionCard}>
                <RNText style={styles.sectionTitle}>所属项目</RNText>
                <TouchableOpacity
                  style={styles.projectLink}
                  onPress={() => router.push(`/project-management/${task.projectId}`)}
                >
                  <RNView style={styles.projectLinkContent}>
                    <Ionicons name="folder-outline" size={24} color={AppStyles.colors.primary} />
                    <RNText style={styles.projectLinkText}>{task.projectName}</RNText>
                  </RNView>
                  <Ionicons name="chevron-forward" size={20} color={AppStyles.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}

            {/* Assignee */}
            {task.assignedToName && (
              <View style={styles.sectionCard}>
                <RNText style={styles.sectionTitle}> assigned To</RNText>
                <TouchableOpacity
                  style={styles.assigneeLink}
                  onPress={() => router.push(`/user-management/${task.assignedTo}`)}
                >
                  <RNView style={styles.assigneeLinkContent}>
                    <Ionicons name="person-circle-outline" size={40} color={AppStyles.colors.primary} />
                    <RNView style={styles.assigneeInfo}>
                      <RNText style={styles.assigneeName}>{task.assignedToName}</RNText>
                      <RNText style={styles.assigneeEmail}>{task.assignedTo}</RNText>
                    </RNView>
                  </RNView>
                </TouchableOpacity>
              </View>
            )}

            {/* Participants */}
            {task.participants && task.participants.length > 0 && (
              <View style={styles.sectionCard}>
                <RNText style={styles.sectionTitle}>参与人员</RNText>
                <RNView style={styles.participantsList}>
                  {task.participants.map((participant, index) => (
                    <RNView key={`${participant.userId}-${index}`} style={styles.participantItem}>
                      <Ionicons name="person-circle-outline" size={32} color={AppStyles.colors.primary} />
                      <RNView style={styles.participantInfo}>
                        <RNText style={styles.participantName}>{participant.username}</RNText>
                        {participant.email && (
                          <RNText style={styles.participantEmail}>{participant.email}</RNText>
                        )}
                      </RNView>
                    </RNView>
                  ))}
                </RNView>
              </View>
            )}

            {/* Dates */}
            {(task.plannedStartTime || task.plannedEndTime) && (
              <View style={styles.sectionCard}>
                <RNText style={styles.sectionTitle}>时间安排</RNText>
                <RNView style={styles.dateRow}>
                  <Ionicons name="calendar-outline" size={20} color={AppStyles.colors.textSecondary} />
                  <RNView style={styles.dateContent}>
                    <RNText style={styles.dateLabel}>计划开始</RNText>
                    <RNText style={styles.dateValue}>{formatDate(task.plannedStartTime)}</RNText>
                  </RNView>
                </RNView>
                <RNView style={styles.dateDivider} />
                <RNView style={styles.dateRow}>
                  <Ionicons name="calendar-outline" size={20} color={AppStyles.colors.textSecondary} />
                  <RNView style={styles.dateContent}>
                    <RNText style={styles.dateLabel}>计划结束</RNText>
                    <RNText style={styles.dateValue}>{formatDate(task.plannedEndTime)}</RNText>
                  </RNView>
                </RNView>
              </View>
            )}

            {/* Attachments */}
            {task.attachments && task.attachments.length > 0 && (
              <View style={styles.sectionCard}>
                <RNText style={styles.sectionTitle}>附件</RNText>
                <RNView style={styles.attachmentsList}>
                  {task.attachments.map((attachment, index) => (
                    <RNView key={`${attachment.id}-${index}`} style={styles.attachmentItem}>
                      <Ionicons name="attach-outline" size={24} color={AppStyles.colors.primary} />
                      <RNText style={styles.attachmentName} numberOfLines={1}>
                        {attachment.fileName}
                      </RNText>
                      <RNText style={styles.attachmentSize}>
                        {(attachment.fileSize / 1024).toFixed(1)} KB
                      </RNText>
                    </RNView>
                  ))}
                </RNView>
              </View>
            )}

            {/* Remarks */}
            {task.remarks && (
              <View style={styles.sectionCard}>
                <RNText style={styles.sectionTitle}>备注</RNText>
                <RNText style={styles.sectionContent}>{task.remarks}</RNText>
              </View>
            )}

            {/* Create Info */}
            <View style={styles.sectionCard}>
              <RNText style={styles.sectionTitle}>创建信息</RNText>
              <RNView style={styles.createInfoRow}>
                <RNView style={styles.createInfoIconContainer}>
                  <Ionicons name="person-outline" size={20} color={AppStyles.colors.textSecondary} />
                </RNView>
                <RNView style={styles.createInfoContent}>
                  <RNText style={styles.createInfoLabel}>创建人</RNText>
                  <RNText style={styles.createInfoValue}>{task.createdByName || task.createdBy}</RNText>
                </RNView>
              </RNView>
              <RNView style={styles.createInfoDivider} />
              <RNView style={styles.createInfoRow}>
                <RNView style={styles.createInfoIconContainer}>
                  <Ionicons name="time-outline" size={20} color={AppStyles.colors.textSecondary} />
                </RNView>
                <RNView style={styles.createInfoContent}>
                  <RNText style={styles.createInfoLabel}>创建时间</RNText>
                  <RNText style={styles.createInfoValue}>
                    {new Date(task.updatedAt).toLocaleString('zh-CN')}
                  </RNText>
                </RNView>
              </RNView>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setShowUpdateStatusModal(true)}
              >
                <Ionicons name="swap-horizontal-outline" size={24} color="#fff" />
                <RNText style={styles.actionButtonText}>更新状态</RNText>
              </TouchableOpacity>

              {task.status !== 3 && task.status !== 4 && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonSuccess]}
                  onPress={handleCompleteTask}
                >
                  <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
                  <RNText style={styles.actionButtonText}>完成任务</RNText>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleDelete}
              >
                <Ionicons name="trash-outline" size={24} color="#fff" />
                <RNText style={styles.actionButtonText}>删除</RNText>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Update Status Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showUpdateStatusModal}
        onRequestClose={() => setShowUpdateStatusModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <BlurView intensity={20} style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <RNText style={styles.modalTitle}>更新任务状态</RNText>
                <TouchableOpacity onPress={() => setShowUpdateStatusModal(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.formContainer}>
                {statusOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.statusOption,
                      task.status === statusMap[option.value] && styles.statusOptionActive
                    ]}
                    onPress={() => {
                      if (task.status !== statusMap[option.value]) {
                        handleUpdateStatus(option.value);
                      } else {
                        setShowUpdateStatusModal(false);
                      }
                    }}
                  >
                    <RNView style={[
                      styles.statusDot,
                      { backgroundColor: option.color }
                    ]} />
                    <RNText
                      style={[
                        styles.statusText,
                        task.status === statusMap[option.value] && styles.statusTextActive
                      ]}
                    >
                      {option.label}
                    </RNText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </BlurView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Complete Task Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showCompleteModal}
        onRequestClose={() => setShowCompleteModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <BlurView intensity={20} style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <RNText style={styles.modalTitle}>完成任务</RNText>
                <TouchableOpacity onPress={() => setShowCompleteModal(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.formContainer}>
                <View style={styles.formGroup}>
                  <RNText style={styles.label}>任务名称</RNText>
                  <RNText style={styles.infoValue}>{task.taskName}</RNText>
                </View>

                <View style={styles.formGroup}>
                  <RNText style={styles.label}>完成备注</RNText>
                  <TextInput
                    style={styles.textArea}
                    value={editForm.remarks}
                    onChangeText={(text) => setEditForm({ ...editForm, remarks: text })}
                    placeholder="请输入完成备注（可选）"
                    placeholderTextColor={AppStyles.colors.textSecondary}
                    multiline
                    numberOfLines={4}
                  />
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowCompleteModal(false)}
                >
                  <RNText style={styles.cancelButtonText}>取消</RNText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmButton, isSaving && styles.confirmButtonDisabled]}
                  onPress={confirmComplete}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <RNText style={styles.confirmButtonText}>确认完成</RNText>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Task Modal */}
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
                <RNText style={styles.modalTitle}>编辑任务</RNText>
                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.formContainer}>
                <View style={styles.formGroup}>
                  <RNText style={styles.label}>任务名称</RNText>
                  <TextInput
                    style={styles.input}
                    value={editForm.taskName}
                    onChangeText={(text) => setEditForm({ ...editForm, taskName: text })}
                    placeholder="请输入任务名称"
                    placeholderTextColor={AppStyles.colors.textSecondary}
                  />
                </View>

                <View style={styles.formGroup}>
                  <RNText style={styles.label}>描述</RNText>
                  <TextInput
                    style={styles.textArea}
                    value={editForm.description}
                    onChangeText={(text) => setEditForm({ ...editForm, description: text })}
                    placeholder="请输入任务描述（可选）"
                    placeholderTextColor={AppStyles.colors.textSecondary}
                    multiline
                    numberOfLines={4}
                  />
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

                <View style={styles.formGroup}>
                  <RNText style={styles.label}>分配给</RNText>
                  <ScrollView style={styles.dropdown}>
                    {memberOptions.length > 0 ? (
                      memberOptions.map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.dropdownItem,
                            editForm.assignedTo === option.value && styles.dropdownItemActive
                          ]}
                          onPress={() => setEditForm({ ...editForm, assignedTo: option.value })}
                        >
                          <RNText
                            style={[
                              styles.dropdownText,
                              editForm.assignedTo === option.value && styles.dropdownTextActive
                            ]}
                          >
                            {option.label}
                          </RNText>
                          {editForm.assignedTo === option.value && (
                            <Ionicons name="checkmark" size={20} color="#667eea" />
                          )}
                        </TouchableOpacity>
                      ))
                    ) : (
                      <RNText style={styles.emptyText}>无可用成员</RNText>
                    )}
                  </ScrollView>
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
  projectLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f7ff',
    borderRadius: 12,
  },
  projectLinkContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  projectLinkText: {
    fontSize: 16,
    fontWeight: '500',
    color: AppStyles.colors.text,
    marginLeft: 8,
  },
  assigneeLink: {
    padding: 12,
    backgroundColor: '#f5f7ff',
    borderRadius: 12,
  },
  assigneeLinkContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assigneeInfo: {
    marginLeft: 12,
    flex: 1,
  },
  assigneeName: {
    fontSize: 16,
    fontWeight: '600',
    color: AppStyles.colors.text,
  },
  assigneeEmail: {
    fontSize: 14,
    color: AppStyles.colors.textSecondary,
    marginTop: 2,
  },
  participantsList: {
    flexDirection: 'column',
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  participantInfo: {
    marginLeft: 12,
    flex: 1,
  },
  participantName: {
    fontSize: 15,
    fontWeight: '500',
    color: AppStyles.colors.text,
  },
  participantEmail: {
    fontSize: 13,
    color: AppStyles.colors.textSecondary,
    marginTop: 2,
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
  attachmentsList: {
    flexDirection: 'column',
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  attachmentName: {
    flex: 1,
    fontSize: 14,
    color: AppStyles.colors.text,
    marginLeft: 12,
  },
  attachmentSize: {
    fontSize: 12,
    color: AppStyles.colors.textSecondary,
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
  actionButtonSuccess: {
    backgroundColor: '#52c41a',
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
  dropdown: {
    backgroundColor: '#f5f7fa',
    borderRadius: 12,
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemActive: {
    backgroundColor: '#f0f7ff',
  },
  dropdownText: {
    fontSize: 14,
    color: AppStyles.colors.text,
  },
  dropdownTextActive: {
    color: '#667eea',
    fontWeight: '600',
  },
  statusOptions: {
    flexDirection: 'column',
    gap: 8,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  statusOptionActive: {
    backgroundColor: '#f0f7ff',
    borderWidth: 1,
    borderColor: '#667eea',
  },
  statusDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 12,
  },
  statusText: {
    flex: 1,
    fontSize: 16,
    color: '#666',
  },
  statusTextActive: {
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
