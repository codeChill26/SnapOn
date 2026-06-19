import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated } from 'react-native';

export const ActivityListSkeleton: React.FC = () => {
  const fadeAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [fadeAnim]);

  const renderSkeletonCard = (index: number) => (
    <Animated.View key={index} style={[styles.card, { opacity: fadeAnim }]}>
      <View style={styles.mainRow}>
        {/* Left image placeholder */}
        <View style={styles.imagePlaceholder} />

        {/* Right details placeholder */}
        <View style={styles.content}>
          <View style={styles.badgeRow}>
            <View style={styles.badgePlaceholder} />
            <View style={styles.badgePlaceholder} />
          </View>
          <View style={styles.titleLine1} />
          <View style={styles.titleLine2} />
          <View style={styles.categoryLine} />
          <View style={styles.priceLine} />
        </View>
      </View>
      
      {/* Footer buttons placeholder */}
      <View style={styles.footer}>
        <View style={styles.btnPlaceholder} />
        <View style={styles.btnPlaceholder} />
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {[1, 2, 3].map(renderSkeletonCard)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EAECF0',
    padding: 12,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  mainRow: {
    flexDirection: 'row',
  },
  imagePlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: '#EAECF0',
  },
  content: {
    flex: 1,
    marginLeft: 12,
    gap: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  badgePlaceholder: {
    width: 60,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#EAECF0',
  },
  titleLine1: {
    height: 14,
    borderRadius: 4,
    backgroundColor: '#EAECF0',
    width: '90%',
  },
  titleLine2: {
    height: 14,
    borderRadius: 4,
    backgroundColor: '#EAECF0',
    width: '60%',
    marginBottom: 4,
  },
  categoryLine: {
    height: 10,
    borderRadius: 3,
    backgroundColor: '#F2F4F7',
    width: '40%',
  },
  priceLine: {
    height: 16,
    borderRadius: 4,
    backgroundColor: '#F2F4F7',
    width: '50%',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F4F7',
  },
  btnPlaceholder: {
    width: 90,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EAECF0',
  },
});
