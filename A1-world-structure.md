# A1: WORLD STRUCTURE DOCUMENT (CORRECTED)

## Reconciled with Phase 2/3 location references. All IDs now consistent across all 19 documents.

---

## The Three Neighborhoods

**GREENWICH** — Old, maritime, scientific. Royal Observatory, Meridian Line, the Thames at its widest. Time is the neighborhood's element. Architecture spans centuries. The mythology here is temporal.

**LIMEHOUSE** — Docklands history, canal culture, Hawksmoor's St Anne's Church. Narrow streets between warehouse conversions. Memory of the docks — opium legends, sailor stories. The mythology here is auditory.

**BERMONDSEY** — Working-class roots mid-metamorphosis. Railway arches becoming studios. Antiques market Fridays. Bermondsey Street's tension between old and new. The mythology here is physical — matter transforms.

---

## Location Registry

### GREENWICH — 10 Locations

| ID | Name | Real Anchor | Type | Time-Gated | Trait-Gated |
|----|------|-------------|------|------------|-------------|
| G01 | The Clockmaker's Shop | Turnpin Lane area | Interior, NPC hub | Closed Sundays, closes 5pm | None (universal) |
| G02 | The Observatory Terrace | Royal Observatory grounds | Exterior, elevated | Daytime; night content at high Awareness | Photographer (light anomalies) |
| G03 | The Bench by St Alfege | St Alfege Church grounds | Exterior | NPC present dusk only | None |
| G04 | Greenwich Foot Tunnel | Island Gardens entrance | Interior, passage | Always open; midnight: longer | Wanderer (pull strongest) |
| G05 | The Covered Market | Greenwich Market | Exterior/Interior | Weekends busiest | Barista (vendor connections) |
| G06 | The Naval College Courtyard | Old Royal Naval College | Exterior, grand | Daytime | Photographer (window reflections) |
| G07 | The Bookshop | Nelson Road area | Interior, quiet | Standard hours | Listener (hears pages in empty aisles) |
| G08 | The Park Path — Up the Hill | Greenwich Park ascending | Exterior, nature | Different by season | Shopkeeper (oldest trees) |
| G09 | The Thames Foreshore | Cutty Sark area riverbank | Exterior, tidal | Low tide only | Photographer/Seeker (objects in mud) |
| G10 | The Pub — The Trafalgar | Trafalgar Tavern, Park Row | Interior, social | Evening differs from day | None (universal social hub) |

### LIMEHOUSE — 10 Locations

| ID | Name | Real Anchor | Type | Time-Gated | Trait-Gated |
|----|------|-------------|------|------------|-------------|
| L01 | The Canal Basin | Limehouse Basin | Exterior, waterfront | Day/night/fog variants | Listener (sounds from water) |
| L02 | The Coffee Shop | Narrow Street, canal-facing | Interior, warm | Morning: barista present | None (universal) |
| L03 | St Anne's Churchyard | St Anne's Limehouse (Hawksmoor) | Exterior, unsettling | Night dramatically different | Wanderer (emotional charge), Shopkeeper (age) |
| L04 | The Warehouse Studio | Narrow Street area, converted | Interior, creative | Irregular hours | Musician (resonance), Photographer (light) |
| L05 | The Pub — The Grapes | The Grapes, Narrow Street | Interior, historic | Evening best | None (universal) |
| L06 | The Tattoo Parlour | Railway arch, Commercial Road | Interior, intimate | Afternoon-evening | Photographer (sees tattoos differently) |
| L07 | The Lock Gates | Regent's Canal entrance to basin | Exterior, mechanical | Different by tide | Shopkeeper (gates unchanged 200 years) |
| L08 | The DLR Platform | Limehouse DLR station | Exterior, transit | Rush hour vs quiet | Barista (commuter patterns) |
| L09 | The Night Market | Informal street market | Exterior, chaotic | Fri-Sat evening only | Trait-dependent stock |
| L10 | The Empty Lot | Between buildings, Limehouse | Exterior, abandoned | Always; requires high Awareness to notice | Wanderer (the lot pulls), Shopkeeper (something was here) |

### BERMONDSEY — 10 Locations

