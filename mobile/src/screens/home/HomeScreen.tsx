import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TextInput, TouchableOpacity } from 'react-native';
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
import { UserAvatar } from '../../components/common/UserAvatar';
import { Ionicons } from '@expo/vector-icons';

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
        <View style={styles.headerTop}>
          <View style={styles.headerGreeting}>
            <UserAvatar
              name={user?.fullName || 'Người dùng'}
              avatarUrl={user?.avatarUrl}
              size={48}
            />
            <View style={styles.greetingTextContainer}>
              <Text style={styles.greetingLabel}>Xin chào 👋</Text>
              <Text style={styles.greetingName}>
                {user?.fullName || 'Người dùng'}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notificationButton} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={22} color={Colors.textWhite} />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>Tìm việc hoặc đăng việc dễ dàng cùng SnapOn</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={20} color={Colors.textLight} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm công việc..."
            placeholderTextColor={Colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={fetchTasks}
            returnKeyType="search"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSelectedCategory(undefined); }} style={styles.clearIcon}>
              <Ionicons name="close-circle" size={18} color={Colors.textLight} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.filterIconButton} activeOpacity={0.7}>
              <Ionicons name="options-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Danh mục dịch vụ</Text>
        <CategoryGrid
          onSelect={handleCategorySelect}
          selectedId={selectedCategory}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Công việc mới nhất</Text>
          {selectedCategory && (
            <TouchableOpacity onPress={() => setSelectedCategory(undefined)}>
              <Badge label="Bỏ lọc" variant="primary" size="sm" />
            </TouchableOpacity>
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
    paddingBottom: 30,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 35,
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerGreeting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  greetingTextContainer: {
    justifyContent: 'center',
  },
  greetingLabel: {
    fontSize: 13,
    color: Colors.textWhite,
    opacity: 0.8,
  },
  greetingName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textWhite,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textWhite,
    opacity: 0.9,
    fontWeight: '500',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginTop: -22,
    marginBottom: 24,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  clearIcon: {
    padding: 4,
  },
  filterIconButton: {
    padding: 6,
    backgroundColor: Colors.primary + '10',
    borderRadius: 8,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
});
