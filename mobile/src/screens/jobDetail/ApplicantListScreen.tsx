import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { UserAvatar } from '../../components/common/UserAvatar';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { applicationService } from '../../services/applicationService';
import { matchingService } from '../../services/matchingService';
import { TaskApplication } from '../../types';
import { formatCurrency } from '../../utils/format';
import { RootStackParamList } from '../../navigation/AppNavigator';

type ApplicantListRouteProp = RouteProp<RootStackParamList, 'ApplicantList'>;

export const ApplicantListScreen: React.FC = () => {
  const route = useRoute<ApplicantListRouteProp>();
  const [applicants, setApplicants] = useState<TaskApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    loadApplicants();
  }, []);

  const loadApplicants = async () => {
    try {
      let apps = await applicationService.getApplicationsByTask(route.params.taskId);
      try {
        const ranked = await matchingService.getRankedApplications(route.params.taskId);
        if (ranked && ranked.length > 0) {
          apps = ranked;
        }
      } catch {
      }
      setApplicants(apps);
    } catch (error) {
      console.error('Failed to load applicants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualMatch = async () => {
    if (!selectedId) {
      Alert.alert('Lỗi', 'Vui lòng chọn một ứng viên');
      return;
    }
    try {
      await matchingService.manualMatch(route.params.taskId, selectedId);
      Alert.alert('Thành công', 'Đã ghép ứng viên thành công!');
      loadApplicants();
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Ghép ứng viên thất bại');
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>
        Danh sách ứng viên ({applicants.length})
      </Text>

      {applicants.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>Chưa có ứng viên nào ứng tuyển</Text>
        </Card>
      ) : (
        <>
          {applicants.map((applicant) => (
            <Card
              key={applicant.id}
              style={[
                styles.applicantCard,
                selectedId === applicant.id && styles.selectedCard,
              ]}
            >
              <TouchableOpacity
                onPress={() => setSelectedId(applicant.id)}
                style={styles.applicantContent}
              >
                <View style={styles.applicantHeader}>
                  <UserAvatar
                    name={applicant.taskerName || 'N/A'}
                    avatarUrl={applicant.taskerAvatar}
                    size={44}
                  />
                  <View style={styles.applicantInfo}>
                    <Text style={styles.applicantName}>
                      {applicant.taskerName || 'N/A'}
                    </Text>
                    <View style={styles.ratingRow}>
                      <Text style={styles.ratingIcon}>★</Text>
                      <Text style={styles.ratingText}>
                        {applicant.taskerRating?.toFixed(1) || 'N/A'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.bidInfo}>
                    <Text style={styles.bidPrice}>
                      {formatCurrency(applicant.bidPrice)}
                    </Text>
                    {applicant.score !== undefined && (
                      <Badge
                        label={`Điểm: ${(applicant.score * 100).toFixed(0)}`}
                        variant="success"
                        size="sm"
                      />
                    )}
                  </View>
                </View>

                {applicant.message && (
                  <Text style={styles.applicantMessage}>{applicant.message}</Text>
                )}
              </TouchableOpacity>

              <Button
                title="Chọn ứng viên này"
                onPress={() => {
                  setSelectedId(applicant.id);
                  handleManualMatch();
                }}
                variant={selectedId === applicant.id ? 'primary' : 'outline'}
                size="sm"
                style={styles.selectButton}
              />
            </Card>
          ))}

          {selectedId && (
            <Button
              title="Xác nhận ghép ứng viên"
              onPress={handleManualMatch}
              size="lg"
              style={styles.confirmButton}
            />
          )}
        </>
      )}
    </ScrollView>
  );
};

import { TouchableOpacity } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  applicantCard: {
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCard: {
    borderColor: Colors.primary,
  },
  applicantContent: {
    marginBottom: 12,
  },
  applicantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  applicantInfo: {
    flex: 1,
  },
  applicantName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingIcon: {
    color: Colors.warning,
    fontSize: 14,
  },
  ratingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  bidInfo: {
    alignItems: 'flex-end',
    gap: 4,
  },
  bidPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
  },
  applicantMessage: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  selectButton: {
    marginTop: 8,
  },
  confirmButton: {
    marginTop: 16,
  },
});
