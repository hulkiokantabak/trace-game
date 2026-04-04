/**
 * ui.js — DOM: dialogue display, notebook tabs, flat view, choices
 * Milestone 2: NPC dialogue, relationship stages, notebook People tab
 */
const UI = (() => {
  let panel;
  let _seenEllipsis = false;

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
        const greetings = [
          'You return to Limehouse.',
          'The neighbourhood remembers you.',
          'Back. The canal is still there.',
          'London, again. Yours, still.'
        ];
        const greeting = greetings[Math.floor(Math.random() * greetings.length)];
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

  function showTraitSelection() {
    panel.innerHTML =
      '<div class="creation-trait-select">' +
        '<p class="section-label">Who are you becoming?</p>' +
        '<div class="trait-list">' +
          '<button class="trait-btn trait-active" data-trait="musician">' +
            '<span class="trait-name">The Musician</span>' +
            '<span class="trait-desc">You hear what others don\'t. The city is an instrument.</span>' +
          '</button>' +
          '<button class="trait-btn trait-locked" disabled>' +
            '<span class="trait-name">The Photographer</span>' +
            '<span class="trait-desc">You see what others miss. Light tells you everything.</span>' +
            '<span class="trait-soon">coming</span>' +
          '</button>' +
          '<button class="trait-btn trait-locked" disabled>' +
            '<span class="trait-name">The Wanderer</span>' +
            '<span class="trait-desc">You feel what others ignore. Every street has a temperature.</span>' +
            '<span class="trait-soon">coming</span>' +
          '</button>' +
          '<button class="trait-btn trait-locked" disabled>' +
            '<span class="trait-name">The Barista</span>' +
            '<span class="trait-desc">You connect what others separate. People are your instrument.</span>' +
            '<span class="trait-soon">coming</span>' +
          '</button>' +
          '<button class="trait-btn trait-locked" disabled>' +
            '<span class="trait-name">The Shopkeeper</span>' +
            '<span class="trait-desc">You remember what others forget. Objects hold their history.</span>' +
            '<span class="trait-soon">coming</span>' +
          '</button>' +
        '</div>' +
      '</div>';

    panel.querySelector('[data-trait="musician"]').addEventListener('click', () => {
      // Brief confirmation before starting
      panel.innerHTML =
        '<p class="creation-text">The Musician.</p>' +
        '<p class="creation-text creation-delay-1">You listen. London answers.</p>';
      Engine.audio.playDiscovery();

      setTimeout(() => {
        State.set('trait', 'musician');
        State.set('createdAt', Date.now());
        State.set('firstPlay', false);
        State.visitLocation('flat');
        startGame();
      }, 2200);
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
    setTimeout(onDone, duration);
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
    Engine.setWatcherVisible(!forgetting && awareness >= 5 && isExterior && Math.random() < 0.35);

    let html = '<p class="location-name">' + esc(loc.name) + '<span class="time-indicator">' + esc(period) + '</span></p>';

    // Post-discovery enrichment — location acknowledges what you've noticed
    const locDiscoveries = (loc.interactableDetails || []).filter(d => State.isDiscovered(d.id));
    const discoveryCount = locDiscoveries.length;
    const totalDetails = (loc.interactableDetails || []).length;

    if (discoveryCount > 0 && discoveryCount >= totalDetails && totalDetails > 0) {
      html += '<p class="location-text">' + esc(loc.body) + '</p>';
      html += '<p class="loc-known">You know this place now. Every surface has spoken.</p>';
    } else if (discoveryCount >= 2) {
      html += '<p class="location-text">' + esc(loc.body) + '</p>';
      html += '<p class="loc-known">Familiar ground. You see what others walk past.</p>';
    } else {
      html += '<p class="location-text">' + esc(loc.body) + '</p>';
    }

    // Tell engine about discovered detail hitboxes for visual markers
    if (typeof Engine.setDiscoveredDetails === 'function') {
      Engine.setDiscoveredDetails(locDiscoveries.map(d => d.hitbox));
    }

    // Weather-specific description (from location JSON)
    const weather = Game.getWeather();
    if (loc.weatherEffects && loc.weatherEffects[weather]) {
      html += '<p class="weather-text">' + esc(loc.weatherEffects[weather]) + '</p>';
    }

    // Time-of-day flavor (evening/night feel different)
    if (period === 'night' && locId !== 'flat') {
      html += '<p class="time-text">The dark changes everything here.</p>';
    } else if (period === 'morning' && locId !== 'flat') {
      html += '<p class="time-text">Morning light. The city before it remembers itself.</p>';
    }

    // The Forgetting — subtle atmospheric note
    if (forgetting) {
      html += '<p class="forgetting-text">Something is quieter today. The edges feel soft.</p>';
    }

    // Night Fox — appears at L10 and L01 at dusk/night
    if (!forgetting && (locId === 'L10' || locId === 'L01') && (period === 'evening' || period === 'night') && Math.random() < 0.35) {
      html += '<p class="ambient-encounter">A fox sits at the edge of the light. It watches you. It doesn\'t leave.</p>';
    }

    // Street Preacher — rare appearances at L03 and L05
    if (!forgetting && (locId === 'L03' || locId === 'L05') && period === 'afternoon' && Math.random() < 0.15) {
      const preacherLines = locId === 'L03'
        ? 'A man stands by the churchyard gate. He speaks to no one. "The stones remember. The water remembers. Only we choose to forget."'
        : 'A voice from the corner, unhurried. "This pub was here before the street. The street was here before the city. The city was here before the name."';
      html += '<p class="ambient-encounter">' + preacherLines + '</p>';
    }

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
        if (remembered) showRemembered(remembered);
      }
    });

    // NPC interaction (one conversation per location visit)
    panel.querySelectorAll('.npc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const result = Game.interactWithNpc(btn.dataset.npc);
        if (result) {
          Engine.audio.playNpcGreet();
          showDialogue(result);
        }
      }, { once: true }); // only fires once — no spam-clicking
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

        if (result && result.thought) {
          Engine.setLocation(targetId);
          Engine.setTimePeriod(Game.getTimePeriod());
          showWalkingThought(result.thought, () => showLocation());
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
  }

  // --- Lore Fragment ---

  function showFragment(fragment) {
    Engine.onCanvasTap(null);
    Engine.audio.playInvestigation();
    Game.discoverFragment(fragment.id);

    let html = '<p class="fragment-title">' + esc(fragment.title) + '</p>';
    html += '<p class="fragment-text">' + esc(fragment.text) + '</p>';
    html += '<p class="discovery-xp">Awareness +1 · Resonance +1</p>';
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
    if (detail.xp && detail.xp.awareness) {
      html += '<p class="discovery-xp">Awareness +' + detail.xp.awareness + '</p>';
    }
    html += '<button class="discovery-back-btn">...' + (_seenEllipsis ? '' : '<span class="ellipsis-hint">continue</span>') + '</button>';

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
    const { line, stage, stageChanged, npc } = result;

    let html = '<p class="npc-name">' + esc(npc.name) + '</p>';
    if (stageChanged) {
      html += '<p class="stage-shift">Something has shifted.</p>';
    }
    html += '<p class="npc-dialogue">' + esc(line.text) + '</p>';
    const details = npc.physicalSignature.split('. ').map(s => s.replace(/\.$/, ''));
    html += '<p class="npc-physical">' + esc(details[Math.floor(Math.random() * details.length)]) + '.</p>';
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
    Engine.audio.playInvestigation();
    const step = triggered.step;

    let html = '<p class="inv-name">' + esc(triggered.investigation.name) + '</p>';
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

    let html = '<p class="inv-name">' + esc(investigation.name) + '</p>';
    html += '<p class="inv-choice-prompt">' + esc(choice.prompt) + '</p>';
    html += '<div class="inv-choices">';
    for (const option of choice.options) {
      html += '<button class="inv-choice-btn" data-choice="' + esc(option.id) + '">' + esc(option.text) + '</button>';
    }
    html += '</div>';

    panel.innerHTML = html;

    panel.querySelectorAll('.inv-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const consequence = Game.makeInvestigationChoice(invId, btn.dataset.choice);
        if (consequence) showConsequence(investigation, consequence);
      });
    });
  }

  function showConsequence(investigation, consequence) {
    let html = '<p class="inv-name">' + esc(investigation.name) + '</p>';
    html += '<p class="inv-consequence">' + esc(consequence.narrativeText) + '</p>';

    if (consequence.xp) {
      const parts = [];
      for (const [stat, val] of Object.entries(consequence.xp)) {
        parts.push(stat.charAt(0).toUpperCase() + stat.slice(1) + ' +' + val);
      }
      html += '<p class="inv-xp">' + parts.join(' · ') + '</p>';
    }

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
    html += '<select id="ai-provider" style="background:#1a1a20;border:1px solid rgba(200,180,140,0.12);color:#c8b8a0;font-family:\'Courier New\',monospace;font-size:0.78rem;padding:0.4rem;width:100%;margin-top:0.4rem;">';
    for (const p of providers) {
      html += '<option value="' + esc(p.key) + '"' + (p.key === currentProvider ? ' selected' : '') + '>' + esc(p.name) + '</option>';
    }
    html += '</select>';
    html += '</div>';

    // Model select
    html += '<div class="notebook-entry">';
    html += '<p class="notebook-npc-name">Model</p>';
    html += '<select id="ai-model" style="background:#1a1a20;border:1px solid rgba(200,180,140,0.12);color:#c8b8a0;font-family:\'Courier New\',monospace;font-size:0.78rem;padding:0.4rem;width:100%;margin-top:0.4rem;">';
    const firstProvider = providers.find(p => p.key === currentProvider) || providers[0];
    for (const m of firstProvider.models) {
      html += '<option value="' + esc(m) + '">' + esc(m) + '</option>';
    }
    html += '</select>';
    html += '</div>';

    // API key
    html += '<div class="notebook-entry">';
    html += '<p class="notebook-npc-name">API Key</p>';
    html += '<input id="ai-key" type="password" placeholder="paste your key" style="background:#1a1a20;border:1px solid rgba(200,180,140,0.12);color:#c8b8a0;font-family:\'Courier New\',monospace;font-size:0.78rem;padding:0.4rem;width:100%;margin-top:0.4rem;">';
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

  return { init, showLocation };
})();
