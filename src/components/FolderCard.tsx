/**
 * FolderCard — card untuk folder/album di folder browser.
 * Menampilkan cover album, nama folder, dan jumlah file.
 * Mendukung format horizontal (Pinned) dan vertical (Albums).
 */

import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Folder } from 'lucide-react-native';
import * as VideoThumbnails from 'expo-video-thumbnails';

import { useTheme } from '@/hooks/use-theme';

// ─── Cache & Helpers ──────────────────────────────────────────────────────────

const thumbnailCache = new Map<string, string>();

function isVideoUri(uri: string): boolean {
  if (!uri) return false;
  const lower = uri.toLowerCase();
  if (lower.startsWith('content://') && lower.includes('/video/')) {
    return true;
  }
  return (
    lower.endsWith('.mp4') ||
    lower.endsWith('.m4v') ||
    lower.endsWith('.mov') ||
    lower.endsWith('.3gp') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.mkv') ||
    lower.endsWith('.avi')
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FolderCardProps {
  title: string;
  assetCount: number;
  coverUri?: string;
  variant?: 'horizontal' | 'vertical';
  onPress: () => void;
  onSwipePress?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const FolderCard = React.memo(function FolderCard({
  title,
  assetCount,
  coverUri,
  variant = 'vertical',
  onPress,
}: FolderCardProps) {
  const theme = useTheme();

  const [displayUri, setDisplayUri] = React.useState<string | undefined>(() => {
    if (coverUri && isVideoUri(coverUri)) {
      return thumbnailCache.get(coverUri);
    }
    return coverUri;
  });

  React.useEffect(() => {
    if (!coverUri) {
      setDisplayUri(undefined);
      return;
    }

    const uri = coverUri;

    if (!isVideoUri(uri)) {
      setDisplayUri(uri);
      return;
    }

    const cached = thumbnailCache.get(uri);
    if (cached) {
      setDisplayUri(cached);
      return;
    }

    let isMounted = true;
    async function generate() {
      try {
        const thumb = await VideoThumbnails.getThumbnailAsync(uri, { time: 0 });
        thumbnailCache.set(uri, thumb.uri);
        if (isMounted) {
          setDisplayUri(thumb.uri);
        }
      } catch (err) {
        console.warn('Failed to generate folder card cover thumbnail:', err);
        if (isMounted) {
          setDisplayUri(undefined); // Fallback ke placeholder folder yang rapi
        }
      }
    }
    generate();
    return () => {
      isMounted = false;
    };
  }, [coverUri]);

  const renderThumbnail = () => (
    <View style={variant === 'horizontal' ? styles.thumbnailContainerHorizontal : styles.thumbnailContainerVertical}>
      {displayUri ? (
        <Image
          source={{ uri: displayUri }}
          style={styles.thumbnail}
          contentFit="cover"
          transition={150}
          cachePolicy="disk"
        />
      ) : (
        <View
          style={[
            styles.thumbnailPlaceholder,
            { backgroundColor: theme.backgroundElement },
          ]}
        >
          <Folder color={theme.textSecondary} size={variant === 'horizontal' ? 20 : 32} />
        </View>
      )}
    </View>
  );

  if (variant === 'horizontal') {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.containerHorizontal,
          {
            backgroundColor: theme.surfaceElevated,
            borderColor: theme.border,
          },
          pressed && { opacity: 0.8 },
        ]}
      >
        {renderThumbnail()}
        
        <View style={styles.infoHorizontal}>
          <Text style={[styles.titleHorizontal, { color: theme.text }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.countHorizontal, { color: theme.textSecondary }]}>
            {assetCount} file
          </Text>
        </View>
      </Pressable>
    );
  }

  // variant = 'vertical'
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.containerVertical,
        pressed && { opacity: 0.8 },
      ]}
    >
      {renderThumbnail()}
      
      <View style={styles.infoVertical}>
        <Text style={[styles.titleVertical, { color: theme.text }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.countVertical, { color: theme.textSecondary }]}>
          {assetCount}
        </Text>
      </View>
    </Pressable>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Horizontal (Pinned items)
  containerHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    flex: 1,
    minWidth: '45%',
  },
  thumbnailContainerHorizontal: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  infoHorizontal: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  titleHorizontal: {
    fontSize: 14,
    fontWeight: '700',
  },
  countHorizontal: {
    fontSize: 12,
  },

  // Vertical (Albums items)
  containerVertical: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
    marginVertical: 6,
  },
  thumbnailContainerVertical: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  infoVertical: {
    width: '100%',
    paddingHorizontal: 2,
    gap: 2,
  },
  titleVertical: {
    fontSize: 13,
    fontWeight: '700',
  },
  countVertical: {
    fontSize: 12,
  },
});
