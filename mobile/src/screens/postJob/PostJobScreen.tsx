import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { CategoryGrid } from '../../components/common/CategoryGrid';
import { taskService } from '../../services/taskService';
import { useApp } from '../../context/AppContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { AppColors } from '../../theme';

interface PostJobForm {
  title: string;
  description: string;
  categoryId: string;
  budgetMin: string;
  budgetMax: string;
  deadlineDays: string;
  taskType: 'ONLINE' | 'OFFLINE' | 'HYBRID';
  address: string;
}

const PRESET_PRICES = [50000, 100000, 200000, 500000, 1000000];

export const PostJobScreen: React.FC = () => {
  const { addTask } = useApp();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<PostJobForm>({
    title: '',
    description: '',
    categoryId: '',
    budgetMin: '',
    budgetMax: '',
    deadlineDays: '3',
    taskType: 'ONLINE',
    address: '',
  });

  const [selectedImages, setSelectedImages] = useState<{ uri: string; base64?: string }[]>([]);

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Chúng tôi cần quyền truy cập thư viện ảnh của bạn để chọn ảnh!');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions ? ImagePicker.MediaTypeOptions.Images : ['images'] as any,
        allowsMultipleSelection: true,
        quality: 0.6,
        base64: true,
        selectionLimit: 5 - selectedImages.length,
      });

      if (!result.canceled) {
        const newImages = result.assets.map(asset => ({
          uri: asset.uri,
          base64: asset.base64 || undefined,
        }));
        setSelectedImages(prev => [...prev, ...newImages].slice(0, 5));
      }
    } catch (err) {
      console.error('Lỗi khi chọn ảnh:', err);
      Alert.alert('Lỗi', 'Không thể chọn ảnh, vui lòng thử lại');
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const updateForm = (key: keyof PostJobForm, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handlePricePreset = (amount: number) => {
    setForm(prev => ({
      ...prev,
      budgetMin: amount.toString(),
      budgetMax: (amount * 2).toString(),
    }));
  };

  const handleSubmit = async () => {
    if (!form.title || !form.description || !form.categoryId) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    setLoading(true);
    try {
      // 1. Upload images to Cloudinary if selected
      let imageUrls: string[] = [];
      if (selectedImages.length > 0) {
        const base64s = selectedImages
          .map(img => img.base64)
          .filter((b): b is string => !!b);
        
        if (base64s.length > 0) {
          imageUrls = await taskService.uploadTaskImages(base64s);
        }
      }

      const deadlineStart = new Date().toISOString();
      const deadlineEnd = new Date(
        Date.now() + parseInt(form.deadlineDays) * 86400000
      ).toISOString();

      const payload = {
        title: form.title,
        description: form.description,
        category_id: form.categoryId,
        task_type: form.taskType,
        budget_min: parseInt(form.budgetMin) || 50000,
        budget_max: parseInt(form.budgetMax) || 100000,
        deadline_start: deadlineStart,
        deadline_end: deadlineEnd,
        allow_insurance: false,
        location: form.address
          ? {
              location_type: 'TASK_LOCATION',
              address: form.address,
              latitude: 10.7769,
              longitude: 106.7009,
            }
          : undefined,
        images: imageUrls,
      };

      const newTask = await taskService.createTask(payload);
      addTask(newTask);
      Alert.alert('Thành công', 'Đăng việc thành công!');
      setSelectedImages([]); // Reset images
      setForm({
        title: '',
        description: '',
        categoryId: '',
        budgetMin: '',
        budgetMax: '',
        deadlineDays: '3',
        taskType: 'ONLINE',
        address: '',
      });
      setStep(1);
    } catch (error: any) {
      const serverError = error.response?.data;
      if (serverError && serverError.errors) {
        const errorMessages = serverError.errors.map((err: any) => `${err.message}`).join('\n');
        Alert.alert('Lỗi điền thông tin', errorMessages);
      } else {
        Alert.alert('Lỗi', error.message || 'Đăng việc thất bại');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Đăng việc mới</Text>
        <View style={styles.progressBarWrapper}>
          <View style={styles.progressStep}>
            <View style={[styles.stepCircle, step >= 1 && styles.stepCircleActive]}>
              {step > 1 ? (
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              ) : (
                <Text style={[styles.stepNumber, step >= 1 && styles.stepNumberActive]}>1</Text>
              )}
            </View>
            <Text style={[styles.stepText, step >= 1 && styles.stepTextActive]}>Thông tin</Text>
          </View>
          <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
          <View style={styles.progressStep}>
            <View style={[styles.stepCircle, step >= 2 && styles.stepCircleActive]}>
              {step > 2 ? (
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              ) : (
                <Text style={[styles.stepNumber, step >= 2 && styles.stepNumberActive]}>2</Text>
              )}
            </View>
            <Text style={[styles.stepText, step >= 2 && styles.stepTextActive]}>Ngân sách</Text>
          </View>
          <View style={[styles.progressLine, step >= 3 && styles.progressLineActive]} />
          <View style={styles.progressStep}>
            <View style={[styles.stepCircle, step >= 3 && styles.stepCircleActive]}>
              <Text style={[styles.stepNumber, step >= 3 && styles.stepNumberActive]}>3</Text>
            </View>
            <Text style={[styles.stepText, step >= 3 && styles.stepTextActive]}>Xác nhận</Text>
          </View>
        </View>
      </View>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <View>
          <Card style={styles.formCard} variant="glass">
            <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>

            <Input
              label="Tiêu đề công việc"
              placeholder="VD: Sửa máy lạnh tại nhà"
              value={form.title}
              onChangeText={v => updateForm('title', v)}
            />

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Danh mục công việc</Text>
              <CategoryGrid
                onSelect={(id) => updateForm('categoryId', id)}
                selectedId={form.categoryId}
                isDark={true}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Mô tả chi tiết</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Mô tả công việc chi tiết..."
                placeholderTextColor="#64748B"
                value={form.description}
                onChangeText={v => updateForm('description', v)}
                multiline
                numberOfLines={4}
                maxLength={1000}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Hình ảnh minh họa (Tối đa 5 ảnh)</Text>
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
                    <Ionicons name="camera-outline" size={28} color={AppColors.text.muted} />
                    <Text style={styles.uploadPlaceholderText}>Thêm ảnh</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          </Card>

          <Button
            title="Tiếp theo"
            onPress={() => {
              if (!form.title || !form.categoryId) {
                Alert.alert('Thiếu thông tin', 'Vui lòng nhập tiêu đề và chọn danh mục');
                return;
              }
              setStep(2);
            }}
            size="lg"
            style={styles.nextButton}
          />
        </View>
      )}

      {/* Step 2: Budget & Deadline */}
      {step === 2 && (
        <View>
          <Card style={styles.formCard} variant="glass">
            <Text style={styles.sectionTitle}>Ngân sách & Thời hạn</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Ngân sách gợi ý</Text>
              <View style={styles.presetRow}>
                {PRESET_PRICES.map(amount => (
                  <TouchableOpacity
                    key={amount}
                    style={[
                      styles.presetChip,
                      parseInt(form.budgetMin) === amount && styles.presetChipActive,
                    ]}
                    onPress={() => handlePricePreset(amount)}
                  >
                    <Text
                      style={[
                        styles.presetText,
                        parseInt(form.budgetMin) === amount && styles.presetTextActive,
                      ]}
                    >
                      {amount >= 1000000
                        ? `${amount / 1000000}M`
                        : `${amount / 1000}K`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.priceRow}>
              <Input
                label="Tối thiểu (VND)"
                placeholder="50,000"
                value={form.budgetMin}
                onChangeText={v => updateForm('budgetMin', v)}
                keyboardType="numeric"
                style={styles.halfInput}
              />
              <Input
                label="Tối đa (VND)"
                placeholder="100,000"
                value={form.budgetMax}
                onChangeText={v => updateForm('budgetMax', v)}
                keyboardType="numeric"
                style={styles.halfInput}
              />
            </View>

            <Input
              label="Thời hạn thực hiện (ngày)"
              placeholder="3"
              value={form.deadlineDays}
              onChangeText={v => updateForm('deadlineDays', v)}
              keyboardType="numeric"
            />

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Loại hình làm việc</Text>
              <View style={styles.typeRow}>
                {(['ONLINE', 'OFFLINE', 'HYBRID'] as const).map(type => {
                  const isSelected = form.taskType === type;
                  const isAvailable = type === 'ONLINE';
                  let iconName: any = 'map-marker-outline';
                  if (type === 'ONLINE') iconName = 'laptop';
                  if (type === 'HYBRID') iconName = 'transit-connection-variant';
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeChip,
                        isSelected && styles.typeChipActive,
                        !isAvailable && { backgroundColor: '#1E293B', borderColor: '#334155', opacity: 0.6 }
                      ]}
                      onPress={() => {
                        if (isAvailable) {
                          updateForm('taskType', type);
                        } else {
                          Alert.alert('Thông báo', 'Loại hình này sẽ được hỗ trợ trong phiên bản sau.');
                        }
                      }}
                      activeOpacity={isAvailable ? 0.7 : 1}
                    >
                      <MaterialCommunityIcons
                        name={iconName}
                        size={18}
                        color={isSelected ? '#FFFFFF' : '#94A3B8'}
                        style={{ marginBottom: 4 }}
                      />
                      <Text
                        style={[
                          styles.typeText,
                          isSelected && styles.typeTextActive,
                          !isAvailable && { color: '#64748B' }
                        ]}
                      >
                        {type === 'ONLINE' ? 'Online' : type === 'OFFLINE' ? 'Trực tiếp\n(Sắp có)' : 'Kết hợp\n(Sắp có)'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {form.taskType !== 'ONLINE' && (
              <Input
                label="Địa điểm làm việc"
                placeholder="Nhập địa chỉ làm việc chi tiết"
                value={form.address}
                onChangeText={v => updateForm('address', v)}
              />
            )}
          </Card>

          <View style={styles.buttonRow}>
            <Button
              title="Quay lại"
              onPress={() => setStep(1)}
              variant="outline"
              size="lg"
              style={styles.halfButton}
            />
            <Button
              title="Tiếp theo"
              onPress={() => {
                if (!form.budgetMin || !form.budgetMax) {
                  Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ ngân sách');
                  return;
                }
                setStep(3);
              }}
              size="lg"
              style={styles.halfButton}
            />
          </View>
        </View>
      )}

      {/* Step 3: Review & Submit */}
      {step === 3 && (
        <View>
          <Card style={styles.receiptCard} variant="glassStrong">
            <View style={styles.receiptHeader}>
              <Ionicons name="document-text" size={32} color={AppColors.brand.primary} />
              <Text style={styles.receiptTitle}>Xem lại thông tin</Text>
              <Text style={styles.receiptSubtitle}>Vui lòng kiểm tra lại trước khi đăng việc</Text>
            </View>

            <View style={styles.receiptDivider} />

            <View style={styles.receiptBody}>
              <View style={styles.receiptRow}>
                <Ionicons name="bookmark-outline" size={18} color={AppColors.text.muted} style={styles.receiptRowIcon} />
                <View style={styles.receiptContent}>
                  <Text style={styles.reviewLabel}>Tiêu đề</Text>
                  <Text style={styles.reviewValue}>{form.title}</Text>
                </View>
              </View>

              <View style={styles.receiptRow}>
                <Ionicons name="cash-outline" size={18} color={AppColors.text.muted} style={styles.receiptRowIcon} />
                <View style={styles.receiptContent}>
                  <Text style={styles.reviewLabel}>Ngân sách dự kiến</Text>
                  <Text style={styles.reviewValue}>
                    {(parseInt(form.budgetMin) || 0).toLocaleString('vi-VN')} - {(parseInt(form.budgetMax) || 0).toLocaleString('vi-VN')} VND
                  </Text>
                </View>
              </View>

              <View style={styles.receiptRow}>
                <Ionicons name="calendar-outline" size={18} color={AppColors.text.muted} style={styles.receiptRowIcon} />
                <View style={styles.receiptContent}>
                  <Text style={styles.reviewLabel}>Thời hạn thực hiện</Text>
                  <Text style={styles.reviewValue}>{form.deadlineDays} ngày</Text>
                </View>
              </View>

              <View style={styles.receiptRow}>
                <Ionicons name="earth-outline" size={18} color={AppColors.text.muted} style={styles.receiptRowIcon} />
                <View style={styles.receiptContent}>
                  <Text style={styles.reviewLabel}>Loại hình công việc</Text>
                  <Text style={styles.reviewValue}>
                    {form.taskType === 'ONLINE' ? 'Online' : form.taskType === 'OFFLINE' ? 'Trực tiếp' : 'Kết hợp'}
                  </Text>
                </View>
              </View>

              {form.address ? (
                <View style={styles.receiptRow}>
                  <Ionicons name="location-outline" size={18} color={AppColors.text.muted} style={styles.receiptRowIcon} />
                  <View style={styles.receiptContent}>
                    <Text style={styles.reviewLabel}>Địa chỉ làm việc</Text>
                    <Text style={styles.reviewValue}>{form.address}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          </Card>

          <View style={styles.buttonRow}>
            <Button
              title="Chỉnh sửa"
              onPress={() => setStep(2)}
              variant="outline"
              size="lg"
              style={styles.halfButton}
            />
            <Button
              title="Đăng việc"
              onPress={handleSubmit}
              loading={loading}
              size="lg"
              style={styles.halfButton}
            />
          </View>
        </View>
      )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background.primary,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    paddingTop: 24,
    paddingBottom: 24,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: AppColors.text.primary,
    marginBottom: 20,
  },
  progressBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  progressStep: {
    alignItems: 'center',
    width: 60,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColors.border.subtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepCircleActive: {
    backgroundColor: AppColors.brand.primary,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: AppColors.text.muted,
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepText: {
    fontSize: 11,
    fontWeight: '600',
    color: AppColors.text.disabled,
  },
  stepTextActive: {
    color: AppColors.text.primary,
  },
  progressLine: {
    flex: 1,
    height: 3,
    backgroundColor: AppColors.border.subtle,
    marginTop: -18,
    marginHorizontal: -10,
    zIndex: -1,
  },
  progressLineActive: {
    backgroundColor: AppColors.brand.primary,
  },
  formCard: {
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: AppColors.text.primary,
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: AppColors.text.primary,
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: AppColors.surface.glass,
    borderWidth: 1.5,
    borderColor: AppColors.border.subtle,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: AppColors.text.primary,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: AppColors.border.subtle,
  },
  presetChipActive: {
    backgroundColor: AppColors.brand.primarySoft,
    borderColor: AppColors.brand.primary,
  },
  presetText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.text.primary,
  },
  presetTextActive: {
    color: AppColors.brand.primary,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: AppColors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.surface.glass,
  },
  typeChipActive: {
    backgroundColor: AppColors.brand.primary,
    borderColor: AppColors.brand.primary,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.text.muted,
  },
  typeTextActive: {
    color: '#FFFFFF',
  },
  nextButton: {
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfButton: {
    flex: 1,
  },
  receiptCard: {
    backgroundColor: AppColors.surface.glassStrong,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: AppColors.border.subtle,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    padding: 20,
    marginBottom: 20,
  },
  receiptHeader: {
    alignItems: 'center',
    marginVertical: 12,
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: AppColors.text.primary,
    marginTop: 8,
  },
  receiptSubtitle: {
    fontSize: 12,
    color: AppColors.text.muted,
    marginTop: 2,
  },
  receiptDivider: {
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: AppColors.border.subtle,
    marginVertical: 16,
    borderRadius: 1,
  },
  receiptBody: {
    gap: 16,
  },
  receiptRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  receiptRowIcon: {
    marginTop: 2,
  },
  receiptContent: {
    flex: 1,
  },
  reviewLabel: {
    fontSize: 12,
    color: AppColors.text.muted,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  reviewValue: {
    fontSize: 15,
    color: AppColors.text.primary,
    fontWeight: '700',
  },
  imageScroll: {
    flexDirection: 'row',
    marginTop: 8,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: AppColors.background.elevated,
    borderRadius: 10,
    zIndex: 10,
  },
  uploadPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: AppColors.border.subtle,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.background.secondary,
  },
  uploadPlaceholderText: {
    fontSize: 10,
    color: AppColors.text.muted,
    fontWeight: '600',
    marginTop: 4,
  },
});
