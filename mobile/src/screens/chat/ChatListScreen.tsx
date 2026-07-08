import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useTheme } from '../../theme';
import { UserAvatar } from '../../components/common/UserAvatar';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { chatService, ChatConversation, ChatMessage } from '../../services/chatService';
import { socketService } from '../../services/socketService';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { User } from '../../types';
import { authService } from '../../services/authService';
import { ChatDraft, storage } from '../../utils/storage';

type DraftConversation = ChatConversation & {
  draft?: ChatDraft;
};

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

const getConversationSortTime = (conversation: DraftConversation) => {
  const draftTime = conversation.draft?.updatedAt ? new Date(conversation.draft.updatedAt).getTime() : 0;
  const messageTime = conversation.updatedAt ? new Date(conversation.updatedAt).getTime() : 0;
  return Math.max(isNaN(draftTime) ? 0 : draftTime, isNaN(messageTime) ? 0 : messageTime);
};

const sortConversations = (conversations: DraftConversation[]) => (
  [...conversations].sort((a, b) => getConversationSortTime(b) - getConversationSortTime(a))
);

const getLastMessagePreview = (conversation: DraftConversation) => {
  if (conversation.draft?.text.trim()) {
    return `Bản nháp: ${conversation.draft.text.trim()}`;
  }

  const lastMessage = conversation.lastMessage;
  if (!lastMessage) return 'Bắt đầu cuộc trò chuyện mới';

  const text = lastMessage.text?.trim();
  if (lastMessage.imageUrl && text) return text;
  if (lastMessage.imageUrl) return 'Đã gửi một ảnh';
  return text || 'Tin nhắn mới';
};

interface ConversationItemProps {
  item: DraftConversation;
  onPress: (conversation: DraftConversation) => void;
  currentUserId?: string;
}

