import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface CountdownTimerProps {
  deadlineEnd: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  deadlineEnd,
  size = 'md',
}) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const end = new Date(deadlineEnd);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Hết hạn');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) setTimeLeft(`${days} ngày ${hours} giờ`);
      else if (hours > 0) setTimeLeft(`${hours} giờ ${mins} phút`);
      else setTimeLeft(`${mins} phút`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [deadlineEnd]);

  const getUrgencyColor = () => {
    const end = new Date(deadlineEnd);
    const diff = end.getTime() - Date.now();
    const days = diff / (1000 * 60 * 60 * 24);
    if (days < 1) return Colors.error;
    if (days < 2) return Colors.warning;
    return Colors.success;
  };

  return (
    <View style={styles.container}>
      <Text style={[styles[`text_${size}`], { color: getUrgencyColor() }]}>
        ⏰ {timeLeft}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text_sm: {
    fontSize: 12,
    fontWeight: '600',
  },
  text_md: {
    fontSize: 14,
    fontWeight: '600',
  },
  text_lg: {
    fontSize: 16,
    fontWeight: '700',
  },
});
