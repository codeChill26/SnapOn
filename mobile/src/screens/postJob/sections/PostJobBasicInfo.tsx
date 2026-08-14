import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

interface PostJobBasicInfoProps {
  postType: 'RECRUITMENT' | 'SERVICE_OFFER';
  subcategoryName: string | undefined;
  workMode: 'ONSITE' | 'REMOTE' | 'NEGOTIABLE';
  selectedWorkModeLabel: string;
  address: string;
  setAddress: (addr: string) => void;
  title: string;
  setTitle: (title: string) => void;
  description: string;
  setDescription: (desc: string) => void;
  validationErrors: Record<string, string>;
  onPressCategory: () => void;
  onPressWorkMode: () => void;
}

export const PostJobBasicInfo: React.FC<PostJobBasicInfoProps> = ({
  postType,
  subcategoryName,
  workMode,
  selectedWorkModeLabel,
  address,
  setAddress,
  title,
  setTitle,
  description,
  setDescription,
  validationErrors,
  onPressCategory,
  onPressWorkMode,
}) => {
  const theme = useTheme();

  return (
    <View>
      {/* CÔNG VIỆC CỤ THỂ */}
      <View style={[styles.section, { marginBottom: theme.spacing.lg }]}>
        <Text style={[styles.sectionLabel, { color: theme.colors.text.primary }]}>Công việc *</Text>
        <TouchableOpacity
          style={[
            styles.selectorBox,
            {
              backgroundColor: theme.colors.background.secondary,
              borderColor: validationErrors.category ? theme.colors.status.error : theme.colors.border.subtle,
              borderRadius: theme.radius.small,
              paddingHorizontal: theme.spacing.md,
            },
          ]}
          onPress={onPressCategory}
          accessibilityRole="button"
          accessibilityLabel="Chọn công việc cụ thể"
        >
          <Text
            style={[
              styles.selectorText,
              { color: subcategoryName ? theme.colors.text.primary : theme.colors.text.muted },
            ]}
            numberOfLines={1}
          >
            {subcategoryName || 'Chọn công việc'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={theme.colors.text.secondary} />
        </TouchableOpacity>
        {validationErrors.category ? (
          <Text style={[styles.inlineErrorText, { color: theme.colors.status.error }]}>
            {validationErrors.category}
          </Text>
        ) : null}
      </View>

      {/* GRID: HÌNH THỨC & ĐỊA ĐIỂM */}
      <View style={[styles.rowGrid, { marginBottom: theme.spacing.lg, gap: theme.spacing.md }]}>
        {/* HÌNH THỨC LÀM VIỆC */}
        <TouchableOpacity
          style={styles.gridColumn}
          onPress={onPressWorkMode}
          accessibilityRole="button"
          accessibilityLabel="Chọn hình thức làm việc"
        >
          <Text style={[styles.gridLabel, { color: theme.colors.text.primary }]}>Hình thức *</Text>
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
              {selectedWorkModeLabel}
            </Text>
            <Ionicons name="chevron-down" size={16} color={theme.colors.text.secondary} />
          </View>
        </TouchableOpacity>

        {/* ĐỊA ĐIỂM (LOCKED - HIỆN CHO BẢN CẬP NHẬT TIẾP THEO) */}
        <View style={styles.gridColumn}>
          <View style={styles.gridHeaderRow}>
            <Text style={[styles.gridLabel, { color: theme.colors.text.primary, marginBottom: 0 }]}>
              Địa điểm
            </Text>
            <View style={styles.lockedBadge}>
              <Ionicons name="lock-closed" size={10} color="#94A3B8" />
              <Text style={styles.lockedBadgeText}>Sắp ra mắt</Text>
            </View>
          </View>
          <View
            style={[
              styles.gridInputBox,
              styles.lockedInputBox,
              {
                backgroundColor: '#F8FAFC',
                borderColor: theme.colors.border.subtle,
                borderRadius: theme.radius.small,
                paddingHorizontal: theme.spacing.md,
              },
            ]}
          >
            <Text style={styles.lockedInputText} numberOfLines={1}>
              Toàn quốc (Online)
            </Text>
            <Ionicons name="location-outline" size={16} color="#94A3B8" />
          </View>
        </View>
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
          <Text style={[styles.inlineErrorText, { color: theme.colors.status.error }]}>{validationErrors.title || ''}</Text>
          <Text style={[styles.counterText, { color: theme.colors.text.secondary }]}>{title.length}/100</Text>
        </View>
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
          <Text style={[styles.inlineErrorText, { color: theme.colors.status.error }]}>{validationErrors.description}</Text>
        ) : null}
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
  gridHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
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
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  lockedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  lockedInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    opacity: 0.85,
  },
  lockedInputText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    flex: 1,
    marginRight: 4,
  },
  section: {},
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  selectorBox: {
    flexDirection: 'row',
    height: 48,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 4,
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
  inlineErrorText: {
    fontSize: 11,
  },
  textArea: {
    height: 120,
    borderWidth: 1.5,
    fontSize: 14,
    fontWeight: '600',
    textAlignVertical: 'top',
  },
});
