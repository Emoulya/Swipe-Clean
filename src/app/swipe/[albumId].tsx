/* eslint-disable react-hooks/set-state-in-effect */
/**
 * Swipe Mode — full screen card swipe interface.
 *
 * Route: /swipe/[albumId]
 * albumId = "all" untuk semua media, atau ID album spesifik.
 *
 * Menampilkan stack 3 card, header + footer controls,
 * progress bar, dan undo snackbar.
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Asset, MediaType } from 'expo-media-library';
import { X, Settings, PartyPopper, Info } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { useMediaStore } from '@/store/useMediaStore';
import { useFilteredAssets } from '@/hooks/useFilteredAssets';
import { useSwipeSession } from '@/hooks/useSwipeSession';
import { SwipeCard } from '@/components/SwipeCard';
import { ProgressBar } from '@/components/ProgressBar';
import { UndoSnackbar } from '@/components/UndoSnackbar';
import { DetailInfoModal } from '@/components/DetailInfoModal';
import { CONFIG } from '@/constants/config';
import { getPreloadedInfo, preloadAhead } from '@/lib/preloader';
import { type AssetInfo } from '@/lib/mediaLoader';
import { Spacing } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CardData {
  asset: Asset;
  info: AssetInfo;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SwipeScreen() {
  const theme = useTheme();
  const { albumId, initialIndex } = useLocalSearchParams<{ albumId: string; initialIndex?: string }>();

  const { assets: filteredAssets } = useFilteredAssets();
  const isLoading = useMediaStore((s) => s.isLoading);
  const setFilter = useMediaStore((s) => s.setFilter);
  const loadInitialAssets = useMediaStore((s) => s.loadInitialAssets);

  const [sessionAssets, setSessionAssets] = useState<Asset[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [cardStack, setCardStack] = useState<CardData[]>([]);
  const [isPreloading, setIsPreloading] = useState(true);
  const [isInfoVisible, setIsInfoVisible] = useState(false);

  const activeFilterAlbumId = useMediaStore((s) => s.filter.albumId);
  const targetAlbumId = albumId === 'all' ? null : albumId;
  const isFilterMatched = activeFilterAlbumId === targetAlbumId;

  const activeCard = cardStack[0];

  const parsedInitialIndex = initialIndex ? parseInt(initialIndex, 10) : 0;

  // Reset inisialisasi ketika albumId berubah
  useEffect(() => {
    setIsInitialized(false);
    setSessionAssets([]);
  }, [albumId]);

  // Set snapshot assets sekali saat loading selesai dan filter di store sudah sesuai
  useEffect(() => {
    if (!isLoading && isFilterMatched && !isInitialized) {
      setSessionAssets(filteredAssets);
      setIsInitialized(true);
    }
  }, [filteredAssets, isLoading, isInitialized, isFilterMatched]);

  const {
    currentIndex,
    deletedCount,
    keptCount,
    isFinished,
    lastDeletedAsset,
    canUndo,
    handleSwipeLeft,
    handleSwipeRight,
    handleUndo,
  } = useSwipeSession(sessionAssets, targetAlbumId, parsedInitialIndex);

  // ─── Inisialisasi: set filter dan load assets ─────────────────────────────

  useEffect(() => {
    if (albumId && albumId !== 'all') {
      setFilter({ albumId });
    } else {
      setFilter({ albumId: null });
    }
    loadInitialAssets();

    // Reset filter album ketika swipe mode ditutup agar tidak mengotori tab Galeri utama
    return () => {
      setFilter({ albumId: null });
    };
  }, [albumId]);

  // ─── Preload stack cards ──────────────────────────────────────────────────

  useEffect(() => {
    async function loadStack() {
      if (sessionAssets.length === 0) return;

      setIsPreloading(true);

      // Preload 3 cards ke depan dari currentIndex
      const stackAssets = sessionAssets.slice(
        currentIndex,
        currentIndex + CONFIG.STACK_SIZE,
      );

      const cards: CardData[] = [];
      for (const asset of stackAssets) {
        try {
          const info = await getPreloadedInfo(asset);
          cards.push({ asset, info });
        } catch (error) {
          console.error('Failed to preload card:', error);
        }
      }

      setCardStack(cards);
      setIsPreloading(false);

      // Preload lebih jauh di background
      preloadAhead(sessionAssets, currentIndex);
    }

    loadStack();
  }, [sessionAssets, currentIndex]);

  // ─── Undo snackbar state ──────────────────────────────────────────────────

  const [showUndo, setShowUndo] = useState(false);
  const [undoMessage, setUndoMessage] = useState('');

  useEffect(() => {
    if (canUndo && lastDeletedAsset) {
      setUndoMessage('File dipindahkan ke sampah');
      setShowUndo(true);
    } else {
      setShowUndo(false);
    }
  }, [canUndo, lastDeletedAsset]);

  const handleUndoDismiss = useCallback(() => {
    setShowUndo(false);
  }, []);

  // ─── Navigation ───────────────────────────────────────────────────────────

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  // ─── Render: Loading state ────────────────────────────────────────────────

  if (!isInitialized) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Memuat media...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Render: Finished state ───────────────────────────────────────────────

  if (isFinished) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]}>
        <View style={styles.finishedContainer}>
          <PartyPopper color={theme.primary} size={64} style={{ marginBottom: 8 }} />
          <Text style={styles.finishedTitle}>Selesai!</Text>
          <Text style={styles.finishedDesc}>
            Kamu telah meninjau semua media.
          </Text>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{keptCount}</Text>
              <Text style={styles.statLabel}>Disimpan</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.danger }]}>
                {deletedCount}
              </Text>
              <Text style={styles.statLabel}>Dihapus</Text>
            </View>
          </View>

          <Pressable
            onPress={handleBack}
            style={[styles.doneButton, { backgroundColor: theme.primary }]}
          >
            <Text style={styles.doneButtonText}>Kembali ke Galeri</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Render: Swipe mode ───────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} hitSlop={12}>
          <X color="#FFFFFF" size={24} />
        </Pressable>

        <ProgressBar
          current={currentIndex + 1}
          total={sessionAssets.length}
          deletedCount={deletedCount}
        />

        <View style={styles.headerRight}>
          {activeCard && (
            <Pressable onPress={() => setIsInfoVisible(true)} hitSlop={12} style={{ marginRight: 16 }}>
              <Info color="#FFFFFF" size={24} />
            </Pressable>
          )}
          <Pressable onPress={() => router.push('/settings' as any)} hitSlop={12}>
            <Settings color="#FFFFFF" size={24} />
          </Pressable>
        </View>
      </View>

      {/* Card stack */}
      <View style={styles.cardContainer}>
        {isPreloading && cardStack.length === 0 ? (
          <ActivityIndicator size="large" color={theme.primary} />
        ) : (
          // Render stack in reverse order (back cards first, front card last)
          [...cardStack].reverse().map((card, reversedIndex) => {
            const stackIndex = cardStack.length - 1 - reversedIndex;
            const isActive = stackIndex === 0;

            return (
              <SwipeCard
                key={card.asset.id}
                asset={card.asset}
                assetUri={card.info.uri}
                assetThumbnailUri={card.info.thumbnailUri}
                assetMediaType={card.info.mediaType}
                assetWidth={card.info.width}
                assetHeight={card.info.height}
                assetDuration={card.info.duration}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
                isActive={isActive}
                stackIndex={stackIndex}
              />
            );
          })
        )}
      </View>

      {/* Footer — swipe hints */}
      <View style={styles.footer}>
        <View style={styles.hintRow}>
          <View style={[styles.hintBadge, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
            <Text style={[styles.hintText, { color: '#EF4444' }]}>
              ← Hapus
            </Text>
          </View>
          <View style={[styles.hintBadge, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
            <Text style={[styles.hintText, { color: '#22C55E' }]}>
              Simpan →
            </Text>
          </View>
        </View>
      </View>

      {/* Undo snackbar */}
      <UndoSnackbar
        visible={showUndo}
        message={undoMessage}
        onUndo={handleUndo}
        onDismiss={handleUndoDismiss}
      />

      {activeCard && (
        <DetailInfoModal
          visible={isInfoVisible}
          onClose={() => setIsInfoVisible(false)}
          asset={activeCard.asset}
          assetInfo={activeCard.info}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 15,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBackText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '300',
  },
  headerSettingsText: {
    fontSize: 20,
  },

  // Card container
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Footer
  footer: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  hintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hintBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  hintText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Finished state
  finishedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  finishedEmoji: {
    fontSize: 64,
  },
  finishedTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  finishedDesc: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 24,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  doneButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 20,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
