/**
 * Database layer — SQLite schema, migrasi, dan query helpers.
 * Menggunakan expo-sqlite API untuk SDK 56.
 */

import * as SQLite from 'expo-sqlite';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrashBinRow {
  id: number;
  asset_id: string;
  filename: string;
  uri: string;
  media_type: 'photo' | 'video';
  file_size: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  album_id: string | null;
  trashed_at: number;
  created_at: number | null;
}

export interface SwipeHistoryRow {
  id: number;
  asset_id: string;
  action: 'delete' | 'keep' | 'undo';
  session_id: string;
  swiped_at: number;
}

// ─── Database Singleton ───────────────────────────────────────────────────────

let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Mendapatkan instance database singleton.
 * Otomatis menjalankan migrasi saat pertama kali dipanggil.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await SQLite.openDatabaseAsync('swipeclean.db');
  await migrateDatabase(dbInstance);
  return dbInstance;
}

// ─── Migrasi ──────────────────────────────────────────────────────────────────

const DATABASE_VERSION = 2;

async function migrateDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  let currentVersion = result?.user_version ?? 0;

  if (currentVersion >= DATABASE_VERSION) return;

  if (currentVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS trash_bin (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id    TEXT NOT NULL UNIQUE,
        filename    TEXT NOT NULL,
        uri         TEXT NOT NULL,
        media_type  TEXT NOT NULL,
        file_size   INTEGER,
        width       INTEGER,
        height      INTEGER,
        duration    REAL,
        album_id    TEXT,
        trashed_at  INTEGER NOT NULL,
        created_at  INTEGER
      );

      CREATE TABLE IF NOT EXISTS swipe_history (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id    TEXT NOT NULL,
        action      TEXT NOT NULL,
        session_id  TEXT NOT NULL,
        swiped_at   INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key    TEXT PRIMARY KEY,
        value  TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_trash_trashed_at ON trash_bin(trashed_at);
      CREATE INDEX IF NOT EXISTS idx_trash_album ON trash_bin(album_id);
    `);
    
    // Insert default settings
    await db.runAsync("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('autoPlay', 'true')");
    await db.runAsync("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('muted', 'true')");
    await db.runAsync("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('hapticEnabled', 'true')");
    await db.runAsync("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('autoClearDays', '30')");

    currentVersion = 2;
  }

  if (currentVersion === 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key    TEXT PRIMARY KEY,
        value  TEXT NOT NULL
      );
      INSERT OR IGNORE INTO app_settings (key, value) VALUES ('autoPlay', 'true');
      INSERT OR IGNORE INTO app_settings (key, value) VALUES ('muted', 'true');
      INSERT OR IGNORE INTO app_settings (key, value) VALUES ('hapticEnabled', 'true');
      INSERT OR IGNORE INTO app_settings (key, value) VALUES ('autoClearDays', '30');
    `);
    currentVersion = 2;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

// ─── Settings Queries ─────────────────────────────────────────────────────────

export async function getSettingFromDB(key: string, defaultValue: string): Promise<string> {
  try {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM app_settings WHERE key = ?',
      key,
    );
    return result?.value ?? defaultValue;
  } catch (e) {
    console.error(`Failed to get setting ${key}:`, e);
    return defaultValue;
  }
}

export async function setSettingInDB(key: string, value: string): Promise<void> {
  try {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
      key,
      value,
    );
  } catch (e) {
    console.error(`Failed to set setting ${key}:`, e);
  }
}

// ─── Trash Bin Queries ────────────────────────────────────────────────────────

export async function addToTrash(item: Omit<TrashBinRow, 'id'>): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO trash_bin
      (asset_id, filename, uri, media_type, file_size, width, height, duration, album_id, trashed_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    item.asset_id,
    item.filename,
    item.uri,
    item.media_type,
    item.file_size,
    item.width,
    item.height,
    item.duration,
    item.album_id,
    item.trashed_at,
    item.created_at,
  );
}

export async function removeFromTrash(assetId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM trash_bin WHERE asset_id = ?', assetId);
}

export async function getTrashItems(): Promise<TrashBinRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<TrashBinRow>(
    'SELECT * FROM trash_bin ORDER BY trashed_at DESC'
  );
}

export async function getTrashItemByAssetId(assetId: string): Promise<TrashBinRow | null> {
  const db = await getDatabase();
  return db.getFirstAsync<TrashBinRow>(
    'SELECT * FROM trash_bin WHERE asset_id = ?',
    assetId,
  );
}

export async function clearExpiredTrash(maxAgeDays: number): Promise<number> {
  const db = await getDatabase();
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  const result = await db.runAsync(
    'DELETE FROM trash_bin WHERE trashed_at < ?',
    cutoff,
  );
  return result.changes;
}

export async function clearAllTrash(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM trash_bin');
}

export async function getTrashTotalSize(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ total: number }>(
    'SELECT COALESCE(SUM(file_size), 0) as total FROM trash_bin'
  );
  return result?.total ?? 0;
}

// ─── Swipe History Queries ────────────────────────────────────────────────────

export async function addSwipeHistory(
  assetId: string,
  action: 'delete' | 'keep' | 'undo',
  sessionId: string,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO swipe_history (asset_id, action, session_id, swiped_at)
     VALUES (?, ?, ?, ?)`,
    assetId,
    action,
    sessionId,
    Date.now(),
  );
}

export async function getSessionStats(sessionId: string): Promise<{
  deleted: number;
  kept: number;
  undone: number;
}> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ action: string; count: number }>(
    `SELECT action, COUNT(*) as count FROM swipe_history
     WHERE session_id = ? GROUP BY action`,
    sessionId,
  );

  const stats = { deleted: 0, kept: 0, undone: 0 };
  for (const row of rows) {
    if (row.action === 'delete') stats.deleted = row.count;
    else if (row.action === 'keep') stats.kept = row.count;
    else if (row.action === 'undo') stats.undone = row.count;
  }
  return stats;
}
