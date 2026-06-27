import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CategoryPickerModal } from '../../components/categories/CategoryPickerModal';
import { OptionSelectionModal } from '../../components/common/OptionSelectionModal';
import { RangeSelectionModal } from '../../components/common/RangeSelectionModal';
import { DatePickerModal } from '../../components/common/DatePickerModal';

import { taskService } from '../../services/taskService';
import { categoryService } from '../../services/categoryService';
import { JobField, JobSubcategory } from '../../constants/jobCategories';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme';
import { Task } from '../../types';
import { showToast } from '../../utils/toast';

const WORK_MODES = [
  { label: 'Tại chỗ (Onsite)', value: 'ONSITE' },
  { label: 'Từ xa (Remote)', value: 'REMOTE' },
  { label: 'Theo thỏa thuận', value: 'NEGOTIABLE' },
];

const SALARY_UNITS = [
  { label: '/công việc', value: 'PER_JOB' },
  { label: '/giờ', value: 'PER_HOUR' },
  { label: '/ngày', value: 'PER_DAY' },
  { label: '/tháng', value: 'PER_MONTH' },
];

const EMPLOYMENT_TYPES = [
  { label: 'Công việc một lần', value: 'ONE_TIME' },
  { label: 'Bán thời gian', value: 'PART_TIME' },
  { label: 'Toàn thời gian', value: 'FULL_TIME' },
  { label: 'Theo hợp đồng', value: 'CONTRACT' },
  { label: 'Freelance', value: 'FREELANCE' },
  { label: 'Theo ca', value: 'SHIFT' },
  { label: 'Thực tập', value: 'INTERNSHIP' },
  { label: 'Theo thỏa thuận', value: 'NEGOTIABLE' },
];

const EXPERIENCE_LEVELS = [
  { label: 'Không yêu cầu kinh nghiệm', value: 'NO_REQUIREMENT' },
  { label: 'Chưa có kinh nghiệm', value: 'NO_EXPERIENCE' },
  { label: 'Dưới 1 năm', value: 'UNDER_1_YEAR' },
  { label: '1–2 năm', value: 'ONE_TO_TWO_YEARS' },
  { label: '3–5 năm', value: 'THREE_TO_FIVE_YEARS' },
  { label: 'Trên 5 năm', value: 'OVER_FIVE_YEARS' },
];

const EDUCATION_LEVELS = [
  { label: 'Không yêu cầu bằng cấp', value: 'NO_REQUIREMENT' },
  { label: 'Trung học cơ sở', value: 'SECONDARY_SCHOOL' },
  { label: 'Trung học phổ thông', value: 'HIGH_SCHOOL' },
  { label: 'Trung cấp nghề', value: 'VOCATIONAL' },
  { label: 'Cao đẳng', value: 'COLLEGE' },
  { label: 'Đại học', value: 'UNIVERSITY' },
  { label: 'Sau đại học', value: 'POSTGRADUATE' },
  { label: 'Chứng chỉ chuyên môn', value: 'CERTIFICATE' },
];

const GENDER_REQUIREMENTS = [
  { label: 'Không yêu cầu giới tính', value: 'NO_REQUIREMENT' },
  { label: 'Nam', value: 'MALE' },
  { label: 'Nữ', value: 'FEMALE' },
  { label: 'Khác', value: 'OTHER' },
];

const getRawPrice = (text: string): number => {
  const numericVal = text.replace(/[^0-9]/g, '');
  return parseInt(numericVal) || 0;
};

const PRICE_PRESETS = [
  { label: '50K–100K', min: 50000, max: 100000 },
  { label: '100K–200K', min: 100000, max: 200000 },
  { label: '150K–300K', min: 150000, max: 300000 },
  { label: '200K–400K', min: 200000, max: 400000 },
  { label: '300K–600K', min: 300000, max: 600000 },
  { label: '500K–1tr', min: 500000, max: 1000000 },
];

type SelectedImage = {
  uri: string;
  base64?: string;
};

