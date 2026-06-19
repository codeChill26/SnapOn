import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Colors } from '../../constants/colors';
import { UserAvatar } from '../common/UserAvatar';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Ionicons } from '@expo/vector-icons';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  initialName: string;
  initialPhone: string;
  initialAvatarUrl: string;
  initialCoverUrl?: string;
  initialBio: string;
  initialHeadline: string;
  initialSkills: string[];
  isSaving: boolean;
  isUploading: boolean;
  isUploadingCover?: boolean;
  onPickImage: () => void;
  onPickCoverImage?: () => void;
  onSave: (data: {
    fullName: string;
    phone: string;
    avatarUrl: string;
    coverUrl?: string;
    bio: string;
    headline: string;
    skills: string[];
  }) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  onClose,
  initialName,
  initialPhone,
  initialAvatarUrl,
  initialCoverUrl = '',
  initialBio,
  initialHeadline,
  initialSkills = [],
  isSaving,
  isUploading,
  isUploadingCover = false,
  onPickImage,
  onPickCoverImage,
  onSave,
}) => {
  const [fullName, setFullName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [coverUrl, setCoverUrl] = useState(initialCoverUrl);
  const [bio, setBio] = useState(initialBio);
  const [headline, setHeadline] = useState(initialHeadline);
  const [skillsText, setSkillsText] = useState('');
  const [skills, setSkills] = useState<string[]>(initialSkills);

  // Sync state with props when modal opens
  useEffect(() => {
    if (visible) {
      setFullName(initialName);
      setPhone(initialPhone);
      setAvatarUrl(initialAvatarUrl);
      setCoverUrl(initialCoverUrl);
      setBio(initialBio);
      setHeadline(initialHeadline);
      setSkills(initialSkills);
      setSkillsText('');
    }
  }, [visible, initialName, initialPhone, initialAvatarUrl, initialCoverUrl, initialBio, initialHeadline, initialSkills]);

  // Sync avatarUrl/coverUrl when upload completes
  useEffect(() => {
    setAvatarUrl(initialAvatarUrl);
  }, [initialAvatarUrl]);

  useEffect(() => {
    setCoverUrl(initialCoverUrl);
  }, [initialCoverUrl]);

  const handleAddSkill = () => {
    const trimmed = skillsText.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillsText('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  const handleSavePress = () => {
    onSave({
      fullName,
      phone,
      avatarUrl,
      coverUrl,
      bio,
      headline,
      skills,
    });
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Chỉnh sửa thông tin">
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Avatar Picker */}
        <View style={styles.avatarPickerContainer}>
          <TouchableOpacity onPress={onPickImage} activeOpacity={0.8} style={styles.avatarTouch} disabled={isUploading}>
            <UserAvatar name={fullName || 'User'} avatarUrl={avatarUrl} size={84} />
            <View style={styles.cameraIconCircle}>
              <Ionicons name="camera" size={16} color={Colors.textWhite} />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHelpText}>
            {isUploading ? 'Đang tải ảnh...' : 'Chạm để đổi ảnh đại diện'}
          </Text>
        </View>

        {/* Cover Picker */}
        <View style={styles.coverPickerContainer}>
          <Text style={styles.label}>Ảnh bìa tài khoản</Text>
          <TouchableOpacity onPress={onPickCoverImage} activeOpacity={0.8} style={styles.coverTouch} disabled={isUploadingCover}>
            {coverUrl ? (
              <Image source={{ uri: coverUrl }} style={styles.coverPreview} />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Ionicons name="image-outline" size={24} color={Colors.textLight} />
                <Text style={styles.coverPlaceholderText}>Chưa có ảnh bìa</Text>
              </View>
            )}
            <View style={styles.cameraIconCircleCover}>
              <Ionicons name="camera" size={14} color={Colors.textWhite} />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHelpText}>
            {isUploadingCover ? 'Đang tải ảnh bìa...' : 'Chạm để đổi ảnh bìa'}
          </Text>
        </View>

        {/* Form Fields */}
        <Input
          label="Họ và tên"
          placeholder="Nhập họ và tên"
          value={fullName}
          onChangeText={setFullName}
        />

        <Input
          label="Số điện thoại"
          placeholder="Nhập số điện thoại"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Input
          label="Headline / Tiêu đề nghề nghiệp"
          placeholder="Ví dụ: Lập trình viên di động, Thiết kế đồ họa"
          value={headline}
          onChangeText={setHeadline}
        />

        <Input
          label="Giới thiệu bản thân (Bio)"
          placeholder="Viết một đoạn giới thiệu ngắn về kỹ năng, kinh nghiệm..."
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={4}
        />

        {/* Skills Chips Config */}
        <Text style={styles.label}>Kỹ năng / Lĩnh vực nổi bật</Text>
        <View style={styles.skillsInputRow}>
          <View style={styles.inputWrapper}>
            <Input
              placeholder="Nhập kỹ năng mới"
              value={skillsText}
              onChangeText={setSkillsText}
              onSubmitEditing={handleAddSkill}
            />
          </View>
          <TouchableOpacity style={styles.addSkillButton} onPress={handleAddSkill} activeOpacity={0.7}>
            <Ionicons name="add" size={24} color={Colors.textWhite} />
          </TouchableOpacity>
        </View>

        {/* Chips list */}
        <View style={styles.skillsContainer}>
          {skills.map((skill, index) => (
            <View key={index} style={styles.skillChip}>
              <Text style={styles.skillText}>{skill}</Text>
              <TouchableOpacity onPress={() => handleRemoveSkill(skill)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color={Colors.primary} style={styles.removeIcon} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.modalButtons}>
          <Button title="Hủy" variant="outline" onPress={onClose} style={styles.modalButton} />
          <Button title="Lưu lại" onPress={handleSavePress} loading={isSaving} style={styles.modalButton} />
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 24,
  },
  avatarPickerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarTouch: {
    position: 'relative',
  },
  cameraIconCircle: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  coverPickerContainer: {
    marginBottom: 20,
  },
  coverTouch: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.background,
    marginTop: 6,
  },
  coverPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  coverPlaceholderText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  cameraIconCircleCover: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: Colors.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.surface,
  },
  avatarHelpText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  skillsInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
  },
  addSkillButton: {
    backgroundColor: Colors.primary,
    height: 48,
    width: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    marginBottom: 20,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primarySoft,
    borderRadius: 16,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  skillText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  removeIcon: {
    marginLeft: 6,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
  },
});
