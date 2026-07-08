import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LoadingState } from '../../components/common/LoadingState';
import { formatCurrency, getStatusLabel, formatDate } from '../../utils/format';
import { getCategoryById } from '../../constants/categories';
import { ApplyConfirmationModal } from '../../components/job-detail/ApplyConfirmationModal';
import { CloseRecruitmentModal } from '../../components/job-detail/CloseRecruitmentModal';
import { UserAvatar } from '../../components/common/UserAvatar';
import { useTheme } from '../../theme';
import { useJobDetail } from './hooks/useJobDetail';
import { useAppNavigation } from '../../hooks/useAppNavigation';

const HERO_HEIGHT = 220;

const WORK_MODES = [
  { label: 'Tại chỗ (Onsite)', value: 'ONSITE' },
  { label: 'Từ xa (Remote)', value: 'REMOTE' },
  { label: 'Theo thỏa thuận', value: 'NEGOTIABLE' },
];

const EXPERIENCE_LEVELS = [
  { label: 'Không yêu cầu kinh nghiệm', value: 'NO_REQUIREMENT' },
  { label: 'Chưa có kinh nghiệm', value: 'NO_EXPERIENCE' },
  { label: 'Dưới 1 năm', value: 'UNDER_1_YEAR' },
  { label: '1–2 năm', value: 'ONE_TO_TWO_YEARS' },
  { label: '3–5 năm', value: 'THREE_TO_FIVE_YEARS' },
  { label: 'Trên 5 năm', value: 'OVER_FIVE_YEARS' },
];

const EDUCATION_LEVELS = [
  { label: 'Không yêu cầu bằng cấp', value: 'NO_REQUIREMENT' },
  { label: 'Trung học cơ sở', value: 'SECONDARY_SCHOOL' },
  { label: 'Trung học phổ thông', value: 'HIGH_SCHOOL' },
  { label: 'Trung cấp nghề', value: 'VOCATIONAL' },
  { label: 'Cao đẳng', value: 'COLLEGE' },
  { label: 'Đại học', value: 'UNIVERSITY' },
  { label: 'Sau đại học', value: 'POSTGRADUATE' },
  { label: 'Chứng chỉ chuyên môn', value: 'CERTIFICATE' },
];

const GENDER_REQUIREMENTS = [
  { label: 'Không yêu cầu giới tính', value: 'NO_REQUIREMENT' },
  { label: 'Nam', value: 'MALE' },
  { label: 'Nữ', value: 'FEMALE' },
  { label: 'Khác', value: 'OTHER' },
];

