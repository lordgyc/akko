import { AuthProvider, useAuth } from '@/context/auth-context';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, loading, isAdmin } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'login';

    if (!user && !inAuthGroup) {
      router.replace('/login');
      return;
    }

    if (user && inAuthGroup) {
      router.replace('/dashboard');
      return;
    }

    const adminOnlyRoutes = ['deduct-requests', 'imports-management'];
    const currentRoute = segments[0];
    if (user && !isAdmin && currentRoute && adminOnlyRoutes.includes(currentRoute)) {
      router.replace('/dashboard');
    }
  }, [user, loading, isAdmin, segments, router]);

  if (loading) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen
        name="add-item"
        options={{
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="import"
        options={{
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="deduct"
        options={{
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="deduct-requests"
        options={{
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="imports-management"
        options={{
          presentation: 'modal',
        }}
      />
      <Stack.Screen name="update-stock" />
      <Stack.Screen name="explore" />
      <Stack.Screen name="weekly-report" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
