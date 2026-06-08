import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'outline';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  primary: { bg: Colors.primary + '20', text: Colors.primary },
  success: { bg: Colors.success + '20', text: Colors.success },
  warning: { bg: Colors.warning + '20', text: Colors.warning },
  error: { bg: Colors.error + '20', text: Colors.error },
  info: { bg: Colors.info + '20', text: Colors.info },
  outline: { bg: 'transparent', text: Colors.textSecondary },
};

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'primary',
  size = 'sm',
  style,
}) => {
  const vStyle = variantStyles[variant];

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
    borderRadius: 8,
  },
  outline: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  size_sm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  size_md: {
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  text: {
    fontWeight: '600',
  },
  textSize_sm: {
    fontSize: 11,
  },
  textSize_md: {
    fontSize: 13,
  },
});
