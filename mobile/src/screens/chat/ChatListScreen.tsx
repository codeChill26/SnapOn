import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { UserAvatar } from '../../components/common/UserAvatar';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { chatService, ChatConversation } from '../../services/chatService';
import { socketService } from '../../services/socketService';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { AppColors } from '../../theme';

const formatMessageTime = (dateString: string) => {
  try {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric' });
  } catch {
    return '';
  }
};

interface ConversationItemProps {
  item: ChatConversation;
  onPress: (conversation: ChatConversation) => void;
}

const ConversationItem = React.memo<ConversationItemProps>(({ item, onPress }) => {
  const hasUnread = false; // Mock logic, could be extended later
  return (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <UserAvatar
        name={item.otherUser.fullName}
        avatarUrl={item.otherUser.avatarUrl}
        size={50}
      />
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.nameText} numberOfLines={1}>
            {item.otherUser.fullName}
          </Text>
          <Text style={styles.timeText}>
            {item.lastMessage ? formatMessageTime(item.lastMessage.createdAt) : ''}
          </Text>
        </View>
        <View style={styles.messageRow}>
          <Text
            style={[
              styles.messageText,
              hasUnread && styles.unreadMessageText
            ]}
            numberOfLines={1}
          >
            {item.lastMessage ? item.lastMessage.text : 'Bắt đầu cuộc trò chuyện mới'}
          </Text>
          {hasUnread && <View style={styles.unreadDot} />}
        </View>
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.updatedAt === nextProps.item.updatedAt &&
    prevProps.item.lastMessage?.text === nextProps.item.lastMessage?.text &&
    prevProps.item.otherUser.fullName === nextProps.item.otherUser.fullName &&
    prevProps.item.otherUser.avatarUrl === nextProps.item.otherUser.avatarUrl
  );
});

export const ChatListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadConversations = async () => {
    try {
      const data = await chatService.getConversations();
      setConversations(data);
      setFilteredConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadConversations();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const handleIncomingMessage = (message: any) => {
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === message.conversationId);
        if (exists) {
          return prev.map((c) => {
            if (c.id === message.conversationId) {
              return {
                ...c,
                lastMessage: message,
                updatedAt: message.createdAt,
              };
            }
            return c;
          }).sort((a, b) => {
            const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
          });
        } else {
          loadConversations();
          return prev;
        }
      });
    };

    socketService.on('message_received', handleIncomingMessage);
    return () => {
      socketService.off('message_received', handleIncomingMessage);
    };
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredConversations(conversations);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = conversations.filter(c =>
        c.otherUser.fullName.toLowerCase().includes(query) ||
        (c.lastMessage?.text || '').toLowerCase().includes(query)
      );
      setFilteredConversations(filtered);
    }
  }, [searchQuery, conversations]);

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const handleConversationPress = useCallback((conversation: ChatConversation) => {
    navigation.navigate('ChatDetail', {
      conversationId: conversation.id,
      otherUserId: conversation.otherUser.id,
      otherUserName: conversation.otherUser.fullName,
      otherUserAvatar: conversation.otherUser.avatarUrl,
    });
  }, [navigation]);

  const renderItem = useCallback(({ item }: { item: ChatConversation }) => {
    return (
      <ConversationItem
        item={item}
        onPress={handleConversationPress}
      />
    );
  }, [handleConversationPress]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tin nhắn</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={18} color={AppColors.text.muted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm người nhắn..."
            placeholderTextColor={AppColors.text.disabled}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearIcon}>
              <Ionicons name="close-circle" size={16} color={AppColors.text.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading && !refreshing ? (
        <LoadingSpinner message="Đang tải các cuộc hội thoại..." />
      ) : filteredConversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color={AppColors.text.disabled} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>Chưa có tin nhắn nào</Text>
          <Text style={styles.emptySubtitle}>Bấm vào nút nhắn tin trên trang cá nhân hoặc ứng viên của bạn để trò chuyện!</Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AppColors.brand.primary} colors={[AppColors.brand.primary]} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background.primary,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: AppColors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border.subtle,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: AppColors.text.primary,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: AppColors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border.subtle,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface.glass,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: AppColors.border.subtle,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: AppColors.text.primary,
  },
  clearIcon: {
    padding: 2,
  },
  listContent: {
    paddingBottom: 20,
  },
  conversationItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: AppColors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border.subtle,
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.text.primary,
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 12,
    color: AppColors.text.muted,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageText: {
    fontSize: 14,
    color: AppColors.text.muted,
    flex: 1,
    marginRight: 8,
  },
  unreadMessageText: {
    fontWeight: '700',
    color: AppColors.text.primary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppColors.brand.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: AppColors.text.primary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: AppColors.text.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
