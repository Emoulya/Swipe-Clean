/**
 * useSwipeSession — logic untuk sesi swipe.
 *
 * Mengelola: index aktif, undo handler, progress tracking,
 * session ID, dan interaksi dengan trash store.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Asset } from 'expo-media-library';
import * as Haptics from 'expo-haptics';

import { useTrashStore } from '@/store/useTrashStore';
import { addSwipeHistory } from '@/lib/db';
import { preloadAhead, evictFromCache } from '@/lib/preloader';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SwipeSessionReturn {
  currentIndex: number;
  deletedCount: number;
  keptCount: number;
  sessionId: string;
  isFinished: boolean;
  lastDeletedAsset: Asset | null;
  canUndo: boolean;

  handleSwipeLeft: (asset: Asset) => void;
  handleSwipeRight: (asset: Asset) => void;
  handleUndo: () => void;
  resetSession: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSwipeSession(
  assets: Asset[],
  albumId?: string | null,
  initialIndex: number = 0,
): SwipeSessionReturn {
  const sessionId = useMemo(() => generateSessionId(), []);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [deletedCount, setDeletedCount] = useState(0);
  const [keptCount, setKeptCount] = useState(0);
  const [lastDeletedAsset, setLastDeletedAsset] = useState<Asset | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Gunakan ref untuk melacak index saat ini secara aman tanpa race condition di gesture handler
  const currentIndexRef = useRef(initialIndex);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const addToTrash = useTrashStore((s) => s.addToTrash);
  const restoreFromTrash = useTrashStore((s) => s.restoreFromTrash);

  const isFinished = currentIndex >= assets.length;

  // ─── Swipe Left (Hapus) ───────────────────────────────────────────────────

  const handleSwipeLeft = useCallback(
    async (asset: Asset) => {
      // Guard: cegah aksi jika index sudah di akhir/selesai
      if (currentIndexRef.current >= assets.length) return;

      try {
        // Haptic feedback — warning
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

        // Tambah ke trash
        await addToTrash(asset, albumId ?? null);

        // Catat ke history
        await addSwipeHistory(asset.id, 'delete', sessionId);

        // Update state
        setDeletedCount((prev) => prev + 1);
        setLastDeletedAsset(asset);
        setCanUndo(true);

        // Clear previous undo timer
        if (undoTimerRef.current) {
          clearTimeout(undoTimerRef.current);
        }

        // Set auto-expire undo setelah 5 detik
        undoTimerRef.current = setTimeout(() => {
          setCanUndo(false);
          setLastDeletedAsset(null);
        }, 5000);

        // Advance ke card berikutnya menggunakan functional update
        setCurrentIndex((prev) => prev + 1);

        // Preload lebih jauh menggunakan index berikutnya
        const nextIndex = currentIndexRef.current + 1;
        preloadAhead(assets, nextIndex);

        // Evict card yang sudah lewat dari cache
        evictFromCache(asset.id);
      } catch (error) {
        console.error('Error handling swipe left:', error);
      }
    },
    [addToTrash, albumId, assets, sessionId],
  );

  // ─── Swipe Right (Simpan) ─────────────────────────────────────────────────

  const handleSwipeRight = useCallback(
    async (asset: Asset) => {
      // Guard: cegah aksi jika index sudah di akhir/selesai
      if (currentIndexRef.current >= assets.length) return;

      try {
        // Haptic feedback — medium impact
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Catat ke history
        await addSwipeHistory(asset.id, 'keep', sessionId);

        // Update state
        setKeptCount((prev) => prev + 1);

        // Disable undo dari aksi sebelumnya
        setCanUndo(false);
        setLastDeletedAsset(null);
        if (undoTimerRef.current) {
          clearTimeout(undoTimerRef.current);
        }

        // Advance ke card berikutnya menggunakan functional update
        setCurrentIndex((prev) => prev + 1);

        // Preload lebih jauh menggunakan index berikutnya
        const nextIndex = currentIndexRef.current + 1;
        preloadAhead(assets, nextIndex);

        // Evict card yang sudah lewat dari cache
        evictFromCache(asset.id);
      } catch (error) {
        console.error('Error handling swipe right:', error);
      }
    },
    [assets, sessionId],
  );

  // ─── Undo ─────────────────────────────────────────────────────────────────

  const handleUndo = useCallback(async () => {
    if (!canUndo || !lastDeletedAsset) return;

    try {
      // Haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Restore dari trash
      await restoreFromTrash(lastDeletedAsset.id);

      // Catat undo ke history
      await addSwipeHistory(lastDeletedAsset.id, 'undo', sessionId);

      // Kembali ke card sebelumnya
      setCurrentIndex((prev) => Math.max(0, prev - 1));
      setDeletedCount((prev) => Math.max(0, prev - 1));
      setCanUndo(false);
      setLastDeletedAsset(null);

      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    } catch (error) {
      console.error('Error handling undo:', error);
    }
  }, [canUndo, lastDeletedAsset, restoreFromTrash, sessionId]);

  // ─── Reset ────────────────────────────────────────────────────────────────

  const resetSession = useCallback(() => {
    setCurrentIndex(initialIndex);
    setDeletedCount(0);
    setKeptCount(0);
    setLastDeletedAsset(null);
    setCanUndo(false);

    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }
  }, [initialIndex]);

  return {
    currentIndex,
    deletedCount,
    keptCount,
    sessionId,
    isFinished,
    lastDeletedAsset,
    canUndo,
    handleSwipeLeft,
    handleSwipeRight,
    handleUndo,
    resetSession,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
