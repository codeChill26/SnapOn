import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  FlatList,
  Keyboard,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Tabs } from '../../components/ui/Tabs';
import { JobCard } from '../../components/common/JobCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';

import { taskService } from '../../services/taskService';
import { useAuth } from '../../context/AuthContext';

import { Task, TaskStatus } from '../../types';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { AppColors } from '../../theme';

type ActivityNavProp = NativeStackNavigationProp<RootStackParamList>;
type ActivityTab = 'mine' | 'community';
type SortMode = 'priority' | 'newest';
type IconName = keyof typeof Ionicons.glyphMap;

type ActivityTask = Task & {
  title?: string;
  description?: string;
  location?: string;
  createdAt?: string;
  updatedAt?: string;
  deadline?: string;
  deadlineEnd?: string;
  categoryName?: string;
  category?: {
    name?: string;
  };
};

const ACTIVITY_TABS = [
  { key: 'mine', label: 'Của tôi' },
  { key: 'community', label: 'Cộng đồng' },
];

interface StatusFilter {
  key: string;
  label: string;
  status?: TaskStatus;
  icon: IconName;
  activeColor: string;
}

const STATUS_FILTERS: StatusFilter[] = [
  {
    key: 'all',
    label: 'Tất cả',
    icon: 'apps-outline',
    activeColor: AppColors.brand.primary,
  },
  {
    key: 'OPEN',
    label: 'Đang mở',
    status: 'OPEN',
    icon: 'radio-button-on-outline',
    activeColor: AppColors.status.info,
  },
  {
    key: 'IN_PROGRESS',
    label: 'Đang làm',
    status: 'IN_PROGRESS',
    icon: 'flash-outline',
    activeColor: AppColors.status.warning,
  },
  {
    key: 'COMPLETED',
    label: 'Hoàn thành',
    status: 'COMPLETED',
    icon: 'checkmark-circle-outline',
    activeColor: AppColors.status.success,
  },
  {
    key: 'CANCELLED',
    label: 'Đã hủy',
    status: 'CANCELLED',
    icon: 'close-circle-outline',
    activeColor: AppColors.status.error,
  },
];

const STATUS_PRIORITY: Partial<Record<TaskStatus, number>> = {
  IN_PROGRESS: 0,
  OPEN: 1,
  COMPLETED: 2,
  CANCELLED: 3,
};

