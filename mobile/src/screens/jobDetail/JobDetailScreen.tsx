import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TextInput, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { UserAvatar } from '../../components/common/UserAvatar';
import { CountdownTimer } from '../../components/common/CountdownTimer';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { taskService } from '../../services/taskService';
import { applicationService } from '../../services/applicationService';
import { matchingService } from '../../services/matchingService';
import { useAuth } from '../../context/AuthContext';
import { Task, TaskApplication } from '../../types';
import { formatCurrency, getStatusLabel, formatDate } from '../../utils/format';
import { getCategoryById } from '../../constants/categories';
import { RootStackParamList } from '../../navigation/AppNavigator';

type JobDetailRouteProp = RouteProp<RootStackParamList, 'JobDetail'>;

export const JobDetailScreen: React.FC = () => {
  const route = useRoute<JobDetailRouteProp>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [applications, setApplications] = useState<TaskApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidPrice, setBidPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isPoster = user?.id === task?.posterId;
  const category = task ? getCategoryById(task.categoryId) : undefined;

  useEffect(() => {
    loadTaskDetail();
  }, [route.params.taskId]);

  const loadTaskDetail = async () => {
    try {
      const taskData = await taskService.getTaskById(route.params.taskId);
      setTask(taskData);
      try {
        const apps = await applicationService.getApplicationsByTask(route.params.taskId);
        setApplications(apps);
      } catch {
        // not poster, can't see apps
      }
    } catch (error) {
      console.error('Failed to load task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!bidPrice || parseInt(bidPrice) < (task?.budgetMin || 0)) {
      Alert.alert('Lỗi', `Giá đề xuất phải từ ${formatCurrency(task?.budgetMin || 0)}`);
      return;
    }

    setSubmitting(true);
    try {
      await applicationService.createApplication(route.params.taskId, {
        bid_price: parseInt(bidPrice),
        estimated_time: '3 ngày',
        message: 'Tôi muốn ứng tuyển công việc này',
      });
      Alert.alert('Thành công', 'Đã gửi đơn ứng tuyển!');
      loadTaskDetail();
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Ứng tuyển thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoMatch = async () => {
    Alert.alert(
      'Xác nhận',
      'Hệ thống sẽ tự động chọn ứng viên phù hợp nhất?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            try {
              await matchingService.autoMatch(route.params.taskId);
              Alert.alert('Thành công', 'Đã ghép ứng viên thành công!');
              loadTaskDetail();
            } catch (error: any) {
              Alert.alert('Lỗi', error.message || 'Ghép ứng viên thất bại');
            }
          },
        },
      ]
    );
  };

  if (loading) return <LoadingSpinner fullScreen message="Đang tải..." />;
  if (!task) return <LoadingSpinner fullScreen message="Không tìm thấy công việc" />;

  const userApplication = applications.find(app => app.taskerId === user?.id);
  const hasApplied = !!userApplication;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.mainCard}>
        <View style={styles.categoryRow}>
          {category && (
            <Badge label={category.name} variant="primary" />
          )}
          <Badge
            label={getStatusLabel(task.status)}
            variant={
              task.status === 'OPEN' ? 'info' :
              task.status === 'IN_PROGRESS' ? 'warning' :
              task.status === 'COMPLETED' ? 'success' : 'error'
            }
          />
        </View>

        <Text style={styles.title}>{task.title}</Text>
        <Text style={styles.description}>{task.description}</Text>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Ngân sách</Text>
            <Text style={styles.infoValue}>
              {formatCurrency(task.budgetMin)} - {formatCurrency(task.budgetMax)}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Hạn chót</Text>
            <CountdownTimer deadlineEnd={task.deadlineEnd} size="md" />
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Ngày đăng</Text>
            <Text style={styles.infoValue}>{formatDate(task.createdAt)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Người đăng</Text>
            <View style={styles.posterRow}>
              <UserAvatar name={task.posterName || 'N/A'} size={28} avatarUrl={task.poster?.avatarUrl} />
              <Text style={styles.infoValue}>{task.posterName || 'N/A'}</Text>
              {!isPoster && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('ChatDetail', {
                    otherUserId: task.posterId,
                    otherUserName: task.posterName || 'N/A',
                    otherUserAvatar: task.poster?.avatarUrl
                  })}
                  style={styles.chatIconBadge}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={15} color={Colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {task.locations && task.locations.length > 0 && (
          <View style={styles.locationSection}>
            <Text style={styles.sectionLabel}>Địa điểm</Text>
            <Text style={styles.locationText}>
              📍 {task.locations[0].address}
            </Text>
          </View>
        )}
      </Card>

      {/* Hirer View - Applications */}
      {isPoster && task.status === 'OPEN' && (
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Ứng viên ({applications.length})
            </Text>
            <Button
              title="Tự động ghép"
              onPress={handleAutoMatch}
              variant="secondary"
              size="sm"
            />
          </View>

          {applications.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có ứng viên nào</Text>
          ) : (
            <Button
              title="Xem danh sách ứng viên"
              onPress={() => navigation.navigate('ApplicantList' as any, { taskId: task.id })}
              variant="outline"
              size="md"
            />
          )}
        </Card>
      )}

      {/* Worker View - Apply */}
      {!isPoster && task.status === 'OPEN' && !hasApplied && (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Ứng tuyển công việc</Text>
          <Text style={styles.bidLabel}>
            Giá đề xuất của bạn ({formatCurrency(task.budgetMin)} - {formatCurrency(task.budgetMax)})
          </Text>
          <View style={styles.bidRow}>
            <View style={styles.bidInputContainer}>
              <TextInput
                style={styles.bidInput}
                placeholder="Nhập giá"
                placeholderTextColor={Colors.textLight}
                value={bidPrice}
                onChangeText={setBidPrice}
                keyboardType="numeric"
              />
            </View>
            <Button
              title="Gửi"
              onPress={handleApply}
              loading={submitting}
              size="md"
            />
          </View>
        </Card>
      )}

      {hasApplied && (
        <Card style={styles.sectionCard}>
          <Text style={styles.appliedText}>
            ✅ Bạn đã ứng tuyển công việc này với giá {formatCurrency(userApplication.bidPrice)}
          </Text>
        </Card>
      )}

      {task.status === 'IN_PROGRESS' && (
        <Card style={styles.sectionCard}>
          <Badge label="Đang thực hiện" variant="warning" size="md" />
          <Text style={styles.statusText}>
            Công việc đang được tiến hành
          </Text>
        </Card>
      )}
    </ScrollView>
  );
};
// Cleaned up duplicate import

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  mainCard: {
    marginBottom: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  posterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatIconBadge: {
    padding: 3,
    backgroundColor: Colors.primary + '15',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  locationSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  sectionLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    color: Colors.text,
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    paddingVertical: 16,
  },
  bidLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  bidRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  bidInputContainer: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  bidInput: {
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  appliedText: {
    fontSize: 14,
    color: Colors.success,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});
