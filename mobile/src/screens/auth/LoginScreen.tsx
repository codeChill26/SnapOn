import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, StatusBar, TouchableOpacity } from 'react-native';
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
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

type LoginNavProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

interface Errors {
  email?: string;
  password?: string;
}

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginNavProp>();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRememberMe, setIsRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  // Auto-fill credentials on mount if Remember Me is active
  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const savedEmail = await SecureStore.getItemAsync('snapon_remembered_email');
        const savedPassword = await SecureStore.getItemAsync('snapon_remembered_password');
        if (savedEmail && savedPassword) {
          setEmail(savedEmail);
          setPassword(savedPassword);
          setIsRememberMe(true);
        }
      } catch (err) {
        console.error('Failed to load secure store credentials:', err);
      }
    };
    loadCredentials();
  }, []);

  const clearError = (field: keyof Errors) => {
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const e: Errors = {};
    if (!email.trim()) e.email = 'Vui lòng nhập email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Địa chỉ email không hợp lệ';
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

      // Save or clear secure credentials based on remember state
      if (isRememberMe) {
        await SecureStore.setItemAsync('snapon_remembered_email', email.trim());
        await SecureStore.setItemAsync('snapon_remembered_password', password);
      } else {
        await SecureStore.deleteItemAsync('snapon_remembered_email');
        await SecureStore.deleteItemAsync('snapon_remembered_password');
      }
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

  const isButtonDisabled = !email.trim() || !password;

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
            <Text style={styles.subtitle}>Kết nối việc làm, dễ dàng hơn</Text>
          </Animated.View>

          {/* Form container card animated entrance */}
          <Animated.View 
            entering={FadeInUp.duration(500).delay(150)}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>Chào mừng trở lại</Text>
            <Text style={styles.cardSubtitle}>Đăng nhập để tiếp tục</Text>

            <Input
              label="Email"
              placeholder="Nhập email của bạn"
              value={email}
              onChangeText={(t) => { setEmail(t); clearError('email'); clearError('password'); }}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email?.trim() ? errors.email : undefined}
              lightMode={true}
            />

            <Input
              label="Mật khẩu"
              placeholder="Nhập mật khẩu"
              value={password}
              onChangeText={(t) => { setPassword(t); clearError('password'); }}
              secureTextEntry
              error={errors.password}
              lightMode={true}
            />

            {/* Custom Remember Me Checkbox */}
            <View style={styles.rememberMeContainer}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setIsRememberMe(prev => !prev)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isRememberMe ? "checkbox" : "square-outline"}
                  size={20}
                  color={isRememberMe ? "#FF6600" : "#64748B"}
                />
                <Text style={styles.rememberMeText}>Lưu mật khẩu</Text>
              </TouchableOpacity>
            </View>

            <Button
              title="Đăng nhập"
              onPress={handleLogin}
              loading={loading}
              disabled={isButtonDisabled}
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
              icon={<Ionicons name="logo-google" size={20} color="#FF6600" style={{ marginRight: 8 }} />}
              textStyle={styles.googleButtonText}
              style={styles.googleButton}
            />

            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Chưa có tài khoản? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerLink}>Đăng ký ngay</Text>
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
    marginBottom: 28,
  },
  logoText: {
    fontSize: 44,
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
    fontSize: 16,
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
    marginBottom: 24,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberMeText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  loginButton: {
    marginTop: 10,
    marginBottom: 20,
    backgroundColor: '#FF6600',
    shadowColor: '#FF6600',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  googleButton: {
    borderColor: '#FF6600',
  },
  googleButtonText: {
    color: '#FF6600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '700',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  registerText: {
    fontSize: 14,
    color: '#64748B',
  },
  registerLink: {
    color: '#FF6600',
    fontWeight: '700',
    fontSize: 14,
  },
});
