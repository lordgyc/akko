import { PrimaryButton, SecondaryButton } from '@/components/ui/button';
import { InputField } from '@/components/ui/input-field';
import { BeerItem, supabase } from '@/config/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Category } from '@/config/supabase';

export default function UpdateStockScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const router = useRouter();
  const [item, setItem] = useState<BeerItem | null>(null);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [cost, setCost] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategoryInput, setShowAddCategoryInput] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  useEffect(() => {
    if (itemId) {
      fetchCategories();
      fetchItem();
    }
  }, [itemId]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from('category').select('*').order('name');
      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsCreatingCategory(true);
    try {
      const { data, error } = await supabase
        .from('category')
        .insert({ name: newCategoryName.trim() })
        .select()
        .single();
      if (error) throw error;

      const newCat = data as Category;
      setCategories((prev) => [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedCategory(newCat.id);
      setNewCategoryName('');
      setShowAddCategoryInput(false);
      Alert.alert('Success', 'Category added!');
    } catch (err) {
      console.error('Error adding category:', err);
      Alert.alert('Error', 'Failed to add category');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const fetchItem = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('id', itemId)
        .single();

      if (error) throw error;
      if (data) {
        setItem(data);
        setName(data.name);
        setQuantity(data.quantity.toString());
        setUnit(data.unit);
        setCost(data.cost.toString());
        setSelectedCategory(data.cat || null);
      }
    } catch (error) {
      console.error('Error fetching item:', error);
      Alert.alert('Error', 'Failed to load item');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!name.trim() || !quantity.trim() || !unit.trim() || !cost.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('items')
        .update({
          name: name.trim(),
          quantity: parseInt(quantity, 10),
          unit: unit.trim(),
          cost: parseFloat(cost),
          cat: selectedCategory,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId);

      if (error) throw error;
      Alert.alert('Success', 'Item updated!');
      router.back();
    } catch (error) {
      console.error('Error updating item:', error);
      Alert.alert('Error', 'Failed to update item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert('Delete Item', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', onPress: () => {}, style: 'cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          setSaving(true);
          try {
            const { error } = await supabase
              .from('items')
              .delete()
              .eq('id', itemId);

            if (error) throw error;
            Alert.alert('Success', 'Item deleted!');
            router.back();
          } catch (error) {
            console.error('Error deleting item:', error);
            Alert.alert('Error', 'Failed to delete item');
          } finally {
            setSaving(false);
          }
        },
        style: 'destructive',
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContent}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: colors.purple }]}> Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.tint }]}>Update Stock</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <InputField
            label="Name"
            placeholder="Item name"
            value={name}
            onChangeText={setName}
          />

          {/* Category Selection */}
          <View style={styles.categoryLabelRow}>
            <Text style={[styles.categoryLabel, { color: colors.text }]}>Category (Optional)</Text>
            <TouchableOpacity onPress={() => setShowAddCategoryInput(!showAddCategoryInput)}>
              <Text style={[styles.addCategoryLink, { color: colors.purple }]}>
                {showAddCategoryInput ? 'Cancel' : '+ New Category'}
              </Text>
            </TouchableOpacity>
          </View>

          {showAddCategoryInput && (
            <View style={[styles.inlineCategoryForm, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <InputField
                label="New Category Name"
                placeholder="e.g., Beverages"
                value={newCategoryName}
                onChangeText={setNewCategoryName}
              />
              <View style={styles.inlineCategoryButtons}>
                <TouchableOpacity
                  onPress={handleAddCategory}
                  disabled={isCreatingCategory}
                  style={[styles.inlineCatBtn, { backgroundColor: colors.purple }]}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>
                    {isCreatingCategory ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryList}
          >
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(isSelected ? null : cat.id)}
                  style={[
                    styles.categoryPill,
                    {
                      backgroundColor: isSelected ? colors.purple : colors.backgroundElement,
                      borderColor: isSelected ? colors.purple : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      { color: isSelected ? '#fff' : colors.text },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {categories.length === 0 && (
              <Text style={{ color: colors.textSecondary, fontSize: 13, fontStyle: 'italic' }}>
                No categories added yet
              </Text>
            )}
          </ScrollView>

          <InputField
            label="Unit"
            placeholder="e.g., Box, Bottle, Case"
            value={unit}
            onChangeText={setUnit}
          />
          <InputField
            label="Quantity"
            placeholder="Number of units"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
          />
          <InputField
            label="Cost"
            placeholder="Cost per unit"
            value={cost}
            onChangeText={setCost}
            keyboardType="decimal-pad"
          />

          <PrimaryButton
            title={saving ? 'Saving...' : 'Update'}
            onPress={handleUpdate}
            disabled={saving}
            style={styles.button}
          />
          <SecondaryButton
            title="Delete Item"
            onPress={handleDelete}
            disabled={saving}
            style={styles.deleteButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    marginBottom: 8,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 120, // Keep bottom padding so input doesn't get blocked by keyboard
  },
  button: {
    marginTop: 24,
  },
  deleteButton: {
    marginTop: 12,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  categoryLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  addCategoryLink: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryList: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
    paddingVertical: 4,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '500',
  },
  inlineCategoryForm: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  inlineCategoryButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  inlineCatBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
});
