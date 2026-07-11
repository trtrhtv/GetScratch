import { useCallback, useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { initLanguageAtBoot } from "@/i18n/languageSwitch";
import { useAppFonts } from "@/theme/fonts";
import { theme } from "@/theme/tokens";
import { useAppStore } from "@/store/useAppStore";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [bootReady, setBootReady] = useState(false);
  const fontsReady = useAppFonts();
  const hydrate = useAppStore((s) => s.hydrate);
  const ready = bootReady && fontsReady;

  // מריצים כאן, לא ב-index.tsx: כניסה ישירה/רענון בכל מסלול (לא רק "/")
  // חייבת עדיין להעלות שפה+כיוון+state שמור לפני הרינדור הראשון.
  useEffect(() => {
    Promise.all([initLanguageAtBoot(), hydrate()]).finally(() => setBootReady(true));
  }, [hydrate]);

  const onLayoutRootView = useCallback(async () => {
    if (ready) {
      await SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <I18nextProvider i18n={i18n}>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.color.paper },
              animation: "fade",
            }}
          />
        </I18nextProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
