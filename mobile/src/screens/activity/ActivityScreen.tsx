import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  RefreshControl,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { ActivityListSkeleton } from '../../components/activity/ActivityListSkeleton';
import { PostedActivityCard } from '../../components/activity/PostedActivityCard';
import { ParticipatingActivityCard } from '../../components/activity/ParticipatingActivityCard';
import { ActivityItem } from '../../types/activity';
import { useActivityData, TabView } from './hooks/useActivityData';
import { useAppNavigation } from '../../hooks/useAppNavigation';

const POSTED_FILTERS = [
  { key: 'all', label: 'Tất cả', icon: 'apps-outline', color: '#FF6B35' },
  { key: 'OPEN', label: 'Đang mở', icon: 'radio-button-on-outline', color: '#0369A1' },
  { key: 'IN_PROGRESS', label: 'Đang làm', icon: 'flash-outline', color: '#D97706' },
  { key: 'COMPLETED', label: 'Hoàn thành', icon: 'checkmark-circle-outline', color: '#059669' },
  { key: 'CANCELLED', label: 'Đã hủy', icon: 'close-circle-outline', color: '#667085' },
];

const PARTICIPATING_FILTERS = [
  { key: 'all', label: 'Tất cả', icon: 'apps-outline', color: '#FF6B35' },
  { key: 'PENDING', label: 'Chờ phản hồi', icon: 'time-outline', color: '#D97706' },
  { key: 'ACCEPTED', label: 'Đã nhận', icon: 'checkmark-outline', color: '#0369A1' },
  { key: 'IN_PROGRESS', label: 'Đang làm', icon: 'flash-outline', color: '#0284C7' },
  { key: 'COMPLETED', label: 'Hoàn thành', icon: 'checkmark-circle-outline', color: '#059669' },
  { key: 'ENDED', label: 'Kết thúc', icon: 'close-circle-outline', color: '#667085' },
];

