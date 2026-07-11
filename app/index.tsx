import { Redirect } from "expo-router";
import { useAppStore } from "@/store/useAppStore";

// שער-ניתוב: לא מסך בפני עצמו. עד שהמסך הזה מתרנדר, ה-root layout כבר
// הבטיח ש-hydrate() הסתיים — קובע רק לאן להפנות.
export default function Index() {
  const hasUser = useAppStore((s) => s.user !== null);
  const onboardingCompleted = useAppStore((s) => s.onboardingCompleted);

  if (!hasUser || !onboardingCompleted) {
    return <Redirect href="/onboarding/welcome" />;
  }

  return <Redirect href="/home" />;
}
