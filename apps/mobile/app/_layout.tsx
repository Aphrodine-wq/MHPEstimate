import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { getSession, supabase } from "@/lib/supabase";

export default function RootLayout() {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);

  useEffect(() => {
    getSession().then((s) => setIsAuth(!!s));
    if (!supabase) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuth(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (isAuth === null) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        {isAuth ? (
          <>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="estimate/[id]" />
            <Stack.Screen name="estimates/new" options={{ presentation: "modal" }} />
            <Stack.Screen name="client/[id]" />
            <Stack.Screen name="clients/new" options={{ presentation: "modal" }} />
            <Stack.Screen name="analytics/index" />
            <Stack.Screen name="calls/index" />
            <Stack.Screen name="materials/index" />
            <Stack.Screen name="change-orders/[estimateId]" />
            <Stack.Screen name="job-actuals/[estimateId]" />
          </>
        ) : (
          <Stack.Screen name="auth" />
        )}
      </Stack>
    </>
  );
}
