import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { AppColors, Spacing, Radius, Typography, Shadows } from '../../theme';

interface Tab {
  key: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  scrollable?: boolean;
  activeColor?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  scrollable = false,
  activeColor,
}) => {
  const Container = scrollable ? ScrollView : View;
  const containerProps = scrollable
    ? { horizontal: true, showsHorizontalScrollIndicator: false }
    : { style: styles.container };

  return (
    <Container {...containerProps} style={!scrollable ? styles.container : undefined}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.activeTab]}
          onPress={() => onTabChange(tab.key)}
          activeOpacity={0.75}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === tab.key && styles.activeTabText,
              activeTab === tab.key && activeColor ? { color: activeColor } : null,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: Spacing.xs,
    borderRadius: Radius.md,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  activeTab: {
    backgroundColor: AppColors.background.elevated,
    borderColor: AppColors.border.subtle,
    borderWidth: 1,
    ...Shadows.sm,
  },
  tabText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: AppColors.text.muted,
  },
  activeTabText: {
    color: AppColors.brand.primary,
  },
});
