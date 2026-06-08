import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';

const MOCK_JOBS = [
  { id: '1', title: 'Sửa máy lạnh Quận 1', category: 'Sửa chữa', poster: 'Nguyen Van A', budget: '200K - 500K', status: 'OPEN', deadline: '3 ngày' },
  { id: '2', title: 'Dọn nhà Quận 7', category: 'Dọn dẹp', poster: 'Tran Thi B', budget: '150K - 300K', status: 'IN_PROGRESS', deadline: '1 ngày' },
  { id: '3', title: 'Vận chuyển đồ đạc', category: 'Vận chuyển', poster: 'Le Van C', budget: '500K - 1M', status: 'COMPLETED', deadline: '5 ngày' },
  { id: '4', title: 'Sơn tường nhà phố', category: 'Sơn sửa', poster: 'Pham Thi D', budget: '300K - 800K', status: 'OPEN', deadline: '7 ngày' },
  { id: '5', title: 'Lắp đặt điện Q9', category: 'Điện', poster: 'Hoang Van E', budget: '250K - 600K', status: 'CANCELLED', deadline: '2 ngày' },
];

export const AdminJobsScreen: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredJobs = MOCK_JOBS.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý công việc</Text>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm công việc..."
            placeholderTextColor={Colors.textLight}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        {['all', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(status => (
          <TouchableOpacity
            key={status}
            style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
            onPress={() => setStatusFilter(status)}
          >
            <Text style={[styles.filterText, statusFilter === status && styles.filterTextActive]}>
              {status === 'all' ? 'Tất cả' :
               status === 'OPEN' ? 'Đang mở' :
               status === 'IN_PROGRESS' ? 'Đang làm' :
               status === 'COMPLETED' ? 'Hoàn thành' : 'Đã hủy'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.listSection}>
        {filteredJobs.map(job => (
          <Card key={job.id} style={styles.jobCard}>
            <Text style={styles.jobTitle}>{job.title}</Text>
            <View style={styles.jobMeta}>
              <Text style={styles.jobMetaText}>📁 {job.category}</Text>
              <Text style={styles.jobMetaText}>👤 {job.poster}</Text>
            </View>
            <View style={styles.jobFooter}>
              <Text style={styles.jobBudget}>{job.budget}</Text>
              <Badge
                label={
                  job.status === 'OPEN' ? 'Đang mở' :
                  job.status === 'IN_PROGRESS' ? 'Đang làm' :
                  job.status === 'COMPLETED' ? 'Hoàn thành' : 'Đã hủy'
                }
                variant={
                  job.status === 'OPEN' ? 'info' :
                  job.status === 'IN_PROGRESS' ? 'warning' :
                  job.status === 'COMPLETED' ? 'success' : 'error'
                }
                size="sm"
              />
            </View>
            <Text style={styles.jobDeadline}>⏰ Hạn: {job.deadline}</Text>
          </Card>
        ))}
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
    paddingBottom: 40,
  },
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 12,
  },
  searchContainer: {
    marginBottom: 8,
  },
  searchInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
  },
  filterRow: {
    marginBottom: 12,
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
    gap: 12,
  },
  jobCard: {
    marginBottom: 0,
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  jobMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  jobMetaText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  jobBudget: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  jobDeadline: {
    fontSize: 12,
    color: Colors.textLight,
  },
});
