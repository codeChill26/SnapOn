import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HomeTheme } from '../home/HomeTheme';

interface CloseRecruitmentModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export const CloseRecruitmentModal: React.FC<CloseRecruitmentModalProps> = ({
  visible,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    onConfirm(reason);
    setReason('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardContainer}
          >
            <View style={styles.modalContainer}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Đóng tuyển dụng sớm</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={22} color={HomeTheme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Warning Text */}
              <View style={styles.warningBox}>
                <Ionicons name="warning-outline" size={20} color={HomeTheme.colors.warning} />
                <Text style={styles.warningText}>
                  Sau khi đóng tuyển dụng, các ứng viên sẽ không thể ứng tuyển vào công việc này nữa. Bạn vẫn có thể quản lý danh sách ứng viên hiện tại.
                </Text>
              </View>

              {/* Reason Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  Lý do đóng tuyển dụng (Tùy chọn)
                </Text>
                <TextInput
                  style={styles.reasonInput}
                  placeholder="Ví dụ: Đã tuyển đủ người trực tiếp, thay đổi kế hoạch..."
                  placeholderTextColor={HomeTheme.colors.textMuted}
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  numberOfLines={3}
                  maxLength={200}
                />
              </View>

              {/* Actions */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                  <Text style={styles.cancelButtonText}>Hủy bỏ</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                  <Text style={styles.confirmButtonText}>Đóng tuyển dụng</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(22, 24, 29, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  keyboardContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: HomeTheme.colors.surface,
    borderRadius: HomeTheme.radius.medium,
    padding: 20,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: HomeTheme.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    borderRadius: HomeTheme.radius.small,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#B45309',
    lineHeight: 18,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: HomeTheme.colors.text,
    marginBottom: 8,
  },
  reasonInput: {
    backgroundColor: HomeTheme.colors.page,
    borderWidth: 1,
    borderColor: HomeTheme.colors.border,
    borderRadius: HomeTheme.radius.small,
    padding: 12,
    fontSize: 14,
    color: HomeTheme.colors.text,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: HomeTheme.radius.small,
    borderWidth: 1,
    borderColor: HomeTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HomeTheme.colors.surface,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: HomeTheme.colors.textSecondary,
  },
  confirmButton: {
    flex: 2,
    height: 48,
    borderRadius: HomeTheme.radius.small,
    backgroundColor: '#EF4444', // Red for closing/destructive actions
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
