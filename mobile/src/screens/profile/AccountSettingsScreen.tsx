import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { walletService } from '../../services/walletService';
import { authService } from '../../services/authService';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
import { AccountConfigSection } from '../../components/profile/AccountConfigSection';
import { EditProfileModal } from '../../components/profile/EditProfileModal';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import * as ImagePicker from 'expo-image-picker';

type SettingsNavProp = NativeStackNavigationProp<RootStackParamList>;

export const AccountSettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsNavProp>();
  const { user: currentUser, logout, updateUser } = useAuth();
  const { wallet, setWallet } = useApp();

  // States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [editAvatarUrl, setEditAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [editCoverUrl, setEditCoverUrl] = useState(currentUser?.coverUrl || '');

  // Verification Wizard States
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyStep, setVerifyStep] = useState(1);
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [verifyPhone, setVerifyPhone] = useState(currentUser?.phone || '');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  // OTP Countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [otpTimer]);

  // Load wallet balance
  useEffect(() => {
    let isMounted = true;
    const loadWallet = async () => {
      try {
        const walletData = await walletService.getMyWallet();
        if (isMounted) {
          setWallet(walletData);
        }
      } catch (error) {
        console.error('Failed to load wallet in AccountSettings:', error);
      }
    };
    loadWallet();
    return () => {
      isMounted = false;
    };
  }, [setWallet]);

  // Edit profile actions
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Ứng dụng cần quyền truy cập thư viện ảnh để thay đổi avatar.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
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
          Alert.alert('Thành công', 'Đã tải ảnh đại diện lên thành công!');
        } else {
          Alert.alert('Lỗi', 'Không thể đọc dữ liệu ảnh.');
        }
      }
    } catch (error) {
      console.error('Pick avatar error:', error);
      Alert.alert('Lỗi', 'Đã xảy ra lỗi khi chọn hoặc tải ảnh lên.');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePickCoverImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Ứng dụng cần quyền truy cập thư viện ảnh để thay đổi ảnh bìa.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          setIsUploadingCover(true);
          const uploadedUrl = await authService.uploadCover(asset.base64);
          setEditCoverUrl(uploadedUrl);
          Alert.alert('Thành công', 'Đã tải ảnh bìa lên thành công!');
        } else {
          Alert.alert('Lỗi', 'Không thể đọc dữ liệu ảnh.');
        }
      }
    } catch (error) {
      console.error('Pick cover error:', error);
      Alert.alert('Lỗi', 'Đã xảy ra lỗi khi chọn hoặc tải ảnh bìa lên.');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleSaveProfile = async (formData: {
    fullName: string;
    phone: string;
    avatarUrl: string;
    coverUrl?: string;
    bio: string;
    headline: string;
    skills: string[];
  }) => {
    if (!formData.fullName.trim()) {
      Alert.alert('Lỗi', 'Họ và tên không được để trống');
      return;
    }
    setIsSaving(true);
    try {
      const updatedUser = await authService.updateProfile({
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim() || undefined,
        avatarUrl: formData.avatarUrl.trim() || undefined,
        coverUrl: formData.coverUrl?.trim() || undefined,
        bio: formData.bio.trim() || undefined,
        headline: formData.headline.trim() || undefined,
        skills: formData.skills,
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

  // Verification actions
  const handleOpenVerifyModal = () => {
    setFrontImage(null);
    setBackImage(null);
    setSelfieImage(null);
    setVerifyPhone(currentUser?.phone || '');
    setOtpCode('');
    setIsOtpSent(false);
    setIsPhoneVerified(false);
    setOtpTimer(0);
    setVerifyStep(1);
    setIsVerifyModalOpen(true);
  };

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

  const handleSelectVerifyImage = async (step: number, useCamera: boolean) => {
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
        mediaTypes: ['images'] as ImagePicker.MediaType[],
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
      if (verifyPhone && verifyPhone.trim() !== currentUser?.phone) {
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
      Alert.alert('Thành công', 'Tài khoản của bạn đã được xác thực thành công!');
    } catch (error: any) {
      console.error('Submit verification error:', error);
      Alert.alert('Thất bại', error.message || 'Gửi tài liệu xác thực thất bại. Vui lòng thử lại.');
      setVerifyStep(4);
    }
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: logout },
    ]);
  };

  const getProfileCompleteness = () => {
    const items = [
      { key: 'name', value: !!currentUser?.fullName },
      { key: 'email', value: !!currentUser?.email },
      { key: 'phone', value: !!currentUser?.phone },
      { key: 'avatar', value: !!currentUser?.avatarUrl },
      { key: 'verification', value: !!currentUser?.isVerified },
    ];
    const completedCount = items.filter((item) => item.value).length;
    return completedCount * 20;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cài đặt tài khoản</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AccountConfigSection
          completenessScore={getProfileCompleteness()}
          isVerified={currentUser?.isVerified || false}
          walletBalance={wallet?.availableBalance || 0}
          onEditProfile={() => {
            setEditAvatarUrl(currentUser?.avatarUrl || '');
            setEditCoverUrl(currentUser?.coverUrl || '');
            setIsEditModalOpen(true);
          }}
          onVerifyAccount={() => {
            if (currentUser?.isVerified) {
              Alert.alert('Xác thực', 'Tài khoản của bạn đã được xác thực thành công.');
            } else {
              handleOpenVerifyModal();
            }
          }}
          onWalletPress={() => navigation.navigate('Wallet')}
          onTransactionHistory={() => navigation.navigate('Wallet', { scrollToHistory: true } as any)}
          onTopUp={() => navigation.navigate('Wallet', { hideHistory: true } as any)}
          onPostedTasks={() => navigation.navigate('MainTabs', { screen: 'Activity', params: { view: 'POSTED' } } as any)}
          onMyApplications={() => navigation.navigate('MainTabs', { screen: 'Activity', params: { view: 'PARTICIPATING' } } as any)}
          onNotificationPress={() => Alert.alert('Thông báo', 'Cài đặt thông báo đang được phát triển.')}
          onSecurityPress={() => Alert.alert('Bảo mật', 'Bảo mật tài khoản của bạn đang an toàn.')}
          onTermsPress={() => Alert.alert('Điều khoản', 'Điều khoản dịch vụ của SnapOn.')}
          onLogout={handleLogout}
        />
      </ScrollView>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <EditProfileModal
          visible={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          initialName={currentUser?.fullName || ''}
          initialPhone={currentUser?.phone || ''}
          initialAvatarUrl={editAvatarUrl}
          initialCoverUrl={editCoverUrl}
          initialBio={currentUser?.bio || ''}
          initialHeadline={currentUser?.headline || ''}
          initialSkills={currentUser?.skills || []}
          isSaving={isSaving}
          isUploading={isUploading}
          isUploadingCover={isUploadingCover}
          onPickImage={handlePickImage}
          onPickCoverImage={handlePickCoverImage}
          onSave={handleSaveProfile}
        />
      )}

      {/* Account Verification Wizard Modal */}
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
              <View style={[styles.verifyProgressDot, verifyStep >= 1 && { backgroundColor: Colors.primary }]}>
                <Text style={[styles.verifyProgressDotText, verifyStep >= 1 && styles.verifyProgressDotTextActive]}>1</Text>
              </View>
              <View style={[styles.verifyProgressLine, verifyStep >= 2 && { backgroundColor: Colors.primary }]} />
              <View style={[styles.verifyProgressDot, verifyStep >= 2 && { backgroundColor: Colors.primary }]}>
                <Text style={[styles.verifyProgressDotText, verifyStep >= 2 && styles.verifyProgressDotTextActive]}>2</Text>
              </View>
              <View style={[styles.verifyProgressLine, verifyStep >= 3 && { backgroundColor: Colors.primary }]} />
              <View style={[styles.verifyProgressDot, verifyStep >= 3 && { backgroundColor: Colors.primary }]}>
                <Text style={[styles.verifyProgressDotText, verifyStep >= 3 && styles.verifyProgressDotTextActive]}>3</Text>
              </View>
              <View style={[styles.verifyProgressLine, verifyStep >= 4 && { backgroundColor: Colors.primary }]} />
              <View style={[styles.verifyProgressDot, verifyStep >= 4 && { backgroundColor: Colors.primary }]}>
                <Text style={[styles.verifyProgressDotText, verifyStep >= 4 && styles.verifyProgressDotTextActive]}>4</Text>
              </View>
            </View>
          )}

          {verifyStep === 1 && (
            <View style={styles.verifyStepWrapper}>
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
                <View style={styles.verifyActionCol}>
                  <Button
                    title={otpTimer > 0 ? `Gửi lại mã sau (${otpTimer}s)` : (isOtpSent ? "Gửi lại mã OTP" : "Gửi mã OTP")}
                    onPress={handleSendOtp}
                    variant="outline"
                    disabled={otpTimer > 0}
                    style={{ borderColor: Colors.primary }}
                    textStyle={{ color: Colors.primary }}
                  />

                  {isOtpSent && (
                    <View style={styles.verifyActionCol}>
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
                        style={{ backgroundColor: Colors.primary }}
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
                  style={{ flex: 1, borderColor: Colors.primary }}
                  textStyle={{ color: Colors.primary }}
                />
                <Button
                  title="Tiếp tục"
                  disabled={!isPhoneVerified}
                  onPress={() => setVerifyStep(2)}
                  style={{ flex: 1, backgroundColor: Colors.primary }}
                />
              </View>
            </View>
          )}

          {verifyStep === 2 && (
            <View style={styles.verifyStepWrapper}>
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
                  icon={<Ionicons name="camera" size={18} color={Colors.primary} />}
                  variant="outline"
                  onPress={() => handleSelectVerifyImage(1, true)}
                  style={{ flex: 1, borderColor: Colors.primary }}
                  textStyle={{ color: Colors.primary }}
                />
                <Button
                  title="Chọn thư viện"
                  icon={<Ionicons name="image" size={18} color={Colors.primary} />}
                  variant="outline"
                  onPress={() => handleSelectVerifyImage(1, false)}
                  style={{ flex: 1, borderColor: Colors.primary }}
                  textStyle={{ color: Colors.primary }}
                />
              </View>

              <View style={styles.modalButtons}>
                <Button
                  title="Quay lại"
                  variant="outline"
                  onPress={() => setVerifyStep(1)}
                  style={{ flex: 1, borderColor: Colors.primary }}
                  textStyle={{ color: Colors.primary }}
                />
                <Button
                  title="Tiếp tục"
                  disabled={!frontImage}
                  onPress={() => setVerifyStep(3)}
                  style={{ flex: 1, backgroundColor: Colors.primary }}
                />
              </View>
            </View>
          )}

          {verifyStep === 3 && (
            <View style={styles.verifyStepWrapper}>
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
                  icon={<Ionicons name="camera" size={18} color={Colors.primary} />}
                  variant="outline"
                  onPress={() => handleSelectVerifyImage(2, true)}
                  style={{ flex: 1, borderColor: Colors.primary }}
                  textStyle={{ color: Colors.primary }}
                />
                <Button
                  title="Chọn thư viện"
                  icon={<Ionicons name="image" size={18} color={Colors.primary} />}
                  variant="outline"
                  onPress={() => handleSelectVerifyImage(2, false)}
                  style={{ flex: 1, borderColor: Colors.primary }}
                  textStyle={{ color: Colors.primary }}
                />
              </View>

              <View style={styles.modalButtons}>
                <Button
                  title="Quay lại"
                  variant="outline"
                  onPress={() => setVerifyStep(2)}
                  style={{ flex: 1, borderColor: Colors.primary }}
                  textStyle={{ color: Colors.primary }}
                />
                <Button
                  title="Tiếp tục"
                  disabled={!backImage}
                  onPress={() => setVerifyStep(4)}
                  style={{ flex: 1, backgroundColor: Colors.primary }}
                />
              </View>
            </View>
          )}

          {verifyStep === 4 && (
            <View style={styles.verifyStepWrapper}>
              <Text style={styles.verifyStepTitle}>Ảnh Selfie đối chiếu</Text>
              <Text style={styles.verifyStepDesc}>Chụp ảnh khuôn mặt của bạn trực tiếp tại chỗ, thấy rõ ngũ quan.</Text>

              <View style={[styles.verifyPreviewBox, { height: 180, width: 180, borderRadius: 90, alignSelf: 'center' }]}>
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
                  icon={<Ionicons name="camera" size={18} color={Colors.primary} />}
                  variant="outline"
                  onPress={() => handleSelectVerifyImage(3, true)}
                  style={{ flex: 1, borderColor: Colors.primary }}
                  textStyle={{ color: Colors.primary }}
                />
                <Button
                  title="Chọn thư viện"
                  icon={<Ionicons name="image" size={18} color={Colors.primary} />}
                  variant="outline"
                  onPress={() => handleSelectVerifyImage(3, false)}
                  style={{ flex: 1, borderColor: Colors.primary }}
                  textStyle={{ color: Colors.primary }}
                />
              </View>

              <View style={styles.modalButtons}>
                <Button
                  title="Quay lại"
                  variant="outline"
                  onPress={() => setVerifyStep(3)}
                  style={{ flex: 1, borderColor: Colors.primary }}
                  textStyle={{ color: Colors.primary }}
                />
                <Button
                  title="Gửi xác thực"
                  disabled={!selfieImage}
                  onPress={handleSubmitVerification}
                  style={{ flex: 1, backgroundColor: Colors.primary }}
                />
              </View>
            </View>
          )}

          {verifyStep === 5 && (
            <View style={{ width: '100%', paddingVertical: 32, alignItems: 'center', gap: 16 }}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.verifyStepTitle}>Đang tải lên tài liệu...</Text>
              <Text style={styles.verifyStepDesc}>Quá trình này có thể mất vài giây. Vui lòng không đóng ứng dụng.</Text>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  verifyModalContainer: {
    width: '100%',
  },
  verifyWizardProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  verifyProgressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyProgressDotText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  verifyProgressDotTextActive: {
    color: Colors.textWhite,
  },
  verifyProgressLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
    marginHorizontal: 4,
  },
  verifyStepWrapper: {
    width: '100%',
    gap: 12,
  },
  verifyStepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  verifyStepDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  verifyActionCol: {
    width: '100%',
    gap: 10,
  },
  verifyOtpTipBox: {
    backgroundColor: Colors.primarySoft,
    padding: 8,
    borderRadius: 6,
    marginVertical: 4,
  },
  verifyOtpTipText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
  },
  verifyPhoneSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successSoft,
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  verifyPhoneSuccessText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '600',
  },
  verifyPreviewBox: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
    backgroundColor: Colors.background,
  },
  verifyPreviewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  verifyPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  verifyPlaceholderText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  verifyActionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
});
