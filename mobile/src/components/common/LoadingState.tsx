import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Đang tải...',
  fullScreen = false,
}) => {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        fullScreen && [styles.fullScreen, { backgroundColor: theme.colors.background.primary }],
      ]}
    >
      <ActivityIndicator size="large" color={theme.colors.brand.primary} />
      {message && (
        <Text style={[styles.message, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
          {message}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  fullScreen: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
  },
});
