import React, { useCallback } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
interface AttachmentPickerProps {
  readonly onAttachmentSelected: (file: { uri: string; name: string; type: string; size: number }) => Promise<void>;
}

const AttachmentPicker: React.FC<AttachmentPickerProps> = ({ onAttachmentSelected }) => {
  const pickImage = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('权限不足', '请在设置中允许访问相册');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      base64: false,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    const asset = result.assets[0];
    await onAttachmentSelected({
      uri: asset.uri,
      name: asset.fileName ?? 'image.jpg',
      type: asset.type ?? 'image/jpeg',
      size: asset.fileSize ?? 0,
    });
  }, [onAttachmentSelected]);

  const pickDocument = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.type === 'cancel') {
      return;
    }

    await onAttachmentSelected({
      uri: result.uri,
      name: result.name,
      size: result.size ?? 0,
      type: result.mimeType ?? 'application/octet-stream',
    });
  }, [onAttachmentSelected]);

  return (
    <View style={styles.container}>
      <Pressable style={styles.button} onPress={pickImage}>
        <IconSymbol name="photo" size={20} />
        <ThemedText style={styles.label}>相册</ThemedText>
      </Pressable>
      <Pressable style={styles.button} onPress={pickDocument}>
        <IconSymbol name="doc" size={20} />
        <ThemedText style={styles.label}>文件</ThemedText>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
  },
  label: {
    marginLeft: 6,
    fontSize: 14,
  },
});

export default AttachmentPicker;


