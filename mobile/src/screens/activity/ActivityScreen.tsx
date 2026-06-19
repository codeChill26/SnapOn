import React, {
  useCallback,
  useMemo,
  useState,
  useEffect,
  useRef,
} from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { HomeTheme } from '../../components/home/HomeTheme';
import { EmptyState } from '../../components/common/EmptyState';
import { activityService } from '../../services/activityService';
import { ActivityItem, ActivitySummary } from '../../types/activity';
import { PostedActivityCard } from '../../components/activity/PostedActivityCard';
import { ParticipatingActivityCard } from '../../components/activity/ParticipatingActivityCard';
import { ActivityListSkeleton } from '../../components/activity/ActivityListSkeleton';

type TabView = 'POSTED' | 'PARTICIPATING';

const POSTED_FILTERS = [
  { key: 'all', label: 'Tất cả', icon: 'apps-outline', color: HomeTheme.colors.primary },
  { key: 'OPEN', label: 'Đang mở', icon: 'radio-button-on-outline', color: '#0369A1' },
  { key: 'IN_PROGRESS', label: 'Đang làm', icon: 'flash-outline', color: '#D97706' },
  { key: 'COMPLETED', label: 'Hoàn thành', icon: 'checkmark-circle-outline', color: '#059669' },
  { key: 'CANCELLED', label: 'Đã hủy', icon: 'close-circle-outline', color: '#667085' },
];

const PARTICIPATING_FILTERS = [
  { key: 'all', label: 'Tất cả', icon: 'apps-outline', color: HomeTheme.colors.primary },
  { key: 'PENDING', label: 'Chờ phản hồi', icon: 'time-outline', color: '#D97706' },
  { key: 'ACCEPTED', label: 'Đã nhận', icon: 'checkmark-outline', color: '#0369A1' },
  { key: 'IN_PROGRESS', label: 'Đang làm', icon: 'flash-outline', color: '#0284C7' },
  { key: 'COMPLETED', label: 'Hoàn thành', icon: 'checkmark-circle-outline', color: '#059669' },
  { key: 'ENDED', label: 'Kết thúc', icon: 'close-circle-outline', color: '#667085' },
];

