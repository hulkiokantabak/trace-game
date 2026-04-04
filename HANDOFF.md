# PROJECT HANDOFF — Trace (A Solo Narrative Exploration Game)

## For Claude Code — Autonomous Implementation

### How to Read This Document
This handoff is designed for a scenario where Claude Code builds the entire game with minimal human intervention. The project creator (Okan) will test by playing, not by reading code. His feedback will be emotional and experiential — "this doesn't feel right," "the Barista should be warmer," "this location is too empty." Claude Code must translate such feedback into implementation changes.

**Read this handoff completely before writing any code.**
Then read `CLAUDE.md`, `MVP-DEFINITION.md`, and `IMPLEMENTATION-ROADMAP.md`.
Then begin building.

---

# PART 1: WHAT THIS PROJECT IS

## The Game in One Paragraph

A solo narrative exploration game set in present-day East London — Greenwich, Limehouse, and Bermondsey. The player has just moved to Limehouse. They walk through pixel-art neighborhoods, tap unmarked details to discover them, build relationships with NPCs, and follow investigation threads that reveal a mythological layer beneath everyday London. The nature of the mythology depends on which of five character types the player chose. The game is played in a browser and on mobile, deployed on GitHub Pages, with an optional AI-powered conversation layer using the player's own API key. The core emotion is presence — paying attention to a place that pays attention back.

## How This Project Was Designed

This game was designed through extensive collaborative brainstorming using two advisory panels of four personas each — the Game Design Masters (Meier, Metzen, Miyamoto, Ueda) and the Literary Masters (Borges, Vian, Cortázar, Saramago). Every design decision was debated across multiple rounds, every piece of text went through editorial passes, and all fixes were implemented. The result is 25 documents totaling ~49,000 words — a complete game bible.

Both panels exist as importable skills:
- `game-design-masters.skill` — triggers on "the game masters" / "the design masters." Packaged with this project.
- The literary masters skill triggers on "the masters" / "call the masters." This is a separate skill from the user's personal collection — ask Okan to import it to Claude Code if narrative consultation is needed during development.

These can be invoked during development for design consultation. However, **for most implementation decisions, the game bible documents contain everything needed.** The skills are for new design questions that arise during development, not for routine coding.

---

# PART 2: THE COMPLETE FILE INVENTORY

## Files That Must Be Uploaded

**If any file below is missing, ask the user to upload it before proceeding with any work that requires it.**

### Root Level (4 files)
| File | Purpose | Must Read Before Coding? |
|------|---------|--------------------------|
| `CLAUDE.md` | **READ FIRST.** Tech stack, file structure, locked decisions, what NOT to do. Place in repo root. | YES — first |
| `MVP-DEFINITION.md` | Exact MVP scope. What's in, what's out. Emotional checkpoints per milestone. | YES — second |
| `IMPLEMENTATION-ROADMAP.md` | Technical architecture, 7 build milestones, **complete JSON content schemas with examples.** | YES — third |
| `HANDOFF.md` | This document. Overall context and guidance. | Already reading it |

### Phase 1 — Foundation (5 files)
| File | What It Contains |
|------|-----------------|
| `A1-world-structure.md` | **The authoritative location registry.** 30 locations (IDs, names, connections, time-gating, trait-gating), mobile layout spec, data architecture, world systems summary. |
| `A2-character-system.md` | 5 traits fully defined (Musician, Photographer, Wanderer, Barista, Shopkeeper), core stats, progression curves, starting experiences, trait-specific stats, the autopilot pattern model. |
| `A5-B3-npc-system-voices.md` | All 22 NPCs listed, 5 relationship stages with exact triggers, NPC memory system (JSON schema), AI personality document template, full NPC schedules, voice rules for every character. |
| `B1-physical-london.md` | Sensory description for every location (≤25 words), physical signature for every NPC, ambient life notes, between-space descriptions. **This is the game's sensory foundation.** |
| `B2-central-mystery.md` | The 5 mythological readings (Recording, Palimpsest, Dream, Network, Foundation), the Watcher's role, lore fragment architecture, contradiction map. |

