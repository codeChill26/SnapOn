import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { JobCard } from '../../components/common/JobCard';
import { CategoryGrid } from '../../components/common/CategoryGrid';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { taskService } from '../../services/taskService';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Task } from '../../types';
import { RootStackParamList } from '../../navigation/AppNavigator';

type HomeNavProp = NativeStackNavigationProp<RootStackParamList>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeNavProp>();
  const { user } = useAuth();
  const { tasks, setTasks } = useApp();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();

  const fetchTasks = async () => {
    try {
      const params: any = { page: 1, limit: 20 };
      if (selectedCategory) params.category_id = selectedCategory;
      if (searchQuery) params.search = searchQuery;
      const result = await taskService.getTasks(params);
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
  }, [selectedCategory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  const handleCategorySelect = (categoryId: string, _categoryName: string) => {
    setSelectedCategory(prev => prev === categoryId ? undefined : categoryId);
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
        <View>
          <Text style={styles.greeting}>
            Xin chào, {user?.fullName || 'Người dùng'}
          </Text>
          <Text style={styles.subtitle}>Tìm việc phù hợp với bạn</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm công việc..."
          placeholderTextColor={Colors.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={fetchTasks}
          returnKeyType="search"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Danh mục</Text>
        <CategoryGrid
          onSelect={handleCategorySelect}
          selectedId={selectedCategory}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Công việc mới nhất</Text>
          {selectedCategory && (
            <Badge label="Bỏ lọc" variant="outline" size="sm" />
          )}
        </View>

        {loading ? (
          <LoadingSpinner message="Đang tải công việc..." />
        ) : tasks.length === 0 ? (
          <EmptyState
            title="Không có công việc"
            message="Hiện tại chưa có công việc nào phù hợp"
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: Colors.primary,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textWhite,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textWhite,
    opacity: 0.8,
    marginTop: 4,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginTop: -20,
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
});
