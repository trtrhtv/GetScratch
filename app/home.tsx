import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { router, useFocusEffect } from "expo-router";
import { Menu, UserRound } from "lucide-react-native";
import ScreenContainer from "@/components/ScreenContainer";
import AvailabilityToggle from "@/components/AvailabilityToggle";
import NearbyPanel from "@/components/NearbyPanel";
import SelectedScratcherCard from "@/components/SelectedScratcherCard";
import Banner from "@/components/Banner";
import { color, font, fontSize, space } from "@/theme/tokens";
import { useAppStore } from "@/store/useAppStore";
import backend from "@/backend/mock";
import type { ScratcherProfile } from "@/backend/types";
import { MOCK_MY_LOCATION } from "@/utils/geo";

export default function HomeScreen() {
  const { t } = useTranslation();
  const isAvailable = useAppStore((s) => s.user?.isAvailable ?? false);
  const setAvailability = useAppStore((s) => s.setAvailability);

  const [scratchers, setScratchers] = useState<ScratcherProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const shownIncomingIdRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = backend.presence.subscribeNearby(MOCK_MY_LOCATION, (list) => {
      setScratchers(list);
      setSelectedId((current) => {
        if (current && list.some((s) => s.id === current)) return current;
        return list[0]?.id ?? null;
      });
    });
    return unsubscribe;
  }, []);

  // כשאני זמין/ה, בוט-לקוח עשוי לשלוח בקשה. אין מנגנון subscribe ייעודי
  // לבקשות נכנסות ב-adapter — פולינג קליל מספיק לצורך ה-MVP (PLAN 6).
  // useFocusEffect (לא useEffect): Stack משאיר את Home מותקן ברקע כשעוברים
  // להזמנה פעילה, ופולינג-רקע שם היה עלול לפתוח מודל בקשה-נכנסת שנייה מעל
  // מסך ההזמנה הנוכחית — נצפה בפועל בבדיקה. הפולינג רץ רק כש-Home בפוקוס.
  useFocusEffect(
    useCallback(() => {
      if (!isAvailable) return;
      const interval = setInterval(async () => {
        const incoming = await backend.orders.listIncoming();
        const next = incoming[0];
        if (next && shownIncomingIdRef.current !== next.id) {
          shownIncomingIdRef.current = next.id;
          router.push({ pathname: "/incoming-request", params: { orderId: next.id } });
        }
      }, 4000);
      return () => clearInterval(interval);
    }, [isAvailable])
  );

  const selected = scratchers.find((s) => s.id === selectedId) ?? null;

  const handleOrder = useCallback(() => {
    if (!selected) return;
    router.push({ pathname: "/order/create", params: { scratcherId: selected.id } });
  }, [selected]);

  return (
    <ScreenContainer padded={false}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" hitSlop={8}>
          <Menu size={22} color={color.ink} />
        </Pressable>
        <Text style={styles.wordmark}>{t("common.appName")}</Text>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.push("/profile")}
        >
          <UserRound size={22} color={color.ink} />
        </Pressable>
      </View>

      <View style={styles.toggleWrap}>
        <AvailabilityToggle isAvailable={isAvailable} onToggle={setAvailability} />
      </View>

      <View style={styles.panel}>
        <NearbyPanel scratchers={scratchers} selectedId={selectedId} onSelect={setSelectedId} />
      </View>

      <View style={styles.bottomSheet}>
        {selected ? (
          <SelectedScratcherCard scratcher={selected} onOrder={handleOrder} />
        ) : (
          <Banner text={t("home.selectPrompt")} />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingStart: space.lg,
    paddingEnd: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.sm,
  },
  wordmark: {
    fontFamily: font.display,
    fontSize: fontSize.title,
    color: color.ink,
  },
  toggleWrap: {
    paddingStart: space.lg,
    paddingEnd: space.lg,
    marginBottom: space.md,
  },
  panel: {
    flex: 1,
    marginStart: space.lg,
    marginEnd: space.lg,
    marginBottom: space.md,
  },
  bottomSheet: {
    paddingStart: space.lg,
    paddingEnd: space.lg,
    paddingBottom: space.lg,
  },
});
