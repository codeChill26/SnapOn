import React, { useState } from 'react';
import {
  View,
  TextInput as RNInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { AppColors, Spacing, Radius, Typography } from '../../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  lightMode?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  lightMode = false,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, lightMode ? styles.labelLight : styles.labelDark]}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputContainer,
          lightMode ? styles.inputContainerLight : styles.inputContainerDark,
          isFocused && (lightMode ? styles.inputFocusedLight : styles.inputFocusedDark),
          error && styles.inputError,
        ]}
      >
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
        <RNInput
          style={[
            styles.input,
            lightMode ? styles.inputLight : styles.inputDark,
            props.secureTextEntry && Platform.OS === 'ios' ? { fontFamily: 'System' } : {},
            leftIcon ? { paddingLeft: Spacing.sm } : {},
            rightIcon ? { paddingRight: Spacing.sm } : {},
            style,
          ]}
          placeholderTextColor={lightMode ? '#94A3B8' : AppColors.text.muted}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus && props.onFocus(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur && props.onBlur(e);
          }}
          autoCorrect={false}
          spellCheck={false}
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity
            style={styles.iconRight}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  labelDark: {
    color: AppColors.text.secondary,
  },
  labelLight: {
    color: '#475569', // slate-600
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
  },
  inputContainerDark: {
    backgroundColor: AppColors.surface.input,
    borderColor: AppColors.border.subtle,
  },
  inputContainerLight: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  inputFocusedDark: {
    borderColor: AppColors.brand.primary,
  },
  inputFocusedLight: {
    borderColor: '#FF6600',
  },
  inputError: {
    borderColor: AppColors.status.error,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: Typography.body.fontSize + 1,
  },
  inputDark: {
    color: AppColors.text.primary,
  },
  inputLight: {
    color: '#0F172A', // slate-900
  },
  iconLeft: {
    marginRight: Spacing.sm,
  },
  iconRight: {
    marginLeft: Spacing.sm,
    padding: Spacing.xs,
  },
  errorText: {
    fontSize: Typography.caption.fontSize,
    color: AppColors.status.error,
    marginTop: Spacing.xs,
  },
});
