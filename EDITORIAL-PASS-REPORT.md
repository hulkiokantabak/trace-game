# EDITORIAL PASS REPORT

## Two Passes: Literary Masters + Game Masters
## All Findings. All Required Fixes.

---

# LITERARY MASTERS' FINDINGS

## BORGES — Architectural Integrity

### CRITICAL: Cross-Reference Mismatch Between Document Versions

The Phase 1 documents (A1, B1) use one set of location names/IDs. The Phase 2 documents (B2 lore fragments, B5 investigation text) reference a DIFFERENT set of names. Specifically:

| ID | A1/B1 Name (Working Files) | Phase 2 Reference | Status |
|----|---------------------------|-------------------|--------|
| G07 | The Church Courtyard | "Bookshop" (B2 fragment placement) | MISMATCH |
| G09 | The Locked Observatory Room | "Thames Foreshore" (B2 M-F fragment) | MISMATCH |
| G10 | The Thames Stairs | "The Pub — The Trafalgar" (B2, B5) | MISMATCH |
| L01 | The Barista's Café | "Canal Basin" (B2 M-F1) | MISMATCH |
| L04 | The Pub with the Wrong Room | "Warehouse Studio" (B2 M-F4) | MISMATCH |
| L05 | The Canal Boat Painter's Mooring | "The Grapes" (B2 M-F2) | MISMATCH |
| L08 | The Lock | "DLR Platform" (B2 M-F6) | MISMATCH |
| L10 | The Basement That Wasn't There | "Empty Lot" (B2, B5, multiple nodes) | MISMATCH |

**Root cause:** A1 and B1 were written in one session with one location scheme. Phase 2 documents were written in a later session referencing a different, more detailed location scheme that included real-world anchors (The Grapes pub, Cutty Sark, etc.).

**FIX REQUIRED:** Reconcile in Claude Code. The Phase 2 location scheme is richer (real London anchors). Recommendation: update A1 and B1 to match the Phase 2 references. This means A1's location table and B1's location bodies both need revision to align with the names used in lore fragments, investigation text, and the investigation web.

### Other Architectural Findings

- ✓ All five mythologies remain internally consistent within their own documents
- ✓ The contradiction map (coherence-matrix.md) correctly identifies all deliberate contradictions
- ✓ No accidental agreement where disagreement was designed
- ⚠ The Watcher document (Phase 3) references the Old Man's bench as the confrontation location, but A3 (investigation web) says "the Watcher chooses the location" — minor inconsistency, resolve by making the bench one of several possible locations
- ✓ All 35 lore fragments connect to at least one NPC identity and one investigation node
- ✓ All 16 deep NPCs have five mythological identities each, all connecting to fragments

---

## VIAN — Economy Violations

### B1: Location Bodies (25-word limit)

**22 of 30 location bodies exceed 25 words.** Average: 33 words. Worst offender: B09 (Old Biscuit Factory) at 46 words.

| Location | Current Words | Action |
|----------|-------------|--------|
| G01 | 24 | ✓ Pass |
| G02 | 22 | ✓ Pass |
| G03 | 24 | ✓ Pass |
| G04 | 30 | CUT 5 words |
| G05 | 24 | ✓ Pass |
| G06 | 33 | CUT 8 words |
| G07 | 29 | CUT 4 words |
| G08 | 28 | CUT 3 words |
| G09 | 22 | ✓ Pass |
| G10 | 29 | CUT 4 words |
| L01 | 27 | CUT 2 words |
| L02 | 35 | CUT 10 words |
| L03 | 33 | CUT 8 words |
| L04 | 33 | CUT 8 words |
| L05 | 30 | CUT 5 words |
| L06 | 31 | CUT 6 words |
| L07 | 33 | CUT 8 words |
| L08 | 26 | CUT 1 word |
| L09 | 33 | CUT 8 words |
| L10 | 39 | CUT 14 words |
| B01-B10 | 32-46 | CUT all to 25 |

**Total cuts required: approximately 150 words across 22 locations.**

### B7: Dialogue (12-word limit)

**27 dialogue lines exceed 12 words.** Most are 13-15 words (minor). Three are severely over:

