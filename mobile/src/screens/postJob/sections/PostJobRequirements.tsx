import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { DEADLINE_PRESETS } from '../utils/postJobUtils';

interface PostJobRequirementsProps {
  postType: 'RECRUITMENT' | 'SERVICE_OFFER';
  workMode: 'ONSITE' | 'REMOTE' | 'NEGOTIABLE';
  experienceLevel: string;
  selectedExpLabel: string;
  educationLevel: string;
  selectedEduLabel: string;
  genderRequirement: string;
  selectedGenderLabel: string;
  employmentType: string;
  selectedEmpLabel: string;
  peopleNeeded: number;
  decreasePeople: () => void;
  increasePeople: () => void;
  contactPhone: string;
  setContactPhone: (phone: string) => void;
  startDate: Date;
  selectedDeadlinePreset: number | null;
  setSelectedDeadlinePreset: (val: number | null) => void;
  minAge: number | null;
  maxAge: number | null;
  minHeightCm: number | null;
  maxHeightCm: number | null;
  validationErrors: Record<string, string>;
  
  setWorkModeModalVisible: (val: boolean) => void;
  setEmploymentModalVisible: (val: boolean) => void;
  setDatePickerVisible: (val: boolean) => void;
  setExperienceModalVisible: (val: boolean) => void;
  setEducationModalVisible: (val: boolean) => void;
  setHeightModalVisible: (val: boolean) => void;
  setGenderModalVisible: (val: boolean) => void;
  setAgeModalVisible: (val: boolean) => void;
}

