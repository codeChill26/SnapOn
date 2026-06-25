import React from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface DatePickerModalProps {
  visible: boolean;
  onSelect: (date: Date) => void;
  onClose: () => void;
  selectedDate?: Date;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  onSelect,
  onClose,
  selectedDate,
}) => {
  const dates = React.useMemo(() => {
    const list = [];
    const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dayName = i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : daysOfWeek[d.getDay()];
      const label = `${dayName}, ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      list.push({ label, value: d });
    }
    return list;
  }, []);

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
            <Text style={styles.title}>Chọn ngày bắt đầu</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={dates}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => {
              const isSelected = selectedDate && selectedDate.toDateString() === item.value.toDateString();
              return (
                <TouchableOpacity
                  style={[styles.item, isSelected && styles.itemSelected]}
                  onPress={() => {
                    onSelect(item.value);
                    onClose();
                  }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={item.label}
                >
                  <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
                    {item.label}
                  </Text>
                  {isSelected && (
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
    maxHeight: '60%',
    minHeight: '35%',
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
  itemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  itemTextSelected: {
    color: '#007AFF',
    fontWeight: '800',
  },
  safeArea: {
    backgroundColor: '#FFFFFF',
  },
});
