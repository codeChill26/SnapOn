import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme';
import { PRICE_PRESETS, SALARY_UNITS } from '../utils/postJobUtils';

interface PostJobBudgetProps {
  budgetMinInput: string;
  setBudgetMinInput: (txt: string) => void;
  budgetMaxInput: string;
  setBudgetMaxInput: (txt: string) => void;
  activePricePreset: number | null;
  setActivePricePreset: (idx: number | null) => void;
  salaryUnit: 'PER_JOB' | 'PER_HOUR' | 'PER_DAY' | 'PER_MONTH';
  setSalaryUnit: (unit: 'PER_JOB' | 'PER_HOUR' | 'PER_DAY' | 'PER_MONTH') => void;
  validationErrors: Record<string, string>;
}

export const PostJobBudget: React.FC<PostJobBudgetProps> = ({
  budgetMinInput,
  setBudgetMinInput,
  budgetMaxInput,
  setBudgetMaxInput,
  activePricePreset,
  setActivePricePreset,
  salaryUnit,
  setSalaryUnit,
  validationErrors,
}) => {
  const theme = useTheme();

  return (
    <View>
      {/* PRICE RANGE */}
      <View style={[styles.section, { marginBottom: theme.spacing.lg }]}>
        <Text style={[styles.sectionLabel, { color: theme.colors.text.primary }]}>Khoảng ngân sách (VND) *</Text>
        <Text style={[styles.priceHint, { color: theme.colors.text.secondary }]}>
          Người ứng tuyển sẽ đề xuất mức giá họ mong muốn nằm trong khoảng này
        </Text>

        <View style={[styles.chipsRow, { gap: theme.spacing.xs }]}>
          {PRICE_PRESETS.map((preset, idx) => {
            const isActive = activePricePreset === idx;
            return (
              <TouchableOpacity
                key={preset.label}
                style={[
                  styles.chip,
                  {
                    backgroundColor: theme.colors.background.secondary,
                    borderColor: theme.colors.border.subtle,
                  },
                  isActive && { backgroundColor: theme.colors.brand.primarySoft, borderColor: theme.colors.brand.primary },
                ]}
                onPress={() => {
                  setActivePricePreset(idx);
                  setBudgetMinInput(String(preset.min));
                  setBudgetMaxInput(String(preset.max));
                }}
                accessibilityRole="button"
                accessibilityLabel={`Chọn khoảng giá nhanh ${preset.label}`}
              >
                <Text style={[styles.chipText, { color: theme.colors.text.secondary }, isActive && { color: theme.colors.brand.primaryDark, fontWeight: '700' }]}>
                  {preset.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.priceRangeRow, { gap: theme.spacing.sm, marginTop: theme.spacing.md }]}>
          <View style={styles.priceInputCol}>
            <Text style={[styles.priceRangeLabel, { color: theme.colors.text.secondary }]}>Tối thiểu</Text>
            <View
              style={[
                styles.priceInputWrapper,
                {
                  backgroundColor: theme.colors.background.secondary,
                  borderColor: validationErrors.budget ? theme.colors.status.error : theme.colors.border.subtle,
                  borderRadius: theme.radius.small,
                },
              ]}
            >
              <TextInput
                style={[styles.priceInput, { color: theme.colors.text.primary }]}
                placeholder="0"
                placeholderTextColor={theme.colors.text.muted}
                value={budgetMinInput ? parseInt(budgetMinInput).toLocaleString('vi-VN') : ''}
                onChangeText={(txt) => {
                  const digits = txt.replace(/[^0-9]/g, '');
                  setBudgetMinInput(digits);
                  setActivePricePreset(null);
                }}
                keyboardType="numeric"
                accessibilityLabel="Ngân sách tối thiểu"
              />
              <Text style={[styles.priceCurrency, { color: theme.colors.text.muted }]}>đ</Text>
            </View>
          </View>

          <Text style={[styles.priceRangeDash, { color: theme.colors.text.muted, marginTop: 22 }]}>–</Text>

          <View style={styles.priceInputCol}>
            <Text style={[styles.priceRangeLabel, { color: theme.colors.text.secondary }]}>Tối đa</Text>
            <View
              style={[
                styles.priceInputWrapper,
                {
                  backgroundColor: theme.colors.background.secondary,
                  borderColor: validationErrors.budget ? theme.colors.status.error : theme.colors.border.subtle,
                  borderRadius: theme.radius.small,
                },
              ]}
            >
              <TextInput
                style={[styles.priceInput, { color: theme.colors.text.primary }]}
                placeholder="0"
                placeholderTextColor={theme.colors.text.muted}
                value={budgetMaxInput ? parseInt(budgetMaxInput).toLocaleString('vi-VN') : ''}
                onChangeText={(txt) => {
                  const digits = txt.replace(/[^0-9]/g, '');
                  setBudgetMaxInput(digits);
                  setActivePricePreset(null);
                }}
                keyboardType="numeric"
                accessibilityLabel="Ngân sách tối đa"
              />
              <Text style={[styles.priceCurrency, { color: theme.colors.text.muted }]}>đ</Text>
            </View>
          </View>
        </View>
        {validationErrors.budget ? (
          <Text style={styles.inlineErrorText}>{validationErrors.budget}</Text>
        ) : null}
      </View>

      {/* CHIPS: SALARY UNIT */}
      <View style={[styles.section, { marginBottom: theme.spacing.lg }]}>
        <Text style={[styles.sectionLabel, { color: theme.colors.text.primary }]}>Đơn vị thanh toán *</Text>
        <View style={[styles.chipsRow, { gap: theme.spacing.xs }]}>
          {SALARY_UNITS.map((unit) => {
            const isSelected = salaryUnit === unit.value;
            return (
              <TouchableOpacity
                key={unit.value}
                style={[
                  styles.chip,
                  {
                    backgroundColor: theme.colors.background.secondary,
                    borderColor: theme.colors.border.subtle,
                  },
                  isSelected && { backgroundColor: theme.colors.brand.primarySoft, borderColor: theme.colors.brand.primary },
                ]}
                onPress={() => setSalaryUnit(unit.value as any)}
                accessibilityState={{ selected: isSelected }}
                accessibilityRole="button"
                accessibilityLabel={`Đơn vị ${unit.label}`}
              >
                <Text style={[styles.chipText, { color: theme.colors.text.secondary }, isSelected && { color: theme.colors.brand.primaryDark, fontWeight: '700' }]}>
                  {unit.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
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
  priceHint: {
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 17,
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
  priceRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInputCol: {
    flex: 1,
  },
  priceRangeLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1.5,
    paddingHorizontal: 12,
  },
  priceInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  priceCurrency: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 4,
  },
  priceRangeDash: {
    fontSize: 20,
    fontWeight: '300',
  },
  inlineErrorText: {
    fontSize: 11,
    color: '#EF4444',
  },
});
