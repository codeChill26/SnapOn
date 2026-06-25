import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HomeTheme } from './HomeTheme';

interface HomeQuickFiltersProps {
  activeSort: 'hot' | 'newest' | null;
  onSortChange: (sort: 'hot' | 'newest' | null) => void;
  onFilterPress?: () => void;
  selectedCategory?: string;
}

export const HomeQuickFilters: React.FC<HomeQuickFiltersProps> = ({
  activeSort,
  onSortChange,
  onFilterPress,
  selectedCategory,
}) => {
  const isHot = activeSort === 'hot';
  const isNewest = activeSort === 'newest';

  const handleToggleHot = () => {
    if (isHot) {
      onSortChange(null);
    } else {
      onSortChange('hot');
    }
  };

  const handleToggleNewest = () => {
    if (isNewest) {
      onSortChange(null);
    } else {
      onSortChange('newest');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.chipsContainer}>
        {/* Hot Chip */}
        <TouchableOpacity
          style={[
            styles.chip,
            isHot && styles.chipActive,
          ]}
          onPress={handleToggleHot}
          activeOpacity={0.8}
        >
          <Ionicons
            name="flame"
            size={14}
            color={isHot ? HomeTheme.colors.primary : HomeTheme.colors.textSecondary}
            style={styles.chipIcon}
          />
          <Text style={[styles.chipText, isHot && styles.chipTextActive]}>
            Hot
          </Text>
        </TouchableOpacity>

        {/* Newest Chip */}
        <TouchableOpacity
          style={[
            styles.chip,
            isNewest && styles.chipActive,
          ]}
          onPress={handleToggleNewest}
          activeOpacity={0.8}
        >
          <Ionicons
            name="flash"
            size={14}
            color={isNewest ? HomeTheme.colors.primary : HomeTheme.colors.textSecondary}
            style={styles.chipIcon}
          />
          <Text style={[styles.chipText, isNewest && styles.chipTextActive]}>
            Mới nhất
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter Button */}
      <TouchableOpacity
        style={[
          styles.funnelButton,
          selectedCategory && styles.funnelButtonActive,
        ]}
        onPress={onFilterPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Lọc chuyên sâu"
      >
        <Ionicons
          name="funnel-outline"
          size={18}
          color={selectedCategory ? HomeTheme.colors.primary : HomeTheme.colors.textSecondary}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HomeTheme.spacing.xl,
    paddingVertical: HomeTheme.spacing.sm,
    backgroundColor: '#FFFFFF',
  },
  chipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: HomeTheme.spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    paddingHorizontal: HomeTheme.spacing.md,
    borderRadius: HomeTheme.radius.small,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: HomeTheme.colors.border,
  },
  chipActive: {
    backgroundColor: HomeTheme.colors.primarySoft,
    borderColor: HomeTheme.colors.primaryBorder,
  },
  chipIcon: {
    marginRight: HomeTheme.spacing.xs,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: HomeTheme.colors.textSecondary,
  },
  chipTextActive: {
    color: HomeTheme.colors.primaryDark,
  },
  funnelButton: {
    width: 38,
    height: 38,
    borderRadius: HomeTheme.radius.small,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: HomeTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  funnelButtonActive: {
    backgroundColor: HomeTheme.colors.primarySoft,
    borderColor: HomeTheme.colors.primaryBorder,
  },
});
