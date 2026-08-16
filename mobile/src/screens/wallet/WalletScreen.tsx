import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, Modal } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { AppColors } from '../../theme';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { walletService } from '../../services/walletService';
import { useWallet } from '../../context/AppContext';
import { Wallet, WalletTransaction } from '../../types';
import { formatCurrency, formatDate, getStatusLabel } from '../../utils/format';
import { Input } from '../../components/ui/Input';

const TOPUP_PRESETS = [50000, 100000, 200000, 500000, 1000000];

export const WalletScreen: React.FC = () => {
  const { wallet, setWallet } = useWallet();
  const route = useRoute<any>();
  const scrollViewRef = useRef<ScrollView>(null);
  const [historyY, setHistoryY] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [topupAmount, setTopupAmount] = useState<number>(100000);
  const [customAmountText, setCustomAmountText] = useState<string>('100000');
  const [pendingOrderCode, setPendingOrderCode] = useState<number | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [topupError, setTopupError] = useState<string>('');

  const [selectedTx, setSelectedTx] = useState<WalletTransaction | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editBankName, setEditBankName] = useState('');
  const [editBankAccount, setEditBankAccount] = useState('');
  const [editAmountText, setEditAmountText] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

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

  const MAX_TOPUP = 50_000_000;

  const handlePresetSelect = (amount: number) => {
    setTopupAmount(amount);
    setCustomAmountText(amount.toString());
    setTopupError('');
  };

  const handleCustomAmountChange = (text: string) => {
    const cleanText = text.replace(/[^0-9]/g, '');
    setCustomAmountText(cleanText);
    const num = parseInt(cleanText, 10);
    if (!isNaN(num) && num > 0) {
      setTopupAmount(num);
      if (num < 1000) setTopupError('Tối thiểu 1.000đ');
      else if (num > MAX_TOPUP) setTopupError('Tối đa 50.000.000đ');
      else setTopupError('');
    } else {
      setTopupAmount(0);
      if (cleanText) setTopupError('Vui lòng nhập số tiền hợp lệ');
      else setTopupError('');
    }
  };

  const handleTopup = async () => {
    if (!topupAmount || topupAmount < 1000) {
      setTopupError('Số tiền nạp tối thiểu là 1.000đ');
      return;
    }
    if (topupAmount > MAX_TOPUP) {
      setTopupError('Số tiền nạp tối đa là 50.000.000đ');
      return;
    }
    setTopupError('');

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

  const handleOpenDetail = (tx: WalletTransaction) => {
    setSelectedTx(tx);
  };

  const handleOpenEdit = () => {
    if (!selectedTx) return;
    setEditBankName(selectedTx.bankName || '');
    setEditBankAccount(selectedTx.bankAccountNumber || '');
    setEditAmountText(selectedTx.amount.toString());
    setIsEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedTx) return;
    const numAmt = parseInt(editAmountText.replace(/[^0-9]/g, ''), 10);
    if (isNaN(numAmt) || numAmt < 10000) {
      Alert.alert('Lỗi', 'Số tiền rút tối thiểu là 10.000đ.');
      return;
    }
    if (numAmt > 2000000) {
      Alert.alert('Lỗi', 'Số tiền rút mỗi lần tối đa là 2.000.000đ.');
      return;
    }
    if (!editBankName.trim() || !editBankAccount.trim()) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ tên ngân hàng và số tài khoản.');
      return;
    }

    try {
      setSubmittingAction(true);
      await walletService.updateWithdrawal(selectedTx.id, {
        amount: numAmt,
        bankName: editBankName.trim(),
        bankAccountNumber: editBankAccount.trim(),
      });
      Alert.alert('Thành công', 'Đã cập nhật yêu cầu rút tiền thành công!');
      setIsEditModalVisible(false);
      setSelectedTx(null);
      loadWalletData();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể cập nhật yêu cầu rút tiền.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleCancelWithdrawal = async () => {
    if (!selectedTx) return;
    Alert.alert(
      'Xác nhận hủy',
      `Bạn có chắc chắn muốn hủy yêu cầu rút ${formatCurrency(selectedTx.amount)} không?`,
      [
        { text: 'Bỏ qua', style: 'cancel' },
        {
          text: 'Hủy yêu cầu',
          style: 'destructive',
          onPress: async () => {
            try {
              setSubmittingAction(true);
              await walletService.cancelWithdrawal(selectedTx.id);
              Alert.alert('Thành công', 'Đã hủy yêu cầu rút tiền.');
              setSelectedTx(null);
              loadWalletData();
            } catch (err: any) {
              Alert.alert('Lỗi', err.message || 'Không thể hủy yêu cầu rút tiền.');
            } finally {
              setSubmittingAction(false);
            }
          },
        },
      ]
    );
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <View style={{ flex: 1 }}>
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
          <Card style={styles.topupCard} variant="glass">
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
              placeholder="Nhập số tiền (1.000đ – 50.000.000đ)"
              value={customAmountText}
              onChangeText={handleCustomAmountChange}
              keyboardType="numeric"
              error={topupError || undefined}
            />

            <Button
              title={topupAmount >= 1000 && !topupError ? `Nạp ${formatCurrency(topupAmount)}` : 'Vui lòng nhập số tiền hợp lệ'}
              onPress={handleTopup}
              size="lg"
              style={styles.topupButton}
              disabled={topupAmount < 1000 || !!topupError}
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
              <Card style={styles.emptyCard} variant="glass">
                <Text style={styles.emptyText}>Chưa có giao dịch nào</Text>
              </Card>
            ) : (
              transactions.map(tx => {
                const statusInfo = (() => {
                  if (tx.status === 'SUCCESS') {
                    return { label: 'Thành công', variant: 'success' as const };
                  }
                  if (tx.status === 'FAILED') {
                    return { label: 'Thất bại', variant: 'error' as const };
                  }
                  if (tx.status === 'CANCELLED') {
                    return { label: 'Đã hủy', variant: 'error' as const };
                  }
                  if (tx.status === 'EXPIRED') {
                    return { label: 'Hết hạn', variant: 'error' as const };
                  }
                  if (tx.type === 'WITHDRAW' && tx.status === 'PENDING') {
                    return { label: 'Chờ duyệt', variant: 'warning' as const };
                  }
                  if (tx.type === 'DEPOSIT' && tx.status === 'PENDING') {
                    return { label: 'Chờ thanh toán', variant: 'warning' as const };
                  }
                  if (tx.type === 'ESCROW_HOLD') {
                    return { label: 'Thành công', variant: 'success' as const };
                  }
                  return {
                    label: getStatusLabel(tx.status),
                    variant: (tx.status === 'PENDING' ? 'warning' : 'success') as 'warning' | 'success',
                  };
                })();

                return (
                  <TouchableOpacity
                    key={tx.id}
                    activeOpacity={0.75}
                    onPress={() => handleOpenDetail(tx)}
                  >
                    <Card style={styles.txCard} variant="glass">
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
                            label={statusInfo.label}
                            variant={statusInfo.variant}
                            size="sm"
                          />
                        </View>
                      </View>
                    </Card>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Transaction Detail Modal */}
      <Modal
        visible={!!selectedTx}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedTx(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedTx(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
            {selectedTx && (
              <>
                <Text style={styles.modalTitle}>Chi tiết giao dịch</Text>
                <View style={styles.modalDivider} />
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Loại giao dịch:</Text>
                  <Text style={styles.detailValue}>
                    {selectedTx.type === 'DEPOSIT' ? 'Nạp tiền vào ví' :
                     selectedTx.type === 'WITHDRAW' ? 'Rút tiền từ ví' :
                     selectedTx.type === 'ESCROW_HOLD' ? 'Giữ tiền đặt cọc' :
                     selectedTx.type === 'ESCROW_RELEASE' ? 'Giải ngân công việc' :
                     selectedTx.type === 'REFUND' ? 'Hoàn tiền ví' : 'Phí ứng dụng'}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Số tiền:</Text>
                  <Text style={[styles.detailValue, styles.detailAmountText]}>
                    {formatCurrency(selectedTx.amount)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Thời gian:</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedTx.createdAt)}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Trạng thái:</Text>
                  <Badge
                    label={
                      selectedTx.status === 'SUCCESS' ? 'Thành công' :
                      selectedTx.status === 'FAILED' ? 'Thất bại' :
                      selectedTx.status === 'CANCELLED' ? 'Đã hủy' :
                      selectedTx.type === 'WITHDRAW' && selectedTx.status === 'PENDING' ? 'Chờ duyệt' :
                      selectedTx.type === 'DEPOSIT' && selectedTx.status === 'PENDING' ? 'Chờ thanh toán' :
                      getStatusLabel(selectedTx.status)
                    }
                    variant={
                      selectedTx.status === 'SUCCESS' ? 'success' :
                      selectedTx.status === 'PENDING' ? 'warning' : 'error'
                    }
                    size="sm"
                  />
                </View>

                {selectedTx.type === 'WITHDRAW' && (
                  <>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Ngân hàng:</Text>
                      <Text style={styles.detailValue}>{selectedTx.bankName || 'Chưa cập nhật'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Số tài khoản:</Text>
                      <Text style={styles.detailValue}>{selectedTx.bankAccountNumber || 'Chưa cập nhật'}</Text>
                    </View>
                  </>
                )}

                <View style={styles.modalActions}>
                  {selectedTx.type === 'WITHDRAW' && selectedTx.status === 'PENDING' && (
                    <>
                      <Button
                        title="Chỉnh sửa"
                        onPress={handleOpenEdit}
                        size="md"
                        style={{ flex: 1, marginRight: 8 }}
                      />
                      <Button
                        title="Hủy đơn"
                        onPress={handleCancelWithdrawal}
                        variant="outline"
                        size="md"
                        style={{ flex: 1, borderColor: Colors.error }}
                        textStyle={{ color: Colors.error }}
                        loading={submittingAction}
                      />
                    </>
                  )}
                  <Button
                    title="Đóng"
                    onPress={() => setSelectedTx(null)}
                    variant="outline"
                    size="md"
                    style={{ flex: selectedTx.type === 'WITHDRAW' && selectedTx.status === 'PENDING' ? 0.8 : 1 }}
                  />
                </View>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Edit Withdrawal Modal */}
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsEditModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
            <Text style={styles.modalTitle}>Chỉnh sửa đơn rút tiền</Text>
            <View style={styles.modalDivider} />

            <Input
              label="Tên ngân hàng"
              placeholder="VD: Vietcombank, MB Bank, Techcombank"
              value={editBankName}
              onChangeText={setEditBankName}
            />

            <Input
              label="Số tài khoản"
              placeholder="Nhập số tài khoản ngân hàng"
              value={editBankAccount}
              onChangeText={setEditBankAccount}
              keyboardType="numeric"
            />

            <Input
              label="Số tiền rút (VNĐ)"
              placeholder="Tối đa 2.000.000đ"
              value={editAmountText}
              onChangeText={setEditAmountText}
              keyboardType="numeric"
            />

            <View style={styles.modalActions}>
              <Button
                title="Lưu thay đổi"
                onPress={handleSaveEdit}
                size="md"
                style={{ flex: 1, marginRight: 8 }}
                loading={submittingAction}
              />
              <Button
                title="Hủy"
                onPress={() => setIsEditModalVisible(false)}
                variant="outline"
                size="md"
                style={{ flex: 1 }}
                disabled={submittingAction}
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
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
    color: AppColors.text.secondary,
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
    color: AppColors.text.primary,
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
    borderColor: AppColors.border.subtle,
    backgroundColor: AppColors.background.soft,
  },
  presetChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  presetText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.text.muted,
  },
  presetTextActive: {
    color: Colors.textWhite,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.text.primary,
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
    borderColor: AppColors.border.subtle,
    backgroundColor: AppColors.background.soft,
  },
  methodChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  methodText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.text.secondary,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalDivider: {
    height: 1,
    backgroundColor: AppColors.border.subtle,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: AppColors.text.secondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.text.primary,
  },
  detailAmountText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 10,
  },
});
