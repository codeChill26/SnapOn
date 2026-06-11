import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { UserAvatar } from '../../components/common/UserAvatar';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'hirer' | 'worker';
  status: 'ACTIVE' | 'BANNED' | 'SUSPENDED';
  joinedDate: string;
  jobsCompleted: number;
  rating: number;
}

const MOCK_USERS: AdminUser[] = [
  { id: '1', name: 'Nguyen Van A', email: 'nguyenvana@email.com', phone: '0901xxx111', role: 'hirer', status: 'ACTIVE', joinedDate: '2024-01-15', jobsCompleted: 5, rating: 4.5 },
  { id: '2', name: 'Tran Thi B', email: 'tranthib@email.com', phone: '0902xxx222', role: 'worker', status: 'ACTIVE', joinedDate: '2024-02-20', jobsCompleted: 12, rating: 4.8 },
  { id: '3', name: 'Le Van C', email: 'levanc@email.com', phone: '0903xxx333', role: 'hirer', status: 'SUSPENDED', joinedDate: '2024-03-10', jobsCompleted: 2, rating: 3.5 },
  { id: '4', name: 'Pham Thi D', email: 'phamthid@email.com', phone: '0904xxx444', role: 'worker', status: 'ACTIVE', joinedDate: '2024-04-05', jobsCompleted: 8, rating: 4.2 },
  { id: '5', name: 'Hoang Van E', email: 'hoangvane@email.com', phone: '0905xxx555', role: 'hirer', status: 'BANNED', joinedDate: '2024-05-01', jobsCompleted: 0, rating: 0 },
];

const USER_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'worker', label: 'Người làm' },
  { key: 'hirer', label: 'Người thuê' },
];

export const AdminUsersScreen: React.FC = () => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const filteredUsers = MOCK_USERS.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) ||
                         user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý người dùng</Text>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm người dùng..."
            placeholderTextColor={Colors.textLight}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <View style={styles.tabSection}>
        <Tabs tabs={USER_TABS} activeTab={roleFilter} onTabChange={setRoleFilter} />
      </View>

      <View style={styles.listSection}>
        {filteredUsers.map(user => (
          <Card key={user.id} style={styles.userCard}>
            <View style={styles.userHeader}>
              <UserAvatar name={user.name} size={44} />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
              <View style={styles.userStatus}>
                <Badge
                  label={user.role === 'hirer' ? 'Người thuê' : 'Người làm'}
                  variant="primary"
                  size="sm"
                />
                <Badge
                  label={user.status === 'ACTIVE' ? 'Hoạt động' : user.status === 'BANNED' ? 'Cấm' : 'Tạm khóa'}
                  variant={user.status === 'ACTIVE' ? 'success' : user.status === 'BANNED' ? 'error' : 'warning'}
                  size="sm"
                />
              </View>
            </View>

            <View style={styles.userDetails}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>📞</Text>
                <Text style={styles.detailValue}>{user.phone}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>📅</Text>
                <Text style={styles.detailValue}>{user.joinedDate}</Text>
              </View>
              {user.role === 'worker' && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Việc: {user.jobsCompleted}</Text>
                  <Text style={styles.detailLabel}>⭐ {user.rating.toFixed(1)}</Text>
                </View>
              )}
            </View>
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
  tabSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop: 12,
  },
  listSection: {
    paddingHorizontal: 16,
    gap: 12,
  },
  userCard: {
    marginBottom: 0,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  userEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  userStatus: {
    gap: 4,
    alignItems: 'flex-end',
  },
  userDetails: {
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: 12,
    gap: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    color: Colors.text,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 16,
  },
});
