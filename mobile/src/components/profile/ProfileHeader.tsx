import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Colors } from '../../constants/colors';
import { UserAvatar } from '../common/UserAvatar';
import { Ionicons } from '@expo/vector-icons';
import { normalizeImageUrl } from '../../utils/format';

interface ProfileHeaderProps {
  fullName: string;
  avatarUrl?: string;
  coverUrl?: string;
  isVerified: boolean;
  bio?: string;
  headline?: string;
  skills?: string[];
  joinedAt?: string;
  isOwnProfile: boolean;
  showHireButton?: boolean;
  onSettingsPress?: () => void;
  onMessagePress?: () => void;
  onHirePress?: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = React.memo(({
  fullName,
  avatarUrl,
  coverUrl,
  isVerified,
  bio,
  headline,
  skills = [],
  joinedAt,
  isOwnProfile,
  showHireButton = false,
  onSettingsPress,
  onMessagePress,
  onHirePress,
}) => {
  const formattedDate = joinedAt
    ? new Date(joinedAt).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' })
    : '';

  const normalizedCoverUrl = coverUrl ? normalizeImageUrl(coverUrl) : null;

  return (
    <View style={styles.container}>
      {/* Cover Background Banner */}
      <View style={styles.coverContainer}>
        {normalizedCoverUrl ? (
          <Image source={{ uri: normalizedCoverUrl }} style={styles.coverImage} />
        ) : (
          <View style={styles.coverGradient}>
            <Text style={styles.coverPlaceholderText}>SnapOn</Text>
          </View>
        )}
        
        {/* Settings Gear Button (Only for own profile) */}
        {isOwnProfile && onSettingsPress && (
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={onSettingsPress}
            activeOpacity={0.7}
            accessibilityLabel="Cài đặt tài khoản"
          >
            <Ionicons name="settings" size={20} color={Colors.textWhite} />
          </TouchableOpacity>
        )}
      </View>

      {/* Main Content Area */}
      <View style={styles.content}>
        {/* Avatar Area overlapping the cover photo */}
        <View style={styles.avatarContainer}>
          <UserAvatar
            name={fullName || 'User'}
            avatarUrl={avatarUrl}
            size={90}
          />
        </View>

        {/* Info Area below the avatar */}
        <View style={styles.infoArea}>
          <View style={styles.nameRow}>
            <Text style={styles.nameText} numberOfLines={1}>
              {fullName}
            </Text>
            {isVerified && (
              <Ionicons
                name="shield-checkmark"
                size={18}
                color={Colors.primary}
                style={styles.verifiedIcon}
                accessibilityLabel="Tài khoản đã xác thực"
              />
            )}
          </View>

          {headline ? (
            <Text style={styles.headlineText} numberOfLines={1}>
              {headline}
            </Text>
          ) : (
            <Text style={styles.joinedText}>Thành viên SnapOn</Text>
          )}

          {formattedDate ? (
            <Text style={styles.joinedText} numberOfLines={1}>
              Tham gia: {formattedDate}
            </Text>
          ) : null}
        </View>

        {/* Bio Section */}
        {bio ? (
          <View style={styles.bioContainer}>
            <Text style={styles.bioText} numberOfLines={3}>
              {bio}
            </Text>
          </View>
        ) : null}

        {/* Skills Chips */}
        {skills && skills.length > 0 ? (
          <View style={styles.skillsContainer}>
            {skills.map((skill, index) => (
              <View key={index} style={styles.skillChip}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Action Buttons (Only for other profiles) */}
        {!isOwnProfile && (
          <View style={styles.actionContainer}>
            <View style={styles.otherActionsRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.messageButton]}
                onPress={onMessagePress}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Nhắn tin"
              >
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={Colors.primary} />
                <Text style={styles.messageButtonText}>Nhắn tin</Text>
              </TouchableOpacity>

              {showHireButton && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.hireButton]}
                  onPress={onHirePress}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Thuê tôi"
                >
                  <Ionicons name="briefcase" size={16} color={Colors.textWhite} />
                  <Text style={styles.hireButtonText}>Thuê tôi</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    paddingBottom: 8,
  },
  coverContainer: {
    height: 150,
    width: '100%',
    position: 'relative',
    backgroundColor: Colors.primarySoft,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverGradient: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPlaceholderText: {
    color: 'rgba(255, 255, 255, 0.2)',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 4,
  },
  settingsButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  content: {
    paddingHorizontal: 20,
    position: 'relative',
    paddingTop: 55, // Clean gap for text below avatar
  },
  avatarContainer: {
    position: 'absolute',
    top: -45, // Halway overlaying the cover image
    left: 20,
    borderWidth: 4,
    borderColor: Colors.surface,
    borderRadius: 50,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  infoArea: {
    width: '100%',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  nameText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginRight: 6,
  },
  verifiedIcon: {
    marginTop: 2,
  },
  headlineText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 4,
  },
  joinedText: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },
  bioContainer: {
    marginTop: 12,
  },
  bioText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  skillChip: {
    backgroundColor: Colors.primarySoft,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 127, 80, 0.12)',
  },
  skillText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  actionContainer: {
    marginTop: 14,
  },
  otherActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 10,
  },
  messageButton: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  messageButtonText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '700',
    marginLeft: 6,
  },
  hireButton: {
    backgroundColor: Colors.primary,
  },
  hireButtonText: {
    fontSize: 14,
    color: Colors.textWhite,
    fontWeight: '700',
    marginLeft: 6,
  },
});
