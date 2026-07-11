import { color } from "@/theme/tokens";

// סט אווטארים מוכן — אריחי צבע+אייקון שטוחים, לא תמונות מאוירות (ראו DESIGN.md:
// "avatars are flat initials/icon tiles", לא דיוקנאות). המשתמש בוחר אחד באונבורדינג;
// אותו סט משמש גם את פרופילי הבוטים כדי שלא יהיה הבדל ויזואלי מזהה.
export type AvatarPresetId = "a1" | "a2" | "a3" | "a4" | "a5" | "a6" | "a7" | "a8";

export interface AvatarPreset {
  id: AvatarPresetId;
  background: string;
  foreground: string;
}

export const AVATAR_PRESETS: readonly AvatarPreset[] = [
  { id: "a1", background: color.slate, foreground: color.white },
  { id: "a2", background: color.amber, foreground: color.ink },
  { id: "a3", background: color.sage, foreground: color.white },
  { id: "a4", background: color.brick, foreground: color.white },
  { id: "a5", background: color.slateSoft, foreground: color.slate },
  { id: "a6", background: color.amberSoft, foreground: color.amber },
  { id: "a7", background: color.sageSoft, foreground: color.sage },
  { id: "a8", background: color.ink, foreground: color.paper },
];

const PRESET_BY_ID: Record<AvatarPresetId, AvatarPreset> = Object.fromEntries(
  AVATAR_PRESETS.map((p) => [p.id, p])
) as Record<AvatarPresetId, AvatarPreset>;

export function getAvatarPreset(id: string): AvatarPreset {
  return PRESET_BY_ID[id as AvatarPresetId] ?? AVATAR_PRESETS[0];
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0].slice(0, 1) + parts[1].slice(0, 1)).toUpperCase();
}
