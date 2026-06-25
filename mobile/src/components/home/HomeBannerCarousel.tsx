import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AppState,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { CATEGORIES } from '../../constants/categories';
import { bannerService } from '../../services/bannerService';
import { HomeBanner } from '../../types';

interface HomeBannerCarouselProps {
  onSelectCategory: (categoryId: string, categoryName: string) => void;
  selectedFieldId?: string;
  refreshKey?: number;
}

interface HomeBannerLoopItem extends HomeBanner {
  loopKey: string;
}

interface ResolvedCategory {
  id: string;
  name: string;
}

interface BannerItemProps {
  item: HomeBanner;
  width: number;
  selected: boolean;
  onPress: (banner: HomeBanner) => void;
}

const AUTO_PLAY_INTERVAL = 5000;
const CARD_GAP = 16;
const IMAGE_HEIGHT = 148;

const resolveCategory = (banner: HomeBanner): ResolvedCategory | null => {
  if (!banner.category) return null;
  return {
    id: banner.category.id,
    name: banner.category.name,
  };
};

const BannerItem = React.memo<BannerItemProps>(
  ({ item, width, selected, onPress }) => {
    const [imageError, setImageError] = useState(false);
    const category = resolveCategory(item);

    const handlePress = useCallback(() => {
      onPress(item);
    }, [item, onPress]);

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        disabled={!category}
        style={[
          styles.card,
          { width },
          selected && styles.cardSelected,
          !category && styles.cardDisabled,
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected, disabled: !category }}
        accessibilityLabel={`${item.title}. ${item.subtitle ?? ''}`}
        accessibilityHint="Nhấn để lọc công việc theo danh mục này"
      >
        <View style={styles.imageWrapper}>
          {!imageError && item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.fallbackBackground]}>
              <Ionicons name="image-outline" size={38} color="#64748B" />
            </View>
          )}

          <View style={[StyleSheet.absoluteFill, styles.imageOverlay]} />

          {category ? (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText} numberOfLines={1}>
                {category.name.toUpperCase()}
              </Text>
            </View>
          ) : null}

          {selected ? (
            <View style={styles.selectedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
              <Text style={styles.selectedBadgeText}>Đang lọc</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>

          <Text style={styles.subtitle} numberOfLines={2}>
            {item.subtitle || `Khám phá các công việc thuộc ${category?.name ?? 'danh mục này'}.`}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="briefcase-outline" size={13} color="#94A3B8" />
              <Text style={styles.metaText}>Việc theo danh mục</Text>
            </View>

            <Ionicons
              name={selected ? 'checkmark-circle' : 'arrow-forward-circle'}
              size={19}
              color={selected ? Colors.primary : '#CBD5E1'}
            />
          </View>

          <View style={[styles.actionButton, selected && styles.actionButtonSelected]}>
            <Text style={styles.actionText}>
              {selected ? 'Bỏ lọc danh mục' : 'Xem công việc'}
            </Text>
            <Ionicons
              name={selected ? 'close-circle-outline' : 'funnel-outline'}
              size={16}
              color="#FFFFFF"
              style={styles.actionIcon}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  },
);

export const HomeBannerCarousel: React.FC<HomeBannerCarouselProps> = React.memo(({
  onSelectCategory,
  selectedFieldId,
  refreshKey = 0,
}) => {
  const { width: screenWidth } = useWindowDimensions();

  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const listRef = useRef<FlatList<HomeBannerLoopItem>>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentIndexRef = useRef(0);

  const horizontalPadding = 16;
  const cardWidth = Math.min(300, screenWidth - 56);
  const itemSpan = cardWidth + CARD_GAP;

  const loopBanners = useMemo<HomeBannerLoopItem[]>(() => {
    if (banners.length <= 1) {
      return banners.map((item) => ({
        ...item,
        loopKey: String(item.id),
      }));
    }

    const firstBanner = banners[0];
    if (!firstBanner) return [];

    return [
      ...banners.map((item) => ({
        ...item,
        loopKey: String(item.id),
      })),
      {
        ...firstBanner,
        loopKey: `${String(firstBanner.id)}-loop-copy`,
      },
    ];
  }, [banners]);

  const fetchBanners = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const data = await bannerService.getHomeBanners();
      setBanners(data);
      currentIndexRef.current = 0;
      setActiveIndex(0);
    } catch (err) {
      console.error('Failed to load home banners:', err);
      setError(true);
      setBanners([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(false);
        const data = await bannerService.getHomeBanners();

        if (isMounted) {
          setBanners(data);
          currentIndexRef.current = 0;
          setActiveIndex(0);
        }
      } catch (err) {
        console.error('Failed to load home banners:', err);

        if (isMounted) {
          setError(true);
          setBanners([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const stopAutoPlay = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startAutoPlay = useCallback(() => {
    stopAutoPlay();
    if (banners.length <= 1) return;

    timerRef.current = setInterval(() => {
      if (!listRef.current) return;

      if (currentIndexRef.current >= banners.length) {
        listRef.current.scrollToIndex({ index: 0, animated: false });
        currentIndexRef.current = 0;
      }

      const nextIndex = currentIndexRef.current + 1;
      listRef.current.scrollToIndex({ index: nextIndex, animated: true });
      currentIndexRef.current = nextIndex;
      setActiveIndex(nextIndex === banners.length ? 0 : nextIndex);
    }, AUTO_PLAY_INTERVAL);
  }, [banners.length, stopAutoPlay]);

  useEffect(() => {
    if (banners.length > 1) {
      startAutoPlay();
    } else {
      stopAutoPlay();
    }

    return stopAutoPlay;
  }, [banners.length, startAutoPlay, stopAutoPlay]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && banners.length > 1) {
        startAutoPlay();
      } else {
        stopAutoPlay();
      }
    });

    return () => subscription.remove();
  }, [banners.length, startAutoPlay, stopAutoPlay]);

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (banners.length <= 1) return;

      const contentOffsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(contentOffsetX / itemSpan);

      if (index >= banners.length) {
        listRef.current?.scrollToIndex({ index: 0, animated: false });
        currentIndexRef.current = 0;
        setActiveIndex(0);
      } else {
        currentIndexRef.current = index;
        setActiveIndex(index);
      }

      startAutoPlay();
    },
    [banners.length, itemSpan, startAutoPlay],
  );

  const handleBannerPress = useCallback(
    (banner: HomeBanner) => {
      if (banner.category) {
        onSelectCategory(banner.category.id, banner.category.name);
      }
    },
    [onSelectCategory],
  );

  const renderItem = useCallback(
    ({ item }: { item: HomeBannerLoopItem }) => {
      const isSelected = item.category?.id === selectedFieldId;
      return (
        <BannerItem
          item={item}
          width={cardWidth}
          selected={isSelected}
          onPress={handleBannerPress}
        />
      );
    },
    [cardWidth, handleBannerPress, selectedFieldId],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<HomeBannerLoopItem> | null | undefined, index: number) => ({
      length: itemSpan,
      offset: itemSpan * index,
      index,
    }),
    [itemSpan],
  );

  const keyExtractor = useCallback(
    (item: HomeBannerLoopItem) => item.loopKey,
    [],
  );

  if (loading) {
    return (
      <View style={styles.skeletonContainer}>
        <View style={[styles.cardSkeleton, { width: cardWidth }]}>
          <View style={styles.imageSkeleton} />
          <View style={styles.contentSkeleton}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonText} />
            <View style={styles.skeletonTextShort} />
            <View style={styles.skeletonButton} />
          </View>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={34} color={Colors.primary} />
        <Text style={styles.errorText}>Không thể tải danh mục nổi bật</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchBanners}
          activeOpacity={0.8}
        >
          <Text style={styles.retryButtonText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (banners.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        horizontal
        data={loopBanners}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        showsHorizontalScrollIndicator={false}
        bounces={false}
        decelerationRate="fast"
        snapToInterval={itemSpan}
        snapToAlignment="start"
        disableIntervalMomentum
        contentContainerStyle={{ paddingHorizontal: horizontalPadding }}
        ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
        initialNumToRender={2}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        getItemLayout={getItemLayout}
        onScrollBeginDrag={stopAutoPlay}
        onMomentumScrollEnd={handleMomentumScrollEnd}
      />

      {banners.length > 1 ? (
        <View style={styles.pagination}>
          {banners.map((banner, index) => (
            <View
              key={String(banner.id)}
              style={[
                styles.dot,
                index === activeIndex ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingBottom: 18,
  },
  card: {
    minHeight: 318,
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(30, 41, 59, 0.72)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 4,
  },
  cardSelected: {
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.24,
  },
  cardDisabled: {
    opacity: 0.65,
  },
  imageWrapper: {
    width: '100%',
    height: IMAGE_HEIGHT,
    position: 'relative',
    backgroundColor: '#111827',
  },
  fallbackBackground: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#172033',
  },
  imageOverlay: {
    backgroundColor: 'rgba(8, 15, 31, 0.25)',
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    maxWidth: '68%',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: 'rgba(245, 130, 32, 0.96)',
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.45,
  },
  selectedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  selectedBadgeText: {
    marginLeft: 4,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  title: {
    minHeight: 40,
    marginBottom: 5,
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
  },
  subtitle: {
    minHeight: 36,
    marginBottom: 12,
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    marginLeft: 5,
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 8,
    backgroundColor: Colors.primary,
  },
  actionButtonSelected: {
    backgroundColor: 'rgba(245, 130, 32, 0.76)',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  actionIcon: {
    marginLeft: 6,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  dot: {
    height: 6,
    marginHorizontal: 3,
    borderRadius: 3,
  },
  activeDot: {
    width: 20,
    backgroundColor: Colors.primary,
  },
  inactiveDot: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  skeletonContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
  },
  cardSkeleton: {
    minHeight: 318,
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(30, 41, 59, 0.72)',
  },
  imageSkeleton: {
    height: IMAGE_HEIGHT,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  contentSkeleton: {
    padding: 16,
  },
  skeletonTitle: {
    width: '76%',
    height: 18,
    marginBottom: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  skeletonText: {
    width: '100%',
    height: 11,
    marginBottom: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  skeletonTextShort: {
    width: '64%',
    height: 11,
    marginBottom: 22,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  skeletonButton: {
    width: '100%',
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 130, 32, 0.2)',
  },
  errorContainer: {
    minHeight: 180,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(30, 41, 59, 0.72)',
  },
  errorText: {
    marginTop: 10,
    marginBottom: 14,
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
  },
  retryButton: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(245, 130, 32, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 130, 32, 0.3)',
  },
  retryButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
});

export default HomeBannerCarousel;
