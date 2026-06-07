/**
 * VideoPreview — video player menggunakan expo-video (SDK 56).
 *
 * Auto-play, muted, looping. Potong preview di 30 detik.
 * Menggunakan textureView untuk rendering Android agar tidak crash saat swipe.
 */

import React, { useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import { Play, Pause } from 'lucide-react-native';

import { CONFIG } from '@/constants/config';
import { useSettingsStore } from '@/store/useSettingsStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VideoPreviewProps {
  uri: string;
  isActive: boolean;
  duration: number | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VideoPreview({ uri, isActive, duration }: VideoPreviewProps) {
  const autoPlay = useSettingsStore((s) => s.autoPlay);
  const muted = useSettingsStore((s) => s.muted);

  // Jangan gunakan caching untuk content:// lokal Android agar hemat RAM GPU
  const player = useVideoPlayer({ uri, useCaching: false }, (p) => {
    try {
      p.loop = true;
      p.muted = muted;

      if (autoPlay && isActive) {
        p.play();
      }
    } catch (e) {
      // Ignored
    }
  });

  // Track playback status
  const { isPlaying } = useEvent(player, 'playingChange', {
    isPlaying: player.playing,
  });

  // Sinkronkan preferensi mute jika diset dari luar
  useEffect(() => {
    if (player) {
      try {
        player.muted = muted;
      } catch (e) {
        // Ignored
      }
    }
  }, [player, muted]);

  // Pause/resume berdasarkan isActive dan autoPlay
  useEffect(() => {
    if (!player) return;

    try {
      if (isActive) {
        if (autoPlay) {
          player.play();
        } else {
          player.pause();
        }
      } else {
        player.pause();
      }
    } catch (e) {
      // Ignored
    }

    return () => {
      try {
        player.pause();
      } catch (e) {
        // Ignored if already released
      }
    };
  }, [isActive, player, autoPlay]);

  // Potong preview di VIDEO_MAX_PREVIEW_DURATION detik
  const handleTimeUpdate = useCallback(() => {
    if (!player) return;

    try {
      if (player.currentTime >= CONFIG.VIDEO_MAX_PREVIEW_DURATION) {
        player.currentTime = 0;
      }
    } catch (e) {
      // Ignored
    }
  }, [player]);

  // Monitor currentTime untuk cutoff
  useEffect(() => {
    if (!player || !isActive) return;

    const interval = setInterval(() => {
      handleTimeUpdate();
    }, 1000);

    return () => clearInterval(interval);
  }, [player, isActive, handleTimeUpdate]);

  const togglePlay = useCallback(() => {
    if (!player) return;
    try {
      if (isPlaying) {
        player.pause();
      } else {
        player.play();
      }
    } catch (e) {
      // Ignored
    }
  }, [player, isPlaying]);

  return (
    <Pressable style={styles.container} onPress={togglePlay}>
      <VideoView
        player={player}
        style={styles.video}
        nativeControls={false}
        contentFit="cover"
        surfaceType="textureView"
      />

      {/* Duration badge */}
      {duration !== null && (
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>
            {formatDuration(duration)}
          </Text>
        </View>
      )}

      {/* Play/Pause Button Overlay — Muncul saat di-pause */}
      {isActive && !isPlaying && (
        <View style={styles.overlayContainer} pointerEvents="none">
          <View style={styles.iconWrapper}>
            <Play color="#FFFFFF" size={32} fill="#FFFFFF" style={{ marginLeft: 4 }} />
          </View>
        </View>
      )}
    </Pressable>
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
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 10,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    zIndex: 5,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
});
