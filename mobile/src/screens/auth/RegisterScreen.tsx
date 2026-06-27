import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, Alert, StatusBar, Image, TouchableOpacity,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

type RegisterNavProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isValidPhone  = (v: string) => /^(0[3|5|7|8|9])[0-9]{8}$/.test(v.trim());

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
        setErrors(prev => ({ ...prev, email: 'Email này đã được đăng ký tài khoản.' }));
      } else if (error.code === 'auth/invalid-email') {
        setErrors(prev => ({ ...prev, email: 'Địa chỉ email không hợp lệ.' }));
      } else if (error.code === 'auth/weak-password') {
        setErrors(prev => ({ ...prev, password: 'Mật khẩu quá yếu (phải chứa ít nhất 6 ký tự).' }));
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Orange accent bar */}
        <View style={styles.topAccent} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>

          <View style={styles.logoRow}>
            <Image
              source={require('../../../assets/LogoSub.jpg')}
              style={styles.logoIcon}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.headerTitle}>Tạo tài khoản</Text>
              <Text style={styles.headerSub}>Tham gia cộng đồng SnapOn</Text>
            </View>
          </View>
        </View>

        {/* Form */}
        <View style={styles.card}>
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
            onChangeText={(t) => {
              setPassword(t);
              clearError('password');
              if (errors.confirmPassword && t === confirmPassword) clearError('confirmPassword');
            }}
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
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Đã có tài khoản?</Text>
          <Button
            title="Đăng nhập"
            onPress={() => navigation.navigate('Login')}
            variant="ghost"
            size="sm"
            textStyle={styles.footerLink}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const ORANGE = '#FF6B35';
const NAVY  = '#1A2B6D';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },

  topAccent: {
    height: 4,
    backgroundColor: ORANGE,
  },

  /* Header */
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 16 : 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7F9FC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logoIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8ECF2',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },

  /* Form card */
  card: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  registerButton: {
    marginTop: 4,
  },

  /* Footer */
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#64748B',
  },
  footerLink: {
    color: ORANGE,
    fontWeight: '700',
    fontSize: 14,
  },
});
