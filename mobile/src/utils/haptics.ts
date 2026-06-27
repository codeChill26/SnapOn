import * as Haptics from 'expo-haptics';

export const triggerHaptic = {
  selection: async () => {
    try {
      await Haptics.selectionAsync();
    } catch (e) {
      // Ignored: not supported in environment
    }
  },
  impactLight: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      // Ignored
    }
  },
  impactMedium: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      // Ignored
    }
  },
  impactHeavy: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {
      // Ignored
    }
  },
  notificationSuccess: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      // Ignored
    }
  },
  notificationWarning: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (e) {
      // Ignored
    }
  },
  notificationError: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (e) {
      // Ignored
    }
  },
};
