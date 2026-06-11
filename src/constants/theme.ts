/**
 * Design tokens untuk SwipeClean.
 * Warna, spacing, border radius, dan font families.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',

    // SwipeClean custom colors
    primary: '#7C3AED',          // Violet/Purple — progress, aksen utama
    primaryLight: '#DDD6FE',     // Violet/Purple light
    danger: '#EF4444',           // Red — hapus, trash
    dangerLight: '#FCA5A5',      // Red light
    success: '#22C55E',          // Green — simpan, keep
    successLight: '#86EFAC',     // Green light
    warning: '#F59E0B',         // Amber — warning
    surface: '#FFFFFF',          // Card surface
    surfaceElevated: '#F8FAFC',  // Elevated surface
    overlay: 'rgba(0, 0, 0, 0.5)',
    border: '#E2E8F0',
    tabBar: '#FFFFFF',
    tabBarActive: '#7C3AED',
    tabBarInactive: '#94A3B8',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',

    // SwipeClean custom colors
    primary: '#A78BFA',          // Violet/Purple light (kontras tinggi di dark mode)
    primaryLight: '#7C3AED',     // Violet/Purple
    danger: '#F87171',
    dangerLight: '#EF4444',
    success: '#4ADE80',
    successLight: '#22C55E',
    warning: '#FBBF24',
    surface: '#1A1A1A',
    surfaceElevated: '#262626',
    overlay: 'rgba(0, 0, 0, 0.7)',
    border: '#334155',
    tabBar: '#111111',
    tabBarActive: '#A78BFA',
    tabBarInactive: '#64748B',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