| Line | Words | Assessment |
|------|-------|-----------|
| Warehouse Guard's seismic sentence | 26 | INTENTIONAL — the one exception. Reduce to 20 max. |
| Barista's Ally line | 22 | CUT to 12. "The name. Almost. Help me listen." |
| Clockmaker Confidant (Shopkeeper) | 18 | CUT to 12. "The shop predates the street. I keep it going." |

The remaining 24 lines over 12 words: most are Confidant reveals at 13-15 words. These are earned moments. Recommendation: **raise the Confidant limit to 15 words** for these specific beats. The 12-word rule applies to all other dialogue. This creates a mechanical signal: when an NPC speaks longer than usual, the player knows something has shifted.

**RULE AMENDMENT: Standard dialogue ≤12 words. Confidant reveals ≤15 words. One seismic moment per NPC ≤20 words.**

### B6: Walking Thoughts (8-word limit)

**19 of ~80 thoughts exceed 8 words.** Most at 9-10 words.

Examples needing trim:
- "The old man's bench is empty. Not yet dusk." (9) → "The old man's bench. Empty. Not dusk." (7)
- "The basin is still. The boats are still. I'm still." (10) → "Basin still. Boats still. I'm still." (6)
- "Bermondsey Street. Old on one side. New on the other." (10) → "Bermondsey Street. Old one side. New the other." (8)
- "I see everything now. The layers. The light. All of it." (11) → "The layers. The light. All of it." (8)
- "Cold hands. The railing by the canal. Metal and frost." (10) → "Cold hands on the canal railing. Frost." (7)

**Total: 19 thoughts need trimming by 1-3 words each.**

### B2: Lore Fragments (60-word limit)
- ✓ All 35 fragments under 60 words
- ✓ All under 4 sentences
- M-F2 is the longest at 49 words — within limits

### Word Budget Compliance Summary
| Element | Limit | Pass | Fail | Fix Effort |
|---------|-------|------|------|-----------|
| Location bodies | 25 | 8 | 22 | Medium — trim each |
| Dialogue | 12 (new: 15 confidant) | ~85% | ~15% | Low — targeted trim |
| Walking thoughts | 8 | 61 | 19 | Low — trim 1-3 words each |
| Lore fragments | 60 | 35 | 0 | None |

---

## CORTÁZAR — Player as Accomplice

- ✓ No text tells the player what to feel. Investigation consequences describe what happens, not what it means.
- ✓ NPC mythological identities remain deniable across all 80 variants. No Confidant line explicitly confirms the identity.
- ⚠ The B5 investigation text for "consequence — wind" (GI-01) says "something has shifted" — this is good (vague) but could be more specific about the PHYSICAL change without naming the mythological cause. Fix: "The glass in the case unclouds. The clockmaker's hands are still for the first time."
- ⚠ The Barista's Ally line in B7 ("help me. Listen to everyone. Tell me what they almost say") is too directive. It tells the player what to DO rather than letting them discover. Fix: "The name. I almost... do you hear it too?"
- ✓ Unreliable elements preserved: the ghost pub (Greenwich), St Anne's geometry (Limehouse), the warehouse that moves (Bermondsey).
- ✓ The five mythologies as experienced by different players create natural unreliability — the game itself is unreliable across playthroughs.

---

## SARAMAGO — The Body

- ✓ All 30 locations have sensory detail (not just visual) — smell, touch, temperature, sound all present.
- ✓ All 16 deep NPCs have physical signatures consistent across B1, B3, B4, and AI personality documents.
- ⚠ The between-spaces in B1 exceed 25 words significantly (37-50 words). These should be treated as a separate category — they're walking sequences, not single-location bodies. **RULE: Between-spaces allowed 50 words.** This is enough for the transitional atmosphere without bloating.
- ⚠ Weather is referenced in B6 walking thoughts and A6 world systems but NOT consistently in B7 dialogue trees. NPCs should have weather-reactive ambient lines. **FIX: Add 1 rain-variant and 1 cold-variant ambient line per deep NPC in B7.** (Not every NPC — priority: Pub Landlord, Barista, Canal Boat Painter, Market Vendor, Warehouse Guard.)
- ✓ The Watcher's physical description is consistent across all documents.
- ✓ The Night Fox has full physical specificity — torn ear, mud, musk.

---

# GAME MASTERS' FINDINGS

## MEIER — Systems Integrity

