import React, { useEffect } from 'react';
import { useAuth } from './AuthContext';
import { socketService } from '../services/socketService';
import { notificationService } from '../services/notificationService';
import { Alert } from 'react-native';

export const NotificationInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();

  useEffect(() => {
    if (token && user) {
      socketService.connect(user.id);
      void notificationService.registerDeviceForChatNotifications().catch((error) => {
        console.warn('Failed to register push token:', error);
      });

      const handleApplicationJoined = (data: { taskTitle: string; taskerName: string }) => {
        Alert.alert(
          '💡 Ứng tuyển mới!',
          `Ứng viên ${data.taskerName} đã đăng ký làm công việc: "${data.taskTitle}".`
        );
      };

      const handleTaskAssigned = (data: { taskTitle: string }) => {
        Alert.alert(
          '🎉 Nhận việc thành công!',
          `Bạn đã được chọn cho công việc: "${data.taskTitle}". Vui lòng vào kiểm tra công việc và bắt đầu làm việc!`
        );
      };

      socketService.on('application_joined', handleApplicationJoined);
      socketService.on('task_assigned', handleTaskAssigned);

      return () => {
        socketService.off('application_joined', handleApplicationJoined);
        socketService.off('task_assigned', handleTaskAssigned);
      };
    } else {
      socketService.disconnect();
    }
  }, [token, user]);

  return <>{children}</>;
};
