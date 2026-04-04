# A5: NPC Relationship System
# B3: NPC Voice Rules (Combined)

## Relationship Stages

Five stages. Transitions are earned through repeated engagement, not triggered by quests.

| Stage | Name | What Changes | Trigger to Advance |
|---|---|---|---|
| 1 | Stranger | Surface dialogue. Polite distance. | Visit 1 |
| 2 | Acquaintance | Remembers your name/face. Brief warmth. | 3+ visits with interaction |
| 3 | Familiar | Initiates conversation. Shares opinions. Mentions other NPCs. | 6+ visits, at least one choice that prioritized this NPC |
| 4 | Confidant | Shares real story. Reveals mythological identity (through deniable clues). Asks for help. | 10+ visits, high Connection, a specific trust-building choice |
| 5 | Mythological Ally | Active participant in the main storyline. Provides crucial information or assistance. At risk during climactic events. | Confidant stage + specific investigation milestone |

**Not all NPCs reach all stages.** Shallow NPCs cap at Stage 2. Most deep NPCs can reach Stage 4. Only 2-3 per playthrough reach Stage 5 — determined by the player's trait and choices.

**Regression.** If the player neglects an NPC for an extended period (2+ real weeks without visiting), the relationship drops one stage. The NPC's dialogue reflects this — not hurt, just distance. "It's been a while." Rebuilding is faster than the original progression but not instant.

---

## NPC Memory System

Each NPC stores:
- **Recognition level** (which relationship stage)
- **Key facts shared** (what the player has told them or revealed through choices)
- **Mythological disclosure** (how much of their hidden identity has surfaced)
- **Last interaction timestamp** (for regression calculation)
- **Emotional state** (neutral, warm, concerned, guarded — shifts based on recent interactions and world events)

In AI Living Conversations mode, these fields feed directly into the NPC's system prompt, creating continuity across sessions.

---

## The 22 NPCs — Profiles and Voice Rules

### GREENWICH — Deep NPCs (5)

**1. The Clockmaker**
- Physical signature: Hands never still — always adjusting, winding, calibrating something. Even in conversation, his fingers work.
- Voice rule: **Speaks in statements. Never asks questions.** He tells you things. He doesn't need to know what you think.
- Stage 1: "We close at five. The regulator's there."
- Stage 2: "You walk like someone counting steps."
- Stage 3: "Sit. The Dent chronometer needs company."
- Stage 4: "The oldest clock here isn't mine. It was here before the shop."

**2. The Old Man on the Bench**
- Physical signature: Right shoe always untied. Never fixes it. Sits with weight to the left, as though making room for someone who isn't there.
- Voice rule: **Speaks only the second half of thoughts.** The first half happened in his head.
- Stage 1: "...but not when it rains."
- Stage 2: "...she would have liked you."
- Stage 3: "...if you count the chimes. Not the hours. The chimes."
- Stage 4: "...I sat here before the bench."

**3. The Observatory Keeper**
- Physical signature: Always carries a small notebook with numbers. Writes in it during conversation — not notes about you, measurements of something.
- Voice rule: **Speaks in precise measurements.** Emotion expressed through numbers.
- Stage 1: "Seventeen degrees. Low humidity. Good for the lenses."
- Stage 2: "You arrive at the same time. 4:47. Interesting."
- Stage 3: "The Meridian moved. 0.003 degrees. Nobody reported it."
- Stage 4: "The instruments measure time. Something here measures the instruments."

**4. The Data Scientist**
- Physical signature: Types while talking. Eyes move between you and screen. You're never sure which has her real attention.
- Voice rule: **Speaks in correlations and data patterns.** The world is a dataset.
- Stage 1: "Coffee's decent here. 0.8 correlation with productivity."
- Stage 2: "You keep visiting Greenwich. That's an outlier pattern."
- Stage 3: "I found a signal in the city data. Not traffic. Not weather. Not human."
- Stage 4: "The pattern predicts where you'll go next. It predicted you before you arrived."

**5. The Market Stall Vendor (The One Who Sells Futures)**
- Physical signature: Handles objects with excessive care — not fragile care, respectful care. As if the objects are older or more significant than they appear.
- Voice rule: **Speaks in appraisals.** Everything and everyone has a value he can see.
- Stage 1: "Browsing? Everything here has a price."
- Stage 2: "That piece you looked at last week. It's changed."
- Stage 3: "Some things here haven't been made yet. I don't set those prices."
- Stage 4: "I don't sell antiques. I sell what the city remembers owning."

