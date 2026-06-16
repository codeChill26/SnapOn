import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { Task } from '../../types';
import { formatCurrency } from '../../utils/format';
import { getCategoryById, CATEGORIES } from '../../constants/categories';
import { UserAvatar } from './UserAvatar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AppColors } from '../../theme';

interface JobCardProps {
  task: Task;
  onPress: (task: Task) => void;
  showDistance?: boolean;
  distance?: number;
  isDark?: boolean;
}

interface CategoryTheme {
  primary: string;
  softBackground: string;
  borderColor: string;
  iconBackground: string;
  badgeTextColor: string;
  pattern: 'circuit' | 'creativeBlob' | 'editorial' | 'editorialLines' | 'researchGrid' | 'learningShapes' | 'default';
  borderRadius: number;
}

const getTaskTypeMeta = (taskType?: string) => {
  switch (taskType) {
    case 'ONLINE':
      return { label: 'Trực tuyến', icon: 'globe-outline', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.15)' };
    case 'OFFLINE':
      return { label: 'Gặp mặt', icon: 'location-outline', color: '#FF6B35', bgColor: 'rgba(255, 107, 53, 0.15)' };
    case 'HYBRID':
      return { label: 'Kết hợp', icon: 'business-outline', color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.15)' };
    default:
      return { label: 'Chưa xác định', icon: 'help-circle-outline', color: '#94A3B8', bgColor: 'rgba(148, 163, 184, 0.1)' };
  }
};

const formatBudgetRange = (budgetMin?: number, budgetMax?: number): string => {
  if (budgetMin == null && budgetMax == null) return 'Thỏa thuận';
  if (budgetMin === budgetMax && budgetMin != null) return formatCurrency(budgetMin);
  if (budgetMin != null && budgetMax == null) return `Từ ${formatCurrency(budgetMin)}`;
  if (budgetMin == null && budgetMax != null) return `Đến ${formatCurrency(budgetMax)}`;
  return `${formatCurrency(budgetMin as number)} - ${formatCurrency(budgetMax as number)}`;
};

const getDeadlineMeta = (deadlineEnd?: string) => {
  if (!deadlineEnd) return { label: 'Chưa cập nhật', isUrgent: false, color: '#94A3B8' };
  const end = new Date(deadlineEnd);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  
  if (diffMs <= 0) return { label: 'Đã hết hạn', isUrgent: false, color: '#EF4444' };
  
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffDays > 0) return { label: `Còn ${diffDays} ngày`, isUrgent: diffDays <= 3, color: diffDays <= 3 ? '#F59E0B' : '#94A3B8' };
  if (diffHours > 0) return { label: `Còn ${diffHours} giờ`, isUrgent: true, color: '#F59E0B' };
  return { label: `Còn ${diffMins} phút`, isUrgent: true, color: '#F59E0B' };
};

const TechCircuitPattern = ({ color }: { color: string }) => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    <View style={[styles.patternLine, { backgroundColor: color, top: 20, left: 0, width: 60, height: 1, opacity: 0.15 }]} />
    <View style={[styles.patternLine, { backgroundColor: color, top: 20, left: 60, width: 1, height: 30, opacity: 0.15 }]} />
    <View style={[styles.patternDot, { backgroundColor: color, top: 48, left: 58, width: 5, height: 5, opacity: 0.2 }]} />
    <View style={[styles.patternLine, { backgroundColor: color, bottom: 30, right: 20, width: 40, height: 1, opacity: 0.15 }]} />
  </View>
);

const DesignBlobPattern = ({ color }: { color: string }) => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    <View style={[styles.patternBlob, { backgroundColor: color, top: -20, right: -10, width: 120, height: 120, borderRadius: 60, opacity: 0.08 }]} />
    <View style={[styles.patternBlob, { backgroundColor: color, bottom: -30, left: -20, width: 80, height: 80, borderRadius: 40, opacity: 0.06 }]} />
  </View>
);

