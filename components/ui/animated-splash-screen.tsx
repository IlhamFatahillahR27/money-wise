import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, ActivityIndicator, useTheme } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';

interface AnimatedSplashScreenProps {
  isReady: boolean;
  onFinish: () => void;
}

export function AnimatedSplashScreen({ isReady, onFinish }: AnimatedSplashScreenProps) {
  const theme = useTheme();

  // Animasi nilai
  const iconScale = useSharedValue(0.3);
  const iconOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    // 1. Animasi masuk Logo (Spring scale & fade-in)
    iconOpacity.value = withTiming(1, { duration: 400 });
    iconScale.value = withSpring(1, { damping: 11, stiffness: 120 });

    // 2. Animasi masuk Teks Judul & Tagline
    textOpacity.value = withDelay(250, withTiming(1, { duration: 500 }));
    textTranslateY.value = withDelay(250, withSpring(0, { damping: 14 }));
  }, []);

  useEffect(() => {
    if (isReady) {
      // Tunggu minimal 1.2 detik agar splash screen terlihat profesional dan tidak sekadar kedip
      const timeout = setTimeout(() => {
        containerOpacity.value = withTiming(0, { duration: 450 }, (finished) => {
          if (finished) {
            runOnJS(onFinish)();
          }
        });
      }, 1200);

      return () => clearTimeout(timeout);
    }
  }, [isReady]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
        animatedContainerStyle,
      ]}
      pointerEvents="auto">
      <View style={styles.centerContent}>
        {/* Logo / Ikon Visual Aplikasi */}
        <Animated.View style={[styles.iconWrapper, animatedIconStyle]}>
          <View style={[styles.iconBackground, { backgroundColor: theme.colors.primaryContainer }]}>
            <Text style={styles.emojiIcon}>💰</Text>
          </View>
        </Animated.View>

        {/* Branding Title & Tagline */}
        <Animated.View style={[styles.textWrapper, animatedTextStyle]}>
          <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
            MoneyWise
          </Text>
          <Text variant="bodyMedium" style={[styles.tagline, { color: theme.colors.outline }]}>
            Pencatatan Keuangan Cerdas & Mandiri
          </Text>
          <View style={[styles.badge, { backgroundColor: theme.colors.secondaryContainer }]}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSecondaryContainer, fontWeight: '700' }}>
              🔒 100% Local-First & Aman
            </Text>
          </View>
        </Animated.View>
      </View>

      {/* Indikator Loading & Footer di Bagian Bawah */}
      <View style={styles.bottomFooter}>
        <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginBottom: 12 }} />
        <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
          Menyiapkan database lokal...
        </Text>
        <Text variant="labelSmall" style={{ color: theme.colors.outline, opacity: 0.7, marginTop: 4 }}>
          MoneyWise v1.0.0
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 999999,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 50,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconWrapper: {
    marginBottom: 20,
  },
  iconBackground: {
    width: 100,
    height: 100,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  emojiIcon: {
    fontSize: 52,
  },
  textWrapper: {
    alignItems: 'center',
  },
  title: {
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  tagline: {
    textAlign: 'center',
    marginBottom: 14,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 4,
  },
  bottomFooter: {
    alignItems: 'center',
    paddingBottom: 20,
  },
});
