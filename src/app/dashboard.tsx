import { PrimaryButton } from '@/components/ui/button';
import { InputField } from '@/components/ui/input-field';
import { BeerItem, Category, supabase } from '@/config/supabase';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatETB } from '@/utils/currency';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
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
        top: -100,
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
  const [categories, setCategories] = useState<Category[]>([]);
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

  // Custom action sheet states
  const [selectedActionItem, setSelectedActionItem] = useState<BeerItem | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from('category').select('*').order('name');
      if (!error && data) setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

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
    fetchCategories();
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
    fetchCategories();
    fetchItems();
    if (isAdmin) fetchPendingDeductions();
  }, [isAdmin]);

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalCost = items.reduce((sum, item) => sum + item.cost * item.quantity, 0);

  const getCategoryName = (catId?: number | null) => {
    if (!catId) return null;
    const cat = categories.find((c) => c.id === catId);
    return cat ? cat.name : null;
  };

  const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({});

  const getGroupedData = () => {
    const grouped: (
      | { type: 'item'; data: BeerItem }
      | { type: 'category'; id: number; name: string; items: BeerItem[] }
    )[] = [];

    const standalone = filteredItems.filter((item) => !item.cat);
    standalone.forEach((item) => {
      grouped.push({ type: 'item', data: item });
    });

    const categorized = filteredItems.filter((item) => item.cat);
    const categoryIds = Array.from(new Set(categorized.map((item) => item.cat)));

    categoryIds.forEach((catId) => {
      if (!catId) return;
      const catItems = categorized.filter((item) => item.cat === catId);
      const catName = getCategoryName(catId) || 'Unknown Category';
      grouped.push({
        type: 'category',
        id: catId,
        name: catName,
        items: catItems,
      });
    });

    return grouped;
  };

  // Triggers selection modal for a clicked item
  const handleItemPress = (item: BeerItem) => {
    setSelectedActionItem(item);
    setActionModalVisible(true);
  };

  const renderGroupedRow = ({ item }: { item: any }) => {
    if (item.type === 'item') {
      const beerItem = item.data;
      return (
        <TouchableOpacity
          onPress={() => handleItemPress(beerItem)}
          activeOpacity={0.7}
          style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.itemContent}>
            <View style={styles.itemLeft}>
              <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                {beerItem.name}
              </Text>
              <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
                {beerItem.unit} · {formatETB(beerItem.cost)} each
              </Text>
            </View>
            <View style={styles.itemRight}>
              <Text style={[styles.itemQuantity, { color: colors.purple }]}>{beerItem.quantity}</Text>
              <Text style={[styles.itemQtyLabel, { color: colors.textSecondary }]}>in stock</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    const isExpanded = !!expandedCategories[item.id];
    return (
      <View style={[styles.categorySection, { borderColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => setExpandedCategories((prev) => ({ ...prev, [item.id]: !isExpanded }))}
          activeOpacity={0.8}
          style={[styles.categoryHeaderCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.categoryHeaderLeft}>
            <Text style={[styles.categoryHeaderTitle, { color: colors.text }]}>
              📁 {item.name}
            </Text>
            <Text style={[styles.categoryHeaderSubtitle, { color: colors.textSecondary }]}>
              {item.items.length} {item.items.length === 1 ? 'item' : 'items'}
            </Text>
          </View>
          <Text style={[styles.expandArrow, { color: colors.purple }]}>
            {isExpanded ? '▴ Collapse' : '▾ Expand'}
          </Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={[styles.categorySubItems, { backgroundColor: colors.backgroundElement }]}>
            {item.items.map((subItem: BeerItem) => (
              <TouchableOpacity
                key={subItem.id}
                onPress={() => handleItemPress(subItem)}
                activeOpacity={0.7}
                style={[styles.subItemCard, { borderBottomColor: colors.border }]}
              >
                <View style={styles.itemContent}>
                  <View style={styles.itemLeft}>
                    <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                      {subItem.name}
                    </Text>
                    <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
                      {subItem.unit} · {formatETB(subItem.cost)} each
                    </Text>
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={[styles.subItemQuantity, { color: colors.purple }]}>{subItem.quantity}</Text>
                    <Text style={[styles.itemQtyLabel, { color: colors.textSecondary }]}>in stock</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  const ListHeader = () => (
    <View>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>ayen</Text>
        <TouchableOpacity onPress={handleLogout} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.logoutText, { color: colors.textSecondary }]}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Row with exact figures and auto-scaling support */}
      <View style={styles.statsRow}>
        <View style={[styles.statPill, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{items.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Items</Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{totalQuantity}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Qty</Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{formatETB(totalCost)}</Text>
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

      {/* Balanced Action Buttons */}
      <View style={styles.actionRow}>
        <PrimaryButton
          title="+ Add"
          onPress={() => router.push('/add-item')}
          style={styles.actionBtn}
        />
        <PrimaryButton
          title="Report"
          onPress={() => router.push('/weekly-report' as any)}
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
          data={getGroupedData()}
          keyExtractor={(item) => (item.type === 'category' ? `cat-${item.id}` : `item-${item.data.id}`)}
          renderItem={renderGroupedRow}
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

      {/* Consistent Bottom-Sheet Styled Selection Modal */}
      <Modal
        visible={actionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setActionModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActionModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalIndicator, { backgroundColor: colors.border }]} />
            
            {selectedActionItem && (
              <>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {selectedActionItem.name}
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  {selectedActionItem.quantity} {selectedActionItem.unit} currently in stock
                </Text>

                <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.modalBtn, { backgroundColor: colors.backgroundElement }]}
                  onPress={() => {
                    setActionModalVisible(false);
                    router.push({ pathname: '/deduct', params: { itemId: selectedActionItem.id } });
                  }}
                >
                  <Text style={[styles.modalBtnText, { color: colors.text }]}>
                    📉 Deduct Stock
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.modalBtn, { backgroundColor: colors.backgroundElement, marginTop: 12 }]}
                  onPress={() => {
                    setActionModalVisible(false);
                    router.push({ pathname: '/import', params: { itemId: selectedActionItem.id } });
                  }}
                >
                  <Text style={[styles.modalBtnText, { color: colors.purple }]}>
                    📈 Import (Restock)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.modalCancelBtn, { marginTop: 16 }]}
                  onPress={() => setActionModalVisible(false)}
                >
                  <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
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
    paddingTop: 12,
    gap: 8,
  },
  statPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 16,
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
    paddingBottom: 4,
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

  /* Balanced Action buttons */
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  categorySection: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  categoryHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  categoryHeaderLeft: {
    flexDirection: 'column',
  },
  categoryHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  categoryHeaderSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  expandArrow: {
    fontSize: 13,
    fontWeight: '600',
  },
  categorySubItems: {
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  subItemCard: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  subItemQuantity: {
    fontSize: 18,
    fontWeight: '700',
  },

  /* Action Modal Styles */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 42,
    borderTopWidth: 1,
  },
  modalIndicator: {
    width: 38,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  modalDivider: {
    height: 1,
    marginVertical: 20,
  },
  modalBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalCancelBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
});