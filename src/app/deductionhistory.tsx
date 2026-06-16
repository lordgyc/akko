import { InputField } from '@/components/ui/input-field';
import { BeerItem, supabase } from '@/config/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface DeductRecord {
  id: number;
  created_at: string;
  item: number;
  quantity: number;
  approved: string;
  itemName?: string;
  unit?: string;
}

const PAGE_SIZE = 10;

export default function DeductionsHistoryScreen() {
  const [deductions, setDeductions] = useState<DeductRecord[]>([]);
  const [filteredDeductions, setFilteredDeductions] = useState<DeductRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<BeerItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const colorScheme = useColorScheme();
  
  // FIXED: Explicitly cast to 'any' to resolve the 'never' TS type compilation error.
  const colors = (Colors as any)[colorScheme === 'dark' ? 'dark' : 'light'] || {};
  const router = useRouter();

  // Load items first, then fetch the first page of deductions
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const fetchedItems = await fetchItems();
      await fetchDeductions(0, false, fetchedItems);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Filter local deductions search dynamically
  useEffect(() => {
    const filtered = deductions.filter((record) => {
      const query = searchQuery.toLowerCase();
      const nameMatch = record.itemName?.toLowerCase().includes(query) || false;
      const statusMatch = record.approved?.toLowerCase().includes(query) || false;
      const dateMatch = new Date(record.created_at).toLocaleDateString().includes(query);
      return nameMatch || statusMatch || dateMatch;
    });
    setFilteredDeductions(filtered);
  }, [searchQuery, deductions]);

  const fetchItems = async (): Promise<BeerItem[]> => {
    try {
      const { data, error } = await supabase.from('items').select('*');
      if (error) throw error;
      const itemsList = data || [];
      setItems(itemsList);
      return itemsList;
    } catch (error) {
      console.error('Error fetching items:', error);
      return [];
    }
  };

  const fetchDeductions = async (
    pageToFetch: number,
    isRefresh = false,
    currentItems: BeerItem[] = items
  ) => {
    try {
      if (pageToFetch > 0) {
        setLoadingMore(true);
      }

      const start = pageToFetch * PAGE_SIZE;
      const end = start + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('deduct')
        .select('*')
        .order('created_at', { ascending: false })
        .range(start, end);

      if (error) throw error;

      const matchedItemsList = currentItems.length > 0 ? currentItems : items;
      const itemMap = new Map(matchedItemsList.map((i) => [i.id, i]));

      const mappedData: DeductRecord[] = (data || []).map((deduct) => ({
        ...deduct,
        itemName: itemMap.get(deduct.item)?.name || 'Unknown Item',
        unit: itemMap.get(deduct.item)?.unit || '',
      }));

      let updatedDeductions = [];
      if (pageToFetch === 0) {
        updatedDeductions = mappedData;
      } else {
        updatedDeductions = [...deductions, ...mappedData];
      }

      setDeductions(updatedDeductions);
      setPage(pageToFetch);
      setHasMore((data || []).length === PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching deductions:', error);
      Alert.alert('Error', 'Failed to fetch deduction history');
    } finally {
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    const freshItems = await fetchItems();
    await fetchDeductions(0, true, freshItems);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchDeductions(page + 1, false);
    }
  };

  // Helper function to return visual attributes based on deduction status
  const getStatusBadgeStyles = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return {
          bg: colorScheme === 'dark' ? '#1B4D22' : '#E8F5E9',
          text: colorScheme === 'dark' ? '#81C784' : '#2E7D32',
          label: 'Approved',
        };
      case 'rejected':
        return {
          bg: colorScheme === 'dark' ? '#621B1B' : '#FFEBEE',
          text: colorScheme === 'dark' ? '#E57373' : '#C62828',
          label: 'Rejected',
        };
      default:
        return {
          bg: colorScheme === 'dark' ? '#4D3319' : '#FFF3E0',
          text: colorScheme === 'dark' ? '#FFB74D' : '#E65100',
          label: 'Pending',
        };
    }
  };

  const renderDeduction = ({ item }: { item: DeductRecord }) => {
    const statusStyles = getStatusBadgeStyles(item.approved);

    return (
      <View
        style={[
          styles.deductCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderLeftColor: statusStyles.text, // Subtle status indicator accent on the left
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardLeftContent}>
            <Text style={[styles.itemName, { color: colors.text }]}>{item.itemName}</Text>
            <Text style={[styles.itemUnit, { color: colors.textSecondary }]}>
              Unit Type: {item.unit || 'N/A'}
            </Text>
            <Text style={[styles.quantityText, { color: colors.text }]}>
              Deducted: <Text style={styles.negativeQuantity}>-{item.quantity}</Text>
            </Text>
            <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
              {new Date(item.created_at).toLocaleDateString()} at{' '}
              {new Date(item.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusStyles.bg }]}>
            <Text style={[styles.statusText, { color: statusStyles.text }]}>
              {statusStyles.label}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (!hasMore) {
      return (
        <View style={styles.endOfListContainer}>
          <Text style={[styles.endOfListText, { color: colors.textSecondary }]}>
            End of deduction history
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.footerContainer}>
        <TouchableOpacity
          disabled={loadingMore}
          onPress={handleLoadMore}
          style={[
            styles.seeMoreButton,
            {
              backgroundColor: colors.backgroundElement || colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {loadingMore ? (
            <ActivityIndicator size="small" color={colors.purple} />
          ) : (
            <Text style={[styles.seeMoreText, { color: colors.purple }]}>See More</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.purple} />
          <Text style={[styles.loadingText, { color: colors.text, marginTop: 12 }]}>
            Loading history...
          </Text>
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
        <Text style={[styles.title, { color: colors.text }]}>Deduction History</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Showing {filteredDeductions.length} deductions
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <InputField
          label=""
          placeholder="Search by item, date, or status..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
      </View>

      {filteredDeductions.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {searchQuery ? 'No deductions match your search' : 'No deduction history yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredDeductions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderDeduction}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListFooterComponent={renderFooter}
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
    paddingVertical: 16,
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
    marginBottom: 4,
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
    paddingVertical: 12,
  },
  deductCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderLeftWidth: 5, // Stylized left colored accent border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLeftContent: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  itemUnit: {
    fontSize: 12,
    marginBottom: 6,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  negativeQuantity: {
    color: '#D32F2F', // Strong red to indicate loss/deduction clearly
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 15,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  footerContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  seeMoreButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 25,
    borderWidth: 1,
    minWidth: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  endOfListContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  endOfListText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});