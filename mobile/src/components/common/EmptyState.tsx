import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { Button } from '../ui/Button';
import { useScreenSize } from '../../hooks/useScreenSize';

interface EmptyStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  actionLabel,
  onAction,
}) => {
  const theme = useTheme();
  const { fontScale } = useScreenSize();

  return (
    <View style={[styles.container, { padding: theme.spacing.xl }]}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>📭</Text>
      </View>
      <Text style={[styles.title, { color: theme.colors.text.primary, fontSize: 18 * fontScale, marginBottom: theme.spacing.sm }]}>
        {title}
      </Text>
      {message && (
        <Text style={[styles.message, { color: theme.colors.text.secondary, fontSize: 14 * fontScale, marginBottom: theme.spacing.lg }]}>
          {message}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="outline"
          size="md"
          style={styles.button}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 12,
  },
  icon: {
    fontSize: 48,
    textAlign: 'center',
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    minWidth: 160,
  },
});
