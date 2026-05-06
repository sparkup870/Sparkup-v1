import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { supabase } from './src/api/supabase';
import { useAuthStore } from './src/store/useAuthStore';

export default function App() {
  const { setSession, setUser } = useAuthStore();

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    // Activity tracking
    const updateActivity = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase
            .from('users')
            .update({ last_seen: new Date().toISOString() })
            .eq('id', session.user.id);
        }
      } catch (err) {
        console.warn('Failed to update activity:', err);
      }
    };

    updateActivity();
    const activityInterval = setInterval(updateActivity, 60000);

    return () => {
      subscription.unsubscribe();
      clearInterval(activityInterval);
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
