import {
  acceptanceProbability,
  buildBotCustomerOrderTerms,
  buildCustomerChatLines,
  buildScratcherChatLines,
  fairPrice,
  isSeedBotId,
  nextAvailableFlags,
  pickDeclineReason,
  pickEtaMinutes,
  shouldBotAccept,
  type BotOrderTerms,
} from "../bots";
import i18n from "@/i18n";
import { SCRATCHER_SEEDS } from "../seed";

const SEED = SCRATCHER_SEEDS[0];

const fairTerms: BotOrderTerms = {
  zone: "upper",
  intensity: "medium",
  durationMinutes: 5,
  // priced exactly at the fair reference for this combo (₪30).
  price: fairPrice({ zone: "upper", intensity: "medium", durationMinutes: 5 }),
};

describe("shouldBotAccept", () => {
  it("baseline acceptance at a fair price is ~35%", () => {
    expect(acceptanceProbability(fairTerms, SEED)).toBeCloseTo(0.35, 5);
  });

  it("rng at the low end always accepts (probability floor is above 0)", () => {
    const cheap: BotOrderTerms = { ...fairTerms, price: fairTerms.price * 0.5 };
    expect(shouldBotAccept(fairTerms, SEED, () => 0)).toBe(true);
    expect(shouldBotAccept(cheap, SEED, () => 0)).toBe(true);
  });

  it("rng at the high end always declines (probability caps below 1)", () => {
    const rich: BotOrderTerms = { ...fairTerms, price: fairTerms.price * 3 };
    expect(shouldBotAccept(fairTerms, SEED, () => 0.99)).toBe(false);
    expect(shouldBotAccept(rich, SEED, () => 0.99)).toBe(false);
  });

  it("is price-sensitive: a high offer clears a threshold a fair offer does not", () => {
    // At rng=0.5 acceptance needs p>0.5, i.e. price >1.3x fair.
    const rich: BotOrderTerms = { ...fairTerms, price: fairTerms.price * 2 };
    expect(shouldBotAccept(fairTerms, SEED, () => 0.5)).toBe(false);
    expect(shouldBotAccept(rich, SEED, () => 0.5)).toBe(true);
  });

  it("acceptance probability rises with price and stays within [0.05, 0.95]", () => {
    const cheap = acceptanceProbability({ ...fairTerms, price: 1 }, SEED);
    const pricey = acceptanceProbability({ ...fairTerms, price: 10000 }, SEED);
    expect(cheap).toBeGreaterThanOrEqual(0.05);
    expect(pricey).toBeLessThanOrEqual(0.95);
    expect(pricey).toBeGreaterThan(cheap);
  });
});

describe("pickDeclineReason", () => {
  it("returns an entry from the i18n decline-reasons array", () => {
    const reasons = i18n.t("bot.asScratcher.declineReasons", {
      returnObjects: true,
    }) as string[];
    expect(reasons).toContain(pickDeclineReason(() => 0));
    expect(reasons).toContain(pickDeclineReason(() => 0.99));
  });
});

describe("pickEtaMinutes", () => {
  it("stays within the believable 3–12 minute range", () => {
    for (let r = 0; r < 1; r += 0.05) {
      const eta = pickEtaMinutes(() => r);
      expect(eta).toBeGreaterThanOrEqual(3);
      expect(eta).toBeLessThanOrEqual(12);
    }
    expect(pickEtaMinutes(() => 0)).toBe(3);
    expect(pickEtaMinutes(() => 0.9999)).toBe(12);
  });
});

describe("scripted chat builders", () => {
  it("interpolates the real ETA into the scratcher's opening line", () => {
    const lines = buildScratcherChatLines(7);
    expect(lines).toHaveLength(6);
    expect(lines[0]).toContain("7");
    expect(lines.every((l) => l.length > 0)).toBe(true);
  });

  it("produces the three customer-side lines", () => {
    const lines = buildCustomerChatLines();
    expect(lines).toHaveLength(3);
    expect(lines.every((l) => l.length > 0)).toBe(true);
  });
});

describe("nextAvailableFlags", () => {
  it("always keeps the available count within 1–3", () => {
    for (let r = 0; r <= 1; r += 0.03) {
      const flags = nextAvailableFlags(SCRATCHER_SEEDS.length, () => r);
      const available = flags.filter(Boolean).length;
      expect(available).toBeGreaterThanOrEqual(1);
      expect(available).toBeLessThanOrEqual(3);
      expect(flags).toHaveLength(SCRATCHER_SEEDS.length);
    }
  });

  it("never exceeds the pool size for a tiny pool", () => {
    expect(nextAvailableFlags(0, () => 0.5)).toEqual([]);
    const one = nextAvailableFlags(1, () => 0.99);
    expect(one.filter(Boolean).length).toBe(1);
  });
});

describe("buildBotCustomerOrderTerms", () => {
  it("produces a valid, positive-priced order rounded to ₪5", () => {
    const terms = buildBotCustomerOrderTerms(() => 0.4);
    expect([2, 5, 10]).toContain(terms.durationMinutes);
    expect(["upper", "lower", "betweenShoulders", "shoulders"]).toContain(terms.zone);
    expect(["gentle", "medium", "strong"]).toContain(terms.intensity);
    expect(terms.price).toBeGreaterThan(0);
    expect(terms.price % 5).toBe(0);
  });
});

describe("isSeedBotId", () => {
  it("recognizes seed ids and rejects others", () => {
    expect(isSeedBotId("s01")).toBe(true);
    expect(isSeedBotId("u_realuser")).toBe(false);
  });
});
