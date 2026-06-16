import { InputField } from '@/components/ui/input-field';
import { BeerItem, ImportRecord, supabase } from '@/config/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ImportWithItem extends ImportRecord {
  itemName?: string;
}

export default function ImportsManagementScreen() {
  const [imports, setImports] = useState<ImportWithItem[]>([]);
  const [filteredImports, setFilteredImports] = useState<ImportWithItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<BeerItem[]>([]);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Filter imports based on search query
    const filtered = imports.filter((importRecord) =>
      (importRecord.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      new Date(importRecord.created_at).toLocaleDateString().includes(searchQuery)
    );
    setFilteredImports(filtered);
  }, [searchQuery, imports]);

  const fetchData = async () => {
    try {
      // Fetch both items and imports simultaneously
      const [itemsResponse, importsResponse] = await Promise.all([
        supabase.from('items').select('*'),
        supabase.from('import').select('*').order('created_at', { ascending: false })
      ]);

      if (itemsResponse.error) throw itemsResponse.error;
      if (importsResponse.error) throw importsResponse.error;

      const fetchedItems = itemsResponse.data || [];
      const fetchedImports = importsResponse.data || [];

      setItems(fetchedItems);

      if (fetchedItems.length > 0 && fetchedImports.length > 0) {
        // Map item ids to string keys to ensure matching works correctly
        const itemMap = new Map(fetchedItems.map((item) => [item.id.toString(), item]));
        
        const withNames = fetchedImports.map((importRecord) => ({
          ...importRecord,
          itemName: itemMap.get(importRecord.item.toString())?.name || 'Unknown Item',
        }));
        
        setImports(withNames);
        setFilteredImports(withNames);
      } else {
        setImports(fetchedImports);
        setFilteredImports(fetchedImports);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to fetch import history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const renderImport = ({ item }: { item: ImportWithItem }) => (
    <View style={[styles.importCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.importHeader}>
        <View>
          <Text style={[styles.itemName, { color: colors.text }]}>{item.itemName}</Text>
          <Text style={[styles.quantity, { color: colors.textSecondary }]}>
            Quantity Added: {item.quantity}
          </Text>
          <Text style={[styles.cost, { color: colors.textSecondary }]}>
            Cost per Unit: ${parseFloat(item.cost.toString()).toFixed(2)}
          </Text>
          <Text style={[styles.createdAt, { color: colors.textSecondary }]}>
            {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString()}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.success }]}>
          <Text style={styles.badgeText}>Imported</Text>
        </View>
      </View>
    </View>
  );

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
          <Text style={[styles.backText, { color: colors.purple }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Import History</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {filteredImports.length} imports
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <InputField
          label=""
          placeholder="Search by item or date..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
      </View>

      {filteredImports.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {searchQuery ? 'No imports match your search' : 'No import history yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredImports}
          keyExtractor={(item) => item.id}
          renderItem={renderImport}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        />
      )}
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  searchInput: {
    marginBottom: 0,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  importCard: {
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  importHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  quantity: {
    fontSize: 14,
    marginBottom: 4,
  },
  cost: {
    fontSize: 14,
    marginBottom: 4,
  },
  createdAt: {
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  backButton: {
    marginBottom: 8,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
  },
});