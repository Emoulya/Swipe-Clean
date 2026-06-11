/**
 * Tab Layout — bottom tab navigator.
 *
 * 3 tab:
 * 1. Grid View (home) — browse galeri
 * 2. Folders — album browser
 * 3. Trash — trash bin
 */

import { Tabs } from 'expo-router';
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
          position: 'absolute',
          bottom: 24,
          left: 24,
          right: 24,
          borderRadius: 32,
          height: 64,
          backgroundColor: 'rgba(26, 26, 26, 0.94)',
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.08)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.35,
          shadowRadius: 10,
          elevation: 8,
          paddingBottom: 0,
          paddingTop: 0,
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarItemStyle: {
          height: 64,
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 8,
        },
        tabBarActiveTintColor: theme.tabBarActive,
        tabBarInactiveTintColor: theme.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: -2,
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
