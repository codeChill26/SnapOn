import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

interface PostJobBasicInfoProps {
  postType: 'RECRUITMENT' | 'SERVICE_OFFER';
  subcategoryName: string | undefined;
  workMode: 'ONSITE' | 'REMOTE' | 'NEGOTIABLE';
  address: string;
  setAddress: (addr: string) => void;
  title: string;
  setTitle: (title: string) => void;
  description: string;
  setDescription: (desc: string) => void;
  validationErrors: Record<string, string>;
  onPressCategory: () => void;
}

export const PostJobBasicInfo: React.FC<PostJobBasicInfoProps> = ({
  postType,
  subcategoryName,
  workMode,
  address,
  setAddress,
  title,
  setTitle,
  description,
  setDescription,
  validationErrors,
  onPressCategory,
}) => {
  const theme = useTheme();

  return (
    <View>
      {/* GRID: LĨNH VỰC & ĐỊA ĐIỂM */}
      <View style={[styles.rowGrid, { marginBottom: theme.spacing.lg, gap: theme.spacing.md }]}>
        <TouchableOpacity
          style={styles.gridColumn}
          onPress={onPressCategory}
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
    color: '#EF4444',
  },
  textArea: {
    height: 120,
    borderWidth: 1.5,
    fontSize: 14,
    fontWeight: '600',
    textAlignVertical: 'top',
  },
});
