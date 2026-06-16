import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { UserAvatar } from '../../components/common/UserAvatar';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { chatService, ChatMessage } from '../../services/chatService';
import { socketService } from '../../services/socketService';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { AppColors } from '../../theme';

type ChatDetailRouteProp = RouteProp<RootStackParamList & {
  ChatDetail: {
    conversationId?: string;
    otherUserId: string;
    otherUserName: string;
    otherUserAvatar?: string;
  };
}, 'ChatDetail'>;

const formatMessageTime = (dateString: string) => {
  try {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

interface MessageItemProps {
  item: ChatMessage;
  isMe: boolean;
  otherUserName: string;
  otherUserAvatar: string | undefined;
}

const MessageItem = React.memo<MessageItemProps>(({ item, isMe, otherUserName, otherUserAvatar }) => {
  return (
    <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
      {!isMe && (
        <View style={styles.avatarSpacing}>
          <UserAvatar
            name={otherUserName}
            avatarUrl={otherUserAvatar}
            size={28}
          />
        </View>
      )}
      <View style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
        <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
          {item.text}
        </Text>
        <Text style={[styles.timeText, isMe ? styles.myTimeText : styles.otherTimeText]}>
          {formatMessageTime(item.createdAt)}
        </Text>
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.text === nextProps.item.text &&
    prevProps.item.createdAt === nextProps.item.createdAt &&
    prevProps.isMe === nextProps.isMe &&
    prevProps.otherUserName === nextProps.otherUserName &&
    prevProps.otherUserAvatar === nextProps.otherUserAvatar
  );
});

export const ChatDetailScreen: React.FC = () => {
  const route = useRoute<ChatDetailRouteProp>();
  const navigation = useNavigation();
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const [conversationId, setConversationId] = useState<string | undefined>(route.params.conversationId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const otherUserId = route.params.otherUserId;
  const otherUserName = route.params.otherUserName;
  const otherUserAvatar = route.params.otherUserAvatar;

  // Initialize or fetch conversation
  const initConversation = async () => {
    try {
      if (!conversationId) {
        // Start conversation in backend
        const conv = await chatService.startConversation(otherUserId);
        setConversationId(conv.id);
      } else {
        const data = await chatService.getMessages(conversationId);
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initConversation();
  }, [conversationId]);

  // Listen for incoming messages in real-time
  useEffect(() => {
    if (!conversationId) return;

    const handleIncomingMessage = (message: ChatMessage) => {
      if (message.conversationId === conversationId) {
        setMessages((prev) => {
          // Avoid duplicate messages
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    };

    socketService.on('message_received', handleIncomingMessage);

    return () => {
      socketService.off('message_received', handleIncomingMessage);
    };
  }, [conversationId]);

  const handleSend = async () => {
    if (inputText.trim() === '' || !conversationId || sending) return;
    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const newMessage = await chatService.sendMessage(conversationId, textToSend);
      setMessages(prev => {
        if (prev.some((m) => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const renderMessageItem = useCallback(({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId === user?.id;
    return (
      <MessageItem
        item={item}
        isMe={isMe}
        otherUserName={otherUserName}
        otherUserAvatar={otherUserAvatar}
      />
    );
  }, [user?.id, otherUserName, otherUserAvatar]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.customHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <UserAvatar name={otherUserName} avatarUrl={otherUserAvatar} size={36} />
            <Text style={styles.headerName}>{otherUserName}</Text>
          </View>
        </View>
        <LoadingSpinner message="Đang kết nối cuộc hội thoại..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flexContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Custom Header */}
        <View style={styles.customHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <UserAvatar name={otherUserName} avatarUrl={otherUserAvatar} size={36} />
            <Text style={styles.headerName} numberOfLines={1}>{otherUserName}</Text>
          </View>
        </View>

        {/* Message List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          initialNumToRender={15}
          maxToRenderPerBatch={20}
          windowSize={11}
          removeClippedSubviews={Platform.OS === 'android'}
        />

        {/* Input area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor={AppColors.text.disabled}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, inputText.trim() === '' && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={inputText.trim() === '' || sending}
            activeOpacity={0.7}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background.primary,
  },
  flexContainer: {
    flex: 1,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: AppColors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border.subtle,
  },
  backButton: {
    padding: 8,
    marginRight: 4,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '800',
    color: AppColors.text.primary,
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '80%',
    marginBottom: 4,
  },
  myMessageRow: {
    alignSelf: 'flex-end',
  },
  otherMessageRow: {
    alignSelf: 'flex-start',
  },
  avatarSpacing: {
    marginRight: 6,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  myBubble: {
    backgroundColor: AppColors.brand.primary,
    borderBottomRightRadius: 2,
  },
  otherBubble: {
    backgroundColor: AppColors.background.elevated,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: AppColors.border.subtle,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: AppColors.text.primary,
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myTimeText: {
    color: 'rgba(255,255,255,0.7)',
  },
  otherTimeText: {
    color: AppColors.text.muted,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: AppColors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: AppColors.border.subtle,
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: AppColors.surface.glass,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 15,
    color: AppColors.text.primary,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: AppColors.border.subtle,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AppColors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
