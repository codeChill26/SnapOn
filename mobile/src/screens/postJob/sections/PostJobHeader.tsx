import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

interface PostJobHeaderProps {
  isEditMode: boolean;
  loading: boolean;
  isFormValid: boolean;
  handleDiscardDraft: () => void;
  handleSubmit: () => void;
  goBack: () => void;
}

export const PostJobHeader: React.FC<PostJobHeaderProps> = ({
  isEditMode,
  loading,
  isFormValid,
  handleDiscardDraft,
  handleSubmit,
  goBack,
}) => {
  const theme = useTheme();

  return (
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
        onPress={goBack}
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
            <ActivityIndicator size="small" color={theme.colors.text.inverse} />
          ) : (
            <Text style={[
              styles.submitBtnText,
              { color: theme.colors.text.disabled },
              isFormValid && { color: theme.colors.text.inverse }
            ]}>
              {isEditMode ? 'Cập nhật' : 'Đăng bài'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
  },
});
