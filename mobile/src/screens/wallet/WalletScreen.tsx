import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { AppColors } from '../../theme';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { walletService } from '../../services/walletService';
import { useWallet } from '../../context/AppContext';
import { WalletTransaction } from '../../types';
import { formatCurrency, formatDate, getStatusLabel } from '../../utils/format';
import { Input } from '../../components/ui/Input';

/**
 * Escrow-per-job model: KHÔNG còn nạp tiền vào ví.
 * Màn hình này là SỔ THU NHẬP của người làm việc:
 *  - Tiền công được cộng vào khi công việc được nghiệm thu
 *  - Rút về tài khoản ngân hàng (admin duyệt và chuyển khoản)
 */
export const WalletScreen: React.FC = () => {
  const { wallet, setWallet } = useWallet();
  const route = useRoute<any>();
  const scrollViewRef = useRef<ScrollView>(null);
  const [historyY, setHistoryY] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Withdraw state
  const [withdrawAmountText, setWithdrawAmountText] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [bankAccountNumber, setBankAccountNumber] = useState<string>('');
  const [withdrawError, setWithdrawError] = useState<string>('');
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    if (route.params?.scrollToHistory && historyY > 0) {
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: historyY, animated: true });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [route.params?.scrollToHistory, historyY]);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      const walletData = await walletService.getMyWallet();
      if (isMountedRef.current) {
        setWallet(walletData);
      }
      try {
        const txData = await walletService.getTransactions();
        if (isMountedRef.current) {
          setTransactions(txData.transactions);
        }
      } catch {}
    } catch (error) {
      console.error('Failed to load wallet:', error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleWithdraw = async () => {
    const amt = parseInt((withdrawAmountText || '').replace(/[^0-9]/g, ''), 10);
    const available = wallet?.availableBalance || 0;

    if (!amt || amt < 10000) {
      setWithdrawError('Số tiền rút tối thiểu là 10.000đ');
      return;
    }
    if (amt > available) {
      setWithdrawError('Số tiền rút vượt quá thu nhập khả dụng');
      return;
    }
    if (!bankName.trim() || !bankAccountNumber.trim()) {
      setWithdrawError('Vui lòng nhập tên ngân hàng và số tài khoản');
      return;
    }
    setWithdrawError('');

    try {
      setWithdrawing(true);
      const res = await walletService.withdraw(amt, bankName.trim(), bankAccountNumber.trim());
      setWallet(res.wallet);
      setWithdrawAmountText('');
      Alert.alert(
        'Đã gửi yêu cầu rút tiền',
        'Yêu cầu của bạn đang chờ quản trị viên duyệt và chuyển khoản. Số tiền đã được tạm giữ khỏi thu nhập khả dụng.'
      );
      loadWalletData();
    } catch (error: any) {
      console.error('Withdraw error:', error);
      Alert.alert('Rút tiền thất bại', error.message || 'Không thể gửi yêu cầu rút tiền.');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Card style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Thu nhập khả dụng (chờ rút)</Text>
        <Text style={styles.balanceAmount}>
          {formatCurrency(wallet?.availableBalance || 0)}
        </Text>
        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceItemLabel}>Tổng thu nhập</Text>
            <Text style={styles.balanceItemValue}>
              {formatCurrency(wallet?.balance || 0)}
            </Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceItem}>
            <Text style={styles.balanceItemLabel}>Đang chờ xử lý</Text>
            <Text style={styles.balanceItemValue}>
              {formatCurrency(wallet?.lockedBalance || 0)}
            </Text>
          </View>
        </View>
      </Card>

      <Card style={styles.infoCard} variant="glass">
        <Text style={styles.infoText}>
          💡 Tiền công được cộng vào đây khi công việc được nghiệm thu. Khi thuê người
          làm, bạn thanh toán trực tiếp từng công việc qua PayOS — không cần nạp tiền trước.
        </Text>
      </Card>

      {!route.params?.scrollToHistory && (
        <Card style={styles.withdrawCard} variant="glass">
          <Text style={styles.sectionTitle}>Rút tiền</Text>
          <Text style={styles.withdrawHint}>
            Rút về tài khoản ngân hàng. Thu nhập khả dụng:{' '}
            <Text style={styles.withdrawHintStrong}>{formatCurrency(wallet?.availableBalance || 0)}</Text>
          </Text>

          <Input
            label="Số tiền rút (đ)"
            placeholder="Tối thiểu 10.000đ"
            value={withdrawAmountText}
            onChangeText={(t) => {
              setWithdrawAmountText(t.replace(/[^0-9]/g, ''));
              setWithdrawError('');
            }}
            keyboardType="numeric"
          />
          <Input
            label="Ngân hàng"
            placeholder="VD: Vietcombank"
            value={bankName}
            onChangeText={(t) => {
              setBankName(t);
              setWithdrawError('');
            }}
          />
          <Input
            label="Số tài khoản"
            placeholder="Nhập số tài khoản nhận tiền"
            value={bankAccountNumber}
            onChangeText={(t) => {
              setBankAccountNumber(t.replace(/[^0-9]/g, ''));
              setWithdrawError('');
            }}
            keyboardType="numeric"
            error={withdrawError || undefined}
          />

          <Button
            title="Gửi yêu cầu rút tiền"
            onPress={handleWithdraw}
            size="lg"
            style={styles.withdrawButton}
            loading={withdrawing}
            disabled={withdrawing}
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
            <Card style={styles.emptyCard} variant="glass">
              <Text style={styles.emptyText}>Chưa có giao dịch nào</Text>
            </Card>
          ) : (
            transactions.map(tx => (
              <Card key={tx.id} style={styles.txCard} variant="glass">
                <View style={styles.txRow}>
                  <View style={styles.txLeft}>
                    <Text style={styles.txType}>
                      {tx.type === 'DEPOSIT' ? 'Nạp tiền' :
                       tx.type === 'WITHDRAW' ? 'Rút tiền' :
                       tx.type === 'ESCROW_HOLD' ? 'Giữ tiền' :
                       tx.type === 'ESCROW_RELEASE' ? 'Tiền công' :
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
    backgroundColor: AppColors.background.primary,
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
  infoCard: {
    marginBottom: 16,
    padding: 14,
  },
  infoText: {
    fontSize: 13,
    color: AppColors.text.secondary,
    lineHeight: 19,
  },
  withdrawCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.text.primary,
    marginBottom: 12,
  },
  withdrawHint: {
    fontSize: 13,
    color: AppColors.text.secondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  withdrawHintStrong: {
    fontWeight: '700',
    color: Colors.primary,
  },
  withdrawButton: {
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
    color: AppColors.text.muted,
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
    color: AppColors.text.primary,
  },
  txDate: {
    fontSize: 12,
    color: AppColors.text.muted,
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
