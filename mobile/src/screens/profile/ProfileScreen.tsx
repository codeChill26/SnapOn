import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
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

const PROFILE_TABS = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'stats', label: 'Thống kê' },
  { key: 'settings', label: 'Cài đặt' },
];

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileNavProp>();
  const { user, logout, switchRole, updateUser } = useAuth();
  const { wallet, setWallet } = useApp();
  const [activeTab, setActiveTab] = useState('overview');

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

  const roleLabel = user?.role === 'hirer' ? 'Người thuê' : user?.role === 'worker' ? 'Người làm' : 'Admin';

  const SettingsRow = ({ icon, label, value, onPress, danger }: { icon: string; label: string; value?: string; onPress: () => void; danger?: boolean }) => (
    <TouchableOpacity style={styles.settingsRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.settingsRowLeft}>
        <View style={[styles.settingsIconContainer, danger && styles.settingsIconContainerDanger]}>
          <Ionicons name={icon as any} size={18} color={danger ? Colors.error : Colors.primary} />
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
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            <UserAvatar
              name={user?.fullName || 'User'}
              avatarUrl={user?.avatarUrl}
              size={72}
            />
          </View>
          <Text style={styles.userName}>{user?.fullName || 'Người dùng'}</Text>
          <Badge label={roleLabel} variant="primary" size="md" />
          <Text style={styles.userEmail}>{user?.email}</Text>

          <TouchableOpacity style={styles.editProfileButton} onPress={handleOpenEditModal} activeOpacity={0.7}>
            <Ionicons name="create-outline" size={14} color={Colors.textWhite} />
            <Text style={styles.editProfileText}>Chỉnh sửa trang cá nhân</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>12</Text>
          <Text style={styles.statLabel}>Việc đã làm</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>4.8</Text>
          <Text style={styles.statLabel}>Đánh giá</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>98%</Text>
          <Text style={styles.statLabel}>Tỷ lệ HT</Text>
        </View>
      </View>

      <View style={styles.tabSection}>
        <Tabs tabs={PROFILE_TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      </View>

      {activeTab === 'overview' && (
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
              <Ionicons name="call-outline" size={18} color={Colors.textSecondary} style={styles.infoIcon} />
              <Text style={styles.infoLabel}>Số điện thoại</Text>
            </View>
            <Text style={styles.infoValue}>{user?.phone || 'Chưa cập nhật'}</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
              <Ionicons name="shield-checkmark-outline" size={18} color={Colors.textSecondary} style={styles.infoIcon} />
              <Text style={styles.infoLabel}>Trạng thái tài khoản</Text>
            </View>
            <Badge
              label={user?.isVerified ? 'Đã xác thực' : 'Chưa xác thực'}
              variant={user?.isVerified ? 'success' : 'warning'}
              size="sm"
            />
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
              <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} style={styles.infoIcon} />
              <Text style={styles.infoLabel}>Tham gia từ</Text>
            </View>
            <Text style={styles.infoValue}>
              {user?.createdAt ? formatShortDate(user.createdAt) : 'N/A'}
            </Text>
          </View>
        </Card>
      )}

      {activeTab === 'stats' && (
        <Card style={styles.infoCard}>
          <Text style={styles.statsSectionTitle}>Hoạt động chi tiết</Text>
          <View style={styles.statRow}>
            <View style={styles.statRowLabelContainer}>
              <Ionicons name="checkmark-circle-outline" size={18} color={Colors.success} />
              <Text style={styles.statRowLabel}>Công việc đã hoàn thành</Text>
            </View>
            <Text style={styles.statRowValue}>12 việc</Text>
          </View>
          <View style={styles.statRow}>
            <View style={styles.statRowLabelContainer}>
              <Ionicons name="star-outline" size={18} color={Colors.warning} />
              <Text style={styles.statRowLabel}>Đánh giá trung bình</Text>
            </View>
            <Text style={styles.statRowValue}>4.8 / 5</Text>
          </View>
          <View style={styles.statRow}>
            <View style={styles.statRowLabelContainer}>
              <Ionicons name="trending-up-outline" size={18} color={Colors.info} />
              <Text style={styles.statRowLabel}>Tỷ lệ hoàn thành</Text>
            </View>
            <Text style={styles.statRowValue}>98%</Text>
          </View>
          <View style={styles.statRow}>
            <View style={styles.statRowLabelContainer}>
              <Ionicons name="card-outline" size={18} color={Colors.primary} />
              <Text style={styles.statRowLabel}>Số dư ví khả dụng</Text>
            </View>
            <Text style={styles.statRowValue}>{formatCurrency(wallet?.availableBalance || 0)}</Text>
          </View>
        </Card>
      )}

      {activeTab === 'settings' && (
        <View style={styles.settingsContainer}>
          <View style={styles.settingsSection}>
            <Text style={styles.settingsSectionTitle}>Tài khoản & Vai trò</Text>
            <Card style={styles.settingsCard} padded={false}>
              <View style={styles.roleSelectionRow}>
                <View style={styles.roleInfo}>
                  <Ionicons name="people-outline" size={18} color={Colors.textSecondary} />
                  <Text style={styles.roleSelectionLabel}>Vai trò: </Text>
                  <Text style={styles.roleSelectionValue}>{roleLabel}</Text>
                </View>
                <View style={styles.roleButtonsWrapper}>
                  <TouchableOpacity
                    style={[styles.roleSwitchButton, user?.role === 'hirer' && styles.roleSwitchButtonActive]}
                    onPress={() => user?.role !== 'hirer' && handleSwitchRole('hirer')}
                  >
                    <Text style={[styles.roleSwitchText, user?.role === 'hirer' && styles.roleSwitchTextActive]}>Thuê</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.roleSwitchButton, user?.role === 'worker' && styles.roleSwitchButtonActive]}
                    onPress={() => user?.role !== 'worker' && handleSwitchRole('worker')}
                  >
                    <Text style={[styles.roleSwitchText, user?.role === 'worker' && styles.roleSwitchTextActive]}>Làm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          </View>

          <View style={styles.settingsSection}>
            <Text style={styles.settingsSectionTitle}>Dịch vụ & Hệ thống</Text>
            <Card style={styles.settingsCard} padded={false}>
              <SettingsRow
                icon="person-outline"
                label="Chỉnh sửa thông tin cá nhân"
                onPress={handleOpenEditModal}
              />
              <View style={styles.rowDivider} />
              <SettingsRow
                icon="wallet-outline"
                label="Ví của tôi"
                value={wallet ? formatCurrency(wallet.availableBalance) : '0đ'}
                onPress={() => navigation.navigate('Wallet')}
              />
              <View style={styles.rowDivider} />
              <SettingsRow
                icon="shield-checkmark-outline"
                label="Bảo mật & Xác thực"
                value={user?.isVerified ? "Đã xác thực" : "Chưa xác thực"}
                onPress={() => Alert.alert("Xác thực", "Tài khoản của bạn đã được xác thực thành công.")}
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
      )}

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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 55,
    paddingBottom: 35,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    alignItems: 'center',
    gap: 8,
  },
  avatarContainer: {
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 40,
    padding: 2,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textWhite,
    marginTop: 4,
  },
  userEmail: {
    fontSize: 13,
    color: Colors.textWhite,
    opacity: 0.8,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginTop: -16,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.divider,
  },
  tabSection: {
    marginTop: 24,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  infoCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
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
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  statsSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  statRowLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statRowLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  statRowValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  settingsContainer: {
    paddingHorizontal: 20,
  },
  settingsSection: {
    marginBottom: 20,
  },
  settingsSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingLeft: 4,
  },
  settingsCard: {
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
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
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIconContainerDanger: {
    backgroundColor: Colors.error + '15',
  },
  settingsRowLabel: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '600',
  },
  settingsRowLabelDanger: {
    color: Colors.error,
  },
  settingsRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsRowValue: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  rowDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 62,
  },
  roleSelectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  roleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleSelectionLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  roleSelectionValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  roleButtonsWrapper: {
    flexDirection: 'row',
    backgroundColor: Colors.divider,
    padding: 3,
    borderRadius: 8,
  },
  roleSwitchButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  roleSwitchButtonActive: {
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  roleSwitchText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  roleSwitchTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  editProfileText: {
    color: Colors.textWhite,
    fontSize: 12,
    fontWeight: '600',
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
    borderColor: Colors.surface,
  },
  avatarPickerHelpText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 6,
  },
});
