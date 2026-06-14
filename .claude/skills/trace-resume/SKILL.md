---
name: trace-resume
description: >
  Current-state handoff for Trace, a deployed narrative exploration game. Captures what has
  been built, what was changed in recent sessions, undocumented implementation decisions,
  content schema extensions, known gaps, and the genesis prompt for resuming development.
  Load this at the start of any new session continuing Trace development.
---

# Trace — Development Handoff

## What This Is

**Trace** is a solo narrative exploration game set in present-day East London (Limehouse, Greenwich, Bermondsey). The player moves to Limehouse, notices things others can't, builds NPC relationships, follows investigation threads that reveal a mythological layer beneath everyday London.

**Live:** https://hulkiokantabak.github.io/trace-game/
**Repo:** GitHub Pages, static files, master branch deploys directly.
**Commit:** depth-completion pass (this session) on top of `30871e7` — Greenwich/Bermondsey unlocked, all 15 endings reachable, confidant tier added

---

## Project State: What Is Built

The MVP is feature-complete and deployed. All 7 build milestones are done:

| Milestone | Status |
|-----------|--------|
| 0 — Screen (split-screen layout, canvas, title) | Complete |
| 1 — Movement (navigation, 10 locations, walking thoughts) | Complete |
| 2 — NPCs (8 NPCs, relationship system, NPC memory) | Complete |
| 3 — Noticing (tap-to-discover, no markers, trait/awareness gating) | Complete |
| 4 — Investigation (5 nodes: LI-01, LI-02, LI-04, LI-08, LI-12) | Complete |
| 5 — Full Limehouse (all locations, fragments, The Forgetting, the Watcher) | Complete |
| 6 — Sound (Web Audio API procedural ambient, punctuation sounds) | Built, then removed — audio killed in `9b47e91` |
| 7 — Polish (mobile touch, save hardening, Settings/AI config screen) | Complete |

### The April 7-8 Expansion Wave

Thirteen commits after `9cf39a0` took the game well past the Limehouse MVP:

- **Endings system** (`9bcd345`): `showLeaveSequence` rewritten to the full 5-step A8 design (decision screen, flashback montage with B8 captions, NPC farewell, last flat, departure title card); flashback moment tracking in `js/state.js`; dialogue depth for Bike Courier, Pub Landlord, Tattoo Artist; Watcher graduated opacity by awareness.
- **Audio killed** (`9b47e91`): Web Audio API initialization disabled — see Milestone 6 above.
- **Greenwich neighbourhood** (`610338c`): 10 locations (G01-G10), 5 NPCs (clockmaker, old_man, observatory_keeper, data_scientist, market_vendor), 10 fragments, 2 investigation nodes, full pixel-art scenes.
- **Bermondsey expansion** (`23d30b8`): 10 locations (B01-B10), 4 NPCs (antiques_vendor, gallery_owner, urban_explorer, warehouse_guard), 10 fragments, 2 investigations.
- **Content wave** (`f619f91`): 5 more NPCs (watcher, delivery_driver, ai_researcher, night_fox, child_who_draws), 28 new investigation nodes (9 → 37 total, including 3 cross-neighbourhood XN climax nodes), 15 event endings (3 per trait — `EVENT_ENDINGS` + `showEventEnding()` in `js/ui.js`, unlocked via `eventEndingUnlocked` consequence fields), LOC_MEMORIES extended to all 31 locations.
- **AI personality documents for 14 NPCs** (`f55ef4d`): Greenwich, Bermondsey, and shallow NPCs added to `NPC_PERSONALITIES` in `js/ai.js` — all 22 NPCs now covered.
- **Seasons, mythological tides, city events** (`a2a5734`): 4 tides with seasonal weighting, 20 city events — config in `content/config.json`, logic in `js/game.js`.
- Plus fix passes: `7a28905`, `03f24a7`, `86829a1`, `6356062`.

Current totals: 31 locations (30 + flat), 22 NPCs (17 with a confidant tier), 37 investigation nodes, 35 lore fragments, 15 event endings. Greenwich/Bermondsey now have ~7-9 noticing details per location and Limehouse-parity walking-thought pools.

### Content Inventory

