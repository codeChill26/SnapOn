import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, StatusBar, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { AppColors } from '../../theme';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

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
        Alert.alert(
          'Tài khoản đã tồn tại',
          'Email này đã được đăng ký. Nếu tài khoản của bạn chưa được xác thực, vui lòng đăng nhập để nhận mã xác thực mới.',
          [
            { text: 'Hủy', style: 'cancel' },
            { text: 'Đăng nhập', onPress: () => navigation.navigate('Login') }
          ]
        );
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

  const isButtonDisabled = !name.trim() || !email.trim() || !password || !confirmPassword;

  return (
    <LinearGradient
      colors={['#FF6600', '#FF8C42', '#FFF9F6', '#FFFFFF']}
      locations={[0.0, 0.25, 0.6, 1.0]}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#FF6600" />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header animated entrance */}
          <Animated.View 
            entering={FadeInDown.duration(450).delay(50)}
            style={styles.header}
          >
            <Text style={styles.logoText}>
              <Text style={styles.logoSnap}>Snap</Text>
              <Text style={styles.logoOn}>On</Text>
            </Text>
            <Text style={styles.subtitle}>Tham gia SnapOn ngay hôm nay</Text>
          </Animated.View>

          {/* Form container card animated entrance */}
          <Animated.View 
            entering={FadeInUp.duration(500).delay(150)}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>Tạo tài khoản</Text>
            <Text style={styles.cardSubtitle}>Điền các thông tin dưới đây</Text>

            <Input
              label="Họ và tên *"
              placeholder="Nhập họ và tên (ít nhất 2 ký tự)"
              value={name}
              onChangeText={(t) => { setName(t); clearError('name'); }}
              error={errors.name}
              autoCapitalize="words"
              lightMode={true}
            />

            <Input
              label="Email *"
              placeholder="Nhập email"
              value={email}
              onChangeText={(t) => { setEmail(t); clearError('email'); }}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              lightMode={true}
            />

            <Input
              label="Số điện thoại"
              placeholder="VD: 0912345678 (không bắt buộc)"
              value={phone}
              onChangeText={(t) => { setPhone(t); clearError('phone'); }}
              keyboardType="phone-pad"
              maxLength={10}
              error={errors.phone}
              lightMode={true}
            />

            <Input
              label="Mật khẩu *"
              placeholder="Ít nhất 6 ký tự"
              value={password}
              onChangeText={(t) => { setPassword(t); clearError('password'); if (errors.confirmPassword && t === confirmPassword) clearError('confirmPassword'); }}
              secureTextEntry
              error={errors.password}
              lightMode={true}
            />

            <Input
              label="Xác nhận mật khẩu *"
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); clearError('confirmPassword'); }}
              secureTextEntry
              error={errors.confirmPassword}
              lightMode={true}
            />

            <Button
              title="Đăng ký"
              onPress={handleRegister}
              loading={loading}
              disabled={isButtonDisabled}
              size="lg"
              style={styles.registerButton}
            />

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Đã có tài khoản? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Đăng nhập</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoText: {
    fontSize: 40,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  logoSnap: {
    color: '#FFFFFF',
  },
  logoOn: {
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: 6,
    opacity: 0.95,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#FF6600',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    width: '100%',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
  },
  registerButton: {
    marginTop: 16,
    marginBottom: 20,
    backgroundColor: '#FF6600',
    shadowColor: '#FF6600',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  loginText: {
    fontSize: 14,
    color: '#64748B',
  },
  loginLink: {
    color: '#FF6600',
    fontWeight: '700',
    fontSize: 14,
  },
});
