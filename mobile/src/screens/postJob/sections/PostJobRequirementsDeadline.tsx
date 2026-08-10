import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme';
import { DEADLINE_PRESETS } from '../utils/postJobUtils';

interface PostJobRequirementsDeadlineProps {
  selectedDeadlinePreset: number | null;
  setSelectedDeadlinePreset: (val: number | null) => void;
}

export const PostJobRequirementsDeadline: React.FC<PostJobRequirementsDeadlineProps> = ({
  selectedDeadlinePreset,
  setSelectedDeadlinePreset,
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.section, { marginBottom: theme.spacing.lg }]}>
      <Text style={[styles.sectionLabel, { color: theme.colors.text.primary }]}>Thời hạn nhận ứng tuyển *</Text>
      <View style={[styles.chipsRow, { gap: theme.spacing.xs }]}>
        {DEADLINE_PRESETS.map((preset) => {
          const isSelected = selectedDeadlinePreset === preset.value;
          return (
            <TouchableOpacity
              key={String(preset.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: theme.colors.background.secondary,
                  borderColor: theme.colors.border.subtle,
                },
                isSelected && { backgroundColor: theme.colors.brand.primarySoft, borderColor: theme.colors.brand.primary },
              ]}
              onPress={() => setSelectedDeadlinePreset(preset.value)}
              accessibilityRole="button"
              accessibilityLabel={`Hạn nhận hồ sơ trong ${preset.label}`}
            >
              <Text style={[styles.chipText, { color: theme.colors.text.secondary }, isSelected && { color: theme.colors.brand.primaryDark, fontWeight: '700' }]}>
                {preset.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {},
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
