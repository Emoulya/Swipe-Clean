/**
 * UndoSnackbar — snackbar undo yang muncul 5 detik setelah swipe kiri.
 * Auto-dismiss dengan countdown visual.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
  withSequence,
} from 'react-native-reanimated';

import { CONFIG } from '@/constants/config';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UndoSnackbarProps {
  visible: boolean;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UndoSnackbar({
  visible,
  message,
  onUndo,
  onDismiss,
}: UndoSnackbarProps) {
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);
  const progressWidth = useSharedValue(1); // 1 = full, 0 = habis
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animasi masuk/keluar
  useEffect(() => {
    if (visible) {
      // Masuk
      translateY.value = withTiming(0, { duration: 250 });
      opacity.value = withTiming(1, { duration: 200 });
      progressWidth.value = withTiming(0, { duration: CONFIG.UNDO_TIMEOUT_MS });

      // Auto-dismiss setelah timeout
      timerRef.current = setTimeout(() => {
        handleDismiss();
      }, CONFIG.UNDO_TIMEOUT_MS);
    } else {
      // Keluar
      translateY.value = withTiming(100, { duration: 200 });
      opacity.value = withTiming(0, { duration: 150 });
      progressWidth.value = 1;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [visible]);

  const handleDismiss = useCallback(() => {
    translateY.value = withTiming(100, { duration: 200 });
    opacity.value = withTiming(0, { duration: 150 });
    onDismiss();
  }, [onDismiss, translateY, opacity]);

  const handleUndo = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onUndo();
  }, [onUndo]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Progress countdown bar */}
      <View style={styles.progressBackground}>
        <Animated.View style={[styles.progressFill, progressStyle]} />
      </View>

      <View style={styles.content}>
        <Text style={styles.message} numberOfLines={1}>
          {message}
        </Text>

        <Pressable
          onPress={handleUndo}
          style={({ pressed }) => [
            styles.undoButton,
            pressed && styles.undoButtonPressed,
          ]}
        >
          <Text style={styles.undoText}>UNDO</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    backgroundColor: '#323232',
    borderRadius: 12,
    overflow: 'hidden',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  progressBackground: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#EF4444',
    borderRadius: 1.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginRight: 12,
  },
  undoButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  undoButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
  },
  undoText: {
    color: '#2DD4BF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
