import React, { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';

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
  const { theme } = useTheme();
  const containerBackground = theme.mode === 'light' ? '#F4F4F4' : '#121212';
  const panelBackground = theme.colors.listBackground;
  const textColor = theme.colors.text;
  const placeholderColor = theme.colors.placeholder;
  const iconColor = theme.colors.icon;
  const accentColor = theme.colors.accent;
  const disabledIconColor = theme.colors.secondaryText;
  const dividerColor = theme.colors.border;
  const sendActiveColor = theme.colors.accent;
  const sendInactiveColor = theme.mode === 'light' ? '#B8B8B8' : '#2F2F2F';
  const sendTextActiveColor = theme.colors.accentContrastText;
  const sendTextInactiveColor = theme.colors.tertiaryText;

  const trimmedValue = useMemo(() => value.trim(), [value]);
  const showSendChip = trimmedValue.length > 0;
  const sendDisabled = disabled || submitting || trimmedValue.length === 0;

  const handleSend = useCallback(async () => {
    if (sendDisabled) {
      return;
    }
    try {
      setSubmitting(true);
      await onSend(trimmedValue);
      setValue('');
    } finally {
      setSubmitting(false);
    }
  }, [onSend, sendDisabled, trimmedValue]);

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
        {showSendChip ? (
          <Pressable
            style={[
              styles.sendChip,
              { backgroundColor: sendDisabled ? sendInactiveColor : sendActiveColor },
            ]}
            onPress={handleSend}
            hitSlop={12}
            disabled={sendDisabled}
          >
            <ThemedText
              type="bodyStrong"
              style={{
                color: sendDisabled ? sendTextInactiveColor : sendTextActiveColor,
                fontSize: 14,
              }}
            >
              {submitting ? '发送中…' : '发送'}
            </ThemedText>
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
});

export default MessageComposer;

