import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Chip, Text, TextInput, Button, useTheme } from 'react-native-paper';
import { Category } from '@/types/expense';
import { CategoryRepository } from '@/services/db/category-repository';

interface CategoryPickerProps {
  selectedCategoryId: string;
  onSelectCategory: (category: Category) => void;
}

export function CategoryPicker({ selectedCategoryId, onSelectCategory }: CategoryPickerProps) {
  const theme = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const data = await CategoryRepository.getAllCategories();
      setCategories(data);
      // Jika belum ada yang terpilih dan ada kategori, pilih yang pertama
      if (!selectedCategoryId && data.length > 0) {
        onSelectCategory(data[0]);
      }
    } catch (error) {
      console.error('Gagal memuat kategori:', error);
    }
  }

  async function handleCreateNewCategory() {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    try {
      setIsCreating(true);
      const newCategory = await CategoryRepository.findOrCreateCategory(trimmed);
      await loadCategories();
      onSelectCategory(newCategory);
      setSearchQuery('');
    } catch (error) {
      console.error('Gagal membuat kategori baru:', error);
    } finally {
      setIsCreating(false);
    }
  }

  // Filter kategori berdasarkan query pencarian
  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const isExactMatch = categories.some(
    (cat) => cat.name.toLowerCase() === searchQuery.trim().toLowerCase()
  );

  return (
    <View style={styles.container}>
      <Text variant="titleSmall" style={styles.label}>
        Kategori Pengeluaran
      </Text>

      {/* Input Pencarian & Pembuatan Kategori */}
      <TextInput
        mode="outlined"
        placeholder="Cari atau ketik kategori baru..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchInput}
        left={<TextInput.Icon icon="magnify" />}
        right={
          searchQuery ? (
            <TextInput.Icon icon="close" onPress={() => setSearchQuery('')} />
          ) : null
        }
        dense
      />

      {/* Tombol Buat Kategori Baru jika belum ada */}
      {searchQuery.trim().length > 0 && !isExactMatch && (
        <View style={styles.createBox}>
          <Button
            mode="contained-tonal"
            icon="plus"
            loading={isCreating}
            disabled={isCreating}
            onPress={handleCreateNewCategory}
            style={styles.createButton}>
            Buat kategori baru: &quot;{searchQuery.trim()}&quot;
          </Button>
        </View>
      )}

      {/* Daftar Pilihan Kategori */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipContainer}>
        {filteredCategories.map((cat) => {
          const isSelected = cat.id === selectedCategoryId;
          return (
            <Chip
              key={cat.id}
              selected={isSelected}
              onPress={() => onSelectCategory(cat)}
              style={[
                styles.chip,
                isSelected && { backgroundColor: cat.color + '25', borderColor: cat.color },
              ]}
              textStyle={isSelected ? { color: cat.color, fontWeight: '700' } : undefined}
              icon={cat.icon || 'tag-outline'}>
              {cat.name}
            </Chip>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    marginBottom: 6,
    fontWeight: '600',
  },
  searchInput: {
    marginBottom: 8,
  },
  createBox: {
    marginBottom: 8,
  },
  createButton: {
    borderRadius: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    marginRight: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
