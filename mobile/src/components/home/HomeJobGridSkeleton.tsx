import React from 'react';
import {
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { HomeTheme } from './HomeTheme';

export const HomeJobGridSkeleton: React.FC = () => {
  const { width: screenWidth } = useWindowDimensions();

  const cardWidth = React.useMemo(() => {
    const horizontalPadding = 16;
    const columnGap = 12;
    return (screenWidth - horizontalPadding * 2 - columnGap) / 2;
  }, [screenWidth]);

  const skeletonItems = [1, 2, 3, 4];

  return (
    <View style={styles.container}>
      {skeletonItems.map((item) => (
        <View key={item} style={[styles.card, { width: cardWidth }]}>
          {/* Image Block */}
          <View style={styles.imageBlock} />

          {/* Content Block */}
          <View style={styles.content}>
            {/* Title Line 1 */}
            <View style={styles.titleLine1} />
            {/* Title Line 2 */}
            <View style={styles.titleLine2} />

            {/* Category Tag */}
            <View style={styles.categoryTag} />

            {/* Price block */}
            <View style={styles.priceBlock} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: HomeTheme.colors.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  imageBlock: {
    width: '100%',
    aspectRatio: 1.25,
    backgroundColor: '#F0F1F3',
  },
  content: {
    padding: HomeTheme.spacing.md,
  },
  titleLine1: {
    width: '90%',
    height: 12,
    backgroundColor: '#F0F1F3',
    borderRadius: 4,
    marginBottom: HomeTheme.spacing.xs,
  },
  titleLine2: {
    width: '60%',
    height: 12,
    backgroundColor: '#F0F1F3',
    borderRadius: 4,
    marginBottom: HomeTheme.spacing.md,
  },
  categoryTag: {
    width: 65,
    height: 16,
    backgroundColor: '#F0F1F3',
    borderRadius: 6,
    marginBottom: HomeTheme.spacing.sm,
  },
  priceBlock: {
    width: '75%',
    height: 18,
    backgroundColor: '#F0F1F3',
    borderRadius: 4,
  },
});
