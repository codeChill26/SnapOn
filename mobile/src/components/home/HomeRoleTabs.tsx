import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { HomeTheme } from './HomeTheme';

export type PostTypeFilter = 'ALL' | 'RECRUITMENT' | 'SERVICE_OFFER';

interface HomePostTypeTabsProps {
  selectedFilter: PostTypeFilter;
  onSelectFilter: (filter: PostTypeFilter) => void;
  hasActiveFilter: boolean;
  onResetFilters: () => void;
}

export const HomePostTypeTabs: React.FC<HomePostTypeTabsProps> = ({
  selectedFilter,
  onSelectFilter,
  hasActiveFilter,
  onResetFilters,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        {/* Tất cả Tab */}
        <TouchableOpacity
          style={[styles.tab, selectedFilter === 'ALL' && styles.tabActive]}
          onPress={() => onSelectFilter('ALL')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: selectedFilter === 'ALL' }}
          accessibilityLabel="Tất cả bài đăng"
        >
          <Text style={[styles.tabText, selectedFilter === 'ALL' && styles.tabTextActive]}>
            Tất cả
          </Text>
          {selectedFilter === 'ALL' && <View style={styles.activeUnderline} />}
        </TouchableOpacity>

        {/* Tuyển dụng Tab */}
        <TouchableOpacity
          style={[styles.tab, selectedFilter === 'RECRUITMENT' && styles.tabActive]}
          onPress={() => onSelectFilter('RECRUITMENT')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: selectedFilter === 'RECRUITMENT' }}
          accessibilityLabel="Đăng tuyển dụng"
        >
          <Text style={[styles.tabText, selectedFilter === 'RECRUITMENT' && styles.tabTextActive]}>
            Tuyển người
          </Text>
          {selectedFilter === 'RECRUITMENT' && <View style={styles.activeUnderline} />}
        </TouchableOpacity>

        {/* Thuê tôi Tab */}
        <TouchableOpacity
          style={[styles.tab, selectedFilter === 'SERVICE_OFFER' && styles.tabActive]}
          onPress={() => onSelectFilter('SERVICE_OFFER')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: selectedFilter === 'SERVICE_OFFER' }}
          accessibilityLabel="Thuê tôi"
        >
          <Text style={[styles.tabText, selectedFilter === 'SERVICE_OFFER' && styles.tabTextActive]}>
            Thuê tôi
          </Text>
          {selectedFilter === 'SERVICE_OFFER' && <View style={styles.activeUnderline} />}
        </TouchableOpacity>
      </View>

      {/* Clear Filters Button */}
      {hasActiveFilter && (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={onResetFilters}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Xóa bộ lọc"
        >
          <Text style={styles.clearText}>Xóa bộ lọc</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HomeTheme.spacing.xl,
    paddingVertical: HomeTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: HomeTheme.colors.divider,
    backgroundColor: '#FFFFFF',
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: HomeTheme.spacing.xl,
  },
  tab: {
    paddingVertical: HomeTheme.spacing.sm,
    position: 'relative',
    alignItems: 'center',
  },
  tabActive: {},
  tabText: {
    fontSize: 16,
    fontWeight: '700',
    color: HomeTheme.colors.textSecondary,
  },
  tabTextActive: {
    color: HomeTheme.colors.primary,
    fontWeight: '800',
  },
  activeUnderline: {
    position: 'absolute',
    bottom: -8,
    width: '100%',
    height: 3,
    backgroundColor: HomeTheme.colors.primary,
    borderRadius: 1.5,
  },
  clearButton: {
    paddingVertical: HomeTheme.spacing.xs,
    paddingHorizontal: HomeTheme.spacing.sm,
    borderRadius: HomeTheme.radius.small,
  },
  clearText: {
    fontSize: 13,
    fontWeight: '700',
    color: HomeTheme.colors.primary,
  },
});