export const JobDetailScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useAppNavigation();
  const { width } = useWindowDimensions();

  const {
    state: {
      task,
      applications,
      userApplication,
      loading,
      refreshing,
      activeImageIndex,
      workerHasActiveJob,
      showApplyModal,
      showCloseModal,
      isPoster,
      activeWorkers,
    },
    actions: {
      setActiveImageIndex,
      setShowApplyModal,
      setShowCloseModal,
      onRefresh,
      handleApplyConfirm,
      handleWithdraw,
      handleCloseConfirm,
      handleDeleteTask,
      handleAcceptAssignment,
      handleDeclineAssignment,
      handleCompleteAssignment,
      handleCancelAssignment,
    },
  } = useJobDetail();

  if (loading) {
    return <LoadingState fullScreen message="Đang tải chi tiết..." />;
  }

  if (!task) {
    return <LoadingState fullScreen message="Không tìm thấy công việc" />;
  }

  const category = getCategoryById(task.categoryId);
  const subcategoryName = task.subcategory?.name || (task.skills && task.skills[0]?.name) || 'Chưa phân loại';
  const deadlineText = task.applicationDeadline ? formatDate(task.applicationDeadline) : 'Không giới hạn thời gian';

  const renderCarousel = () => {
    const images = task.images || [];
    if (images.length === 0) {
      return (
        <View style={[styles.fallbackHeader, { backgroundColor: theme.colors.brand.primarySoft, borderColor: theme.colors.border.subtle }]}>
          <View style={styles.fallbackCircle} />
          <Ionicons name={(category?.icon as any) || 'briefcase'} size={40} color={theme.colors.brand.primary} />
          <Text style={[styles.fallbackText, { color: theme.colors.brand.primary, marginTop: theme.spacing.sm }]}>
            {category?.name || 'SnapOn Job'}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.carouselWrapper}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setActiveImageIndex(index);
          }}
        >
          {images.map((img, i) => (
            <Image key={i} source={{ uri: img }} style={[styles.carouselImage, { width }]} />
          ))}
        </ScrollView>
        {images.length > 1 && (
          <View style={styles.carouselIndicator}>
            <Text style={styles.carouselIndicatorText}>
              {activeImageIndex + 1}/{images.length}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeContainer, { backgroundColor: theme.colors.background.primary }]}>
      {/* Custom Header */}
      <View
        style={[
          styles.customHeader,
          {
            backgroundColor: theme.colors.background.secondary,
            borderBottomColor: theme.colors.border.subtle,
            paddingHorizontal: theme.spacing.lg,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          accessibilityHint="Quay lại màn hình trước đó"
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]} numberOfLines={1}>
          Chi tiết công việc
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.brand.primary}
          />
        }
      >
        {renderCarousel()}

        <View style={[styles.mainContainer, { padding: theme.spacing.lg, gap: theme.spacing.lg }]}>
          {/* Main Info Box */}
          <View
            style={[
              styles.infoBox,
              {
                backgroundColor: theme.colors.background.secondary,
                borderRadius: theme.radius.medium,
                borderColor: theme.colors.border.subtle,
                padding: theme.spacing.lg,
              },
            ]}
          >
            <View style={[styles.tagRow, { marginBottom: theme.spacing.md }]}>
              <View
                style={[
                  styles.postTypeBadge,
                  task.postType === 'SERVICE_OFFER'
                    ? { backgroundColor: theme.colors.status.successSoft || '#E6F4EA' }
                    : { backgroundColor: theme.colors.brand.primarySoft },
                ]}
              >
                <Text
                  style={[
                    styles.postTypeBadgeText,
                    task.postType === 'SERVICE_OFFER'
                      ? { color: theme.colors.status.success }
                      : { color: theme.colors.brand.primary },
                  ]}
                >
                  {task.postType === 'SERVICE_OFFER' ? 'Thuê tôi' : 'Tuyển người'}
                </Text>
              </View>

              <View style={[styles.statusBadge, { backgroundColor: theme.colors.background.primary }]}>
                <Text style={[styles.statusBadgeText, { color: theme.colors.text.secondary }]}>
                  {getStatusLabel(task.status)}
                </Text>
              </View>
            </View>

            <Text
              style={[
                styles.taskTitle,
                { color: theme.colors.text.primary, marginBottom: theme.spacing.sm },
              ]}
            >
              {task.title}
            </Text>

            <View
              style={[
                styles.priceContainer,
                {
                  backgroundColor: theme.colors.brand.primarySoft,
                  padding: theme.spacing.md,
                  borderRadius: theme.radius.small,
                  borderColor: theme.colors.brand.primaryBorder,
                  marginBottom: theme.spacing.md,
                },
              ]}
            >
              <Ionicons name="cash" size={22} color={theme.colors.brand.primary} />
              <Text style={[styles.priceText, { color: theme.colors.brand.primary, marginLeft: theme.spacing.xs }]}>
                {task.budgetMin === task.budgetMax
                  ? formatCurrency(task.budgetMin)
                  : `${formatCurrency(task.budgetMin)} - ${formatCurrency(task.budgetMax)}`}
              </Text>
              {task.salaryUnit && (
                <Text style={[styles.salaryUnitText, { color: theme.colors.text.secondary }]}>
                  {task.salaryUnit === 'PER_JOB'
                    ? ' /việc'
                    : task.salaryUnit === 'PER_HOUR'
                    ? ' /giờ'
                    : task.salaryUnit === 'PER_DAY'
                    ? ' /ngày'
                    : task.salaryUnit === 'PER_MONTH'
                    ? ' /tháng'
                    : ''}
                </Text>
              )}
            </View>

            <Text style={[styles.taskDescription, { color: theme.colors.text.secondary }]}>
              {task.description}
            </Text>
          </View>

          {/* Grid Summary */}
          <View style={styles.gridSummary}>
            {[
              { icon: 'calendar-outline', label: 'Hạn nhận hồ sơ', value: deadlineText },
              {
                icon: 'location-outline',
                label: 'Hình thức làm việc',
                value: WORK_MODES.find((m) => m.value === task.workMode)?.label || 'Onsite',
              },
              { icon: 'construct-outline', label: 'Lĩnh vực cụ thể', value: subcategoryName },
              { icon: 'wallet-outline', label: 'Ngân sách tối đa', value: formatCurrency(task.budgetMax) },
            ].map((card, idx) => (
              <View
                key={idx}
                style={[
                  styles.gridCard,
                  {
                    width: (width - theme.spacing.lg * 2 - 10) / 2,
                    backgroundColor: theme.colors.background.secondary,
                    borderRadius: theme.radius.small,
                    borderColor: theme.colors.border.subtle,
                    padding: theme.spacing.md,
                    gap: theme.spacing.sm,
                  },
                ]}
              >
                <Ionicons name={card.icon as any} size={20} color={theme.colors.brand.primary} />
                <View style={styles.gridCardInfo}>
                  <Text style={[styles.gridCardLabel, { color: theme.colors.text.secondary }]}>
                    {card.label}
                  </Text>
                  <Text style={[styles.gridCardValue, { color: theme.colors.text.primary }]} numberOfLines={1}>
                    {card.value}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Requirements Section */}
          <View
            style={[
              styles.sectionContainer,
              {
                backgroundColor: theme.colors.background.secondary,
                borderRadius: theme.radius.medium,
                borderColor: theme.colors.border.subtle,
                padding: theme.spacing.lg,
              },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.colors.text.primary, marginBottom: theme.spacing.md },
              ]}
            >
              {task.postType === 'SERVICE_OFFER' ? 'Thông tin người cung cấp' : 'Yêu cầu ứng viên'}
            </Text>
            <View style={[styles.table, { borderColor: theme.colors.border.subtle, borderRadius: theme.radius.small }]}>
              {[
                {
                  label: 'Kinh nghiệm',
                  value: EXPERIENCE_LEVELS.find((l) => l.value === task.experienceLevel)?.label || 'Không yêu cầu',
                },
                {
                  label: 'Bằng cấp',
                  value: EDUCATION_LEVELS.find((l) => l.value === task.educationLevel)?.label || 'Không yêu cầu',
                },
                ...(task.postType !== 'SERVICE_OFFER'
                  ? [
                      {
                        label: 'Giới tính',
                        value: GENDER_REQUIREMENTS.find((g) => g.value === task.genderRequirement)?.label || 'Không yêu cầu',
                      },
                      {
                        label: 'Độ tuổi',
                        value: task.minAge && task.maxAge ? `${task.minAge} - ${task.maxAge} tuổi` : 'Không yêu cầu',
                      },
                      {
                        label: 'Chiều cao',
                        value: task.minHeightCm && task.maxHeightCm ? `${task.minHeightCm} - ${task.maxHeightCm} cm` : 'Không yêu cầu',
                      },
                    ]
                  : []),
              ].map((row, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.tableRow,
                    {
                      borderColor: theme.colors.border.subtle,
                      backgroundColor: theme.colors.background.secondary,
                      paddingVertical: theme.spacing.md,
                      paddingHorizontal: theme.spacing.lg,
                    },
                  ]}
                >
                  <Text style={[styles.tableLabel, { color: theme.colors.text.secondary }]}>{row.label}</Text>
                  <Text style={[styles.tableValue, { color: theme.colors.text.primary }]} numberOfLines={1}>
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Owner details card */}
          <View
            style={[
              styles.ownerCard,
              {
                backgroundColor: theme.colors.background.secondary,
                borderRadius: theme.radius.medium,
                borderColor: theme.colors.border.subtle,
                padding: theme.spacing.lg,
              },
            ]}
          >
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
              onPress={() => {
                if (task.posterId) {
                  navigation.navigate('PublicProfile', { userId: task.posterId });
                }
              }}
              activeOpacity={0.7}
              accessibilityLabel={`Xem trang cá nhân của ${task.posterName || 'Nhà tuyển dụng'}`}
              accessibilityRole="button"
            >
              <UserAvatar name={task.posterName || 'N/A'} avatarUrl={task.poster?.avatarUrl} size={44} />
              <View style={[styles.ownerInfo, { marginLeft: theme.spacing.sm }]}>
                <Text style={[styles.ownerName, { color: theme.colors.text.primary }]}>
                  {task.posterName || 'Nhà tuyển dụng'}
                </Text>
                <Text style={[styles.ownerRole, { color: theme.colors.text.secondary, marginTop: 2 }]}>
                  Người đăng bài
                </Text>
              </View>
            </TouchableOpacity>
            {!isPoster && (
              <TouchableOpacity
                style={[styles.chatActionBtn, { backgroundColor: theme.colors.brand.primary, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm }]}
                onPress={() => {
                  navigation.navigate('ChatDetail', {
                    otherUserId: task.posterId,
                    otherUserName: task.posterName || 'Chủ bài đăng',
                    otherUserAvatar: task.poster?.avatarUrl || undefined,
                  });
                }}
                accessibilityRole="button"
                accessibilityLabel="Nhắn tin cho nhà tuyển dụng"
              >
                <Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" />
                <Text style={styles.chatActionText}>Nhắn tin</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Poster Management card */}
          {isPoster && task.postType !== 'SERVICE_OFFER' && (
            <View
              style={[
                styles.managementCard,
                {
                  backgroundColor: theme.colors.background.secondary,
                  borderRadius: theme.radius.medium,
                  borderColor: theme.colors.border.subtle,
                  padding: theme.spacing.lg,
                },
              ]}
            >
              <Text style={[styles.managementTitle, { color: theme.colors.text.primary, marginBottom: theme.spacing.md }]}>
                Thông tin tuyển dụng
              </Text>
              <View style={[styles.statsRow, { gap: theme.spacing.md }]}>
                <View
                  style={[
                    styles.statBox,
                    {
                      backgroundColor: theme.colors.background.primary,
                      borderRadius: theme.radius.small,
                      borderColor: theme.colors.border.subtle,
                      padding: theme.spacing.md,
                    },
                  ]}
                >
                  <Text style={[styles.statNum, { color: theme.colors.brand.primary }]}>{applications.length}</Text>
                  <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>Ứng viên đã nộp</Text>
                </View>
                <View
                  style={[
                    styles.statBox,
                    {
                      backgroundColor: theme.colors.background.primary,
                      borderRadius: theme.radius.small,
                      borderColor: theme.colors.border.subtle,
                      padding: theme.spacing.md,
                    },
                  ]}
                >
                  <Text style={[styles.statNum, { color: theme.colors.brand.primary }]}>{task.peopleNeeded || 1}</Text>
                  <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>Chỉ tiêu tuyển</Text>
                </View>
              </View>
            </View>
          )}

          {/* Active Workers Management List */}
          {isPoster && activeWorkers.length > 0 && (
            <View
              style={[
                styles.sectionContainer,
                {
                  backgroundColor: theme.colors.background.secondary,
                  borderRadius: theme.radius.medium,
                  borderColor: theme.colors.border.subtle,
                  padding: theme.spacing.lg,
                },
              ]}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.text.primary, marginBottom: theme.spacing.md },
                ]}
              >
                Ứng viên đang làm việc
              </Text>
              <View style={[styles.activeWorkersList, { gap: theme.spacing.sm }]}>
                {activeWorkers.map((workerApp) => (
                  <View
                    key={workerApp.id}
                    style={[
                      styles.workerMgmtCard,
                      {
                        borderColor: theme.colors.border.subtle,
                        borderRadius: theme.radius.small,
                        padding: theme.spacing.md,
                        gap: theme.spacing.sm,
                      },
                    ]}
                  >
                    <View style={styles.workerMgmtHeader}>
                      <UserAvatar name={workerApp.taskerName || 'N/A'} avatarUrl={workerApp.taskerAvatar} size={36} />
                      <View style={[styles.workerMgmtInfo, { marginLeft: theme.spacing.sm }]}>
                        <Text style={[styles.workerMgmtName, { color: theme.colors.text.primary }]}>
                          {workerApp.taskerName}
                        </Text>
                        <Text
                          style={[
                            styles.workerMgmtStatus,
                            {
                              color:
                                workerApp.assignmentStatus === 'COMPLETED'
                                  ? theme.colors.status.success
                                  : workerApp.assignmentStatus === 'IN_PROGRESS'
                                  ? theme.colors.status.info
                                  : theme.colors.status.warning,
                            },
                          ]}
                        >
                          {workerApp.assignmentStatus === 'COMPLETED'
                            ? 'Đã hoàn thành'
                            : workerApp.assignmentStatus === 'IN_PROGRESS'
                            ? 'Đang làm việc'
                            : 'Chờ bạn xác nhận'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.workerMgmtActions}>
                      {workerApp.assignmentStatus === 'IN_PROGRESS' && (
                        <TouchableOpacity
                          style={[styles.mgmtBtn, styles.mgmtBtnComplete]}
                          onPress={() => handleCompleteAssignment(workerApp)}
                          accessibilityRole="button"
                          accessibilityLabel="Xác nhận hoàn thành công việc"
                        >
                          <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                          <Text style={styles.mgmtBtnText}>Hoàn tất</Text>
                        </TouchableOpacity>
                      )}
                      {workerApp.assignmentStatus !== 'COMPLETED' && (
                        <TouchableOpacity
                          style={[styles.mgmtBtn, styles.mgmtBtnCancel]}
                          onPress={() => handleCancelAssignment(workerApp)}
                          accessibilityRole="button"
                          accessibilityLabel="Hủy giao việc cho ứng viên này"
                        >
                          <Ionicons name="close-circle-outline" size={16} color="#FFFFFF" />
                          <Text style={styles.mgmtBtnText}>Hủy</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* User Application Status Card (For Workers) */}
          {!isPoster && userApplication && (
            <View style={styles.appStatusCardWrapper}>
              <View
                style={[
                  styles.appStatusCard,
                  {
                    borderRadius: theme.radius.medium,
                    padding: theme.spacing.lg,
                  },
                  userApplication.status === 'ACCEPTED'
                    ? [styles.appStatusAccepted, { backgroundColor: theme.colors.status.successSoft, borderColor: theme.colors.status.success }]
                    : userApplication.status === 'REJECTED'
                    ? [styles.appStatusRejected, { backgroundColor: theme.colors.status.error + '1A', borderColor: theme.colors.status.error }]
                    : [styles.appStatusPending, { backgroundColor: theme.colors.brand.primarySoft, borderColor: theme.colors.brand.primaryBorder }],
                ]}
              >
                <View style={[styles.appStatusHeader, { gap: theme.spacing.sm }]}>
                  <Ionicons
                    name={
                      userApplication.assignmentStatus === 'IN_PROGRESS'
                        ? 'play-circle'
                        : userApplication.assignmentStatus === 'COMPLETED'
                        ? 'checkmark-circle'
                        : userApplication.assignmentStatus === 'CANCELLED'
                        ? 'close-circle'
                        : userApplication.status === 'ACCEPTED'
                        ? 'checkmark-circle'
                        : 'time-outline'
                    }
                    size={20}
                    color={
                      userApplication.assignmentStatus === 'IN_PROGRESS'
                        ? theme.colors.status.info
                        : userApplication.assignmentStatus === 'COMPLETED'
                        ? theme.colors.status.success
                        : userApplication.assignmentStatus === 'CANCELLED'
                        ? theme.colors.status.error
                        : userApplication.status === 'ACCEPTED'
                        ? theme.colors.status.success
                        : userApplication.status === 'REJECTED'
                        ? theme.colors.status.error
                        : theme.colors.brand.primary
                    }
                  />
                  <Text
                    style={[
                      styles.appStatusTitle,
                      {
                        color:
                          userApplication.assignmentStatus === 'IN_PROGRESS'
                            ? theme.colors.status.info
                            : userApplication.assignmentStatus === 'COMPLETED'
                            ? theme.colors.status.success
                            : userApplication.assignmentStatus === 'CANCELLED'
                            ? theme.colors.status.error
                            : userApplication.status === 'ACCEPTED'
                            ? theme.colors.status.success
                            : userApplication.status === 'REJECTED'
                            ? theme.colors.status.error
                            : theme.colors.brand.primary,
                      },
                    ]}
                  >
                    Trạng thái đơn:{' '}
                    {userApplication.assignmentStatus === 'IN_PROGRESS'
                      ? 'Đang làm việc'
                      : userApplication.assignmentStatus === 'COMPLETED'
                      ? 'Đã hoàn tất công việc'
                      : userApplication.assignmentStatus === 'CANCELLED'
                      ? 'Đã hủy công việc'
                      : userApplication.status === 'ACCEPTED'
                      ? 'Được duyệt (Chờ xác nhận)'
                      : userApplication.status === 'REJECTED'
                      ? 'Bị từ chối'
                      : 'Đang chờ phản hồi'}
                  </Text>
                </View>
                {userApplication.message && (
                  <Text style={[styles.appStatusMsg, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
                    Lời nhắn của bạn: "{userApplication.message}"
                  </Text>
                )}
              </View>

              {userApplication.status === 'ACCEPTED' && userApplication.assignmentStatus === 'ASSIGNED' && (
                <View
                  style={[
                    styles.acceptDeclineBanner,
                    {
                      backgroundColor: theme.colors.brand.primarySoft,
                      borderColor: theme.colors.brand.primaryBorder,
                      borderRadius: theme.radius.medium,
                      padding: theme.spacing.lg,
                    },
                  ]}
                >
                  <Text style={[styles.acceptDeclineText, { color: theme.colors.text.primary, marginBottom: theme.spacing.md }]}>
                    Người đăng đã duyệt hồ sơ của bạn. Hãy xác nhận đồng ý nhận việc hoặc từ chối công việc này:
                  </Text>
                  <View style={[styles.acceptDeclineActions, { gap: theme.spacing.md }]}>
                    <TouchableOpacity
                      style={[styles.smallBtn, styles.btnAccept]}
                      onPress={handleAcceptAssignment}
                      accessibilityRole="button"
                      accessibilityLabel="Chấp nhận công việc này"
                    >
                      <Ionicons name="checkmark-sharp" size={16} color="#FFFFFF" />
                      <Text style={styles.smallBtnText}>Chấp nhận</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.smallBtn, styles.btnDecline]}
                      onPress={handleDeclineAssignment}
                      accessibilityRole="button"
                      accessibilityLabel="Từ chối công việc này"
                    >
                      <Ionicons name="close-sharp" size={16} color="#FFFFFF" />
                      <Text style={styles.smallBtnText}>Từ chối</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky Bottom Actions Bar */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.colors.background.secondary,
            borderTopColor: theme.colors.border.subtle,
            paddingBottom: Platform.OS === 'ios' ? 24 : 12,
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.md,
          },
        ]}
      >
        {isPoster ? (
          task.postType === 'SERVICE_OFFER' ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnOutline, { flex: 1, borderRadius: theme.radius.small }]}
                onPress={() => navigation.navigate('MainTabs', { screen: 'PostJob', params: { taskId: task.id } })}
                accessibilityRole="button"
                accessibilityLabel="Chỉnh sửa bài viết"
              >
                <Text style={[styles.btnOutlineText, { color: theme.colors.text.primary }]}>Chỉnh sửa</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnDanger, { flex: 1, borderRadius: theme.radius.small }]}
                onPress={handleDeleteTask}
                accessibilityRole="button"
                accessibilityLabel="Xóa bài viết"
              >
                <Text style={styles.btnDangerText}>Xóa bài</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actionRow}>
              {task.status === 'OPEN' ? (
                <>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnOutline, { borderRadius: theme.radius.small }]}
                    onPress={() => navigation.navigate('MainTabs', { screen: 'PostJob', params: { taskId: task.id } })}
                    accessibilityRole="button"
                    accessibilityLabel="Chỉnh sửa bài viết"
                  >
                    <Text style={[styles.btnOutlineText, { color: theme.colors.text.primary }]}>Chỉnh sửa</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: theme.colors.brand.primary, flex: 2, borderRadius: theme.radius.small }]}
                    onPress={() => navigation.navigate('ApplicantList', { taskId: task.id })}
                    accessibilityRole="button"
                    accessibilityLabel={`Xem danh sách ${applications.length} ứng viên`}
                  >
                    <Text style={styles.btnPrimaryText}>Xem ứng viên ({applications.length})</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btn, styles.btnDangerIcon, { borderRadius: theme.radius.small }]}
                    onPress={() => setShowCloseModal(true)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Đóng tuyển dụng sớm"
                  >
                    <Ionicons name="lock-closed" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={[styles.lockedIndicator, { flex: 1, borderRadius: theme.radius.small, backgroundColor: theme.colors.background.primary }]}>
                    <Ionicons name="lock-closed" size={16} color={theme.colors.text.secondary} />
                    <Text style={[styles.lockedText, { color: theme.colors.text.secondary }]}>Tuyển dụng đã đóng</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnDanger, { borderRadius: theme.radius.small, paddingHorizontal: theme.spacing.lg }]}
                    onPress={handleDeleteTask}
                    accessibilityRole="button"
                    accessibilityLabel="Xóa bài đăng này"
                  >
                    <Text style={styles.btnDangerText}>Xóa bài</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )
        ) : task.postType === 'SERVICE_OFFER' ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: theme.colors.brand.primary, flex: 1, borderRadius: theme.radius.small }]}
              onPress={() => {
                navigation.navigate('ChatDetail', {
                  otherUserId: task.posterId,
                  otherUserName: task.posterName || 'Chủ bài đăng',
                  otherUserAvatar: task.poster?.avatarUrl || undefined,
                });
              }}
              accessibilityRole="button"
              accessibilityLabel="Nhắn tin trao đổi với người cung cấp"
            >
              <Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.btnPrimaryText}>Nhắn tin trao đổi</Text>
            </TouchableOpacity>

            {task.contactPhone ? (
              <TouchableOpacity
                style={[styles.btn, styles.btnOutline, { marginLeft: 10, flex: 0.6, borderRadius: theme.radius.small }]}
                onPress={() => {
                  Linking.openURL(`tel:${task.contactPhone}`);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Gọi điện liên hệ ${task.contactPhone}`}
              >
                <Ionicons name="call" size={18} color={theme.colors.brand.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.btnOutlineText, { color: theme.colors.text.primary }]}>Gọi điện</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View style={styles.actionRow}>
            {task.status === 'OPEN' ? (
              userApplication ? (
                userApplication.status === 'PENDING' ? (
                  <TouchableOpacity
                    style={[styles.btn, styles.btnDanger, { flex: 1, borderRadius: theme.radius.small }]}
                    onPress={handleWithdraw}
                    accessibilityRole="button"
                    accessibilityLabel="Hủy nộp hồ sơ ứng tuyển"
                  >
                    <Text style={styles.btnDangerText}>Hủy ứng tuyển</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.lockedIndicator, { flex: 1, borderRadius: theme.radius.small, backgroundColor: theme.colors.background.primary }]}>
                    <Text style={[styles.lockedText, { color: theme.colors.text.secondary }]}>Không thể thay đổi đơn</Text>
                  </View>
                )
              ) : workerHasActiveJob ? (
                <View
                  style={[
                    styles.lockedIndicator,
                    { flex: 1, borderRadius: theme.radius.small, backgroundColor: theme.dark ? '#1B150A' : '#FFFBEB' },
                  ]}
                >
                  <Ionicons name="warning-outline" size={16} color={theme.colors.status.warning} />
                  <Text style={[styles.lockedText, { color: theme.colors.status.warning, fontSize: 12 }]}>
                    Đã đạt giới hạn 3 việc đang làm
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: theme.colors.brand.primary, flex: 1, borderRadius: theme.radius.small }]}
                  onPress={() => setShowApplyModal(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Ứng tuyển công việc này ngay"
                >
                  <Text style={styles.btnPrimaryText}>Ứng tuyển ngay</Text>
                </TouchableOpacity>
              )
            ) : (
              <View style={[styles.lockedIndicator, { flex: 1, borderRadius: theme.radius.small, backgroundColor: theme.colors.background.primary }]}>
                <Ionicons name="ellipse" size={8} color={theme.colors.text.secondary} style={{ marginRight: 4 }} />
                <Text style={[styles.lockedText, { color: theme.colors.text.secondary }]}>
                  {task.status === 'CLOSED'
                    ? 'Đã đóng tuyển dụng'
                    : task.status === 'EXPIRED'
                    ? 'Đã hết hạn ứng tuyển'
                    : 'Công việc đang triển khai'}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Confirmation Modals */}
      <ApplyConfirmationModal
        visible={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        onConfirm={handleApplyConfirm}
        taskTitle={task.title}
        budgetMin={task.budgetMin}
        budgetMax={task.budgetMax}
        salaryUnit={task.salaryUnit || 'PER_JOB'}
        posterName={task.posterName || 'N/A'}
      />

      <CloseRecruitmentModal
        visible={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        onConfirm={handleCloseConfirm}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
  },
  customHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    flex: 1,
  },
  headerPlaceholder: {
    width: 44,
  },
  scrollContent: {},
  fallbackHeader: {
    height: HERO_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderBottomWidth: 1,
  },
  fallbackCircle: {
    position: 'absolute',
    width: HERO_HEIGHT * 0.8,
    height: HERO_HEIGHT * 0.8,
    borderRadius: (HERO_HEIGHT * 0.8) / 2,
    backgroundColor: 'rgba(255, 107, 53, 0.05)',
  },
  fallbackText: {
    fontSize: 16,
    fontWeight: '700',
  },
  carouselWrapper: {
    height: HERO_HEIGHT,
    position: 'relative',
    backgroundColor: '#000000',
  },
  carouselImage: {
    height: HERO_HEIGHT,
    resizeMode: 'cover',
  },
  carouselIndicator: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  carouselIndicatorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  mainContainer: {
    flexDirection: 'column',
  },
  infoBox: {
    borderWidth: 1,
  },
  tagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  postTypeBadgeText: {
    fontWeight: '700',
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 28,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '800',
  },
  salaryUnitText: {
    fontSize: 13,
  },
  taskDescription: {
    fontSize: 14,
    lineHeight: 22,
  },
  gridSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridCard: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridCardInfo: {
    flex: 1,
  },
  gridCardLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  gridCardValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionContainer: {
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  table: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  tableLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  tableValue: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
    maxWidth: '60%',
  },
  ownerCard: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    fontSize: 15,
    fontWeight: '700',
  },
  ownerRole: {
    fontSize: 12,
  },
  chatActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    minHeight: 44,
  },
  chatActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  managementCard: {
    borderWidth: 1,
  },
  managementTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
  },
  statNum: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
  },
  appStatusCard: {
    borderWidth: 1,
  },
  appStatusPending: {},
  appStatusAccepted: {},
  appStatusRejected: {},
  appStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appStatusTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  appStatusMsg: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  btn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  btnOutline: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  btnOutlineText: {
    fontWeight: '700',
    fontSize: 15,
  },
  btnDanger: {
    backgroundColor: '#EF4444',
  },
  btnDangerText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  btnDangerIcon: {
    width: 48,
    backgroundColor: '#EF4444',
  },
  lockedIndicator: {
    height: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  lockedText: {
    fontSize: 13,
    fontWeight: '600',
  },
  appStatusCardWrapper: {
    gap: 10,
  },
  acceptDeclineBanner: {
    borderWidth: 1,
  },
  acceptDeclineText: {
    fontSize: 13,
    lineHeight: 18,
  },
  acceptDeclineActions: {
    flexDirection: 'row',
  },
  smallBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnAccept: {
    backgroundColor: '#10B981',
  },
  btnDecline: {
    backgroundColor: '#EF4444',
  },
  smallBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  activeWorkersList: {},
  workerMgmtCard: {
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  workerMgmtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workerMgmtInfo: {
    flex: 1,
  },
  workerMgmtName: {
    fontSize: 14,
    fontWeight: '700',
  },
  workerMgmtStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  workerMgmtActions: {
    flexDirection: 'row',
    gap: 8,
  },
  mgmtBtn: {
    flex: 1,
    height: 44,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  mgmtBtnComplete: {
    backgroundColor: '#1E3A8A',
  },
  mgmtBtnCancel: {
    backgroundColor: '#EF4444',
  },
  mgmtBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
