# Vapour Vault UI Design System

## Product feel

Vapour Vault should feel like a dark security operations workstation for distributed encrypted storage. It is precise, terse, data-dense, and visibly technical. The storyboard is the visual reference: black/near-black base, green system states, thin borders, binary/ciphertext accents, fixed navigation, and clear process phases.

## Palette

Use CSS variables rather than scattering colors through components:

```css
:root {
  color-scheme: dark;
  --vv-bg: #050806;
  --vv-surface-1: #0a100c;
  --vv-surface-2: #0e1711;
  --vv-surface-3: #142018;
  --vv-border: #1d3627;
  --vv-border-strong: #2b6544;
  --vv-text: #e0eee5;
  --vv-muted: #91a99a;
  --vv-green: #39e58b;
  --vv-green-dim: #173f2b;
  --vv-red: #ff5f64;
  --vv-amber: #e3b65e;
  --vv-code: #a8f3c5;
}
```

Green means a confirmed healthy/success state or the primary action. Red means offline/failure. Amber is warnings/unknowns. Keep all other color limited. Avoid purple accents and rainbow status colors. Do not apply bright green to every text element.

## Typography

- Technical headings, node IDs, hashes, timestamps and terminal output: IBM Plex Mono (or a neutral system monospace fallback).
- Paragraphs and form fields: IBM Plex Sans (or system sans fallback).
- Do not use Inter, Geist, or Space Grotesk.
- Use clear type hierarchy. Technical data may be compact, but critical statuses must remain readable.
- Google Font loading is optional; do not make the UI fail when external fonts are unavailable and do not add a new package just for typography.

## Layout and surfaces

- A persistent left navigation rail shows all eight mandatory sections at all times after login.
- Use a dense but legible page grid: clear header, one primary task area, related evidence/data panels, and tables for operational data.
- Prefer rectangular panels with 3–6px radius, thin borders, no glass translucency, and no decorative shadows.
- Do not turn every datum into a card. In particular, avoid the generic “three feature cards in a row” pattern. Use a compact metric strip, key-value rows, tables, timelines, or a real node matrix when appropriate.
- Use whitespace for hierarchy. Do not blanket every panel with an outline; borders should describe structure.
- Responsive behavior: sidebar may collapse on narrow screens, but all eight sections must remain accessible. Tables can scroll horizontally on small screens. Do not redesign this as a mobile-first card wall.

## Motion

- Allowed: shard distribution line moving from the file object to a node; node changes briefly blinking/pulsing on state transition; a binary/hex stream moving while a real request is pending; narrow linear progress indicator for a real measured process.
- Motion must stop when the operation completes. Respect `prefers-reduced-motion`.
- Do not use indefinite glowing pulses for healthy nodes, animated arrows for decoration, floating ornaments, or generic hover animations. Use clear focus styles and modest hover feedback only where it aids interaction.
- A node should settle to a static green outline when online and red outline when offline. If transition blinking is used, it is short and state-driven, not perpetual.

## Loader language (important)

**No circular spinner.** Use one of:

- shifting binary: `01001101 10100110 00110101`
- changing hexadecimal/SHA-like fragments (visually indicate activity only; never label the fragments as the file's actual SHA-256 unless they are computed values)
- ciphertext-style rows such as `A7 C1 09 F2 ...`
- a narrow segmented or linear stage bar driven by actual request state
- a terminal line with timestamps only if the timestamps/events are real client-observed events

Do not fabricate a real-looking hash in a loading animation and then reuse it as a verification value. Decorative loader sequences must be marked/implemented as animation, never as stored data.

## UI rules from the supplied “30 reasons your site looks vibecoded” list

Avoid:

1. harsh gradients;
2. Lucide icon packs as the visual language;
3. pure white page backgrounds;
4. rainbow coloring;
5. drop shadows;
6. generic rows of three marketing/feature cards;
7. emojis as interface icons;
8. liquid-glass or glassmorphism surfaces;
9. em-dash-heavy marketing copy;
10. Inter, Geist, and Space Grotesk;
11. colored left stripes used as decorative card accents;
12. fake testimonials;
13. bento-grid layouts as the generic default;
14. decorative-only terminal windows;
15. copy built on “it’s not X, it’s Y” slogans;
16. checkmark bullets as generic decoration (reserve ticks for completed/verified states);
17. pricing-table tropes;
18. fake product demos;
19. overly soft/large corner radii;
20. purple-and-black themes;
21. skeleton loading blocks; use explicit stateful binary/ciphertext loaders instead;
22. radial gradient orbs;
23. decorative dot-grid wallpaper;
24. sparkle icons;
25. animated arrows unrelated to actual data flow;
26. links to fake policy pages;
27. fake privacy-policy affordances;
28. gratuitous hover animations;
29. neon overload;
30. generic pastel colors.

### Explicit exceptions requested for Vapour Vault

- The user expressly requires a CMD/terminal vibe. Include *purposeful* terminal output representing real operation status; never use a decorative fake terminal with fabricated events.
- The user expressly wants binary 0/1 and hash/ciphertext loading effects. Use these sparingly in upload/reconstruction progress and keep the displayed integrity hash separate from decorative loader data.
- The user expressly wants animated dotted distribution lines and node state animation. Use them only for the real distribution/status states and reduce motion when requested.

## Component behavior

- Status chips must say Online / Offline / Degraded / Unknown, according to actual data.
- Every form has loading, validation, failure, and success states. Errors are inline, not browser `alert()` dialogs.
- Tables have usable empty states, explicit loading states, and readable error states. Do not use fake rows as placeholders.
- No success color or verification language before the actual operation has been confirmed.
- Use accessible labels, keyboard focus, semantic buttons, and reasonable contrast.
