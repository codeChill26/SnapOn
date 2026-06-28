import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { AppColors } from '../../theme';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { storage } from '../../utils/storage';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

export const VerificationScreen: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(60);
  const [error, setError] = useState<string | undefined>(undefined);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startTimer();
    return () => stopTimer();
  }, []);

  const startTimer = () => {
    stopTimer();
    setTimer(60);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          stopTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleVerify = async () => {
    if (code.trim().length !== 6) {
      setError('Mã xác thực phải gồm 6 chữ số');
      return;
    }

    if (!user?.email) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin email của người dùng.');
      return;
    }

    setLoading(true);
    setError(undefined);

    try {
      const response = await authService.verifyEmail(user.email, code.trim());
      if (response.success) {
        // Save the updated verification status and tokens
        await Promise.all([
          storage.setToken(response.accessToken),
          storage.setRefreshToken(response.refreshToken),
          storage.setUserData(response.user),
          ...(response.wallet ? [storage.setWallet(response.wallet)] : [])
        ]);

        // Triggers the AppNavigator state switcher
        updateUser(response.user);
        Alert.alert('Thành công', 'Email của bạn đã được xác minh thành công!');
      } else {
        setError(response.message || 'Mã xác thực không chính xác.');
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra trong quá trình xác thực.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!user?.email) return;

    setResending(true);
    setError(undefined);

    try {
      const response = await authService.resendVerificationEmail(user.email);
      if (response.success) {
        const debugOtp = response.data?.debugOtp;
        Alert.alert(
          'Đã gửi lại mã',
          debugOtp
            ? `Email đang tạm lỗi nên dùng mã debug: ${debugOtp}`
            : 'Mã xác thực mới đã được gửi vào hòm thư của bạn.'
        );
        startTimer();
      } else {
        setError(response.message || 'Gửi lại mã xác thực thất bại.');
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Không thể kết nối đến máy chủ.';
      setError(errorMsg);
    } finally {
      setResending(false);
    }
  };

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
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Animated.View 
            entering={FadeInDown.duration(450).delay(50)}
            style={styles.header}
          >
            <Text style={styles.logoText}>
              <Text style={styles.logoSnap}>Snap</Text>
              <Text style={styles.logoOn}>On</Text>
            </Text>
            <Text style={styles.subtitle}>Bảo mật tài khoản của bạn</Text>
          </Animated.View>

          <Animated.View 
            entering={FadeInUp.duration(500).delay(150)}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>Xác thực Email</Text>
            <Text style={styles.description}>
              Chúng tôi đã gửi mã xác thực gồm 6 chữ số đến hòm thư:
            </Text>
            <Text style={styles.emailText}>{user?.email}</Text>
            <Text style={styles.instruction}>
              Vui lòng kiểm tra hộp thư đến (hoặc thư rác/spam) và nhập mã vào ô dưới đây để kích hoạt tài khoản.
            </Text>

            <Input
              label="Mã xác thực (6 số) *"
              placeholder="Nhập 6 chữ số"
              value={code}
              onChangeText={(t) => {
                setCode(t.replace(/[^0-9]/g, ''));
                setError(undefined);
              }}
              keyboardType="number-pad"
              maxLength={6}
              error={error}
              style={styles.codeInput}
              lightMode={true}
            />

            <Button
              title="Xác nhận"
              onPress={handleVerify}
              loading={loading}
              disabled={code.trim().length !== 6}
              size="lg"
              style={styles.verifyButton}
            />

            <View style={styles.resendRow}>
              {timer > 0 ? (
                <Text style={styles.timerText}>Gửi lại mã sau {timer} giây</Text>
              ) : (
                <TouchableOpacity onPress={handleResend} disabled={resending}>
                  <Text style={styles.resendLink}>
                    {resending ? 'Đang gửi...' : 'Gửi lại mã xác thực'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.footer}>
              <TouchableOpacity onPress={logout}>
                <Text style={styles.logoutText}>Đăng nhập tài khoản khác</Text>
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
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6600',
    textAlign: 'center',
    marginVertical: 8,
  },
  instruction: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
  },
  verifyButton: {
    marginTop: 10,
    marginBottom: 20,
    backgroundColor: '#FF6600',
    shadowColor: '#FF6600',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  timerText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  resendLink: {
    fontSize: 14,
    color: '#FF6600',
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    marginTop: 8,
  },
  logoutText: {
    fontSize: 14,
    color: '#64748B',
    textDecorationLine: 'underline',
  },
});
