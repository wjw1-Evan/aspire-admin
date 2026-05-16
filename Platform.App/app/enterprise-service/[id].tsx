import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppStyles, createCommonStyles } from '../../constants/AppStyles';
import { useTheme } from '../../utils/theme';
import { enterpriseService } from '../../services/enterpriseService';
import {
  ServiceRequestDto,
  getPriorityInfo,
  getStatusInfo,
  STATUS_OPTIONS,
} from '../../types/enterprise-service';
import LoadingView from '../../components/ui/LoadingView';
import ErrorView from '../../components/ui/ErrorView';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { formatDate } from '../../utils/task';

export default function EnterpriseServiceDetailScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const comStyles = useMemo(() => createCommonStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: AppStyles.spacing.md,
      paddingBottom: 40,
    },
    sectionTitle: {
      fontSize: AppStyles.fontSize.md,
      fontWeight: '600',
      color: colors.text,
      marginBottom: AppStyles.spacing.md,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: AppStyles.spacing.sm,
    },
    infoIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: AppStyles.spacing.sm,
    },
    infoLabel: {
      fontSize: AppStyles.fontSize.sm,
      color: colors.textSecondary,
      flex: 1,
    },
    infoValue: {
      fontSize: AppStyles.fontSize.sm,
      color: colors.text,
      fontWeight: '500',
      flex: 2,
      textAlign: 'right',
    },
    descText: {
      fontSize: AppStyles.fontSize.sm,
      color: colors.text,
      lineHeight: 22,
      marginTop: AppStyles.spacing.xs,
    },
    tagRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    tag: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    tagText: {
      fontSize: AppStyles.fontSize.xs,
      fontWeight: '600',
    },
    attachmentsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: AppStyles.spacing.sm,
    },
    attachmentItem: {
      width: 80,
      height: 80,
      borderRadius: 8,
      backgroundColor: colors.borderLight,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    timeline: {
      marginTop: AppStyles.spacing.sm,
    },
    timelineItem: {
      flexDirection: 'row',
      marginBottom: AppStyles.spacing.md,
    },
    timelineDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginTop: 4,
      marginRight: 12,
    },
    timelineLine: {
      position: 'absolute',
      left: 5,
      top: 16,
      bottom: -16,
      width: 2,
      backgroundColor: colors.borderLight,
    },
    timelineContent: {
      flex: 1,
    },
    timelineStatusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    timelineDate: {
      fontSize: AppStyles.fontSize.xs,
      color: colors.textTertiary,
      marginTop: 2,
    },
    timelineDetail: {
      fontSize: AppStyles.fontSize.xs,
      color: colors.textSecondary,
      marginTop: 2,
    },
    actionBar: {
      flexDirection: 'row',
      paddingHorizontal: AppStyles.spacing.md,
      paddingVertical: AppStyles.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.cardBackground,
      gap: 8,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: AppStyles.spacing.sm + 2,
      borderRadius: AppStyles.borderRadius.md,
      gap: 4,
    },
    actionButtonText: {
      fontSize: AppStyles.fontSize.sm,
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: AppStyles.spacing.lg,
      maxHeight: '80%',
    },
    modalTitle: {
      fontSize: AppStyles.fontSize.lg,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: AppStyles.spacing.md,
      textAlign: 'center',
    },
    modalOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: AppStyles.spacing.md,
      paddingHorizontal: AppStyles.spacing.sm,
      borderRadius: AppStyles.borderRadius.md,
      marginBottom: AppStyles.spacing.xs,
    },
    modalOptionSelected: {
      backgroundColor: colors.primary + '15',
    },
    modalOptionText: {
      fontSize: AppStyles.fontSize.md,
      color: colors.text,
      marginLeft: AppStyles.spacing.sm,
      flex: 1,
    },
    modalInput: {
      backgroundColor: colors.background,
      borderRadius: AppStyles.borderRadius.md,
      padding: AppStyles.spacing.md,
      fontSize: AppStyles.fontSize.sm,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: AppStyles.spacing.md,
      minHeight: 80,
      textAlignVertical: 'top',
    },
    modalActions: {
      flexDirection: 'row',
      gap: AppStyles.spacing.md,
      marginTop: AppStyles.spacing.sm,
    },
    modalButton: {
      flex: 1,
      paddingVertical: AppStyles.spacing.md - 2,
      borderRadius: AppStyles.borderRadius.md,
      alignItems: 'center',
    },
    starContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      marginBottom: AppStyles.spacing.md,
    },
    noHistory: {
      fontSize: AppStyles.fontSize.sm,
      color: colors.textTertiary,
      textAlign: 'center',
      paddingVertical: AppStyles.spacing.md,
    },
  }), [colors]);

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [request, setRequest] = useState<ServiceRequestDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [rateModalVisible, setRateModalVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [resolution, setResolution] = useState('');
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await enterpriseService.getRequestById(id);
      if (res.success && res.data) {
        setRequest(res.data);
      } else {
        setError(res.message || t('enterprise_service.load_failed'));
      }
    } catch (err: any) {
      setError(err?.message || t('common.network_error'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async () => {
    setDeleteConfirmVisible(false);
    try {
      const res = await enterpriseService.deleteRequest(id);
      if (res.success) {
        router.back();
      }
    } catch {}
  };

  const handleUpdateStatus = async () => {
    if (!selectedStatus) return;
    setSubmitting(true);
    try {
      const res = await enterpriseService.updateRequestStatus(id, {
        status: selectedStatus,
        resolution: resolution || undefined,
      });
      if (res.success) {
        setStatusModalVisible(false);
        setResolution('');
        await loadData();
      }
    } catch {} finally {
      setSubmitting(false);
    }
  };

  const handleRate = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      const res = await enterpriseService.rateRequest(id, {
        rating,
        feedback: feedback || undefined,
      });
      if (res.success) {
        setRateModalVisible(false);
        setRating(0);
        setFeedback('');
        await loadData();
      }
    } catch {} finally {
      setSubmitting(false);
    }
  };

  const openStatusModal = () => {
    if (!request) return;
    setSelectedStatus(request.status);
    setResolution('');
    setStatusModalVisible(true);
  };

  const openRateModal = () => {
    setRating(0);
    setFeedback('');
    setRateModalVisible(true);
  };

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} onRetry={loadData} />;
  if (!request) return <ErrorView message={t('enterprise_service.load_failed')} />;

  const priorityInfo = getPriorityInfo(request.priority);
  const statusInfo = getStatusInfo(request.status);
  const canEdit = request.status !== 'Completed' && request.status !== 'Cancelled';
  const canRate = request.status === 'Completed' && !request.rating;

  const renderStatusOption = (opt: typeof STATUS_OPTIONS[number]) => {
    const isSelected = selectedStatus === opt.value;
    return (
      <TouchableOpacity
        key={opt.value}
        style={[styles.modalOption, isSelected && styles.modalOptionSelected]}
        onPress={() => setSelectedStatus(opt.value)}
      >
        <View style={[styles.tag, { backgroundColor: opt.color + '20' }]}>
          <Text style={[styles.tagText, { color: opt.color }]}>
            {t(`enterprise_service.${opt.label.replace('status_', 'status_')}`)}
          </Text>
        </View>
        <Text style={styles.modalOptionText}>
          {t(`enterprise_service.${opt.label}`)}
        </Text>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: t('enterprise_service.detail'),
          headerRight: () => (
            <TouchableOpacity
              onPress={() => setDeleteConfirmVisible(true)}
              style={{ padding: 8 }}
            >
              <Ionicons name="trash-outline" size={22} color={colors.error} />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={comStyles.card}>
            <Text style={styles.sectionTitle}>{t('enterprise_service.basic_info')}</Text>
            <View style={styles.tagRow}>
              <View style={[styles.tag, { backgroundColor: priorityInfo.color + '20' }]}>
                <Text style={[styles.tagText, { color: priorityInfo.color }]}>
                  {t(`enterprise_service.${priorityInfo.label}`)}
                </Text>
              </View>
              <View style={[styles.tag, { backgroundColor: statusInfo.color + '20' }]}>
                <Text style={[styles.tagText, { color: statusInfo.color }]}>
                  {t(`enterprise_service.${statusInfo.label}`)}
                </Text>
              </View>
              {request.categoryName && (
                <View style={[styles.tag, { backgroundColor: colors.borderLight }]}>
                  <Text style={[styles.tagText, { color: colors.textTertiary }]}>
                    {request.categoryName}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={comStyles.card}>
            <Text style={styles.sectionTitle}>{t('enterprise_service.description')}</Text>
            <Text style={styles.descText}>
              {request.description || '-'}
            </Text>
          </View>

          <View style={comStyles.card}>
            <Text style={styles.sectionTitle}>{t('enterprise_service.basic_info')}</Text>
            {request.tenantName && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="business-outline" size={16} color={colors.textSecondary} />
                </View>
                <Text style={styles.infoLabel}>{t('enterprise_service.tenant')}</Text>
                <Text style={styles.infoValue}>{request.tenantName}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
              </View>
              <Text style={styles.infoLabel}>{t('enterprise_service.contact_person')}</Text>
              <Text style={styles.infoValue}>{request.contactPerson || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
              </View>
              <Text style={styles.infoLabel}>{t('enterprise_service.contact_phone')}</Text>
              <Text style={styles.infoValue}>{request.contactPhone || '-'}</Text>
            </View>
            {request.assignedToName && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="person-circle-outline" size={16} color={colors.textSecondary} />
                </View>
                <Text style={styles.infoLabel}>{t('enterprise_service.assigned_to')}</Text>
                <Text style={styles.infoValue}>{request.assignedToName}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              </View>
              <Text style={styles.infoLabel}>{t('enterprise_service.created_at')}</Text>
              <Text style={styles.infoValue}>
                {formatDate(request.createdAt, 'datetime')}
              </Text>
            </View>
            {request.completedAt && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
                </View>
                <Text style={styles.infoLabel}>{t('enterprise_service.completed_at')}</Text>
                <Text style={styles.infoValue}>
                  {formatDate(request.completedAt, 'datetime')}
                </Text>
              </View>
            )}
            {request.rating && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="star" size={16} color={colors.warning} />
                </View>
                <Text style={styles.infoLabel}>{t('enterprise_service.rating')}</Text>
                <Text style={[styles.infoValue, { color: colors.warning }]}>
                  {'★'.repeat(request.rating)}{'☆'.repeat(5 - request.rating)} {request.rating}
                </Text>
              </View>
            )}
          </View>

          {request.attachments && request.attachments.length > 0 && (
            <View style={comStyles.card}>
              <Text style={styles.sectionTitle}>{t('enterprise_service.attachments')}</Text>
              <View style={styles.attachmentsContainer}>
                {request.attachments.map((url, index) => (
                  <View key={`${url}-${index}`} style={styles.attachmentItem}>
                    <Ionicons name="image-outline" size={32} color={colors.textTertiary} />
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={comStyles.card}>
            <Text style={styles.sectionTitle}>{t('enterprise_service.status_history')}</Text>
            {request.statusHistory && request.statusHistory.length > 0 ? (
              <View style={styles.timeline}>
                {request.statusHistory.map((h, index) => {
                  const fromInfo = getStatusInfo(h.fromStatus);
                  const toInfo = getStatusInfo(h.toStatus);
                  const isLast = index === (request.statusHistory?.length || 0) - 1;
                  return (
                    <View key={`${h.changedAt}-${index}`} style={styles.timelineItem}>
                      <View>
                        <View style={[styles.timelineDot, { backgroundColor: toInfo.color }]} />
                        {!isLast && <View style={[styles.timelineLine, { backgroundColor: colors.borderLight }]} />}
                      </View>
                      <View style={styles.timelineContent}>
                        <View style={styles.timelineStatusRow}>
                          <Text style={{ fontSize: AppStyles.fontSize.xs, color: colors.textSecondary }}>
                            {t(`enterprise_service.${fromInfo.label}`)}
                          </Text>
                          <Ionicons name="arrow-forward" size={12} color={colors.textTertiary} />
                          <Text style={{ fontSize: AppStyles.fontSize.xs, fontWeight: '600', color: toInfo.color }}>
                            {t(`enterprise_service.${toInfo.label}`)}
                          </Text>
                        </View>
                        <Text style={styles.timelineDate}>
                          {formatDate(h.changedAt, 'datetime')}
                        </Text>
                        {h.handledBy && (
                          <Text style={styles.timelineDetail}>
                            {t('enterprise_service.handler')}: {h.handledBy}
                          </Text>
                        )}
                        {h.comment && (
                          <Text style={styles.timelineDetail}>
                            {t('enterprise_service.handling_result')}: {h.comment}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.noHistory}>{t('common.empty')}</Text>
            )}
          </View>
        </ScrollView>

        <View style={styles.actionBar}>
          {canEdit && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary + '15' }]}
                onPress={() => router.push(`/enterprise-service/edit/${id}`)}
              >
                <Ionicons name="pencil-outline" size={18} color={colors.primary} />
                <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                  {t('common.edit')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.warning + '15' }]}
                onPress={openStatusModal}
              >
                <Ionicons name="swap-horizontal-outline" size={18} color={colors.warning} />
                <Text style={[styles.actionButtonText, { color: colors.warning }]}>
                  {t('enterprise_service.update_status')}
                </Text>
              </TouchableOpacity>
            </>
          )}
          {canRate && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.warning + '15' }]}
              onPress={openRateModal}
            >
              <Ionicons name="star-outline" size={18} color={colors.warning} />
              <Text style={[styles.actionButtonText, { color: colors.warning }]}>
                {t('enterprise_service.rate_service')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ConfirmModal
        visible={deleteConfirmVisible}
        title={t('enterprise_service.delete_confirm_title')}
        message={t('enterprise_service.delete_confirm_message')}
        icon="trash-outline"
        iconColor={colors.error}
        confirmText={t('enterprise_service.delete_confirm_btn')}
        confirmColor={colors.error}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmVisible(false)}
      />

      <Modal
        visible={statusModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('enterprise_service.update_status')}</Text>
            {STATUS_OPTIONS.map(renderStatusOption)}
            <TextInput
              style={styles.modalInput}
              placeholder={t('enterprise_service.resolution_placeholder')}
              placeholderTextColor={colors.textTertiary}
              value={resolution}
              onChangeText={setResolution}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.borderLight }]}
                onPress={() => setStatusModalVisible(false)}
              >
                <Text style={{ fontSize: AppStyles.fontSize.md, fontWeight: '600', color: colors.textSecondary }}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleUpdateStatus}
                disabled={submitting || !selectedStatus}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ fontSize: AppStyles.fontSize.md, fontWeight: '600', color: '#fff' }}>
                    {t('common.confirm')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={rateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('enterprise_service.rate_service')}</Text>
            <View style={styles.starContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={36}
                    color={star <= rating ? colors.warning : colors.textTertiary}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder={t('enterprise_service.feedback_placeholder')}
              placeholderTextColor={colors.textTertiary}
              value={feedback}
              onChangeText={setFeedback}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.borderLight }]}
                onPress={() => setRateModalVisible(false)}
              >
                <Text style={{ fontSize: AppStyles.fontSize.md, fontWeight: '600', color: colors.textSecondary }}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.warning }]}
                onPress={handleRate}
                disabled={submitting || rating === 0}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ fontSize: AppStyles.fontSize.md, fontWeight: '600', color: '#fff' }}>
                    {t('common.confirm')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
