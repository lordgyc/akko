import { PrimaryButton } from '@/components/ui/button';
import { InputField } from '@/components/ui/input-field';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router'; // 1. Import useRouter

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

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { signIn, signUp } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter(); // 2. Initialize the router hook

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
        Alert.alert('Success', 'Account created! Please sign in.');
        setIsSignUp(false);
        setEmail('');
        setPassword('');
      } else {
        await signIn(email, password);
        // 3. Navigate to your dashboard screen once login succeeds
        router.replace('/dashboard'); 
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <BackgroundDecorations />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>ayen</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              cozy inventory workspace
            </Text>
          </View>

          <View style={styles.form}>
            <InputField
              label="Email"
              placeholder="your@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <InputField
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <PrimaryButton
              title={isLoading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
              onPress={handleAuth}
              disabled={isLoading}
              style={styles.button}
            />

            <View style={styles.toggleContainer}>
              <Text style={[styles.toggleText, { color: colors.text }]}>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </Text>
              <Text
                style={[styles.toggleLink, { color: colors.purple }]}
                onPress={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  header: {
    marginBottom: 56,
    alignItems: 'center',
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1.2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: 0.5,
  },
  form: {
    marginBottom: 40,
  },
  button: {
    marginTop: 32,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
    gap: 8,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '400',
  },
  toggleLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});