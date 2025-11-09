// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
export type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left': 'chevron-left',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'person.fill': 'person',
  'person.circle.fill': 'account-circle',
  'person.crop.circle': 'account-circle',
  'envelope.fill': 'email',
  'phone.fill': 'phone',
  'location.fill': 'location-on',
  'mappin.and.ellipse': 'place',
  'calendar.fill': 'event',
  'bubble.left.and.text.bubble.fill': 'chat',
  'bubble.left.and.bubble.right.fill': 'forum',
  'person.2.fill': 'group',
  'safari.fill': 'explore',
  'sparkles': 'auto-awesome',
  'ellipsis': 'more-horiz',
  'plus': 'add',
  'face.smiling': 'insert-emoticon',
  'waveform': 'keyboard-voice',
  'sun.max.fill': 'light-mode',
  'moon.fill': 'dark-mode',
  'bell.fill': 'notifications',
  'lock.fill': 'lock',
  'gear': 'settings',
  'questionmark.circle.fill': 'help',
  'info.circle.fill': 'info',
  'arrow.clockwise': 'refresh',
  'camera.fill': 'camera-alt',
  'power': 'power-settings-new',
  'checkmark.circle.fill': 'check-circle',
  'bolt.fill': 'flash-on',
  'xmark': 'close',
  'checkmark': 'check',
  'eye.fill': 'visibility',
  'eye.slash.fill': 'visibility-off',
} as unknown as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  readonly name: IconSymbolName;
  readonly size?: number;
  readonly color: string | OpaqueColorValue;
  readonly style?: StyleProp<TextStyle>;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
