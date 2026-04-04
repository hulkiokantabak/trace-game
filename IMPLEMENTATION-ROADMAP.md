# IMPLEMENTATION ROADMAP

## Technical Architecture + Build Order + Content Schemas

---

## Technical Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Rendering | HTML5 Canvas (pixel art) + DOM (text/UI) | Game is 50% visual, 50% text. Canvas handles pixels. DOM handles interaction. |
| JavaScript | Vanilla JS, no framework | Simple UI (notebook tabs, dialogue, choices). A framework adds build complexity without proportional benefit. |
| Pixel Art | 320×180 native, CSS-scaled, `image-rendering: pixelated` | Classic lo-fi resolution. Sharp at any display size. |
| Lighting | Canvas overlay layers with blend modes | Multiply (shadows), screen (light), soft-light (color temperature). Time-of-day and mythological weather as overlays. |
| Art Style | Minimal/atmospheric for MVP → tileset-based for full game | Prove the loop with simple art. The abstraction supports the mechanic — player's attention fills the detail. |
| Audio | Web Audio API | Three ambient layers + punctuation sounds + theme. Lightweight. |
| State | localStorage (MVP) → IndexedDB (full game) | Abstract the save/load interface so the swap is seamless. |
| Shared State | GitHub API with SHA concurrency (post-MVP) | Mock implementation for MVP. Real implementation drops in via the same interface. |
| AI | Model-agnostic adapter (post-MVP) | Supports Claude, GPT, Gemini, Ollama, OpenRouter. Infrastructure present in MVP, inactive. |
| Deployment | GitHub Pages | Free. Static files. The world-state repo can be the same or separate. |

---

## File Structure (MVP)

```
trace-game/
├── index.html              — single page, split-screen layout
├── css/
│   └── game.css            — responsive split, canvas scaling, notebook styling
├── js/
│   ├── engine.js           — canvas renderer, game loop, input handler, audio manager
│   ├── state.js            — central state, save/load, progression calc, NPC memory
│   ├── game.js             — navigation, investigation logic, NPC interaction, time/weather
│   ├── ui.js               — DOM: dialogue display, notebook tabs, flat view, choices
│   └── ai.js               — AI adapter, personality builder (present, inactive in MVP)
├── content/
│   ├── locations.json      — 10 Limehouse locations with all metadata
│   ├── npcs.json           — 8 NPCs with dialogue trees and identity data
│   ├── investigations.json — 5 investigation nodes with full structure
│   ├── fragments.json      — 3 lore fragments
│   ├── thoughts.json       — walking thoughts pool (Limehouse subset)
│   └── config.json         — game constants: XP values, time thresholds, weather cycles
├── assets/
│   ├── sprites/            — character (5 stages), NPCs (8), interactive details
│   ├── locations/          — 10 location backgrounds (minimal: color gradient + key elements)
│   ├── overlays/           — time-of-day gradients, rain, lighting
│   ├── ui/                 — notebook texture, tab icons, flat objects
│   └── audio/              — ambient loops (3: canal, street, interior), punctuation (4), theme (1)
├── game-bible/             — all design documents (reference, not loaded by game)
├── CLAUDE.md               — project context for Claude Code
└── README.md               — public-facing project description
```

### File Count for MVP
- HTML: 1
- CSS: 1
- JS: 5
- JSON: 6
- Art assets: ~50 sprites + 10 backgrounds + 5 overlays = ~65 image files
- Audio: ~8 files
- **Total files: ~86**

---

## Content JSON Schemas

