/* eslint-disable react-hooks/set-state-in-effect */
/**
 * Folders — album browser tab.
 * Menampilkan daftar album/folder dengan bagian Pinned (2x2) dan Albums (grid 3 kolom).
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  BackHandler,
} from 'react-native';
import { router } from 'expo-router';
import { FolderOpen, Sparkles } from 'lucide-react-native';
import * as MediaLibraryLegacy from 'expo-media-library/legacy';

import { useTheme } from '@/hooks/use-theme';
import { useMediaStore } from '@/store/useMediaStore';
import { useTrashStore } from '@/store/useTrashStore';
import { loadAlbums, loadAssets, extendAssets, type AlbumInfo, type ExtendedAsset } from '@/lib/mediaLoader';
import { FlashList } from '@shopify/flash-list';
import { FolderCard } from '@/components/FolderCard';
import { MediaGrid } from '@/components/MediaGrid';
import { Spacing } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PinnedItemData {
  key: string;
  title: string;
  count: number;
  coverUri?: string;
  album?: any;
  isSpecial?: boolean;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function FoldersScreen() {
  const theme = useTheme();
  const hasPermission = useMediaStore((s) => s.hasPermission);

  const [albums, setAlbums] = useState<AlbumInfo[]>([]);
  const [pinnedItems, setPinnedItems] = useState<PinnedItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // State navigasi internal folder (Breadcrumb)
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumInfo | null>(null);
  const [albumAssets, setAlbumAssets] = useState<ExtendedAsset[]>([]);
  const [isAssetsLoading, setIsAssetsLoading] = useState(false);
  const [assetsOffset, setAssetsOffset] = useState(0);
  const [assetsHasNextPage, setAssetsHasNextPage] = useState(true);

  // Filter out trashed assets
  const trashItems = useTrashStore((s) => s.items);
  const trashedIds = useMemo(
    () => new Set(trashItems.map((item) => item.asset_id)),
    [trashItems],
  );

  const filteredAlbumAssets = useMemo(() => {
    return trashedIds.size > 0
      ? albumAssets.filter((asset) => !trashedIds.has(asset.id))
      : albumAssets;
  }, [albumAssets, trashedIds]);

  // ─── Load Albums & Pinned Items ─────────────────────────────────────────────

  const fetchPinnedAndAlbums = useCallback(async () => {
    try {
      // 1. Load semua album dari system
      const loadedAlbums = await loadAlbums();

      // 2. Load totalCount & cover untuk "All photos" dan "Videos" menggunakan legacy API
      const [allPhotosResult, videosResult] = await Promise.all([
        MediaLibraryLegacy.getAssetsAsync({ first: 1, mediaType: ['photo', 'video'] }),
        MediaLibraryLegacy.getAssetsAsync({ first: 1, mediaType: ['video'] }),
      ]);

      const totalAllCount = allPhotosResult.totalCount;
      const allCoverUri = allPhotosResult.assets[0]?.uri;

      const totalVideosCount = videosResult.totalCount;
      const videosCoverUri = videosResult.assets[0]?.uri;

      const trashCountByAlbum: Record<string, number> = {};
      let totalTrashedCount = 0;
      let totalTrashedVideosCount = 0;

      for (const item of trashItems) {
        totalTrashedCount++;
        if (item.media_type === 'video') {
          totalTrashedVideosCount++;
        }
        if (item.album_id) {
          trashCountByAlbum[item.album_id] = (trashCountByAlbum[item.album_id] || 0) + 1;
        }
      }

      // Sesuaikan jumlah asset untuk setiap album
      const adjustedAlbums = loadedAlbums.map((albumInfo) => {
        const trashedCountForThisAlbum = trashCountByAlbum[albumInfo.album.id] || 0;
        return {
          ...albumInfo,
          assetCount: Math.max(0, albumInfo.assetCount - trashedCountForThisAlbum),
        };
      });

      // 3. Temukan album Camera dan Screenshots dari daftar adjustedAlbums
      const cameraInfo = adjustedAlbums.find(
        (a) => a.title.toLowerCase() === 'camera'
      );
      const screenshotsInfo = adjustedAlbums.find(
        (a) =>
          a.title.toLowerCase() === 'screenshots' ||
          a.title.toLowerCase() === 'screenshot'
      );

      const pinnedData: PinnedItemData[] = [
        {
          key: 'all',
          title: 'All photos',
          count: Math.max(0, totalAllCount - totalTrashedCount),
          coverUri: allCoverUri,
          isSpecial: true,
        },
        {
          key: 'camera',
          title: 'Camera',
          count: cameraInfo ? cameraInfo.assetCount : 0,
          coverUri: cameraInfo ? cameraInfo.coverUri : undefined,
          album: cameraInfo ? cameraInfo.album : undefined,
        },
        {
          key: 'screenshots',
          title: 'Screenshots',
          count: screenshotsInfo ? screenshotsInfo.assetCount : 0,
          coverUri: screenshotsInfo ? screenshotsInfo.coverUri : undefined,
          album: screenshotsInfo ? screenshotsInfo.album : undefined,
        },
        {
          key: 'videos',
          title: 'Videos',
          count: Math.max(0, totalVideosCount - totalTrashedVideosCount),
          coverUri: videosCoverUri,
          isSpecial: true,
        },
      ];

      setPinnedItems(pinnedData);
      setAlbums(adjustedAlbums);
    } catch (error) {
      console.error('Failed to load pinned items and albums:', error);
    } finally {
      setIsLoading(false);
    }
  }, [trashItems]);

  useEffect(() => {
    if (hasPermission) {
      fetchPinnedAndAlbums();
    }
  }, [hasPermission, fetchPinnedAndAlbums]);

  // Menangani tombol back fisik Android agar kembali ke list folder utama
  useEffect(() => {
    if (!selectedAlbum) return;

    const onBackPress = () => {
      setSelectedAlbum(null);
      return true; // blokir navigasi default keluar screen
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

    return () => {
      subscription.remove();
    };
  }, [selectedAlbum]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPinnedAndAlbums();
    setRefreshing(false);
  }, [fetchPinnedAndAlbums]);

  // ─── Load Album Assets ───────────────────────────────────────────────────

  const loadInitialAlbumAssets = useCallback(async (albumId: string, albumTitle: string) => {
    setIsAssetsLoading(true);
    try {
      let filterOptions: any = { mediaType: 'all', dateRange: { from: null, to: null }, albumId: null };
      
      if (albumId === 'all') {
        filterOptions.albumId = null;
      } else if (albumId === 'videos') {
        filterOptions.albumId = null;
        filterOptions.mediaType = 'video';
      } else {
        filterOptions.albumId = albumId;
      }

      const rawAssets = await loadAssets(filterOptions, 0, 50);
      const extended = await extendAssets(rawAssets, albumTitle);
      setAlbumAssets(extended);
      setAssetsOffset(extended.length);
      setAssetsHasNextPage(extended.length >= 50);
    } catch (error) {
      console.error('Failed to load album assets:', error);
    } finally {
      setIsAssetsLoading(false);
    }
  }, []);

  const loadMoreAlbumAssets = useCallback(async () => {
    if (!selectedAlbum || isAssetsLoading || !assetsHasNextPage) return;
    setIsAssetsLoading(true);
    try {
      const albumId = selectedAlbum.album.id;
      const albumTitle = selectedAlbum.title;
      let filterOptions: any = { mediaType: 'all', dateRange: { from: null, to: null }, albumId: null };
      
      if (albumId === 'all') {
        filterOptions.albumId = null;
      } else if (albumId === 'videos') {
        filterOptions.albumId = null;
        filterOptions.mediaType = 'video';
      } else {
        filterOptions.albumId = albumId;
      }

      const rawAssets = await loadAssets(filterOptions, assetsOffset, 50);
      const extended = await extendAssets(rawAssets, albumTitle);
      setAlbumAssets((prev) => [...prev, ...extended]);
      setAssetsOffset((prev) => prev + extended.length);
      setAssetsHasNextPage(extended.length >= 50);
    } catch (error) {
      console.error('Failed to load more album assets:', error);
    } finally {
      setIsAssetsLoading(false);
    }
  }, [selectedAlbum, isAssetsLoading, assetsHasNextPage, assetsOffset]);

  const refreshAlbumAssets = useCallback(async () => {
    if (!selectedAlbum) return;
    setIsAssetsLoading(true);
    try {
      const albumId = selectedAlbum.album.id;
      const albumTitle = selectedAlbum.title;
      let filterOptions: any = { mediaType: 'all', dateRange: { from: null, to: null }, albumId: null };
      
      if (albumId === 'all') {
        filterOptions.albumId = null;
      } else if (albumId === 'videos') {
        filterOptions.albumId = null;
        filterOptions.mediaType = 'video';
      } else {
        filterOptions.albumId = albumId;
      }

      const rawAssets = await loadAssets(filterOptions, 0, 50);
      const extended = await extendAssets(rawAssets, albumTitle);
      setAlbumAssets(extended);
      setAssetsOffset(extended.length);
      setAssetsHasNextPage(extended.length >= 50);
    } catch (error) {
      console.error('Failed to refresh album assets:', error);
    } finally {
      setIsAssetsLoading(false);
    }
  }, [selectedAlbum]);

  // ─── Navigation Handlers ─────────────────────────────────────────────────

  const handleFolderPress = useCallback(
    (albumInfo: AlbumInfo) => {
      setSelectedAlbum(albumInfo);
      setAlbumAssets([]);
      setAssetsOffset(0);
      setAssetsHasNextPage(true);
      loadInitialAlbumAssets(albumInfo.album.id, albumInfo.title);
    },
    [loadInitialAlbumAssets],
  );

  const handlePinnedPress = useCallback(
    (item: PinnedItemData) => {
      const actualAlbumId = item.album ? item.album.id : item.key;
      const albumTitle = item.title;
      setSelectedAlbum({
        album: { id: actualAlbumId } as any,
        title: albumTitle,
        assetCount: item.count,
        coverUri: item.coverUri,
      });
      setAlbumAssets([]);
      setAssetsOffset(0);
      setAssetsHasNextPage(true);
      loadInitialAlbumAssets(actualAlbumId, albumTitle);
    },
    [loadInitialAlbumAssets],
  );

  const handleStartSwipe = useCallback(() => {
    if (selectedAlbum) {
      router.push(`/swipe/${selectedAlbum.album.id}` as any);
    }
  }, [selectedAlbum]);

  const renderItem = useCallback(({ item }: { item: AlbumInfo }) => {
    return (
      <View style={styles.albumGridItem}>
        <FolderCard
          title={item.title}
          assetCount={item.assetCount}
          coverUri={item.coverUri}
          variant="vertical"
          onPress={() => handleFolderPress(item)}
        />
      </View>
    );
  }, [handleFolderPress]);

  const listHeader = useMemo(() => {
    return (
      <View>
        {/* Pinned Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Pinned</Text>
        </View>

        <View style={styles.pinnedGrid}>
          <View style={styles.pinnedRow}>
            {pinnedItems[0] && (
              <FolderCard
                title={pinnedItems[0].title}
                assetCount={pinnedItems[0].count}
                coverUri={pinnedItems[0].coverUri}
                variant="horizontal"
                onPress={() => handlePinnedPress(pinnedItems[0])}
              />
            )}
            {pinnedItems[1] && (
              <FolderCard
                title={pinnedItems[1].title}
                assetCount={pinnedItems[1].count}
                coverUri={pinnedItems[1].coverUri}
                variant="horizontal"
                onPress={() => handlePinnedPress(pinnedItems[1])}
              />
            )}
          </View>
          
          <View style={styles.pinnedRow}>
            {pinnedItems[2] && (
              <FolderCard
                title={pinnedItems[2].title}
                assetCount={pinnedItems[2].count}
                coverUri={pinnedItems[2].coverUri}
                variant="horizontal"
                onPress={() => handlePinnedPress(pinnedItems[2])}
              />
            )}
            {pinnedItems[3] && (
              <FolderCard
                title={pinnedItems[3].title}
                assetCount={pinnedItems[3].count}
                coverUri={pinnedItems[3].coverUri}
                variant="horizontal"
                onPress={() => handlePinnedPress(pinnedItems[3])}
              />
            )}
          </View>
        </View>

        {/* Albums Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Albums</Text>
        </View>
      </View>
    );
  }, [pinnedItems, handlePinnedPress, theme]);

  const listEmpty = useMemo(() => {
    return (
      <View style={styles.emptyState}>
        <FolderOpen color={theme.textSecondary} size={48} style={{ marginBottom: 12 }} />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          Tidak ada folder ditemukan
        </Text>
      </View>
    );
  }, [theme]);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!hasPermission) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={[styles.messageText, { color: theme.textSecondary }]}>
          Izin galeri diperlukan untuk melihat folder.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.messageText, { color: theme.textSecondary }]}>
          Memuat folder...
        </Text>
      </View>
    );
  }

  // Jika folder dipilih, tampilkan MediaGrid dari folder tersebut dengan Breadcrumb
  if (selectedAlbum) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Breadcrumb Bar */}
        <View style={[styles.breadcrumbContainer, { borderBottomColor: theme.border }]}>
          <Pressable onPress={() => setSelectedAlbum(null)}>
            <Text style={[styles.breadcrumbLink, { color: theme.primary }]}>Folder</Text>
          </Pressable>
          <Text style={[styles.breadcrumbSeparator, { color: theme.textSecondary }]}> &gt; </Text>
          <Text style={[styles.breadcrumbText, { color: theme.text }]} numberOfLines={1}>
            {selectedAlbum.title}
          </Text>
        </View>

        {/* Grid Media */}
        <MediaGrid
          assets={filteredAlbumAssets}
          isLoading={isAssetsLoading}
          onEndReached={loadMoreAlbumAssets}
          onRefresh={refreshAlbumAssets}
          onAssetPress={(asset) => {
            const index = filteredAlbumAssets.findIndex((a) => a.id === asset.id);
            const initialIndex = index !== -1 ? index : 0;
            router.push({
              pathname: `/swipe/${selectedAlbum.album.id}`,
              params: { initialIndex },
            } as any);
          }}
          emptyMessage="Tidak ada media di folder ini"
        />

        {/* FAB Swipe Folder */}
        {filteredAlbumAssets.length > 0 && (
          <Pressable
            onPress={handleStartSwipe}
            style={({ pressed }) => [
              styles.fab,
              { backgroundColor: theme.primary },
              pressed && styles.fabPressed,
            ]}
          >
            <Sparkles color="#FFFFFF" size={18} />
            <Text style={styles.fabText}>Swipe</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlashList
        data={albums}
        renderItem={renderItem}
        keyExtractor={(item) => item.album.id}
        numColumns={3}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 120, // Diperpanjang agar tidak tertutup floating bottom bar
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  messageText: {
    fontSize: 15,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 12,
    width: '100%',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },

  // Breadcrumb
  breadcrumbContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  breadcrumbLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  breadcrumbSeparator: {
    fontSize: 14,
    fontWeight: '400',
    marginHorizontal: 4,
  },
  breadcrumbText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },

  // FAB Swipe
  fab: {
    position: 'absolute',
    bottom: 104, // Di atas floating bottom bar
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // Sections
  sectionHeaderRow: {
    paddingHorizontal: 4,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  pinnedGrid: {
    paddingHorizontal: 4,
    gap: 12,
    marginBottom: Spacing.two,
  },
  pinnedRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  albumGridItem: {
    paddingHorizontal: 4,
    marginBottom: 8,
  },
});