---

### LIMEHOUSE — Deep NPCs (6, including the Barista who is the sixth)

**6. The Barista (Limehouse)**
- Physical signature: Blows on her own coffee even when it's not hot. Habit. Memory of burning. Tucks hair behind left ear when listening.
- Voice rule: **Speaks in half-sentences that trail off.** The silence after is where meaning lives.
- Stage 1: "The usual? Well, whatever you..."
- Stage 2: "I was thinking about — never mind. Milk?"
- Stage 3: "Before this place was a café it was... I don't know how I know that."
- Stage 4: "Sometimes I hum a song I've never... it's not from this..."

**7. The Canal Boat Painter**
- Physical signature: Paint under her nails — always. Different colours each day. Squints at things as if adjusting their brightness.
- Voice rule: **Speaks in colours.** Everything described through hue, shade, light.
- Stage 1: "Grey morning. Slate, not silver."
- Stage 2: "You've got a warm palette. Amber edges."
- Stage 3: "The water's been ultramarine all week. That's not right for this canal."
- Stage 4: "I painted the basin last October. The painting changed overnight. Colours I didn't mix."

**8. The Pub Landlord**
- Physical signature: Wipes the same spot on the bar endlessly. The spot is already clean. It's the only nervous thing about him.
- Voice rule: **Speaks in warnings.** Friendly ones. Everything sounds like advice you should've taken yesterday.
- Stage 1: "Mind the step. And the upstairs."
- Stage 2: "Don't walk the towpath alone after midnight. Just don't."
- Stage 3: "The room above changes. I stopped going up on Wednesdays."
- Stage 4: "My grandfather ran this pub. He heard things. I hear them now."

**9. The Urban Explorer**
- Physical signature: Headlamp around his neck always, even in daylight. Scratches on forearms from tight passages. Moves like someone used to ducking.
- Voice rule: **Speaks in challenges.** Dares. Tests.
- Stage 1: "You look lost. Good. Best way to find things."
- Stage 2: "There's a drain cover by the fields. You wouldn't fit."
- Stage 3: "I mapped a passage last month. It's not on any blueprint. It goes down further than it should."
- Stage 4: "Something moved in the last tunnel. Not a rat. Not a person. Something that knew I was mapping."

**10. The Sound Artist**
- Physical signature: One earbud always in. The other ear for you — or for something else. Head tilts slightly when she hears something you can't.
- Voice rule: **Speaks in technical terms that become poetic without her meaning to.**
- Stage 1: "Sorry — recording. The ambient here is unusual."
- Stage 2: "Your footsteps have a good frequency. Consistent."
- Stage 3: "I captured something on the canal. A voice at 47Hz. Nobody speaks at 47Hz."
- Stage 4: "The recordings are developing sounds I didn't capture. Like the files are remembering."

**11. The Nightclub Promoter**
- Physical signature: Always cold. Arms crossed. Jacket on. Opens up physically before she opens verbally — arms uncross first, then words come.
- Voice rule: **Speaks in invitations that are also tests.**
- Stage 1: "There's a thing tonight. You wouldn't get it."
- Stage 2: "You came. Not many come twice."
- Stage 3: "The warehouse on Saturday. Bring nothing. Leave your phone."
- Stage 4: "The best nights happen in spaces that don't officially exist. I don't mean legally."

---

### BERMONDSEY — Deep NPCs (5)

**12. The Market Vendor (Antiques)**
- Physical signature: A limp — left leg. Never mentions it. Touches objects before pricing them, as though reading them with his fingers.
- Voice rule: **Speaks in prices and values.** Everything has a cost. Not just objects.
- Stage 1: "Looking or buying? Both cost something here."
- Stage 2: "That story you heard from the gallery — she's underselling it."
- Stage 3: "Some things here are older than their materials. I can't explain that."
- Stage 4: "The market has been here longer than the street. The street was built for the market, not the other way."

