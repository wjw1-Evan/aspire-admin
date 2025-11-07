import React, { useMemo } from 'react';
import { Image, Linking, Pressable, StyleSheet, View } from 'react-native';

import type { AttachmentMetadata } from '@/types/chat';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface AttachmentPreviewProps {
  readonly attachment: AttachmentMetadata;
}

const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({ attachment }) => {
  const isImage = useMemo(() => attachment.mimeType?.startsWith('image/') ?? false, [attachment.mimeType]);

  const handlePress = () => {
    if (attachment.url) {
      Linking.openURL(attachment.url).catch(error => console.error('Failed to open attachment:', error));
    }
  };

  if (isImage) {
    return (
      <Pressable style={styles.imageContainer} onPress={handlePress}>
        <Image source={{ uri: attachment.thumbnailUri ?? attachment.url }} style={styles.image} resizeMode="cover" />
        <ThemedText style={styles.imageCaption} numberOfLines={1}>
          {attachment.name}
        </ThemedText>
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.fileContainer} onPress={handlePress}>
      <View style={styles.fileIconWrapper}>
        <IconSymbol name="doc.fill" size={20} />
      </View>
      <View style={styles.fileInfo}>
        <ThemedText style={styles.fileName} numberOfLines={1}>
          {attachment.name}
        </ThemedText>
        <ThemedText style={styles.fileMeta} numberOfLines={1}>
          {attachment.mimeType} · {Math.round((attachment.size ?? 0) / 1024)} KB
        </ThemedText>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  imageContainer: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: 180,
    height: 120,
    borderRadius: 12,
  },
  imageCaption: {
    marginTop: 4,
    fontSize: 12,
    opacity: 0.7,
  },
  fileContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  fileIconWrapper: {
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '500',
  },
  fileMeta: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
});

export default AttachmentPreview;


