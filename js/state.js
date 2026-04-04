/**
 * state.js — Central state, save/load, progression, NPC memory
 * Milestone 2: NPC visit tracking, relationship stages, day tracking
 */
const State = (() => {
  const SAVE_KEY = 'trace_save';

  const defaults = {
    version: 1,
    trait: null,
    location: 'flat',
    visitedLocations: [],
    locationVisitCounts: {},
    stats: { awareness: 0, connection: 0, insight: 0, resonance: 0 },
    npcMemory: {},
    investigations: {},
    discoveries: [],
    flatObjects: [],
    homeReflections: [],
    firstPlay: true,
    createdAt: null,
    lastPlayed: null
  };

  let state = JSON.parse(JSON.stringify(defaults));
  let _saveTimer = null;

  function save() {
    state.lastPlayed = Date.now();
    // state.version persists automatically — bump in defaults when schema changes
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Save failed:', e);
      try { window.dispatchEvent(new CustomEvent('save-error', { detail: e.message })); } catch (_) {}
    }
  }

  function _debouncedSave() {
    if (_saveTimer) return;
    _saveTimer = setTimeout(() => {
      _saveTimer = null;
      save();
    }, 500);
  }

  // Security: valid location IDs and trait names to prevent injection via crafted save data.
  // If a location/trait from localStorage doesn't match this allowlist, the save is rejected.
  const VALID_LOCATIONS = ['flat','L01','L02','L03','L04','L05','L06','L07','L08','L09','L10'];
  const VALID_TRAITS = ['musician','photographer','wanderer','barista','shopkeeper'];

  // Security: strip __proto__, constructor, and prototype keys from parsed JSON to prevent
  // prototype pollution via crafted localStorage data. Object.assign would otherwise copy
  // these poisoned keys onto the state object (or Object.prototype).
  function _sanitizeObject(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(_sanitizeObject);
    const clean = {};
    for (const key of Object.keys(obj)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      clean[key] = _sanitizeObject(obj[key]);
    }
    return clean;
  }

  function load() {
    try {
      const data = localStorage.getItem(SAVE_KEY);
      if (data) {
        const raw = JSON.parse(data);
        // Validate critical fields
        if (typeof raw !== 'object' || !raw.location) {
          console.warn('Corrupted save — resetting.');
          reset();
          return false;
        }
        // Security: sanitize parsed data to prevent prototype pollution
        const parsed = _sanitizeObject(raw);
        // Security: validate location is a known location ID
        if (typeof parsed.location !== 'string' || !VALID_LOCATIONS.includes(parsed.location)) {
          console.warn('Invalid location in save — resetting.');
          reset();
          return false;
        }
        // Security: validate trait is a known trait (or null for pre-creation saves)
        if (parsed.trait !== null && (typeof parsed.trait !== 'string' || !VALID_TRAITS.includes(parsed.trait))) {
          console.warn('Invalid trait in save — resetting.');
          reset();
          return false;
        }
        state = Object.assign(JSON.parse(JSON.stringify(defaults)), parsed);
        // Save versioning — enables future migration
        if (typeof state.version !== 'number' || state.version < 1) {
          state.version = 1;
        }
        // Ensure arrays exist (guard against partial corruption)
        if (!Array.isArray(state.visitedLocations)) state.visitedLocations = [];
        if (!Array.isArray(state.discoveries)) state.discoveries = [];
        if (!Array.isArray(state.flatObjects)) state.flatObjects = [];
        if (!Array.isArray(state.homeReflections)) state.homeReflections = [];
        if (typeof state.stats !== 'object') state.stats = { awareness: 0, connection: 0, insight: 0, resonance: 0 };
        if (typeof state.npcMemory !== 'object') state.npcMemory = {};
        if (typeof state.investigations !== 'object') state.investigations = {};
        if (typeof state.locationVisitCounts !== 'object') state.locationVisitCounts = {};
        // Security: cap array sizes to prevent memory exhaustion from crafted saves
        const MAX_ARRAY = 10000;
        if (state.visitedLocations.length > MAX_ARRAY) state.visitedLocations = state.visitedLocations.slice(0, MAX_ARRAY);
        if (state.discoveries.length > MAX_ARRAY) state.discoveries = state.discoveries.slice(0, MAX_ARRAY);
        if (state.flatObjects.length > MAX_ARRAY) state.flatObjects = state.flatObjects.slice(0, MAX_ARRAY);
        if (state.homeReflections.length > MAX_ARRAY) state.homeReflections = state.homeReflections.slice(0, MAX_ARRAY);
        // Security: cap stat values to prevent numeric overflow from crafted saves
        for (const stat of Object.keys(state.stats)) {
          if (typeof state.stats[stat] !== 'number' || !isFinite(state.stats[stat])) state.stats[stat] = 0;
          state.stats[stat] = Math.max(0, Math.min(state.stats[stat], 9999));
        }
        return true;
      }
    } catch (e) {
      console.warn('Load failed, resetting:', e);
      reset();
    }
    return false;
  }

  function reset() {
    localStorage.removeItem(SAVE_KEY);
    state = JSON.parse(JSON.stringify(defaults));
  }

  /** Returns direct reference — callers must call save() after mutation */
  function get(key) { return state[key]; }

  function set(key, value) {
    // Security: validate trait and location values at write time to prevent
    // injection of arbitrary strings into class names or object lookups.
    if (key === 'trait' && value !== null && !VALID_TRAITS.includes(value)) {
      console.warn('State.set: invalid trait rejected:', value);
      return;
    }
    if (key === 'location' && !VALID_LOCATIONS.includes(value)) {
      console.warn('State.set: invalid location rejected:', value);
      return;
    }
    state[key] = value;
    _debouncedSave();
  }

  function visitLocation(id) {
    // Security: validate location ID before writing to state
    if (!VALID_LOCATIONS.includes(id)) {
      console.warn('visitLocation: invalid location rejected:', id);
      return;
    }
    if (!state.visitedLocations.includes(id)) {
      state.visitedLocations.push(id);
    }
    state.locationVisitCounts[id] = (state.locationVisitCounts[id] || 0) + 1;
    state.location = id;
    save();
  }

  function getLocationVisitCount(id) {
    return state.locationVisitCounts[id] || 0;
  }

  function hasSave() {
    try {
      return localStorage.getItem(SAVE_KEY) !== null;
    } catch (e) {
      return false;
    }
  }

  // --- NPC Memory ---

  function _npc(id) {
    if (!state.npcMemory[id]) {
      state.npcMemory[id] = { visitCount: 0, visitDays: [], stage: 'stranger', lastVisit: null };
    }
    return state.npcMemory[id];
  }

  function recordNpcVisit(id) {
    const mem = _npc(id);
    mem.visitCount++;
    mem.lastVisit = Date.now();
    const today = new Date().toDateString();
    if (!mem.visitDays.includes(today)) {
      mem.visitDays.push(today);
    }
    save();
  }

  function getNpcMemory(id) {
    return _npc(id);
  }

  function setNpcStage(id, stage) {
    _npc(id).stage = stage;
    save();
  }

  // --- Discoveries ---

  function isDiscovered(detailId) {
    return state.discoveries.includes(detailId);
  }

  function recordDiscovery(detailId, xp) {
    if (state.discoveries.includes(detailId)) return false;
    state.discoveries.push(detailId);
    if (xp) {
      for (const [stat, val] of Object.entries(xp)) {
        if (state.stats[stat] !== undefined) state.stats[stat] += val;
      }
    }
    save();
    return true;
  }

  // --- Investigations ---

  function getInvestigation(id) {
    if (!state.investigations[id]) {
      state.investigations[id] = { currentStep: 0, stepTimestamps: {}, choiceMade: null, complete: false };
    }
    return state.investigations[id];
  }

  function advanceInvestigation(id, step) {
    const inv = getInvestigation(id);
    inv.currentStep = step;
    inv.stepTimestamps[step] = Date.now();
    save();
  }

  function completeInvestigation(id, choiceId, xp) {
    const inv = getInvestigation(id);
    inv.choiceMade = choiceId;
    inv.complete = true;
    if (xp) {
      for (const [stat, val] of Object.entries(xp)) {
        if (state.stats[stat] !== undefined) state.stats[stat] += val;
      }
    }
    save();
  }

  function addFlatObject(obj) {
    if (obj && !state.flatObjects.find(o => o.id === obj.id)) {
      state.flatObjects.push(obj);
      save();
    }
  }

  return { save, load, reset, get, set, visitLocation, getLocationVisitCount, hasSave, recordNpcVisit, getNpcMemory, setNpcStage, isDiscovered, recordDiscovery, getInvestigation, advanceInvestigation, completeInvestigation, addFlatObject };
})();
