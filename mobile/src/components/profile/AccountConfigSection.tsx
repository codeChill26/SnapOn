import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { formatCurrency } from '../../utils/format';

interface AccountConfigSectionProps {
  completenessScore: number;
  isVerified: boolean;
  walletBalance: number;
  onEditProfile: () => void;
  onVerifyAccount: () => void;
  onWalletPress: () => void;
  onTransactionHistory: () => void;
  onTopUp: () => void;
  onPostedTasks: () => void;
  onMyApplications: () => void;
  onNotificationPress: () => void;
  onSecurityPress: () => void;
  onTermsPress: () => void;
  onLogout: () => void;
}

export const AccountConfigSection: React.FC<AccountConfigSectionProps> = ({
  completenessScore,
  isVerified,
  walletBalance,
  onEditProfile,
  onVerifyAccount,
  onWalletPress,
  onTransactionHistory,
  onTopUp,
  onPostedTasks,
  onMyApplications,
  onNotificationPress,
  onSecurityPress,
  onTermsPress,
  onLogout,
}) => {
  const SettingsRow = ({
    icon,
    label,
    value,
    onPress,
    danger,
  }: {
    icon: string;
    label: string;
    value?: string;
    onPress: () => void;
    danger?: boolean;
  }) => (
    <TouchableOpacity style={styles.settingsRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.settingsRowLeft}>
        <View style={[styles.settingsIconContainer, { backgroundColor: danger ? Colors.error : Colors.primary }]}>
          <Ionicons name={icon as any} size={16} color={Colors.textWhite} />
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
    <View style={styles.container}>
      {/* Title */}
      <Text style={styles.sectionTitle}>Tài khoản của tôi</Text>

      {/* Completion score progress bar */}
      <Card style={styles.completionCard} padded>
        <View style={styles.completionHeader}>
          <Text style={styles.completionTitle}>Độ hoàn thiện hồ sơ</Text>
          <Text style={styles.completionScore}>{completenessScore}%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${completenessScore}%` }]} />
        </View>
        <Text style={styles.motivationText}>
          {completenessScore < 100
            ? 'Cập nhật thêm thông tin để tăng mức độ tin cậy của hồ sơ!'
            : 'Hồ sơ của bạn đã hoàn hảo 100%!'}
        </Text>
      </Card>

      {/* Profile & Verification Settings */}
      <View style={styles.settingsGroup}>
        <Text style={styles.groupHeader}>Hồ sơ & Xác thực</Text>
        <Card style={styles.groupCard} padded={false}>
          <SettingsRow icon="person-outline" label="Chỉnh sửa thông tin cá nhân" onPress={onEditProfile} />
          <View style={styles.rowDivider} />
          <SettingsRow
            icon="shield-checkmark-outline"
            label="Xác thực danh tính (CCCD)"
            value={isVerified ? 'Đã xác thực' : 'Chưa xác thực'}
            onPress={onVerifyAccount}
          />
        </Card>
      </View>

      {/* Wallet Settings */}
      <View style={styles.settingsGroup}>
        <Text style={styles.groupHeader}>Ví & Thanh toán</Text>
        <Card style={styles.groupCard} padded={false}>
          <SettingsRow icon="wallet-outline" label="Chi tiết ví & Số dư" value={formatCurrency(walletBalance)} onPress={onWalletPress} />
          <View style={styles.rowDivider} />
          <SettingsRow icon="list-outline" label="Lịch sử giao dịch ví" onPress={onTransactionHistory} />
          <View style={styles.rowDivider} />
          <SettingsRow icon="add-circle-outline" label="Nạp tiền vào ví" onPress={onTopUp} />
        </Card>
      </View>

      {/* Management Settings */}
      <View style={styles.settingsGroup}>
        <Text style={styles.groupHeader}>Quản lý hoạt động</Text>
        <Card style={styles.groupCard} padded={false}>
          <SettingsRow icon="document-text-outline" label="Bài tuyển dụng tôi đã đăng" onPress={onPostedTasks} />
          <View style={styles.rowDivider} />
          <SettingsRow icon="briefcase-outline" label="Công việc tôi ứng tuyển" onPress={onMyApplications} />
        </Card>
      </View>

      {/* System Settings */}
      <View style={styles.settingsGroup}>
        <Text style={styles.groupHeader}>Hệ thống</Text>
        <Card style={styles.groupCard} padded={false}>
          <SettingsRow icon="notifications-outline" label="Cài đặt thông báo" onPress={onNotificationPress} />
          <View style={styles.rowDivider} />
          <SettingsRow icon="lock-closed-outline" label="Bảo mật tài khoản" onPress={onSecurityPress} />
          <View style={styles.rowDivider} />
          <SettingsRow icon="document-outline" label="Điều khoản dịch vụ" onPress={onTermsPress} />
          <View style={styles.rowDivider} />
          <SettingsRow icon="log-out-outline" label="Đăng xuất" onPress={onLogout} danger />
        </Card>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    backgroundColor: Colors.background,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  completionCard: {
    marginBottom: 20,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  completionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  completionScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  motivationText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  settingsGroup: {
    marginBottom: 20,
  },
  groupHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  groupCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingsRowLabel: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  settingsRowLabelDanger: {
    color: Colors.error,
  },
  settingsRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsRowValue: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginRight: 6,
  },
  rowDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 60,
  },
});