export const ActivityScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useAppNavigation();

  const {
    activeTab,
    statusFilter,
    searchInput,
    setSearchInput,
    searchQuery,
    activities,
    summary,
    loading,
    loadingMore,
    refreshing,
    errorMessage,
    completionRate,
    firstName,
    focusItem,
    handleRefresh,
    handleLoadMore,
    handleTabChange,
    handleStatCardPress,
    handleResetFilters,
  } = useActivityData();

  const activeFilters = activeTab === 'POSTED' ? POSTED_FILTERS : PARTICIPATING_FILTERS;

  const getFilterCount = (key: string) => {
    if (!summary) return 0;
    if (activeTab === 'POSTED') {
      switch (key) {
        case 'all': return summary.posted.total;
        case 'OPEN': return summary.posted.open;
        case 'IN_PROGRESS': return summary.posted.inProgress;
        case 'COMPLETED': return summary.posted.completed;
        case 'CANCELLED': return summary.posted.cancelled;
        default: return 0;
      }
    } else {
      switch (key) {
        case 'all': return summary.participating.total;
        case 'PENDING': return summary.participating.pending;
        case 'ACCEPTED': return summary.participating.accepted;
        case 'IN_PROGRESS': return summary.participating.inProgress;
        case 'COMPLETED': return summary.participating.completed;
        case 'ENDED': return summary.participating.ended;
        default: return 0;
      }
    }
  };

  const renderHeader = () => (
    <View
      style={[
        styles.header,
        {
          backgroundColor: theme.colors.background.secondary,
          borderBottomColor: theme.colors.border.subtle,
          paddingTop: Platform.OS === 'ios' ? 56 : 40,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.md,
        },
      ]}
    >
      <View style={styles.headerInner}>
        <View style={styles.headerCopy}>
          <Text style={[styles.headerEyebrow, { color: theme.colors.brand.primary, marginBottom: theme.spacing.xs }]}>
            THEO DÕI TIẾN ĐỘ
          </Text>
          <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Hoạt động</Text>
        </View>
        <View style={[styles.headerBadge, { backgroundColor: theme.colors.brand.primarySoft, borderColor: theme.colors.brand.primarySoft }]}>
          <Ionicons name="pulse-outline" size={20} color={theme.colors.brand.primary} />
        </View>
      </View>

      <View style={[styles.tabBar, { borderBottomColor: theme.colors.border.subtle, marginTop: theme.spacing.md }]}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'POSTED' && [styles.tabItemActive, { borderBottomColor: theme.colors.brand.primary }]]}
          onPress={() => handleTabChange('POSTED')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Xem bài đăng của bạn"
        >
          <Text style={[styles.tabLabel, { color: theme.colors.text.secondary }, activeTab === 'POSTED' && [styles.tabLabelActive, { color: theme.colors.brand.primary }]]}>
            Bài đã đăng
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'PARTICIPATING' && [styles.tabItemActive, { borderBottomColor: theme.colors.brand.primary }]]}
          onPress={() => handleTabChange('PARTICIPATING')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Xem việc bạn đang tham gia"
        >
          <Text style={[styles.tabLabel, { color: theme.colors.text.secondary }, activeTab === 'PARTICIPATING' && [styles.tabLabelActive, { color: theme.colors.brand.primary }]]}>
            Việc đang tham gia
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchWrapper, { backgroundColor: theme.colors.background.primary, marginTop: theme.spacing.md, paddingHorizontal: theme.spacing.md }]}>
        <Ionicons name="search-outline" size={18} color={theme.colors.text.secondary} />
        <TextInput
          value={searchInput}
          onChangeText={setSearchInput}
          style={[styles.searchInput, { color: theme.colors.text.primary, marginLeft: theme.spacing.sm }]}
          placeholder="Tìm theo tên bài đăng, mô tả..."
          placeholderTextColor={theme.colors.text.muted}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Ô tìm kiếm hoạt động"
          accessibilityHint="Nhập nội dung để tìm kiếm trong danh sách hoạt động"
        />
        {searchInput.length > 0 && (
          <TouchableOpacity onPress={() => setSearchInput('')} style={styles.clearBtn} accessibilityRole="button" accessibilityLabel="Xóa nội dung tìm kiếm">
            <Ionicons name="close-circle" size={18} color={theme.colors.text.muted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderDashboard = () => {
    if (!summary) return null;

    return (
      <View style={[styles.dashboardSection, { padding: theme.spacing.lg, backgroundColor: theme.colors.background.secondary, borderRadius: theme.radius.medium, margin: theme.spacing.lg }]}>
        <View style={styles.sectionTitleRow}>
          <View>
            <Text style={[styles.sectionEyebrow, { color: theme.colors.brand.primary, fontSize: 10, fontWeight: '800' }]}>TỔNG QUAN TIẾN ĐỘ</Text>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary, fontSize: 16, fontWeight: '800' }]}>Hoạt động của {firstName}</Text>
          </View>
          <View style={[styles.progressBadge, { backgroundColor: theme.colors.brand.primarySoft, padding: 6, borderRadius: theme.radius.small }]}>
            <Text style={[styles.progressBadgeValue, { color: theme.colors.brand.primaryDark, fontWeight: '800' }]}>{completionRate}%</Text>
            <Text style={{ color: theme.colors.brand.primaryDark, fontSize: 9, textAlign: 'center' }}>hoàn tất</Text>
          </View>
        </View>

        <View style={[styles.progressTrack, { backgroundColor: theme.colors.border.subtle, height: 6, borderRadius: 3, marginTop: theme.spacing.md }]}>
          <View style={[styles.progressActive, { backgroundColor: theme.colors.brand.primary, width: `${completionRate}%`, height: '100%', borderRadius: 3 }]} />
        </View>

        <View style={[styles.statGrid, { marginTop: theme.spacing.md }]}>
          {activeFilters.slice(1, 5).map((filter) => {
            const count = getFilterCount(filter.key);
            const isFilterActive = statusFilter === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.statCard,
                  {
                    backgroundColor: theme.colors.background.primary,
                    borderRadius: theme.radius.small,
                    padding: theme.spacing.sm,
                    borderColor: isFilterActive ? theme.colors.brand.primary : 'transparent',
                    borderWidth: 1,
                  },
                ]}
                onPress={() => handleStatCardPress(filter.key)}
                accessibilityRole="button"
                accessibilityLabel={`Lọc theo trạng thái ${filter.label}`}
              >
                <View style={[styles.statIcon, { backgroundColor: filter.color + '1A', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name={filter.icon as any} size={14} color={filter.color} />
                </View>
                <Text style={[styles.statValue, { color: theme.colors.text.primary, fontWeight: '800', marginTop: theme.spacing.xs }]}>{count}</Text>
                <Text style={{ color: theme.colors.text.secondary, fontSize: 10 }}>{filter.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderFocusCard = () => {
    if (!focusItem) return null;

    return (
      <TouchableOpacity
        style={[
          styles.focusCard,
          {
            backgroundColor: theme.colors.background.secondary,
            borderRadius: theme.radius.medium,
            padding: theme.spacing.lg,
            marginHorizontal: theme.spacing.lg,
            marginBottom: theme.spacing.lg,
            borderColor: theme.colors.border.subtle,
            borderWidth: 1,
            gap: theme.spacing.md,
          },
        ]}
        onPress={() => navigation.navigate('JobDetail', { taskId: focusItem.taskId })}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Đề xuất cần chú ý: ${focusItem.label}. Công việc: ${focusItem.title}`}
      >
        <View style={[styles.focusIcon, { backgroundColor: focusItem.color + '1A', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }]}>
          <Ionicons name={focusItem.icon as any} size={18} color={focusItem.color} />
        </View>
        <View style={styles.focusContent}>
          <Text style={[styles.focusEyebrow, { color: focusItem.color, fontSize: 10, fontWeight: '800' }]}>{focusItem.label}</Text>
          <Text style={[styles.focusTitle, { color: theme.colors.text.primary, fontSize: 14, fontWeight: '700' }]} numberOfLines={1}>
            {focusItem.title}
          </Text>
          <Text style={{ color: theme.colors.text.secondary, fontSize: 12 }} numberOfLines={1}>
            {focusItem.msg}
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={16} color={theme.colors.text.muted} />
      </TouchableOpacity>
    );
  };

  const renderFilterChips = () => (
    <View style={[styles.filterContainer, { backgroundColor: theme.colors.background.primary, borderBottomColor: theme.colors.border.subtle }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filterContent, { paddingHorizontal: theme.spacing.lg, gap: theme.spacing.sm }]}
        keyboardShouldPersistTaps="handled"
      >
        {activeFilters.map((filter) => {
          const isActive = statusFilter === filter.key;
          const count = getFilterCount(filter.key);
          return (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterChip,
                {
                  backgroundColor: theme.colors.background.secondary,
                  borderColor: theme.colors.border.subtle,
                  gap: theme.spacing.xs,
                  paddingHorizontal: theme.spacing.md,
                },
                isActive && { backgroundColor: theme.colors.brand.primarySoft, borderColor: theme.colors.brand.primary },
              ]}
              onPress={() => handleStatCardPress(filter.key)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Lọc ${filter.label}`}
            >
              <Ionicons name={filter.icon as any} size={12} color={isActive ? theme.colors.brand.primary : theme.colors.text.secondary} />
              <Text style={[styles.filterText, { color: theme.colors.text.secondary }, isActive && { color: theme.colors.brand.primaryDark, fontWeight: '800' }]}>
                {filter.label}
              </Text>
              <View style={[styles.filterCount, { backgroundColor: theme.colors.background.primary }, isActive && { backgroundColor: theme.colors.brand.primarySoft }]}>
                <Text style={[styles.filterCountText, { color: theme.colors.text.secondary }, isActive && { color: theme.colors.brand.primaryDark }]}>
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderItem = ({ item }: { item: ActivityItem }) => {
    if (item.activityType === 'POSTED') {
      return <PostedActivityCard task={item.post} applicantCount={item.stats?.applicantCount || 0} />;
    } else {
      return <ParticipatingActivityCard task={item.post} participation={item.participation!} />;
    }
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.brand.primary} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;

    if (errorMessage) {
      return <ErrorState message={errorMessage} onRetry={handleRefresh} />;
    }

    const isFiltered = searchQuery || statusFilter !== 'all';
    return (
      <View style={[styles.emptyContainer, { paddingHorizontal: theme.spacing.xl }]}>
        <EmptyState
          title={isFiltered ? 'Không tìm thấy kết quả' : 'Chưa có hoạt động'}
          message={
            isFiltered
              ? 'Thử thay đổi từ khóa hoặc bộ lọc của bạn.'
              : activeTab === 'POSTED'
              ? 'Tạo bài đăng đầu tiên của bạn để tìm kiếm người giúp việc!'
              : 'Hãy ứng tuyển các công việc trên bảng tin để tham gia hoạt động.'
          }
        />
        {isFiltered && (
          <TouchableOpacity
            style={[styles.resetButton, { backgroundColor: theme.colors.brand.primarySoft, borderColor: theme.colors.brand.primaryBorder, paddingHorizontal: theme.spacing.lg }]}
            onPress={handleResetFilters}
            accessibilityRole="button"
            accessibilityLabel="Đặt lại bộ lọc hoạt động"
          >
            <Text style={[styles.resetButtonText, { color: theme.colors.brand.primaryDark }]}>Đặt lại bộ lọc</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background.primary }]}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />

      {renderHeader()}
      {renderFilterChips()}

      {loading && activities.length === 0 ? (
        <ActivityListSkeleton />
      ) : (
        <FlatList
          data={activities}
          keyExtractor={(item) => `${item.id}-${item.activityType}`}
          renderItem={renderItem}
          ListHeaderComponent={
            <>
              {renderDashboard()}
              {renderFocusCard()}
            </>
          }
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.brand.primary}
              colors={[theme.colors.brand.primary]}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
  },
  headerEyebrow: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
  },
  headerBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    minHeight: 44,
    justifyContent: 'center',
  },
  tabItemActive: {},
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  tabLabelActive: {
    fontWeight: '800',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
    padding: 0,
  },
  clearBtn: {
    padding: 2,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  filterContent: {},
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '600',
  },
  filterTextActive: {},
  filterCount: {
    height: 18,
    minWidth: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountActive: {},
  filterCountText: {
    fontSize: 9,
    fontWeight: '700',
  },
  filterCountTextActive: {},
  dashboardSection: {
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionEyebrow: {},
  sectionTitle: {},
  progressBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  progressBadgeValue: {
    fontSize: 13,
  },
  progressBadgeLabel: {},
  progressTrack: {
    overflow: 'hidden',
  },
  progressActive: {},
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCard: {
    flex: 1,
    minWidth: '22%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardActive: {},
  statIcon: {},
  statValue: {
    fontSize: 15,
  },
  statLabel: {},
  focusCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  focusIcon: {},
  focusContent: {
    flex: 1,
  },
  focusEyebrow: {},
  focusTitle: {},
  focusDescription: {},
  focusArrow: {},
  listContent: {
    paddingBottom: 40,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  resetButton: {
    marginTop: 16,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: '800',
  },
  errorCard: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginVertical: 8,
  },
  errorDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    minHeight: 44,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
