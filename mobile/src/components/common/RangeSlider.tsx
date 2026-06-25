import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, PanResponder } from 'react-native';

interface RangeSliderProps {
  min: number;
  max: number;
  step?: number;
  initialMinValue: number;
  initialMaxValue: number;
  onValuesChange: (minVal: number, maxVal: number) => void;
}

export const RangeSlider: React.FC<RangeSliderProps> = ({
  min,
  max,
  step = 1,
  initialMinValue,
  initialMaxValue,
  onValuesChange,
}) => {
  const [width, setWidth] = useState(250);
  const [minVal, setMinVal] = useState(initialMinValue);
  const [maxVal, setMaxVal] = useState(initialMaxValue);

  const minValRef = useRef(initialMinValue);
  const maxValRef = useRef(initialMaxValue);
  
  useEffect(() => {
    minValRef.current = initialMinValue;
    maxValRef.current = initialMaxValue;
    setMinVal(initialMinValue);
    setMaxVal(initialMaxValue);
  }, [initialMinValue, initialMaxValue]);

  const startMinPos = useRef(0);
  const handleMinPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startMinPos.current = ((minValRef.current - min) / (max - min)) * width;
      },
      onPanResponderMove: (evt, gestureState) => {
        const newPos = startMinPos.current + gestureState.dx;
        const rawVal = min + (newPos / width) * (max - min);
        let newVal = Math.round(rawVal / step) * step;
        newVal = Math.min(Math.max(newVal, min), max);
        
        if (newVal < maxValRef.current) {
          minValRef.current = newVal;
          setMinVal(newVal);
          onValuesChange(newVal, maxValRef.current);
        }
      },
    })
  ).current;

  const startMaxPos = useRef(0);
  const handleMaxPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startMaxPos.current = ((maxValRef.current - min) / (max - min)) * width;
      },
      onPanResponderMove: (evt, gestureState) => {
        const newPos = startMaxPos.current + gestureState.dx;
        const rawVal = min + (newPos / width) * (max - min);
        let newVal = Math.round(rawVal / step) * step;
        newVal = Math.min(Math.max(newVal, min), max);
        
        if (newVal > minValRef.current) {
          maxValRef.current = newVal;
          setMaxVal(newVal);
          onValuesChange(minValRef.current, newVal);
        }
      },
    })
  ).current;

  const leftPos = ((minVal - min) / (max - min)) * width;
  const rightPos = ((maxVal - min) / (max - min)) * width;

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) setWidth(w);
      }}
    >
      <View style={styles.track} />
      <View
        style={[
          styles.activeTrack,
          {
            left: leftPos,
            width: Math.max(0, rightPos - leftPos),
          },
        ]}
      />
      <View
        style={[styles.thumb, { left: leftPos - 12 }]}
        {...handleMinPan.panHandlers}
      />
      <View
        style={[styles.thumb, { left: rightPos - 12 }]}
        {...handleMaxPan.panHandlers}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 40,
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 10,
    width: '100%',
  },
  track: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
  },
  activeTrack: {
    height: 4,
    backgroundColor: '#007AFF',
    position: 'absolute',
    borderRadius: 2,
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
});
