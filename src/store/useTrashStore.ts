/**
 * Zustand store: useTrashStore
 * Mirror data dari SQLite trash_bin table ke dalam React state.
 * Semua mutasi disinkronkan antara SQLite dan Zustand.
 */

import { create } from 'zustand';
import { Asset } from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';

import {
  type TrashBinRow,
  addToTrash as dbAddToTrash,
  removeFromTrash as dbRemoveFromTrash,
  getTrashItems as dbGetTrashItems,
  clearAllTrash as dbClearAllTrash,
  getTrashTotalSize as dbGetTrashTotalSize,
  clearExpiredTrash as dbClearExpiredTrash,
} from '@/lib/db';
import { getAssetInfo, deleteAssetsByIds, type DeleteAssetRef } from '@/lib/mediaLoader';
import { useMediaStore } from './useMediaStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrashState {
  items: TrashBinRow[];
  totalSize: number;
  isLoading: boolean;

  // Actions
  loadTrash: () => Promise<void>;
  addToTrash: (asset: Asset, albumId?: string | null) => Promise<void>;
  restoreFromTrash: (assetId: string) => Promise<void>;
  deletePermanently: (assetIds: string[]) => Promise<void>;
  clearAllTrash: () => Promise<void>;
  clearExpiredTrash: (maxAgeDays: number) => Promise<void>;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useTrashStore = create<TrashState>((set, get) => ({
  items: [],
  totalSize: 0,
  isLoading: false,

  loadTrash: async () => {
    set({ isLoading: true });
    try {
      const [items, totalSize] = await Promise.all([
        dbGetTrashItems(),
        dbGetTrashTotalSize(),
      ]);
      set({ items, totalSize, isLoading: false });
    } catch (error) {
      console.error('Failed to load trash:', error);
      set({ isLoading: false });
    }
  },

  addToTrash: async (asset, albumId = null) => {
    try {
      const info = await getAssetInfo(asset);

      let fileSize: number | null = null;
      try {
        const fileInfo = await FileSystem.getInfoAsync(info.uri);
        if (fileInfo.exists) {
          fileSize = fileInfo.size ?? null;
        }
      } catch (e) {
        console.warn(`Failed to get file size for URI: ${info.uri}`, e);
      }

      const trashRow: Omit<TrashBinRow, 'id'> = {
        asset_id: asset.id,
        filename: info.filename,
        uri: info.uri,
        media_type: info.mediaType === 'image' ? 'photo' : 'video',
        file_size: fileSize,
        width: info.width,
        height: info.height,
        duration: info.duration,
        album_id: albumId ?? null,
        trashed_at: Date.now(),
        created_at: info.creationTime,
      };

      await dbAddToTrash(trashRow);

      // Reload agar sinkron
      await get().loadTrash();
    } catch (error) {
      console.error('Failed to add to trash:', error);
    }
  },

  restoreFromTrash: async (assetId) => {
    try {
      await dbRemoveFromTrash(assetId);
      await get().loadTrash();
    } catch (error) {
      console.error('Failed to restore from trash:', error);
    }
  },

  deletePermanently: async (assetIds) => {
    try {
      const { items } = get();
      // Map assetIds to DeleteAssetRef using items in state
      const assetsToDelete: DeleteAssetRef[] = items
        .filter((item) => assetIds.includes(item.asset_id))
        .map((item) => ({
          id: item.asset_id,
          uri: item.uri,
        }));

      // Hapus file dari device
      await deleteAssetsByIds(assetsToDelete);

      // Sinkronkan state useMediaStore
      useMediaStore.getState().removeAssetsByIds(assetIds);

      // Hapus record dari database
      for (const assetId of assetIds) {
        await dbRemoveFromTrash(assetId);
      }
      await get().loadTrash();
    } catch (error) {
      console.error('Failed to delete permanently:', error);
    }
  },

  clearAllTrash: async () => {
    try {
      const { items } = get();
      const assetsToDelete: DeleteAssetRef[] = items.map((item) => ({
        id: item.asset_id,
        uri: item.uri,
      }));

      if (assetsToDelete.length > 0) {
        // Hapus semua file dari device
        await deleteAssetsByIds(assetsToDelete);

        // Sinkronkan state useMediaStore
        const assetIds = items.map((item) => item.asset_id);
        useMediaStore.getState().removeAssetsByIds(assetIds);
      }

      // Hapus semua record dari database
      await dbClearAllTrash();
      set({ items: [], totalSize: 0 });
    } catch (error) {
      console.error('Failed to clear all trash:', error);
    }
  },

  clearExpiredTrash: async (maxAgeDays) => {
    try {
      await dbClearExpiredTrash(maxAgeDays);
      await get().loadTrash();
    } catch (error) {
      console.error('Failed to clear expired trash:', error);
    }
  },
}));
