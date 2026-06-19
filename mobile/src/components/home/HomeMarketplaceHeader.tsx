import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { HomeTheme } from './HomeTheme';
import type { User } from '../../types';

interface HomeMarketplaceHeaderProps {
  user: User | null;
  selectedCategoryName: string | undefined;
  onCategoryPress: () => void;
  onSavedPress?: () => void;
}

export const HomeMarketplaceHeader: React.FC<HomeMarketplaceHeaderProps> = React.memo(({
  user,
  selectedCategoryName,
  onCategoryPress,
  onSavedPress,
}) => {
  // Extract user's first name dynamically for greeting
  const greetingText = useMemo(() => {
    if (user && user.fullName) {
      const parts = user.fullName.trim().split(' ');
      const firstName = parts[parts.length - 1];
      return `Xin chào, ${firstName}`;
    }
    return 'Chào mừng đến SnapOn';
  }, [user]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FF6B35', '#FF8A4C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        {/* Subtle decorative background shapes */}
        <View style={styles.topPattern} />
        <View style={styles.bottomPattern} />

        <SafeAreaView edges={['top']}>
          <View style={styles.content}>
            {/* Top Brand Row */}
            <View style={styles.brandRow}>
              <View style={styles.logoAndGreeting}>
                <Text style={styles.logoText}>SnapOn</Text>
                <Text style={styles.greetingText}>{greetingText}</Text>
              </View>
              <TouchableOpacity
                style={styles.savedButton}
                activeOpacity={0.82}
                onPress={onSavedPress}
                accessibilityRole="button"
                accessibilityLabel="Xem công việc đã lưu"
              >
                <Ionicons name="bookmark" size={20} color="#FF6B35" />
              </TouchableOpacity>
            </View>

            {/* Tagline & Tag description */}
            <View style={styles.taglineSection}>
              <Text style={styles.titleText}>Tìm việc nhỏ, thuê người nhanh</Text>
              <Text style={styles.subtitleText}>
                Kết nối nhanh người cần việc và người có kỹ năng.
              </Text>
            </View>

            {/* Category Selector Pill */}
            <TouchableOpacity
              style={styles.categoryPill}
              activeOpacity={0.85}
              onPress={onCategoryPress}
              accessibilityRole="button"
              accessibilityLabel="Chọn danh mục công việc"
            >
              <View style={styles.pillLeft}>
                <Ionicons name="grid" size={18} color={HomeTheme.colors.primary} style={styles.pillIcon} />
                <Text style={styles.pillText} numberOfLines={1}>
                  {selectedCategoryName || 'Danh mục công việc'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={16} color={HomeTheme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#F7F8FC',
  },
  headerGradient: {
    width: '100%',
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  topPattern: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: -60,
    right: -50,
  },
  bottomPattern: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    bottom: -40,
    left: -40,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 4 : 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  logoAndGreeting: {
    flexDirection: 'column',
    flex: 1,
  },
  savedButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  logoText: {
    fontSize: 26,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#FFFFFF',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  greetingText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
    marginTop: 2,
  },
  taglineSection: {
    marginBottom: 20,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.08)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitleText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    marginTop: 4,
    lineHeight: 16,
  },
  categoryPill: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 16,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  pillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  pillIcon: {
    marginRight: 10,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#101828',
    flex: 1,
  },
});
