import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';

interface StatCard {
  label: string;
  value: string;
  change: string;
  positive: boolean;
}

const STATS: StatCard[] = [
  { label: 'Tổng việc', value: '156', change: '+12%', positive: true },
  { label: 'Đã ghép', value: '89', change: '+8%', positive: true },
  { label: 'Đang thực hiện', value: '34', change: '+5%', positive: true },
  { label: 'Người làm', value: '67', change: '+15%', positive: true },
];

const RECENT_JOBS = [
  { title: 'Sửa máy lạnh Q1', status: 'OPEN', price: '200K' },
  { title: 'Dọn nhà Q7', status: 'IN_PROGRESS', price: '150K' },
  { title: 'Vận chuyển đồ Q2', status: 'COMPLETED', price: '500K' },
  { title: 'Sơn tường Q9', status: 'OPEN', price: '300K' },
];

export const AdminDashboardScreen: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Xin chào Admin</Text>
          <Text style={styles.subtitle}>{user?.email}</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        {STATS.map((stat, index) => (
          <Card key={index} style={styles.statCard}>
            <Text style={styles.statLabel}>{stat.label}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={[styles.statChange, stat.positive ? styles.positive : styles.negative]}>
              {stat.change}
            </Text>
          </Card>
        ))}
      </View>

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Công việc gần đây</Text>
        {RECENT_JOBS.map((job, index) => (
          <View key={index} style={styles.jobRow}>
            <Text style={styles.jobTitle}>{job.title}</Text>
            <View style={styles.jobRight}>
              <Badge
                label={job.status === 'OPEN' ? 'Đang mở' : job.status === 'IN_PROGRESS' ? 'Đang làm' : 'Hoàn thành'}
                variant={job.status === 'OPEN' ? 'info' : job.status === 'IN_PROGRESS' ? 'warning' : 'success'}
                size="sm"
              />
              <Text style={styles.jobPrice}>{job.price}</Text>
            </View>
          </View>
        ))}
      </Card>

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Thống kê nhanh</Text>
        <View style={styles.quickStatRow}>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>45%</Text>
            <Text style={styles.quickStatLabel}>Tỷ lệ ghép</Text>
          </View>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>2.4M</Text>
            <Text style={styles.quickStatLabel}>Doanh thu</Text>
          </View>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>4.6</Text>
            <Text style={styles.quickStatLabel}>Đánh giá TB</Text>
          </View>
        </View>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textWhite,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textWhite,
    opacity: 0.7,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
  },
  statCard: {
    width: '48%',
    padding: 16,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
  },
  statChange: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  positive: {
    color: Colors.success,
  },
  negative: {
    color: Colors.error,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  jobRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  jobTitle: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  jobRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  jobPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  quickStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  quickStat: {
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
  },
  quickStatLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
