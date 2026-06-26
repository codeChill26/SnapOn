import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';

interface ProfileStatsRowProps {
  postedCount: number;
  servicesCount: number;
  completedCount: number;
  activeTab?: number;
  onStatPress?: (tabIndex: number) => void;
  isOwnProfile?: boolean;
  activityCount?: number;
}

export const ProfileStatsRow: React.FC<ProfileStatsRowProps> = ({
  postedCount,
  servicesCount,
  completedCount,
  activeTab,
  onStatPress,
  isOwnProfile = false,
  activityCount = 0,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.statItem,
          activeTab === 0 && styles.activeStatItem
        ]}
        activeOpacity={onStatPress ? 0.7 : 1}
        onPress={() => onStatPress && onStatPress(0)}
        disabled={!onStatPress}
      >
        <Text style={[styles.valueText, activeTab === 0 && styles.activeValueText]}>{postedCount}</Text>
        <Text style={[styles.labelText, activeTab === 0 && styles.activeLabelText]}>Bài đăng</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity
        style={[
          styles.statItem,
          activeTab === 1 && styles.activeStatItem
        ]}
        activeOpacity={onStatPress ? 0.7 : 1}
        onPress={() => onStatPress && onStatPress(1)}
        disabled={!onStatPress}
      >
        <Text style={[styles.valueText, activeTab === 1 && styles.activeValueText]}>{servicesCount}</Text>
        <Text style={[styles.labelText, activeTab === 1 && styles.activeLabelText]}>Thuê tôi</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <View style={styles.statItem}>
        <Text style={styles.valueText}>{completedCount}</Text>
        <Text style={styles.labelText}>Hoàn thành</Text>
      </View>

      <View style={styles.divider} />

      {isOwnProfile ? (
        <TouchableOpacity
          style={[
            styles.statItem,
            activeTab === 2 && styles.activeStatItem
          ]}
          activeOpacity={onStatPress ? 0.7 : 1}
          onPress={() => onStatPress && onStatPress(2)}
          disabled={!onStatPress}
        >
          <Text style={[styles.valueText, activeTab === 2 && styles.activeValueText]}>{activityCount}</Text>
          <Text style={[styles.labelText, activeTab === 2 && styles.activeLabelText]}>Hoạt động</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.statItem}>
          <Text style={styles.valueText}>—</Text>
          <Text style={styles.labelText}>Sắp ra mắt</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  activeStatItem: {
    backgroundColor: Colors.primarySoft,
    borderRadius: 12,
  },
  valueText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  activeValueText: {
    color: Colors.primary,
  },
  labelText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  activeLabelText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },
});
