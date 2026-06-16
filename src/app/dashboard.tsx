import { PrimaryButton } from '@/components/ui/button';
import { InputField } from '@/components/ui/input-field';
import { BeerItem, supabase } from '@/config/supabase';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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

const BackgroundDecorations = () => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    <View
      style={{
        position: 'absolute',
        top: -150,
        right: -100,
        width: 320,
        height: 320,
        borderRadius: 160,
        backgroundColor: '#C06C47',
        opacity: 0.05,
      }}
    />
    <View
      style={{
        position: 'absolute',
        top: 250,
        left: -150,
        width: 400,
        height: 400,
        borderRadius: 200,
        backgroundColor: '#527E5D',
        opacity: 0.04,
      }}
    />
    <View
      style={{
        position: 'absolute',
        bottom: -100,
        right: -80,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: '#E8DFC9',
        opacity: 0.07,
      }}
    />
  </View>
);

export default function DashboardScreen() {
  const [items, setItems] = useState<BeerItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<BeerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingDeductions, setPendingDeductions] = useState(0);
  const [isAdminExpanded, setIsAdminExpanded] = useState(false);
  const { signOut, isAdmin } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase.from('items').select('*');
      if (error) throw error;
      setItems(data || []);
      setFilteredItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      Alert.alert('Error', 'Failed to fetch items');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPendingDeductions = async () => {
    try {
      const { count, error } = await supabase
        .from('deduct')
        .select('*', { count: 'exact', head: true })
        .eq('approved', 'pending');
      if (!error) setPendingDeductions(count || 0);
    } catch (error) {
      console.error('Error fetching pending deductions:', error);
    }
  };

  useEffect(() => {
    const filtered = items.filter(
      (item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.unit.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredItems(filtered);
  }, [searchQuery, items]);

  useEffect(() => {
    fetchItems();
    if (isAdmin) fetchPendingDeductions();
  }, [isAdmin]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace('/login');
    } catch {
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchItems();
    if (isAdmin) fetchPendingDeductions();
  }, [isAdmin]);

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalCost = items.reduce((sum, item) => sum + item.cost * item.quantity, 0);

  const renderItem = ({ item }: { item: BeerItem }) => (
    <TouchableOpacity
      onPress={() => router.push({ pathname: '/deduct', params: { itemId: item.id } })}
      activeOpacity={0.7}
      style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.itemContent}>
        <View style={styles.itemLeft}>
          <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
            {item.unit} · ${item.cost.toFixed(2)} each
          </Text>
        </View>
        <View style={styles.itemRight}>
          <Text style={[styles.itemQuantity, { color: colors.purple }]}>{item.quantity}</Text>
          <Text style={[styles.itemQtyLabel, { color: colors.textSecondary }]}>in stock</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const ListHeader = () => (
    <View>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>ayen</Text>
        <TouchableOpacity onPress={handleLogout} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.logoutText, { color: colors.textSecondary }]}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statPill, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{items.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Items</Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{totalQuantity}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Qty</Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>${totalCost.toFixed(0)}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Value</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <InputField
          label=""
          placeholder="Search items..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
      </View>

      {/* Admin Controls (Collapsible) */}
      {isAdmin && (
        <View style={styles.adminSection}>
          <TouchableOpacity
            onPress={() => setIsAdminExpanded(!isAdminExpanded)}
            style={[styles.adminExpandHeader, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.adminExpandTitle, { color: colors.text }]}>Admin Panel</Text>
            <View style={styles.adminExpandRight}>
              {pendingDeductions > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.purple }]}>
                  <Text style={styles.badgeText}>{pendingDeductions}</Text>
                </View>
              )}
              <Text style={[styles.adminExpandArrow, { color: colors.textSecondary }]}>
                {isAdminExpanded ? ' ▴' : ' ▾'}
              </Text>
            </View>
          </TouchableOpacity>

          {isAdminExpanded && (
            <View style={[styles.adminExpandContent, { borderColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => router.push('/deduct-requests')}
                style={[styles.adminLinkRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
              >
                <Text style={[styles.adminLinkText, { color: colors.text }]}>Deduction Requests</Text>
                {pendingDeductions > 0 && (
                  <View style={[styles.badgeInline, { backgroundColor: colors.purple }]}>
                    <Text style={styles.badgeText}>{pendingDeductions}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/imports-management')}
                style={[styles.adminLinkRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
              >
                <Text style={[styles.adminLinkText, { color: colors.text }]}>Import History</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/deductionhistory')}
                style={styles.adminLinkRow}
              >
                <Text style={[styles.adminLinkText, { color: colors.text }]}>Deduction History</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <PrimaryButton
          title="+ Add Item"
          onPress={() => router.push('/add-item')}
          style={styles.actionBtn}
        />
        <PrimaryButton
          title="+ Import"
          onPress={() => router.push('/import')}
          style={styles.actionBtn}
        />
      </View>

      {/* List label */}
      <View style={styles.listLabelRow}>
        <Text style={[styles.listLabel, { color: colors.textSecondary }]}>
          {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
          {searchQuery ? ` matching "${searchQuery}"` : ''}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <BackgroundDecorations />
      {loading ? (
        <View style={styles.centered}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchQuery ? 'No items match your search' : 'No items yet — add your first!'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '500',
  },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 8,
  },
  statPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },

  /* Search */
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchInput: {
    marginBottom: 0,
  },

  /* Admin */
  adminSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 6,
  },
  adminExpandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  adminExpandTitle: {
    fontWeight: '600',
    fontSize: 14,
  },
  adminExpandRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminExpandArrow: {
    fontSize: 12,
    fontWeight: '700',
  },
  adminExpandContent: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
  },
  adminLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  adminLinkText: {
    fontSize: 14,
    fontWeight: '500',
  },
  badge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginRight: 6,
  },
  badgeInline: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  /* Action buttons */
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
  },

  /* List label */
  listLabelRow: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
  },
  listLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* Item cards */
  listContent: {
    paddingBottom: 32,
    flexGrow: 1,
  },
  itemCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemLeft: {
    flex: 1,
    paddingRight: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  itemMeta: {
    fontSize: 13,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemQuantity: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  itemQtyLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },

  /* States */
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
  },
  emptyContainer: {
    paddingHorizontal: 20,
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
});