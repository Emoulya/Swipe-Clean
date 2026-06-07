/**
 * Tab Layout — bottom tab navigator.
 *
 * 3 tab:
 * 1. Grid View (home) — browse galeri
 * 2. Folders — album browser
 * 3. Trash — trash bin
 */

import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Image, Folder, Trash2 } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function TabLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.background,
        },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: Platform.select({ ios: 88, android: 64 }),
          paddingBottom: Platform.select({ ios: 28, android: 8 }),
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.tabBarActive,
        tabBarInactiveTintColor: theme.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Galeri',
          tabBarIcon: ({ color, size }) => (
            <Image color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="folders"
        options={{
          title: 'Folder',
          tabBarIcon: ({ color, size }) => (
            <Folder color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="trash"
        options={{
          title: 'Sampah',
          tabBarIcon: ({ color, size }) => (
            <Trash2 color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
