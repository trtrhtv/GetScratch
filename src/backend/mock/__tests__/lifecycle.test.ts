import { MockBackend, type StorageLike, type MockBackendOptions } from "../index";
import { SCRATCHER_SEEDS } from "../seed";

function memoryStorage(): StorageLike {
  const store = new Map<string, string>();
  return {
    getItem: async (key) => store.get(key) ?? null,
    setItem: async (key, value) => {
      store.set(key, value);
    },
  };
}

// Tiny injected delays so the whole lifecycle runs in well under a second.
function fastBackend(extra: MockBackendOptions = {}): MockBackend {
  return new MockBackend({
    minDelayMs: 0,
    maxDelayMs: 2,
    botDecisionMinMs: 0,
    botDecisionMaxMs: 5,
    botChatStepMinMs: 0,
    botChatStepMaxMs: 3,
    botAvailabilityRotationMinMs: 0,
    botAvailabilityRotationMaxMs: 3,
    botCustomerRequestMinMs: 0,
    botCustomerRequestMaxMs: 3,
    storage: memoryStorage(),
    ...extra,
  });
}

async function waitFor(
  predicate: () => Promise<boolean> | boolean,
  timeoutMs = 1500,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await predicate()) return;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error("waitFor timed out");
}

describe("MockBackend — full bot order lifecycle", () => {
  let backend: MockBackend;

  afterEach(() => {
    // Clear any repeating/pending bot timers so Jest does not hang.
    backend?.dispose();
  });

  it("accepts (forced), sends scripted chat, and can be completed", async () => {
    // rng = 0 forces shouldBotAccept -> true (0 < probability floor).
    backend = fastBackend({ rng: () => 0 });
    const { userId } = await backend.auth.signUp("דנה כהן", "0501234567");
    await backend.auth.verifyCode(userId, "000000");

    const botId = SCRATCHER_SEEDS[0]!.id;
    const created = await backend.orders.create({
      scratcherId: botId,
      zone: "upper",
      intensity: "medium",
      durationMinutes: 5,
      price: 40,
    });
    expect(created.status).toBe("pending");

    await waitFor(async () => (await backend.orders.getById(created.id))?.status !== "pending");
    const accepted = await backend.orders.getById(created.id);
    expect(accepted?.status).toBe("accepted");
    expect(accepted?.etaMinutes).toBe(3); // pickEtaMinutes(rng=0)

    // The bot's scripted scratcher chat lines arrive on the thread over time.
    await waitFor(async () => (await backend.chat.list(created.id)).length > 0);
    const thread = await backend.chat.list(created.id);
    expect(thread[0]?.senderId).toBe(botId);
    expect(thread[0]?.text).toContain("3"); // onWay interpolates the eta

    const completed = await backend.orders.markComplete(created.id);
    expect(completed.status).toBe("completed");
  });

  it("always leaves pending under real randomness (accept OR decline)", async () => {
    backend = fastBackend(); // default Math.random
    const { userId } = await backend.auth.signUp("עידו לוי", "0521112223");
    await backend.auth.verifyCode(userId, "000000");

    const created = await backend.orders.create({
      scratcherId: SCRATCHER_SEEDS[2]!.id,
      zone: "lower",
      intensity: "strong",
      durationMinutes: 10,
      price: 25,
    });

    await waitFor(async () => (await backend.orders.getById(created.id))?.status !== "pending");
    const resolved = await backend.orders.getById(created.id);
    expect(["accepted", "declined"]).toContain(resolved?.status);
  });

  it("re-reads a raised price at decision time", async () => {
    // rng = 0.99 forces decline at a fair price; raising far above fair does
    // not change the forced rng, but this proves the decision reads current
    // price and still resolves (leaves pending).
    backend = fastBackend({ rng: () => 0.5 });
    const { userId } = await backend.auth.signUp("נועה שרון", "0541237890");
    await backend.auth.verifyCode(userId, "000000");

    const created = await backend.orders.create({
      scratcherId: SCRATCHER_SEEDS[1]!.id,
      zone: "shoulders",
      intensity: "medium",
      durationMinutes: 5,
      price: 20,
    });
    // Raise price high enough that p>0.5 -> accept at rng=0.5.
    await backend.orders.raisePrice(created.id, 200);

    await waitFor(async () => (await backend.orders.getById(created.id))?.status !== "pending");
    const resolved = await backend.orders.getById(created.id);
    expect(resolved?.status).toBe("accepted");
  });
});

describe("MockBackend — nearby availability rotation", () => {
  it("re-emits the nearby set to a live subscriber over time", async () => {
    const backend = new MockBackend({
      minDelayMs: 0,
      maxDelayMs: 2,
      botAvailabilityRotationMinMs: 0,
      botAvailabilityRotationMaxMs: 3,
      storage: memoryStorage(),
    });
    let emissions = 0;
    const unsub = backend.presence.subscribeNearby(
      { lat: 32.0809, lng: 34.7806 },
      (profiles) => {
        emissions += 1;
        // 1–3 bots available at any moment, per product spec.
        expect(profiles.length).toBeGreaterThanOrEqual(1);
        expect(profiles.length).toBeLessThanOrEqual(3);
      },
    );

    await new Promise((r) => setTimeout(r, 60));
    unsub();
    backend.dispose();
    // Initial snapshot + at least one rotation emission.
    expect(emissions).toBeGreaterThan(1);
  });

  it("stops rotating once the last nearby subscriber unsubscribes", async () => {
    const backend = new MockBackend({
      botAvailabilityRotationMinMs: 0,
      botAvailabilityRotationMaxMs: 3,
      storage: memoryStorage(),
    });
    let emissions = 0;
    const unsub = backend.presence.subscribeNearby(
      { lat: 32.0809, lng: 34.7806 },
      () => {
        emissions += 1;
      },
    );
    await new Promise((r) => setTimeout(r, 30));
    unsub();
    const settled = emissions;
    await new Promise((r) => setTimeout(r, 40));
    // No further emissions after unsubscribing.
    expect(emissions).toBe(settled);
    backend.dispose();
  });
});
