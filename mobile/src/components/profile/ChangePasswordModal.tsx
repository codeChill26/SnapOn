import React, { useState } from 'react';
import { View, StyleSheet, Text, Alert } from 'react-native';
import { Colors } from '../../constants/colors';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { auth } from '../../services/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ visible, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ currentPassword?: string; newPassword?: string; confirmPassword?: string }>({});

  const currentUser = auth.currentUser;
  const isGoogleUser = currentUser?.providerData.some(p => p.providerId === 'google.com');

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!currentPassword) e.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
    if (!newPassword) e.newPassword = 'Vui lòng nhập mật khẩu mới';
    else if (newPassword.length < 6) e.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự';
    if (newPassword === currentPassword) e.newPassword = 'Mật khẩu mới không được trùng với mật khẩu hiện tại';
    if (newPassword !== confirmPassword) e.confirmPassword = 'Mật khẩu xác nhận không khớp';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChangePassword = async () => {
    if (isGoogleUser) {
      Alert.alert('Liên kết Google', 'Tài khoản của bạn đăng nhập bằng Google. Vui lòng quản lý mật khẩu thông qua tài khoản Google của bạn.');
      return;
    }
    if (!currentUser || !currentUser.email) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin tài khoản người dùng.');
      return;
    }
    if (!validate()) return;

    setLoading(true);
    try {
      // 1. Re-authenticate user
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // 2. Update to new password
      await updatePassword(currentUser, newPassword);

      Alert.alert('Thành công', 'Đổi mật khẩu tài khoản thành công!');
      
      // Reset fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});
      onClose();
    } catch (error: any) {
      console.error('Change password error:', error);
      if (error.code === 'auth/wrong-password') {
        setErrors(prev => ({ ...prev, currentPassword: 'Mật khẩu hiện tại không chính xác' }));
        Alert.alert('Sai mật khẩu', 'Mật khẩu hiện tại của bạn nhập vào không chính xác. Vui lòng kiểm tra lại.');
      } else {
        Alert.alert('Thất bại', error.message || 'Không thể đổi mật khẩu lúc này. Vui lòng thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Đổi mật khẩu">
      <View style={styles.container}>
        {isGoogleUser ? (
          <View style={styles.googleTipBox}>
            <Text style={styles.googleTipText}>
              🔒 Tài khoản của bạn được liên kết và đăng nhập thông qua Google. Bạn không cần đổi mật khẩu trực tiếp trên SnapOn.
            </Text>
            <Button title="Đóng lại" variant="outline" onPress={onClose} style={styles.closeBtn} />
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.descText}>
              Vui lòng nhập mật khẩu hiện tại để xác minh danh tính, sau đó thiết lập mật khẩu mới cho tài khoản.
            </Text>

            <Input
              label="Mật khẩu hiện tại"
              placeholder="Nhập mật khẩu hiện tại của bạn"
              value={currentPassword}
              onChangeText={(t) => { setCurrentPassword(t); if (errors.currentPassword) setErrors(p => ({ ...p, currentPassword: undefined })); }}
              secureTextEntry
              error={errors.currentPassword}
            />

            <Input
              label="Mật khẩu mới"
              placeholder="Tối thiểu 6 ký tự"
              value={newPassword}
              onChangeText={(t) => { setNewPassword(t); if (errors.newPassword) setErrors(p => ({ ...p, newPassword: undefined })); }}
              secureTextEntry
              error={errors.newPassword}
            />

            <Input
              label="Xác nhận mật khẩu mới"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); if (errors.confirmPassword) setErrors(p => ({ ...p, confirmPassword: undefined })); }}
              secureTextEntry
              error={errors.confirmPassword}
            />

            <View style={styles.modalButtons}>
              <Button title="Hủy bỏ" variant="outline" onPress={onClose} style={styles.button} />
              <Button title="Xác nhận đổi" onPress={handleChangePassword} loading={loading} style={styles.button} />
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingBottom: 8,
  },
  descText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  form: {
    width: '100%',
  },
  googleTipBox: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    gap: 16,
  },
  googleTipText: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
  },
  closeBtn: {
    width: '100%',
    borderColor: Colors.primary,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
  },
});
