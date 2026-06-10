import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';

interface UserAvatarProps {
  name: string;
  avatarUrl?: string;
  size?: number;
  onPress?: () => void;
  showBadge?: boolean;
  badgeColor?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  avatarUrl,
  size = 48,
  onPress,
  showBadge = false,
  badgeColor = Colors.success,
}) => {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  const Content = onPress ? TouchableOpacity : View;

  return (
    <Content onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
          />
        ) : (
          <View
            style={[
              styles.placeholder,
              { width: size, height: size, borderRadius: size / 2 },
            ]}
          >
            <Text style={[styles.initials, { fontSize: size * 0.4 }]}>
              {initials}
            </Text>
          </View>
        )}
        {showBadge && (
          <View style={[styles.badge, { backgroundColor: badgeColor, width: size * 0.3, height: size * 0.3, borderRadius: size * 0.15 }]} />
        )}
      </View>
    </Content>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    resizeMode: 'cover',
  },
  placeholder: {
    backgroundColor: Colors.primaryLight + '40',
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
