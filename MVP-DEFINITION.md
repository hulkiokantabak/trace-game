# MVP DEFINITION

## The Minimum Viable Game That Proves the Core Loop

---

## The One Thing the MVP Must Prove

The core loop — **Explore → Notice → Investigate → Choose → Consequence → Return** — produces the feeling of being a stranger who is becoming a local who is discovering that London has secrets.

If the player feels this in the first 15 minutes, the MVP succeeds. If not, no amount of content will save it.

---

## MVP Scope

### Neighborhood: Limehouse Only
The player's home. The flat is here. The barista is here. The canal is here. Greenwich and Bermondsey exist as visible paths at Limehouse's edges with a gentle message: "More of London is coming." The player's save will carry forward when neighborhoods unlock.

### Trait: The Musician Only
Character creation shows all five silhouettes. Only the Musician is selectable. The other four show "Coming soon." The Musician was chosen because:
- Investigation is tightly coupled to Limehouse (LI-01, LI-02, LI-04)
- Perception mode (hearing) is the most atmospheric and cheapest to render
- The mystery (London as acoustic archive) is immediately evocative — you can HEAR it
- The starting experience (a note from the canal) is a strong first hook

### Locations: All 10 Limehouse Locations

| ID | Name | MVP Content |
|----|------|-------------|
| L01 | The Canal Basin | Full. Ambient. Lore fragment M-F1. Investigation LI-01 begins here. |
| L02 | The Coffee Shop | Full. NPC: Barista. Investigation LI-02 (complete). |
| L03 | St Anne's Churchyard | Full. Investigation LI-04 (2 steps: shadow + night visit). Lore fragment M-F5. |
| L04 | The Warehouse Studio | Full. NPC: Sound Artist. Investigation LI-01 unfolds here. |
| L05 | The Pub — The Grapes | Full. NPC: Pub Landlord. Lore fragment M-F2. Social hub. |
| L06 | The Tattoo Parlour | Full. NPC: Tattoo Artist. LI-03 begins (2 steps: the drawing, the search). |
| L07 | The Lock Gates | Ambient. Discovery details for Musician (mechanism frequency). |
| L08 | The DLR Platform | Full. Investigation LI-08 (quick: impossible departure board). Watcher background appearance. NPC: Bike Courier (passing). |
| L09 | The Night Market | Partial. Ambient. NPC: Nightclub Promoter (surface dialogue only). |
| L10 | The Empty Lot | Ambient. Mysterious. The Night Fox appears here. Teaser for deeper content. |

### NPCs in MVP: 6 Deep + 2 Shallow

**Deep (through Familiar stage):**
1. **The Barista** — primary relationship. All dialogue through Familiar. Musician identity active.
2. **The Sound Artist** — investigation catalyst. Dialogue through Familiar. LI-01 partner.
3. **The Pub Landlord** — social anchor. Dialogue through Acquaintance (Familiar requires Grapes Cellar investigation, post-MVP).
4. **The Tattoo Artist** — danger, perception. Dialogue through Acquaintance. The door drawing initiates LI-03.
5. **The Bike Courier** — information, urgency. Acquaintance. Delivers LI-07 warning fragment.
6. **The Watcher** — background appearances ONLY. Not confrontable. 3 appearances across different locations when Awareness reaches mid-Tier 1.

**Shallow:**
7. **The Night Fox** — appears at L10 and L01 at dusk/night. Behavioral communication. Leads to one hidden detail.
8. **The Street Preacher** — 2 appearances in Limehouse during MVP. Three sentences each. Atmospheric.

### Investigation Nodes: 5

| Node | Type | Status in MVP |
|------|------|--------------|
| LI-01: The Unrecorded Sound | Deep | 4 of ~6 steps. Stops at the sealed building (cliffhanger — the building opens when Greenwich unlocks and the Urban Explorer becomes available). |
| LI-02: The Barista's Song | Deep | Complete. Full investigation with choice and consequence. |
| LI-04: St Anne's After Dark | Deep | 2 steps: discover the impossible shadow, visit at night. Stops before the interior revelation (requires higher Awareness). |
| LI-08: The DLR Anomaly | Quick | Complete. Self-contained. No resolution needed. |
| LI-12: The Watcher Noticed | Deep | Background only. The player notices the figure. Cannot interact. The MVP's final hook. |

