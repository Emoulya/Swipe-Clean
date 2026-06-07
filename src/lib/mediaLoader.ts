/**
 * Media Loader — pagination loader menggunakan Query API baru dari expo-media-library SDK 56.
 *
 * API lama (getAssetsAsync, getAlbumsAsync, dll.) sudah deprecated dan throw di runtime.
 * Kita menggunakan class-based API: Query, Asset, Album, AssetField, MediaType.
 */

import {
  Asset,
  Album,
  Query,
  AssetField,
  MediaType,
  requestPermissionsAsync,
} from 'expo-media-library';
import { deleteAssetsAsync } from 'expo-media-library/legacy';

import { CONFIG } from '@/constants/config';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MediaFilter {
  mediaType: 'all' | 'photo' | 'video';
  dateRange: { from: number | null; to: number | null };
  albumId: string | null;
}

export interface AssetInfo {
  asset: Asset;
  filename: string;
  mediaType: MediaType;
  width: number;
  height: number;
  duration: number | null;
  creationTime: number | null;
  uri: string;
}

export interface ExtendedAsset extends Asset {
  cachedUri?: string;
  cachedMediaType?: MediaType;
  cachedDuration?: number | null;
  cachedWidth?: number;
  cachedHeight?: number;
  cachedCreationTime?: number | null;
  cachedFilename?: string;
}

export const DEFAULT_FILTER: MediaFilter = {
  mediaType: 'all',
  dateRange: { from: null, to: null },
  albumId: null,
};

// ─── Permissions ──────────────────────────────────────────────────────────────

export async function requestMediaPermission(): Promise<boolean> {
  const { status } = await requestPermissionsAsync(false, ['photo', 'video']);
  return status === 'granted';
}

// ─── Asset Loading ────────────────────────────────────────────────────────────

/**
 * Membangun Query object berdasarkan filter.
 * Mendukung filter mediaType, dateRange, dan album.
 */
function buildQuery(filter: MediaFilter, limit: number, offset: number): Query {
  let query = new Query().limit(limit).offset(offset);

  // Filter berdasarkan media type
  if (filter.mediaType === 'photo') {
    query = query.eq(AssetField.MEDIA_TYPE, MediaType.IMAGE);
  } else if (filter.mediaType === 'video') {
    query = query.eq(AssetField.MEDIA_TYPE, MediaType.VIDEO);
  }

  // Filter berdasarkan date range
  if (filter.dateRange.from !== null) {
    query = query.gte(AssetField.CREATION_TIME, filter.dateRange.from);
  }
  if (filter.dateRange.to !== null) {
    query = query.lte(AssetField.CREATION_TIME, filter.dateRange.to);
  }

  // Sort terbaru dulu
  query = query.orderBy({
    key: AssetField.CREATION_TIME,
    ascending: false,
  });

  return query;
}

/**
 * Load assets dengan pagination.
 * Mengembalikan array Asset class instances.
 */
export async function loadAssets(
  filter: MediaFilter = DEFAULT_FILTER,
  offset: number = 0,
  limit: number = CONFIG.PAGE_SIZE,
): Promise<Asset[]> {
  // Jika filter berdasarkan album, load dari album object
  if (filter.albumId) {
    return loadAlbumAssets(filter.albumId, filter, offset, limit);
  }

  const query = buildQuery(filter, limit, offset);
  return query.exe();
}

/**
 * Load assets dari album tertentu.
 */
async function loadAlbumAssets(
  albumId: string,
  filter: MediaFilter,
  offset: number,
  limit: number,
): Promise<Asset[]> {
  // Re-instantiate album dari ID
  const albums = await Album.getAll();
  const album = albums.find((a) => a.id === albumId);

  if (!album) return [];

  // Untuk album, kita load semua assets lalu filter manual
  // karena Query.album() method mungkin belum support semua filter chaining
  let query = new Query().limit(limit).offset(offset);

  query = query.album(album);

  if (filter.mediaType === 'photo') {
    query = query.eq(AssetField.MEDIA_TYPE, MediaType.IMAGE);
  } else if (filter.mediaType === 'video') {
    query = query.eq(AssetField.MEDIA_TYPE, MediaType.VIDEO);
  }

  if (filter.dateRange.from !== null) {
    query = query.gte(AssetField.CREATION_TIME, filter.dateRange.from);
  }
  if (filter.dateRange.to !== null) {
    query = query.lte(AssetField.CREATION_TIME, filter.dateRange.to);
  }

  query = query.orderBy({
    key: AssetField.CREATION_TIME,
    ascending: false,
  });

  return query.exe();
}

// ─── Album Loading ────────────────────────────────────────────────────────────

export interface AlbumInfo {
  album: Album;
  title: string;
  assetCount: number;
}

/**
 * Load semua album, diurutkan berdasarkan jumlah file terbanyak.
 */
export async function loadAlbums(): Promise<AlbumInfo[]> {
  const albums = await Album.getAll();

  const albumInfos: AlbumInfo[] = await Promise.all(
    albums.map(async (album) => {
      const title = await album.getTitle();
      const assets = await album.getAssets();
      return {
        album,
        title,
        assetCount: assets.length,
      };
    }),
  );

  // Urutkan: folder dengan file terbanyak di atas
  return albumInfos.sort((a, b) => b.assetCount - a.assetCount);
}

// ─── Asset Info Helper ────────────────────────────────────────────────────────

