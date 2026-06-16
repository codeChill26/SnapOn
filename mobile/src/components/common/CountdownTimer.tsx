import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface CountdownTimerProps {
  deadlineEnd: string;
  status?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  deadlineEnd,
  status = 'OPEN',
  size = 'md',
}) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      if (status === 'IN_PROGRESS') {
        setTimeLeft('Đã chốt người làm');
        return;
      }
      if (status === 'CANCELLED') {
        setTimeLeft('Đã hủy');
        return;
      }
      if (status === 'COMPLETED') {
        setTimeLeft('Đã hoàn thành');
        return;
      }

      if (!deadlineEnd) {
        setTimeLeft(status === 'OPEN' ? 'Đang tuyển' : 'Hết hạn');
        return;
      }
      const now = new Date();
      const end = new Date(deadlineEnd);
      if (isNaN(end.getTime())) {
        setTimeLeft(status === 'OPEN' ? 'Đang tuyển' : 'Hết hạn');
        return;
      }
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft(status === 'OPEN' ? 'Đang nhận hồ sơ' : 'Hết hạn');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      const formattedHours = hours.toString().padStart(2, '0');
      const formattedMins = mins.toString().padStart(2, '0');
      const formattedSecs = secs.toString().padStart(2, '0');

      if (days > 0) {
        setTimeLeft(`Còn ${days} ngày ${formattedHours}:${formattedMins}:${formattedSecs}`);
      } else {
        setTimeLeft(`Còn ${formattedHours}:${formattedMins}:${formattedSecs}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [deadlineEnd, status]);

  const getUrgencyColor = () => {
    if (status === 'IN_PROGRESS') return Colors.textSecondary;
    if (status === 'CANCELLED') return Colors.error;
    if (status === 'COMPLETED') return Colors.success;

    if (!deadlineEnd) return Colors.success;
    const end = new Date(deadlineEnd);
    if (isNaN(end.getTime())) return Colors.success;
    const diff = end.getTime() - Date.now();
    const days = diff / (1000 * 60 * 60 * 24);
    if (days <= 0) return Colors.primary;
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
