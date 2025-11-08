import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

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
  placeholder = '发送消息...',
  onSend,
  onPickAttachment,
}) => {
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const backgroundColor = useThemeColor({ light: '#f3f4f6', dark: '#1f2937' }, 'background');

  const handleSend = useCallback(async () => {
    if (!value.trim() || submitting || disabled) {
      return;
    }
    try {
      setSubmitting(true);
      await onSend(value.trim());
      setValue('');
    } finally {
      setSubmitting(false);
    }
  }, [disabled, onSend, submitting, value]);

  const handlePickAttachment = useCallback(async () => {
    if (!onPickAttachment || submitting || disabled) {
      return;
    }
    await Promise.resolve(onPickAttachment());
  }, [disabled, onPickAttachment, submitting]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <View style={[styles.container, { backgroundColor }]}>
        {onPickAttachment && (
          <Pressable style={styles.iconButton} onPress={handlePickAttachment} hitSlop={12}>
            <IconSymbol name="paperclip" size={22} />
          </Pressable>
        )}
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#878a96"
          value={value}
          onChangeText={setValue}
          multiline
          editable={!disabled && !submitting}
        />
        <Pressable
          style={[styles.iconButton, styles.sendButton]}
          onPress={handleSend}
          hitSlop={12}
          disabled={disabled || submitting || !value.trim()}
        >
          <IconSymbol name="paperplane.fill" size={22} color={disabled || submitting || !value.trim() ? '#9ca3af' : undefined} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 120,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 8,
  },
  iconButton: {
    padding: 6,
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MessageComposer;


