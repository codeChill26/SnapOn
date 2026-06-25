import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import Config from '../../constants/config';

interface UserAvatarProps {
  name: string;
  avatarUrl?: string;
  size?: number;
  onPress?: () => void;
  showBadge?: boolean;
  badgeColor?: string;
}

// Helper to resolve local IP changes in development environment
const getResolvedAvatarUrl = (url?: string) => {
  if (!url) return undefined;
  
  // If url is a relative path (e.g., starts with /uploads/)
  if (url.startsWith('/')) {
    const base = Config.API_BASE_URL.replace(/\/api$/, '');
    return `${base}${url}`;
  }
  
  // If url is an absolute URL containing local uploads
  if (url.includes('/uploads/')) {
    const base = Config.API_BASE_URL.replace(/\/api$/, '');
    const uploadsIndex = url.indexOf('/uploads/');
    const path = url.substring(uploadsIndex);
    return `${base}${path}`;
  }
  
  return url;
};

export const UserAvatar: React.FC<UserAvatarProps> = React.memo(({
  name,
  avatarUrl,
  size = 48,
  onPress,
  showBadge = false,
  badgeColor = Colors.success,
}) => {
  const [imageError, setImageError] = useState(false);

  const initials = name
    .trim()
    .split(/\s+/)
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  const resolvedUrl = getResolvedAvatarUrl(avatarUrl);
  const Content = onPress ? TouchableOpacity : View;

  return (
    <Content onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
        {resolvedUrl && !imageError ? (
          <Image
            source={{ uri: resolvedUrl }}
            style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
            onError={() => setImageError(true)}
          />
        ) : (
          <View
            style={[
              styles.placeholder,
              { width: size, height: size, borderRadius: size / 2 },
            ]}
          >
            {initials ? (
              <Text style={[styles.initials, { fontSize: size * 0.38 }]}>
                {initials}
              </Text>
            ) : (
              <Ionicons name="person" size={size * 0.5} color={Colors.textSecondary} />
            )}
          </View>
        )}
        {showBadge && (
          <View style={[styles.badge, { backgroundColor: badgeColor, width: size * 0.3, height: size * 0.3, borderRadius: size * 0.15 }]} />
        )}
      </View>
    </Content>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#F1F5F9', // light grey background under the avatar
  },
  image: {
    resizeMode: 'cover',
  },
  placeholder: {
    backgroundColor: Colors.primarySoft, // Premium soft orange background
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontWeight: '700',
    color: Colors.primary,
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
});