| File | Lines | State |
|------|-------|-------|
| `js/engine.js` | 3330 | Complete — canvas renderer, game loop, pixel art for all 31 locations (audio code present but disabled) |
| `js/state.js` | 243 | Complete — localStorage save/load, XP, stat progression, NPC memory, flashback moments |
| `js/game.js` | 580 | Complete — navigation, NPC scheduling, investigation logic, time/weather, seasons/tides/city events |
| `js/ui.js` | 1705 | Complete — all DOM: dialogue, notebook, flat view, choices, character creation, endings |
| `js/ai.js` | 509 | Present, inactive — API adapter scaffold + personality data for all 22 NPCs |
| `content/locations.json` | 5603 | Complete — 30 locations + flat, all content fields populated |
| `content/npcs.json` | 3063 | Complete — 22 NPCs across the three neighbourhoods |
| `content/investigations.json` | 2488 | Complete — 37 nodes (13 LI, 10 GI, 11 BI, 3 XN) |
| `content/fragments.json` | ~315 | Complete — 35 DISTINCT lore fragments (keys were de-duplicated this session; was silently 28 due to 7 colliding keys) |
| `content/thoughts.json` | 232 | Complete — walking thoughts: neutral + all 5 traits + time + weather + flat leaving/returning |
| `content/config.json` | 259 | Complete — time palettes, weather, forgetting, XP values, NPC thresholds, tides, 20 city events |

**Game-bible documents are in the root directory** (not in a `game-bible/` subfolder). All `.md` files except `CLAUDE.md`, `README.md`, `HANDOFF.md` are design reference.

---

## This Session — Audit, parallel-work reconciliation, depth completion

Three advisory panels (Game Design Masters, Literary Masters, Game Design Experts) + a
read-only recon swarm drove a full audit and a depth-completion pass, pushed across several
commits on top of the remote engine rebuild (`30871e7`, which unlocked all 30 locations,
placed the 5 roaming NPCs, added 7 investigation details, and added `settleInvestigation`).

**Undocumented implementation decisions a new session MUST know:**

- **Fragment keys are unique again.** `fragments.json` had 7 duplicate keys (P-F1/2/3,
  W-F2/3, S-F1/2) that collapsed 35 authored fragments to 28 at `JSON.parse`, silently
  dropping the Limehouse photographer/wanderer/shopkeeper fragments. The Greenwich/Bermondsey
  twins were renamed (P-F4/6/8, W-F5/8, S-F4/7). **35 distinct fragments now.**
- **Choiceless investigations award their top-level `flatObject`** via
  `completeChoicelessInvestigation()` (game.js); `settleInvestigation` previously completed
  them without granting the object (LI-05, LI-13, GI-04/08, BI-05/08/09/11).
- **One capped atmosphere line per visit.** `showLocation` (ui.js) selects a single optional
  atmospheric line by priority (rare encounter > first-visit impression > city event >
  permanent presence > tide > ambient life) instead of stacking them. Mythological-layer
  lines (tide, city events) are suppressed in interior locations and the flat. `bodySensation`
  and world-state scars are shown separately.
- **`prefers-reduced-motion`** skips the JS typewriter reveal (ui.js); CSS already covered the
  animations.
- **`confidant` is the deepest relationship tier.** Trigger convention:
  `{ visitCount: 14, acrossDays: true }`. Implemented for the **17 deep NPCs only** (NOT
  street_preacher / watcher / child_who_draws / delivery_driver / night_fox). `getNpcStage`
  (game.js) includes 'confidant'; it downgrades to acquaintance during The Forgetting;
  `getBestFarewell` (ui.js) ranks it highest. Every confidant line ≤ that NPC's
  `maxDialogueWords`.
- **Tap detection returns the SMALLEST matching hitbox** (`checkDetailAt`, game.js), so a
  precise detail is never shadowed by a large whole-scene one that overlaps the tap — needed
  now that G/B locations pack ~7-9 details each.
