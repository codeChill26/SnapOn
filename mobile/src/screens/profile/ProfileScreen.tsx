import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { profileService } from '../../services/profileService';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { PublicProfile, Task } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { ProfileStatsRow } from '../../components/profile/ProfileStatsRow';
import { ProfileTabs } from '../../components/profile/ProfileTabs';
import { ProfilePostCard, ProfileEmptyState } from '../../components/profile/ProfilePostGrid';

type ProfileNavProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

// Utility function to chunk 2-column list items to be rendered cleanly inside a single column list
const chunkArray = <T,>(array: T[], size: number): T[][] => {
  const chunked: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunked.push(array.slice(i, i + size));
  }
  return chunked;
};

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileNavProp>();
  const route = useRoute<any>();
  const { user: currentUser } = useAuth();

  const paramUserId = route.params?.userId;
  const isOwnProfile = !paramUserId || paramUserId === currentUser?.id;
  const profileUserId = isOwnProfile ? currentUser?.id : paramUserId;

  // States
  const [profileData, setProfileData] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [firstLoad, setFirstLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0: Recruitment, 1: Service

  // List pagination states
  const [listData, setListData] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Fetch Public Profile and stats
  const fetchProfile = useCallback(async (showIndicator = true) => {
    if (!profileUserId) return;
    if (showIndicator) setLoading(true);

    try {
      const res = await profileService.getPublicProfile(profileUserId);
      if (res.success && res.data) {
        setProfileData(res.data);
      }
    } catch (err) {
      console.error('Fetch public profile error:', err);
      Alert.alert('Lỗi', 'Không thể tải thông tin trang cá nhân.');
    } finally {
      if (showIndicator) setLoading(false);
    }
  }, [profileUserId]);

  // Fetch List content (posts or reviews) based on active tab
  const fetchListContent = useCallback(async (pageNum = 1, append = false, tabIndex = activeTab) => {
    if (!profileUserId) return;
    if (pageNum === 1 && !append) {
      setListData([]);
    }

    try {
      if (tabIndex === 0 || tabIndex === 1) {
        const type = tabIndex === 0 ? 'RECRUITMENT' : 'SERVICE_OFFER';
        const res = await profileService.getPublicPosts(profileUserId, type, pageNum, 10);
        if (res.success) {
          setListData((prev) => (append ? [...prev, ...res.data] : res.data));
          setPage(res.pagination.page);
          setTotalPages(res.pagination.totalPages);

          // Keep counts synchronized with stats row
          if (res.pagination.total !== undefined) {
            setProfileData((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                postedJobsCount: type === 'RECRUITMENT' ? res.pagination.total : prev.postedJobsCount,
                serviceOffersCount: type === 'SERVICE_OFFER' ? res.pagination.total : prev.serviceOffersCount,
              };
            });
          }
        }
      }
    } catch (err) {
      console.error('Fetch profile list content error:', err);
    }
  }, [profileUserId, activeTab]);

  // Initial load
  useEffect(() => {
    const initLoad = async () => {
      setLoading(true);
      await Promise.all([
        fetchProfile(false),
        fetchListContent(1, false, activeTab)
      ]);
      setLoading(false);
      setFirstLoad(false);
    };
    initLoad();
  }, [profileUserId]);

  // Fetch list when tab index changes (excluding initial mount double-fetch)
  useEffect(() => {
    if (!firstLoad) {
      fetchListContent(1, false, activeTab);
    }
  }, [activeTab, fetchListContent, firstLoad]);

  // Focus effect for silent background update (e.g. returning from settings/edit profile)
  useFocusEffect(
    useCallback(() => {
      if (firstLoad) return;
      fetchProfile(false);
      fetchListContent(1, false, activeTab);
    }, [fetchProfile, fetchListContent, firstLoad, activeTab])
  );

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchProfile(false),
      fetchListContent(1, false, activeTab)
    ]);
    setRefreshing(false);
  }, [fetchProfile, fetchListContent, activeTab]);

  // Load more pagination
  const handleLoadMore = useCallback(async () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    await fetchListContent(page + 1, true, activeTab);
    setLoadingMore(false);
  }, [loadingMore, page, totalPages, fetchListContent, activeTab]);

  // Navigate handlers
  const handleSettingsPress = useCallback(() => {
    navigation.navigate('AccountSettings');
  }, [navigation]);

  const handleMessagePress = useCallback(() => {
    if (!profileData) return;
    navigation.navigate('ChatDetail', {
      otherUserId: profileData.id,
      otherUserName: profileData.fullName,
      otherUserAvatar: profileData.avatarUrl,
    });
  }, [navigation, profileData]);

  const handleHirePress = useCallback(() => {
    if (!profileData) return;
    navigation.navigate('ChatDetail', {
      otherUserId: profileData.id,
      otherUserName: profileData.fullName,
      otherUserAvatar: profileData.avatarUrl,
    });
  }, [navigation, profileData]);

  const handlePostPress = useCallback((task: Task) => {
    navigation.navigate('JobDetail', { taskId: task.id });
  }, [navigation]);

  // Format list content chunk size so columns are rendered as structured row cards inside a 1-column flatlist
  const formattedData = useMemo(() => {
    if (activeTab === 0 || activeTab === 1) {
      return chunkArray(listData, 2);
    }
    return listData;
  }, [listData, activeTab]);

  const handleKeyExtractor = useCallback((item: any) => {
    if (Array.isArray(item)) {
      return item.map((task) => task.id).join('-');
    }
    return String(item.id);
  }, []);

  const renderHeader = useMemo(() => {
    if (!profileData) return null;
    return (
      <View style={styles.headerContainer}>
        {/* Custom Header Navigation Bar */}
        <View style={styles.navBar}>
          {!isOwnProfile ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={styles.navBarSpacer} />
          )}
          <Text style={styles.navBarTitle}>
            {isOwnProfile ? 'Trang cá nhân của tôi' : profileData.fullName}
          </Text>
          <View style={styles.navBarSpacer} />
        </View>

        <ProfileHeader
          fullName={profileData.fullName}
          avatarUrl={profileData.avatarUrl}
          coverUrl={profileData.coverUrl}
          isVerified={profileData.isVerified}
          bio={profileData.bio}
          headline={profileData.headline}
          skills={profileData.skills}
          joinedAt={profileData.joinedAt}
          isOwnProfile={isOwnProfile}
          showHireButton={profileData.serviceOffersCount > 0}
          onSettingsPress={handleSettingsPress}
          onMessagePress={handleMessagePress}
          onHirePress={handleHirePress}
        />

        <ProfileStatsRow
          postedCount={profileData.postedJobsCount}
          servicesCount={profileData.serviceOffersCount}
          completedCount={profileData.completedJobsCount}
          activeTab={activeTab}
          onStatPress={setActiveTab}
        />

        <ProfileTabs
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          postedCount={profileData.postedJobsCount}
          servicesCount={profileData.serviceOffersCount}
        />
      </View>
    );
  }, [profileData, isOwnProfile, activeTab, handleSettingsPress, handleMessagePress, handleHirePress]);

  const renderFooter = useCallback(() => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoading}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      );
    }
    return <View style={styles.footerSpacing} />;
  }, [loadingMore]);

  const renderItem = useCallback(({ item }: { item: any }) => {
    if (activeTab === 0 || activeTab === 1) {
      return (
        <View style={styles.gridRow}>
          {item.map((task: any) => (
            <ProfilePostCard
              key={task.id}
              task={task}
              onPress={handlePostPress}
            />
          ))}
          {item.length === 1 && <View style={styles.gridSpacer} />}
        </View>
      );
    }
    return null;
  }, [activeTab, handlePostPress]);

  const renderEmptyState = useCallback(() => {
    if (activeTab === 0) {
      return (
        <ProfileEmptyState
          title="Chưa có bài tuyển dụng"
          subtitle={isOwnProfile ? 'Hãy đăng bài tuyển dụng mới để tìm người làm việc.' : 'Người dùng này chưa đăng bài tuyển dụng nào.'}
          ctaText={isOwnProfile ? 'Đăng tuyển dụng ngay' : undefined}
          onCtaPress={isOwnProfile ? () => navigation.navigate('MainTabs', { screen: 'PostJob' } as any) : undefined}
        />
      );
    } else if (activeTab === 1) {
      return (
        <ProfileEmptyState
          title="Chưa có dịch vụ Thuê tôi"
          subtitle={isOwnProfile ? 'Hãy tạo bài đăng cung cấp dịch vụ để đối tác thuê bạn.' : 'Người dùng này chưa có dịch vụ Thuê tôi.'}
          ctaText={isOwnProfile ? 'Đăng tin dịch vụ' : undefined}
          onCtaPress={isOwnProfile ? () => navigation.navigate('MainTabs', { screen: 'PostJob' } as any) : undefined}
        />
      );
    }
    return null;
  }, [activeTab, isOwnProfile, navigation]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Đang tải trang cá nhân...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      
      <FlatList
        key="profile-list-stable"
        data={formattedData}
        renderItem={renderItem}
        keyExtractor={handleKeyExtractor}
        numColumns={1}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 12,
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  headerContainer: {
    backgroundColor: Colors.surface,
  },
  navBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  navBarTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  navBarSpacer: {
    width: 24,
  },
  listContent: {
    paddingBottom: 24,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  gridSpacer: {
    width: cardWidth,
    margin: 8,
  },
  footerSpacing: {
    height: 40,
  },
  footerLoading: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
