/**
 * FolderCard — card untuk folder/album di folder browser.
 * Menampilkan thumbnail gambar pertama, nama folder, dan jumlah file.
 */

import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Folder } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { BorderRadius, Spacing } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FolderCardProps {
  title: string;
  assetCount: number;
  thumbnailAssetId: string | null;
  onPress: () => void;
  onSwipePress: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FolderCard({
  title,
  assetCount,
  thumbnailAssetId,
  onPress,
  onSwipePress,
}: FolderCardProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.surfaceElevated,
          borderColor: theme.border,
        },
        pressed && { opacity: 0.8 },
      ]}
    >
      {/* Thumbnail */}
      <View style={styles.thumbnailContainer}>
        {thumbnailAssetId ? (
          <Image
            source={{ uri: thumbnailAssetId }}
            style={styles.thumbnail}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View
            style={[
              styles.thumbnailPlaceholder,
              { backgroundColor: theme.backgroundElement },
            ]}
          >
            <Folder color={theme.textSecondary} size={24} />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text
          style={[styles.title, { color: theme.text }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text style={[styles.count, { color: theme.textSecondary }]}>
          {assetCount} {assetCount === 1 ? 'file' : 'file'}
        </Text>
      </View>

      {/* Swipe button */}
      <Pressable
        onPress={onSwipePress}
        hitSlop={8}
        style={({ pressed }) => [
          styles.swipeButton,
          { backgroundColor: theme.primary },
          pressed && { opacity: 0.8 },
        ]}
      >
        <Text style={styles.swipeButtonText}>Swipe ▶</Text>
      </Pressable>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    marginHorizontal: Spacing.three,
    marginVertical: Spacing.one,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.three,
  },
  thumbnailContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 24,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  count: {
    fontSize: 13,
  },
  swipeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  swipeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
