import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TextInput, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { CategoryGrid } from '../../components/common/CategoryGrid';
import { taskService } from '../../services/taskService';
import { useApp } from '../../context/AppContext';

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
    taskType: 'OFFLINE',
    address: '',
  });

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
              location_type: form.taskType === 'ONLINE' ? 'ONLINE' : 'OFFLINE',
              address: form.address,
              lat: 10.7769,
              lng: 106.7009,
            }
          : undefined,
      };

      const newTask = await taskService.createTask(payload);
      addTask(newTask);
      Alert.alert('Thành công', 'Đăng việc thành công!');
      setForm({
        title: '',
        description: '',
        categoryId: '',
        budgetMin: '',
        budgetMax: '',
        deadlineDays: '3',
        taskType: 'OFFLINE',
        address: '',
      });
      setStep(1);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Đăng việc thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Đăng việc mới</Text>
        <Text style={styles.stepIndicator}>Bước {step}/3</Text>
      </View>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <View>
          <Card style={styles.formCard}>
            <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>

            <Input
              label="Tiêu đề công việc"
              placeholder="VD: Sửa máy lạnh tại nhà"
              value={form.title}
              onChangeText={v => updateForm('title', v)}
            />

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Danh mục</Text>
              <CategoryGrid
                onSelect={(id) => updateForm('categoryId', id)}
                selectedId={form.categoryId}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Mô tả chi tiết</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Mô tả công việc chi tiết..."
                placeholderTextColor={Colors.textLight}
                value={form.description}
                onChangeText={v => updateForm('description', v)}
                multiline
                numberOfLines={4}
                maxLength={1000}
              />
            </View>
          </Card>

          <Button
            title="Tiếp theo"
            onPress={() => setStep(2)}
            size="lg"
            style={styles.nextButton}
          />
        </View>
      )}

      {/* Step 2: Budget & Deadline */}
      {step === 2 && (
        <View>
          <Card style={styles.formCard}>
            <Text style={styles.sectionTitle}>Ngân sách & Thời hạn</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Ngân sách dự kiến</Text>
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
                label="Tối thiểu"
                placeholder="50,000"
                value={form.budgetMin}
                onChangeText={v => updateForm('budgetMin', v)}
                keyboardType="numeric"
                style={styles.halfInput}
              />
              <Input
                label="Tối đa"
                placeholder="100,000"
                value={form.budgetMax}
                onChangeText={v => updateForm('budgetMax', v)}
                keyboardType="numeric"
                style={styles.halfInput}
              />
            </View>

            <Input
              label="Thời hạn (ngày)"
              placeholder="3"
              value={form.deadlineDays}
              onChangeText={v => updateForm('deadlineDays', v)}
              keyboardType="numeric"
            />

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Loại hình</Text>
              <View style={styles.typeRow}>
                {(['ONLINE', 'OFFLINE', 'HYBRID'] as const).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeChip,
                      form.taskType === type && styles.typeChipActive,
                    ]}
                    onPress={() => updateForm('taskType', type)}
                  >
                    <Text
                      style={[
                        styles.typeText,
                        form.taskType === type && styles.typeTextActive,
                      ]}
                    >
                      {type === 'ONLINE' ? 'Online' : type === 'OFFLINE' ? 'Trực tiếp' : 'Kết hợp'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {form.taskType !== 'ONLINE' && (
              <Input
                label="Địa chỉ"
                placeholder="Nhập địa chỉ làm việc"
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
              onPress={() => setStep(3)}
              size="lg"
              style={styles.halfButton}
            />
          </View>
        </View>
      )}

      {/* Step 3: Review & Submit */}
      {step === 3 && (
        <View>
          <Card style={styles.formCard}>
            <Text style={styles.sectionTitle}>Xem lại thông tin</Text>

            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>Tiêu đề:</Text>
              <Text style={styles.reviewValue}>{form.title}</Text>
            </View>
            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>Ngân sách:</Text>
              <Text style={styles.reviewValue}>
                {parseInt(form.budgetMin).toLocaleString()} - {parseInt(form.budgetMax).toLocaleString()} VND
              </Text>
            </View>
            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>Thời hạn:</Text>
              <Text style={styles.reviewValue}>{form.deadlineDays} ngày</Text>
            </View>
            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>Loại hình:</Text>
              <Text style={styles.reviewValue}>
                {form.taskType === 'ONLINE' ? 'Online' : form.taskType === 'OFFLINE' ? 'Trực tiếp' : 'Kết hợp'}
              </Text>
            </View>
            {form.address ? (
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Địa chỉ:</Text>
                <Text style={styles.reviewValue}>{form.address}</Text>
              </View>
            ) : null}
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
  },
  stepIndicator: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  formCard: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: Colors.text,
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
    borderColor: Colors.border,
  },
  presetChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  presetText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  presetTextActive: {
    color: Colors.textWhite,
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
    gap: 8,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  typeChipActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  typeTextActive: {
    color: Colors.textWhite,
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
  reviewItem: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  reviewLabel: {
    width: 100,
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  reviewValue: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
  },
});
