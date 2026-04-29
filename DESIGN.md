# Design

> Initial draft. Run `/impeccable document` to regenerate from the actual code,
> or `/impeccable teach` to rewrite by hand.

## Theme decision

**Dark.** Physical scene: *Security+ candidate at 11pm on the couch, phone
brightness halfway down, lamp off, tab open while a streaming show plays on
another screen.* A bright surface in that scene is a flashbang. Dark is the
right answer for *this* user, *here*.

## Color strategy

**Restrained.** Tinted near-black neutrals carry the surface; one indigo
accent (≤10%) marks primary actions and the brand mark. Semantic states —
success / error / warning — are reserved for verdicts and review cells, not
decoration.

Banned in this codebase:

- Gradient text (`background-clip: text`). Use weight + size for emphasis.
- Hero-metric SaaS template (huge gradient number + small label + supporting
  stats). The results screen does not advertise itself.
- Decorative glassmorphism. The topbar is opaque tinted neutral, not a
  blurred panel.

## Tokens (CSS custom properties)

All declared in `static/styles.css` `:root`. Use OKLCH; never `#000`/`#fff`.

| Token | OKLCH value | Role |
|---|---|---|
| `--bg` | `oklch(0.18 0.02 270)` | Page background. Tinted toward indigo. |
| `--bg-soft` | `oklch(0.21 0.022 270)` | Subtle surface inside cards. |
| `--surface` | `oklch(0.235 0.025 270)` | Card / panel background. |
| `--surface-2` | `oklch(0.27 0.028 270)` | Secondary surface (toolbars, slider tracks). |
| `--border` | `oklch(0.32 0.03 270)` | Default border. |
| `--text` | `oklch(0.97 0.004 270)` | Primary text. Slightly tinted off-white. |
| `--text-muted` | `oklch(0.7 0.01 270)` | Labels, secondary copy. |
| `--accent` | `oklch(0.65 0.16 280)` | Primary action / brand. |
| `--accent-strong` | `oklch(0.74 0.14 280)` | Hover, focus ring. |
| `--success` | `oklch(0.7 0.17 145)` | Correct verdict. |
| `--success-bg` | `oklch(0.27 0.05 150)` | Correct cell background. |
| `--error` | `oklch(0.65 0.21 25)` | Wrong verdict. |
| `--error-bg` | `oklch(0.28 0.07 25)` | Wrong cell background. |
| `--warning` | `oklch(0.78 0.16 75)` | Missed-but-not-picked option in review. |

## Typography

- One family: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`.
- Fixed rem scale, ratio ≈ 1.2.
- Headline: 28px / 700.
- Question stem: 19px / 500 (17px on phones).
- Option text: 15px / 500.
- Body / explanation: 14–15px / 400.
- Caption / label: 11–13px / 600, uppercase letter-spacing 0.06em on labels.

## Spacing

8px base. Common gaps: 6, 10, 14, 22, 28. Vary intentionally — same gap
everywhere is monotony. Card padding 36 desktop, 20 phone.

## Components

- **Buttons.** Single rounded shape (10px). Min height 44px, `touch-action:
  manipulation`. Three variants: `primary` (accent gradient is acceptable on
  the brand mark only — buttons use solid accent), `ghost` (transparent +
  border), `danger` (error fill).
- **Options.** Full-width tap rows, 28px circular letter chip, three states:
  default, `selected` (accent border + tinted bg), revealed: `correct`,
  `incorrect`, `missed` (amber, when shuffled-multi reveals an option you
  didn't pick).
- **Feedback panel.** Bordered/colored top region with a status icon + verdict
  sentence, then a "Why?" body. Animation: `slideIn` 250ms ease-out, opacity
  + 4px translateY only.
- **Modal.** Used **only** for destructive confirmations (End Quiz). Centered,
  420px max-width, focus the confirm button, Escape to dismiss.

## Motion

- Defaults: 150ms for color/border, 250ms for reveal/feedback.
- Easing: ease-out only (no bounce / elastic).
- Animate transforms and opacity, never layout properties.
- No orchestrated load-in sequences.

## Accessibility floor

- AA contrast on every text/background combination.
- Visible focus ring on every interactive element.
- All option buttons are real `<button>` elements with descriptive text.
- Modal: `role="dialog"`, `aria-modal="true"`, focus trap, Esc to close.