export const PostJobScreen: React.FC = () => {
  const theme = useTheme();
  const { addTask, updateTask } = useApp();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const initialPostType = route.params?.initialPostType || 'RECRUITMENT';
  const editingTaskId = route.params?.taskId as string | undefined;
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

  const DEADLINE_PRESETS = [
    { label: '1 ngày', value: 1 },
    { label: '3 ngày', value: 3 },
    { label: '7 ngày', value: 7 },
    { label: '14 ngày', value: 14 },
    { label: '30 ngày', value: 30 },
    { label: 'Không giới hạn', value: null },
  ];

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

  // Sync initial post type from route params if active
  useEffect(() => {
    if (route.params?.initialPostType && !editingTaskId) {
      setPostType(route.params.initialPostType);
    }
  }, [editingTaskId, route.params?.initialPostType]);

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

  const selectedWorkModeLabel = WORK_MODES.find((m) => m.value === workMode)?.label || 'Chọn hình thức';
  const selectedExpLabel = EXPERIENCE_LEVELS.find((m) => m.value === experienceLevel)?.label || 'Không yêu cầu';
  const selectedEduLabel = EDUCATION_LEVELS.find((m) => m.value === educationLevel)?.label || 'Không yêu cầu';
  const selectedGenderLabel = GENDER_REQUIREMENTS.find((m) => m.value === genderRequirement)?.label || 'Không yêu cầu';
  const selectedEmpLabel = EMPLOYMENT_TYPES.find((m) => m.value === employmentType)?.label || 'Chọn loại';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background.secondary }]}>
      {/* HEADER */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.background.secondary,
            borderBottomColor: theme.colors.border.subtle,
            paddingHorizontal: theme.spacing.lg,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Đóng màn hình đăng bài"
          accessibilityHint="Quay lại trang trước đó"
        >
          <Ionicons name="close" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
          {isEditMode ? 'Chỉnh sửa bài' : 'Đăng bài mới'}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          {!isEditMode && (
            <TouchableOpacity
              onPress={handleDiscardDraft}
              accessibilityRole="button"
              accessibilityLabel="Hủy bản nháp"
              accessibilityHint="Xóa toàn bộ tiến trình và làm lại từ đầu"
              style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: theme.spacing.sm }}
            >
              <Text style={{ color: theme.colors.status.error, fontWeight: '700', fontSize: 13 }}>Hủy nháp</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: theme.colors.brand.primary },
              (loading || !isFormValid) && [styles.submitBtnDisabled, { backgroundColor: theme.colors.border.subtle }],
            ]}
            onPress={handleSubmit}
            disabled={loading || !isFormValid}
            accessibilityRole="button"
            accessibilityLabel={isEditMode ? 'Cập nhật bài viết' : 'Đăng bài viết mới'}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={[styles.submitBtnText, isFormValid && { color: '#FFFFFF' }]}>
                {isEditMode ? 'Cập nhật' : 'Đăng bài'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={[styles.container, { backgroundColor: theme.colors.background.primary }]}
          contentContainerStyle={[styles.scrollContent, { padding: theme.spacing.lg }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* POST TYPE SELECTOR */}
          <View
            style={[
              styles.postTypeContainer,
              {
                backgroundColor: theme.colors.background.secondary,
                borderColor: theme.colors.border.subtle,
                borderRadius: theme.radius.medium,
                padding: theme.spacing.xs,
                marginBottom: theme.spacing.lg,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.postTypeTab,
                postType === 'RECRUITMENT' && [styles.postTypeTabActive, { backgroundColor: theme.colors.brand.primary }],
              ]}
              onPress={() => handlePostTypeChange('RECRUITMENT')}
              accessibilityState={{ selected: postType === 'RECRUITMENT' }}
              accessibilityRole="button"
              accessibilityLabel="Đăng tuyển dụng tìm người"
            >
              <Text
                style={[
                  styles.postTypeTabText,
                  { color: theme.colors.text.secondary },
                  postType === 'RECRUITMENT' && styles.postTypeTabTextActive,
                ]}
              >
                Đăng tuyển dụng
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.postTypeTab,
                postType === 'SERVICE_OFFER' && [styles.postTypeTabActive, { backgroundColor: theme.colors.brand.primary }],
              ]}
              onPress={() => handlePostTypeChange('SERVICE_OFFER')}
              accessibilityState={{ selected: postType === 'SERVICE_OFFER' }}
              accessibilityRole="button"
              accessibilityLabel="Đăng bài dịch vụ thuê tôi"
            >
              <Text
                style={[
                  styles.postTypeTabText,
                  { color: theme.colors.text.secondary },
                  postType === 'SERVICE_OFFER' && styles.postTypeTabTextActive,
                ]}
              >
                Đăng bài Thuê tôi
              </Text>
            </TouchableOpacity>
          </View>

          {/* GRID: LĨNH VỰC & ĐỊA ĐIỂM */}
          <View style={[styles.rowGrid, { marginBottom: theme.spacing.lg, gap: theme.spacing.md }]}>
            <TouchableOpacity
              style={styles.gridColumn}
              onPress={() => setCategoryModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Chọn công việc cụ thể"
            >
              <Text style={[styles.gridLabel, { color: theme.colors.text.primary }]}>Công việc *</Text>
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
                  {subcategoryName || 'Chọn công việc'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={theme.colors.text.secondary} />
              </View>
            </TouchableOpacity>

            <View style={styles.gridColumn}>
              <Text style={[styles.gridLabel, { color: theme.colors.text.primary }]}>
                Địa điểm {workMode === 'ONSITE' ? '*' : ''}
              </Text>
              <TextInput
                style={[
                  styles.gridInputBox,
                  {
                    backgroundColor: theme.colors.background.secondary,
                    borderColor: validationErrors.address ? theme.colors.status.error : theme.colors.border.subtle,
                    borderRadius: theme.radius.small,
                    color: theme.colors.text.primary,
                    paddingHorizontal: theme.spacing.md,
                  },
                  workMode === 'REMOTE' && styles.disabledSelectorBox,
                ]}
                placeholder={workMode === 'REMOTE' ? 'Làm từ xa (Remote)' : 'Nhập địa điểm'}
                placeholderTextColor={theme.colors.text.muted}
                value={address}
                onChangeText={setAddress}
                editable={workMode !== 'REMOTE'}
                accessibilityLabel="Ô nhập địa điểm làm việc"
              />
              {validationErrors.address ? (
                <Text style={styles.inlineErrorText}>{validationErrors.address}</Text>
              ) : null}
            </View>
          </View>

          {/* IMAGE PICKER */}
          <View style={[styles.section, { marginBottom: theme.spacing.lg }]}>
            <Text style={[styles.sectionLabel, { color: theme.colors.text.primary, marginBottom: theme.spacing.xs }]}>
              Hình ảnh minh họa (Tối đa 5 ảnh)
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
              {selectedImages.map((img, index) => (
                <View key={index} style={[styles.imageContainer, { marginRight: theme.spacing.sm }]}>
                  <Image source={{ uri: img.uri }} style={[styles.imagePreview, { borderRadius: theme.radius.small }]} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                    accessibilityRole="button"
                    accessibilityLabel={`Xóa ảnh thứ ${index + 1}`}
                  >
                    <Ionicons name="close-circle" size={20} color={theme.colors.status.error} />
                  </TouchableOpacity>
                </View>
              ))}
              {selectedImages.length < 5 && (
                <TouchableOpacity
                  style={[
                    styles.uploadPlaceholder,
                    {
                      borderColor: theme.colors.border.subtle,
                      borderRadius: theme.radius.small,
                    },
                  ]}
                  onPress={pickImages}
                  accessibilityRole="button"
                  accessibilityLabel="Tải ảnh lên minh họa"
                >
                  <Ionicons name="camera-outline" size={28} color={theme.colors.text.secondary} />
                  <Text style={{ color: theme.colors.text.secondary, fontSize: 11, marginTop: 4 }}>Thêm ảnh</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          {/* TITLE */}
          <View style={[styles.section, { marginBottom: theme.spacing.lg }]}>
            <Text style={[styles.sectionLabel, { color: theme.colors.text.primary }]}>Tiêu đề bài viết *</Text>
            <TextInput
              style={[
                styles.inputBox,
                {
                  backgroundColor: theme.colors.background.secondary,
                  borderColor: validationErrors.title ? theme.colors.status.error : theme.colors.border.subtle,
                  borderRadius: theme.radius.small,
                  color: theme.colors.text.primary,
                  paddingHorizontal: theme.spacing.md,
                },
              ]}
              placeholder={
                postType === 'RECRUITMENT' ? 'Ví dụ: Cần thợ sửa ống nước gấp nước rò rỉ' : 'Ví dụ: Dịch vụ dọn nhà chuyên nghiệp'
              }
              placeholderTextColor={theme.colors.text.muted}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
              accessibilityLabel="Ô nhập tiêu đề bài viết"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={styles.inlineErrorText}>{validationErrors.title || ''}</Text>
              <Text style={[styles.counterText, { color: theme.colors.text.secondary }]}>{title.length}/100</Text>
            </View>
          </View>

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

          {/* DESCRIPTION */}
          <View style={[styles.section, { marginBottom: theme.spacing.lg }]}>
            <Text style={[styles.sectionLabel, { color: theme.colors.text.primary }]}>Mô tả chi tiết công việc *</Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: theme.colors.background.secondary,
                  borderColor: validationErrors.description ? theme.colors.status.error : theme.colors.border.subtle,
                  borderRadius: theme.radius.small,
                  color: theme.colors.text.primary,
                  paddingHorizontal: theme.spacing.md,
                  paddingTop: theme.spacing.md,
                },
              ]}
              placeholder={
                postType === 'RECRUITMENT'
                  ? 'Ví dụ: Cần sửa vòi sen toilet bị rò nước liên tục ở chung cư Gold View Quận 4, hoàn thành trong chiều nay...'
                  : 'Ví dụ: Nhận sửa chữa ống nước, điện gia dụng tận nơi. Có kinh nghiệm 5 năm...'
              }
              placeholderTextColor={theme.colors.text.muted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={6}
              accessibilityLabel="Mô tả công việc"
            />
            {validationErrors.description ? (
              <Text style={styles.inlineErrorText}>{validationErrors.description}</Text>
            ) : null}
          </View>

          {/* HASHTAGS */}
          <View style={[styles.section, { marginBottom: theme.spacing.lg }]}>
            <Text style={[styles.sectionLabel, { color: theme.colors.text.primary }]}>Hashtags</Text>
            <View style={[styles.hashtagInputRow, { gap: theme.spacing.xs, marginBottom: theme.spacing.sm }]}>
              <TextInput
                style={[
                  styles.hashtagInput,
                  {
                    backgroundColor: theme.colors.background.secondary,
                    borderColor: theme.colors.border.subtle,
                    borderRadius: theme.radius.small,
                    color: theme.colors.text.primary,
                    paddingHorizontal: theme.spacing.md,
                  },
                ]}
                placeholder="Thêm hashtag (nhấn Thêm)"
                placeholderTextColor={theme.colors.text.muted}
                value={hashtagInput}
                onChangeText={setHashtagInput}
                onSubmitEditing={addHashtag}
                accessibilityLabel="Nhập hashtag"
              />
              <TouchableOpacity
                style={[styles.hashtagAddBtn, { backgroundColor: theme.colors.brand.primary, borderRadius: theme.radius.small }]}
                onPress={addHashtag}
                accessibilityRole="button"
                accessibilityLabel="Thêm hashtag hiện tại"
              >
                <Text style={styles.hashtagAddText}>Thêm</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.hashtagChipsRow, { gap: theme.spacing.xs }]}>
              {hashtags.map((tag) => (
                <View
                  key={tag}
                  style={[
                    styles.hashtagChip,
                    {
                      backgroundColor: theme.colors.brand.primarySoft,
                      borderRadius: theme.radius.small,
                      paddingHorizontal: theme.spacing.sm,
                      paddingVertical: theme.spacing.xs,
                      gap: theme.spacing.xs,
                    },
                  ]}
                >
                  <Text style={[styles.hashtagChipText, { color: theme.colors.brand.primaryDark }]}>#{tag}</Text>
                  <TouchableOpacity onPress={() => removeHashtag(tag)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Xóa hashtag ${tag}`}>
                    <Ionicons name="close-circle" size={14} color={theme.colors.text.secondary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
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

          {/* ERROR SUMMARY */}
          {!isFormValid && Object.keys(validationErrors).length > 0 && (
            <View
              style={[
                styles.errorSummaryCard,
                {
                  backgroundColor: theme.colors.status.error + '1A',
                  borderColor: theme.colors.status.error,
                  borderRadius: theme.radius.medium,
                  padding: theme.spacing.md,
                  marginBottom: theme.spacing.lg,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginBottom: theme.spacing.xs }}>
                <Ionicons name="warning" size={18} color={theme.colors.status.error} />
                <Text style={{ color: theme.colors.status.error, fontWeight: '800', fontSize: 13 }}>
                  Vui lòng sửa các lỗi sau trước khi đăng bài:
                </Text>
              </View>
              {Object.entries(validationErrors).map(([key, value]) => (
                <Text key={key} style={{ color: theme.colors.status.error, fontSize: 12, marginLeft: 22, marginTop: 2 }}>
                  • {value}
                </Text>
              ))}
            </View>
          )}
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
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  submitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
    minHeight: 36,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.6)',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  postTypeContainer: {
    flexDirection: 'row',
    borderWidth: 1,
  },
  postTypeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  postTypeTabActive: {},
  postTypeTabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  postTypeTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
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
  disabledSelectorBox: {
    opacity: 0.5,
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
  imageScroll: {
    flexDirection: 'row',
  },
  imageContainer: {
    position: 'relative',
    width: 80,
    height: 80,
  },
  imagePreview: {
    width: 80,
    height: 80,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    zIndex: 10,
  },
  uploadPlaceholder: {
    width: 80,
    height: 80,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputBox: {
    height: 48,
    borderWidth: 1.5,
    fontSize: 14,
    fontWeight: '600',
  },
  counterText: {
    fontSize: 11,
    alignSelf: 'flex-end',
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
  chipActive: {},
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {},
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
  textArea: {
    height: 120,
    borderWidth: 1.5,
    fontSize: 14,
    fontWeight: '600',
    textAlignVertical: 'top',
  },
  hashtagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hashtagInput: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    fontSize: 13,
    fontWeight: '600',
  },
  hashtagAddBtn: {
    width: 68,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hashtagAddText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  hashtagChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  hashtagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  hashtagChipText: {
    fontSize: 12,
    fontWeight: '600',
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
  priceHint: {
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 17,
  },
  priceErrorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 6,
  },
  errorSummaryCard: {
    borderWidth: 1.5,
  },
});
