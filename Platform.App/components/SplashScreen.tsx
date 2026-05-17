import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions, Image } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onAnimationComplete: () => void;
}

export default function SplashScreenComponent({ onAnimationComplete }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 启动动画序列
    Animated.parallel([
      // 淡入效果
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // 缩放效果
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      // 旋转效果（微妙的光环旋转）
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]).start();

    // 动画完成后隐藏启动画面
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
      onAnimationComplete();
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* 渐变背景 */}
      <LinearGradient
        colors={['#4A7C59', '#3A6347', '#2A4A35']}
        style={styles.gradient}
      />

      {/* 装饰性圆环 */}
      <Animated.View
        style={[
          styles.ring,
          {
            transform: [{ rotate }],
          },
        ]}
      />

      {/* Logo 容器 */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image
          source={require('../assets/images/splash-icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* 底部文字 */}
      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <View style={styles.text}>
          <View style={styles.textLine} />
          <View style={[styles.textLine, styles.textLineShort]} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  ring: {
    position: 'absolute',
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoContainer: {
    width: width * 0.5,
    height: width * 0.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    position: 'absolute',
    bottom: height * 0.15,
    alignItems: 'center',
  },
  text: {
    alignItems: 'center',
    gap: 8,
  },
  textLine: {
    width: 120,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  textLineShort: {
    width: 80,
  },
});
