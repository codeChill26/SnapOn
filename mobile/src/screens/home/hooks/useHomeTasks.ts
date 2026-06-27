import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { taskService } from '../../../services/taskService';
import { categoryService } from '../../../services/categoryService';
import { useApp } from '../../../context/AppContext';
import { Task } from '../../../types';
import { JobField, JobSubcategory } from '../../../constants/jobCategories';
import { PostTypeFilter } from '../../../components/home/HomeRoleTabs';

export const useHomeTasks = () => {
  const latestRequestRef = useRef(0);
  const didInitialFocusRef = useRef(false);
  const lastFetchTimeRef = useRef(0);

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

  // Custom local state for sorting and category picker
  const [activeSort, setActiveSort] = useState<'hot' | 'newest' | null>(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [categoriesList, setCategoriesList] = useState<JobField[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [savingTaskIds, setSavingTaskIds] = useState<Record<string, boolean>>({});

  // Load dynamic categories on mount with SWR
  useEffect(() => {
    let active = true;
    const fetchCategoriesList = async () => {
      const data = await categoryService.getCategories((updatedCats) => {
        if (active && updatedCats) {
          setCategoriesList(updatedCats);
        }
      });
      if (active && data) {
        setCategoriesList(data);
      }
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

  // Debouncing search query (450ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetching tasks from backend
  const fetchTasks = useCallback(
    async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
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
          const newTasks = result.data ?? [];
          setTasks(newTasks);
          lastFetchTimeRef.current = Date.now();
          AsyncStorage.setItem('@snapon/cache_tasks', JSON.stringify(newTasks)).catch(() => {});
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
    [debouncedSearch, selectedFieldId, selectedSubcategoryId, postTypeFilter, setTasks]
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
      const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current;
      if (timeSinceLastFetch > 30000) {
        void fetchTasks({ showLoading: false });
      }
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
    [handleResetFilters]
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

  const handleToggleSaved = useCallback(
    async (task: Task) => {
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
    },
    [savingTaskIds, updateTask]
  );

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

  const sortedTasks = useMemo(() => {
    let list = [...tasks];

    if (postTypeFilter === 'RECRUITMENT' || postTypeFilter === 'ALL') {
      if (statusFilter === 'OPEN') {
        list = list.filter((item) => {
          if (item.postType === 'SERVICE_OFFER') return true;
          const isExpired =
            item.applicationDeadline && new Date(item.applicationDeadline).getTime() < Date.now();
          return item.status === 'OPEN' && !isExpired;
        });
      } else if (statusFilter === 'CLOSED') {
        list = list.filter((item) => {
          if (item.postType === 'SERVICE_OFFER') return false;
          const isExpired =
            item.applicationDeadline && new Date(item.applicationDeadline).getTime() < Date.now();
          return item.status !== 'OPEN' || isExpired;
        });
      }
    }

    if (activeSort === 'newest') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (activeSort === 'hot') {
      list.sort((a, b) => b.budgetMax - a.budgetMax);
    }
    return list;
  }, [tasks, activeSort, statusFilter, postTypeFilter]);

  return {
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
  };
};
