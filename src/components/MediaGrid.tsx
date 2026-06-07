/**
 * MediaGrid — FlashList grid untuk browse galeri.
 * Menggunakan @shopify/flash-list dengan 3 kolom.
 * Thumbnail 1:1 aspect ratio menggunakan expo-image.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { Asset, MediaType } from 'expo-media-library';

import { CONFIG } from '@/constants/config';
import { useTheme } from '@/hooks/use-theme';
import { type ExtendedAsset } from '@/lib/mediaLoader';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MediaGridProps {
  assets: ExtendedAsset[];
  isLoading: boolean;
  onEndReached: () => void;
  onRefresh: () => void;
  onAssetPress?: (asset: ExtendedAsset) => void;
  headerComponent?: React.ReactElement;
  emptyMessage?: string;
}

interface GridItemProps {
  asset: ExtendedAsset;
  size: number;
  onPress?: (asset: ExtendedAsset) => void;
}

// ─── Grid Item ────────────────────────────────────────────────────────────────

function GridItem({ asset, size, onPress }: GridItemProps) {
  const handlePress = useCallback(() => {
    onPress?.(asset);
  }, [asset, onPress]);

  const mediaType = asset.cachedMediaType ?? null;
  const duration = asset.cachedDuration ?? null;
  const isVideo = mediaType === MediaType.VIDEO;
  const imageUri = asset.cachedUri || asset.id;

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.gridItem,
        { width: size, height: size },
        pressed && styles.gridItemPressed,
      ]}
    >
      <Image
        source={{ uri: imageUri }}
        style={styles.thumbnail}
        contentFit="cover"
        recyclingKey={asset.id}
        transition={isVideo ? 0 : 150}
        priority={isVideo ? 'low' : 'normal'}
        cachePolicy="disk"
      />

      {/* Video duration badge */}
      {isVideo && duration !== null && (
        <View style={styles.videoBadge}>
          <Text style={styles.videoBadgeText}>
            {formatDuration(duration)}
          </Text>
        </View>
      )}

      {/* Video icon overlay */}
      {isVideo && (
        <View style={styles.videoIcon}>
          <Text style={styles.videoIconText}>▶</Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MediaGrid({
  assets,
  isLoading,
  onEndReached,
  onRefresh,
  onAssetPress,
  headerComponent,
  emptyMessage = 'Tidak ada media ditemukan',
}: MediaGridProps) {
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const itemSize = Math.floor(CONFIG.SCREEN_WIDTH / CONFIG.GRID_COLUMNS) - 2;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    onRefresh();
    // Beri waktu minimal agar UX pull-to-refresh terasa
    setTimeout(() => setRefreshing(false), 500);
  }, [onRefresh]);

  const renderItem = useCallback(
    ({ item }: { item: ExtendedAsset }) => (
      <GridItem asset={item} size={itemSize} onPress={onAssetPress} />
    ),
    [itemSize, onAssetPress],
  );

  const keyExtractor = useCallback((item: ExtendedAsset) => item.id, []);

  const renderFooter = useCallback(() => {
    if (!isLoading) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }, [isLoading, theme.primary]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyEmoji]}>📷</Text>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          {emptyMessage}
        </Text>
      </View>
    );
  }, [isLoading, emptyMessage, theme.textSecondary]);

  return (
    <FlashList
      data={assets}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={CONFIG.GRID_COLUMNS}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={headerComponent}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      contentContainerStyle={styles.listContent}
    />
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
  listContent: {
    paddingBottom: 100,
  },
  gridItem: {
    margin: 1,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  gridItemPressed: {
    opacity: 0.7,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  videoIcon: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoIconText: {
    color: '#FFFFFF',
    fontSize: 8,
    marginLeft: 1,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
