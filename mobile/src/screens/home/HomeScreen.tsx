import React, { useCallback, useMemo } from 'react';
import {
  Keyboard,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
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
import { useAuth } from '../../context/AuthContext';
import { Task } from '../../types';
import { useTheme } from '../../theme';
import { useHomeTasks } from './hooks/useHomeTasks';
import { useAppNavigation } from '../../hooks/useAppNavigation';

export const HomeScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useAppNavigation();
  const { user } = useAuth();
  const { width } = useWindowDimensions();

  // Responsive grid calculation
  const isTablet = width >= 768;
  const numColumns = isTablet ? 3 : 2;

  const {
    loading,
    refreshing,
    bannerRefreshKey,
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    postTypeFilter,
    setPostTypeFilter,
    selectedFieldId,
    selectedFieldName,
    selectedSubcategoryId,
    selectedSubcategoryName,
    activeSort,
    setActiveSort,
    categoryModalVisible,
    setCategoryModalVisible,
    categoriesList,
    statusFilter,
    setStatusFilter,
    savingTaskIds,
    onRefresh,
    handleResetFilters,
    handleCategorySelect,
    handleSelectField,
    handleSelectSubcategory,
    handleClearCategoryFilter,
    handleToggleSaved,
    handleClearSearch,
    handleSubmitSearch,
    hasActiveFilter,
    sortedTasks,
  } = useHomeTasks();

  const handleJobPress = useCallback(
    (task: Task) => {
      navigation.navigate('JobDetail', {
        taskId: task.id,
      });
    },
    [navigation]
  );

  const handleSavedPress = useCallback(() => {
    navigation.navigate('SavedJobs');
  }, [navigation]);

  // Group tasks into row arrays for FlashList rendering
  const taskRows = useMemo(() => {
    const rows: Task[][] = [];
    for (let i = 0; i < sortedTasks.length; i += numColumns) {
      const row: Task[] = [];
      for (let j = 0; j < numColumns; j++) {
        if (sortedTasks[i + j]) {
          row.push(sortedTasks[i + j]);
        }
      }
      rows.push(row);
    }
    return rows;
  }, [sortedTasks, numColumns]);

  const renderJobItem = useCallback(
    ({ item }: { item: Task[] }) => {
      return (
        <View
          style={[
            styles.rowContainer,
            {
              paddingHorizontal: theme.spacing.lg,
              backgroundColor: theme.colors.background.secondary,
              gap: theme.spacing.md,
            },
          ]}
        >
          {Array.from({ length: numColumns }).map((_, index) => {
            const task = item[index];
            return (
              <View key={index} style={styles.columnItem}>
                {task ? (
                  <HomeCompactJobCard
                    task={task}
                    onPress={handleJobPress}
                    onToggleSaved={handleToggleSaved}
                    saving={Boolean(savingTaskIds[task.id])}
                  />
                ) : (
                  <View style={styles.emptyColumnPlaceholder} />
                )}
              </View>
            );
          })}
        </View>
      );
    },
    [handleJobPress, handleToggleSaved, savingTaskIds, numColumns, theme]
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

  const listHeader = useMemo(
    () => (
      <View style={[styles.headerWrapper, { backgroundColor: theme.colors.background.primary }]}>
        <HomeMarketplaceHeader
          user={user}
          selectedCategoryName={selectedSubcategoryName || selectedFieldName}
          onCategoryPress={() => setCategoryModalVisible(true)}
          onSavedPress={handleSavedPress}
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
              {loading ? '...' : `${sortedTasks.length} việc`}
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
      sortedTasks.length,
      handleCategorySelect,
      handleResetFilters,
      handleSavedPress,
      handleSubmitSearch,
      handleClearSearch,
      handleClearCategoryFilter,
      theme,
    ]
  );

  const SafeFlashList = FlashList as any;

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.colors.background.secondary }]}>
      <SafeFlashList
        style={[styles.list, { backgroundColor: theme.colors.background.secondary }]}
        data={taskRows}
        keyExtractor={(item: Task[]) => String(item[0].id)}
        renderItem={renderJobItem}
        estimatedItemSize={220}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmptyComponent}
        ListFooterComponent={<View style={[styles.listFooter, { backgroundColor: theme.colors.background.secondary }]} />}
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
    </View>
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
  },
  columnItem: {
    flex: 1,
    maxWidth: '48.5%',
  },
  emptyColumnPlaceholder: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 24,
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
});
