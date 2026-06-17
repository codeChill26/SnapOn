import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { AppColors } from '../../theme';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { UserAvatar } from '../../components/common/UserAvatar';
import { Tabs } from '../../components/ui/Tabs';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { walletService } from '../../services/walletService';
import { UserRole } from '../../types';
import { formatCurrency, formatShortDate } from '../../utils/format';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { authService } from '../../services/authService';
import * as ImagePicker from 'expo-image-picker';

type ProfileNavProp = NativeStackNavigationProp<RootStackParamList>;

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileNavProp>();
  const { user, logout, switchRole, updateUser } = useAuth();
  const { wallet, setWallet } = useApp();

  // Profile Completeness Calculation
  const getProfileCompletion = () => {
    const items = [
      { key: 'name', label: 'Họ và tên', value: !!user?.fullName },
      { key: 'email', label: 'Địa chỉ Email', value: !!user?.email },
      { key: 'phone', label: 'Số điện thoại', value: !!user?.phone },
      { key: 'avatar', label: 'Ảnh đại diện', value: !!user?.avatarUrl },
      { key: 'verification', label: 'Xác thực danh tính', value: !!user?.isVerified },
    ];
    const completedCount = items.filter(item => item.value).length;
    const score = completedCount * 20;
    return { score, items };
  };
  const { score: completenessScore, items: completenessItems } = getProfileCompletion();

  // Verification Wizard States
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyStep, setVerifyStep] = useState(1); // 1: Phone, 2: Front ID, 3: Back ID, 4: Selfie, 5: Submitting
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);

  // Phone Verification States
  const [verifyPhone, setVerifyPhone] = useState(user?.phone || '');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  // OTP Countdown Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [otpTimer]);

  const handleSendOtp = () => {
    if (!verifyPhone.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');
      return;
    }
    setIsOtpSent(true);
    setOtpCode('');
    setOtpTimer(60);
    Alert.alert(
      'Mã OTP (Thử nghiệm)',
      `Mã OTP đã được gửi đến số điện thoại của bạn.\nVui lòng nhập mã: 123456`
    );
  };

  const handleVerifyOtp = () => {
    if (otpCode === '123456') {
      setIsPhoneVerified(true);
      Alert.alert('Thành công', 'Xác thực số điện thoại thành công!');
    } else {
      Alert.alert('Lỗi', 'Mã OTP không chính xác. Vui lòng nhập lại (Mã thử nghiệm: 123456)');
    }
  };

  const handleOpenVerifyModal = () => {
    setFrontImage(null);
    setBackImage(null);
    setSelfieImage(null);
    setVerifyPhone(user?.phone || '');
    setOtpCode('');
    setIsOtpSent(false);
    setIsPhoneVerified(false);
    setOtpTimer(0);
    setVerifyStep(1);
    setIsVerifyModalOpen(true);
  };

  const handleSelectImage = async (step: number, useCamera: boolean) => {
    try {
      let status;
      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        status = permission.status;
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        status = permission.status;
      }

      if (status !== 'granted') {
        Alert.alert(
          'Quyền truy cập',
          `Ứng dụng cần quyền truy cập ${useCamera ? 'máy ảnh' : 'thư viện ảnh'} để tiếp tục xác thực.`
        );
        return;
      }

      const pickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: (step === 3 ? [1, 1] : [16, 9]) as [number, number],
        quality: 0.6,
        base64: true,
      };

      const result = useCamera
        ? await ImagePicker.launchCameraAsync(pickerOptions)
        : await ImagePicker.launchImageLibraryAsync(pickerOptions);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const base64Data = result.assets[0].base64;
        if (base64Data) {
          const imageUri = `data:image/jpeg;base64,${base64Data}`;
          if (step === 1) setFrontImage(imageUri);
          else if (step === 2) setBackImage(imageUri);
          else if (step === 3) setSelfieImage(imageUri);
        } else {
          Alert.alert('Lỗi', 'Không thể đọc dữ liệu ảnh.');
        }
      }
    } catch (error) {
      console.error('Select image error:', error);
      Alert.alert('Lỗi', 'Đã xảy ra lỗi khi chụp/chọn ảnh.');
    }
  };

  const handleSubmitVerification = async () => {
    if (!frontImage || !backImage || !selfieImage) {
      Alert.alert('Lỗi', 'Vui lòng cung cấp đầy đủ 3 ảnh để gửi xác thực.');
      return;
    }

    setVerifyStep(5);
    try {
      // If the verified phone number is different from the current user phone, update the profile on backend first
      if (verifyPhone && verifyPhone.trim() !== user?.phone) {
        try {
          const updatedProfile = await authService.updateProfile({ phone: verifyPhone.trim() });
          updateUser(updatedProfile);
        } catch (phoneErr) {
          console.warn('Failed to update phone number in profile:', phoneErr);
        }
      }

      const updatedUser = await authService.verifyAccount(frontImage, backImage, selfieImage);
      updateUser(updatedUser);
      setIsVerifyModalOpen(false);
      Alert.alert(
        'Thành công',
        'Tài khoản của bạn đã được xác thực thành công!'
      );
      setFrontImage(null);
      setBackImage(null);
      setSelfieImage(null);
      setVerifyStep(1);
    } catch (error: any) {
      console.error('Submit verification error:', error);
      Alert.alert('Thất bại', error.message || 'Gửi tài liệu xác thực thất bại. Vui lòng thử lại.');
      setVerifyStep(4);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      const loadWallet = async () => {
        try {
          const walletData = await walletService.getMyWallet();
          if (isMounted) {
            setWallet(walletData);
          }
        } catch (error) {
          console.error('Failed to load wallet in ProfileScreen:', error);
        }
      };
      loadWallet();
      return () => {
        isMounted = false;
      };
    }, [setWallet])
  );

  // State for editing profile
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
  const [editName, setEditName] = useState(user?.fullName || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editAvatarUrl, setEditAvatarUrl] = useState(user?.avatarUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleOpenEditModal = () => {
    setEditName(user?.fullName || '');
    setEditPhone(user?.phone || '');
    setEditAvatarUrl(user?.avatarUrl || '');
    setIsEditModalOpen(true);
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Ứng dụng cần quyền truy cập thư viện ảnh để thay đổi avatar.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          setIsUploading(true);
          const uploadedUrl = await authService.uploadAvatar(asset.base64);
          setEditAvatarUrl(uploadedUrl);
          Alert.alert('Thành công', 'Đã tải ảnh lên thành công!');
        } else {
          Alert.alert('Lỗi', 'Không thể đọc dữ liệu ảnh.');
        }
      }
    } catch (error: any) {
      console.error('Pick image error:', error);
      Alert.alert('Lỗi', 'Đã xảy ra lỗi khi chọn hoặc tải ảnh lên.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Lỗi', 'Họ và tên không được để trống');
      return;
    }
    setIsSaving(true);
    try {
      const updatedUser = await authService.updateProfile({
        fullName: editName.trim(),
        phone: editPhone.trim() || undefined,
        avatarUrl: editAvatarUrl.trim() || undefined,
      });
      updateUser(updatedUser);
      setIsEditModalOpen(false);
      Alert.alert('Thành công', 'Cập nhật thông tin cá nhân thành công!');
    } catch (error: any) {
      console.error('Update profile error:', error);
      Alert.alert('Thất bại', error.message || 'Không thể cập nhật thông tin');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: logout },
    ]);
  };

  const handleSwitchRole = (role: UserRole) => {

    Alert.alert('Chuyển vai trò', `Chuyển sang vai trò ${role === 'hirer' ? 'Người thuê' : 'Người làm'}?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xác nhận', 
        onPress: () => switchRole(role),
      },
    ]);
  };

  const isWorker = user?.role === 'worker';
  const themeColor = isWorker ? Colors.info : Colors.primary;

  const roleLabel = user?.role === 'hirer' ? 'Người thuê' : user?.role === 'worker' ? 'Người làm' : 'Admin';

  const quickActions = isWorker
    ? [
        {
          label: 'Tìm việc làm',
          icon: 'search-outline',
          onPress: () => (navigation as any).navigate('Home'),
        },
        {
          label: 'Việc đã nhận',
          icon: 'clipboard-outline',
          onPress: () => (navigation as any).navigate('Activity'),
        },
        {
          label: 'Ví & Thu nhập',
          icon: 'cash-outline',
          onPress: () => navigation.navigate('Wallet', { scrollToHistory: false }),
        },
      ]
    : [
        {
          label: 'Đăng việc mới',
          icon: 'add-circle-outline',
          onPress: () => (navigation as any).navigate('PostJob'),
        },
        {
          label: 'Việc đã đăng',
          icon: 'clipboard-outline',
          onPress: () => (navigation as any).navigate('Activity'),
        },
        {
          label: 'Lịch sử ví',
          icon: 'receipt-outline',
          onPress: () => navigation.navigate('Wallet', { scrollToHistory: true }),
        },
      ];

   const mockReviews = isWorker
    ? [
        {
          id: '1',
          reviewerName: 'Trần Thị Mai',
          rating: 5,
          comment: 'Sửa điện nước rất nhanh và nhiệt tình. Giá cả phải chăng, dọn dẹp sạch sẽ sau khi làm.',
          timeAgo: '2 ngày trước',
          taskName: 'Sửa ống nước bồn rửa bát',
        },
        {
          id: '2',
          reviewerName: 'Phạm Minh Đức',
          rating: 4.5,
          comment: 'Làm việc chuyên nghiệp, đúng giờ. Rất hài lòng với dịch vụ sơn tường nhà.',
          timeAgo: '1 tuần trước',
          taskName: 'Sơn dặm vá tường phòng khách',
        },
      ]
    : [
        {
          id: '1',
          reviewerName: 'Lê Hoàng Nam (Thợ)',
          rating: 5,
          comment: 'Chủ nhà thân thiện, chỉ dẫn rõ ràng. Hoàn thành công việc xong nhận thanh toán ngay.',
          timeAgo: '3 ngày trước',
          taskName: 'Dọn dẹp vệ sinh nhà cửa',
        },
        {
          id: '2',
          reviewerName: 'Nguyễn Tiến Dũng (Thợ)',
          rating: 5,
          comment: 'Giao tiếp tốt, thanh toán nhanh chóng qua ví. Hy vọng sẽ hợp tác lại.',
          timeAgo: '2 tuần trước',
          taskName: 'Lắp ráp tủ quần áo 3 cánh',
        },
      ];

  const SettingsRow = ({ icon, label, value, onPress, danger }: { icon: string; label: string; value?: string; onPress: () => void; danger?: boolean }) => (
    <TouchableOpacity style={styles.settingsRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.settingsRowLeft}>
        <View style={[styles.settingsIconContainer, { backgroundColor: (danger ? Colors.error : themeColor) + '15' }]}>
          <Ionicons name={icon as any} size={18} color={danger ? Colors.error : themeColor} />
        </View>
        <Text style={[styles.settingsRowLabel, danger && styles.settingsRowLabelDanger]}>{label}</Text>
      </View>
      <View style={styles.settingsRowRight}>
        {value ? <Text style={styles.settingsRowValue}>{value}</Text> : null}
        <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColor }]}>
        <View style={styles.headerContentRow}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarContainer}>
              <UserAvatar
                name={user?.fullName || 'User'}
                avatarUrl={user?.avatarUrl}
                size={80}
              />
            </View>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.userName} numberOfLines={1}>{user?.fullName || 'Người dùng'}</Text>
            
            <View style={styles.badgeRow}>
              {user?.isVerified ? (
                <View style={styles.verifiedTextBadgeHeader}>
                  <Ionicons name="shield-checkmark" size={12} color={Colors.textWhite} />
                  <Text style={styles.verifiedTextBadgeTextHeader}>Đã xác thực</Text>
                </View>
              ) : (
                <View style={styles.unverifiedTextBadgeHeader}>
                  <Ionicons name="shield-outline" size={12} color={Colors.textWhite} />
                  <Text style={styles.unverifiedTextBadgeTextHeader}>Chưa xác thực</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Header Action Row: Edit Profile & Role Switcher */}
        <View style={styles.headerActionRow}>
          <TouchableOpacity 
            style={styles.headerEditProfileButton} 
            onPress={handleOpenEditModal} 
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={14} color={Colors.textWhite} />
            <Text style={styles.headerEditProfileText}>Chỉnh sửa hồ sơ</Text>
          </TouchableOpacity>

          <View style={styles.roleButtonsWrapperHeader}>
            <TouchableOpacity
              style={[styles.roleSwitchButtonHeader, user?.role === 'hirer' && styles.roleSwitchButtonActiveHeader]}
              onPress={() => user?.role !== 'hirer' && handleSwitchRole('hirer')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="people"
                size={14}
                color={user?.role === 'hirer' ? themeColor : 'rgba(255, 255, 255, 0.8)'}
                style={styles.roleSwitchIcon}
              />
              <Text style={[styles.roleSwitchTextHeader, user?.role === 'hirer' && [styles.roleSwitchTextActiveHeader, { color: themeColor }]]}>Thuê</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleSwitchButtonHeader, user?.role === 'worker' && styles.roleSwitchButtonActiveHeader]}
              onPress={() => user?.role !== 'worker' && handleSwitchRole('worker')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="construct"
                size={14}
                color={user?.role === 'worker' ? themeColor : 'rgba(255, 255, 255, 0.8)'}
                style={styles.roleSwitchIcon}
              />
              <Text style={[styles.roleSwitchTextHeader, user?.role === 'worker' && [styles.roleSwitchTextActiveHeader, { color: themeColor }]]}>Làm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Verification Status Warning Card */}
      {!user?.isVerified && (
        <TouchableOpacity 
          style={styles.unverifiedAlertCard} 
          onPress={handleOpenVerifyModal}
          activeOpacity={0.8}
        >
          <View style={styles.unverifiedAlertContent}>
            <View style={styles.unverifiedAlertLeft}>
              <Ionicons name="alert-circle" size={22} color={Colors.warning} />
              <View style={styles.unverifiedAlertTextContainer}>
                <Text style={styles.unverifiedAlertTitle}>Tài khoản chưa xác thực danh tính</Text>
                <Text style={styles.unverifiedAlertDesc}>Xác thực ngay để tăng 200% cơ hội kết nối việc làm và bảo mật.</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
          </View>
        </TouchableOpacity>
      )}

      {/* Trust & Verification Completeness Progress */}
      <Card style={styles.completionCard} variant="glass">
        <View style={styles.completionHeader}>
          <Text style={styles.completionTitle}>Độ hoàn thiện hồ sơ</Text>
          <Text style={[styles.completionScore, { color: themeColor }]}>{completenessScore}%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${completenessScore}%`, backgroundColor: themeColor }]} />
        </View>

        {completenessScore < 100 ? (
          <View style={styles.motivationBanner}>
            <Ionicons name="bulb-outline" size={16} color={themeColor} />
            <Text style={styles.motivationText}>
              Gợi ý: {user?.isVerified 
                ? "Cập nhật đầy đủ họ tên, số điện thoại & ảnh đại diện để đạt 100% độ tin cậy." 
                : "Hoàn thành xác thực danh tính để đạt 100% và tăng uy tín với đối tác."}

            </Text>
          </View>
        ) : (
          <View style={[styles.motivationBanner, { backgroundColor: Colors.success + '10' }]}>
            <Ionicons name="checkmark-done-circle" size={16} color={Colors.success} />
            <Text style={[styles.motivationText, { color: Colors.success }]}>
              Hồ sơ của bạn đã hoàn thành 100%! Bạn đã sẵn sàng kết nối.
            </Text>
          </View>
        )}

        <View style={styles.checklistGrid}>
          {completenessItems.map(item => {
            const isDone = item.value;
            const onPressItem = () => {
              if (item.key === 'name' || item.key === 'phone' || item.key === 'avatar') {
                handleOpenEditModal();
              } else if (item.key === 'verification') {
                if (user?.isVerified) {
                  Alert.alert("Xác thực", "Tài khoản của bạn đã được xác thực thành công.");
                } else {
                  handleOpenVerifyModal();
                }
              }
            };
            return (
              <TouchableOpacity 
                key={item.key} 
                style={[styles.checklistItem, isDone && { borderColor: Colors.success + '30' }]} 
                onPress={onPressItem}
                disabled={item.key === 'email'}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={isDone ? "checkmark-circle" : "ellipse-outline"} 
                  size={16} 
                  color={isDone ? Colors.success : Colors.textLight} 
                />
                <Text style={[styles.checklistLabel, isDone && styles.checklistLabelDone]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      {/* Stats Card Grid & Wallet Balance */}
      <Card style={styles.statsCardContainer} variant="glass">
        <Text style={styles.sectionTitle}>Thống kê & Tài chính</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCardBlock}>
            <Ionicons name="star" size={18} color={Colors.warning} />
            <Text style={styles.statBlockValue}>4.8 ★</Text>
            <Text style={styles.statBlockSubText}>(12 đánh giá)</Text>
            <View style={styles.statBadge}>
              <Text style={styles.statBadgeText}>Cực kỳ uy tín</Text>
            </View>
          </View>
          
          <View style={styles.statCardBlock}>
            <Ionicons name="checkmark-done-circle" size={18} color={Colors.success} />
            <Text style={styles.statBlockValue}>12 việc</Text>
            <Text style={styles.statBlockSubText}>Đã hoàn thành</Text>
            <View style={[styles.statBadge, { backgroundColor: '#10B98115' }]}>
              <Text style={[styles.statBadgeText, { color: Colors.success }]}>Huy hiệu Đồng</Text>
            </View>
          </View>

          <View style={styles.statCardBlock}>
            <Ionicons name="trending-up" size={18} color={Colors.info} />
            <Text style={styles.statBlockValue}>98%</Text>
            <Text style={styles.statBlockSubText}>Tỷ lệ HT việc</Text>
            <View style={[styles.statBadge, { backgroundColor: '#3B82F615' }]}>
              <Text style={[styles.statBadgeText, { color: Colors.info }]}>Chuẩn 5 sao</Text>
            </View>
          </View>
        </View>

        <View style={styles.walletBar}>
          <View style={styles.walletBarLeft}>
            <Ionicons name="wallet-outline" size={22} color={themeColor} />
            <View style={styles.walletBarTextContainer}>
              <Text style={styles.walletBarLabel}>Số dư ví khả dụng</Text>
              <Text style={styles.walletBarValue}>
                {wallet ? formatCurrency(wallet.availableBalance) : '0đ'}
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={[styles.walletBarButton, { backgroundColor: themeColor }]}
            onPress={() => navigation.navigate('Wallet', { hideHistory: true })}
            activeOpacity={0.7}
          >
            <Text style={styles.walletBarButtonText}>Nạp tiền</Text>
            <Ionicons name="arrow-forward" size={14} color={Colors.textWhite} />
          </TouchableOpacity>
        </View>
      </Card>

      {/* Role-based Quick Actions */}
      <Card style={styles.quickActionsCard} variant="glass">
        <Text style={styles.sectionTitle}>Thao tác nhanh</Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={styles.quickActionBlock} 
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIconContainer, { backgroundColor: themeColor + '12' }]}>
                <Ionicons name={action.icon as any} size={22} color={themeColor} />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Recent Reviews (Social Proof Feed) */}
      <Card style={styles.reviewsCard} variant="glass">
        <View style={styles.reviewsHeader}>
          <Text style={styles.sectionTitle}>Đánh giá gần đây</Text>
          <TouchableOpacity onPress={() => Alert.alert("Tất cả đánh giá", "Tính năng xem tất cả đánh giá đang được phát triển.")}>
            <Text style={[styles.viewAllText, { color: themeColor }]}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.reviewsList}>
          {mockReviews.map((rev) => (
            <View key={rev.id} style={styles.reviewItem}>
              <View style={styles.reviewItemHeader}>
                <View style={styles.reviewItemLeft}>
                  <Text style={styles.reviewerName}>{rev.reviewerName}</Text>
                  <Text style={styles.reviewTaskName}>{rev.taskName}</Text>
                </View>
                <View style={styles.reviewItemRight}>
                  <View style={styles.reviewRatingRow}>
                    <Ionicons name="star" size={12} color={Colors.warning} />
                    <Text style={styles.reviewRatingValue}>{rev.rating}</Text>
                  </View>
                  <Text style={styles.reviewTimeAgo}>{rev.timeAgo}</Text>
                </View>
              </View>
              <Text style={styles.reviewComment} numberOfLines={2}>
                "{rev.comment}"
              </Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Account Info Details */}
      <Card style={styles.accountInfoCard} variant="glass">
        <Text style={styles.sectionTitle}>Thông tin tài khoản</Text>
        
        <View style={styles.infoRow}>
          <View style={styles.infoLabelContainer}>
            <Ionicons name="mail-outline" size={18} color={Colors.textSecondary} style={styles.infoIcon} />
            <Text style={styles.infoLabel}>Địa chỉ Email</Text>
          </View>
          <Text style={styles.infoValue}>{user?.email || 'N/A'}</Text>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoLabelContainer}>
            <Ionicons name="call-outline" size={18} color={Colors.textSecondary} style={styles.infoIcon} />
            <Text style={styles.infoLabel}>Số điện thoại</Text>
          </View>
          <Text style={styles.infoValue}>{user?.phone || 'Chưa cập nhật'}</Text>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoLabelContainer}>
            <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} style={styles.infoIcon} />
            <Text style={styles.infoLabel}>Tham gia ngày</Text>
          </View>
          <Text style={styles.infoValue}>
            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
          </Text>
        </View>
      </Card>

      {/* General Settings */}
      <View style={styles.settingsContainer}>
        <View style={styles.settingsSection}>
          <Text style={styles.settingsSectionTitle}>Dịch vụ & Hệ thống</Text>
          <Card style={styles.settingsCard} padded={false} variant="glass">
            <SettingsRow
              icon="wallet-outline"
              label="Lịch sử giao dịch ví"
              onPress={() => navigation.navigate('Wallet', { scrollToHistory: true } as any)}
            />
            <View style={styles.rowDivider} />
            <SettingsRow
              icon="shield-checkmark-outline"
              label="Bảo mật & Xác thực"
              value={user?.isVerified ? "Đã xác thực" : "Chưa xác thực"}
              onPress={() => {
                if (user?.isVerified) {
                  Alert.alert("Xác thực", "Tài khoản của bạn đã được xác thực thành công.");
                } else {
                  handleOpenVerifyModal();
                }
              }}
            />
            <View style={styles.rowDivider} />
            <SettingsRow
              icon="notifications-outline"
              label="Thông báo"
              onPress={() => Alert.alert("Thông báo", "Chức năng thông báo đang được phát triển.")}
            />
            <View style={styles.rowDivider} />
            <SettingsRow
              icon="document-text-outline"
              label="Điều khoản dịch vụ"
              onPress={() => Alert.alert("Điều khoản", "Điều khoản và chính sách dịch vụ của SnapOn.")}
            />
            <View style={styles.rowDivider} />
            <SettingsRow
              icon="log-out-outline"
              label="Đăng xuất"
              onPress={handleLogout}
              danger
            />
          </Card>
        </View>
      </View>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Chỉnh sửa thông tin"
      >
        <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled">
          <View style={styles.avatarPickerContainer}>
            <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8} style={styles.avatarPickerTouch} disabled={isUploading}>
              <UserAvatar
                name={editName || 'User'}
                avatarUrl={editAvatarUrl}
                size={84}
              />
              <View style={styles.cameraIconContainer}>
                <Ionicons name="camera" size={16} color={Colors.textWhite} />
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarPickerHelpText}>
              {isUploading ? 'Đang tải ảnh lên...' : 'Chạm để đổi ảnh đại diện'}
            </Text>
          </View>

          <Input
            label="Họ và tên"
            placeholder="Nhập họ và tên"
            value={editName}
            onChangeText={setEditName}
          />
          <Input
            label="Số điện thoại"
            placeholder="Nhập số điện thoại"
            value={editPhone}
            onChangeText={setEditPhone}
            keyboardType="phone-pad"
          />

          <View style={styles.modalButtons}>
            <Button
              title="Hủy"
              variant="outline"
              onPress={() => setIsEditModalOpen(false)}
              style={styles.modalButton}
            />
            <Button
              title="Lưu"
              onPress={handleSaveProfile}
              loading={isSaving}
              style={styles.modalButton}
            />
          </View>
        </ScrollView>
      </Modal>

      {/* Account Verification Modal (Wizard) */}
      <Modal
        visible={isVerifyModalOpen}
        onClose={() => {
          if (verifyStep !== 5) {
            setIsVerifyModalOpen(false);
          }
        }}
        title="Xác thực tài khoản"
      >
        <View style={styles.verifyModalContainer}>
          {verifyStep !== 5 && (
            <View style={styles.verifyWizardProgress}>
              <View style={[styles.verifyProgressDot, verifyStep >= 1 && { backgroundColor: themeColor }]}>
                <Text style={[styles.verifyProgressDotText, verifyStep >= 1 && styles.verifyProgressDotTextActive]}>1</Text>
              </View>
              <View style={[styles.verifyProgressLine, verifyStep >= 2 && { backgroundColor: themeColor }]} />
              <View style={[styles.verifyProgressDot, verifyStep >= 2 && { backgroundColor: themeColor }]}>
                <Text style={[styles.verifyProgressDotText, verifyStep >= 2 && styles.verifyProgressDotTextActive]}>2</Text>
              </View>
              <View style={[styles.verifyProgressLine, verifyStep >= 3 && { backgroundColor: themeColor }]} />
              <View style={[styles.verifyProgressDot, verifyStep >= 3 && { backgroundColor: themeColor }]}>
                <Text style={[styles.verifyProgressDotText, verifyStep >= 3 && styles.verifyProgressDotTextActive]}>3</Text>
              </View>
              <View style={[styles.verifyProgressLine, verifyStep >= 4 && { backgroundColor: themeColor }]} />
              <View style={[styles.verifyProgressDot, verifyStep >= 4 && { backgroundColor: themeColor }]}>
                <Text style={[styles.verifyProgressDotText, verifyStep >= 4 && styles.verifyProgressDotTextActive]}>4</Text>
              </View>
            </View>
          )}

          {verifyStep === 1 && (
            <View style={{ width: '100%', gap: 12 }}>
              <Text style={styles.verifyStepTitle}>Xác thực số điện thoại</Text>
              <Text style={styles.verifyStepDesc}>Nhập số điện thoại để nhận mã xác thực OTP gửi về thiết bị.</Text>
              
              <Input
                label="Số điện thoại"
                placeholder="Nhập số điện thoại của bạn"
                value={verifyPhone}
                onChangeText={(txt) => {
                  setVerifyPhone(txt);
                  setIsPhoneVerified(false);
                  setIsOtpSent(false);
                }}
                keyboardType="phone-pad"
                editable={!isPhoneVerified}
              />

              {!isPhoneVerified && (
                <View style={{ width: '100%', alignItems: 'stretch', gap: 10 }}>
                  <Button
                    title={otpTimer > 0 ? `Gửi lại mã sau (${otpTimer}s)` : (isOtpSent ? "Gửi lại mã OTP" : "Gửi mã OTP")}
                    onPress={handleSendOtp}
                    variant="outline"
                    disabled={otpTimer > 0}
                    style={StyleSheet.flatten([{ borderColor: themeColor }])}
                    textStyle={{ color: themeColor }}
                  />

                  {isOtpSent && (
                    <View style={{ width: '100%', gap: 10 }}>
                      <Input
                        label="Nhập mã OTP"
                        placeholder="Nhập mã OTP 6 chữ số"
                        value={otpCode}
                        onChangeText={setOtpCode}
                        keyboardType="numeric"
                        maxLength={6}
                      />
                      <View style={styles.verifyOtpTipBox}>
                        <Text style={styles.verifyOtpTipText}>💡 Mã OTP thử nghiệm là: 123456</Text>
                      </View>
                      <Button
                        title="Xác minh OTP"
                        onPress={handleVerifyOtp}
                        disabled={otpCode.length < 6}
                        style={StyleSheet.flatten([{ backgroundColor: themeColor }])}
                      />
                    </View>
                  )}
                </View>
              )}

              {isPhoneVerified && (
                <View style={styles.verifyPhoneSuccessBox}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                  <Text style={styles.verifyPhoneSuccessText}>Số điện thoại đã được xác thực thành công!</Text>
                </View>
              )}

              <View style={styles.modalButtons}>
                <Button
                  title="Hủy"
                  variant="outline"
                  onPress={() => setIsVerifyModalOpen(false)}
                  style={StyleSheet.flatten([styles.modalButton, { borderColor: themeColor }])}
                  textStyle={{ color: themeColor }}
                />
                <Button
                  title="Tiếp tục"
                  disabled={!isPhoneVerified}
                  onPress={() => setVerifyStep(2)}
                  style={StyleSheet.flatten([styles.modalButton, { backgroundColor: themeColor }])}
                />
              </View>
            </View>
          )}

          {verifyStep === 2 && (
            <View style={{ width: '100%', gap: 12 }}>
              <Text style={styles.verifyStepTitle}>Mặt trước CCCD</Text>
              <Text style={styles.verifyStepDesc}>Chụp hoặc chọn ảnh mặt trước của Căn cước công dân của bạn.</Text>
              
              <View style={styles.verifyPreviewBox}>
                {frontImage ? (
                  <Image source={{ uri: frontImage }} style={styles.verifyPreviewImage} />
                ) : (
                  <View style={styles.verifyPlaceholder}>
                    <Ionicons name="card-outline" size={40} color={Colors.textLight} />
                    <Text style={styles.verifyPlaceholderText}>Chưa có ảnh mặt trước</Text>
                  </View>
                )}
              </View>

              <View style={styles.verifyActionButtons}>
                <Button
                  title="Chụp ảnh"
                  icon={<Ionicons name="camera" size={18} color={themeColor} />}
                  variant="outline"
                  onPress={() => handleSelectImage(1, true)}
                  style={StyleSheet.flatten([styles.verifyActionButton, { borderColor: themeColor }])}
                  textStyle={{ color: themeColor }}
                />
                <Button
                  title="Chọn từ thư viện"
                  icon={<Ionicons name="image" size={18} color={themeColor} />}
                  variant="outline"
                  onPress={() => handleSelectImage(1, false)}
                  style={StyleSheet.flatten([styles.verifyActionButton, { borderColor: themeColor }])}
                  textStyle={{ color: themeColor }}
                />
              </View>

              <View style={styles.modalButtons}>
                <Button
                  title="Quay lại"
                  variant="outline"
                  onPress={() => setVerifyStep(1)}
                  style={StyleSheet.flatten([styles.modalButton, { borderColor: themeColor }])}
                  textStyle={{ color: themeColor }}
                />
                <Button
                  title="Tiếp tục"
                  disabled={!frontImage}
                  onPress={() => setVerifyStep(3)}
                  style={StyleSheet.flatten([styles.modalButton, { backgroundColor: themeColor }])}
                />
              </View>
            </View>
          )}

          {verifyStep === 3 && (
            <View style={{ width: '100%', gap: 12 }}>
              <Text style={styles.verifyStepTitle}>Mặt sau CCCD</Text>
              <Text style={styles.verifyStepDesc}>Chụp hoặc chọn ảnh mặt sau của Căn cước công dân của bạn.</Text>
              
              <View style={styles.verifyPreviewBox}>
                {backImage ? (
                  <Image source={{ uri: backImage }} style={styles.verifyPreviewImage} />
                ) : (
                  <View style={styles.verifyPlaceholder}>
                    <Ionicons name="card-outline" size={40} color={Colors.textLight} />
                    <Text style={styles.verifyPlaceholderText}>Chưa có ảnh mặt sau</Text>
                  </View>
                )}
              </View>

              <View style={styles.verifyActionButtons}>
                <Button
                  title="Chụp ảnh"
                  icon={<Ionicons name="camera" size={18} color={themeColor} />}
                  variant="outline"
                  onPress={() => handleSelectImage(2, true)}
                  style={StyleSheet.flatten([styles.verifyActionButton, { borderColor: themeColor }])}
                  textStyle={{ color: themeColor }}
                />
                <Button
                  title="Chọn từ thư viện"
                  icon={<Ionicons name="image" size={18} color={themeColor} />}
                  variant="outline"
                  onPress={() => handleSelectImage(2, false)}
                  style={StyleSheet.flatten([styles.verifyActionButton, { borderColor: themeColor }])}
                  textStyle={{ color: themeColor }}
                />
              </View>

              <View style={styles.modalButtons}>
                <Button
                  title="Quay lại"
                  variant="outline"
                  onPress={() => setVerifyStep(2)}
                  style={StyleSheet.flatten([styles.modalButton, { borderColor: themeColor }])}
                  textStyle={{ color: themeColor }}
                />
                <Button
                  title="Tiếp tục"
                  disabled={!backImage}
                  onPress={() => setVerifyStep(4)}
                  style={StyleSheet.flatten([styles.modalButton, { backgroundColor: themeColor }])}
                />
              </View>
            </View>
          )}

          {verifyStep === 4 && (
            <View style={{ width: '100%', gap: 12 }}>
              <Text style={styles.verifyStepTitle}>Ảnh Selfie đối chiếu</Text>
              <Text style={styles.verifyStepDesc}>Chụp ảnh khuôn mặt của bạn trực tiếp tại chỗ, thấy rõ ngũ quan.</Text>
              
              <View style={[styles.verifyPreviewBox, { height: 200, alignSelf: 'center', width: 200, borderRadius: 100 }]}>
                {selfieImage ? (
                  <Image source={{ uri: selfieImage }} style={styles.verifyPreviewImage} />
                ) : (
                  <View style={styles.verifyPlaceholder}>
                    <Ionicons name="person-outline" size={40} color={Colors.textLight} />
                    <Text style={styles.verifyPlaceholderText}>Chưa có ảnh selfie</Text>
                  </View>
                )}
              </View>

              <View style={styles.verifyActionButtons}>
                <Button
                  title="Chụp ảnh"
                  icon={<Ionicons name="camera" size={18} color={themeColor} />}
                  variant="outline"
                  onPress={() => handleSelectImage(3, true)}
                  style={StyleSheet.flatten([styles.verifyActionButton, { borderColor: themeColor }])}
                  textStyle={{ color: themeColor }}
                />
                <Button
                  title="Chọn từ thư viện"
                  icon={<Ionicons name="image" size={18} color={themeColor} />}
                  variant="outline"
                  onPress={() => handleSelectImage(3, false)}
                  style={StyleSheet.flatten([styles.verifyActionButton, { borderColor: themeColor }])}
                  textStyle={{ color: themeColor }}
                />
              </View>

              <View style={styles.modalButtons}>
                <Button
                  title="Quay lại"
                  variant="outline"
                  onPress={() => setVerifyStep(3)}
                  style={StyleSheet.flatten([styles.modalButton, { borderColor: themeColor }])}
                  textStyle={{ color: themeColor }}
                />
                <Button
                  title="Gửi xác thực"
                  disabled={!selfieImage}
                  onPress={handleSubmitVerification}
                  style={StyleSheet.flatten([styles.modalButton, { backgroundColor: themeColor }])}
                />
              </View>
            </View>
          )}

          {verifyStep === 5 && (
            <View style={{ width: '100%', paddingVertical: 32, alignItems: 'center', gap: 16 }}>
              <ActivityIndicator size="large" color={themeColor} />
              <Text style={styles.verifyStepTitle}>Đang tải lên tài liệu...</Text>
              <Text style={styles.verifyStepDesc}>Quá trình này có thể mất vài giây. Vui lòng không đóng ứng dụng.</Text>
            </View>
          )}
        </View>
      </Modal>

      {/* Custom Role Switch Confirmation Modal */}
      <Modal
        visible={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title="Chuyển đổi vai trò"
      >
        <View style={styles.roleConfirmContainer}>
          <View style={[styles.roleConfirmIconContainer, { backgroundColor: (pendingRole === 'worker' ? Colors.info : Colors.primary) + '15' }]}>
            <Ionicons
              name={pendingRole === 'worker' ? 'construct' : 'people'}
              size={36}
              color={pendingRole === 'worker' ? Colors.info : Colors.primary}
            />
          </View>
          <Text style={styles.roleConfirmTitle}>Xác nhận chuyển đổi</Text>
          <Text style={styles.roleConfirmDesc}>
            Bạn có chắc chắn muốn chuyển sang vai trò{' '}
            <Text style={{ fontWeight: '800', color: pendingRole === 'worker' ? Colors.info : Colors.primary }}>
              {pendingRole === 'worker' ? 'Người làm' : 'Người thuê'}
            </Text>
            ?
          </Text>
          <Text style={styles.roleConfirmDetailDesc}>
            {pendingRole === 'worker'
              ? 'Vai trò Người làm sẽ giúp bạn tìm các công việc phù hợp, nộp hồ sơ ứng tuyển và kiếm thêm thu nhập.'
              : 'Vai trò Người thuê giúp bạn đăng bài tìm thợ, quản lý công việc cần làm và thanh toán phí dịch vụ.'}
          </Text>

          <View style={styles.modalButtons}>
            <Button
              title="Hủy bỏ"
              variant="outline"
              onPress={() => setIsRoleModalOpen(false)}
              style={StyleSheet.flatten([styles.modalButton, { borderColor: themeColor }])}
              textStyle={{ color: themeColor }}
            />
            <Button
              title="Xác nhận"
              onPress={async () => {
                if (pendingRole) {
                  await switchRole(pendingRole);
                }
                setIsRoleModalOpen(false);
              }}
              style={StyleSheet.flatten([styles.modalButton, { backgroundColor: pendingRole === 'worker' ? Colors.info : Colors.primary }])}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background.primary,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  headerContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 16,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarContainer: {
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 44,
    padding: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  verifiedBadgeOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: AppColors.background.elevated,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  verifiedBadgeIcon: {
    alignSelf: 'center',
  },
  headerInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textWhite,
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  joinedDate: {
    fontSize: 12,
    color: Colors.textWhite,
    opacity: 0.9,
    fontWeight: '500',
  },
  headerActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  headerEditProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerEditProfileText: {
    color: Colors.textWhite,
    fontSize: 12,
    fontWeight: '600',
  },
  roleButtonsWrapperHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 4,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  roleSwitchButtonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  roleSwitchButtonActiveHeader: {
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  roleSwitchTextHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  roleSwitchTextActiveHeader: {
    fontWeight: '800',
  },
  roleSwitchIcon: {
    // Spacer or layout alignment can go here
  },
  verifiedTextBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.success,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  verifiedTextBadgeTextHeader: {
    fontSize: 11,
    color: Colors.textWhite,
    fontWeight: '700',
  },
  unverifiedTextBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  unverifiedTextBadgeTextHeader: {
    fontSize: 11,
    color: Colors.textWhite,
    fontWeight: '700',
  },
  unverifiedAlertCard: {
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  unverifiedAlertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  unverifiedAlertLeft: {
    flexDirection: 'row',
    gap: 10,
    flex: 1,
    alignItems: 'center',
  },
  unverifiedAlertTextContainer: {
    flex: 1,
    gap: 2,
  },
  unverifiedAlertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: AppColors.status.warning,
  },
  unverifiedAlertDesc: {
    fontSize: 11,
    color: AppColors.text.secondary,
    lineHeight: 14,
  },
  completionCard: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  completionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: AppColors.text.primary,
  },
  completionScore: {
    fontSize: 16,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: AppColors.border.subtle,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  motivationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: AppColors.background.soft,
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  motivationText: {
    fontSize: 12,
    color: AppColors.text.secondary,
    fontWeight: '500',
    flex: 1,
    lineHeight: 16,
  },
  checklistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: AppColors.border.subtle,
  },
  checklistLabel: {
    fontSize: 12,
    color: AppColors.text.secondary,
    fontWeight: '500',
  },
  checklistLabelDone: {
    color: AppColors.text.disabled,
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  statsCardContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: AppColors.text.primary,
    marginBottom: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  statCardBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.border.subtle,
  },
  statBlockValue: {
    fontSize: 15,
    fontWeight: '800',
    color: AppColors.text.primary,
    marginTop: 4,
  },
  statBlockSubText: {
    fontSize: 11,
    color: AppColors.text.muted,
    marginTop: 2,
    textAlign: 'center',
  },
  statBadge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  statBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: AppColors.status.warning,
  },
  walletBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.border.subtle,
  },
  walletBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  walletBarTextContainer: {
    gap: 2,
  },
  walletBarLabel: {
    fontSize: 11,
    color: AppColors.text.muted,
    fontWeight: '500',
  },
  walletBarValue: {
    fontSize: 16,
    fontWeight: '800',
    color: AppColors.text.primary,
  },
  walletBarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  walletBarButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textWhite,
  },
  quickActionsCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  quickActionBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  quickActionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: AppColors.text.secondary,
    textAlign: 'center',
  },
  accountInfoCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border.subtle,
  },
  infoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoIcon: {
    width: 20,
  },
  infoLabel: {
    fontSize: 14,
    color: AppColors.text.secondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.text.primary,
  },
  reviewsCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reviewsList: {
    gap: 12,
  },
  reviewItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AppColors.border.subtle,
  },
  reviewItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewItemLeft: {
    flex: 1,
    gap: 2,
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: '700',
    color: AppColors.text.primary,
  },
  reviewTaskName: {
    fontSize: 11,
    color: AppColors.text.muted,
    fontWeight: '500',
  },
  reviewItemRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  reviewRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reviewRatingValue: {
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.text.primary,
  },
  reviewTimeAgo: {
    fontSize: 10,
    color: AppColors.text.disabled,
  },
  reviewComment: {
    fontSize: 12,
    color: AppColors.text.secondary,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  settingsContainer: {
    paddingHorizontal: 20,
  },
  settingsSection: {
    marginBottom: 20,
  },
  settingsSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: AppColors.text.muted,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingLeft: 4,
    letterSpacing: 0.5,
  },
  settingsCard: {
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsRowLabel: {
    fontSize: 14,
    color: AppColors.text.primary,
    fontWeight: '600',
  },
  settingsRowLabelDanger: {
    color: AppColors.status.error,
  },
  settingsRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsRowValue: {
    fontSize: 13,
    color: AppColors.text.secondary,
    fontWeight: '500',
  },
  rowDivider: {
    height: 1,
    backgroundColor: AppColors.border.subtle,
    marginLeft: 60,
  },
  modalForm: {
    gap: 16,
    paddingTop: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  modalButton: {
    flex: 1,
  },
  avatarPickerContainer: {
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 8,
  },
  avatarPickerTouch: {
    position: 'relative',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: AppColors.background.elevated,
  },
  avatarPickerHelpText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 6,
  },
  verifyModalContainer: {
    paddingVertical: 10,
    alignItems: 'center',
    gap: 16,
  },
  verifyStepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text.primary,
    textAlign: 'center',
  },
  verifyStepDesc: {
    fontSize: 13,
    color: AppColors.text.secondary,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 18,
  },
  verifyPreviewBox: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: AppColors.border.normal,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    overflow: 'hidden',
  },
  verifyPreviewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  verifyPlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  verifyPlaceholderText: {
    fontSize: 13,
    color: AppColors.text.muted,
    fontWeight: '500',
  },
  verifyActionButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  verifyActionButton: {
    flex: 1,
  },
  verifyWizardProgress: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: 12,
  },
  verifyProgressDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: AppColors.border.normal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyProgressDotText: {
    fontSize: 11,
    color: AppColors.text.secondary,
    fontWeight: '700',
  },
  verifyProgressDotTextActive: {
    color: Colors.textWhite,
  },
  verifyProgressLine: {
    width: 30,
    height: 2,
    backgroundColor: AppColors.border.normal,
  },
  verifyOtpTipBox: {
    backgroundColor: AppColors.background.soft,
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: AppColors.border.normal,
  },
  verifyOtpTipText: {
    fontSize: 12,
    color: AppColors.text.secondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  verifyPhoneSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.success + '10',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.success + '30',
    marginTop: 8,
  },
  verifyPhoneSuccessText: {
    fontSize: 13,
    color: Colors.success,
    fontWeight: '600',
  },
  roleConfirmContainer: {
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  roleConfirmIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  roleConfirmTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: AppColors.text.primary,
    textAlign: 'center',
  },
  roleConfirmDesc: {
    fontSize: 14,
    color: AppColors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  roleConfirmDetailDesc: {
    fontSize: 12,
    color: AppColors.text.muted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
    backgroundColor: AppColors.background.soft,
    padding: 12,
    borderRadius: 10,
    marginTop: 6,
  },
});
