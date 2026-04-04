# CLAUDE.md — Project Context

## What This Is

A solo narrative exploration game set in present-day East London. The player has moved to Limehouse. They notice things others can't — sounds, patterns, feelings, connections, permanence. London has a mythological layer beneath the everyday city. The nature of that layer depends on who the player chooses to be.

Working title: **Trace**

## The Core Loop

**Explore → Notice → Investigate → Choose → Consequence → Return**

The player walks through pixel-art London, taps unmarked details to discover them, follows investigation threads, faces choices with consequences, builds NPC relationships, and returns to their flat. Sessions: 5-60 minutes. The game rewards attention and curiosity.

## Tech Stack

- **Rendering:** HTML5 Canvas (320×180 native, pixel-scaled) for pixel art + DOM for text/UI
- **Code:** Vanilla JavaScript. No framework. 5 JS files for MVP.
- **Layout:** Split-screen — top half canvas (pixel art), bottom half DOM (text/UI). Responsive. Mobile-first.
- **Art:** Minimal/atmospheric pixel art with lighting overlays for time-of-day and weather. `image-rendering: pixelated`.
- **Audio:** Web Audio API. Ambient loops per location, punctuation sounds, one theme track.
- **State:** localStorage (MVP). Abstract the interface for future IndexedDB migration.
- **Deployment:** GitHub Pages. Static files only.
- **AI (post-MVP):** Model-agnostic adapter supporting Claude, GPT, Gemini, Ollama, OpenRouter. Player provides their own API key.

## File Structure

```
js/
├── engine.js    — canvas renderer, game loop, input handler, audio manager
├── state.js     — central state, save/load, progression, NPC memory
├── game.js      — navigation, investigation logic, NPC interaction, time/weather
├── ui.js        — all DOM: dialogue, notebook tabs, flat view, choices
└── ai.js        — AI adapter (present but inactive in MVP)
content/
├── locations.json, npcs.json, investigations.json
├── fragments.json, thoughts.json, config.json
assets/
├── sprites/, locations/, overlays/, ui/, audio/
```

## Current Phase: MVP

**Scope:** Limehouse only (10 locations). Musician trait only. 6 deep NPCs + 2 shallow. 5 investigation nodes. 3 lore fragments. Day/night cycle. Rain weather. The Forgetting (simplified). The Watcher (background only).

**Build order:** Screen → Movement → NPCs → Noticing → Investigation → Full Limehouse → Sound → Polish

See `game-bible/MVP-DEFINITION.md` for complete scope.
See `game-bible/IMPLEMENTATION-ROADMAP.md` for build order, milestones, and JSON schemas.

## The Game Bible

All design documents are in `game-bible/`. **Read these before making design decisions.**

### Phase 1 — Foundation
- `A1-world-structure.md` — Map, 30 locations, connections, data architecture, mobile layout spec
- `A2-character-system.md` — 5 traits, stats, progression, starting experiences
- `A5-B3-npc-system-voices.md` — 22 NPCs, relationship stages, memory system, voice rules
- `B1-physical-london.md` — Sensory descriptions for every location, NPC physical signatures, ambient life
- `B2-central-mystery.md` — 5 mythological readings, the Watcher's role, fragment architecture

### Phase 2 — Narrative Architecture
- `A3-investigation-web.md` — 37 investigation nodes with triggers, steps, choices, consequences. **Includes trigger reference table.**
- `A4-progression-metrics.md` — XP tables, unlock schedules, title system, flat object accumulation
- `A8-ending-system.md` — Leave London sequence, 15 event endings, flashback system
- `B2-lore-fragments.md` — All 35 lore fragments (7 per mythology), placement map
- `B4-npc-mythological-identities.md` — 80 identity variants (16 NPCs × 5 traits)
- `B5-investigation-text.md` — Playable text: clues, choices, consequences
- `coherence-matrix.md` — Cross-reference: NPCs × mythologies × fragments × nodes

