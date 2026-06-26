import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, StatusBar } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { AppColors } from '../../theme';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { signInWithEmailAndPassword, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../../services/firebase';
import Config from '../../constants/config';

type LoginNavProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

interface Errors {
  email?: string;
  password?: string;
}

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginNavProp>();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const clearError = (field: keyof Errors) => {
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const e: Errors = {};
    if (!email.trim()) e.email = 'Vui lòng nhập email';
    else if (!isValidEmail(email)) e.email = 'Địa chỉ email không hợp lệ';
    if (!password) e.password = 'Vui lòng nhập mật khẩu';
    else if (password.length < 6) e.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const idToken = await userCredential.user.getIdToken();
      await login(idToken);
    } catch (error: any) {
      if (
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/invalid-credential'
      ) {
        setErrors({ email: ' ', password: 'Email hoặc mật khẩu không chính xác' });
      } else if (error.code === 'auth/invalid-email') {
        setErrors(prev => ({ ...prev, email: 'Địa chỉ email không hợp lệ' }));
      } else if (error.code === 'auth/too-many-requests') {
        Alert.alert('Đăng nhập thất bại', 'Quá nhiều lần thử. Vui lòng thử lại sau ít phút.');
      } else {
        Alert.alert('Đăng nhập thất bại', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { GoogleSignin, isSuccessResponse } = require('@react-native-google-signin/google-signin');
      GoogleSignin.configure({ webClientId: Config.FIREBASE.webClientId });
      await GoogleSignin.hasPlayServices();
      const signInResult = await GoogleSignin.signIn();
      if (!isSuccessResponse(signInResult)) {
        throw new Error('Đăng nhập Google không thành công hoặc bị hủy.');
      }
      const idToken = signInResult.data.idToken;
      if (!idToken) throw new Error('Không lấy được Google ID Token.');
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const firebaseToken = await userCredential.user.getIdToken();
      await login(firebaseToken);
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      if (
        (error.message && error.message.includes('RNGoogleSignin')) ||
        (error.message && error.message.includes('TurboModuleRegistry'))
      ) {
        Alert.alert(
          'Chế độ Phát triển (Expo Go)',
          'Không tìm thấy module Google Native. Bạn có muốn sử dụng tài khoản Google giả lập để test tiếp luồng API backend không?',
          [
            { text: 'Hủy', style: 'cancel' },
            {
              text: 'Đồng ý (Test Google)',
              onPress: async () => {
                setLoading(true);
                try {
                  const testEmail = 'developer-google@example.com';
                  const mockToken = `mock-firebase-token:${testEmail}`;
                  await login(mockToken);
                  Alert.alert('Thành công', 'Đăng nhập Google giả lập thành công!');
                } catch (e: any) {
                  Alert.alert('Lỗi', e.message || 'Đăng nhập giả lập thất bại');
                } finally {
                  setLoading(false);
                }
              },
            },
          ]
        );
        return;
      }
      let errorMsg = error.message;
      if (error.code === '12501') errorMsg = 'Đăng nhập Google đã bị hủy.';
      else if (error.code === '7') errorMsg = 'Lỗi kết nối mạng.';
      Alert.alert('Đăng nhập thất bại', errorMsg);
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
          <Text style={styles.logoText}>
            <Text style={styles.logoSnap}>Snap</Text>
            <Text style={styles.logoOn}>On</Text>
          </Text>
          <Text style={styles.subtitle}>Kết nối việc làm, dễ dàng hơn</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Email"
            placeholder="Nhập email của bạn"
            value={email}
            onChangeText={(t) => { setEmail(t); clearError('email'); clearError('password'); }}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email?.trim() ? errors.email : undefined}
          />

          <Input
            label="Mật khẩu"
            placeholder="Nhập mật khẩu"
            value={password}
            onChangeText={(t) => { setPassword(t); clearError('password'); }}
            secureTextEntry
            error={errors.password}
          />

          <Button
            title="Đăng nhập"
            onPress={handleLogin}
            loading={loading}
            size="lg"
            style={styles.loginButton}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>HOẶC</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            title="Đăng nhập với Google"
            onPress={handleGoogleLogin}
            loading={loading}
            variant="outline"
            size="lg"
          />

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Chưa có tài khoản? </Text>
            <Button
              title="Đăng ký"
              onPress={() => navigation.navigate('Register')}
              variant="ghost"
              size="sm"
              textStyle={styles.registerLink}
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
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '800',
  },
  logoSnap: {
    color: AppColors.brand.primary,
  },
  logoOn: {
    color: AppColors.text.primary,
  },
  subtitle: {
    fontSize: 15,
    color: AppColors.text.muted,
    marginTop: 8,
  },
  form: {
    flex: 1,
  },
  loginButton: {
    marginTop: 8,
    marginBottom: 24,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: AppColors.border.subtle,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    color: AppColors.text.disabled,
    fontWeight: '600',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  registerText: {
    fontSize: 14,
    color: AppColors.text.secondary,
  },
  registerLink: {
    color: AppColors.brand.primary,
    fontWeight: '700',
    fontSize: 14,
  },
});
