/**
 * Zustand store: useMediaStore
 * Mengelola daftar assets, filter aktif, dan pagination state.
 *
 * Catatan SDK 56: Asset sekarang class instance dengan async getters,
 * bukan plain object lagi.
 */

import { create } from 'zustand';

import {
  type MediaFilter,
  DEFAULT_FILTER,
  loadAssets,
  requestMediaPermission,
  type ExtendedAsset,
  extendAssets,
} from '@/lib/mediaLoader';
import { CONFIG } from '@/constants/config';
import { clearPreloadCache } from '@/lib/preloader';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MediaState {
  // Assets
  assets: ExtendedAsset[];
  totalCount: number;
  isLoading: boolean;
  hasNextPage: boolean;
  currentOffset: number;

  // Permission
  hasPermission: boolean | null;

  // Filter aktif
  filter: MediaFilter;

  // Actions
  requestPermission: () => Promise<boolean>;
  loadInitialAssets: (minSize?: number) => Promise<void>;
  loadMoreAssets: () => Promise<void>;
  refreshAssets: () => Promise<void>;
  setFilter: (filter: Partial<MediaFilter>, minSize?: number) => void;
  resetFilter: () => void;
  removeAssetsByIds: (assetIds: string[]) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useMediaStore = create<MediaState>((set, get) => ({
  assets: [],
  totalCount: 0,
  isLoading: false,
  hasNextPage: true,
  currentOffset: 0,
  hasPermission: null,
  filter: { ...DEFAULT_FILTER },

  requestPermission: async () => {
    const granted = await requestMediaPermission();
    set({ hasPermission: granted });
    return granted;
  },

  loadInitialAssets: async (minSize?: number) => {
    const state = get();
    if (state.isLoading) return;

    set({ isLoading: true });

    try {
      const pageSize = minSize && minSize > CONFIG.PAGE_SIZE ? minSize : CONFIG.PAGE_SIZE;
      const rawAssets = await loadAssets(state.filter, 0, pageSize);
      const assets = await extendAssets(rawAssets);

      set({
        assets,
        currentOffset: assets.length,
        hasNextPage: assets.length >= pageSize,
        totalCount: assets.length,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load assets:', error);
      set({ isLoading: false });
    }
  },

  loadMoreAssets: async () => {
    const state = get();
    if (state.isLoading || !state.hasNextPage) return;

    set({ isLoading: true });

    try {
      const rawNewAssets = await loadAssets(
        state.filter,
        state.currentOffset,
        CONFIG.PAGE_SIZE,
      );
      const newAssets = await extendAssets(rawNewAssets);

      set({
        assets: [...state.assets, ...newAssets],
        currentOffset: state.currentOffset + newAssets.length,
        hasNextPage: newAssets.length >= CONFIG.PAGE_SIZE,
        totalCount: state.assets.length + newAssets.length,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load more assets:', error);
      set({ isLoading: false });
    }
  },

  refreshAssets: async () => {
    clearPreloadCache();
    set({ assets: [], currentOffset: 0, hasNextPage: true });
    await get().loadInitialAssets();
  },

  setFilter: (partialFilter, minSize) => {
    const currentFilter = get().filter;
    const newFilter = { ...currentFilter, ...partialFilter };

    clearPreloadCache();
    set({
      filter: newFilter,
      assets: [],
      currentOffset: 0,
      hasNextPage: true,
      totalCount: 0,
    });

    // Auto-reload setelah filter berubah
    get().loadInitialAssets(minSize);
  },

  resetFilter: () => {
    clearPreloadCache();
    set({
      filter: { ...DEFAULT_FILTER },
      assets: [],
      currentOffset: 0,
      hasNextPage: true,
      totalCount: 0,
    });

    get().loadInitialAssets();
  },

  removeAssetsByIds: (assetIds) => {
    if (assetIds.length === 0) return;
    const idSet = new Set(assetIds);
    set((state) => {
      const updatedAssets = state.assets.filter((asset) => !idSet.has(asset.id));
      const removedCount = state.assets.length - updatedAssets.length;
      return {
        assets: updatedAssets,
        totalCount: Math.max(0, state.totalCount - removedCount),
        currentOffset: Math.max(0, state.currentOffset - removedCount),
      };
    });
  },
}));
