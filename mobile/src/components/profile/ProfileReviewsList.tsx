import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { ProfileReview } from '../../types';
import { UserAvatar } from '../common/UserAvatar';
import { Ionicons } from '@expo/vector-icons';

interface ProfileReviewsListProps {
  ratingAverage: number;
  reviewCount: number;
  reviews: ProfileReview[];
}

export const ProfileReviewCard: React.FC<{ review: ProfileReview }> = React.memo(({ review }) => {
  const stars = [];
  const ratingFloor = Math.floor(review.rating);
  for (let i = 1; i <= 5; i++) {
    if (i <= ratingFloor) {
      stars.push(<Ionicons key={i} name="star" size={12} color={Colors.warning} />);
    } else {
      stars.push(<Ionicons key={i} name="star-outline" size={12} color={Colors.warning} />);
    }
  }

  const reviewDate = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString('vi-VN')
    : '';

  return (
    <View style={styles.reviewCard}>
      <View style={styles.cardHeader}>
        <UserAvatar
          name={review.reviewerName || 'User'}
          avatarUrl={review.reviewerAvatar}
          size={36}
        />
        <View style={styles.headerInfo}>
          <Text style={styles.reviewerName}>{review.reviewerName || 'Người dùng'}</Text>
          <View style={styles.ratingRow}>
            <View style={styles.starsContainer}>{stars}</View>
            <Text style={styles.dateText}>{reviewDate}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.commentText}>"{review.comment}"</Text>

      {review.taskName ? (
        <View style={styles.taskContainer}>
          <Ionicons name="briefcase-outline" size={12} color={Colors.textSecondary} />
          <Text style={styles.taskNameText} numberOfLines={1}>
            {review.taskName}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

export const ProfileReviewsList: React.FC<ProfileReviewsListProps> = ({
  ratingAverage,
  reviewCount,
  reviews = [],
}) => {
  return (
    <View style={styles.container}>
      {/* Overview Block */}
      {reviewCount > 0 && (
        <View style={styles.overview}>
          <View style={styles.scoreBlock}>
            <Text style={styles.scoreText}>{ratingAverage.toFixed(1)}</Text>
            <View style={styles.scoreRight}>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Ionicons
                    key={s}
                    name={s <= Math.round(ratingAverage) ? "star" : "star-outline"}
                    size={14}
                    color={Colors.warning}
                  />
                ))}
              </View>
              <Text style={styles.countText}>{reviewCount} đánh giá công khai</Text>
            </View>
          </View>
        </View>
      )}

      {/* Review Cards */}
      <View style={styles.list}>
        {reviews.map((rev) => (
          <ProfileReviewCard key={rev.id} review={rev} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    paddingVertical: 16,
  },
  overview: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  scoreBlock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.text,
    marginRight: 16,
  },
  scoreRight: {
    justifyContent: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  countText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  list: {
    paddingHorizontal: 16,
  },
  reviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 1.5,
  },
  dateText: {
    fontSize: 11,
    color: Colors.textLight,
    marginLeft: 8,
  },
  commentText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 10,
    fontStyle: 'italic',
  },
  taskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    gap: 4,
  },
  taskNameText: {
    fontSize: 11,
    color: Colors.textSecondary,
    flex: 1,
  },
});
