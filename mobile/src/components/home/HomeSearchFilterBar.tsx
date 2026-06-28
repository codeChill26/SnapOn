import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HomeTheme } from './HomeTheme';

interface HomeSearchFilterBarProps {
  searchQuery: string;
  setSearchQuery: (text: string) => void;
  onSubmitSearch: () => void;
  onClearSearch: () => void;
  selectedCategory: string | undefined;
  onPressFilter?: () => void;
}

export const HomeSearchFilterBar: React.FC<HomeSearchFilterBarProps> = ({
  searchQuery,
  setSearchQuery,
  onSubmitSearch,
  onClearSearch,
  selectedCategory,
  onPressFilter,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local text with parent prop when parent clears or resets it
  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleChangeText = (text: string) => {
    setLocalQuery(text);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setSearchQuery(text);
    }, 350); // 350ms is perfect for responsive feel
  };

  const handleSubmit = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setSearchQuery(localQuery);
    onSubmitSearch();
  };

  const handleClear = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setLocalQuery('');
    onClearSearch();
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.searchWrapper,
          isFocused && styles.searchWrapperFocused,
        ]}
      >
        <Ionicons
          name="search-outline"
          size={20}
          color={HomeTheme.colors.textSecondary}
          style={styles.searchIcon}
        />

        <TextInput
          style={styles.searchInput}
          placeholder="Bạn muốn tìm công việc gì?"
          placeholderTextColor={HomeTheme.colors.textMuted}
          value={localQuery}
          onChangeText={handleChangeText}
          onSubmitEditing={handleSubmit}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Tìm kiếm công việc"
        />

        {localQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Xóa nội dung tìm kiếm"
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={HomeTheme.colors.textSecondary}
            />
          </TouchableOpacity>
        )}

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.filterButton}
          onPress={onPressFilter}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Lọc danh mục"
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={selectedCategory ? HomeTheme.colors.primary : HomeTheme.colors.textSecondary}
          />
          {selectedCategory ? <View style={styles.activeFilterDot} /> : null}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: HomeTheme.spacing.xl,
    paddingVertical: HomeTheme.spacing.md,
    backgroundColor: '#FFFFFF',
  },
  searchWrapper: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: HomeTheme.spacing.md,
    borderRadius: HomeTheme.radius.medium,
    backgroundColor: HomeTheme.colors.input,
    borderWidth: 1,
    borderColor: HomeTheme.colors.border,
  },
  searchWrapperFocused: {
    borderColor: HomeTheme.colors.primary,
    backgroundColor: '#FFFFFF',
    shadowColor: HomeTheme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: {
    marginRight: HomeTheme.spacing.xs,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: HomeTheme.spacing.sm,
    fontSize: 14,
    fontWeight: '500',
    color: HomeTheme.colors.text,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    letterSpacing: 0,
  },
  clearButton: {
    padding: 4,
    marginRight: HomeTheme.spacing.xs,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: HomeTheme.colors.border,
    marginHorizontal: HomeTheme.spacing.sm,
  },
  filterButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeFilterDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: HomeTheme.colors.primary,
  },
});
