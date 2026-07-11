import { MockBackend, type StorageLike } from "../index";

// אחסון-דמה בזיכרון — לא AsyncStorage אמיתי, כדי שהבדיקה תרוץ בבידוד ומהר.
function memoryStorage(): StorageLike {
  const store = new Map<string, string>();
  return {
    getItem: async (key) => store.get(key) ?? null,
    setItem: async (key, value) => {
      store.set(key, value);
    },
  };
}

function newBackend(): MockBackend {
  // עיכוב קצר מאוד — הבדיקה בודקת חוזה, לא זמני backend מדומים.
  return new MockBackend({ minDelayMs: 0, maxDelayMs: 5, storage: memoryStorage() });
}

describe("MockBackend — auth", () => {
  it("signs up, verifies with the demo code, and returns the current user", async () => {
    const backend = newBackend();
    const { userId } = await backend.auth.signUp("דנה כהן", "0501234567");
    const verified = await backend.auth.verifyCode(userId, "000000");
    expect(verified.name).toBe("דנה כהן");

    const current = await backend.auth.getCurrentUser();
    expect(current?.id).toBe(userId);
    expect(current?.isAvailable).toBe(false);
  });

  it("rejects an incorrect verification code", async () => {
    const backend = newBackend();
    const { userId } = await backend.auth.signUp("עידו לוי", "0521112223");
    await expect(backend.auth.verifyCode(userId, "111111")).rejects.toThrow();
  });
});

describe("MockBackend — presence", () => {
  it("toggles my availability and reads it back", async () => {
    const backend = newBackend();
    const { userId } = await backend.auth.signUp("נועה שרון", "0541237890");
    await backend.auth.verifyCode(userId, "000000");

    const enabled = await backend.presence.setAvailability(true);
    expect(enabled.isAvailable).toBe(true);

    const disabled = await backend.presence.setAvailability(false);
    expect(disabled.isAvailable).toBe(false);
  });

  it("lists nearby scratchers seeded from the persona pool", async () => {
    const backend = newBackend();
    const nearby = await backend.presence.listNearby({ lat: 32.0809, lng: 34.7806 });
    expect(nearby.length).toBeGreaterThan(0);
    expect(nearby[0]).toHaveProperty("distanceKm");
    expect(nearby[0]).toHaveProperty("specialty");
  });
});
