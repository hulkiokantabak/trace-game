/**
 * ui.js — DOM: dialogue display, notebook tabs, flat view, choices
 * Milestone 2: NPC dialogue, relationship stages, notebook People tab
 */
const UI = (() => {
  let panel;
  let _seenEllipsis = false;
  let _viewId = 0;
  let _aiSettingsReturnTo = null;
  let _typewriterTimer = null;

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

  function typewriterReveal(element, text, msPerWord, onComplete) {
    const words = text.split(' ');
    let idx = 0;
    let done = false;
    element.textContent = '';

    function finish() {
      if (done) return;
      done = true;
      clearTimeout(_typewriterTimer);
      panel.removeEventListener('click', skipHandler);
      element.textContent = text;
      if (onComplete) onComplete();
    }

    function addWord() {
      if (done) return;
      if (idx >= words.length) { finish(); return; }
      element.textContent = words.slice(0, ++idx).join(' ');
      _typewriterTimer = setTimeout(addWord, msPerWord);
    }

    // Tap to skip — only respond to clicks on the panel background or location text,
    // not on buttons (NPC, nav, etc.) to prevent click handler conflicts
    const skipHandler = (e) => {
      if (e.target !== panel && !e.target.classList.contains('location-text')) return;
      finish();
    };
    panel.addEventListener('click', skipHandler);

    addWord();
    return () => { finish(); };
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
    let html = '<button id="begin-btn">' + (hasSave ? 'Continue' : 'Begin') + '</button>';
    html += '<button id="title-settings-btn" class="title-settings">Settings</button>';
    panel.innerHTML = html;
    document.getElementById('begin-btn').addEventListener('click', () => onBegin(hasSave));
    document.getElementById('title-settings-btn').addEventListener('click', () => showTitleSettings(hasSave));
  }

  function showTitleSettings(hasSave) {
    ++_viewId;
    let html = '<div class="notebook">';
    html += '<p class="notebook-title">Settings</p>';
    html += '<div class="notebook-content">';

    // AI Configuration
    html += '<div class="notebook-entry settings-section">';
    html += '<p class="notebook-npc-name">Living Conversations</p>';
    html += '<p class="journal-stat">Connect an AI provider to give NPCs living voices. You supply the API key — it stays in your browser.</p>';
    if (typeof AI !== 'undefined' && AI.isEnabled()) {
      html += '<p class="settings-status settings-on">Connected</p>';
    } else {
      html += '<p class="settings-status settings-off">Not configured</p>';
    }
    html += '<button class="settings-action-btn" id="title-ai-btn">Configure AI</button>';
    html += '</div>';

    // About — in-world note from previous tenant
    html += '<div class="notebook-entry settings-section">';
    html += '<p class="notebook-npc-name">A Note From the Previous Tenant</p>';
    html += '<p class="journal-stat" style="line-height:1.8;color:#8a7a60;">The walls talk if you tap them. Not words — impressions. Details the eye skips. Tap the scene, not the text.</p>';
    html += '<p class="journal-stat" style="line-height:1.8;color:#8a7a60;">The people here are worth knowing. Visit them. Come back. They remember.</p>';
    html += '<p class="journal-stat" style="line-height:1.8;color:#8a7a60;">Walk slowly. Notice what others walk past. Write it down in the notebook.</p>';
    html += '<p class="journal-stat" style="line-height:1.8;color:#8a7a60;">Some things only appear in the rain. Some only at night. Some only after you\'ve seen enough.</p>';
    html += '<p class="journal-stat" style="line-height:1.8;color:#6a5a48;font-style:italic;margin-top:0.6rem;">Good luck with the flat. The radiator has a rhythm. — M.</p>';
    html += '</div>';

    html += '</div>';
    html += '<button class="notebook-close-btn" id="title-settings-back">Back</button>';
    html += '</div>';

    panel.innerHTML = html;

    document.getElementById('title-ai-btn').addEventListener('click', () => {
      // Reuse AI settings page but return to title settings
      showAiSettingsFrom('title', hasSave);
    });
    document.getElementById('title-settings-back').addEventListener('click', () => showTitle(hasSave));
  }

  function showAiSettingsFrom(source, hasSave) {
    // Store where to return to after AI settings
    _aiSettingsReturnTo = { source, hasSave };
    showAiSettings();
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
          greeting = npc ? npc.name + ' remembers you.' : 'The neighbourhood remembers you.';
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
    Engine.setTimePeriod('evening');

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
      showTraitObjects();
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

  // Trait objects on the flat table — player taps canvas to choose
  function showTraitObjects() {
    // Table in sceneFlat is drawn at x:120, y:100, w:55, h:32
    // Objects spread across the table surface
    // Objects are drawn by _drawTraitObject() in engine.js — hitboxes match those shapes
    const traitObjects = [
      { trait: 'musician',     x: 122, y: 102, w: 12, h: 14, label: 'A guitar pick',     index: 0 },
      { trait: 'photographer', x: 135, y: 101, w: 13, h: 14, label: 'A camera lens cap', index: 1 },
      { trait: 'wanderer',     x: 149, y: 103, w: 14, h: 9,  label: 'A worn shoelace',   index: 2 },
      { trait: 'barista',      x: 163, y: 102, w: 13, h: 14, label: 'A coffee cup',       index: 3 },
      { trait: 'shopkeeper',   x: 152, y: 113, w: 15, h: 12, label: 'A brass key',        index: 4 }
    ];

    Engine.setTraitObjects(traitObjects);

    // Show flat scene prompt — no buttons, player must tap the canvas
    panel.innerHTML =
      '<div class="creation-arrival">' +
        '<p class="creation-text">Your new flat. Evening light.</p>' +
        '<p class="creation-text creation-delay-1">Something on the table catches it.</p>' +
      '</div>';

    // Curated preview thoughts — the strongest from each trait
    const previewThoughts = {
      musician: 'The city plays itself. Nobody conducts.',
      photographer: 'Brick turns gold at this hour.',
      wanderer: 'Damp rises through the soles. Old damp.',
      barista: 'Two strangers. Same bench. Almost talking.',
      shopkeeper: 'Paint over paint over paint over wood.'
    };

    // Trait descriptions for the confirmation screen
    const traitDescs = {
      musician: 'You hear what others don\'t. The city is an instrument.',
      photographer: 'You see what others miss. Light tells you everything.',
      wanderer: 'You feel what others ignore. Every street has a temperature.',
      barista: 'You connect what others separate. People are your instrument.',
      shopkeeper: 'You remember what others forget. Objects hold their history.'
    };

    // Listen for canvas taps to detect trait object selection
    Engine.onCanvasTap(function traitTapHandler(cx, cy) {
      if (Engine.getState() !== 'character_creation') return;
      for (const obj of traitObjects) {
        // Generous hitbox — 4px padding around each object
        if (cx >= obj.x - 4 && cx <= obj.x + obj.w + 4 &&
            cy >= obj.y - 4 && cy <= obj.y + obj.h + 4) {
          Engine.audio.playDiscovery();
          showTraitConfirm(obj.trait, previewThoughts, traitDescs, obj.label);
          return;
        }
      }
    });
  }

  // Show trait confirmation after tapping an object on the table
  function showTraitConfirm(trait, previewThoughts, traitDescs, objectLabel) {
    const traitName = trait.charAt(0).toUpperCase() + trait.slice(1);
    const desc = previewThoughts[trait] || 'London waits.';
    const traitDesc = traitDescs[trait] || 'You notice what others miss.';

    panel.innerHTML =
      '<div class="creation-preview">' +
        '<p class="creation-text" style="opacity:0.6;margin-bottom:0.4rem;">' + esc(objectLabel) + '</p>' +
        '<p class="creation-text">The ' + esc(traitName) + '</p>' +
        '<p class="journal-stat" style="margin:0.3rem 0 0.8rem;">' + esc(traitDesc) + '</p>' +
        '<p class="walking-thought" style="margin:1.2rem 0;">' + esc(desc) + '</p>' +
        '<p class="creation-text creation-delay-1">' + esc(traitConfirmation(trait)) + '</p>' +
        '<div style="display:flex;gap:1rem;margin-top:1.5rem;">' +
          '<button class="trait-confirm-btn creation-delay-2">Begin</button>' +
          '<button class="trait-back-btn creation-delay-2">Back</button>' +
        '</div>' +
      '</div>';

    panel.querySelector('.trait-confirm-btn').addEventListener('click', () => {
      Engine.audio.playDiscovery();
      Engine.setTraitObjects(null);
      Engine.onCanvasTap(null);
      State.set('trait', trait);
      Engine.setPlayerTrait(trait);
      State.set('createdAt', Date.now());
      State.set('firstPlay', false);
      State.visitLocation('flat');
      startGame();
    });

    panel.querySelector('.trait-back-btn').addEventListener('click', () => {
      showTraitObjects();
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
    const tapHandler = () => finish();
    panel.addEventListener('click', tapHandler, { once: true });
    const tid = setTimeout(() => finish(), duration);
    function finish() {
      if (done) return;
      done = true;
      clearTimeout(tid);
      panel.removeEventListener('click', tapHandler);
      if (onDone) onDone();
    }
  }

  // --- Location View ---

  function showLocation() {
    const currentView = ++_viewId;
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
    // Pass stat levels to engine for Watcher scaling and ambient response
    if (typeof Engine.setAwarenessLevel === 'function') Engine.setAwarenessLevel(awareness);
    if (typeof Engine.setResonanceLevel === 'function') Engine.setResonanceLevel((State.get('stats') || {}).resonance || 0);
    const forgetting = Game.isForgettingActive();
    Engine.setForgetting(forgetting);
    const isExterior = loc.type === 'exterior';
    const watcherVisible = !forgetting && awareness >= 5 && isExterior && Math.random() < 0.35;
    Engine.setWatcherVisible(watcherVisible);
    // Metzen: first Watcher sighting seeds the notebook
    if (watcherVisible && !State.get('watcherFirstSeen')) {
      State.set('watcherFirstSeen', true);
      State.recordDiscovery('watcher_sighting', { awareness: 1, resonance: 1 });
      State.recordFlashbackMoment({ type: 'watcher', locationId: locId, timePeriod: Game.getTimePeriod(),
        text: 'The same figure. Different locations. Watching.',
        caption: 'They knew. They knew everything I knew.' });
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

    // Saramago: body sensation — one physical line, always shown, grounds the player in place
    if (loc.bodySensation && !forgetting) {
      html += '<p class="ambient-encounter">' + esc(loc.bodySensation) + '</p>';
    }

    // Metzen: mythological impression — shown only on first visit, a door left ajar
    if (isFirstVisit && loc.mythologicalImpression && !forgetting) {
      html += '<p class="ambient-encounter" style="font-style:italic;opacity:0.7;">' + esc(loc.mythologicalImpression) + '</p>';
    }

    // Metzen: permanent presence — always shown on return visits, accumulates meaning
    if (!isFirstVisit && loc.permanentPresence && !forgetting) {
      html += '<p class="ambient-encounter">' + esc(loc.permanentPresence) + '</p>';
    }

    // Mythological tide — shown subtly, no header, suppressed during Forgetting
    if (!forgetting) {
      const tide = (Game.getMythologicalTide) ? Game.getMythologicalTide() : null;
      const tideTexts = {
        restless: 'Something stirs. The air has more weight than usual.',
        deep:     null,  // Deep tide is silent — no text
        bright:   'The light is wrong today. More of it than there should be.',
        still:    'The quiet has arrived. The mythological layer rests.'
      };
      if (tide && tideTexts[tide]) {
        html += '<p class="npc-physical" style="color:#6a6050;font-style:italic;margin-top:0.8rem;font-size:0.85em;">' + esc(tideTexts[tide]) + '</p>';
      }
    }

    // City event — shown only at the event's relevant location (or all locations if location is null)
    // Suppressed during Forgetting
    if (!forgetting) {
      const event = (Game.getCurrentCityEvent) ? Game.getCurrentCityEvent() : null;
      if (event && (event.location === locId || event.location === null)) {
        const playerTrait = State.get('trait');
        if (!event.traitGated || event.traitGated === playerTrait) {
          html += '<p class="location-text" style="color:#8a7a5a;margin-top:1rem;border-top:1px solid #2a2318;padding-top:0.8rem;">' + esc(event.description) + '</p>';
        }
      }
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
    // LI-04: St Anne's After Dark — the shadow anomaly is now permanent
    if (locId === 'L03' && investigations['LI-04'] && investigations['LI-04'].complete) {
      html += '<p class="loc-known">The church shadow falls wrong even now. You stopped counting the sides.</p>';
    }
    // LI-08: The DLR Anomaly — the departure board remembers
    if (locId === 'L08' && investigations['LI-08'] && investigations['LI-08'].complete) {
      html += '<p class="loc-known">The departure board flickers. For a moment — MERIDIAN. Then it\'s gone.</p>';
    }
    // LI-12: The Watcher Noticed — every exterior carries the weight
    if (investigations['LI-12'] && investigations['LI-12'].complete && loc.type === 'exterior') {
      html += '<p class="loc-known" style="color:#5a5048;">The feeling of being watched has not gone away. It has become familiar.</p>';
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
      const closedHints = {
        morning: 'This place stirs later in the day.',
        afternoon: 'Come back when the light changes.',
        evening: 'This place sleeps before midnight.',
        night: 'This place wakes with the morning.'
      };
      html += '<p class="location-closed">' + esc(closedHints[period] || 'This place is quiet now.') + '</p>';
    }
    // NPC ghost lines — ambient memory of NPCs visited 3+ times who aren't present
    const NPC_GHOSTS = {
      barista: 'The counter still smells like her coffee. Warm.',
      sound_artist: 'Soldering flux lingers in the air. He was here.',
      pub_landlord: 'A glass ring on the bar. Still wet.',
      tattoo_artist: 'The needle buzz echoes. Or you imagine it does.',
      canal_painter: 'Paint flecks on the towpath wall. Fresh.',
      bike_courier: 'Tyre marks on the platform. Moving fast. Always.',
      nightclub_promoter: 'Cigarette smoke ghosts by the entrance.',
      street_preacher: 'The churchyard gate is open. Someone was speaking here.'
    };

    // NPCs present
    for (const entry of npcs) {
      if (entry.available) {
        html += '<button class="npc-btn" data-npc="' + esc(entry.id) + '">' + esc(entry.npc.name) + '</button>';
      } else {
        const npcMem = State.getNpcMemory(entry.id);
        if (npcMem.visitCount >= 3 && Math.random() < 0.15 && NPC_GHOSTS[entry.id]) {
          html += '<p class="ambient-encounter">' + esc(NPC_GHOSTS[entry.id]) + '</p>';
        } else {
          html += '<p class="npc-absent">' + esc(entry.npc.schedule.unavailable_reason || 'They\'re not here right now.') + '</p>';
        }
      }
    }

    // Ueda: silence when no NPC is present is correct — absence is information.
    // Location-specific passing-voice lines used only outdoors on first sessions.
    const allNpcMem = State.get('npcMemory') || {};
    const anyNpcMet = Object.keys(allNpcMem).some(id => allNpcMem[id] && allNpcMem[id].visitCount > 0);
    if (!anyNpcMet && !npcs.some(e => e.available)) {
      const PASSING_VOICES = {
        L01: 'Someone passes on the towpath. They nod.',
        L02: null,
        L03: 'Wind moves through the grass between the graves.',
        L04: null,
        L05: 'Voices inside. The door is closed.',
        L06: null,
        L07: 'A boat moves through the lock, slow and certain.',
        L08: 'The platform empties. A train departs.',
        L09: 'The market is setting up. Nobody ready yet.',
        L10: 'The lot is empty. It has been for a while.',
        flat: null
      };
      const voice = PASSING_VOICES[locId];
      if (voice) html += '<p class="ambient-encounter">' + esc(voice) + '</p>';
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
      html += '<p class="ambient-encounter">' + esc(preacherLines) + '</p>';
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

      if (Game.canLeaveLondon()) {
        html += '<p class="flat-evolution" style="color:#6a5a48;font-style:italic;margin-top:1.2rem;">The suitcase is by the door. You could leave.</p>';
        html += '<button class="leave-london-btn" id="leave-london">Pack your things.</button>';
      }
    }

    // Ueda: canvas hint removed — the tap ring teaches through play

    // Notebook & Settings — always available
    html += '<div class="bottom-actions">';
    html += '<button class="notebook-btn" data-tab="people">Notebook</button>';
    html += '<button class="settings-btn">Settings</button>';
    html += '</div>';

    panel.innerHTML = html;

    if (isFirstVisit) {
      const bodyEl = panel.querySelector('.location-text');
      if (bodyEl) {
        typewriterReveal(bodyEl, loc.body, 50);
      }
    }

    const fadeCls = locId === 'flat' ? 'scene-fade-warm' : 'scene-fade';
    panel.classList.add(fadeCls);
    const fadeCleanup = () => panel.classList.remove('scene-fade', 'scene-fade-warm');
    panel.addEventListener('animationend', fadeCleanup, { once: true });
    setTimeout(fadeCleanup, 1500);

    // Leave London button
    const leaveBtn = panel.querySelector('#leave-london');
    if (leaveBtn) {
      leaveBtn.addEventListener('click', () => showLeaveSequence());
    }

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
    // Delay longer on first visit so the typewriter finishes before fragment appears
    const fragment = Game.checkFragmentAtLocation(locId);
    const fragmentDelay = isFirstVisit ? 5000 : 3000;
    if (fragment) {
      setTimeout(() => {
        if (_viewId === currentView && State.get('location') === locId) showFragment(fragment);
      }, fragmentDelay);
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
          // Record first NPC connection for flashback montage
          if (result.stageChanged && result.stage === 'acquaintance') {
            State.recordFlashbackMoment({ type: 'first_npc', locationId: State.get('location'), timePeriod: Game.getTimePeriod(),
              text: result.npc.name + '. ' + (result.line.text || ''),
              caption: 'She remembered my name. First time.' });
          }
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
          Engine.audio.playNavigate();
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
            Engine.setWalkingThought(thought);
            // Wait for fade + thought (1.2s) + small buffer, then show location
            setTimeout(() => showLocation(), 1400);
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
      nbBtn.addEventListener('click', () => {
        Engine.audio.playNotebook();
        showNotebook('people');
      });
    }

    // Settings
    const settingsBtn = panel.querySelector('.settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => showSettings());
    }

    })(); // end _showLocationText
  }

  // --- Lore Fragment ---

  function showFragment(fragment) {
    Engine.onCanvasTap(null);
    Engine.audio.playFragmentSound ? Engine.audio.playFragmentSound() : Engine.audio.playInvestigation();
    Game.discoverFragment(fragment.id);
    const allFragsFound = (State.get('discoveries') || []).filter(d => d.startsWith('frag_')).length;
    if (allFragsFound === 0) {
      State.recordFlashbackMoment({ type: 'first_fragment', locationId: State.get('location'), timePeriod: Game.getTimePeriod(),
        text: fragment.text.length > 80 ? fragment.text.substring(0, 77) + '...' : fragment.text,
        caption: 'I read it three times. Then believed.' });
    }

    let html = '<p class="fragment-title">' + esc(fragment.title) + '</p>';
    html += '<p class="fragment-text">' + esc(fragment.text) + '</p>';
    // Ueda: XP notification removed — the fragment speaks for itself
    html += '<button class="discovery-back-btn">...' + (_seenEllipsis ? '' : '<span class="ellipsis-hint">continue</span>') + '</button>';

    panel.innerHTML = html;

    const fragmentEl = panel.querySelector('.fragment-text');
    if (fragmentEl) {
      typewriterReveal(fragmentEl, fragment.text, 40);
    }

    panel.querySelector('.discovery-back-btn').addEventListener('click', () => {
      _seenEllipsis = true;
      showLocation();
    });
  }

  // --- Discovery ---

  function showDiscovery(detail) {
    Engine.onCanvasTap(null); // disable tap during discovery
    const stats = State.get('stats');

    let html;
    const totalDisc = (State.get('discoveries') || []).length;
    if (totalDisc === 1) {
      // This is the very first discovery
      html = '<p class="discovery-text" style="color:#c8b8a0;">' + esc(detail.discovery_text) + '</p>';
      html += '<p class="npc-physical" style="color:#8a8a6a;font-style:italic;margin-top:0.8rem;">You notice what others walk past. This is what you do.</p>';
      html += '<button class="discovery-back-btn">...' + (_seenEllipsis ? '' : '<span class="ellipsis-hint">continue</span>') + '</button>';
    } else {
      // Normal discovery
      html = '<p class="discovery-text">' + esc(detail.discovery_text) + '</p>';
      // Ueda: XP notification removed — the discovery is the reward
      html += '<button class="discovery-back-btn">...' + (_seenEllipsis ? '' : '<span class="ellipsis-hint">continue</span>') + '</button>';
    }

    if (typeof Engine.flashDiscovery === 'function') {
      Engine.flashDiscovery(detail.hitbox, detail.discovery_text);
    }
    panel.innerHTML = html;

    const discoveryEl = panel.querySelector('.discovery-text');
    if (discoveryEl) {
      typewriterReveal(discoveryEl, detail.discovery_text, 45);
    }

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
    ++_viewId;
    Engine.onCanvasTap(null); // disable tap during dialogue
    const { line, stage, stageChanged, npc, forgetting } = result;

    // Saramago: body before words — you see the person before you hear them
    let html = '<p class="npc-name">' + esc(npc.name) + '</p>';
    // During Forgetting, physical signatures blur — you can't hold onto the details
    if (forgetting) {
      html += '<p class="npc-physical">Something familiar about them. You can\'t place it.</p>';
    } else {
      const sig = npc.physicalSignature || '';
      const details = sig.split('. ').filter(s => s.trim()).map(s => s.replace(/\.$/, ''));
      if (details.length > 0) {
        html += '<p class="npc-physical">' + esc(details[Math.floor(Math.random() * details.length)]) + '.</p>';
      }
    }
    // Guard: watcher stranger entry is "" — render nothing rather than an empty box
    if (line.text) {
      html += '<p class="npc-dialogue">' + esc(line.text) + '</p>';
    }
    if (result.nearStageShift) {
      html += '<p class="npc-physical" style="color:#6a6a58;font-style:italic;">Something shifts in the way they look at you.</p>';
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
    ++_viewId;
    Engine.onCanvasTap(null);
    Engine.audio.playInvestigationReveal ? Engine.audio.playInvestigationReveal() : Engine.audio.playInvestigation();
    const step = triggered.step;

    let html = '';
    // Meier: distinguish new investigation from continuation
    if (step.id === 1) {
      html += '<p class="stage-shift">A thread appears.</p>';
    }
    html += '<p class="inv-name">' + esc(triggered.investigation.name) + '</p>';
    // traitText: show trait-specific variant if available, otherwise generic step text
    const trait = State.get('trait');
    const stepText = (step.traitText && trait && step.traitText[trait]) ? step.traitText[trait] : step.text;
    html += '<p class="inv-step-text">' + esc(stepText) + '</p>';
    // Stat interaction: high insight reveals a bonus line on deeper investigation steps
    if (step.id > 1 && ((State.get('stats') || {}).insight || 0) >= 6) {
      html += '<p class="inv-insight">Something beneath the surface here. You almost see it.</p>';
    }
    html += '<button class="inv-continue-btn">...</button>';

    panel.innerHTML = html;

    panel.querySelector('.inv-continue-btn').addEventListener('click', () => {
      showLocation();
    });
  }

  function showInvestigationChoice(invId, investigation, choice) {
    ++_viewId;
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
          if (consequence) {
            const _flashText = consequence.narrativeText || '';
            State.recordFlashbackMoment({ type: 'investigation_choice', locationId: State.get('location'), timePeriod: Game.getTimePeriod(),
              text: _flashText.length > 80 ? _flashText.substring(0, 77) + '...' : _flashText,
              caption: 'I chose. The other option still haunts.' });
            showConsequence(investigation, consequence);
          }
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
      const playerTrait = State.get('trait') || 'musician';
      // eventEndingsByTrait: { musician: 'M-END-2', photographer: 'P-END-2', ... }
      // Used when multiple traits share one choice but get different endings
      let endingId = null;
      if (consequence.eventEndingsByTrait && consequence.eventEndingsByTrait[playerTrait]) {
        endingId = consequence.eventEndingsByTrait[playerTrait];
      } else {
        endingId = consequence.eventEndingUnlocked;
      }
      if (endingId && EVENT_ENDINGS[endingId]) {
        const endingTrait = EVENT_ENDINGS[endingId].trait;
        if (!endingTrait || endingTrait === playerTrait) {
          setTimeout(() => { showEventEnding(endingId); }, 400);
          return;
        }
      }
      showLocation();
    });
  }

  // --- Notebook ---

  function showNotebook(tab) {
    ++_viewId;
    Engine.onCanvasTap(null);
    let html = '<div class="notebook">';
    html += '<p class="notebook-title">Notebook</p>';
    html += '<div class="notebook-tabs">';
    html += '<button class="notebook-tab' + (tab === 'people' ? ' tab-active' : '') + '" data-tab="people">People</button>';
    html += '<button class="notebook-tab' + (tab === 'mysteries' ? ' tab-active' : '') + '" data-tab="mysteries">Mysteries</button>';
    html += '<button class="notebook-tab' + (tab === 'journal' ? ' tab-active' : '') + '" data-tab="journal">Journal</button>';
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

    if (tab === 'journal') {
      html += '<div class="notebook-content">';
      const trait = State.get('trait') || 'unknown';
      const discoveries = State.get('discoveries') || [];
      const createdAt = State.get('createdAt');

      // Identity — quiet, not a stat block
      html += '<div class="notebook-entry">';
      html += '<p class="notebook-npc-name">The ' + esc(trait.charAt(0).toUpperCase() + trait.slice(1)) + '</p>';
      if (createdAt) {
        const days = Math.max(1, Math.floor((Date.now() - createdAt) / 86400000));
        html += '<p class="journal-stat">' + days + ' day' + (days !== 1 ? 's' : '') + ' in Limehouse.</p>';
      }
      html += '</div>';

      // Places visited — with their discoveries inline
      const visited = State.get('visitedLocations') || [];
      for (const locId of visited) {
        const loc = Game.getLocation(locId);
        if (!loc) continue;
        const locDisc = (loc.interactableDetails || []).filter(d => State.isDiscovered(d.id));
        html += '<div class="notebook-entry">';
        html += '<p class="notebook-npc-name">' + esc(loc.name) + '</p>';
        if (locDisc.length > 0) {
          for (const d of locDisc) {
            html += '<p class="notebook-inv-step">' + esc(d.discovery_text || d.description || '') + '</p>';
          }
        } else {
          html += '<p class="notebook-inv-step" style="color:#3a3530;">Nothing noticed yet.</p>';
        }
        html += '</div>';
      }

      // Lore fragments found — woven in
      const frags = Game.content.fragments || {};
      let hasFrags = false;
      for (const [id, frag] of Object.entries(frags)) {
        if (!(discoveries || []).includes('frag_' + id)) continue;
        if (!hasFrags) {
          html += '<div class="notebook-entry">';
          html += '<p class="notebook-npc-name">Fragments</p>';
          hasFrags = true;
        }
        html += '<p class="notebook-inv-step" style="color:#8a7a60;">' + esc(frag.title) + ' — ' + esc(frag.text) + '</p>';
      }
      if (hasFrags) html += '</div>';

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

      // AI settings link — still accessible
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
    if (aiBtn) aiBtn.addEventListener('click', () => {
      _aiSettingsReturnTo = { source: 'notebook' };
      showAiSettings();
    });
  }

  // --- AI Settings ---

  function showAiSettings() {
    if (typeof AI === 'undefined') return;
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
        showNotebook('journal');
      });
    }

    // Back — return to wherever the player came from
    document.getElementById('ai-back').addEventListener('click', () => {
      const returnTo = _aiSettingsReturnTo;
      _aiSettingsReturnTo = null;
      if (returnTo && returnTo.source === 'title') {
        showTitleSettings(returnTo.hasSave);
      } else if (returnTo && returnTo.source === 'notebook') {
        showNotebook('journal');
      } else {
        showSettings();
      }
    });
  }

  // --- Settings ---

  function showSettings() {
    ++_viewId;
    Engine.onCanvasTap(null);
    let html = '<div class="notebook">';
    html += '<p class="notebook-title">Settings</p>';
    html += '<div class="notebook-content">';

    // === AI / Living Conversations ===
    html += '<div class="notebook-entry settings-section">';
    html += '<p class="notebook-npc-name">Living Conversations</p>';
    html += '<p class="journal-stat">NPCs speak with their own voice using AI. You supply the API key — it stays in your browser.</p>';
    if (typeof AI !== 'undefined' && AI.isEnabled()) {
      html += '<p class="settings-status settings-on">Connected</p>';
    } else {
      html += '<p class="settings-status settings-off">Not configured</p>';
    }
    html += '<button class="settings-action-btn" id="settings-ai">Configure AI</button>';
    html += '</div>';

    // === Sound ===
    html += '<div class="notebook-entry settings-section">';
    html += '<p class="notebook-npc-name">Sound</p>';
    const muted = Engine.audio && Engine.audio.isMuted && Engine.audio.isMuted();
    html += '<button class="settings-action-btn" id="settings-sound">' + (muted ? 'Unmute Audio' : 'Mute Audio') + '</button>';
    html += '</div>';

    // === Save Management ===
    html += '<div class="notebook-entry settings-section">';
    html += '<p class="notebook-npc-name">Save</p>';
    const trait = State.get('trait') || 'unknown';
    const discoveries = (State.get('discoveries') || []).length;
    html += '<p class="journal-stat">Playing as The ' + esc(trait.charAt(0).toUpperCase() + trait.slice(1)) + '. ' + discoveries + ' discoveries.</p>';
    html += '<button class="settings-action-btn settings-danger" id="settings-reset">Reset Save</button>';
    html += '</div>';

    // === About ===
    html += '<div class="notebook-entry settings-section">';
    html += '<p class="notebook-npc-name">A Note From the Previous Tenant</p>';
    html += '<p class="journal-stat" style="line-height:1.8;color:#8a7a60;">The walls talk if you tap them. Not words — impressions. Details the eye skips. Tap the scene, not the text.</p>';
    html += '<p class="journal-stat" style="line-height:1.8;color:#8a7a60;">The people here are worth knowing. Visit them. Come back. They remember.</p>';
    html += '<p class="journal-stat" style="line-height:1.8;color:#8a7a60;">Walk slowly. Notice what others walk past. Write it down in the notebook.</p>';
    html += '<p class="journal-stat" style="line-height:1.8;color:#8a7a60;">Some things only appear in the rain. Some only at night. Some only after you\'ve seen enough.</p>';
    html += '<p class="journal-stat" style="line-height:1.8;color:#6a5a48;font-style:italic;margin-top:0.6rem;">Good luck with the flat. The radiator has a rhythm. — M.</p>';
    html += '</div>';

    html += '</div>';
    html += '<button class="notebook-close-btn" id="settings-close">Close</button>';
    html += '</div>';

    panel.innerHTML = html;

    // Configure AI
    document.getElementById('settings-ai').addEventListener('click', () => showAiSettings());

    // Sound toggle
    document.getElementById('settings-sound').addEventListener('click', () => {
      if (Engine.audio && Engine.audio.toggleMute) {
        Engine.audio.toggleMute();
      }
      showSettings(); // refresh to show updated state
    });

    // Reset save
    document.getElementById('settings-reset').addEventListener('click', () => showResetConfirm());

    // Close
    document.getElementById('settings-close').addEventListener('click', () => showLocation());
  }

  function showResetConfirm() {
    let html = '<div class="notebook">';
    html += '<p class="notebook-title">Reset Save</p>';
    html += '<div class="notebook-content">';
    html += '<p class="journal-stat" style="color:#8a6a4a;">This will delete all your progress — discoveries, relationships, investigations, everything. This cannot be undone.</p>';
    html += '<div style="display:flex;gap:0.8rem;margin-top:1.2rem;">';
    html += '<button class="settings-action-btn settings-danger" id="confirm-reset">Delete Everything</button>';
    html += '<button class="settings-action-btn" id="cancel-reset">Cancel</button>';
    html += '</div>';
    html += '</div></div>';

    panel.innerHTML = html;

    document.getElementById('confirm-reset').addEventListener('click', () => {
      State.reset();
      showTitle(false);
    });
    document.getElementById('cancel-reset').addEventListener('click', () => showSettings());
  }

  // --- Leave London Ending Sequence ---

  // Event endings data — 15 endings across 5 traits
  const EVENT_ENDINGS = {
    'M-END-1': {
      name: 'The Full Recording',
      trait: 'musician',
      trigger: { investigationId: 'LI-11', choiceId: 'play' },
      finalAction: 'You play the recording. The canal responds. The city hears itself for the first time.',
      finalLine: 'Everyone can hear it now. Everyone.',
      tone: 'triumphant and terrifying'
    },
    'M-END-2': {
      name: 'The Silence',
      trait: 'musician',
      trigger: { investigationId: 'XN-03', choiceId: 'stop' },
      finalAction: "The frequencies fade. The canal is just a canal. The city goes quiet. One melody survives — the barista's song.",
      finalLine: 'Quiet now. Just the river. Just the rain.',
      tone: 'melancholic, peaceful'
    },
    'M-END-3': {
      name: 'The Instrument',
      trait: 'musician',
      trigger: { investigationId: 'LI-11', choiceId: 'close' },
      finalAction: 'You became part of the recording. Future listeners will hear you in the archive.',
      finalLine: "I'm part of it. Listen. I'm in there.",
      tone: 'transcendent, eerie'
    },
    'P-END-1': {
      name: 'The Next Draft',
      trait: 'photographer',
      trigger: { investigationId: 'XN-03', choiceId: 'continue' },
      finalAction: "You document London's planned revision. The map of the future. Others will navigate what London becomes using your work.",
      finalLine: "It's already changing. I saw what comes next.",
      tone: 'awed, urgent'
    },
    'P-END-2': {
      name: 'The Ordinary',
      trait: 'photographer',
      trigger: { investigationId: 'XN-03', choiceId: 'stop' },
      finalAction: 'The palimpsest fades to one layer. London is concrete and rain. But sometimes, in certain light, the shadows still have too many edges.',
      finalLine: 'Just a city. Just light. Just shadows. Almost.',
      tone: 'bittersweet'
    },
    'P-END-3': {
      name: 'The Archive',
      trait: 'photographer',
      trigger: { investigationId: 'BI-02', completed: true },
      finalAction: 'The composite image: London photographed from below. Something beneath the city, looking up through transparent ground.',
      finalLine: 'Some photographs are better kept in the dark.',
      tone: 'unsettling, profound'
    },
    'W-END-1': {
      name: 'The Waking',
      trait: 'wanderer',
      trigger: { investigationId: 'XN-02', choiceId: 'enter' },
      finalAction: "London's consciousness encountered. A feeling so vast it has gravity. You woke London.",
      finalLine: 'It opened its eyes. And I was inside them.',
      tone: 'sublime, dangerous'
    },
    'W-END-2': {
      name: 'The Dream-Keeper',
      trait: 'wanderer',
      trigger: { investigationId: 'XN-02', choiceId: 'step_back' },
      finalAction: "You become the guardian of London's sleep. You walk the boundary between dreaming and waking. You never leave.",
      finalLine: "I'll walk until it wakes. Or until I do.",
      tone: 'devoted, lonely, beautiful'
    },
    'W-END-3': {
      name: 'The Other Side',
      trait: 'wanderer',
      trigger: { investigationId: 'BI-10', choiceId: 'follow' },
      finalAction: "You followed the Thames Path Figure beyond the map's edge. London becomes entirely the mythological layer. No return.",
      finalLine: 'This is what London looks like from the inside.',
      tone: 'transcendent, irreversible'
    },
    'BA-END-1': {
      name: 'The Name Spoken',
      trait: 'barista',
      trigger: { investigationId: 'XN-01', choiceId: 'speak' },
      finalAction: 'You spoke the name. Every NPC reacted. The network vibrated. The space acknowledged.',
      finalLine: 'I said the name. The city heard me.',
      tone: 'powerful, uncertain'
    },
    'BA-END-2': {
      name: 'The Name Kept',
      trait: 'barista',
      trigger: { investigationId: 'XN-01', choiceId: 'keep' },
      finalAction: "You kept the name. It lives in the journal's last page. A weight carried privately. That's enough.",
      finalLine: "I know your name. That's enough. I'll keep it.",
      tone: 'tender, solemn'
    },
    'BA-END-3': {
      name: 'The New Node',
      trait: 'barista',
      trigger: { investigationId: 'LI-06', completed: true },
      finalAction: "The Barista has become the network's center. Not by choice. By attention. They replaced what was erased.",
      finalLine: "I'm the one they all know. I'm the center now.",
      tone: 'quietly powerful, frightening'
    },
    'S-END-1': {
      name: 'The Awakening',
      trait: 'shopkeeper',
      trigger: { investigationId: 'BI-01', choiceId: 'turn' },
      finalAction: 'You touched the foundation stone. The ground shifted beneath the entire city. The foundation knows your touch.',
      finalLine: 'The ground knows my hands. It moved for me.',
      tone: 'geological awe'
    },
    'S-END-2': {
      name: 'The Vigil',
      trait: 'shopkeeper',
      trigger: { investigationId: 'XN-03', choiceId: 'stop' },
      finalAction: "You became the permanent thing. You took over the clockmaker's post. The next Shopkeeper will find the same key.",
      finalLine: 'Someone has to stay. Someone has to remember.',
      tone: 'committed, cyclical'
    },
    'S-END-3': {
      name: 'The Deep Layer',
      trait: 'shopkeeper',
      trigger: { investigationId: 'BI-03', choiceId: 'stay' },
      finalAction: 'Past Victorian. Past medieval. Past Roman. A living surface that responds to touch. Two beats per century.',
      finalLine: 'I can feel every footstep. Every one. All of them.',
      tone: 'cosmic intimacy'
    }
  };

  function showEventEnding(endingId) {
    const ending = EVENT_ENDINGS[endingId];
    if (!ending) return;

    ++_viewId;
    Engine.onCanvasTap(null);

    const trait = State.get('trait') || 'musician';
    const traitLabel = trait.charAt(0).toUpperCase() + trait.slice(1);

    // Screen 1: Final action
    function showAction() {
      Engine.setTimePeriod('night');
      let html = '<p class="fragment-title" style="color:#5a5040;">' + esc(ending.name) + '</p>';
      html += '<p class="location-text" style="margin-top:1rem;">' + esc(ending.finalAction) + '</p>';
      html += '<button class="discovery-back-btn" style="margin-top:2rem;">...</button>';
      panel.innerHTML = html;
      panel.classList.add('scene-fade');
      const cl = () => panel.classList.remove('scene-fade', 'scene-fade-warm');
      panel.addEventListener('animationend', cl, { once: true }); setTimeout(cl, 1500);
      panel.querySelector('.discovery-back-btn').addEventListener('click', () => {
        Engine.fadeTransition(() => { showLine(); });
      });
    }

    // Screen 2: Final line
    function showLine() {
      let html = '<div style="display:flex;align-items:center;justify-content:center;min-height:6rem;">';
      html += '<p class="npc-physical" style="font-size:1.2em;text-align:center;color:#c8b8a0;line-height:1.8;">' + esc(ending.finalLine) + '</p>';
      html += '</div>';
      html += '<button class="discovery-back-btn" style="margin-top:2rem;">...</button>';
      panel.innerHTML = html;
      panel.classList.add('scene-fade-warm');
      const cl = () => panel.classList.remove('scene-fade', 'scene-fade-warm');
      panel.addEventListener('animationend', cl, { once: true }); setTimeout(cl, 1500);
      panel.querySelector('.discovery-back-btn').addEventListener('click', () => {
        Engine.fadeTransition(() => { showTitleCard(); });
      });
    }

    // Screen 3: Title card
    function showTitleCard() {
      const createdAt = State.get('createdAt');
      const days = createdAt ? Math.max(1, Math.floor((Date.now() - createdAt) / 86400000)) : 1;
      const discoveries = (State.get('discoveries') || []).length;
      const npcMem = State.get('npcMemory') || {};
      const npcsMet = Object.keys(npcMem).filter(id => npcMem[id] && npcMem[id].visitCount > 0).length;

      let html = '<div style="text-align:center;padding:2rem 1rem;">';
      html += '<p style="font-size:1.6rem;letter-spacing:0.15em;color:#c8b8a0;margin-bottom:0.5rem;font-family:inherit;">Trace</p>';
      html += '<p style="font-size:0.85rem;letter-spacing:0.1em;color:#8a7a60;margin-bottom:1.5rem;font-family:inherit;">' + esc(ending.name) + '</p>';
      html += '<div style="border-top:1px solid #3a3020;padding-top:1.5rem;margin-bottom:1.5rem;">';
      html += '<p class="journal-stat" style="color:#6a5a48;">The ' + esc(traitLabel) + '</p>';
      html += '<p class="journal-stat" style="color:#4a4038;margin-top:0.4rem;">' + days + ' day' + (days !== 1 ? 's' : '') + ' in London</p>';
      html += '<p class="journal-stat" style="color:#4a4038;">' + discoveries + ' things noticed &middot; ' + npcsMet + ' people known</p>';
      html += '</div>';
      html += '<p class="journal-stat" style="color:#5a5040;font-style:italic;">You leave London.</p>';
      html += '<button class="notebook-close-btn" style="margin-top:2rem;" id="event-ending-end">...</button>';
      html += '</div>';

      panel.innerHTML = html;
      panel.classList.add('scene-fade');
      const cl = () => panel.classList.remove('scene-fade', 'scene-fade-warm');
      panel.addEventListener('animationend', cl, { once: true }); setTimeout(cl, 1500);
      document.getElementById('event-ending-end').addEventListener('click', () => {
        State.set('completed', true);
        showTitle(true);
      });
    }

    Engine.audio.fadeOut(8);
    Engine.fadeTransition(() => { showAction(); });
  }

  function showLeaveSequence() {
    ++_viewId;
    Engine.onCanvasTap(null);

    // NPC farewell lines (B8-ending-text.md)
    const NPC_FAREWELLS = {
      barista:            'I saved your seat. In case you...',
      canal_painter:      'The canal will be the same colour tomorrow. Different light, same colour.',
      sound_artist:       'I\'ll keep recording. You\'ll be in the background now.',
      tattoo_artist:      'The door I drew. It was for you. It always was.',
      nightclub_promoter: 'You were worth letting in.',
      bike_courier:       'Gotta go. But yeah. You were alright.',
      pub_landlord:       'Door\'s always open. Thursdays especially. You know why.',
      clockmaker:         'The clocks will keep time. Come back.',
      old_man:            '...you were good company. Not many are.',
      observatory_keeper: 'The instruments will still measure. Without you.',
      data_scientist:     'You\'re still in the dataset. You always will be.',
      market_vendor:      'Something here was yours. Still is.',
      antiques_vendor:    'The market will miss a good eye.',
      gallery_owner:      'Leaving? The city will still be asking questions.',
      warehouse_guard:    'Go.',
      urban_explorer:     'There are rooms under this city. Come back when you\'re ready.',
      watcher:            'Good. Now you know when to stop.',
      night_fox:          '*watches from the dark until you turn the corner*',
      child_who_draws:    '*keeps drawing*',
      ai_researcher:      'Imagine somewhere you have to be. Go there.'
    };

    // Location memory texts + B8 flashback captions
    const LOC_MEMORIES = {
      L01: { text: 'The canal. Still water. The painter\'s colours on the towpath wall.', caption: 'Autumn canal. Gold and grey and mine.' },
      L02: { text: 'The coffee shop. Steam rising. A melody you almost remember.', caption: 'She remembered my name. First time.' },
      L03: { text: 'The churchyard. Shadows falling wrong. The preacher\'s voice, fading.', caption: 'Nobody told me about this place.' },
      L04: { text: 'The warehouse. That frequency. 47Hz. Still humming in your chest.', caption: 'I wasn\'t supposed to find this.' },
      L05: { text: 'The pub. Thames through the back window. Always moving.', caption: 'He poured tea without being asked.' },
      L06: { text: 'The parlour. Needle buzz. Doors drawn in skin.', caption: 'Trust looks different than I expected. Quieter.' },
      L07: { text: 'The lock gates. Iron remembering its shape. Cold seam at my ankles.', caption: 'The door was there. Then it wasn\'t.' },
      L08: { text: 'The platform. MERIDIAN — 3 MIN. A train that never came.', caption: 'The impossible, stated as fact. Ordinary.' },
      L09: { text: 'The market. Bass in my feet. Smoke between the stalls.', caption: 'I read it three times. Then believed.' },
      L10: { text: 'The empty lot. Weeds through concrete. The fox that watched me.', caption: 'Same eyes. They\'d seen the same things.' },
      G01: { text: 'The clockmaker\'s shop. Every clock ticking. One not.', caption: 'He wound it. Or I did. Same thing.' },
      G02: { text: 'The observatory terrace. Eleven seconds. The instruments measured something wrong.', caption: 'She printed it. Her hands steady. Her voice not.' },
      G03: { text: 'The churchyard bench. The old man\'s half-thoughts. One complete sentence.', caption: 'He spoke it whole. Once. For me.' },
      G04: { text: 'The foot tunnel. Longer than it should be. The tile count keeps changing.', caption: 'I counted twice. Different number. Both times.' },
      G05: { text: 'The covered market. The stall that never packs up. Something meant for me.', caption: 'It knew what I needed. Before I did.' },
      G06: { text: 'The Naval College. The painted ceiling arguing. About a decision I hadn\'t made yet.', caption: 'The figures had already decided. I just hadn\'t.' },
      G07: { text: 'The bookshop. The church register. One name, every century, different ink.', caption: 'The city writes it again. It always writes it again.' },
      G08: { text: 'The park at night. The astronomer measuring beneath the ground.', caption: 'Pointed at the earth. Finding something moving.' },
      G09: { text: 'The foreshore. Low tide. An object in the clay that had been waiting.', caption: 'The Thames gives things back. When it\'s ready.' },
      G10: { text: 'The Trafalgar Tavern. A pub on Crane Street that shouldn\'t exist, warm and present.', caption: 'Thursday. It\'s always there on Thursday.' },
      B01: { text: 'The antiques market. A key in wrong metal. Seven marks across London.', caption: 'It was always here. It was waiting for me.' },
      B02: { text: 'The gallery. Four paintings across four seasons. A composite revelation.', caption: 'It showed me what London is planning.' },
      B03: { text: 'The railway arch. Tools moved overnight. Something building through my hands.', caption: 'I wasn\'t building. I was being used. Willingly.' },
      B04: { text: 'The warehouse at night. The space larger than its walls. Configurations converging.', caption: 'He said \'different.\' That was enough.' },
      B05: { text: 'The Thames path. A figure walking. Every day. The oldest thing that moves.', caption: 'I stopped at the edge. I always stop at the edge.' },
      B06: { text: 'The co-working space. The simulation. My position marked. The date: today.', caption: 'It knows I\'m here. It always knew.' },
      B07: { text: 'The old church. The crypt door. Something beneath that grew, not carved.', caption: 'Older than the city. Older than the name.' },
      B08: { text: 'The rooftop. The Shard. The city as a pattern. The Watcher\'s empty chair.', caption: 'They sat here. Saw what I saw. Then stopped.' },
      B09: { text: 'Long Lane corner. The preacher\'s text in the pavement. Not chalk.', caption: 'Some messages outlast the messenger.' },
      B10: { text: 'The vinyl shop. A record from a studio that burned before it was built.', caption: '47Hz. Still playing somewhere. Always playing.' },
      flat: { text: 'Empty room. Empty notebook. Everything ahead.', caption: 'The window. The rooftops. The beginning.' }
    };

    function getBestFarewell() {
      const npcMem = State.get('npcMemory') || {};
      const stageOrder = ['familiar_aware', 'familiar_unknowing', 'familiar', 'acquaintance'];
      for (const targetStage of stageOrder) {
        for (const [npcId, mem] of Object.entries(npcMem)) {
          if (mem && mem.visitCount > 0 && mem.stage === targetStage && NPC_FAREWELLS[npcId]) {
            return { npcId, text: NPC_FAREWELLS[npcId] };
          }
        }
      }
      for (const [npcId, mem] of Object.entries(npcMem)) {
        if (mem && mem.visitCount > 0 && NPC_FAREWELLS[npcId]) {
          return { npcId, text: NPC_FAREWELLS[npcId] };
        }
      }
      return null;
    }

    // Step 1: Decision
    function showDecision() {
      let html = '<p class="fragment-title" style="color:#5a5040;">Leave London?</p>';
      html += '<p class="location-text" style="margin-top:1rem;">The suitcase is packed. The notebook is full. Limehouse has given you what it has to give — for now.</p>';
      html += '<div style="margin-top:2rem;display:flex;flex-direction:column;gap:0.8rem;">';
      html += '<button class="inv-choice-btn" id="leave-yes">It\'s time.</button>';
      html += '<button class="inv-choice-btn" id="leave-no" style="opacity:0.65;">Not yet.</button>';
      html += '</div>';
      panel.innerHTML = html;
      document.getElementById('leave-yes').addEventListener('click', () => {
        Engine.audio.fadeOut(8);
        Engine.fadeTransition(() => { showFlashbacks(); });
      });
      document.getElementById('leave-no').addEventListener('click', () => { showLocation(); });
    }

    // Step 2: Flashback montage
    function showFlashbacks() {
      const trackedMoments = State.get('flashbackMoments') || [];
      const locVisits = {};
      for (const locId of (State.get('visitedLocations') || [])) {
        if (locId === 'flat') continue;
        locVisits[locId] = State.getLocationVisitCount(locId);
      }

      let flashItems = [];
      const coveredLocs = new Set();

      // Tracked moments first (up to 4)
      for (const m of trackedMoments) {
        if (flashItems.length >= 4) break;
        const locMem = LOC_MEMORIES[m.locationId] || LOC_MEMORIES.flat;
        flashItems.push({
          locationId: m.locationId || 'flat',
          timePeriod: m.timePeriod || 'evening',
          text: m.text || locMem.text,
          caption: m.caption || locMem.caption
        });
        coveredLocs.add(m.locationId);
      }

      // Fill to 5 from most-visited locations
      const topLocs = Object.entries(locVisits).sort((a, b) => b[1] - a[1]).map(e => e[0]);
      for (const locId of topLocs) {
        if (flashItems.length >= 5) break;
        if (coveredLocs.has(locId) || !LOC_MEMORIES[locId]) continue;
        flashItems.push({ locationId: locId, timePeriod: 'evening', text: LOC_MEMORIES[locId].text, caption: LOC_MEMORIES[locId].caption });
        coveredLocs.add(locId);
      }

      if (flashItems.length === 0) { showNpcFarewell(); return; }

      // Always end with flat day-one
      flashItems.push({ locationId: 'flat', timePeriod: 'evening', text: LOC_MEMORIES.flat.text, caption: LOC_MEMORIES.flat.caption });
      flashItems = flashItems.slice(0, 7);

      let step = 0;
      function showNext() {
        if (step >= flashItems.length) { Engine.fadeTransition(() => { showNpcFarewell(); }); return; }
        const item = flashItems[step];
        Engine.setLocation(item.locationId);
        Engine.setTimePeriod(item.timePeriod || 'evening');

        let html = '<p class="fragment-title" style="color:#5a5040;">You remember.</p>';
        html += '<p class="location-text" style="margin-top:1rem;">' + esc(item.text) + '</p>';
        html += '<p class="npc-physical" style="color:#8a8a6a;font-style:italic;margin-top:1.2rem;">' + esc(item.caption) + '</p>';
        panel.innerHTML = html;
        panel.classList.add('scene-fade');
        const cl = () => panel.classList.remove('scene-fade', 'scene-fade-warm');
        panel.addEventListener('animationend', cl, { once: true }); setTimeout(cl, 1500);

        let adv = false;
        const advance = () => { if (adv) return; adv = true; step++; Engine.fadeTransition(() => { showNext(); }); };
        setTimeout(advance, 4000);
        panel.addEventListener('click', advance, { once: true });
      }
      showNext();
    }

    // Step 3: NPC farewell
    function showNpcFarewell() {
      const farewell = getBestFarewell();
      if (!farewell) { Engine.fadeTransition(() => { showLastFlat(); }); return; }
      Engine.setLocation('flat');
      Engine.setTimePeriod('evening');

      let html = '<p class="fragment-title" style="color:#5a5040;">A last goodbye.</p>';
      html += '<p class="npc-physical" style="margin-top:1rem;font-size:1.1em;">' + esc(farewell.text) + '</p>';
      html += '<button class="discovery-back-btn" style="margin-top:2rem;">...</button>';
      panel.innerHTML = html;
      panel.classList.add('scene-fade-warm');
      const cl = () => panel.classList.remove('scene-fade', 'scene-fade-warm');
      panel.addEventListener('animationend', cl, { once: true }); setTimeout(cl, 1500);
      panel.querySelector('.discovery-back-btn').addEventListener('click', () => { Engine.fadeTransition(() => { showLastFlat(); }); });
    }

    // Step 4: Last flat
    function showLastFlat() {
      Engine.setLocation('flat');
      Engine.setTimePeriod('night');
      const trait = State.get('trait') || 'musician';
      const traitFarewells = {
        musician:    'The flat is quiet now. No hum beneath the floorboards. Just the radiator\'s rhythm, one last time.',
        photographer:'The light through the window finds the empty table. One last exposure.',
        wanderer:    'Your feet remember every cobblestone. The ground remembers you.',
        barista:     'The cup on the table is cold. The last one you\'ll make here.',
        shopkeeper:  'The brass key on the table. You leave it for the next tenant.'
      };

      let html = '<p class="fragment-title">The flat.</p>';
      html += '<p class="location-text" style="margin-top:1rem;">' + esc(traitFarewells[trait] || traitFarewells.musician) + '</p>';
      html += '<p class="location-text" style="margin-top:1.2rem;color:#8a7a60;">The objects stay. The notebook goes with you.</p>';
      html += '<button class="discovery-back-btn" style="margin-top:2rem;">...</button>';
      panel.innerHTML = html;
      panel.classList.add('scene-fade-warm');
      const cl = () => panel.classList.remove('scene-fade', 'scene-fade-warm');
      panel.addEventListener('animationend', cl, { once: true }); setTimeout(cl, 1500);
      panel.querySelector('.discovery-back-btn').addEventListener('click', () => { Engine.fadeTransition(() => { showDeparture(); }); });
    }

    // Step 5: Departure — title card
    function showDeparture() {
      Engine.setLocation('flat');
      Engine.setTimePeriod('night');
      const trait = State.get('trait') || 'musician';
      const traitThoughts = {
        musician:    'The city hums. I can still hear it.',
        photographer:'The light on the river. I see it.',
        wanderer:    'Something is pulling. It always will be.',
        barista:     'I know their names. All of them.',
        shopkeeper:  'The ground remembers. Even if I forget.'
      };

      const createdAt = State.get('createdAt');
      const days = createdAt ? Math.max(1, Math.floor((Date.now() - createdAt) / 86400000)) : 1;
      const discoveries = (State.get('discoveries') || []).length;
      const npcMem = State.get('npcMemory') || {};
      const npcsMet = Object.keys(npcMem).filter(id => npcMem[id] && npcMem[id].visitCount > 0).length;
      const traitLabel = trait.charAt(0).toUpperCase() + trait.slice(1);

      let html = '<div style="text-align:center;padding:2rem 1rem;">';
      html += '<p style="font-size:1.6rem;letter-spacing:0.15em;color:#c8b8a0;margin-bottom:1.5rem;font-family:inherit;">Trace</p>';
      html += '<p class="location-text" style="color:#8a7a60;font-style:italic;margin-bottom:2rem;">' + esc(traitThoughts[trait]) + '</p>';
      html += '<div style="border-top:1px solid #3a3020;padding-top:1.5rem;margin-bottom:1.5rem;">';
      html += '<p class="journal-stat" style="color:#6a5a48;">The ' + esc(traitLabel) + '</p>';
      html += '<p class="journal-stat" style="color:#4a4038;margin-top:0.4rem;">' + days + ' day' + (days !== 1 ? 's' : '') + ' in London</p>';
      html += '<p class="journal-stat" style="color:#4a4038;">' + discoveries + ' things noticed · ' + npcsMet + ' people known</p>';
      html += '</div>';
      html += '<p class="journal-stat" style="color:#5a5040;font-style:italic;">You leave Limehouse. But Limehouse does not leave you.</p>';
      html += '<button class="notebook-close-btn" style="margin-top:2rem;" id="farewell-end">...</button>';
      html += '</div>';

      panel.innerHTML = html;
      panel.classList.add('scene-fade');
      const cl = () => panel.classList.remove('scene-fade', 'scene-fade-warm');
      panel.addEventListener('animationend', cl, { once: true }); setTimeout(cl, 1500);
      document.getElementById('farewell-end').addEventListener('click', () => {
        State.set('completed', true);
        showTitle(true);
      });
    }

    showDecision();
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
