import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

interface PostJobRequirementsBasicProps {
  postType: 'RECRUITMENT' | 'SERVICE_OFFER';
  selectedEmpLabel: string;
  startDate: Date;
  contactPhone: string;
  setContactPhone: (phone: string) => void;
  validationErrors: Record<string, string>;
  setEmploymentModalVisible: (val: boolean) => void;
  setDatePickerVisible: (val: boolean) => void;
}

export const PostJobRequirementsBasic: React.FC<PostJobRequirementsBasicProps> = ({
  postType,
  selectedEmpLabel,
  startDate,
  contactPhone,
  setContactPhone,
  validationErrors,
  setEmploymentModalVisible,
  setDatePickerVisible,
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.rowGrid, { marginBottom: theme.spacing.lg, gap: theme.spacing.md }]}>
      <TouchableOpacity
        style={styles.gridColumn}
        onPress={() => setEmploymentModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Chọn loại công việc"
      >
        <Text style={[styles.gridLabel, { color: theme.colors.text.primary }]}>Loại công việc *</Text>
        <View
          style={[
            styles.gridSelectorBox,
            {
              backgroundColor: theme.colors.background.secondary,
              borderColor: theme.colors.border.subtle,
              borderRadius: theme.radius.small,
              paddingHorizontal: theme.spacing.md,
            },
          ]}
        >
          <Text style={[styles.gridSelectorText, { color: theme.colors.text.primary }]} numberOfLines={1}>
            {selectedEmpLabel}
          </Text>
          <Ionicons name="chevron-down" size={16} color={theme.colors.text.secondary} />
        </View>
      </TouchableOpacity>

      {postType === 'RECRUITMENT' ? (
        <TouchableOpacity
          style={styles.gridColumn}
          onPress={() => setDatePickerVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Chọn ngày bắt đầu công việc"
        >
          <Text style={[styles.gridLabel, { color: theme.colors.text.primary }]}>Ngày bắt đầu *</Text>
          <View
            style={[
              styles.gridSelectorBox,
              {
                backgroundColor: theme.colors.background.secondary,
                borderColor: validationErrors.startDate ? theme.colors.status.error : theme.colors.border.subtle,
                borderRadius: theme.radius.small,
                paddingHorizontal: theme.spacing.md,
              },
            ]}
          >
            <Text style={[styles.gridSelectorText, { color: theme.colors.text.primary }]} numberOfLines={1}>
              {`${String(startDate.getDate()).padStart(2, '0')}/${String(startDate.getMonth() + 1).padStart(2, '0')}/${startDate.getFullYear()}`}
            </Text>
            <Ionicons name="calendar-outline" size={16} color={theme.colors.text.secondary} />
          </View>
          {validationErrors.startDate ? (
            <Text style={[styles.inlineErrorText, { color: theme.colors.status.error }]}>{validationErrors.startDate}</Text>
          ) : null}
        </TouchableOpacity>
      ) : (
        <View style={styles.gridColumn}>
          <Text style={[styles.gridLabel, { color: theme.colors.text.primary }]}>Số điện thoại liên hệ *</Text>
          <TextInput
            style={[
              styles.gridInputBox,
              {
                backgroundColor: theme.colors.background.secondary,
                borderColor: validationErrors.contactPhone ? theme.colors.status.error : theme.colors.border.subtle,
                borderRadius: theme.radius.small,
                color: theme.colors.text.primary,
                paddingHorizontal: theme.spacing.md,
              },
            ]}
            placeholder="09xx..."
            placeholderTextColor={theme.colors.text.muted}
            value={contactPhone}
            onChangeText={setContactPhone}
            keyboardType="phone-pad"
            accessibilityLabel="Số điện thoại liên hệ"
          />
          {validationErrors.contactPhone ? (
            <Text style={[styles.inlineErrorText, { color: theme.colors.status.error }]}>{validationErrors.contactPhone}</Text>
          ) : null}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  rowGrid: {
    flexDirection: 'row',
  },
  gridColumn: {
    flex: 1,
  },
  gridLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  gridSelectorBox: {
    flexDirection: 'row',
    height: 48,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gridSelectorText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 4,
  },
  gridInputBox: {
    height: 48,
    borderWidth: 1.5,
    fontSize: 14,
    fontWeight: '600',
  },
  inlineErrorText: {
    fontSize: 11,
  },
});
