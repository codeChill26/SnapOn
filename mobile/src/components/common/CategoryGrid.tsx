import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { CATEGORIES } from '../../constants/categories';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface CategoryGridProps {
  onSelect: (categoryId: string, categoryName: string) => void;
  selectedId?: string;
  isDark?: boolean;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({ onSelect, selectedId, isDark }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContainer}
    >
      {CATEGORIES.map((category) => {
        const isSelected = category.slug === selectedId;
        const softBg = category.color + '0C'; // Soft background tint (~5% opacity)

        return (
          <TouchableOpacity
            key={category.slug}
            style={[
              styles.item,
              { 
                backgroundColor: isSelected 
                  ? Colors.primarySoft 
                  : (isDark ? 'rgba(30, 41, 59, 0.5)' : Colors.surface), 
                borderColor: isSelected 
                  ? Colors.primary 
                  : (isDark ? 'rgba(255, 255, 255, 0.08)' : Colors.border) 
              }
            ]}
            onPress={() => onSelect(category.slug, category.name)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`Danh mục: ${category.name}`}
          >
            <View style={[
              styles.iconContainer,
              { backgroundColor: isSelected ? Colors.primary : softBg }
            ]}>
              <MaterialCommunityIcons
                name={category.icon as any}
                size={22}
                color={isSelected ? Colors.textWhite : category.color}
              />
            </View>
            <View style={styles.textContainer}>
              <Text
                style={[
                  styles.name, 
                  { 
                    color: isSelected 
                      ? Colors.primary 
                      : (isDark ? '#F1F5F9' : Colors.text),
                    fontWeight: isSelected ? '700' : '600'
                  }
                ]}
                numberOfLines={2}
              >
                {category.name}
              </Text>
            </View>
            {isSelected && (
              <View style={styles.checkIndicator}>
                <MaterialCommunityIcons name="check-circle" size={14} color={Colors.primary} />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 150,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
    position: 'relative',
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 12,
    lineHeight: 15,
  },
  checkIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
});
