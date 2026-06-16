import { PrimaryButton, SecondaryButton } from '@/components/ui/button';
import { BeerItem, DeductRecord, supabase } from '@/config/supabase';
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
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface DeductWithItem extends DeductRecord {
  itemName?: string;
}

export default function DeductRequestsScreen() {
  const [requests, setRequests] = useState<DeductWithItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<BeerItem[]>([]);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: itemsData, error: itemsError } = await supabase.from('items').select('*');
      if (itemsError) throw itemsError;

      const itemMap = new Map((itemsData || []).map((item) => [item.id, item]));
      setItems(itemsData || []);

      const { data, error } = await supabase
        .from('deduct')
        .select('*')
        .eq('approved', 'pending');

      if (error) throw error;

      const withNames = (data || []).map((req) => ({
        ...req,
        itemName: itemMap.get(req.item.toString())?.name || 'Unknown Item',
      }));
      setRequests(withNames);
    } catch (error) {
      console.error('Error fetching requests:', error);
      Alert.alert('Error', 'Failed to fetch deduction requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchRequests = () => {
    setRefreshing(true);
    loadData();
  };

  const handleApprove = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('deduct')
        .update({ approved: 'approved' })
        .eq('id', requestId);

      if (error) throw error;

      Alert.alert('Success', 'Deduction approved');
      fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      Alert.alert('Error', 'Failed to approve request');
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('deduct')
        .update({ approved: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;
      Alert.alert('Success', 'Deduction rejected');
      fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      Alert.alert('Error', 'Failed to reject request');
    }
  };

  const renderRequest = ({ item }: { item: DeductWithItem }) => (
    <View style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.requestHeader}>
        <View>
          <Text style={[styles.itemName, { color: colors.text }]}>{item.itemName}</Text>
          <Text style={[styles.quantity, { color: colors.textSecondary }]}>
            Quantity: {item.quantity}
          </Text>
          <Text style={[styles.createdAt, { color: colors.textSecondary }]}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.backgroundSelected }]}>
          <Text style={[styles.badgeText, { color: colors.text }]}>Pending</Text>
        </View>
      </View>

      <View style={styles.buttonGroup}>
        <PrimaryButton
          title="Approve"
          onPress={() => handleApprove(item.id)}
          style={styles.actionButton}
        />
        <SecondaryButton
          title="Reject"
          onPress={() => handleReject(item.id)}
          style={styles.actionButton}
        />
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
        <Text style={[styles.title, { color: colors.text }]}>Deduction Requests</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {requests.length} pending requests
        </Text>
      </View>

      {requests.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No pending deduction requests
          </Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderRequest}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchRequests} />}
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
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  requestCard: {
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
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
    fontWeight: '600',
  },
  backButton: {
    marginBottom: 8,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
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
});
