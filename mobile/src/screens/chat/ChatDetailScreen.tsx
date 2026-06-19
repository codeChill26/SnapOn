import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { UserAvatar } from '../../components/common/UserAvatar';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { chatService, ChatMessage } from '../../services/chatService';
import { socketService } from '../../services/socketService';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { storage } from '../../utils/storage';

type ChatDetailRouteProp = RouteProp<RootStackParamList & {
  ChatDetail: {
    conversationId?: string;
    otherUserId: string;
    otherUserName: string;
    otherUserAvatar?: string;
  };
}, 'ChatDetail'>;

interface PendingImage {
  uri: string;
  base64: string;
  mimeType?: string;
}

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

const getStatusIcon = (status?: string) => {
  if (status === 'READ') return 'checkmark-done';
  if (status === 'DELIVERED') return 'checkmark-done-outline';
  return 'checkmark';
};

interface MessageItemProps {
  item: ChatMessage;
  isMe: boolean;
  otherUserName: string;
  otherUserAvatar: string | undefined;
  onAvatarPress: () => void;
  onImagePress: (imageUrl: string) => void;
  showSeenLabel: boolean;
}

const MessageItem = React.memo<MessageItemProps>(({ item, isMe, otherUserName, otherUserAvatar, onAvatarPress, onImagePress, showSeenLabel }) => {
  const hasImage = Boolean(item.imageUrl);
  const hasText = Boolean(item.text && item.text.trim().length > 0);
  const [imageAspectRatio, setImageAspectRatio] = useState(1);

  useEffect(() => {
    if (!item.imageUrl) return;

    let active = true;
    Image.getSize(
      item.imageUrl,
      (width, height) => {
        if (active && width > 0 && height > 0) {
          setImageAspectRatio(width / height);
        }
      },
      () => {
        if (active) setImageAspectRatio(1);
      }
    );

    return () => {
      active = false;
    };
  }, [item.imageUrl]);

  return (
    <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
      {!isMe && (
        <TouchableOpacity style={styles.avatarSpacing} onPress={onAvatarPress} activeOpacity={0.7}>
          <UserAvatar
            name={otherUserName}
            avatarUrl={otherUserAvatar}
            size={28}
          />
        </TouchableOpacity>
      )}

      <View style={[
        hasImage ? styles.imageMessageWrap : styles.bubble,
        !hasImage && (isMe ? styles.myBubble : styles.otherBubble),
      ]}>
        {hasImage && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => item.imageUrl && onImagePress(item.imageUrl)}
            style={[styles.messageImageButton, { aspectRatio: imageAspectRatio }]}
          >
            <Image
              source={{ uri: item.imageUrl || undefined }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}

        {hasText && (
          <Text style={[
            hasImage ? styles.imageCaptionText : styles.messageText,
            !hasImage && (isMe ? styles.myMessageText : styles.otherMessageText),
          ]}>
            {item.text}
          </Text>
        )}

        <View style={[
          hasImage ? styles.imageMetaBar : styles.metaRow,
          hasImage && (isMe ? styles.myImageMetaBar : styles.otherImageMetaBar),
        ]}>
          <Text style={[
            styles.timeText,
            hasImage ? styles.imageTimeText : (isMe ? styles.myTimeText : styles.otherTimeText),
          ]}>
            {formatMessageTime(item.createdAt)}
          </Text>
          {isMe && (
            <Ionicons
              name={getStatusIcon(item.status)}
              size={13}
              color={hasImage
                ? (item.status === 'READ' ? '#FF6B35' : '#64748B')
                : (item.status === 'READ' ? '#D6F5FF' : 'rgba(255,255,255,0.74)')}
              style={styles.statusIcon}
            />
          )}
        </View>
        {showSeenLabel && (
          <Text style={[styles.seenLabel, hasImage && styles.imageSeenLabel]}>Đã xem</Text>
        )}
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.text === nextProps.item.text &&
    prevProps.item.imageUrl === nextProps.item.imageUrl &&
    prevProps.item.status === nextProps.item.status &&
    prevProps.item.createdAt === nextProps.item.createdAt &&
    prevProps.isMe === nextProps.isMe &&
    prevProps.showSeenLabel === nextProps.showSeenLabel &&
    prevProps.otherUserName === nextProps.otherUserName &&
    prevProps.otherUserAvatar === nextProps.otherUserAvatar
  );
});

