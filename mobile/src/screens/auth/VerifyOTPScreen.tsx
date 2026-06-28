import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Alert, StatusBar, TouchableOpacity, TextInput,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Button } from '../../components/ui/Button';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { authService } from '../../services/authService';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, Spacing, Radius, Typography } from '../../theme';

type VerifyOTPRouteProp = RouteProp<AuthStackParamList, 'VerifyOTP'>;
type VerifyOTPNavProp = NativeStackNavigationProp<AuthStackParamList, 'VerifyOTP'>;

export const VerifyOTPScreen: React.FC = () => {
  const navigation = useNavigation<VerifyOTPNavProp>();
  const route = useRoute<VerifyOTPRouteProp>();
  const { email } = route.params;

  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [resending, setResending] = useState(false);

  const inputRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  // Countdown timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleOtpChange = (text: string, index: number) => {
    const cleanText = text.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    newOtp[index] = cleanText;
    setOtp(newOtp);

    // Auto-focus next input
    if (cleanText !== '' && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Check for backspace key press
    if (e.nativeEvent.key === 'Backspace') {
      if (otp[index] === '' && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs[index - 1].current?.focus();
      }
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      Alert.alert('Nhập OTP', 'Vui lòng nhập đầy đủ mã OTP gồm 6 chữ số.');
      return;
    }

    setLoading(true);
    try {
      console.log(`[Verify Screen] Verifying OTP for ${email}`);
      const response = await authService.verifyForgotPasswordOtp(email, otpCode);
      console.log(`[Verify Screen] OTP valid. Reset token: ${response.resetToken}`);
      
      navigation.navigate('ResetPassword', { resetToken: response.resetToken });
    } catch (err: any) {
      console.error('Verify OTP screen error:', err);
      const errMsg = err.response?.data?.message || 'Mã xác thực không đúng hoặc đã hết hạn.';
      Alert.alert('Xác thực thất bại', errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setResending(true);
    try {
      const response = await authService.forgotPassword(email);
      setTimer(60);
      setOtp(['', '', '', '', '', '']);
      inputRefs[0].current?.focus();

      if (response.debugOtp) {
        Alert.alert(
          'Đã gửi lại OTP (Test)',
          `Nếu tài khoản tồn tại, hệ thống đã gửi OTP mới.\nMã OTP giả lập mới: ${response.debugOtp}`
        );
      } else {
        Alert.alert('Gửi lại OTP', 'Mã OTP mới đã được gửi vào hòm thư của bạn.');
      }
    } catch (err: any) {
      console.error('Resend OTP error:', err);
      const errMsg = err.response?.data?.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại sau.';
      Alert.alert('Lỗi', errMsg);
    } finally {
      setResending(false);
    }
  };

  const isVerifyDisabled = otp.some((val) => val === '');

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
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FF6600" />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark-outline" size={48} color="#FF6600" />
          </View>

          <Text style={styles.title}>Xác minh OTP</Text>
          <Text style={styles.subtitle}>
            Chúng tôi đã gửi mã xác minh gồm 6 số đến email của bạn:
            {'\n'}
            <Text style={styles.emailText}>{email}</Text>
          </Text>

          {/* OTP Grid */}
          <View style={styles.otpGrid}>
            {otp.map((digit, idx) => (
              <TextInput
                key={idx}
                ref={inputRefs[idx]}
                style={styles.otpInput}
                value={digit}
                onChangeText={(text) => handleOtpChange(text, idx)}
                onKeyPress={(e) => handleKeyPress(e, idx)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                textAlign="center"
              />
            ))}
          </View>

          {/* Timer Section */}
          <View style={styles.timerContainer}>
            {timer > 0 ? (
              <Text style={styles.timerText}>
                Gửi lại mã sau <Text style={styles.timerValue}>{timer}s</Text>
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={resending}>
                <Text style={styles.resendText}>
                  {resending ? 'Đang gửi...' : 'Gửi lại mã OTP'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <Button
            title="Xác nhận"
            onPress={handleVerify}
            loading={loading}
            disabled={isVerifyDisabled}
            style={styles.button}
          />
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
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl * 1.5,
    paddingBottom: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg * 1.5,
    padding: Spacing.xl,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 8,
    marginTop: Spacing.md,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.screenTitle.fontSize,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.body.fontSize,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  emailText: {
    fontWeight: '700',
    color: '#0F172A',
  },
  otpGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  otpInput: {
    width: 42,
    height: 50,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.md,
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  timerText: {
    fontSize: Typography.body.fontSize,
    color: '#64748B',
  },
  timerValue: {
    fontWeight: '700',
    color: '#FF6600',
  },
  resendText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: '#FF6600',
    textDecorationLine: 'underline',
  },
  button: {
    marginTop: Spacing.md,
  },
});