const ContentEditorialPattern = ({ color }: { color: string }) => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    <View style={[styles.patternLine, { backgroundColor: color, top: 15, left: 15, width: 25, height: 3, opacity: 0.15, borderRadius: 2 }]} />
    <View style={[styles.patternLine, { backgroundColor: color, top: 24, left: 15, width: 15, height: 3, opacity: 0.15, borderRadius: 2 }]} />
    <View style={[styles.patternLine, { backgroundColor: color, bottom: 20, right: 15, width: 40, height: 2, opacity: 0.1, borderRadius: 1 }]} />
  </View>
);

const ResearchGridPattern = ({ color }: { color: string }) => (
  <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
    {Array.from({ length: 4 }).map((_, i) => (
      <View key={`v-${i}`} style={[styles.patternLine, { backgroundColor: color, top: 0, bottom: 0, left: 20 + i * 30, width: 1, opacity: 0.05 }]} />
    ))}
    {Array.from({ length: 4 }).map((_, i) => (
      <View key={`h-${i}`} style={[styles.patternLine, { backgroundColor: color, left: 0, right: 0, top: 20 + i * 30, height: 1, opacity: 0.05 }]} />
    ))}
  </View>
);

const LearningPattern = ({ color }: { color: string }) => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    <View style={[styles.patternLine, { backgroundColor: color, top: -10, right: 20, width: 40, height: 40, borderRadius: 8, opacity: 0.08, transform: [{ rotate: '15deg' }] }]} />
    <View style={[styles.patternLine, { backgroundColor: color, bottom: 20, left: -10, width: 30, height: 30, borderRadius: 15, opacity: 0.08 }]} />
  </View>
);

const DefaultPattern = ({ color }: { color: string }) => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    <View style={[styles.patternLine, { backgroundColor: color, top: 0, right: 0, width: 100, height: 100, borderRadius: 50, opacity: 0.03, transform: [{ scale: 1.5 }, { translateX: 20 }, { translateY: -20 }] }]} />
  </View>
);

const CategoryPattern = ({ pattern, color }: { pattern: string, color: string }) => {
  switch (pattern) {
    case 'circuit': return <TechCircuitPattern color={color} />;
    case 'creativeBlob': return <DesignBlobPattern color={color} />;
    case 'editorialLines': return <ContentEditorialPattern color={color} />;
    case 'researchGrid': return <ResearchGridPattern color={color} />;
    case 'learningShapes': return <LearningPattern color={color} />;
    default: return <DefaultPattern color={color} />;
  }
};

const getCategoryTheme = (slug?: string, color?: string): CategoryTheme => {
  const baseColor = color || AppColors.brand.primary;
  const isTech = slug?.includes('tech') || slug?.includes('it');
  const isDesign = slug?.includes('design') || slug?.includes('thiet-ke');
  const isContent = slug?.includes('content') || slug?.includes('viet');
  const isResearch = slug?.includes('research') || slug?.includes('nghien-cuu');
  const isStudy = slug?.includes('study') || slug?.includes('hoc');

  let pattern: CategoryTheme['pattern'] = 'default';
  let borderRadius = 20;

  if (isTech) { pattern = 'circuit'; borderRadius = 16; }
  else if (isDesign) { pattern = 'creativeBlob'; borderRadius = 28; }
  else if (isContent) { pattern = 'editorialLines'; borderRadius = 20; }
  else if (isResearch) { pattern = 'researchGrid'; borderRadius = 16; }
  else if (isStudy) { pattern = 'learningShapes'; borderRadius = 24; }

  return {
    primary: baseColor,
    softBackground: `${baseColor}14`,
    borderColor: `${baseColor}30`,
    iconBackground: `${baseColor}1A`,
    badgeTextColor: baseColor,
    pattern,
    borderRadius,
  };
};

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

const CategoryVisualPlaceholder = ({ theme, icon }: { theme: CategoryTheme, icon: string }) => (
  <View style={[styles.placeholderContainer, { backgroundColor: theme.softBackground, borderColor: theme.borderColor, borderRadius: theme.borderRadius - 2 }]}>
    <CategoryPattern pattern={theme.pattern} color={theme.primary} />
    <MaterialCommunityIcons name={icon as any} size={80} color={theme.primary} style={{ opacity: 0.15 }} />
  </View>
);