### Phase 2 — Narrative Architecture (7 files)
| File | What It Contains |
|------|-----------------|
| `A3-investigation-web.md` | 37 investigation nodes. **Includes a trigger reference table for ALL nodes.** Trait-specific entry points. Main storyline threads. |
| `A4-progression-metrics.md` | XP tables, stat tier thresholds, unlock schedules, 25-30 titles, flat object accumulation schedule (16 objects), flat grid layout, journal tab names. |
| `A8-ending-system.md` | Leave London sequence, 15 event endings, flashback selection algorithm. *(Post-MVP reference.)* |
| `B2-lore-fragments.md` | All 35 lore fragments written in full. Placement table with Awareness requirements. MVP needs M-F1, M-F2, M-F5. |
| `B4-npc-mythological-identities.md` | 80 identity variants (16 NPCs × 5 traits). MVP needs the Musician column. |
| `B5-investigation-text.md` | Playable text for key investigation nodes: discovery text, clue progressions, choice prompts, consequence descriptions. |
| `coherence-matrix.md` | Cross-reference verification. *(Reference for consistency checking.)* |

### Phase 3 — Living Text (7 files)
| File | What It Contains |
|------|-----------------|
| `B7-dialogue-trees.md` | Scripted conversations for all 22 NPCs, all stages, all trait branches. Dialogue limits: standard ≤12 words, Confidant ≤15, seismic ≤20. |
| `B6-walking-thoughts.md` | 66 walking thoughts (all ≤8 words), tagged by route, neighborhood, time, weather, season, progression. |
| `B8-ending-text.md` | Farewell lines, ending narration, flashback captions. *(Post-MVP reference.)* |
| `AI-personality-documents.md` | System prompt template + personality documents for all 22 NPCs. Defines NPC behavior for both scripted and AI modes. |
| `A6-world-systems.md` | 4 seasons, 20 city events, 4 mythological weather states, The Forgetting spec, multiplayer systems. *(MVP uses simplified versions.)* |
| `A7-autopilot-agents.md` | Autopilot system, agent lifecycle, new player protection. *(Post-MVP.)* |
| `the-watcher.md` | The Watcher's complete character across all 5 mythologies. **MVP needs this — the Watcher appears in background.** |

### Editorial Reports (2 files)
| File | Purpose |
|------|---------|
| `EDITORIAL-PASS-REPORT.md` | What was reviewed and fixed by the literary masters. |
| `GAME-MASTERS-EDITORIAL.md` | What was reviewed and fixed by the game masters. |

---

# PART 3: ALL LOCKED DESIGN DECISIONS

These are FINAL. Do not deviate without explicit instruction from the user.

## World
- Three real East London neighborhoods: Greenwich, Limehouse, Bermondsey
- 30 locations with specific IDs (G01-G10, L01-L10, B01-B10) — see A1 for the complete registry
- The player's flat is in Limehouse on Narrow Street — always accessible, never locked
- Between-spaces (walks between neighborhoods) are designed breathing room, not loading screens

## Characters
- Five traits: The Musician, The Photographer, The Wanderer, The Barista, The Shopkeeper
- 16 deep NPCs (5 relationship stages, 5 mythological identities each)
- 6 shallow NPCs (surface + recognition stages only)
- The Watcher — primary threat NPC, five trait-dependent identities

## Core Mechanic
- The verb is NOTICE — tap unmarked pixel art details to discover them
- **Details are NEVER marked with indicators.** No glowing outlines, no hovering icons, no pulsing. The player must look.
- What's visible depends on trait and Awareness level
- Retroactive discovery: higher Awareness reveals new details at already-visited locations

## Five Mythologies
1. Musician: London is an acoustic archive amplified by attention
2. Photographer: London is a self-revising palimpsest editing out people
3. Wanderer: London is a dreaming consciousness becoming lucid
4. Barista: London is a network converging on a deliberately erased name
5. Shopkeeper: London is built on something alive that is beginning to stir

The game NEVER confirms which is true. Each is internally consistent. All contradict each other.

## Progression
- Three core stats (Awareness, Connection, Insight) + one trait-specific stat
- **No numbers shown to the player.** Ever. Progression is felt through world changes.
- Three tiers per stat, each unlocking content, NPC stages, and investigation nodes

