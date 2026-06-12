import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { UserAvatar } from '../../components/common/UserAvatar';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { chatService, ChatConversation } from '../../services/chatService';
import { socketService } from '../../services/socketService';
import { formatTimeRemaining } from '../../utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

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
          }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
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

  const handleConversationPress = (conversation: ChatConversation) => {
    navigation.navigate('ChatDetail', {
      conversationId: conversation.id,
      otherUserId: conversation.otherUser.id,
      otherUserName: conversation.otherUser.fullName,
      otherUserAvatar: conversation.otherUser.avatarUrl,
    });
  };

  const formatMessageTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const renderItem = ({ item }: { item: ChatConversation }) => {
    const hasUnread = false; // Mock logic, could be extended later
    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => handleConversationPress(item)}
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
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tin nhắn</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={18} color={Colors.textLight} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm người nhắn..."
            placeholderTextColor={Colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearIcon}>
              <Ionicons name="close-circle" size={16} color={Colors.textLight} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading && !refreshing ? (
        <LoadingSpinner message="Đang tải các cuộc hội thoại..." />
      ) : filteredConversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color={Colors.textLight} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>Chưa có tin nhắn nào</Text>
          <Text style={styles.emptySubtitle}>Bấm vào nút nhắn tin trên trang cá nhân hoặc ứng viên của bạn để trò chuyện!</Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.text,
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
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
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
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageText: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  unreadMessageText: {
    fontWeight: '600',
    color: Colors.text,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
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
    color: Colors.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
