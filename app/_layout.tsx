import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StoryProvider } from "@/contexts/StoryContext";
import { AudioSettingsProvider } from "@/contexts/AudioSettingsContext";

void SplashScreen.preventAutoHideAsync().catch((e) => {
  console.error("[SplashScreen] preventAutoHideAsync failed", e);
});

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="player/[id]" options={{ headerShown: false, presentation: "modal", animation: "slide_from_bottom" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    console.log("[RootLayout] Component mounted");

    const t = setTimeout(() => {
      console.log("[SplashScreen] Failsafe hide after 800ms");
      void SplashScreen.hideAsync().catch((e) => {
        console.error("[SplashScreen] hideAsync failed", e);
      });
    }, 800);

    void SplashScreen.hideAsync().catch((e) => {
      console.error("[SplashScreen] hideAsync failed", e);
    });

    return () => clearTimeout(t);
  }, []);

  console.log("[RootLayout] Rendering...");

  return (
    <QueryClientProvider client={queryClient}>
      <AudioSettingsProvider>
        <StoryProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <ErrorBoundary>
              <RootLayoutNav />
            </ErrorBoundary>
          </GestureHandlerRootView>
        </StoryProvider>
      </AudioSettingsProvider>
    </QueryClientProvider>
  );
}
