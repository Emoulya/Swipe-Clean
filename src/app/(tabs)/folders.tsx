/**
 * Folders — album browser tab.
 * Menampilkan daftar album/folder, tap untuk filter grid atau swipe langsung.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Asset } from 'expo-media-library';
import { FolderOpen } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { useMediaStore } from '@/store/useMediaStore';
import { loadAlbums, type AlbumInfo } from '@/lib/mediaLoader';
import { FolderCard } from '@/components/FolderCard';
import { Spacing } from '@/constants/theme';

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function FoldersScreen() {
  const theme = useTheme();
  const hasPermission = useMediaStore((s) => s.hasPermission);
  const setFilter = useMediaStore((s) => s.setFilter);

  const [albums, setAlbums] = useState<AlbumInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ─── Load Albums ──────────────────────────────────────────────────────────

  const fetchAlbums = useCallback(async () => {
    try {
      const loaded = await loadAlbums();
      setAlbums(loaded);
    } catch (error) {
      console.error('Failed to load albums:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasPermission) {
      fetchAlbums();
    }
  }, [hasPermission, fetchAlbums]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAlbums();
    setRefreshing(false);
  }, [fetchAlbums]);

  // ─── Navigation Handlers ─────────────────────────────────────────────────

  const handleFolderPress = useCallback(
    (albumInfo: AlbumInfo) => {
      // Filter grid view ke album ini
      setFilter({ albumId: albumInfo.album.id });
      // Navigasi ke tab Galeri
      router.navigate('/(tabs)' as any);
    },
    [setFilter],
  );

  const handleSwipePress = useCallback((albumInfo: AlbumInfo) => {
    // Langsung masuk swipe mode dengan album ini
    router.push(`/swipe/${albumInfo.album.id}` as any);
  }, []);

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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.primary}
          colors={[theme.primary]}
        />
      }
    >
      {/* Header info */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerText, { color: theme.text }]}>
          {albums.length} folder ditemukan
        </Text>
      </View>

      {/* Album list */}
      {albums.length === 0 ? (
        <View style={styles.emptyState}>
          <FolderOpen color={theme.textSecondary} size={48} style={{ marginBottom: 12 }} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Tidak ada folder ditemukan
          </Text>
        </View>
      ) : (
        albums.map((albumInfo) => (
          <FolderCard
            key={albumInfo.album.id}
            title={albumInfo.title}
            assetCount={albumInfo.assetCount}
            thumbnailAssetId={null} // TODO: ambil thumbnail dari asset pertama
            onPress={() => handleFolderPress(albumInfo)}
            onSwipePress={() => handleSwipePress(albumInfo)}
          />
        ))
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 100,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  headerRow: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  messageText: {
    fontSize: 15,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
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
