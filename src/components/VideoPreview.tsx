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
import { Play } from 'lucide-react-native';

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
      p.timeUpdateEventInterval = 1.0; // Trigger timeUpdate setiap 1 detik
    } catch {
      // Ignored
    }
  });

  // Track playback status
  const { isPlaying } = useEvent(player, 'playingChange', {
    isPlaying: player.playing,
  });

  // Gunakan ref untuk melacak currentTime secara real-time tanpa memicu re-render
  const currentTimeRef = React.useRef(0);

  useEffect(() => {
    if (!player) return;
    const subscription = player.addListener('timeUpdate', (event) => {
      currentTimeRef.current = event.currentTime;
      // Potong preview di VIDEO_MAX_PREVIEW_DURATION detik (looping)
      if (event.currentTime >= CONFIG.VIDEO_MAX_PREVIEW_DURATION) {
        try {
          player.currentTime = 0;
        } catch {
          // Ignored
        }
      }
    });
    return () => {
      subscription.remove();
    };
  }, [player]);

  // Sinkronkan preferensi muted jika diset dari luar
  useEffect(() => {
    if (player) {
      try {
        // eslint-disable-next-line react-hooks/immutability
        player.muted = muted;
      } catch {
        // Ignored
      }
    }
  }, [player, muted]);

  // Effect 1: Hanya dipanggil sekali saat unmount untuk me-release player secara aman
  useEffect(() => {
    return () => {
      try {
        player.pause();
        player.release();
      } catch {
        // Ignored
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect 2: Mengontrol play/pause berdasarkan status aktif (isActive) dan preferensi autoPlay
  useEffect(() => {
    if (!player) return;

    let timer: any = null;

    try {
      if (isActive) {
        if (autoPlay) {
          timer = setTimeout(() => {
            try {
              player.play();
            } catch {
              // Ignored
            }
          }, 350);
        } else {
          player.pause();
        }
      } else {
        player.pause();
      }
    } catch {
      // Ignored
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, autoPlay]);

  const togglePlay = useCallback(() => {
    if (!player) return;
    try {
      if (isPlaying) {
        player.pause();
      } else {
        player.play();
      }
    } catch {
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
