import { ActivityIndicator, StyleSheet, View } from "react-native";
import { color } from "@/theme/tokens";

// מצב טעינה אחיד — בלי הבהוב-לבן ריק בזמן שמסך ממתין לנתונים ראשוניים.
export default function LoadingView() {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={color.slate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.paper,
  },
});
