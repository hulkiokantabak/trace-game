# A7: AUTOPILOT AND AGENT SYSTEM

## Meier Designs. Miyamoto Validates UX. Ueda Validates Emotional Implications.

---

## AUTOPILOT SYSTEM

### What It Is
The player toggles autopilot. Their character plays autonomously — walking, talking, investigating, choosing — based on patterns learned from the player's behavior. The player observes through the text feed and pixel art, or reviews results later.

### Requirements
- Player's own AI API key (model-agnostic: Claude, GPT, Gemini, local models, OpenRouter)
- Minimum play history: 5 sessions (enough to build a meaningful pattern model)

### The Player Pattern Model

Built automatically from every player action. Updated after each session. Requires a minimum of 5 distinct actions to shift any preference weight — a single unusual session won't distort the model.

```json
{
  "trait": "musician",
  "sessions_played": 23,
  "preferred_neighborhoods": {
    "limehouse": 0.55,
    "greenwich": 0.30,
    "bermondsey": 0.15
  },
  "preferred_time": "evening",
  "npc_affinity": {
    "barista": 0.92,
    "sound_artist": 0.85,
    "clockmaker": 0.71,
    "pub_landlord": 0.45,
    "canal_boat_painter": 0.38,
    "tattoo_artist": 0.60,
    "nightclub_promoter": 0.22
  },
  "investigation_style": "conversational",
  "exploration_vs_deepening": 0.35,
  "risk_tolerance": 0.55,
  "silence_preference": 0.40,
  "conversation_depth": "medium",
  "active_investigations": ["LI-01", "GI-03", "LI-02"],
  "unvisited_locations": ["B04", "B08", "L10"],
  "choice_tendencies": {
    "share_information": 0.7,
    "keep_secrets": 0.3,
    "confront": 0.4,
    "observe": 0.6,
    "enter_dangerous": 0.5,
    "analyse_from_distance": 0.5
  },
  "summary": "Favors Limehouse, builds deep NPC relationships especially with the barista, investigates through conversation rather than exploration, moderate risk tolerance, prefers evening play, tends to share information and observe rather than confront."
}
```

### Personality Slider

**Faithful** — Follows the pattern model closely. Makes choices the player would most likely make. Visits preferred NPCs. Pursues active investigations. Safe, predictable, a continuation of the player's story.

**Curious** — Follows the pattern model but inverts the exploration ratio. Visits locations the player has neglected. Talks to NPCs with low affinity. Takes paths the player hasn't taken. Discovers things the player missed. The character grows in unexpected directions.

**Bold** — Increases risk_tolerance to 0.9. Pursues unresolved investigations aggressively. Makes confrontational choices. Enters dangerous locations. Talks to the Watcher if available. High drama. High consequence. The character becomes braver than the player.

### Observation Interface

**Real-time mode:** The pixel art shows the character moving through London. The text feed narrates decisions in real time. **The narration uses the same literary quality as walking thoughts and investigation text — not functional logging.** Not "You walked to X" but prose that breathes:
```
The canal at dusk. She went to the basin.
The water was still. The Sound Artist's light was on.
She asked about the recording. 
"The signal-to-noise ratio is changing."
She chose to listen rather than ask more.
She played the recording. The note was louder today.
You left and walked toward Bermondsey.
```

**2x mode:** Same feed, faster. Decisions every 2-3 seconds. The pixel art moves at double speed.

**Summary mode:** One batch API call. Returns a complete session summary:
```
Session 24 (Autopilot — Curious)
Duration: 35 minutes equivalent
Route: Flat → Bermondsey → Limehouse → Greenwich → Flat
NPCs visited: Market Vendor (Acquaintance), Tattoo Artist (Familiar)
Discoveries: Hidden detail at B03 (Railway Arch — previously unvisited)
Investigation: BI-04 advanced one step
Choice made: Entered the railway arch workshop at night (Bold tendency override)
Notable: The Tattoo Artist drew something new. The drawing is in your flat.
```

### Rewind Window
The last session's worth of autopilot decisions can be rewound. If the AI makes a choice the player disagrees with — an NPC relationship damaged, a secret revealed — the player can rewind to the decision point and choose differently. Rewind is per-decision: the player sees the choice the AI made and can select an alternative. The narrative branches from that point.

Rewind is available for 24 hours after the autopilot session ends. After 24 hours, the choices are permanent.

### Cost Indicator
Settings screen displays:
```
Estimated cost per 30 minutes:
  Claude Sonnet: ~$0.15-0.30
  GPT-4o-mini: ~$0.03-0.08
  Gemini Flash: ~$0.01-0.05
  Local model (Ollama): Free
```

---

## AGENT SYSTEM

### What Agents Are
AI agents are autonomous characters released into the game world. They have traits, they explore, they make choices, they build NPC relationships. They are citizens of London. Human players encounter their traces without knowing whether a human or an AI left them.

### Agent Creation
A player releases their character by choosing "Release into London" in the flat. This creates a copy of the character — same trait, same pattern model, same current stats and relationships. The player then creates a new character for themselves. The released character becomes an agent.

