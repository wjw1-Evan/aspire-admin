import React, { useCallback, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

const RADIUS = 140;

const ACTIONS = [
  { i18nKey: 'fab.create_task', icon: 'add-circle-outline' as const, route: '/task/create', colorKey: 'primary' as const, angle: -45 },
  { i18nKey: 'fab.create_project', icon: 'folder-open-outline' as const, route: '/project/create', colorKey: 'success' as const, angle: 0 },
  { i18nKey: 'fab.my_tasks', icon: 'list-outline' as const, route: '/(tabs)/tasks', colorKey: 'warning' as const, angle: 45 },
];

export default function FloatingActionMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const animValue = useRef(new Animated.Value(0)).current;
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const openMenu = useCallback(() => {
    setIsOpen(true);
    animValue.setValue(0);
    Animated.spring(animValue, {
      toValue: 1,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [animValue]);

  const closeMenu = useCallback(() => {
    Animated.timing(animValue, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setIsOpen(false);
    });
  }, [animValue]);

  const toggleMenu = useCallback(() => {
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }, [isOpen, openMenu, closeMenu]);

  const handleActionPress = useCallback((route: string) => {
    closeMenu();
    router.push(route);
  }, [closeMenu, router]);

  const backdropOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.4],
  });

  const rotation = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <>
      <View style={styles.fabWrapper}>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.tint }]}
          onPress={toggleMenu}
          activeOpacity={0.8}
          accessibilityLabel={t('fab.open_menu')}
          accessibilityRole="button"
        >
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Ionicons name="add" size={28} color={colors.white} />
          </Animated.View>
        </TouchableOpacity>
      </View>
      {isOpen && (
        <Modal transparent animationType="none" visible={isOpen} onRequestClose={closeMenu}>
          <Pressable style={styles.backdrop} onPress={closeMenu}>
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.text, opacity: backdropOpacity },
              ]}
            />
          </Pressable>
          <View style={[styles.actionsContainer, { pointerEvents: 'box-none' }]}>
            {ACTIONS.map((action, index) => {
              const rad = (action.angle * Math.PI) / 180;
              const finalX = Math.sin(rad) * RADIUS;
              const finalY = -Math.cos(rad) * RADIUS;

              const translateX = animValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0, finalX],
              });
              const translateY = animValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0, finalY],
              });
              const actionOpacity = animValue.interpolate({
                inputRange: [0, 0.2 + index * 0.15, 0.5 + index * 0.15],
                outputRange: [0, 0, 1],
              });
              const scale = animValue.interpolate({
                inputRange: [0, 0.2 + index * 0.15, 0.5 + index * 0.15],
                outputRange: [0.5, 0.5, 1],
              });

              return (
                <Animated.View
                  key={action.i18nKey}
                  style={[
                    styles.actionItem,
                    {
                      opacity: actionOpacity,
                      transform: [{ translateX }, { translateY }, { scale }],
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.actionLabel,
                      { color: colors.text, backgroundColor: colors.cardBackground },
                    ]}
                  >
                    {t(action.i18nKey)}
                  </Text>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors[action.colorKey] }]}
                    onPress={() => handleActionPress(action.route)}
                    activeOpacity={0.8}
                    accessibilityLabel={t(action.i18nKey)}
                  >
                    <Ionicons name={action.icon} size={24} color={colors.white} />
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fabWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,

    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionItem: {
    position: 'absolute',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.85,
    elevation: 4,
  },
});
