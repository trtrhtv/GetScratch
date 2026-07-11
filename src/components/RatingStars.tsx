import { Pressable, StyleSheet, View } from "react-native";
import { Star } from "lucide-react-native";
import { color, space } from "@/theme/tokens";

// דירוג 1–5 — לקריאה בלבד (interactive=false) בתצוגת פרופיל/היסטוריה,
// או אינטראקטיבי במסך הדירוג עצמו (value/onChange מנוהלים אצל ההורה).
export default function RatingStars({
  value,
  onChange,
  interactive = false,
  size = 22,
}: {
  value: number;
  onChange?: (next: number) => void;
  interactive?: boolean;
  size?: number;
}) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((i) =>
        interactive ? (
          <Pressable
            key={i}
            accessibilityRole="button"
            onPress={() => onChange?.(i)}
            hitSlop={6}
          >
            <Star size={size} color={color.amber} fill={i <= value ? color.amber : "transparent"} />
          </Pressable>
        ) : (
          <Star key={i} size={size} color={color.amber} fill={i <= value ? color.amber : "transparent"} />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: space.xs,
  },
});