export const PostJobRequirements: React.FC<PostJobRequirementsProps> = ({
  postType,
  workMode,
  experienceLevel,
  selectedExpLabel,
  educationLevel,
  selectedEduLabel,
  genderRequirement,
  selectedGenderLabel,
  employmentType,
  selectedEmpLabel,
  peopleNeeded,
  decreasePeople,
  increasePeople,
  contactPhone,
  setContactPhone,
  startDate,
  selectedDeadlinePreset,
  setSelectedDeadlinePreset,
  minAge,
  maxAge,
  minHeightCm,
  maxHeightCm,
  validationErrors,
  
  setWorkModeModalVisible,
  setEmploymentModalVisible,
  setDatePickerVisible,
  setExperienceModalVisible,
  setEducationModalVisible,
  setHeightModalVisible,
  setGenderModalVisible,
  setAgeModalVisible,
}) => {
  const theme = useTheme();

  return (
    <View>
      {/* CONDITIONAL: PEOPLE NEEDED & CONTACT (RECRUITMENT ONLY) */}
      {postType === 'RECRUITMENT' && (
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
              <Text style={styles.inlineErrorText}>{validationErrors.contactPhone}</Text>
            ) : null}
          </View>
        </View>
      )}

      {/* DEADLINE PRESETS (RECRUITMENT ONLY) */}
      {postType === 'RECRUITMENT' && (
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
      )}

      {/* LOẠI CÔNG VIỆC & NGÀY BẮT ĐẦU HOẶC SỐ ĐIỆN THOẠI */}
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
              <Text style={styles.inlineErrorText}>{validationErrors.startDate}</Text>
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
              <Text style={styles.inlineErrorText}>{validationErrors.contactPhone}</Text>
            ) : null}
          </View>
        )}
      </View>

      {/* REQUIREMENT TABS (HORIZONTAL SCROLL) */}
      <View style={[styles.section, { marginBottom: theme.spacing.xl }]}>
        <Text style={[styles.sectionLabel, { color: theme.colors.text.primary }]}>Yêu cầu ứng viên / Thông tin năng lực</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.reqTabsScroll, { gap: theme.spacing.xs }]}>
          <TouchableOpacity
            style={[
              styles.reqTab,
              { backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.border.subtle, borderRadius: theme.radius.small, paddingHorizontal: theme.spacing.md },
              workMode !== 'ONSITE' && [styles.reqTabActive, { borderColor: theme.colors.brand.primary, backgroundColor: theme.colors.brand.primarySoft }],
            ]}
            onPress={() => setWorkModeModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Chọn hình thức làm việc yêu cầu"
          >
            <Text
              style={[
                styles.reqTabText,
                { color: theme.colors.text.secondary },
                workMode !== 'ONSITE' && [styles.reqTabTextActive, { color: theme.colors.brand.primaryDark }],
              ]}
            >
              {workMode === 'REMOTE' ? 'Làm từ xa' : workMode === 'NEGOTIABLE' ? 'Làm linh hoạt' : 'Hình thức'}
            </Text>
            <Ionicons name="chevron-down" size={14} color={workMode !== 'ONSITE' ? theme.colors.brand.primary : theme.colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.reqTab,
              { backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.border.subtle, borderRadius: theme.radius.small, paddingHorizontal: theme.spacing.md },
              experienceLevel !== 'NO_REQUIREMENT' && [styles.reqTabActive, { borderColor: theme.colors.brand.primary, backgroundColor: theme.colors.brand.primarySoft }],
            ]}
            onPress={() => setExperienceModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Chọn kinh nghiệm yêu cầu"
          >
            <Text
              style={[
                styles.reqTabText,
                { color: theme.colors.text.secondary },
                experienceLevel !== 'NO_REQUIREMENT' && [styles.reqTabTextActive, { color: theme.colors.brand.primaryDark }],
              ]}
            >
              {experienceLevel !== 'NO_REQUIREMENT' ? selectedExpLabel : 'Kinh nghiệm'}
            </Text>
            <Ionicons name="chevron-down" size={14} color={experienceLevel !== 'NO_REQUIREMENT' ? theme.colors.brand.primary : theme.colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.reqTab,
              { backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.border.subtle, borderRadius: theme.radius.small, paddingHorizontal: theme.spacing.md },
              educationLevel !== 'NO_REQUIREMENT' && [styles.reqTabActive, { borderColor: theme.colors.brand.primary, backgroundColor: theme.colors.brand.primarySoft }],
            ]}
            onPress={() => setEducationModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Chọn bằng cấp yêu cầu"
          >
            <Text
              style={[
                styles.reqTabText,
                { color: theme.colors.text.secondary },
                educationLevel !== 'NO_REQUIREMENT' && [styles.reqTabTextActive, { color: theme.colors.brand.primaryDark }],
              ]}
            >
              {educationLevel !== 'NO_REQUIREMENT' ? selectedEduLabel : 'Bằng cấp'}
            </Text>
            <Ionicons name="chevron-down" size={14} color={educationLevel !== 'NO_REQUIREMENT' ? theme.colors.brand.primary : theme.colors.text.secondary} />
          </TouchableOpacity>

          {postType === 'RECRUITMENT' && (
            <>
              <TouchableOpacity
                style={[
                  styles.reqTab,
                  { backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.border.subtle, borderRadius: theme.radius.small, paddingHorizontal: theme.spacing.md },
                  (minHeightCm !== null || maxHeightCm !== null) && [styles.reqTabActive, { borderColor: theme.colors.brand.primary, backgroundColor: theme.colors.brand.primarySoft }],
                ]}
                onPress={() => setHeightModalVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Chọn chiều cao yêu cầu"
              >
                <Text
                  style={[
                    styles.reqTabText,
                    { color: theme.colors.text.secondary },
                    (minHeightCm !== null || maxHeightCm !== null) && [styles.reqTabTextActive, { color: theme.colors.brand.primaryDark }],
                  ]}
                >
                  {minHeightCm !== null || maxHeightCm !== null
                    ? `Cao: ${minHeightCm || 100} - ${maxHeightCm || 220}cm`
                    : 'Chiều cao'}
                </Text>
                <Ionicons name="chevron-down" size={14} color={minHeightCm !== null || maxHeightCm !== null ? theme.colors.brand.primary : theme.colors.text.secondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.reqTab,
                  { backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.border.subtle, borderRadius: theme.radius.small, paddingHorizontal: theme.spacing.md },
                  genderRequirement !== 'NO_REQUIREMENT' && [styles.reqTabActive, { borderColor: theme.colors.brand.primary, backgroundColor: theme.colors.brand.primarySoft }],
                ]}
                onPress={() => setGenderModalVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Chọn giới tính yêu cầu"
              >
                <Text
                  style={[
                    styles.reqTabText,
                    { color: theme.colors.text.secondary },
                    genderRequirement !== 'NO_REQUIREMENT' && [styles.reqTabTextActive, { color: theme.colors.brand.primaryDark }],
                  ]}
                >
                  {genderRequirement !== 'NO_REQUIREMENT' ? selectedGenderLabel : 'Giới tính'}
                </Text>
                <Ionicons name="chevron-down" size={14} color={genderRequirement !== 'NO_REQUIREMENT' ? theme.colors.brand.primary : theme.colors.text.secondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.reqTab,
                  { backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.border.subtle, borderRadius: theme.radius.small, paddingHorizontal: theme.spacing.md },
                  (minAge !== null || maxAge !== null) && [styles.reqTabActive, { borderColor: theme.colors.brand.primary, backgroundColor: theme.colors.brand.primarySoft }],
                ]}
                onPress={() => setAgeModalVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Chọn độ tuổi yêu cầu"
              >
                <Text
                  style={[
                    styles.reqTabText,
                    { color: theme.colors.text.secondary },
                    (minAge !== null || maxAge !== null) && [styles.reqTabTextActive, { color: theme.colors.brand.primaryDark }],
                  ]}
                >
                  {minAge !== null || maxAge !== null ? `Tuổi: ${minAge || 15} - ${maxAge || 60}` : 'Độ tuổi'}
                </Text>
                <Ionicons name="chevron-down" size={14} color={minAge !== null || maxAge !== null ? theme.colors.brand.primary : theme.colors.text.secondary} />
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
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
  inlineErrorText: {
    fontSize: 11,
    color: '#EF4444',
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
  reqTabsScroll: {
    paddingVertical: 4,
  },
  reqTab: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1.5,
  },
  reqTabActive: {},
  reqTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  reqTabTextActive: {},
});
