import { useState, useEffect, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import { taskService } from '../../../services/taskService';
import { categoryService } from '../../../services/categoryService';
import { JobField } from '../../../constants/jobCategories';
import { useApp } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { Task } from '../../../types';
import { showToast } from '../../../utils/toast';
import { getRawPrice } from '../utils/postJobUtils';

export type SelectedImage = {
  uri: string;
  base64?: string;
};

interface UsePostJobProps {
  editingTaskId?: string;
  initialPostType: 'RECRUITMENT' | 'SERVICE_OFFER';
  navigation: any;
}

export const usePostJob = ({ editingTaskId, initialPostType, navigation }: UsePostJobProps) => {
  const { addTask, updateTask } = useApp();
  const { user } = useAuth();
  const isEditMode = Boolean(editingTaskId);

  const [loading, setLoading] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Form Fields
  const [postType, setPostType] = useState<'RECRUITMENT' | 'SERVICE_OFFER'>(initialPostType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fieldId, setFieldId] = useState<string | undefined>();
  const [fieldName, setFieldName] = useState<string | undefined>();
  const [subcategoryId, setSubcategoryId] = useState<string | undefined>();
  const [subcategoryName, setSubcategoryName] = useState<string | undefined>();
  const [apiCategoryId, setApiCategoryId] = useState<string | undefined>();
  
  const [budgetMinInput, setBudgetMinInput] = useState('');
  const [budgetMaxInput, setBudgetMaxInput] = useState('');
  const [activePricePreset, setActivePricePreset] = useState<number | null>(null);
  const [salaryUnit, setSalaryUnit] = useState<'PER_JOB' | 'PER_HOUR' | 'PER_DAY' | 'PER_MONTH'>('PER_JOB');
  const [workMode, setWorkMode] = useState<'ONSITE' | 'REMOTE' | 'NEGOTIABLE'>('ONSITE');
  const [employmentType, setEmploymentType] = useState<'ONE_TIME' | 'PART_TIME' | 'FULL_TIME' | 'CONTRACT' | 'FREELANCE' | 'SHIFT' | 'INTERNSHIP' | 'NEGOTIABLE'>('ONE_TIME');
  const [address, setAddress] = useState('');
  const [peopleNeeded, setPeopleNeeded] = useState(1);
  const [contactPhone, setContactPhone] = useState(user?.phone || '');
  const [startDate, setStartDate] = useState<Date>(new Date());
  
  const [experienceLevel, setExperienceLevel] = useState('NO_REQUIREMENT');
  const [educationLevel, setEducationLevel] = useState('NO_REQUIREMENT');
  const [genderRequirement, setGenderRequirement] = useState('NO_REQUIREMENT');
  
  const [minAge, setMinAge] = useState<number | null>(null);
  const [maxAge, setMaxAge] = useState<number | null>(null);
  const [minHeightCm, setMinHeightCm] = useState<number | null>(null);
  const [maxHeightCm, setMaxHeightCm] = useState<number | null>(null);

  const [hashtagInput, setHashtagInput] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [categoriesList, setCategoriesList] = useState<JobField[]>([]);
  const [selectedDeadlinePreset, setSelectedDeadlinePreset] = useState<number | null>(null);

  // Modal Visibility States
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [workModeModalVisible, setWorkModeModalVisible] = useState(false);
  const [employmentModalVisible, setEmploymentModalVisible] = useState(false);
  const [experienceModalVisible, setExperienceModalVisible] = useState(false);
  const [educationModalVisible, setEducationModalVisible] = useState(false);
  const [genderModalVisible, setGenderModalVisible] = useState(false);
  const [ageModalVisible, setAgeModalVisible] = useState(false);
  const [heightModalVisible, setHeightModalVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  // Inline validation logic
  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};

    if (title.trim() && title.length < 5) {
      errors.title = 'Tiêu đề bài đăng phải có ít nhất 5 ký tự.';
    }
    if (description.trim() && description.length < 10) {
      errors.description = 'Mô tả công việc phải có ít nhất 10 ký tự.';
    }
    const rawMin = getRawPrice(budgetMinInput);
    const rawMax = getRawPrice(budgetMaxInput);
    if (budgetMinInput && rawMin <= 0) {
      errors.budget = 'Giá tối thiểu phải lớn hơn 0đ.';
    } else if (budgetMaxInput && rawMax <= 0) {
      errors.budget = 'Giá tối đa phải lớn hơn 0đ.';
    } else if (budgetMinInput && budgetMaxInput && rawMin > rawMax) {
      errors.budget = 'Giá tối thiểu không được lớn hơn giá tối đa.';
    }
    if (workMode === 'ONSITE' && !address.trim()) {
      errors.address = 'Địa chỉ là bắt buộc khi làm việc tại chỗ.';
    }
    if (!contactPhone.trim()) {
      errors.contactPhone = 'Số điện thoại liên hệ là bắt buộc.';
    }
    if (postType === 'RECRUITMENT') {
      if (peopleNeeded < 1) {
        errors.peopleNeeded = 'Cần tuyển ít nhất 1 người.';
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (startDate && startDate.getTime() < today.getTime()) {
        errors.startDate = 'Ngày bắt đầu không được ở quá khứ.';
      }
    }

    return errors;
  }, [title, description, budgetMinInput, budgetMaxInput, workMode, address, postType, peopleNeeded, startDate, contactPhone]);

  const isFormValid = useMemo(() => {
    if (!title.trim() || title.length < 5) return false;
    if (!description.trim() || description.length < 10) return false;
    if (!fieldId || !subcategoryId) return false;
    const rawMin = getRawPrice(budgetMinInput);
    const rawMax = getRawPrice(budgetMaxInput);
    if (rawMin <= 0 || rawMax <= 0 || rawMin > rawMax) return false;
    if (workMode === 'ONSITE' && !address.trim()) return false;
    if (!contactPhone.trim()) return false;
    if (postType === 'RECRUITMENT') {
      if (peopleNeeded < 1) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (startDate && startDate.getTime() < today.getTime()) return false;
    }
    return Object.keys(validationErrors).length === 0;
  }, [title, description, fieldId, subcategoryId, budgetMinInput, budgetMaxInput, workMode, address, postType, peopleNeeded, contactPhone, startDate, validationErrors]);

  // Load draft on mount / when postType changes
  useEffect(() => {
    if (isEditMode) return;

    const loadDraft = async () => {
      try {
        const key = postType === 'RECRUITMENT' ? '@snapon/draft_recruitment' : '@snapon/draft_service_offer';
        const draftStr = await AsyncStorage.getItem(key);
        if (draftStr) {
          const draft = JSON.parse(draftStr);
          setTitle(draft.title || '');
          setDescription(draft.description || '');
          setFieldId(draft.fieldId || undefined);
          setFieldName(draft.fieldName || undefined);
          setSubcategoryId(draft.subcategoryId || undefined);
          setSubcategoryName(draft.subcategoryName || undefined);
          setBudgetMinInput(draft.budgetMinInput || '');
          setBudgetMaxInput(draft.budgetMaxInput || '');
          setSalaryUnit(draft.salaryUnit || 'PER_JOB');
          setWorkMode(draft.workMode || 'ONSITE');
          setEmploymentType(draft.employmentType || 'ONE_TIME');
          setAddress(draft.address || '');
          setPeopleNeeded(draft.peopleNeeded || 1);
          setContactPhone(draft.contactPhone || user?.phone || '');
          setExperienceLevel(draft.experienceLevel || 'NO_REQUIREMENT');
          setEducationLevel(draft.educationLevel || 'NO_REQUIREMENT');
          setGenderRequirement(draft.genderRequirement || 'NO_REQUIREMENT');
          setMinAge(draft.minAge ?? null);
          setMaxAge(draft.maxAge ?? null);
          setMinHeightCm(draft.minHeightCm ?? null);
          setMaxHeightCm(draft.maxHeightCm ?? null);
          setHashtags(draft.hashtags || []);
          if (draft.startDate) {
            setStartDate(new Date(draft.startDate));
          }
        }
      } catch (e) {
        console.warn('Failed to load draft:', e);
      }
    };
    void loadDraft();
  }, [postType, isEditMode, user]);

  // Save draft periodically
  useEffect(() => {
    if (isEditMode) return;

    const draft = {
      title,
      description,
      fieldId,
      fieldName,
      subcategoryId,
      subcategoryName,
      budgetMinInput,
      budgetMaxInput,
      salaryUnit,
      workMode,
      employmentType,
      address,
      peopleNeeded,
      contactPhone,
      startDate: startDate.toISOString(),
      experienceLevel,
      educationLevel,
      genderRequirement,
      minAge,
      maxAge,
      minHeightCm,
      maxHeightCm,
      hashtags,
    };

    const timer = setTimeout(() => {
      const key = postType === 'RECRUITMENT' ? '@snapon/draft_recruitment' : '@snapon/draft_service_offer';
      AsyncStorage.setItem(key, JSON.stringify(draft)).catch((e) => {
        console.warn('Failed to save draft:', e);
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    title,
    description,
    fieldId,
    fieldName,
    subcategoryId,
    subcategoryName,
    budgetMinInput,
    budgetMaxInput,
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
    hashtags,
    postType,
    isEditMode,
  ]);

  const handleDiscardDraft = async () => {
    Alert.alert(
      'Hủy bản nháp',
      'Bạn có chắc chắn muốn xóa toàn bộ bản nháp và làm lại từ đầu?',
      [
        { text: 'Quay lại', style: 'cancel' },
        {
          text: 'Xóa bản nháp',
          style: 'destructive',
          onPress: async () => {
            try {
              const key = postType === 'RECRUITMENT' ? '@snapon/draft_recruitment' : '@snapon/draft_service_offer';
              await AsyncStorage.removeItem(key);
              
              // Reset form states
              setTitle('');
              setDescription('');
              setFieldId(undefined);
              setFieldName(undefined);
              setSubcategoryId(undefined);
              setSubcategoryName(undefined);
              setBudgetMinInput('');
              setBudgetMaxInput('');
              setActivePricePreset(null);
              setAddress('');
              setPeopleNeeded(1);
              setHashtags([]);
              setSelectedImages([]);
              setExperienceLevel('NO_REQUIREMENT');
              setEducationLevel('NO_REQUIREMENT');
              setGenderRequirement('NO_REQUIREMENT');
              setMinAge(null);
              setMaxAge(null);
              setMinHeightCm(null);
              setMaxHeightCm(null);
              setSelectedDeadlinePreset(null);
              setStartDate(new Date());
              showToast.success('Thành công', 'Đã hủy bản nháp.');
            } catch (e) {
              showToast.error('Lỗi', 'Không thể hủy bản nháp.');
            }
          },
        },
      ]
    );
  };

  // Load dynamic categories on mount
  useEffect(() => {
    let active = true;
    const fetchCategories = async () => {
      const data = await categoryService.getCategories();
      if (active && data) {
        setCategoriesList(data);
      }
    };
    void fetchCategories();
    return () => {
      active = false;
    };
  }, []);

  // Load task data if in edit mode
  useEffect(() => {
    let active = true;

    const loadTaskForEdit = async () => {
      if (!editingTaskId) {
        setEditingTask(null);
        return;
      }

      setLoading(true);
      try {
        const taskData = await taskService.getTaskById(editingTaskId);
        if (!active) return;

        setEditingTask(taskData);
        setPostType((taskData.postType || 'RECRUITMENT') as 'RECRUITMENT' | 'SERVICE_OFFER');
        setTitle(taskData.title || '');
        setDescription(taskData.description || '');
        setFieldId(taskData.categoryId);
        setFieldName(taskData.field?.name || taskData.categoryName);
        setSubcategoryId(taskData.subcategory?.id || taskData.skills?.[0]?.id);
        setSubcategoryName(taskData.subcategory?.name || taskData.skills?.[0]?.name);
        setBudgetMinInput(String(taskData.budgetMin || 0));
        setBudgetMaxInput(String(taskData.budgetMax || taskData.budgetMin || 0));
        setActivePricePreset(null);
        setSalaryUnit((taskData.salaryUnit || 'PER_JOB') as any);
        setWorkMode((taskData.workMode || 'ONSITE') as any);
        setEmploymentType((taskData.employmentType || 'ONE_TIME') as any);
        setAddress(taskData.locations?.[0]?.address || '');
        setPeopleNeeded(taskData.peopleNeeded || 1);
        setContactPhone(taskData.contactPhone || user?.phone || '');
        setStartDate(taskData.startDate ? new Date(taskData.startDate) : new Date());
        setExperienceLevel(taskData.experienceLevel || 'NO_REQUIREMENT');
        setEducationLevel(taskData.educationLevel || 'NO_REQUIREMENT');
        setGenderRequirement(taskData.genderRequirement || 'NO_REQUIREMENT');
        setMinAge(taskData.minAge ?? null);
        setMaxAge(taskData.maxAge ?? null);
        setMinHeightCm(taskData.minHeightCm ?? null);
        setMaxHeightCm(taskData.maxHeightCm ?? null);
        setHashtags(taskData.hashtags || []);
        setSelectedImages((taskData.images || []).map((uri) => ({ uri })));
        setSelectedDeadlinePreset(null);
      } catch (error) {
        console.error('Load task for edit error:', error);
        showToast.error('Không tải được bài viết', 'Vui lòng thử lại sau ít phút.');
        navigation.goBack();
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadTaskForEdit();

    return () => {
      active = false;
    };
  }, [editingTaskId, navigation, user]);

  const handlePostTypeChange = (type: 'RECRUITMENT' | 'SERVICE_OFFER') => {
    if (type === postType) return;
    setPostType(type);
  };

  const increasePeople = () => setPeopleNeeded((prev) => prev + 1);
  const decreasePeople = () => setPeopleNeeded((prev) => Math.max(1, prev - 1));

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast.error('Quyền truy cập', 'Chúng tôi cần quyền truy cập ảnh của bạn!');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 1.0,
        selectionLimit: 5 - selectedImages.length,
      });

      if (!result.canceled) {
        setLoading(true);
        try {
          const compressedImages = await Promise.all(
            result.assets.map(async (asset) => {
              const actions: ImageManipulator.Action[] = [];
              if (asset.width > 1024 || asset.height > 1024) {
                if (asset.width > asset.height) {
                  actions.push({ resize: { width: 1024 } });
                } else {
                  actions.push({ resize: { height: 1024 } });
                }
              }

              const manipulated = await ImageManipulator.manipulateAsync(
                asset.uri,
                actions,
                {
                  compress: 0.8,
                  format: ImageManipulator.SaveFormat.JPEG,
                  base64: true,
                }
              );

              return {
                uri: manipulated.uri,
                base64: manipulated.base64 || undefined,
              };
            })
          );

          setSelectedImages((prev) => [...prev, ...compressedImages].slice(0, 5));
        } catch (manipulateError) {
          console.error('Compress image error:', manipulateError);
          showToast.error('Lỗi', 'Có lỗi khi tối ưu hình ảnh.');
        } finally {
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Pick image error:', err);
      showToast.error('Lỗi', 'Không thể chọn ảnh');
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const addHashtag = () => {
    const cleaned = hashtagInput.replace(/^#+/, '').trim().toLowerCase();
    if (cleaned && !hashtags.includes(cleaned)) {
      setHashtags((prev) => [...prev, cleaned]);
      setHashtagInput('');
    }
  };

  const removeHashtag = (tag: string) => {
    setHashtags((prev) => prev.filter((t) => t !== tag));
  };

  const handleSubmit = async () => {
    if (!isFormValid) return;

    setLoading(true);
    try {
      const existingImageUrls = selectedImages
        .filter((img) => !img.base64)
        .map((img) => img.uri);
      let uploadedImageUrls: string[] = [];
      const base64s = selectedImages.map((img) => img.base64).filter((b): b is string => !!b);
      if (base64s.length > 0) {
        uploadedImageUrls = await taskService.uploadTaskImages(base64s);
      }
      const imageUrls = [...existingImageUrls, ...uploadedImageUrls];

      const budgetMin = getRawPrice(budgetMinInput);
      const budgetMax = getRawPrice(budgetMaxInput);

      let applicationDeadline: string | null = isEditMode
        ? editingTask?.applicationDeadline || null
        : null;
      if (postType === 'RECRUITMENT' && selectedDeadlinePreset !== null) {
        applicationDeadline = new Date(Date.now() + selectedDeadlinePreset * 86400000).toISOString();
      }

      const payload = {
        title,
        description,
        category_id: fieldId!,
        task_type: 'ONLINE',
        budget_min: budgetMin,
        budget_max: budgetMax,
        deadline_start: new Date().toISOString(),
        deadline_end: new Date(Date.now() + 30 * 86400000).toISOString(),
        application_deadline: applicationDeadline,
        skill_ids: [subcategoryId!],
        images: imageUrls,
        post_type: postType,
        work_mode: workMode,
        salary_unit: salaryUnit,
        employment_type: employmentType,
        people_needed: postType === 'RECRUITMENT' ? peopleNeeded : null,
        contact_phone: contactPhone.trim() || null,
        start_date: postType === 'RECRUITMENT' ? startDate.toISOString() : null,
        experience_level: experienceLevel,
        education_level: educationLevel,
        gender_requirement: postType === 'RECRUITMENT' ? genderRequirement : 'NO_REQUIREMENT',
        min_age: postType === 'RECRUITMENT' ? minAge : null,
        max_age: postType === 'RECRUITMENT' ? maxAge : null,
        min_height_cm: postType === 'RECRUITMENT' ? minHeightCm : null,
        max_height_cm: postType === 'RECRUITMENT' ? maxHeightCm : null,
        hashtags: hashtags,
        location:
          workMode !== 'REMOTE' && address.trim()
            ? {
                location_type: 'TASK_LOCATION',
                address: address.trim(),
                latitude: 10.7769,
                longitude: 106.7009,
              }
            : undefined,
      };

      const savedTask =
        isEditMode && editingTaskId
          ? await taskService.updateTask(editingTaskId, payload)
          : await taskService.createTask(payload);

      // Clear draft on successful submit
      const key = postType === 'RECRUITMENT' ? '@snapon/draft_recruitment' : '@snapon/draft_service_offer';
      await AsyncStorage.removeItem(key);

      if (isEditMode) {
        updateTask(savedTask.id, savedTask);
        navigation.setParams({ taskId: undefined });
      } else {
        addTask(savedTask);
      }

      showToast.success('Thành công', isEditMode ? 'Bài đăng đã cập nhật!' : 'Đã đăng bài thành công!');
      navigation.navigate('JobDetail', { taskId: savedTask.id });
    } catch (err: any) {
      console.error('Submit task error:', err);
      const msg = err.response?.data?.message || err.message || 'Có lỗi xảy ra khi lưu bài.';
      showToast.error(isEditMode ? 'Lỗi cập nhật' : 'Lỗi đăng bài', msg);
    } finally {
      setLoading(false);
    }
  };

  return {
    postType,
    setPostType,
    title,
    setTitle,
    description,
    setDescription,
    fieldId,
    setFieldId,
    fieldName,
    setFieldName,
    subcategoryId,
    setSubcategoryId,
    subcategoryName,
    setSubcategoryName,
    apiCategoryId,
    setApiCategoryId,
    budgetMinInput,
    setBudgetMinInput,
    budgetMaxInput,
    setBudgetMaxInput,
    activePricePreset,
    setActivePricePreset,
    salaryUnit,
    setSalaryUnit,
    workMode,
    setWorkMode,
    employmentType,
    setEmploymentType,
    address,
    setAddress,
    peopleNeeded,
    setPeopleNeeded,
    contactPhone,
    setContactPhone,
    startDate,
    setStartDate,
    experienceLevel,
    setExperienceLevel,
    educationLevel,
    setEducationLevel,
    genderRequirement,
    setGenderRequirement,
    minAge,
    setMinAge,
    maxAge,
    setMaxAge,
    minHeightCm,
    setMinHeightCm,
    maxHeightCm,
    setMaxHeightCm,
    hashtagInput,
    setHashtagInput,
    hashtags,
    setHashtags,
    selectedImages,
    setSelectedImages,
    categoriesList,
    selectedDeadlinePreset,
    setSelectedDeadlinePreset,
    
    // Modal states
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

    // Helpers / handlers
    isEditMode,
    loading,
    editingTask,
    validationErrors,
    isFormValid,
    handlePostTypeChange,
    increasePeople,
    decreasePeople,
    pickImages,
    removeImage,
    addHashtag,
    removeHashtag,
    handleSubmit,
    handleDiscardDraft,
  };
};
