import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { HomeTheme } from '../home/HomeTheme';
import { JOB_FIELDS, JobField, JobSubcategory } from '../../constants/jobCategories';

interface CategoryPickerModalProps {
  visible: boolean;
  selectedFieldId?: string;
  selectedSubcategoryId?: string;
  onClose: () => void;
  onSelectField: (field: JobField) => void;
  onSelectSubcategory: (field: JobField, subcategory: JobSubcategory) => void;
  onClear: () => void;
  fields?: JobField[];
}

// Accent-insensitive normalization helper
const normalizeText = (text: string): string => {
  return (text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
};

export const CategoryPickerModal: React.FC<CategoryPickerModalProps> = ({
  visible,
  selectedFieldId,
  selectedSubcategoryId,
  onClose,
  onSelectField,
  onSelectSubcategory,
  onClear,
  fields,
}) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  
  const fieldsList = useMemo(() => {
    return fields && fields.length > 0 ? fields : JOB_FIELDS;
  }, [fields]);

  const [activeFieldId, setActiveFieldId] = useState<string>(
    selectedFieldId || fieldsList[0]?.id || ''
  );

  // Sync activeFieldId when selectedFieldId or fieldsList changes
  React.useEffect(() => {
    if (selectedFieldId) {
      setActiveFieldId(selectedFieldId);
    } else if (fieldsList.length > 0 && (!activeFieldId || !fieldsList.some((f) => f.id === activeFieldId))) {
      setActiveFieldId(fieldsList[0].id);
    }
  }, [selectedFieldId, fieldsList]);

  const [isGridExpanded, setIsGridExpanded] = useState(false);

  // Reset local states on close or clear
  const handleClose = useCallback(() => {
    setSearchQuery('');
    onClose();
  }, [onClose]);

  const handleClearSelection = useCallback(() => {
    setSearchQuery('');
    onClear();
    onClose();
  }, [onClear, onClose]);

  // Find active field info
  const activeField = useMemo(() => {
    return fieldsList.find((f) => f.id === activeFieldId) || fieldsList[0];
  }, [activeFieldId, fieldsList]);

  // Accent-insensitive search matching
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const normalizedQuery = normalizeText(searchQuery);
    const results: Array<{
      subcategory: JobSubcategory;
      parentField: JobField;
    }> = [];

    fieldsList.forEach((field) => {
      const normalizedFieldName = normalizeText(field.name);
      
      field.subcategories.forEach((sub) => {
        const normalizedSubName = normalizeText(sub.name);
        
        // Match query against subcategory name OR field name
        if (
          normalizedSubName.includes(normalizedQuery) ||
          normalizedFieldName.includes(normalizedQuery)
        ) {
          results.push({
            subcategory: sub,
            parentField: field,
          });
        }
      });
    });

    return results;
  }, [searchQuery, fieldsList]);

  // Check if anything is currently selected
  const hasSelection = Boolean(selectedFieldId || selectedSubcategoryId);

  // Render a field chip
  const renderFieldChip = (field: JobField) => {
    const isActive = field.id === activeFieldId;
    return (
      <TouchableOpacity
        key={field.id}
        style={[
          styles.chip,
          isActive ? styles.chipActive : styles.chipInactive,
        ]}
        onPress={() => {
          setActiveFieldId(field.id);
          setIsGridExpanded(false); // Collapse grid on choice
        }}
        accessibilityRole="button"
        accessibilityLabel={`Công việc: ${field.name}`}
        accessibilityState={{ selected: isActive }}
      >
        <MaterialCommunityIcons
          name={field.icon}
          size={16}
          color={isActive ? '#FFFFFF' : HomeTheme.colors.text}
          style={styles.chipIcon}
        />
        <Text style={[styles.chipText, isActive && styles.chipTextActive]} numberOfLines={1}>
          {field.name}
        </Text>

        {/* Absolute "Hot" Badge */}
        {field.isHot && (
          <View style={styles.hotBadge}>
            <Text style={styles.hotBadgeText}>Hot</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Render a specific subcategory list item
  const renderSubcategoryRow = ({ item }: { item: JobSubcategory }) => {
    const isSelected = selectedSubcategoryId === item.id;
    return (
      <TouchableOpacity
        style={[styles.row, isSelected && styles.rowSelected]}
        onPress={() => onSelectSubcategory(activeField, item)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}`}
        accessibilityState={{ selected: isSelected }}
      >
        <Text style={[styles.rowText, isSelected && styles.rowTextSelected]}>
          {item.name}
        </Text>
        {isSelected && (
          <Ionicons name="checkmark" size={20} color={HomeTheme.colors.primary} />
        )}
      </TouchableOpacity>
    );
  };

  // Render a search result item
  const renderSearchResultRow = ({
    item,
  }: {
    item: { subcategory: JobSubcategory; parentField: JobField };
  }) => {
    const { subcategory, parentField } = item;
    const isSelected = selectedSubcategoryId === subcategory.id;
    
    return (
      <TouchableOpacity
        style={[styles.row, isSelected && styles.rowSelected]}
        onPress={() => onSelectSubcategory(parentField, subcategory)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${subcategory.name} thuộc ${parentField.name}`}
        accessibilityState={{ selected: isSelected }}
      >
        <View style={styles.resultCol}>
          <Text style={[styles.rowText, isSelected && styles.rowTextSelected]}>
            {subcategory.name}
          </Text>
          <Text style={styles.resultMeta}>
            {parentField.name}
          </Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark" size={20} color={HomeTheme.colors.primary} />
        )}
      </TouchableOpacity>
    );
  };

  // Header rows: "Tất cả danh mục" & "Tất cả [lĩnh vực đang chọn]"
  const renderAllFieldRow = () => {
    const isAllCategoriesSelected = !selectedFieldId && !selectedSubcategoryId;
    const isFieldSelected = selectedFieldId === activeField.id && !selectedSubcategoryId;

    return (
      <View style={styles.headerRowsContainer}>
        {/* Option 1: Tất cả danh mục (Toàn bộ việc làm) */}
        <TouchableOpacity
          style={[styles.row, isAllCategoriesSelected && styles.rowSelected]}
          onPress={handleClearSelection}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Tất cả danh mục (Xem toàn bộ công việc)"
          accessibilityState={{ selected: isAllCategoriesSelected }}
        >
          <View style={styles.resultCol}>
            <Text style={[styles.rowText, isAllCategoriesSelected && styles.rowTextSelected, styles.rowTextAll]}>
              🌐 Tất cả danh mục (Toàn bộ việc làm)
            </Text>
          </View>
          {isAllCategoriesSelected && (
            <Ionicons name="checkmark" size={20} color={HomeTheme.colors.primary} />
          )}
        </TouchableOpacity>

        {/* Option 2: Tất cả trong lĩnh vực hiện tại */}
        <TouchableOpacity
          style={[styles.row, isFieldSelected && styles.rowSelected, styles.subHeaderRow]}
          onPress={() => onSelectField(activeField)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Tất cả ${activeField.name}`}
          accessibilityState={{ selected: isFieldSelected }}
        >
          <Text style={[styles.rowText, isFieldSelected && styles.rowTextSelected, styles.rowTextAll]}>
            📁 Tất cả {activeField.name}
          </Text>
          {isFieldSelected && (
            <Ionicons name="checkmark" size={20} color={HomeTheme.colors.primary} />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* 1. Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
            >
              <Ionicons name="chevron-back" size={24} color={HomeTheme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Chọn công việc</Text>
          </View>

          <TouchableOpacity
            style={[styles.clearButton, !hasSelection && styles.clearButtonDisabled]}
            onPress={handleClearSelection}
            disabled={!hasSelection}
            activeOpacity={0.7}
          >
            <Text style={[styles.clearButtonText, !hasSelection && styles.clearButtonTextDisabled]}>
              Bỏ chọn công việc
            </Text>
          </TouchableOpacity>
        </View>

        {/* 2. Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchWrapper}>
            <Ionicons name="search-outline" size={18} color={HomeTheme.colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm"
              placeholderTextColor={HomeTheme.colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              accessibilityLabel="Tìm kiếm công việc"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={8}
                style={styles.searchClear}
              >
                <Ionicons name="close-circle" size={16} color={HomeTheme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 3. Field selector (shown only when not searching) */}
        {!searchQuery.trim() && (
          <View style={styles.selectorContainer}>
            <View style={styles.selectorRow}>
              {isGridExpanded ? (
                <View style={styles.gridContainer}>
                  <Text style={styles.gridTitle}>Chọn nhóm công việc</Text>
                  <View style={styles.grid}>
                    {fieldsList.map(renderFieldChip)}
                  </View>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.scrollContainer}
                >
                  {fieldsList.map(renderFieldChip)}
                </ScrollView>
              )}

              {/* Chevron Button to expand/collapse grid */}
              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => setIsGridExpanded(!isGridExpanded)}
                accessibilityRole="button"
                accessibilityLabel={isGridExpanded ? "Thu gọn công việc" : "Mở rộng công việc"}
              >
                <Ionicons
                  name={isGridExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={HomeTheme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 4. Subcategory / Search List */}
        <View style={styles.listContainer}>
          {searchQuery.trim() ? (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.subcategory.id}
              renderItem={renderSearchResultRow}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={48} color={HomeTheme.colors.textMuted} style={{ marginBottom: 12 }} />
                  <Text style={styles.emptyTitle}>Không tìm thấy công việc phù hợp</Text>
                  <Text style={styles.emptySubtitle}>Hãy thử từ khóa khác</Text>
                </View>
              }
            />
          ) : (
            <FlatList
              data={activeField.subcategories}
              keyExtractor={(item) => item.id}
              renderItem={renderSubcategoryRow}
              ListHeaderComponent={renderAllFieldRow()}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: HomeTheme.colors.divider,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: HomeTheme.colors.text,
  },
  clearButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  clearButtonDisabled: {
    opacity: 0.4,
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: HomeTheme.colors.primary,
  },
  clearButtonTextDisabled: {
    color: HomeTheme.colors.textSecondary,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchWrapper: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F4F7',
    borderRadius: HomeTheme.radius.medium,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    fontWeight: '500',
    color: HomeTheme.colors.text,
  },
  searchClear: {
    padding: 4,
  },
  selectorContainer: {
    borderBottomWidth: 1,
    borderBottomColor: HomeTheme.colors.divider,
    backgroundColor: '#FFFFFF',
    zIndex: 20,
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  scrollContainer: {
    paddingLeft: 16,
    paddingRight: 56, // Avoid overlaps with expandButton
    paddingVertical: 12,
    gap: 8,
  },
  expandButton: {
    position: 'absolute',
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: HomeTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#101828',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  gridContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  gridTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: HomeTheme.colors.textSecondary,
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingRight: 32, // Prevent covers
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 10,
    position: 'relative',
    marginRight: 4,
    marginBottom: 4,
  },
  chipActive: {
    backgroundColor: HomeTheme.colors.primary,
  },
  chipInactive: {
    backgroundColor: '#F2F4F7',
  },
  chipIcon: {
    marginRight: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: HomeTheme.colors.textSecondary,
    maxWidth: 150,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  hotBadge: {
    position: 'absolute',
    top: -5,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  hotBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  listContainer: {
    flex: 1,
  },
  headerRowsContainer: {
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
  },
  subHeaderRow: {
    backgroundColor: '#FFFFFF',
  },
  row: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F3',
    paddingVertical: 10,
  },
  rowSelected: {
    backgroundColor: '#F9FAFB',
  },
  rowText: {
    fontSize: 15,
    fontWeight: '500',
    color: HomeTheme.colors.text,
    flex: 1,
  },
  rowTextSelected: {
    color: HomeTheme.colors.primary,
    fontWeight: '700',
  },
  rowTextAll: {
    fontWeight: '700',
  },
  resultCol: {
    flex: 1,
  },
  resultMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: HomeTheme.colors.textSecondary,
    marginTop: 2,
  },
  emptyContainer: {
    paddingVertical: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: HomeTheme.colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: HomeTheme.colors.textSecondary,
    textAlign: 'center',
  },
});
