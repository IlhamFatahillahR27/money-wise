import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useEffect, useState } from 'react';
import { PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { getDatabase } from '@/services/db/database';
import { AnimatedSplashScreen } from '@/components/ui/animated-splash-screen';

// Mencegah native splash screen auto-hide sebelum inisialisasi selesai
SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [isDbReady, setIsDbReady] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);

  useEffect(() => {
    async function initApp() {
      try {
        await getDatabase();
      } catch (error) {
        console.error('Error saat inisialisasi database SQLite:', error);
      } finally {
        setIsDbReady(true);
        // Sembunyikan native splash screen segera setelah React siap agar AnimatedSplashScreen mengambil alih
        await SplashScreen.hideAsync().catch(() => {});
      }
    }

    initApp();
  }, []);

  const paperTheme = isDark ? MD3DarkTheme : MD3LightTheme;

  return (
    <PaperProvider theme={paperTheme}>
      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal"
            options={{
              presentation: 'modal',
              title: 'Catat Pengeluaran Baru',
              headerShown: true,
            }}
          />
          <Stack.Screen
            name="expense/[id]"
            options={{
              title: 'Rincian Pengeluaran',
              headerShown: true,
            }}
          />
          <Stack.Screen
            name="settings"
            options={{
              title: 'Pengaturan & Cloud',
              headerShown: true,
            }}
          />
        </Stack>

        {/* Animated Splash Screen Overlay */}
        {splashVisible && (
          <AnimatedSplashScreen
            isReady={isDbReady}
            onFinish={() => setSplashVisible(false)}
          />
        )}

        <StatusBar style="auto" />
      </ThemeProvider>
    </PaperProvider>
  );
}
