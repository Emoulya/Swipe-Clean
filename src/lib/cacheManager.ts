/**
 * Cache Manager — Utilitas untuk menghitung dan membersihkan cache aplikasi.
 * Terutama mengelola folder VideoThumbnails dari expo-video-thumbnails
 * dan cache disk dari expo-image.
 */

import { cacheDirectory, deleteAsync, getInfoAsync, readDirectoryAsync } from 'expo-file-system/legacy';
import { Image } from 'expo-image';

const VIDEO_THUMBNAILS_DIR = `${cacheDirectory}VideoThumbnails/`;

/**
 * Menghitung ukuran total cache dalam satuan Byte.
 * Hanya menghitung folder VideoThumbnails karena dapat diakses secara langsung di level JS.
 */
export async function getCacheSize(): Promise<number> {
  try {
    const dirInfo = await getInfoAsync(VIDEO_THUMBNAILS_DIR);
    if (!dirInfo.exists || !dirInfo.isDirectory) {
      return 0;
    }

    const files = await readDirectoryAsync(VIDEO_THUMBNAILS_DIR);
    let totalSize = 0;

    // Hitung ukuran setiap file di dalam folder secara paralel
    const sizePromises = files.map(async (fileName) => {
      try {
        const fileInfo = await getInfoAsync(VIDEO_THUMBNAILS_DIR + fileName);
        if (fileInfo.exists && !fileInfo.isDirectory) {
          return fileInfo.size;
        }
      } catch {
        // Ignored
      }
      return 0;
    });

    const sizes = await Promise.all(sizePromises);
    totalSize = sizes.reduce((acc, curr) => acc + curr, 0);

    return totalSize;
  } catch (error) {
    console.warn('Failed to calculate cache size:', error);
    return 0;
  }
}

/**
 * Memformat ukuran byte menjadi format yang ramah pengguna (misal: 12.34 MB).
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Membersihkan cache video thumbnails dan cache disk gambar expo-image.
 */
export async function clearAppCache(): Promise<void> {
  // 1. Hapus direktori VideoThumbnails
  try {
    const dirInfo = await getInfoAsync(VIDEO_THUMBNAILS_DIR);
    if (dirInfo.exists) {
      await deleteAsync(VIDEO_THUMBNAILS_DIR, { idempotent: true });
    }
  } catch (error) {
    console.warn('Failed to delete VideoThumbnails cache directory:', error);
  }

  // 2. Bersihkan cache expo-image (Glide disk cache)
  try {
    await Image.clearDiskCache();
  } catch (error) {
    console.warn('Failed to clear expo-image disk cache:', error);
  }
}
