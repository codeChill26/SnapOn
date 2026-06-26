import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { taskService } from '../../services/taskService';
import { applicationService } from '../../services/applicationService';
import { useAuth } from '../../context/AuthContext';
import { Task, TaskApplication } from '../../types';
import { formatCurrency, getStatusLabel, formatDate } from '../../utils/format';
import { getCategoryById } from '../../constants/categories';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { HomeTheme } from '../../components/home/HomeTheme';
import { ApplyConfirmationModal } from '../../components/job-detail/ApplyConfirmationModal';
import { CloseRecruitmentModal } from '../../components/job-detail/CloseRecruitmentModal';
import { UserAvatar } from '../../components/common/UserAvatar';

type JobDetailRouteProp = RouteProp<RootStackParamList, 'JobDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 240;

const WORK_MODES = [
  { label: 'Tại chỗ (Onsite)', value: 'ONSITE' },
  { label: 'Từ xa (Remote)', value: 'REMOTE' },
  { label: 'Theo thỏa thuận', value: 'NEGOTIABLE' },
];

const EMPLOYMENT_TYPES = [
  { label: 'Công việc một lần', value: 'ONE_TIME' },
  { label: 'Bán thời gian', value: 'PART_TIME' },
  { label: 'Toàn thời gian', value: 'FULL_TIME' },
  { label: 'Theo hợp đồng', value: 'CONTRACT' },
  { label: 'Freelance', value: 'FREELANCE' },
  { label: 'Theo ca', value: 'SHIFT' },
  { label: 'Thực tập', value: 'INTERNSHIP' },
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
  const route = useRoute<JobDetailRouteProp>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  
  const [task, setTask] = useState<Task | null>(null);
  const [applications, setApplications] = useState<TaskApplication[]>([]);
  const [userApplication, setUserApplication] = useState<TaskApplication | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
  const [workerHasActiveJob, setWorkerHasActiveJob] = useState<boolean | null>(null);
  
  // Modals Visibility
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [submittingApply, setSubmittingApply] = useState(false);
  const [submittingClose, setSubmittingClose] = useState(false);

  const isPoster = user?.id === task?.posterId;
  const isWorker = user?.role === 'USER' || user?.role === 'worker';
  const category = task ? getCategoryById(task.categoryId) : undefined;

  const activeWorkers = useMemo(() => {
    return applications.filter(
      app => app.assignmentStatus === 'ASSIGNED' || app.assignmentStatus === 'IN_PROGRESS' || app.assignmentStatus === 'COMPLETED'
    );
  }, [applications]);

  useEffect(() => {
    loadTaskDetail();
    const unsubscribe = navigation.addListener('focus', () => {
      loadTaskDetail();
    });
    return unsubscribe;
  }, [navigation, route.params.taskId, user?.id]);

  const loadTaskDetail = async () => {
    try {
      const taskData = await taskService.getTaskById(route.params.taskId);
      setTask(taskData);
      
      // Load applications if poster
      if (user?.id === taskData.posterId) {
        try {
          const apps = await applicationService.getApplicationsByTask(route.params.taskId);
          setApplications(apps);
        } catch (err) {
          if (__DEV__) {
            console.warn('Not authorized to view application list:', err);
          }
        }
      } else if (user?.id) {
        // Load logged in user's application for this task
        try {
          const myApp = await applicationService.getMyApplicationForTask(route.params.taskId);
          setUserApplication(myApp);
        } catch (err) {
          if (__DEV__) {
            console.warn('Failed to fetch user application:', err);
          }
        }
      }

      if (isWorker && user?.id) {
        checkWorkerAvailability();
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('Failed to load task details:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const checkWorkerAvailability = async () => {
    try {
      const myApps = await applicationService.getMyApplications();
      // worker is busy if they have 3 or more jobs IN_PROGRESS
      const inProgressCount = myApps.filter(
        app => app.assignmentStatus === 'IN_PROGRESS'
      ).length;
      setWorkerHasActiveJob(inProgressCount >= 3);
    } catch (err) {
      if (__DEV__) {
        console.warn('Failed to check worker availability:', err);
      }
      setWorkerHasActiveJob(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTaskDetail();
    setRefreshing(false);
  };

  const handleApplyConfirm = async (message: string, bidPrice: number | null) => {
    setShowApplyModal(false);
    setSubmittingApply(true);
    try {
      await applicationService.createApplication(route.params.taskId, {
        bid_price: bidPrice ?? undefined,
        estimated_time: 'Thương lượng',
        message: message || '',
      });
      Alert.alert(
        'Ứng tuyển thành công',
        'Ứng tuyển thành công! Vui lòng bật thông báo cho ứng dụng để nhận thông báo từ người đăng về việc được duyệt hay không.'
      );
      loadTaskDetail();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Ứng tuyển thất bại.';
      Alert.alert('Lỗi', msg);
    } finally {
      setSubmittingApply(false);
    }
  };

  const handleWithdraw = () => {
    const appId = userApplication?.id;
    if (!appId) return;

    Alert.alert(
      'Hủy ứng tuyển',
      'Bạn có chắc chắn muốn rút hồ sơ ứng tuyển công việc này?',
      [
        { text: 'Quay lại', style: 'cancel' },
        {
          text: 'Rút hồ sơ',
          style: 'destructive',
          onPress: async () => {
            try {
              await applicationService.withdrawApplication(appId);
              Alert.alert('Thành công', 'Đã rút hồ sơ ứng tuyển.');
              loadTaskDetail();
            } catch (err: any) {
              Alert.alert('Lỗi', err.message || 'Hủy ứng tuyển thất bại.');
            }
          },
        },
      ]
    );
  };

  const handleCloseConfirm = async (reason: string) => {
    setShowCloseModal(false);
    setSubmittingClose(true);
    try {
      await taskService.closeRecruitment(route.params.taskId);
      Alert.alert('Thành công', 'Đã đóng tuyển dụng sớm cho công việc này.');
      loadTaskDetail();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể đóng tuyển dụng.');
    } finally {
      setSubmittingClose(false);
    }
  };

  const handleDeleteTask = () => {
    if (!task) return;
    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa vĩnh viễn bài đăng này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa bài',
          style: 'destructive',
          onPress: async () => {
            try {
              await taskService.deleteTask(task.id);
              Alert.alert('Thành công', 'Đã xóa bài đăng.');
              navigation.goBack();
            } catch (e: any) {
              Alert.alert('Lỗi', e.message || 'Xóa bài viết thất bại.');
            }
          },
        },
      ]
    );
  };

  if (loading) return <LoadingSpinner fullScreen message="Đang tải chi tiết..." />;
  if (!task) return <LoadingSpinner fullScreen message="Không tìm thấy công việc" />;

  const subcategoryName = task.subcategory?.name || (task.skills && task.skills[0]?.name) || 'Chưa phân loại';
  const deadlineText = task.applicationDeadline ? formatDate(task.applicationDeadline) : 'Không giới hạn thời gian';

  const renderCarousel = () => {
    const images = task.images || [];
    if (images.length === 0) {
      return (
        <View style={styles.fallbackHeader}>
          <View style={styles.fallbackCircle} />
          <Ionicons
            name={(category?.icon as any) || 'briefcase'}
            size={40}
            color={HomeTheme.colors.primary}
          />
          <Text style={styles.fallbackText}>{category?.name || 'SnapOn Job'}</Text>
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
            const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setActiveImageIndex(index);
          }}
        >
          {images.map((img, i) => (
            <Image key={i} source={{ uri: img }} style={styles.carouselImage} />
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
    <SafeAreaView style={styles.safeContainer}>
      {/* Custom Header */}
      <View style={styles.customHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={HomeTheme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Chi tiết công việc</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {renderCarousel()}

        <View style={styles.mainContainer}>
          {/* Main Info Box */}
          <View style={styles.infoBox}>
            <View style={styles.tagRow}>
              <View
                style={[
                  styles.postTypeBadge,
                  task.postType === 'SERVICE_OFFER' ? styles.serviceBadgeBg : styles.recruitmentBadgeBg,
                ]}
              >
                <Text
                  style={[
                    styles.postTypeBadgeText,
                    task.postType === 'SERVICE_OFFER' ? styles.serviceBadgeText : styles.recruitmentBadgeText,
                  ]}
                >
                  {task.postType === 'SERVICE_OFFER' ? 'Thuê tôi' : 'Tuyển người'}
                </Text>
              </View>

              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>{getStatusLabel(task.status)}</Text>
              </View>
            </View>

            <Text style={styles.taskTitle}>{task.title}</Text>
            
            <View style={styles.priceContainer}>
              <Ionicons name="cash" size={22} color={HomeTheme.colors.primary} />
              <Text style={styles.priceText}>
                {task.budgetMin === task.budgetMax
                  ? formatCurrency(task.budgetMin)
                  : `${formatCurrency(task.budgetMin)} - ${formatCurrency(task.budgetMax)}`}
              </Text>
              {task.salaryUnit && (
                <Text style={styles.salaryUnitText}>
                  {task.salaryUnit === 'PER_JOB' ? ' /việc' :
                   task.salaryUnit === 'PER_HOUR' ? ' /giờ' :
                   task.salaryUnit === 'PER_DAY' ? ' /ngày' :
                   task.salaryUnit === 'PER_MONTH' ? ' /tháng' : ''}
                </Text>
              )}
            </View>

            <Text style={styles.taskDescription}>{task.description}</Text>
          </View>

          {/* Grid Summary */}
          <View style={styles.gridSummary}>
            <View style={styles.gridCard}>
              <Ionicons name="calendar-outline" size={20} color={HomeTheme.colors.primary} />
              <View style={styles.gridCardInfo}>
                <Text style={styles.gridCardLabel}>Hạn nhận hồ sơ</Text>
                <Text style={styles.gridCardValue}>{deadlineText}</Text>
              </View>
            </View>

            <View style={styles.gridCard}>
              <Ionicons name="location-outline" size={20} color={HomeTheme.colors.primary} />
              <View style={styles.gridCardInfo}>
                <Text style={styles.gridCardLabel}>Hình thức làm việc</Text>
                <Text style={styles.gridCardValue} numberOfLines={1}>
                  {WORK_MODES.find(m => m.value === task.workMode)?.label || 'Onsite'}
                </Text>
              </View>
            </View>

            <View style={styles.gridCard}>
              <Ionicons name="construct-outline" size={20} color={HomeTheme.colors.primary} />
              <View style={styles.gridCardInfo}>
                <Text style={styles.gridCardLabel}>Lĩnh vực cụ thể</Text>
                <Text style={styles.gridCardValue}>{subcategoryName}</Text>
              </View>
            </View>

            <View style={styles.gridCard}>
              <Ionicons name="wallet-outline" size={20} color={HomeTheme.colors.primary} />
              <View style={styles.gridCardInfo}>
                <Text style={styles.gridCardLabel}>Ngân sách tối đa</Text>
                <Text style={styles.gridCardValue} numberOfLines={1}>{formatCurrency(task.budgetMax)}</Text>
              </View>
            </View>
          </View>

          {/* Requirements Section (Table format) */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>
              {task.postType === 'SERVICE_OFFER' ? 'Thông tin người cung cấp' : 'Yêu cầu ứng viên'}
            </Text>
            <View style={styles.table}>
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Kinh nghiệm</Text>
                <Text style={styles.tableValue}>
                  {EXPERIENCE_LEVELS.find(l => l.value === task.experienceLevel)?.label || 'Không yêu cầu'}
                </Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Bằng cấp</Text>
                <Text style={styles.tableValue}>
                  {EDUCATION_LEVELS.find(l => l.value === task.educationLevel)?.label || 'Không yêu cầu'}
                </Text>
              </View>
              {task.postType !== 'SERVICE_OFFER' && (
                <>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>Giới tính</Text>
                    <Text style={styles.tableValue}>
                      {GENDER_REQUIREMENTS.find(g => g.value === task.genderRequirement)?.label || 'Không yêu cầu'}
                    </Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>Độ tuổi</Text>
                    <Text style={styles.tableValue}>
                      {task.minAge && task.maxAge ? `${task.minAge} - ${task.maxAge} tuổi` : 'Không yêu cầu'}
                    </Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>Chiều cao</Text>
                    <Text style={styles.tableValue}>
                      {task.minHeightCm && task.maxHeightCm ? `${task.minHeightCm} - ${task.maxHeightCm} cm` : 'Không yêu cầu'}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Owner details card */}
          <View style={styles.ownerCard}>
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
              <View style={styles.ownerAvatarWrapper}>
                <UserAvatar
                  name={task.posterName || 'N/A'}
                  avatarUrl={task.poster?.avatarUrl}
                  size={44}
                />
              </View>
              <View style={styles.ownerInfo}>
                <Text style={styles.ownerName}>{task.posterName || 'Nhà tuyển dụng'}</Text>
                <Text style={styles.ownerRole}>Người đăng bài</Text>
              </View>
            </TouchableOpacity>
            {!isPoster && (
              <TouchableOpacity
                style={styles.chatActionBtn}
                onPress={() => {
                  navigation.navigate('ChatDetail', {
                    otherUserId: task.posterId,
                    otherUserName: task.posterName || 'Chủ bài đăng',
                    otherUserAvatar: task.poster?.avatarUrl || null,
                  });
                }}
              >
                <Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" />
                <Text style={styles.chatActionText}>Nhắn tin</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Owner recruitment statistics and details */}
          {isPoster && task.postType !== 'SERVICE_OFFER' && (
            <View style={styles.managementCard}>
              <Text style={styles.managementTitle}>Thông tin tuyển dụng</Text>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{applications.length}</Text>
                  <Text style={styles.statLabel}>Ứng viên đã nộp</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{task.peopleNeeded || 1}</Text>
                  <Text style={styles.statLabel}>Chỉ tiêu cần tuyển</Text>
                </View>
              </View>
            </View>
          )}

          {/* Active Workers Management List (For Posters) */}
          {isPoster && activeWorkers.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Ứng viên đang làm việc</Text>
              <View style={styles.activeWorkersList}>
                {activeWorkers.map((workerApp) => (
                  <View key={workerApp.id} style={styles.workerMgmtCard}>
                    <View style={styles.workerMgmtHeader}>
                      <UserAvatar
                        name={workerApp.taskerName || 'N/A'}
                        avatarUrl={workerApp.taskerAvatar}
                        size={36}
                      />
                      <View style={styles.workerMgmtInfo}>
                        <Text style={styles.workerMgmtName}>{workerApp.taskerName}</Text>
                        <Text
                          style={[
                            styles.workerMgmtStatus,
                            {
                              color:
                                workerApp.assignmentStatus === 'COMPLETED' ? HomeTheme.colors.success :
                                workerApp.assignmentStatus === 'IN_PROGRESS' ? '#1E3A8A' : '#D97706',
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
                          onPress={async () => {
                            Alert.alert(
                              'Hoàn tất công việc',
                              `Bạn xác nhận ứng viên ${workerApp.taskerName} đã hoàn thành công việc?`,
                              [
                                { text: 'Quay lại', style: 'cancel' },
                                {
                                  text: 'Hoàn tất',
                                  onPress: async () => {
                                    try {
                                      if (workerApp.assignmentId) {
                                        await applicationService.completeAssignment(workerApp.assignmentId);
                                        Alert.alert('Thành công', 'Đã đánh dấu hoàn thành công việc.');
                                        loadTaskDetail();
                                      }
                                    } catch (err: any) {
                                      Alert.alert('Lỗi', err.message || 'Xác nhận hoàn thành thất bại.');
                                    }
                                  },
                                },
                              ]
                            );
                          }}
                        >
                          <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                          <Text style={styles.mgmtBtnText}>Hoàn tất</Text>
                        </TouchableOpacity>
                      )}
                      {workerApp.assignmentStatus !== 'COMPLETED' && (
                        <TouchableOpacity
                          style={[styles.mgmtBtn, styles.mgmtBtnCancel]}
                          onPress={async () => {
                            Alert.alert(
                              'Hủy giao việc',
                              `Bạn có chắc chắn muốn hủy giao việc cho ứng viên ${workerApp.taskerName}?`,
                              [
                                { text: 'Quay lại', style: 'cancel' },
                                {
                                  text: 'Hủy giao việc',
                                  style: 'destructive',
                                  onPress: async () => {
                                    try {
                                      if (workerApp.assignmentId) {
                                        await applicationService.cancelAssignment(workerApp.assignmentId);
                                        Alert.alert('Thành công', 'Đã hủy giao việc cho ứng viên.');
                                        loadTaskDetail();
                                      }
                                    } catch (err: any) {
                                      Alert.alert('Lỗi', err.message || 'Hủy giao việc thất bại.');
                                    }
                                  },
                                },
                              ]
                            );
                          }}
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
                  userApplication.status === 'ACCEPTED' ? styles.appStatusAccepted :
                  userApplication.status === 'REJECTED' ? styles.appStatusRejected : styles.appStatusPending,
                ]}
              >
                <View style={styles.appStatusHeader}>
                  <Ionicons
                    name={
                      userApplication.assignmentStatus === 'IN_PROGRESS' ? 'play-circle' :
                      userApplication.assignmentStatus === 'COMPLETED' ? 'checkmark-circle' :
                      userApplication.assignmentStatus === 'CANCELLED' ? 'close-circle' :
                      userApplication.status === 'ACCEPTED' ? 'checkmark-circle' : 'time-outline'
                    }
                    size={20}
                    color={
                      userApplication.assignmentStatus === 'IN_PROGRESS' ? '#1E3A8A' :
                      userApplication.assignmentStatus === 'COMPLETED' ? HomeTheme.colors.success :
                      userApplication.assignmentStatus === 'CANCELLED' ? HomeTheme.colors.error :
                      userApplication.status === 'ACCEPTED' ? HomeTheme.colors.success :
                      userApplication.status === 'REJECTED' ? HomeTheme.colors.error : HomeTheme.colors.primary
                    }
                  />
                  <Text
                    style={[
                      styles.appStatusTitle,
                      {
                        color:
                          userApplication.assignmentStatus === 'IN_PROGRESS' ? '#1E3A8A' :
                          userApplication.assignmentStatus === 'COMPLETED' ? HomeTheme.colors.success :
                          userApplication.assignmentStatus === 'CANCELLED' ? HomeTheme.colors.error :
                          userApplication.status === 'ACCEPTED' ? HomeTheme.colors.success :
                          userApplication.status === 'REJECTED' ? HomeTheme.colors.error : HomeTheme.colors.primary,
                      },
                    ]}
                  >
                    Trạng thái đơn: {
                      userApplication.assignmentStatus === 'IN_PROGRESS' ? 'Đang làm việc' :
                      userApplication.assignmentStatus === 'COMPLETED' ? 'Đã hoàn tất công việc' :
                      userApplication.assignmentStatus === 'CANCELLED' ? 'Đã hủy công việc' :
                      userApplication.status === 'ACCEPTED' ? 'Được duyệt (Chờ bạn xác nhận)' :
                      userApplication.status === 'REJECTED' ? 'Bị từ chối' : 'Đang chờ phản hồi'
                    }
                  </Text>
                </View>
                {userApplication.message && (
                  <Text style={styles.appStatusMsg}>Lời nhắn của bạn: "{userApplication.message}"</Text>
                )}
              </View>

              {userApplication.status === 'ACCEPTED' && userApplication.assignmentStatus === 'ASSIGNED' && (
                <View style={styles.acceptDeclineBanner}>
                  <Text style={styles.acceptDeclineText}>
                    Người đăng đã duyệt hồ sơ của bạn. Hãy xác nhận đồng ý nhận việc hoặc từ chối công việc này:
                  </Text>
                  <View style={styles.acceptDeclineActions}>
                    <TouchableOpacity
                      style={[styles.smallBtn, styles.btnAccept]}
                      onPress={async () => {
                        try {
                          if (userApplication.assignmentId) {
                            await applicationService.acceptAssignment(userApplication.assignmentId);
                            Alert.alert('Thành công', 'Bạn đã đồng ý nhận công việc!');
                            loadTaskDetail();
                          }
                        } catch (err: any) {
                          Alert.alert('Lỗi', err.response?.data?.message || err.message || 'Xác nhận nhận việc thất bại.');
                        }
                      }}
                    >
                      <Ionicons name="checkmark-sharp" size={16} color="#FFFFFF" />
                      <Text style={styles.smallBtnText}>Chấp nhận</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.smallBtn, styles.btnDecline]}
                      onPress={async () => {
                        Alert.alert(
                          'Từ chối nhận việc',
                          'Bạn có chắc chắn muốn từ chối công việc này?',
                          [
                            { text: 'Quay lại', style: 'cancel' },
                            {
                              text: 'Từ chối',
                              style: 'destructive',
                              onPress: async () => {
                                try {
                                  if (userApplication.assignmentId) {
                                    await applicationService.declineAssignment(userApplication.assignmentId);
                                    Alert.alert('Thành công', 'Đã từ chối công việc.');
                                    loadTaskDetail();
                                  }
                                } catch (err: any) {
                                  Alert.alert('Lỗi', err.message || 'Từ chối nhận việc thất bại.');
                                }
                              }
                            }
                          ]
                        );
                      }}
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
      <View style={styles.bottomBar}>
        {isPoster ? (
          task.postType === 'SERVICE_OFFER' ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnOutline, { flex: 1 }]}
                onPress={() => navigation.navigate('MainTabs', { screen: 'PostJob', params: { taskId: task.id } })}
              >
                <Text style={styles.btnOutlineText}>Chỉnh sửa</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnDanger, { flex: 1 }]}
                onPress={handleDeleteTask}
              >
                <Text style={styles.btnDangerText}>Xóa bài</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actionRow}>
              {task.status === 'OPEN' ? (
                <>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnOutline]}
                    onPress={() => navigation.navigate('MainTabs', { screen: 'PostJob', params: { taskId: task.id } })}
                  >
                    <Text style={styles.btnOutlineText}>Chỉnh sửa</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btn, styles.btnPrimary, { flex: 2 }]}
                    onPress={() => navigation.navigate('ApplicantList', { taskId: task.id })}
                  >
                    <Text style={styles.btnPrimaryText}>Xem ứng viên ({applications.length})</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btn, styles.btnDangerIcon]}
                    onPress={() => setShowCloseModal(true)}
                    hitSlop={8}
                  >
                    <Ionicons name="lock-closed" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={[styles.lockedIndicator, { flex: 1 }]}>
                    <Ionicons name="lock-closed" size={16} color={HomeTheme.colors.textSecondary} />
                    <Text style={styles.lockedText}>Tuyển dụng đã đóng</Text>
                  </View>
                  <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={handleDeleteTask}>
                    <Text style={styles.btnDangerText}>Xóa bài</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )
        ) : (
          task.postType === 'SERVICE_OFFER' ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary, { flex: 1 }]}
                onPress={() => {
                  navigation.navigate('ChatDetail', {
                    otherUserId: task.posterId,
                    otherUserName: task.posterName || 'Chủ bài đăng',
                    otherUserAvatar: task.poster?.avatarUrl,
                  });
                }}
              >
                <Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.btnPrimaryText}>Nhắn tin trao đổi</Text>
              </TouchableOpacity>

              {task.contactPhone ? (
                <TouchableOpacity
                  style={[styles.btn, styles.btnOutline, { marginLeft: 10, flex: 0.6 }]}
                  onPress={() => {
                    Linking.openURL(`tel:${task.contactPhone}`);
                  }}
                >
                  <Ionicons name="call" size={18} color={HomeTheme.colors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.btnOutlineText}>Gọi điện</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <View style={styles.actionRow}>
              {task.status === 'OPEN' ? (
                userApplication ? (
                  userApplication.status === 'PENDING' ? (
                    <TouchableOpacity
                      style={[styles.btn, styles.btnDanger, { flex: 1 }]}
                      onPress={handleWithdraw}
                    >
                      <Text style={styles.btnDangerText}>Hủy ứng tuyển</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.lockedIndicator, { flex: 1 }]}>
                      <Text style={styles.lockedText}>Không thể thay đổi đơn ứng tuyển</Text>
                    </View>
                  )
                ) : workerHasActiveJob ? (
                  <View style={[styles.lockedIndicator, { flex: 1, backgroundColor: '#FFFBEB' }]}>
                    <Ionicons name="warning-outline" size={16} color="#B45309" />
                    <Text style={[styles.lockedText, { color: '#B45309', fontSize: 12 }]}>
                      Đã đạt giới hạn 3 việc đang làm
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.btn, styles.btnPrimary, { flex: 1 }]}
                    onPress={() => setShowApplyModal(true)}
                  >
                    <Text style={styles.btnPrimaryText}>Ứng tuyển ngay</Text>
                  </TouchableOpacity>
                )
              ) : (
                <View style={[styles.lockedIndicator, { flex: 1 }]}>
                  <Ionicons name="ellipse" size={8} color={HomeTheme.colors.textSecondary} style={{ marginRight: 4 }} />
                  <Text style={styles.lockedText}>
                    {task.status === 'CLOSED' ? 'Đã đóng tuyển dụng' :
                     task.status === 'EXPIRED' ? 'Đã hết hạn ứng tuyển' : 'Công việc đang triển khai'}
                  </Text>
                </View>
              )}
            </View>
          )
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
    backgroundColor: HomeTheme.colors.page,
  },
  customHeader: {
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: HomeTheme.colors.text,
    textAlign: 'center',
    flex: 1,
  },
  headerPlaceholder: {
    width: 32,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  fallbackHeader: {
    height: HERO_HEIGHT,
    backgroundColor: HomeTheme.colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: HomeTheme.colors.border,
  },
  fallbackCircle: {
    position: 'absolute',
    width: HERO_HEIGHT * 0.8,
    height: HERO_HEIGHT * 0.8,
    borderRadius: (HERO_HEIGHT * 0.8) / 2,
    backgroundColor: 'rgba(255, 107, 53, 0.05)',
  },
  fallbackText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '700',
    color: HomeTheme.colors.primary,
  },
  carouselWrapper: {
    height: HERO_HEIGHT,
    position: 'relative',
    backgroundColor: '#000000',
  },
  carouselImage: {
    width: SCREEN_WIDTH,
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
    padding: 16,
    gap: 16,
  },
  infoBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: HomeTheme.radius.medium,
    padding: 16,
    borderWidth: 1,
    borderColor: HomeTheme.colors.border,
  },
  tagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  recruitmentBadgeBg: {
    backgroundColor: '#FFF1EB',
  },
  recruitmentBadgeText: {
    color: '#FF6B35',
    fontWeight: '700',
    fontSize: 12,
  },
  serviceBadgeBg: {
    backgroundColor: '#E6F4EA',
  },
  serviceBadgeText: {
    color: '#137333',
    fontWeight: '700',
    fontSize: 12,
  },
  statusBadge: {
    backgroundColor: '#F2F4F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    color: HomeTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: HomeTheme.colors.text,
    lineHeight: 28,
    marginBottom: 10,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7F0',
    padding: 12,
    borderRadius: HomeTheme.radius.small,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FFD7B5',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '800',
    color: HomeTheme.colors.primary,
    marginLeft: 6,
  },
  salaryUnitText: {
    fontSize: 13,
    color: HomeTheme.colors.textSecondary,
  },
  taskDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: HomeTheme.colors.textSecondary,
  },
  gridSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridCard: {
    width: (SCREEN_WIDTH - 42) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: HomeTheme.radius.small,
    padding: 12,
    borderWidth: 1,
    borderColor: HomeTheme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gridCardInfo: {
    flex: 1,
  },
  gridCardLabel: {
    fontSize: 11,
    color: HomeTheme.colors.textSecondary,
    marginBottom: 2,
  },
  gridCardValue: {
    fontSize: 13,
    fontWeight: '700',
    color: HomeTheme.colors.text,
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: HomeTheme.radius.medium,
    padding: 16,
    borderWidth: 1,
    borderColor: HomeTheme.colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: HomeTheme.colors.text,
    marginBottom: 14,
  },
  table: {
    borderWidth: 1,
    borderColor: HomeTheme.colors.border,
    borderRadius: HomeTheme.radius.small,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: HomeTheme.colors.border,
    backgroundColor: '#FFFFFF',
  },
  tableLabel: {
    fontSize: 13,
    color: HomeTheme.colors.textSecondary,
    fontWeight: '500',
  },
  tableValue: {
    fontSize: 13,
    color: HomeTheme.colors.text,
    fontWeight: '700',
    textAlign: 'right',
    maxWidth: '60%',
  },
  ownerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: HomeTheme.radius.medium,
    padding: 16,
    borderWidth: 1,
    borderColor: HomeTheme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerAvatarWrapper: {
    marginRight: 12,
  },
  ownerAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F4F7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: HomeTheme.colors.border,
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    fontSize: 15,
    fontWeight: '700',
    color: HomeTheme.colors.text,
  },
  ownerRole: {
    fontSize: 12,
    color: HomeTheme.colors.textSecondary,
    marginTop: 2,
  },
  chatActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: HomeTheme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  chatActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  managementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: HomeTheme.radius.medium,
    padding: 16,
    borderWidth: 1,
    borderColor: HomeTheme.colors.border,
  },
  managementTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: HomeTheme.colors.text,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: HomeTheme.colors.page,
    borderRadius: HomeTheme.radius.small,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: HomeTheme.colors.border,
  },
  statNum: {
    fontSize: 20,
    fontWeight: '800',
    color: HomeTheme.colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: HomeTheme.colors.textSecondary,
  },
  appStatusCard: {
    borderRadius: HomeTheme.radius.medium,
    padding: 14,
    borderWidth: 1,
  },
  appStatusPending: {
    backgroundColor: '#FFF7F0',
    borderColor: '#FFD7B5',
  },
  appStatusAccepted: {
    backgroundColor: '#E6F4EA',
    borderColor: '#A8DAB5',
  },
  appStatusRejected: {
    backgroundColor: '#FCE8E6',
    borderColor: '#F1B0B0',
  },
  appStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appStatusTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  appStatusMsg: {
    fontSize: 13,
    color: HomeTheme.colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: HomeTheme.colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  btn: {
    height: 48,
    borderRadius: HomeTheme.radius.small,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  btnPrimary: {
    backgroundColor: HomeTheme.colors.primary,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: HomeTheme.colors.border,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
  },
  btnOutlineText: {
    color: HomeTheme.colors.text,
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
    borderRadius: HomeTheme.radius.small,
    backgroundColor: HomeTheme.colors.page,
    borderWidth: 1,
    borderColor: HomeTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  lockedText: {
    color: HomeTheme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  appStatusCardWrapper: {
    gap: 10,
  },
  acceptDeclineBanner: {
    backgroundColor: '#FFF7F0',
    borderColor: '#FFD7B5',
    borderWidth: 1,
    borderRadius: HomeTheme.radius.medium,
    padding: 14,
  },
  acceptDeclineText: {
    fontSize: 13,
    color: HomeTheme.colors.text,
    lineHeight: 18,
    marginBottom: 10,
  },
  acceptDeclineActions: {
    flexDirection: 'row',
    gap: 10,
  },
  smallBtn: {
    flex: 1,
    height: 36,
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
  activeWorkersList: {
    gap: 10,
  },
  workerMgmtCard: {
    borderWidth: 1,
    borderColor: HomeTheme.colors.border,
    borderRadius: HomeTheme.radius.small,
    padding: 12,
    backgroundColor: '#F9FAFB',
    gap: 10,
  },
  workerMgmtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  workerMgmtInfo: {
    flex: 1,
  },
  workerMgmtName: {
    fontSize: 14,
    fontWeight: '700',
    color: HomeTheme.colors.text,
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
    height: 32,
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
