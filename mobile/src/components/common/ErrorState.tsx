import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { RetryButton } from './RetryButton';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Có lỗi xảy ra',
  message,
  onRetry,
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { padding: theme.spacing.xl, gap: theme.spacing.md }]}>
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: theme.colors.status.error + '1A', // opacity hex
            borderRadius: theme.radius.round || 999,
          },
        ]}
      >
        <Ionicons name="alert-circle-outline" size={40} color={theme.colors.status.error} />
      </View>
      <Text style={[styles.title, { color: theme.colors.text.primary }]}>{title}</Text>
      <Text style={[styles.message, { color: theme.colors.text.secondary }]}>{message}</Text>
      {onRetry && <RetryButton onPress={onRetry} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
});