### Lore Fragments: 3 of 7 Musician

| Fragment | Location | Awareness Required |
|----------|----------|-------------------|
| M-F1 | L01 (Canal Basin) | Tier 1 |
| M-F2 | L05 (The Grapes) | Tier 1 |
| M-F5 | L03 (St Anne's) | Tier 1 (moved from Tier 2 for MVP accessibility) |

### Systems in MVP

| System | Status | Notes |
|--------|--------|-------|
| The Flat | Full | Objects accumulate from MVP investigations. Notebook. Window. |
| Notebook/Journal | Full | People, Places, Mysteries tabs functional. Lore tab with 3 fragments. Me tab with basic stats. |
| Day/Night Cycle | Full | Real time. 4 periods. Palette shifts. NPC schedules. |
| Weather | Partial | Clear and rain only. Fog, wind, snow added later. |
| NPC Relationships | Partial | Stranger → Acquaintance → Familiar reachable. Confidant and Ally require post-MVP content. |
| Core Stats | Partial | Awareness and Connection visible and advancing. Insight present but slow. |
| Trait Stat | Full | Resonance (Musician). Grows from hearing anomalous sounds, finding fragments. |
| The Forgetting | Simplified | One occurrence per MVP period. 24 hours. Palette desaturation + NPC distance. No mechanical depth yet. |
| Progression Unlocks | Partial | Awareness Tier 1 unlocks implemented. Tier 2 partially (retroactive discovery at visited locations). |
| Save/Load | Full | localStorage. Auto-save on every state change. Manual load on game open. |
| Title Screen | Full | Title, Limehouse at dusk pixel art, theme music, "Begin" button. |

### NOT in MVP

- Greenwich and Bermondsey neighborhoods
- Photographer, Wanderer, Barista, Shopkeeper traits
- AI Living Conversations (infrastructure present but inactive)
- Autopilot and agent system
- Endings (no ending reachable in MVP)
- Seasonal cycle
- City events
- Mythological weather (fixed Restless state)
- Residuum marks and shared world state
- The Watcher confrontation
- Confidant and Mythological Ally NPC stages

---

## MVP Emotional Checkpoints

Each build milestone has an emotional test. If it fails, stop and fix before proceeding.

| Milestone | Test | The Feeling |
|-----------|------|-------------|
| 0: The Screen | Does the split-screen feel like a window into a place? | "Oh. That's a street." |
| 1: Movement | Does walking through Limehouse feel like being somewhere? | "I want to see what's down there." |
| 2: NPCs | Does meeting the Barista feel like meeting a person? | "She remembered me." |
| 3: Noticing | Does tapping a detail feel like the player's own discovery? | "Wait. What was that sound?" |
| 4: Investigation | Does the Barista's Song choice feel like it matters? | "I can't decide. Both options mean something." |
| 5: Full Limehouse | Does the neighborhood feel like home? | "I know this place. I know these people." |
| 6: Sound | Does the audio make the Musician's London feel real? | "I can hear it. The note. It's really there." |
| 7: Polish | Does the player want to come back tomorrow? | "What happens next? When does Greenwich open?" |

---

## MVP End State

The player has:
- Explored all of Limehouse (10 locations)
- Met 6 NPCs and built relationships with 3-4 of them
- Solved 2 investigation nodes completely (LI-02, LI-08)
- Advanced 2 investigation nodes partially (LI-01, LI-04)
- Found 3 lore fragments
- Experienced one Forgetting event
- Noticed the Watcher in the background
- Accumulated 4-6 objects in the flat
- Heard the canal frequency, the barista's song, and the DLR anomaly

And they feel: "I am not alone in this city. Someone is watching. London has secrets. I need to know more."

That feeling is the MVP's product. Everything else is scaffolding.
