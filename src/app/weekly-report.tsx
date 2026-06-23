import { PrimaryButton } from '@/components/ui/button';
import { InputField } from '@/components/ui/input-field';
import { BeerItem, Category, ImportRecord, DeductRecord, supabase } from '@/config/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatETB, formatETBCompact } from '@/utils/currency';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ImportWithItem extends ImportRecord {
  itemName?: string;
  itemUnit?: string;
  itemCategoryName?: string;
  itemCatId?: number | null;
  remark?: string | null; // Included explicitly for type safety
}

interface SaleWithItem extends DeductRecord {
  itemName?: string;
  itemUnit?: string;
  itemCost?: number;
  itemCatId?: number | null;
}

type TabType = 'overview' | 'imports' | 'sales' | 'stock';

// Timezone-safe local date formatter
const formatDateToYYYYMMDD = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Timezone-safe date parser
const parseYYYYMMDDToLocalDate = (str: string, isEnd: boolean) => {
  const parts = str.split('-');
  if (parts.length !== 3) return new Date();
  const [year, month, day] = parts.map(Number);
  const date = new Date(year, month - 1, day);
  if (isEnd) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date;
};

function WeeklyReportScreen() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<BeerItem[]>([]);
  const [weeklyImports, setWeeklyImports] = useState<ImportWithItem[]>([]);
  const [weeklySales, setWeeklySales] = useState<SaleWithItem[]>([]);
  
  // Date states
  const [weekOffset, setWeekOffset] = useState(0);
  const [customRangeMode, setCustomRangeMode] = useState(false);
  const [startDateStr, setStartDateStr] = useState('');
  const [endDateStr, setEndDateStr] = useState('');
  
  // Temporary input states for custom date range to prevent fetching on every keystroke
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');
  
  const [activeRangeStr, setActiveRangeStr] = useState('');

  // UI state
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Collapse / Expand state (true by default if not set to false)
  const [expandedImports, setExpandedImports] = useState<Record<string | number, boolean>>({});
  const [expandedSales, setExpandedSales] = useState<Record<string | number, boolean>>({});
  const [expandedStock, setExpandedStock] = useState<Record<string | number, boolean>>({});

  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  // Initialize date range based on offset (Local-time safe)
  const getWeekRange = (offset: number) => {
    const now = new Date();
    const day = now.getDay();
    
    const start = new Date(now);
    const diff = day === 0 ? -6 : 1 - day; 
    start.setDate(now.getDate() + diff + (offset * 7));
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
  };

  useEffect(() => {
    if (!customRangeMode) {
      const { start, end } = getWeekRange(weekOffset);
      setStartDateStr(formatDateToYYYYMMDD(start));
      setEndDateStr(formatDateToYYYYMMDD(end));
    } else {
      setTempStartDate(startDateStr);
      setTempEndDate(endDateStr);
    }
  }, [weekOffset, customRangeMode]);

  useEffect(() => {
    if (startDateStr && endDateStr) {
      fetchReportData();
    }
  }, [startDateStr, endDateStr]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const start = parseYYYYMMDDToLocalDate(startDateStr, false);
      const end = parseYYYYMMDDToLocalDate(endDateStr, true);

      setActiveRangeStr(
        `${start.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        })} - ${end.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}`
      );

      // Fetch categories, items, and transactions inside the period
      const [catsRes, itemsRes, importsRes, salesRes] = await Promise.all([
        supabase.from('category').select('*'),
        supabase.from('items').select('*'),
        supabase
          .from('import')
          .select('*')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString())
          .order('created_at', { ascending: false }),
        supabase
          .from('deduct')
          .select('*')
          .eq('approved', 'approved')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString())
          .order('created_at', { ascending: false }),
      ]);

      if (catsRes.error) throw catsRes.error;
      if (itemsRes.error) throw itemsRes.error;
      if (importsRes.error) throw importsRes.error;
      if (salesRes.error) throw salesRes.error;

      const fetchedCats = catsRes.data || [];
      const fetchedItems = itemsRes.data || [];
      const fetchedImports = importsRes.data || [];
      const fetchedSales = salesRes.data || [];

      setCategories(fetchedCats);
      setItems(fetchedItems);

      const itemMap = new Map(fetchedItems.map((i) => [i.id.toString(), i]));
      const categoryMap = new Map(fetchedCats.map((cat) => [cat.id, cat.name]));

      const mappedImports = fetchedImports.map((imp) => {
        const matchingItem = itemMap.get(imp.item.toString());
        return {
          ...imp,
          itemName: matchingItem?.name || 'Unknown Item',
          itemUnit: matchingItem?.unit || '',
          itemCategoryName:
            matchingItem?.cat != null ? categoryMap.get(matchingItem.cat) || 'Uncategorized' : 'Uncategorized',
          itemCatId: matchingItem?.cat || null,
        };
      });

      const mappedSales = fetchedSales.map((sale) => {
        const matchingItem = itemMap.get(sale.item.toString());
        return {
          ...sale,
          itemName: matchingItem?.name || 'Unknown Item',
          itemUnit: matchingItem?.unit || '',
          itemCost: matchingItem?.cost || 0,
          itemCatId: matchingItem?.cat || null,
        };
      });

      setWeeklyImports(mappedImports);
      setWeeklySales(mappedSales);
    } catch (error) {
      console.error('Error fetching report data:', error);
      Alert.alert('Error', 'Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  // Calculations
  const totalImportsValue = weeklyImports.reduce((sum, imp) => sum + imp.quantity * imp.cost, 0);
  const totalSalesValue = weeklySales.reduce((sum, sale) => sum + sale.quantity * (sale.itemCost || 0), 0);

  const applyCustomDates = () => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(tempStartDate) || !dateRegex.test(tempEndDate)) {
      Alert.alert('Error', 'Dates must be in YYYY-MM-DD format');
      return;
    }
    setStartDateStr(tempStartDate);
    setEndDateStr(tempEndDate);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={[styles.backText, { color: colors.purple }]}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCustomRangeMode(!customRangeMode)}>
            <Text style={[styles.customToggleText, { color: colors.purple }]}>
              {customRangeMode ? 'Switch to Weekly' : '🗓️ Custom Dates'}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.title, { color: colors.tint }]}>Inventory Report</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {activeRangeStr}
        </Text>

        {/* Date Selector Navigation */}
        {!customRangeMode ? (
          <View style={styles.dateNavRow}>
            <TouchableOpacity
              onPress={() => setWeekOffset(weekOffset - 1)}
              style={[styles.dateNavBtn, { backgroundColor: colors.backgroundElement }]}
            >
              <Text style={{ color: colors.text, fontWeight: '600' }}>Prev Week</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setWeekOffset(0)}
              style={[styles.dateNavBtn, { backgroundColor: colors.backgroundElement }]}
            >
              <Text style={{ color: colors.purple, fontWeight: '700' }}>Current Week</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setWeekOffset(weekOffset + 1)}
              style={[styles.dateNavBtn, { backgroundColor: colors.backgroundElement }]}
            >
              <Text style={{ color: colors.text, fontWeight: '600' }}>Next Week</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.customDateForm, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
            <View style={styles.customDateInputs}>
              <View style={{ flex: 1 }}>
                <InputField
                  label="Start Date"
                  placeholder="YYYY-MM-DD"
                  value={tempStartDate}
                  onChangeText={setTempStartDate}
                  style={styles.dateInput}
                />
              </View>
              <View style={{ flex: 1 }}>
                <InputField
                  label="End Date"
                  placeholder="YYYY-MM-DD"
                  value={tempEndDate}
                  onChangeText={setTempEndDate}
                  style={styles.dateInput}
                />
              </View>
            </View>
            <TouchableOpacity
              onPress={applyCustomDates}
              style={[styles.applyBtn, { backgroundColor: colors.purple }]}
            >
              <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>Apply Dates</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Segmented Tab Selector */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {(['overview', 'imports', 'sales', 'stock'] as TabType[]).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabItem, isActive && { borderBottomColor: colors.purple }]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? colors.purple : colors.textSecondary },
                  isActive && { fontWeight: '700' },
                ]}
              >
                {tab.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.purple} />
          <Text style={[styles.loadingText, { color: colors.textSecondary, marginTop: 12 }]}>
            Updating Report Data...
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <View style={{ gap: 16 }}>
              <View style={[styles.premiumCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardHeader, { color: colors.textSecondary }]}>Period Overview</Text>

                <View style={styles.statsSplitRow}>
                  <View style={styles.splitCol}>
                    <Text style={[styles.splitLabel, { color: colors.textSecondary }]}>PERIOD IMPORTS</Text>
                    <Text style={[styles.splitValue, { color: colors.success }]}>
                      +{formatETBCompact(totalImportsValue)}
                    </Text>
                    <Text style={[styles.splitSublabel, { color: colors.textSecondary }]}>
                      {weeklyImports.reduce((sum, imp) => sum + imp.quantity, 0)} units
                    </Text>
                  </View>

                  <View style={[styles.splitDivider, { backgroundColor: colors.border }]} />

                  <View style={styles.splitCol}>
                    <Text style={[styles.splitLabel, { color: colors.textSecondary }]}>PERIOD SALES</Text>
                    <Text style={[styles.splitValue, { color: colors.purple }]}>
                      -{formatETBCompact(totalSalesValue)}
                    </Text>
                    <Text style={[styles.splitSublabel, { color: colors.textSecondary }]}>
                      {weeklySales.reduce((sum, sale) => sum + sale.quantity, 0)} units
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.tipsCard, { backgroundColor: colors.backgroundElement }]}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.purple, marginBottom: 4 }}>
                  💡 Clean Report Guide
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 16 }}>
                  Select the tabs above to view granular transaction logs for restocks, sales checkout histories, or active stock segmented by categories.
                </Text>
              </View>
            </View>
          )}

          {/* TAB 2: IMPORTS LOG */}
          {activeTab === 'imports' && (
            <View style={{ gap: 16 }}>
              <View style={styles.tabSectionHeader}>
                <Text style={[styles.tabSectionTitle, { color: colors.text }]}>Restock logs</Text>
                <Text style={[styles.tabSectionSubtitle, { color: colors.textSecondary }]}>
                  {weeklyImports.length} items restocked in this period
                </Text>
              </View>

              {categories.map((cat) => {
                const catImports = weeklyImports.filter((imp) => imp.itemCatId === cat.id);
                if (catImports.length === 0) return null;

                const totalValue = catImports.reduce((sum, imp) => sum + imp.quantity * imp.cost, 0);
                const totalQty = catImports.reduce((sum, imp) => sum + imp.quantity, 0);
                const isExpanded = expandedImports[cat.id] !== false;

                return (
                  <View key={cat.id} style={styles.categoryBlock}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setExpandedImports(prev => ({ ...prev, [cat.id]: !isExpanded }))}
                      style={styles.categoryHeaderWithTotals}
                    >
                      <View style={styles.categoryTitleContainer}>
                        <Text style={[styles.categoryTitle, { color: colors.purple }]}>
                          {isExpanded ? '📂' : '📁'} {cat.name}
                        </Text>
                        <Text style={[styles.expandLabel, { color: colors.textSecondary }]}>
                          {isExpanded ? 'Collapse' : 'Expand'}
                        </Text>
                      </View>
                      <View style={styles.categoryHeaderTotals}>
                        <Text style={[styles.categoryTotalValue, { color: colors.success }]}>
                          +{formatETB(totalValue)}
                        </Text>
                        <Text style={[styles.categoryTotalQty, { color: colors.textSecondary }]}>
                          {totalQty} units
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {catImports.map((imp, idx) => (
                          <View
                            key={imp.id}
                            style={[
                              styles.tableRow,
                              {
                                borderBottomColor: colors.border,
                                borderBottomWidth: idx === catImports.length - 1 ? 0 : StyleSheet.hairlineWidth,
                              },
                            ]}
                          >
                            <View style={styles.rowLeft}>
                              <Text style={[styles.rowItemName, { color: colors.text }]}>{imp.itemName}</Text>
                              <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                                {new Date(imp.created_at).toLocaleDateString()} · Qty: {imp.quantity} {imp.itemUnit}
                              </Text>
                              {imp.remark ? (
                                <Text style={[styles.rowRemark, { color: colors.textSecondary }]}>
                                  📝 {imp.remark}
                                </Text>
                              ) : null}
                            </View>
                            <View style={styles.rowRight}>
                              <Text style={[styles.rowValue, { color: colors.success }]}>
                                +{formatETB(imp.quantity * imp.cost)}
                              </Text>
                              <Text style={[styles.rowSubvalue, { color: colors.textSecondary }]}>
                                {formatETB(imp.cost)}/u
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}

              {/* Standalone Imports */}
              {(() => {
                const standaloneImports = weeklyImports.filter((imp) => !imp.itemCatId);
                if (standaloneImports.length === 0) return null;

                const totalValue = standaloneImports.reduce((sum, imp) => sum + imp.quantity * imp.cost, 0);
                const totalQty = standaloneImports.reduce((sum, imp) => sum + imp.quantity, 0);
                const isExpanded = expandedImports['standalone'] !== false;

                return (
                  <View style={styles.categoryBlock}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setExpandedImports(prev => ({ ...prev, standalone: !isExpanded }))}
                      style={styles.categoryHeaderWithTotals}
                    >
                      <View style={styles.categoryTitleContainer}>
                        <Text style={[styles.categoryTitle, { color: colors.textSecondary }]}>
                          {isExpanded ? '📂' : '📁'} Standalone Restocks
                        </Text>
                        <Text style={[styles.expandLabel, { color: colors.textSecondary }]}>
                          {isExpanded ? 'Collapse' : 'Expand'}
                        </Text>
                      </View>
                      <View style={styles.categoryHeaderTotals}>
                        <Text style={[styles.categoryTotalValue, { color: colors.success }]}>
                          +{formatETB(totalValue)}
                        </Text>
                        <Text style={[styles.categoryTotalQty, { color: colors.textSecondary }]}>
                          {totalQty} units
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {standaloneImports.map((imp, idx) => (
                          <View
                            key={imp.id}
                            style={[
                              styles.tableRow,
                              {
                                borderBottomColor: colors.border,
                                borderBottomWidth: idx === standaloneImports.length - 1 ? 0 : StyleSheet.hairlineWidth,
                              },
                            ]}
                          >
                            <View style={styles.rowLeft}>
                              <Text style={[styles.rowItemName, { color: colors.text }]}>{imp.itemName}</Text>
                              <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                                {new Date(imp.created_at).toLocaleDateString()} · Qty: {imp.quantity} {imp.itemUnit}
                              </Text>
                              {imp.remark ? (
                                <Text style={[styles.rowRemark, { color: colors.textSecondary }]}>
                                  📝 {imp.remark}
                                </Text>
                              ) : null}
                            </View>
                            <View style={styles.rowRight}>
                              <Text style={[styles.rowValue, { color: colors.success }]}>
                                +{formatETB(imp.quantity * imp.cost)}
                              </Text>
                              <Text style={[styles.rowSubvalue, { color: colors.textSecondary }]}>
                                {formatETB(imp.cost)}/u
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })()}

              {weeklyImports.length === 0 && (
                <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No restocks recorded during this timeframe.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* TAB 3: SALES LOG */}
          {activeTab === 'sales' && (
            <View style={{ gap: 16 }}>
              <View style={styles.tabSectionHeader}>
                <Text style={[styles.tabSectionTitle, { color: colors.text }]}>Checkout & Sales Log</Text>
                <Text style={[styles.tabSectionSubtitle, { color: colors.textSecondary }]}>
                  {weeklySales.length} items checked out in this period
                </Text>
              </View>

              {categories.map((cat) => {
                const catSales = weeklySales.filter((sale) => sale.itemCatId === cat.id);
                if (catSales.length === 0) return null;

                const totalValue = catSales.reduce((sum, sale) => sum + sale.quantity * (sale.itemCost || 0), 0);
                const totalQty = catSales.reduce((sum, sale) => sum + sale.quantity, 0);
                const isExpanded = expandedSales[cat.id] !== false;

                return (
                  <View key={cat.id} style={styles.categoryBlock}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setExpandedSales(prev => ({ ...prev, [cat.id]: !isExpanded }))}
                      style={styles.categoryHeaderWithTotals}
                    >
                      <View style={styles.categoryTitleContainer}>
                        <Text style={[styles.categoryTitle, { color: colors.purple }]}>
                          {isExpanded ? '📂' : '📁'} {cat.name}
                        </Text>
                        <Text style={[styles.expandLabel, { color: colors.textSecondary }]}>
                          {isExpanded ? 'Collapse' : 'Expand'}
                        </Text>
                      </View>
                      <View style={styles.categoryHeaderTotals}>
                        <Text style={[styles.categoryTotalValue, { color: colors.text }]}>
                          {formatETB(totalValue)}
                        </Text>
                        <Text style={[styles.categoryTotalQty, { color: colors.textSecondary }]}>
                          {totalQty} units
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {catSales.map((sale, idx) => (
                          <View
                            key={sale.id}
                            style={[
                              styles.tableRow,
                              {
                                borderBottomColor: colors.border,
                                borderBottomWidth: idx === catSales.length - 1 ? 0 : StyleSheet.hairlineWidth,
                              },
                            ]}
                          >
                            <View style={styles.rowLeft}>
                              <Text style={[styles.rowItemName, { color: colors.text }]}>{sale.itemName}</Text>
                              <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                                {new Date(sale.created_at).toLocaleDateString()} · Qty: {sale.quantity} {sale.itemUnit}
                              </Text>
                            </View>
                            <View style={styles.rowRight}>
                              <Text style={[styles.rowValue, { color: colors.text }]}>
                                {formatETB(sale.quantity * (sale.itemCost || 0))}
                              </Text>
                              <Text style={[styles.rowSubvalue, { color: colors.textSecondary }]}>
                                {formatETB(sale.itemCost || 0)}/u
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}

              {/* Standalone Sales */}
              {(() => {
                const standaloneSales = weeklySales.filter((sale) => !sale.itemCatId);
                if (standaloneSales.length === 0) return null;

                const totalValue = standaloneSales.reduce((sum, sale) => sum + sale.quantity * (sale.itemCost || 0), 0);
                const totalQty = standaloneSales.reduce((sum, sale) => sum + sale.quantity, 0);
                const isExpanded = expandedSales['standalone'] !== false;

                return (
                  <View style={styles.categoryBlock}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setExpandedSales(prev => ({ ...prev, standalone: !isExpanded }))}
                      style={styles.categoryHeaderWithTotals}
                    >
                      <View style={styles.categoryTitleContainer}>
                        <Text style={[styles.categoryTitle, { color: colors.textSecondary }]}>
                          {isExpanded ? '📂' : '📁'} Standalone Sales
                        </Text>
                        <Text style={[styles.expandLabel, { color: colors.textSecondary }]}>
                          {isExpanded ? 'Collapse' : 'Expand'}
                        </Text>
                      </View>
                      <View style={styles.categoryHeaderTotals}>
                        <Text style={[styles.categoryTotalValue, { color: colors.text }]}>
                          {formatETB(totalValue)}
                        </Text>
                        <Text style={[styles.categoryTotalQty, { color: colors.textSecondary }]}>
                          {totalQty} units
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {standaloneSales.map((sale, idx) => (
                          <View
                            key={sale.id}
                            style={[
                              styles.tableRow,
                              {
                                borderBottomColor: colors.border,
                                borderBottomWidth: idx === standaloneSales.length - 1 ? 0 : StyleSheet.hairlineWidth,
                              },
                            ]}
                          >
                            <View style={styles.rowLeft}>
                              <Text style={[styles.rowItemName, { color: colors.text }]}>{sale.itemName}</Text>
                              <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                                {new Date(sale.created_at).toLocaleDateString()} · Qty: {sale.quantity} {sale.itemUnit}
                              </Text>
                            </View>
                            <View style={styles.rowRight}>
                              <Text style={[styles.rowValue, { color: colors.text }]}>
                                {formatETB(sale.quantity * (sale.itemCost || 0))}
                              </Text>
                              <Text style={[styles.rowSubvalue, { color: colors.textSecondary }]}>
                                {formatETB(sale.itemCost || 0)}/u
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })()}

              {weeklySales.length === 0 && (
                <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No checkouts recorded during this timeframe.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* TAB 4: ACTIVE STOCK SEGMENTED */}
          {activeTab === 'stock' && (
            <View style={{ gap: 16 }}>
              {categories.map((cat) => {
                const catItems = items.filter((i) => i.cat === cat.id);
                if (catItems.length === 0) return null;

                const totalValue = catItems.reduce((sum, item) => sum + item.quantity * item.cost, 0);
                const totalQty = catItems.reduce((sum, item) => sum + item.quantity, 0);
                const isExpanded = expandedStock[cat.id] !== false;

                return (
                  <View key={cat.id} style={styles.categoryBlock}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setExpandedStock(prev => ({ ...prev, [cat.id]: !isExpanded }))}
                      style={styles.categoryHeaderWithTotals}
                    >
                      <View style={styles.categoryTitleContainer}>
                        <Text style={[styles.categoryTitle, { color: colors.purple }]}>
                          {isExpanded ? '📂' : '📁'} {cat.name}
                        </Text>
                        <Text style={[styles.expandLabel, { color: colors.textSecondary }]}>
                          {isExpanded ? 'Collapse' : 'Expand'}
                        </Text>
                      </View>
                      <View style={styles.categoryHeaderTotals}>
                        <Text style={[styles.categoryTotalValue, { color: colors.text }]}>
                          {formatETB(totalValue)}
                        </Text>
                        <Text style={[styles.categoryTotalQty, { color: colors.textSecondary }]}>
                          {totalQty} units
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {catItems.map((item, idx) => (
                          <View
                            key={item.id}
                            style={[
                              styles.tableRow,
                              {
                                borderBottomColor: colors.border,
                                borderBottomWidth: idx === catItems.length - 1 ? 0 : StyleSheet.hairlineWidth,
                              },
                            ]}
                          >
                            <View style={styles.rowLeft}>
                              <Text style={[styles.rowItemName, { color: colors.text }]}>{item.name}</Text>
                              <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                                Stock: {item.quantity} {item.unit}
                              </Text>
                            </View>
                            <View style={styles.rowRight}>
                              <Text style={[styles.rowValue, { color: colors.text }]}>
                                {formatETB(item.quantity * item.cost)}
                              </Text>
                              <Text style={[styles.rowSubvalue, { color: colors.textSecondary }]}>
                                {formatETB(item.cost)}/u
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}

              {/* Standalone Items */}
              {(() => {
                const standaloneItems = items.filter((i) => !i.cat);
                if (standaloneItems.length === 0) return null;

                const totalValue = standaloneItems.reduce((sum, item) => sum + item.quantity * item.cost, 0);
                const totalQty = standaloneItems.reduce((sum, item) => sum + item.quantity, 0);
                const isExpanded = expandedStock['standalone'] !== false;

                return (
                  <View style={styles.categoryBlock}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setExpandedStock(prev => ({ ...prev, standalone: !isExpanded }))}
                      style={styles.categoryHeaderWithTotals}
                    >
                      <View style={styles.categoryTitleContainer}>
                        <Text style={[styles.categoryTitle, { color: colors.textSecondary }]}>
                          {isExpanded ? '📂' : '📁'} Standalone Inventory
                        </Text>
                        <Text style={[styles.expandLabel, { color: colors.textSecondary }]}>
                          {isExpanded ? 'Collapse' : 'Expand'}
                        </Text>
                      </View>
                      <View style={styles.categoryHeaderTotals}>
                        <Text style={[styles.categoryTotalValue, { color: colors.text }]}>
                          {formatETB(totalValue)}
                        </Text>
                        <Text style={[styles.categoryTotalQty, { color: colors.textSecondary }]}>
                          {totalQty} units
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {standaloneItems.map((item, idx) => (
                          <View
                            key={item.id}
                            style={[
                              styles.tableRow,
                              {
                                borderBottomColor: colors.border,
                                borderBottomWidth: idx === standaloneItems.length - 1 ? 0 : StyleSheet.hairlineWidth,
                              },
                            ]}
                          >
                            <View style={styles.rowLeft}>
                              <Text style={[styles.rowItemName, { color: colors.text }]}>{item.name}</Text>
                              <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                                Stock: {item.quantity} {item.unit}
                              </Text>
                            </View>
                            <View style={styles.rowRight}>
                              <Text style={[styles.rowValue, { color: colors.text }]}>
                                {formatETB(item.quantity * item.cost)}
                              </Text>
                              <Text style={[styles.rowSubvalue, { color: colors.textSecondary }]}>
                                {formatETB(item.cost)}/u
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })()}
            </View>
          )}
        </ScrollView>
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
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    paddingVertical: 4,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
  },
  customToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '600',
  },
  dateNavRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  dateNavBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  customDateForm: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  customDateInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInput: {
    marginBottom: 0,
  },
  applyBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },

  /* Tabs styling */
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  /* Scrollable layout content */
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 60,
  },

  /* KPI cards */
  premiumCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardHeader: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginVertical: 16,
  },
  statsSplitRow: {
    flexDirection: 'row',
  },
  splitCol: {
    flex: 1,
  },
  splitDivider: {
    width: 1,
    marginHorizontal: 16,
  },
  splitLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  splitValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  splitSublabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },

  tipsCard: {
    padding: 16,
    borderRadius: 12,
    marginTop: 4,
  },

  /* Tab components style */
  tabSectionHeader: {
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  tabSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  tabSectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  tableCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 16,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowLeft: {
    flex: 1,
    paddingRight: 12,
  },
  rowItemName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  rowMeta: {
    fontSize: 12,
  },
  rowRemark: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  rowSubvalue: {
    fontSize: 11,
    marginTop: 1,
  },
  emptyText: {
    fontSize: 13,
    paddingVertical: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  categoryBlock: {
    marginBottom: 20,
  },
  categoryHeaderWithTotals: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  categoryTitleContainer: {
    flexDirection: 'column',
  },
  expandLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  categoryHeaderTotals: {
    alignItems: 'flex-end',
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  categoryTotalValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  categoryTotalQty: {
    fontSize: 11,
    marginTop: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default WeeklyReportScreen;