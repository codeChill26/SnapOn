import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Colors } from '../../constants/colors';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { walletService } from '../../services/walletService';
import { formatCurrency } from '../../utils/format';
import { Ionicons } from '@expo/vector-icons';

import { storage } from '../../utils/storage';

interface WithdrawModalProps {
  visible: boolean;
  onClose: () => void;
  availableBalance: number;
  initialBankName?: string;
  initialBankAccountNumber?: string;
  onSuccess?: () => void;
}

const COMMON_BANKS = [
  'MB Bank',
  'Vietcombank',
  'Techcombank',
  'VietinBank',
  'BIDV',
  'VPBank',
  'Agribank',
  'ACB',
  'TPBank',
  'Sacombank',
];

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  visible,
  onClose,
  availableBalance,
  initialBankName = 'MB Bank',
  initialBankAccountNumber = '',
  onSuccess,
}) => {
  const [amountText, setAmountText] = useState('');
  const [bankName, setBankName] = useState(initialBankName || 'MB Bank');
  const [bankAccountNumber, setBankAccountNumber] = useState(initialBankAccountNumber || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    if (visible) {
      setAmountText('');
      setErrorText('');
      setIsSubmitting(false);

      // Pre-fill from props or storage
      if (initialBankName) setBankName(initialBankName);
      if (initialBankAccountNumber) setBankAccountNumber(initialBankAccountNumber);

      storage.getBankDetails().then((saved) => {
        if (saved) {
          if (saved.bankName) setBankName(saved.bankName);
          if (saved.bankAccountNumber) setBankAccountNumber(saved.bankAccountNumber);
        }
      }).catch(() => {});
    }
  }, [visible, initialBankName, initialBankAccountNumber]);

  const handleAmountChange = (text: string) => {
    const clean = text.replace(/[^0-9]/g, '');
    setAmountText(clean);
    const num = parseInt(clean, 10);
    if (!clean) {
      setErrorText('');
    } else if (isNaN(num) || num < 1000) {
      setErrorText('Số tiền rút tối thiểu là 1.000đ');
    } else if (num > 2000000) {
      setErrorText('Số tiền rút mỗi lần tối đa là 2.000.000đ');
    } else if (num > availableBalance) {
      setErrorText(`Số dư khả dụng không đủ (${formatCurrency(availableBalance)})`);
    } else {
      setErrorText('');
    }
  };

  const handleSubmit = async () => {
    const amount = parseInt(amountText, 10);
    if (!amount || amount < 1000) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền rút hợp lệ (tối thiểu 1.000đ)');
      return;
    }
    if (amount > 2000000) {
      Alert.alert('Lỗi', 'Số tiền rút tối đa cho mỗi lần là 2.000.000đ');
      return;
    }
    if (amount > availableBalance) {
      Alert.alert('Lỗi', 'Số tiền rút vượt quá số dư khả dụng');
      return;
    }
    if (!bankName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng chọn hoặc nhập tên ngân hàng');
      return;
    }
    if (!bankAccountNumber.trim() || bankAccountNumber.trim().length < 6) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tài khoản ngân hàng hợp lệ (ít nhất 6 số)');
      return;
    }

    setIsSubmitting(true);
    try {
      await walletService.withdraw({
        amount,
        bankName: bankName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
      });
      await storage.setBankDetails(bankName.trim(), bankAccountNumber.trim()).catch(() => {});

      Alert.alert(
        'Gửi yêu cầu thành công',
        `Yêu cầu rút ${formatCurrency(amount)} về tài khoản ${bankName} (${bankAccountNumber.trim()}) đã được gửi. Admin sẽ kiểm tra và phê duyệt.`,
        [
          {
            text: 'Đóng',
            onPress: () => {
              onClose();
              if (onSuccess) onSuccess();
            },
          },
        ]
      );
    } catch (err: any) {
      console.error('Withdraw submit error:', err);
      const msg = err.response?.data?.message || err.message || 'Không thể tạo yêu cầu rút tiền.';
      Alert.alert('Rút tiền thất bại', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Rút tiền từ ví">
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Balance Info Box */}
        <View style={styles.balanceInfoBox}>
          <Text style={styles.balanceLabel}>Số dư có thể rút:</Text>
          <Text style={styles.balanceValue}>{formatCurrency(availableBalance)}</Text>
        </View>

        {/* Input Amount */}
        <Input
          label="Số tiền rút (đ) *"
          placeholder="Tối đa 2.000.000đ / lần"
          value={amountText}
          onChangeText={handleAmountChange}
          keyboardType="numeric"
          error={errorText}
        />

        {/* Quick Amount Buttons */}
        <View style={styles.presetRow}>
          {[50000, 100000, 200000, 500000, 1000000, 2000000].map((preset) => (
            <TouchableOpacity
              key={preset}
              style={[
                styles.presetChip,
                parseInt(amountText, 10) === preset && styles.presetChipActive,
              ]}
              onPress={() => handleAmountChange(preset.toString())}
            >
              <Text
                style={[
                  styles.presetText,
                  parseInt(amountText, 10) === preset && styles.presetTextActive,
                ]}
              >
                {preset >= 1000000 ? `${preset / 1000000}M` : `${preset / 1000}K`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bank Selection */}
        <Text style={styles.inputLabel}>Chọn ngân hàng thụ hưởng *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.banksScroll}>
          {COMMON_BANKS.map((b) => {
            const isActive = b === bankName || (!!bankName && (b.toLowerCase().replace(/[^a-z0-9]/g, '').includes(bankName.toLowerCase().replace(/[^a-z0-9]/g, '')) || bankName.toLowerCase().replace(/[^a-z0-9]/g, '').includes(b.toLowerCase().replace(/[^a-z0-9]/g, ''))));
            return (
              <TouchableOpacity
                key={b}
                style={[styles.bankChip, isActive && styles.bankChipActive]}
                onPress={() => setBankName(b)}
              >
                <Text style={[styles.bankText, isActive && styles.bankTextActive]}>{b}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Input
          label="Số tài khoản ngân hàng *"
          placeholder="Nhập số tài khoản ngân hàng"
          value={bankAccountNumber}
          onChangeText={(t) => setBankAccountNumber(t.replace(/[^0-9]/g, ''))}
          keyboardType="numeric"
        />

        {/* Warning Note */}
        <View style={styles.noteBox}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
          <Text style={styles.noteText}>
            Yêu cầu rút tiền sẽ được Admin xử lý và chuyển khoản trong vòng 24 giờ làm việc.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.modalButtons}>
          <Button title="Hủy" variant="outline" onPress={onClose} style={{ flex: 1 }} />
          <Button
            title="Gửi yêu cầu rút"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={!amountText || !!errorText || !bankAccountNumber}
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 20,
  },
  balanceInfoBox: {
    backgroundColor: Colors.primarySoft,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  presetChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  presetTextActive: {
    color: Colors.textWhite,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  banksScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  bankChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
    backgroundColor: Colors.surface,
  },
  bankChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  bankText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
  },
  bankTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primarySoft,
    padding: 10,
    borderRadius: 8,
    gap: 6,
    marginVertical: 12,
  },
  noteText: {
    flex: 1,
    fontSize: 11,
    color: Colors.primary,
    lineHeight: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
});