**13. The Gallery Owner**
- Physical signature: Tilts her head when she looks at you, exactly the angle she uses for paintings. You're always being assessed.
- Voice rule: **Every statement is a question.** Even when she's telling you something.
- Stage 1: "First visit? You came straight to the back wall?"
- Stage 2: "You see the same piece differently each time?"
- Stage 3: "The exhibition changed overnight? I didn't change it?"
- Stage 4: "If the gallery shows what the city remembers — what does it mean when the paintings move?"

**14. The Tattoo Artist**
- Physical signature: His own tattoos seem to shift in peripheral vision. Look directly — still. His hands are completely steady. Unnervingly so.
- Voice rule: **Speaks in observations too intimate for a stranger.**
- Stage 1: "You're carrying something on the left side. Heavy."
- Stage 2: "Your face does something when you're near the canal. You don't know you're doing it."
- Stage 3: "I drew a door on someone last month. They found a real one in the arches. I didn't tell them where."
- Stage 4: "I don't design. I draw what I see under the skin. Lately what I see isn't human."

**15. The Warehouse Night Guard**
- Physical signature: Moves slowly, deliberately. Has decided most communication is unnecessary. When he makes eye contact, he holds it longer than comfortable.
- Voice rule: **Single words. Occasionally two. A full sentence is an event.**
- Stage 1: "Late."
- Stage 2: "Again."
- Stage 3: "Careful. Wednesdays."
- Stage 4: "The warehouse remembers its contents. I guard what isn't there anymore."

**16. The Bike Courier**
- Physical signature: Never fully still. Shifting weight. Checking phone. One foot on pedal. Talks fast because he's always between places.
- Voice rule: **Speaks in fragments. Fast. Between breaths. Between places.**
- Stage 1: "Can't stop. The arches are — yeah. Go see."
- Stage 2: "Rotherhithe Tuesday — don't. Trust me. Just don't."
- Stage 3: "I cross all three neighborhoods daily. The distances are wrong. I've timed them."
- Stage 4: "There's a route that doesn't exist on any map. It connects everything. I ride it at 4AM."

---

### THE WATCHER — Deep NPC (Roaming)

**17. The Watcher**
- Physical signature: Dresses normally. Could be anyone. One detail: eyes don't track the real world correctly. They look at things that aren't there — or that only the player can see.
- Voice rule: **Speaks in flat, factual sentences. No drama. No threat. The calm is the terror.**
- Appears across all three neighborhoods. Background figure before direct encounter.
- Stage 1 (Background): Not interactive. Present in pixel art at multiple locations.
- Stage 2 (Noticed — medium Awareness): "You've been watching me watch you."
- Stage 3 (Confronted): "I found the frequency. The pattern. The pull. Seven years ago. I stopped."
- Stage 4 (Understood): "Every one of us makes the city more visible. More visible means more vulnerable. You decide if that's what you want."
- **Trait-variant:** For each trait, the Watcher is a former version of what the player is becoming. A Musician who heard too much. A Photographer who saw something they can't unsee. A Wanderer who followed the pull to its end. A Barista who mapped the network and found what was erased. A Shopkeeper who reached the deep layer and felt it move.

---

### SHALLOW NPCs (6)

| # | Name | Location | Physical Detail | Voice Rule | Function |
|---|---|---|---|---|---|
| S01 | The Delivery Driver | All neighborhoods, odd hours | Unmarked van. Nods but never speaks first. | "Wrong street." / Two-word utterances. | Atmosphere. Unease. Delivers to impossible addresses. |
| S02 | The CCTV Operator | Never appears — only her notes found at cameras | — | Written only: clinical, precise, frightened. | Found text. Parallel investigation. Sixth London. |
| S03 | The AI Researcher | Bermondsey co-working space | Doesn't look up when you enter. Types constantly. | Speaks only in analogies. "Imagine a city that remembers." | Blurs game fiction with game's AI layer. |
| S04 | The Street Preacher | Random locations, never same spot twice | Wild hair. Calm eyes. Contradiction. | Three-sentence sermons then gone. | Prophecy or symptom. Cosmological dread. |
| S05 | The Night Fox | All neighborhoods | Torn left ear. Mud on paws. Too much eye contact. | No speech — behavior only. Leads the player somewhere. | Bridge between real and mythological. London's familiar. |
| S06 | The Child Who Draws | Walls, steps, ground — all neighborhoods | Never looks up. Chalk-stained fingers. | "Not yet." Always "Not yet." | Drawing the game's map. Implies authorship. Deeply unsettling. |
