import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { JobCard } from '../../components/common/JobCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { taskService } from '../../services/taskService';
import { Task } from '../../types';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { AppColors } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';

type WorkerNavProp = NativeStackNavigationProp<RootStackParamList>;

export const WorkerDashboardScreen: React.FC = () => {
  const navigation = useNavigation<WorkerNavProp>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [radius, setRadius] = useState(10);
  const [status, setStatus] = useState<'available' | 'busy' | 'offline'>('available');

  const fetchTasks = async () => {
    try {
      const result = await taskService.getTasks({ status: 'OPEN', limit: 50 });
      setTasks(result.data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  const handleJobPress = (task: Task) => {
    navigation.navigate('JobDetail', { taskId: task.id });
  };

  const statusConfig = {
    available: { label: 'Sẵn sàng', color: AppColors.status.success },
    busy: { label: 'Đang bận', color: AppColors.status.warning },
    offline: { label: 'Ngoại tuyến', color: AppColors.text.disabled },
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AppColors.brand.primary} />}
    >
      <LinearGradient
        colors={['#0F1E36', '#090E17']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Bảng điều khiển</Text>
        <View style={styles.statusRow}>
          <Text style={styles.headerSubtitle}>Trạng thái:</Text>
          <TouchableOpacity
            style={[styles.statusBadge, { backgroundColor: statusConfig[status].color + '20' }]}
            onPress={() => {
              const states: ('available' | 'busy' | 'offline')[] = ['available', 'busy', 'offline'];
              const idx = (states.indexOf(status) + 1) % states.length;
              setStatus(states[idx]);
            }}
          >
            <View style={[styles.statusDot, { backgroundColor: statusConfig[status].color }]} />
            <Text style={[styles.statusText, { color: statusConfig[status].color }]}>
              {statusConfig[status].label}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <Card style={styles.statsCard} variant="glass">
        <Text style={styles.statsTitle}>Bán kính tìm việc</Text>
        <View style={styles.radiusRow}>
          {[5, 10, 20, 50].map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.radiusChip, radius === r && styles.radiusChipActive]}
              onPress={() => setRadius(r)}
            >
              <Text style={[styles.radiusText, radius === r && styles.radiusTextActive]}>
                {r} km
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{tasks.length}</Text>
            <Text style={styles.summaryLabel}>Việc có sẵn</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{radius}</Text>
            <Text style={styles.summaryLabel}>Bán kính (km)</Text>
          </View>
        </View>
      </Card>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Việc làm gần bạn</Text>
        {loading ? (
          <LoadingSpinner message="Đang tìm việc..." />
        ) : tasks.length === 0 ? (
          <Card style={styles.emptyCard} variant="glass">
            <Text style={styles.emptyText}>
              Không có công việc nào trong bán kính {radius}km
            </Text>
          </Card>
        ) : (
          tasks.map(task => (
            <JobCard
              key={task.id}
              task={task}
              onPress={handleJobPress}
              showDistance
              distance={Math.random() * radius}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background.primary,
  },
  content: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: AppColors.text.primary,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 13,
    color: AppColors.text.primary,
    opacity: 0.8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statsCard: {
    marginHorizontal: 16,
    marginTop: -12,
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.text.muted,
    marginBottom: 8,
  },
  radiusRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  radiusChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: AppColors.border.subtle,
    backgroundColor: AppColors.surface.glass,
  },
  radiusChipActive: {
    backgroundColor: AppColors.brand.primary,
    borderColor: AppColors.brand.primary,
  },
  radiusText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.text.muted,
  },
  radiusTextActive: {
    color: '#FFFFFF',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: AppColors.border.subtle,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
    color: AppColors.brand.primary,
  },
  summaryLabel: {
    fontSize: 12,
    color: AppColors.text.muted,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: AppColors.border.subtle,
  },
  section: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text.primary,
    marginBottom: 12,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: AppColors.text.muted,
    textAlign: 'center',
  },
});
