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

describe("MockBackend — bot-originated customer requests (scratcher side)", () => {
  let backend: MockBackend;

  afterEach(() => {
    backend?.dispose();
  });

  it("a bot originates a request against the real user while they're available", async () => {
    backend = fastBackend();
    const { userId } = await backend.auth.signUp("רון גל", "0501112233");
    await backend.auth.verifyCode(userId, "000000");

    await backend.presence.setAvailability(true);
    await new Promise((r) => setTimeout(r, 30));

    const incoming = await backend.orders.listIncoming();
    expect(incoming.length).toBeGreaterThan(0);
    const order = incoming[0]!;
    expect(order.scratcherId).toBe(userId);
    expect(order.status).toBe("pending");
    expect(SCRATCHER_SEEDS.some((s) => s.id === order.customerId)).toBe(true);

    // Accepting it as the scratcher goes through the same public path a real
    // incoming-request screen uses, and the bot (as customer) sends its
    // scripted customer-side chat afterward.
    await backend.orders.respond(order.id, { accept: true, etaMinutes: 5 });
    await new Promise((r) => setTimeout(r, 30));
    const messages = await backend.chat.list(order.id);
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]?.senderId).toBe(order.customerId);
  });

  it("stops originating requests once the user goes unavailable", async () => {
    backend = fastBackend();
    const { userId } = await backend.auth.signUp("שני אור", "0507654321");
    await backend.auth.verifyCode(userId, "000000");

    await backend.presence.setAvailability(true);
    await new Promise((r) => setTimeout(r, 15));
    await backend.presence.setAvailability(false);
    const afterStop = (await backend.orders.listIncoming()).length;

    await new Promise((r) => setTimeout(r, 60));
    const later = (await backend.orders.listIncoming()).length;
    expect(later).toBe(afterStop);
  });
});

// Regression coverage for a real bug found via live browser testing: every
// mutation used to mutate the SAME object already stored in `this.state`
// in place, so a UI component holding an earlier reference to that exact
// object (e.g. React state set from an initial `getById()`) would never
// re-render when a later update arrived — React's plain-object `Object.is`
// bail-out sees "same reference" and skips the render, even though the
// data genuinely changed. The fix: every mutation now stores a *new* object
// reference. These tests assert that contract directly, so it can't
// silently regress back to in-place mutation.
describe("MockBackend — every mutation produces a fresh object reference", () => {
  let backend: MockBackend;

  afterEach(() => {
    backend?.dispose();
  });

  it("an order's reference changes after accept/decline, not just its fields", async () => {
    backend = fastBackend({ rng: () => 0 }); // forces accept
    const { userId } = await backend.auth.signUp("רותם ניר", "0501110022");
    await backend.auth.verifyCode(userId, "000000");

    const created = await backend.orders.create({
      scratcherId: SCRATCHER_SEEDS[3]!.id,
      zone: "upper",
      intensity: "medium",
      durationMinutes: 5,
      price: 40,
    });
    const beforeDecision = await backend.orders.getById(created.id);

    await waitFor(async () => (await backend.orders.getById(created.id))?.status !== "pending");
    const afterDecision = await backend.orders.getById(created.id);

    expect(afterDecision).not.toBe(beforeDecision);
    expect(afterDecision?.status).toBe("accepted");

    // markComplete must ALSO hand back a fresh reference, not the same one.
    const completed = await backend.orders.markComplete(created.id);
    expect(completed).not.toBe(afterDecision);
  });

  it("a chat thread is a fresh array on every new message, not the same array mutated in place", async () => {
    // Push the bot's OWN scripted chat delay far out so it can't interleave
    // with the two sends this test makes and race the assertions below.
    backend = fastBackend({ rng: () => 0, botChatStepMinMs: 60_000, botChatStepMaxMs: 90_000 });
    const { userId } = await backend.auth.signUp("דניאל אבן", "0501110033");
    await backend.auth.verifyCode(userId, "000000");
    const created = await backend.orders.create({
      scratcherId: SCRATCHER_SEEDS[4]!.id,
      zone: "lower",
      intensity: "gentle",
      durationMinutes: 2,
      price: 40,
    });
    await waitFor(async () => (await backend.orders.getById(created.id))?.status === "accepted");

    const first = await backend.chat.send(created.id, "הודעה ראשונה");
    const threadAfterFirst = await backend.chat.list(created.id);
    const second = await backend.chat.send(created.id, "הודעה שנייה");
    const threadAfterSecond = await backend.chat.list(created.id);

    expect(threadAfterSecond).not.toBe(threadAfterFirst);
    expect(threadAfterFirst).toHaveLength(1);
    expect(threadAfterSecond.map((m) => m.id)).toEqual([first.id, second.id]);
    expect(second.id).not.toBe(first.id);
  });

  it("a rated user's ratings summary is a fresh object, not the previous one mutated", async () => {
    backend = fastBackend();
    // Two sequential signups, both real Users in the same backend instance —
    // verifyCode can switch "current user" back and forth between them,
    // which is enough to test rater != ratee without a second session.
    const { userId: userAId } = await backend.auth.signUp("עדן שריד", "0501110044");
    await backend.auth.verifyCode(userAId, "000000");
    const userABefore = await backend.auth.getCurrentUser();
    expect(userABefore?.ratings.asScratcher.count).toBe(0);

    const { userId: userBId } = await backend.auth.signUp("תום לביא", "0501110055");
    await backend.auth.verifyCode(userBId, "000000"); // switch current user to B

    // orderId doesn't need to resolve to a real persisted order — submit()
    // only touches order state if it finds a matching "completed" order.
    await backend.ratings.submit({
      orderId: "no-such-order",
      rateeId: userAId,
      raterRole: "customer",
      stars: 5,
    });

    await backend.auth.verifyCode(userAId, "000000"); // switch back to A
    const userAAfter = await backend.auth.getCurrentUser();

    expect(userAAfter).not.toBe(userABefore);
    expect(userAAfter?.ratings.asScratcher).not.toBe(userABefore?.ratings.asScratcher);
    expect(userAAfter?.ratings.asScratcher.count).toBe(1);
    expect(userAAfter?.ratings.asScratcher.average).toBe(5);
  });
});
