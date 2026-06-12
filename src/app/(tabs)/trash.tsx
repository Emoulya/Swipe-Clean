/**
 * Trash Bin — menampilkan item yang sudah di-swipe hapus.
 * Aksi: pulihkan, hapus permanen, atau hapus semua.
 */

import { useEffect, useCallback, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Sparkles } from 'lucide-react-native';

import { MinimalistScrollbar } from '@/components/MinimalistScrollbar';

import { useTheme } from '@/hooks/use-theme';
import { useTrashStore } from '@/store/useTrashStore';
import { type TrashBinRow } from '@/lib/db';
import { TrashItem } from '@/components/TrashItem';
import { CONFIG } from '@/constants/config';
import { Spacing, BorderRadius } from '@/constants/theme';

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TrashScreen() {
  const theme = useTheme();

  const items = useTrashStore((s) => s.items);
  const totalSize = useTrashStore((s) => s.totalSize);
  const isLoading = useTrashStore((s) => s.isLoading);
  const loadTrash = useTrashStore((s) => s.loadTrash);
  const restoreFromTrash = useTrashStore((s) => s.restoreFromTrash);
  const deletePermanently = useTrashStore((s) => s.deletePermanently);
  const clearAllTrash = useTrashStore((s) => s.clearAllTrash);
  const clearExpiredTrash = useTrashStore((s) => s.clearExpiredTrash);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isSelecting = selectedIds.size > 0;

  // State dan Animated value untuk scrollbar kustom
  const [contentHeight, setContentHeight] = useState(0);
  const [layoutHeight, setLayoutHeight] = useState(0);
  const [scrollY] = useState(() => new Animated.Value(0));

  // Load saat mount dan clear expired
  useEffect(() => {
    loadTrash();
    clearExpiredTrash(CONFIG.TRASH_AUTO_CLEAR_DAYS);
  }, [loadTrash, clearExpiredTrash]);

  // ─── Selection Handlers ───────────────────────────────────────────────────

  const handleItemPress = useCallback(
    (item: TrashBinRow) => {
      if (isSelecting) {
        // Toggle selection
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(item.asset_id)) {
            next.delete(item.asset_id);
          } else {
            next.add(item.asset_id);
          }
          return next;
        });
      }
      // Jika tidak seleksi mode, bisa preview — implementasi nanti
    },
    [isSelecting],
  );

  const handleItemLongPress = useCallback((item: TrashBinRow) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.add(item.asset_id);
      return next;
    });
  }, []);

  // ─── Bulk Actions ─────────────────────────────────────────────────────────

  const handleRestoreSelected = useCallback(async () => {
    for (const assetId of selectedIds) {
      await restoreFromTrash(assetId);
    }
    setSelectedIds(new Set());
  }, [selectedIds, restoreFromTrash]);

  const handleDeleteSelected = useCallback(() => {
    Alert.alert(
      'Hapus Permanen',
      `Hapus ${selectedIds.size} item secara permanen? Tindakan ini tidak dapat dibatalkan.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            await deletePermanently(Array.from(selectedIds));
            setSelectedIds(new Set());
          },
        },
      ],
    );
  }, [selectedIds, deletePermanently]);

  const handleClearAll = useCallback(() => {
    Alert.alert(
      'Kosongkan Sampah',
      'Hapus semua item di sampah secara permanen? Tindakan ini tidak dapat dibatalkan.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Kosongkan',
          style: 'destructive',
          onPress: () => clearAllTrash(),
        },
      ],
    );
  }, [clearAllTrash]);

  const handleCancelSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // ─── Computed ─────────────────────────────────────────────────────────────

  const itemSize = Math.floor(CONFIG.SCREEN_WIDTH / CONFIG.GRID_COLUMNS) - 2;

  const formattedSize = useMemo(() => {
    if (totalSize < 1024) return `${totalSize} B`;
    if (totalSize < 1024 * 1024) return `${(totalSize / 1024).toFixed(1)} KB`;
    if (totalSize < 1024 * 1024 * 1024)
      return `${(totalSize / (1024 * 1024)).toFixed(1)} MB`;
    return `${(totalSize / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }, [totalSize]);

  const renderItem = useCallback(
    ({ item }: { item: TrashBinRow }) => {
      return (
        <TrashItem
          item={item}
          size={itemSize}
          isSelected={selectedIds.has(item.asset_id)}
          onPress={handleItemPress}
          onLongPress={handleItemLongPress}
        />
      );
    },
    [itemSize, selectedIds, handleItemPress, handleItemLongPress],
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  if (isLoading && items.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header info */}
      <View style={[styles.headerRow, { borderBottomColor: theme.border }]}>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {items.length} item di sampah
          </Text>
          {totalSize > 0 && (
            <Text style={[styles.headerSize, { color: theme.textSecondary }]}>
              {formattedSize}
            </Text>
          )}
        </View>

        {items.length > 0 && !isSelecting && (
          <Pressable
            onPress={handleClearAll}
            style={[styles.clearButton, { backgroundColor: theme.danger }]}
          >
            <Text style={styles.clearButtonText}>Kosongkan</Text>
          </Pressable>
        )}
      </View>

      {/* Selection toolbar */}
      {isSelecting && (
        <View
          style={[
            styles.selectionBar,
            { backgroundColor: theme.surfaceElevated, borderBottomColor: theme.border },
          ]}
        >
          <Pressable onPress={handleCancelSelection}>
            <Text style={[styles.selectionCancel, { color: theme.primary }]}>
              Batal
            </Text>
          </Pressable>
          <Text style={[styles.selectionCount, { color: theme.text }]}>
            {selectedIds.size} dipilih
          </Text>
          <View style={styles.selectionActions}>
            <Pressable
              onPress={handleRestoreSelected}
              style={[styles.selectionBtn, { backgroundColor: theme.success }]}
            >
              <Text style={styles.selectionBtnText}>Pulihkan</Text>
            </Pressable>
            <Pressable
              onPress={handleDeleteSelected}
              style={[styles.selectionBtn, { backgroundColor: theme.danger }]}
            >
              <Text style={styles.selectionBtnText}>Hapus</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Grid */}
      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Sparkles color={theme.textSecondary} size={56} style={{ marginBottom: 8 }} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            Sampah kosong
          </Text>
          <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
            Item yang di-swipe hapus akan muncul di sini selama{' '}
            {CONFIG.TRASH_AUTO_CLEAR_DAYS} hari sebelum dihapus otomatis.
          </Text>
        </View>
      ) : (
        <View style={styles.listWrapper}>
          <FlashList
            data={items}
            renderItem={renderItem}
            keyExtractor={(item) => item.asset_id}
            numColumns={3}
            contentContainerStyle={styles.gridContent}
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
          />
          <MinimalistScrollbar
            scrollY={scrollY}
            contentHeight={contentHeight}
            layoutHeight={layoutHeight}
          />
        </View>
      )}
    </View>
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
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  headerInfo: {
    gap: 2,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerSize: {
    fontSize: 13,
  },
  clearButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Selection bar
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  selectionCancel: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectionCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  selectionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  selectionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Grid
  listWrapper: {
    flex: 1,
    position: 'relative',
  },
  gridContent: {
    paddingBottom: 120,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 56,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