### locations.json
```json
{
  "L02": {
    "name": "The Coffee Shop",
    "neighborhood": "limehouse",
    "body": "Espresso and steam. The counter is reclaimed wood with a burn mark. One table by the window gets all the morning light.",
    "available": {
      "timeOfDay": ["morning", "afternoon", "evening"],
      "weather": ["clear", "rain"],
      "requiresAwareness": 0
    },
    "adjacentLocations": ["L01", "L03", "flat"],
    "walkingThoughts": {
      "from_L01": ["Espresso smell before the door opens.", "The barista's window. Morning light."],
      "from_L03": ["Church behind me. Coffee ahead. Better.", "The street narrows toward the shop."]
    },
    "interactableDetails": [
      {
        "id": "counter_burn_mark",
        "description": "A burn mark in the wood. Shaped like a quarter note.",
        "trait_required": null,
        "awareness_required": 0,
        "discovery_text": "The burn mark is deep. Someone set something hot down and left it. Years ago.",
        "xp": { "awareness": 1 }
      },
      {
        "id": "chalkboard_menu",
        "description": "The chalkboard menu. The handwriting changes character mid-word.",
        "trait_required": "musician",
        "awareness_required": 1,
        "discovery_text": "The handwriting shifts halfway through 'cappuccino.' Two people? Or one person who isn't always the same person.",
        "xp": { "awareness": 2 }
      }
    ],
    "npcs_present": {
      "barista": { "timeOfDay": ["morning", "afternoon"], "days": ["mon","tue","wed","thu","fri","sat"] }
    },
    "ambientLife": ["steam_from_machine", "cat_on_doorstep", "window_light_shift"],
    "musicLayer": "interior_cafe",
    "weatherEffects": {
      "rain": "Rain streaks on the window. The interior feels warmer by contrast.",
      "clear": "Sunlight through the window makes a rectangle on the floor that moves during your visit."
    }
  }
}
```

### npcs.json
```json
{
  "barista": {
    "id": "barista",
    "name": "The Barista",
    "primaryLocation": "L02",
    "physicalSignature": "Blows on coffee even when it's not hot. Tucks hair behind left ear when uncertain. Fingertips rough from espresso heat.",
    "voiceRule": "Half-sentences that trail off. Silence after is where meaning lives.",
    "maxDialogueWords": 12,
    "schedule": {
      "available": { "timeOfDay": ["morning", "afternoon"], "days": ["mon","tue","wed","thu","fri","sat"] },
      "unavailable_reason": "The shop is closed. A note on the door: 'Back tomorrow.'"
    },
    "dialogue": {
      "stranger": {
        "entry": { "text": "What can I get you?", "tag": "neutral" },
        "ambient": [
          { "text": "Quiet morning.", "tag": "neutral" },
          { "text": "The milk does this thing in winter where it...", "tag": "neutral" }
        ]
      },
      "acquaintance": {
        "trigger": { "visitCount": 3, "acrossDays": true },
        "entry": { "text": "The usual? Or... no. The usual.", "tag": "neutral" },
        "ambient": [
          { "text": "You look like you need the window seat.", "tag": "neutral" }
        ],
        "traitLines": {
          "musician": { "text": "Funny. I don't know where I learned that...", "tag": "musician" }
        }
      },
      "familiar": {
        "trigger": { "visitCount": 8, "acrossDays": true, "requiresInvestigation": "LI-02.step1" },
        "entry": { "text": "Sit. I saved your seat.", "tag": "neutral" },
        "traitLines": {
          "musician": { "text": "The song. I hum it every morning. I don't know why.", "tag": "musician" }
        }
      }
    },
    "mythologicalIdentity": {
      "musician": {
        "identity": "A musician from 1967 who never finished a song",
        "clues": [
          { "stage": "acquaintance", "detail": "She hums a specific melody while working. Unrecorded. 1967.", "deniable": true },
          { "stage": "familiar", "detail": "The song was written in this building when it was a studio.", "deniable": true },
          { "stage": "familiar", "detail": "The songwriter's flat was the player's flat.", "deniable": false }
        ],
        "confidantReveal": "I can't finish it. It finishes itself.",
        "fragmentLink": "M-F2"
      }
    },
    "weatherReaction": {
      "rain": { "ambient": "Rain on the window. Good for business...", "tag": "neutral" },
      "forgetting": { "ambient": "Your usual is... sorry. Give me a moment.", "tag": "neutral" }
    },
    "aiPersonality": {
      "surface": "A warm, slightly distracted café owner who trails off mid-sentence.",
      "interior": "A woman who hears something in the back of her mind — a melody she can't finish — and has organized her entire life around the comfort of routine to avoid confronting it.",
      "fear": "That she'll remember what the song is about.",
      "desire": "To finish a sentence. Just once. The right sentence."
    }
  }
}
```

