import React from 'react';
import { View } from 'react-native';
import { PostJobRequirementsStepper } from './PostJobRequirementsStepper';
import { PostJobRequirementsDeadline } from './PostJobRequirementsDeadline';
import { PostJobRequirementsBasic } from './PostJobRequirementsBasic';
import { PostJobRequirementsTabs } from './PostJobRequirementsTabs';

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
  return (
    <View>
      {postType === 'RECRUITMENT' && (
        <PostJobRequirementsStepper
          peopleNeeded={peopleNeeded}
          decreasePeople={decreasePeople}
          increasePeople={increasePeople}
          contactPhone={contactPhone}
          setContactPhone={setContactPhone}
          validationErrors={validationErrors}
        />
      )}

      {postType === 'RECRUITMENT' && (
        <PostJobRequirementsDeadline
          selectedDeadlinePreset={selectedDeadlinePreset}
          setSelectedDeadlinePreset={setSelectedDeadlinePreset}
        />
      )}

      <PostJobRequirementsBasic
        postType={postType}
        selectedEmpLabel={selectedEmpLabel}
        startDate={startDate}
        contactPhone={contactPhone}
        setContactPhone={setContactPhone}
        validationErrors={validationErrors}
        setEmploymentModalVisible={setEmploymentModalVisible}
        setDatePickerVisible={setDatePickerVisible}
      />

      <PostJobRequirementsTabs
        postType={postType}
        workMode={workMode}
        experienceLevel={experienceLevel}
        selectedExpLabel={selectedExpLabel}
        educationLevel={educationLevel}
        selectedEduLabel={selectedEduLabel}
        genderRequirement={genderRequirement}
        selectedGenderLabel={selectedGenderLabel}
        minAge={minAge}
        maxAge={maxAge}
        minHeightCm={minHeightCm}
        maxHeightCm={maxHeightCm}
        setWorkModeModalVisible={setWorkModeModalVisible}
        setExperienceModalVisible={setExperienceModalVisible}
        setEducationModalVisible={setEducationModalVisible}
        setHeightModalVisible={setHeightModalVisible}
        setGenderModalVisible={setGenderModalVisible}
        setAgeModalVisible={setAgeModalVisible}
      />
    </View>
  );
};
