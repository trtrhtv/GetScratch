import {
  useFonts as useAssistantFonts,
  Assistant_400Regular,
  Assistant_500Medium,
  Assistant_600SemiBold,
  Assistant_700Bold,
} from "@expo-google-fonts/assistant";
import { useFonts as useSuezFonts, SuezOne_400Regular } from "@expo-google-fonts/suez-one";

// טעינת שני משפחות הגופנים היחידות במערכת (ראו DESIGN.md §3). נטענות
// לפני הרינדור הראשון כדי שלא תהיה הבהוב-החלפה של פונט ברירת המחדל.
export function useAppFonts(): boolean {
  const [assistantLoaded] = useAssistantFonts({
    Assistant_400Regular,
    Assistant_500Medium,
    Assistant_600SemiBold,
    Assistant_700Bold,
  });
  const [suezLoaded] = useSuezFonts({ SuezOne_400Regular });
  return assistantLoaded && suezLoaded;
}