### investigations.json
```json
{
  "LI-02": {
    "id": "LI-02",
    "name": "The Barista's Song",
    "type": "deep",
    "primaryLocation": "L02",
    "trait": "all",
    "trigger": {
      "type": "composite",
      "conditions": [
        { "type": "visit_count", "location": "L02", "count": 3 },
        { "type": "npc_stage", "npc": "barista", "minStage": "acquaintance" }
      ]
    },
    "steps": [
      {
        "id": 1,
        "text": "The barista hums while she works. A melody. Specific. You can't place it.",
        "type": "discovery",
        "advanceTrigger": "automatic"
      },
      {
        "id": 2,
        "text": "The melody is from 1967. Never recorded. The band broke up before they finished it.",
        "type": "research",
        "advanceTrigger": { "type": "visit", "location": "L05", "detail": "ask_landlord_about_music" },
        "pacing": { "minHoursAfterPrevious": 4 }
      },
      {
        "id": 3,
        "text": "The song was written in this building. When it was a recording studio. The songwriter lived upstairs. Your flat.",
        "type": "revelation",
        "advanceTrigger": { "type": "visit", "location": "flat", "detail": "examine_floor" },
        "pacing": { "minHoursAfterPrevious": 6 }
      }
    ],
    "choice": {
      "triggeredAfterStep": 3,
      "prompt": "You know the song's origin. The barista is humming a song written in your flat by a person who died before she was born.",
      "options": [
        {
          "id": "tell",
          "text": "That song. I know where it comes from.",
          "consequence": {
            "narrativeText": "She stops. 'What do you mean?' You tell her. She tries to hum it again. She can't. The melody is gone. 'I don't... I can't remember how it goes.' She looks at her hands. 'But I can tell you something about your flat. About what I hear through the floor at night.'",
            "npcEffect": { "barista": { "unlock": "flat_secret", "mythologyStrength": -1 } },
            "investigationEffect": "opens_flat_thread",
            "xp": { "insight": 5, "connection": 3 },
            "flatObject": null
          }
        },
        {
          "id": "silence",
          "text": "Let her hum.",
          "consequence": {
            "narrativeText": "She hums. You listen. The melody fills the café the way it has every morning. Some knowledge is better as a secret. The mystery deepens. The music stays.",
            "npcEffect": { "barista": { "mythologyStrength": 2 } },
            "investigationEffect": "closed_peacefully",
            "xp": { "insight": 3, "connection": 5 },
            "flatObject": { "id": "silent_knowledge", "description": "Nothing on the shelf. But you know." }
          }
        }
      ]
    },
    "rewards": {
      "completion": { "awareness": 3, "title_progress": { "named": { "by": "barista" } } }
    }
  }
}
```

