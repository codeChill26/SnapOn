import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  FlatList,
  Keyboard,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../constants/colors';
import { JobCard } from '../../components/common/JobCard';
import { UserAvatar } from '../../components/common/UserAvatar';
import { HomeBannerCarousel } from '../../components/home/HomeBannerCarousel';

import { taskService } from '../../services/taskService';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

import { Task } from '../../types';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { AppColors } from '../../theme';

type HomeNavProp = NativeStackNavigationProp<RootStackParamList>;

const UIColors = {
  page: '#090E17',
  surface: 'rgba(30, 41, 59, 0.55)',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: 'rgba(255, 255, 255, 0.08)',
  primarySoft: 'rgba(245, 130, 32, 0.15)',
  successSoft: 'rgba(16, 185, 129, 0.15)',
  warningSoft: 'rgba(245, 158, 11, 0.15)',
  purpleSoft: 'rgba(139, 92, 246, 0.15)',
};

interface HomeScreenHeaderProps {
  user: any;
  userRole: string;
  onSelectWork: () => void;
  onSelectHire: () => void;
  searchQuery: string;
  setSearchQuery: (text: string) => void;
  handleSubmitSearch: () => void;
  handleClearSearch: () => void;
  handleCategorySelect: (categoryId: string, categoryName: string) => void;
  bannerRefreshKey: number;
  hasActiveFilter: boolean;
  selectedCategory: string | undefined;
  selectedCategoryName: string | undefined;
  debouncedSearch: string;
  handleResetFilters: () => void;
  resultDescription: string;
  loading: boolean;
  tasksLength: number;
}

