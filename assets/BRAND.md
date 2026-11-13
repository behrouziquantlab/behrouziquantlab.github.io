# BEHROUZI QUANT LAB — Brand & Design System v1

**Positioning:** premium quantitative trading technology. The brand is calm, precise and evidence-first. No hype and no performance promises.

## Assets (`website/brand/`)
| File | Use |
|---|---|
| `symbol.svg` | app icon, favicon, avatar. A rising signal path with a gold confirmation point over a baseline. |
| `logo_horizontal_dark.svg` / `_light.svg` | header, documents, email, invoices |
| `social_card.svg` | link previews (Open Graph) |

**Clear space:** keep ½ of the symbol height around the logo. Do not recolour the signal line or the gold point.

## Colour tokens
| Token | Hex | Role |
|---|---|---|
| `--bg` | #070B14 | page background |
| `--panel` / `--panel2` | #0D1424 / #111A2E | surfaces |
| `--line` | #1E2A44 | dividers |
| `--text` / `--muted` | #E6EDF7 / #8A98B4 | text |
| `--accent` | #2DD4BF | brand, links, primary action |
| `--gold` | #F5B841 | confirmation, highlights (sparingly) |
| `--up` / `--dn` | #22C55E / #EF4444 | bullish / bearish only |

## Typography
| Use | Typeface |
|---|---|
| Latin | Inter 400/500/600/700 |
| Persian | Vazirmatn |
| Numbers, code, eyebrow labels | JetBrains Mono |

## Layout
| Element | Value |
|---|---|
| Container | 1160 px |
| Gutter | 20 px desktop, 16 px mobile |
| Corner radius | 14 px cards, 10 px controls |
| Section rhythm | 56 px vertical padding |
| Grid | 3 → 2 → 1 columns at 900 px and 600 px |
| Motion | purposeful only: one signature 3D/motion moment per page, quiet everywhere else (see Motion) |

## Motion (v2)
Motion explains the product. It never decorates.

| Allowed | Not allowed |
|---|---|
| One signature scene per page that shows the method (noise → divergence → confirmation) | Ambient floating shapes, particles or glow with no meaning |
| Section reveals, hover and focus feedback, line-drawing of real or labelled sample charts | Bounce, shake, autoplay loops on text, parallax on body text |
| Scroll-linked explanation on desktop; a simple stacked version on mobile | Scroll hijacking, or content that only appears through animation |
| Gold confirmation point "locking" as the strongest beat | Gold or `--up`/`--dn` used for decoration |

- **Easing:** `cubic-bezier(.2,.7,.2,1)` enter, `cubic-bezier(.65,0,.35,1)` transitions. Calm and damped, no overshoot except the confirmation point.
- **Durations:** 120–200 ms interaction, 500–800 ms reveal, hero intro ≤ 1.6 s of reading time.
- **Required:** `prefers-reduced-motion` gives a still frame, the page works without WebGL/JS, loops pause off-screen, and simulated visuals are labelled "simulated".

## Voice
- Say what the tool does and what it does not do.
- Publish negative results.
- Never show simulated profit as evidence.
- Never use fake reviews.
