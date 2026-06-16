import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { AppColors, Spacing, Radius, Typography } from '../../theme';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'outline';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

const getVariantColors = (variant: BadgeVariant) => {
  switch (variant) {
    case 'primary':
      return { bg: AppColors.brand.primarySoft, text: AppColors.brand.primary };
    case 'success':
      return { bg: `${AppColors.status.success}1A`, text: AppColors.status.success };
    case 'warning':
      return { bg: `${AppColors.status.warning}1A`, text: AppColors.status.warning };
    case 'error':
      return { bg: `${AppColors.status.error}1A`, text: AppColors.status.error };
    case 'info':
      return { bg: `${AppColors.status.info}1A`, text: AppColors.status.info };
    default:
      return { bg: 'transparent', text: AppColors.text.secondary };
  }
};

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'primary',
  size = 'sm',
  style,
}) => {
  const vStyle = getVariantColors(variant);

  return (
    <View
      style={[
        styles.base,
        styles[`size_${size}`],
        { backgroundColor: vStyle.bg },
        variant === 'outline' && styles.outline,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          styles[`textSize_${size}`],
          { color: vStyle.text },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: Radius.sm,
  },
  outline: {
    borderWidth: 1,
    borderColor: AppColors.border.subtle,
  },
  size_sm: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  size_md: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  text: {
    fontWeight: '700',
  },
  textSize_sm: {
    fontSize: Typography.caption.fontSize - 1,
  },
  textSize_md: {
    fontSize: Typography.caption.fontSize,
  },
});