### config.json
```json
{
  "time": {
    "periods": {
      "morning": { "startHour": 6, "endHour": 12 },
      "afternoon": { "startHour": 12, "endHour": 17 },
      "evening": { "startHour": 17, "endHour": 22 },
      "night": { "startHour": 22, "endHour": 6 }
    },
    "palette": {
      "morning": { "skyGradient": ["#FFE4B5", "#87CEEB"], "ambientLight": 0.9 },
      "afternoon": { "skyGradient": ["#87CEEB", "#4682B4"], "ambientLight": 1.0 },
      "evening": { "skyGradient": ["#DEB887", "#8B4513"], "ambientLight": 0.7 },
      "night": { "skyGradient": ["#191970", "#000033"], "ambientLight": 0.3 }
    }
  },
  "weather": {
    "states": ["clear", "rain"],
    "cycleDurationHours": 8,
    "rainProbability": 0.35
  },
  "forgetting": {
    "minDaysBetween": 5,
    "maxDaysBetween": 9,
    "durationHours": 24,
    "paletteDesaturation": 0.3,
    "npcDistanceIncrease": 1
  },
  "progression": {
    "tierThresholds": { "tier1": 0, "tier2": 31, "tier3": 66 },
    "xpValues": {
      "newLocation": 5,
      "hiddenDetail": 3,
      "loreFragment": 8,
      "betweenSpace": 3,
      "weatherTimeVariant": 1,
      "watcherNoticed": 10,
      "hiddenLocation": 10,
      "npcFirstMeeting": 3,
      "npcAcquaintance": 5,
      "npcFamiliar": 10,
      "npcConfidant": 20,
      "npcAlly": 30,
      "mealShared": 2,
      "infoShared": 3,
      "aiConversation": 1,
      "aiConversationCap": 5,
      "quickNodeResolved": 5,
      "deepNodeStep": 3,
      "deepNodeResolved": 15,
      "fragmentsConnected": 10,
      "forgettingExperienced": 5,
      "watcherConfronted": 20
    }
  },
  "investigation": {
    "minHoursBetweenClues": 4,
    "npcCooldownHours": 6
  },
  "npc": {
    "acquaintanceVisits": 3,
    "familiarVisits": 8,
    "confidantVisits": 15,
    "requireAcrossDays": true
  },
  "canvas": {
    "nativeWidth": 320,
    "nativeHeight": 180,
    "scalingMode": "pixelated"
  }
}
```

---

## Build Order — Milestones

### Milestone 0: The Screen (Day 1)
**Deliverable:** A working split-screen with a static pixel art scene and interactive text panel.
**Build:**
- `index.html` with split layout (CSS flexbox, top/bottom on mobile)
- `css/game.css` with responsive split, canvas scaling
- `engine.js` with canvas initialization, a test background rendered at 320×180
- `ui.js` with basic text display and a "Look around" button
- Title screen: title text, static Limehouse dusk image, theme audio (placeholder), "Begin" button

**Emotional test:** Does it feel like a window into a place?

### Milestone 1: Movement (Days 2-3)
**Deliverable:** Player moves between flat, canal basin, and coffee shop.
**Build:**
- `content/locations.json` with L01, L02, flat (3 locations)
- `game.js` navigation: tap direction → location change → canvas redraws → text updates
- `engine.js` location rendering: background + foreground sprites per location
- Walking thoughts between locations (from `content/thoughts.json`)
- `state.js` tracking: current location, visited locations

**Emotional test:** Does walking feel like being somewhere?

### Milestone 2: NPCs (Days 4-6)
**Deliverable:** The Barista is present at L02. Dialogue works. Relationship tracks.
**Build:**
- `content/npcs.json` with barista (full Stranger + Acquaintance + Familiar dialogue)
- `game.js` NPC interaction: tap NPC → dialogue displays → track visits
- `ui.js` dialogue display: NPC text, player choice buttons, ambient lines
- `state.js` NPC memory: visit count, relationship stage, stage transitions
- `ui.js` notebook People tab: show the Barista, relationship stage, visit count

**Emotional test:** Does meeting the Barista feel like meeting a person?

### Milestone 3: Noticing (Days 7-8)
**Deliverable:** Tappable details appear in locations. Discovery mechanic works.
**Build:**
- `engine.js` interactable detail rendering: small sprites at specific canvas positions, no visual indicator (the player must LOOK)
- `engine.js` tap detection: canvas click/touch mapped to detail positions
- `ui.js` discovery display: text appears in bottom panel when detail is tapped
- `state.js` discovery tracking: which details found, XP awarded
- Awareness stat visible in notebook Me tab

**Emotional test:** Does tapping a detail feel like the player's own discovery?

