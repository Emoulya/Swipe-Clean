/**
 * Grid View — tab utama.
 * Menampilkan semua foto/video dalam grid dengan FilterBar.
 * FAB "Mulai Swipe" untuk masuk ke swipe mode.
 */

import { useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Asset } from 'expo-media-library';
import { Camera, Sparkles } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { useMediaStore } from '@/store/useMediaStore';
import { useFilteredAssets } from '@/hooks/useFilteredAssets';
import { MediaGrid } from '@/components/MediaGrid';
import { FilterBar } from '@/components/FilterBar';
import { Spacing } from '@/constants/theme';

// ─── Permission Request Screen ───────────────────────────────────────────────

function PermissionRequest({ onRequest }: { onRequest: () => void }) {
  const theme = useTheme();

  return (
    <View style={[styles.permissionContainer, { backgroundColor: theme.background }]}>
      <Camera color={theme.primary} size={64} style={{ marginBottom: 8 }} />
      <Text style={[styles.permissionTitle, { color: theme.text }]}>
        Akses Galeri Diperlukan
      </Text>
      <Text style={[styles.permissionDesc, { color: theme.textSecondary }]}>
        SwipeClean memerlukan izin untuk mengakses foto dan video Anda agar dapat
        menampilkan dan membantu membersihkan galeri Anda.
      </Text>
      <Pressable
        onPress={onRequest}
        style={[styles.permissionButton, { backgroundColor: theme.primary }]}
      >
        <Text style={styles.permissionButtonText}>Izinkan Akses</Text>
      </Pressable>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function GridViewScreen() {
  const theme = useTheme();

  const hasPermission = useMediaStore((s) => s.hasPermission);
  const filter = useMediaStore((s) => s.filter);
  const requestPermission = useMediaStore((s) => s.requestPermission);
  const loadInitialAssets = useMediaStore((s) => s.loadInitialAssets);
  const loadMoreAssets = useMediaStore((s) => s.loadMoreAssets);
  const refreshAssets = useMediaStore((s) => s.refreshAssets);
  const setFilter = useMediaStore((s) => s.setFilter);

  const { assets, isLoading, totalCount } = useFilteredAssets();

  // Request permission dan load assets saat pertama kali
  useEffect(() => {
    async function init() {
      const granted = await requestPermission();
      if (granted) {
        loadInitialAssets();
      }
    }

    if (hasPermission === null) {
      init();
    } else if (hasPermission) {
      loadInitialAssets();
    }
  }, [hasPermission, requestPermission, loadInitialAssets]);

  // ─── Navigasi ke Swipe Mode ───────────────────────────────────────────────

  const handleStartSwipe = useCallback(() => {
    const albumId = filter.albumId ?? 'all';
    router.push(`/swipe/${albumId}` as any);
  }, [filter.albumId]);

  const handleAssetPress = useCallback((asset: Asset) => {
    const index = assets.findIndex((a) => a.id === asset.id);
    const initialIndex = index !== -1 ? index : 0;
    router.push({
      pathname: '/swipe/all',
      params: { initialIndex },
    } as any);
  }, [assets]);

  // ─── Permission belum diberikan ───────────────────────────────────────────

  if (hasPermission === false) {
    return <PermissionRequest onRequest={requestPermission} />;
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const headerComponent = (
    <View style={styles.headerContainer}>
      {/* FilterBar */}
      <FilterBar filter={filter} onFilterChange={setFilter} />

      {/* Counter */}
      {totalCount > 0 && (
        <View style={styles.counterRow}>
          <Text style={[styles.counterText, { color: theme.textSecondary }]}>
            {totalCount} media ditemukan
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <MediaGrid
        assets={assets}
        isLoading={isLoading}
        onEndReached={loadMoreAssets}
        onRefresh={refreshAssets}
        onAssetPress={handleAssetPress}
        headerComponent={headerComponent}
      />

      {/* FAB — Mulai Swipe */}
      {assets.length > 0 && (
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingTop: Spacing.two,
  },
  counterRow: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  counterText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Permission screen
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  permissionEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  permissionDesc: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 12,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 104,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    gap: 8,
    // Shadow
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
  fabIcon: {
    fontSize: 18,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
