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
  onConfirm: (message: string, bidPrice: number | null) => void;
  taskTitle: string;
  budgetMin: number;
  budgetMax: number;
  salaryUnit: string;
  posterName: string;
}

export const ApplyConfirmationModal: React.FC<ApplyConfirmationModalProps> = ({
  visible,
  onClose,
  onConfirm,
  taskTitle,
  budgetMin,
  budgetMax,
  salaryUnit,
  posterName,
}) => {
  const [message, setMessage] = useState('');
  const [bidPriceText, setBidPriceText] = useState('');
  const [bidPriceError, setBidPriceError] = useState('');

  const handleClose = () => {
    setMessage('');
    setBidPriceText('');
    setBidPriceError('');
    onClose();
  };

  const handleConfirm = () => {
    const rawText = bidPriceText.replace(/[^0-9]/g, '');
    const bidPrice = rawText ? parseInt(rawText, 10) : null;

    if (bidPrice !== null) {
      if (bidPrice < budgetMin) {
        setBidPriceError(`Giá không được thấp hơn mức tối thiểu ${formatPrice(budgetMin)}`);
        return;
      }
      if (bidPrice > budgetMax) {
        setBidPriceError(`Giá không được vượt quá mức tối đa ${formatPrice(budgetMax)}`);
        return;
      }
    }

    setBidPriceError('');
    onConfirm(message, bidPrice);
    setMessage('');
    setBidPriceText('');
  };

  const handleBidPriceChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '');
    setBidPriceText(digits);
    if (bidPriceError) setBidPriceError('');
  };

  const formatPrice = (price: number) => price.toLocaleString('vi-VN') + ' đ';

  const getSalaryUnitLabel = (unit: string) => {
    switch (unit) {
      case 'PER_HOUR': return '/giờ';
      case 'PER_DAY': return '/ngày';
      case 'PER_MONTH': return '/tháng';
      default: return '';
    }
  };

  const unitLabel = getSalaryUnitLabel(salaryUnit);
  const isSameRange = budgetMin === budgetMax;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
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
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
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
                    Ngân sách:{' '}
                    <Text style={styles.priceText}>
                      {isSameRange
                        ? `${formatPrice(budgetMax)}`
                        : `${formatPrice(budgetMin)} – ${formatPrice(budgetMax)}`}
                    </Text>
                    {unitLabel ? <Text style={styles.unitText}>{unitLabel}</Text> : null}
                  </Text>
                </View>
              </View>

              {/* Bid Price Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  Mức giá bạn muốn đề xuất{unitLabel ? ` (${unitLabel.replace('/', '')})` : ''}
                  <Text style={styles.optionalText}> (Tuỳ chọn)</Text>
                </Text>
                <View style={[styles.priceInputWrapper, bidPriceError ? styles.priceInputError : null]}>
                  <TextInput
                    style={styles.priceInput}
                    placeholder={
                      isSameRange
                        ? `${budgetMax.toLocaleString('vi-VN')}`
                        : `${budgetMin.toLocaleString('vi-VN')} – ${budgetMax.toLocaleString('vi-VN')}`
                    }
                    placeholderTextColor={HomeTheme.colors.textMuted}
                    value={bidPriceText ? parseInt(bidPriceText, 10).toLocaleString('vi-VN') : ''}
                    onChangeText={handleBidPriceChange}
                    keyboardType="numeric"
                  />
                  <Text style={styles.currencyLabel}>đ</Text>
                </View>
                {bidPriceError ? (
                  <Text style={styles.errorText}>{bidPriceError}</Text>
                ) : (
                  !isSameRange && (
                    <Text style={styles.hintText}>
                      Trong khoảng {formatPrice(budgetMin)} – {formatPrice(budgetMax)}{unitLabel}
                    </Text>
                  )
                )}
              </View>

              {/* Message Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  Lời nhắn gửi đến người tuyển dụng
                  <Text style={styles.optionalText}> (Tuỳ chọn)</Text>
                </Text>
                <TextInput
                  style={styles.messageInput}
                  placeholder="Giới thiệu bản thân ngắn gọn, kinh nghiệm làm việc liên quan..."
                  placeholderTextColor={HomeTheme.colors.textMuted}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                />
              </View>

              {/* Actions */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
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
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: HomeTheme.colors.text,
    marginBottom: 8,
  },
  optionalText: {
    fontWeight: '400',
    color: HomeTheme.colors.textSecondary,
    fontSize: 12,
  },
  priceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: HomeTheme.colors.page,
    borderWidth: 1,
    borderColor: HomeTheme.colors.border,
    borderRadius: HomeTheme.radius.small,
    paddingHorizontal: 12,
    height: 48,
  },
  priceInputError: {
    borderColor: '#EF4444',
  },
  priceInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: HomeTheme.colors.text,
  },
  currencyLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: HomeTheme.colors.textSecondary,
    marginLeft: 4,
  },
  hintText: {
    fontSize: 11,
    color: HomeTheme.colors.textSecondary,
    marginTop: 4,
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 4,
  },
  messageInput: {
    backgroundColor: HomeTheme.colors.page,
    borderWidth: 1,
    borderColor: HomeTheme.colors.border,
    borderRadius: HomeTheme.radius.small,
    padding: 12,
    fontSize: 14,
    color: HomeTheme.colors.text,
    minHeight: 72,
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
