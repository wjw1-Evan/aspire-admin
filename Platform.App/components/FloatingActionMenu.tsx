import React, { useCallback, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';

const RADIUS = 140;

const ACTIONS = [
  { name: '报修', icon: 'hammer-outline' as const, color: '#FF6B6B', angle: -45 },
  { name: '缴费', icon: 'card-outline' as const, color: '#4ECDC4', angle: 0 },
  { name: '修改信息', icon: 'create-outline' as const, color: '#45B7D1', angle: 45 },
];

export default function FloatingActionMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const animValue = useRef(new Animated.Value(0)).current;
  const { colors } = useTheme();

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

  const handleActionPress = useCallback((actionName: string) => {
    closeMenu();
  }, [closeMenu]);

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
          accessibilityLabel="打开快捷操作"
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
                  key={action.name}
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
                    {action.name}
                  </Text>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: action.color }]}
                    onPress={() => handleActionPress(action.name)}
                    activeOpacity={0.8}
                    accessibilityLabel={action.name}
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
    boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
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
    boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
    elevation: 4,
  },
});
