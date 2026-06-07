/**
 * Konstanta konfigurasi aplikasi SwipeClean.
 * Semua magic numbers dan threshold disentralisasi di sini.
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const CONFIG = {
  // Swipe engine
  SWIPE_VELOCITY_THRESHOLD: 800,
  SWIPE_DISTANCE_THRESHOLD: 0.35,
  CARD_ROTATION_FACTOR: 15,
  STACK_SIZE: 3,
  PRELOAD_BUFFER: 3,

  // Video
  VIDEO_MAX_PREVIEW_DURATION: 30,
  VIDEO_AUTOPLAY: true,
  VIDEO_MUTED_DEFAULT: true,

  // Trash
  TRASH_AUTO_CLEAR_DAYS: 30,
  UNDO_TIMEOUT_MS: 5000,

  // Grid
  GRID_COLUMNS: 3,
  GRID_ITEM_SIZE: Math.floor(SCREEN_WIDTH / 3),

  // Pagination
  PAGE_SIZE: 50,

  // Animasi
  SPRING_CONFIG: {
    damping: 15,
    stiffness: 150,
    mass: 0.8,
  },

  // Pinch-to-zoom
  PINCH_MIN_SCALE: 1.0,
  PINCH_MAX_SCALE: 4.0,

  // Layout
  SCREEN_WIDTH,
  SCREEN_HEIGHT,

  // Edge avoidance — hindari konflik dengan back gesture Android
  EDGE_DEAD_ZONE: 20,
} as const;
