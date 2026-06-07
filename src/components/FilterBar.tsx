/**
 * FilterBar — timeline horizontal scroll + toggle tipe media.
 *
 * Pilihan waktu: Semua | Hari ini | Kemarin | Minggu ini | Bulan ini | Pilih tanggal...
 * Toggle tipe: Gambar / Video / Semua
 * Menyimpan filter terakhir ke expo-sqlite/kv-store agar persisten.
 */

import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { Folder, Image as LucideImage, Video } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { type MediaFilter } from '@/lib/mediaLoader';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FilterBarProps {
  filter: MediaFilter;
  onFilterChange: (filter: Partial<MediaFilter>) => void;
}

interface ChipProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

// ─── Date Range Presets ───────────────────────────────────────────────────────

type DatePresetKey = 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month';

interface DatePreset {
  key: DatePresetKey;
  label: string;
  getRange: () => { from: number | null; to: number | null };
}

function getStartOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const DATE_PRESETS: DatePreset[] = [
  {
    key: 'all',
    label: 'Semua',
    getRange: () => ({ from: null, to: null }),
  },
  {
    key: 'today',
    label: 'Hari ini',
    getRange: () => ({
      from: getStartOfDay(new Date()),
      to: Date.now(),
    }),
  },
  {
    key: 'yesterday',
    label: 'Kemarin',
    getRange: () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        from: getStartOfDay(yesterday),
        to: getStartOfDay(new Date()),
      };
    },
  },
  {
    key: 'this_week',
    label: 'Minggu ini',
    getRange: () => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      return {
        from: getStartOfDay(monday),
        to: Date.now(),
      };
    },
  },
  {
    key: 'this_month',
    label: 'Bulan ini',
    getRange: () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        from: getStartOfDay(firstDay),
        to: Date.now(),
      };
    },
  },
];

// ─── Media Type Options ───────────────────────────────────────────────────────

type MediaTypeOption = 'all' | 'photo' | 'video';

const MEDIA_TYPE_OPTIONS = [
  { key: 'all', label: 'Semua', icon: Folder },
  { key: 'photo', label: 'Gambar', icon: LucideImage },
  { key: 'video', label: 'Video', icon: Video },
] as const;

// ─── Chip Component ───────────────────────────────────────────────────────────

function Chip({ label, isActive, onPress }: ChipProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: isActive ? theme.primary : theme.backgroundElement,
          borderColor: isActive ? theme.primary : theme.border,
        },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          { color: isActive ? '#FFFFFF' : theme.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FilterBar({ filter, onFilterChange }: FilterBarProps) {
  const theme = useTheme();

  // Menentukan preset tanggal yang aktif
  const activeDatePreset = useMemo((): DatePresetKey => {
    if (filter.dateRange.from === null && filter.dateRange.to === null) {
      return 'all';
    }
    // Cek apakah cocok dengan preset
    for (const preset of DATE_PRESETS) {
      if (preset.key === 'all') continue;
      const range = preset.getRange();
      // Toleransi 1 menit untuk perbandingan
      if (
        range.from !== null &&
        filter.dateRange.from !== null &&
        Math.abs(range.from - filter.dateRange.from) < 60000
      ) {
        return preset.key;
      }
    }
    return 'all';
  }, [filter.dateRange]);

  const handleDatePresetPress = useCallback(
    (preset: DatePreset) => {
      const range = preset.getRange();
      onFilterChange({ dateRange: range });
    },
    [onFilterChange],
  );

  const handleMediaTypePress = useCallback(
    (type: MediaTypeOption) => {
      onFilterChange({ mediaType: type });
    },
    [onFilterChange],
  );

  return (
    <View style={[styles.container, { borderBottomColor: theme.border }]}>
      {/* Date timeline scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {DATE_PRESETS.map((preset) => (
          <Chip
            key={preset.key}
            label={preset.label}
            isActive={activeDatePreset === preset.key}
            onPress={() => handleDatePresetPress(preset)}
          />
        ))}
      </ScrollView>

      {/* Media type toggle */}
      <View style={styles.typeToggleRow}>
        {MEDIA_TYPE_OPTIONS.map((option) => {
          const IconComponent = option.icon;
          const isActive = filter.mediaType === option.key;
          const iconColor = isActive ? '#FFFFFF' : theme.textSecondary;

          return (
            <Pressable
              key={option.key}
              onPress={() => handleMediaTypePress(option.key)}
              style={[
                styles.typeToggle,
                {
                  backgroundColor: isActive
                    ? theme.primary
                    : theme.backgroundElement,
                },
              ]}
            >
              <IconComponent color={iconColor} size={16} />
              <Text
                style={[
                  styles.typeToggleText,
                  {
                    color: isActive ? '#FFFFFF' : theme.text,
                  },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  typeToggleRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  typeToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  typeToggleIcon: {
    fontSize: 14,
  },
  typeToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