const ConversationItem = React.memo<ConversationItemProps>(({ item, onPress, currentUserId }) => {
  const theme = useTheme();
  const unreadCount = item.unreadCount || 0;
  const hasUnread = unreadCount > 0;
  const hasDraft = Boolean(item.draft?.text.trim());
  const lastMessageFromMe = Boolean(item.lastMessage && item.lastMessage.senderId === currentUserId);
  const showReadState = lastMessageFromMe && !hasDraft;
  const readStateLabel = item.lastMessage?.status === 'READ' ? 'Đã xem' : 'Đã gửi';
  const readStateIcon = item.lastMessage?.status === 'READ' ? 'checkmark-done' : 'checkmark';

  return (
    <TouchableOpacity
      style={[styles.conversationItem, { backgroundColor: theme.colors.background.secondary, borderBottomColor: theme.colors.border.subtle }]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarWrap}>
        <UserAvatar
          name={item.otherUser.fullName}
          avatarUrl={item.otherUser.avatarUrl}
          size={50}
        />
        {hasUnread && <View style={[styles.avatarUnreadDot, { backgroundColor: theme.colors.brand.primary, borderColor: theme.colors.background.secondary }]} />}
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={[styles.nameText, { color: theme.colors.text.primary }, hasUnread && styles.unreadNameText]} numberOfLines={1}>
            {item.otherUser.fullName}
          </Text>
          <Text style={[styles.timeText, { color: theme.colors.text.secondary }, hasUnread && [styles.unreadTimeText, { color: theme.colors.brand.primary }]]}>
            {hasDraft
              ? formatMessageTime(item.draft?.updatedAt || '')
              : item.lastMessage ? formatMessageTime(item.lastMessage.createdAt) : ''}
          </Text>
        </View>

        <View style={styles.messageRow}>
          {item.lastMessage?.imageUrl && (
            <Ionicons
              name="image-outline"
              size={15}
              color={hasUnread ? theme.colors.brand.primary : theme.colors.text.secondary}
              style={styles.previewIcon}
            />
          )}
          <Text
            style={[
              styles.messageText,
              { color: theme.colors.text.secondary },
              hasUnread && [styles.unreadMessageText, { color: theme.colors.text.primary }],
              hasDraft && [styles.draftMessageText, { color: theme.colors.brand.primary }],
            ]}
            numberOfLines={1}
          >
            {getLastMessagePreview(item)}
          </Text>
          {showReadState && (
            <View style={styles.readStateInline}>
              <Ionicons
                name={readStateIcon}
                size={14}
                color={item.lastMessage?.status === 'READ' ? theme.colors.brand.primary : theme.colors.text.muted}
              />
              <Text style={[
                styles.readStateText,
                { color: theme.colors.text.muted },
                item.lastMessage?.status === 'READ' && [styles.readStateTextRead, { color: theme.colors.brand.primary }],
              ]}>
                {readStateLabel}
              </Text>
            </View>
          )}
          {hasUnread && (
            <View style={[styles.unreadBadge, { backgroundColor: theme.colors.brand.primary }]}>
              <Text style={[styles.unreadBadgeText, { color: theme.colors.background.secondary }]}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.updatedAt === nextProps.item.updatedAt &&
    prevProps.item.lastMessage?.text === nextProps.item.lastMessage?.text &&
    prevProps.item.lastMessage?.imageUrl === nextProps.item.lastMessage?.imageUrl &&
    prevProps.item.unreadCount === nextProps.item.unreadCount &&
    prevProps.item.draft?.text === nextProps.item.draft?.text &&
    prevProps.item.draft?.updatedAt === nextProps.item.draft?.updatedAt &&
    prevProps.currentUserId === nextProps.currentUserId &&
    prevProps.item.otherUser.fullName === nextProps.item.otherUser.fullName &&
    prevProps.item.otherUser.avatarUrl === nextProps.item.otherUser.avatarUrl
  );
});

export const ChatListScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useAppNavigation();
  const isFocused = useIsFocused();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<DraftConversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<DraftConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResultUser, setSearchResultUser] = useState<User | null>(null);
  const [isSearchingPhone, setIsSearchingPhone] = useState(false);
  const [hasSearchedPhone, setHasSearchedPhone] = useState(false);
  const [phoneSearchError, setPhoneSearchError] = useState('');

  const isPhoneQuery = /^\d{10}$/.test(searchQuery.trim());

  const loadConversations = useCallback(async () => {
    try {
      const [data, drafts] = await Promise.all([
        chatService.getConversations(),
        storage.getChatDrafts(),
      ]);
      const merged = sortConversations(data.map((conversation) => ({
        ...conversation,
        draft: drafts[conversation.id],
      })));

      setConversations(merged);
      setFilteredConversations(merged);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeSearchRef = useRef<string>('');

  const handlePhoneSearch = useCallback(async (phoneToSearch: string) => {
    const trimmed = phoneToSearch.trim();
    if (!trimmed) return;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    activeSearchRef.current = trimmed;
    setIsSearchingPhone(true);
    setPhoneSearchError('');
    setHasSearchedPhone(true);
    try {
      const userFound = await authService.searchUserByPhone(trimmed);
      if (activeSearchRef.current === trimmed) {
        setSearchResultUser(userFound);
        if (!userFound) {
          setPhoneSearchError('Không tìm thấy người dùng với số điện thoại này.');
        }
      }
    } catch (error: any) {
      console.error('Failed to search phone:', error);
      if (activeSearchRef.current === trimmed) {
        setPhoneSearchError('Đã xảy ra lỗi khi tìm kiếm số điện thoại.');
      }
    } finally {
      if (activeSearchRef.current === trimmed) {
        setIsSearchingPhone(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResultUser(null);
      setHasSearchedPhone(false);
      setPhoneSearchError('');
      activeSearchRef.current = '';
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
      return;
    }

    if (isPhoneQuery) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        handlePhoneSearch(searchQuery.trim());
      }, 400);
    } else {
      setSearchResultUser(null);
      setHasSearchedPhone(false);
      setPhoneSearchError('');
      activeSearchRef.current = '';
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [isPhoneQuery, searchQuery, handlePhoneSearch]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadConversations();
    });
    return unsubscribe;
  }, [navigation, loadConversations]);

  useEffect(() => {
    const handleIncomingMessage = (message: ChatMessage) => {
      if (!isFocused) return;

      setConversations((prev) => {
        const exists = prev.some((c) => c.id === message.conversationId);
        if (!exists) {
          void loadConversations();
          return prev;
        }

        return sortConversations(prev.map((conversation) => {
          if (conversation.id !== message.conversationId) return conversation;
          return {
            ...conversation,
            lastMessage: message,
            updatedAt: message.createdAt,
            unreadCount: message.senderId === user?.id
              ? conversation.unreadCount || 0
              : (conversation.unreadCount || 0) + 1,
          };
        }));
      });
    };

    socketService.on('message_received', handleIncomingMessage);
    return () => {
      socketService.off('message_received', handleIncomingMessage);
    };
  }, [isFocused, loadConversations, user?.id]);

  useEffect(() => {
    const handleConversationRead = (payload: { conversationId: string; readerId: string }) => {
      if (payload.readerId === user?.id) return;

      setConversations((prev) => prev.map((conversation) => {
        if (conversation.id !== payload.conversationId) return conversation;
        const lastMessage = conversation.lastMessage;
        if (!lastMessage || lastMessage.senderId !== user?.id) return conversation;

        return {
          ...conversation,
          lastMessage: {
            ...lastMessage,
            status: 'READ',
          },
        };
      }));
    };

    socketService.on('conversation_read', handleConversationRead);
    return () => {
      socketService.off('conversation_read', handleConversationRead);
    };
  }, [user?.id]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredConversations(conversations);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = conversations.filter((conversation) => (
      conversation.otherUser.fullName.toLowerCase().includes(query) ||
      getLastMessagePreview(conversation).toLowerCase().includes(query)
    ));
    setFilteredConversations(filtered);
  }, [searchQuery, conversations]);

  const handleStartChatWithSearchResult = async (userId: string) => {
    try {
      setLoading(true);
      const newConv = await chatService.startConversation(userId);
      setSearchQuery('');
      setSearchResultUser(null);
      setHasSearchedPhone(false);
      navigation.navigate('ChatDetail', {
        conversationId: newConv.id,
        otherUserId: newConv.otherUser.id,
        otherUserName: newConv.otherUser.fullName,
        otherUserAvatar: newConv.otherUser.avatarUrl,
      });
    } catch (error) {
      console.error('Failed to start conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const handleConversationPress = useCallback((conversation: DraftConversation) => {
    navigation.navigate('ChatDetail', {
      conversationId: conversation.id,
      otherUserId: conversation.otherUser.id,
      otherUserName: conversation.otherUser.fullName,
      otherUserAvatar: conversation.otherUser.avatarUrl,
    });
  }, [navigation]);

  const renderItem = useCallback(({ item }: { item: DraftConversation }) => {
    return (
      <ConversationItem
        item={item}
        onPress={handleConversationPress}
        currentUserId={user?.id}
      />
    );
  }, [handleConversationPress, user?.id]);

  const getItemLayout = useCallback((_data: any, index: number) => ({
    length: 78,
    offset: 78 * index,
    index,
  }), []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.background.secondary, borderBottomColor: theme.colors.border.subtle }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Tin nhắn</Text>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: theme.colors.background.secondary, borderBottomColor: theme.colors.border.subtle }]}>
        <View style={[styles.searchWrapper, { backgroundColor: theme.colors.surface.input, borderColor: theme.colors.border.subtle }]}>
          <Ionicons name="search-outline" size={18} color={theme.colors.text.secondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text.primary }]}
            placeholder="Tìm người nhắn hoặc tin nhắn..."
            placeholderTextColor={theme.colors.text.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => {
              if (isPhoneQuery) {
                handlePhoneSearch(searchQuery.trim());
              }
            }}
            returnKeyType={isPhoneQuery ? 'search' : 'default'}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearIcon}>
              <Ionicons name="close-circle" size={16} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isPhoneQuery && (
        <View style={[styles.phoneSearchContainer, { backgroundColor: theme.colors.background.secondary, borderBottomColor: theme.colors.border.subtle }]}>
          {isSearchingPhone ? (
            <View style={styles.phoneSearchLoading}>
              <LoadingSpinner message="Đang tìm kiếm..." />
            </View>
          ) : searchResultUser ? (
            <TouchableOpacity
              style={[styles.phoneSearchResultCard, { backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.border.subtle }]}
              onPress={() => handleStartChatWithSearchResult(searchResultUser.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.phoneSearchResultHeader, { color: theme.colors.text.secondary }]}>Kết quả tìm kiếm số điện thoại</Text>
              <View style={styles.phoneSearchResultRow}>
                <UserAvatar
                  name={searchResultUser.fullName}
                  avatarUrl={searchResultUser.avatarUrl}
                  size={46}
                />
                <View style={styles.phoneSearchResultInfo}>
                  <Text style={[styles.phoneSearchResultName, { color: theme.colors.text.primary }]} numberOfLines={1}>
                    {searchResultUser.fullName}
                  </Text>
                  <Text style={[styles.phoneSearchResultPhone, { color: theme.colors.text.secondary }]}>
                    SĐT: {searchResultUser.phone}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.phoneSearchChatBtn, { backgroundColor: theme.colors.brand.primary }]}
                  onPress={() => handleStartChatWithSearchResult(searchResultUser.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chatbubble-ellipses" size={18} color={theme.colors.text.inverse} style={{ marginRight: 4 }} />
                  <Text style={[styles.phoneSearchChatBtnText, { color: theme.colors.text.inverse }]}>Nhắn tin</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ) : hasSearchedPhone ? (
            <View style={[styles.phoneSearchEmpty, { backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.border.subtle }]}>
              <Ionicons name="alert-circle-outline" size={20} color={theme.colors.text.secondary} />
              <Text style={[styles.phoneSearchEmptyText, { color: theme.colors.text.secondary }]}>
                {phoneSearchError || 'Không tìm thấy người dùng với số điện thoại này.'}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {loading && !refreshing ? (
        <LoadingSpinner message="Đang tải các cuộc hội thoại..." />
      ) : filteredConversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color={theme.colors.text.muted} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>Chưa có tin nhắn nào</Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.text.secondary }]}>Bắt đầu trò chuyện từ trang cá nhân hoặc tìm kiếm bằng số điện thoại.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={11}
          removeClippedSubviews={true}
          getItemLayout={getItemLayout}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.brand.primary} colors={[theme.colors.brand.primary]} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
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
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarUnreadDot: {
    position: 'absolute',
    right: 1,
    top: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
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
    flex: 1,
    marginRight: 8,
  },
  unreadNameText: {
    fontWeight: '800',
  },
  timeText: {
    fontSize: 12,
  },
  unreadTimeText: {
    fontWeight: '800',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewIcon: {
    marginRight: 4,
  },
  readStateInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginLeft: 8,
    minWidth: 58,
  },
  readStateText: {
    marginLeft: 2,
    fontSize: 12,
    fontWeight: '700',
  },
  readStateTextRead: {},
  messageText: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  unreadMessageText: {
    fontWeight: '700',
  },
  draftMessageText: {
    fontWeight: '700',
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  phoneSearchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  phoneSearchLoading: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  phoneSearchResultCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  phoneSearchResultHeader: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  phoneSearchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneSearchResultInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  phoneSearchResultName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  phoneSearchResultPhone: {
    fontSize: 13,
  },
  phoneSearchChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  phoneSearchChatBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  phoneSearchEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  phoneSearchEmptyText: {
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
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
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