### Phase 3 — Living Text
- `B7-dialogue-trees.md` — Scripted conversations for all 22 NPCs across all stages
- `B6-walking-thoughts.md` — 66 walking thoughts, all ≤8 words
- `B8-ending-text.md` — Farewell lines, ending narration, flashback captions
- `AI-personality-documents.md` — System prompt template + all 22 NPC personality docs
- `A6-world-systems.md` — Seasons, 20 city events, mythological weather, The Forgetting
- `A7-autopilot-agents.md` — Pattern model, agent lifecycle, pacing rules
- `the-watcher.md` — Complete character across all 5 mythologies

### Editorial
- `EDITORIAL-PASS-REPORT.md` — Literary masters' findings and fixes
- `GAME-MASTERS-EDITORIAL.md` — Game masters' findings and fixes

## Key Design Decisions (Locked)

These decisions are FINAL. Do not deviate without explicit instruction from Okan.

- **Setting:** Greenwich, Limehouse, Bermondsey — real East London locations with fictional overlays
- **Five traits:** The Musician, The Photographer, The Wanderer, The Barista, The Shopkeeper
- **Core verb:** NOTICE — tap unmarked pixel art details to discover them
- **Art style:** Modern lo-fi pixel art, minimal for MVP, atmospheric lighting
- **NPC dialogue:** ≤12 words standard, ≤15 words Confidant reveals, ≤20 words one seismic moment per NPC
- **Walking thoughts:** ≤8 words
- **Lore fragments:** ≤60 words, ≤4 sentences
- **Location descriptions:** ≤25 words (between-spaces: ≤50)
- **The Forgetting:** ~weekly, unpredictable window, 1-2 days, mythological layer goes quiet
- **Multiplayer (post-MVP):** Atmospheric only — district warmth, residuum marks, agent traces
- **AI (post-MVP):** Scripted base is complete and free. Living Conversations are opt-in with player's own API key. Model-agnostic.
- **Autopilot (post-MVP):** Three modes — Faithful, Curious, Bold. Player observes or reviews.
- **Agents (post-MVP):** One per player. 3× human ratio cap. Retired journals become found stories.
- **Endings:** Leave London (any time post-midpoint) + 3 event endings per trait (15 total). Flashback montage.
- **No hard cooldowns.** Pacing is narrative — NPC schedules, investigation clue timing. The player never sees a timer.
- **The flat is always available.** The player's anchor, diary, and rest point.

## Content Tagging

All text in the game is tagged:
- `neutral` — all traits see this
- `musician`, `photographer`, `wanderer`, `barista`, `shopkeeper` — trait-specific, only loaded for that trait

For MVP, only `neutral` and `musician` tags are active.

## The Masters System

This project uses two advisory panels (skills importable to Claude Code):

**Game Design Masters** (trigger: "the game masters" / "the design masters"):
- Meier (systems/emergence), Metzen (world/lore), Miyamoto (player feel/joy), Ueda (emotional truth/subtraction — orchestrator)
- Full Review mode for design, Code Consult mode for implementation decisions

**Literary Masters** (trigger: "the masters" / "call the masters"):
- Borges (architecture), Vian (economy), Cortázar (player as accomplice), Saramago (the body)
- Available for narrative review, NPC dialogue work, lore fragment refinement

## What NOT to Do

- Don't use a game framework (Phaser, Pixi) — the game is 50% text UI, frameworks optimize for 90%+ visual
- Don't add features not in the MVP definition without explicit approval
- Don't show stat numbers to the player — progression is felt through world changes, not meters
- Don't add tutorials or explanatory text — the game teaches through play
- Don't mark tappable details with indicators — the player must NOTICE them, not be told where they are
- Don't fill silence with content — quiet moments between discoveries are designed, not accidental
- Don't let NPCs confirm their mythological identity directly — always deniable, always the player's construction
