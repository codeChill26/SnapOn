import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface RetryButtonProps {
  onPress: () => void;
  label?: string;
}

export const RetryButton: React.FC<RetryButtonProps> = ({ onPress, label = 'Thử lại' }) => {
  const theme = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: theme.colors.brand.primarySoft,
          borderColor: theme.colors.brand.primaryBorder,
          borderRadius: theme.radius.medium,
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
          gap: theme.spacing.xs,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name="refresh-outline" size={16} color={theme.colors.brand.primaryDark} />
      <Text style={[styles.text, { color: theme.colors.brand.primaryDark }]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    minHeight: 44,
  },
  text: {
    fontSize: 13,
    fontWeight: '800',
  },
});
