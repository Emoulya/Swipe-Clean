/**
 * Zustand store: useSettingsStore
 * Menyimpan preferensi pengguna (auto-play, muted, haptics, dll.) ke SQLite dan state.
 */

import { create } from 'zustand';
import { getSettingFromDB, setSettingInDB } from '@/lib/db';

interface SettingsState {
  autoPlay: boolean;
  muted: boolean;
  hapticEnabled: boolean;
  autoClearDays: number;
  isLoaded: boolean;

  loadSettings: () => Promise<void>;
  setAutoPlay: (value: boolean) => Promise<void>;
  setMuted: (value: boolean) => Promise<void>;
  setHapticEnabled: (value: boolean) => Promise<void>;
  setAutoClearDays: (value: number) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  autoPlay: true,
  muted: true,
  hapticEnabled: true,
  autoClearDays: 30,
  isLoaded: false,

  loadSettings: async () => {
    try {
      const autoPlayVal = await getSettingFromDB('autoPlay', 'true');
      const mutedVal = await getSettingFromDB('muted', 'true');
      const hapticVal = await getSettingFromDB('hapticEnabled', 'true');
      const autoClearVal = await getSettingFromDB('autoClearDays', '30');

      set({
        autoPlay: autoPlayVal === 'true',
        muted: mutedVal === 'true',
        hapticEnabled: hapticVal === 'true',
        autoClearDays: parseInt(autoClearVal, 10) || 30,
        isLoaded: true,
      });
    } catch (error) {
      console.error('Failed to load settings store:', error);
    }
  },

  setAutoPlay: async (value) => {
    set({ autoPlay: value });
    await setSettingInDB('autoPlay', value ? 'true' : 'false');
  },

  setMuted: async (value) => {
    set({ muted: value });
    await setSettingInDB('muted', value ? 'true' : 'false');
  },

  setHapticEnabled: async (value) => {
    set({ hapticEnabled: value });
    await setSettingInDB('hapticEnabled', value ? 'true' : 'false');
  },

  setAutoClearDays: async (value) => {
    set({ autoClearDays: value });
    await setSettingInDB('autoClearDays', value.toString());
  },
}));
