import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { walletService } from '../../services/walletService';
import { useApp } from '../../context/AppContext';
import { Wallet, WalletTransaction } from '../../types';
import { formatCurrency, formatDate, getStatusLabel } from '../../utils/format';

const TOPUP_PRESETS = [50000, 100000, 200000, 500000, 1000000];

export const WalletScreen: React.FC = () => {
  const { wallet, setWallet } = useApp();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [topupAmount, setTopupAmount] = useState<number>(100000);

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

  const handleTopup = async () => {
    Alert.alert(
      'Nạp tiền',
      `Xác nhận nạp ${formatCurrency(topupAmount)}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            try {
              const newWallet = await walletService.topupMock(topupAmount);
              setWallet(newWallet);
              Alert.alert('Thành công', `Đã nạp ${formatCurrency(topupAmount)}`);
              loadWalletData();
            } catch (error: any) {
              Alert.alert('Lỗi', error.message || 'Nạp tiền thất bại');
            }
          },
        },
      ]
    );
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
              onPress={() => setTopupAmount(amount)}
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
        <Button
          title={`Nạp ${formatCurrency(topupAmount)}`}
          onPress={handleTopup}
          size="lg"
          style={styles.topupButton}
        />
      </Card>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lịch sử giao dịch</Text>
        {transactions.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Chưa có giao dịch nào</Text>
          </Card>
        ) : (
          transactions.map(tx => (
            <View key={tx.id} style={styles.txItem}>
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
          ))
        )}
      </View>
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
  topupButton: {
    marginTop: 8,
  },
  section: {
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
  txItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
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
