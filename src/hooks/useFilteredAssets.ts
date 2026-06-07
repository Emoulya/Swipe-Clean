/**
 * useFilteredAssets — derived hook yang mengembalikan assets terfilter.
 * Membaca dari useMediaStore dan menyembunyikan item yang sudah di-trash.
 */

import { useMemo } from 'react';
import { Asset } from 'expo-media-library';

import { useMediaStore } from '@/store/useMediaStore';
import { useTrashStore } from '@/store/useTrashStore';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFilteredAssets(): {
  assets: Asset[];
  isLoading: boolean;
  hasNextPage: boolean;
  totalCount: number;
} {
  const assets = useMediaStore((s) => s.assets);
  const isLoading = useMediaStore((s) => s.isLoading);
  const hasNextPage = useMediaStore((s) => s.hasNextPage);
  const trashItems = useTrashStore((s) => s.items);

  // Buat Set berisi asset IDs yang ada di trash untuk lookup O(1)
  const trashedIds = useMemo(
    () => new Set(trashItems.map((item) => item.asset_id)),
    [trashItems],
  );

  // Filter out assets yang ada di trash bin
  const filteredAssets = useMemo(
    () =>
      trashedIds.size > 0
        ? assets.filter((asset) => !trashedIds.has(asset.id))
        : assets,
    [assets, trashedIds],
  );

  return {
    assets: filteredAssets,
    isLoading,
    hasNextPage,
    totalCount: filteredAssets.length,
  };
}
