import React from 'react';
import { View, Text, Image, ScrollView, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { SelectedImage } from '../hooks/usePostJob';

interface PostJobMediaTagsProps {
  selectedImages: SelectedImage[];
  removeImage: (index: number) => void;
  pickImages: () => void;
  hashtagInput: string;
  setHashtagInput: (text: string) => void;
  addHashtag: () => void;
  hashtags: string[];
  removeHashtag: (tag: string) => void;
}

export const PostJobMediaTags: React.FC<PostJobMediaTagsProps> = ({
  selectedImages,
  removeImage,
  pickImages,
  hashtagInput,
  setHashtagInput,
  addHashtag,
  hashtags,
  removeHashtag,
}) => {
  const theme = useTheme();

  return (
    <View>
      {/* IMAGE PICKER */}
      <View style={[styles.section, { marginBottom: theme.spacing.lg }]}>
        <Text style={[styles.sectionLabel, { color: theme.colors.text.primary, marginBottom: theme.spacing.xs }]}>
          Hình ảnh minh họa (Tối đa 5 ảnh)
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
          {selectedImages.map((img, index) => (
            <View key={index} style={[styles.imageContainer, { marginRight: theme.spacing.sm }]}>
              <Image source={{ uri: img.uri }} style={[styles.imagePreview, { borderRadius: theme.radius.small }]} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => removeImage(index)}
                accessibilityRole="button"
                accessibilityLabel={`Xóa ảnh thứ ${index + 1}`}
              >
                <Ionicons name="close-circle" size={20} color={theme.colors.status.error} />
              </TouchableOpacity>
            </View>
          ))}
          {selectedImages.length < 5 && (
            <TouchableOpacity
              style={[
                styles.uploadPlaceholder,
                {
                  borderColor: theme.colors.border.subtle,
                  borderRadius: theme.radius.small,
                },
              ]}
              onPress={pickImages}
              accessibilityRole="button"
              accessibilityLabel="Tải ảnh lên minh họa"
            >
              <Ionicons name="camera-outline" size={28} color={theme.colors.text.secondary} />
              <Text style={{ color: theme.colors.text.secondary, fontSize: 11, marginTop: 4 }}>Thêm ảnh</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* HASHTAGS */}
      <View style={[styles.section, { marginBottom: theme.spacing.lg }]}>
        <Text style={[styles.sectionLabel, { color: theme.colors.text.primary }]}>Hashtags</Text>
        <View style={[styles.hashtagInputRow, { gap: theme.spacing.xs, marginBottom: theme.spacing.sm }]}>
          <TextInput
            style={[
              styles.hashtagInput,
              {
                backgroundColor: theme.colors.background.secondary,
                borderColor: theme.colors.border.subtle,
                borderRadius: theme.radius.small,
                color: theme.colors.text.primary,
                paddingHorizontal: theme.spacing.md,
              },
            ]}
            placeholder="Thêm hashtag (nhấn Thêm)"
            placeholderTextColor={theme.colors.text.muted}
            value={hashtagInput}
            onChangeText={setHashtagInput}
            onSubmitEditing={addHashtag}
            accessibilityLabel="Nhập hashtag"
          />
          <TouchableOpacity
            style={[styles.hashtagAddBtn, { backgroundColor: theme.colors.brand.primary, borderRadius: theme.radius.small }]}
            onPress={addHashtag}
            accessibilityRole="button"
            accessibilityLabel="Thêm hashtag hiện tại"
          >
            <Text style={styles.hashtagAddText}>Thêm</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.hashtagChipsRow, { gap: theme.spacing.xs }]}>
          {hashtags.map((tag) => (
            <View
              key={tag}
              style={[
                styles.hashtagChip,
                {
                  backgroundColor: theme.colors.brand.primarySoft,
                  borderRadius: theme.radius.small,
                  paddingHorizontal: theme.spacing.sm,
                  paddingVertical: theme.spacing.xs,
                  gap: theme.spacing.xs,
                },
              ]}
            >
              <Text style={[styles.hashtagChipText, { color: theme.colors.brand.primaryDark }]}>#{tag}</Text>
              <TouchableOpacity onPress={() => removeHashtag(tag)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Xóa hashtag ${tag}`}>
                <Ionicons name="close-circle" size={14} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {},
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  imageScroll: {
    flexDirection: 'row',
  },
  imageContainer: {
    position: 'relative',
    width: 80,
    height: 80,
  },
  imagePreview: {
    width: 80,
    height: 80,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    zIndex: 10,
  },
  uploadPlaceholder: {
    width: 80,
    height: 80,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hashtagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hashtagInput: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    fontSize: 13,
    fontWeight: '600',
  },
  hashtagAddBtn: {
    width: 68,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hashtagAddText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  hashtagChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  hashtagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  hashtagChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
