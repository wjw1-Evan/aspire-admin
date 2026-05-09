import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  View as RNView,
  Text as RNText,
  TextInput,
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
import { projectService } from '../../services/projectService';
import { ProjectDto, ProjectStatus, ProjectPriority } from '../../types/project';
import { authService } from '../../services/authService';

export default function ProjectListScreen() {
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus | 'all'>('all');
  const [selectedPriority, setSelectedPriority] = useState<ProjectPriority | 'all'>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);

  const loadProjects = async () => {
    try {
      const params: any = {
        page: 1,
        pageSize: 50
      };

      if (searchKeyword.trim()) {
        params.keyword = searchKeyword.trim();
      }

      const response = await projectService.getProjects(params);

      if (response.success) {
        setProjects(response.data || []);
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
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadProjects().then(() => setRefreshing(false));
  };

  const handleProjectPress = (project: ProjectDto) => {
    router.push(`/project-management/${project.id}`);
  };

  const filteredProjects = projects.filter(project => {
    const matchesStatus = selectedStatus === 'all' || project.status === statusMap(selectedStatus);
    const matchesPriority = selectedPriority === 'all' || project.priority === priorityMap(selectedPriority);
    const matchesKeyword = !searchKeyword ||
      project.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(searchKeyword.toLowerCase()));

    return matchesStatus && matchesPriority && matchesKeyword;
  });

  const statusMap = (status: ProjectStatus | 'all'): number | undefined => {
    const map: Record<ProjectStatus | 'all', number | undefined> = {
      all: undefined,
      planning: 0,
      in_progress: 1,
      on_hold: 2,
      completed: 3,
      cancelled: 4
    };
    return map[status];
  };

  const priorityMap = (priority: ProjectPriority | 'all'): number | undefined => {
    const map: Record<ProjectPriority | 'all', number | undefined> = {
      all: undefined,
      low: 0,
      medium: 1,
      high: 2
    };
    return map[priority];
  };

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

  const statusOptions = [
    { value: 'all', label: '全部', color: '#999' },
    { value: 'planning', label: '规划中', color: '#999' },
    { value: 'in_progress', label: '进行中', color: '#1890ff' },
    { value: 'on_hold', label: '暂停', color: '#faad14' },
    { value: 'completed', label: '已完成', color: '#52c41a' },
    { value: 'cancelled', label: '已取消', color: '#d9d9d9' }
  ];

  const priorityOptions = [
    { value: 'all', label: '全部', color: '#999' },
    { value: 'low', label: '低', color: '#52c41a' },
    { value: 'medium', label: '中', color: '#1890ff' },
    { value: 'high', label: '高', color: '#faad14' }
  ];

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
          <RNText style={styles.headerTitle}>项目管理</RNText>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons name="filter-outline" size={24} color="#fff" />
            <RNText style={styles.filterButtonText}>筛选</RNText>
          </TouchableOpacity>
        </LinearGradient>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color={AppStyles.colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="搜索项目..."
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

        {/* Project Stats */}
        {filteredProjects.length > 0 && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <RNText style={styles.statValue}>{filteredProjects.length}</RNText>
              <RNText style={styles.statLabel}>项目</RNText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <RNText style={styles.statValue}>{filteredProjects.filter(p => p.status === 1).length}</RNText>
              <RNText style={styles.statLabel}>进行中</RNText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <RNText style={styles.statValue}>{filteredProjects.filter(p => p.status === 3).length}</RNText>
              <RNText style={styles.statLabel}>已完成</RNText>
            </View>
          </View>
        )}

        {/* Project List */}
        {filteredProjects.length > 0 ? (
          filteredProjects.map((project, index) => (
            <TouchableOpacity
              key={project.id || index}
              style={[commonStyles.card, styles.projectCard]}
              onPress={() => handleProjectPress(project)}
            >
              <RNView style={styles.projectHeader}>
                <RNView style={styles.projectTitleContainer}>
                  <Ionicons name="folder-outline" size={24} color={AppStyles.colors.primary} />
                  <RNText style={styles.projectTitle}>{project.name}</RNText>
                </RNView>
                <RNText style={[styles.projectStatusBadge, { color: getStatusColor(project.status) }]}>
                  {project.statusName}
                </RNText>
              </RNView>

              {project.description && (
                <RNText style={styles.projectDescription}>{project.description}</RNText>
              )}

              <RNView style={styles.projectFooter}>
                {project.progress > 0 && (
                  <RNView style={styles.projectProgress}>
                    <RNView style={styles.progressBar}>
                      <RNView
                        style={[
                          styles.progressFill,
                          { width: `${project.progress}%` }
                        ]}
                      />
                    </RNView>
                    <RNText style={styles.progressText}>
                      {project.progress}%
                    </RNText>
                  </RNView>
                )}
                {project.priority > 0 && (
                  <RNText style={[styles.projectPriorityBadge, { backgroundColor: getPriorityColor(project.priority) }]}>
                    {project.priorityName}
                  </RNText>
                )}
              </RNView>

              <RNView style={styles.projectMemberCount}>
                <Ionicons name="people-outline" size={14} color={AppStyles.colors.textSecondary} />
                <RNText style={styles.memberCountText}>
                  {project.projectMembers?.length || 0} 成员
                </RNText>
              </RNView>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={64} color={AppStyles.colors.textTertiary} />
            <RNText style={styles.emptyText}>暂无项目</RNText>
            <RNText style={styles.emptySubtext}>
              {selectedStatus !== 'all' || selectedPriority !== 'all' || searchKeyword
                ? '尝试调整筛选条件'
                : '点击下方按钮创建新项目'}
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
              <RNText style={styles.modalTitle}>筛选项目</RNText>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              {/* Status Filter */}
              <View style={styles.formGroup}>
                <RNText style={styles.label}>状态</RNText>
                <View style={styles.statusOptions}>
                  {statusOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.statusOption,
                        selectedStatus === option.value && styles.statusOptionActive
                      ]}
                      onPress={() => setSelectedStatus(option.value as ProjectStatus)}
                    >
                      <RNText
                        style={[
                          styles.statusText,
                          selectedStatus === option.value && styles.statusTextActive
                        ]}
                      >
                        {option.label}
                      </RNText>
                      {selectedStatus === option.value && (
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
                  {priorityOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.priorityOption,
                        selectedPriority === option.value && styles.priorityOptionActive
                      ]}
                      onPress={() => setSelectedPriority(option.value as ProjectPriority)}
                    >
                      <RNText
                        style={[
                          styles.priorityText,
                          selectedPriority === option.value && styles.priorityTextActive
                        ]}
                      >
                        {option.label}
                      </RNText>
                      {selectedPriority === option.value && (
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
                  loadProjects();
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
  projectCard: {
    padding: AppStyles.spacing.lg,
    marginHorizontal: AppStyles.spacing.lg,
    marginBottom: AppStyles.spacing.md,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: AppStyles.spacing.sm,
  },
  projectTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  projectTitle: {
    fontSize: AppStyles.fontSize.lg,
    fontWeight: '600',
    color: AppStyles.colors.text,
    marginLeft: 8,
    flexShrink: 1,
  },
  projectStatusBadge: {
    fontSize: 14,
    fontWeight: '600',
  },
  projectDescription: {
    fontSize: AppStyles.fontSize.sm,
    color: AppStyles.colors.textSecondary,
    marginBottom: AppStyles.spacing.sm,
    lineHeight: 20,
  },
  projectFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  projectProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  projectPriorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  projectMemberCount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: AppStyles.spacing.sm,
    paddingTop: AppStyles.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  memberCountText: {
    fontSize: 12,
    color: AppStyles.colors.textSecondary,
    marginLeft: 4,
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
