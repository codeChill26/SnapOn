import React from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface Option {
  label: string;
  value: string;
  disabled?: boolean;
  disabledBadge?: string;
}

interface OptionSelectionModalProps {
  visible: boolean;
  title: string;
  options: Option[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export const OptionSelectionModal: React.FC<OptionSelectionModalProps> = ({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={styles.sheet}
          activeOpacity={1}
        >
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Đóng bộ chọn"
            >
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => {
              const isSelected = selectedValue === item.value;
              const isDisabled = !!item.disabled;
              return (
                <TouchableOpacity
                  style={[
                    styles.item,
                    isSelected && styles.itemSelected,
                    isDisabled && styles.itemDisabled,
                  ]}
                  onPress={() => {
                    if (isDisabled) return;
                    onSelect(item.value);
                    onClose();
                  }}
                  disabled={isDisabled}
                  activeOpacity={isDisabled ? 1 : 0.7}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected, disabled: isDisabled }}
                  accessibilityLabel={item.label}
                >
                  <View style={styles.itemLabelRow}>
                    <Text style={[styles.itemText, isSelected && styles.itemTextSelected, isDisabled && styles.itemTextDisabled]}>
                      {item.label}
                    </Text>
                    {isDisabled && (
                      <View style={styles.disabledBadge}>
                        <Ionicons name="lock-closed" size={11} color="#94A3B8" />
                        <Text style={styles.disabledBadgeText}>{item.disabledBadge || 'Sắp ra mắt'}</Text>
                      </View>
                    )}
                  </View>
                  {isSelected && !isDisabled && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.listContent}
          />
          <SafeAreaView style={styles.safeArea} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    minHeight: '35%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerSpacer: {
    width: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeButton: {
    padding: 2,
  },
  listContent: {
    paddingVertical: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    minHeight: 56,
  },
  itemSelected: {
    backgroundColor: '#F8FAFC',
  },
  itemDisabled: {
    opacity: 0.6,
  },
  itemLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  disabledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  disabledBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  itemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  itemTextDisabled: {
    color: '#94A3B8',
  },
  itemTextSelected: {
    color: '#007AFF',
    fontWeight: '800',
  },
  safeArea: {
    backgroundColor: '#FFFFFF',
  },
});
