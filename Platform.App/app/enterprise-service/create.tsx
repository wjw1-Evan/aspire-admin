import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { AppStyles } from '../../constants/AppStyles';
import { useTheme } from '../../utils/theme';
import { enterpriseService } from '../../services/enterpriseService';
import {
  PRIORITY_OPTIONS,
  ParkTenant,
} from '../../types/enterprise-service';
import Toast from 'react-native-toast-message';

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  localUri?: string;
}

export default function CreateEnterpriseServiceScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: AppStyles.spacing.md,
      paddingBottom: 40,
    },
    fieldGroup: {
      marginBottom: AppStyles.spacing.md,
    },
    label: {
      fontSize: AppStyles.fontSize.sm,
      fontWeight: '600',
      color: colors.text,
      marginBottom: AppStyles.spacing.sm,
    },
    required: {
      color: colors.error,
    },
    input: {
      backgroundColor: colors.cardBackground,
      borderRadius: AppStyles.borderRadius.md,
      padding: AppStyles.spacing.md,
      fontSize: AppStyles.fontSize.sm,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 48,
    },
    textArea: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    selectRow: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    selectOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: AppStyles.spacing.md,
      paddingVertical: AppStyles.spacing.sm,
      borderRadius: AppStyles.borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    selectOptionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '10',
    },
    selectOptionText: {
      fontSize: AppStyles.fontSize.sm,
      color: colors.textSecondary,
    },
    aiTagRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: AppStyles.spacing.sm,
    },
    aiTag: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: colors.primary + '20',
    },
    aiTagText: {
      fontSize: AppStyles.fontSize.xs,
      fontWeight: '600',
      color: colors.primary,
    },
    attachmentsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
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
    attachmentImage: {
      width: '100%',
      height: '100%',
    },
    removeAttachment: {
      position: 'absolute',
      top: 2,
      right: 2,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    addAttachment: {
      width: 80,
      height: 80,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: AppStyles.borderRadius.md,
      paddingVertical: AppStyles.spacing.md,
      alignItems: 'center',
      marginTop: AppStyles.spacing.md,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      fontSize: AppStyles.fontSize.md,
      fontWeight: '700',
      color: '#fff',
    },
    categorizingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 4,
    },
    categorizingText: {
      fontSize: AppStyles.fontSize.xs,
      color: colors.textTertiary,
    },
  }), [colors]);

  const [description, setDescription] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [tenantId, setTenantId] = useState<string | undefined>(undefined);
  const [tenantName, setTenantName] = useState('');
  const [tenants, setTenants] = useState<ParkTenant[]>([]);
  const [showTenantPicker, setShowTenantPicker] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [categorizing, setCategorizing] = useState(false);
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadTenants = useCallback(async () => {
    try {
      const res = await enterpriseService.getTenantList({ page: 1 });
      if (res.success && res.data) {
        setTenants(res.data.queryable || []);
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  const handleDescriptionBlur = useCallback(async () => {
    if (!description.trim() || suggestedCategory) return;
    setCategorizing(true);
    try {
      const res = await enterpriseService.suggestCategory(description.trim());
      if (res.success && res.data?.categoryName) {
        setSuggestedCategory(res.data.categoryName);
      }
    } catch {} finally {
      setCategorizing(false);
    }
  }, [description, suggestedCategory]);

  const handlePickImage = useCallback(async () => {
    try {
      const { launchImageLibraryAsync, MediaTypeOptions } = await import('expo-image-picker');
      const result = await launchImageLibraryAsync({
        mediaTypes: MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets) {
        for (const asset of result.assets) {
          const formData = new FormData();
          const filename = asset.fileName || asset.uri.split('/').pop() || 'photo.jpg';
          formData.append('file', {
            uri: asset.uri,
            type: asset.mimeType || 'image/jpeg',
            name: filename,
          } as any);

          const uploadRes = await enterpriseService.uploadFile(formData);
          if (uploadRes.success && uploadRes.data) {
            const downloadUrl = `/apiservice/api/cloud-storage/items/${uploadRes.data.id}/download`;
            setFiles((prev) => [
              ...prev,
              {
                id: uploadRes.data!.id,
                name: uploadRes.data!.name,
                url: downloadUrl,
                localUri: asset.uri,
              },
            ]);
          }
        }
      }
    } catch {}
  }, []);

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmit = async () => {
    if (!description.trim()) return;
    setSubmitting(true);
    try {
      const res = await enterpriseService.createRequest({
        description: description.trim(),
        contactPerson: contactPerson.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        priority,
        tenantId: tenantId || undefined,
        attachments: files.map((f) => f.url),
      });

      if (res.success) {
        Toast.show({
          type: 'success',
          text1: t('enterprise_service.create_success'),
        });
        router.back();
      } else {
        Toast.show({
          type: 'error',
          text1: res.message || t('common.fail'),
        });
      }
    } catch {} finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: AppStyles.spacing.md,
            paddingTop: 60,
            paddingBottom: AppStyles.spacing.sm,
          }}
        >
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, marginRight: 8 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: AppStyles.fontSize.lg, fontWeight: 'bold', color: colors.text }}>
            {t('enterprise_service.create')}
          </Text>
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              {t('enterprise_service.description')}
              <Text style={styles.required}> *</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t('enterprise_service.description_placeholder')}
              placeholderTextColor={colors.textTertiary}
              value={description}
              onChangeText={(text) => {
                setDescription(text);
                setSuggestedCategory(null);
              }}
              onBlur={handleDescriptionBlur}
              multiline
            />
            {categorizing && (
              <View style={styles.categorizingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.categorizingText}>
                  {t('enterprise_service.category_suggesting')}
                </Text>
              </View>
            )}
            {suggestedCategory && (
              <View style={styles.aiTagRow}>
                <Ionicons name="sparkles" size={16} color={colors.primary} />
                <Text style={{ fontSize: AppStyles.fontSize.xs, color: colors.textSecondary }}>
                  {t('enterprise_service.category_suggested')}:
                </Text>
                <View style={styles.aiTag}>
                  <Text style={styles.aiTagText}>{suggestedCategory}</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t('enterprise_service.attachments')}</Text>
            <View style={styles.attachmentsContainer}>
              {files.map((file) => (
                <View key={file.id} style={styles.attachmentItem}>
                  <Image
                    source={{ uri: file.localUri || file.url }}
                    style={styles.attachmentImage}
                  />
                  <TouchableOpacity
                    style={styles.removeAttachment}
                    onPress={() => handleRemoveFile(file.id)}
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {files.length < 9 && (
                <TouchableOpacity style={styles.addAttachment} onPress={handlePickImage}>
                  <Ionicons name="camera-outline" size={24} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t('enterprise_service.priority')}</Text>
            <View style={styles.selectRow}>
              {PRIORITY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.selectOption,
                    priority === opt.value && styles.selectOptionSelected,
                  ]}
                  onPress={() => setPriority(opt.value)}
                >
                  <Text
                    style={[
                      styles.selectOptionText,
                      priority === opt.value && { color: colors.primary, fontWeight: '600' },
                    ]}
                  >
                    {t(`enterprise_service.${opt.label}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t('enterprise_service.tenant')}</Text>
            <TouchableOpacity
              style={[styles.input, { justifyContent: 'center' }]}
              onPress={() => setShowTenantPicker(!showTenantPicker)}
            >
              <Text style={{ color: tenantName ? colors.text : colors.textTertiary }}>
                {tenantName || t('enterprise_service.select_tenant')}
              </Text>
            </TouchableOpacity>
            {showTenantPicker && (
              <View
                style={{
                  backgroundColor: colors.cardBackground,
                  borderRadius: AppStyles.borderRadius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginTop: 4,
                  maxHeight: 200,
                }}
              >
                <TouchableOpacity
                  style={{
                    paddingHorizontal: AppStyles.spacing.md,
                    paddingVertical: AppStyles.spacing.sm,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.border,
                  }}
                  onPress={() => {
                    setTenantId(undefined);
                    setTenantName('');
                    setShowTenantPicker(false);
                  }}
                >
                  <Text style={{ color: colors.textSecondary }}>{t('common.empty')}</Text>
                </TouchableOpacity>
                {tenants.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={{
                      paddingHorizontal: AppStyles.spacing.md,
                      paddingVertical: AppStyles.spacing.sm,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border,
                    }}
                    onPress={() => {
                      setTenantId(t.id);
                      setTenantName(t.tenantName);
                      setShowTenantPicker(false);
                    }}
                  >
                    <Text style={{ color: colors.text }}>{t.tenantName}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t('enterprise_service.contact_person')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('enterprise_service.contact_person_placeholder')}
              placeholderTextColor={colors.textTertiary}
              value={contactPerson}
              onChangeText={setContactPerson}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t('enterprise_service.contact_phone')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('enterprise_service.contact_phone_placeholder')}
              placeholderTextColor={colors.textTertiary}
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, (!description.trim() || submitting) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!description.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </>
  );
}
