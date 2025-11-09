import React, { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/useThemeColor';

interface MessageComposerProps {
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly onSend: (content: string) => Promise<void>;
  readonly onPickAttachment?: () => Promise<void> | void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  disabled,
  placeholder = '发送消息…',
  onSend,
  onPickAttachment,
}) => {
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const containerBackground = useThemeColor({ light: '#ededed', dark: '#0f172a' }, 'background');
  const panelBackground = useThemeColor({ light: '#ffffff', dark: '#1f2937' }, 'card');
  const textColor = useThemeColor({}, 'text');
  const placeholderColor = useThemeColor({}, 'placeholder');
  const iconColor = useThemeColor({ light: '#4b5563', dark: '#cbd5f5' }, 'icon');
  const accentColor = useThemeColor({ light: '#07c160', dark: '#22c55e' }, 'tint');
  const disabledIconColor = useThemeColor({ light: '#9ca3af', dark: '#4b5563' }, 'tabIconDefault');
  const dividerColor = useThemeColor({ light: '#e5e7eb', dark: '#111827' }, 'border');

  const trimmedValue = useMemo(() => value.trim(), [value]);
  const canSend = trimmedValue.length > 0 && !disabled;

  const handleSend = useCallback(async () => {
    if (!canSend || submitting) {
      return;
    }
    try {
      setSubmitting(true);
      await onSend(trimmedValue);
      setValue('');
    } finally {
      setSubmitting(false);
    }
  }, [canSend, onSend, trimmedValue, submitting]);

  const handlePickAttachment = useCallback(async () => {
    if (!onPickAttachment || submitting || disabled) {
      return;
    }
    await Promise.resolve(onPickAttachment());
  }, [disabled, onPickAttachment, submitting]);

  const handleVoicePress = useCallback(() => {
    // 预留语音消息入口
  }, []);

  const handleEmojiPress = useCallback(() => {
    // 预留表情面板入口
  }, []);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <View style={[styles.container, { backgroundColor: containerBackground, borderTopColor: dividerColor }]}>
        <Pressable style={styles.iconButton} onPress={handleVoicePress} hitSlop={12}>
          <IconSymbol name="waveform" size={22} color={iconColor} />
        </Pressable>
        <View style={[styles.inputWrapper, { backgroundColor: panelBackground, borderColor: dividerColor }]}>
          <TextInput
            style={[styles.input, { color: textColor }]}
            placeholder={placeholder}
            placeholderTextColor={placeholderColor}
            value={value}
            onChangeText={setValue}
            multiline
            editable={!disabled && !submitting}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
        </View>
        <Pressable style={styles.iconButton} onPress={handleEmojiPress} hitSlop={12}>
          <IconSymbol name="face.smiling" size={22} color={iconColor} />
        </Pressable>
        {canSend ? (
          <Pressable
            style={[styles.sendChip, { backgroundColor: accentColor }]}
            onPress={handleSend}
            hitSlop={12}
            disabled={submitting}
          >
            <ThemedText style={styles.sendLabel}>发送</ThemedText>
          </Pressable>
        ) : (
          <Pressable
            style={styles.iconButton}
            onPress={handlePickAttachment}
            hitSlop={12}
            disabled={!onPickAttachment}
          >
            <IconSymbol
              name="plus"
              size={24}
              color={!onPickAttachment ? disabledIconColor : iconColor}
            />
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  iconButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 40,
    maxHeight: 120,
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    lineHeight: 20,
    maxHeight: 100,
  },
  sendChip: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MessageComposer;

