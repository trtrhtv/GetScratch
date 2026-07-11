# Gardan — Design System

## 1. Design thesis

Gardan looks like the booking system of a serious Israeli mobility/clinical-services
operator — the visual register of a physiotherapy-appointment platform crossed with
a ride-hailing dispatch shell — rendered with total institutional sincerity, so that
the only thing left to smile at is the premise itself.

## 2. Palette

| Name | Hex | Role | Justification |
|---|---|---|---|
| Paper | `#F4F6F7` | App background | A cool, whisper-blue near-white — not cream. Mobility-app backgrounds stay neutral so map pins, avatars and price numerals carry the color, not the canvas. |
| Ink | `#12181D` | Primary text | Soft graphite-navy rather than pure black — legible and severe without the flat harshness of `#000`, and it reads as corporate rather than "app mockup." |
| Slate (primary) | `#0F5E56` | Brand / header accents / selected & "available" states | A deep clinical teal. Reads as trust and service-competence (the register of a physio or diagnostics brand) and is deliberately outside the blue-purple palette every mapping/rideshare clone reaches for. |
| Amber (action) | `#E8892C` | The one dominant CTA color (primary buttons, price highlight) | A golden-amber, not the muted salmon-clay `#D97757` (the most recognizable AI-generated palette signature) and not the vivid red-orange `#FF5233` this project used before. Amber/marigold is warm enough to read as "act now" against the cool teal system without slipping into either flagged hue. Used sparingly — one button per screen, never a background wash. |
| Sage (success) | `#3E9C79` | Accepted / completed / positive status | A muted green distinct from both Slate and Amber, so status states are legible at a glance without a full stoplight palette. |
| Brick (danger) | `#C1483A` | Decline / cancel / error | A desaturated brick red — serious, not alarming-neon. |

Hairline borders and disabled states use Ink at low opacity (`rgba(18,24,29,0.12)` /
`0.38`) rather than a seventh named color, keeping the palette to six real hues.

## 3. Typography

Considered against three real alternatives before choosing, per the design gate:

1. **Rubik** — rejected. The default reach for "an Israeli app," used by essentially
   every template and clone; picking it would be the generic-Hebrew-UI signature the
   brief explicitly warns against.
2. **Heebo** — rejected for the same reason: it's the reference Hebrew UI font baked
   into countless design-system starters (Google's own Material Hebrew samples use
   it). Extremely safe, extremely expected.
3. **IBM Plex Sans Hebrew** — a strong body-text candidate (engineered, multi-weight,
   very legible), but its "developer tool / SaaS dashboard" character undersells the
   consumer-mobility warmth Gardan needs at the booking-flow layer.
4. **Miriam Libre** — distinctive "typewriter-adjacent officialdom" quality, but its
   geometry is closer to a headline/display face than something that holds up as
   dense chat and form-field body copy.

**Chosen pair:**

- **Display — Suez One** (single weight, ~700 visual weight). Its slightly
  condensed, geometric-slab letterforms have the gravity of a printed official
  notice — exactly the "deadpan government form" register the product's humor
  depends on. Used only for the wordmark, screen titles, and the price numeral —
  never for body copy (it has no weight range to build hierarchy with).
- **Body — Assistant** (weights 400/500/600/700 covering all UI states: labels,
  buttons, chat, form fields, list rows). Full Hebrew + Latin coverage, clean and
  neutral, and meaningfully less ubiquitous in the Israeli app landscape than
  Rubik/Heebo while just as legible in dense UI contexts. One family covers every
  weight the UI needs, so no third font is introduced.

Both families ship full Latin coverage, so `en` uses the identical pair — the
product must look like the same brand in either language.

## 4. Signature element — the Contour Back Map

One recurring, functional graphic: a human back rendered as an abstract
topographic-contour diagram — horizontal banded lines suggesting terrain relief,
never an illustrated body. It appears in exactly two places:

- **Zone selection** (order creation): the contour bands double as tappable
  hit-regions for upper back / lower back / between shoulder blades / shoulders.
- **The "finding a scratcher" waiting state**: the same contour lines pulse
  outward from the center, once, on a slow loop — a radar-style loading motif
  built from the brand mark instead of a generic spinner.

Nowhere else does the app illustrate anything. Icons elsewhere are a single
consistent vector set (`lucide-react-native`); avatars are flat initials-on-Slate
tiles for bot/mock profiles. One signature, everything else quiet.

## 5. ASCII wireframe — Home

```
┌───────────────────────────────────────────┐
│ [menu]        גַרְדָן            [profile] │  <- top bar, Suez One wordmark
├───────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐   │
│ │  אני זמין/ה לגרד            (○──●)  │   │  <- availability toggle, high-contrast
│ └─────────────────────────────────────┘   │
│                                             │
│   ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·    │
│   ·        [map: quiet, muted tiles]  ·    │
│   ·     (pin) מוטי ש. · 4.9 · זמין    ·    │
│   ·     (pin) קרן ב. · לא זמין/ה      ·    │
│   ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·    │
│                                             │
├─────────────────────────────────────────── │ <- bottom sheet edge
│  ▲                                          │
│  מוטי ש.                     4.9 · 812     │
│  התמחות: גב עליון, לחץ בינוני               │
│                                             │
│  ┌───────────────────────────────────┐    │
│  │        הזמן גירוד                  │    │  <- single dominant action, Amber
│  └───────────────────────────────────┘    │
└───────────────────────────────────────────┘
```

On web (no native map), the middle region becomes a distance-sorted list of the
same rows — no attempt to fake a map with a static image.

## 6. Self-critique gate (design step 6.2)

Question asked before writing any component: *"If I'd been given a brief for some
other, unrelated services app, would I land on this same design?"*

- **Palette** — no. A generic services brief tends toward blue-purple or the
  cream/terracotta AI signature. Landing on clinical teal + amber specifically
  because the product's humor depends on looking like a health-services dispatch
  system is brief-specific reasoning, not a default. Kept as-is.
  - Revision made: the first pass had picked Amber at `#D9853A`, close enough to
    the blacklisted clay `#D97757` to risk exactly the collision the brief warns
    against. Shifted to `#E8892C` — more golden, further from both flagged hues —
    and wrote the numeric distance into the palette table above so it's checkable.
- **Typography** — no. A generic brief lands on Rubik or Heebo by default; ruling
  both out explicitly and picking a display face whose *character* (stamped-form
  gravity) does communicative work for this specific product's joke is brief-
  specific. Kept as-is.
- **Signature element** — no. A generic brief has no reason to invent a contour-map
  motif; it exists here because the product's entire structure (order = pick a back
  zone) makes it functional, not decorative. Kept as-is.
- **Wireframe layout** — partially generic by necessity: bottom-sheet-over-map is
  the correct, boring answer because it's *how the real benchmarks work*
  (Uber/Bolt/Gett/Wolt), and the brief explicitly says to match them rather than
  invent a novel layout here. No revision — matching the category convention is
  the right call for navigation structure, even while the palette/type/signature
  differentiate the brand.

No other components were changed as a result of this pass.
