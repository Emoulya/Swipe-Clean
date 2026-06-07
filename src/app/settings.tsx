/**
 * Settings Screen — preferensi pengguna.
 *
 * Pengaturan:
 * - Auto-play video
 * - Mute video
 * - Haptic feedback
 * - Auto-clear trash (hari)
 * - Tema (system/light/dark)
 */

import { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Switch,
  Pressable,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Play, VolumeX, Vibrate, Trash2, Smartphone } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { CONFIG } from '@/constants/config';
import { Spacing, BorderRadius } from '@/constants/theme';
import { useSettingsStore } from '@/store/useSettingsStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SettingRowProps {
  icon: React.ComponentType<{ color: string; size: number }>;
  label: string;
  description?: string;
  children: React.ReactNode;
}

// ─── Setting Row Component ────────────────────────────────────────────────────

function SettingRow({ icon: IconComponent, label, description, children }: SettingRowProps) {
  const theme = useTheme();

  return (
    <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
      <View style={styles.iconWrapper}>
        <IconComponent color={theme.textSecondary} size={20} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingLabel, { color: theme.text }]}>{label}</Text>
        {description && (
          <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>
            {description}
          </Text>
        )}
      </View>
      <View style={styles.settingControl}>{children}</View>
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  const theme = useTheme();

  return (
    <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>
      {title}
    </Text>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const theme = useTheme();

  const autoPlay = useSettingsStore((s) => s.autoPlay);
  const muted = useSettingsStore((s) => s.muted);
  const hapticEnabled = useSettingsStore((s) => s.hapticEnabled);
  const autoClearDays = useSettingsStore((s) => s.autoClearDays);

  const setAutoPlay = useSettingsStore((s) => s.setAutoPlay);
  const setMuted = useSettingsStore((s) => s.setMuted);
  const setHapticEnabled = useSettingsStore((s) => s.setHapticEnabled);
  const setAutoClearDays = useSettingsStore((s) => s.setAutoClearDays);

  // ─── Auto-clear Days Picker ───────────────────────────────────────────────

  const handleAutoClearChange = useCallback(() => {
    const options = [7, 14, 30, 60, 90];
    Alert.alert(
      'Auto-hapus Sampah',
      'Pilih berapa hari sebelum item di sampah dihapus otomatis:',
      [
        ...options.map((days) => ({
          text: `${days} hari`,
          onPress: () => setAutoClearDays(days),
        })),
        { text: 'Batal', style: 'cancel' as const },
      ],
    );
  }, [setAutoClearDays]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Video Settings */}
      <SectionHeader title="VIDEO" />
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
        ]}
      >
        <SettingRow
          icon={Play}
          label="Auto-play"
          description="Putar video otomatis saat muncul"
        >
          <Switch
            value={autoPlay}
            onValueChange={setAutoPlay}
            trackColor={{ false: theme.backgroundElement, true: theme.primary }}
            thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
          />
        </SettingRow>

        <SettingRow
          icon={VolumeX}
          label="Mute otomatis"
          description="Video mute secara default"
        >
          <Switch
            value={muted}
            onValueChange={setMuted}
            trackColor={{ false: theme.backgroundElement, true: theme.primary }}
            thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
          />
        </SettingRow>
      </View>

      {/* Interaction Settings */}
      <SectionHeader title="INTERAKSI" />
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
        ]}
      >
        <SettingRow
          icon={Vibrate}
          label="Haptic feedback"
          description="Getaran saat swipe"
        >
          <Switch
            value={hapticEnabled}
            onValueChange={setHapticEnabled}
            trackColor={{ false: theme.backgroundElement, true: theme.primary }}
            thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
          />
        </SettingRow>
      </View>

      {/* Trash Settings */}
      <SectionHeader title="SAMPAH" />
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
        ]}
      >
        <SettingRow
          icon={Trash2}
          label="Auto-hapus"
          description={`Item di sampah dihapus otomatis setelah ${autoClearDays} hari`}
        >
          <Pressable
            onPress={handleAutoClearChange}
            style={[styles.valueButton, { backgroundColor: theme.backgroundElement }]}
          >
            <Text style={[styles.valueText, { color: theme.primary }]}>
              {autoClearDays} hari
            </Text>
          </Pressable>
        </SettingRow>
      </View>

      {/* About */}
      <SectionHeader title="TENTANG" />
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
        ]}
      >
        <SettingRow icon={Smartphone} label="SwipeClean" description="Versi 1.0.0">
          <Text style={[styles.versionText, { color: theme.textSecondary }]}>
            Expo SDK 56
          </Text>
        </SettingRow>
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 60,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  sectionCard: {
    marginHorizontal: Spacing.three,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  iconWrapper: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingInfo: {
    flex: 1,
    gap: 2,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  settingDesc: {
    fontSize: 12,
  },
  settingControl: {
    alignItems: 'flex-end',
  },
  valueButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  valueText: {
    fontSize: 14,
    fontWeight: '600',
  },
  versionText: {
    fontSize: 13,
  },
});
