import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Task } from '../../types';
import { formatCurrency } from '../../utils/format';
import { getCategoryById, CATEGORIES } from '../../constants/categories';
import { HomeTheme } from '../home/HomeTheme';
import { useNavigation } from '@react-navigation/native';

interface PostedActivityCardProps {
  task: Task;
  applicantCount: number;
}

const resolveCategory = (task: Task) => {
  let cat = getCategoryById(task.categoryId);
  if (!cat && task.categoryName) {
    const nameLower = task.categoryName.toLowerCase();
    if (nameLower.includes('design') || nameLower.includes('thiết kế')) {
      cat = CATEGORIES.find(c => c.slug === 'design');
    }
  }
  return cat;
};

const getStatusBadgeStyle = (status: string) => {
  switch (status) {
    case 'OPEN':
      return { bg: '#E0F2FE', text: '#0369A1', label: 'Đang mở' };
    case 'IN_PROGRESS':
      return { bg: '#FEF3C7', text: '#D97706', label: 'Đang làm' };
    case 'COMPLETED':
      return { bg: '#D1FAE5', text: '#059669', label: 'Hoàn thành' };
    case 'CLOSED':
      return { bg: '#F3F4F6', text: '#4B5563', label: 'Đã đóng' };
    case 'CANCELLED':
      return { bg: '#FEE2E2', text: '#DC2626', label: 'Đã hủy' };
    default:
      return { bg: '#F3F4F6', text: '#4B5563', label: status };
  }
};

const getPriceUnit = (task: Task): string => {
  if (task.salaryUnit) {
    switch (task.salaryUnit) {
      case 'PER_JOB': return '/công việc';
      case 'PER_HOUR': return '/giờ';
      case 'PER_DAY': return '/ngày';
      case 'PER_MONTH': return '/tháng';
    }
  }
  return ' cố định';
};

export const PostedActivityCard: React.FC<PostedActivityCardProps> = React.memo(({
  task,
  applicantCount,
}) => {
  const navigation = useNavigation<any>();
  const [imageError, setImageError] = useState(false);
  const category = useMemo(() => resolveCategory(task), [task]);
  const statusInfo = useMemo(() => getStatusBadgeStyle(task.status), [task.status]);
  const firstImage = task.images?.[0];

  const budgetText = useMemo(() => {
    if (task.budgetMin === task.budgetMax) {
      return formatCurrency(task.budgetMin);
    }
    return `từ ${formatCurrency(task.budgetMin)}`;
  }, [task.budgetMin, task.budgetMax]);

  return (
    <View style={styles.card}>
      <View style={styles.mainRow}>
        {/* Thumbnail Image */}
        {firstImage && !imageError ? (
          <Image
            source={{ uri: firstImage }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={[styles.placeholder, { backgroundColor: `${category?.color || '#FF6B35'}10` }]}>
            <MaterialCommunityIcons
              name={(category?.icon || 'briefcase-outline') as any}
              size={32}
              color={category?.color || '#FF6B35'}
              style={{ opacity: 0.25 }}
            />
          </View>
        )}

        {/* Content Section */}
        <View style={styles.content}>
          <View style={styles.badgeRow}>
            {/* Post Type Badge */}
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

            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusInfo.text }]}>
                {statusInfo.label}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title} numberOfLines={2}>
            {task.title}
          </Text>

          {/* Category details */}
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
            <Text style={styles.priceText}>{budgetText}</Text>
            <Text style={styles.unitText}>{getPriceUnit(task)}</Text>
          </View>

          {/* Applicant stats */}
          <View style={styles.statsRow}>
            <Ionicons name="people-outline" size={13} color={HomeTheme.colors.textSecondary} />
            <Text style={styles.statsText}>
              {task.postType === 'SERVICE_OFFER'
                ? `${applicantCount} yêu cầu thuê`
                : `${applicantCount} lượt ứng tuyển`
              }
            </Text>
          </View>
        </View>
      </View>

      {/* Action Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.manageBtn}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('ApplicantList', { taskId: task.id })}
          accessibilityRole="button"
          accessibilityLabel="Quản lý bài đăng"
        >
          <Ionicons name="settings-outline" size={14} color={HomeTheme.colors.primary} />
          <Text style={styles.manageBtnText}>Quản lý bài</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.detailBtn}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('JobDetail', { taskId: task.id })}
          accessibilityRole="button"
          accessibilityLabel="Xem chi tiết bài đăng"
        >
          <Text style={styles.detailBtnText}>Xem chi tiết</Text>
          <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EAECF0',
    padding: 12,
    marginBottom: 12,
    marginHorizontal: 16,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  mainRow: {
    flexDirection: 'row',
  },
  image: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  placeholder: {
    width: 96,
    height: 96,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  postTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recruitmentBadge: {
    backgroundColor: '#E0F2FE',
  },
  serviceOfferBadge: {
    backgroundColor: '#D1FAE5',
  },
  postTypeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  recruitmentBadgeText: {
    color: '#0369A1',
  },
  serviceOfferBadgeText: {
    color: '#065F46',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#16181D',
    lineHeight: 18,
    minHeight: 36,
    marginBottom: 4,
  },
  categorySection: {
    minHeight: 28,
    marginBottom: 4,
  },
  categoryPrimaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: HomeTheme.colors.primaryDark,
  },
  categorySecondaryText: {
    fontSize: 9,
    color: HomeTheme.colors.textSecondary,
    marginTop: 1,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '800',
    color: HomeTheme.colors.primary,
  },
  unitText: {
    fontSize: 10,
    fontWeight: '700',
    color: HomeTheme.colors.textSecondary,
    marginLeft: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statsText: {
    fontSize: 10,
    fontWeight: '700',
    color: HomeTheme.colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F4F7',
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: HomeTheme.colors.primaryBorder,
    backgroundColor: HomeTheme.colors.primarySoft,
  },
  manageBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: HomeTheme.colors.primaryDark,
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: HomeTheme.colors.primary,
  },
  detailBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
