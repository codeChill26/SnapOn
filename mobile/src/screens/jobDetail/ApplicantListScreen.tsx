import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { applicationService } from '../../services/applicationService';
import { matchingService } from '../../services/matchingService';
import { TaskApplication } from '../../types';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { HomeTheme } from '../../components/home/HomeTheme';
import { formatDate } from '../../utils/format';
import { UserAvatar } from '../../components/common/UserAvatar';

type ApplicantListRouteProp = RouteProp<RootStackParamList, 'ApplicantList'>;
type FilterTab = 'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED';

export const ApplicantListScreen: React.FC = () => {
  const route = useRoute<ApplicantListRouteProp>();
  const navigation = useNavigation<any>();

  const [applicants, setApplicants] = useState<TaskApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    loadApplicants();
  }, [route.params.taskId]);

  const loadApplicants = async () => {
    try {
      let apps = await applicationService.getApplicationsByTask(route.params.taskId);
      try {
        const ranked = await matchingService.getRankedApplications(route.params.taskId);
        if (ranked && ranked.length > 0) {
          // Merge details if score is present
          apps = apps.map(app => {
            const rankInfo = ranked.find(r => r.id === app.id);
            return rankInfo ? { ...app, score: rankInfo.score } : app;
          });
          // Sort by score desc if score exists
          apps.sort((a, b) => (b.score || 0) - (a.score || 0));
        }
      } catch (err) {
        if (__DEV__) {
          console.warn('AI ranking not available:', err);
        }
      }
      if (isMountedRef.current) {
        setApplicants(apps);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Failed to load applicants:', error);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadApplicants();
    if (isMountedRef.current) {
      setRefreshing(false);
    }
  };

  const handleUpdateStatus = (applicantId: string, status: 'ACCEPTED' | 'REJECTED', name: string) => {
    const actionLabel = status === 'ACCEPTED' ? 'nhận (tuyển)' : 'từ chối';
    Alert.alert(
      'Xác nhận hành động',
      `Bạn có chắc chắn muốn ${actionLabel} ứng viên ${name}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            if (isMountedRef.current) {
              setActionInProgressId(applicantId);
            }
            try {
              await applicationService.updateApplicationStatus(applicantId, status);
              Alert.alert('Thành công', `Đã cập nhật trạng thái ứng viên.`);
              loadApplicants();
            } catch (err: any) {
              const msg = err.response?.data?.message || err.message || 'Cập nhật trạng thái thất bại.';
              Alert.alert('Lỗi', msg);
            } finally {
              if (isMountedRef.current) {
                setActionInProgressId(null);
              }
            }
          },
        },
      ]
    );
  };

  const filteredApplicants = useMemo(() => {
    if (activeTab === 'ALL') return applicants;
    return applicants.filter(app => app.status === activeTab);
  }, [applicants, activeTab]);

  if (loading) return <LoadingSpinner fullScreen message="Đang tải danh sách..." />;

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={HomeTheme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Danh sách ứng viên</Text>
          <Text style={styles.headerSubtitle}>Tổng số: {applicants.length} ứng viên</Text>
        </View>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Tabs Filter */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'ALL' && styles.activeTab]}
            onPress={() => setActiveTab('ALL')}
          >
            <Text style={[styles.tabText, activeTab === 'ALL' && styles.activeTabText]}>Tất cả</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'PENDING' && styles.activeTab]}
            onPress={() => setActiveTab('PENDING')}
          >
            <Text style={[styles.tabText, activeTab === 'PENDING' && styles.activeTabText]}>Chờ duyệt</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'ACCEPTED' && styles.activeTab]}
            onPress={() => setActiveTab('ACCEPTED')}
          >
            <Text style={[styles.tabText, activeTab === 'ACCEPTED' && styles.activeTabText]}>Đã nhận</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'REJECTED' && styles.activeTab]}
            onPress={() => setActiveTab('REJECTED')}
          >
            <Text style={[styles.tabText, activeTab === 'REJECTED' && styles.activeTabText]}>Đã từ chối</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* List content */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredApplicants.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={HomeTheme.colors.textMuted} />
            <Text style={styles.emptyTitle}>Chưa có ứng viên nào</Text>
            <Text style={styles.emptySubtitle}>Không tìm thấy ứng viên trong mục này.</Text>
          </View>
        ) : (
          filteredApplicants.map((applicant, index) => {
            const hasScore = applicant.score !== undefined;
            return (
              <View key={applicant.id} style={styles.applicantCard}>
                {/* AI Score Badge if present */}
                {hasScore && (
                  <View style={styles.scoreBadge}>
                    <Ionicons name="sparkles" size={12} color="#FFFFFF" />
                    <Text style={styles.scoreText}>AI Phù hợp {(applicant.score! * 100).toFixed(0)}%</Text>
                  </View>
                )}

                <View style={styles.cardHeader}>
                  <TouchableOpacity
                    onPress={() => {
                      if (applicant.taskerId) {
                        navigation.navigate('PublicProfile', { userId: applicant.taskerId });
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <UserAvatar
                      name={applicant.taskerName || 'N/A'}
                      avatarUrl={applicant.taskerAvatar}
                      size={44}
                    />
                  </TouchableOpacity>
                  <View style={styles.applicantMeta}>
                    <View style={styles.nameRow}>
                      <TouchableOpacity
                        onPress={() => {
                          if (applicant.taskerId) {
                            navigation.navigate('PublicProfile', { userId: applicant.taskerId });
                          }
                        }}
                        activeOpacity={0.7}
                        style={{ flex: 1 }}
                      >
                        <Text style={styles.applicantName}>{applicant.taskerName || 'Người ứng tuyển'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.chatBtn}
                        onPress={() =>
                          navigation.navigate('ChatDetail', {
                            otherUserId: applicant.taskerId,
                            otherUserName: applicant.taskerName || 'Người ứng tuyển',
                            otherUserAvatar: null,
                          })
                        }
                      >
                        <Ionicons name="chatbubble-ellipses-outline" size={16} color={HomeTheme.colors.primary} />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.subMetaRow}>
                      <Ionicons name="star" size={13} color="#F59E0B" />
                      <Text style={styles.ratingText}>
                        {applicant.taskerRating !== undefined && applicant.taskerRating > 0
                          ? applicant.taskerRating.toFixed(1)
                          : '5.0'}
                      </Text>
                      <View style={styles.dotSeparator} />
                      <Text style={styles.timeText}>
                        Ứng tuyển lúc: {formatDate(applicant.createdAt)}
                      </Text>
                    </View>
                  </View>
                </View>

                {applicant.message && (
                  <View style={styles.messageBox}>
                    <Text style={styles.messageText}>"{applicant.message}"</Text>
                  </View>
                )}

                {/* Actions Row */}
                <View style={styles.cardActions}>
                  {applicant.status === 'PENDING' ? (
                    <>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.btnReject]}
                        disabled={actionInProgressId === applicant.id}
                        onPress={() => handleUpdateStatus(applicant.id, 'REJECTED', applicant.taskerName || '')}
                      >
                        <Text style={styles.btnRejectText}>Từ chối</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.btnAccept]}
                        disabled={actionInProgressId === applicant.id}
                        onPress={() => handleUpdateStatus(applicant.id, 'ACCEPTED', applicant.taskerName || '')}
                      >
                        <Text style={styles.btnAcceptText}>Duyệt nhận</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <View style={styles.statusDisplayRow}>
                      <Ionicons
                        name={applicant.status === 'ACCEPTED' ? 'checkmark-circle' : 'close-circle'}
                        size={16}
                        color={applicant.status === 'ACCEPTED' ? HomeTheme.colors.success : HomeTheme.colors.error}
                      />
                      <Text
                        style={[
                          styles.statusDisplayText,
                          { color: applicant.status === 'ACCEPTED' ? HomeTheme.colors.success : HomeTheme.colors.error },
                        ]}
                      >
                        {applicant.status === 'ACCEPTED' ? 'Đã duyệt nhận' : 'Đã từ chối'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: HomeTheme.colors.page,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: HomeTheme.colors.border,
  },
  backBtn: {
    padding: 4,
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: HomeTheme.colors.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: HomeTheme.colors.textSecondary,
    marginTop: 2,
  },
  headerPlaceholder: {
    width: 32,
  },
  tabsWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: HomeTheme.colors.border,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: HomeTheme.radius.small,
    backgroundColor: HomeTheme.colors.page,
    borderWidth: 1,
    borderColor: HomeTheme.colors.border,
  },
  activeTab: {
    backgroundColor: HomeTheme.colors.primarySoft,
    borderColor: HomeTheme.colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: HomeTheme.colors.textSecondary,
  },
  activeTabText: {
    color: HomeTheme.colors.primary,
  },
  listContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: HomeTheme.colors.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: HomeTheme.colors.textSecondary,
    textAlign: 'center',
  },
  applicantCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: HomeTheme.radius.medium,
    padding: 16,
    borderWidth: 1,
    borderColor: HomeTheme.colors.border,
    position: 'relative',
    overflow: 'hidden',
  },
  scoreBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#34A853',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: HomeTheme.colors.page,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: HomeTheme.colors.border,
    marginRight: 12,
  },
  applicantMeta: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 100, // Leave room for scoreBadge
  },
  applicantName: {
    fontSize: 15,
    fontWeight: '800',
    color: HomeTheme.colors.text,
  },
  chatBtn: {
    padding: 4,
    marginLeft: 6,
  },
  subMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: HomeTheme.colors.textSecondary,
    fontWeight: '700',
    marginLeft: 4,
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: HomeTheme.colors.textMuted,
    marginHorizontal: 8,
  },
  timeText: {
    fontSize: 11,
    color: HomeTheme.colors.textSecondary,
  },
  messageBox: {
    backgroundColor: HomeTheme.colors.page,
    padding: 10,
    borderRadius: HomeTheme.radius.small,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: HomeTheme.colors.border,
  },
  messageText: {
    fontSize: 13,
    color: HomeTheme.colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: HomeTheme.colors.divider,
    paddingTop: 12,
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  btnReject: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: HomeTheme.colors.border,
  },
  btnRejectText: {
    color: HomeTheme.colors.textSecondary,
    fontWeight: '700',
    fontSize: 13,
  },
  btnAccept: {
    backgroundColor: HomeTheme.colors.primary,
  },
  btnAcceptText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  statusDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDisplayText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
