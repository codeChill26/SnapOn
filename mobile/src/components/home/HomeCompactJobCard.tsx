import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Task } from '../../types';
import { formatCurrency } from '../../utils/format';
import { getCategoryById, CATEGORIES } from '../../constants/categories';
import { UserAvatar } from '../common/UserAvatar';
import { HomeTheme } from './HomeTheme';
import { profileService } from '../../services/profileService';

interface HomeCompactJobCardProps {
  task: Task;
  onPress: (task: Task) => void;
  onToggleSaved?: (task: Task) => void;
  saving?: boolean;
  numColumns?: number;
  paddingH?: number;
}

const resolveCategory = (task: Task) => {
  let cat = getCategoryById(task.categoryId);
  if (!cat && task.categoryName) {
    const nameLower = task.categoryName.toLowerCase();
    if (nameLower.includes('design') || nameLower.includes('thiết kế') || nameLower.includes('đồ họa')) {
      cat = CATEGORIES.find(c => c.slug === 'design');
    } else if (nameLower.includes('content') || nameLower.includes('viết') || nameLower.includes('dịch') || nameLower.includes('nội dung')) {
      cat = CATEGORIES.find(c => c.slug === 'content');
    } else if (nameLower.includes('tech') || nameLower.includes('code') || nameLower.includes('lập trình') || nameLower.includes('it')) {
      cat = CATEGORIES.find(c => c.slug === 'tech');
    } else if (nameLower.includes('research') || nameLower.includes('nghiên cứu') || nameLower.includes('khảo sát')) {
      cat = CATEGORIES.find(c => c.slug === 'research');
    } else if (nameLower.includes('study') || nameLower.includes('học') || nameLower.includes('gia sư') || nameLower.includes('giáo dục')) {
      cat = CATEGORIES.find(c => c.slug === 'study');
    }
  }
  return cat;
};

// Dynamically determine pricing unit based on task details
const getPriceUnit = (task: Task): string => {
  if (task.salaryUnit) {
    switch (task.salaryUnit) {
      case 'PER_JOB':
        return '/công việc';
      case 'PER_HOUR':
        return '/giờ';
      case 'PER_DAY':
        return '/ngày';
      case 'PER_MONTH':
        return '/tháng';
      default:
        break;
    }
  }
  const text = `${task.title} ${task.description}`.toLowerCase();
  if (text.includes('giờ') || text.includes('hour') || text.includes('/h') || text.includes(' mỗi tiếng')) {
    return '/giờ';
  }
  if (text.includes('ngày') || text.includes('day') || text.includes('/ngày') || text.includes(' mỗi ngày')) {
    return '/ngày';
  }
  if (text.includes('tháng') || text.includes('month') || text.includes('/tháng') || text.includes(' mỗi tháng')) {
    return '/tháng';
  }
  if (task.taskType === 'ONLINE') {
    return '/việc';
  }
  if (task.taskType === 'OFFLINE') {
    return '/giờ';
  }
  return ' cố định';
};

const getBudgetDisplay = (min: number, max: number): string => {
  if (min === max) {
    return formatCurrency(min);
  }
  return `từ ${formatCurrency(min)}`;
};

