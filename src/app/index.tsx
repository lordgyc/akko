import { useAuth } from '@/context/auth-context';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function RootScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [router, user, loading]);

  return null;
}
