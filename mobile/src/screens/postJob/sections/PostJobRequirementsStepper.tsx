import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

interface PostJobRequirementsStepperProps {
  peopleNeeded: number;
  decreasePeople: () => void;
  increasePeople: () => void;
  contactPhone: string;
  setContactPhone: (phone: string) => void;
  validationErrors: Record<string, string>;
}

export const PostJobRequirementsStepper: React.FC<PostJobRequirementsStepperProps> = ({
  peopleNeeded,
  decreasePeople,
  increasePeople,
  contactPhone,
  setContactPhone,
  validationErrors,
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.rowGrid, { marginBottom: theme.spacing.lg, gap: theme.spacing.md }]}>
      <View style={styles.gridColumn}>
        <Text style={[styles.gridLabel, { color: theme.colors.text.primary }]}>Số người tuyển *</Text>
        <View
          style={[
            styles.stepperContainer,
            {
              backgroundColor: theme.colors.background.secondary,
              borderColor: theme.colors.border.subtle,
              borderRadius: theme.radius.small,
            },
          ]}
        >
          <TouchableOpacity style={styles.stepperBtnItem} onPress={decreasePeople} accessibilityRole="button" accessibilityLabel="Giảm số người cần tuyển">
            <Ionicons name="remove" size={16} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.stepperValue, { color: theme.colors.text.primary }]}>{peopleNeeded}</Text>
          <TouchableOpacity style={styles.stepperBtnItem} onPress={increasePeople} accessibilityRole="button" accessibilityLabel="Tăng số người cần tuyển">
            <Ionicons name="add" size={16} color={theme.colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

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
  gridInputBox: {
    height: 48,
    borderWidth: 1.5,
    fontSize: 14,
    fontWeight: '600',
  },
  inlineErrorText: {
    fontSize: 11,
  },
  stepperContainer: {
    flexDirection: 'row',
    height: 48,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  stepperBtnItem: {
    width: 44,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: 15,
    fontWeight: '700',
  },
});
