import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { AppColors, Radius, Spacing, Shadows } from '../../theme';
import { Colors } from '../../constants/colors';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  variant?: 'glass' | 'glassStrong' | 'default';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  padded = true,
  variant = 'default',
}) => {
  const getVariantStyle = () => {
    switch (variant) {
      case 'glass':
        return {
          backgroundColor: AppColors.surface.glass,
          borderColor: AppColors.border.subtle,
          borderWidth: 1,
        };
      case 'glassStrong':
        return {
          backgroundColor: AppColors.surface.glassStrong,
          borderColor: AppColors.border.normal,
          borderWidth: 1,
        };
      default:
        return {
          backgroundColor: Colors.card,
          borderColor: Colors.border,
          borderWidth: 1,
        };
    }
  };

  return (
    <View style={[styles.card, getVariantStyle(), padded && styles.padded, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    ...Shadows.sm,
  },
  padded: {
    padding: Spacing.lg,
  },
});
