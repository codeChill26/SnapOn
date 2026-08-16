import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { taskService } from '../../../services/taskService';
import { categoryService } from '../../../services/categoryService';

import { Task } from '../../../types';
import { JobField, JobSubcategory } from '../../../constants/jobCategories';
import { PostTypeFilter } from '../../../components/home/HomeRoleTabs';

// Sub-hook 1: Manage Search query states and debounce
const useHomeSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearch('');
    Keyboard.dismiss();
  }, []);

  const handleSubmitSearch = useCallback(() => {
    setDebouncedSearch(searchQuery.trim());
    Keyboard.dismiss();
  }, [searchQuery]);

  const handleResetSearch = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearch('');
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    setDebouncedSearch,
    handleClearSearch,
    handleSubmitSearch,
    handleResetSearch,
  };
};

// Sub-hook 2: Manage Category and Sorting Filters
const useHomeFilters = (categoriesList: JobField[], handleResetSearch: () => void) => {
  const [postTypeFilter, setPostTypeFilter] = useState<PostTypeFilter>('ALL');
  const [selectedFieldId, setSelectedFieldId] = useState<string | undefined>();
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | undefined>();
  const [activeSort, setActiveSort] = useState<'hot' | 'newest' | null>(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');

  const selectedFieldName = useMemo(() => {
    if (!selectedFieldId) return undefined;
    return categoriesList.find((c) => c.id === selectedFieldId)?.name;
  }, [selectedFieldId, categoriesList]);

  const selectedSubcategoryName = useMemo(() => {
    if (!selectedSubcategoryId || !selectedFieldId) return undefined;
    const cat = categoriesList.find((c) => c.id === selectedFieldId);
    return cat?.subcategories?.find((s) => s.id === selectedSubcategoryId)?.name;
  }, [selectedFieldId, selectedSubcategoryId, categoriesList]);

  const handleResetFilters = useCallback(() => {
    handleResetSearch();
    setSelectedFieldId(undefined);
    setSelectedSubcategoryId(undefined);
    setPostTypeFilter('ALL');
    setActiveSort(null);
    setStatusFilter('ALL');
    Keyboard.dismiss();
  }, [handleResetSearch]);

  const handleCategorySelect = useCallback(
    (categoryId: string, _categoryName?: string) => {
      if (!categoryId) {
        handleResetFilters();
        return;
      }
      setSelectedFieldId(categoryId);
      setSelectedSubcategoryId(undefined);
    },
    [handleResetFilters]
  );

  const handleSelectField = useCallback((field: JobField) => {
    setSelectedFieldId(field.id);
    setSelectedSubcategoryId(undefined);
    setCategoryModalVisible(false);
  }, []);

  const handleSelectSubcategory = useCallback((field: JobField, subcategory: JobSubcategory) => {
    setSelectedFieldId(field.id);
    setSelectedSubcategoryId(subcategory.id);
    setCategoryModalVisible(false);
  }, []);

  const handleClearCategoryFilter = useCallback(() => {
    setSelectedFieldId(undefined);
    setSelectedSubcategoryId(undefined);
  }, []);

  return {
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
    statusFilter,
    setStatusFilter,
    handleResetFilters,
    handleCategorySelect,
    handleSelectField,
    handleSelectSubcategory,
    handleClearCategoryFilter,
  };
};

export const useHomeTasks = () => {
  const latestRequestRef = useRef(0);
  const didInitialFocusRef = useRef(false);
  const lastFetchTimeRef = useRef(0);

  const [tasks, setTasks] = useState<Task[]>([]);
  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  useEffect(() => {
    const subCreated = DeviceEventEmitter.addListener('task_created', (newTask) => {
      setTasks(prev => [newTask, ...prev]);
    });
    const subUpdated = DeviceEventEmitter.addListener('task_updated', (updatedTask) => {
      setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    });
    const subSaved = DeviceEventEmitter.addListener('task_saved_changed', ({ taskId, isSaved }) => {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isSaved } : t));
    });
    return () => {
      subCreated.remove();
      subUpdated.remove();
      subSaved.remove();
    };
  }, []);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerRefreshKey, setBannerRefreshKey] = useState(0);
  const [categoriesList, setCategoriesList] = useState<JobField[]>([]);
  const [savingTaskIds, setSavingTaskIds] = useState<Record<string, boolean>>({});

  // Pagination states (10 items per page)
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);

  // Use search and filters sub-hooks
  const search = useHomeSearch();
  const filters = useHomeFilters(categoriesList, search.handleResetSearch);

  // Load dynamic categories on mount with SWR
  useEffect(() => {
    let active = true;
    const fetchCategoriesList = async () => {
      // Exclusively set state via onUpdate callback to prevent double renders
      await categoryService.getCategories((updatedCats) => {
        if (active && updatedCats) {
          setCategoriesList(updatedCats);
        }
      });
    };
    void fetchCategoriesList();
    return () => {
      active = false;
    };
  }, []);

  // Load cached tasks on mount for instant load
  useEffect(() => {
    const loadCachedTasks = async () => {
      try {
        const cached = await AsyncStorage.getItem('@snapon/cache_tasks');
        if (cached) {
          const parsedTasks = JSON.parse(cached);
          if (Array.isArray(parsedTasks) && parsedTasks.length > 0) {
            setTasks(parsedTasks);
            setLoading(false);
          }
        }
      } catch (e) {
        console.warn('Failed to load cached tasks:', e);
      }
    };
    void loadCachedTasks();
  }, [setTasks]);

  // Reset to page 1 whenever filters change
  const isFirstRenderRef = useRef(true);
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    setPage(1);
  }, [
    search.debouncedSearch,
    filters.selectedFieldId,
    filters.selectedSubcategoryId,
    filters.postTypeFilter,
    filters.statusFilter,
    filters.activeSort,
  ]);

  // Fetching tasks from backend with page and limit=10
  const fetchTasks = useCallback(
    async ({ showLoading = true, targetPage }: { showLoading?: boolean; targetPage?: number } = {}) => {
      const currentRequestId = ++latestRequestRef.current;
      const pageToFetch = targetPage !== undefined ? targetPage : page;

      try {
        if (showLoading) {
          setLoading(true);
        }

        const params: Record<string, string | number> = {
          page: pageToFetch,
          limit: 10,
        };

        if (filters.selectedSubcategoryId) {
          params.category_id = filters.selectedSubcategoryId;
        } else if (filters.selectedFieldId) {
          params.field_id = filters.selectedFieldId;
        }

        if (search.debouncedSearch) {
          params.search = search.debouncedSearch;
        }

        if (filters.postTypeFilter !== 'ALL') {
          params.post_type = filters.postTypeFilter;
        }

        const result = await taskService.getTasks(params);

        if (currentRequestId === latestRequestRef.current) {
          const newTasks = result.data ?? [];
          setTasks(newTasks);
          setPage(pageToFetch);
          setTotalPages(result.pagination?.totalPages || 1);
          setTotalTasks(result.pagination?.total || newTasks.length);
          lastFetchTimeRef.current = Date.now();
          if (pageToFetch === 1) {
            AsyncStorage.setItem('@snapon/cache_tasks', JSON.stringify(newTasks)).catch(() => {});
          }
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
    [page, search.debouncedSearch, filters.selectedFieldId, filters.selectedSubcategoryId, filters.postTypeFilter, setTasks]
  );

  useEffect(() => {
    void fetchTasks();
  }, [search.debouncedSearch, filters.selectedFieldId, filters.selectedSubcategoryId, filters.postTypeFilter]);

  useFocusEffect(
    useCallback(() => {
      if (!didInitialFocusRef.current) {
        didInitialFocusRef.current = true;
        return;
      }
      const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current;
      if (timeSinceLastFetch > 30000) {
        void fetchTasks({ showLoading: false });
      }
    }, [fetchTasks])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setBannerRefreshKey((current) => current + 1);
    void fetchTasks({ showLoading: false, targetPage: 1 });
  }, [fetchTasks]);

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage < 1 || newPage > totalPages || newPage === page) return;
      void fetchTasks({ showLoading: true, targetPage: newPage });
    },
    [page, totalPages, fetchTasks]
  );

  const handleToggleSaved = useCallback(
    async (task: Task) => {
      if (savingTaskIds[task.id]) return;

      const nextSaved = !task.isSaved;
      setSavingTaskIds((current) => ({ ...current, [task.id]: true }));
      updateTask(task.id, { isSaved: nextSaved });
      DeviceEventEmitter.emit('task_saved_changed', { taskId: task.id, isSaved: nextSaved });

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
        DeviceEventEmitter.emit('task_saved_changed', { taskId: task.id, isSaved: !nextSaved });
        Alert.alert('Không cập nhật được', 'Vui lòng thử lại sau ít phút.');
      } finally {
        setSavingTaskIds((current) => {
          const next = { ...current };
          delete next[task.id];
          return next;
        });
      }
    },
    [savingTaskIds, updateTask]
  );

  const hasActiveFilter = Boolean(filters.selectedFieldId || search.debouncedSearch || filters.postTypeFilter !== 'ALL');

  const sortedTasks = useMemo(() => {
    let list = [...tasks];

    if (filters.postTypeFilter === 'RECRUITMENT' || filters.postTypeFilter === 'ALL') {
      if (filters.statusFilter === 'OPEN') {
        list = list.filter((item) => {
          if (item.postType === 'SERVICE_OFFER') return true;
          const isExpired =
            item.applicationDeadline && new Date(item.applicationDeadline).getTime() < Date.now();
          return item.status === 'OPEN' && !isExpired;
        });
      } else if (filters.statusFilter === 'CLOSED') {
        list = list.filter((item) => {
          if (item.postType === 'SERVICE_OFFER') return false;
          const isExpired =
            item.applicationDeadline && new Date(item.applicationDeadline).getTime() < Date.now();
          return item.status !== 'OPEN' || isExpired;
        });
      }
    }

    if (filters.activeSort === 'newest') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (filters.activeSort === 'hot') {
      list.sort((a, b) => b.budgetMax - a.budgetMax);
    }
    return list;
  }, [tasks, filters.activeSort, filters.statusFilter, filters.postTypeFilter]);

  return {
    state: {
      loading,
      refreshing,
      bannerRefreshKey,
      searchQuery: search.searchQuery,
      debouncedSearch: search.debouncedSearch,
      postTypeFilter: filters.postTypeFilter,
      selectedFieldId: filters.selectedFieldId,
      selectedFieldName: filters.selectedFieldName,
      selectedSubcategoryId: filters.selectedSubcategoryId,
      selectedSubcategoryName: filters.selectedSubcategoryName,
      activeSort: filters.activeSort,
      categoryModalVisible: filters.categoryModalVisible,
      categoriesList,
      statusFilter: filters.statusFilter,
      savingTaskIds,
      hasActiveFilter,
      sortedTasks,
      page,
      totalPages,
      totalTasks,
    },
    actions: {
      setSearchQuery: search.setSearchQuery,
      setPostTypeFilter: filters.setPostTypeFilter,
      setActiveSort: filters.setActiveSort,
      setCategoryModalVisible: filters.setCategoryModalVisible,
      setStatusFilter: filters.setStatusFilter,
      onRefresh,
      handleResetFilters: filters.handleResetFilters,
      handleCategorySelect: filters.handleCategorySelect,
      handleSelectField: filters.handleSelectField,
      handleSelectSubcategory: filters.handleSelectSubcategory,
      handleClearCategoryFilter: filters.handleClearCategoryFilter,
      handleToggleSaved,
      handleClearSearch: search.handleClearSearch,
      handleSubmitSearch: search.handleSubmitSearch,
      handlePageChange,
    },
  };
};
