import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

import { CategoryPickerModal } from '../../components/categories/CategoryPickerModal';
import { OptionSelectionModal } from '../../components/common/OptionSelectionModal';
import { RangeSelectionModal } from '../../components/common/RangeSelectionModal';
import { DatePickerModal } from '../../components/common/DatePickerModal';

import { useTheme } from '../../theme';
import { usePostJob } from './hooks/usePostJob';
import {
  WORK_MODES,
  SALARY_UNITS,
  EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
  EDUCATION_LEVELS,
  GENDER_REQUIREMENTS,
} from './utils/postJobUtils';

// Import subcomponents
import { PostJobHeader } from './sections/PostJobHeader';
import { PostJobTypeSelector } from './sections/PostJobTypeSelector';
import { PostJobBasicInfo } from './sections/PostJobBasicInfo';
import { PostJobBudget } from './sections/PostJobBudget';
import { PostJobRequirements } from './sections/PostJobRequirements';
import { PostJobMediaTags } from './sections/PostJobMediaTags';
import { PostJobErrors } from './sections/PostJobErrors';

export const PostJobScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const initialPostType = route.params?.initialPostType || 'RECRUITMENT';
  const editingTaskId = route.params?.taskId as string | undefined;

  const hookData = usePostJob({
    editingTaskId,
    initialPostType,
    navigation,
  });

  const {
    state: {
      postType,
      title,
      description,
      fieldId,
      fieldName,
      subcategoryId,
      subcategoryName,
      apiCategoryId,
      budgetMinInput,
      budgetMaxInput,
      activePricePreset,
      salaryUnit,
      workMode,
      employmentType,
      address,
      peopleNeeded,
      contactPhone,
      startDate,
      experienceLevel,
      educationLevel,
      genderRequirement,
      minAge,
      maxAge,
      minHeightCm,
      maxHeightCm,
      hashtagInput,
      hashtags,
      selectedImages,
      categoriesList,
      selectedDeadlinePreset,
      isEditMode,
      loading,
      editingTask,
      validationErrors,
      isFormValid,
    },
    actions: {
      setPostType,
      setTitle,
      setDescription,
      setFieldId,
      setFieldName,
      setSubcategoryId,
      setSubcategoryName,
      setApiCategoryId,
      setBudgetMinInput,
      setBudgetMaxInput,
      setActivePricePreset,
      setSalaryUnit,
      setWorkMode,
      setEmploymentType,
      setAddress,
      setPeopleNeeded,
      setContactPhone,
      setStartDate,
      setExperienceLevel,
      setEducationLevel,
      setGenderRequirement,
      setMinAge,
      setMaxAge,
      setMinHeightCm,
      setMaxHeightCm,
      setHashtagInput,
      setHashtags,
      setSelectedImages,
      setSelectedDeadlinePreset,
      handlePostTypeChange,
      increasePeople,
      decreasePeople,
      pickImages,
      removeImage,
      addHashtag,
      removeHashtag,
      handleSubmit,
      handleDiscardDraft,
    },
    modals: {
      categoryModalVisible,
      setCategoryModalVisible,
      workModeModalVisible,
      setWorkModeModalVisible,
      employmentModalVisible,
      setEmploymentModalVisible,
      experienceModalVisible,
      setExperienceModalVisible,
      educationModalVisible,
      setEducationModalVisible,
      genderModalVisible,
      setGenderModalVisible,
      ageModalVisible,
      setAgeModalVisible,
      heightModalVisible,
      setHeightModalVisible,
      datePickerVisible,
      setDatePickerVisible,
    }
  } = hookData;

  const selectedWorkModeLabel = useMemo(() => WORK_MODES.find((m) => m.value === workMode)?.label || 'Chọn hình thức', [workMode]);
  const selectedExpLabel = useMemo(() => EXPERIENCE_LEVELS.find((m) => m.value === experienceLevel)?.label || 'Không yêu cầu', [experienceLevel]);
  const selectedEduLabel = useMemo(() => EDUCATION_LEVELS.find((m) => m.value === educationLevel)?.label || 'Không yêu cầu', [educationLevel]);
  const selectedGenderLabel = useMemo(() => GENDER_REQUIREMENTS.find((m) => m.value === genderRequirement)?.label || 'Không yêu cầu', [genderRequirement]);
  const selectedEmpLabel = useMemo(() => EMPLOYMENT_TYPES.find((m) => m.value === employmentType)?.label || 'Chọn loại', [employmentType]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background.secondary }]}>
      {/* HEADER */}
      <PostJobHeader
        isEditMode={isEditMode}
        loading={loading}
        isFormValid={isFormValid}
        handleDiscardDraft={handleDiscardDraft}
        handleSubmit={handleSubmit}
        goBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={[styles.container, { backgroundColor: theme.colors.background.primary }]}
          contentContainerStyle={[styles.scrollContent, { padding: theme.spacing.lg }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* POST TYPE SELECTOR */}
          <PostJobTypeSelector
            postType={postType}
            handlePostTypeChange={handlePostTypeChange}
          />

          {/* BASIC INFO SECTION */}
          <PostJobBasicInfo
            postType={postType}
            subcategoryName={subcategoryName}
            workMode={workMode}
            address={address}
            setAddress={setAddress}
            title={title}
            setTitle={setTitle}
            description={description}
            setDescription={setDescription}
            validationErrors={validationErrors}
            onPressCategory={() => setCategoryModalVisible(true)}
          />

          {/* BUDGET SECTION */}
          <PostJobBudget
            budgetMinInput={budgetMinInput}
            setBudgetMinInput={setBudgetMinInput}
            budgetMaxInput={budgetMaxInput}
            setBudgetMaxInput={setBudgetMaxInput}
            activePricePreset={activePricePreset}
            setActivePricePreset={setActivePricePreset}
            salaryUnit={salaryUnit}
            setSalaryUnit={setSalaryUnit}
            validationErrors={validationErrors}
          />

          {/* REQUIREMENTS SECTION */}
          <PostJobRequirements
            postType={postType}
            workMode={workMode}
            experienceLevel={experienceLevel}
            selectedExpLabel={selectedExpLabel}
            educationLevel={educationLevel}
            selectedEduLabel={selectedEduLabel}
            genderRequirement={genderRequirement}
            selectedGenderLabel={selectedGenderLabel}
            employmentType={employmentType}
            selectedEmpLabel={selectedEmpLabel}
            peopleNeeded={peopleNeeded}
            decreasePeople={decreasePeople}
            increasePeople={increasePeople}
            contactPhone={contactPhone}
            setContactPhone={setContactPhone}
            startDate={startDate}
            selectedDeadlinePreset={selectedDeadlinePreset}
            setSelectedDeadlinePreset={setSelectedDeadlinePreset}
            minAge={minAge}
            maxAge={maxAge}
            minHeightCm={minHeightCm}
            maxHeightCm={maxHeightCm}
            validationErrors={validationErrors}
            setWorkModeModalVisible={setWorkModeModalVisible}
            setEmploymentModalVisible={setEmploymentModalVisible}
            setDatePickerVisible={setDatePickerVisible}
            setExperienceModalVisible={setExperienceModalVisible}
            setEducationModalVisible={setEducationModalVisible}
            setHeightModalVisible={setHeightModalVisible}
            setGenderModalVisible={setGenderModalVisible}
            setAgeModalVisible={setAgeModalVisible}
          />

          {/* MEDIA & TAGS SECTION */}
          <PostJobMediaTags
            selectedImages={selectedImages}
            removeImage={removeImage}
            pickImages={pickImages}
            hashtagInput={hashtagInput}
            setHashtagInput={setHashtagInput}
            addHashtag={addHashtag}
            hashtags={hashtags}
            removeHashtag={removeHashtag}
          />

          {/* ERROR SUMMARY */}
          <PostJobErrors
            isFormValid={isFormValid}
            validationErrors={validationErrors}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODALS */}
      <CategoryPickerModal
        visible={categoryModalVisible}
        selectedFieldId={fieldId}
        selectedSubcategoryId={subcategoryId}
        onClose={() => setCategoryModalVisible(false)}
        onSelectField={(field) => {
          setFieldId(field.id);
          setFieldName(field.name);
          setSubcategoryId(undefined);
          setSubcategoryName(undefined);
          setApiCategoryId(field.apiCategoryId);
        }}
        onSelectSubcategory={(field, subcategory) => {
          setFieldId(field.id);
          setFieldName(field.name);
          setSubcategoryId(subcategory.id);
          setSubcategoryName(subcategory.name);
          setApiCategoryId(field.apiCategoryId);
          setCategoryModalVisible(false);
        }}
        onClear={() => {
          setFieldId(undefined);
          setFieldName(undefined);
          setSubcategoryId(undefined);
          setSubcategoryName(undefined);
          setApiCategoryId(undefined);
        }}
        fields={categoriesList}
      />

      <OptionSelectionModal
        visible={workModeModalVisible}
        title="Hình thức làm việc"
        options={WORK_MODES}
        selectedValue={workMode}
        onSelect={(val) => {
          setWorkMode(val as any);
          if (val === 'REMOTE') {
            setAddress('');
          }
        }}
        onClose={() => setWorkModeModalVisible(false)}
      />

      <OptionSelectionModal
        visible={employmentModalVisible}
        title="Loại công việc"
        options={EMPLOYMENT_TYPES}
        selectedValue={employmentType}
        onSelect={(val) => setEmploymentType(val as any)}
        onClose={() => setEmploymentModalVisible(false)}
      />

      <OptionSelectionModal
        visible={experienceModalVisible}
        title="Kinh nghiệm yêu cầu"
        options={EXPERIENCE_LEVELS}
        selectedValue={experienceLevel}
        onSelect={(val) => setExperienceLevel(val)}
        onClose={() => setExperienceModalVisible(false)}
      />

      <OptionSelectionModal
        visible={educationModalVisible}
        title="Bằng cấp yêu cầu"
        options={EDUCATION_LEVELS}
        selectedValue={educationLevel}
        onSelect={(val) => setEducationLevel(val)}
        onClose={() => setEducationModalVisible(false)}
      />

      <OptionSelectionModal
        visible={genderModalVisible}
        title="Giới tính yêu cầu"
        options={GENDER_REQUIREMENTS}
        selectedValue={genderRequirement}
        onSelect={(val) => setGenderRequirement(val)}
        onClose={() => setGenderModalVisible(false)}
      />

      <RangeSelectionModal
        visible={ageModalVisible}
        title="Độ tuổi"
        unit="tuổi"
        min={15}
        max={60}
        initialMinVal={minAge}
        initialMaxVal={maxAge}
        onSave={(mi, ma) => {
          setMinAge(mi);
          setMaxAge(ma);
        }}
        onClose={() => setAgeModalVisible(false)}
      />

      <RangeSelectionModal
        visible={heightModalVisible}
        title="Chiều cao"
        unit="cm"
        min={100}
        max={220}
        initialMinVal={minHeightCm}
        initialMaxVal={maxHeightCm}
        onSave={(mi, ma) => {
          setMinHeightCm(mi);
          setMaxHeightCm(ma);
        }}
        onClose={() => setHeightModalVisible(false)}
      />

      <DatePickerModal
        visible={datePickerVisible}
        selectedDate={startDate}
        onSelect={(d) => setStartDate(d)}
        onClose={() => setDatePickerVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
});
