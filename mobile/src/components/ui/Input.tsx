import React, { useState } from 'react';
import {
  View,
  TextInput as RNInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { AppColors, Spacing, Radius, Typography } from '../../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputFocused,
          error && styles.inputError,
        ]}
      >
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
        <RNInput
          style={[
            styles.input,
            leftIcon ? { paddingLeft: Spacing.sm } : {},
            rightIcon ? { paddingRight: Spacing.sm } : {},
            style,
          ]}
          placeholderTextColor={AppColors.text.muted}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
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
    color: AppColors.text.secondary,
    marginBottom: Spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface.input,
    borderWidth: 1.5,
    borderColor: AppColors.border.subtle,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
  },
  inputFocused: {
    borderColor: AppColors.brand.primary,
  },
  inputError: {
    borderColor: AppColors.status.error,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: Typography.body.fontSize + 1,
    color: AppColors.text.primary,
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
