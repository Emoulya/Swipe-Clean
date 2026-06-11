/**
 * SwipeCard — komponen inti SwipeClean.
 *
 * Menggunakan Gesture API baru (Gesture.Pan + Gesture.Pinch + GestureDetector)
 * karena useAnimatedGestureHandler sudah dihapus di Reanimated v3+.
 *
 * Semua animasi berjalan di UI thread via Reanimated worklets.
 */

import React, { useCallback } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { Asset, MediaType } from 'expo-media-library';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { CONFIG } from '@/constants/config';
import { VideoPreview } from '@/components/VideoPreview';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SwipeCardProps {
  asset: Asset;
  assetUri: string;
  assetThumbnailUri?: string;
  assetMediaType: MediaType;
  assetWidth: number;
  assetHeight: number;
  assetDuration: number | null;
  onSwipeLeft: (asset: Asset) => void;
  onSwipeRight: (asset: Asset) => void;
  isActive: boolean;
  stackIndex: number; // 0 = depan, 1 = belakang, 2 = paling belakang
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SwipeCard({
  asset,
  assetUri,
  assetThumbnailUri,
  assetMediaType,
  assetWidth,
  assetHeight,
  assetDuration,
  onSwipeLeft,
  onSwipeRight,
  isActive,
  stackIndex,
}: SwipeCardProps) {
  // Shared values untuk animasi swipe
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const cardScale = useSharedValue(1);

  // Shared values untuk pinch-to-zoom
  const pinchScale = useSharedValue(1);
  const savedPinchScale = useSharedValue(1);

  // Context untuk drag offset
  const contextX = useSharedValue(0);
  const contextY = useSharedValue(0);

  // ─── Callbacks (dipanggil dari UI thread via runOnJS) ─────────────────────

  const handleSwipeLeft = useCallback(() => {
    onSwipeLeft(asset);
  }, [asset, onSwipeLeft]);

  const handleSwipeRight = useCallback(() => {
    onSwipeRight(asset);
  }, [asset, onSwipeRight]);

  // ─── Pan Gesture ──────────────────────────────────────────────────────────

  const panGesture = Gesture.Pan()
    .enabled(isActive)
    .activeOffsetX([-10, 10])
    // Hindari konflik dengan back gesture Android di tepi layar
    .hitSlop(
      Platform.OS === 'android'
        ? { left: -CONFIG.EDGE_DEAD_ZONE, right: -CONFIG.EDGE_DEAD_ZONE }
        : undefined,
    )
    .onStart(() => {
      contextX.value = translateX.value;
      contextY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = contextX.value + event.translationX;
      translateY.value = contextY.value + event.translationY * 0.3; // Dampen Y movement
    })
    .onEnd((event) => {
      const velocityTriggered =
        Math.abs(event.velocityX) > CONFIG.SWIPE_VELOCITY_THRESHOLD;
      const distanceTriggered =
        Math.abs(translateX.value) >
        CONFIG.SCREEN_WIDTH * CONFIG.SWIPE_DISTANCE_THRESHOLD;

      if (velocityTriggered || distanceTriggered) {
        // Swipe terkonfirmasi — animasi card keluar layar
        const direction = translateX.value > 0 ? 1 : -1;
        const exitX = direction * CONFIG.SCREEN_WIDTH * 1.5;

        translateX.value = withTiming(exitX, { duration: 300 }, () => {
          if (direction < 0) {
            runOnJS(handleSwipeLeft)();
          } else {
            runOnJS(handleSwipeRight)();
          }
        });
        translateY.value = withTiming(
          translateY.value * 2,
          { duration: 300 },
        );
      } else {
        // Tidak mencapai threshold — spring back ke tengah
        translateX.value = withSpring(0, CONFIG.SPRING_CONFIG);
        translateY.value = withSpring(0, CONFIG.SPRING_CONFIG);
      }
    });

  // ─── Pinch Gesture ────────────────────────────────────────────────────────

  const pinchGesture = Gesture.Pinch()
    .enabled(isActive)
    .onStart(() => {
      savedPinchScale.value = pinchScale.value;
    })
    .onUpdate((event) => {
      const newScale = savedPinchScale.value * event.scale;
      pinchScale.value = Math.min(
        Math.max(newScale, CONFIG.PINCH_MIN_SCALE),
        CONFIG.PINCH_MAX_SCALE,
      );
    })
    .onEnd(() => {
      // Reset zoom saat dilepas
      pinchScale.value = withSpring(1, CONFIG.SPRING_CONFIG);
      savedPinchScale.value = 1;
    });

  // Compose pan + pinch
  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  // ─── Animated Styles ──────────────────────────────────────────────────────

  // Style untuk card aktif (depan) — rotasi + translasi
  const cardAnimatedStyle = useAnimatedStyle(() => {
    const rotation =
      (translateX.value / CONFIG.SCREEN_WIDTH) * CONFIG.CARD_ROTATION_FACTOR;

    // Scale stack card: dari 0.92 (belakang) ke 1.0 saat card depan bergerak
    const backgroundScale =
      stackIndex === 0
        ? cardScale.value
        : interpolate(
            Math.abs(translateX.value),
            [0, CONFIG.SCREEN_WIDTH * 0.5],
            [0.92 + stackIndex * -0.04, 1],
            Extrapolation.CLAMP,
          );

    // Translate Y untuk stack effect
    const stackTranslateY = stackIndex * 8;

    return {
      transform: [
        { translateX: stackIndex === 0 ? translateX.value : 0 },
        { translateY: stackIndex === 0 ? translateY.value : stackTranslateY },
        { rotate: stackIndex === 0 ? `${rotation}deg` : '0deg' },
        {
          scale:
            stackIndex === 0
              ? pinchScale.value
              : backgroundScale,
        },
      ],
      zIndex: CONFIG.STACK_SIZE - stackIndex,
    };
  });

  // Style overlay "HAPUS" (merah, muncul saat swipe kiri)
  const deleteOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-CONFIG.SCREEN_WIDTH * 0.3, -30, 0],
      [1, 0.6, 0],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  // Style overlay "SIMPAN" (hijau, muncul saat swipe kanan)
  const keepOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, 30, CONFIG.SCREEN_WIDTH * 0.3],
      [0, 0.6, 1],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  // ─── Render ───────────────────────────────────────────────────────────────

  const isVideo = assetMediaType === MediaType.VIDEO;

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.card, cardAnimatedStyle]}>
        {/* Media content */}
        {isVideo && isActive ? (
          <VideoPreview
            uri={assetUri}
            isActive={isActive}
            duration={assetDuration}
          />
        ) : (
          <Image
            source={{ uri: assetThumbnailUri || assetUri || asset.id }}
            style={styles.image}
            contentFit="cover"
            transition={200}
            recyclingKey={asset.id}
          />
        )}

        {/* Video duration badge */}
        {isVideo && assetDuration !== null && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>
              {formatDuration(assetDuration)}
            </Text>
          </View>
        )}

        {/* Overlay HAPUS (merah) — muncul saat swipe kiri */}
        {isActive && (
          <Animated.View style={[styles.overlay, styles.deleteOverlay, deleteOverlayStyle]}>
            <View style={styles.labelContainer}>
              <Text style={styles.deleteLabel}>HAPUS</Text>
            </View>
          </Animated.View>
        )}

        {/* Overlay SIMPAN (hijau) — muncul saat swipe kanan */}
        {isActive && (
          <Animated.View style={[styles.overlay, styles.keepOverlay, keepOverlayStyle]}>
            <View style={styles.labelContainer}>
              <Text style={styles.keepLabel}>SIMPAN</Text>
            </View>
          </Animated.View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: CONFIG.SCREEN_WIDTH - 32,
    height: CONFIG.SCREEN_HEIGHT * 0.65,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteOverlay: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
  },
  keepOverlay: {
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
  },
  labelContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 3,
  },
  deleteLabel: {
    fontSize: 32,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: 4,
  },
  keepLabel: {
    fontSize: 32,
    fontWeight: '900',
    color: '#22C55E',
    letterSpacing: 4,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
