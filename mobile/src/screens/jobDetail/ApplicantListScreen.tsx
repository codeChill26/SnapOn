import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { UserAvatar } from '../../components/common/UserAvatar';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { applicationService } from '../../services/applicationService';
import { matchingService } from '../../services/matchingService';
import { TaskApplication } from '../../types';
import { formatCurrency } from '../../utils/format';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { AppColors } from '../../theme';

type ApplicantListRouteProp = RouteProp<RootStackParamList, 'ApplicantList'>;

export const ApplicantListScreen: React.FC = () => {
  const route = useRoute<ApplicantListRouteProp>();
  const navigation = useNavigation<any>();
  const [applicants, setApplicants] = useState<TaskApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    loadApplicants();
  }, []);

  const loadApplicants = async () => {
    try {
      let apps = await applicationService.getApplicationsByTask(route.params.taskId);
      try {
        const ranked = await matchingService.getRankedApplications(route.params.taskId);
        if (ranked && ranked.length > 0) {
          apps = ranked;
        }
      } catch {
        // ranking not available
      }
      setApplicants(apps);
    } catch (error) {
      console.error('Failed to load applicants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualMatch = async (applicantId?: string) => {
    const targetId = applicantId || selectedId;
    if (!targetId) {
      Alert.alert('Lỗi', 'Vui lòng chọn một ứng viên');
      return;
    }
    Alert.alert(
      'Xác nhận chọn ứng viên',
      'Bạn có chắc chắn muốn chọn ứng viên này cho công việc không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            setConfirming(true);
            try {
              await matchingService.manualMatch(route.params.taskId, targetId);
              Alert.alert('Thành công', 'Đã ghép ứng viên thành công!', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (error: any) {
              Alert.alert('Lỗi', error.message || 'Ghép ứng viên thất bại');
            } finally {
              setConfirming(false);
            }
          },
        },
      ]
    );
  };

  if (loading) return <LoadingSpinner fullScreen message="Đang tải ứng viên..." />;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* ── HEADER ── */}
      <LinearGradient
        colors={[AppColors.background.secondary, AppColors.background.primary]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={AppColors.text.primary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Danh sách ứng viên</Text>
          <View style={styles.headerCountBadge}>
            <Text style={styles.headerCountText}>{applicants.length}</Text>
          </View>
        </View>

        {/* AI ranked indicator */}
        <View style={styles.aiTag}>
          <Ionicons name="sparkles-outline" size={12} color={AppColors.brand.primary} />
          <Text style={styles.aiTagText}>AI xếp hạng</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {applicants.length === 0 ? (
          /* Empty state */
          <View style={styles.emptyWrapper}>
            <View style={styles.emptyIconRing}>
              <Ionicons name="people-outline" size={36} color={AppColors.text.disabled} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có ứng viên</Text>
            <Text style={styles.emptyDesc}>
              Chưa có ai ứng tuyển công việc này. Hãy chờ thêm hoặc thử tính năng tự động ghép.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.listHint}>
              Nhấn vào card để chọn · Nhấn nút để xác nhận ghép
            </Text>

            {applicants.map((applicant, index) => {
              const isSelected = selectedId === applicant.id;
              const isTopMatch = index === 0 && applicant.score !== undefined;
              return (
                <TouchableOpacity
                  key={applicant.id}
                  onPress={() => setSelectedId(isSelected ? null : applicant.id)}
                  activeOpacity={0.88}
                  style={[
                    styles.cardWrapper,
                    isSelected && styles.cardWrapperSelected,
                  ]}
                >
                  {/* Top match ribbon */}
                  {isTopMatch && (
                    <View style={styles.topMatchRibbon}>
                      <Ionicons name="trophy-outline" size={11} color="#FFFFFF" />
                      <Text style={styles.topMatchText}>Phù hợp nhất</Text>
                    </View>
                  )}

                  {/* Rank number */}
                  <View style={[styles.rankBadge, isSelected && styles.rankBadgeSelected]}>
                    <Text style={[styles.rankText, isSelected && styles.rankTextSelected]}>
                      #{index + 1}
                    </Text>
                  </View>

                  {/* Main row */}
                  <View style={styles.cardMain}>
                    {/* Avatar */}
                    <UserAvatar
                      name={applicant.taskerName || 'N/A'}
                      avatarUrl={applicant.taskerAvatar}
                      size={50}
                    />

                    {/* Info */}
                    <View style={styles.applicantInfo}>
                      <View style={styles.nameRow}>
                        <Text style={styles.applicantName} numberOfLines={1}>
                          {applicant.taskerName || 'N/A'}
                        </Text>

                        {/* Chat button */}
                        <TouchableOpacity
                          onPress={() =>
                            navigation.navigate('ChatDetail', {
                              otherUserId: applicant.taskerId,
                              otherUserName: applicant.taskerName || 'N/A',
                              otherUserAvatar: applicant.taskerAvatar,
                            })
                          }
                          style={styles.chatBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="chatbubble-ellipses" size={15} color={AppColors.brand.primary} />
                        </TouchableOpacity>
                      </View>

                      {/* Rating & ETA */}
                      <View style={styles.ratingRow}>
                        <Ionicons name="star" size={13} color={AppColors.status.warning} />
                        <Text style={styles.ratingText}>
                          {applicant.taskerRating?.toFixed(1) ?? 'N/A'}
                        </Text>

                        <View style={styles.etaBadge}>
                          <Ionicons name="time-outline" size={11} color={AppColors.text.muted} />
                          <Text style={styles.etaText}>
                            {applicant.estimatedTime || 'N/A'}
                          </Text>
                        </View>

                        {applicant.score !== undefined && (
                          <View style={styles.scoreBadge}>
                            <Text style={styles.scoreText}>
                              AI {(applicant.score * 100).toFixed(0)}%
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Message */}
                      {applicant.message ? (
                        <Text style={styles.messageText} numberOfLines={2}>
                          "{applicant.message}"
                        </Text>
                      ) : null}
                    </View>

                    {/* Bid price */}
                    <View style={styles.bidBlock}>
                      <Text style={styles.bidAmount}>{formatCurrency(applicant.bidPrice)}</Text>
                      <Text style={styles.bidLabel}>Đề xuất</Text>
                    </View>
                  </View>

                  {/* Select indicator */}
                  {isSelected && (
                    <View style={styles.selectedIndicator}>
                      <Ionicons name="checkmark-circle" size={18} color={AppColors.status.success} />
                      <Text style={styles.selectedText}>Đã chọn · Nhấn xác nhận để ghép</Text>
                    </View>
                  )}

                  {/* Quick select button */}
                  <TouchableOpacity
                    style={[
                      styles.quickSelectBtn,
                      isSelected && styles.quickSelectBtnActive,
                    ]}
                    onPress={() => handleManualMatch(applicant.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isSelected ? 'checkmark-done' : 'person-add-outline'}
                      size={14}
                      color={isSelected ? '#FFFFFF' : AppColors.brand.primary}
                    />
                    <Text
                      style={[
                        styles.quickSelectText,
                        isSelected && styles.quickSelectTextActive,
                      ]}
                    >
                      {isSelected ? 'Xác nhận ghép' : 'Chọn ứng viên này'}
                    </Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* ── FLOATING CONFIRM BAR ── */}
      {selectedId && (
        <View style={styles.floatingBar}>
          <View style={styles.floatingInfo}>
            <Ionicons name="person-circle-outline" size={20} color={AppColors.brand.primary} />
            <Text style={styles.floatingInfoText}>1 ứng viên đã được chọn</Text>
          </View>
          <Button
            title={confirming ? 'Đang ghép...' : 'Xác nhận ghép'}
            onPress={() => handleManualMatch()}
            loading={confirming}
            size="md"
            style={styles.floatingBtn}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AppColors.background.primary,
  },

  /* ── HEADER ── */
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border.subtle,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.surface.glass,
    borderWidth: 1,
    borderColor: AppColors.border.subtle,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: AppColors.text.primary,
  },
  headerCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: AppColors.brand.primarySoft,
  },
  headerCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.brand.primary,
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 107, 53, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.25)',
  },
  aiTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.brand.primary,
  },

  /* ── LIST ── */
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
    gap: 12,
  },
  listHint: {
    fontSize: 11,
    fontWeight: '500',
    color: AppColors.text.disabled,
    textAlign: 'center',
    marginBottom: 4,
  },

  /* ── EMPTY STATE ── */
  emptyWrapper: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 14,
  },
  emptyIconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.surface.glass,
    borderWidth: 1,
    borderColor: AppColors.border.subtle,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: AppColors.text.primary,
  },
  emptyDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: AppColors.text.muted,
    textAlign: 'center',
    paddingHorizontal: 24,
  },

  /* ── APPLICANT CARD ── */
  cardWrapper: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: AppColors.surface.glass,
    borderWidth: 1.5,
    borderColor: AppColors.border.subtle,
    overflow: 'hidden',
  },
  cardWrapperSelected: {
    borderColor: AppColors.status.success,
    backgroundColor: 'rgba(34, 197, 94, 0.06)',
  },

  /* Top match ribbon */
  topMatchRibbon: {
    position: 'absolute',
    top: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomRightRadius: 12,
    backgroundColor: AppColors.brand.primary,
  },
  topMatchText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  /* Rank badge */
  rankBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.surface.subtle,
    borderWidth: 1,
    borderColor: AppColors.border.subtle,
  },
  rankBadgeSelected: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: AppColors.status.success,
  },
  rankText: {
    fontSize: 11,
    fontWeight: '800',
    color: AppColors.text.muted,
  },
  rankTextSelected: {
    color: AppColors.status.success,
  },

  /* Main content row */
  cardMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 12,
  },
  applicantInfo: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  applicantName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: AppColors.text.primary,
  },
  chatBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.brand.primarySoft,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.text.secondary,
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  etaText: {
    fontSize: 10,
    fontWeight: '600',
    color: AppColors.text.muted,
  },
  scoreBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
  },
  scoreText: {
    fontSize: 10,
    fontWeight: '800',
    color: AppColors.brand.primary,
  },
  messageText: {
    fontSize: 12,
    lineHeight: 17,
    color: AppColors.text.muted,
    fontStyle: 'italic',
    marginTop: 2,
  },

  /* Bid block */
  bidBlock: {
    alignItems: 'flex-end',
    paddingTop: 2,
    minWidth: 80,
  },
  bidAmount: {
    fontSize: 15,
    fontWeight: '900',
    color: AppColors.brand.primary,
  },
  bidLabel: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '600',
    color: AppColors.text.disabled,
    letterSpacing: 0.3,
  },

  /* Selected indicator */
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(34, 197, 94, 0.10)',
  },
  selectedText: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.status.success,
  },

  /* Quick select button */
  quickSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: AppColors.brand.primary,
    backgroundColor: 'transparent',
  },
  quickSelectBtnActive: {
    backgroundColor: AppColors.brand.primary,
    borderColor: AppColors.brand.primary,
  },
  quickSelectText: {
    fontSize: 13,
    fontWeight: '700',
    color: AppColors.brand.primary,
  },
  quickSelectTextActive: {
    color: '#FFFFFF',
  },

  /* ── FLOATING CONFIRM BAR ── */
  floatingBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    backgroundColor: AppColors.background.elevated,
    borderTopWidth: 1,
    borderTopColor: AppColors.border.subtle,
  },
  floatingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  floatingInfoText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.text.secondary,
  },
  floatingBtn: {
    minWidth: 140,
  },
});
