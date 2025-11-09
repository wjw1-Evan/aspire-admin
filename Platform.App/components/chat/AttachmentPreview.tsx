import React, { useMemo } from 'react';
import { Image, Linking, Pressable, StyleSheet, View } from 'react-native';

import type { AttachmentMetadata } from '@/types/chat';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';

interface AttachmentPreviewProps {
  readonly attachment: AttachmentMetadata;
}

const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({ attachment }) => {
  const { theme } = useTheme();
  const isImage = useMemo(() => attachment.mimeType?.startsWith('image/') ?? false, [attachment.mimeType]);
  const captionColor = theme.colors.tertiaryText;
  const fileBackground = theme.colors.cardMuted;
  const fileBorderColor = theme.colors.border;
  const fileTextColor = theme.colors.text;
  const fileMetaColor = theme.colors.tertiaryText;
  const iconColor = theme.colors.icon;

  const handlePress = () => {
    if (attachment.url) {
      Linking.openURL(attachment.url).catch(error => console.error('Failed to open attachment:', error));
    }
  };

  if (isImage) {
    return (
      <Pressable style={styles.imageContainer} onPress={handlePress}>
        <Image source={{ uri: attachment.thumbnailUri ?? attachment.url }} style={styles.image} resizeMode="cover" />
        <ThemedText style={[styles.imageCaption, { color: captionColor }]} numberOfLines={1}>
          {attachment.name}
        </ThemedText>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[
        styles.fileContainer,
        { backgroundColor: fileBackground, borderColor: fileBorderColor },
      ]}
      onPress={handlePress}
    >
      <View style={styles.fileIconWrapper}>
        <IconSymbol name="doc.fill" size={20} color={iconColor} />
      </View>
      <View style={styles.fileInfo}>
        <ThemedText style={[styles.fileName, { color: fileTextColor }]} numberOfLines={1}>
          {attachment.name}
        </ThemedText>
        <ThemedText style={[styles.fileMeta, { color: fileMetaColor }]} numberOfLines={1}>
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
    borderWidth: StyleSheet.hairlineWidth,
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


