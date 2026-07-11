import { useEffect, useState } from "react";
import { AccessibilityInfo, StyleSheet, View, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import { color } from "@/theme/tokens";

// מצב ההמתנה — אותן צורות הקונטור מ-ContourBackMap פועמות במקום ספינר
// גנרי (DESIGN.md §4). גרסת web: אנימציית CSS טהורה (animationKeyframes של
// react-native-web) על ה-View העוטף, לא Animated API של RN.
//
// למה לא Animated כאן: RN Animated אין לו native driver אמיתי בדפדפן —
// useNativeDriver נופל בחזרה ל-JS (אזהרת קונסול מפורשת על כך), ולולאה
// רציפה כזו על ה-JS thread מתחרה על ה-scheduler של React ועלולה להרעיב
// עדכוני state אחרים שמגיעים מטיימרים ברקע (התגלה בבדיקה חיה: מסך ההמתנה
// לא התעדכן כשהזמנה עברה ל-declined בזמן שהרדאר פעם ברקע — CSS animation
// רץ על ה-compositor thread ולא נוגע ב-JS בכלל, כך שאין התנגשות).
const ZONE_SHAPES = [
  "M20,28 Q50,10 80,28 L80,42 Q50,26 20,42 Z",
  "M20,42 Q50,26 80,42 L80,58 Q50,44 20,58 Z",
  "M20,58 Q50,44 80,58 L80,76 Q50,62 20,76 Z",
  "M20,76 Q50,62 80,76 L80,94 Q50,80 20,94 Z",
];

// react-native-web-only style extension — לא מוגדר בטיפוסי ViewStyle של RN.
interface WebAnimationStyle extends ViewStyle {
  animationKeyframes?: Record<string, ViewStyle>;
  animationDuration?: string;
  animationIterationCount?: string | number;
  animationTimingFunction?: string;
}

export default function RadarPulse() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then(setReduceMotion)
      .catch(() => undefined);
  }, []);

  const animatedStyle: WebAnimationStyle = reduceMotion
    ? { opacity: 0.6 }
    : {
        animationKeyframes: {
          "0%": { opacity: 0.35, transform: [{ scale: 0.97 }] },
          "50%": { opacity: 0.85, transform: [{ scale: 1.03 }] },
          "100%": { opacity: 0.35, transform: [{ scale: 0.97 }] },
        },
        animationDuration: "2600ms",
        animationIterationCount: "infinite",
        animationTimingFunction: "ease-in-out",
      };

  return (
    <View style={[styles.wrap, animatedStyle]}>
      <Svg viewBox="0 0 100 100" width={180} height={180}>
        {ZONE_SHAPES.map((d, i) => (
          <Path key={i} d={d} fill={color.slateSoft} stroke={color.slate} strokeWidth={1} />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "center",
  },
});
