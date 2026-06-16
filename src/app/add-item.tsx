import { PrimaryButton } from '@/components/ui/button';
import { InputField } from '@/components/ui/input-field';
import { supabase } from '@/config/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
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

export default function AddItemScreen() {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [quantity, setQuantity] = useState('');
  const [cost, setCost] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const handleAdd = async () => {
    if (!name.trim() || !unit.trim() || !quantity.trim() || !cost.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('items').insert({
        name: name.trim(),
        unit: unit.trim(),
        quantity: parseInt(quantity, 10),
        cost: parseFloat(cost),
      });

      if (error) throw error;
      Alert.alert('Success', 'Item added successfully');
      setName('');
      setUnit('');
      setQuantity('');
      setCost('');
      router.back();
    } catch (error) {
      console.error('Error adding item:', error);
      Alert.alert('Error', 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <BackgroundDecorations />
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: colors.purple }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.tint }]}>Add New Item</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Track your inventory
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
          <InputField
            label="Item Name"
            placeholder="e.g., Premium Beer"
            value={name}
            onChangeText={setName}
          />
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
            title={loading ? 'Adding...' : 'Add Item'}
            onPress={handleAdd}
            disabled={loading}
            style={styles.button}
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
    paddingHorizontal: 24,
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
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingBottom: 120, // Keep bottom padding so input doesn't get blocked by keyboard
  },
  button: {
    marginTop: 40,
    marginBottom: 16,
  },
});