### Investigation Node Cross-References
- ⚠ A3 references location IDs (G01, L04, etc.) that need to be verified against whichever A1 version is adopted. Currently 8 location name mismatches (see Borges' finding above).
- ✓ All 35 investigation nodes have defined triggers, steps, and consequences.
- ✓ All 5 main storyline threads are walkable from entry to climax.
- ⚠ Investigation node GI-04 (Foreshore Objects) references "G09 (Thames Foreshore)" but working A1 has G09 as "The Locked Observatory Room." Phase 2 A3 ALSO references "G09 (Thames Foreshore)." **This confirms the mismatch is in A1/B1, not in Phase 2/3. The Phase 2/3 references are internally consistent with EACH OTHER.** Resolution: update A1 and B1 to match Phase 2/3.

### Progression Math
- ✓ XP tables in A4 produce reasonable progression curves. Tier 2 at ~20 sessions, Tier 3 at ~50 sessions. At 15-minute average sessions, that's ~12 hours to Tier 3. Appropriate for the game's depth.
- ⚠ Connection XP for AI conversations (1 XP per meaningful exchange) needs a cap. Without a cap, AI-enabled players progress Connection faster than scripted-only players. **FIX: Cap AI conversation XP at 5 per session per NPC.** This equalizes progression regardless of play mode.
- ✓ Title conditions in A4 are achievable but rare. Estimated 8-12 per playthrough is correct.

### Data Architecture
- ✓ The JSON schemas in A1 are minimal and sufficient. District-level files prevent write conflicts.
- ✓ The agent pacing rules in A7 (one session per 3-hour block) prevent content grinding.
- ⚠ The Player Pattern Model in A7 doesn't specify how often it updates. **FIX: Add "Updates after every session. Requires minimum 5 actions to modify a preference weight." to A7.**

---

## METZEN — World Coherence

- ✓ The three neighborhoods feel distinct: Greenwich (time, science, permanence), Limehouse (sound, water, layers), Bermondsey (transformation, art, foundation).
- ✓ The seasonal cycle in A6 produces meaningful variety without requiring new content.
- ⚠ The 20 city events in A6 include trait-specific events (18-20) that are invisible to other traits. This means a Musician might see the "Signal Spike" event while a Shopkeeper playing simultaneously sees nothing special. **This is acceptable** — it reinforces the five-Londons design — but the game should ensure at least one universal event appears between every two trait-specific ones. **FIX: Add a rotation rule to A6: "No more than 2 consecutive trait-specific events. Every third event must be universal (events 1-4, 13-17)."**
- ✓ The Watcher's five identities are distinct across all five mythologies. The Watcher document (Phase 3) is the most architecturally complex character in the game and it holds.

---

## MIYAMOTO — Player Joy

- ✓ The core loop (Explore → Notice → Investigate → Choose → Consequence → Return) is clear and satisfying at every scale.
- ✓ The first-session experience (leave flat, walk, notice, discover) is well-defined in A2.
- ⚠ The flat's object accumulation (A4, 16 objects) doesn't specify visual layout for mobile half-screen. **FIX: Add a note to A4: "Flat objects are placed in a fixed grid — 4 positions on the shelf, 4 on the wall, 4 on the table, 2 on the window ledge, 2 by the bed. Objects appear in order. The grid is visible from session 1 as empty positions that gradually fill."**
- ⚠ The journal notebook (Miyamoto's 5-tab design) isn't specified in A4's experience display section. **FIX: Add tab names to A4: "People | Places | Mysteries | Lore | Me" — where "Me" combines stats, titles, and choices.**
- ✓ Sound design in A6 (ambient per district, punctuation sounds, theme at start and end only) is clean and buildable.

---

## UEDA — Emotional Truth

- ✓ The emotional arc (stranger → local → someone who sees → someone who must choose) is preserved across all documents.
- ✓ The endings are all farewells, not victories or failures.
- ✓ The Watcher embodies the game's central tension: should you keep paying attention?
- ⚠ The autopilot system (A7) risks making the game feel like a screensaver if the observation interface isn't emotionally engaging. The text feed must feel like reading a story, not watching a log. **FIX: Add a note to A7: "Autopilot text feed uses the same prose quality as walking thoughts and investigation text. Not 'You walked to X.' Instead: 'The canal at dusk. She went to the basin. The water was still.' The autopilot narration is literary, not functional."**
- ✓ The game's silence (between discoveries, during Still Tides, the flat at night) is protected. No document fills the silence with unnecessary content.

---

# SUMMARY OF ALL REQUIRED FIXES

## Priority 1: Critical (Must Fix Before Claude Code)

| # | Issue | Documents | Fix |
|---|-------|-----------|-----|
| 1 | A1/B1 location names don't match Phase 2/3 references | A1, B1 | Update A1 location table and B1 location bodies to use Phase 2/3 naming scheme. The Phase 2 names are richer (real London anchors like The Grapes, Bookshop, etc.). |
| 2 | B1 location bodies exceed 25-word limit (22 of 30) | B1 | Trim all to ≤25 words. Cut approximately 150 words total. |
| 3 | AI conversation XP needs cap | A4 | Add: "AI conversation Connection XP capped at 5 per NPC per session." |

## Priority 2: Important (Fix in First Claude Code Session)

| # | Issue | Documents | Fix |
|---|-------|-----------|-----|
| 4 | B7 dialogue lines over 12 words (27 lines) | B7 | Amend rule: standard ≤12, Confidant ≤15, one seismic ≤20. Trim remaining violators. |
| 5 | B6 walking thoughts over 8 words (19 lines) | B6 | Trim each by 1-3 words. |
| 6 | Weather-reactive NPC lines missing | B7 | Add rain/cold ambient variants for 5 key NPCs. |
| 7 | City event rotation rule | A6 | Add: "Every third event must be universal." |
| 8 | Flat object grid layout | A4 | Add visual grid specification. |
| 9 | Journal tab names | A4 | Add: "People, Places, Mysteries, Lore, Me." |
| 10 | Autopilot narration quality note | A7 | Add: literary prose for autopilot feed, not functional logging. |
| 11 | Pattern model update frequency | A7 | Add: "Updates after every session. Min 5 actions to shift a weight." |

## Priority 3: Minor (Address During Development)

| # | Issue | Documents | Fix |
|---|-------|-----------|-----|
| 12 | Watcher confrontation location specificity | A3 vs Watcher doc | Resolve: bench is one option, Watcher chooses from 3 possible locations. |
| 13 | Barista Ally line too directive | B7 | Rewrite: "The name. I almost... do you hear it too?" |
| 14 | GI-01 wind consequence too vague | B5 | Rewrite with physical specificity. |
| 15 | Between-space word limit | B1 | Formalize: between-spaces allowed 50 words (separate from location 25-word limit). |

---

## BOTH PANELS' FINAL NOTE

**Borges:** The architecture is sound. The five mythologies cohere. The contradiction map holds. The cross-reference mismatch (Priority 1, Fix #1) is a production error, not a design error — the structure is correct, the labels need reconciling.

**Vian:** The text is approximately 15% over budget across B1, B7, and B6. Cutting it will make it stronger. The Confidant exception (15 words) is earned — those moments justify the extra breath.

**Cortázar:** The player is an accomplice throughout. No text explains what should be discovered. The five-mythology structure ensures the game is unreliable at the deepest level — different players experience different ontological realities. This is the game's greatest literary achievement.

**Saramago:** The body is present. Every location has temperature, texture, smell. Every NPC has hands. The weather touches the city. The between-spaces have physical reality. Fix the word counts, but do not cut the body to save the budget. Cut adjectives. Keep the senses.

**Meier:** The systems work. The progression math is sound. The data architecture is minimal and sufficient. Fix the XP cap and the event rotation rule, and the game is mechanically ready to prototype.

**Metzen:** The world coheres. Five Londons on one map. The neighborhoods are distinct. The mythology is layered. The NPCs are people. Fix the naming mismatch and this world is ready to inhabit.

**Miyamoto:** The feel is right. Walk, notice, discover. Mobile-friendly. The flat is a warm return point. The journal needs its tab names. The object grid needs its layout. Small fixes. The joy is there.

**Ueda:** The emotional truth holds. Presence. Attention. The bittersweet act of caring about a place that changes. The endings are farewells. The silence is protected. The game is ready for the hands that will build it.

---

*Implementation recommendation: Apply Fix #1 (location reconciliation) as the first task in Claude Code. All other fixes can be applied incrementally during development. The game bible is structurally complete and narratively coherent. It needs polishing, not redesign.*
