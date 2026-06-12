/**
 * MediaGrid — FlashList grid untuk browse galeri.
 * Menggunakan @shopify/flash-list dengan single column layout campuran
 * (Header & Row berisi 3 item) untuk stabilitas grid heterogen.
 * Thumbnail 1:1 aspect ratio menggunakan expo-image.
 */

import React, { useCallback, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Animated,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { MediaType } from 'expo-media-library';
import { Camera } from 'lucide-react-native';
import { CONFIG } from '@/constants/config';
import { useTheme } from '@/hooks/use-theme';
import { type ExtendedAsset, formatDateId } from '@/lib/mediaLoader';
import { MinimalistScrollbar } from '@/components/MinimalistScrollbar';

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

export interface GridHeaderItem {
  id: string;
  type: 'header';
  title: string;
}

export interface GridRowItem {
  id: string;
  type: 'row';
  items: ExtendedAsset[];
}

export type GridListItem = GridHeaderItem | GridRowItem;

// ─── Grouping Helper ──────────────────────────────────────────────────────────

function groupAssetsForGrid(assets: ExtendedAsset[]): GridListItem[] {
  const listItems: GridListItem[] = [];
  let currentGroupKey: string | null = null;
  let currentGroupAssets: ExtendedAsset[] = [];

  const pushCurrentGroupRows = (groupKey: string) => {
    if (currentGroupAssets.length === 0) return;
    
    for (let i = 0; i < currentGroupAssets.length; i += 3) {
      const rowItems = currentGroupAssets.slice(i, i + 3);
      listItems.push({
        id: `row-${groupKey}-${i}`,
        type: 'row',
        items: rowItems,
      });
    }
    currentGroupAssets = [];
  };

  for (const asset of assets) {
    const timestamp = asset.cachedCreationTime ?? Date.now();
    const dateStr = formatDateId(timestamp);
    const albumName = asset.cachedAlbumName || 'Galeri';
    const groupKey = `${dateStr} | ${albumName}`;

    if (groupKey !== currentGroupKey) {
      if (currentGroupKey !== null) {
        pushCurrentGroupRows(currentGroupKey);
      }
      
      currentGroupKey = groupKey;
      listItems.push({
        id: `header-${groupKey}`,
        type: 'header',
        title: groupKey,
      });
    }

    currentGroupAssets.push(asset);
  }

  if (currentGroupKey !== null) {
    pushCurrentGroupRows(currentGroupKey);
  }

  return listItems;
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

  const [contentHeight, setContentHeight] = useState(0);
  const [layoutHeight, setLayoutHeight] = useState(0);
  const [scrollY] = React.useState(() => new Animated.Value(0));

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    onRefresh();
    setTimeout(() => setRefreshing(false), 500);
  }, [onRefresh]);

  const groupedData = useMemo(() => groupAssetsForGrid(assets), [assets]);

  const renderItem = useCallback(
    ({ item }: { item: GridListItem }) => {
      if (item.type === 'header') {
        return (
          <View style={styles.headerSection}>
            <Text style={[styles.headerSectionText, { color: theme.textSecondary }]}>
              {item.title}
            </Text>
          </View>
        );
      } else {
        return (
          <View style={styles.gridRow}>
            {item.items.map((asset) => (
              <GridItem
                key={asset.id}
                asset={asset}
                size={itemSize}
                onPress={onAssetPress}
              />
            ))}
            {item.items.length < CONFIG.GRID_COLUMNS &&
              Array.from({ length: CONFIG.GRID_COLUMNS - item.items.length }).map((_, idx) => (
                <View key={`filler-${idx}`} style={{ width: itemSize, margin: 1 }} />
              ))}
          </View>
        );
      }
    },
    [itemSize, onAssetPress, theme.textSecondary],
  );

  const keyExtractor = useCallback((item: GridListItem) => item.id, []);
  
  const getItemType = useCallback((item: GridListItem) => item.type, []);

  const overrideItemLayout = useCallback(
    (layout: any, item: GridListItem) => {
      if (item.type === 'header') {
        layout.size = 48; // Estimasi tinggi header section
      } else {
        layout.size = itemSize + 2; // Tinggi itemSize + margin vertikal
      }
    },
    [itemSize],
  );

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
        <Camera size={48} color={theme.textSecondary} />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          {emptyMessage}
        </Text>
      </View>
    );
  }, [isLoading, emptyMessage, theme.textSecondary]);

  return (
    <View style={styles.listWrapper}>
      <FlashList
        data={groupedData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemType={getItemType}
        overrideItemLayout={overrideItemLayout}
        numColumns={1}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={headerComponent}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => {
          scrollY.setValue(e.nativeEvent.contentOffset.y);
        }}
        onContentSizeChange={(w, h) => {
          setContentHeight(h);
        }}
        onLayout={(e) => {
          setLayoutHeight(e.nativeEvent.layout.height);
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      />
      <MinimalistScrollbar
        scrollY={scrollY}
        contentHeight={contentHeight}
        layoutHeight={layoutHeight}
      />
    </View>
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
  listWrapper: {
    flex: 1,
    position: 'relative',
  },
  listContent: {
    paddingBottom: 120, // Diperpanjang agar tidak tertutup floating bottom bar
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
  headerSection: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 6,
  },
  headerSectionText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
});

