import React, { useEffect, useRef, useCallback, useState } from 'react';
import { StyleSheet, Animated, PanResponder } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface MinimalistScrollbarProps {
  scrollY: Animated.Value;
  contentHeight: number;
  layoutHeight: number;
  listRef: React.RefObject<any>;
}

export const MinimalistScrollbar = React.memo(function MinimalistScrollbar({
  scrollY,
  contentHeight,
  layoutHeight,
  listRef,
}: MinimalistScrollbarProps) {
  const theme = useTheme();

  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [isVisible, setIsVisible] = useState(false);
  const fadeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDragging = useRef(false);
  const dragStartScrollY = useRef(0);
  const currentScrollY = useRef(0);

  // Jika konten tidak dapat di-scroll (tinggi konten lebih kecil dari area layar), jangan render scrollbar
  const isScrollable = contentHeight > layoutHeight;
  const thumbHeight = isScrollable
    ? Math.max(40, layoutHeight * (layoutHeight / contentHeight))
    : 0;

  // Refs untuk menyimpan nilai terbaru agar dapat diakses dari closure PanResponder yang statis
  const contentHeightRef = useRef(contentHeight);
  const layoutHeightRef = useRef(layoutHeight);
  const thumbHeightRef = useRef(thumbHeight);
  const scrollToListRef = useRef<(offset: number) => void>(() => {});

  useEffect(() => {
    contentHeightRef.current = contentHeight;
    layoutHeightRef.current = layoutHeight;
    thumbHeightRef.current = thumbHeight;
  }, [contentHeight, layoutHeight, thumbHeight]);

  const showScrollbar = useCallback(() => {
    setIsVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();

    if (fadeTimeout.current) {
      clearTimeout(fadeTimeout.current);
    }

    // Hanya sembunyikan jika tidak sedang di-drag
    if (!isDragging.current) {
      fadeTimeout.current = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }).start(() => {
          setIsVisible(false);
        });
      }, 1000); // Menyembunyikan scrollbar setelah 1 detik tidak ada scroll
    }
  }, [fadeAnim]);

  // Pantau nilai scrollY saat ini untuk sinkronisasi posisi awal drag
  useEffect(() => {
    const listenerId = scrollY.addListener(({ value }) => {
      currentScrollY.current = value;
      showScrollbar();
    });

    return () => {
      scrollY.removeListener(listenerId);
      if (fadeTimeout.current) {
        clearTimeout(fadeTimeout.current);
      }
    };
  }, [scrollY, showScrollbar]);

  // Fungsi helper untuk menggerakkan scroll list
  const scrollToList = useCallback((offset: number) => {
    if (!listRef?.current) return;
    try {
      if (typeof listRef.current.scrollToOffset === 'function') {
        listRef.current.scrollToOffset({ offset, animated: false });
      } else if (typeof listRef.current.scrollTo === 'function') {
        listRef.current.scrollTo({ y: offset, animated: false });
      }
    } catch (err) {
      console.warn('Failed to scroll list via scrollbar drag:', err);
    }
  }, [listRef]);

  // Perbarui ref scrollToList setiap kali fungsinya berubah
  useEffect(() => {
    scrollToListRef.current = scrollToList;
  }, [scrollToList]);

  // Gesture responder untuk menangani aksi drag pada scrollbar
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        isDragging.current = true;
        showScrollbar();

        // Ambil nilai aktual scrollY secara sinkron dari private _value jika tersedia
        const rawScrollY = (scrollY as any)._value;
        dragStartScrollY.current = typeof rawScrollY === 'number' ? rawScrollY : currentScrollY.current;
      },
      onPanResponderMove: (evt, gestureState) => {
        showScrollbar();

        // Gunakan refs untuk mendapatkan nilai terbaru, menghindari stale closure
        const currentContentHeight = contentHeightRef.current;
        const currentLayoutHeight = layoutHeightRef.current;
        const currentThumbHeight = thumbHeightRef.current;

        const maxScrollY = Math.max(1, currentContentHeight - currentLayoutHeight);
        const maxThumbTop = currentLayoutHeight - currentThumbHeight;
        const dy = gestureState.dy;

        // Rasio pergerakan: 1px thumb movement = ratio px list scroll
        const ratio = maxScrollY / maxThumbTop;

        const newScrollY = Math.min(
          Math.max(0, dragStartScrollY.current + dy * ratio),
          maxScrollY
        );

        scrollToListRef.current(newScrollY);
      },
      onPanResponderRelease: () => {
        isDragging.current = false;
        showScrollbar();
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
        showScrollbar();
      },
    })
  ).current;

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
      pointerEvents={isVisible ? 'auto' : 'none'}
      {...panResponder.panHandlers}
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
        pointerEvents="none" // Mencegah sentuhan langsung ke thumb agar locationY relatif ke track
      />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  scrollbarTrack: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 20, // Area sentuhan yang lebar agar mudah di-drag
    backgroundColor: 'transparent',
    zIndex: 999,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingRight: 4, // Jarak thumb dari tepi kanan layar
  },
  scrollbarThumb: {
    width: 4, // Lebar visual scrollbar tetap tipis/minimalis
    borderRadius: 2,
  },
});
