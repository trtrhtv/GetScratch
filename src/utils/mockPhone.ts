// טלפון-דמה דטרמיניסטי לבוט (אין להם phone אמיתי במסד) — לצורך תצוגת
// "חשיפת טלפון" בלבד; לעולם לא מחייג באמת מול שירות חיצוני.
export function mockPhoneForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  const suffix = String(hash % 10000000).padStart(7, "0");
  return `050-${suffix}`;
}
