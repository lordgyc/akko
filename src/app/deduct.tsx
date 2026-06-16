import { PrimaryButton, SecondaryButton } from '@/components/ui/button';
import { InputField } from '@/components/ui/input-field';
import { BeerItem, supabase } from '@/config/supabase';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DeductScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [item, setItem] = useState<BeerItem | null>(null);
  const [deductQuantity, setDeductQuantity] = useState('');
  const [loading, setLoading] = useState(true);
  const [deducting, setDeducting] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  useEffect(() => {
    if (itemId) {
      fetchItem();
    }
  }, [itemId]);

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
      }
    } catch (error) {
      console.error('Error fetching item:', error);
      Alert.alert('Error', 'Failed to load item');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleDeduct = async () => {
    if (!deductQuantity.trim()) {
      Alert.alert('Error', 'Please enter quantity to deduct');
      return;
    }

    const qty = parseInt(deductQuantity, 10);
    if (!item || qty <= 0 || qty > item.quantity) {
      Alert.alert('Error', 'Invalid quantity');
      return;
    }

    setDeducting(true);
    try {
      // Update items table
      const { error: updateError } = await supabase
        .from('items')
        .update({
          quantity: item.quantity - qty,
        })
        .eq('id', itemId);

      if (updateError) throw updateError;

      // Log to deduct table
      const { error: logError } = await supabase.from('deduct').insert({
        item: itemId,
        quantity: qty,
        approved: isAdmin ? 'approved' : 'pending',
      });

      if (logError) throw logError;

      Alert.alert(
        'Success',
        isAdmin ? `Deducted ${qty} units` : `Request submitted (pending approval)`
      );
      setDeductQuantity('');
      router.back();
    } catch (error) {
      console.error('Error deducting stock:', error);
      Alert.alert('Error', 'Failed to deduct stock');
    } finally {
      setDeducting(false);
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

  if (!item) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContent}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Item not found</Text>
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
        <Text style={[styles.title, { color: colors.text }]}>Deduct Stock</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {isAdmin ? 'Admin deduction' : 'Request deduction'}
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.itemDetail, { color: colors.textSecondary }]}>
              Unit: {item.unit}
            </Text>
            <Text style={[styles.itemDetail, { color: colors.textSecondary }]}>
              Current Stock: {item.quantity}
            </Text>
            <Text style={[styles.itemDetail, { color: colors.textSecondary }]}>
              Cost: ${item.cost.toFixed(2)}
            </Text>
          </View>

          <InputField
            label="Quantity to Deduct"
            placeholder="Number of units"
            value={deductQuantity}
            onChangeText={setDeductQuantity}
            keyboardType="numeric"
          />

          <PrimaryButton
            title={deducting ? 'Processing...' : isAdmin ? 'Confirm Deduction' : 'Request Deduction'}
            onPress={handleDeduct}
            disabled={deducting}
            style={styles.button}
          />

          {isAdmin && (
            <SecondaryButton
              title="View All Deductions"
              onPress={() => router.push('/deduct-requests')}
              style={styles.secondaryButton}
            />
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
    paddingBottom: 120, // Add bottom padding to allow scrolling over keyboard
  },
  itemCard: {
    borderRadius: 10,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  itemDetail: {
    fontSize: 14,
    marginBottom: 6,
  },
  button: {
    marginTop: 24,
  },
  secondaryButton: {
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
  backButton: {
    marginBottom: 8,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
