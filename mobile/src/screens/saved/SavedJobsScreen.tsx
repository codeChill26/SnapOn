import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { HomeCompactJobCard } from '../../components/home/HomeCompactJobCard';
import { HomeTheme } from '../../components/home/HomeTheme';
import { taskService } from '../../services/taskService';
import { Task } from '../../types';

export const SavedJobsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [savingTaskIds, setSavingTaskIds] = useState<Record<string, boolean>>({});

  const fetchSavedTasks = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1 && !append) {
        setLoading(true);
      }

      const result = await taskService.getSavedTasks({ page: pageNum, limit: 20 });
      setTasks((current) => append ? [...current, ...result.data] : result.data);
      setPage(result.pagination.page);
      setTotalPages(result.pagination.totalPages);
      setTotalCount(result.pagination.total ?? result.data.length);
    } catch (error) {
      console.warn('Failed to fetch saved tasks:', error);
      Alert.alert('Không tải được danh sách', 'Vui lòng thử lại sau ít phút.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchSavedTasks(1, false);
    }, [fetchSavedTasks])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchSavedTasks(1, false);
  }, [fetchSavedTasks]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    void fetchSavedTasks(page + 1, true);
  }, [fetchSavedTasks, loadingMore, page, totalPages]);

  const handleJobPress = useCallback((task: Task) => {
    navigation.navigate('JobDetail', { taskId: task.id });
  }, [navigation]);

  const handleToggleSaved = useCallback(async (task: Task) => {
    if (savingTaskIds[task.id]) return;

    setSavingTaskIds((current) => ({ ...current, [task.id]: true }));
    setTasks((current) => current.filter((item) => item.id !== task.id));

    try {
      await taskService.unsaveTask(task.id);
    } catch (error) {
      console.warn('Failed to unsave task:', error);
      setTasks((current) => [{ ...task, isSaved: true }, ...current]);
      Alert.alert('Không bỏ lưu được', 'Vui lòng thử lại sau ít phút.');
    } finally {
      setSavingTaskIds((current) => {
        const next = { ...current };
        delete next[task.id];
        return next;
      });
    }
  }, [savingTaskIds]);

  const renderItem = useCallback(({ item }: { item: Task }) => (
    <HomeCompactJobCard
      task={{ ...item, isSaved: true }}
      onPress={handleJobPress}
      onToggleSaved={handleToggleSaved}
      saving={Boolean(savingTaskIds[item.id])}
    />
  ), [handleJobPress, handleToggleSaved, savingTaskIds]);

  const emptyComponent = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={HomeTheme.colors.primary} />
          <Text style={styles.stateText}>Đang tải công việc đã lưu...</Text>
        </View>
      );
    }

    return (
      <View style={styles.centerState}>
        <View style={styles.emptyIcon}>
          <Ionicons name="bookmark-outline" size={34} color={HomeTheme.colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>Chưa lưu công việc nào</Text>
        <Text style={styles.emptySubtitle}>
          Nhấn biểu tượng lưu trên thẻ công việc để xem lại ở đây.
        </Text>
      </View>
    );
  }, [loading]);

  const footerComponent = useMemo(() => (
    <View style={styles.footer}>
      {loadingMore ? <ActivityIndicator size="small" color={HomeTheme.colors.primary} /> : null}
    </View>
  ), [loadingMore]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.78}
        >
          <Ionicons name="arrow-back" size={23} color="#FF6B35" />
        </TouchableOpacity>
        <View style={styles.headerTextGroup}>
          <Text style={styles.title}>Công việc đã lưu</Text>
          <Text style={styles.subtitle}>{totalCount} công việc</Text>
        </View>
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={tasks.length > 0 ? styles.columnWrapper : undefined}
        contentContainerStyle={styles.contentContainer}
        ListEmptyComponent={emptyComponent}
        ListFooterComponent={footerComponent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={HomeTheme.colors.primary}
            colors={[HomeTheme.colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextGroup: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  contentContainer: {
    flexGrow: 1,
    paddingTop: 16,
    paddingBottom: 28,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  footer: {
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 80,
  },
  stateText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  emptyIcon: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
    textAlign: 'center',
  },
});
