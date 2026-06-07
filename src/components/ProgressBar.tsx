/**
 * ProgressBar — counter "{current}/{total}" + visual progress bar.
 * Ditampilkan di swipe mode header.
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProgressBarProps {
  current: number;
  total: number;
  deletedCount: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProgressBar({ current, total, deletedCount }: ProgressBarProps) {
  const theme = useTheme();

  const progress = total > 0 ? current / total : 0;
  const deletedProgress = total > 0 ? deletedCount / total : 0;

  return (
    <View style={styles.container}>
      {/* Counter text */}
      <Text style={[styles.counterText, { color: theme.text }]}>
        <Text style={styles.currentText}>{current}</Text>
        <Text style={[styles.dividerText, { color: theme.textSecondary }]}>
          {' / '}
        </Text>
        <Text style={[styles.totalText, { color: theme.textSecondary }]}>
          {total}
        </Text>
      </Text>

      {/* Visual progress bar */}
      <View style={[styles.barBackground, { backgroundColor: theme.backgroundElement }]}>
        {/* Deleted portion (red) */}
        <View
          style={[
            styles.barDeletedFill,
            {
              width: `${deletedProgress * 100}%`,
              backgroundColor: theme.danger,
            },
          ]}
        />
        {/* Progress portion (teal) */}
        <View
          style={[
            styles.barProgressFill,
            {
              width: `${(progress - deletedProgress) * 100}%`,
              left: `${deletedProgress * 100}%`,
              backgroundColor: theme.primary,
            },
          ]}
        />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  counterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  currentText: {
    fontWeight: '700',
  },
  dividerText: {
    fontWeight: '400',
  },
  totalText: {
    fontWeight: '400',
  },
  barBackground: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  barDeletedFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    borderRadius: 2,
  },
  barProgressFill: {
    position: 'absolute',
    top: 0,
    height: '100%',
    borderRadius: 2,
  },
});