const getTaskDateValue = (task: ActivityTask): number => {
  const rawDate =
    task.updatedAt ??
    task.createdAt ??
    task.deadlineEnd ??
    task.deadline;

  if (!rawDate) return 0;

  const timestamp = new Date(rawDate).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const getTaskTitle = (task: ActivityTask): string =>
  task.title?.trim() || 'Công việc chưa đặt tên';

const getTaskSearchText = (task: ActivityTask): string =>
  [
    task.title,
    task.description,
    task.location,
    task.categoryName,
    task.category?.name,
    task.status,
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('vi');

const getFocusMessage = (status: TaskStatus): string => {
  switch (status) {
    case 'IN_PROGRESS':
      return 'Tiếp tục công việc đang thực hiện để giữ nhịp tiến độ.';
    case 'OPEN':
      return 'Một cơ hội đang mở và có thể phù hợp với bạn.';
    case 'COMPLETED':
      return 'Xem lại công việc vừa hoàn thành và kết quả đã đạt được.';
    case 'CANCELLED':
      return 'Xem lại thông tin công việc đã hủy.';
    default:
      return 'Mở công việc để xem chi tiết và hành động tiếp theo.';
  }
};

const getStatusColor = (status: TaskStatus): string => {
  switch (status) {
    case 'OPEN':
      return AppColors.status.info;
    case 'IN_PROGRESS':
      return AppColors.status.warning;
    case 'COMPLETED':
      return AppColors.status.success;
    case 'CANCELLED':
      return AppColors.status.error;
    default:
      return AppColors.brand.primary;
  }
};

interface StatCardProps {
  icon: IconName;
  label: string;
  value: number;
  color: string;
  active?: boolean;
  onPress: () => void;
}

const StatCard = React.memo<StatCardProps>(
  ({ icon, label, value, color, active = false, onPress }) => (
    <TouchableOpacity
      style={[
        styles.statCard,
        active && {
          borderColor: color,
          backgroundColor: `${color}16`,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label}: ${value}`}
    >
      <View style={[styles.statIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>

      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  ),
);

export const ActivityScreen: React.FC = () => {
  const navigation = useNavigation<ActivityNavProp>();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<ActivityTab>('mine');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortMode, setSortMode] = useState<SortMode>('priority');
  const [searchQuery, setSearchQuery] = useState('');

  const [tasks, setTasks] = useState<ActivityTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const requestIdRef = useRef(0);
  const loadedTabsRef = useRef<Record<ActivityTab, boolean>>({
    mine: false,
    community: false,
  });
  const contentAnimation = useRef(new Animated.Value(1)).current;

  const fetchTasks = useCallback(
    async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
      const requestId = ++requestIdRef.current;

      try {
        if (showLoading) {
          setLoading(true);
        }

        setErrorMessage(null);

        const result =
          activeTab === 'mine'
            ? await taskService.getMyTasks()
            : await taskService.getTasks({
                page: 1,
                limit: 50,
              });

        if (requestId !== requestIdRef.current) return;

        setTasks((result.data ?? []) as ActivityTask[]);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Failed to fetch activity tasks:', error);

        if (requestId !== requestIdRef.current) return;

        setErrorMessage(
          'Không thể tải hoạt động. Vui lòng kiểm tra kết nối và thử lại.',
        );

        if (showLoading) {
          setTasks([]);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [activeTab],
  );

  /*
   * Tự tải lại khi:
   * - lần đầu mở từng tab;
   * - quay lại màn hình sau khi đã xem/chỉnh sửa một công việc.
   */
  useFocusEffect(
    useCallback(() => {
      const showLoading = !loadedTabsRef.current[activeTab];
      loadedTabsRef.current[activeTab] = true;

      void fetchTasks({ showLoading });
    }, [activeTab, fetchTasks]),
  );

  /*
   * Hiệu ứng nhẹ mỗi khi người dùng thay đổi chế độ xem.
   * Chỉ dùng opacity + translateY nên chạy tốt với native driver.
   */
  React.useEffect(() => {
    contentAnimation.setValue(0);

    Animated.timing(contentAnimation, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [activeTab, statusFilter, sortMode, contentAnimation]);

  const stats = useMemo(() => {
    const countByStatus = (status: TaskStatus) =>
      tasks.filter(task => task.status === status).length;

    return {
      all: tasks.length,
      open: countByStatus('OPEN'),
      inProgress: countByStatus('IN_PROGRESS'),
      completed: countByStatus('COMPLETED'),
      cancelled: countByStatus('CANCELLED'),
    };
  }, [tasks]);

  const completionRate = useMemo(() => {
    const trackableTotal =
      stats.open + stats.inProgress + stats.completed;

    if (trackableTotal === 0) return 0;

    return Math.round((stats.completed / trackableTotal) * 100);
  }, [stats]);

  const filteredTasks = useMemo(() => {
    const selectedFilter = STATUS_FILTERS.find(
      filter => filter.key === statusFilter,
    );

    const normalizedQuery = searchQuery
      .trim()
      .toLocaleLowerCase('vi');

    const result = tasks.filter(task => {
      const matchesStatus =
        !selectedFilter?.status ||
        task.status === selectedFilter.status;

      const matchesSearch =
        !normalizedQuery ||
        getTaskSearchText(task).includes(normalizedQuery);

      return matchesStatus && matchesSearch;
    });

    return [...result].sort((a, b) => {
      if (sortMode === 'newest') {
        return getTaskDateValue(b) - getTaskDateValue(a);
      }

      const priorityA = STATUS_PRIORITY[a.status] ?? 99;
      const priorityB = STATUS_PRIORITY[b.status] ?? 99;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      return getTaskDateValue(b) - getTaskDateValue(a);
    });
  }, [searchQuery, sortMode, statusFilter, tasks]);

  /*
   * “Việc nên xử lý tiếp theo”:
   * ưu tiên việc đang làm, sau đó việc đang mở, rồi đến phần tử mới nhất.
   * Đây là gợi ý dựa trên dữ liệu thật, không dùng điểm số giả.
   */
  const focusTask = useMemo(() => {
    return (
      filteredTasks.find(task => task.status === 'IN_PROGRESS') ??
      filteredTasks.find(task => task.status === 'OPEN') ??
      filteredTasks[0] ??
      null
    );
  }, [filteredTasks]);

  const activeFilterDef =
    STATUS_FILTERS.find(filter => filter.key === statusFilter) ??
    STATUS_FILTERS[0];

  const getFilterCount = useCallback(
    (filter: StatusFilter): number => {
      if (!filter.status) return stats.all;

      switch (filter.status) {
        case 'OPEN':
          return stats.open;
        case 'IN_PROGRESS':
          return stats.inProgress;
        case 'COMPLETED':
          return stats.completed;
        case 'CANCELLED':
          return stats.cancelled;
        default:
          return 0;
      }
    },
    [stats],
  );

  const handleTabChange = useCallback((tabKey: string) => {
    const nextTab =
      tabKey === 'community' ? 'community' : 'mine';

    setActiveTab(nextTab);
    setStatusFilter('all');
    setSearchQuery('');
    Keyboard.dismiss();
  }, []);

  const handleStatusChange = useCallback((filterKey: string) => {
    setStatusFilter(filterKey);
  }, []);

  const handleJobPress = useCallback(
    (task: ActivityTask) => {
      navigation.navigate('JobDetail', {
        taskId: task.id,
      });
    },
    [navigation],
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchTasks({ showLoading: false });
  }, [fetchTasks]);

  const handleRetry = useCallback(() => {
    void fetchTasks({ showLoading: true });
  }, [fetchTasks]);

  const handleResetView = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setSortMode('priority');
    Keyboard.dismiss();
  }, []);

  const toggleSortMode = useCallback(() => {
    setSortMode(current =>
      current === 'priority' ? 'newest' : 'priority',
    );
  }, []);

  const renderTask = useCallback(
    ({ item }: { item: ActivityTask }) => (
      <View style={styles.jobCardWrapper}>
        <JobCard
          task={item}
          onPress={handleJobPress}
          isDark={true}
        />
      </View>
    ),
    [handleJobPress],
  );

  const firstName =
    user?.fullName?.trim().split(/\s+/).pop() || 'bạn';

  const lastUpdatedText = lastUpdated
    ? lastUpdated.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const listHeader = (
    <>
      {/* Dashboard thống kê nhanh */}
      <View style={styles.dashboardSection}>
        <View style={styles.sectionTitleRow}>
          <View>
            <Text style={styles.sectionEyebrow}>TỔNG QUAN NHANH</Text>
            <Text style={styles.sectionTitle}>Nhịp hoạt động của {firstName}</Text>
          </View>

          <View style={styles.progressBadge}>
            <Text style={styles.progressBadgeValue}>
              {completionRate}%
            </Text>
            <Text style={styles.progressBadgeLabel}>hoàn tất</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressActive,
              { width: `${completionRate}%` },
            ]}
          />
        </View>

        <View style={styles.statGrid}>
          <StatCard
            icon="radio-button-on-outline"
            label="Đang mở"
            value={stats.open}
            color={AppColors.status.info}
            active={statusFilter === 'OPEN'}
            onPress={() => handleStatusChange('OPEN')}
          />

          <StatCard
            icon="flash-outline"
            label="Đang làm"
            value={stats.inProgress}
            color={AppColors.status.warning}
            active={statusFilter === 'IN_PROGRESS'}
            onPress={() => handleStatusChange('IN_PROGRESS')}
          />

          <StatCard
            icon="checkmark-circle-outline"
            label="Hoàn thành"
            value={stats.completed}
            color={AppColors.status.success}
            active={statusFilter === 'COMPLETED'}
            onPress={() => handleStatusChange('COMPLETED')}
          />

          <StatCard
            icon="close-circle-outline"
            label="Đã hủy"
            value={stats.cancelled}
            color={AppColors.status.error}
            active={statusFilter === 'CANCELLED'}
            onPress={() => handleStatusChange('CANCELLED')}
          />
        </View>
      </View>

      {/* Smart focus card */}
      {focusTask ? (
        <TouchableOpacity
          style={styles.focusCard}
          onPress={() => handleJobPress(focusTask)}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel={`Ưu tiên tiếp theo: ${getTaskTitle(focusTask)}`}
        >
          <LinearGradient
            colors={[
              `${getStatusColor(focusTask.status)}2A`,
              AppColors.surface.glass,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View
            style={[
              styles.focusIcon,
              {
                backgroundColor: `${getStatusColor(
                  focusTask.status,
                )}22`,
              },
            ]}
          >
            <Ionicons
              name={
                focusTask.status === 'IN_PROGRESS'
                  ? 'rocket-outline'
                  : 'sparkles-outline'
              }
              size={22}
              color={getStatusColor(focusTask.status)}
            />
          </View>

          <View style={styles.focusContent}>
            <Text style={styles.focusEyebrow}>
              VIỆC NÊN XỬ LÝ TIẾP
            </Text>
            <Text style={styles.focusTitle} numberOfLines={1}>
              {getTaskTitle(focusTask)}
            </Text>
            <Text style={styles.focusDescription} numberOfLines={2}>
              {getFocusMessage(focusTask.status)}
            </Text>
          </View>

          <View style={styles.focusArrow}>
            <Ionicons
              name="arrow-forward"
              size={18}
              color={AppColors.text.primary}
            />
          </View>
        </TouchableOpacity>
      ) : null}

      {/* Result count + sort */}
      <View style={styles.resultToolbar}>
        <View style={styles.resultInfo}>
          <View
            style={[
              styles.countDot,
              {
                backgroundColor: activeFilterDef.activeColor,
              },
            ]}
          />

          <View>
            <Text style={styles.resultCount}>
              {filteredTasks.length} công việc
            </Text>
            <Text style={styles.resultCaption}>
              {activeFilterDef.label}
              {lastUpdatedText
                ? ` · cập nhật ${lastUpdatedText}`
                : ''}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.sortButton}
          onPress={toggleSortMode}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={
            sortMode === 'priority'
              ? 'Đang sắp xếp theo ưu tiên'
              : 'Đang sắp xếp mới nhất'
          }
        >
          <Ionicons
            name={
              sortMode === 'priority'
                ? 'layers-outline'
                : 'time-outline'
            }
            size={15}
            color={AppColors.brand.primary}
          />
          <Text style={styles.sortText}>
            {sortMode === 'priority' ? 'Ưu tiên' : 'Mới nhất'}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <LoadingSpinner message="Đang tải hoạt động..." />
        </View>
      );
    }

    if (errorMessage) {
      return (
        <View style={styles.errorCard}>
          <View style={styles.errorIcon}>
            <Ionicons
              name="cloud-offline-outline"
              size={30}
              color={AppColors.status.error}
            />
          </View>

          <Text style={styles.errorTitle}>
            Không thể tải hoạt động
          </Text>
          <Text style={styles.errorDescription}>
            {errorMessage}
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleRetry}
            activeOpacity={0.8}
          >
            <Ionicons
              name="refresh-outline"
              size={17}
              color="#FFFFFF"
            />
            <Text style={styles.primaryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <EmptyState
          title={
            searchQuery || statusFilter !== 'all'
              ? 'Không tìm thấy kết quả'
              : 'Chưa có hoạt động'
          }
          message={
            searchQuery || statusFilter !== 'all'
              ? 'Hãy thử từ khóa khác hoặc đặt lại bộ lọc.'
              : activeTab === 'mine'
                ? 'Các công việc bạn đăng hoặc tham gia sẽ xuất hiện tại đây.'
                : 'Chưa có công việc cộng đồng nào để hiển thị.'
          }
        />

        {(searchQuery || statusFilter !== 'all') && (
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleResetView}
            activeOpacity={0.8}
          >
            <Ionicons
              name="options-outline"
              size={17}
              color={AppColors.brand.primary}
            />
            <Text style={styles.resetButtonText}>
              Đặt lại bộ lọc
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={AppColors.background.primary}
      />

      {/* HEADER */}
      <LinearGradient
        colors={[
          AppColors.background.secondary,
          AppColors.background.primary,
        ]}
        style={styles.header}
      >
        <View style={styles.headerGlow} />

        <View style={styles.headerInner}>
          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>THEO DÕI TIẾN ĐỘ</Text>
            <Text style={styles.headerTitle}>Hoạt động</Text>
            <Text style={styles.headerSubtitle}>
              Tập trung vào việc quan trọng và không bỏ lỡ cập nhật mới.
            </Text>
          </View>

          <View style={styles.headerBadge}>
            <Ionicons
              name="pulse-outline"
              size={21}
              color={AppColors.brand.primary}
            />
          </View>
        </View>

        <View style={styles.tabWrapper}>
          <Tabs
            tabs={ACTIVITY_TABS}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </View>

        {/* Search */}
        <View style={styles.searchWrapper}>
          <Ionicons
            name="search-outline"
            size={19}
            color={AppColors.text.muted}
          />

          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            placeholder="Tìm theo tên, mô tả, địa điểm..."
            placeholderTextColor={AppColors.text.muted}
            returnKeyType="search"
            autoCorrect={false}
            onSubmitEditing={Keyboard.dismiss}
            accessibilityLabel="Tìm kiếm hoạt động"
          />

          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearSearchButton}
              onPress={() => setSearchQuery('')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Xóa tìm kiếm"
            >
              <Ionicons
                name="close-circle"
                size={19}
                color={AppColors.text.muted}
              />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* STATUS FILTERS */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
          keyboardShouldPersistTaps="handled"
        >
          {STATUS_FILTERS.map(filter => {
            const isActive = statusFilter === filter.key;
            const count = getFilterCount(filter);

            return (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterChip,
                  isActive && {
                    backgroundColor: `${filter.activeColor}20`,
                    borderColor: filter.activeColor,
                  },
                ]}
                onPress={() => handleStatusChange(filter.key)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Ionicons
                  name={filter.icon}
                  size={14}
                  color={
                    isActive
                      ? filter.activeColor
                      : AppColors.text.muted
                  }
                />

                <Text
                  style={[
                    styles.filterText,
                    isActive && {
                      color: filter.activeColor,
                      fontWeight: '800',
                    },
                  ]}
                >
                  {filter.label}
                </Text>

                <View
                  style={[
                    styles.filterCount,
                    isActive && {
                      backgroundColor: `${filter.activeColor}28`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterCountText,
                      isActive && {
                        color: filter.activeColor,
                      },
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* CONTENT */}
      <Animated.View
        style={[
          styles.animatedContent,
          {
            opacity: contentAnimation,
            transform: [
              {
                translateY: contentAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [8, 0],
                }),
              },
            ],
          },
        ]}
      >
        <FlatList
          data={filteredTasks}
          keyExtractor={item => String(item.id)}
          renderItem={renderTask}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            filteredTasks.length === 0 &&
              !loading &&
              styles.emptyListContent,
          ]}
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
              onRefresh={handleRefresh}
              tintColor={AppColors.brand.primary}
              colors={[AppColors.brand.primary]}
            />
          }
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AppColors.background.primary,
  },

  animatedContent: {
    flex: 1,
  },

  /* HEADER */
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border.subtle,
    overflow: 'hidden',
  },

  headerGlow: {
    position: 'absolute',
    top: -80,
    right: -55,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: AppColors.brand.primarySoft,
    opacity: 0.65,
  },

  headerInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  headerCopy: {
    flex: 1,
    paddingRight: 18,
  },

  headerEyebrow: {
    marginBottom: 3,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.25,
    color: AppColors.brand.primary,
  },

  headerTitle: {
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '900',
    letterSpacing: -0.7,
    color: AppColors.text.primary,
  },

  headerSubtitle: {
    marginTop: 5,
    maxWidth: 290,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    color: AppColors.text.muted,
  },

  headerBadge: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.brand.primarySoft,
    borderWidth: 1,
    borderColor: AppColors.border.subtle,
  },

  tabWrapper: {
    marginTop: 2,
  },

  searchWrapper: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: AppColors.surface.glass,
    borderWidth: 1,
    borderColor: AppColors.border.subtle,
  },

  searchInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.text.primary,
  },

  clearSearchButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* FILTERS */
  filterContainer: {
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border.subtle,
    backgroundColor: AppColors.background.secondary,
  },

  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },

  filterChip: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 12,
    paddingRight: 7,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AppColors.border.subtle,
    backgroundColor: AppColors.surface.glass,
  },

  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.text.muted,
  },

  filterCount: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.background.primary,
  },

  filterCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: AppColors.text.muted,
  },

  /* LIST */
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 48,
  },

  emptyListContent: {
    flexGrow: 1,
  },

  jobCardWrapper: {
    marginBottom: 14,
  },

  loadingContainer: {
    minHeight: 260,
    justifyContent: 'center',
  },

  /* DASHBOARD */
  dashboardSection: {
    padding: 16,
    marginBottom: 14,
    borderRadius: 22,
    backgroundColor: AppColors.surface.glass,
    borderWidth: 1,
    borderColor: AppColors.border.subtle,
  },

  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  sectionEyebrow: {
    marginBottom: 4,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: AppColors.brand.primary,
  },

  sectionTitle: {
    maxWidth: 235,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    color: AppColors.text.primary,
  },

  progressBadge: {
    alignItems: 'flex-end',
  },

  progressBadgeValue: {
    fontSize: 20,
    fontWeight: '900',
    color: AppColors.status.success,
  },

  progressBadgeLabel: {
    marginTop: -2,
    fontSize: 9,
    fontWeight: '700',
    color: AppColors.text.muted,
  },

  progressTrack: {
    height: 6,
    marginTop: 13,
    marginBottom: 15,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: AppColors.background.primary,
  },

  progressActive: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: AppColors.status.success,
  },

  statGrid: {
    flexDirection: 'row',
    gap: 8,
  },

  statCard: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: AppColors.border.subtle,
    backgroundColor: AppColors.background.secondary,
  },

  statIcon: {
    width: 28,
    height: 28,
    marginBottom: 9,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statValue: {
    fontSize: 17,
    fontWeight: '900',
    color: AppColors.text.primary,
  },

  statLabel: {
    marginTop: 1,
    fontSize: 9,
    fontWeight: '600',
    color: AppColors.text.muted,
  },

  /* FOCUS CARD */
  focusCard: {
    minHeight: 116,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 16,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: AppColors.border.subtle,
  },

  focusIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  focusContent: {
    flex: 1,
  },

  focusEyebrow: {
    marginBottom: 4,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    color: AppColors.brand.primary,
  },

  focusTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    color: AppColors.text.primary,
  },

  focusDescription: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    color: AppColors.text.muted,
  },

  focusArrow: {
    width: 36,
    height: 36,
    marginLeft: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.surface.glass,
    borderWidth: 1,
    borderColor: AppColors.border.subtle,
  },

  /* RESULT TOOLBAR */
  resultToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },

  resultInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  countDot: {
    width: 8,
    height: 8,
    marginRight: 8,
    borderRadius: 4,
  },

  resultCount: {
    fontSize: 12,
    fontWeight: '800',
    color: AppColors.text.primary,
  },

  resultCaption: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: '600',
    color: AppColors.text.muted,
  },

  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 13,
    backgroundColor: AppColors.brand.primarySoft,
    borderWidth: 1,
    borderColor: AppColors.border.subtle,
  },

  sortText: {
    fontSize: 11,
    fontWeight: '800',
    color: AppColors.brand.primary,
  },

  /* ERROR / EMPTY */
  errorCard: {
    minHeight: 290,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },

  errorIcon: {
    width: 62,
    height: 62,
    marginBottom: 14,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${AppColors.status.error}18`,
  },

  errorTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: AppColors.text.primary,
  },

  errorDescription: {
    marginTop: 6,
    marginBottom: 18,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: AppColors.text.muted,
  },

  primaryButton: {
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: AppColors.brand.primary,
  },

  primaryButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  emptyContainer: {
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },

  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: AppColors.brand.primarySoft,
    borderWidth: 1,
    borderColor: AppColors.border.subtle,
  },

  resetButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: AppColors.brand.primary,
  },
});

export default ActivityScreen;
