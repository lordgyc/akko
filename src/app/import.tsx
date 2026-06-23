import { PrimaryButton } from '@/components/ui/button';
import { InputField } from '@/components/ui/input-field';
import { BeerItem, supabase } from '@/config/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ImportScreen() {
  const { itemId } = useLocalSearchParams<{ itemId?: string }>();
  
  const [items, setItems] = useState<BeerItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<any | null>(null);
  const [selectedItem, setSelectedItem] = useState<BeerItem | null>(null);
  const [quantity, setQuantity] = useState('');
  const [cost, setCost] = useState('');
  const [remark, setRemark] = useState(''); // New state for the optional remark
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  useEffect(() => {
    fetchItems();
  }, []);

  // Safe string-based comparison to prevent type mismatch bugs (e.g. 12 vs "12")
  useEffect(() => {
    if (items.length > 0 && itemId) {
      const foundItem = items.find((i) => String(i.id) === String(itemId));
      if (foundItem) {
        setSelectedItem(foundItem);
        setSelectedItemId(foundItem.id); // Retains its original type (number or string) for database updates
        setCost(foundItem.cost.toString());
      }
    }
  }, [items, itemId]);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase.from('items').select('*');
      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      Alert.alert('Error', 'Failed to fetch items');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectItem = (item: BeerItem) => {
    setSelectedItem(item);
    setSelectedItemId(item.id);
    setCost(item.cost.toString());
  };

  const handleImport = async () => {
    if (!selectedItem || !quantity || !cost) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setImporting(true);
    try {
      const qty = parseInt(quantity, 10);
      const newCost = parseFloat(cost);

      if (isNaN(qty) || qty <= 0) {
        Alert.alert('Error', 'Please enter a valid quantity');
        setImporting(false);
        return;
      }

      // Update the items table
      const { error: updateError } = await supabase
        .from('items')
        .update({
          quantity: selectedItem.quantity + qty,
          cost: newCost,
        })
        .eq('id', selectedItemId);

      if (updateError) throw updateError;

      // Log to imports table (including the optional remark)
      const { error: logError } = await supabase.from('import').insert({
        item: selectedItemId,
        quantity: qty,
        cost: newCost,
        remark: remark.trim() || null, // Submits null if the user leaves it blank
      });

      if (logError) throw logError;

      Alert.alert('Success', `Imported ${qty} units successfully`);
      setSelectedItem(null);
      setSelectedItemId(null);
      setQuantity('');
      setCost('');
      setRemark(''); // Clear the remark state on success
      fetchItems();
      router.back();
    } catch (error) {
      console.error('Error importing:', error);
      Alert.alert('Error', 'Failed to import item');
    } finally {
      setImporting(false);
    }
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

  // Fallback check: only show the selection list if there is no route parameter
  // OR if we failed to match the passed ID to any item in our database.
  const showSelectionList = !itemId || !selectedItem;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: colors.purple }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.tint }]}>Import Stock</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Add new items to inventory
        </Text>
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
          {showSelectionList && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Item</Text>
              <FlatList
                data={items}
                keyExtractor={(item) => String(item.id)}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleSelectItem(item)}
                    style={[
                      styles.itemButton,
                      {
                        backgroundColor: colors.backgroundElement,
                        borderColor: selectedItemId === item.id ? colors.tint : colors.backgroundElement,
                        borderWidth: selectedItemId === item.id ? 2 : 1,
                      },
                    ]}
                  >
                    <View style={styles.itemButtonContent}>
                      <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.itemDetails, { color: colors.textSecondary }]}>
                        Current: {item.quantity} {item.unit}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </>
          )}

          {selectedItem && (
            <>
              {/* Only show a separator line if the selection list is actually visible */}
              {showSelectionList && <View style={styles.divider} />}

              <Text style={[styles.sectionTitle, { color: colors.text }]}>Import Details</Text>

              <View style={[styles.selectedItemCard, { backgroundColor: colors.backgroundElement }]}>
                <Text style={[styles.selectedItemName, { color: colors.tint }]}>
                  {selectedItem.name}
                </Text>
                <Text style={[styles.selectedItemDetails, { color: colors.textSecondary }]}>
                  Unit: {selectedItem.unit}
                </Text>
                <Text style={[styles.selectedItemDetails, { color: colors.textSecondary }]}>
                  Current Qty: {selectedItem.quantity}
                </Text>
              </View>

              <InputField
                label="Quantity to Import"
                placeholder="Number of units"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
              />

              <InputField
                label="Cost per Unit (ETB)"
                placeholder="New cost"
                value={cost}
                onChangeText={setCost}
                keyboardType="decimal-pad"
              />

              <InputField
                label="Remarks (Optional)"
                placeholder="Supplier info, batch code, or additional details"
                value={remark}
                onChangeText={setRemark}
              />

              <PrimaryButton
                title={importing ? 'Importing...' : 'Confirm Import'}
                onPress={handleImport}
                disabled={importing}
                style={styles.button}
              />
            </>
          )}
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
  subtitle: {
    fontSize: 14,
    marginTop: 6,
    fontWeight: '500',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 120,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8,
  },
  itemButton: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  itemButtonContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },
  selectedItemCard: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  selectedItemName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  selectedItemDetails: {
    fontSize: 13,
    marginBottom: 6,
  },
  button: {
    marginTop: 24,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
});