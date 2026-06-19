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

interface ApplyConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (message: string) => void;
  taskTitle: string;
  budgetMax: number;
  salaryUnit: string;
  posterName: string;
}

export const ApplyConfirmationModal: React.FC<ApplyConfirmationModalProps> = ({
  visible,
  onClose,
  onConfirm,
  taskTitle,
  budgetMax,
  salaryUnit,
  posterName,
}) => {
  const [message, setMessage] = useState('');

  const handleConfirm = () => {
    onConfirm(message);
    setMessage('');
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('vi-VN') + ' đ';
  };

  const getSalaryUnitLabel = (unit: string) => {
    switch (unit) {
      case 'PER_HOUR':
        return '/giờ';
      case 'PER_DAY':
        return '/ngày';
      case 'PER_MONTH':
        return '/tháng';
      default:
        return '';
    }
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
                <Text style={styles.headerTitle}>Xác nhận ứng tuyển</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={22} color={HomeTheme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Job Summary Card */}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle} numberOfLines={2}>
                  {taskTitle}
                </Text>
                
                <View style={styles.divider} />

                <View style={styles.infoRow}>
                  <Ionicons name="person-outline" size={16} color={HomeTheme.colors.textSecondary} />
                  <Text style={styles.infoText}>
                    Người đăng: <Text style={styles.boldText}>{posterName}</Text>
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="cash-outline" size={16} color={HomeTheme.colors.primary} />
                  <Text style={styles.infoText}>
                    Thu nhập tối đa: <Text style={styles.priceText}>{formatPrice(budgetMax)}</Text>
                    <Text style={styles.unitText}>{getSalaryUnitLabel(salaryUnit)}</Text>
                  </Text>
                </View>
              </View>

              {/* Message Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  Lời nhắn gửi đến người tuyển dụng (Tùy chọn)
                </Text>
                <TextInput
                  style={styles.messageInput}
                  placeholder="Giới thiệu bản thân ngắn gọn, kinh nghiệm làm việc liên quan..."
                  placeholderTextColor={HomeTheme.colors.textMuted}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                />
              </View>

              {/* Actions */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                  <Text style={styles.cancelButtonText}>Để sau</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                  <Text style={styles.confirmButtonText}>Xác nhận</Text>
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
  summaryCard: {
    backgroundColor: HomeTheme.colors.page,
    borderRadius: HomeTheme.radius.small,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: HomeTheme.colors.border,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: HomeTheme.colors.text,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: HomeTheme.colors.border,
    marginVertical: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  infoText: {
    fontSize: 13,
    color: HomeTheme.colors.textSecondary,
  },
  boldText: {
    fontWeight: '700',
    color: HomeTheme.colors.text,
  },
  priceText: {
    fontWeight: '800',
    color: HomeTheme.colors.primary,
  },
  unitText: {
    fontSize: 12,
    color: HomeTheme.colors.textSecondary,
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
  messageInput: {
    backgroundColor: HomeTheme.colors.page,
    borderWidth: 1,
    borderColor: HomeTheme.colors.border,
    borderRadius: HomeTheme.radius.small,
    padding: 12,
    fontSize: 14,
    color: HomeTheme.colors.text,
    minHeight: 80,
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
    backgroundColor: HomeTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