const JobCardComponent: React.FC<JobCardProps> = ({ task, onPress, showDistance, distance, isDark = true }) => {
  const category = resolveCategory(task);
  const theme = useMemo(() => getCategoryTheme(category?.slug, category?.color), [category?.slug, category?.color]);
  const typeMeta = useMemo(() => getTaskTypeMeta(task.taskType), [task.taskType]);
  
  const [deadlineMeta, setDeadlineMeta] = useState(() => getDeadlineMeta(task.deadlineEnd));

  useEffect(() => {
    if (!task.deadlineEnd) return;
    const interval = setInterval(() => {
      setDeadlineMeta(getDeadlineMeta(task.deadlineEnd));
    }, 60000);
    return () => clearInterval(interval);
  }, [task.deadlineEnd]);

  const firstImage = task.images?.[0];
  const locationText = task.taskType === 'OFFLINE' && task.locations?.[0]?.address ? task.locations[0].address : null;
  const budgetText = useMemo(() => formatBudgetRange(task.budgetMin, task.budgetMax), [task.budgetMin, task.budgetMax]);

  const [imageError, setImageError] = useState(false);

  return (
    <Pressable
      style={[
        styles.card,
        {
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.75)' : theme.softBackground,
          borderRadius: theme.borderRadius,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : theme.borderColor,
          borderWidth: 1,
        }
      ]}
      onPress={() => onPress(task)}
      accessibilityRole="button"
    >
      {/* Global Background Pattern so it stands out */}
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius: theme.borderRadius }]} pointerEvents="none">
        <CategoryPattern pattern={theme.pattern} color={theme.primary} />
      </View>

      {/* 1. Hero Image or Category Placeholder */}
      <View style={styles.heroWrapper}>
        {firstImage && !imageError ? (
          <Image
            source={{ uri: firstImage }}
            style={[styles.heroImage, { borderRadius: theme.borderRadius - 2 }]}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <CategoryVisualPlaceholder theme={theme} icon={category?.icon || 'briefcase-outline'} />
        )}
        
        {/* Absolute overlays for Image/Placeholder */}
        <View style={styles.imageTopOverlay}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <View style={[styles.categoryBadge, { backgroundColor: '#FFFFFF', borderColor: theme.borderColor, borderWidth: 1 }]}>
              <MaterialCommunityIcons name={(category?.icon || 'briefcase-outline') as any} size={12} color={theme.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.categoryBadgeText, { color: theme.primary }]}>{category?.name?.split(' / ')[0] || 'Công việc'}</Text>
            </View>
            <View style={[
              styles.statusBadge,
              {
                backgroundColor: task.status === 'OPEN' ? 'rgba(59, 130, 246, 0.95)' :
                                 task.status === 'IN_PROGRESS' ? 'rgba(245, 158, 11, 0.95)' :
                                 task.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)'
              }
            ]}>
              <Text style={styles.statusBadgeText}>
                {task.status === 'OPEN' ? 'Đang mở' :
                 task.status === 'IN_PROGRESS' ? 'Đang làm' :
                 task.status === 'COMPLETED' ? 'Hoàn thành' : 'Đã hủy'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.imageBottomOverlay}>
          {task.taskType && task.taskType !== 'ONLINE' && task.taskType !== 'OFFLINE' && task.taskType !== 'HYBRID' ? null : (
            <View style={[styles.typeChip, { backgroundColor: typeMeta.bgColor, borderColor: typeMeta.color, borderWidth: 0.5 }]}>
              <Ionicons name={typeMeta.icon as any} size={12} color={typeMeta.color} style={{ marginRight: 4 }} />
              <Text style={[styles.typeChipText, { color: typeMeta.color }]}>
                {typeMeta.label}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.contentContainer}>
        {/* 3. Title */}
        <Text style={[styles.title, isDark && { color: '#F8FAFC' }]} numberOfLines={2}>{task.title}</Text>
        
        {/* 4. Description */}
        {task.description ? (
          <Text style={[styles.description, isDark && { color: '#94A3B8' }]} numberOfLines={2}>{task.description}</Text>
        ) : null}

        {/* 5. Poster Info */}
        <View style={styles.posterRow}>
          <UserAvatar name={task.poster?.fullName || task.posterName || 'N'} avatarUrl={task.poster?.avatarUrl} size={24} />
          <Text style={[styles.posterName, isDark && { color: '#F1F5F9' }]} numberOfLines={1}>{task.poster?.fullName || task.posterName || 'Người dùng'}</Text>
          {task.poster?.isVerified && <Ionicons name="checkmark-circle" size={14} color="#38BDF8" style={{ marginLeft: 2 }} />}
        </View>

        {/* 6. Metadata: Deadline & Location */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={deadlineMeta.color} />
            <Text style={[styles.metaText, { color: deadlineMeta.color, fontWeight: deadlineMeta.isUrgent ? '600' : '400' }]}>{deadlineMeta.label}</Text>
          </View>

          {locationText ? (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color="#94A3B8" />
              <Text style={[styles.metaText, isDark && { color: '#94A3B8' }]} numberOfLines={1}>{locationText}</Text>
            </View>
          ) : showDistance && distance != null ? (
            <View style={styles.metaItem}>
              <Ionicons name="navigate-outline" size={14} color="#94A3B8" />
              <Text style={[styles.metaText, isDark && { color: '#94A3B8' }]}>{distance.toFixed(1)} km</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* 7 & 8. Footer: Budget & CTA */}
      <View style={[styles.footer, { borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : theme.borderColor, backgroundColor: isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.5)' }]}>
        <View style={styles.budgetContainer}>
          <Text style={[styles.budgetLabel, isDark && { color: '#64748B' }]}>Ngân sách</Text>
          <Text style={[styles.budgetText, { color: theme.primary }]} numberOfLines={1}>{budgetText}</Text>
        </View>
        <View style={[styles.ctaButton, { backgroundColor: theme.primary }]}>
          <Text style={styles.ctaText}>Xem chi tiết</Text>
          <Ionicons name="arrow-forward" size={14} color="#FFF" style={{ marginLeft: 4 }} />
        </View>
      </View>
    </Pressable>
  );
};

export const JobCard = React.memo<JobCardProps>(
  JobCardComponent,
  (prev, next) => {
    return (
      prev.task.id === next.task.id &&
      prev.task.status === next.task.status &&
      prev.task.categoryId === next.task.categoryId &&
      prev.task.taskType === next.task.taskType &&
      prev.task.title === next.task.title &&
      prev.task.description === next.task.description &&
      prev.task.images?.[0] === next.task.images?.[0] &&
      prev.task.locations?.[0]?.address === next.task.locations?.[0]?.address &&
      prev.task.deadlineEnd === next.task.deadlineEnd &&
      prev.task.budgetMin === next.task.budgetMin &&
      prev.task.budgetMax === next.task.budgetMax &&
      prev.task.poster?.id === next.task.poster?.id &&
      prev.showDistance === next.showDistance &&
      prev.distance === next.distance &&
      prev.isDark === next.isDark
    );
  }
);

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  heroWrapper: {
    width: '100%',
    aspectRatio: 1.45,
    position: 'relative',
    backgroundColor: '#101827',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
  },
  imageTopOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  imageBottomOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 0,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F8FAFC',
    lineHeight: 23,
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 12,
  },
  posterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  posterName: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#F1F5F9',
    maxWidth: 200,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#94A3B8',
    maxWidth: 150,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  budgetContainer: {
    flex: 1,
  },
  budgetLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  budgetText: {
    fontSize: 16,
    fontWeight: '800',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  ctaText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  patternLine: { position: 'absolute' },
  patternDot: { position: 'absolute', borderRadius: 10 },
  patternBlob: { position: 'absolute' },
});
