import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Colors } from '../../constants/colors';
import { Task } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency, normalizeImageUrl } from '../../utils/format';
import { useScreenSize } from '../../hooks/useScreenSize';

interface ProfilePostCardProps {
  task: Task;
  onPress: (task: Task) => void;
}

export const ProfilePostCard: React.FC<ProfilePostCardProps> = React.memo(({ task, onPress }) => {
  const [imageError, setImageError] = useState(false);
  const imageUrl = task.images && task.images.length > 0 ? normalizeImageUrl(task.images[0]) : null;

  // Status mapping
  const getStatusStyle = (status: string) => {
    switch (status.toUpperCase()) {
      case 'OPEN':
        return { bg: Colors.successSoft, text: Colors.success, label: 'Đang mở' };
      case 'IN_PROGRESS':
        return { bg: Colors.warningSoft, text: Colors.warning, label: 'Đang làm' };
      case 'COMPLETED':
        return { bg: Colors.infoSoft, text: Colors.info, label: 'Hoàn thành' };
      default:
        return { bg: Colors.border, text: Colors.textSecondary, label: 'Đã đóng' };
    }
  };

  const statusStyle = getStatusStyle(task.status);

  // Format budget text
  const budgetText = task.budgetMax && task.budgetMax > task.budgetMin
    ? `${formatCurrency(task.budgetMin)} - ${formatCurrency(task.budgetMax)}`
    : formatCurrency(task.budgetMin || task.finalPrice || 0);

  const salaryUnitLabel = task.salaryUnit === 'PER_HOUR' ? '/giờ'
    : task.salaryUnit === 'PER_DAY' ? '/ngày'
    : task.salaryUnit === 'PER_MONTH' ? '/tháng' : '';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(task)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Xem công việc: ${task.title}`}
    >
      {/* Thumbnail */}
      <View style={styles.thumbnailContainer}>
        {imageUrl && !imageError ? (
          <Image 
            source={{ uri: imageUrl }} 
            style={styles.thumbnail} 
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.placeholder}>
            <View style={styles.iconWrapperCircle}>
              <Ionicons name="briefcase-outline" size={24} color={Colors.primary} />
            </View>
          </View>
        )}
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.text }]}>
            {statusStyle.label}
          </Text>
        </View>
      </View>

      {/* Details */}
      <View style={styles.info}>
        <View style={styles.categoryBadge}>
          <Text style={styles.category} numberOfLines={1}>
            {task.categoryName || 'Việc làm'}
          </Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {task.title}
        </Text>
        <View style={styles.footerRow}>
          <Text style={styles.price} numberOfLines={1}>
            {budgetText}
            <Text style={styles.salaryUnit}>{salaryUnitLabel}</Text>
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export const ProfileEmptyState: React.FC<{
  title: string;
  subtitle?: string;
  ctaText?: string;
  onCtaPress?: () => void;
}> = ({ title, subtitle, ctaText, onCtaPress }) => {
  const { mascotMd, fontScale } = useScreenSize();
  return (
    <View style={styles.emptyContainer}>
      {/* Mascot: sunglasses relaxing pose — profile screen */}
      <Image
        source={require('../../../assets/mascot_sunglasses.png')}
        style={{ width: mascotMd, height: mascotMd * 1.1, marginBottom: 16 }}
        resizeMode="contain"
      />
      <Text style={[styles.emptyTitle, { fontSize: 16 * fontScale }]}>{title}</Text>
      {subtitle && <Text style={[styles.emptySubtitle, { fontSize: 13 * fontScale }]}>{subtitle}</Text>}
      {ctaText && onCtaPress && (
        <TouchableOpacity
          style={styles.emptyCta}
          onPress={onCtaPress}
          activeOpacity={0.8}
        >
          <Text style={styles.emptyCtaText}>{ctaText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAECF0',
    flex: 1,
    margin: 8,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  thumbnailContainer: {
    height: 120,
    width: '100%',
    backgroundColor: Colors.background,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
  },
  iconWrapperCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    elevation: 1,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  info: {
    padding: 12,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255, 127, 80, 0.08)',
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 6,
  },
  category: {
    fontSize: 9,
    color: Colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    height: 36,
    lineHeight: 18,
  },
  footerRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  price: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
  salaryUnit: {
    fontSize: 10,
    fontWeight: 'normal',
    color: Colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    width: '100%',
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    maxWidth: '80%',
  },
  emptyCta: {
    marginTop: 20,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  emptyCtaText: {
    color: Colors.textWhite,
    fontSize: 13,
    fontWeight: '700',
  },
});
