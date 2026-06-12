import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { CATEGORIES } from '../../constants/categories';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface CategoryGridProps {
  onSelect: (categoryId: string, categoryName: string) => void;
  selectedId?: string;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({ onSelect, selectedId }) => {
  return (
    <View style={styles.grid}>
      {CATEGORIES.map((category) => {
        const isSelected = category.slug === selectedId;
        return (
          <TouchableOpacity
            key={category.slug}
            style={[
              styles.item,
              isSelected && { backgroundColor: category.color + '10', borderColor: category.color },
            ]}
            onPress={() => onSelect(category.slug, category.name)}
            activeOpacity={0.7}
          >
            <View style={[
              styles.iconContainer,
              { backgroundColor: isSelected ? category.color : category.color + '15' }
            ]}>
              <MaterialCommunityIcons
                name={category.icon as any}
                size={22}
                color={isSelected ? Colors.textWhite : category.color}
              />
            </View>
            <Text
              style={[styles.name, isSelected && { color: category.color, fontWeight: '700' }]}
              numberOfLines={1}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'flex-start',
  },
  item: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  name: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'center',
  },
});