## Text Economy
- NPC dialogue: ≤12 words (Confidant ≤15, one seismic moment ≤20)
- Walking thoughts: ≤8 words
- Lore fragments: ≤60 words, ≤4 sentences
- Location descriptions: ≤25 words (between-spaces ≤50)
- All text tagged: `neutral` or trait-specific (`musician`, `photographer`, etc.)

## The Forgetting
- ~Weekly, unpredictable 1-2 day window
- Mythological layer goes quiet, NPCs slightly distant, palette subtly desaturated
- Not punishment — a designed contrast that makes the ordinary feel eerie

## Endings (Post-MVP)
- Leave London: a farewell walk with flashback montage
- 15 event endings (3 per trait), each a different relationship to the mythology
- No ending is a failure

## AI Layer (Post-MVP)
- Scripted base is the complete game (free)
- Living Conversations: player's own API key, model-agnostic
- Autopilot: character plays autonomously based on learned patterns

---

# PART 4: THE MVP — EXACT SCOPE

**One neighborhood (Limehouse). One trait (Musician). The core loop proven.**

### In the MVP:
- 10 locations (L01-L10)
- 6 deep NPCs (Barista, Sound Artist, Pub Landlord, Tattoo Artist, Bike Courier, Watcher-background) + 2 shallow (Night Fox, Street Preacher)
- 5 investigation nodes (LI-01 partial, LI-02 complete, LI-04 partial, LI-08 complete, LI-12 background)
- 3 lore fragments (M-F1, M-F2, M-F5)
- The flat with accumulating objects (4-6 objects reachable in MVP)
- The notebook (5 tabs: People | Places | Mysteries | Lore | Me)
- Day/night cycle (real time, 4 periods)
- Rain weather (clear + rain)
- NPC relationships through Familiar stage
- Core stats (Awareness, Connection) + Resonance (Musician)
- The Forgetting (simplified: 24-hour palette + NPC behavior shift)
- Title screen with theme music
- Save/load via localStorage

### NOT in the MVP:
Greenwich, Bermondsey, other 4 traits, AI conversations, autopilot, agents, endings, seasonal cycle, city events, mythological weather, shared world state, Confidant/Ally stages, the Watcher confrontation.

### The MVP Ends On:
The Watcher's first background appearance (LI-12). The player has noticed someone watching them. They can't interact yet. The cliffhanger: "I am not alone. And I don't know if that's comforting."

After exhausting MVP content, a message in the flat: "London has more to show you. The Musician's journey continues when Greenwich opens."

---

# PART 5: TECHNICAL ARCHITECTURE

## Stack
| Layer | Choice |
|-------|--------|
| Pixel Art Rendering | HTML5 Canvas, 320×180 native, CSS-scaled with `image-rendering: pixelated` |
| Text/UI | Standard DOM (HTML/CSS) |
| JavaScript | Vanilla JS. No framework. 5 files for MVP. |
| Save | localStorage with abstracted interface (for future IndexedDB swap) |
| Audio | Web Audio API — procedural for MVP (oscillators, noise generators). No audio file dependencies. |
| Art | Procedural/placeholder for MVP. Simple shapes, gradients, minimal sprites. |
| Deployment | GitHub Pages. Static files only. |

## Layout Specification

**Mobile (portrait, width < 768px):**
```
┌──────────────────────┐
│    CANVAS (50vh)      │  ← pixel art, scaled to fill width
│                       │
├──────────────────────┤
│    TEXT/UI (50vh)     │  ← scrollable, tappable
│                       │
└──────────────────────┘
```

**Desktop (width ≥ 768px):**
```
┌──────────────────────┐
│    CANVAS (60vh)      │  ← pixel art, centered, max-width 960px
│                       │
├──────────────────────┤
│    TEXT/UI (40vh)     │  ← wider text area, comfortable reading
│                       │
└──────────────────────┘
```

Or optionally side-by-side on very wide screens (≥1200px): canvas left, text right.

**Minimum supported:** 320px width (small phones). The canvas renders at native 320×180 and scales. Text reflows.