const HomeScreenHeader: React.FC<HomeScreenHeaderProps> = React.memo(({
  user,
  userRole,
  searchQuery,
  setSearchQuery,
  handleSubmitSearch,
  handleClearSearch,
  handleCategorySelect,
  bannerRefreshKey,
  hasActiveFilter,
  selectedCategory,
  selectedCategoryName,
  debouncedSearch,
  handleResetFilters,
  resultDescription,
  loading,
  tasksLength,
  onSelectWork,
  onSelectHire,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 4,
        duration: 16000,
        useNativeDriver: false,
      })
    ).start();
  }, [animatedValue]);

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: ['#F58220', '#EC4899', '#8B5CF6', '#10B981', '#F58220']
  });

  return (
    <>
      {/* COMPACT HEADER */}
      <Animated.View style={[styles.header, { backgroundColor }]}>
        <View style={styles.headerCircle} />
        <View style={styles.headerCircle2} />

        <View style={styles.headerTop}>
          <View style={styles.userContainer}>
            <View style={styles.avatarBorder}>
              <UserAvatar
                name={user?.fullName || 'Người dùng'}
                avatarUrl={user?.avatarUrl}
                size={44}
              />
            </View>

            <View style={styles.userInformation}>
              <Text style={styles.greetingLabel} numberOfLines={1}>
                Chào buổi sáng 👋
              </Text>

              <Text
                style={styles.greetingName}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {user?.fullName || 'Người dùng'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.notificationButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Mở thông báo"
          >
            <Ionicons
              name="notifications-outline"
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.headline}>
          Hôm nay bạn muốn{"\n"}hoàn thành việc gì?
        </Text>

        {/* INTENT SELECTOR */}
        <View style={styles.selectorContainer}>
          <TouchableOpacity
            style={[styles.selectorButton, userRole === 'worker' && styles.selectorButtonActive]}
            onPress={onSelectWork}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: userRole === 'worker' }}
          >
            <Ionicons
              name="search"
              size={15}
              color={userRole === 'worker' ? AppColors.brand.primary : 'rgba(255,255,255,0.75)'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.selectorText, userRole === 'worker' && styles.selectorTextActive]}>
              Tìm việc
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.selectorButton, userRole === 'hirer' && styles.selectorButtonActive]}
            onPress={onSelectHire}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: userRole === 'hirer' }}
          >
            <Ionicons
              name="create-outline"
              size={15}
              color={userRole === 'hirer' ? AppColors.brand.primary : 'rgba(255,255,255,0.75)'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.selectorText, userRole === 'hirer' && styles.selectorTextActive]}>
              Thuê người
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* SEARCH BAR (Placed immediately below to prevent shadow clipping) */}
      <View style={styles.searchOuterContainer}>
        <View style={styles.searchWrapper}>
          <Ionicons
            name="search-outline"
            size={20}
            color={UIColors.textSecondary}
          />

          <TextInput
            style={styles.searchInput}
            placeholder="Bạn muốn tìm công việc gì?"
            placeholderTextColor={UIColors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSubmitSearch}
            returnKeyType="search"
            autoCorrect={false}
            clearButtonMode="never"
            accessibilityLabel="Tìm kiếm công việc"
          />

          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.searchAction}
              onPress={handleClearSearch}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Xóa nội dung tìm kiếm"
            >
              <Ionicons
                name="close"
                size={18}
                color={UIColors.textSecondary}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => {
              if (selectedCategory) {
                handleCategorySelect(selectedCategory, selectedCategoryName || '');
              }
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Lọc danh mục"
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={selectedCategory ? AppColors.brand.primary : UIColors.textSecondary}
            />
            {selectedCategory ? <View style={styles.activeFilterDot} /> : null}
          </TouchableOpacity>
        </View>
      </View>

      {/* CATEGORY DISCOVERY: banner image + category filter in one card */}
      <View style={[styles.sectionCard, styles.discoveryCard]}>
        <View style={styles.discoveryHeader}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionEyebrow}>KHÁM PHÁ THEO DANH MỤC</Text>
            <Text style={styles.sectionTitle}>Chọn dịch vụ bạn đang quan tâm</Text>
            <Text style={styles.discoveryDescription}>
              Mỗi banner là một danh mục. Chạm vào card để lọc danh sách công việc ngay bên dưới.
            </Text>
          </View>
        </View>

        <HomeBannerCarousel
          onSelectCategory={handleCategorySelect}
          selectedCategory={selectedCategory}
          refreshKey={bannerRefreshKey}
        />
      </View>

      {/* ACTIVE FILTERS ROW */}
      {hasActiveFilter && (
        <View style={styles.activeFiltersRow}>
          {selectedCategory && (
            <View style={styles.filterChip}>
              <Ionicons
                name="funnel-outline"
                size={14}
                color={Colors.primary}
              />
              <Text style={styles.filterChipText} numberOfLines={1}>
                Danh mục: {selectedCategoryName}
              </Text>
              <TouchableOpacity
                style={styles.filterChipClose}
                onPress={() => handleCategorySelect(selectedCategory, selectedCategoryName || '')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Xóa lọc danh mục"
              >
                <Ionicons
                  name="close-circle"
                  size={16}
                  color={UIColors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          )}

          {debouncedSearch && (
            <View style={styles.filterChip}>
              <Ionicons
                name="search-outline"
                size={14}
                color={Colors.primary}
              />
              <Text style={styles.filterChipText} numberOfLines={1}>
                Tìm kiếm: "{debouncedSearch}"
              </Text>
              <TouchableOpacity
                style={styles.filterChipClose}
                onPress={handleClearSearch}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Xóa tìm kiếm"
              >
                <Ionicons
                  name="close-circle"
                  size={16}
                  color={UIColors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Reset all button if both are active */}
          {selectedCategory && debouncedSearch && (
            <TouchableOpacity
              style={styles.clearAllFiltersTextBtn}
              onPress={handleResetFilters}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Xóa tất cả bộ lọc"
            >
              <Text style={styles.clearAllFiltersText}>Đặt lại</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* JOB HEADER - NEW SECTION BACKGROUND */}
      <View style={styles.latestJobsSectionContainer}>
        <View style={styles.latestJobsSectionHeader}>
          <View style={styles.latestJobsTopRow}>
            <View style={[styles.latestJobsIcon, selectedCategory ? { backgroundColor: `${Colors.primary}15` } : undefined]}>
              <Ionicons name="flash" size={16} color={selectedCategory ? Colors.primary : Colors.primary} />
            </View>

            <View style={styles.latestJobsCountChip}>
              {loading && tasksLength > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.updatingDot} />
                  <Text style={styles.latestJobsCountText}>Đang cập nhật...</Text>
                </View>
              ) : (
                <Text style={styles.latestJobsCountText}>{tasksLength} việc đang mở</Text>
              )}
            </View>
          </View>

          <Text style={[styles.latestJobsEyebrow, selectedCategory ? { color: Colors.primary } : undefined]}>
            VIỆC MỚI MỖI NGÀY
          </Text>

          <Text style={styles.latestJobsTitle}>
            Công việc mới nhất
          </Text>

          <Text style={styles.latestJobsDescription}>
            {selectedCategoryName 
              ? `Khám phá các công việc thuộc danh mục ${selectedCategoryName} vừa được đăng.`
              : 'Khám phá các công việc vừa được đăng và ứng tuyển ngay.'}
          </Text>

          {debouncedSearch ? (
             <Text style={styles.resultDescription}>
               Trạng thái tìm kiếm: {resultDescription}
             </Text>
          ) : null}
        </View>
      </View>
    </>
  );
});

const JobCardSkeleton = () => (
  <View style={styles.skeletonCard}>
    <View style={styles.skeletonImage} />
    <View style={styles.skeletonContent}>
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonText} />
      <View style={styles.skeletonTextLine} />
      <View style={styles.skeletonFooter}>
        <View style={styles.skeletonBudget} />
        <View style={styles.skeletonCta} />
      </View>
    </View>
  </View>
);

const MemoizedJobItem = React.memo(
  ({ item, onPress }: { item: Task; onPress: (task: Task) => void }) => (
    <View style={styles.jobItemWrapper}>
      <JobCard task={item} onPress={onPress} isDark={true} />
    </View>
  ),
  (prev, next) => prev.item.id === next.item.id && prev.item.status === next.item.status && prev.item.deadlineEnd === next.item.deadlineEnd
);

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeNavProp>();
  const latestRequestRef = useRef(0);

  const blobAnim1 = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const blobAnim2 = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  useEffect(() => {
    const startBlobAnimation = (
      anim: Animated.ValueXY,
      config: { targetX1: number; targetY1: number; targetX2: number; targetY2: number; duration: number }
    ) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: { x: config.targetX1, y: config.targetY1 },
            duration: config.duration,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: { x: config.targetX2, y: config.targetY2 },
            duration: config.duration,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: { x: 0, y: 0 },
            duration: config.duration,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    startBlobAnimation(blobAnim1, { targetX1: 30, targetY1: 50, targetX2: -40, targetY2: 90, duration: 15000 });
    startBlobAnimation(blobAnim2, { targetX1: -40, targetY1: -60, targetX2: 50, targetY2: -30, duration: 18000 });
  }, [blobAnim1, blobAnim2]);

  const { user, switchRole } = useAuth();
  const { tasks, setTasks } = useApp();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerRefreshKey, setBannerRefreshKey] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [selectedCategory, setSelectedCategory] = useState<
    string | undefined
  >();

  const [selectedCategoryName, setSelectedCategoryName] = useState<
    string | undefined
  >();

  const handleSelectWork = useCallback(async () => {
    if (user?.role !== 'worker') {
      try {
        await switchRole('worker');
      } catch (err) {
        console.error('Failed to switch role to worker:', err);
      }
    }
  }, [user?.role, switchRole]);

  const handleSelectHire = useCallback(async () => {
    if (user?.role !== 'hirer') {
      try {
        await switchRole('hirer');
      } catch (err) {
        console.error('Failed to switch role to hirer:', err);
      }
    }
    setTimeout(() => {
      navigation.navigate('PostJob' as any);
    }, 120);
  }, [user?.role, switchRole, navigation]);

  /**
   * Chờ người dùng nhập xong rồi mới gọi API.
   * Tránh gọi API sau mỗi ký tự.
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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

        if (selectedCategory) {
          params.category_id = selectedCategory;
        }

        if (debouncedSearch) {
          params.search = debouncedSearch;
        }

        const result = await taskService.getTasks(params);

        /**
         * Chỉ cập nhật dữ liệu của request gần nhất.
         * Tránh request cũ ghi đè kết quả mới.
         */
        if (currentRequestId === latestRequestRef.current) {
          setTasks(result.data ?? []);
        }
      } catch (error) {
        console.error('Failed to fetch tasks:', error);

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
    [
      debouncedSearch,
      selectedCategory,
      setTasks,
    ],
  );

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);

    setBannerRefreshKey((current) => current + 1);

    void fetchTasks({
      showLoading: false,
    });
  }, [fetchTasks]);

  const handleCategorySelect = useCallback(
    (categoryId: string, categoryName: string) => {
      const isSelectingCurrentCategory =
        selectedCategory === categoryId;

      if (isSelectingCurrentCategory) {
        setSelectedCategory(undefined);
        setSelectedCategoryName(undefined);
        return;
      }

      setSelectedCategory(categoryId);
      setSelectedCategoryName(categoryName);
    },
    [selectedCategory],
  );

  const handleJobPress = useCallback(
    (task: Task) => {
      navigation.navigate('JobDetail', {
        taskId: task.id,
      });
    },
    [navigation],
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearch('');
    Keyboard.dismiss();
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedCategory(undefined);
    setSelectedCategoryName(undefined);
    Keyboard.dismiss();
  }, []);

  const handleSubmitSearch = useCallback(() => {
    setDebouncedSearch(searchQuery.trim());
    Keyboard.dismiss();
  }, [searchQuery]);

  const hasActiveFilter = Boolean(
    selectedCategory || debouncedSearch,
  );

  const resultDescription = useMemo(() => {
    if (loading && tasks.length === 0) {
      return 'Đang tìm công việc phù hợp';
    }

    if (debouncedSearch) {
      return `${tasks.length} kết quả cho “${debouncedSearch}”`;
    }

    if (selectedCategoryName) {
      return `${tasks.length} công việc trong ${selectedCategoryName}`;
    }

    return `${tasks.length} công việc đang mở`;
  }, [
    loading,
    tasks.length,
    debouncedSearch,
    selectedCategoryName,
  ]);



