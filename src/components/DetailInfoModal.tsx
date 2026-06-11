/**
 * DetailInfoModal — modal semi-transparan untuk menampilkan detail info media.
 * Menampilkan Tanggal Pembuatan, Informasi File, Data EXIF, Path Lokal, dan Lokasi Geografis.
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { Asset } from 'expo-media-library';
import { ArrowLeft, MapPin } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system/legacy';

import { useTheme } from '@/hooks/use-theme';
import { type AssetInfo } from '@/lib/mediaLoader';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DetailInfoModalProps {
  visible: boolean;
  onClose: () => void;
  asset: Asset;
  assetInfo: AssetInfo;
}

interface DetailedData {
  filename: string;
  size: string | null;
  width: number;
  height: number;
  creationTime: number | null;
  localPath: string;
  exif: {
    device: string | null;
    settings: string | null;
    lensFlash: string | null;
  } | null;
  location: {
    latitude: number;
    longitude: number;
    address: string | null;
  } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDetailedDate(timestamp: number | null): { date: string; time: string } | null {
  if (!timestamp) return null;
  const d = new Date(timestamp);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const days = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];

  const dayName = days[d.getDay()];
  const monthName = months[d.getMonth()];
  const dateStr = `${monthName} ${d.getDate()}, ${d.getFullYear()}`;

  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const timeStr = `${dayName} ${hours}:${minutes}`;

  return { date: dateStr, time: timeStr };
}

function formatSize(bytes: number | null): string {
  if (bytes === null) return '';
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  }
  return `${(bytes / 1024).toFixed(0)}KB`;
}

function formatLocalPath(uri: string): string {
  if (!uri) return '';
  const decoded = decodeURIComponent(uri);
  if (decoded.includes('/storage/emulated/0/')) {
    return 'Internal storage/' + decoded.split('/storage/emulated/0/')[1];
  }
  return decoded.replace('file://', '');
}

function formatExif(exif: any) {
  if (!exif || Object.keys(exif).length === 0) return null;

  const make = exif.Make;
  const model = exif.Model;
  const device = [model, make].filter(Boolean).join(', ');

  const fNumber = exif.FNumber;
  const aperture = fNumber ? `f/${fNumber}` : '';

  const expTime = exif.ExposureTime;
  let exposure = '';
  if (expTime) {
    const num = parseFloat(expTime);
    if (num < 1) {
      exposure = `1/${Math.round(1 / num)}s`;
    } else {
      exposure = `${num.toFixed(1)}s`;
    }
  }

  const isoVal = exif.ISOSpeedRatings || exif.ISO;
  const iso = isoVal ? `ISO${isoVal}` : '';

  const settings = [aperture, exposure, iso].filter(Boolean).join('  ');

  const focalLengthVal = exif.FocalLength;
  const focalLength = focalLengthVal ? `${focalLengthVal}mm` : '';

  const equivFocal = exif.FocalLengthIn35mmFilm;
  const equivalent = equivFocal ? `(Equivalent focal length ${equivFocal}mm)` : '';

  const flashVal = exif.Flash;
  let flash = '';
  if (flashVal !== undefined) {
    const flashInt = parseInt(flashVal, 10);
    flash = (flashInt & 1) === 1 ? 'Flash fired' : 'No flash';
  }

  const lensFlash = [[focalLength, equivalent].filter(Boolean).join(' '), flash].filter(Boolean).join('  ');

  if (!device && !settings && !lensFlash) return null;

  return {
    device: device || null,
    settings: settings || null,
    lensFlash: lensFlash || null,
  };
}

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`,
      {
        headers: {
          'User-Agent': 'SwipeClean-App',
        },
      }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.display_name || null;
  } catch (error) {
    console.warn('Geocoding failed:', error);
    return null;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DetailInfoModal({ visible, onClose, asset, assetInfo }: DetailInfoModalProps) {
  const theme = useTheme();

  const [prevAssetId, setPrevAssetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<DetailedData | null>(null);

  // Sesuaikan state loading saat aset berubah sebelum effect dieksekusi (pola React 19)
  if (visible && asset.id !== prevAssetId) {
    setPrevAssetId(asset.id);
    setIsLoading(true);
  }

  useEffect(() => {
    if (!visible) return;

    let isMounted = true;

    async function loadDetails() {
      try {
        // 1. Ambil file size
        let fileSize: number | null = null;
        try {
          const fileInfo = await FileSystem.getInfoAsync(assetInfo.uri);
          if (fileInfo.exists) {
            fileSize = fileInfo.size ?? null;
          }
        } catch (err) {
          console.warn('Failed to get file size:', err);
        }

        // 2. Ambil EXIF (hanya untuk foto secara aman)
        let rawExif: any = null;
        if (assetInfo.mediaType === 'image') {
          try {
            rawExif = await asset.getExif();
          } catch (err) {
            console.warn('Failed to get EXIF:', err);
          }
        }
        const exifData = formatExif(rawExif);

        // 3. Ambil Location
        let locationData: DetailedData['location'] = null;
        try {
          const location = await asset.getLocation();
          if (location) {
            let address: string | null = null;
            try {
              address = await reverseGeocode(location.latitude, location.longitude);
            } catch (err) {
              console.warn('Failed to reverse geocode:', err);
            }
            locationData = {
              latitude: location.latitude,
              longitude: location.longitude,
              address,
            };
          }
        } catch (err) {
          console.warn('Failed to get Location:', err);
        }

        if (isMounted) {
          setData({
            filename: assetInfo.filename,
            size: formatSize(fileSize),
            width: assetInfo.width,
            height: assetInfo.height,
            creationTime: assetInfo.creationTime,
            localPath: formatLocalPath(assetInfo.uri),
            exif: exifData,
            location: locationData,
          });
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error loading details:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDetails();

    return () => {
      isMounted = false;
    };
  }, [visible, asset, assetInfo]);

  const dateInfo = data ? formatDetailedDate(data.creationTime) : null;

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.backButton} hitSlop={12}>
            <ArrowLeft color="#FFFFFF" size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>Detail info</Text>
          <View style={{ width: 24 }} />
        </View>

        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : data ? (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {dateInfo ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Taken on:</Text>
                <Text style={styles.sectionValue}>{dateInfo.date}</Text>
                <Text style={styles.sectionDesc}>{dateInfo.time}</Text>
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>File info:</Text>
              <Text style={styles.sectionValue}>{data.filename}</Text>
              <Text style={styles.sectionDesc}>
                {`${data.size ? `${data.size}  ` : ''}${data.width}x${data.height}px`}
              </Text>
            </View>

            {data.exif ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>EXIF data:</Text>
                {data.exif.device ? (
                  <Text style={styles.sectionValue}>{data.exif.device}</Text>
                ) : null}
                {data.exif.settings ? (
                  <Text style={styles.sectionDesc}>{data.exif.settings}</Text>
                ) : null}
                {data.exif.lensFlash ? (
                  <Text style={styles.sectionDesc}>{data.exif.lensFlash}</Text>
                ) : null}
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Local path:</Text>
              <Text style={styles.pathValue}>{data.localPath}</Text>
            </View>

            {data.location ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Location:</Text>
                <View style={styles.locationContainer}>
                  <MapPin color={theme.primary} size={18} style={styles.pinIcon} />
                  <Text style={[styles.locationText, { color: theme.primary }]}>
                    {data.location.address || `${data.location.latitude.toFixed(6)}, ${data.location.longitude.toFixed(6)}`}
                  </Text>
                </View>
              </View>
            ) : null}
          </ScrollView>
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Gagal memuat detail informasi.</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.93)', // Transparan gelap premium
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 28,
  },
  section: {
    gap: 4,
  },
  sectionLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontWeight: '500',
  },
  sectionValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionDesc: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '400',
  },
  pathValue: {
    color: '#3B82F6', // Aksen biru link
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 2,
  },
  pinIcon: {
    marginTop: 2,
  },
  locationText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    lineHeight: 22,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});
