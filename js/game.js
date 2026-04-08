/**
 * game.js — Navigation, investigation logic, NPC interaction, time/weather
 * Milestone 2: NPC availability, dialogue selection, relationship stages
 */
const Game = (() => {
  const content = {};

  async function init() {
    const load = url => fetch(url).then(r => {
      if (!r.ok) throw new Error('Could not load ' + url);
      return r.json();
    });
    content.config = await load('content/config.json');
    content.locations = await load('content/locations.json');
    content.thoughts = await load('content/thoughts.json');
    content.npcs = await load('content/npcs.json');
    content.investigations = await load('content/investigations.json');
    content.fragments = await load('content/fragments.json');
  }

  // --- Time ---

  function getTimePeriod() {
    const hour = new Date().getHours();
    const periods = content.config.time.periods;
    for (const [name, p] of Object.entries(periods)) {
      if (name === 'night') {
        if (hour >= p.startHour || hour < p.endHour) return name;
      } else {
        if (hour >= p.startHour && hour < p.endHour) return name;
      }
    }
    return 'night';
  }

  function getTimePalette() {
    return content.config.time.palette[getTimePeriod()];
  }

  // --- Weather ---
  let _weather = 'clear';
  let _weatherNavCount = 0;
  function getWeather() { return _weather; }
  function rollWeather() {
    _weatherNavCount++;
    // Only reroll every 3-5 navigations
    if (_weatherNavCount >= 3 + Math.floor(Math.random() * 3)) {
      _weather = Math.random() < 0.25 ? 'rain' : 'clear';
      _weatherNavCount = 0;
    }
    return _weather;
  }

  // --- The Forgetting ---
  function isForgettingActive() {
    const now = Date.now();
    const daysSinceEpoch = Math.floor(now / 86400000);
    // Use a hash-like formula for less predictable windows
    const cycle = Math.floor(daysSinceEpoch / 7);
    const offset = ((cycle * 13 + 5) % 7); // varies which day each week
    const weekPos = daysSinceEpoch % 7;
    return weekPos === offset || weekPos === ((offset + 1) % 7);
  }

  // --- Navigation ---

  function navigate(targetId) {
    const fromId = State.get('location');
    const target = content.locations[targetId];
    if (!target) return null;

    const currentLoc = content.locations[State.get('location')];
    if (currentLoc && currentLoc.adjacentLocations && !currentLoc.adjacentLocations.includes(targetId)) {
      console.warn('Invalid navigation: ' + targetId + ' not adjacent to ' + State.get('location'));
      return null;
    }

    // Pick a walking thought for this route
    const thought = pickThought(fromId, targetId);

    // Update state
    State.visitLocation(targetId);

    return { thought, location: target };
  }

  function pickThought(fromId, toId) {
    const trait = State.get('trait');

    // Route-specific thoughts from destination location
    const dest = content.locations[toId];
    if (dest && dest.walkingThoughts) {
      const route = dest.walkingThoughts['from_' + fromId];
      if (route && route.length) return pick(route);
    }

    // Flat-specific thoughts
    if (toId === 'flat' && content.thoughts.flat) {
      const pool = content.thoughts.flat.returning;
      if (pool && pool.length) return pick(pool);
    }
    if (fromId === 'flat' && content.thoughts.flat) {
      const pool = content.thoughts.flat.leaving;
      if (pool && pool.length) return pick(pool);
    }

    // Determine neighborhood for thought selection
    const nbr = (dest && dest.neighborhood) || 'limehouse';
    const nbrThoughts = content.thoughts[nbr] || content.thoughts.limehouse;

    // Weather-specific thought
    if (_weather === 'rain' && nbrThoughts.weather && nbrThoughts.weather.rain) {
      if (Math.random() < 0.4) return pick(nbrThoughts.weather.rain);
    }

    // Time-specific thought
    const timePeriod = getTimePeriod();
    const timeThought = nbrThoughts.time && nbrThoughts.time[timePeriod];
    if (timeThought && Math.random() < 0.3) return timeThought;

    // Trait-specific thought
    if (trait && nbrThoughts[trait] && Math.random() < 0.25) {
      return pick(nbrThoughts[trait]);
    }

    // General neighborhood thought
    // Guard: fall back to limehouse neutral if the resolved neighborhood has no neutral array
    const neutralPool = (nbrThoughts && nbrThoughts.neutral && nbrThoughts.neutral.length)
      ? nbrThoughts.neutral
      : (content.thoughts.limehouse && content.thoughts.limehouse.neutral) || [];
    if (!neutralPool.length) return '';
    return pick(neutralPool);
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // --- Location Queries ---

  function getLocation(id) {
    return content.locations[id || State.get('location')];
  }

  function getAdjacentLocations(fromId) {
    const loc = content.locations[fromId || State.get('location')];
    if (!loc) return [];
    return loc.adjacentLocations
      .filter(id => content.locations[id])
      .map(id => ({ id, name: content.locations[id].name }));
  }

  function isLocationAvailable(id) {
    const loc = content.locations[id];
    if (!loc || !loc.available) return true;
    const period = getTimePeriod();
    return loc.available.timeOfDay.includes(period);
  }

  // --- NPCs ---

  function getNpcsAtLocation(locId) {
    const loc = content.locations[locId || State.get('location')];
    if (!loc || !loc.npcs_present) return [];
    const period = getTimePeriod();
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const today = dayNames[new Date().getDay()];

    // First-session grace: if the player has never met any NPC, override schedule
    // for the first NPC at this location so the world is never entirely empty on
    // the player's very first exploration.
    const allNpcMem = State.get('npcMemory') || {};
    const anyNpcEverMet = Object.values(allNpcMem).some(m => m && m.visitCount > 0);
    const graceActive = !anyNpcEverMet;

    const result = [];
    let graceUsed = false;
    for (const [npcId, schedule] of Object.entries(loc.npcs_present)) {
      const npc = content.npcs[npcId];
      if (!npc) continue;
      const normallyAvailable = schedule.timeOfDay.includes(period) && schedule.days.includes(today);
      // Grace: make the first (and only the first) NPC at this location available,
      // but only if no NPC here is normally available and grace hasn't been used yet.
      const available = normallyAvailable || (graceActive && !graceUsed && !result.some(e => e.available));
      if (available && !normallyAvailable) graceUsed = true;
      result.push({ id: npcId, npc, available });
    }
    return result;
  }

  function getNpcStage(npcId) {
    const npc = content.npcs[npcId];
    if (!npc) return 'stranger';
    const mem = State.getNpcMemory(npcId);
    const stages = ['acquaintance', 'familiar'];
    let highestStage = null;
    for (const stage of stages) {
      const trigger = npc.dialogue[stage] && npc.dialogue[stage].trigger;
      if (!trigger) continue;
      if (mem.visitCount < trigger.visitCount) continue;
      if (trigger.acrossDays && mem.visitDays.length < 2) continue;
      // requiresInvestigation check — skip for now if investigation not started
      if (trigger.requiresInvestigation) {
        const inv = State.get('investigations') || {};
        if (!inv[trigger.requiresInvestigation]) continue;
      }
      // If an investigation choice forced a variant of this stage (e.g. familiar_aware),
      // honour that variant rather than returning the base stage.
      if (mem.stage && mem.stage.startsWith(stage + '_') && npc.dialogue[mem.stage]) {
        highestStage = mem.stage;
      } else {
        highestStage = stage;
      }
    }
    return highestStage || 'stranger';
  }

  function interactWithNpc(npcId) {
    const npc = content.npcs[npcId];
    if (!npc) return null;

    State.recordNpcVisit(npcId);
    const forgetting = isForgettingActive();
    const mem = State.getNpcMemory(npcId);

    // Calculate stage and update if changed
    const newStage = getNpcStage(npcId);
    const oldStage = mem.stage;
    const stageChanged = newStage !== oldStage;
    if (stageChanged) State.setNpcStage(npcId, newStage);

    const stageData = npc.dialogue[newStage];
    if (!stageData) return null;

    // The Forgetting: familiar NPCs feel like acquaintances — the mythological
    // warmth recedes and only the surface relationship remains
    const effectiveStageData = forgetting && newStage.startsWith('familiar') && npc.dialogue['acquaintance']
      ? npc.dialogue['acquaintance']
      : stageData;

    // On stage transition or first visit in this stage, show entry line
    if (stageChanged || mem.visitCount === 1) {
      return { line: effectiveStageData.entry, stage: newStage, stageChanged, npc, forgetting };
    }

    // Meier: soft progression hint — when close to next stage, show warmth
    const nextStages = ['acquaintance', 'familiar'];
    for (const ns of nextStages) {
      const nsTrigger = npc.dialogue[ns] && npc.dialogue[ns].trigger;
      if (nsTrigger && newStage !== ns && mem.visitCount === nsTrigger.visitCount - 1) {
        return { line: effectiveStageData.entry, stage: newStage, stageChanged: false, npc, nearStageShift: true, forgetting };
      }
    }

    // Weather-variant line (20% chance)
    const weather = getWeather();
    if (effectiveStageData.weatherLines && effectiveStageData.weatherLines[weather] && Math.random() < 0.20) {
      return { line: effectiveStageData.weatherLines[weather], stage: newStage, stageChanged: false, npc, forgetting };
    }

    // Time-variant line (20% chance)
    const timePd = getTimePeriod();
    if (effectiveStageData.timeLines && effectiveStageData.timeLines[timePd] && Math.random() < 0.20) {
      return { line: effectiveStageData.timeLines[timePd], stage: newStage, stageChanged: false, npc, forgetting };
    }

    // Trait-specific line (25% chance) — suppressed during Forgetting (mythological layer quiet)
    const trait = State.get('trait');
    if (!forgetting && trait && effectiveStageData.traitLines && effectiveStageData.traitLines[trait] && Math.random() < 0.25) {
      return { line: effectiveStageData.traitLines[trait], stage: newStage, stageChanged: false, npc, forgetting };
    }

    // Cross-reference lines — suppressed during Forgetting, fires once per NPC
    // Stat interaction: high awareness + connection reduces the NPC threshold by 1
    if (!forgetting && stageData.crossReference && !State.get('crossRef_' + npcId)) {
      const npcMemAll = State.get('npcMemory') || {};
      const metCount = Object.keys(npcMemAll).filter(id => npcMemAll[id] && npcMemAll[id].visitCount > 0).length;
      const stats = State.get('stats') || {};
      const crossRefThreshold = ((stats.awareness || 0) >= 6 && (stats.connection || 0) >= 4)
        ? Math.max(1, stageData.crossReference.minNpcsMet - 1)
        : stageData.crossReference.minNpcsMet;
      if (metCount >= crossRefThreshold) {
        State.set('crossRef_' + npcId, true);
        return { line: { text: stageData.crossReference.text, tag: 'neutral' }, stage: newStage, stageChanged: false, npc, forgetting };
      }
    }

    // Ambient line
    if (effectiveStageData.ambient && effectiveStageData.ambient.length) {
      return { line: pick(effectiveStageData.ambient), stage: newStage, stageChanged: false, npc, forgetting };
    }

    return { line: effectiveStageData.entry, stage: newStage, stageChanged: false, npc, forgetting };
  }

  // --- Noticing ---

  function checkDetailAt(cx, cy) {
    const locId = State.get('location');
    const loc = content.locations[locId];
    if (!loc || !loc.interactableDetails) return null;

    const trait = State.get('trait');
    const awareness = (State.get('stats') || {}).awareness || 0;

    const period = getTimePeriod();

    for (const detail of loc.interactableDetails) {
      if (State.isDiscovered(detail.id)) continue;
      if (detail.trait_required && detail.trait_required !== trait) continue;
      if (detail.awareness_required > awareness) continue;
      // Time-of-day gate
      if (detail.timeOfDay && !detail.timeOfDay.includes(period)) continue;
      // Weather gate
      if (detail.weather && !detail.weather.includes(getWeather())) continue;
      // Investigation gate
      if (detail.requires_investigation) {
        const req = detail.requires_investigation;
        const inv = State.getInvestigation(req.id);
        if (inv.currentStep < req.minStep) continue;
      }
      // Deep discovery gate — only appears when all other details at this location are found
      if (detail.requires_all_discovered) {
        const otherDetails = loc.interactableDetails.filter(d => d.id !== detail.id && !d.requires_all_discovered);
        const allOthersFound = otherDetails.every(d => State.isDiscovered(d.id));
        if (!allOthersFound) continue;
      }
      const h = detail.hitbox;
      if (cx >= h.x && cx <= h.x + h.w && cy >= h.y && cy <= h.y + h.h) {
        return detail;
      }
    }
    return null;
  }

  function discoverDetail(detail) {
    const isNew = State.recordDiscovery(detail.id, detail.xp);
    if (isNew) checkInvestigationAdvance(detail.id);
    return isNew;
  }

  // Check if tapping a previously discovered detail
  function checkDiscoveredDetailAt(cx, cy) {
    const locId = State.get('location');
    const loc = content.locations[locId];
    if (!loc || !loc.interactableDetails) return null;
    for (const detail of loc.interactableDetails) {
      if (!State.isDiscovered(detail.id)) continue;
      const h = detail.hitbox;
      if (cx >= h.x && cx <= h.x + h.w && cy >= h.y && cy <= h.y + h.h) {
        return detail;
      }
    }
    return null;
  }

  // --- Investigations ---

  function checkInvestigationTriggers() {
    const triggered = [];
    const playerTrait = State.get('trait');
    for (const [id, inv] of Object.entries(content.investigations)) {
      // Trait gate: skip investigations meant for a specific trait the player doesn't have
      if (inv.trait && inv.trait !== 'all' && inv.trait !== playerTrait) continue;
      const stateInv = State.getInvestigation(id);
      if (stateInv.currentStep > 0 || stateInv.complete) continue;
      if (meetsConditions(inv.trigger.conditions)) {
        State.advanceInvestigation(id, 1);
        triggered.push({ id, investigation: inv, step: inv.steps[0] });
      }
    }
    return triggered;
  }

  function meetsConditions(conditions) {
    for (const cond of conditions) {
      switch (cond.type) {
        case 'npc_stage': {
          const mem = State.getNpcMemory(cond.npc);
          const stages = ['stranger', 'acquaintance', 'familiar', 'confidant'];
          // Normalize familiar_aware / familiar_unknowing to 'familiar' for ordering purposes
          const normalizeStage = s => (s && s.startsWith('familiar')) ? 'familiar' : s;
          if (stages.indexOf(normalizeStage(mem.stage)) < stages.indexOf(normalizeStage(cond.minStage))) return false;
          break;
        }
        case 'discovery':
          if (!State.isDiscovered(cond.detail)) return false;
          break;
        case 'visit_count': {
          const visits = State.getLocationVisitCount(cond.location);
          if (visits < cond.count) return false;
          break;
        }
        case 'stat_min': {
          const stats = State.get('stats') || {};
          if ((stats[cond.stat] || 0) < cond.value) return false;
          break;
        }
      }
    }
    return true;
  }

  function checkInvestigationAdvance(detailId) {
    for (const [id, inv] of Object.entries(content.investigations)) {
      const stateInv = State.getInvestigation(id);
      if (stateInv.complete || stateInv.currentStep === 0) continue;
      const nextStepIdx = stateInv.currentStep; // steps are 1-indexed, array is 0-indexed
      if (nextStepIdx >= inv.steps.length) continue;
      const nextStep = inv.steps[nextStepIdx];
      if (nextStep.advanceTrigger === 'automatic') continue;
      if (nextStep.advanceTrigger.type === 'detail' && nextStep.advanceTrigger.detail === detailId) {
        State.advanceInvestigation(id, nextStep.id);
        // Auto-complete choiceless investigations that reach their final step
        if (nextStepIdx >= inv.steps.length - 1 && !inv.choice) {
          State.completeInvestigation(id, null, inv.rewards && inv.rewards.completion);
        }
      }
    }
  }

  function getActiveInvestigations() {
    const result = [];
    for (const [id, inv] of Object.entries(content.investigations)) {
      const stateInv = State.getInvestigation(id);
      if (stateInv.currentStep > 0) {
        result.push({ id, investigation: inv, state: stateInv });
      }
    }
    return result;
  }

  function getInvestigationChoice(invId) {
    const inv = content.investigations[invId];
    const stateInv = State.getInvestigation(invId);
    if (!inv || !inv.choice || stateInv.complete) return null;
    if (stateInv.currentStep >= inv.choice.triggeredAfterStep) {
      return inv.choice;
    }
    return null;
  }

  function makeInvestigationChoice(invId, optionId) {
    const inv = content.investigations[invId];
    if (!inv) return null;
    if (!inv.choice) return null;
    const stateInv = State.getInvestigation(invId);
    if (stateInv.complete) return null;
    const option = inv.choice.options.find(o => o.id === optionId);
    if (!option) return null;
    const consequence = option.consequence;

    // Award choice XP
    State.completeInvestigation(invId, optionId, consequence.xp);

    // Award completion rewards
    if (inv.rewards && inv.rewards.completion) {
      for (const [stat, val] of Object.entries(inv.rewards.completion)) {
        if (typeof val === 'number') {
          const stats = State.get('stats');
          stats[stat] = (stats[stat] || 0) + val;
          State.set('stats', stats);
        }
      }
    }

    // NPC effects
    if (consequence.npcEffect) {
      for (const [npcId, effect] of Object.entries(consequence.npcEffect)) {
        if (effect.stageUnlock) {
          State.setNpcStage(npcId, effect.stageUnlock);
        }
      }
    }

    // Flat object
    if (consequence.flatObject) {
      State.addFlatObject(consequence.flatObject);
    }

    return consequence;
  }

  // --- Seasons, Tides, City Events ---

  // Returns 'spring' | 'summer' | 'autumn' | 'winter'
  function getSeason() {
    const month = new Date().getMonth(); // 0-11
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }

  // Returns 'restless' | 'deep' | 'bright' | 'still'
  // Seeded by day-of-year so it's consistent within a day
  function getMythologicalTide() {
    const season = getSeason();
    const tideConfig = (content.config && content.config.tides) || {};
    const now = new Date();
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);

    // Build weighted pool based on season
    const tideTypes = ['restless', 'deep', 'bright', 'still'];
    const pool = [];
    tideTypes.forEach(t => {
      const cfg = tideConfig[t];
      const weight = cfg ? (cfg.seasonWeights[season] || 0) : 1;
      for (let i = 0; i < weight; i++) pool.push(t);
    });
    // Fallback if pool is empty (e.g. winter with no bright entries)
    if (!pool.length) pool.push('still');

    // Simulate cycling: use the seed to determine current position in a cycle
    // Each tide lasts roughly 4 days; divide the year into periods
    const periodSeed = Math.floor(dayOfYear / 4);
    const tideSeed = (periodSeed * 1664525 + 1013904223) >>> 0;
    const idx = tideSeed % pool.length;
    return pool[idx];
  }

  // Returns the current active city event object or null
  function getCurrentCityEvent() {
    const events = (content.config && content.config.cityEvents) || [];
    if (!events.length) return null;

    const now = new Date();
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);

    // New event every ~18 days (roughly 2-3 weeks)
    const eventPeriod = 18;
    const eventIndex = Math.floor(dayOfYear / eventPeriod) % events.length;
    const event = events[eventIndex];

    // Check if within the event's duration window
    const dayInPeriod = dayOfYear % eventPeriod;
    if (dayInPeriod < event.duration) return event;
    return null;
  }

  // --- Leave London ---

  function canLeaveLondon() {
    const investigations = State.get('investigations') || {};
    const completed = Object.values(investigations).filter(i => i.complete).length;
    const npcMem = State.get('npcMemory') || {};
    const npcsMet = Object.keys(npcMem).filter(id => npcMem[id] && npcMem[id].visitCount > 0).length;
    return completed >= 3 && npcsMet >= 5;
  }

  // --- Lore Fragments ---

  function checkFragmentAtLocation(locId) {
    if (!content.fragments) return null;
    const trait = State.get('trait');
    const stats = State.get('stats') || {};
    const awareness = stats.awareness || 0;
    // Stat interaction: high resonance lowers the awareness threshold for fragments
    const resonanceBonus = (stats.resonance || 0) >= 4 ? 1 : 0;
    for (const [id, frag] of Object.entries(content.fragments)) {
      if (frag.location !== locId) continue;
      if (frag.trait !== trait) continue;
      if (awareness < frag.awareness_required - resonanceBonus) continue;
      if (State.get('discoveries').includes('frag_' + id)) continue;
      return frag;
    }
    return null;
  }

  function discoverFragment(fragId) {
    const key = 'frag_' + fragId;
    if (State.get('discoveries').includes(key)) return false;
    State.recordDiscovery(key, { awareness: 1, resonance: 1 });
    return true;
  }

  return {
    init, content,
    getTimePeriod, getTimePalette, getWeather, rollWeather, isForgettingActive,
    navigate, getLocation, getAdjacentLocations, isLocationAvailable,
    getNpcsAtLocation, getNpcStage, interactWithNpc,
    checkDetailAt, discoverDetail, checkDiscoveredDetailAt,
    checkInvestigationTriggers, getActiveInvestigations, getInvestigationChoice, makeInvestigationChoice,
    checkFragmentAtLocation, discoverFragment,
    canLeaveLondon,
    getSeason, getMythologicalTide, getCurrentCityEvent
  };
})();
