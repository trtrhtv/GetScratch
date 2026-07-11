import { create } from "zustand";
import backend from "@/backend/mock";
import type { AvatarId, User } from "@/backend/types";

// Store גלובלי דק — עוטף את ה-BackendAdapter כדי שמסכים לא יצטרכו לשלוף
// את המשתמש/מצב-האונבורדינג בכל mount. כל הפעולות כותבות דרך ה-adapter
// (מקור האמת) ורק אז מעדכנות את ה-state המקומי מהתשובה.
interface AppState {
  user: User | null;
  onboardingCompleted: boolean;
  termsAccepted: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  signUp: (name: string, phone: string) => Promise<string>;
  verifyCode: (userId: string, code: string) => Promise<User>;
  updateAvatar: (avatarId: AvatarId) => Promise<void>;
  acceptTermsAndFinishOnboarding: () => Promise<void>;
  setAvailability: (isAvailable: boolean) => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  onboardingCompleted: false,
  termsAccepted: false,
  hydrated: false,

  hydrate: async () => {
    const [user, onboarding] = await Promise.all([
      backend.auth.getCurrentUser(),
      backend.auth.getOnboardingState(),
    ]);
    set({
      user,
      onboardingCompleted: onboarding.onboardingCompleted,
      termsAccepted: onboarding.termsAccepted,
      hydrated: true,
    });
  },

  signUp: async (name, phone) => {
    const { userId } = await backend.auth.signUp(name, phone);
    return userId;
  },

  verifyCode: async (userId, code) => {
    const user = await backend.auth.verifyCode(userId, code);
    set({ user });
    return user;
  },

  updateAvatar: async (avatarId) => {
    const user = await backend.auth.updateAvatar(avatarId);
    set({ user });
  },

  // מסך תנאי השימוש הוא הצעד האחרון באונבורדינג — אישורו סוגר את שניהם יחד.
  acceptTermsAndFinishOnboarding: async () => {
    const state = await backend.auth.setOnboardingState({
      termsAccepted: true,
      onboardingCompleted: true,
    });
    set({ termsAccepted: state.termsAccepted, onboardingCompleted: state.onboardingCompleted });
  },

  setAvailability: async (isAvailable) => {
    const user = await backend.presence.setAvailability(isAvailable);
    set({ user });
  },

  refreshUser: async () => {
    const user = await backend.auth.getCurrentUser();
    set({ user });
  },
}));
