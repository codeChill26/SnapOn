import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FlatList,
  Alert,
  Keyboard,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { HomeMarketplaceHeader } from '../../components/home/HomeMarketplaceHeader';
import { HomePostTypeTabs, PostTypeFilter } from '../../components/home/HomeRoleTabs';
import { HomeSearchFilterBar } from '../../components/home/HomeSearchFilterBar';
import { HomeQuickFilters } from '../../components/home/HomeQuickFilters';
import { HomeCompactJobCard } from '../../components/home/HomeCompactJobCard';
import { HomeJobGridSkeleton } from '../../components/home/HomeJobGridSkeleton';
import { HomeTheme } from '../../components/home/HomeTheme';
import { HomeBannerCarousel } from '../../components/home/HomeBannerCarousel';

import { CategoryPickerModal } from '../../components/categories/CategoryPickerModal';
import { JOB_FIELDS, JobField, JobSubcategory } from '../../constants/jobCategories';
import { categoryService } from '../../services/categoryService';

import { taskService } from '../../services/taskService';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

import { Task } from '../../types';
import { RootStackParamList } from '../../navigation/AppNavigator';

type HomeNavProp = NativeStackNavigationProp<RootStackParamList>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeNavProp>();
  const latestRequestRef = useRef(0);
  const didInitialFocusRef = useRef(false);

  const { user } = useAuth();
  const { tasks, setTasks, updateTask } = useApp();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerRefreshKey, setBannerRefreshKey] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Post type filter state
  const [postTypeFilter, setPostTypeFilter] = useState<PostTypeFilter>('ALL');

  // UI state variables for the two-level category selector
  const [selectedFieldId, setSelectedFieldId] = useState<string | undefined>();
  const [selectedFieldName, setSelectedFieldName] = useState<string | undefined>();
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | undefined>();
  const [selectedSubcategoryName, setSelectedSubcategoryName] = useState<string | undefined>();
  
  // Custom local state for frontend sorting and category picker visibility
  const [activeSort, setActiveSort] = useState<'hot' | 'newest' | null>(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [categoriesList, setCategoriesList] = useState<JobField[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [savingTaskIds, setSavingTaskIds] = useState<Record<string, boolean>>({});

  // Load dynamic categories on mount
  useEffect(() => {
    let active = true;
    const fetchCategoriesList = async () => {
      const data = await categoryService.getCategories();
      if (active && data) {
        setCategoriesList(data);
      }
    };
    void fetchCategoriesList();
    return () => {
      active = false;
    };
  }, []);

  // Debouncing search query (450ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetching tasks from backend
  const fetchTasks = useCallback(
    async ({
      showLoading = true,
    }: {
      showLoading?: boolean;
    } = {}) => {
      const currentRequestId = ++latestRequestRef.current;

      try {
        if (showLoading) {
          setLoading(true);
        }

        const params: Record<string, string | number> = {
          page: 1,
          limit: 20,
        };

        if (selectedSubcategoryId) {
          params.category_id = selectedSubcategoryId;
        } else if (selectedFieldId) {
          params.field_id = selectedFieldId;
        }

        if (debouncedSearch) {
          params.search = debouncedSearch;
        }

        if (postTypeFilter !== 'ALL') {
          params.post_type = postTypeFilter;
        }

        const result = await taskService.getTasks(params);

        if (currentRequestId === latestRequestRef.current) {
          setTasks(result.data ?? []);
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('Failed to fetch tasks:', error);
        }

        if (currentRequestId === latestRequestRef.current) {
          setTasks([]);
        }
      } finally {
        if (currentRequestId === latestRequestRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [debouncedSearch, selectedFieldId, selectedSubcategoryId, postTypeFilter, setTasks],
  );

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  useFocusEffect(
    useCallback(() => {
      if (!didInitialFocusRef.current) {
        didInitialFocusRef.current = true;
        return;
      }
      void fetchTasks({ showLoading: false });
    }, [fetchTasks])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setBannerRefreshKey((current) => current + 1);
    void fetchTasks({ showLoading: false });
  }, [fetchTasks]);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedFieldId(undefined);
    setSelectedFieldName(undefined);
    setSelectedSubcategoryId(undefined);
    setSelectedSubcategoryName(undefined);
    setPostTypeFilter('ALL');
    setActiveSort(null);
    setStatusFilter('ALL');
    Keyboard.dismiss();
  }, []);

  // Handle banner selection click
  const handleCategorySelect = useCallback(
    (categoryId: string, categoryName: string) => {
      if (!categoryId) {
        handleResetFilters();
        return;
      }
      setSelectedFieldId(categoryId);
      setSelectedFieldName(categoryName);
      setSelectedSubcategoryId(undefined);
      setSelectedSubcategoryName(undefined);
    },
    [handleResetFilters],
  );

  const handleSelectField = useCallback((field: JobField) => {
    setSelectedFieldId(field.id);
    setSelectedFieldName(field.name);
    setSelectedSubcategoryId(undefined);
    setSelectedSubcategoryName(undefined);
    setCategoryModalVisible(false);
  }, []);

  const handleSelectSubcategory = useCallback((field: JobField, subcategory: JobSubcategory) => {
    setSelectedFieldId(field.id);
    setSelectedFieldName(field.name);
    setSelectedSubcategoryId(subcategory.id);
    setSelectedSubcategoryName(subcategory.name);
    setCategoryModalVisible(false);
  }, []);

  const handleClearCategoryFilter = useCallback(() => {
    setSelectedFieldId(undefined);
    setSelectedFieldName(undefined);
    setSelectedSubcategoryId(undefined);
    setSelectedSubcategoryName(undefined);
  }, []);

  const handleJobPress = useCallback(
    (task: Task) => {
      navigation.navigate('JobDetail', {
        taskId: task.id,
      });
    },
    [navigation],
  );

  const handleSavedPress = useCallback(() => {
    navigation.navigate('SavedJobs');
  }, [navigation]);

  const handleToggleSaved = useCallback(async (task: Task) => {
    if (savingTaskIds[task.id]) return;

    const nextSaved = !task.isSaved;
    setSavingTaskIds((current) => ({ ...current, [task.id]: true }));
    updateTask(task.id, { isSaved: nextSaved });

    try {
      if (nextSaved) {
        await taskService.saveTask(task.id);
      } else {
        await taskService.unsaveTask(task.id);
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('Failed to toggle saved task:', error);
      }
      updateTask(task.id, { isSaved: !nextSaved });
      Alert.alert('Không cập nhật được', 'Vui lòng thử lại sau ít phút.');
    } finally {
      setSavingTaskIds((current) => {
        const next = { ...current };
        delete next[task.id];
        return next;
      });
    }
  }, [savingTaskIds, updateTask]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearch('');
    Keyboard.dismiss();
  }, []);

  const handleSubmitSearch = useCallback(() => {
    setDebouncedSearch(searchQuery.trim());
    Keyboard.dismiss();
  }, [searchQuery]);

  const hasActiveFilter = Boolean(selectedFieldId || debouncedSearch || postTypeFilter !== 'ALL');

  // Client-side sorting logic based on activeSort selection
  const sortedTasks = useMemo(() => {
    let list = [...tasks];

    // Apply status filter for RECRUITMENT or ALL post types
    if (postTypeFilter === 'RECRUITMENT' || postTypeFilter === 'ALL') {
      if (statusFilter === 'OPEN') {
        list = list.filter(item => {
          if (item.postType === 'SERVICE_OFFER') return true;
          const isExpired = item.applicationDeadline && new Date(item.applicationDeadline).getTime() < Date.now();
          return item.status === 'OPEN' && !isExpired;
        });
      } else if (statusFilter === 'CLOSED') {
        list = list.filter(item => {
          if (item.postType === 'SERVICE_OFFER') return false;
          const isExpired = item.applicationDeadline && new Date(item.applicationDeadline).getTime() < Date.now();
          return item.status !== 'OPEN' || isExpired;
        });
      }
    }

    if (activeSort === 'newest') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (activeSort === 'hot') {
      // Sort by budgetMax descending to represent premium/high-paying jobs
      list.sort((a, b) => b.budgetMax - a.budgetMax);
    }
    return list;
  }, [tasks, activeSort, statusFilter, postTypeFilter]);

  const renderJobItem = useCallback(
    ({ item }: { item: Task }) => (
      <HomeCompactJobCard
        task={item}
        onPress={handleJobPress}
        onToggleSaved={handleToggleSaved}
        saving={Boolean(savingTaskIds[item.id])}
      />
    ),
    [handleJobPress, handleToggleSaved, savingTaskIds],
  );

  const listEmptyComponent = useMemo(() => {
    if (loading) {
      return <HomeJobGridSkeleton />;
    }

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="briefcase-outline" size={36} color={HomeTheme.colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>Chưa tìm thấy công việc phù hợp</Text>
        <Text style={styles.emptySubtitle}>
          Hãy thử từ khóa khác hoặc thay đổi bộ lọc danh mục.
        </Text>

        {hasActiveFilter && (
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleResetFilters}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Đặt lại bộ lọc"
          >
            <Ionicons name="refresh-outline" size={18} color={HomeTheme.colors.primaryDark} />
            <Text style={styles.resetButtonText}>Đặt lại bộ lọc</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [loading, hasActiveFilter, handleResetFilters]);

  const listHeader = useMemo(() => (
    <View style={styles.headerWrapper}>
      {/* 1. Header with quick dropdown selectors */}
      <HomeMarketplaceHeader
        user={user}
        selectedCategoryName={selectedSubcategoryName || selectedFieldName}
        onCategoryPress={() => setCategoryModalVisible(true)}
        onSavedPress={handleSavedPress}
      />

      {/* 2. Banner Discovery Carousel */}
      <View style={styles.bannerContainer}>
        <HomeBannerCarousel
          onSelectCategory={handleCategorySelect}
          selectedFieldId={selectedFieldId}
          refreshKey={bannerRefreshKey}
        />
      </View>

      {/* 3. Curved White Content Sheet container starts here */}
      <View style={styles.whiteSheet}>
        {/* Post Type tabs */}
        <HomePostTypeTabs
          selectedFilter={postTypeFilter}
          onSelectFilter={setPostTypeFilter}
          hasActiveFilter={hasActiveFilter}
          onResetFilters={handleResetFilters}
        />

        {/* Input search bar */}
        <HomeSearchFilterBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSubmitSearch={handleSubmitSearch}
          onClearSearch={handleClearSearch}
          selectedCategory={selectedFieldId || selectedSubcategoryId}
          onPressFilter={() => setCategoryModalVisible(true)}
        />

        {/* Hot / Newest Chips */}
        <HomeQuickFilters
          activeSort={activeSort}
          onSortChange={setActiveSort}
          selectedCategory={selectedFieldId || selectedSubcategoryId}
          onFilterPress={() => setCategoryModalVisible(true)}
        />

        {/* Status Filters (Only for recruitment or all) */}
        {(postTypeFilter === 'RECRUITMENT' || postTypeFilter === 'ALL') && (
          <View style={styles.statusFiltersContainer}>
            <TouchableOpacity
              style={[
                styles.statusFilterChip,
                statusFilter === 'ALL' && styles.statusFilterChipActive,
              ]}
              onPress={() => setStatusFilter('ALL')}
            >
              <Text style={[styles.statusFilterText, statusFilter === 'ALL' && styles.statusFilterTextActive]}>
                Tất cả
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.statusFilterChip,
                statusFilter === 'OPEN' && styles.statusFilterChipActive,
              ]}
              onPress={() => setStatusFilter('OPEN')}
            >
              <Text style={[styles.statusFilterText, statusFilter === 'OPEN' && styles.statusFilterTextActive]}>
                Đang mở
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.statusFilterChip,
                statusFilter === 'CLOSED' && styles.statusFilterChipActive,
              ]}
              onPress={() => setStatusFilter('CLOSED')}
            >
              <Text style={[styles.statusFilterText, statusFilter === 'CLOSED' && styles.statusFilterTextActive]}>
                Đã đóng
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Active filter tags */}
        {hasActiveFilter && (
          <View style={styles.activeChipsRow}>
            {selectedFieldId && (
              <View style={styles.activeChip}>
                <Ionicons name="funnel-outline" size={12} color={HomeTheme.colors.primary} />
                <Text style={styles.activeChipText} numberOfLines={1}>
                  {selectedSubcategoryName 
                    ? `${selectedFieldName} · ${selectedSubcategoryName}`
                    : selectedFieldName}
                </Text>
                <TouchableOpacity
                  onPress={handleClearCategoryFilter}
                  hitSlop={6}
                  style={styles.activeChipClose}
                >
                  <Ionicons name="close-circle" size={14} color={HomeTheme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}

            {debouncedSearch && (
              <View style={styles.activeChip}>
                <Ionicons name="search-outline" size={12} color={HomeTheme.colors.primary} />
                <Text style={styles.activeChipText} numberOfLines={1}>
                  Tìm: "{debouncedSearch}"
                </Text>
                <TouchableOpacity
                  onPress={handleClearSearch}
                  hitSlop={6}
                  style={styles.activeChipClose}
                >
                  <Ionicons name="close-circle" size={14} color={HomeTheme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}

            {selectedFieldId && debouncedSearch && (
              <TouchableOpacity
                onPress={handleResetFilters}
                style={styles.activeResetAllBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.activeResetAllText}>Đặt lại</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* List Header Title and Count */}
        <View style={styles.listTitleRow}>
          <Text style={styles.listTitle}>
            {debouncedSearch
              ? `Kết quả cho "${debouncedSearch}"`
              : selectedSubcategoryName
              ? selectedSubcategoryName
              : selectedFieldName
              ? selectedFieldName
              : 'Việc mới dành cho bạn'}
          </Text>
          <Text style={styles.listCount}>
            {loading ? '...' : `${sortedTasks.length} việc`}
          </Text>
        </View>
      </View>
    </View>
  ), [
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
  ]);

  return (
    <View style={styles.mainContainer}>
      <FlatList
        style={styles.list}
        data={sortedTasks}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderJobItem}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmptyComponent}
        ListFooterComponent={<View style={styles.listFooter} />}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={HomeTheme.colors.primary}
            colors={[HomeTheme.colors.primary]}
          />
        }
      />

      {/* Screen-wide Category picker modal */}
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
    backgroundColor: '#FFFFFF',
  },
  list: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    paddingBottom: 24,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  headerWrapper: {
    backgroundColor: '#F7F8FA',
  },
  bannerContainer: {
    backgroundColor: '#F7F8FA',
    paddingBottom: HomeTheme.spacing.md,
  },
  whiteSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: HomeTheme.radius.sheet,
    borderTopRightRadius: HomeTheme.radius.sheet,
    marginTop: -28,
    paddingTop: HomeTheme.spacing.sm,
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
    paddingHorizontal: HomeTheme.spacing.xl,
    paddingVertical: HomeTheme.spacing.xs,
    gap: HomeTheme.spacing.sm,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: HomeTheme.colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: HomeTheme.radius.small,
    borderWidth: 1,
    borderColor: HomeTheme.colors.primaryBorder,
  },
  activeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: HomeTheme.colors.primaryDark,
    marginLeft: HomeTheme.spacing.xs,
    marginRight: HomeTheme.spacing.xs,
    maxWidth: 200,
  },
  activeChipClose: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeResetAllBtn: {
    paddingVertical: HomeTheme.spacing.xs,
    paddingHorizontal: HomeTheme.spacing.sm,
  },
  activeResetAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: HomeTheme.colors.primary,
  },
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HomeTheme.spacing.xl,
    paddingTop: HomeTheme.spacing.md,
    paddingBottom: HomeTheme.spacing.sm,
    backgroundColor: '#FFFFFF',
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: HomeTheme.colors.text,
  },
  listCount: {
    fontSize: 13,
    fontWeight: '700',
    color: HomeTheme.colors.primary,
  },
  listFooter: {
    height: 40,
    backgroundColor: '#FFFFFF',
  },
  emptyContainer: {
    paddingVertical: 50,
    paddingHorizontal: HomeTheme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    width: '100%',
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: HomeTheme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: HomeTheme.spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: HomeTheme.colors.text,
    marginBottom: HomeTheme.spacing.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: HomeTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: HomeTheme.spacing.xl,
    paddingHorizontal: HomeTheme.spacing.lg,
    paddingVertical: 10,
    borderRadius: HomeTheme.radius.medium,
    backgroundColor: HomeTheme.colors.primarySoft,
    borderWidth: 1.5,
    borderColor: HomeTheme.colors.primaryBorder,
  },
  resetButtonText: {
    marginLeft: HomeTheme.spacing.xs,
    fontSize: 13,
    fontWeight: '800',
    color: HomeTheme.colors.primaryDark,
  },
  statusFiltersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: HomeTheme.spacing.xl,
    paddingVertical: HomeTheme.spacing.xs,
    backgroundColor: '#FFFFFF',
    marginTop: -4,
    marginBottom: 8,
  },
  statusFilterChip: {
    paddingHorizontal: HomeTheme.spacing.md,
    paddingVertical: 6,
    borderRadius: HomeTheme.radius.small - 2,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusFilterChipActive: {
    backgroundColor: '#FFF1EB',
    borderColor: '#FFD7B5',
  },
  statusFilterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  statusFilterTextActive: {
    color: '#FF6B35',
  },
});
