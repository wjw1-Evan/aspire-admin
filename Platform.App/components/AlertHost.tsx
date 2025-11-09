import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { AlertButton } from 'react-native';

import { addAlertListener } from '@/utils/alertShim';
import { useThemeColor } from '@/hooks/useThemeColor';

interface ActiveAlert {
  title?: string;
  message?: string;
  buttons: AlertButton[];
}

/**
 * Web 端全局 Alert 容器
 * 用于在浏览器环境中以非阻塞方式展示提示信息
 */
export function AlertHost() {
  const [activeAlert, setActiveAlert] = useState<ActiveAlert | null>(null);
  const backgroundColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const accentColor = useThemeColor({}, 'accent');
  const dangerColor = useThemeColor({}, 'danger');
  const secondaryTextColor = useThemeColor({}, 'secondaryText');

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    return addAlertListener(detail => {
      const buttons = detail.buttons && detail.buttons.length > 0
        ? detail.buttons
        : [{ text: '知道了', style: 'default' }];

      setActiveAlert({
        title: detail.title,
        message: detail.message,
        buttons,
      });
    });
  }, []);

  const handleButtonPress = useCallback(
    (button: AlertButton) => {
      setActiveAlert(null);
      button.onPress?.();
    },
    []
  );

  const buttonList = useMemo(() => activeAlert?.buttons ?? [], [activeAlert?.buttons]);

  if (Platform.OS !== 'web' || !activeAlert) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.container}>
      <View style={[styles.alertBox, { backgroundColor, borderColor }]}>
        {activeAlert.title ? (
          <Text style={[styles.title, { color: textColor }]}>{activeAlert.title}</Text>
        ) : null}
        {activeAlert.message ? (
          <Text style={[styles.message, { color: secondaryTextColor }]}>{activeAlert.message}</Text>
        ) : null}
        <View style={styles.buttonRow}>
          {buttonList.map((button, index) => (
            <TouchableOpacity
              key={`${button.text ?? index}-${index}`}
              style={[
                styles.button,
                { backgroundColor: accentColor },
                button.style === 'destructive' && { backgroundColor: dangerColor },
                button.style === 'cancel' && {
                  backgroundColor: 'transparent',
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor,
                },
              ]}
              onPress={() => handleButtonPress(button)}
            >
              <Text
                style={[
                  styles.buttonText,
                  button.style === 'cancel' && { color: textColor },
                ]}
              >
                {button.text ?? '确定'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  },
  alertBox: {
    minWidth: 280,
    maxWidth: 420,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default AlertHost;