export const HomeCompactJobCard: React.FC<HomeCompactJobCardProps> = React.memo(({
  task,
  onPress,
  onToggleSaved,
  saving = false,
  numColumns = 2,
  paddingH = 16,
}) => {
  const navigation = useNavigation<any>();
  const { width: screenWidth } = useWindowDimensions();
  const [imageError, setImageError] = useState(false);
  const isBookmarked = Boolean(task.isSaved);

  const category = useMemo(() => resolveCategory(task), [task]);
  const priceUnit = useMemo(() => getPriceUnit(task), [task]);
  const budgetText = useMemo(() => getBudgetDisplay(task.budgetMin, task.budgetMax), [task.budgetMin, task.budgetMax]);

  const firstImage = task.images?.[0];
  const posterName = task.poster?.fullName || task.posterName || 'Người dùng';
  const posterAvatar = task.poster?.avatarUrl;

  const cardWidth = useMemo(() => {
    const columnGap = 8 * (numColumns - 1);
    return (screenWidth - paddingH * 2 - columnGap) / numColumns;
  }, [screenWidth, numColumns, paddingH]);

  return (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth }]}
      onPress={() => onPress(task)}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={`${task.title}. Giá ${budgetText}${priceUnit}`}
    >
      {/* 1. Card Media */}
      <View style={styles.mediaContainer}>
        {firstImage && !imageError ? (
          <Image
            source={{ uri: firstImage }}
            style={styles.image}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            placeholder="#F1F5F9"
            recyclingKey={firstImage}
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={[styles.placeholder, { backgroundColor: `${category?.color || '#FF6B35'}10` }]}>
            <MaterialCommunityIcons
              name={(category?.icon || 'briefcase-outline') as any}
              size={54}
              color={category?.color || '#FF6B35'}
              style={{ opacity: 0.15 }}
            />
          </View>
        )}

        {/* Post Type Badge overlay */}
        <View style={[
          styles.postTypeBadge,
          task.postType === 'SERVICE_OFFER' ? styles.serviceOfferBadge : styles.recruitmentBadge
        ]}>
          <Text style={[
            styles.postTypeBadgeText,
            task.postType === 'SERVICE_OFFER' ? styles.serviceOfferBadgeText : styles.recruitmentBadgeText
          ]}>
            {task.postType === 'SERVICE_OFFER' ? 'Thuê tôi' : 'Tuyển người'}
          </Text>
        </View>

        {/* Status Badge overlay for recruitment */}
        {task.postType === 'RECRUITMENT' && (
          <View style={[
            styles.statusOverlayBadge,
            task.status === 'OPEN' && !(task.applicationDeadline && new Date(task.applicationDeadline).getTime() < Date.now())
              ? styles.statusOpenBadge
              : styles.statusClosedBadge
          ]}>
            <Text style={[
              styles.statusOverlayBadgeText,
              task.status === 'OPEN' && !(task.applicationDeadline && new Date(task.applicationDeadline).getTime() < Date.now())
                ? styles.statusOpenBadgeText
                : styles.statusClosedBadgeText
            ]}>
              {task.status === 'OPEN' && !(task.applicationDeadline && new Date(task.applicationDeadline).getTime() < Date.now())
                ? 'Đang mở'
                : 'Đã đóng'}
            </Text>
          </View>
        )}

        {/* Bookmark icon overlay */}
        <TouchableOpacity
          style={[styles.bookmarkButton, isBookmarked && styles.bookmarkButtonActive, saving && styles.bookmarkButtonSaving]}
          onPress={(event) => {
            event.stopPropagation();
            if (!saving) {
              onToggleSaved?.(task);
            }
          }}
          activeOpacity={0.7}
          disabled={saving || !onToggleSaved}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityState={{ selected: isBookmarked }}
          accessibilityLabel={isBookmarked ? 'Bỏ lưu công việc' : 'Lưu công việc'}
        >
          <Ionicons
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={isBookmarked ? HomeTheme.colors.primary : '#FFFFFF'}
          />
        </TouchableOpacity>

        {/* Poster overlay on image */}
        <TouchableOpacity
          style={styles.posterOverlay}
          onPress={(e) => {
            e.stopPropagation();
            const userId = task.posterId || task.poster?.id;
            if (userId) {
              profileService.prefetchPublicProfile(userId);
              navigation.navigate('PublicProfile', { userId });
            }
          }}
          activeOpacity={0.8}
          accessibilityLabel={`Xem trang cá nhân của ${posterName}`}
          accessibilityRole="button"
        >
          <UserAvatar
            name={posterName}
            avatarUrl={posterAvatar}
            size={18}
          />
          <Text style={styles.posterNameText} numberOfLines={1}>
            {posterName}
          </Text>
          {task.poster?.isVerified && (
            <Ionicons name="checkmark-circle" size={11} color="#38BDF8" style={styles.verifiedIcon} />
          )}
        </TouchableOpacity>
      </View>

      {/* 2. Card Content */}
      <View style={styles.contentContainer}>
        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {task.title}
        </Text>

        {/* Category Information */}
        <View style={styles.categorySection}>
          <Text style={styles.categoryPrimaryText} numberOfLines={1} ellipsizeMode="tail">
            {task.subcategory?.name || task.categoryName || 'Công việc'}
          </Text>
          {task.field?.name && task.subcategory?.name ? (
            <Text style={styles.categorySecondaryText} numberOfLines={1} ellipsizeMode="tail">
              {task.field.name}
            </Text>
          ) : null}
        </View>

        {/* Price */}
        <View style={styles.priceContainer}>
          <Text style={styles.priceText} numberOfLines={1}>
            {budgetText}
          </Text>
          <Text style={styles.unitText} numberOfLines={1} ellipsizeMode="tail">
            {priceUnit}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
    display: 'flex',
    flexDirection: 'column',
  },
  mediaContainer: {
    width: '100%',
    aspectRatio: 1.25,
    position: 'relative',
    backgroundColor: '#F8FAFC',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookmarkButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  bookmarkButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  bookmarkButtonSaving: {
    opacity: 0.62,
  },
  posterOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingVertical: 5,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  posterNameText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 5,
    flex: 1,
  },
  verifiedIcon: {
    marginLeft: 2,
  },
  contentContainer: {
    padding: 12,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 20,
    minHeight: 40,
    marginBottom: 6,
  },
  categorySection: {
    minHeight: 32,
    marginBottom: 8,
  },
  categoryPrimaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: HomeTheme.colors.primaryDark,
  },
  categorySecondaryText: {
    fontSize: 10,
    color: HomeTheme.colors.textSecondary,
    marginTop: 1.5,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 'auto',
  },
  priceText: {
    fontSize: 18,
    fontWeight: '800',
    color: HomeTheme.colors.primary,
  },
  unitText: {
    fontSize: 11,
    fontWeight: '700',
    color: HomeTheme.colors.textSecondary,
    marginLeft: 2,
    flexShrink: 1,
  },
  postTypeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 10,
  },
  recruitmentBadge: {
    backgroundColor: '#E0F2FE',
  },
  serviceOfferBadge: {
    backgroundColor: '#D1FAE5',
  },
  postTypeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  recruitmentBadgeText: {
    color: '#0369A1',
  },
  serviceOfferBadgeText: {
    color: '#065F46',
  },
  statusOverlayBadge: {
    position: 'absolute',
    top: 34,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
  },
  statusOpenBadge: {
    backgroundColor: '#DEF7EC',
  },
  statusClosedBadge: {
    backgroundColor: '#F3F4F6',
  },
  statusOverlayBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  statusOpenBadgeText: {
    color: '#03543F',
  },
  statusClosedBadgeText: {
    color: '#4B5563',
  },
});
