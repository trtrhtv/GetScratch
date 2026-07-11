import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { color } from "@/theme/tokens";

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

// מצב ההמתנה — אותן צורות הקונטור מ-ContourBackMap פועמות במקום ספינר
// גנרי (DESIGN.md §4: "בנוי מסימן המותג"). לולאה איטית אחת; מכבד
// prefers-reduced-motion (DESIGN.md §6.4).
// גרסת native: Animated עם useNativeDriver אמיתי (רץ ב-thread הנייטיבי,
// לא חוסם את ה-JS thread — בניגוד ל-web, ראו RadarPulse.web.tsx).
const ZONE_SHAPES = [
  "M20,28 Q50,10 80,28 L80,42 Q50,26 20,42 Z",
  "M20,42 Q50,26 80,42 L80,58 Q50,44 20,58 Z",
  "M20,58 Q50,44 80,58 L80,76 Q50,62 20,76 Z",
  "M20,76 Q50,62 80,76 L80,94 Q50,80 20,94 Z",
];

export default function RadarPulse() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then(setReduceMotion)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 2600,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [progress, reduceMotion]);

  const opacity = reduceMotion
    ? 0.6
    : progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.35, 0.85, 0.35] });
  const scale = reduceMotion
    ? 1
    : progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.97, 1.03, 0.97] });

  return (
    <AnimatedSvg
      viewBox="0 0 100 100"
      width={180}
      height={180}
      style={[styles.svg, { opacity, transform: [{ scale }] }]}
    >
      {ZONE_SHAPES.map((d, i) => (
        <Path key={i} d={d} fill={color.slateSoft} stroke={color.slate} strokeWidth={1} />
      ))}
    </AnimatedSvg>
  );
}

const styles = StyleSheet.create({
  svg: {
    alignSelf: "center",
  },
});
