

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  TouchableOpacity,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { UserAvatar } from '../../components/common/UserAvatar';
import { CountdownTimer } from '../../components/common/CountdownTimer';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { taskService } from '../../services/taskService';
import { applicationService } from '../../services/applicationService';
import { matchingService } from '../../services/matchingService';
import { useAuth } from '../../context/AuthContext';
import { Task, TaskApplication } from '../../types';
import { formatCurrency, getStatusLabel, formatDate } from '../../utils/format';
import { getCategoryById } from '../../constants/categories';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { AppColors } from '../../theme';
import { getCategoryThemeBySlug } from '../../theme/categoryThemes';

type JobDetailRouteProp = RouteProp<RootStackParamList, 'JobDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = Math.min(
  430,
  Math.max(350, SCREEN_WIDTH * 1.02)
);

export const JobDetailScreen: React.FC = () => {
  const route = useRoute<JobDetailRouteProp>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [applications, setApplications] = useState<TaskApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidPrice, setBidPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  // null = đang kiểm tra, true = worker đang bận job khác, false = rảnh
  const [workerHasActiveJob, setWorkerHasActiveJob] = useState<boolean | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const isPoster = user?.id === task?.posterId;
  const category = task ? getCategoryById(task.categoryId) : undefined;
  const categoryTheme = useMemo(() => {
    return getCategoryThemeBySlug(category?.slug, category?.color);
  }, [category?.slug, category?.color]);

  useEffect(() => {
    loadTaskDetail();

    // Auto reload when screen comes into focus (e.g. after choosing an applicant and going back)
    const unsubscribe = navigation.addListener('focus', () => {
      loadTaskDetail();
      if (user?.role === 'worker') {
        checkWorkerAvailability();
      }
    });

    return unsubscribe;
  }, [navigation, route.params.taskId, user?.role]);

  // Kiểm tra worker có đang nhận job nào không (role = worker, task IN_PROGRESS)
  useEffect(() => {
    if (!user || user.role !== 'worker') return;
    checkWorkerAvailability();
  }, [user?.id, user?.role]);

  const checkWorkerAvailability = async () => {
    setWorkerHasActiveJob(null); // đang check
    try {
      // Thử gọi API my-applications trước, fallback về getMyTasks
      const myApps = await applicationService.getMyApplications();
      const hasActiveAccepted = myApps.some(app => app.status === 'ACCEPTED');
      if (hasActiveAccepted) {
        setWorkerHasActiveJob(true);
        return;
      }
    } catch {
      // API chưa có → fallback
    }
    try {
      const myTasks = await taskService.getMyTasks();
      const isBusy = (myTasks.data || []).some(
        t => t.status === 'IN_PROGRESS' && t.id !== route.params.taskId
      );
      setWorkerHasActiveJob(isBusy);
    } catch {
      setWorkerHasActiveJob(false); // không xác định được → cho phép apply
    }
  };

  const loadTaskDetail = async () => {
    try {
      const taskData = await taskService.getTaskById(route.params.taskId);
      setTask(taskData);
      try {
        const apps = await applicationService.getApplicationsByTask(route.params.taskId);
        setApplications(apps);
      } catch {
        // not poster, can't see apps
      }
    } catch (error) {
      console.error('Failed to load task:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadTaskDetail();
      if (user?.role === 'worker') {
        await checkWorkerAvailability();
      }
    } catch (error) {
      console.error('Failed to refresh task:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleApply = async () => {
    const cleanPrice = bidPrice.replace(/[^0-9]/g, '');
    const numericPrice = parseInt(cleanPrice, 10);

    if (isNaN(numericPrice)) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền đề xuất hợp lệ.');
      return;
    }

    if (numericPrice < (task?.budgetMin || 0) || numericPrice > (task?.budgetMax || 0)) {
      Alert.alert(
        'Lỗi',
        `Giá đề xuất phải từ ${formatCurrency(task?.budgetMin || 0)} đến ${formatCurrency(task?.budgetMax || 0)}`
      );
      return;
    }

    setSubmitting(true);
    try {
      await applicationService.createApplication(route.params.taskId, {
        bid_price: numericPrice,
        estimated_time: '3 ngày',
        message: 'Tôi muốn ứng tuyển công việc này',
      });
      Alert.alert('Thành công', 'Đã gửi đơn ứng tuyển!');
      loadTaskDetail();
    } catch (error: any) {
      const serverMessage = error.response?.data?.message;
      Alert.alert('Lỗi', serverMessage || error.message || 'Ứng tuyển thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoMatch = async () => {
    Alert.alert(
      'Xác nhận',
      'Hệ thống sẽ tự động chọn ứng viên phù hợp nhất?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            try {
              await matchingService.autoMatch(route.params.taskId);
              Alert.alert('Thành công', 'Đã ghép ứng viên thành công!');
              loadTaskDetail();
            } catch (error: any) {
              Alert.alert('Lỗi', error.message || 'Ghép ứng viên thất bại');
            }
          },
        },
      ]
    );
  };

  const handleWithdraw = async () => {
    if (!userApplication?.id) {
      Alert.alert('Lỗi', 'Không tìm thấy đơn ứng tuyển để hủy');
      return;
    }
    Alert.alert(
      'Hủy đề xuất',
      'Bạn có chắc muốn hủy đề xuất này không?',
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Hủy đề xuất',
          style: 'destructive',
          onPress: async () => {
            setWithdrawing(true);
            try {
              await applicationService.withdrawApplication(userApplication.id);
              Alert.alert('Thành công', 'Đã hủy đề xuất');
              loadTaskDetail();
              // Refresh worker availability sau khi hủy
              if (user?.role === 'worker') checkWorkerAvailability();
            } catch (error: any) {
              Alert.alert('Lỗi', error.message || 'Hủy đề xuất thất bại');
            } finally {
              setWithdrawing(false);
            }
          },
        },
      ]
    );
  };

  if (loading) return <LoadingSpinner fullScreen message="Đang tải..." />;
  if (!task) return <LoadingSpinner fullScreen message="Không tìm thấy công việc" />;

  // NOTE: userApplication khai báo 1 lần duy nhất ở đây
  const userApplication = applications.find(app => app.taskerId === user?.id);
  const hasApplied = !!userApplication;
  // Worker được phép apply khi: role=worker, rảnh (workerHasActiveJob===false), chưa apply
  const isWorker = user?.role === 'worker';
  const workerCanApply = isWorker && workerHasActiveJob === false && !isPoster;

  const renderCarousel = () => {
  const images = task.images ?? [];
  const imageCount = images.length;

  if (imageCount === 0) {
      return (
        <View
          style={[
            styles.fallbackBanner,
            {
              backgroundColor:
                categoryTheme.primary,
            },
          ]}
        >
          <View style={styles.fallbackDecorationLarge} />
          <View style={styles.fallbackDecorationSmall} />

          <View style={styles.fallbackOverlay}>
            <View style={styles.fallbackIcon}>
              <Ionicons
                name={
                  (category?.icon as any) ||
                  'briefcase-outline'
                }
                size={42}
                color="#FFFFFF"
              />
            </View>

            <Text style={styles.fallbackCategoryText}>
              {category?.name || 'Công việc'}
            </Text>

            <Text style={styles.fallbackSubtitle}>
              Chưa có hình ảnh công việc
            </Text>

          </View>
        </View>
      );
    }

    // Có ảnh
    return (
      <View style={styles.carouselContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(event) => {
            const offsetX =
              event.nativeEvent.contentOffset.x;

            const nextIndex = Math.round(
              offsetX / SCREEN_WIDTH
            );

            setActiveImageIndex(nextIndex);
          }}
        >
          {images.map((imgUrl, index) => (
            <Image
              key={`${imgUrl}-${index}`}
              source={{ uri: imgUrl }}
              style={styles.carouselImage}
              resizeMode="cover"
            />
          ))}
        </ScrollView>

        {/* Overlay trên ảnh */}
        <View
          pointerEvents="none"
          style={styles.imageOverlayTop}
        />

        <View
          pointerEvents="none"
          style={styles.imageOverlayBottom}
        />

        {/* Số lượng hình ảnh */}
        <View style={styles.imageCounter}>
          <Ionicons
            name="images-outline"
            size={15}
            color="#FFFFFF"
          />

          <Text style={styles.imageCounterText}>
            {activeImageIndex + 1}/{imageCount}
          </Text>
        </View>

        {/* Pagination */}
        {imageCount > 1 && (
          <View style={styles.paginationDots}>
            {images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  activeImageIndex === index &&
                  styles.activeDot,
                ]}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={AppColors.brand.primary}
            colors={[AppColors.brand.primary]}
          />
        }
      >
        {renderCarousel()}

        <View style={styles.body}>
          <Card style={styles.premiumCard} variant="glass">
            <View style={styles.categoryRow}>
              {category && (
                <View style={[styles.categoryBadge, { backgroundColor: categoryTheme.soft }]}>
                  <Ionicons name={category.icon as any} size={14} color={categoryTheme.primary} />
                  <Text style={[styles.categoryBadgeText, { color: categoryTheme.primary }]}>{category.name}</Text>
                </View>
              )}
              <Badge
                label={getStatusLabel(task.status)}
                variant={
                  task.status === 'OPEN' ? 'info' :
                    task.status === 'IN_PROGRESS' ? 'warning' :
                      task.status === 'COMPLETED' ? 'success' : 'error'
                }
              />
            </View>

            <Text style={styles.title}>{task.title}</Text>
            <Text style={styles.description}>{task.description}</Text>

            <View style={styles.premiumDivider} />

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="cash-outline" size={20} color={categoryTheme.primary} />
                <View style={styles.metaContent}>
                  <Text style={styles.metaLabel}>Ngân sách</Text>
                  <Text style={styles.metaValue}>
                    {formatCurrency(task.budgetMin)} - {formatCurrency(task.budgetMax)}
                  </Text>
                </View>
              </View>

              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={20} color={AppColors.brand.primary} />
                <View style={styles.metaContent}>
                  <Text style={styles.metaLabel}>Hạn chót</Text>
                  <CountdownTimer deadlineEnd={task.deadlineEnd} status={task.status} size="md" />
                </View>
              </View>
            </View>

            <View style={styles.premiumDivider} />

            <View style={styles.detailsList}>
              <View style={styles.detailRow}>
                <View style={styles.detailLeft}>
                  <Ionicons name="calendar-outline" size={16} color={AppColors.text.muted} />
                  <Text style={styles.detailLabel}>Ngày đăng</Text>
                </View>
                <Text style={styles.detailValue}>{formatDate(task.createdAt)}</Text>
              </View>

              {task.locations && task.locations.length > 0 && (
                <View style={styles.detailRow}>
                  <View style={styles.detailLeft}>
                    <Ionicons name="location-outline" size={16} color={AppColors.text.muted} />
                    <Text style={styles.detailLabel}>Địa điểm</Text>
                  </View>
                  <Text style={styles.detailValue} numberOfLines={2}>
                    {task.locations[0].address}
                  </Text>
                </View>
              )}
            </View>
          </Card>

          <Card style={styles.posterCard} variant="glass">
            <Text style={styles.cardSectionTitle}>Khách hàng đăng việc</Text>
            <View style={styles.posterInfoRow}>
              <UserAvatar name={task.posterName || 'N/A'} size={44} avatarUrl={task.poster?.avatarUrl} />
              <View style={styles.posterDetails}>
                <Text style={styles.posterNameText}>{task.posterName || 'N/A'}</Text>
                <Text style={styles.posterRoleText}>Chủ dự án</Text>
              </View>
              {!isPoster && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('ChatDetail', {
                    otherUserId: task.posterId,
                    otherUserName: task.posterName || 'N/A',
                    otherUserAvatar: task.poster?.avatarUrl
                  })}
                  style={[styles.premiumChatButton, { backgroundColor: categoryTheme.primary }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.premiumChatButtonText}>Trò chuyện</Text>
                </TouchableOpacity>
              )}
            </View>
          </Card>

          {isPoster && task.status === 'OPEN' && (
            <Card style={styles.hirerSectionCard} variant="glass">
              <View style={styles.premiumSectionHeader}>
                <View>
                  <Text style={styles.sectionTitleText}>Danh sách đề xuất</Text>
                  <Text style={styles.sectionSubtitleText}>Ứng viên quan tâm ({applications.length})</Text>
                </View>
                <Button
                  title="Tự động ghép"
                  onPress={handleAutoMatch}
                  variant="secondary"
                  size="sm"
                  style={styles.autoMatchBtn}
                />
              </View>

              {applications.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={32} color={AppColors.text.disabled} />
                  <Text style={styles.emptyText}>Chưa có ứng viên ứng tuyển</Text>
                </View>
              ) : (
                <Button
                  title="Xem chi tiết ứng viên"
                  onPress={() => navigation.navigate('ApplicantList' as any, { taskId: task.id })}
                  variant="primary"
                  size="md"
                  style={styles.viewApplicantsBtn}
                />
              )}
            </Card>
          )}

          {/* ──────────────────────────────────────────────
               WORKER APPLY SECTION
               Chỉ hiện cho người dùng KHÔNG phải chủ bài đăng
               và task đang OPEN
          ────────────────────────────────────────────── */}

          {/* 1. Người dùng chưa apply + đang kiểm tra availability */}
          {!isPoster && isWorker && task.status === 'OPEN' && !hasApplied && workerHasActiveJob === null && (
            <Card style={styles.applyCard} variant="glass">
              <View style={{ alignItems: 'center', paddingVertical: 20, gap: 10 }}>
                <Ionicons name="hourglass-outline" size={28} color={AppColors.text.muted} />
                <Text style={styles.applyInstruction}>Đang kiểm tra trạng thái của bạn...</Text>
              </View>
            </Card>
          )}

          {/* 2. Worker đang bận job khác – không được apply */}
          {!isPoster && isWorker && task.status === 'OPEN' && !hasApplied && workerHasActiveJob === true && (
            <Card style={styles.workerBusyCard} variant="glass">
              <View style={styles.workerBusyHeader}>
                <View style={styles.workerBusyIcon}>
                  <Ionicons name="lock-closed" size={22} color={AppColors.status.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.workerBusyTitle}>Bạn đang nhận việc khác</Text>
                  <Text style={styles.workerBusyDesc}>
                    Hoàn thành công việc hiện tại trước khi ứng tuyển thêm.
                  </Text>
                </View>
              </View>
              <Button
                title="Xem công việc của tôi"
                onPress={() => navigation.navigate('Activity' as any)}
                variant="secondary"
                size="sm"
                style={{ marginTop: 14 }}
              />
            </Card>
          )}

          {/* 3. Worker rảnh + chưa apply → show apply form */}
          {!isPoster && isWorker && task.status === 'OPEN' && !hasApplied && workerHasActiveJob === false && (
            <Card style={styles.applyCard} variant="glass">
              <Text style={styles.sectionTitleText}>Gửi báo giá ứng tuyển</Text>
              <Text style={styles.applyInstruction}>
                Đề xuất chi phí từ {formatCurrency(task.budgetMin)} đến {formatCurrency(task.budgetMax)}.
              </Text>

              <View style={styles.bidInputWrapper}>
                <Text style={styles.currencyPrefix}>VND</Text>
                <TextInput
                  style={styles.premiumBidInput}
                  placeholder="Nhập số tiền đề xuất"
                  placeholderTextColor={AppColors.text.disabled}
                  value={bidPrice}
                  onChangeText={setBidPrice}
                  keyboardType="numeric"
                />
              </View>

              <Button
                title="Gửi đề xuất ngay"
                onPress={handleApply}
                loading={submitting}
                size="lg"
                style={styles.applySubmitBtn}
              />
            </Card>
          )}

          {/* 4. Đã apply rồi → show status card + nút hủy nếu còn PENDING */}
          {hasApplied && (
            <Card style={styles.appliedStatusCard} variant="glass">
              <View style={styles.appliedHeader}>
                <Ionicons
                  name={userApplication.status === 'ACCEPTED' ? 'checkmark-done-circle' : 'checkmark-circle'}
                  size={24}
                  color={userApplication.status === 'ACCEPTED' ? AppColors.status.success : AppColors.brand.primary}
                />
                <Text style={styles.appliedHeaderTitle}>
                  {userApplication.status === 'ACCEPTED' ? 'Đề xuất được chấp nhận!' : 'Đã nộp báo giá ứng tuyển'}
                </Text>
              </View>
              <View style={styles.appliedContentRow}>
                <View style={styles.appliedContentItem}>
                  <Text style={styles.appliedLabel}>Giá đề xuất</Text>
                  <Text style={styles.appliedValue}>{formatCurrency(userApplication.bidPrice)}</Text>
                </View>
                <View style={styles.appliedContentItem}>
                  <Text style={styles.appliedLabel}>Trạng thái</Text>
                  <Text style={[
                    styles.appliedValue,
                    {
                      color: userApplication.status === 'ACCEPTED'
                        ? AppColors.status.success
                        : userApplication.status === 'REJECTED' || userApplication.status === 'CANCELLED'
                          ? AppColors.status.error
                          : AppColors.brand.primary,
                    },
                  ]}>
                    {userApplication.status === 'ACCEPTED' ? 'Được chấp nhận'
                      : userApplication.status === 'REJECTED' ? 'Bị từ chối'
                      : userApplication.status === 'CANCELLED' ? 'Đã hủy'
                      : 'Đang chờ duyệt'}
                  </Text>
                </View>
              </View>

              {/* Chỉ cho hủy khi đơn còn PENDING và task vẫn OPEN */}
              {userApplication.status === 'PENDING' && task.status === 'OPEN' && (
                <Button
                  title="Hủy đề xuất"
                  onPress={handleWithdraw}
                  loading={withdrawing}
                  variant="secondary"
                  size="sm"
                  style={styles.withdrawBtn}
                />
              )}
            </Card>
          )}

          {/* 5. Task đang IN_PROGRESS */}
          {task.status === 'IN_PROGRESS' && (
            <Card style={styles.inProgressCard}>
              <View style={styles.inProgressHeader}>
                <Ionicons name="flash-outline" size={24} color={AppColors.status.warning} />
                <Text style={styles.inProgressTitle}>Dự án đang triển khai</Text>
              </View>
              <Text style={styles.inProgressDesc}>
                Yêu cầu đã được giao cho cộng tác viên và đang được xử lý. Bạn có thể theo dõi tiến độ trong phần công việc của tôi.
              </Text>
            </Card>
          )}

          {/* 6. Thông tin người làm dự án dành cho chủ bài đăng (Hirer) hoặc chính cộng tác viên đó (Worker) */}
          {(isPoster || user?.id === task.assignedWorker?.id) && (task.status === 'IN_PROGRESS' || task.status === 'COMPLETED') && task.assignedWorker && (
            <LinearGradient
              colors={['rgba(34, 197, 94, 0.12)', 'rgba(9, 14, 23, 0.98)']}
              style={styles.assignedWorkerCard}
            >
              <View style={styles.workerCardHeader}>
                <View style={styles.workerBadge}>
                  <Ionicons name="shield-checkmark" size={14} color={AppColors.status.success} />
                  <Text style={styles.workerBadgeText}>
                    {user?.id === task.assignedWorker.id ? 'BẠN LÀ NGƯỜI THỰC HIỆN' : 'CỘNG TÁC VIÊN ĐÃ CHỌN'}
                  </Text>
                </View>
                <View style={styles.workerStatusTag}>
                  <View style={styles.workerStatusDot} />
                  <Text style={styles.workerStatusText}>Đang làm việc</Text>
                </View>
              </View>

              <View style={styles.workerInfoRow}>
                <UserAvatar 
                  name={task.assignedWorker.name || 'N/A'} 
                  size={52} 
                  avatarUrl={task.assignedWorker.avatarUrl} 
                />
                <View style={styles.workerDetails}>
                  <View style={styles.workerNameContainer}>
                    <Text style={styles.workerNameText}>{task.assignedWorker.name || 'N/A'}</Text>
                    <Ionicons name="checkmark-circle" size={15} color={AppColors.status.info} />
                  </View>
                  <Text style={styles.workerPhoneText}>
                    {task.assignedWorker.phone ? `📞 ${task.assignedWorker.phone}` : 'Chưa cập nhật SĐT'}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    const chatUserId = user?.id === task.assignedWorker?.id ? task.posterId : task.assignedWorker?.id;
                    const chatUserName = user?.id === task.assignedWorker?.id ? task.posterName || 'Chủ dự án' : task.assignedWorker?.name || 'N/A';
                    const chatUserAvatar = user?.id === task.assignedWorker?.id ? task.poster?.avatarUrl : task.assignedWorker?.avatarUrl;
                    
                    navigation.navigate('ChatDetail', {
                      otherUserId: chatUserId,
                      otherUserName: chatUserName,
                      otherUserAvatar: chatUserAvatar
                    });
                  }}
                  style={[styles.premiumChatButton, { backgroundColor: AppColors.brand.primary }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.premiumChatButtonText}>Trò chuyện</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.premiumDivider} />

              <View style={styles.workerBidDetails}>
                <View style={styles.bidDetailItem}>
                  <Text style={styles.bidDetailLabel}>Báo giá đã chốt</Text>
                  <Text style={styles.bidDetailValue}>
                    {task.assignedWorker.bidPrice ? formatCurrency(task.assignedWorker.bidPrice) : 'Thỏa thuận'}
                  </Text>
                </View>
                <View style={styles.bidDetailItem}>
                  <Text style={styles.bidDetailLabel}>Thời gian dự kiến</Text>
                  <Text style={styles.bidDetailValue}>
                    {task.assignedWorker.estimatedTime || 'Chưa rõ'}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background.primary,
  },

  scrollContent: {
    paddingBottom: 48,
  },

  /* ==============================
     HERO IMAGE
  ============================== */

  carouselContainer: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#101828',
  },

  carouselImage: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
  },

  imageOverlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 85,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },

  imageOverlayBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 110,
    backgroundColor: 'rgba(0, 0, 0, 0.20)',
  },

  imageCounter: {
    position: 'absolute',
    top: 18,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(16, 24, 40, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },

  imageCounterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  paginationDots: {
    position: 'absolute',
    bottom: 58,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.48)',
  },

  activeDot: {
    width: 24,
    backgroundColor: '#FFFFFF',
  },

  /* ==============================
     FALLBACK KHI KHÔNG CÓ ẢNH
  ============================== */

  fallbackBanner: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },

  fallbackDecorationLarge: {
    position: 'absolute',
    top: -80,
    right: -70,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },

  fallbackDecorationSmall: {
    position: 'absolute',
    bottom: -45,
    left: -45,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },

  fallbackOverlay: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.10)',
  },

  fallbackIcon: {
    width: 82,
    height: 82,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },

  fallbackCategoryText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  fallbackSubtitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.75)',
  },

  /* ==============================
     MAIN CONTENT
  ============================== */

  body: {
    position: 'relative',
    marginTop: -38,
    paddingTop: 16,
    paddingHorizontal: 16,
    backgroundColor: AppColors.background.primary,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },

  /* ==============================
     MAIN JOB CARD
  ============================== */

  premiumCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 24,
    backgroundColor: AppColors.surface.glass,
    borderWidth: 1,
    borderColor: AppColors.border.subtle,
  },

  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },

  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
  },

  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },

  title: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    color: AppColors.text.primary,
    marginBottom: 10,
  },

  description: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '400',
    color: AppColors.text.secondary,
    marginBottom: 0,
  },

  premiumDivider: {
    height: 1,
    marginVertical: 18,
    backgroundColor: AppColors.border.subtle,
  },

  /* ==============================
     BUDGET AND DEADLINE
  ============================== */

  metaRow: {
    flexDirection: 'row',
    gap: 10,
  },

  metaItem: {
    flex: 1,
    minHeight: 100,
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 17,
    backgroundColor: AppColors.surface.glass,
    borderWidth: 1,
    borderColor: AppColors.border.subtle,
  },

  metaContent: {
    width: '100%',
    marginTop: 9,
  },

  metaLabel: {
    marginBottom: 5,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: AppColors.text.muted,
  },

  metaValue: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    color: AppColors.text.primary,
  },

  /* ==============================
     DATE AND LOCATION
  ============================== */

  detailsList: {
    gap: 11,
  },

  detailRow: {
    minHeight: 55,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 15,
    backgroundColor: AppColors.surface.glass,
    borderWidth: 1,
    borderColor: AppColors.border.subtle,
  },

  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.text.muted,
  },

  detailValue: {
    maxWidth: '58%',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'right',
    color: AppColors.text.primary,
  },

  /* ==============================
     POSTER CARD
  ============================== */

  posterCard: {
    padding: 18,
    marginBottom: 16,
    borderRadius: 22,
    backgroundColor: AppColors.surface.glass,
    borderWidth: 1,
    borderColor: AppColors.border.subtle,
  },

  cardSectionTitle: {
    marginBottom: 15,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: AppColors.text.muted,
  },

  posterInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: AppColors.border.subtle,
  },

  posterDetails: {
    flex: 1,
    marginLeft: 13,
  },

  posterNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: AppColors.text.primary,
  },

  posterRoleText: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '500',
    color: AppColors.text.muted,
  },

  premiumChatButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.15,
    shadowRadius: 10,

    elevation: 4,
  },

  premiumChatButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* ==============================
     APPLICANTS
  ============================== */

  hirerSectionCard: {
    padding: 18,
    marginBottom: 16,
    borderRadius: 22,
    backgroundColor: AppColors.surface.glass,
    borderWidth: 1,
    borderColor: AppColors.border.subtle,
  },

  premiumSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  sectionTitleText: {
    fontSize: 17,
    fontWeight: '900',
    color: AppColors.text.primary,
  },

  sectionSubtitleText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
    color: AppColors.text.muted,
  },

  autoMatchBtn: {
    minHeight: 36,
    paddingHorizontal: 12,
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    borderRadius: 18,
    backgroundColor: AppColors.background.secondary,
    borderWidth: 1,
    borderColor: AppColors.border.subtle,
    borderStyle: 'dashed',
    gap: 9,
  },

  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.text.muted,
  },

  viewApplicantsBtn: {
    width: '100%',
  },

  /* ==============================
     APPLY CARD
  ============================== */

  applyCard: {
    padding: 19,
    marginBottom: 16,
    borderRadius: 23,
    backgroundColor: AppColors.surface.glass,
    borderWidth: 1,
    borderColor: AppColors.border.subtle,
  },

  applyInstruction: {
    marginTop: 7,
    marginBottom: 18,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    color: AppColors.text.muted,
  },

  bidInputWrapper: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: AppColors.background.secondary,
    borderWidth: 1.5,
    borderColor: AppColors.border.normal,
  },

  currencyPrefix: {
    marginRight: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 9,
    overflow: 'hidden',
    fontSize: 11,
    fontWeight: '800',
    color: AppColors.text.muted,
    backgroundColor: AppColors.background.elevated,
  },

  premiumBidInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 17,
    fontWeight: '800',
    color: AppColors.text.primary,
  },

  applySubmitBtn: {
    width: '100%',
  },

  /* ==============================
     APPLIED STATUS
  ============================== */

  appliedStatusCard: {
    padding: 18,
    marginBottom: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },

  appliedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 15,
  },

  appliedHeaderTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
    color: '#22C55E',
  },

  appliedContentRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },

  appliedContentItem: {
    flex: 1,
  },

  appliedLabel: {
    marginBottom: 5,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#22C55E',
  },

  appliedValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#22C55E',
  },

  /* ==============================
     IN PROGRESS STATUS
  ============================== */

  inProgressCard: {
    padding: 18,
    marginBottom: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },

  inProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 10,
  },

  inProgressTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
    color: '#F59E0B',
  },

  inProgressDesc: {
    paddingLeft: 33,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    color: '#F59E0B',
  },

  /* ==============================
     WORKER BUSY CARD
  ============================== */

  workerBusyCard: {
    padding: 18,
    marginBottom: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 158, 11, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.28)',
  },

  workerBusyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  workerBusyIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    flexShrink: 0,
  },

  workerBusyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F59E0B',
    marginBottom: 4,
  },

  workerBusyDesc: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    color: AppColors.text.muted,
  },

  /* ==============================
     WITHDRAW BUTTON
  ============================== */

  withdrawBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
  },

  /* ==============================
     ASSIGNED WORKER CARD
  ============================== */
  assignedWorkerCard: {
    padding: 18,
    marginBottom: 16,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.25)',
  },

  workerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  workerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  workerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#22C55E',
  },

  workerStatusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },

  workerStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AppColors.status.success,
  },

  workerStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: AppColors.status.success,
  },

  workerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },

  workerDetails: {
    flex: 1,
    marginLeft: 13,
  },

  workerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  workerNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: AppColors.text.primary,
  },

  workerPhoneText: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '500',
    color: AppColors.text.muted,
  },

  workerBidDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },

  bidDetailItem: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: AppColors.border.subtle,
  },

  bidDetailLabel: {
    marginBottom: 4,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: AppColors.text.muted,
  },

  bidDetailValue: {
    fontSize: 14,
    fontWeight: '900',
    color: AppColors.text.primary,
  },
});