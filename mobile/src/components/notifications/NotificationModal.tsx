import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { notificationService, AppNotification } from '../../services/notificationService';
import { useAppNavigation } from '../../hooks/useAppNavigation';

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  onRefreshUnreadCount?: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  visible,
  onClose,
  onRefreshUnreadCount,
}) => {
  const theme = useTheme();
  const navigation = useAppNavigation();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications();
      setNotifications(data.notifications);
      if (onRefreshUnreadCount) onRefreshUnreadCount();
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchNotifications();
    }
  }, [visible]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleNotificationPress = async (item: AppNotification) => {
    try {
      if (!item.is_read) {
        await notificationService.markAsRead(item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
        );
        if (onRefreshUnreadCount) onRefreshUnreadCount();
      }

      if (item.task_id) {
        onClose();
        navigation.navigate('JobDetail', { taskId: item.task_id });
      }
    } catch (err) {
      console.error('Error opening notification:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      if (onRefreshUnreadCount) onRefreshUnreadCount();
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Vừa xong';
      if (diffMins < 60) return `${diffMins} phút trước`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} giờ trước`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} ngày trước`;
    } catch {
      return '';
    }
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const isUnread = !item.is_read;
    return (
      <TouchableOpacity
        style={[
          styles.itemContainer,
          {
            backgroundColor: isUnread
              ? theme.colors.brand.primarySoft || '#FFF7F2'
              : theme.colors.background.primary,
            borderColor: theme.colors.border.subtle,
          },
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isUnread
                ? theme.colors.brand.primary
                : theme.colors.background.secondary,
            },
          ]}
        >
          <Ionicons
            name={item.type === 'NEW_APPLICATION' ? 'person-add' : 'notifications'}
            size={20}
            color={isUnread ? '#FFFFFF' : theme.colors.text.secondary}
          />
        </View>

        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Text
              style={[
                styles.itemTitle,
                {
                  color: theme.colors.text.primary,
                  fontWeight: isUnread ? '700' : '600',
                },
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text style={[styles.itemTime, { color: theme.colors.text.muted }]}>
              {formatTime(item.created_at)}
            </Text>
          </View>

          <Text
            style={[
              styles.itemBody,
              { color: theme.colors.text.secondary },
            ]}
            numberOfLines={2}
          >
            {item.content}
          </Text>
        </View>

        {isUnread && <View style={[styles.unreadDot, { backgroundColor: theme.colors.brand.primary }]} />}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background.primary }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border.subtle }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Đóng">
            <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
            Thông báo
          </Text>

          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
            <Text style={[styles.markAllText, { color: theme.colors.brand.primary }]}>
              Đọc tất cả
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.brand.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
              Đang tải thông báo...
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.brand.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View
                  style={[
                    styles.emptyIconBg,
                    { backgroundColor: theme.colors.background.secondary },
                  ]}
                >
                  <Ionicons name="notifications-outline" size={48} color={theme.colors.text.muted} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
                  Chưa có thông báo nào
                </Text>
                <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
                  Khi có ứng viên ứng tuyển bài viết của bạn, thông báo sẽ xuất hiện tại đây.
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  markAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  listContent: {
    paddingVertical: 8,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 15,
    flex: 1,
    marginRight: 8,
  },
  itemTime: {
    fontSize: 12,
  },
  itemBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