export const ActivityScreen: React.FC = () => {
  const navigation = useNavigation<any>();
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
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
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
        if (isMounted) {
          setActivities(res.data);
          setPage(1);
          setTotalPages(res.pagination.totalPages);
          setSummary(summaryData);
        }
      } catch (err) {
        console.warn('Error loading activities:', err);
        if (isMounted) {
          setErrorMessage('Không thể tải dữ liệu hoạt động. Vui lòng kiểm tra lại kết nối.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [activeTab, statusFilter, searchQuery]);

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
      refetchQuietly();
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
      setActivities(prev => [...prev, ...res.data]);
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
      const total = summary.participating.accepted + summary.participating.inProgress + summary.participating.completed;
      return total > 0 ? Math.round((summary.participating.completed / total) * 100) : 0;
    }
  }, [summary, activeTab]);

  const firstName = user?.fullName?.trim().split(/\s+/).pop() || 'bạn';

  // Smart Focus Card
  const focusItem = useMemo(() => {
    if (activities.length === 0) return null;
    if (activeTab === 'POSTED') {
      const inProgress = activities.find(a => a.post.status === 'IN_PROGRESS');
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
      const open = activities.find(a => a.post.status === 'OPEN');
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
      const inProgress = activities.find(a => a.participation?.status === 'ACCEPTED' && a.post.status === 'IN_PROGRESS');
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
      const pending = activities.find(a => a.participation?.status === 'PENDING');
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
    <View style={styles.header}>
      <View style={styles.headerInner}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>THEO DÕI TIẾN ĐỘ</Text>
          <Text style={styles.headerTitle}>Hoạt động</Text>
        </View>
        <View style={styles.headerBadge}>
          <Ionicons name="pulse-outline" size={20} color={HomeTheme.colors.primary} />
        </View>
      </View>

      {/* Main Navigation Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'POSTED' && styles.tabItemActive]}
          onPress={() => handleTabChange('POSTED')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabLabel, activeTab === 'POSTED' && styles.tabLabelActive]}>
            Bài đã đăng
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'PARTICIPATING' && styles.tabItemActive]}
          onPress={() => handleTabChange('PARTICIPATING')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabLabel, activeTab === 'PARTICIPATING' && styles.tabLabelActive]}>
            Việc đang tham gia
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={18} color="#667085" />
        <TextInput
          value={searchInput}
          onChangeText={setSearchInput}
          style={styles.searchInput}
          placeholder="Tìm theo tên bài đăng, mô tả..."
          placeholderTextColor="#98A2B3"
          returnKeyType="search"
          autoCorrect={false}
        />
        {searchInput.length > 0 && (
          <TouchableOpacity onPress={() => setSearchInput('')} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color="#98A2B3" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderDashboard = () => {
    if (!summary) return null;

    return (
      <View style={styles.dashboardSection}>
        <View style={styles.sectionTitleRow}>
          <View>
            <Text style={styles.sectionEyebrow}>TỔNG QUAN TIẾN ĐỘ</Text>
            <Text style={styles.sectionTitle}>Hoạt động của {firstName}</Text>
          </View>
          <View style={styles.progressBadge}>
            <Text style={styles.progressBadgeValue}>{completionRate}%</Text>
            <Text style={styles.progressBadgeLabel}>hoàn tất</Text>
          </View>
        </View>

        {/* Progress Track */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressActive, { width: `${completionRate}%` }]} />
        </View>

        {/* Aggregate Stats Cards Grid */}
        {activeTab === 'POSTED' ? (
          <View style={styles.statGrid}>
            <TouchableOpacity
              style={[styles.statCard, statusFilter === 'OPEN' && styles.statCardActive]}
              onPress={() => handleStatCardPress('OPEN')}
            >
              <View style={[styles.statIcon, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="radio-button-on-outline" size={14} color="#0369A1" />
              </View>
              <Text style={styles.statValue}>{summary.posted.open}</Text>
              <Text style={styles.statLabel}>Đang mở</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, statusFilter === 'IN_PROGRESS' && styles.statCardActive]}
              onPress={() => handleStatCardPress('IN_PROGRESS')}
            >
              <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="flash-outline" size={14} color="#D97706" />
              </View>
              <Text style={styles.statValue}>{summary.posted.inProgress}</Text>
              <Text style={styles.statLabel}>Đang làm</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, statusFilter === 'COMPLETED' && styles.statCardActive]}
              onPress={() => handleStatCardPress('COMPLETED')}
            >
              <View style={[styles.statIcon, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="checkmark-circle-outline" size={14} color="#059669" />
              </View>
              <Text style={styles.statValue}>{summary.posted.completed}</Text>
              <Text style={styles.statLabel}>Hoàn tất</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, statusFilter === 'CANCELLED' && styles.statCardActive]}
              onPress={() => handleStatCardPress('CANCELLED')}
            >
              <View style={[styles.statIcon, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="close-circle-outline" size={14} color="#DC2626" />
              </View>
              <Text style={styles.statValue}>{summary.posted.cancelled}</Text>
              <Text style={styles.statLabel}>Đã hủy</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.statGrid}>
            <TouchableOpacity
              style={[styles.statCard, statusFilter === 'PENDING' && styles.statCardActive]}
              onPress={() => handleStatCardPress('PENDING')}
            >
              <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="time-outline" size={14} color="#D97706" />
              </View>
              <Text style={styles.statValue}>{summary.participating.pending}</Text>
              <Text style={styles.statLabel}>Chờ duyệt</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, statusFilter === 'ACCEPTED' && styles.statCardActive]}
              onPress={() => handleStatCardPress('ACCEPTED')}
            >
              <View style={[styles.statIcon, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="checkmark-outline" size={14} color="#0369A1" />
              </View>
              <Text style={styles.statValue}>{summary.participating.accepted}</Text>
              <Text style={styles.statLabel}>Đã nhận</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, statusFilter === 'IN_PROGRESS' && styles.statCardActive]}
              onPress={() => handleStatCardPress('IN_PROGRESS')}
            >
              <View style={[styles.statIcon, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="flash-outline" size={14} color="#0284C7" />
              </View>
              <Text style={styles.statValue}>{summary.participating.inProgress}</Text>
              <Text style={styles.statLabel}>Đang làm</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, statusFilter === 'COMPLETED' && styles.statCardActive]}
              onPress={() => handleStatCardPress('COMPLETED')}
            >
              <View style={[styles.statIcon, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="checkmark-circle-outline" size={14} color="#059669" />
              </View>
              <Text style={styles.statValue}>{summary.participating.completed}</Text>
              <Text style={styles.statLabel}>Hoàn tất</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderFocusCard = () => {
    if (!focusItem) return null;

    return (
      <TouchableOpacity
        style={styles.focusCard}
        onPress={() => navigation.navigate('JobDetail', { taskId: focusItem.taskId })}
        activeOpacity={0.8}
      >
        <View style={styles.focusIcon}>
          <Ionicons name={focusItem.icon as any} size={18} color={focusItem.color} />
        </View>
        <View style={styles.focusContent}>
          <Text style={styles.focusEyebrow}>{focusItem.label}</Text>
          <Text style={styles.focusTitle} numberOfLines={1}>{focusItem.title}</Text>
          <Text style={styles.focusDescription} numberOfLines={1}>{focusItem.msg}</Text>
        </View>
        <Ionicons name="arrow-forward" size={16} color="#98A2B3" style={styles.focusArrow} />
      </TouchableOpacity>
    );
  };

  const renderFilterChips = () => (
    <View style={styles.filterContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContent}
        keyboardShouldPersistTaps="handled"
      >
        {activeFilters.map(filter => {
          const isActive = statusFilter === filter.key;
          const count = getFilterCount(filter.key);
          return (
            <TouchableOpacity
              key={filter.key}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => handleStatCardPress(filter.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={filter.icon as any}
                size={12}
                color={isActive ? HomeTheme.colors.primary : '#667085'}
              />
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                {filter.label}
              </Text>
              <View style={[styles.filterCount, isActive && styles.filterCountActive]}>
                <Text style={[styles.filterCountText, isActive && styles.filterCountTextActive]}>
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
      return (
        <PostedActivityCard
          task={item.post}
          applicantCount={item.stats?.applicantCount || 0}
        />
      );
    } else {
      return (
        <ParticipatingActivityCard
          task={item.post}
          participation={item.participation!}
        />
      );
    }
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={HomeTheme.colors.primary} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;

    if (errorMessage) {
      return (
        <View style={styles.errorCard}>
          <Ionicons name="cloud-offline-outline" size={36} color={HomeTheme.colors.primary} />
          <Text style={styles.errorTitle}>Lỗi tải dữ liệu</Text>
          <Text style={styles.errorDescription}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Ionicons name="refresh-outline" size={14} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const isFiltered = searchQuery || statusFilter !== 'all';
    return (
      <View style={styles.emptyContainer}>
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
          <TouchableOpacity style={styles.resetButton} onPress={handleResetFilters}>
            <Text style={styles.resetButtonText}>Đặt lại bộ lọc</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FA" />

      {/* RENDER HEADER */}
      {renderHeader()}

      {/* RENDER FILTER CHIPS */}
      {renderFilterChips()}

      {/* MAIN LIST VIEW */}
      {loading && activities.length === 0 ? (
        <ActivityListSkeleton />
      ) : (
        <FlatList
          data={activities}
          keyExtractor={item => `${item.id}-${item.activityType}`}
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
              tintColor={HomeTheme.colors.primary}
              colors={[HomeTheme.colors.primary]}
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
    backgroundColor: '#F7F8FA',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EAECF0',
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
    color: HomeTheme.colors.primary,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#16181D',
  },
  headerBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7F0',
    borderWidth: 1,
    borderColor: '#FFEFE5',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginTop: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F4F7',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: HomeTheme.colors.primary,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#667085',
  },
  tabLabelActive: {
    color: HomeTheme.colors.primary,
    fontWeight: '800',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    backgroundColor: '#F2F4F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#16181D',
    height: '100%',
    padding: 0,
  },
  clearBtn: {
    padding: 2,
  },
  filterContainer: {
    paddingVertical: 8,
    backgroundColor: '#F7F8FA',
    borderBottomWidth: 1,
    borderBottomColor: '#EAECF0',
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    paddingLeft: 10,
    paddingRight: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#EAECF0',
    backgroundColor: '#FFFFFF',
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: '#FFF7F0',
    borderColor: HomeTheme.colors.primary,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#667085',
  },
  filterTextActive: {
    color: HomeTheme.colors.primaryDark,
    fontWeight: '700',
  },
  filterCount: {
    height: 18,
    minWidth: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#F2F4F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountActive: {
    backgroundColor: '#FFEFE5',
  },
  filterCountText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#667085',
  },
  filterCountTextActive: {
    color: HomeTheme.colors.primaryDark,
    fontWeight: '800',
  },
  dashboardSection: {
    padding: 16,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 12,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAECF0',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  sectionEyebrow: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: HomeTheme.colors.primary,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#16181D',
    maxWidth: '75%',
  },
  progressBadge: {
    alignItems: 'flex-end',
  },
  progressBadgeValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
  },
  progressBadgeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#667085',
    marginTop: -2,
  },
  progressTrack: {
    height: 5,
    backgroundColor: '#F2F4F7',
    borderRadius: 2.5,
    marginTop: 12,
    marginBottom: 14,
    overflow: 'hidden',
  },
  progressActive: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2.5,
  },
  statGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAECF0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  statCardActive: {
    borderColor: HomeTheme.colors.primary,
    backgroundColor: '#FFF7F0',
  },
  statIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#16181D',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#667085',
    textAlign: 'center',
    marginTop: 2,
  },
  focusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: '#FFF7F0',
    borderWidth: 1,
    borderColor: '#FFD7B5',
  },
  focusIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFEFE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  focusContent: {
    flex: 1,
  },
  focusEyebrow: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: HomeTheme.colors.primary,
    marginBottom: 2,
  },
  focusTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#16181D',
  },
  focusDescription: {
    fontSize: 11,
    color: '#667085',
    marginTop: 2,
  },
  focusArrow: {
    marginLeft: 6,
  },
  listContent: {
    paddingBottom: 24,
  },
  footerLoader: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButton: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFEFE5',
    borderWidth: 1,
    borderColor: '#FFD7B5',
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: HomeTheme.colors.primaryDark,
  },
  errorCard: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EAECF0',
    margin: 16,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#16181D',
    marginTop: 8,
  },
  errorDescription: {
    fontSize: 12,
    color: '#667085',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: HomeTheme.colors.primary,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export default ActivityScreen;
