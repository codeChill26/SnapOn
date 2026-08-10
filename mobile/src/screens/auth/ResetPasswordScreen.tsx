import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Alert, StatusBar, TouchableOpacity,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { authService } from '../../services/authService';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, Spacing, Radius, Typography } from '../../theme';

type ResetPasswordRouteProp = RouteProp<AuthStackParamList, 'ResetPassword'>;
type ResetPasswordNavProp = NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;

export const ResetPasswordScreen: React.FC = () => {
  const navigation = useNavigation<ResetPasswordNavProp>();
  const route = useRoute<ResetPasswordRouteProp>();
  const { resetToken } = route.params;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    let isValid = true;

    if (!password) {
      newErrors.password = 'Vui lòng nhập mật khẩu mới';
      isValid = false;
    } else if (password.length < 8) {
      newErrors.password = 'Mật khẩu mới phải có tối thiểu 8 ký tự';
      isValid = false;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới';
      isValid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không trùng khớp';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleResetPassword = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      console.log('[Reset Screen] Triggering password reset with token:', resetToken);
      const response = await authService.resetPassword(resetToken, password);
      console.log('[Reset Screen] Success response:', response);

      Alert.alert(
        'Đặt lại mật khẩu thành công',
        'Mật khẩu của bạn đã được đặt lại thành công. Vui lòng đăng nhập lại bằng mật khẩu mới.',
        [
          {
            text: 'Đăng nhập',
            onPress: () => navigation.navigate('Login'),
          }
        ]
      );
    } catch (err: any) {
      console.error('Reset password screen error:', err);
      const errMsg = err.response?.data?.message || 'Không thể đặt lại mật khẩu. Liên kết đã hết hạn hoặc không hợp lệ.';
      Alert.alert('Đặt lại thất bại', errMsg);
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
            <Ionicons name="lock-open-outline" size={48} color="#FF6600" />
          </View>

          <Text style={styles.title}>Đặt lại mật khẩu</Text>
          <Text style={styles.subtitle}>
            Nhập mật khẩu mới cho tài khoản của bạn. Mật khẩu phải có độ dài ít nhất 8 ký tự.
          </Text>

          <Input
            label="Mật khẩu mới"
            placeholder="Tối thiểu 8 ký tự"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
            }}
            error={errors.password}
            secureTextEntry={!showPassword}
            lightMode={true}
            leftIcon={<Ionicons name="lock-closed-outline" size={20} color="#94A3B8" />}
            rightIcon={
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#94A3B8"
              />
            }
            onRightIconPress={() => setShowPassword(!showPassword)}
          />

          <Input
            label="Xác nhận mật khẩu mới"
            placeholder="Nhập lại mật khẩu mới"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: undefined }));
            }}
            error={errors.confirmPassword}
            secureTextEntry={!showConfirmPassword}
            lightMode={true}
            leftIcon={<Ionicons name="lock-closed-outline" size={20} color="#94A3B8" />}
            rightIcon={
              <Ionicons
                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#94A3B8"
              />
            }
            onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
          />

          <Button
            title="Đổi mật khẩu"
            onPress={handleResetPassword}
            loading={loading}
            disabled={!password || !confirmPassword}
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
