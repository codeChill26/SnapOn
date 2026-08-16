import React, { useCallback, useMemo } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';

import { HomeMarketplaceHeader } from '../../components/home/HomeMarketplaceHeader';
import { HomePostTypeTabs } from '../../components/home/HomeRoleTabs';
import { HomeSearchFilterBar } from '../../components/home/HomeSearchFilterBar';
import { HomeQuickFilters } from '../../components/home/HomeQuickFilters';
import { HomeCompactJobCard } from '../../components/home/HomeCompactJobCard';
import { HomeJobGridSkeleton } from '../../components/home/HomeJobGridSkeleton';
import { HomeBannerCarousel } from '../../components/home/HomeBannerCarousel';
import { CategoryPickerModal } from '../../components/categories/CategoryPickerModal';
import { NotificationModal } from '../../components/notifications/NotificationModal';
import { notificationService } from '../../services/notificationService';
import { useAuth } from '../../context/AuthContext';

import { Task } from '../../types';
import { useTheme } from '../../theme';
import { useHomeTasks } from './hooks/useHomeTasks';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { taskService } from '../../services/taskService';

export const HomeScreen: React.FC = () => {
  const navigation = useAppNavigation();
  const { user } = useAuth();
  const theme = useTheme();

  const flashListRef = React.useRef<any>(null);

  const {
    state: {
      loading,
      refreshing,
      bannerRefreshKey,
      searchQuery,
      debouncedSearch,
      postTypeFilter,
      selectedFieldId,
      selectedFieldName,
      selectedSubcategoryId,
      selectedSubcategoryName,
      activeSort,
      categoryModalVisible,
      categoriesList,
      statusFilter,
      savingTaskIds,
      hasActiveFilter,
      sortedTasks,
      page,
      totalPages,
      totalTasks,
    },
    actions: {
      setSearchQuery,
      setPostTypeFilter,
      setActiveSort,
      setCategoryModalVisible,
      setStatusFilter,
      onRefresh,
      handleResetFilters,
      handleCategorySelect,
      handleSelectField,
      handleSelectSubcategory,
      handleClearCategoryFilter,
      handleToggleSaved,
      handleClearSearch,
      handleSubmitSearch,
      handlePageChange,
    }
  } = useHomeTasks();

  const [notifModalVisible, setNotifModalVisible] = React.useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = React.useState(0);
  const [jumpInput, setJumpInput] = React.useState('');

  const fetchUnreadNotifCount = useCallback(async () => {
    try {
      const data = await notificationService.getNotifications();
      setUnreadNotifCount(data.unreadCount);
    } catch (err) {
      // Ignore
    }
  }, []);

  React.useEffect(() => {
    fetchUnreadNotifCount();
  }, [fetchUnreadNotifCount]);

  const handleJumpToPage = useCallback(() => {
    const target = parseInt(jumpInput.trim(), 10);
    if (!isNaN(target) && target >= 1 && target <= totalPages) {
      handlePageChange(target);
      flashListRef.current?.scrollToOffset({ offset: 360, animated: true });
      setJumpInput('');
      Keyboard.dismiss();
    } else {
      Alert.alert('Trang không hợp lệ', `Vui lòng nhập số trang từ 1 đến ${totalPages}.`);
    }
  }, [jumpInput, totalPages, handlePageChange]);

  const getPageNumbers = useCallback((current: number, total: number): (number | string)[] => {
    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    pages.push(1);
    if (current > 3) {
      pages.push('...');
    }
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) {
      if (!pages.includes(i)) {
        pages.push(i);
      }
    }
    if (current < total - 2) {
      pages.push('...');
    }
    if (!pages.includes(total)) {
      pages.push(total);
    }
    return pages;
  }, []);

  const handleJobPress = useCallback(
    (task: Task) => {
      taskService.prefetchTaskDetail(task.id);
      navigation.navigate('JobDetail', {
        taskId: task.id,
      });
    },
    [navigation]
  );

  const handleSavedPress = useCallback(() => {
    navigation.navigate('SavedJobs');
  }, [navigation]);

  // Nhóm danh sách công việc thành từng dòng 2 cột cho FlashList hiển thị dạng lưới thủ công
  const taskRows = useMemo(() => {
    const rows: Task[][] = [];
    for (let i = 0; i < sortedTasks.length; i += 2) {
      const row = [sortedTasks[i]];
      if (sortedTasks[i + 1]) {
        row.push(sortedTasks[i + 1]);
      }
      rows.push(row);
    }
    return rows;
  }, [sortedTasks]);

  const renderJobItem = useCallback(
    ({ item }: { item: Task[] }) => {
      const leftTask = item[0];
      const rightTask = item[1];

      return (
        <View style={styles.rowContainer}>
          <View style={styles.columnItem}>
            {leftTask && (
              <HomeCompactJobCard
                task={leftTask}
                onPress={handleJobPress}
                onToggleSaved={handleToggleSaved}
                saving={Boolean(savingTaskIds[leftTask.id])}
              />
            )}
          </View>
          <View style={styles.columnItem}>
            {rightTask ? (
              <HomeCompactJobCard
                task={rightTask}
                onPress={handleJobPress}
                onToggleSaved={handleToggleSaved}
                saving={Boolean(savingTaskIds[rightTask.id])}
              />
            ) : (
              <View style={styles.emptyColumnPlaceholder} />
            )}
          </View>
        </View>
      );
    },
    [handleJobPress, handleToggleSaved, savingTaskIds],
  );

  const listEmptyComponent = useMemo(() => {
    if (loading) {
      return <HomeJobGridSkeleton />;
    }

    return (
      <View style={[styles.emptyContainer, { paddingHorizontal: theme.spacing.xl }]}>
        <View
          style={[
            styles.emptyIconCircle,
            {
              backgroundColor: theme.colors.brand.primarySoft,
              marginBottom: theme.spacing.md,
            },
          ]}
        >
          <Ionicons name="briefcase-outline" size={36} color={theme.colors.brand.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: theme.colors.text.primary, marginBottom: theme.spacing.xs }]}>
          Chưa tìm thấy công việc phù hợp
        </Text>
        <Text style={[styles.emptySubtitle, { color: theme.colors.text.secondary }]}>
          Hãy thử từ khóa khác hoặc thay đổi bộ lọc danh mục.
        </Text>

        {hasActiveFilter && (
          <TouchableOpacity
            style={[
              styles.resetButton,
              {
                marginTop: theme.spacing.xl,
                paddingHorizontal: theme.spacing.lg,
                backgroundColor: theme.colors.brand.primarySoft,
                borderColor: theme.colors.brand.primaryBorder,
                borderRadius: theme.radius.medium,
              },
            ]}
            onPress={handleResetFilters}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Đặt lại bộ lọc"
            accessibilityHint="Xóa tất cả các bộ lọc hiện tại để quay lại mặc định"
          >
            <Ionicons name="refresh-outline" size={18} color={theme.colors.brand.primaryDark} />
            <Text style={[styles.resetButtonText, { color: theme.colors.brand.primaryDark, marginLeft: theme.spacing.xs }]}>
              Đặt lại bộ lọc
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [loading, hasActiveFilter, handleResetFilters, theme]);

  const listFooterComponent = useMemo(() => {
    if (totalPages <= 1) {
      return <View style={[styles.listFooter, { backgroundColor: theme.colors.background.secondary }]} />;
    }

    const pageNumbers = getPageNumbers(page, totalPages);

    return (
      <View
        style={[
          styles.paginationContainer,
          {
            backgroundColor: theme.colors.background.secondary,
            borderColor: theme.colors.border.subtle,
          },
        ]}
      >
        <Text style={[styles.paginationInfoText, { color: theme.colors.text.secondary }]}>
          Hiển thị trang <Text style={{ fontWeight: '800', color: theme.colors.text.primary }}>{page}</Text> /{' '}
          <Text style={{ fontWeight: '800', color: theme.colors.text.primary }}>{totalPages}</Text>{' '}
          ({totalTasks > 0 ? totalTasks : sortedTasks.length} việc)
        </Text>

        <View style={styles.paginationControlsRow}>
          <TouchableOpacity
            style={[
              styles.pageBtn,
              {
                borderColor: theme.colors.border.subtle,
                backgroundColor: page === 1 ? theme.colors.background.primary : theme.colors.brand.primarySoft,
                opacity: page === 1 ? 0.4 : 1,
              },
            ]}
            disabled={page === 1 || loading}
            onPress={() => {
              handlePageChange(page - 1);
              flashListRef.current?.scrollToOffset({ offset: 360, animated: true });
            }}
            accessibilityRole="button"
            accessibilityLabel="Trang trước"
          >
            <Ionicons name="chevron-back" size={14} color={theme.colors.brand.primary} />
            <Text style={[styles.pageBtnText, { color: theme.colors.brand.primary, marginLeft: 2 }]}>Trước</Text>
          </TouchableOpacity>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pageNumbersScroll}
            contentContainerStyle={styles.pageNumbersScrollContainer}
          >
            {pageNumbers.map((p, idx) => {
              if (typeof p === 'string') {
                return (
                  <Text key={`ellipsis-${idx}`} style={[styles.ellipsisText, { color: theme.colors.text.secondary }]}>
                    ...
                  </Text>
                );
              }
              return (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.pageNumberPill,
                    p === page
                      ? { backgroundColor: theme.colors.brand.primary, borderColor: theme.colors.brand.primary }
                      : { backgroundColor: theme.colors.background.primary, borderColor: theme.colors.border.subtle },
                  ]}
                  disabled={p === page || loading}
                  onPress={() => {
                    handlePageChange(p);
                    flashListRef.current?.scrollToOffset({ offset: 360, animated: true });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Trang ${p}`}
                >
                  <Text
                    style={[
                      styles.pageNumberText,
                      p === page ? { color: '#FFFFFF', fontWeight: '800' } : { color: theme.colors.text.primary },
                    ]}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.pageBtn,
              {
                borderColor: theme.colors.border.subtle,
                backgroundColor: page === totalPages ? theme.colors.background.primary : theme.colors.brand.primarySoft,
                opacity: page === totalPages ? 0.4 : 1,
              },
            ]}
            disabled={page === totalPages || loading}
            onPress={() => {
              handlePageChange(page + 1);
              flashListRef.current?.scrollToOffset({ offset: 360, animated: true });
            }}
            accessibilityRole="button"
            accessibilityLabel="Trang sau"
          >
            <Text style={[styles.pageBtnText, { color: theme.colors.brand.primary, marginRight: 2 }]}>Sau</Text>
            <Ionicons name="chevron-forward" size={14} color={theme.colors.brand.primary} />
          </TouchableOpacity>
        </View>

        {/* Jump to Page Row ([ TextInput ] / totalPages  [ Đi đến ]) */}
        <View style={styles.jumpToPageRow}>
          <TextInput
            style={[
              styles.jumpInput,
              {
                backgroundColor: theme.colors.background.primary,
                borderColor: theme.colors.border.subtle,
                color: theme.colors.text.primary,
              },
            ]}
            keyboardType="number-pad"
            value={jumpInput}
            onChangeText={setJumpInput}
            placeholder={String(page)}
            placeholderTextColor={theme.colors.text.secondary}
            maxLength={4}
            onFocus={() => {
              setTimeout(() => {
                flashListRef.current?.scrollToEnd({ animated: true });
              }, 150);
            }}
            returnKeyType="done"
            onSubmitEditing={handleJumpToPage}
          />
          <Text style={[styles.jumpTotalText, { color: theme.colors.text.secondary }]}>
            / {totalPages}
          </Text>
          <TouchableOpacity
            style={[
              styles.jumpBtn,
              {
                backgroundColor: theme.colors.brand.primary,
              },
            ]}
            disabled={loading}
            onPress={handleJumpToPage}
            accessibilityRole="button"
            accessibilityLabel="Đi đến trang"
          >
            <Text style={styles.jumpBtnText}>Đi đến</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [page, totalPages, totalTasks, sortedTasks.length, loading, jumpInput, handleJumpToPage, getPageNumbers, handlePageChange, theme]);

  const listHeader = useMemo(
    () => (
      <View style={[styles.headerWrapper, { backgroundColor: theme.colors.background.primary }]}>
        <HomeMarketplaceHeader
          user={user}
          selectedCategoryName={selectedSubcategoryName || selectedFieldName}
          onCategoryPress={() => setCategoryModalVisible(true)}
          onSavedPress={handleSavedPress}
          onNotificationPress={() => setNotifModalVisible(true)}
          unreadCount={unreadNotifCount}
        />

        <View style={[styles.bannerContainer, { paddingBottom: theme.spacing.md }]}>
          <HomeBannerCarousel
            onSelectCategory={handleCategorySelect}
            selectedFieldId={selectedFieldId}
            refreshKey={bannerRefreshKey}
          />
        </View>

        <View
          style={[
            styles.whiteSheet,
            {
              backgroundColor: theme.colors.background.secondary,
              borderTopLeftRadius: theme.radius.sheet,
              borderTopRightRadius: theme.radius.sheet,
              paddingTop: theme.spacing.sm,
            },
          ]}
        >
          <HomePostTypeTabs
            selectedFilter={postTypeFilter}
            onSelectFilter={setPostTypeFilter}
            hasActiveFilter={hasActiveFilter}
            onResetFilters={handleResetFilters}
          />

          <HomeSearchFilterBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSubmitSearch={handleSubmitSearch}
            onClearSearch={handleClearSearch}
            selectedCategory={selectedFieldId || selectedSubcategoryId}
            onPressFilter={() => setCategoryModalVisible(true)}
          />

          <HomeQuickFilters
            activeSort={activeSort}
            onSortChange={setActiveSort}
            selectedCategory={selectedFieldId || selectedSubcategoryId}
            onFilterPress={() => setCategoryModalVisible(true)}
          />

          {(postTypeFilter === 'RECRUITMENT' || postTypeFilter === 'ALL') && (
            <View style={styles.statusFiltersContainer}>
              <TouchableOpacity
                style={[
                  styles.statusFilterChip,
                  statusFilter === 'ALL' && [styles.statusFilterChipActive, { backgroundColor: theme.colors.brand.primarySoft }],
                ]}
                onPress={() => setStatusFilter('ALL')}
                accessibilityRole="button"
                accessibilityLabel="Lọc tất cả trạng thái"
              >
                <Text
                  style={[
                    styles.statusFilterText,
                    statusFilter === 'ALL' && [styles.statusFilterTextActive, { color: theme.colors.brand.primaryDark }],
                  ]}
                >
                  Tất cả
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.statusFilterChip,
                  statusFilter === 'OPEN' && [styles.statusFilterChipActive, { backgroundColor: theme.colors.brand.primarySoft }],
                ]}
                onPress={() => setStatusFilter('OPEN')}
                accessibilityRole="button"
                accessibilityLabel="Lọc công việc đang tuyển dụng"
              >
                <Text
                  style={[
                    styles.statusFilterText,
                    statusFilter === 'OPEN' && [styles.statusFilterTextActive, { color: theme.colors.brand.primaryDark }],
                  ]}
                >
                  Đang mở
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.statusFilterChip,
                  statusFilter === 'CLOSED' && [styles.statusFilterChipActive, { backgroundColor: theme.colors.brand.primarySoft }],
                ]}
                onPress={() => setStatusFilter('CLOSED')}
                accessibilityRole="button"
                accessibilityLabel="Lọc công việc đã đóng tuyển dụng"
              >
                <Text
                  style={[
                    styles.statusFilterText,
                    statusFilter === 'CLOSED' && [styles.statusFilterTextActive, { color: theme.colors.brand.primaryDark }],
                  ]}
                >
                  Đã đóng
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {hasActiveFilter && (
            <View
              style={[
                styles.activeChipsRow,
                {
                  paddingHorizontal: theme.spacing.xl,
                  paddingVertical: theme.spacing.xs,
                  gap: theme.spacing.sm,
                },
              ]}
            >
              {selectedFieldId && (
                <View
                  style={[
                    styles.activeChip,
                    {
                      backgroundColor: theme.colors.brand.primarySoft,
                      borderRadius: theme.radius.small,
                      borderColor: theme.colors.brand.primaryBorder,
                    },
                  ]}
                >
                  <Ionicons name="funnel-outline" size={12} color={theme.colors.brand.primary} />
                  <Text
                    style={[styles.activeChipText, { color: theme.colors.brand.primaryDark, marginLeft: theme.spacing.xs, marginRight: theme.spacing.xs }]}
                    numberOfLines={1}
                  >
                    {selectedSubcategoryName
                      ? `${selectedFieldName} · ${selectedSubcategoryName}`
                      : selectedFieldName}
                  </Text>
                  <TouchableOpacity
                    onPress={handleClearCategoryFilter}
                    hitSlop={6}
                    style={styles.activeChipClose}
                    accessibilityRole="button"
                    accessibilityLabel="Xóa bộ lọc danh mục"
                  >
                    <Ionicons name="close-circle" size={14} color={theme.colors.text.secondary} />
                  </TouchableOpacity>
                </View>
              )}

              {debouncedSearch && (
                <View
                  style={[
                    styles.activeChip,
                    {
                      backgroundColor: theme.colors.brand.primarySoft,
                      borderRadius: theme.radius.small,
                      borderColor: theme.colors.brand.primaryBorder,
                    },
                  ]}
                >
                  <Ionicons name="search-outline" size={12} color={theme.colors.brand.primary} />
                  <Text
                    style={[styles.activeChipText, { color: theme.colors.brand.primaryDark, marginLeft: theme.spacing.xs, marginRight: theme.spacing.xs }]}
                    numberOfLines={1}
                  >
                    Tìm: "{debouncedSearch}"
                  </Text>
                  <TouchableOpacity
                    onPress={handleClearSearch}
                    hitSlop={6}
                    style={styles.activeChipClose}
                    accessibilityRole="button"
                    accessibilityLabel="Xóa từ khóa tìm kiếm"
                  >
                    <Ionicons name="close-circle" size={14} color={theme.colors.text.secondary} />
                  </TouchableOpacity>
                </View>
              )}

              {selectedFieldId && debouncedSearch && (
                <TouchableOpacity
                  onPress={handleResetFilters}
                  style={[styles.activeResetAllBtn, { paddingVertical: theme.spacing.xs, paddingHorizontal: theme.spacing.sm }]}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Đặt lại tất cả bộ lọc"
                >
                  <Text style={[styles.activeResetAllText, { color: theme.colors.brand.primary }]}>Đặt lại</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View
            style={[
              styles.listTitleRow,
              {
                paddingHorizontal: theme.spacing.xl,
                paddingTop: theme.spacing.md,
                paddingBottom: theme.spacing.sm,
                backgroundColor: theme.colors.background.secondary,
              },
            ]}
          >
            <Text style={[styles.listTitle, { color: theme.colors.text.primary }]}>
              {debouncedSearch
                ? `Kết quả cho "${debouncedSearch}"`
                : selectedSubcategoryName
                ? selectedSubcategoryName
                : selectedFieldName
                ? selectedFieldName
                : 'Việc mới dành cho bạn'}
            </Text>
            <Text style={[styles.listCount, { color: theme.colors.brand.primary }]}>
              {loading ? '...' : `${totalTasks > 0 ? totalTasks : sortedTasks.length} việc`}
            </Text>
          </View>
        </View>
      </View>
    ),
    [
      user,
      selectedSubcategoryName,
      selectedFieldName,
      selectedFieldId,
      bannerRefreshKey,
      postTypeFilter,
      hasActiveFilter,
      searchQuery,
      selectedSubcategoryId,
      activeSort,
      statusFilter,
      debouncedSearch,
      loading,
      totalTasks,
      sortedTasks.length,
      handleCategorySelect,
      handleResetFilters,
      handleSavedPress,
      handleSubmitSearch,
      handleClearSearch,
      handleClearCategoryFilter,
      unreadNotifCount,
      theme,
    ]
  );

  const SafeFlashList = FlashList as any;

  return (
    <KeyboardAvoidingView
      style={[styles.mainContainer, { backgroundColor: theme.colors.background.secondary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <SafeFlashList
        ref={flashListRef}
        style={[styles.list, { backgroundColor: theme.colors.background.secondary }]}
        data={taskRows}
        keyExtractor={(item: Task[]) => String(item[0].id)}
        renderItem={renderJobItem}
        estimatedItemSize={220}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmptyComponent}
        ListFooterComponent={listFooterComponent}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.brand.primary}
            colors={[theme.colors.brand.primary]}
          />
        }
      />

      <CategoryPickerModal
        visible={categoryModalVisible}
        selectedFieldId={selectedFieldId}
        selectedSubcategoryId={selectedSubcategoryId}
        onClose={() => setCategoryModalVisible(false)}
        onSelectField={handleSelectField}
        onSelectSubcategory={handleSelectSubcategory}
        onClear={handleClearCategoryFilter}
        fields={categoriesList}
      />

      <NotificationModal
        visible={notifModalVisible}
        onClose={() => setNotifModalVisible(false)}
        onRefreshUnreadCount={fetchUnreadNotifCount}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  columnItem: {
    flex: 1,
  },
  emptyColumnPlaceholder: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  headerWrapper: {
    backgroundColor: '#F7F8FA',
  },
  bannerContainer: {
    backgroundColor: '#F7F8FA',
  },
  whiteSheet: {
    marginTop: -28,
    shadowColor: '#101828',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 3,
  },
  activeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  activeChipText: {
    fontSize: 11,
    fontWeight: '700',
    maxWidth: 200,
  },
  activeChipClose: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeResetAllBtn: {},
  activeResetAllText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  listCount: {
    fontSize: 13,
    fontWeight: '700',
  },
  listFooter: {
    height: 40,
  },
  emptyContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    width: '100%',
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderWidth: 1.5,
    minHeight: 44,
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: '800',
  },
  statusFiltersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 8,
    gap: 8,
  },
  statusFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F2F4F7',
    minHeight: 36,
    justifyContent: 'center',
  },
  statusFilterChipActive: {},
  statusFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667085',
  },
  statusFilterTextActive: {
    fontWeight: '700',
  },
  paginationContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    marginBottom: 32,
    marginHorizontal: 16,
    alignItems: 'center',
  },
  paginationInfoText: {
    fontSize: 12,
    marginBottom: 10,
    textAlign: 'center',
  },
  paginationControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  pageNumbersScroll: {
    flex: 1,
    marginHorizontal: 4,
  },
  pageNumbersScrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    gap: 4,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 36,
  },
  pageBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pageNumberPill: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageNumberText: {
    fontSize: 12,
    fontWeight: '700',
  },
  ellipsisText: {
    fontSize: 12,
    fontWeight: '700',
    marginHorizontal: 1,
  },
  jumpToPageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    gap: 8,
  },
  jumpInput: {
    width: 54,
    height: 38,
    borderWidth: 1,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  jumpTotalText: {
    fontSize: 13,
    fontWeight: '600',
  },
  jumpBtn: {
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jumpBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
