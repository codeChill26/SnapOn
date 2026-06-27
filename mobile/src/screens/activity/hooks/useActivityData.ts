import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../context/AuthContext';
import { activityService } from '../../../services/activityService';
import { ActivityItem, ActivitySummary } from '../../../types/activity';

export type TabView = 'POSTED' | 'PARTICIPATING';

export const useActivityData = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabView>('POSTED');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination states
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Load activities on changes
  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const params = {
        view: activeTab,
        status: statusFilter,
        search: searchQuery || undefined,
        page: 1,
        limit: 10,
      };
      const [res, summaryData] = await Promise.all([
        activityService.getActivities(params),
        activityService.getActivitySummary(),
      ]);
      setActivities(res.data);
      setPage(1);
      setTotalPages(res.pagination.totalPages);
      setSummary(summaryData);
    } catch (err) {
      console.warn('Error loading activities:', err);
      setErrorMessage('Không thể tải dữ liệu hoạt động. Vui lòng kiểm tra lại kết nối.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusFilter, searchQuery]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Reload lists when focus screen (so updates from detail pages apply)
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const refetchQuietly = async () => {
        try {
          const params = {
            view: activeTab,
            status: statusFilter,
            search: searchQuery || undefined,
            page: 1,
            limit: 10,
          };
          const [res, summaryData] = await Promise.all([
            activityService.getActivities(params),
            activityService.getActivitySummary(),
          ]);
          if (isMounted) {
            setActivities(res.data);
            setPage(1);
            setTotalPages(res.pagination.totalPages);
            setSummary(summaryData);
          }
        } catch (err) {
          console.warn('Quiet refetch error:', err);
        }
      };
      void refetchQuietly();
      return () => {
        isMounted = false;
      };
    }, [activeTab, statusFilter, searchQuery])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    setErrorMessage(null);
    try {
      const params = {
        view: activeTab,
        status: statusFilter,
        search: searchQuery || undefined,
        page: 1,
        limit: 10,
      };
      const [res, summaryData] = await Promise.all([
        activityService.getActivities(params),
        activityService.getActivitySummary(),
      ]);
      setActivities(res.data);
      setPage(1);
      setTotalPages(res.pagination.totalPages);
      setSummary(summaryData);
    } catch (err) {
      console.warn('Error refreshing activities:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const params = {
        view: activeTab,
        status: statusFilter,
        search: searchQuery || undefined,
        page: nextPage,
        limit: 10,
      };
      const res = await activityService.getActivities(params);
      setActivities((prev) => [...prev, ...res.data]);
      setPage(nextPage);
      setTotalPages(res.pagination.totalPages);
    } catch (err) {
      console.warn('Error loading more activities:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleTabChange = (tab: TabView) => {
    setActiveTab(tab);
    setStatusFilter('all');
    setSearchInput('');
    setSearchQuery('');
  };

  const handleStatCardPress = (key: string) => {
    if (statusFilter === key) {
      setStatusFilter('all');
    } else {
      setStatusFilter(key);
    }
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setStatusFilter('all');
  };

  // Compute stats
  const completionRate = useMemo(() => {
    if (!summary) return 0;
    if (activeTab === 'POSTED') {
      const total = summary.posted.open + summary.posted.inProgress + summary.posted.completed;
      return total > 0 ? Math.round((summary.posted.completed / total) * 100) : 0;
    } else {
      const total =
        summary.participating.accepted +
        summary.participating.inProgress +
        summary.participating.completed;
      return total > 0 ? Math.round((summary.participating.completed / total) * 100) : 0;
    }
  }, [summary, activeTab]);

  const firstName = user?.fullName?.trim().split(/\s+/).pop() || 'bạn';

  // Smart Focus Card
  const focusItem = useMemo(() => {
    if (activities.length === 0) return null;
    if (activeTab === 'POSTED') {
      const inProgress = activities.find((a) => a.post.status === 'IN_PROGRESS');
      if (inProgress) {
        return {
          title: inProgress.post.title,
          label: 'VIỆC ĐANG THỰC HIỆN',
          msg: 'Tiếp tục theo dõi và kiểm tra tiến độ dự án.',
          taskId: inProgress.post.id,
          icon: 'rocket-outline',
          color: '#D97706',
        };
      }
      const open = activities.find((a) => a.post.status === 'OPEN');
      if (open) {
        return {
          title: open.post.title,
          label: 'VIỆC ĐANG TUYỂN DỤNG',
          msg: `Có ${open.stats?.applicantCount || 0} hồ sơ ứng cử viên mới gửi đến.`,
          taskId: open.post.id,
          icon: 'people-outline',
          color: '#0369A1',
        };
      }
    } else {
      const inProgress = activities.find(
        (a) => a.participation?.status === 'ACCEPTED' && a.post.status === 'IN_PROGRESS'
      );
      if (inProgress) {
        return {
          title: inProgress.post.title,
          label: 'VIỆC ĐANG LÀM',
          msg: 'Xem chi tiết công việc hoặc liên hệ chủ dự án.',
          taskId: inProgress.post.id,
          icon: 'flash-outline',
          color: '#0284C7',
        };
      }
      const pending = activities.find((a) => a.participation?.status === 'PENDING');
      if (pending) {
        return {
          title: pending.post.title,
          label: 'ĐÃ GỬI ỨNG TUYỂN',
          msg: 'Đang đợi chủ dự án xem xét và phản hồi.',
          taskId: pending.post.id,
          icon: 'time-outline',
          color: '#D97706',
        };
      }
    }
    return null;
  }, [activities, activeTab]);

  return {
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
  };
};
