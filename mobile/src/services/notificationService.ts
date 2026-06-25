import { Platform } from 'react-native';
import Constants from 'expo-constants';
import Config from '../constants/config';
import { chatService } from './chatService';

const getNotifications = () => {
  const Notifications = require('expo-notifications');

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: false,
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  return Notifications;
};

export const notificationService = {
  async registerDeviceForChatNotifications(): Promise<string | null> {
    if (Constants.appOwnership === 'expo') {
      return null;
    }

    const Notifications = getNotifications();

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const existingPermission = await Notifications.getPermissionsAsync();
    let finalStatus = existingPermission.status;

    if (existingPermission.status !== 'granted') {
      const requestedPermission = await Notifications.requestPermissionsAsync();
      finalStatus = requestedPermission.status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    const expoToken = await Notifications.getExpoPushTokenAsync({
      projectId: Config.EXPO_PROJECT_ID,
    });

    await chatService.registerPushToken(expoToken.data, Platform.OS);
    return expoToken.data;
  },

  async removeDeviceToken(token: string): Promise<void> {
    await chatService.removePushToken(token);
  },
};
