/**
 * Root Layout — entry point navigasi SwipeClean.
 *
 * Wraps:
 * - GestureHandlerRootView (wajib untuk gesture handler)
 * - Stack navigator (expo-router)
 *
 * Routes:
 * - (tabs) → Tab navigator (Grid, Folders, Trash)
 * - swipe/[albumId] → Swipe mode (full screen, modal)
 * - settings → Settings screen
 */

import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

import { useTheme } from '@/hooks/use-theme';
import { getDatabase } from '@/lib/db';
import { useTrashStore } from '@/store/useTrashStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import '@/global.css';

// Splash screen tetap tampil sampai app siap
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const theme = useTheme();

  useEffect(() => {
    async function prepare() {
      try {
        // Inisialisasi database
        await getDatabase();
        // Load data sampah di awal agar filter galeri langsung sinkron
        await useTrashStore.getState().loadTrash();
        // Load settings dari DB
        await useSettingsStore.getState().loadSettings();
      } catch (error) {
        console.error('Database init failed:', error);
      } finally {
        // Sembunyikan splash screen
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.background },
          animation: 'slide_from_right',
        }}
      >
        {/* Tab screens — tanpa header (tabs punya header sendiri) */}
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />

        {/* Swipe mode — full screen presentation */}
        <Stack.Screen
          name="swipe/[albumId]"
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
          }}
        />

        {/* Settings */}
        <Stack.Screen
          name="settings"
          options={{
            title: 'Pengaturan',
            animation: 'slide_from_right',
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