## File Structure
```
trace-game/
├── index.html
├── css/game.css
├── js/
│   ├── engine.js      — canvas renderer, game loop, input, audio (procedural)
│   ├── state.js       — state management, save/load, progression, NPC memory
│   ├── game.js        — navigation, investigation, NPC interaction, time/weather
│   ├── ui.js          — DOM: dialogue, notebook, flat, choices, title screen
│   └── ai.js          — AI adapter (present, inactive in MVP)
├── content/
│   ├── locations.json
│   ├── npcs.json
│   ├── investigations.json
│   ├── fragments.json
│   ├── thoughts.json
│   └── config.json
├── assets/             — placeholder art (generated programmatically or minimal PNGs)
├── game-bible/         — all design documents (reference only, not loaded by game)
└── CLAUDE.md
```

## Input Handling
- **Mobile:** Tap on canvas = interact with detail or move. Tap on text panel = select choice or navigate notebook.
- **Desktop:** Mouse click = tap. **No hover indicators.** The cursor does not change over interactable details — this is consistent with the "no markers" design rule. The player must click to discover, same as tapping.
- **Keyboard (desktop bonus):** Arrow keys for movement between adjacent locations. Enter to confirm choices. Not required for MVP but nice to have.

## Save System
- **Auto-save after every meaningful state change:** location move, NPC conversation, investigation step, choice made, detail discovered, stat updated.
- **Save to localStorage** as a single JSON object (key: `trace_save`).
- **On game open:** check for existing save. If found, resume. If not, show title screen → character creation → first session.
- **Corruption recovery:** If save JSON fails to parse, offer "Start fresh" option. Don't silently lose progress — inform the player.
- **Abstract the save interface:** `save(state)` and `load()` functions that can swap from localStorage to IndexedDB later without changing game code.

## Content Loading
- **Load all JSON content at startup.** For MVP (10 locations, 8 NPCs, 5 investigations), the total data is well under 500KB. No need for lazy loading.
- **Load order:** config.json first (game constants), then locations, npcs, investigations, fragments, thoughts. All must complete before the game loop starts.

## Error Handling
- **Canvas fails to initialize:** Show a text-only fallback. The game should be playable (reduced experience) even without canvas — the text panel carries the core content.
- **localStorage full or unavailable:** Warn the player. Offer to continue without saving. Never crash silently.
- **Audio fails:** The game works without sound. Audio is enhancement, not dependency. Wrap all audio operations in try/catch.
- **JSON fails to load:** Show error with specific file name. "Could not load locations.json. Please refresh."

## Git Workflow
- **Commit after each milestone** with a meaningful message: "Milestone 0: split-screen layout and title screen"
- **The repo should be deployable to GitHub Pages at any point after Milestone 0.** Every commit is a working (if incomplete) game.
- **Branch structure for MVP:** Work on `main`. No feature branches needed for solo development.

---

# PART 6: INTERACTION DESIGN

## Discovery Flow (The Core Mechanic)
When the player taps a detail in the canvas:
1. The detail briefly highlights (a 200ms white flash on the sprite — subtle, confirming the tap registered)
2. The text panel smoothly scrolls to show the discovery text
3. Discovery text stays visible until the player takes another action (moves, taps another detail, or taps "Continue" in the text panel)
4. If the player taps another detail while text is showing, the new text REPLACES the old (not stacks)
5. The notebook's relevant tab updates silently (a small dot indicator on the tab shows new content)

**If the player taps a non-interactive area of the canvas:** Nothing happens. No "nothing here" message. Silence IS the response. The player learns through absence what is and isn't interactive.

