---
name: awesome-design-md
description: "Use when generating, styling, or auditing UI that should match a known brand design system. A curáted set of DESIGN.md files from popular design systems (Vercel, Linear, Stripe, Supabase, Notion, Apple, Spotify, Figma, etc., in references/design-md/). Load the matching DESIGN.md and follow its primitives, color tokens, typography, and spacing. Also use to reproduce a site's look, or when the user asks for pixel-consistent brand UI."
---

# Awesome Design.md

Curated DESIGN.md style guides from popular brands/design systems.
Each file encodes that brand's visual language (colors, type scale, spacing,
radii, components) that coding agents can follow to generate a matching UI.

## When to use

- The user names a brand/site and wants UI in that style (e.g. "make it look
  like Stripe", "Vercel-style landing").
- You need a production-quality design system baseline instead of inventing one.
- Pair with ui-ux-pro-max for design decisions + a concrete token set to honor.

## How to use

1. Pick the closest brand from the list (by vibe / platform / audience).
2. Load `references/design-md/<site>.md`.
3. Extract: color tokens, typography scale, spacing, radii, shadows, dark/light
   modes, component conventions.
4. Apply them consistently. Do NOT copy brand logos/assets — tokens only.

## Available references

Listed by `ls references/design-md/`:

- **vercel** — minimal black/white SaaS, monospace accents
- **linear.app** — refined dark dashboard, purple accent, dense tables
- **stripe** — indigo gradient brand, financial SaaS
- **supabase** — dark green accent SaaS/dev-tool
- **notion** — muted neutral, rich text, simple cards
- **apple** — clean white space, SF-style typography
- **spotify** — green accent, media/audio
- **figma** — design-tool purple
- **cursor** — AI editor dark theme
- **slack, sentry, posthog, airbnb, miro, warp, raycast, opencode** — more styles

Load the file for the relevant one before generating UI.