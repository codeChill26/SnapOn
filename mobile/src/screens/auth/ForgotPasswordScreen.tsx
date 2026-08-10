import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Alert, StatusBar, TouchableOpacity,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { authService } from '../../services/authService';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, Spacing, Radius, Typography } from '../../theme';

type ForgotPasswordNavProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

export const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<ForgotPasswordNavProp>();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validate = (): boolean => {
    if (!email.trim()) {
      setError('Vui lòng nhập email');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Địa chỉ email không hợp lệ');
      return false;
    }
    setError('');
    return true;
  };

  const handleSendOTP = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const response = await authService.forgotPassword(email.trim());
      
      // If OTP debug mode is enabled, display the OTP for testing
      if (response.debugOtp) {
        Alert.alert(
          'Đã gửi OTP (Chế độ Test)',
          `Nếu tài khoản tồn tại, hệ thống đã gửi OTP.\nMã OTP giả lập của bạn là: ${response.debugOtp}`,
          [
            {
              text: 'Tiếp tục',
              onPress: () => navigation.navigate('VerifyOTP', { email: email.trim() }),
            }
          ]
        );
      } else {
        Alert.alert(
          'Gửi OTP thành công',
          'Vui lòng kiểm tra hộp thư đến của email để nhận mã OTP xác thực.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('VerifyOTP', { email: email.trim() }),
            }
          ]
        );
      }
    } catch (err: any) {
      console.error('Forgot password send OTP error:', err);
      const errMsg = err.response?.data?.message || 'Không thể gửi mã OTP. Vui lòng thử lại sau.';
      Alert.alert('Lỗi', errMsg);
    } finally {
      setLoading(false);
    }
  };

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
            <Ionicons name="mail-unread-outline" size={48} color="#FF6600" />
          </View>

          <Text style={styles.title}>Quên mật khẩu?</Text>
          <Text style={styles.subtitle}>
            Nhập email tài khoản của bạn để hệ thống gửi mã xác minh OTP đặt lại mật khẩu mới.
          </Text>

          <Input
            label="Địa chỉ Email"
            placeholder="example@gmail.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (error) setError('');
            }}
            error={error}
            keyboardType="email-address"
            autoCapitalize="none"
            lightMode={true}
            leftIcon={<Ionicons name="mail-outline" size={20} color="#94A3B8" />}
          />

          <Button
            title="Gửi mã OTP"
            onPress={handleSendOTP}
            loading={loading}
            disabled={!email.trim()}
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
  button: {
    marginTop: Spacing.md,
  },
});