## NPC Conversation Flow
When the player taps an NPC:
1. The NPC's name appears at the top of the text panel (no portrait for MVP — text only)
2. The NPC's opening line appears: their voice-rule-compliant greeting for the current relationship stage
3. If the NPC has a scripted beat to deliver (investigation trigger, relationship advancement), it plays as sequential lines — **tap to advance each line** (one line at a time, not all at once)
4. If choices are available, 2-3 buttons appear below the dialogue. Player taps one.
5. Consequence text appears. NPC responds.
6. Conversation ends. The text panel shows the location description again with "[The Barista is working quietly]" or similar ambient note.
7. The player can tap the NPC again for ambient dialogue (a rotating line from their current stage's ambient pool).

**Leaving mid-conversation:** The player can tap a movement direction at any time. Conversation ends gracefully. No penalty.

## The Notebook
- Accessed via a "notebook" icon/button at the bottom of the text panel (always visible)
- Opens as a full text-panel overlay (the canvas stays visible above but dims slightly)
- **5 tabs at the top:** People | Places | Mysteries | Lore | Me
- Tab content is scrollable
- "Close notebook" button returns to the location view
- A small dot on a tab indicates unread content

## The Flat
- Rendered in the canvas as a room scene: bed, table, window, shelf, wall
- Objects appear at specific positions as the player earns them
- The notebook is accessible here (same as everywhere)
- The window shows current weather and time of day
- Tapping an object in the flat shows a brief memory text in the text panel: "The burn mark in the counter wood. You noticed it on your third visit."

---

# PART 7: ART AND AUDIO (PLACEHOLDER STRATEGY)

## Visual Assets — MVP Approach

**The game must be fully playable with placeholder art.** Visual polish is a separate phase.

For MVP, generate all visuals programmatically or as minimal assets:

**Location backgrounds:** Each location is a canvas-drawn scene using:
- A sky gradient (2 colors, varies by time of day — values in config.json)
- 1-2 geometric shapes representing key architectural elements (rectangles for buildings, a horizontal band for water, triangles for roofs)
- A ground color band
- Color palette per location to give each a distinct feel (warm amber for the coffee shop, cool blue-grey for the canal, dark for the warehouse)

**Character sprite:** A simple 16×32 pixel figure. Different color for each trait (blue for Musician). Minimal animation: idle (breathing), walking (2 frames), and a discovery pose (leaning forward).

**NPC sprites:** Not needed for MVP text-panel conversations. If implementing NPC presence in the canvas scene, a simple colored silhouette at the NPC's location is sufficient.

**Interactive details:** Small sprites (8×8 or 16×16) placed at specific canvas coordinates. They should be subtle — a slightly different shade from the background, not invisible but not obvious. They're meant to reward LOOKING.

**Weather overlay:** Rain = random vertical white pixels falling (simple particle system). Clear = no overlay.

**Time-of-day:** A full-screen gradient overlay that shifts the canvas palette. Morning: warm yellow. Afternoon: neutral. Evening: orange-amber. Night: deep blue. Use canvas `globalCompositeOperation = 'multiply'` or similar.

**The Forgetting:** Reduce canvas saturation by 30%. Apply a subtle grain/noise overlay.

## Audio — MVP Approach

**Generate all audio procedurally using Web Audio API.** No audio file dependencies.

- **Ambient per location:** A low drone (oscillator, sine wave, location-specific frequency). The canal: lower pitch + a subtle rhythmic pulse (the chain clink). The coffee shop: slightly higher pitch, warmer. The church: reverb-heavy, hollow.
- **Discovery chime:** A brief ascending tone (two notes, major third interval, 200ms total).
- **NPC greeting:** A soft single tone (different pitch per NPC).
- **Investigation advance:** A gentle chord (three notes resolving).
- **Choice moment:** A subtle tension tone (minor second interval, very quiet).
- **Rain:** White noise filtered through a low-pass at ~400Hz. Gentle.
- **The Forgetting silence:** Remove the ambient drone. The absence IS the sound design.
- **Theme music:** This is the ONE element that may need an actual audio file. For MVP, a simple procedural melody is acceptable: a 4-bar piano-like sequence (use Web Audio API oscillators with envelope shaping). The emotion is wonder — ascending, open, unresolved.

---

# PART 8: CODING GUIDE

## The Build-Test Workflow

Claude Code should follow this rhythm:

1. **Build one milestone**
2. **Summarize what was built** — list features implemented, note any decisions made that weren't explicitly specified in the game bible
3. **Deploy to GitHub Pages** (or ensure it's locally testable)
4. **Wait for Okan to test and give feedback** (unless instructed to proceed autonomously)
5. **Interpret feedback** — Okan will say things like "the canal doesn't feel right" (meaning: the atmosphere needs work) or "I want to see more when I tap" (meaning: add more discoverable details). Translate emotional feedback into implementation.
6. **Fix, then proceed to next milestone**

**If instructed to build the complete MVP without stopping:** Build all 7 milestones sequentially, commit after each, deploy the final result. Document every autonomous decision in comments or a DECISIONS.md file.

## Autonomous Decision-Making Rule

When a design question arises that isn't answered by the game bible:

1. **Check CLAUDE.md** — if the answer is in the locked decisions, follow it.
2. **Check the relevant game bible document** — A1 for locations, A5-B3 for NPCs, A3 for investigations, etc.
3. **If not answered anywhere:** Make the choice that best serves the emotional checkpoint for the current milestone. Document the decision.
4. **Never add a feature not in the MVP scope** without explicit instruction.

## Content Translation: Game Bible → JSON

The game bible documents are the **source of truth.** The JSON content files are **translations** of those documents into machine-readable format.

To build a JSON entry:
1. Read the game bible document for the item (e.g., NPC: read A5-B3 for relationship system, B7 for dialogue, B4 for mythology, B1 for physical signature, AI-personality-documents for the AI prompt)
2. Translate into the JSON schema defined in `IMPLEMENTATION-ROADMAP.md`
3. If a JSON field contradicts a game bible document, **the game bible wins**

The schemas in IMPLEMENTATION-ROADMAP.md include complete working examples for: a location (L02 Coffee Shop), an NPC (the Barista), an investigation (LI-02 The Barista's Song), and the config file. Use these as templates.

## UI Text Tone

**All player-facing text is in-world.** Never use system language.

| System Message | In-World Equivalent |
|---------------|---------------------|
| "Game saved" | *Don't display anything. The notebook closes with a soft sound.* |
| "New area discovered" | *The map in the notebook updates silently. A dot appears on the Places tab.* |
| "NPC unavailable" | "The coffee shop is quiet. The counter is empty." |
| "Investigation advanced" | "Something has shifted. The notebook feels heavier." |
| "New item received" | *The object simply appears in the flat. No announcement.* |
| "Achievement unlocked" | *The title appears in the Me tab of the notebook. No popup.* |
| "Error: save failed" | "The notebook won't close properly. Try again." |

The ONE exception: critical errors (JSON load failure, canvas crash) can use plain system messages. Everything else is in-world.

---

# PART 9: THE TITLE AND IDENTITY

**The game's title is "Trace."** It means what you follow and what you leave behind. The player follows traces through London's mythology — sounds, patterns, feelings, connections, permanence. And the player leaves traces — marks on the city, relationships with NPCs, a journal, a flat full of objects. The word deepens with play: at the start, a trace is something you're looking for. By the end, a trace is something you've become.

The title screen should show:
- "Trace" in a simple, clean font (pixel-appropriate)
- A pixel art scene of Limehouse at dusk (canal, silhouettes, sky)
- The theme melody playing
- A single button: "Begin"

Tapping "Begin" leads to character creation (5 silhouettes, only Musician selectable for MVP), then the flat.

## Game Flow: First Launch vs. Return

**First launch (no save exists):**
Title screen (theme music) → "Begin" → Character creation (pick a trait) → Fade to the flat → First walking thought: "New flat. New city. The canal is outside." → Player is free.

**Return launch (save exists):**
Title screen (theme music, brief — 2 seconds) → Auto-loads save → Player resumes at their last location. If significant time has passed (>7 days), a special walking thought: "London kept going without me." If The Forgetting occurred while away, NPCs reflect it on the next visit.

**The title screen on return should feel like a breath, not a barrier.** Two seconds of "Trace," the theme, the dusk scene — then the player is back in their London.

---

# PART 10: THE PROMPT

Paste this into Claude Code to begin:

```
I'm building a game called "Trace" — a solo narrative exploration game set in East London.

Please read these files in order:
1. CLAUDE.md (repo root) — project context, tech stack, locked decisions
2. game-bible/MVP-DEFINITION.md — exact MVP scope
3. game-bible/IMPLEMENTATION-ROADMAP.md — build milestones and JSON schemas

The full game bible (24 documents) is in game-bible/. These are design reference — the source of truth for all content and systems.

Start with Milestone 0: The Screen.

Build:
- index.html with vertical split-screen (top: canvas, bottom: text/UI)
- css/game.css with responsive layout (mobile portrait: 50/50 split; desktop: 60/40)
- js/engine.js with canvas at 320×180, a procedurally drawn Limehouse dusk scene (canal, buildings, sky gradient), and a basic game loop
- js/ui.js with text panel showing "Narrow Street. The canal is ahead." and a "Look around" button (NOTE: this button is a Milestone 0 scaffold — remove it by Milestone 3 when the canvas tap-to-discover mechanic replaces it)
- Title screen: "Trace" title, the Limehouse scene, procedural theme melody, "Begin" button

Generate all art and audio procedurally — no external asset files needed for this milestone. Keep it simple. This is the foundation.

After completing Milestone 0, summarize what you built, note any design decisions you made, and proceed to Milestone 1 (Movement) unless I say otherwise.

If you're missing any game-bible files you need, tell me which ones to upload.
```

---

# PART 11: AFTER MILESTONE 0

The milestones after the first:

**Milestone 1 (Movement):** Read `A1-world-structure.md` and `B1-physical-london.md`. Implement navigation between flat, L01 (Canal Basin), L02 (Coffee Shop). Canvas redraws per location. Walking thoughts from `B6-walking-thoughts.md` appear during transitions.

**Milestone 2 (NPCs):** Read `A5-B3-npc-system-voices.md` and `B7-dialogue-trees.md`. Implement the Barista at L02 with dialogue through Familiar stage. Build `npcs.json` using the schema from IMPLEMENTATION-ROADMAP.

**Milestone 3 (Noticing):** The critical mechanic. Implement tappable details at locations. No markers. Tap-to-discover. Read locations' `interactableDetails` from the JSON.

**Milestone 4 (Investigation):** Read `A3-investigation-web.md` and `B5-investigation-text.md`. Implement LI-02 (The Barista's Song) as the first complete investigation arc: trigger → 3 steps → choice → 2 consequences.

**Milestone 5 (Full Limehouse):** All 10 locations, all 8 NPCs, all 5 investigation nodes, day/night, rain, fragments, flat objects, the fox, the Watcher background, the Forgetting.

**Milestone 6 (Sound):** Procedural ambient soundscapes, punctuation sounds, the Forgetting silence, the theme.

**Milestone 7 (Polish):** Mobile touch optimization, save hardening, edge cases (what if player hasn't visited in 2 weeks?), neighborhood teasers at Limehouse boundaries, character creation screen.

---

# PART 12: FILE CHECKLIST

Before coding, verify access to all files:

**Must have for MVP:**
- [ ] CLAUDE.md
- [ ] MVP-DEFINITION.md
- [ ] IMPLEMENTATION-ROADMAP.md
- [ ] A1-world-structure.md
- [ ] A2-character-system.md
- [ ] A5-B3-npc-system-voices.md
- [ ] B1-physical-london.md
- [ ] B2-central-mystery.md
- [ ] A3-investigation-web.md
- [ ] A4-progression-metrics.md
- [ ] B2-lore-fragments.md
- [ ] B4-npc-mythological-identities.md
- [ ] B5-investigation-text.md
- [ ] B7-dialogue-trees.md
- [ ] B6-walking-thoughts.md
- [ ] AI-personality-documents.md
- [ ] the-watcher.md

**Reference (useful, not blocking):**
- [ ] A8-ending-system.md
- [ ] B8-ending-text.md
- [ ] A6-world-systems.md
- [ ] A7-autopilot-agents.md
- [ ] coherence-matrix.md
- [ ] EDITORIAL-PASS-REPORT.md
- [ ] GAME-MASTERS-EDITORIAL.md
- [ ] HANDOFF.md

**If any "Must have" file is missing, stop and ask for it.**

---

*This handoff represents the complete output of an extensive design collaboration. Every system, every character, every mystery, every line of dialogue has been designed, written, reviewed, and fixed. The code's job is to make the feeling playable. The feeling is: presence. Paying attention. The bittersweet act of caring about a place that changes whether you're watching or not.*

*Build the screen. Then build the movement. Then build the meeting. Then build the noticing. Then build the choice. Each one a layer of the same thing: a person, arriving in a city, learning to see.*
