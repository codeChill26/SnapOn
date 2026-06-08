import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <UserAvatar
            name={user?.fullName || 'User'}
            avatarUrl={user?.avatarUrl}
            size={72}
          />
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
            <Text style={styles.infoLabel}>Số điện thoại</Text>
            <Text style={styles.infoValue}>{user?.phone || 'Chưa cập nhật'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Trạng thái</Text>
            <Badge
              label={user?.isVerified ? 'Đã xác thực' : 'Chưa xác thực'}
              variant={user?.isVerified ? 'success' : 'warning'}
              size="sm"
            />
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tham gia từ</Text>
            <Text style={styles.infoValue}>
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
            </Text>
          </View>
        </Card>
      )}

      {activeTab === 'stats' && (
        <Card style={styles.infoCard}>
          <Text style={styles.statsSectionTitle}>Chi tiết hoạt động</Text>
          <View style={styles.statRow}>
            <Text style={styles.statRowLabel}>Công việc đã hoàn thành</Text>
            <Text style={styles.statRowValue}>12</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statRowLabel}>Đánh giá trung bình</Text>
            <Text style={styles.statRowValue}>4.8 / 5</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statRowLabel}>Tỷ lệ hoàn thành</Text>
            <Text style={styles.statRowValue}>98%</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statRowLabel}>Số dư ví</Text>
            <Text style={styles.statRowValue}>500,000 VND</Text>
          </View>
        </Card>
      )}

      {activeTab === 'settings' && (
        <Card style={styles.infoCard}>
          <Text style={styles.settingsSectionTitle}>Vai trò</Text>
          <View style={styles.roleRow}>
            <Button
              title="Người thuê"
              onPress={() => handleSwitchRole('hirer')}
              variant={user?.role === 'hirer' ? 'primary' : 'outline'}
              size="md"
              style={styles.roleButton}
            />
            <Button
              title="Người làm"
              onPress={() => handleSwitchRole('worker')}
              variant={user?.role === 'worker' ? 'primary' : 'outline'}
              size="md"
              style={styles.roleButton}
            />
          </View>

          <View style={styles.settingsDivider} />

          <Button
            title="Xem ví"
            onPress={() => navigation.navigate('Wallet')}
            variant="outline"
            size="md"
            style={styles.settingsButton}
          />

          <View style={styles.settingsDivider} />

          <Button
            title="Đăng xuất"
            onPress={handleLogout}
            variant="danger"
            size="md"
            style={styles.settingsButton}
          />
        </Card>
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
    paddingTop: 60,
    paddingBottom: 24,
  },
  headerContent: {
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textWhite,
    marginTop: 8,
  },
  userEmail: {
    fontSize: 13,
    color: Colors.textWhite,
    opacity: 0.8,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: -12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
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
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.divider,
  },
  tabSection: {
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  infoCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  statsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  statRowLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statRowValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  settingsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  roleButton: {
    flex: 1,
  },
  settingsDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 12,
  },
  settingsButton: {
    marginBottom: 8,
  },
});