/**
 * Mengambil info lengkap dari Asset class instance.
 * Karena SDK 56 menggunakan async getters, kita batch semua getters.
 */
export async function getAssetInfo(asset: Asset): Promise<AssetInfo> {
  const [filename, mediaType, width, height, duration, creationTime, uri] =
    await Promise.all([
      asset.getFilename(),
      asset.getMediaType(),
      asset.getWidth(),
      asset.getHeight(),
      asset.getDuration(),
      asset.getCreationTime(),
      asset.getUri(),
    ]);

  return {
    asset,
    filename,
    mediaType,
    width,
    height,
    duration,
    creationTime,
    uri,
  };
}

/**
 * Batch resolve info untuk multiple assets.
 */
export async function getAssetsInfo(assets: Asset[]): Promise<AssetInfo[]> {
  return Promise.all(assets.map(getAssetInfo));
}

/**
 * Mengisi properti cache pada objek Asset secara paralel.
 * Mengembalikan objek ExtendedAsset untuk kemudahan akses sinkron di komponen UI.
 */
export async function extendAsset(asset: Asset): Promise<ExtendedAsset> {
  const extAsset = asset as ExtendedAsset;

  // Jika sudah terisi cache-nya, lewati
  if (extAsset.cachedUri) {
    return extAsset;
  }

  try {
    const [filename, mediaType, width, height, duration, creationTime, uri] =
      await Promise.all([
        asset.getFilename(),
        asset.getMediaType(),
        asset.getWidth(),
        asset.getHeight(),
        asset.getDuration(),
        asset.getCreationTime(),
        asset.getUri(),
      ]);

    extAsset.cachedFilename = filename;
    extAsset.cachedMediaType = mediaType;
    extAsset.cachedWidth = width;
    extAsset.cachedHeight = height;
    extAsset.cachedDuration = duration;
    extAsset.cachedCreationTime = creationTime;
    extAsset.cachedUri = uri;
  } catch (error) {
    console.error(`Failed to extend asset metadata for ID: ${asset.id}`, error);
    extAsset.cachedFilename = '';
    extAsset.cachedMediaType = MediaType.IMAGE;
    extAsset.cachedWidth = 0;
    extAsset.cachedHeight = 0;
    extAsset.cachedDuration = null;
    extAsset.cachedCreationTime = Date.now();
    extAsset.cachedUri = '';
  }

  return extAsset;
}

/**
 * Batch extend assets untuk performance optimization
 */
export async function extendAssets(assets: Asset[]): Promise<ExtendedAsset[]> {
  return Promise.all(assets.map(extendAsset));
}

// ─── Delete Assets ────────────────────────────────────────────────────────────

/**
 * Cari Asset instances dari array of asset IDs.
 * Diperlukan untuk menghapus file dari device karena Asset.delete()
 * membutuhkan class instances, bukan plain ID strings.
 *
 * Karena AssetField.ID tidak tersedia di SDK 56,
 * kita load batch besar dan filter by ID di memory.
 */
export async function findAssetsByIds(assetIds: string[]): Promise<Asset[]> {
  if (assetIds.length === 0) return [];

  const idSet = new Set(assetIds);
  const found: Asset[] = [];
  let offset = 0;
  const batchSize = 200;

  // Iterasi batch sampai semua ID ditemukan atau habis
  while (found.length < assetIds.length) {
    const batch = await new Query()
      .limit(batchSize)
      .offset(offset)
      .exe();

    if (batch.length === 0) break; // Tidak ada lagi asset

    for (const asset of batch) {
      if (idSet.has(asset.id)) {
        found.push(asset);
        if (found.length >= assetIds.length) break;
      }
    }

    offset += batchSize;
  }

  return found;
}

export interface DeleteAssetRef {
  id: string;
  uri: string;
}

/**
 * Mengambil numeric ID murni dari Android content URI (misal: content://.../12345 -> 12345).
 * Dibutuhkan karena legacy deleteAssetsAsync() me-require numeric ID untuk selection query selection,
 * sedangkan SDK 56 Class-based API mengembalikan ID berbentuk URI lengkap yang merusak sintaks SQL.
 */
function getNumericId(assetId: string): string {
  if (assetId.includes('/')) {
    const parts = assetId.split('/');
    return parts[parts.length - 1];
  }
  return assetId;
}

/**
 * Hapus assets secara permanen dari device.
 */
export async function deleteAssetsPermanently(assets: Asset[]): Promise<void> {
  if (assets.length === 0) return;

  const legacyAssets = assets.map((a) => {
    const extAsset = a as ExtendedAsset;
    return {
      id: getNumericId(a.id),
      uri: extAsset.cachedUri || a.id,
    };
  });

  // Gunakan legacy deleteAssetsAsync untuk stabilitas ActivityResultLauncher Android
  await deleteAssetsAsync(legacyAssets as any);
}

/**
 * Hapus assets dari device berdasarkan array of DeleteAssetRef.
 * Menggunakan legacy API agar stabil dari crash ActivityResultLauncher di Android.
 */
export async function deleteAssetsByIds(assets: DeleteAssetRef[]): Promise<void> {
  if (assets.length === 0) return;

  const legacyAssets = assets.map((a) => ({
    id: getNumericId(a.id),
    uri: a.uri,
  }));

  await deleteAssetsAsync(legacyAssets as any);
}
