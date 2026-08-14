import { useState, useEffect, useMemo, useCallback, useReducer } from 'react';
import { Alert, DeviceEventEmitter } from 'react-native';
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

import { PostJobScreenNavigationProp } from '../PostJobScreen';

export type SelectedImage = {
  uri: string;
  base64?: string;
};

interface UsePostJobProps {
  editingTaskId?: string;
  initialPostType: 'RECRUITMENT' | 'SERVICE_OFFER';
  navigation: PostJobScreenNavigationProp;
}

// 1. Reducer for the Form Fields State
interface PostJobFormState {
  postType: 'RECRUITMENT' | 'SERVICE_OFFER';
  title: string;
  description: string;
  fieldId: string | undefined;
  fieldName: string | undefined;
  subcategoryId: string | undefined;
  subcategoryName: string | undefined;
  apiCategoryId: string | undefined;
  budgetMinInput: string;
  budgetMaxInput: string;
  activePricePreset: number | null;
  salaryUnit: 'PER_JOB' | 'PER_HOUR' | 'PER_DAY' | 'PER_MONTH';
  workMode: 'ONSITE' | 'REMOTE' | 'NEGOTIABLE';
  employmentType: 'ONE_TIME' | 'PART_TIME' | 'FULL_TIME' | 'CONTRACT' | 'FREELANCE' | 'SHIFT' | 'INTERNSHIP' | 'NEGOTIABLE';
  address: string;
  peopleNeeded: number;
  contactPhone: string;
  startDate: Date;
  experienceLevel: string;
  educationLevel: string;
  genderRequirement: string;
  minAge: number | null;
  maxAge: number | null;
  minHeightCm: number | null;
  maxHeightCm: number | null;
  hashtagInput: string;
  hashtags: string[];
  selectedImages: SelectedImage[];
  selectedDeadlinePreset: number | null;
}

type PostJobFormAction =
  | { type: 'SET_FIELD'; field: keyof PostJobFormState; value: any }
  | { type: 'SET_FIELDS'; payload: Partial<PostJobFormState> }
  | { type: 'RESET_FORM'; initialPhone?: string };

const createInitialFormState = (initialPostType: 'RECRUITMENT' | 'SERVICE_OFFER', initialPhone?: string): PostJobFormState => ({
  postType: initialPostType,
  title: '',
  description: '',
  fieldId: undefined,
  fieldName: undefined,
  subcategoryId: undefined,
  subcategoryName: undefined,
  apiCategoryId: undefined,
  budgetMinInput: '',
  budgetMaxInput: '',
  activePricePreset: null,
  salaryUnit: 'PER_JOB',
  workMode: 'REMOTE',
  employmentType: 'ONE_TIME',
  address: '',
  peopleNeeded: 1,
  contactPhone: initialPhone || '',
  startDate: new Date(),
  experienceLevel: 'NO_REQUIREMENT',
  educationLevel: 'NO_REQUIREMENT',
  genderRequirement: 'NO_REQUIREMENT',
  minAge: null,
  maxAge: null,
  minHeightCm: null,
  maxHeightCm: null,
  hashtagInput: '',
  hashtags: [],
  selectedImages: [],
  selectedDeadlinePreset: null,
});

const postJobFormReducer = (state: PostJobFormState, action: PostJobFormAction): PostJobFormState => {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_FIELDS':
      return { ...state, ...action.payload };
    case 'RESET_FORM':
      return createInitialFormState(state.postType, action.initialPhone);
    default:
      return state;
  }
};

// 2. Reducer for the Modals Visibility State
interface ModalsState {
  categoryModalVisible: boolean;
  workModeModalVisible: boolean;
  employmentModalVisible: boolean;
  experienceModalVisible: boolean;
  educationModalVisible: boolean;
  genderModalVisible: boolean;
  ageModalVisible: boolean;
  heightModalVisible: boolean;
  datePickerVisible: boolean;
}

type ModalsAction =
  | { type: 'SET_MODAL_VISIBLE'; modal: keyof ModalsState; visible: boolean }
  | { type: 'CLOSE_ALL' };

