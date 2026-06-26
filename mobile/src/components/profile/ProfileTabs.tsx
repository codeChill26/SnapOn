import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';

interface ProfileTabsProps {
  activeTab: number;
  onChangeTab: (tabIndex: number) => void;
  postedCount?: number;
  servicesCount?: number;
  isOwnProfile?: boolean;
  activityCount?: number;
}

export const ProfileTabs: React.FC<ProfileTabsProps> = ({
  activeTab,
  onChangeTab,
  postedCount = 0,
  servicesCount = 0,
  isOwnProfile = false,
  activityCount = 0,
}) => {
  const tabs = [
    { label: 'Bài đăng', count: postedCount },
    { label: 'Thuê tôi', count: servicesCount },
    ...(isOwnProfile ? [{ label: 'Hoạt động', count: activityCount }] : []),
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab, index) => {
        const isActive = activeTab === index;
        return (
          <TouchableOpacity
            key={index}
            style={[styles.tabButton, isActive && styles.activeTabButton]}
            onPress={() => onChangeTab(index)}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <View style={styles.tabContent}>
              <Text style={[styles.tabLabel, isActive ? styles.activeTabLabel : styles.inactiveTabLabel]}>
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View style={[styles.countBadge, isActive ? styles.activeCountBadge : styles.inactiveCountBadge]}>
                  <Text style={[styles.countText, isActive ? styles.activeCountText : styles.inactiveCountText]}>
                    {tab.count}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: Colors.primary,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabLabel: {
    color: Colors.primary,
  },
  inactiveTabLabel: {
    color: Colors.textSecondary,
  },
  countBadge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeCountBadge: {
    backgroundColor: Colors.primarySoft,
  },
  inactiveCountBadge: {
    backgroundColor: Colors.border,
  },
  countText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  activeCountText: {
    color: Colors.primary,
  },
  inactiveCountText: {
    color: Colors.textSecondary,
  },
});
