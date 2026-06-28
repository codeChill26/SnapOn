import { useState, useEffect, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useAuth } from '../../../context/AuthContext';
import { taskService } from '../../../services/taskService';
import { applicationService } from '../../../services/applicationService';
import { Task, TaskApplication } from '../../../types';
import { showToast } from '../../../utils/toast';
import { useAppNavigation } from '../../../hooks/useAppNavigation';

export const useJobDetail = () => {
  const route = useRoute<any>();
  const navigation = useAppNavigation();
  const { user } = useAuth();
  const taskId = route.params.taskId;

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

  const activeWorkers = useMemo(() => {
    return applications.filter(
      (app) =>
        app.assignmentStatus === 'ASSIGNED' ||
        app.assignmentStatus === 'IN_PROGRESS' ||
        app.assignmentStatus === 'COMPLETED'
    );
  }, [applications]);

  const checkWorkerAvailability = useCallback(async () => {
    try {
      const myApps = await applicationService.getMyApplications();
      const inProgressCount = myApps.filter((app) => app.assignmentStatus === 'IN_PROGRESS').length;
      setWorkerHasActiveJob(inProgressCount >= 3);
    } catch (err) {
      if (__DEV__) {
        console.warn('Failed to check worker availability:', err);
      }
      setWorkerHasActiveJob(false);
    }
  }, []);

  const loadTaskDetail = useCallback(async () => {
    try {
      const taskData = await taskService.getTaskById(taskId);
      setTask(taskData);

      if (user?.id === taskData.posterId) {
        try {
          const apps = await applicationService.getApplicationsByTask(taskId);
          setApplications(apps);
        } catch (err) {
          if (__DEV__) {
            console.warn('Not authorized to view application list:', err);
          }
        }
      } else if (user?.id) {
        try {
          const myApp = await applicationService.getMyApplicationForTask(taskId);
          setUserApplication(myApp);
        } catch (err) {
          if (__DEV__) {
            console.warn('Failed to fetch user application:', err);
          }
        }
      }

      if ((user?.role === 'USER' || user?.role === 'worker') && user?.id) {
        void checkWorkerAvailability();
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('Failed to load task details:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [taskId, user, checkWorkerAvailability]);

  useEffect(() => {
    void loadTaskDetail();
    const unsubscribe = navigation.addListener('focus', () => {
      void loadTaskDetail();
    });
    return unsubscribe;
  }, [navigation, loadTaskDetail]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTaskDetail();
    setRefreshing(false);
  };

  const handleApplyConfirm = async (message: string, bidPrice: number | null) => {
    setShowApplyModal(false);
    setSubmittingApply(true);
    try {
      await applicationService.createApplication(taskId, {
        bid_price: bidPrice ?? undefined,
        estimated_time: 'Thương lượng',
        message: message || '',
      });
      showToast.success(
        'Ứng tuyển thành công',
        'Vui lòng bật thông báo để nhận thông báo duyệt việc.'
      );
      void loadTaskDetail();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Ứng tuyển thất bại.';
      showToast.error('Lỗi ứng tuyển', msg);
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
              showToast.success('Thành công', 'Đã rút hồ sơ ứng tuyển.');
              void loadTaskDetail();
            } catch (err: any) {
              showToast.error('Lỗi', err.message || 'Hủy ứng tuyển thất bại.');
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
      await taskService.closeRecruitment(taskId);
      showToast.success('Thành công', 'Đã đóng tuyển dụng sớm cho công việc này.');
      void loadTaskDetail();
    } catch (err: any) {
      showToast.error('Lỗi', err.message || 'Không thể đóng tuyển dụng.');
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
              showToast.success('Thành công', 'Đã xóa bài đăng.');
              navigation.goBack();
            } catch (e: any) {
              showToast.error('Lỗi', e.message || 'Xóa bài viết thất bại.');
            }
          },
        },
      ]
    );
  };

  const handleAcceptAssignment = async () => {
    if (!userApplication?.assignmentId) return;
    try {
      await applicationService.acceptAssignment(userApplication.assignmentId);
      showToast.success('Thành công', 'Bạn đã đồng ý nhận công việc!');
      void loadTaskDetail();
    } catch (err: any) {
      showToast.error('Lỗi', err.response?.data?.message || err.message || 'Xác nhận nhận việc thất bại.');
    }
  };

  const handleDeclineAssignment = async () => {
    if (!userApplication?.assignmentId) return;
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
              await applicationService.declineAssignment(userApplication.assignmentId!);
              showToast.success('Thành công', 'Đã từ chối công việc.');
              void loadTaskDetail();
            } catch (err: any) {
              showToast.error('Lỗi', err.message || 'Từ chối nhận việc thất bại.');
            }
          },
        },
      ]
    );
  };

  const handleCompleteAssignment = async (workerApp: TaskApplication) => {
    if (!workerApp.assignmentId) return;
    Alert.alert(
      'Hoàn tất công việc',
      `Bạn xác nhận ứng viên ${workerApp.taskerName} đã hoàn thành công việc?`,
      [
        { text: 'Quay lại', style: 'cancel' },
        {
          text: 'Hoàn tất',
          onPress: async () => {
            try {
              await applicationService.completeAssignment(workerApp.assignmentId!);
              showToast.success('Thành công', 'Đã đánh dấu hoàn thành công việc.');
              void loadTaskDetail();
            } catch (err: any) {
              showToast.error('Lỗi', err.message || 'Xác nhận hoàn thành thất bại.');
            }
          },
        },
      ]
    );
  };

  const handleCancelAssignment = async (workerApp: TaskApplication) => {
    if (!workerApp.assignmentId) return;
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
              await applicationService.cancelAssignment(workerApp.assignmentId!);
              showToast.success('Thành công', 'Đã hủy giao việc cho ứng viên.');
              void loadTaskDetail();
            } catch (err: any) {
              showToast.error('Lỗi', err.message || 'Hủy giao việc thất bại.');
            }
          },
        },
      ]
    );
  };

  return {
    taskId,
    task,
    applications,
    userApplication,
    loading,
    refreshing,
    activeImageIndex,
    setActiveImageIndex,
    workerHasActiveJob,
    showApplyModal,
    setShowApplyModal,
    showCloseModal,
    setShowCloseModal,
    submittingApply,
    submittingClose,
    isPoster,
    isWorker,
    activeWorkers,
    onRefresh,
    handleApplyConfirm,
    handleWithdraw,
    handleCloseConfirm,
    handleDeleteTask,
    handleAcceptAssignment,
    handleDeclineAssignment,
    handleCompleteAssignment,
    handleCancelAssignment,
  };
};
