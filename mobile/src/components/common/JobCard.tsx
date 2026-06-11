import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Task } from '../../types';
import { formatCurrency, formatTimeRemaining, truncateText, getStatusLabel } from '../../utils/format';
import { Badge } from '../ui/Badge';
import { getCategoryById } from '../../constants/categories';

interface JobCardProps {
  task: Task;
  onPress: (task: Task) => void;
  showDistance?: boolean;
  distance?: number;
}

export const JobCard: React.FC<JobCardProps> = ({ task, onPress, showDistance, distance }) => {
  const category = getCategoryById(task.categoryId);

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: category?.color || Colors.primary }]}
      onPress={() => onPress(task)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.categoryRow}>
          {category && (
            <Badge label={category.name} variant="primary" size="sm" />
          )}
          <Badge
            label={getStatusLabel(task.status)}
            variant={
              task.status === 'OPEN' ? 'info' :
              task.status === 'IN_PROGRESS' ? 'warning' :
              task.status === 'COMPLETED' ? 'success' : 'error'
            }
            size="sm"
          />
        </View>
        <Text style={styles.title}>{truncateText(task.title, 50)}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {truncateText(task.description, 100)}
        </Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Ngân sách:</Text>
          <Text style={styles.price}>
            {formatCurrency(task.budgetMin)} - {formatCurrency(task.budgetMax)}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>⏰</Text>
            <Text style={styles.metaText}>
              {formatTimeRemaining(task.deadlineEnd)}
            </Text>
          </View>
          {showDistance && distance !== undefined && (
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>📍</Text>
              <Text style={styles.metaText}>{distance.toFixed(1)} km</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderLeftWidth: 4,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginRight: 6,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaIcon: {
    fontSize: 12,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