- **XN-03 (the Watcher's Confrontation) awareness gate lowered 10 → 8**, matching XN-01/XN-02,
  so the 4 endings it gates (M-END-2, P-END-1/2, S-END-2) aren't all behind the single
  hardest node.
- **AI Claude model list refreshed** to `claude-sonnet-4-6` (default),
  `claude-haiku-4-5-20251001`, `claude-sonnet-4-20250514`; AI settings now states the
  plaintext-key storage risk in plain language.
- **The B05/B09 crash:** `sceneRotherhithePath` and `sceneStreetCorner` read `_weather` (a
  `Game`-IIFE local invisible to the `Engine` closure) → ReferenceError every frame. Fixed by
  removing the two redundant scene-local rain blocks (rain is drawn globally via `_raining`).

**Content depth completed:** confidant tier (17 NPCs), Greenwich/Bermondsey walking-thought
pools brought to Limehouse parity (neutral 14, each trait 10), **+60 noticing details** across
G/B (each location now ≥7), the 7 investigation details made visible (2 hitboxes realigned to
existing art, 4 minimal cues drawn, G05 vendor sprite branched), and ALL text re-cut to the
locked budgets (NPC dialogue ≤ maxDialogueWords, walking thoughts ≤8 words, fragments
≤4 sentences / ≤60 words). Zero budget violations game-wide.

**Known remaining (design decisions, not bugs):** the deliberately-minimal special NPCs have
no confidant tier by design; the 2 largest whole-scene details (arch_echo B03,
river_surface_slow B05) yield their centre to a smaller overlapping detail but stay tappable
elsewhere; G/B detail density is ~7-9/location vs Limehouse's ~12 (a meaningful uplift, not
mechanical parity — by design, per Ueda's "don't fill silence").

---

## What Changed: Last Two Sessions

### Session A — Game Masters + Literary Masters Joint Panel (11 Fixes)

A four-round structured panel debate produced 11 specific fixes across 3 tiers of priority. All were implemented.

**Tier 1 — Immersion breaks (immediate):**

1. **Location-specific passing voices** (`js/ui.js`): Replaced a location-agnostic `passingVoices` array that was showing "a woman with a dog" inside the flat. Now a `PASSING_VOICES` object keyed by location ID. Interior locations (flat, L02, L04, L06) map to `null` — silence. Each outdoor location has a specific contextual line.

2. **Physical signature before dialogue** (`js/ui.js`, `showDialogue()`): The NPC's physical signature fragment now renders before the spoken line (Saramago: body before words). Order: name → signature → dialogue.

3. **Walking thought timing** (`js/engine.js`): Reduced from 4s total lifecycle to 1.2s (fade-in 0.2s, hold to 0.9s, gone at 1.2s). Position moved from canvas center to bottom edge (`H-10`). Clears before the scene becomes interactive.

4. **Character creation text** (`js/ui.js`): Changed "Five things on the table." to "Something on the table catches it." to match the actual pixel art objects visible on the flat table.

**Tier 2 — Structural failures (session-breaking):**

5. **First-session NPC grace flag** (`js/game.js`, `getNpcsAtLocation()`): NPCs use real-world clock scheduling (e.g., barista only available morning/afternoon Mon-Sat). On first session, all NPCs could be off-schedule simultaneously. Fix: if `npcMemory` is entirely empty (no NPC ever met), one NPC per location gets a grace override that ignores their schedule. Self-disabling: once any NPC is ever met, grace never fires again.

6. **Guaranteed ungated discovery per location** (`content/locations.json`): L04 (Warehouse Studio) had no neutral, awareness-0 discovery. Added `studio_door_tape`: masking tape on the door frame, four words in marker: "NO PHONES NO CLOCKS...".

7. **Tenant note visible position** (`content/locations.json` + `js/engine.js`): `flat_tenant_note` hitbox moved from `{x:30,y:145,w:15,h:10}` (under radiator, off-canvas) to `{x:3,y:98,w:8,h:12}` (door frame). A note is rendered in the door frame in pixel art when not yet discovered.

8. **Trait objects as real pixel art** (`js/ui.js` + `js/engine.js`): Five trait objects on the flat table were 8×6 pixel blobs at 15-45% opacity — invisible. Replaced with `_drawTraitObject()` function drawing recognisable pixel-art objects: guitar pick (teardrop, amber), lens cap (circle with ring, blue), shoelace (lace with eyelets, tan), coffee cup (cup+saucer, cream/brown), brass key (bow+shaft+bits, gold). Pulse changed from 0.3+0.15sin to 0.75+0.25sin (clearly visible).

**Tier 3 — Content depth (meaning layer):**

9. **Body sensations** (`content/locations.json`): New field `bodySensation` added to all 11 locations. Always shown when not in The Forgetting. Physical grounding per Saramago. Example: flat = "The radiator clicks twice before heat arrives. The building takes its time."

10. **Permanent presences** (`content/locations.json`): New field `permanentPresence` added to all 11 locations. Shown on return visits only. The thing that is always there. Example: flat = "The lamp on the table. Always on when you return."

11. **Mythological impressions** (`content/locations.json`): New field `mythologicalImpression` added to all 11 locations. Shown on first visit only, italicised at 70% opacity. Example: flat = "Someone was here before you. The room holds the shape of their absence."

---

## Undocumented Implementation Decisions

These decisions were made during implementation and are **not in CLAUDE.md, HANDOFF.md, or any game-bible document.** A new session must know them.

### js/game.js

**First-session grace flag** (around line 190):
```js
const allNpcMem = State.get('npcMemory') || {};
const anyNpcEverMet = Object.values(allNpcMem).some(m => m && m.visitCount > 0);
const graceActive = !anyNpcEverMet;
```
Within a grace-eligible session, only ONE NPC gets the override per location (a `graceUsed` flag tracks this). This prevents grace from making the NPC system feel inconsistent.

**NPC scheduling uses real `new Date()`** — the time-of-day is the player's actual wall clock, not a simulated in-game time. This is correct (Locked decision: no hard cooldowns, pacing is narrative) but means a player who always plays at night will consistently see night-scheduled NPCs and miss morning ones until they play at different times.

### js/ui.js

**`PASSING_VOICES` object** (near top of file):
```js
const PASSING_VOICES = {
  L01: 'Someone passes on the towpath. They nod.',
  L02: null,  // interior — silence
  L03: 'Wind moves through the grass between the graves.',
  // ... etc
  flat: null
};
```
This replaces the old random `passingVoices` array. If a location ID is missing from the object, it falls through to no ambient line (safe default).

**NPC physical signature selection**: A signature string like "Blows on coffee even when it's not hot. Tucks hair behind left ear when uncertain. Fingertips rough from espresso heat." is split on `. ` and one fragment is selected at random. This means each visit shows a different physical detail.

**Walking thought threshold** (`showLocation()` call): Uses 1400ms timeout (was 1800ms) before switching from walking-thought mode to interactive location mode.

### js/engine.js

**Walking thought lifecycle**: `age` accumulates × delta-time. Fade-in: `age / 0.2`. Fade-out starts at 0.9s. Clears at 1.2s. Rendered at `H - 10` (canvas bottom edge).

**Tenant note render**: Drawn at `{x:4,y:100,w:6,h:8}` in door frame when `flat_tenant_note` not yet discovered:
```js
if (!State.isDiscovered('flat_tenant_note')) {
  ctx.fillStyle = '#e8d8b0';
  ctx.fillRect(4, 100, 6, 8);
  ctx.fillStyle = '#c8b890';
  ctx.fillRect(5, 101, 4, 1); // fold line
}
```

**Trait object hitboxes** (character creation screen, `ui.js`):
```js
{ trait: 'musician',     x: 122, y: 102, w: 12, h: 14 }
{ trait: 'photographer', x: 135, y: 101, w: 13, h: 14 }
{ trait: 'wanderer',     x: 149, y: 103, w: 14, h: 9  }
{ trait: 'barista',      x: 163, y: 102, w: 13, h: 14 }
{ trait: 'shopkeeper',   x: 152, y: 113, w: 15, h: 12 }
```
These must match the `_drawTraitObject()` render positions in `engine.js`. If either is changed, both must change together.

### content/locations.json — New Fields (Schema Extension)

Three fields added to all locations, not in the IMPLEMENTATION-ROADMAP.md schema:

| Field | When Shown | Purpose |
|-------|-----------|---------|
| `bodySensation` | Always (except during Forgetting) | Physical grounding. What the body registers. |
| `permanentPresence` | Return visits only (not first visit) | The thing that is always there. Continuity. |
| `mythologicalImpression` | First visit only | Italicised, 0.7 opacity. The mythological layer's first whisper. |

Rendered in `ui.js` `showLocation()` after the main body text block:
```js
if (loc.bodySensation && !forgetting) { /* always */ }
if (isFirstVisit && loc.mythologicalImpression && !forgetting) { /* first visit */ }
if (!isFirstVisit && loc.permanentPresence && !forgetting) { /* return visits */ }
```

---

## Known Gaps / Open Work

### Content

- **npcs.json**: The Pub Landlord, Tattoo Artist, Bike Courier likely have thinner dialogue trees than the Barista. They exist and are playable but may feel sparse at Familiar stage.
- **The Watcher**: LI-12 is implemented (trigger: awareness ≥ 5 + 3 visits to L01), but the background canvas render of the Watcher figure may need visual weight — needs play-testing.
- **All 5 traits are selectable** (not just Musician as originally planned for MVP). All trait-specific content (fragments, dialogue lines, walking thoughts) is populated. This was an earlier design decision to open all traits.

### Systems

- **AI layer** (`js/ai.js`): Present but inactive. Settings screen exists with API key input. The Living Conversations system is complete in design (`AI-personality-documents.md`) but wiring to actual API calls is post-MVP.
- **Autopilot** (`A7-autopilot-agents.md`): Not implemented. Post-MVP.
- **Endings** (`A8-ending-system.md`): Implemented — Leave London 5-step sequence (`9bcd345`) plus 15 event endings, 3 per trait (`f619f91`). See `showLeaveSequence`, `EVENT_ENDINGS`, `showEventEnding()` in `js/ui.js`.
- **Greenwich / Bermondsey**: Shipped — G01-G10 (`610338c`) and B01-B10 (`23d30b8`) are live and reachable.
- **Forgetting depth**: The Forgetting desaturates the canvas palette and shifts NPC behavior. May need more playtesting at the edges of its cycle.

### Technical

- **`preview_screenshot` consistently times out** in this development environment — use `preview_eval` + `preview_console_logs` to verify DOM changes instead of screenshots.
- **`preview_snapshot`** is reliable and gives clean accessibility tree output — prefer this for verifying text content and DOM structure.
- **Audio**: Removed — `Engine.audio.init()` returns early and `_ctx` stays null (`9b47e91`, "Kill audio"). The audio code remains in `js/engine.js` but never initializes.

---

## File Navigation Quick Reference

When working on specific systems, read these files:

| Task | Primary Files |
|------|--------------|
| Canvas / pixel art / location rendering | `js/engine.js` |
| NPC dialogue, location text, UI panels | `js/ui.js` |
| Navigation, NPC scheduling, time/weather | `js/game.js` |
| Save/load, XP, progression, stat gates | `js/state.js` |
| Location content, discoveries, new fields | `content/locations.json` |
| NPC dialogue trees, schedules, stages | `content/npcs.json` |
| Investigation nodes, triggers, choices | `content/investigations.json` |
| Walking thoughts by trait/time/weather | `content/thoughts.json` |
| Game constants, XP values, thresholds | `content/config.json` |
| NPC system design, relationship stages | `A5-B3-npc-system-voices.md` (root) |
| Investigation node design, triggers | `A3-investigation-web.md` (root) |
| All NPC dialogue source text | `B7-dialogue-trees.md` (root) |
| Physical signatures, location sensory | `B1-physical-london.md` (root) |
| Lore fragment source text | `B2-lore-fragments.md` (root) |

**Game-bible documents are all in the repository root** — not in a subdirectory.

---

## The Advisory Panels

Two skills are available for design consultation:

**Game Design Masters** (trigger: "the game masters" / "the design masters"):
Meier (systems/emergence), Metzen (world/lore), Miyamoto (player feel), Ueda (emotional truth — orchestrator).
Skill: `.claude/skills/game-design-masters/SKILL.md`
Also at: `Game Masters Skill/SKILL.md` (root copy)

**Literary Masters** (trigger: "the masters" / "call the masters"):
Borges (architecture), Vian (economy), Cortázar (player as accomplice), Saramago (body — orchestrator).
Skill: `.claude/skills/four-masters/SKILL.md`

Use **Code Consult mode** for implementation decisions (1-sentence per master, Ueda synthesizes in 2 sentences). Use **Full Review mode** for design questions and new feature assessment.

---

## Genesis Prompt

Paste this to start a new development session:

```
We're continuing development on Trace — a deployed narrative exploration game.

Live: https://hulkiokantabak.github.io/trace-game/
Repo: hulkiokantabak/trace-game (master branch → GitHub Pages)

Please read in order:
1. CLAUDE.md — tech stack, locked decisions, what not to do
2. .claude/skills/trace-resume/SKILL.md — current build state, recent changes,
   undocumented decisions, schema extensions, known gaps

The game is feature-complete for MVP. All 7 milestones are done. We're in polish,
content, and post-MVP work — not building from scratch.

The game-bible documents (A1-world-structure.md, A5-B3-npc-system-voices.md, etc.)
are in the repository root (not a subdirectory). Read them when needed for specific systems.

After reading, summarize what you understand about the current state, then ask what
we're working on today.
```

---

## Session History Summary

All sessions and what they produced (newest first):

| Session | Commit | Work |
|---------|--------|------|
| April 2026 | `6356062` | Bug fix pass: npc_stage advance triggers, dead guard, gender, null guard |
| April 2026 | `86829a1` | Three content gaps: universal details, Watcher positions, seasonal schedules |
| April 2026 | `a2a5734` | Seasons, mythological tides, and city events system |
| April 2026 | `f55ef4d` | AI personality documents for 14 NPCs (Greenwich, Bermondsey, shallow) |
| April 2026 | `03f24a7` | Bug, wiring, and content-quality fixes across new additions |
| April 2026 | `f619f91` | 5 NPCs, 28 investigation nodes, 15 event endings, extended LOC_MEMORIES |
| April 2026 | `7a28905` | Fix duplicate sceneWarehouse, CSP blocking analytics, pickThought null guard |
| April 2026 | `23d30b8` | Bermondsey expansion: B01-B10, 4 NPCs, 10 fragments, 2 investigations |
| April 2026 | `610338c` | Greenwich neighbourhood: 10 locations, 5 NPCs, 10 fragments, investigations |
| April 2026 | `9b47e91` | Kill audio — disable Web Audio API initialization |
| April 2026 | `9bcd345` | Finish open work: NPC depth, Watcher presence, AI personalities, endings system |
| April 2026 | `5d40a6d` | .nojekyll + README download links for handoff files |
| April 2026 | `7dcb93c` | trace-resume skill added + HANDOFF updated |
| April 2026 | `9cf39a0` | Joint panel: 11 player-experience fixes (panel + session above) |
| Prior | `779c1e7` | README added |
| Prior | `d097581` | GoatCounter analytics |
| Prior | `9f6d779` | Final polish: player experience, bug fixes, editorial, security |
| Prior | `c3877fc` | Game masters round 2: 8 proposals implemented |
| Prior | `9451914` | Game masters round 1: 7 proposals implemented |
| Prior | `8aa1b9c` | Settings screen + AI configuration access |
| Prior | `fd3f9d3` | 31-fix bug pass |
| Prior | `b1c3e59` | Game design masters pass: 12 fixes |
| Prior | `36bf2f8` | Literary masters pass: 12 surgical text edits |
| Prior | `cd5e1f2` | Masters debate round 4: trait identity |
| Prior | `51dbbc0` | All 5 traits unlocked |
| Prior | `36fb7c3` | Masters debate round 3: teaching, transitions, text |
| Prior | `ee261aa` | Bug hunt: cross-reference logic, iOS zoom, tap debounce |
| Prior | `883913d` | Mobile/iPad compatibility: PWA, safe areas |
| Prior | `2925917` | Masters debate round 2: Forgetting depth, deep discoveries |
| Prior | `8defbbc` | Masters consensus: rain-gating, NPC cross-refs, canvas flash |
| Prior | `0a01301` | Ueda pass: subtractive edit |
| Prior | `4783572` | Miyamoto pass: pacing, hierarchy, responsiveness |
| Prior | `53dbd99` | Metzen pass: world breath, scars, whispers |
| Prior | `02444aa` | Meier pass: systems visibility, progression feedback |
| Initial | `55000fe` | MVP prototype: first playable |
