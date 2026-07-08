import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme';

interface PostJobTypeSelectorProps {
  postType: 'RECRUITMENT' | 'SERVICE_OFFER';
  handlePostTypeChange: (type: 'RECRUITMENT' | 'SERVICE_OFFER') => void;
}

export const PostJobTypeSelector: React.FC<PostJobTypeSelectorProps> = ({
  postType,
  handlePostTypeChange,
}) => {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.postTypeContainer,
        {
          backgroundColor: theme.colors.background.secondary,
          borderColor: theme.colors.border.subtle,
          borderRadius: theme.radius.medium,
          padding: theme.spacing.xs,
          marginBottom: theme.spacing.lg,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.postTypeTab,
          postType === 'RECRUITMENT' && [styles.postTypeTabActive, { backgroundColor: theme.colors.brand.primary }],
        ]}
        onPress={() => handlePostTypeChange('RECRUITMENT')}
        accessibilityState={{ selected: postType === 'RECRUITMENT' }}
        accessibilityRole="button"
        accessibilityLabel="Đăng tuyển dụng tìm người"
      >
        <Text
          style={[
            styles.postTypeTabText,
            { color: theme.colors.text.secondary },
            postType === 'RECRUITMENT' && [styles.postTypeTabTextActive, { color: theme.colors.text.inverse }],
          ]}
        >
          Đăng tuyển dụng
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.postTypeTab,
          postType === 'SERVICE_OFFER' && [styles.postTypeTabActive, { backgroundColor: theme.colors.brand.primary }],
        ]}
        onPress={() => handlePostTypeChange('SERVICE_OFFER')}
        accessibilityState={{ selected: postType === 'SERVICE_OFFER' }}
        accessibilityRole="button"
        accessibilityLabel="Đăng bài dịch vụ thuê tôi"
      >
        <Text
          style={[
            styles.postTypeTabText,
            { color: theme.colors.text.secondary },
            postType === 'SERVICE_OFFER' && [styles.postTypeTabTextActive, { color: theme.colors.text.inverse }],
          ]}
        >
          Đăng bài Thuê tôi
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  postTypeContainer: {
    flexDirection: 'row',
    borderWidth: 1,
  },
  postTypeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  postTypeTabActive: {},
  postTypeTabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  postTypeTabTextActive: {
    fontWeight: '800',
  },
});
