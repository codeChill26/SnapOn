import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, Alert, StatusBar, Image,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
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
                  const mockToken = `mock-firebase-token:developer-google@example.com`;
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFF1EB" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top accent bar */}
        <View style={styles.topAccent} />

        {/* ── Hero section ── */}
        <View style={styles.heroSection}>
          {/* Left: mascot chính (thumbs up) */}
          <Image
            source={require('../../../assets/mascot_main.png')}
            style={styles.mascotMain}
            resizeMode="contain"
          />

          {/* Right: logo + tagline + pills */}
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

        {/* ── Form card ── */}
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

          <Button
            title="Đăng nhập"
            onPress={handleLogin}
            loading={loading}
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
          />
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          {/* mascot phone decoration — bottom-right */}
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
    paddingBottom: 32,
  },

  /* accent bar */
  topAccent: {
    height: 4,
    backgroundColor: ORANGE,
  },

  /* ── Hero ── */
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
    alignItems: 'flex-start',
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

  /* ── Card ── */
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
  primaryButton: {
    marginTop: 4,
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

  /* ── Footer ── */
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
