/**
 * ui.js — DOM: dialogue display, notebook tabs, flat view, choices
 * Milestone 2: NPC dialogue, relationship stages, notebook People tab
 */
const UI = (() => {
  let panel;
  let _seenEllipsis = false;

  const AMBIENT_TEXTS = {
    chain_clink: 'A chain clinks against a mooring ring. Rhythmic.',
    heron: 'A heron stands on the lock gate. Perfectly still.',
    narrowboat_smoke: 'Smoke drifts from a narrowboat chimney.',
    jogger: 'A jogger passes. Headphones. Already gone.',
    steam_from_machine: 'The espresso machine hisses. Steam curls.',
    cat_on_doorstep: 'The cat on the doorstep watches you with one eye.',
    window_light_shift: 'Light through the window shifts across the counter.',
    wind_through_graves: 'Wind moves through the grass between the graves.',
    distant_traffic: 'Traffic on the highway. Close but invisible.',
    bird_unseen: 'A bird you can\'t see. Singing.',
    equipment_hum: 'Equipment hums in the dark. A low, patient frequency.',
    cable_coils: 'Cables coiled on the floor like sleeping things.',
    monitor_glow: 'Monitor light paints the wall blue-green.',
    glass_clink: 'Glasses clink behind the bar. A steady rhythm.',
    thames_through_window: 'The Thames moves past the back window. Always.',
    floorboard_creak: 'The floorboard creaks under someone you can\'t see.',
    needle_buzz: 'The needle buzzes from behind the curtain.',
    neon_flicker: 'Neon flickers in the window. Pink, gone, pink.',
    radio_low: 'Radio low. A song from another decade.',
    announcement_loop: 'The announcement loops. No one listens.',
    pigeon_flutter: 'Pigeons in the rafters. A burst, then stillness.',
    wind_channel: 'Wind channels through the platform. Sharp.',
    bass_thump: 'Bass from somewhere underground. You feel it in your feet.',
    smoke_drift: 'Charcoal smoke drifts between the stalls.',
    vendor_call: 'A vendor calls out. The words are lost in the crowd.',
    weed_through_concrete: 'A weed pushes through the concrete. Green and insistent.',
    distant_crane: 'A crane on the skyline. Still. Waiting.',
    wall_scar: 'The scar in the brick where a building used to be.',
    radiator_click: 'The radiator clicks. A rhythm only this room knows.',
    window_light: 'Light through the window moves across the table.',
    water_drip: 'Water drips from the lock mechanism. Steady. Patient.',
    mechanism_creak: 'The lock gate creaks. Iron remembering its shape.',
    distant_boat: 'A narrowboat engine somewhere beyond the lock. Fading.',
    wind_through_gap: 'Wind through the gap where a wall used to be.',
    fox_distant: 'A fox, somewhere close. You smell it before you see it.',
    sky_open: 'The sky is bigger here. Nothing between you and it.'
  };

  /** Escape HTML to prevent XSS from JSON content or localStorage data */
  function esc(s) {
    if (typeof s !== 'string') return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function init(el) {
    panel = el;
    if (State.hasSave() && State.load()) {
      showTitle(true);
    } else {
      showTitle(false);
    }
  }

  // --- Title Screen ---

  function showTitle(hasSave) {
    Engine.setState('title');
    Engine.setTimePeriod('evening');
    panel.innerHTML = '<button id="begin-btn">' + (hasSave ? 'Continue' : 'Begin') + '</button>';
    document.getElementById('begin-btn').addEventListener('click', () => onBegin(hasSave));
  }

  function onBegin(hasSave) {
    const btn = document.getElementById('begin-btn');
    btn.disabled = true;
    btn.style.opacity = '0.3';
    btn.style.animation = 'none';

    Engine.audio.init();
    Engine.audio.playTheme();

    setTimeout(() => {
      Engine.audio.fadeOut(3);
    }, 12000);

    if (hasSave) {
      // Resume: brief title pause, then a returning thought, then location
      setTimeout(() => {
        Engine.setState('playing');
        const period = Game.getTimePeriod();
        Engine.setTimePeriod(period);
        Engine.setLocation(State.get('location'));
        Engine.setPlayerTrait(State.get('trait'));
        // Meier: contextual greeting based on player progress
        const npcMem = State.get('npcMemory') || {};
        const discoveries = State.get('discoveries') || [];
        const npcsMet = Object.keys(npcMem).filter(id => npcMem[id] && npcMem[id].visitCount > 0);
        let greeting;
        const trait = State.get('trait') || 'musician';
        const traitGreetings5 = {
          musician: 'Limehouse hums when you return.',
          photographer: 'The light shifts. It remembers you.',
          wanderer: 'The ground is familiar underfoot.',
          barista: 'Five people. They kept your seat warm.',
          shopkeeper: 'Everything is where you left it.'
        };
        const traitGreetings10 = {
          musician: 'The city has learned your key.',
          photographer: 'You see things here others walk past.',
          wanderer: 'Your feet know every surface now.',
          barista: 'The neighbourhood holds its breath for you.',
          shopkeeper: 'Ten things noticed. Nothing lost.'
        };
        if (npcsMet.length >= 5) {
          greeting = traitGreetings5[trait] || 'Limehouse knows your name now.';
        } else if (discoveries.length >= 10) {
          greeting = traitGreetings10[trait] || 'You see things here others walk past.';
        } else if (npcsMet.length >= 2) {
          const npcId = npcsMet[npcsMet.length - 1];
          const npc = Game.content.npcs[npcId];
          greeting = npc ? npc.name.replace('The ', 'The ') + ' remembers you.' : 'The neighbourhood remembers you.';
        } else if (discoveries.length >= 3) {
          greeting = 'Back. The canal holds what you found.';
        } else {
          const generic = ['You return to Limehouse.', 'Back. The canal is still there.', 'London, again. Yours, still.'];
          greeting = generic[Math.floor(Math.random() * generic.length)];
        }
        showWalkingThought(greeting, () => showLocation());
      }, 2000);
    } else {
      // New game: title → character creation
      setTimeout(() => {
        showCharacterCreation();
      }, 2500);
    }
  }

  // --- Character Creation ---

  function showCharacterCreation() {
    Engine.setState('character_creation');

    // Phase 1: Arrival text
    panel.innerHTML =
      '<div class="creation-arrival">' +
        '<p class="creation-text">You moved to Limehouse three days ago.</p>' +
        '<p class="creation-text creation-delay-1">A flat above Narrow Street. One room. A window facing the basin.</p>' +
        '<p class="creation-text creation-delay-2">You came here because—</p>' +
        '<p class="creation-text creation-delay-3">It doesn\'t matter why. You\'re here now.</p>' +
        '<button class="creation-continue-btn creation-delay-4">...</button>' +
      '</div>';

    panel.querySelector('.creation-continue-btn').addEventListener('click', () => {
      showTraitSelection();
    });
  }

  function traitConfirmation(trait) {
    const lines = {
      musician: 'You listen. London answers.',
      photographer: 'You look. London reveals.',
      wanderer: 'You walk. London opens.',
      barista: 'You connect. London speaks.',
      shopkeeper: 'You remember. London endures.'
    };
    return lines[trait] || 'London waits.';
  }

  function showTraitSelection() {
    panel.innerHTML =
      '<div class="creation-trait-select">' +
        '<p class="section-label">Who are you becoming?</p>' +
        '<div class="trait-list">' +
          '<button class="trait-btn trait-suggested" data-trait="musician">' +
            '<span class="trait-name">The Musician</span>' +
            '<span class="trait-desc">You hear what others don\'t. The city is an instrument.</span>' +
          '</button>' +
          '<button class="trait-btn" data-trait="photographer">' +
            '<span class="trait-name">The Photographer</span>' +
            '<span class="trait-desc">You see what others miss. Light tells you everything.</span>' +
          '</button>' +
          '<button class="trait-btn" data-trait="wanderer">' +
            '<span class="trait-name">The Wanderer</span>' +
            '<span class="trait-desc">You feel what others ignore. Every street has a temperature.</span>' +
          '</button>' +
          '<button class="trait-btn" data-trait="barista">' +
            '<span class="trait-name">The Barista</span>' +
            '<span class="trait-desc">You connect what others separate. People are your instrument.</span>' +
          '</button>' +
          '<button class="trait-btn" data-trait="shopkeeper">' +
            '<span class="trait-name">The Shopkeeper</span>' +
            '<span class="trait-desc">You remember what others forget. Objects hold their history.</span>' +
          '</button>' +
        '</div>' +
      '</div>';

    // Curated preview thoughts — the strongest from each trait
    const previewThoughts = {
      musician: 'The city plays itself. Nobody conducts.',
      photographer: 'Brick turns gold at this hour.',
      wanderer: 'Damp rises through the soles. Old damp.',
      barista: 'Two strangers. Same bench. Almost talking.',
      shopkeeper: 'Paint over paint over paint over wood.'
    };

    panel.querySelectorAll('[data-trait]').forEach(btn => {
      btn.addEventListener('click', () => {
        const trait = btn.dataset.trait;
        const traitName = trait.charAt(0).toUpperCase() + trait.slice(1);

        // Preview step — show a sample thought so the player knows how this trait feels
        panel.innerHTML =
          '<div class="creation-preview">' +
            '<p class="creation-text">The ' + traitName + '</p>' +
            '<p class="walking-thought" style="margin:1.2rem 0;">' + esc(previewThoughts[trait]) + '</p>' +
            '<p class="creation-text creation-delay-1">' + esc(traitConfirmation(trait)) + '</p>' +
            '<div style="display:flex;gap:1rem;margin-top:1.5rem;">' +
              '<button class="trait-confirm-btn creation-delay-2">Begin</button>' +
              '<button class="trait-back-btn creation-delay-2">Back</button>' +
            '</div>' +
          '</div>';

        panel.querySelector('.trait-confirm-btn').addEventListener('click', () => {
          Engine.audio.playDiscovery();
          State.set('trait', trait);
          Engine.setPlayerTrait(trait);
          State.set('createdAt', Date.now());
          State.set('firstPlay', false);
          State.visitLocation('flat');
          startGame();
        });

        panel.querySelector('.trait-back-btn').addEventListener('click', () => {
          showTraitSelection();
        });
      });
    });
  }

  function startGame() {
    Engine.setState('playing');
    const period = Game.getTimePeriod();
    Engine.setTimePeriod(period);
    Engine.setLocation('flat');

    // First walking thought
    showWalkingThought(Game.content.thoughts.first, () => {
      showLocation();
    });
  }

  // --- Walking Thought ---

  function showWalkingThought(text, onDone) {
    panel.innerHTML = '<p class="walking-thought">' + esc(text) + '</p>';
    // Duration scales with text length: short thoughts breathe, long ones linger
    const words = text.split(' ').length;
    const duration = Math.max(1800, Math.min(3500, words * 350));
    let done = false;
    const finish = () => { if (!done) { done = true; onDone(); } };
    setTimeout(finish, duration);
    // Miyamoto: tap to dismiss — player's hand moves at the speed of their mind
    panel.addEventListener('click', finish, { once: true });
  }

  // --- Location View ---

  function showLocation() {
    const locId = State.get('location');
    const loc = Game.getLocation(locId);
    if (!loc) return;

    const period = Game.getTimePeriod();
    Engine.setTimePeriod(period);
    Engine.setLocation(locId);

    const adjacent = Game.getAdjacentLocations(locId);
    const npcs = Game.getNpcsAtLocation(locId);

    // Tell engine which NPCs are visible for sprite rendering
    const visibleNpcs = {};
    for (const entry of npcs) {
      if (entry.available) visibleNpcs[entry.id] = true;
    }
    Engine.setLocationNpcs(visibleNpcs);

    // Set ambient soundscape for this location
    if (loc.musicLayer) Engine.audio.setAmbient(loc.musicLayer);

    // The Watcher appears when awareness >= 5, with random chance
    const awareness = (State.get('stats') || {}).awareness || 0;
    const forgetting = Game.isForgettingActive();
    Engine.setForgetting(forgetting);
    const isExterior = loc.type === 'exterior';
    const watcherVisible = !forgetting && awareness >= 5 && isExterior && Math.random() < 0.35;
    Engine.setWatcherVisible(watcherVisible);
    // Metzen: first Watcher sighting seeds the notebook
    if (watcherVisible && !State.get('watcherFirstSeen')) {
      State.set('watcherFirstSeen', true);
      State.recordDiscovery('watcher_sighting', { awareness: 1, resonance: 1 });
    }

    // Metzen: ambient life — the world breathes on return visits, not first encounters
    const isFirstVisit = State.getLocationVisitCount(locId) <= 1;

    // Walking thoughts already provide breathing room before location text.
    // No additional pause — the player should see content immediately.
    panel.innerHTML = '';
    (function _showLocationText() {

    const locNameClass = isFirstVisit ? 'location-name location-name-first' : 'location-name location-name-fade';
    let html = '<p class="' + locNameClass + '">' + esc(loc.name) + '<span class="time-indicator">' + esc(period) + '</span></p>';

    // Post-discovery enrichment — location acknowledges what you've noticed
    const trait = State.get('trait');
    const visibleDetails = (loc.interactableDetails || []).filter(d => !d.trait_required || d.trait_required === trait);
    const locDiscoveries = visibleDetails.filter(d => State.isDiscovered(d.id));
    const discoveryCount = locDiscoveries.length;
    const totalDetails = visibleDetails.length;

    const locTextClass = forgetting ? 'location-text forgetting-muted' : 'location-text';
    if (discoveryCount > 0 && discoveryCount >= totalDetails && totalDetails > 0) {
      html += '<p class="' + locTextClass + '">' + esc(loc.body) + '</p>';
      html += '<p class="loc-known">You know this place now. Every surface has spoken.</p>';
    } else if (discoveryCount >= 2) {
      html += '<p class="' + locTextClass + '">' + esc(loc.body) + '</p>';
      html += '<p class="loc-known">Familiar ground. You see what others walk past.</p>';
    } else {
      html += '<p class="' + locTextClass + '">' + esc(loc.body) + '</p>';
    }

    // Metzen: post-investigation world scars — the world carries consequences
    const investigations = State.get('investigations') || {};
    if (locId === 'L02' && investigations['LI-02'] && investigations['LI-02'].complete) {
      const choice = investigations['LI-02'].choiceMade;
      if (choice === 'tell') {
        html += '<p class="loc-known">The barista is quieter today. No humming.</p>';
      } else if (choice === 'silence') {
        html += '<p class="loc-known">The melody drifts from behind the counter. Still.</p>';
      }
    }
    if (locId === 'L04' && investigations['LI-01'] && investigations['LI-01'].complete) {
      html += '<p class="loc-known">The printouts are still pinned. The canal route map faces the wall now.</p>';
    }

    // Tell engine about discovered detail hitboxes for visual markers
    if (typeof Engine.setDiscoveredDetails === 'function') {
      Engine.setDiscoveredDetails(locDiscoveries.map(d => d.hitbox));
    }
    // Meier: tell engine if there are undiscovered details (for tap ring colour)
    if (typeof Engine.setHasUndiscovered === 'function') {
      Engine.setHasUndiscovered(discoveryCount < totalDetails);
    }

    // Miyamoto: interactive elements first — NPCs before atmosphere
    // Time-closed locations show a note
    if (!Game.isLocationAvailable(locId)) {
      html += '<p class="location-closed">This place is quiet now.</p>';
    }
    // NPCs present
    for (const entry of npcs) {
      if (entry.available) {
        html += '<button class="npc-btn" data-npc="' + esc(entry.id) + '">' + esc(entry.npc.name) + '</button>';
      } else {
        html += '<p class="npc-absent">' + esc(entry.npc.schedule.unavailable_reason || 'They\'re not here right now.') + '</p>';
      }
    }

    // Weather-specific description (from location JSON)
    const weather = Game.getWeather();
    if (loc.weatherEffects && loc.weatherEffects[weather] && !isFirstVisit) {
      html += '<p class="weather-text">' + esc(loc.weatherEffects[weather]) + '</p>';
    }

    // Metzen: ambient life — the world breathes on return visits, not first encounters
    // Ueda: 15% — each ambient moment should feel like a gift, not chatter
    // Suppressed during Forgetting and on first visit
    if (!forgetting && !isFirstVisit && loc.ambientLife && loc.ambientLife.length > 0 && Math.random() < 0.15) {
      const key = loc.ambientLife[Math.floor(Math.random() * loc.ambientLife.length)];
      const text = AMBIENT_TEXTS[key];
      if (text) html += '<p class="ambient-encounter">' + esc(text) + '</p>';
    }

    // Time-of-day communicated through canvas palette and ambient audio

    // Ueda: Forgetting text removed — the desaturation overlay IS the feeling

    // Night Fox — appears at L10 and L01 at dusk/night
    if (!forgetting && !isFirstVisit && (locId === 'L10' || locId === 'L01') && (period === 'evening' || period === 'night') && Math.random() < 0.35) {
      html += '<p class="ambient-encounter">A fox sits at the edge of the light. It watches you. It doesn\'t leave.</p>';
    }

    // Street Preacher — rare appearances at L03 and L05
    if (!forgetting && !isFirstVisit && (locId === 'L03' || locId === 'L05') && period === 'afternoon' && Math.random() < 0.15) {
      const preacherLines = locId === 'L03'
        ? 'A man stands by the churchyard gate. He speaks to no one. "The stones remember. The water remembers. Only we choose to forget."'
        : 'A voice from the corner, unhurried. "This pub was here before the street. The street was here before the city. The city was here before the name."';
      html += '<p class="ambient-encounter">' + preacherLines + '</p>';
    }

    if (adjacent.length) {
      html += '<div class="nav-buttons">';
      for (const adj of adjacent) {
        const available = Game.isLocationAvailable(adj.id);
        html += '<button class="nav-btn' + (available ? '' : ' nav-closed') + '" data-loc="' + esc(adj.id) + '">' + esc(adj.name) + '</button>';
      }
      html += '</div>';
    }

    // Boundary teasers at edge locations
    if (locId === 'L08') {
      html += '<p class="boundary-text">The tracks continue east. Greenwich. Bermondsey. More of London is coming.</p>';
    } else if (locId === 'L10') {
      html += '<p class="boundary-text">The road goes on. Other neighbourhoods. Other stories. Soon.</p>';
    }

    // Flat: evolving description + accumulated objects
    if (locId === 'flat') {
      const totalDiscoveries = (State.get('discoveries') || []).length;
      const npcsMet = Object.keys(State.get('npcMemory') || {}).filter(id => State.getNpcMemory(id).visitCount > 0).length;
      if (totalDiscoveries >= 10 && npcsMet >= 4) {
        html += '<p class="flat-evolution">The flat feels different now. Warmer. The notebook is thick with observations. The window shows a city you recognise.</p>';
      } else if (totalDiscoveries >= 5 || npcsMet >= 2) {
        html += '<p class="flat-evolution">The table has your things on it now. Notes. Impressions. This is becoming yours.</p>';
      }

      const objects = State.get('flatObjects') || [];
      if (objects.length > 0) {
        html += '<div class="flat-objects">';
        for (const obj of objects) {
          html += '<p class="flat-object">' + esc(obj.description) + '</p>';
        }
        html += '</div>';
      }
    }

    // Ueda: canvas hint removed — the tap ring teaches through play

    // Notebook — always available
    html += '<button class="notebook-btn" data-tab="people">Notebook</button>';

    panel.innerHTML = html;
    panel.classList.add(locId === 'flat' ? 'scene-fade-warm' : 'scene-fade');
    panel.addEventListener('animationend', () => {
      panel.classList.remove('scene-fade', 'scene-fade-warm');
    }, { once: true });

    // Check investigation triggers
    const triggered = Game.checkInvestigationTriggers();
    if (triggered.length > 0) {
      showInvestigationStep(triggered[0]);
      return;
    }

    // Check if any active investigation has a pending choice
    const active = Game.getActiveInvestigations();
    for (const a of active) {
      const choice = Game.getInvestigationChoice(a.id);
      if (choice) {
        showInvestigationChoice(a.id, a.investigation, choice);
        return;
      }
    }

    // Check for lore fragment at this location
    const fragment = Game.checkFragmentAtLocation(locId);
    if (fragment) {
      setTimeout(() => {
        if (State.get('location') === locId) showFragment(fragment);
      }, 3000);
    }

    // First discovery shimmer — teach the player to tap (flat, first time, zero discoveries)
    if (locId === 'flat' && (State.get('discoveries') || []).length === 0) {
      const loc_ = Game.getLocation('flat');
      if (loc_ && loc_.interactableDetails && loc_.interactableDetails.length > 0) {
        Engine.setFirstShimmer(loc_.interactableDetails[0].hitbox);
      }
    }

    // Canvas tap → discovery (new) or memory (already found)
    Engine.onCanvasTap((cx, cy) => {
      const detail = Game.checkDetailAt(cx, cy);
      if (detail) {
        const isNew = Game.discoverDetail(detail);
        if (isNew) {
          Engine.audio.playDiscovery();
          showDiscovery(detail);
        }
      } else {
        // Check if tapping a previously discovered detail
        const remembered = Game.checkDiscoveredDetailAt(cx, cy);
        if (remembered) {
          showRemembered(remembered);
        } else {
          // Empty tap — faint knock teaches that tapping is valid
          Engine.audio.playEmptyTap();
        }
      }
    });

    // NPC interaction (one conversation per location visit)
    let _talkingTo = null;
    panel.querySelectorAll('.npc-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (_talkingTo) return;
        _talkingTo = btn.dataset.npc;
        const result = Game.interactWithNpc(btn.dataset.npc);
        if (result) {
          Engine.audio.playNpcGreet();
          // Living Conversations: if AI enabled, try to get AI-generated dialogue
          if (typeof AI !== 'undefined' && AI.isEnabled()) {
            const aiLine = await AI.chat(
              result.npc, result.stage, State.get('trait'),
              null, result.line.text
            );
            if (aiLine) result.line = { text: aiLine, tag: result.line.tag };
          }
          showDialogue(result);
        }
      });
    });

    // Navigation
    panel.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.loc;
        const result = Game.navigate(targetId);
        // Roll weather (persists across multiple navigations)
        const prevWeather = Game.getWeather();
        const newWeather = Game.rollWeather();
        Engine.setRaining(newWeather === 'rain');
        // Only toggle audio when weather actually changes
        if (newWeather !== prevWeather) {
          if (newWeather === 'rain') Engine.audio.startRain();
          else Engine.audio.stopRain();
        }

        if (result) {
          // Canvas fade transition — the darkness between places
          Engine.fadeTransition(() => {
            Engine.setLocation(targetId);
            Engine.setTimePeriod(Game.getTimePeriod());
          });

          // Return-to-flat reflections — unique thoughts when coming home after milestones
          let thought = result.thought;
          if (targetId === 'flat') {
            const reflections = getHomeReflection();
            if (reflections) thought = reflections;
          }

          if (thought) {
            showWalkingThought(thought, () => showLocation());
          } else {
            showLocation();
          }
        } else {
          showLocation();
        }
      });
    });

    // Notebook
    const nbBtn = panel.querySelector('.notebook-btn');
    if (nbBtn) {
      nbBtn.addEventListener('click', () => showNotebook('people'));
    }

    })(); // end _showLocationText
  }

  // --- Lore Fragment ---

  function showFragment(fragment) {
    Engine.onCanvasTap(null);
    Engine.audio.playFragmentSound ? Engine.audio.playFragmentSound() : Engine.audio.playInvestigation();
    Game.discoverFragment(fragment.id);

    let html = '<p class="fragment-title">' + esc(fragment.title) + '</p>';
    html += '<p class="fragment-text">' + esc(fragment.text) + '</p>';
    // Ueda: XP notification removed — the fragment speaks for itself
    html += '<button class="discovery-back-btn">...' + (_seenEllipsis ? '' : '<span class="ellipsis-hint">continue</span>') + '</button>';

    panel.innerHTML = html;

    panel.querySelector('.discovery-back-btn').addEventListener('click', () => {
      _seenEllipsis = true;
      showLocation();
    });
  }

  // --- Discovery ---

  function showDiscovery(detail) {
    Engine.onCanvasTap(null); // disable tap during discovery
    const stats = State.get('stats');

    let html = '<p class="discovery-text">' + esc(detail.discovery_text) + '</p>';
    // Ueda: XP notification removed — the discovery is the reward
    html += '<button class="discovery-back-btn">...' + (_seenEllipsis ? '' : '<span class="ellipsis-hint">continue</span>') + '</button>';

    if (typeof Engine.flashDiscovery === 'function') {
      Engine.flashDiscovery(detail.hitbox, detail.discovery_text);
    }
    panel.innerHTML = html;

    panel.querySelector('.discovery-back-btn').addEventListener('click', () => {
      _seenEllipsis = true;
      showLocation();
    });
  }

  // --- Remembered Detail (re-tap) ---

  function showRemembered(detail) {
    Engine.onCanvasTap(null);
    let html = '<p class="remembered-text">' + esc(detail.description) + '</p>';
    html += '<button class="discovery-back-btn">...</button>';
    panel.innerHTML = html;
    panel.querySelector('.discovery-back-btn').addEventListener('click', () => showLocation());
  }

  // --- NPC Dialogue ---

  function showDialogue(result) {
    Engine.onCanvasTap(null); // disable tap during dialogue
    const { line, stage, stageChanged, npc, forgetting } = result;

    // Ueda: no stage-shift text, no proximity hint — the dialogue IS the shift
    let html = '<p class="npc-name">' + esc(npc.name) + '</p>';
    html += '<p class="npc-dialogue">' + esc(line.text) + '</p>';
    // During Forgetting, physical signatures blur — you can't hold onto the details
    if (forgetting) {
      html += '<p class="npc-physical">Something familiar about them. You can\'t place it.</p>';
    } else {
      const sig = npc.physicalSignature || '';
      const details = sig.split('. ').filter(s => s).map(s => s.replace(/\.$/, ''));
      if (details.length === 0) details.push('');
      html += '<p class="npc-physical">' + esc(details[Math.floor(Math.random() * details.length)]) + '.</p>';
    }
    html += '<button class="dialogue-back-btn">...' + (_seenEllipsis ? '' : '<span class="ellipsis-hint">continue</span>') + '</button>';

    panel.innerHTML = html;

    panel.querySelector('.dialogue-back-btn').addEventListener('click', () => {
      _seenEllipsis = true;
      showLocation();
    });
  }

  // --- Investigation ---

  function showInvestigationStep(triggered) {
    Engine.onCanvasTap(null);
    Engine.audio.playInvestigationReveal ? Engine.audio.playInvestigationReveal() : Engine.audio.playInvestigation();
    const step = triggered.step;

    let html = '';
    // Meier: distinguish new investigation from continuation
    if (step.id === 1) {
      html += '<p class="stage-shift">A thread appears.</p>';
    }
    html += '<p class="inv-name">' + esc(triggered.investigation.name) + '</p>';
    html += '<p class="inv-step-text">' + esc(step.text) + '</p>';
    html += '<button class="inv-continue-btn">...</button>';

    panel.innerHTML = html;

    panel.querySelector('.inv-continue-btn').addEventListener('click', () => {
      showLocation();
    });
  }

  function showInvestigationChoice(invId, investigation, choice) {
    Engine.onCanvasTap(null);
    Engine.audio.playChoice();

    // Ueda: show prompt first, delay choice buttons to give weight to the decision
    let html = '<p class="inv-name">' + esc(investigation.name) + '</p>';
    html += '<p class="inv-choice-prompt">' + esc(choice.prompt) + '</p>';
    html += '<div class="inv-choices" style="display:none">';
    for (const option of choice.options) {
      html += '<button class="inv-choice-btn" data-choice="' + esc(option.id) + '">' + esc(option.text) + '</button>';
    }
    html += '</div>';

    panel.innerHTML = html;

    let _choiceRevealed = false;
    function _revealChoices() {
      if (_choiceRevealed) return;
      _choiceRevealed = true;
      panel.removeEventListener('click', _revealChoices);
      const choicesDiv = panel.querySelector('.inv-choices');
      if (choicesDiv) {
        choicesDiv.style.display = '';
        choicesDiv.classList.add('inv-choices-fade');
      }
      _bindChoiceButtons();
    }

    function _bindChoiceButtons() {
      panel.querySelectorAll('.inv-choice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const consequence = Game.makeInvestigationChoice(invId, btn.dataset.choice);
          if (consequence) showConsequence(investigation, consequence);
        });
      });
    }

    const _choiceTimer = setTimeout(_revealChoices, 3000);
    // Tap panel to skip the wait
    panel.addEventListener('click', function _onChoiceTap() {
      clearTimeout(_choiceTimer);
      _revealChoices();
    }, { once: true });
  }

  function showConsequence(investigation, consequence) {
    let html = '<p class="inv-name">' + esc(investigation.name) + '</p>';
    html += '<p class="inv-consequence">' + esc(consequence.narrativeText) + '</p>';

    // Ueda: XP notification removed — the consequence text is the reward

    html += '<button class="inv-continue-btn">...</button>';

    panel.innerHTML = html;

    panel.querySelector('.inv-continue-btn').addEventListener('click', () => {
      showLocation();
    });
  }

  // --- Notebook ---

  function showNotebook(tab) {
    Engine.onCanvasTap(null);
    let html = '<div class="notebook">';
    html += '<p class="notebook-title">Notebook</p>';
    html += '<div class="notebook-tabs">';
    html += '<button class="notebook-tab' + (tab === 'people' ? ' tab-active' : '') + '" data-tab="people">People</button>';
    html += '<button class="notebook-tab' + (tab === 'mysteries' ? ' tab-active' : '') + '" data-tab="mysteries">Mysteries</button>';
    html += '<button class="notebook-tab' + (tab === 'places' ? ' tab-active' : '') + '" data-tab="places">Places</button>';
    html += '<button class="notebook-tab' + (tab === 'lore' ? ' tab-active' : '') + '" data-tab="lore">Lore</button>';
    html += '<button class="notebook-tab' + (tab === 'me' ? ' tab-active' : '') + '" data-tab="me">Me</button>';
    html += '</div>';

    if (tab === 'people') {
      html += '<div class="notebook-content">';
      const npcs = Game.content.npcs;
      let hasEntries = false;
      for (const [id, npc] of Object.entries(npcs)) {
        const mem = State.getNpcMemory(id);
        if (mem.visitCount === 0) continue;
        hasEntries = true;
        html += '<div class="notebook-entry">';
        html += '<p class="notebook-npc-name">' + esc(npc.name) + '</p>';
        html += '<p class="notebook-npc-stage">' + esc(mem.stage) + '</p>';
        html += '<p class="notebook-npc-visits">' + mem.visitCount + ' visit' + (mem.visitCount !== 1 ? 's' : '') + '</p>';
        html += '</div>';
      }
      if (!hasEntries) {
        html += '<p class="notebook-empty">No one yet.</p>';
      }
      html += '</div>';
    }

    if (tab === 'mysteries') {
      html += '<div class="notebook-content">';
      const active = Game.getActiveInvestigations();
      if (active.length === 0) {
        html += '<p class="notebook-empty">Nothing yet.</p>';
      }
      for (const a of active) {
        html += '<div class="notebook-entry">';
        html += '<p class="notebook-npc-name">' + esc(a.investigation.name) + '</p>';
        const steps = a.investigation.steps || [];
        const currentStep = a.state.currentStep || 1;
        for (let i = 0; i < steps.length; i++) {
          const stepNum = i + 1;
          if (a.state.complete || stepNum < currentStep) {
            html += '<p class="notebook-inv-step notebook-inv-past">' + esc(steps[i].text) + '</p>';
          } else if (stepNum === currentStep) {
            html += '<p class="notebook-inv-step notebook-inv-current">' + esc(steps[i].text) + '</p>';
          } else if (stepNum === currentStep + 1 && steps[i].advanceTrigger && steps[i].advanceTrigger.type === 'detail') {
            // Meier: cryptic breadcrumb for the next step
            const detailId = steps[i].advanceTrigger.detail;
            const allLocs = Object.values(Game.content.locations);
            let hint = '';
            for (const loc of allLocs) {
              const d = (loc.interactableDetails || []).find(dd => dd.id === detailId);
              if (d) { hint = d.description; break; }
            }
            html += '<p class="notebook-inv-step notebook-inv-locked">' + (hint ? esc(hint) : '···') + '</p>';
          } else {
            html += '<p class="notebook-inv-step notebook-inv-locked">···</p>';
          }
        }
        if (a.state.complete) {
          html += '<p class="notebook-npc-stage">resolved</p>';
        }
        html += '</div>';
      }
      html += '</div>';
    }

    if (tab === 'places') {
      html += '<div class="notebook-content">';
      const visited = State.get('visitedLocations') || [];
      if (visited.length === 0) {
        html += '<p class="notebook-empty">Nowhere yet.</p>';
      }
      for (const locId of visited) {
        const loc = Game.getLocation(locId);
        if (!loc) continue;
        html += '<div class="notebook-entry">';
        html += '<p class="notebook-npc-name">' + esc(loc.name) + '</p>';
        const discoveries = (loc.interactableDetails || []).filter(d => State.isDiscovered(d.id));
        if (discoveries.length > 0) {
          for (const d of discoveries) {
            html += '<p class="notebook-inv-step">' + esc(d.discovery_text || d.description || '') + '</p>';
          }
        }
        html += '</div>';
      }
      html += '</div>';
    }

    if (tab === 'lore') {
      html += '<div class="notebook-content">';
      const frags = Game.content.fragments || {};
      let hasFrags = false;
      for (const [id, frag] of Object.entries(frags)) {
        if (!State.get('discoveries').includes('frag_' + id)) continue;
        hasFrags = true;
        html += '<div class="notebook-entry">';
        html += '<p class="notebook-npc-name">' + esc(frag.title) + '</p>';
        html += '<p class="notebook-inv-step">' + esc(frag.text) + '</p>';
        html += '</div>';
      }
      if (!hasFrags) {
        html += '<p class="notebook-empty">No fragments found.</p>';
      }
      html += '</div>';
    }

    if (tab === 'me') {
      html += '<div class="notebook-content">';
      const stats = State.get('stats') || {};
      const trait = State.get('trait') || 'unknown';
      const discoveries = State.get('discoveries') || [];
      const visitedLocs = State.get('visitedLocations') || [];
      const npcMem = State.get('npcMemory') || {};
      const createdAt = State.get('createdAt');

      // Identity
      html += '<div class="notebook-entry journal-identity">';
      html += '<p class="notebook-npc-name">The ' + esc(trait.charAt(0).toUpperCase() + trait.slice(1)) + '</p>';

      // Days in Limehouse
      if (createdAt) {
        const days = Math.max(1, Math.floor((Date.now() - createdAt) / 86400000));
        html += '<p class="journal-stat">You have been in Limehouse for ' + days + ' day' + (days !== 1 ? 's' : '') + '.</p>';
      }

      // Discovery count as narrative
      const discCount = discoveries.length;
      if (discCount === 0) {
        html += '<p class="journal-stat">You haven\'t noticed anything yet.</p>';
      } else if (discCount <= 3) {
        html += '<p class="journal-stat">You have noticed ' + discCount + ' thing' + (discCount !== 1 ? 's' : '') + ' others walked past.</p>';
      } else if (discCount <= 8) {
        html += '<p class="journal-stat">You have noticed ' + discCount + ' things. The city is opening.</p>';
      } else {
        html += '<p class="journal-stat">' + discCount + ' things noticed. Limehouse sees you differently now.</p>';
      }

      // NPCs met as narrative
      const npcsMet = Object.keys(npcMem).filter(id => npcMem[id] && npcMem[id].visitCount > 0);
      if (npcsMet.length === 0) {
        html += '<p class="journal-stat">No one knows your face yet.</p>';
      } else if (npcsMet.length <= 2) {
        html += '<p class="journal-stat">' + npcsMet.length + ' people recognise you.</p>';
      } else {
        html += '<p class="journal-stat">' + npcsMet.length + ' people know your face. You belong here now.</p>';
      }

      // Places explored
      if (visitedLocs.length > 0) {
        html += '<p class="journal-stat">' + visitedLocs.length + ' place' + (visitedLocs.length !== 1 ? 's' : '') + ' explored.</p>';
      }
      html += '</div>';

      // Stats as descriptive text
      html += '<div class="notebook-entry">';
      html += '<p class="notebook-npc-name">Your Senses</p>';
      const statDescs = {
        awareness: ['Dormant', 'Stirring', 'Sharpening', 'Attuned', 'Piercing'],
        connection: ['Isolated', 'Reaching', 'Entwined', 'Rooted', 'Woven'],
        insight: ['Surface', 'Scratching', 'Deepening', 'Penetrating', 'Illuminated'],
        resonance: ['Silent', 'Humming', 'Vibrating', 'Resonant', 'Harmonic']
      };
      for (const [stat, levels] of Object.entries(statDescs)) {
        const val = stats[stat] || 0;
        const tier = Math.min(levels.length - 1, Math.floor(val / 4));
        if (val > 0) {
          html += '<p class="journal-sense"><span class="journal-sense-name">' + esc(stat) + '</span> <span class="journal-sense-level">' + esc(levels[tier]) + '</span></p>';
        }
      }
      html += '</div>';

      // Milestones
      const milestones = [];
      if (discoveries.length >= 1) milestones.push('First detail noticed');
      if (npcsMet.length >= 1) milestones.push('First conversation');
      if (discoveries.filter(d => d.startsWith('frag_')).length >= 1) milestones.push('First lore fragment found');
      if (visitedLocs.length >= 5) milestones.push('Five places walked');
      if (visitedLocs.length >= 10) milestones.push('All of Limehouse explored');
      if (npcsMet.length >= 5) milestones.push('Five faces known');
      if (discoveries.length >= 10) milestones.push('Ten things noticed');
      if (discoveries.length >= 20) milestones.push('The city speaks to you now');
      if ((stats.awareness || 0) >= 10) milestones.push('Awareness: Piercing');

      if (milestones.length > 0) {
        html += '<div class="notebook-entry">';
        html += '<p class="notebook-npc-name">Milestones</p>';
        for (const m of milestones) {
          html += '<p class="journal-milestone">' + esc(m) + '</p>';
        }
        html += '</div>';
      }

      // Flat objects
      const objects = State.get('flatObjects') || [];
      if (objects.length > 0) {
        html += '<div class="notebook-entry">';
        html += '<p class="notebook-npc-name">The Flat</p>';
        for (const obj of objects) {
          html += '<p class="notebook-inv-step">' + esc(obj.description) + '</p>';
        }
        html += '</div>';
      }

      // AI settings link
      if (typeof AI !== 'undefined') {
        html += '<div class="notebook-entry">';
        html += '<button class="ai-settings-btn">Living Conversations' + (AI.isEnabled() ? ' · On' : '') + '</button>';
        html += '</div>';
      }

      html += '</div>';
    }

    html += '<button class="notebook-close-btn">Close</button>';
    html += '</div>';

    panel.innerHTML = html;

    panel.querySelector('.notebook-close-btn').addEventListener('click', () => showLocation());
    panel.querySelectorAll('.notebook-tab').forEach(btn => {
      btn.addEventListener('click', () => showNotebook(btn.dataset.tab));
    });

    // AI settings button
    const aiBtn = panel.querySelector('.ai-settings-btn');
    if (aiBtn) aiBtn.addEventListener('click', () => showAiSettings());
  }

  // --- AI Settings ---

  function showAiSettings() {
    const providers = AI.getProviders();
    const currentProvider = AI.getProvider();
    const enabled = AI.isEnabled();

    let html = '<div class="notebook"><p class="notebook-title">Living Conversations</p>';
    html += '<div class="notebook-content">';

    html += '<p class="journal-stat" style="margin-bottom:1rem;">NPCs can speak with their own voice using an AI provider. You supply the key. It never leaves your browser.</p>';

    // Provider select
    html += '<div class="notebook-entry">';
    html += '<p class="notebook-npc-name">Provider</p>';
    html += '<select id="ai-provider" style="background:#1a1a20;border:1px solid rgba(200,180,140,0.12);color:#c8b8a0;font-family:\'Courier New\',monospace;font-size:16px;padding:0.4rem;width:100%;margin-top:0.4rem;">';
    for (const p of providers) {
      html += '<option value="' + esc(p.key) + '"' + (p.key === currentProvider ? ' selected' : '') + '>' + esc(p.name) + '</option>';
    }
    html += '</select>';
    html += '</div>';

    // Model select
    html += '<div class="notebook-entry">';
    html += '<p class="notebook-npc-name">Model</p>';
    html += '<select id="ai-model" style="background:#1a1a20;border:1px solid rgba(200,180,140,0.12);color:#c8b8a0;font-family:\'Courier New\',monospace;font-size:16px;padding:0.4rem;width:100%;margin-top:0.4rem;">';
    const firstProvider = providers.find(p => p.key === currentProvider) || providers[0];
    for (const m of firstProvider.models) {
      html += '<option value="' + esc(m) + '">' + esc(m) + '</option>';
    }
    html += '</select>';
    html += '</div>';

    // API key
    html += '<div class="notebook-entry">';
    html += '<p class="notebook-npc-name">API Key</p>';
    html += '<input id="ai-key" type="password" placeholder="paste your key" style="background:#1a1a20;border:1px solid rgba(200,180,140,0.12);color:#c8b8a0;font-family:\'Courier New\',monospace;font-size:16px;padding:0.4rem;width:100%;margin-top:0.4rem;">';
    html += '</div>';

    // Status
    html += '<div class="notebook-entry" id="ai-status">';
    if (enabled) {
      html += '<p class="journal-stat" style="color:#6a8a6a;">Connected</p>';
    }
    html += '</div>';

    // Buttons
    html += '<div style="display:flex;gap:0.5rem;margin-top:0.8rem;">';
    html += '<button class="notebook-btn" id="ai-save">Save</button>';
    html += '<button class="notebook-btn" id="ai-test">Test</button>';
    if (enabled) {
      html += '<button class="notebook-btn" id="ai-disable" style="color:#8a4a4a;">Disable</button>';
    }
    html += '</div>';

    html += '</div>';
    html += '<button class="notebook-close-btn" id="ai-back">Back</button>';
    html += '</div>';

    panel.innerHTML = html;

    // Update models when provider changes
    const providerSel = document.getElementById('ai-provider');
    const modelSel = document.getElementById('ai-model');
    providerSel.addEventListener('change', () => {
      const prov = providers.find(p => p.key === providerSel.value);
      if (prov) {
        modelSel.innerHTML = prov.models.map(m => '<option value="' + esc(m) + '">' + esc(m) + '</option>').join('');
      }
    });

    // Save
    document.getElementById('ai-save').addEventListener('click', () => {
      const key = document.getElementById('ai-key').value.trim();
      if (!key) return;
      const ok = AI.configure(providerSel.value, modelSel.value, key);
      const status = document.getElementById('ai-status');
      status.innerHTML = ok
        ? '<p class="journal-stat" style="color:#6a8a6a;">Saved</p>'
        : '<p class="journal-stat" style="color:#8a4a4a;">Invalid provider</p>';
    });

    // Test
    document.getElementById('ai-test').addEventListener('click', async () => {
      const key = document.getElementById('ai-key').value.trim();
      if (key) AI.configure(providerSel.value, modelSel.value, key);
      const status = document.getElementById('ai-status');
      status.innerHTML = '<p class="journal-stat">Testing...</p>';
      const result = await AI.testConnection();
      status.innerHTML = result.ok
        ? '<p class="journal-stat" style="color:#6a8a6a;">Connected</p>'
        : '<p class="journal-stat" style="color:#8a4a4a;">' + esc(result.error || 'Failed') + '</p>';
    });

    // Disable
    const disableBtn = document.getElementById('ai-disable');
    if (disableBtn) {
      disableBtn.addEventListener('click', () => {
        AI.disable();
        showNotebook('me');
      });
    }

    // Back
    document.getElementById('ai-back').addEventListener('click', () => showNotebook('me'));
  }

  function getHomeReflection() {
    const discoveries = (State.get('discoveries') || []).length;
    const npcMem = State.get('npcMemory') || {};
    const npcsMet = Object.keys(npcMem).filter(id => npcMem[id] && npcMem[id].visitCount > 0).length;
    const investigations = State.get('investigations') || {};
    const anyComplete = Object.values(investigations).some(i => i.complete);
    const visitedLocs = (State.get('visitedLocations') || []).length;

    // Each reflection fires once, tracked by state
    const seen = State.get('homeReflections') || [];

    const check = (key, condition, text) => {
      if (condition && !seen.includes(key)) {
        const updated = [...seen, key];
        State.set('homeReflections', updated);
        return text;
      }
      return null;
    };

    // Priority order — most significant first
    return check('inv_complete', anyComplete, 'The flat is quieter now. You know something you didn\'t before.') ||
      check('five_npcs', npcsMet >= 5, 'Five people. Five faces that know yours. Limehouse isn\'t a place anymore. It\'s a neighbourhood.') ||
      check('ten_disc', discoveries >= 10, 'The notebook is getting heavy. Ten things noticed. The city is opening.') ||
      check('all_locs', visitedLocs >= 10, 'You\'ve walked every street. Every corner. The map is yours now.') ||
      check('three_npcs', npcsMet >= 3, 'Three people who know your name. More than you had before.') ||
      check('five_disc', discoveries >= 5, 'Five things. The flat feels different now. Warmer.') ||
      check('first_npc', npcsMet >= 1, _traitFirstNpc()) ||
      null;

    function _traitFirstNpc() {
      const trait = State.get('trait') || 'musician';
      const lines = {
        musician: 'Someone heard you today. That changes things.',
        photographer: 'Someone saw you looking. That changes things.',
        wanderer: 'Someone felt you pass. That changes things.',
        barista: 'Someone held your gaze. That changes things.',
        shopkeeper: 'Someone showed you something old. That changes things.'
      };
      return lines[trait] || 'Someone knows your face now. That changes things.';
    }
  }

  return { init, showLocation };
})();
