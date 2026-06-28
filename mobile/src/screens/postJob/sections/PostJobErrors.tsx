import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

interface PostJobErrorsProps {
  isFormValid: boolean;
  validationErrors: Record<string, string>;
}

export const PostJobErrors: React.FC<PostJobErrorsProps> = ({
  isFormValid,
  validationErrors,
}) => {
  const theme = useTheme();

  if (isFormValid || Object.keys(validationErrors).length === 0) return null;

  return (
    <View
      style={[
        styles.errorSummaryCard,
        {
          backgroundColor: theme.colors.status.error + '1A',
          borderColor: theme.colors.status.error,
          borderRadius: theme.radius.medium,
          padding: theme.spacing.md,
          marginBottom: theme.spacing.lg,
        },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginBottom: theme.spacing.xs }}>
        <Ionicons name="warning" size={18} color={theme.colors.status.error} />
        <Text style={{ color: theme.colors.status.error, fontWeight: '800', fontSize: 13 }}>
          Vui lòng sửa các lỗi sau trước khi đăng bài:
        </Text>
      </View>
      {Object.entries(validationErrors).map(([key, value]) => (
        <Text key={key} style={{ color: theme.colors.status.error, fontSize: 12, marginLeft: 22, marginTop: 2 }}>
          • {value}
        </Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  errorSummaryCard: {
    borderWidth: 1.5,
  },
});
