/**
 * TrashItem — item di trash bin grid.
 * Menampilkan thumbnail dengan overlay trash icon dan info media.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Trash2 } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { type TrashBinRow } from '@/lib/db';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrashItemProps {
  item: TrashBinRow;
  size: number;
  isSelected: boolean;
  onPress: (item: TrashBinRow) => void;
  onLongPress: (item: TrashBinRow) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TrashItem({
  item,
  size,
  isSelected,
  onPress,
  onLongPress,
}: TrashItemProps) {
  const theme = useTheme();

  const handlePress = useCallback(() => {
    onPress(item);
  }, [item, onPress]);

  const handleLongPress = useCallback(() => {
    onLongPress(item);
  }, [item, onLongPress]);

  const isVideo = item.media_type === 'video';

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={300}
      style={({ pressed }) => [
        styles.container,
        { width: size, height: size },
        pressed && styles.pressed,
      ]}
    >
      {/* Thumbnail */}
      <Image
        source={{ uri: item.uri }}
        style={styles.thumbnail}
        contentFit="cover"
        transition={150}
      />

      {/* Trash overlay */}
      <View style={styles.trashOverlay}>
        <Trash2 color="#FFFFFF" size={12} />
      </View>

      {/* Selection indicator */}
      {isSelected && (
        <View style={[styles.selectedOverlay, { borderColor: theme.primary }]}>
          <View style={[styles.checkmark, { backgroundColor: theme.primary }]}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        </View>
      )}

      {/* Video duration badge */}
      {isVideo && item.duration !== null && (
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>
            {formatDuration(item.duration)}
          </Text>
        </View>
      )}

      {/* Trashed-at time indicator */}
      <View style={styles.timeIndicator}>
        <Text style={styles.timeText}>
          {formatRelativeTime(item.trashed_at)}
        </Text>
      </View>
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

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}j`;
  return `${days}h`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    margin: 1,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  pressed: {
    opacity: 0.7,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  trashOverlay: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.7)',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trashIcon: {
    fontSize: 10,
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
  },
  checkmark: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  timeIndicator: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '500',
  },
});
