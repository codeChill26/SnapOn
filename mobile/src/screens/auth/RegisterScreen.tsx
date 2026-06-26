import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, StatusBar } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { AppColors } from '../../theme';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';

type RegisterNavProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isValidPhone = (v: string) => /^(0[3|5|7|8|9])[0-9]{8}$/.test(v.trim());

interface Errors {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
}

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<RegisterNavProp>();
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const clearError = (field: keyof Errors) => {
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const e: Errors = {};
    if (!name.trim() || name.trim().length < 2) e.name = 'Họ và tên phải có ít nhất 2 ký tự';
    if (!email.trim()) e.email = 'Vui lòng nhập email';
    else if (!isValidEmail(email)) e.email = 'Địa chỉ email không hợp lệ';
    if (phone.trim() && !isValidPhone(phone)) e.phone = 'Số điện thoại không hợp lệ (VD: 0912345678)';
    if (!password) e.password = 'Vui lòng nhập mật khẩu';
    else if (password.length < 6) e.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    if (password !== confirmPassword) e.confirmPassword = 'Mật khẩu xác nhận không khớp';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: name.trim() });
      }
      const idToken = await userCredential.user.getIdToken();
      await login(idToken);
      Alert.alert('Thành công', 'Đăng ký tài khoản thành công!');
    } catch (error: any) {
      let errorMsg = error.message;
      if (error.code === 'auth/email-already-in-use') {
        errorMsg = 'Email này đã được đăng ký tài khoản.';
        setErrors(prev => ({ ...prev, email: errorMsg }));
      } else if (error.code === 'auth/invalid-email') {
        errorMsg = 'Địa chỉ email không hợp lệ.';
        setErrors(prev => ({ ...prev, email: errorMsg }));
      } else if (error.code === 'auth/weak-password') {
        errorMsg = 'Mật khẩu quá yếu (phải chứa ít nhất 6 ký tự).';
        setErrors(prev => ({ ...prev, password: errorMsg }));
      } else {
        Alert.alert('Đăng ký thất bại', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={AppColors.background.primary} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Đăng ký tài khoản</Text>
          <Text style={styles.subtitle}>Tham gia SnapOn ngay hôm nay</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Họ và tên *"
            placeholder="Nhập họ và tên (ít nhất 2 ký tự)"
            value={name}
            onChangeText={(t) => { setName(t); clearError('name'); }}
            error={errors.name}
            autoCapitalize="words"
          />
          <Input
            label="Email *"
            placeholder="Nhập email"
            value={email}
            onChangeText={(t) => { setEmail(t); clearError('email'); }}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />
          <Input
            label="Số điện thoại"
            placeholder="VD: 0912345678 (không bắt buộc)"
            value={phone}
            onChangeText={(t) => { setPhone(t); clearError('phone'); }}
            keyboardType="phone-pad"
            maxLength={10}
            error={errors.phone}
          />
          <Input
            label="Mật khẩu *"
            placeholder="Ít nhất 6 ký tự"
            value={password}
            onChangeText={(t) => { setPassword(t); clearError('password'); if (errors.confirmPassword && t === confirmPassword) clearError('confirmPassword'); }}
            secureTextEntry
            error={errors.password}
          />
          <Input
            label="Xác nhận mật khẩu *"
            placeholder="Nhập lại mật khẩu"
            value={confirmPassword}
            onChangeText={(t) => { setConfirmPassword(t); clearError('confirmPassword'); }}
            secureTextEntry
            error={errors.confirmPassword}
          />

          <Button
            title="Đăng ký"
            onPress={handleRegister}
            loading={loading}
            size="lg"
            style={styles.registerButton}
          />

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Đã có tài khoản? </Text>
            <Button
              title="Đăng nhập"
              onPress={() => navigation.navigate('Login')}
              variant="ghost"
              size="sm"
              textStyle={styles.loginLink}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background.primary,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: AppColors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: AppColors.text.muted,
  },
  form: {
    flex: 1,
  },
  registerButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: AppColors.text.secondary,
  },
  loginLink: {
    color: AppColors.brand.primary,
    fontWeight: '700',
    fontSize: 14,
  },
});