// ... inside HomeScreen component ...

  const renderJobItem = useCallback(
    ({ item }: { item: Task }) => (
      <MemoizedJobItem item={item} onPress={handleJobPress} />
    ),
    [handleJobPress],
  );

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.skeletonContainer}>
          <JobCardSkeleton />
          <JobCardSkeleton />
          <JobCardSkeleton />
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search-outline" size={48} color={UIColors.textMuted} style={{ marginBottom: 12 }} />
        <Text style={styles.emptyTitle}>Chưa tìm thấy công việc phù hợp</Text>
        <Text style={styles.emptySubtitle}>
          Hãy thử từ khóa khác hoặc thay đổi danh mục đang chọn.
        </Text>

        {hasActiveFilter && (
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleResetFilters}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Xóa tất cả bộ lọc"
          >
            <Ionicons
              name="refresh-outline"
              size={18}
              color={Colors.primary}
            />

            <Text style={styles.resetButtonText}>
              Đặt lại tìm kiếm
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* GLOWING BACKGROUND GRADIENT FOR PREMIUM GLASSMORPHISM */}
      <LinearGradient
        colors={['#090E17', '#121A2E', '#18122B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Floating Animated Glowing Blobs */}
      <Animated.View
        style={[
          styles.glowBlob1,
          {
            transform: [
              { translateX: blobAnim1.x },
              { translateY: blobAnim1.y },
            ],
          },
        ]}
        pointerEvents="none"
      />
      <Animated.View
        style={[
          styles.glowBlob2,
          {
            transform: [
              { translateX: blobAnim2.x },
              { translateY: blobAnim2.y },
            ],
          },
        ]}
        pointerEvents="none"
      />

      {/* Decorative dynamic background patterns */}
      <View style={styles.gridLineV} pointerEvents="none" />
      <View style={styles.gridLineV2} pointerEvents="none" />
      <View style={styles.gridLineV3} pointerEvents="none" />
      <View style={styles.gridLineV4} pointerEvents="none" />
      <View style={styles.gridLineH} pointerEvents="none" />
      <View style={styles.gridLineH2} pointerEvents="none" />
      <View style={styles.gridLineH3} pointerEvents="none" />
      <View style={styles.gridLineH4} pointerEvents="none" />

      <View style={styles.bgWireframe1} pointerEvents="none" />
      <View style={styles.bgWireframe2} pointerEvents="none" />
      <View style={styles.bgWireframe3} pointerEvents="none" />
      <View style={styles.bgWireframe4} pointerEvents="none" />
      <Ionicons name="sparkles-outline" size={20} color="#FF8F5E" style={styles.bgSparkle1} pointerEvents="none" />
      <Ionicons name="ellipse" size={12} color="#1A6BA8" style={styles.bgDot1} pointerEvents="none" />
      <Ionicons name="sparkles" size={24} color="#A78BFA" style={styles.bgSparkle2} pointerEvents="none" />
      <Ionicons name="ellipse" size={16} color="#34D399" style={styles.bgDot2} pointerEvents="none" />
      <Ionicons name="sparkles-outline" size={18} color="#FBBF24" style={styles.bgSparkle3} pointerEvents="none" />
      <Ionicons name="ellipse" size={14} color="#F472B6" style={styles.bgDot3} pointerEvents="none" />

      <FlatList
        style={styles.container}
        data={tasks}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderJobItem}
        ListHeaderComponent={
          <HomeScreenHeader
            user={user}
            userRole={user?.role || 'worker'}
            onSelectWork={handleSelectWork}
            onSelectHire={handleSelectHire}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            handleSubmitSearch={handleSubmitSearch}
            handleClearSearch={handleClearSearch}
            handleCategorySelect={handleCategorySelect}
            bannerRefreshKey={bannerRefreshKey}
            hasActiveFilter={hasActiveFilter}
            selectedCategory={selectedCategory}
            selectedCategoryName={selectedCategoryName}
            debouncedSearch={debouncedSearch}
            handleResetFilters={handleResetFilters}
            resultDescription={resultDescription}
            loading={loading}
            tasksLength={tasks.length}
          />
        }
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={<View style={styles.listFooter} />}
        contentContainerStyle={styles.content}
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
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090E17',
  },
  glowBlob1: {
    position: 'absolute',
    top: '18%',
    left: '-10%',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(245, 130, 32, 0.08)',
  },
  glowBlob2: {
    position: 'absolute',
    top: '55%',
    right: '-15%',
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
  },

  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  content: {
    paddingBottom: 24,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    position: 'relative',
    overflow: 'hidden',
  },

  headerCircle: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: -60,
    right: -50,
  },

  headerCircle2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    bottom: -40,
    left: -30,
  },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  userContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatarBorder: {
    padding: 2,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  userInformation: {
    flex: 1,
    marginLeft: 10,
  },

  greetingLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 1,
  },

  greetingName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  notificationButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },

  headline: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 28,
  },

  selectorContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 14,
    padding: 3,
    marginTop: 16,
  },

  selectorButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 11,
  },

  selectorButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  selectorText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  selectorTextActive: {
    color: Colors.primary,
  },

  searchOuterContainer: {
    paddingHorizontal: 20,
    marginTop: -26,
    marginBottom: 28,
    zIndex: 10,
  },

  searchWrapper: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },

  searchInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 10,
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },

  searchAction: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginRight: 8,
  },

  filterButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  activeFilterDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.primary,
  },

  section: {
    marginBottom: 28,
    paddingHorizontal: 20,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  sectionHeading: {
    flex: 1,
  },

  sectionEyebrow: {
    marginBottom: 5,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: Colors.primary,
  },

  sectionTitle: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: '#FFFFFF',
  },

  discoveryCard: {
    paddingVertical: 0,
    overflow: 'hidden',
  },

  discoveryHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 2,
  },

  discoveryDescription: {
    marginTop: 7,
    color: UIColors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },

  activeFiltersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },

  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 130, 32, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 130, 32, 0.3)',
  },

  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 6,
    marginRight: 4,
    maxWidth: 160,
  },

  filterChipClose: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  clearAllFiltersTextBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },

  clearAllFiltersText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },

  sectionCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.55)',
    marginHorizontal: 16,
    borderRadius: 24,
    paddingVertical: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },

  latestJobsSectionContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.55)',
    marginHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 24,
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 1,
  },

  latestJobsSectionHeader: {
    marginBottom: 20,
  },

  latestJobsTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  latestJobsIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  latestJobsCountChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },

  latestJobsCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: UIColors.textSecondary,
  },

  latestJobsEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: UIColors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  latestJobsTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: UIColors.text,
    marginBottom: 6,
  },

  latestJobsDescription: {
    fontSize: 14,
    color: UIColors.textSecondary,
    lineHeight: 20,
  },

  resultDescription: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: Colors.primary,
  },

  jobItemWrapper: {
    paddingHorizontal: 20,
  },

  updatingContainer: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: UIColors.surface,
  },

  inlineUpdatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: Colors.primarySoft,
  },

  updatingDot: {
    width: 6,
    height: 6,
    marginRight: 5,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },

  updatingText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  inlineUpdatingText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primaryDark,
  },

  jobCardContainer: {
    marginHorizontal: 20,
    marginBottom: 14,
  },

  loadingContainer: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  skeletonContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  skeletonCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.55)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
    overflow: 'hidden',
  },

  skeletonImage: {
    width: '100%',
    aspectRatio: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },

  skeletonContent: {
    padding: 16,
  },

  skeletonTitle: {
    width: '70%',
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 4,
    marginBottom: 10,
  },

  skeletonText: {
    width: '100%',
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 4,
    marginBottom: 6,
  },

  skeletonTextLine: {
    width: '55%',
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 4,
    marginBottom: 16,
  },

  skeletonFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },

  skeletonBudget: {
    width: 60,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 4,
  },

  skeletonCta: {
    width: 100,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
  },

  emptyContainer: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: UIColors.text,
    marginBottom: 4,
  },

  emptySubtitle: {
    fontSize: 13,
    color: UIColors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },

  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 13,
    backgroundColor: UIColors.primarySoft,
  },

  resetButtonText: {
    marginLeft: 7,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },

  listFooter: {
    height: 24,
  },

  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '20%',
    width: 1,
    backgroundColor: '#FFFFFF',
    opacity: 0.03,
  },
  gridLineV2: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '40%',
    width: 1,
    backgroundColor: '#FFFFFF',
    opacity: 0.03,
  },
  gridLineV3: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '60%',
    width: 1,
    backgroundColor: '#FFFFFF',
    opacity: 0.03,
  },
  gridLineV4: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '80%',
    width: 1,
    backgroundColor: '#FFFFFF',
    opacity: 0.03,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 200,
    height: 1,
    backgroundColor: '#FFFFFF',
    opacity: 0.03,
  },
  gridLineH2: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 400,
    height: 1,
    backgroundColor: '#FFFFFF',
    opacity: 0.03,
  },
  gridLineH3: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 600,
    height: 1,
    backgroundColor: '#FFFFFF',
    opacity: 0.03,
  },
  gridLineH4: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 800,
    height: 1,
    backgroundColor: '#FFFFFF',
    opacity: 0.03,
  },
  bgWireframe1: {
    position: 'absolute',
    top: 180,
    right: -25,
    width: 90,
    height: 90,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 143, 94, 0.15)', // Primary Orange soft
    opacity: 0.08,
    borderRadius: 20,
    transform: [{ rotate: '15deg' }],
  },
  bgWireframe2: {
    position: 'absolute',
    top: 520,
    left: -35,
    width: 130,
    height: 130,
    borderWidth: 1.5,
    borderColor: 'rgba(26, 107, 168, 0.15)', // Secondary Blue soft
    opacity: 0.07,
    borderRadius: 28,
    transform: [{ rotate: '-25deg' }],
  },
  bgWireframe3: {
    position: 'absolute',
    top: 380,
    right: -20,
    width: 70,
    height: 70,
    borderWidth: 1.5,
    borderColor: 'rgba(167, 139, 250, 0.15)', // Purple soft
    opacity: 0.06,
    borderRadius: 16,
    transform: [{ rotate: '45deg' }],
  },
  bgWireframe4: {
    position: 'absolute',
    bottom: 120,
    left: -25,
    width: 110,
    height: 110,
    borderWidth: 1.5,
    borderColor: 'rgba(52, 211, 153, 0.15)', // Green soft
    opacity: 0.06,
    borderRadius: 24,
    transform: [{ rotate: '-10deg' }],
  },
  bgSparkle1: {
    position: 'absolute',
    top: 220,
    left: 40,
    opacity: 0.08,
  },
  bgDot1: {
    position: 'absolute',
    top: 160,
    right: 80,
    opacity: 0.06,
  },
  bgSparkle2: {
    position: 'absolute',
    top: 480,
    right: 40,
    opacity: 0.08,
  },
  bgDot2: {
    position: 'absolute',
    top: 620,
    left: 80,
    opacity: 0.06,
  },
  bgSparkle3: {
    position: 'absolute',
    top: 980, // moved down since content can be tall
    left: 30,
    opacity: 0.08,
  },
  bgDot3: {
    position: 'absolute',
    top: 880, // moved down
    right: 60,
    opacity: 0.06,
  },
});