### Milestone 4: Investigation (Days 9-12)
**Deliverable:** LI-02 (The Barista's Song) is fully playable from trigger to consequence.
**Build:**
- `content/investigations.json` with LI-02 (full structure)
- `game.js` investigation system: trigger detection, step progression, pacing enforcement, choice presentation, consequence execution
- `ui.js` investigation display: step text, choice prompts with two options, consequence narration
- `state.js` investigation tracking: active investigations, current steps, choices made
- Notebook Mysteries tab: show LI-02, current progress
- Flat object: first investigation-derived object appears

**Emotional test:** Does the choice feel like it matters?

### Milestone 5: Full Limehouse (Days 13-20)
**Deliverable:** All 10 locations, all 6 NPCs, all 5 investigations, day/night, rain, fragments, the flat, the fox, the Watcher in background.
**Build:**
- Complete `locations.json` (all 10)
- Complete `npcs.json` (all 8 including shallow)
- Complete `investigations.json` (all 5 MVP nodes)
- `fragments.json` (3 fragments)
- `game.js` time system: real-time clock → period calculation → palette selection
- `engine.js` time-of-day rendering: gradient overlays per period
- `game.js` weather system: cycle timer, rain state
- `engine.js` rain rendering: particle overlay on canvas
- NPC schedules: availability based on time/day
- The Forgetting: 24-hour event, palette desaturation, NPC behavior shift
- The Watcher: background sprite at L08, L01, L05 (appears after Awareness threshold)
- The Night Fox: appears at L10/L01 at dusk
- Flat: full object grid, all MVP objects placeable
- Notebook: all tabs functional

**Emotional test:** Does Limehouse feel like home?

### Milestone 6: Sound (Days 21-25)
**Deliverable:** Ambient soundscape, punctuation sounds, the silence of Forgetting, the theme.
**Build:**
- `engine.js` audio manager: ambient loops with crossfade between locations
- 3 ambient tracks: canal (water, chain, heron), street (DLR, footsteps, distant), interior (espresso machine, quiet, clock)
- Weather audio: rain overlay loop
- Punctuation sounds: discovery chime, NPC greeting, investigation advance, choice moment
- Forgetting audio: one frequency removed from ambient (the absence is the signal)
- Title screen: theme music (piano + glass harmonics)
- Ending placeholder: theme music replays (for future use)

**Emotional test:** Does the sound make the Musician's London feel real?

### Milestone 7: Polish (Days 26-30)
**Deliverable:** Mobile-optimized, save-bulletproof, edge-cases handled, neighborhood teasers.
**Build:**
- Touch optimization: tap targets, scroll behavior, input lag
- Save system hardening: auto-save frequency, corruption recovery, fresh-start option
- Edge cases: what happens if the player hasn't visited in 2 weeks? (The Forgetting was active multiple times. NPCs comment on absence. The flat has dust.)
- Neighborhood teasers: walking to Limehouse boundaries shows path continuing with "More of London is coming"
- Character creation screen: 5 silhouettes, Musician selectable, others "Coming soon"
- Performance: canvas render optimization, lazy-load assets, minimal memory footprint
- README.md for the public repo

**Emotional test:** Does the player want to come back tomorrow?

---

## Post-MVP Expansion Order

After MVP is proven (Musician + Limehouse):

1. **Greenwich neighborhood** — 10 locations, 5 NPCs, investigation nodes GI-01 through GI-10
2. **Bermondsey neighborhood** — 10 locations, 5 NPCs, investigation nodes BI-01 through BI-11
3. **Cross-neighborhood investigations** — XN-01, XN-02, XN-03, between-space content
4. **Remaining 4 traits** — one at a time: Photographer (most visual), Wanderer (most atmospheric), Barista (most social), Shopkeeper (deepest)
5. **AI Living Conversations** — ai.js activated, settings screen, provider selection
6. **Endings** — Leave London + event endings
7. **Shared world state** — GitHub API integration, district warmth, residuum marks
8. **Autopilot and agents** — pattern model, observation interface, agent lifecycle
9. **Seasonal cycle and city events** — A6 systems activated
10. **Mythological weather** — full four-state cycle

Each expansion is additive. Nothing breaks what came before.
