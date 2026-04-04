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
      return pick(content.thoughts.flat.returning);
    }
    if (fromId === 'flat' && content.thoughts.flat) {
      return pick(content.thoughts.flat.leaving);
    }

    // Weather-specific thought
    if (_weather === 'rain' && content.thoughts.limehouse.weather && content.thoughts.limehouse.weather.rain) {
      if (Math.random() < 0.4) return pick(content.thoughts.limehouse.weather.rain);
    }

    // Time-specific thought
    const timePeriod = getTimePeriod();
    const timeThought = content.thoughts.limehouse.time[timePeriod];
    if (timeThought && Math.random() < 0.3) return timeThought;

    // Trait-specific thought
    if (trait && content.thoughts.limehouse[trait] && Math.random() < 0.25) {
      return pick(content.thoughts.limehouse[trait]);
    }

    // General Limehouse thought
    return pick(content.thoughts.limehouse.neutral);
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

    const result = [];
    for (const [npcId, schedule] of Object.entries(loc.npcs_present)) {
      const npc = content.npcs[npcId];
      if (!npc) continue;
      const available = schedule.timeOfDay.includes(period) && schedule.days.includes(today);
      result.push({ id: npcId, npc, available });
    }
    return result;
  }

  function getNpcStage(npcId) {
    const npc = content.npcs[npcId];
    if (!npc) return 'stranger';
    const mem = State.getNpcMemory(npcId);
    const stages = ['familiar', 'acquaintance'];
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
        return mem.stage;
      }
      return stage;
    }
    return 'stranger';
  }

  function interactWithNpc(npcId) {
    const npc = content.npcs[npcId];
    if (!npc) return null;

    State.recordNpcVisit(npcId);
    const mem = State.getNpcMemory(npcId);

    // Calculate stage and update if changed
    const newStage = getNpcStage(npcId);
    const oldStage = mem.stage;
    const stageChanged = newStage !== oldStage;
    if (stageChanged) State.setNpcStage(npcId, newStage);

    const stageData = npc.dialogue[newStage];
    if (!stageData) return null;

    // On stage transition or first visit in this stage, show entry line
    if (stageChanged || mem.visitCount === 1) {
      return { line: stageData.entry, stage: newStage, stageChanged, npc };
    }

    // Meier: soft progression hint — when close to next stage, show warmth
    const nextStages = ['acquaintance', 'familiar'];
    for (const ns of nextStages) {
      const nsTrigger = npc.dialogue[ns] && npc.dialogue[ns].trigger;
      if (nsTrigger && newStage !== ns && mem.visitCount === nsTrigger.visitCount - 1) {
        return { line: stageData.entry, stage: newStage, stageChanged: false, npc, nearStageShift: true };
      }
    }

    // Trait-specific line (25% chance)
    const trait = State.get('trait');
    if (trait && stageData.traitLines && stageData.traitLines[trait] && Math.random() < 0.25) {
      return { line: stageData.traitLines[trait], stage: newStage, stageChanged: false, npc };
    }

    // Ambient line
    if (stageData.ambient && stageData.ambient.length) {
      return { line: pick(stageData.ambient), stage: newStage, stageChanged: false, npc };
    }

    return { line: stageData.entry, stage: newStage, stageChanged: false, npc };
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
    for (const [id, inv] of Object.entries(content.investigations)) {
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
          if (stages.indexOf(mem.stage) < stages.indexOf(cond.minStage)) return false;
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

  // --- Lore Fragments ---

  function checkFragmentAtLocation(locId) {
    if (!content.fragments) return null;
    const trait = State.get('trait');
    const awareness = (State.get('stats') || {}).awareness || 0;
    for (const [id, frag] of Object.entries(content.fragments)) {
      if (frag.location !== locId) continue;
      if (frag.trait !== trait) continue;
      if (awareness < frag.awareness_required) continue;
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
    checkFragmentAtLocation, discoverFragment
  };
})();
