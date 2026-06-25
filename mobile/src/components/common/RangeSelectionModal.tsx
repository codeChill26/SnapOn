import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RangeSlider } from './RangeSlider';
import { Button } from '../ui/Button';

interface RangeSelectionModalProps {
  visible: boolean;
  title: string;
  unit: string;
  min: number;
  max: number;
  initialMinVal: number | null;
  initialMaxVal: number | null;
  onSave: (minVal: number | null, maxVal: number | null) => void;
  onClose: () => void;
}

export const RangeSelectionModal: React.FC<RangeSelectionModalProps> = ({
  visible,
  title,
  unit,
  min,
  max,
  initialMinVal,
  initialMaxVal,
  onSave,
  onClose,
}) => {
  const [notRequired, setNotRequired] = useState(initialMinVal === null);
  const [minVal, setMinVal] = useState(initialMinVal ?? min);
  const [maxVal, setMaxVal] = useState(initialMaxVal ?? max);

  useEffect(() => {
    setNotRequired(initialMinVal === null);
    setMinVal(initialMinVal ?? min);
    setMaxVal(initialMaxVal ?? max);
  }, [initialMinVal, initialMaxVal, visible]);

  const handleSave = () => {
    if (notRequired) {
      onSave(null, null);
    } else {
      onSave(minVal, maxVal);
    }
    onClose();
  };

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
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={styles.body}>
            {/* Value Display */}
            <Text style={styles.valueDisplay}>
              {notRequired ? 'Không yêu cầu' : `${minVal} – ${maxVal} ${unit}`}
            </Text>

            {/* Slider */}
            <View style={[styles.sliderContainer, notRequired && styles.disabledContainer]}>
              <RangeSlider
                min={min}
                max={max}
                initialMinValue={minVal}
                initialMaxValue={maxVal}
                onValuesChange={(mi, ma) => {
                  if (!notRequired) {
                    setMinVal(mi);
                    setMaxVal(ma);
                  }
                }}
              />
              {/* Scale Ticks */}
              <View style={styles.ticksRow}>
                <Text style={styles.tickText}>{min}</Text>
                <Text style={styles.tickText}>{Math.round((min + max) / 2)}</Text>
                <Text style={styles.tickText}>{max}</Text>
              </View>
            </View>

            {/* Checkbox */}
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setNotRequired(!notRequired)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={notRequired ? 'checkbox' : 'square-outline'}
                size={22}
                color={notRequired ? '#007AFF' : '#64748B'}
              />
              <Text style={styles.checkboxLabel}>Không yêu cầu {title.toLowerCase()}</Text>
            </TouchableOpacity>

            {/* Save Button */}
            <Button
              title="Xong"
              onPress={handleSave}
              size="lg"
              style={styles.saveButton}
            />
          </View>
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
    paddingBottom: 8,
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
  body: {
    padding: 24,
    alignItems: 'center',
  },
  valueDisplay: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 20,
  },
  sliderContainer: {
    width: '100%',
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  disabledContainer: {
    opacity: 0.3,
  },
  ticksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  tickText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    marginBottom: 28,
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '600',
  },
  saveButton: {
    width: '100%',
  },
  safeArea: {
    backgroundColor: '#FFFFFF',
  },
});