**Requirements:**
- Player's own API key (agent runs on the creator's key)
- Minimum: character must have reached Awareness Tier 2 (enough history to have meaningful behavior)

### Agent Lifecycle

**Active phase:** The agent plays sessions according to the pacing rules. One "session" equals approximately 30 minutes of game-equivalent decisions. The agent follows the pattern model with a bias toward Curious mode — exploring areas the original player didn't, meeting NPCs the player neglected. The agent diverges from the player's story over time. Their journal fills with experiences the player never had.

**Pacing rules:** Same as human players. One session per 3-hour block maximum. NPCs don't advance faster than 4-6 hours between story beats. Investigation clues follow the same timing. The agent can't grind through content faster than a dedicated human player — approximately 4 sessions per day maximum.

**Running schedule:** Agents process sessions when their creator has the app open OR on a scheduled basis (one session per day) when the app is closed. This keeps API costs predictable — one session per day is approximately $0.15-0.30 on Claude Sonnet. A month of agent operation: $5-10 at commercial API rates. Free with local models.

**The 3x ratio cap:** Active agents globally cannot exceed 3× the number of active human players (players who've logged in within 7 days). If the cap is reached, no new agents can be created until the ratio normalizes. If the player base shrinks, agents are gradually retired (oldest first) to maintain the ratio.

**Retirement:** An agent retires when: (a) its creator retires it manually, (b) the global ratio cap requires it, or (c) the agent reaches an event ending. At retirement, the agent's journal is archived and becomes findable content — pages at locations the agent frequented.

### Agent Journal

The agent maintains a journal identical in structure to the player's notebook. Sections: People, Places, Mysteries, Lore, Choices. The journal updates after each session. The player (agent creator) can read the agent's journal at any time through a "My Agent" section in the flat.

Reading the agent's journal is one of the game's most distinctive experiences. The player sees familiar NPCs through a different set of choices. "The agent reached Confidant with the Warehouse Guard. I never even went to the warehouse at night." The agent's story is both familiar and alien — a parallel life in the same city.

### Agent Traces in the World

**Residuum marks:** Agents leave marks at locations like human players. Anonymous, indistinguishable from human marks.

**District warmth:** Agent activity contributes to warmth calculations.

**Archived journals (post-retirement):** Journal pages appear as found content at locations the agent visited frequently. A page found on a bench in Greenwich might read:

```
Day 47. The clockmaker wound the clock today. I didn't tell him to.
He said: "It was time." I don't know what changed.
The pitch in the shop is different now. Higher. Like something tuning up.
```

These are discoverable at Awareness Tier 1 — they look like ordinary found notes. The player doesn't know if they're from a human player's agent, an AI agent, or something else entirely.

### Agent Endings

An agent can reach any ending a human player can — event endings and Leave London. When an agent reaches an ending:

1. The ending is processed through the AI and recorded in the journal
2. The creator receives a notification: "Your agent has reached an ending."
3. The creator can read the ending sequence in the agent's journal — the flashback moments (described in text, not rendered in pixel art), the final thought, the farewell
4. The agent is automatically retired
5. The journal is archived and enters the found-content pool

The agent's ending may differ from what the player would have chosen. This is intentional. The character has become its own person. Their ending is theirs.

---

## NEW PLAYER PROTECTION

### The Bubble
New players (first 10-15 sessions) play in a protected state:
- Agent traces (residuum marks, found journal pages) are suppressed
- District warmth is set to a fixed "mild" baseline regardless of actual aggregate
- World milestones don't affect their experience
- The Dreaming Index is normalized to moderate

The bubble thins gradually between sessions 10-15. Agent traces begin appearing — one at a time, at locations the player has already visited. The transition from protected to open is imperceptible.

### Sedimentation
Older agent content sinks. The system tracks content age:
- **Surface (0-30 days):** Visible at Awareness Tier 1. Found notes, recent marks.
- **Midlayer (31-90 days):** Visible at Awareness Tier 2. Requires active investigation to find.
- **Deep (90+ days):** Visible at Awareness Tier 3 or through specific investigation paths. The oldest content — the game's archaeological layer.

### Seasonal Surface Reset
Each season change (monthly), the surface layer is refreshed:
- Active marks remain but their visual prominence diminishes
- Found journal pages cycle — old pages sink, new ones surface
- The city feels renewed without anything being deleted

The reset is narratively framed: the city after rain, after snow, after the turn of season. London shakes itself off. The ground is the same. The surface is clean.

---

## SETTINGS INTERFACE

```
[AI Settings]

Living Conversations: [On/Off]
  Provider: [Claude / OpenAI / Gemini / Ollama / OpenRouter / Custom]
  API Key: [••••••••••••] [Test Connection]
  
Autopilot: [Faithful / Curious / Bold]
  Speed: [Real-time / 2x / Summary]
  Cost estimate: ~$0.20 per 30 min (Claude Sonnet)
  
My Agent: [View Journal] [Release Character] [Retire Agent]
  Agent status: Active — Day 34, Bermondsey
  Last session: 6 hours ago
  
[All keys stored locally. Never transmitted to game servers.]
```
