import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  View as RNView,
  Text as RNText,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import { AppStyles, commonStyles } from '../../constants/AppStyles';
import { taskService } from '../../services/taskService';
import { TaskDto, TaskStatus, TaskPriority } from '../../types/task';

export default function TaskListScreen() {
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | 'all'>('all');
  const [selectedPriority, setSelectedPriority] = useState<TaskPriority | 'all'>('all');



  const loadTasks = async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const statusMap: Record<TaskStatus | 'all', number | undefined> = {
        all: undefined,
        todo: 0,
        assigned: 1,
        in_progress: 2,
        completed: 3,
        cancelled: 4,
        failed: 5,
        paused: 6
      };

      const priorityMap: Record<TaskPriority | 'all', number | undefined> = {
        all: undefined,
        low: 0,
        medium: 1,
        high: 2,
        urgent: 3
      };

      const params: any = {
        page: 1,
        pageSize: 50
      };

      if (selectedStatus !== 'all') {
        params.status = statusMap[selectedStatus];
      }
      if (selectedPriority !== 'all') {
        params.priority = priorityMap[selectedPriority];
      }
      if (searchKeyword.trim()) {
        params.keyword = searchKeyword.trim();
      }

      const response = await taskService.getTasks(params);

      if (response.success) {
        setTasks(response.data || []);
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

    loadTasks();
  }, []);

  const onRefresh = () => {
    loadTasks(true);
  };

  const handleTaskPress = (task: TaskDto) => {
    router.push(`/task-management/${task.id}`);
  };

  const filteredTasks = tasks.filter(task => {
    const matchesStatus = selectedStatus === 'all' || task.status === statusMap(selectedStatus);
    const matchesPriority = selectedPriority === 'all' || task.priority === priorityMap(selectedPriority);
    const matchesKeyword = !searchKeyword ||
      task.taskName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchKeyword.toLowerCase()));

    return matchesStatus && matchesPriority && matchesKeyword;
  });

  const statusMap = (status: TaskStatus | 'all'): number | undefined => {
    const map: Record<TaskStatus | 'all', number | undefined> = {
      all: undefined,
      todo: 0,
      assigned: 1,
      in_progress: 2,
      completed: 3,
      cancelled: 4,
      failed: 5,
      paused: 6
    };
    return map[status];
  };

  const priorityMap = (priority: TaskPriority | 'all'): number | undefined => {
    const map: Record<TaskPriority | 'all', number | undefined> = {
      all: undefined,
      low: 0,
      medium: 1,
      high: 2,
      urgent: 3
    };
    return map[priority];
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

  if (loading) {
    return (
      <View style={commonStyles.pageContainer}>
        <ActivityIndicator size="large" color={AppStyles.colors.primary} />
      </View>
    );
  }

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
            <RNText style={styles.headerTitle}>任务管理</RNText>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowFilterModal(true)}
            >
              <Ionicons name="filter-outline" size={24} color="#fff" />
              <RNText style={styles.filterButtonText}>筛选</RNText>
            </TouchableOpacity>
          </RNView>
        </LinearGradient>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color={AppStyles.colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="搜索任务..."
              value={searchKeyword}
              onChangeText={setSearchKeyword}
              placeholderTextColor={AppStyles.colors.textSecondary}
            />
            {searchKeyword ? (
              <TouchableOpacity onPress={() => setSearchKeyword('')}>
                <Ionicons name="close-circle" size={20} color={AppStyles.colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Task Stats */}
        {filteredTasks.length > 0 && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <RNText style={styles.statValue}>{filteredTasks.length}</RNText>
              <RNText style={styles.statLabel}>任务</RNText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <RNText style={styles.statValue}>{filteredTasks.filter(t => t.status === 2).length}</RNText>
              <RNText style={styles.statLabel}>进行中</RNText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <RNText style={styles.statValue}>{filteredTasks.filter(t => t.status === 3).length}</RNText>
              <RNText style={styles.statLabel}>已完成</RNText>
            </View>
          </View>
        )}

        {/* Task List */}
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task, index) => (
            <TouchableOpacity
              key={task.id || index}
              style={[commonStyles.card, styles.taskCard]}
              onPress={() => handleTaskPress(task)}
            >
              <RNView style={styles.taskHeader}>
                <RNView style={styles.taskTitleContainer}>
                  <Text style={styles.taskTitle}>{task.taskName}</Text>
                  <RNText style={[styles.taskPriorityBadge, { backgroundColor: getPriorityColor(task.priority) }]}>
                    {task.priorityName}
                  </RNText>
                </RNView>
                <RNText style={[styles.taskStatusBadge, { color: getStatusColor(task.status) }]}>
                  {task.statusName}
                </RNText>
              </RNView>

              {task.description && (
                <RNText style={styles.taskDescription}>{task.description}</RNText>
              )}

              <RNView style={styles.taskFooter}>
                {task.projectId && task.projectName && (
                  <RNView style={styles.taskProject}>
                    <Ionicons name="folder-outline" size={14} color={AppStyles.colors.textSecondary} />
                    <RNText style={styles.taskProjectName}>{task.projectName}</RNText>
                  </RNView>
                )}
                {task.assignedToName && (
                  <RNView style={styles.taskAssignee}>
                    <Ionicons name="person-outline" size={14} color={AppStyles.colors.textSecondary} />
                    <RNText style={styles.taskAssigneeName}>{task.assignedToName}</RNText>
                  </RNView>
                )}
                {task.completionPercentage > 0 && (
                  <RNView style={styles.taskProgress}>
                    <RNView style={styles.progressBar}>
                      <RNView
                        style={[
                          styles.progressFill,
                          { width: `${task.completionPercentage}%` }
                        ]}
                      />
                    </RNView>
                    <RNText style={styles.progressText}>
                      {task.completionPercentage}%
                    </RNText>
                  </RNView>
                )}
              </RNView>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="clipboard-outline" size={64} color={AppStyles.colors.textTertiary} />
            <RNText style={styles.emptyText}>暂无任务</RNText>
            <RNText style={styles.emptySubtext}>
              {selectedStatus !== 'all' || selectedPriority !== 'all' || searchKeyword
                ? '尝试调整筛选条件'
                : '点击下方按钮创建新任务'}
            </RNText>
          </View>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showFilterModal}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <RNText style={styles.modalTitle}>筛选任务</RNText>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              {/* Status Filter */}
              <View style={styles.formGroup}>
                <RNText style={styles.label}>状态</RNText>
                <View style={styles.statusOptions}>
                  {(['all', 'todo', 'assigned', 'in_progress', 'completed', 'cancelled', 'failed', 'paused'] as TaskStatus[]).map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusOption,
                        selectedStatus === status && styles.statusOptionActive
                      ]}
                      onPress={() => setSelectedStatus(status)}
                    >
                      <RNText
                        style={[
                          styles.statusText,
                          selectedStatus === status && styles.statusTextActive
                        ]}
                      >
                        {status === 'all' ? '全部' : status}
                      </RNText>
                      {selectedStatus === status && (
                        <Ionicons name="checkmark" size={16} color="#667eea" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Priority Filter */}
              <View style={styles.formGroup}>
                <RNText style={styles.label}>优先级</RNText>
                <View style={styles.priorityOptions}>
                  {(['all', 'low', 'medium', 'high', 'urgent'] as TaskPriority[]).map((priority) => (
                    <TouchableOpacity
                      key={priority}
                      style={[
                        styles.priorityOption,
                        selectedPriority === priority && styles.priorityOptionActive
                      ]}
                      onPress={() => setSelectedPriority(priority)}
                    >
                      <RNText
                        style={[
                          styles.priorityText,
                          selectedPriority === priority && styles.priorityTextActive
                        ]}
                      >
                        {priority === 'all' ? '全部' : priority}
                      </RNText>
                      {selectedPriority === priority && (
                        <Ionicons name="checkmark" size={16} color="#667eea" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setSelectedStatus('all');
                  setSelectedPriority('all');
                }}
              >
                <RNText style={styles.cancelButtonText}>重置</RNText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => {
                  loadTasks();
                  setShowFilterModal(false);
                }}
              >
                <RNText style={styles.confirmButtonText}>应用</RNText>
              </TouchableOpacity>
            </View>
          </View>
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
    paddingBottom: 80,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  searchContainer: {
    padding: AppStyles.spacing.lg,
    paddingBottom: 0,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: AppStyles.borderRadius.lg,
    padding: 12,
    paddingHorizontal: 16,
    ...AppStyles.shadows.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: AppStyles.colors.text,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: AppStyles.borderRadius.lg,
    padding: 16,
    marginHorizontal: AppStyles.spacing.lg,
    marginTop: AppStyles.spacing.lg,
    ...AppStyles.shadows.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: AppStyles.colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: AppStyles.colors.textSecondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
  },
  taskCard: {
    padding: AppStyles.spacing.lg,
    marginHorizontal: AppStyles.spacing.lg,
    marginBottom: AppStyles.spacing.md,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: AppStyles.spacing.sm,
  },
  taskTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  taskTitle: {
    fontSize: AppStyles.fontSize.lg,
    fontWeight: '600',
    color: AppStyles.colors.text,
    marginRight: 8,
    flexShrink: 1,
  },
  taskPriorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  taskStatusBadge: {
    fontSize: 14,
    fontWeight: '600',
  },
  taskDescription: {
    fontSize: AppStyles.fontSize.sm,
    color: AppStyles.colors.textSecondary,
    marginBottom: AppStyles.spacing.sm,
    lineHeight: 20,
  },
  taskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  taskProject: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
  },
  taskProjectName: {
    fontSize: 12,
    color: AppStyles.colors.textSecondary,
    marginLeft: 4,
  },
  taskAssignee: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
  },
  taskAssigneeName: {
    fontSize: 12,
    color: AppStyles.colors.textSecondary,
    marginLeft: 4,
  },
  taskProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 'auto',
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: AppStyles.colors.primary,
  },
  progressText: {
    fontSize: 12,
    color: AppStyles.colors.textSecondary,
    minWidth: 30,
    textAlign: 'right',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: AppStyles.colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: AppStyles.colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
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
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    flexDirection: 'row',
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
    marginRight: 4,
  },
  statusTextActive: {
    color: '#667eea',
    fontWeight: '600',
  },
  priorityOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priorityOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    flexDirection: 'row',
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
    marginRight: 4,
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
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
