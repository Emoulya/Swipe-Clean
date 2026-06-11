/**
 * Preloader — buffer lookahead untuk SwipeCard.
 * Pre-fetch URI dan info untuk N card ke depan agar rendering instan.
 */

import { Asset } from 'expo-media-library';

import { CONFIG } from '@/constants/config';
import { type AssetInfo, getAssetInfo } from '@/lib/mediaLoader';

// ─── Cache ────────────────────────────────────────────────────────────────────

const MAX_CACHE_SIZE = 30;
const preloadedCache = new Map<string, AssetInfo>();

/**
 * Pre-fetch info untuk asset yang akan ditampilkan.
 * Menggunakan cache agar tidak fetch ulang.
 */
export async function preloadAsset(asset: Asset): Promise<AssetInfo> {
  const cached = preloadedCache.get(asset.id);
  if (cached) return cached;

  const info = await getAssetInfo(asset);
  preloadedCache.set(asset.id, info);

  // Evict tertua jika melebihi batas kapasitas
  if (preloadedCache.size > MAX_CACHE_SIZE) {
    const firstKey = preloadedCache.keys().next().value;
    if (firstKey) {
      preloadedCache.delete(firstKey);
    }
  }

  return info;
}

/**
 * Preload batch assets dari currentIndex ke depan.
 * Preload sebanyak PRELOAD_BUFFER card setelah current.
 */
export async function preloadAhead(
  assets: Asset[],
  currentIndex: number,
): Promise<void> {
  const startIndex = currentIndex + 1;
  const endIndex = Math.min(startIndex + CONFIG.PRELOAD_BUFFER, assets.length);

  const promises: Promise<AssetInfo>[] = [];
  for (let i = startIndex; i < endIndex; i++) {
    promises.push(preloadAsset(assets[i]));
  }

  await Promise.allSettled(promises);
}

/**
 * Ambil info asset dari cache, atau fetch jika belum ada.
 */
export async function getPreloadedInfo(asset: Asset): Promise<AssetInfo> {
  return preloadAsset(asset);
}

/**
 * Hapus entry dari cache (setelah card di-swipe dan sudah tidak dibutuhkan).
 */
export function evictFromCache(assetId: string): void {
  preloadedCache.delete(assetId);
}

/**
 * Reset seluruh cache (saat session baru dimulai atau filter berubah).
 */
export function clearPreloadCache(): void {
  preloadedCache.clear();
}
