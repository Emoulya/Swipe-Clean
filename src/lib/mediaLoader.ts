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
import { deleteAssetsAsync, getAlbumsAsync, getAssetsAsync } from 'expo-media-library/legacy';
import * as VideoThumbnails from 'expo-video-thumbnails';

import { CONFIG } from '@/constants/config';

// ─── Cache & Helpers ──────────────────────────────────────────────────────────

const videoThumbnailCache = new Map<string, string>();

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
  thumbnailUri?: string;
}

export interface ExtendedAsset extends Asset {
  cachedUri?: string;
  cachedMediaType?: MediaType;
  cachedDuration?: number | null;
  cachedWidth?: number;
  cachedHeight?: number;
  cachedCreationTime?: number | null;
  cachedFilename?: string;
  cachedAlbumName?: string;
}

export const DEFAULT_FILTER: MediaFilter = {
  mediaType: 'all',
  dateRange: { from: null, to: null },
  albumId: null,
};

// ─── Indonesia Date Formatter ──────────────────────────────────────────────────

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function formatDateId(timestamp: number | null): string {
  if (!timestamp) return 'Tanggal Tidak Diketahui';
  const date = new Date(timestamp);
  const day = date.getDate();
  const month = MONTH_NAMES_ID[date.getMonth()];
  const year = date.getFullYear().toString().slice(-2);
  return `${month} ${day} ${year}`;
}

// ─── Album Caching Map (Deleted for performance optimization) ─────────────────


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
  coverUri?: string;
}

export async function loadAlbums(): Promise<AlbumInfo[]> {
  // Gunakan legacy API untuk mendapatkan semua album dan assetCount secara instan
  const legacyAlbums = await getAlbumsAsync({ includeSmartAlbums: true });

  const albumInfos: AlbumInfo[] = await Promise.all(
    legacyAlbums.map(async (legacyAlbum) => {
      let coverUri: string | undefined = undefined;

        try {
          // Ambil up to 5 asset pertama dari album untuk mendapatkan cover URI terbaik
          const assetsResult = await getAssetsAsync({
            album: legacyAlbum.id,
            first: 5,
          });
          if (assetsResult.assets.length > 0) {
            // Prioritaskan asset bertipe photo (gambar) yang pasti bisa dirender langsung
            const photoAsset = assetsResult.assets.find((a) => a.mediaType === 'photo');
            coverUri = photoAsset ? photoAsset.uri : assetsResult.assets[0].uri;
          }
        } catch {
          // Ignored
        }

      return {
        album: new Album(legacyAlbum.id),
        title: legacyAlbum.title,
        assetCount: legacyAlbum.assetCount,
        coverUri,
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

  let thumbnailUri: string | undefined = undefined;
  if (mediaType === MediaType.VIDEO) {
    try {
      const cached = videoThumbnailCache.get(uri);
      if (cached) {
        thumbnailUri = cached;
      } else {
        const thumb = await VideoThumbnails.getThumbnailAsync(uri, { time: 0 });
        videoThumbnailCache.set(uri, thumb.uri);
        thumbnailUri = thumb.uri;
      }
    } catch (err) {
      console.warn(`Failed to generate video thumbnail in getAssetInfo for ${asset.id}:`, err);
    }
  }

  return {
    asset,
    filename,
    mediaType,
    width,
    height,
    duration,
    creationTime,
    uri,
    thumbnailUri,
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
export async function extendAsset(asset: Asset, albumName?: string): Promise<ExtendedAsset> {
  const extAsset = asset as ExtendedAsset;

  // Jika sudah terisi cache-nya, kita bisa langsung update albumName-nya saja
  if (extAsset.cachedUri) {
    if (albumName) {
      extAsset.cachedAlbumName = albumName;
    }
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
    extAsset.cachedAlbumName = albumName || 'Galeri';

    if (mediaType === MediaType.VIDEO) {
      try {
        const cached = videoThumbnailCache.get(uri);
        if (cached) {
          extAsset.cachedUri = cached;
        } else {
          const thumb = await VideoThumbnails.getThumbnailAsync(uri, { time: 0 });
          videoThumbnailCache.set(uri, thumb.uri);
          extAsset.cachedUri = thumb.uri;
        }
      } catch (thumbError) {
        console.warn(`Failed to generate thumbnail for video asset ${asset.id}:`, thumbError);
        extAsset.cachedUri = uri; // Fallback
      }
    } else {
      extAsset.cachedUri = uri;
    }
  } catch (error) {
    console.error(`Failed to extend asset metadata for ID: ${asset.id}`, error);
    extAsset.cachedFilename = '';
    extAsset.cachedMediaType = MediaType.IMAGE;
    extAsset.cachedWidth = 0;
    extAsset.cachedHeight = 0;
    extAsset.cachedDuration = null;
    extAsset.cachedCreationTime = Date.now();
    extAsset.cachedUri = '';
    extAsset.cachedAlbumName = albumName || 'Galeri';
  }

  return extAsset;
}

/**
 * Batch extend assets untuk performance optimization dengan concurrency limit 10
 */
export async function extendAssets(assets: Asset[], albumName?: string): Promise<ExtendedAsset[]> {
  const results: ExtendedAsset[] = [];
  const BATCH_SIZE = 10;
  
  for (let i = 0; i < assets.length; i += BATCH_SIZE) {
    const batch = assets.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map((a) => extendAsset(a, albumName)));
    results.push(...batchResults);
  }
  
  return results;
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
