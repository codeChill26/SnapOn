import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { UserAvatar } from '../../components/common/UserAvatar';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { chatService, ChatMessage } from '../../services/chatService';
import { socketService } from '../../services/socketService';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/AppNavigator';

type ChatDetailRouteProp = RouteProp<RootStackParamList & {
  ChatDetail: {
    conversationId?: string;
    otherUserId: string;
    otherUserName: string;
    otherUserAvatar?: string;
  };
}, 'ChatDetail'>;

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

  const formatMessageTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId === user?.id;
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
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.customHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
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
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
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
        />

        {/* Input area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor={Colors.textLight}
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
            <Ionicons name="send" size={18} color={Colors.textWhite} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flexContainer: {
    flex: 1,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
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
    color: Colors.text,
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
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 2,
  },
  otherBubble: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: Colors.textWhite,
  },
  otherMessageText: {
    color: Colors.text,
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
    color: Colors.textLight,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 15,
    color: Colors.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
