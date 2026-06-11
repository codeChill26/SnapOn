import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { JobCard } from '../../components/common/JobCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { taskService } from '../../services/taskService';
import { Task } from '../../types';
import { formatCurrency } from '../../utils/format';
import { RootStackParamList } from '../../navigation/AppNavigator';

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
    available: { label: 'Sẵn sàng', color: Colors.success },
    busy: { label: 'Đang bận', color: Colors.warning },
    offline: { label: 'Ngoại tuyến', color: Colors.textLight },
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
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
      </View>

      <Card style={styles.statsCard}>
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
          <Card style={styles.emptyCard}>
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
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 20,
  },
  header: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textWhite,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textWhite,
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
    color: Colors.textSecondary,
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
    borderColor: Colors.border,
  },
  radiusChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  radiusText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  radiusTextActive: {
    color: Colors.textWhite,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.divider,
  },
  section: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
  },
});