export const ChatDetailScreen: React.FC = () => {
  const route = useRoute<ChatDetailRouteProp>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const [conversationId, setConversationId] = useState<string | undefined>(route.params.conversationId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [savingImage, setSavingImage] = useState(false);
  const [mediaListOpen, setMediaListOpen] = useState(false);

  const otherUserId = route.params.otherUserId;
  const otherUserName = route.params.otherUserName;
  const otherUserAvatar = route.params.otherUserAvatar;
  const imageMessages = useMemo(() => messages.filter((message) => Boolean(message.imageUrl)), [messages]);
  const selectedMediaIndex = useMemo(() => {
    if (!selectedImageUrl) return -1;
    return imageMessages.findIndex((message) => message.imageUrl === selectedImageUrl);
  }, [imageMessages, selectedImageUrl]);
  const canBrowseMediaImages = mediaListOpen && selectedMediaIndex >= 0;

  const handleOtherUserPress = useCallback(() => {
    navigation.navigate('PublicProfile', { userId: otherUserId });
  }, [navigation, otherUserId]);

  const scrollToBottom = useCallback((animated = true) => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated });
    }, 80);
  }, []);

  const markRead = useCallback(async (id?: string) => {
    if (!id) return;
    try {
      await chatService.markConversationAsRead(id);
    } catch (error) {
      console.warn('Failed to mark conversation as read:', error);
    }
  }, []);

  const handleSaveSelectedImage = useCallback(async () => {
    if (!selectedImageUrl || savingImage) return;

    setSavingImage(true);
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Cần quyền lưu ảnh', 'Hãy cấp quyền truy cập thư viện ảnh để lưu ảnh về máy.');
        return;
      }

      const cleanUrl = selectedImageUrl.split('?')[0];
      const extension = cleanUrl.match(/\.(png|webp|jpg|jpeg)$/i)?.[1]?.toLowerCase() || 'jpg';
      const localFile = new File(Paths.cache, `snapon-chat-${Date.now()}.${extension}`);
      const downloaded = await File.downloadFileAsync(selectedImageUrl, localFile);

      await MediaLibrary.saveToLibraryAsync(downloaded.uri);
      Alert.alert('Đã lưu ảnh', 'Ảnh đã được lưu vào thư viện ảnh của bạn.');
    } catch (error) {
      console.error('Failed to save chat image:', error);
      Alert.alert('Không lưu được ảnh', 'Vui lòng thử lại sau ít phút.');
    } finally {
      setSavingImage(false);
    }
  }, [savingImage, selectedImageUrl]);

  const handleBrowseMediaImage = useCallback((direction: -1 | 1) => {
    if (!canBrowseMediaImages || imageMessages.length <= 1) return;

    const nextIndex = (selectedMediaIndex + direction + imageMessages.length) % imageMessages.length;
    setSelectedImageUrl(imageMessages[nextIndex]?.imageUrl || null);
  }, [canBrowseMediaImages, imageMessages, selectedMediaIndex]);

  const initConversation = async () => {
    try {
      if (!conversationId) {
        const conv = await chatService.startConversation(otherUserId);
        setConversationId(conv.id);
      } else {
        const data = await chatService.getMessages(conversationId);
        setMessages(data);
        await markRead(conversationId);
        scrollToBottom(false);
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

  useEffect(() => {
    if (!conversationId) return;

    let mounted = true;
    setDraftLoaded(false);

    storage.getChatDraft(conversationId).then((draft) => {
      if (!mounted) return;
      setInputText(draft?.text || '');
      setDraftLoaded(true);
    }).catch((error) => {
      console.warn('Failed to load chat draft:', error);
      if (mounted) setDraftLoaded(true);
    });

    return () => {
      mounted = false;
    };
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || !draftLoaded) return;

    const timeout = setTimeout(() => {
      void storage.setChatDraft(conversationId, inputText).catch((error) => {
        console.warn('Failed to save chat draft:', error);
      });
    }, 250);

    return () => clearTimeout(timeout);
  }, [conversationId, draftLoaded, inputText]);

  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', () => {
      scrollToBottom(true);
    });

    return () => subscription.remove();
  }, [scrollToBottom]);

  useEffect(() => {
    if (!conversationId) return;

    const handleIncomingMessage = (message: ChatMessage) => {
      if (message.conversationId === conversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
        scrollToBottom(true);

        if (message.senderId !== user?.id) {
          void markRead(conversationId);
        }
      }
    };

    const handleConversationRead = (payload: { conversationId: string; readerId: string }) => {
      if (payload.conversationId !== conversationId || payload.readerId === user?.id) return;
      setMessages((prev) => prev.map((message) => (
        message.senderId === user?.id ? { ...message, status: 'READ' } : message
      )));
    };

    socketService.on('message_received', handleIncomingMessage);
    socketService.on('conversation_read', handleConversationRead);

    return () => {
      socketService.off('message_received', handleIncomingMessage);
      socketService.off('conversation_read', handleConversationRead);
    };
  }, [conversationId, markRead, scrollToBottom, user?.id]);

  const handlePickImage = async () => {
    if (sending) return;
    setAttachmentMenuOpen(false);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Cần quyền truy cập ảnh', 'Hãy cấp quyền thư viện ảnh để gửi hình trong tin nhắn.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      base64: true,
    });

    if (result.canceled || !result.assets[0]?.base64) return;

    setPendingImage({
      uri: result.assets[0].uri,
      base64: result.assets[0].base64,
      mimeType: result.assets[0].mimeType || 'image/jpeg',
    });
  };

  const handleSend = async () => {
    const textToSend = inputText.trim();
    if ((!textToSend && !pendingImage) || !conversationId || sending) return;

    setSending(true);
    try {
      let imageUrl: string | undefined;
      if (pendingImage) {
        imageUrl = await chatService.uploadChatImage(`data:${pendingImage.mimeType || 'image/jpeg'};base64,${pendingImage.base64}`);
      }

      const newMessage = await chatService.sendMessage(conversationId, {
        text: textToSend || undefined,
        type: imageUrl ? (textToSend ? 'MIXED' : 'IMAGE') : 'TEXT',
        imageUrl,
      });

      setInputText('');
      setPendingImage(null);
      setAttachmentMenuOpen(false);
      await storage.clearChatDraft(conversationId);
      setMessages(prev => {
        if (prev.some((m) => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
      scrollToBottom(true);
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Gửi tin nhắn thất bại', 'Vui lòng thử lại sau ít phút.');
    } finally {
      setSending(false);
    }
  };

  const latestOwnReadMessageId = [...messages].reverse().find((message) => (
    message.senderId === user?.id && message.status === 'READ'
  ))?.id;

  const renderMessageItem = useCallback(({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId === user?.id;
    return (
      <MessageItem
        item={item}
        isMe={isMe}
        otherUserName={otherUserName}
        otherUserAvatar={otherUserAvatar}
        onAvatarPress={handleOtherUserPress}
        onImagePress={setSelectedImageUrl}
        showSeenLabel={isMe && item.id === latestOwnReadMessageId}
      />
    );
  }, [user?.id, otherUserName, otherUserAvatar, handleOtherUserPress, latestOwnReadMessageId]);

  const canSend = Boolean(inputText.trim() || pendingImage) && !sending;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.customHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FF6B35" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleOtherUserPress} activeOpacity={0.7} style={styles.headerInfo}>
            <UserAvatar name={otherUserName} avatarUrl={otherUserAvatar} size={36} />
            <Text style={styles.headerName}>{otherUserName}</Text>
          </TouchableOpacity>
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
        <View style={styles.customHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FF6B35" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleOtherUserPress} activeOpacity={0.7} style={styles.headerInfo}>
            <UserAvatar name={otherUserName} avatarUrl={otherUserAvatar} size={36} />
            <View style={styles.headerTextGroup}>
              <Text style={styles.headerName} numberOfLines={1}>{otherUserName}</Text>
              <Text style={styles.headerSubtitle}>Tin nhắn riêng tư</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMediaListOpen(true)}
            style={styles.headerIconButton}
            activeOpacity={0.75}
          >
            <Ionicons name="images-outline" size={21} color="#FF6B35" />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          initialNumToRender={15}
          maxToRenderPerBatch={20}
          windowSize={11}
          removeClippedSubviews={Platform.OS === 'android'}
        />

        <View style={styles.composerWrap}>
          {attachmentMenuOpen && (
            <View style={styles.attachmentPanel}>
              <TouchableOpacity
                style={styles.attachmentOption}
                onPress={handlePickImage}
                disabled={sending}
                activeOpacity={0.75}
              >
                <View style={styles.attachmentIconWrap}>
                  <Ionicons name="images-outline" size={22} color="#FF6B35" />
                </View>
                <View style={styles.attachmentTextGroup}>
                  <Text style={styles.attachmentTitle}>Ảnh từ điện thoại</Text>
                  <Text style={styles.attachmentSubtitle}>Chọn ảnh trong thư viện</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {pendingImage && (
            <View style={styles.previewContainer}>
              <Image source={{ uri: pendingImage.uri }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removePreviewButton}
                onPress={() => setPendingImage(null)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={[styles.toolButton, attachmentMenuOpen && styles.toolButtonActive]}
              onPress={() => setAttachmentMenuOpen((current) => !current)}
              disabled={sending}
              activeOpacity={0.7}
            >
              <Ionicons name="attach" size={22} color="#FF6B35" />
            </TouchableOpacity>

            <TextInput
              style={styles.textInput}
              placeholder="Nhập tin nhắn..."
              placeholderTextColor="#94A3B8"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
            />

            <TouchableOpacity
              style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!canSend}
              activeOpacity={0.7}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={mediaListOpen}
        animationType="slide"
        onRequestClose={() => setMediaListOpen(false)}
      >
        <View style={[styles.mediaModalContainer, { paddingTop: Math.max(insets.top, 18) }]}>
          <View style={styles.mediaModalHeader}>
            <TouchableOpacity
              style={styles.mediaCloseButton}
              onPress={() => setMediaListOpen(false)}
              activeOpacity={0.75}
            >
              <Ionicons name="close" size={24} color="#0F172A" />
            </TouchableOpacity>
            <View style={styles.mediaHeaderTextGroup}>
              <Text style={styles.mediaTitle}>Ảnh đã gửi</Text>
              <Text style={styles.mediaSubtitle}>{imageMessages.length} ảnh trong cuộc trò chuyện</Text>
            </View>
          </View>

          {imageMessages.length === 0 ? (
            <View style={styles.emptyMediaWrap}>
              <Ionicons name="images-outline" size={44} color="#CBD5E1" />
              <Text style={styles.emptyMediaText}>Chưa có ảnh nào trong cuộc trò chuyện này.</Text>
            </View>
          ) : (
            <FlatList
              data={imageMessages}
              keyExtractor={(item) => item.id}
              numColumns={3}
              contentContainerStyle={styles.mediaGrid}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.mediaTile}
                  activeOpacity={0.86}
                  onPress={() => {
                    setSelectedImageUrl(item.imageUrl || null);
                  }}
                >
                  <Image source={{ uri: item.imageUrl || undefined }} style={styles.mediaTileImage} />
                </TouchableOpacity>
              )}
            />
          )}

          {selectedImageUrl && canBrowseMediaImages && (
            <View style={styles.mediaImageViewerOverlay}>
              <Image
                source={{ uri: selectedImageUrl }}
                style={styles.viewerBlurBackground}
                blurRadius={28}
              />
              <View style={styles.imageViewerHeader}>
                <TouchableOpacity
                  style={styles.viewerIconButton}
                  onPress={() => setSelectedImageUrl(null)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={24} color="#FF6B35" />
                </TouchableOpacity>

                <Text style={styles.viewerCounter}>
                  {selectedMediaIndex + 1}/{imageMessages.length}
                </Text>

                <TouchableOpacity
                  style={styles.saveImageButton}
                  onPress={handleSaveSelectedImage}
                  disabled={savingImage}
                  activeOpacity={0.8}
                >
                  {savingImage ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="download-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.saveImageText}>Lưu ảnh</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.viewerImageStage}>
                <Image
                  source={{ uri: selectedImageUrl }}
                  style={styles.viewerImage}
                  resizeMode="contain"
                />
              </View>

              {imageMessages.length > 1 && (
                <>
                  <TouchableOpacity
                    style={[styles.viewerNavButton, styles.viewerNavButtonLeft]}
                    onPress={() => handleBrowseMediaImage(-1)}
                    activeOpacity={0.82}
                  >
                    <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.viewerNavButton, styles.viewerNavButtonRight]}
                    onPress={() => handleBrowseMediaImage(1)}
                    activeOpacity={0.82}
                  >
                    <Ionicons name="chevron-forward" size={28} color="#FFFFFF" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>
      </Modal>

      <Modal
        visible={Boolean(selectedImageUrl) && !mediaListOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImageUrl(null)}
      >
        <View style={styles.imageViewerBackdrop}>
          {selectedImageUrl && (
            <Image
              source={{ uri: selectedImageUrl }}
              style={styles.viewerBlurBackground}
              blurRadius={28}
            />
          )}
          <View style={styles.imageViewerHeader}>
            <TouchableOpacity
              style={styles.viewerIconButton}
              onPress={() => setSelectedImageUrl(null)}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={24} color="#FF6B35" />
            </TouchableOpacity>

            {canBrowseMediaImages && (
              <Text style={styles.viewerCounter}>
                {selectedMediaIndex + 1}/{imageMessages.length}
              </Text>
            )}

            <TouchableOpacity
              style={styles.saveImageButton}
              onPress={handleSaveSelectedImage}
              disabled={savingImage}
              activeOpacity={0.8}
            >
              {savingImage ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.saveImageText}>Lưu ảnh</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {selectedImageUrl && (
            <View style={styles.viewerImageStage}>
              <Image
                source={{ uri: selectedImageUrl }}
                style={styles.viewerImage}
                resizeMode="contain"
              />
            </View>
          )}

          {canBrowseMediaImages && imageMessages.length > 1 && (
            <>
              <TouchableOpacity
                style={[styles.viewerNavButton, styles.viewerNavButtonLeft]}
                onPress={() => handleBrowseMediaImage(-1)}
                activeOpacity={0.82}
              >
                <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewerNavButton, styles.viewerNavButtonRight]}
                onPress={() => handleBrowseMediaImage(1)}
                activeOpacity={0.82}
              >
                <Ionicons name="chevron-forward" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flexContainer: {
    flex: 1,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
  headerTextGroup: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    marginTop: 1,
    fontSize: 11,
    color: '#64748B',
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '84%',
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
  imageMessageWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  myBubble: {
    backgroundColor: '#FF6B35',
    borderBottomRightRadius: 2,
  },
  otherBubble: {
    backgroundColor: '#F1F5F9',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  messageImageButton: {
    width: 236,
    backgroundColor: '#E2E8F0',
  },
  messageImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E2E8F0',
  },
  imageCaptionText: {
    maxWidth: 236,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 2,
    fontSize: 15,
    lineHeight: 20,
    color: '#0F172A',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#0F172A',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    minHeight: 13,
  },
  timeText: {
    fontSize: 10,
  },
  myTimeText: {
    color: 'rgba(255,255,255,0.76)',
  },
  otherTimeText: {
    color: '#64748B',
  },
  imageMetaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 26,
    backgroundColor: '#F8FAFC',
  },
  myImageMetaBar: {
    backgroundColor: '#FFF7F3',
  },
  otherImageMetaBar: {
    backgroundColor: '#F8FAFC',
  },
  imageTimeText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  statusIcon: {
    marginLeft: 4,
  },
  seenLabel: {
    marginTop: 2,
    alignSelf: 'flex-end',
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.82)',
  },
  imageSeenLabel: {
    marginTop: 0,
    paddingRight: 10,
    paddingBottom: 6,
    color: '#FF6B35',
  },
  composerWrap: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  attachmentPanel: {
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  attachmentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFF7F3',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.22)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  attachmentIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  attachmentTextGroup: {
    maxWidth: 190,
  },
  attachmentTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  attachmentSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748B',
  },
  previewContainer: {
    width: 82,
    height: 82,
    marginLeft: 14,
    marginTop: 10,
    borderRadius: 12,
  },
  previewImage: {
    width: 82,
    height: 82,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  removePreviewButton: {
    position: 'absolute',
    top: -7,
    right: -7,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 10,
  },
  toolButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolButtonActive: {
    backgroundColor: 'rgba(255, 107, 53, 0.18)',
  },
  textInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 15,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  imageViewerBackdrop: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  mediaImageViewerOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    elevation: 10,
    backgroundColor: '#F8FAFC',
  },
  viewerBlurBackground: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.18,
  },
  imageViewerHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 24,
    left: 16,
    right: 16,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(15, 23, 42, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveImageButton: {
    minWidth: 104,
    height: 42,
    borderRadius: 21,
    paddingHorizontal: 14,
    backgroundColor: '#FF6B35',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveImageText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  viewerCounter: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(15, 23, 42, 0.12)',
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
  viewerImageStage: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 108 : 84,
    paddingBottom: 96,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  viewerNavButton: {
    position: 'absolute',
    top: '48%',
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerNavButtonLeft: {
    left: 14,
  },
  viewerNavButtonRight: {
    right: 14,
  },
  mediaModalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mediaModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  mediaCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mediaHeaderTextGroup: {
    flex: 1,
  },
  mediaTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  mediaSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748B',
  },
  mediaGrid: {
    padding: 4,
  },
  mediaTile: {
    width: '33.333%',
    aspectRatio: 1,
    padding: 3,
  },
  mediaTileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  emptyMediaWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyMediaText: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    color: '#64748B',
  },
});
