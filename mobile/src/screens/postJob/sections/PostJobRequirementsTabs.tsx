import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

interface PostJobRequirementsTabsProps {
  postType: 'RECRUITMENT' | 'SERVICE_OFFER';
  experienceLevel: string;
  selectedExpLabel: string;
  educationLevel: string;
  selectedEduLabel: string;
  genderRequirement: string;
  selectedGenderLabel: string;
  minAge: number | null;
  maxAge: number | null;
  minHeightCm: number | null;
  maxHeightCm: number | null;
  setExperienceModalVisible: (val: boolean) => void;
  setEducationModalVisible: (val: boolean) => void;
  setHeightModalVisible: (val: boolean) => void;
  setGenderModalVisible: (val: boolean) => void;
  setAgeModalVisible: (val: boolean) => void;
}

export const PostJobRequirementsTabs: React.FC<PostJobRequirementsTabsProps> = ({
  postType,
  experienceLevel,
  selectedExpLabel,
  educationLevel,
  selectedEduLabel,
  genderRequirement,
  selectedGenderLabel,
  minAge,
  maxAge,
  minHeightCm,
  maxHeightCm,
  setExperienceModalVisible,
  setEducationModalVisible,
  setHeightModalVisible,
  setGenderModalVisible,
  setAgeModalVisible,
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.section, { marginBottom: theme.spacing.xl }]}>
      <Text style={[styles.sectionLabel, { color: theme.colors.text.primary }]}>Yêu cầu ứng viên / Thông tin năng lực</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.reqTabsScroll, { gap: theme.spacing.xs }]}>
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
  );
};

const styles = StyleSheet.create({
  section: {},
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
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