| ID | Name | Real Anchor | Type | Time-Gated | Trait-Gated |
|----|------|-------------|------|------------|-------------|
| B01 | The Antiques Market | Bermondsey Square | Exterior, busy | Fridays only (dawn best) | Shopkeeper (object histories), Barista (vendor web) |
| B02 | The Gallery | White Cube area, Bermondsey Street | Interior, curated | Standard gallery hours | Photographer (sees art differently) |
| B03 | The Railway Arch Workshop | Bermondsey arches | Interior, industrial | Daytime work hours | Musician (acoustics), Shopkeeper (tools) |
| B04 | The Warehouse — Night | Rotherhithe edge | Interior, dark | Night only; Awareness Tier 2 | All traits — different experiences |
| B05 | The Thames Path — Rotherhithe | River path, Bermondsey to Rotherhithe | Exterior, open | Different by tide/weather | Wanderer (river's charge), Listener (water speaks) |
| B06 | The Co-Working Space | Bermondsey Street area | Interior, modern | Weekday business hours | Barista (everyone connected), Weaver (network visible) |
| B07 | The Old Church — St Mary Magdalen | St Mary Magdalen, Bermondsey | Interior/Exterior, ancient | Limited hours | Shopkeeper (oldest structure, since 1290) |
| B08 | The Rooftop | Above railway arch area | Exterior, hidden | Investigation-locked | Requires Connection threshold |
| B09 | The Street Corner — Long Lane | Long Lane / Bermondsey Street | Exterior, ordinary | Rush hour vs quiet | None — the most ordinary place in the game |
| B10 | The Vinyl Shop | Bermondsey Street | Interior, curated | Standard hours | Musician (impossible recordings) |

---

## The Player's Flat

**Location:** Limehouse, above a shop on Narrow Street. One room, window showing rooftops and a sliver of basin water, table with notebook, door. Accumulates objects from the journey. Always accessible. No cooldown.

---

## Between-Spaces

**Greenwich → Limehouse:** Thames Path northward and Limehouse Cut canal. ~2.5 km. Industrial, waterside, narrowing.
**Limehouse → Bermondsey:** Rotherhithe Tunnel or Shadwell-Bermondsey overground arc. Tunnel: underground, echoing.
**Bermondsey → Greenwich:** South bank Thames Path through Deptford. Longest walk. Widest views. Most sky.

---

## Time, Weather, Seasons

**Time:** Real time in player's timezone. Morning/afternoon/evening/night — distinct palette, NPC schedules, content.
**Weather:** Semi-random 6-8 hour periods. Clear, overcast, rain, fog, wind. Affects palette, sound, NPC locations, discoveries.
**Seasons:** One real month per game season. Affects palette, NPC dialogue, seasonal events, location transformations.

---

## World-Level Systems Summary

**District Warmth:** Aggregate player+agent visits per district per week. Affects palette vividness, NPC talkativeness, mythology visibility.
**Dreaming Index:** Global activity total. Modifies mythological weather intensity.
**Mythological Weather:** Four states cycling independently — Restless, Deep, Bright (rare), Still (precedes Forgetting).
**The Forgetting:** ~Weekly, unpredictable 1-2 day window. Mythological layer goes quiet. NPCs slightly distant.
**City Events:** Rotation pool, one active, 3-5 days each, every 2-3 weeks. Every third event universal (not trait-specific).
**Residuum Marks:** Trait-linked symbols at locations. Counter per trait per location.

---

## Data Architecture

### Screen Layout

**Mobile (primary platform):**
- Top half: pixel art world — the player's character, location, ambient life, weather, time. This is the window into London. Tap here to move and notice details. Expands for cinematic moments (arriving at a new location, mythological events).
- Bottom half: text and UI — NPC dialogue, notebook, character stats, choice prompts. Contextual: shows what's relevant. Walking: minimal (a thought). Talking: dialogue and options. Investigating: clues and notebook. In the flat: full journal and stats. Expands for deep conversations.
- The split is fluid — gentle animation between states, never jarring.

**Desktop:**
- Side by side — pixel art left, text/UI right. Both larger. More room for both.

**Autopilot observation:**
- Same split. Pixel art shows the character moving autonomously. Text panel becomes a live narrative feed. Player can tap to resume control at any time — transition is instant.

```
world-state/
  greenwich.json
  limehouse.json
  bermondsey.json
  london.json       — global: dreaming index, mythological weather, season, event, warmth, milestones
  agents/
    [agent-id].json
```

District-level files. SHA-based optimistic concurrency via GitHub API. Estimated 3-5 writes per player session.
