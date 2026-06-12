import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { UserAvatar } from '../../components/common/UserAvatar';
import { Tabs } from '../../components/ui/Tabs';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { formatCurrency } from '../../utils/format';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';

type ProfileNavProp = NativeStackNavigationProp<RootStackParamList>;

const PROFILE_TABS = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'stats', label: 'Thống kê' },
  { key: 'settings', label: 'Cài đặt' },
];

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileNavProp>();
  const { user, logout, switchRole } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

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
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
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
            <Text style={styles.statRowValue}>500,000 VND</Text>
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
                icon="wallet-outline"
                label="Ví của tôi"
                value="500,000đ"
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
});
