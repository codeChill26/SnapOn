import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Alert, StatusBar, Image, TouchableOpacity,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { signInWithEmailAndPassword, signInWithCredential, GoogleAuthProvider, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../services/firebase';
import Config from '../../constants/config';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

type LoginNavProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const ORANGE = '#FF6B35';
const NAVY   = '#1A2B6D';

interface Errors {
  email?: string;
  password?: string;
}

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginNavProp>();
  const { login } = useAuth();
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [isRememberMe, setRememberMe] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [errors, setErrors]         = useState<Errors>({});

  // Restore saved credentials on mount (Remember Me)
  useEffect(() => {
    (async () => {
      try {
        const savedEmail    = await SecureStore.getItemAsync('snapon_remembered_email');
        const savedPassword = await SecureStore.getItemAsync('snapon_remembered_password');
        if (savedEmail && savedPassword) {
          setEmail(savedEmail);
          setPassword(savedPassword);
          setRememberMe(true);
        }
      } catch {}
    })();
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

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const idToken        = await userCredential.user.getIdToken();
      await login(idToken);

      if (isRememberMe) {
        await SecureStore.setItemAsync('snapon_remembered_email', email.trim());
        await SecureStore.setItemAsync('snapon_remembered_password', password);
      } else {
        await SecureStore.deleteItemAsync('snapon_remembered_email');
        await SecureStore.deleteItemAsync('snapon_remembered_password');
      }
    } catch (error: any) {
      if (['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential'].includes(error.code)) {
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
      if (!isSuccessResponse(signInResult)) throw new Error('Đăng nhập Google không thành công.');
      const idToken     = signInResult.data.idToken;
      if (!idToken)     throw new Error('Không lấy được Google ID Token.');
      const credential  = GoogleAuthProvider.credential(idToken);
      const uc          = await signInWithCredential(auth, credential);
      await login(await uc.user.getIdToken());
    } catch (error: any) {
      if (error.message?.includes('RNGoogleSignin') || error.message?.includes('TurboModuleRegistry')) {
        Alert.alert(
          'Chế độ Phát triển (Expo Go)',
          'Đăng nhập Google Native yêu cầu chạy bằng Development Build thay vì Expo Go.'
        );
        return;
      }
      const msg =
        error.code === '12501' ? 'Đăng nhập Google đã bị hủy.' :
        error.code === '7'     ? 'Lỗi kết nối mạng.' :
        error.message;
      Alert.alert('Đăng nhập thất bại', msg);
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFF1EB" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Orange accent bar */}
        <View style={styles.topAccent} />

        {/* Hero: mascot + branding */}
        <View style={styles.heroSection}>
          <Image
            source={require('../../../assets/mascot_main.png')}
            style={styles.mascotMain}
            resizeMode="contain"
          />
          <View style={styles.heroBranding}>
            <Image
              source={require('../../../assets/LogoMain.jpg')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>Kết nối việc làm{'\n'}tức thì</Text>
            <View style={styles.pillRow}>
              {['⚡ Nhanh gọn', '✓ Tin cậy', '★ Hiệu quả'].map(label => (
                <View key={label} style={styles.pill}>
                  <Text style={styles.pillText}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Đăng nhập</Text>

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

           {/* Remember Me & Forgot Password */}
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.rememberMeRow}
              onPress={() => setRememberMe(p => !p)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isRememberMe ? 'checkbox' : 'square-outline'}
                size={20}
                color={isRememberMe ? ORANGE : '#64748B'}
              />
              <Text style={styles.rememberMeText}>Lưu mật khẩu</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleForgotPassword}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
            </TouchableOpacity>
          </View>

          <Button
            title="Đăng nhập"
            onPress={handleLogin}
            loading={loading}
            disabled={isButtonDisabled}
            size="lg"
            style={styles.primaryButton}
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
            icon={<Ionicons name="logo-google" size={20} color={ORANGE} style={{ marginRight: 8 }} />}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Image
            source={require('../../../assets/mascot_phone.png')}
            style={styles.mascotPhone}
            resizeMode="contain"
          />
          <View style={styles.footerLinks}>
            <Text style={styles.footerText}>Chưa có tài khoản?</Text>
            <Button
              title="Đăng ký ngay"
              onPress={() => navigation.navigate('Register')}
              variant="ghost"
              size="sm"
              textStyle={styles.footerLink}
            />
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  topAccent: {
    height: 4,
    backgroundColor: ORANGE,
  },
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1EB',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    gap: 12,
  },
  mascotMain: {
    width: 130,
    height: 148,
  },
  heroBranding: {
    flex: 1,
  },
  logo: {
    width: 150,
    height: 45,
    marginBottom: 10,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '700',
    color: NAVY,
    lineHeight: 19,
    marginBottom: 10,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    backgroundColor: '#FFE4D4',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '600',
    color: ORANGE,
  },
  card: {
    marginHorizontal: 20,
    marginTop: 20,
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
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 20,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  rememberMeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rememberMeText: {
    fontSize: 14,
    color: '#64748B',
  },
  forgotPasswordText: {
    fontSize: 14,
    color: ORANGE,
    fontWeight: '600',
  },
  primaryButton: {
    marginBottom: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8ECF2',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '700',
    letterSpacing: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 24,
  },
  mascotPhone: {
    width: 90,
    height: 97,
  },
  footerLinks: {
    flex: 1,
    alignItems: 'flex-end',
    paddingBottom: 12,
  },
  footerText: {
    fontSize: 13,
    color: '#64748B',
  },
  footerLink: {
    color: ORANGE,
    fontWeight: '700',
    fontSize: 14,
  },
});