const modalsReducer = (state: ModalsState, action: ModalsAction): ModalsState => {
  switch (action.type) {
    case 'SET_MODAL_VISIBLE':
      return { ...state, [action.modal]: action.visible };
    case 'CLOSE_ALL':
      return {
        categoryModalVisible: false,
        workModeModalVisible: false,
        employmentModalVisible: false,
        experienceModalVisible: false,
        educationModalVisible: false,
        genderModalVisible: false,
        ageModalVisible: false,
        heightModalVisible: false,
        datePickerVisible: false,
      };
    default:
      return state;
  }
};

export const usePostJob = ({ editingTaskId, initialPostType, navigation }: UsePostJobProps) => {
  const { user } = useAuth();
  const isEditMode = Boolean(editingTaskId);

  const [loading, setLoading] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [categoriesList, setCategoriesList] = useState<JobField[]>([]);

  // Reducer states
  const [formState, dispatch] = useReducer(
    postJobFormReducer,
    createInitialFormState(initialPostType, user?.phone)
  );

  const [modalsState, dispatchModals] = useReducer(modalsReducer, {
    categoryModalVisible: false,
    workModeModalVisible: false,
    employmentModalVisible: false,
    experienceModalVisible: false,
    educationModalVisible: false,
    genderModalVisible: false,
    ageModalVisible: false,
    heightModalVisible: false,
    datePickerVisible: false,
  });

  const setField = useCallback((field: keyof PostJobFormState, value: any) => {
    dispatch({ type: 'SET_FIELD', field, value });
  }, []);

  const setModalVisible = useCallback((modal: keyof ModalsState, visible: boolean) => {
    dispatchModals({ type: 'SET_MODAL_VISIBLE', modal, visible });
  }, []);

  // Validation logic (derived from reducer state)
  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};

    if (formState.title.trim() && formState.title.length < 5) {
      errors.title = 'Tiêu đề bài đăng phải có ít nhất 5 ký tự.';
    }
    if (formState.description.trim() && formState.description.length < 10) {
      errors.description = 'Mô tả công việc phải có ít nhất 10 ký tự.';
    }
    const rawMin = getRawPrice(formState.budgetMinInput);
    const rawMax = getRawPrice(formState.budgetMaxInput);
    if (formState.budgetMinInput && rawMin <= 0) {
      errors.budget = 'Giá tối thiểu phải lớn hơn 0đ.';
    } else if (formState.budgetMaxInput && rawMax <= 0) {
      errors.budget = 'Giá tối đa phải lớn hơn 0đ.';
    } else if (formState.budgetMinInput && formState.budgetMaxInput && rawMin > rawMax) {
      errors.budget = 'Giá tối thiểu không được lớn hơn giá tối đa.';
    }
    if (!formState.contactPhone.trim()) {
      errors.contactPhone = 'Số điện thoại liên hệ là bắt buộc.';
    }
    if (formState.postType === 'RECRUITMENT') {
      if (formState.peopleNeeded < 1) {
        errors.peopleNeeded = 'Cần tuyển ít nhất 1 người.';
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (formState.startDate && formState.startDate.getTime() < today.getTime()) {
        errors.startDate = 'Ngày bắt đầu không được ở quá khứ.';
      }
    }

    return errors;
  }, [
    formState.title,
    formState.description,
    formState.budgetMinInput,
    formState.budgetMaxInput,
    formState.workMode,
    formState.address,
    formState.postType,
    formState.peopleNeeded,
    formState.startDate,
    formState.contactPhone,
  ]);

  const isFormValid = useMemo(() => {
    if (!formState.title.trim() || formState.title.length < 5) return false;
    if (!formState.description.trim() || formState.description.length < 10) return false;
    const rawMin = getRawPrice(formState.budgetMinInput);
    const rawMax = getRawPrice(formState.budgetMaxInput);
    if (rawMin <= 0 || rawMax <= 0 || rawMin > rawMax) return false;
    if (!formState.contactPhone.trim()) return false;
    if (formState.postType === 'RECRUITMENT') {
      if (formState.peopleNeeded < 1) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (formState.startDate && formState.startDate.getTime() < today.getTime()) return false;
    }
    return Object.keys(validationErrors).length === 0;
  }, [
    formState.title,
    formState.description,
    formState.fieldId,
    formState.subcategoryId,
    formState.budgetMinInput,
    formState.budgetMaxInput,
    formState.workMode,
    formState.address,
    formState.postType,
    formState.peopleNeeded,
    formState.contactPhone,
    formState.startDate,
    validationErrors,
  ]);

  // Load draft on mount / when postType changes
  useEffect(() => {
    if (isEditMode) return;

    const loadDraft = async () => {
      try {
        const key = formState.postType === 'RECRUITMENT' ? '@snapon/draft_recruitment' : '@snapon/draft_service_offer';
        const draftStr = await AsyncStorage.getItem(key);
        if (draftStr) {
          const draft = JSON.parse(draftStr);
          dispatch({
            type: 'SET_FIELDS',
            payload: {
              title: draft.title || '',
              description: draft.description || '',
              fieldId: draft.fieldId || undefined,
              fieldName: draft.fieldName || undefined,
              subcategoryId: draft.subcategoryId || undefined,
              subcategoryName: draft.subcategoryName || undefined,
              budgetMinInput: draft.budgetMinInput || '',
              budgetMaxInput: draft.budgetMaxInput || '',
              salaryUnit: draft.salaryUnit || 'PER_JOB',
              workMode: draft.workMode === 'ONSITE' ? 'REMOTE' : (draft.workMode || 'REMOTE'),
              employmentType: draft.employmentType || 'ONE_TIME',
              address: draft.address || '',
              peopleNeeded: draft.peopleNeeded || 1,
              contactPhone: draft.contactPhone || user?.phone || '',
              experienceLevel: draft.experienceLevel || 'NO_REQUIREMENT',
              educationLevel: draft.educationLevel || 'NO_REQUIREMENT',
              genderRequirement: draft.genderRequirement || 'NO_REQUIREMENT',
              minAge: draft.minAge ?? null,
              maxAge: draft.maxAge ?? null,
              minHeightCm: draft.minHeightCm ?? null,
              maxHeightCm: draft.maxHeightCm ?? null,
              hashtags: draft.hashtags || [],
              startDate: draft.startDate ? new Date(draft.startDate) : new Date(),
            },
          });
        }
      } catch (e) {
        console.warn('Failed to load draft:', e);
      }
    };
    void loadDraft();
  }, [formState.postType, isEditMode, user]);

  // Save draft periodically
  useEffect(() => {
    if (isEditMode) return;

    const draft = {
      title: formState.title,
      description: formState.description,
      fieldId: formState.fieldId,
      fieldName: formState.fieldName,
      subcategoryId: formState.subcategoryId,
      subcategoryName: formState.subcategoryName,
      budgetMinInput: formState.budgetMinInput,
      budgetMaxInput: formState.budgetMaxInput,
      salaryUnit: formState.salaryUnit,
      workMode: formState.workMode,
      employmentType: formState.employmentType,
      address: formState.address,
      peopleNeeded: formState.peopleNeeded,
      contactPhone: formState.contactPhone,
      startDate: formState.startDate.toISOString(),
      experienceLevel: formState.experienceLevel,
      educationLevel: formState.educationLevel,
      genderRequirement: formState.genderRequirement,
      minAge: formState.minAge,
      maxAge: formState.maxAge,
      minHeightCm: formState.minHeightCm,
      maxHeightCm: formState.maxHeightCm,
      hashtags: formState.hashtags,
    };

    const timer = setTimeout(() => {
      const key = formState.postType === 'RECRUITMENT' ? '@snapon/draft_recruitment' : '@snapon/draft_service_offer';
      AsyncStorage.setItem(key, JSON.stringify(draft)).catch((e) => {
        console.warn('Failed to save draft:', e);
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [formState, isEditMode]);

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
              const key = formState.postType === 'RECRUITMENT' ? '@snapon/draft_recruitment' : '@snapon/draft_service_offer';
              await AsyncStorage.removeItem(key);
              dispatch({ type: 'RESET_FORM', initialPhone: user?.phone });
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

        if (taskData.status === 'COMPLETED') {
          showToast.error('Không thể chỉnh sửa', 'Bài đăng đã hoàn thành nên không thể chỉnh sửa.');
          navigation.goBack();
          return;
        }

        const applicantCount = (taskData as any).applicantCount || ((taskData as any).applications ? (taskData as any).applications.length : 0);
        if (applicantCount > 0) {
          showToast.error('Không thể chỉnh sửa', 'Bài đăng đã có người ứng tuyển nên không thể chỉnh sửa.');
          navigation.goBack();
          return;
        }

        setEditingTask(taskData);
        dispatch({
          type: 'SET_FIELDS',
          payload: {
            postType: (taskData.postType || 'RECRUITMENT') as 'RECRUITMENT' | 'SERVICE_OFFER',
            title: taskData.title || '',
            description: taskData.description || '',
            fieldId: taskData.categoryId,
            fieldName: taskData.field?.name || taskData.categoryName,
            subcategoryId: taskData.subcategory?.id || taskData.skills?.[0]?.id,
            subcategoryName: taskData.subcategory?.name || taskData.skills?.[0]?.name,
            budgetMinInput: String(taskData.budgetMin || 0),
            budgetMaxInput: String(taskData.budgetMax || taskData.budgetMin || 0),
            activePricePreset: null,
            salaryUnit: (taskData.salaryUnit || 'PER_JOB') as any,
            workMode: (taskData.workMode || 'ONSITE') as any,
            employmentType: (taskData.employmentType || 'ONE_TIME') as any,
            address: taskData.locations?.[0]?.address || '',
            peopleNeeded: taskData.peopleNeeded || 1,
            contactPhone: taskData.contactPhone || user?.phone || '',
            startDate: taskData.startDate ? new Date(taskData.startDate) : new Date(),
            experienceLevel: taskData.experienceLevel || 'NO_REQUIREMENT',
            educationLevel: taskData.educationLevel || 'NO_REQUIREMENT',
            genderRequirement: taskData.genderRequirement || 'NO_REQUIREMENT',
            minAge: taskData.minAge ?? null,
            maxAge: taskData.maxAge ?? null,
            minHeightCm: taskData.minHeightCm ?? null,
            maxHeightCm: taskData.maxHeightCm ?? null,
            hashtags: taskData.hashtags || [],
            selectedImages: (taskData.images || []).map((uri) => ({ uri })),
            selectedDeadlinePreset: null,
          },
        });
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

  const handlePostTypeChange = useCallback((type: 'RECRUITMENT' | 'SERVICE_OFFER') => {
    if (type === formState.postType) return;
    setField('postType', type);
  }, [formState.postType, setField]);

  const increasePeople = useCallback(() => {
    setField('peopleNeeded', formState.peopleNeeded + 1);
  }, [formState.peopleNeeded, setField]);

  const decreasePeople = useCallback(() => {
    setField('peopleNeeded', Math.max(1, formState.peopleNeeded - 1));
  }, [formState.peopleNeeded, setField]);

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
        selectionLimit: 5 - formState.selectedImages.length,
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

          setField('selectedImages', [...formState.selectedImages, ...compressedImages].slice(0, 5));
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

  const removeImage = useCallback((index: number) => {
    setField('selectedImages', formState.selectedImages.filter((_, i) => i !== index));
  }, [formState.selectedImages, setField]);

  const addHashtag = useCallback(() => {
    const cleaned = formState.hashtagInput.replace(/^#+/, '').trim().toLowerCase();
    if (cleaned && !formState.hashtags.includes(cleaned)) {
      dispatch({
        type: 'SET_FIELDS',
        payload: {
          hashtags: [...formState.hashtags, cleaned],
          hashtagInput: '',
        },
      });
    }
  }, [formState.hashtagInput, formState.hashtags]);

  const removeHashtag = useCallback((tag: string) => {
    setField('hashtags', formState.hashtags.filter((t) => t !== tag));
  }, [formState.hashtags, setField]);

  const handleSubmit = async () => {
    if (!isFormValid) return;

    setLoading(true);
    try {
      const existingImageUrls = formState.selectedImages
        .filter((img) => !img.base64)
        .map((img) => img.uri);
      let uploadedImageUrls: string[] = [];
      const base64s = formState.selectedImages.map((img) => img.base64).filter((b): b is string => !!b);
      if (base64s.length > 0) {
        uploadedImageUrls = await taskService.uploadTaskImages(base64s);
      }
      const imageUrls = [...existingImageUrls, ...uploadedImageUrls];

      const budgetMin = getRawPrice(formState.budgetMinInput);
      const budgetMax = getRawPrice(formState.budgetMaxInput);

      let applicationDeadline: string | null = isEditMode
        ? editingTask?.applicationDeadline || null
        : null;
      if (formState.postType === 'RECRUITMENT' && formState.selectedDeadlinePreset !== null) {
        applicationDeadline = new Date(Date.now() + formState.selectedDeadlinePreset * 86400000).toISOString();
      }

      const defaultField = categoriesList[0];
      const finalFieldId = formState.fieldId || defaultField?.id || 'general';
      const defaultSkill = defaultField?.subcategories?.[0];
      const finalSkillIds = formState.subcategoryId ? [formState.subcategoryId] : (defaultSkill?.id ? [defaultSkill.id] : []);

      const payload = {
        title: formState.title,
        description: formState.description,
        category_id: finalFieldId,
        task_type: 'ONLINE',
        budget_min: budgetMin,
        budget_max: budgetMax,
        deadline_start: new Date().toISOString(),
        deadline_end: new Date(Date.now() + 30 * 86400000).toISOString(),
        application_deadline: applicationDeadline,
        skill_ids: finalSkillIds,
        images: imageUrls,
        post_type: formState.postType,
        work_mode: formState.workMode,
        salary_unit: formState.salaryUnit,
        employment_type: formState.employmentType,
        people_needed: formState.postType === 'RECRUITMENT' ? formState.peopleNeeded : null,
        contact_phone: formState.contactPhone.trim() || null,
        start_date: formState.postType === 'RECRUITMENT' ? formState.startDate.toISOString() : null,
        experience_level: formState.experienceLevel,
        education_level: formState.educationLevel,
        gender_requirement: formState.postType === 'RECRUITMENT' ? formState.genderRequirement : 'NO_REQUIREMENT',
        min_age: formState.postType === 'RECRUITMENT' ? formState.minAge : null,
        max_age: formState.postType === 'RECRUITMENT' ? formState.maxAge : null,
        min_height_cm: formState.postType === 'RECRUITMENT' ? formState.minHeightCm : null,
        max_height_cm: formState.postType === 'RECRUITMENT' ? formState.maxHeightCm : null,
        hashtags: formState.hashtags,
        location:
          formState.workMode !== 'REMOTE' && formState.address.trim()
            ? {
                location_type: 'TASK_LOCATION',
                address: formState.address.trim(),
                latitude: 10.7769,
                longitude: 106.7009,
              }
            : undefined,
      };

      const savedTask =
        isEditMode && editingTaskId
          ? await taskService.updateTask(editingTaskId, payload)
          : await taskService.createTask(payload);

      // Clear draft & reset form state on successful submit
      const key = formState.postType === 'RECRUITMENT' ? '@snapon/draft_recruitment' : '@snapon/draft_service_offer';
      await AsyncStorage.removeItem(key);
      dispatch({ type: 'RESET_FORM', initialPhone: user?.phone });

      if (isEditMode) {
        DeviceEventEmitter.emit('task_updated', savedTask);
        navigation.setParams({ taskId: undefined });
      } else {
        DeviceEventEmitter.emit('task_created', savedTask);
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
    state: {
      postType: formState.postType,
      title: formState.title,
      description: formState.description,
      fieldId: formState.fieldId,
      fieldName: formState.fieldName,
      subcategoryId: formState.subcategoryId,
      subcategoryName: formState.subcategoryName,
      apiCategoryId: formState.apiCategoryId,
      budgetMinInput: formState.budgetMinInput,
      budgetMaxInput: formState.budgetMaxInput,
      activePricePreset: formState.activePricePreset,
      salaryUnit: formState.salaryUnit,
      workMode: formState.workMode,
      employmentType: formState.employmentType,
      address: formState.address,
      peopleNeeded: formState.peopleNeeded,
      contactPhone: formState.contactPhone,
      startDate: formState.startDate,
      experienceLevel: formState.experienceLevel,
      educationLevel: formState.educationLevel,
      genderRequirement: formState.genderRequirement,
      minAge: formState.minAge,
      maxAge: formState.maxAge,
      minHeightCm: formState.minHeightCm,
      maxHeightCm: formState.maxHeightCm,
      hashtagInput: formState.hashtagInput,
      hashtags: formState.hashtags,
      selectedImages: formState.selectedImages,
      categoriesList,
      selectedDeadlinePreset: formState.selectedDeadlinePreset,
      isEditMode,
      loading,
      editingTask,
      validationErrors,
      isFormValid,
    },
    actions: {
      setPostType: (val: any) => setField('postType', val),
      setTitle: (val: any) => setField('title', val),
      setDescription: (val: any) => setField('description', val),
      setFieldId: (val: any) => setField('fieldId', val),
      setFieldName: (val: any) => setField('fieldName', val),
      setSubcategoryId: (val: any) => setField('subcategoryId', val),
      setSubcategoryName: (val: any) => setField('subcategoryName', val),
      setApiCategoryId: (val: any) => setField('apiCategoryId', val),
      setBudgetMinInput: (val: any) => setField('budgetMinInput', val),
      setBudgetMaxInput: (val: any) => setField('budgetMaxInput', val),
      setActivePricePreset: (val: any) => setField('activePricePreset', val),
      setSalaryUnit: (val: any) => setField('salaryUnit', val),
      setWorkMode: (val: any) => setField('workMode', val),
      setEmploymentType: (val: any) => setField('employmentType', val),
      setAddress: (val: any) => setField('address', val),
      setPeopleNeeded: (val: any) => setField('peopleNeeded', val),
      setContactPhone: (val: any) => setField('contactPhone', val),
      setStartDate: (val: any) => setField('startDate', val),
      setExperienceLevel: (val: any) => setField('experienceLevel', val),
      setEducationLevel: (val: any) => setField('educationLevel', val),
      setGenderRequirement: (val: any) => setField('genderRequirement', val),
      setMinAge: (val: any) => setField('minAge', val),
      setMaxAge: (val: any) => setField('maxAge', val),
      setMinHeightCm: (val: any) => setField('minHeightCm', val),
      setMaxHeightCm: (val: any) => setField('maxHeightCm', val),
      setHashtagInput: (val: any) => setField('hashtagInput', val),
      setHashtags: (val: any) => setField('hashtags', val),
      setSelectedImages: (val: any) => setField('selectedImages', val),
      setSelectedDeadlinePreset: (val: any) => setField('selectedDeadlinePreset', val),
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
      categoryModalVisible: modalsState.categoryModalVisible,
      setCategoryModalVisible: (val: boolean) => setModalVisible('categoryModalVisible', val),
      workModeModalVisible: modalsState.workModeModalVisible,
      setWorkModeModalVisible: (val: boolean) => setModalVisible('workModeModalVisible', val),
      employmentModalVisible: modalsState.employmentModalVisible,
      setEmploymentModalVisible: (val: boolean) => setModalVisible('employmentModalVisible', val),
      experienceModalVisible: modalsState.experienceModalVisible,
      setExperienceModalVisible: (val: boolean) => setModalVisible('experienceModalVisible', val),
      educationModalVisible: modalsState.educationModalVisible,
      setEducationModalVisible: (val: boolean) => setModalVisible('educationModalVisible', val),
      genderModalVisible: modalsState.genderModalVisible,
      setGenderModalVisible: (val: boolean) => setModalVisible('genderModalVisible', val),
      ageModalVisible: modalsState.ageModalVisible,
      setAgeModalVisible: (val: boolean) => setModalVisible('ageModalVisible', val),
      heightModalVisible: modalsState.heightModalVisible,
      setHeightModalVisible: (val: boolean) => setModalVisible('heightModalVisible', val),
      datePickerVisible: modalsState.datePickerVisible,
      setDatePickerVisible: (val: boolean) => setModalVisible('datePickerVisible', val),
    },
  };
};
