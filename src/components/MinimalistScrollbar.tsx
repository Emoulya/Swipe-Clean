import React, { useEffect, useRef, useCallback, useState } from 'react';
import { StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface MinimalistScrollbarProps {
  scrollY: Animated.Value;
  contentHeight: number;
  layoutHeight: number;
}

export const MinimalistScrollbar = React.memo(function MinimalistScrollbar({
  scrollY,
  contentHeight,
  layoutHeight,
}: MinimalistScrollbarProps) {
  const theme = useTheme();

  const [fadeAnim] = useState(() => new Animated.Value(0));
  const fadeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Jika konten tidak dapat di-scroll (tinggi konten lebih kecil dari area layar), jangan render scrollbar
  const isScrollable = contentHeight > layoutHeight;
  const thumbHeight = isScrollable
    ? Math.max(40, layoutHeight * (layoutHeight / contentHeight))
    : 0;

  const showScrollbar = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();

    if (fadeTimeout.current) {
      clearTimeout(fadeTimeout.current);
    }

    fadeTimeout.current = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start();
    }, 1000); // Menyembunyikan scrollbar setelah 1 detik tidak ada scroll
  }, [fadeAnim]);

  useEffect(() => {
    if (!isScrollable) return;

    const listenerId = scrollY.addListener(() => {
      showScrollbar();
    });

    return () => {
      scrollY.removeListener(listenerId);
      if (fadeTimeout.current) {
        clearTimeout(fadeTimeout.current);
      }
    };
  }, [scrollY, isScrollable, showScrollbar]);

  if (!isScrollable) {
    return null;
  }

  // Interpolasi posisi vertical scroll offset ke posisi top scrollbar thumb
  const thumbTop = scrollY.interpolate({
    inputRange: [0, Math.max(1, contentHeight - layoutHeight)],
    outputRange: [0, layoutHeight - thumbHeight],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        styles.scrollbarTrack,
        {
          opacity: fadeAnim,
        },
      ]}
      pointerEvents="none"
    >
      <Animated.View
        style={[
          styles.scrollbarThumb,
          {
            height: thumbHeight,
            backgroundColor: theme.primary,
            transform: [{ translateY: thumbTop }],
          },
        ]}
      />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  scrollbarTrack: {
    position: 'absolute',
    right: 4,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
  scrollbarThumb: {
    width: '100%',
    borderRadius: 1.5,
  },
});
