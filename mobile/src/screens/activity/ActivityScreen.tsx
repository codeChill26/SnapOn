import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { Tabs } from '../../components/ui/Tabs';
import { JobCard } from '../../components/common/JobCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { taskService } from '../../services/taskService';
import { useAuth } from '../../context/AuthContext';
import { Task, TaskStatus } from '../../types';
import { getStatusLabel } from '../../utils/format';
import { RootStackParamList } from '../../navigation/AppNavigator';

type ActivityNavProp = NativeStackNavigationProp<RootStackParamList>;

const ACTIVITY_TABS = [
  { key: 'mine', label: 'Của tôi' },
  { key: 'community', label: 'Cộng đồng' },
];

const STATUS_FILTERS: { key: string; label: string; status?: TaskStatus }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'OPEN', label: 'Đang mở', status: 'OPEN' },
  { key: 'IN_PROGRESS', label: 'Đang làm', status: 'IN_PROGRESS' },
  { key: 'COMPLETED', label: 'Hoàn thành', status: 'COMPLETED' },
  { key: 'CANCELLED', label: 'Đã hủy', status: 'CANCELLED' },
];

export const ActivityScreen: React.FC = () => {
  const navigation = useNavigation<ActivityNavProp>();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('mine');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTasks = async () => {
    try {
      const filter = STATUS_FILTERS.find(f => f.key === statusFilter);
      const params: any = {};

      if (filter?.status) params.status = filter.status;

      if (activeTab === 'mine') {
        const result = await taskService.getMyTasks();
        setTasks(result.data);
      } else {
        const result = await taskService.getTasks(params);
        setTasks(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchTasks();
  }, [activeTab, statusFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  const handleJobPress = (task: Task) => {
    navigation.navigate('JobDetail', { taskId: task.id });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hoạt động</Text>
      </View>

      <View style={styles.tabSection}>
        <Tabs tabs={ACTIVITY_TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        {STATUS_FILTERS.map(filter => {
          const isActive = statusFilter === filter.key;
          let activeBg = Colors.primary;
          let activeBorder = Colors.primary;

          if (filter.key === 'OPEN') {
            activeBg = Colors.statusOpen;
            activeBorder = Colors.statusOpen;
          } else if (filter.key === 'IN_PROGRESS') {
            activeBg = Colors.statusInProgress;
            activeBorder = Colors.statusInProgress;
          } else if (filter.key === 'COMPLETED') {
            activeBg = Colors.statusCompleted;
            activeBorder = Colors.statusCompleted;
          } else if (filter.key === 'CANCELLED') {
            activeBg = Colors.statusCancelled;
            activeBorder = Colors.statusCancelled;
          }

          return (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterChip,
                isActive ? { backgroundColor: activeBg, borderColor: activeBorder } : null,
              ]}
              onPress={() => setStatusFilter(filter.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterText,
                  isActive && styles.filterTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.listSection}>
        {loading ? (
          <LoadingSpinner message="Đang tải..." />
        ) : tasks.length === 0 ? (
          <EmptyState
            title="Không có hoạt động"
            message={activeTab === 'mine' ? 'Bạn chưa tham gia công việc nào' : 'Chưa có công việc nào'}
          />
        ) : (
          tasks.map(task => (
            <JobCard key={task.id} task={task} onPress={handleJobPress} />
          ))
        )}
      </View>
    </ScrollView>
  );
};

// Removed duplicate import

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
  },
  tabSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterRow: {
    marginBottom: 16,
    paddingLeft: 16,
  },
  filterContent: {
    gap: 8,
    paddingRight: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: Colors.textWhite,
  },
  listSection: {
    paddingHorizontal: 16,
  },
});
