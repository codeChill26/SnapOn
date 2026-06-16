import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { walletService } from '../../services/walletService';
import { useApp } from '../../context/AppContext';
import { Wallet, WalletTransaction } from '../../types';
import { formatCurrency, formatDate, getStatusLabel } from '../../utils/format';
import { Input } from '../../components/ui/Input';

const TOPUP_PRESETS = [50000, 100000, 200000, 500000, 1000000];

export const WalletScreen: React.FC = () => {
  const { wallet, setWallet } = useApp();
  const route = useRoute<any>();
  const scrollViewRef = useRef<ScrollView>(null);
  const [historyY, setHistoryY] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [topupAmount, setTopupAmount] = useState<number>(100000);
  const [customAmountText, setCustomAmountText] = useState<string>('100000');
  const [pendingOrderCode, setPendingOrderCode] = useState<number | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);

  useEffect(() => {
    if (route.params?.scrollToHistory && historyY > 0) {
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: historyY, animated: true });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [route.params?.scrollToHistory, historyY]);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      const walletData = await walletService.getMyWallet();
      setWallet(walletData);
      try {
        const txData = await walletService.getTransactions();
        setTransactions(txData.transactions);
      } catch {}
    } catch (error) {
      console.error('Failed to load wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePresetSelect = (amount: number) => {
    setTopupAmount(amount);
    setCustomAmountText(amount.toString());
  };

  const handleCustomAmountChange = (text: string) => {
    const cleanText = text.replace(/[^0-9]/g, '');
    setCustomAmountText(cleanText);
    const num = parseInt(cleanText, 10);
    if (!isNaN(num)) {
      setTopupAmount(num);
    } else {
      setTopupAmount(0);
    }
  };

  const handleTopup = async () => {
    if (topupAmount < 1000) {
      Alert.alert('Lỗi', 'Số tiền nạp tối thiểu là 1.000 đ');
      return;
    }

    try {
      setCheckingPayment(true);
      const result = await walletService.createPayOSPayment(topupAmount);
      setPendingOrderCode(result.orderCode);
      
      const supported = await Linking.canOpenURL(result.checkoutUrl);
      if (supported) {
        await Linking.openURL(result.checkoutUrl);
      } else {
        Alert.alert('Lỗi', 'Không thể mở liên kết thanh toán.');
      }
    } catch (error: any) {
      console.error('PayOS topup error:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tạo liên kết thanh toán PayOS');
    } finally {
      setCheckingPayment(false);
    }
  };

  const handleCheckPaymentStatus = async () => {
    if (!pendingOrderCode) return;
    try {
      setCheckingPayment(true);
      const res = await walletService.confirmPayOSPayment(pendingOrderCode);
      
      if (res.success === false) {
        Alert.alert('Thông báo', res.message || 'Thanh toán chưa được hoàn tất. Vui lòng thanh toán trên trình duyệt trước.');
        return;
      }

      setWallet(res.wallet);
      if (res.alreadyProcessed) {
        Alert.alert('Thông báo', 'Giao dịch này đã được xử lý trước đó.');
      } else {
        Alert.alert('Thành công', 'Thanh toán qua PayOS thành công! Số dư ví của bạn đã được cập nhật.');
      }
      setPendingOrderCode(null);
      loadWalletData();
    } catch (error: any) {
      console.error('Confirm payment error:', error);
      Alert.alert('Kiểm tra thất bại', error.message || 'Không thể kết nối đến máy chủ.');
    } finally {
      setCheckingPayment(false);
    }
  };

  const handleCancelPendingPayment = () => {
    setPendingOrderCode(null);
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <ScrollView 
      ref={scrollViewRef} 
      style={styles.container} 
      contentContainerStyle={styles.content}
    >
      <Card style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Số dư khả dụng</Text>
        <Text style={styles.balanceAmount}>
          {formatCurrency(wallet?.availableBalance || 0)}
        </Text>
        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceItemLabel}>Tổng số dư</Text>
            <Text style={styles.balanceItemValue}>
              {formatCurrency(wallet?.balance || 0)}
            </Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceItem}>
            <Text style={styles.balanceItemLabel}>Đang khóa</Text>
            <Text style={styles.balanceItemValue}>
              {formatCurrency(wallet?.lockedBalance || 0)}
            </Text>
          </View>
        </View>
      </Card>

      {pendingOrderCode && (
        <Card style={styles.pendingCard}>
          <Text style={styles.pendingTitle}>Đang xử lý nạp tiền (PayOS)</Text>
          <Text style={styles.pendingDesc}>
            Vui lòng hoàn tất thanh toán trên trình duyệt của bạn cho đơn hàng #{pendingOrderCode}.
          </Text>
          <View style={styles.pendingButtons}>
            <Button
              title="Kiểm tra kết quả"
              onPress={handleCheckPaymentStatus}
              size="md"
              loading={checkingPayment}
              style={styles.pendingBtn}
            />
            <Button
              title="Hủy/Đóng"
              onPress={handleCancelPendingPayment}
              variant="outline"
              size="md"
              style={styles.pendingBtn}
              disabled={checkingPayment}
            />
          </View>
        </Card>
      )}

      {!route.params?.scrollToHistory && (
        <Card style={styles.topupCard}>
          <Text style={styles.sectionTitle}>Nạp tiền</Text>
          <View style={styles.presetRow}>
            {TOPUP_PRESETS.map(amount => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.presetChip,
                  topupAmount === amount && styles.presetChipActive,
                ]}
                onPress={() => handlePresetSelect(amount)}
              >
                <Text
                  style={[
                    styles.presetText,
                    topupAmount === amount && styles.presetTextActive,
                  ]}
                >
                  {amount >= 1000000
                    ? `${(amount / 1000000).toFixed(1)}M`
                    : `${amount / 1000}K`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Số tiền nạp tự chọn (đ)"
            placeholder="Nhập số tiền bạn muốn nạp (tối thiểu 1.000đ)"
            value={customAmountText}
            onChangeText={handleCustomAmountChange}
            keyboardType="numeric"
          />



          <Button
            title={topupAmount > 0 ? `Nạp ${formatCurrency(topupAmount)}` : 'Vui lòng nhập số tiền'}
            onPress={handleTopup}
            size="lg"
            style={styles.topupButton}
            disabled={topupAmount <= 0}
            loading={checkingPayment && !pendingOrderCode}
          />
        </Card>
      )}

      {!route.params?.hideHistory && (
        <View 
          style={styles.section}
          onLayout={(e) => {
            setHistoryY(e.nativeEvent.layout.y);
          }}
        >
          <Text style={styles.sectionTitle}>Lịch sử giao dịch</Text>
          {transactions.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>Chưa có giao dịch nào</Text>
            </Card>
          ) : (
            transactions.map(tx => (
              <Card key={tx.id} style={styles.txCard}>
                <View style={styles.txRow}>
                  <View style={styles.txLeft}>
                    <Text style={styles.txType}>
                      {tx.type === 'DEPOSIT' ? 'Nạp tiền' :
                       tx.type === 'WITHDRAW' ? 'Rút tiền' :
                       tx.type === 'ESCROW_HOLD' ? 'Giữ tiền' :
                       tx.type === 'ESCROW_RELEASE' ? 'Giải ngân' :
                       tx.type === 'REFUND' ? 'Hoàn tiền' : 'Phí'}
                    </Text>
                    <Text style={styles.txDate}>{formatDate(tx.createdAt)}</Text>
                  </View>
                  <View style={styles.txRight}>
                    <Text style={[
                      styles.txAmount,
                      tx.type === 'DEPOSIT' || tx.type === 'ESCROW_RELEASE' || tx.type === 'REFUND'
                        ? styles.txPositive
                        : styles.txNegative,
                    ]}>
                      {tx.type === 'DEPOSIT' || tx.type === 'ESCROW_RELEASE' || tx.type === 'REFUND'
                        ? '+'
                        : '-'}
                      {formatCurrency(tx.amount)}
                    </Text>
                    <Badge
                      label={getStatusLabel(tx.status)}
                      variant={tx.status === 'SUCCESS' ? 'success' : tx.status === 'PENDING' ? 'warning' : 'error'}
                      size="sm"
                    />
                  </View>
                </View>
              </Card>
            ))
          )}
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
    padding: 16,
    paddingBottom: 40,
  },
  balanceCard: {
    marginBottom: 16,
    backgroundColor: Colors.primary,
  },
  balanceLabel: {
    fontSize: 14,
    color: Colors.textWhite,
    opacity: 0.8,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.textWhite,
    marginBottom: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.textWhite + '30',
    paddingTop: 16,
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceItemLabel: {
    fontSize: 12,
    color: Colors.textWhite,
    opacity: 0.7,
  },
  balanceItemValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textWhite,
    marginTop: 2,
  },
  balanceDivider: {
    width: 1,
    backgroundColor: Colors.textWhite + '30',
  },
  pendingCard: {
    marginBottom: 16,
    borderColor: Colors.warning,
    borderWidth: 1.5,
    backgroundColor: Colors.warning + '10',
    padding: 16,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.warning,
    marginBottom: 6,
  },
  pendingDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 14,
    lineHeight: 18,
  },
  pendingButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  pendingBtn: {
    flex: 1,
  },
  topupCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    marginTop: 8,
  },
  methodRow: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 16,
  },
  methodChip: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  methodChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  methodText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  methodTextActive: {
    color: Colors.primary,
  },
  topupButton: {
    marginTop: 8,
  },
  section: {
    marginTop: 24,
    marginBottom: 20,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  txCard: {
    marginBottom: 12,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txLeft: {
    gap: 2,
  },
  txType: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  txDate: {
    fontSize: 12,
    color: Colors.textLight,
  },
  txRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  txPositive: {
    color: Colors.success,
  },
  txNegative: {
    color: Colors.error,
  },
});
