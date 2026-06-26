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

import { CategoryPickerModal } from '../../components/categories/CategoryPickerModal';
import { OptionSelectionModal } from '../../components/common/OptionSelectionModal';
import { RangeSelectionModal } from '../../components/common/RangeSelectionModal';
import { DatePickerModal } from '../../components/common/DatePickerModal';

import { taskService } from '../../services/taskService';
import { categoryService } from '../../services/categoryService';
import { JobField } from '../../constants/jobCategories';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { AppColors } from '../../theme';
import { Task } from '../../types';

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

  // Deadline presets: 1, 3, 7, 14, 30 days or Unlimited (null)
  const [selectedDeadlinePreset, setSelectedDeadlinePreset] = useState<number | null>(null);

  const DEADLINE_PRESETS = [
    { label: '1 ngày', value: 1 },
    { label: '3 ngày', value: 3 },
    { label: '7 ngày', value: 7 },
    { label: '14 ngày', value: 14 },
    { label: '30 ngày', value: 30 },
    { label: 'Không giới hạn', value: null },
  ];

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
        setSalaryUnit((taskData.salaryUnit || 'PER_JOB') as 'PER_JOB' | 'PER_HOUR' | 'PER_DAY' | 'PER_MONTH');
        setWorkMode((taskData.workMode || 'ONSITE') as 'ONSITE' | 'REMOTE' | 'NEGOTIABLE');
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
        Alert.alert('Không tải được bài viết', 'Vui lòng thử lại sau ít phút.');
        navigation.goBack();
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadTaskForEdit();

    return () => {
      active = false;
    };
  }, [editingTaskId, navigation, user?.phone]);

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

  // Form Validation
  const isFormValid = useMemo(() => {
    if (!title.trim() || title.length < 5) return false;
    if (!description.trim() || description.length < 10) return false;
    if (!fieldId || !subcategoryId) return false;
    const rawMin = getRawPrice(budgetMinInput);
    const rawMax = getRawPrice(budgetMaxInput);
    if (rawMin <= 0 || rawMax <= 0) return false;
    if (rawMin > rawMax) return false;
    if (workMode === 'ONSITE' && !address.trim()) return false;
    if (!contactPhone.trim()) return false;
    if (postType === 'RECRUITMENT') {
      if (peopleNeeded < 1) return false;
      if (!startDate) return false;
    }
    return true;
  }, [title, description, fieldId, subcategoryId, budgetMinInput, budgetMaxInput, workMode, address, postType, peopleNeeded, contactPhone, startDate]);

  // Toggle Post Type
  const handlePostTypeChange = (type: 'RECRUITMENT' | 'SERVICE_OFFER') => {
    if (type === postType) return;
    setPostType(type);
  };

  // Stepper Handlers
  const increasePeople = () => setPeopleNeeded(prev => prev + 1);
  const decreasePeople = () => setPeopleNeeded(prev => Math.max(1, prev - 1));

  // Pick Images
  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Chúng tôi cần quyền truy cập thư viện ảnh của bạn để chọn ảnh!');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 1.0, // Lấy ảnh chất lượng gốc để tự xử lý qua ImageManipulator tốt hơn
        selectionLimit: 5 - selectedImages.length,
      });

      if (!result.canceled) {
        setLoading(true);
        try {
          const compressedImages = await Promise.all(
            result.assets.map(async (asset) => {
              const actions: ImageManipulator.Action[] = [];
              // Giới hạn kích thước tối đa 1024px, giữ nguyên tỷ lệ aspect ratio
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
                  compress: 0.8, // Nén chất lượng về 80%
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

          setSelectedImages(prev => [...prev, ...compressedImages].slice(0, 5));
        } catch (manipulateError) {
          console.error('Lỗi khi nén ảnh với ImageManipulator:', manipulateError);
          Alert.alert('Lỗi', 'Có lỗi xảy ra trong quá trình tối ưu hóa hình ảnh.');
        } finally {
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Lỗi khi chọn ảnh:', err);
      Alert.alert('Lỗi', 'Không thể chọn ảnh, vui lòng thử lại');
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Hashtags Handlers
  const addHashtag = () => {
    const cleaned = hashtagInput.replace(/^#+/, '').trim().toLowerCase();
    if (cleaned && !hashtags.includes(cleaned)) {
      setHashtags(prev => [...prev, cleaned]);
      setHashtagInput('');
    }
  };

  const removeHashtag = (tag: string) => {
    setHashtags(prev => prev.filter(t => t !== tag));
  };

  // Submit Handler
  const handleSubmit = async () => {
    // 1. Title checks
    if (!title.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tiêu đề bài viết.');
      return;
    }
    if (title.trim().length < 5) {
      Alert.alert('Thông tin không hợp lệ', 'Tiêu đề bài viết phải có ít nhất 5 ký tự.');
      return;
    }

    // 2. Category checks
    if (!fieldId || !subcategoryId) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn lĩnh vực công việc cụ thể.');
      return;
    }

    // 3. Description checks
    if (!description.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập mô tả công việc.');
      return;
    }
    if (description.trim().length < 10) {
      Alert.alert('Thông tin không hợp lệ', 'Mô tả công việc phải có ít nhất 10 ký tự.');
      return;
    }

    // 4. Price/Budget checks
    const rawBudgetMin = getRawPrice(budgetMinInput);
    const rawBudgetMax = getRawPrice(budgetMaxInput);
    if (rawBudgetMin <= 0 || rawBudgetMax <= 0) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập khoảng giá tối thiểu và tối đa.');
      return;
    }
    if (rawBudgetMin > rawBudgetMax) {
      Alert.alert('Thông tin không hợp lệ', 'Giá tối thiểu không được lớn hơn giá tối đa.');
      return;
    }

    // 5. Address check for ONSITE
    if (workMode === 'ONSITE' && !address.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập địa chỉ cụ thể cho hình thức làm việc tại chỗ.');
      return;
    }

    // 6. Contact Phone check
    if (!contactPhone.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập số điện thoại liên hệ.');
      return;
    }

    // 7. Recruitment specific checks
    if (postType === 'RECRUITMENT') {
      if (peopleNeeded < 1) {
        Alert.alert('Thông tin không hợp lệ', 'Số lượng người tuyển cần ít nhất là 1 người.');
        return;
      }
      if (!startDate) {
        Alert.alert('Thiếu thông tin', 'Vui lòng chọn ngày bắt đầu công việc.');
        return;
      }
    }

    setLoading(true);

    try {
      const existingImageUrls = selectedImages
        .filter((img) => !img.base64)
        .map((img) => img.uri);
      let uploadedImageUrls: string[] = [];
      const base64s = selectedImages.map(img => img.base64).filter((b): b is string => !!b);
      if (base64s.length > 0) {
        uploadedImageUrls = await taskService.uploadTaskImages(base64s);
      }
      const imageUrls = [...existingImageUrls, ...uploadedImageUrls];

      const budgetMin = getRawPrice(budgetMinInput);
      const budgetMax = getRawPrice(budgetMaxInput);

      let applicationDeadline: string | null = isEditMode ? (editingTask?.applicationDeadline || null) : null;
      if (postType === 'RECRUITMENT' && selectedDeadlinePreset !== null) {
        applicationDeadline = new Date(Date.now() + selectedDeadlinePreset * 86400000).toISOString();
      }

      const payload = {
        title,
        description,
        category_id: fieldId!,
        task_type: 'ONLINE', // fallback config
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
        
        location: workMode !== 'REMOTE' && address.trim() 
          ? {
              location_type: 'TASK_LOCATION',
              address: address.trim(),
              latitude: 10.7769,
              longitude: 106.7009,
              }
          : undefined,
      };

      const savedTask = isEditMode && editingTaskId
        ? await taskService.updateTask(editingTaskId, payload)
        : await taskService.createTask(payload);

      if (isEditMode) {
        updateTask(savedTask.id, savedTask);
        navigation.setParams({ taskId: undefined });
      } else {
        addTask(savedTask);
      }

      Alert.alert('Thành công', isEditMode ? 'Bài đăng đã được cập nhật thành công!' : 'Bài đăng của bạn đã được đăng thành công!', [
        {
          text: 'Xem chi tiết',
          onPress: () => {
            navigation.navigate('JobDetail', { taskId: savedTask.id });
          }
        },
        {
          text: 'Trang chủ',
          onPress: () => {
            navigation.navigate('Home');
          }
        }
      ]);

      if (!isEditMode) {
        // Reset form states after creating a new post only.
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
      }
    } catch (err: any) {
      console.error('Submit task error:', err);
      const msg = err.response?.data?.message || err.message || 'Có lỗi xảy ra khi lưu bài.';
      Alert.alert(isEditMode ? 'Lỗi cập nhật bài' : 'Lỗi đăng bài', msg);
    } finally {
      setLoading(false);
    }
  };

  const selectedWorkModeLabel = WORK_MODES.find(m => m.value === workMode)?.label || 'Chọn hình thức';
  const selectedExpLabel = EXPERIENCE_LEVELS.find(m => m.value === experienceLevel)?.label || 'Không yêu cầu';
  const selectedEduLabel = EDUCATION_LEVELS.find(m => m.value === educationLevel)?.label || 'Không yêu cầu';
  const selectedGenderLabel = GENDER_REQUIREMENTS.find(m => m.value === genderRequirement)?.label || 'Không yêu cầu';
  const selectedEmpLabel = EMPLOYMENT_TYPES.find(m => m.value === employmentType)?.label || 'Chọn loại công việc';

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Đóng màn hình đăng bài"
        >
          <Ionicons name="close" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditMode ? 'Chỉnh sửa bài' : 'Đăng bài mới'}</Text>
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>{isEditMode ? 'Cập nhật' : 'Đăng bài'}</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* POST TYPE SELECTOR */}
          <View style={styles.postTypeContainer}>
            <TouchableOpacity
              style={[styles.postTypeTab, postType === 'RECRUITMENT' && styles.postTypeTabActive]}
              onPress={() => handlePostTypeChange('RECRUITMENT')}
              accessibilityState={{ selected: postType === 'RECRUITMENT' }}
            >
              <Text style={[styles.postTypeTabText, postType === 'RECRUITMENT' && styles.postTypeTabTextActive]}>
                Đăng tuyển dụng
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.postTypeTab, postType === 'SERVICE_OFFER' && styles.postTypeTabActive]}
              onPress={() => handlePostTypeChange('SERVICE_OFFER')}
              accessibilityState={{ selected: postType === 'SERVICE_OFFER' }}
            >
              <Text style={[styles.postTypeTabText, postType === 'SERVICE_OFFER' && styles.postTypeTabTextActive]}>
                Đăng bài Thuê tôi
              </Text>
            </TouchableOpacity>
          </View>

          {/* GRID: LĨNH VỰC & ĐỊA ĐIỂM */}
          <View style={styles.rowGrid}>
            <TouchableOpacity
              style={styles.gridColumn}
              onPress={() => setCategoryModalVisible(true)}
            >
              <Text style={styles.gridLabel}>Công việc *</Text>
              <View style={styles.gridSelectorBox}>
                <Text style={styles.gridSelectorText} numberOfLines={1}>
                  {subcategoryName || 'Chọn công việc'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#64748B" />
              </View>
            </TouchableOpacity>

            <View style={styles.gridColumn}>
              <Text style={styles.gridLabel}>Địa điểm {workMode === 'ONSITE' ? '*' : ''}</Text>
              <TextInput
                style={styles.gridInputBox}
                placeholder={workMode === 'REMOTE' ? 'Làm từ xa' : 'Nhập địa điểm'}
                placeholderTextColor="#94A3B8"
                value={address}
                onChangeText={setAddress}
                editable={workMode !== 'REMOTE'}
              />
            </View>
          </View>

          {/* IMAGE PICKER */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Hình ảnh minh họa (Tối đa 5 ảnh)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
              {selectedImages.map((img, index) => (
                <View key={index} style={styles.imageContainer}>
                  <Image source={{ uri: img.uri }} style={styles.imagePreview} />
                  <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(index)}>
                    <Ionicons name="close-circle" size={20} color={AppColors.status.error} />
                  </TouchableOpacity>
                </View>
              ))}
              {selectedImages.length < 5 && (
                <TouchableOpacity style={styles.uploadPlaceholder} onPress={pickImages}>
                  <Ionicons name="camera-outline" size={28} color="#64748B" />
                  <Text style={styles.uploadPlaceholderText}>Thêm ảnh</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          {/* TITLE */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Tiêu đề bài viết *</Text>
            <TextInput
              style={styles.inputBox}
              placeholder={postType === 'RECRUITMENT' ? 'Nhập tiêu đề tuyển dụng' : 'Nhập tên dịch vụ bạn cung cấp'}
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
            <Text style={styles.counterText}>{title.length}/100</Text>
          </View>

          {/* PRICE RANGE */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Khoảng giá (VND) *</Text>
            <Text style={styles.priceHint}>
              Người ứng tuyển sẽ đề xuất mức giá họ muốn trong khoảng này
            </Text>

            {/* Preset chips */}
            <View style={styles.chipsRow}>
              {PRICE_PRESETS.map((preset, idx) => {
                const isActive = activePricePreset === idx;
                return (
                  <TouchableOpacity
                    key={preset.label}
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() => {
                      setActivePricePreset(idx);
                      setBudgetMinInput(String(preset.min));
                      setBudgetMaxInput(String(preset.max));
                    }}
                  >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Min / Max manual inputs */}
            <View style={styles.priceRangeRow}>
              <View style={styles.priceInputCol}>
                <Text style={styles.priceRangeLabel}>Tối thiểu</Text>
                <View style={styles.priceInputWrapper}>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    value={budgetMinInput ? parseInt(budgetMinInput).toLocaleString('vi-VN') : ''}
                    onChangeText={(txt) => {
                      const digits = txt.replace(/[^0-9]/g, '');
                      setBudgetMinInput(digits);
                      setActivePricePreset(null);
                    }}
                    keyboardType="numeric"
                  />
                  <Text style={styles.priceCurrency}>đ</Text>
                </View>
              </View>

              <Text style={styles.priceRangeDash}>–</Text>

              <View style={styles.priceInputCol}>
                <Text style={styles.priceRangeLabel}>Tối đa</Text>
                <View style={[
                  styles.priceInputWrapper,
                  budgetMinInput && budgetMaxInput && getRawPrice(budgetMinInput) > getRawPrice(budgetMaxInput)
                    ? styles.priceInputError : null,
                ]}>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    value={budgetMaxInput ? parseInt(budgetMaxInput).toLocaleString('vi-VN') : ''}
                    onChangeText={(txt) => {
                      const digits = txt.replace(/[^0-9]/g, '');
                      setBudgetMaxInput(digits);
                      setActivePricePreset(null);
                    }}
                    keyboardType="numeric"
                  />
                  <Text style={styles.priceCurrency}>đ</Text>
                </View>
              </View>
            </View>

            {budgetMinInput && budgetMaxInput && getRawPrice(budgetMinInput) > getRawPrice(budgetMaxInput) && (
              <Text style={styles.priceErrorText}>Giá tối thiểu không được lớn hơn giá tối đa</Text>
            )}
          </View>

          {/* CHIPS: SALARY UNIT */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Đơn vị giá *</Text>
            <View style={styles.chipsRow}>
              {SALARY_UNITS.map(unit => {
                const isSelected = salaryUnit === unit.value;
                return (
                  <TouchableOpacity
                    key={unit.value}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => setSalaryUnit(unit.value as any)}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {unit.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* CONDITIONAL: PEOPLE NEEDED & CONTACT (RECRUITMENT ONLY) */}
          {postType === 'RECRUITMENT' && (
            <View style={styles.rowGrid}>
              <View style={styles.gridColumn}>
                <Text style={styles.gridLabel}>Số người tuyển *</Text>
                <View style={styles.stepperContainer}>
                  <TouchableOpacity style={styles.stepperBtnItem} onPress={decreasePeople}>
                    <Ionicons name="remove" size={16} color="#0F172A" />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{peopleNeeded}</Text>
                  <TouchableOpacity style={styles.stepperBtnItem} onPress={increasePeople}>
                    <Ionicons name="add" size={16} color="#0F172A" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.gridColumn}>
                <Text style={styles.gridLabel}>Số điện thoại liên hệ *</Text>
                <TextInput
                  style={styles.gridInputBox}
                  placeholder="09xx..."
                  placeholderTextColor="#94A3B8"
                  value={contactPhone}
                  onChangeText={setContactPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          )}

          {/* DEADLINE PRESETS (RECRUITMENT ONLY) */}
          {postType === 'RECRUITMENT' && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Thời hạn nhận ứng tuyển *</Text>
              <View style={styles.chipsRow}>
                {DEADLINE_PRESETS.map(preset => {
                  const isSelected = selectedDeadlinePreset === preset.value;
                  return (
                    <TouchableOpacity
                      key={String(preset.value)}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => setSelectedDeadlinePreset(preset.value)}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* LOẠI CÔNG VIỆC & NGÀY BẮT ĐẦU HOẶC SỐ ĐIỆN THOẠI */}
          <View style={styles.rowGrid}>
            <TouchableOpacity
              style={styles.gridColumn}
              onPress={() => setEmploymentModalVisible(true)}
            >
              <Text style={styles.gridLabel}>Loại công việc *</Text>
              <View style={styles.gridSelectorBox}>
                <Text style={styles.gridSelectorText} numberOfLines={1}>
                  {selectedEmpLabel}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#64748B" />
              </View>
            </TouchableOpacity>

            {postType === 'RECRUITMENT' ? (
              <TouchableOpacity
                style={styles.gridColumn}
                onPress={() => setDatePickerVisible(true)}
              >
                <Text style={styles.gridLabel}>Ngày bắt đầu *</Text>
                <View style={styles.gridSelectorBox}>
                  <Text style={styles.gridSelectorText} numberOfLines={1}>
                    {`${String(startDate.getDate()).padStart(2, '0')}/${String(startDate.getMonth() + 1).padStart(2, '0')}/${startDate.getFullYear()}`}
                  </Text>
                  <Ionicons name="calendar-outline" size={16} color="#64748B" />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.gridColumn}>
                <Text style={styles.gridLabel}>Số điện thoại liên hệ *</Text>
                <TextInput
                  style={styles.gridInputBox}
                  placeholder="09xx..."
                  placeholderTextColor="#94A3B8"
                  value={contactPhone}
                  onChangeText={setContactPhone}
                  keyboardType="phone-pad"
                />
              </View>
            )}
          </View>

          {/* DESCRIPTION */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Mô tả chi tiết công việc *</Text>
            <TextInput
              style={styles.textArea}
              placeholder={
                postType === 'RECRUITMENT'
                  ? 'Nhập mô tả công việc thật chi tiết để tăng hiệu quả tuyển dụng.\nLưu ý: Không nhập thông tin liên hệ ở đây.'
                  : 'Giới thiệu chi tiết dịch vụ, sản phẩm bàn giao, thời gian thực hiện và những gì khách hàng sẽ nhận được.'
              }
              placeholderTextColor="#94A3B8"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={6}
            />
          </View>

          {/* HASHTAGS */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Hashtags</Text>
            <View style={styles.hashtagInputRow}>
              <TextInput
                style={styles.hashtagInput}
                placeholder="Thêm hashtag mới (nhấn Thêm)"
                placeholderTextColor="#94A3B8"
                value={hashtagInput}
                onChangeText={setHashtagInput}
                onSubmitEditing={addHashtag}
              />
              <TouchableOpacity style={styles.hashtagAddBtn} onPress={addHashtag}>
                <Text style={styles.hashtagAddText}>Thêm</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.hashtagChipsRow}>
              {hashtags.map(tag => (
                <View key={tag} style={styles.hashtagChip}>
                  <Text style={styles.hashtagChipText}>#{tag}</Text>
                  <TouchableOpacity onPress={() => removeHashtag(tag)} hitSlop={6}>
                    <Ionicons name="close-circle" size={14} color="#64748B" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* REQUIREMENT TABS (HORIZONTAL SCROLL) */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Yêu cầu ứng viên / Thông tin năng lực</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.reqTabsScroll}
            >
              {/* Work Mode */}
              <TouchableOpacity
                style={[styles.reqTab, workMode !== 'ONSITE' && styles.reqTabActive]}
                onPress={() => setWorkModeModalVisible(true)}
              >
                <Text style={[styles.reqTabText, workMode !== 'ONSITE' && styles.reqTabTextActive]}>
                  {workMode === 'REMOTE' ? 'Làm từ xa' : workMode === 'NEGOTIABLE' ? 'Làm linh hoạt' : 'Hình thức làm việc'}
                </Text>
                <Ionicons name="chevron-down" size={14} color={workMode !== 'ONSITE' ? "#FF6B35" : "#64748B"} />
              </TouchableOpacity>

              {/* Experience */}
              <TouchableOpacity
                style={[styles.reqTab, experienceLevel !== 'NO_REQUIREMENT' && styles.reqTabActive]}
                onPress={() => setExperienceModalVisible(true)}
              >
                <Text style={[styles.reqTabText, experienceLevel !== 'NO_REQUIREMENT' && styles.reqTabTextActive]}>
                  {experienceLevel !== 'NO_REQUIREMENT' ? selectedExpLabel : 'Kinh nghiệm'}
                </Text>
                <Ionicons name="chevron-down" size={14} color={experienceLevel !== 'NO_REQUIREMENT' ? "#FF6B35" : "#64748B"} />
              </TouchableOpacity>

              {/* Education */}
              <TouchableOpacity
                style={[styles.reqTab, educationLevel !== 'NO_REQUIREMENT' && styles.reqTabActive]}
                onPress={() => setEducationModalVisible(true)}
              >
                <Text style={[styles.reqTabText, educationLevel !== 'NO_REQUIREMENT' && styles.reqTabTextActive]}>
                  {educationLevel !== 'NO_REQUIREMENT' ? selectedEduLabel : 'Bằng cấp'}
                </Text>
                <Ionicons name="chevron-down" size={14} color={educationLevel !== 'NO_REQUIREMENT' ? "#FF6B35" : "#64748B"} />
              </TouchableOpacity>

              {/* Recruitment-Only Requirements */}
              {postType === 'RECRUITMENT' && (
                <>
                  {/* Height */}
                  <TouchableOpacity
                    style={[styles.reqTab, (minHeightCm !== null || maxHeightCm !== null) && styles.reqTabActive]}
                    onPress={() => setHeightModalVisible(true)}
                  >
                    <Text style={[styles.reqTabText, (minHeightCm !== null || maxHeightCm !== null) && styles.reqTabTextActive]}>
                      {minHeightCm !== null || maxHeightCm !== null 
                        ? `Cao: ${minHeightCm || 100} - ${maxHeightCm || 220}cm` 
                        : 'Chiều cao'}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={(minHeightCm !== null || maxHeightCm !== null) ? "#FF6B35" : "#64748B"} />
                  </TouchableOpacity>

                  {/* Gender */}
                  <TouchableOpacity
                    style={[styles.reqTab, genderRequirement !== 'NO_REQUIREMENT' && styles.reqTabActive]}
                    onPress={() => setGenderModalVisible(true)}
                  >
                    <Text style={[styles.reqTabText, genderRequirement !== 'NO_REQUIREMENT' && styles.reqTabTextActive]}>
                      {genderRequirement !== 'NO_REQUIREMENT' ? selectedGenderLabel : 'Giới tính'}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={genderRequirement !== 'NO_REQUIREMENT' ? "#FF6B35" : "#64748B"} />
                  </TouchableOpacity>

                  {/* Age */}
                  <TouchableOpacity
                    style={[styles.reqTab, (minAge !== null || maxAge !== null) && styles.reqTabActive]}
                    onPress={() => setAgeModalVisible(true)}
                  >
                    <Text style={[styles.reqTabText, (minAge !== null || maxAge !== null) && styles.reqTabTextActive]}>
                      {minAge !== null || maxAge !== null 
                        ? `Tuổi: ${minAge || 15} - ${maxAge || 60}` 
                        : 'Độ tuổi'}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={(minAge !== null || maxAge !== null) ? "#FF6B35" : "#64748B"} />
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* -------------------- MODALS & BOTTOM SHEETS -------------------- */}

      {/* Category picker */}
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

      {/* Work Mode Modal */}
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

      {/* Employment Type Modal */}
      <OptionSelectionModal
        visible={employmentModalVisible}
        title="Loại công việc"
        options={EMPLOYMENT_TYPES}
        selectedValue={employmentType}
        onSelect={(val) => setEmploymentType(val as any)}
        onClose={() => setEmploymentModalVisible(false)}
      />

      {/* Experience Level Modal */}
      <OptionSelectionModal
        visible={experienceModalVisible}
        title="Kinh nghiệm yêu cầu"
        options={EXPERIENCE_LEVELS}
        selectedValue={experienceLevel}
        onSelect={(val) => setExperienceLevel(val)}
        onClose={() => setExperienceModalVisible(false)}
      />

      {/* Education Level Modal */}
      <OptionSelectionModal
        visible={educationModalVisible}
        title="Bằng cấp yêu cầu"
        options={EDUCATION_LEVELS}
        selectedValue={educationLevel}
        onSelect={(val) => setEducationLevel(val)}
        onClose={() => setEducationModalVisible(false)}
      />

      {/* Gender Requirement Modal */}
      <OptionSelectionModal
        visible={genderModalVisible}
        title="Giới tính yêu cầu"
        options={GENDER_REQUIREMENTS}
        selectedValue={genderRequirement}
        onSelect={(val) => setGenderRequirement(val)}
        onClose={() => setGenderModalVisible(false)}
      />

      {/* Age Range Slider Modal */}
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

      {/* Height Range Slider Modal */}
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

      {/* Date Picker Modal */}
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
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
    color: '#0F172A',
  },
  submitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  submitBtnDisabled: {
    backgroundColor: '#F1F5F9',
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  postTypeContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  postTypeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  postTypeTabActive: {
    backgroundColor: '#FF6B35',
  },
  postTypeTabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  postTypeTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  rowGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  gridColumn: {
    flex: 1,
  },
  gridLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  gridSelectorBox: {
    flexDirection: 'row',
    height: 48,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  disabledSelectorBox: {
    opacity: 0.5,
    backgroundColor: '#F1F5F9',
  },
  gridSelectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
    marginRight: 4,
  },
  gridInputBox: {
    height: 48,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    color: '#0F172A',
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  imageScroll: {
    flexDirection: 'row',
    marginTop: 4,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    zIndex: 10,
  },
  uploadPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  uploadPlaceholderText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 4,
  },
  inputBox: {
    height: 48,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    color: '#0F172A',
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
  },
  counterText: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'right',
    marginTop: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#FFF1EB',
    borderColor: '#FF6B35',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#FF6B35',
    fontWeight: '700',
  },
  stepperContainer: {
    flexDirection: 'row',
    height: 48,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  stepperBtnItem: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#0F172A',
    textAlignVertical: 'top',
    minHeight: 120,
    lineHeight: 20,
  },
  hashtagInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  hashtagInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    color: '#0F172A',
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  hashtagAddBtn: {
    width: 68,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FF6B35',
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
    gap: 8,
  },
  hashtagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF1EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  hashtagChipText: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '600',
  },
  reqTabsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  reqTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 48,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
  },
  reqTabActive: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF1EB',
  },
  reqTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  reqTabTextActive: {
    color: '#FF6B35',
    fontWeight: '700',
  },
  priceHint: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 17,
  },
  priceRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  priceInputCol: {
    flex: 1,
  },
  priceRangeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
  },
  priceInputError: {
    borderColor: '#EF4444',
  },
  priceInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  priceCurrency: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    marginLeft: 4,
  },
  priceRangeDash: {
    fontSize: 20,
    fontWeight: '300',
    color: '#94A3B8',
    marginTop: 22,
  },
  priceErrorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 6,
  },
});
