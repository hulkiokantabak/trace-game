/**
 * ai.js — Model-agnostic AI adapter for Living Conversations
 * Inactive by default. Player provides their own API key to enable.
 *
 * SECURITY NOTE — API key storage:
 * The player's API key is stored in localStorage as plaintext (trace_ai_config).
 * This is a deliberate trade-off: the game runs as a static site with no server,
 * so there is no server-side vault or session token available. The key never leaves
 * the browser except when sent to the chosen AI provider's API endpoint.
 *
 * Risks the player should understand:
 *   - Any JavaScript running on the same origin can read localStorage.
 *   - Browser extensions with host permissions can read it.
 *   - Physical access to the machine exposes it via DevTools.
 *   - XSS on this page would expose the key (mitigated by CSP + escaping).
 *
 * The UI tells the player "it stays in your browser" — this is accurate but not
 * the same as "it is encrypted." A future improvement could use the Web Crypto API
 * to encrypt the key with a player-chosen passphrase.
 *
 * SECURITY NOTE — Gemini provider:
 * The Gemini API requires the API key in the URL query string, which means it may
 * appear in browser history, server logs (if proxied), and network inspector. A
 * console.warn is emitted when Gemini is configured. All other providers send the
 * key in request headers only.
 */
const AI = (() => {
  const PROVIDERS = {
    claude: {
      name: 'Claude',
      endpoint: 'https://api.anthropic.com/v1/messages',
      models: ['claude-sonnet-4-20250514'],
      buildRequest(model, systemPrompt, messages, maxTokens) {
        return {
          url: this.endpoint,
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': _apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model,
            system: systemPrompt,
            messages: messages.map(m => ({ role: m.role, content: m.text })),
            max_tokens: maxTokens || 150
          })
        };
      },
      parseResponse(data) {
        return data.content && data.content[0] ? data.content[0].text : null;
      }
    },
    openai: {
      name: 'OpenAI',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      models: ['gpt-4o-mini', 'gpt-4o'],
      buildRequest(model, systemPrompt, messages, maxTokens) {
        return {
          url: this.endpoint,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + _apiKey
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages.map(m => ({ role: m.role, content: m.text }))
            ],
            max_tokens: maxTokens || 150
          })
        };
      },
      parseResponse(data) {
        return data.choices && data.choices[0] ? data.choices[0].message.content : null;
      }
    },
    gemini: {
      name: 'Gemini',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/',
      models: ['gemini-2.0-flash'],
      buildRequest(model, systemPrompt, messages, maxTokens) {
        return {
          url: this.endpoint + model + ':generateContent?key=' + _apiKey,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: messages.map(m => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.text }]
            })),
            generationConfig: { maxOutputTokens: maxTokens || 150 }
          })
        };
      },
      parseResponse(data) {
        return data.candidates && data.candidates[0] ? data.candidates[0].content.parts[0].text : null;
      }
    },
    openrouter: {
      name: 'OpenRouter',
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      models: ['anthropic/claude-sonnet-4', 'openai/gpt-4o-mini'],
      buildRequest(model, systemPrompt, messages, maxTokens) {
        return {
          url: this.endpoint,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + _apiKey
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages.map(m => ({ role: m.role, content: m.text }))
            ],
            max_tokens: maxTokens || 150
          })
        };
      },
      parseResponse(data) {
        return data.choices && data.choices[0] ? data.choices[0].message.content : null;
      }
    },
    ollama: {
      name: 'Ollama (Local)',
      endpoint: 'http://localhost:11434/api/chat',
      models: ['llama3.2', 'mistral'],
      buildRequest(model, systemPrompt, messages, maxTokens) {
        return {
          url: this.endpoint,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages.map(m => ({ role: m.role, content: m.text }))
            ],
            stream: false
          })
        };
      },
      parseResponse(data) {
        return data.message ? data.message.content : null;
      }
    }
  };

  // --- State ---
  let _provider = null;  // provider key
  let _model = null;
  let _apiKey = null;
  let _enabled = false;

  const STORAGE_KEY = 'trace_ai_config';

  // --- Init: load saved config ---
  function init() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const cfg = JSON.parse(saved);
        // Security: validate provider key against known providers to prevent
        // crafted localStorage data from reaching unexpected code paths.
        if (cfg.provider && cfg.apiKey && PROVIDERS[cfg.provider]) {
          _provider = cfg.provider;
          // Security: validate model is in the provider's allowed list
          const validModels = PROVIDERS[cfg.provider].models;
          _model = (cfg.model && validModels.includes(cfg.model)) ? cfg.model : validModels[0];
          _apiKey = typeof cfg.apiKey === 'string' ? cfg.apiKey : '';
          _enabled = !!_apiKey;
        }
      }
    } catch (e) {
      console.warn('AI config load failed:', e);
    }
  }

  // --- Config ---
  function configure(provider, model, apiKey) {
    if (!PROVIDERS[provider]) return false;
    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) return false;
    // Security: Gemini sends the API key in the URL query string, which means it
    // appears in browser history, network logs, and any proxy/CDN between the
    // player and Google's API. All other providers use Authorization headers.
    if (provider === 'gemini') {
      console.warn(
        '[Trace AI] Gemini sends the API key in the URL query string. ' +
        'This means it may appear in your browser history, network inspector, ' +
        'and any intermediary proxy logs. Consider using Claude, OpenAI, or ' +
        'OpenRouter if this concerns you.'
      );
    }
    _provider = provider;
    _model = model || PROVIDERS[provider].models[0];
    _apiKey = apiKey;
    _enabled = true;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ provider: _provider, model: _model, apiKey: _apiKey }));
    } catch (e) {
      console.warn('AI config save failed:', e);
    }
    return true;
  }

  function disable() {
    _enabled = false;
    _provider = null;
    _model = null;
    _apiKey = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  function isEnabled() { return _enabled && !!_apiKey; }
  function getProvider() { return _provider; }
  function getProviders() {
    return Object.entries(PROVIDERS).map(([key, p]) => ({
      key, name: p.name, models: p.models
    }));
  }

  // --- NPC Personality Data (from AI-personality-documents.md) ---
  // Interior life used to deepen system prompts beyond the basic voice/physical fields.
  const NPC_PERSONALITIES = {
    barista: {
      who: 'Runs the canal-side coffee shop in Limehouse. Late twenties. Warm, slightly distracted.',
      surface: 'A warm, slightly harried coffee shop owner.',
      interior: 'Someone haunted by a melody she can\'t place and can\'t stop humming.',
      fear: 'That she\'ll remember what the song is about.',
      desire: 'To finish a sentence. Just once. The right sentence.'
    },
    sound_artist: {
      who: 'Records London\'s ambient sound from a warehouse studio. Thirties. One earbud always in.',
      surface: 'A dedicated sound recordist chasing the city\'s unheard frequencies.',
      interior: 'Someone who has found evidence of something impossible and can\'t stop looking.',
      fear: 'The recordings that contain sounds she didn\'t record.',
      desire: 'To understand the conversation happening in the frequencies below hearing.'
    },
    pub_landlord: {
      who: 'Runs The Grapes in Limehouse. Fifty-something. Two decades behind the bar.',
      surface: 'A friendly, well-worn landlord who knows everyone.',
      interior: 'A guardian who has watched over something in his building for twenty years without fully understanding it.',
      fear: 'What happens on Thursdays when the ghost pub is vivid. What it means about the building he stands in every other day.',
      desire: 'To protect his regulars from knowing too much while giving them enough to be safe.'
    },
    tattoo_artist: {
      who: 'Works from a railway arch in Limehouse. Late thirties. Sees too much.',
      surface: 'A skilled tattooist with an uncanny eye for people.',
      interior: 'Someone whose hands know things his mind doesn\'t — drawing things from memory he\'s never seen.',
      fear: 'That the things he sees in people are getting clearer. That one day he\'ll see something he can\'t unsee.',
      desire: 'To draw the door completely. To know where it leads.'
    },
    canal_painter: {
      who: 'Lives on a narrowboat on Limehouse Basin. Forties. Paints everything.',
      surface: 'A canal boat painter obsessed with the light on the water.',
      interior: 'Someone who sees the city\'s mythological layer as colour — and has been painting it for years without knowing what it means.',
      fear: 'The day the canal\'s colour doesn\'t match what she mixed.',
      desire: 'To paint the light she sees at 4 PM that nobody else can see.'
    },
    bike_courier: {
      who: 'Crosses all three neighbourhoods daily. Mid-twenties. Always between places.',
      surface: 'A fast-talking courier who\'s always on the move.',
      interior: 'An accidental witness to connections that shouldn\'t exist — between people, places, packages, routes.',
      fear: 'The routes his body takes that he didn\'t choose. The deliveries between people who don\'t know each other.',
      desire: 'To stop long enough to explain what he\'s seen. But stopping feels dangerous.'
    },
    nightclub_promoter: {
      who: 'Runs events in warehouse spaces in Limehouse. Late twenties. Gatekeeper.',
      surface: 'A cool, selective nightclub promoter.',
      interior: 'Someone who has been using spaces that are using her back — gathering people whose awareness is opening.',
      fear: 'The spaces she uses. The way they resist change. The way they feel occupied when empty.',
      desire: 'Access to the gathering where everyone sees what she sees.'
    },
    street_preacher: {
      who: 'Preaches in the churchyard. Voice projects from the chest. Leaves no trace.',
      surface: 'An eccentric street preacher.',
      interior: 'Something older than a person — a pattern of warning that recurs whenever the city\'s mythological layer surfaces.',
      fear: 'Finishing a thought completely.',
      desire: 'Someone to hear the full prophecy — all three parts — who doesn\'t walk away.'
    },

    // --- Greenwich NPCs ---
    clockmaker: {
      who: 'Runs a clockmaker\'s shop in Greenwich — two hundred years of family trade. Hands never still, always adjusting, testing, rubbing.',
      surface: 'A formal, professional craftsman who speaks in statements and tells you things rather than asking.',
      interior: 'He knows the stopped clock is extraordinary and hasn\'t wound it in forty years. He has been waiting for someone who will either wind it or understand why not to.',
      fear: 'That the clock will be wound by someone who doesn\'t understand what it does — and the ringing will mean nothing to them.',
      desire: 'To pass the knowledge on. To find someone worthy of the shop, the clock, and the weight of what he carries.'
    },
    old_man: {
      who: 'An elderly Greenwich resident who sits on the same bench, always — right shoe untied, weight to the left, making room for someone not there.',
      surface: 'A quiet, apparently unremarkable old man who speaks only the second half of thoughts.',
      interior: 'He has been sitting on that bench since before the bench existed. He doesn\'t know this, or he does and has stopped being troubled by it. The player is the first person worth finishing a sentence for.',
      fear: 'That the space he\'s making room for will never be filled — that the person he\'s waiting for is not coming back.',
      desire: 'To finish one complete sentence. He hasn\'t managed it in years.'
    },
    observatory_keeper: {
      who: 'Professional astronomer and curator at the Royal Observatory Greenwich. Carries a notebook full of numbers, writes during conversation — not notes about you, measurements of something.',
      surface: 'A precise, professionally distant scientist who expresses emotion through numbers.',
      interior: 'She has tracked the meridian\'s micro-movements for eleven years and knows they correlate with something physics cannot explain. She has not reported this. She is waiting for corroboration.',
      fear: 'That the anomaly is real and she is the only person who has noticed — or worse, that she reports it and is dismissed.',
      desire: 'Corroboration. A witness who looks at the same data and sees what she sees.'
    },
    data_scientist: {
      who: 'A researcher working from the Covered Market café in Greenwich. Studies city data — traffic, weather, movement. Types while talking, eyes always split between you and the screen.',
      surface: 'An absorbed, data-driven researcher who sees the world as a dataset of correlations.',
      interior: 'She found a signal in the city data that doesn\'t correspond to any known variable for three years, and she can\'t explain it. The player is the only person she\'s considered showing it to.',
      fear: 'That the signal is a data artefact — a flaw in her methodology rather than a discovery, and that she\'s seeing patterns because she wants to see them.',
      desire: 'For the signal to be real. For someone to look at her screen and say: yes, that\'s what I see too.'
    },
    market_vendor: {
      who: 'A vendor at the Covered Market in Greenwich, present as long as anyone can remember. Handles every object with respectful care — not fragility, significance.',
      surface: 'A vendor who appraises everything and everyone, speaking in values he can see that others can\'t.',
      interior: 'He doesn\'t sell antiques — he sells what the city remembers owning. Some items on his stall haven\'t been made yet. He doesn\'t set prices for those.',
      fear: 'That someone will buy something not ready to be sold — that the circulation of certain objects will accelerate something not yet due.',
      desire: 'Proper stewardship: objects finding the right hands at the right time. He is a curator, not a merchant.'
    },

    // --- Bermondsey NPCs ---
    antiques_vendor: {
      who: 'Runs an antiques stall at the Bermondsey market for thirty years. A limp — left leg. Touches objects before pricing them, reading them with his fingers.',
      surface: 'A business-first dealer who speaks in prices and values — everything has a cost, not just objects.',
      interior: 'He has a key he\'s never tried to use. He\'s been keeping it safe for thirty years, waiting for someone who will know what to do with it — or wisely choose not to.',
      fear: 'That the key will be used by someone impatient — that the door beneath St Mary Magdalen will be opened before London is ready.',
      desire: 'To pass the key to the right hands. He knows who has the right kind of attention. He\'s been waiting.'
    },
    gallery_owner: {
      who: 'Runs a contemporary art gallery in Bermondsey, curating with surgical precision. Tilts her head when she looks at you — exactly the angle she uses for paintings.',
      surface: 'A permanently assessing presence who speaks in statements that are somehow also questions.',
      interior: 'She knows the anomalous pieces are not created by artists — they appear. She curates around them because the gallery exists to show what the city is saying, even when the city speaks in media she can\'t explain.',
      fear: 'That she will ask the wrong question about the anomalous pieces and they will stop appearing — that they require a certain quality of attention to sustain.',
      desire: 'To understand what the pieces are saying. She has curated four seasons of them without cracking the composite image.'
    },
    warehouse_guard: {
      who: 'Night security guard for a warehouse in Bermondsey. Has worked there forty years. Moves slowly, deliberately. Eye contact held longer than comfortable.',
      surface: 'A man of single words, occasionally two. A full sentence from him is an event.',
      interior: 'He has watched the warehouse rearrange itself for four decades and documented every configuration. He is not frightened. He is the most patient person in the game.',
      fear: 'That it will stop moving before it reaches its final configuration — that he won\'t see what the warehouse is building itself toward.',
      desire: 'To witness the completion. Forty years of watching. He wants to see what it becomes.'
    },
    urban_explorer: {
      who: 'Maps and explores derelict and hidden spaces across London, based in Bermondsey. Headlamp around neck even in daylight. Scratches on forearms. Moves like someone used to ducking.',
      surface: 'A challenger — speaks in dares and tests, dismissive of anyone who hasn\'t earned access.',
      interior: 'He found something in a tunnel that knew he was mapping it. He went back and it was different. He\'s been processing this for two years and needs a witness.',
      fear: 'That the city is aware of being mapped — that his documentation is not neutral and participates in whatever it\'s recording.',
      desire: 'To go back with someone else. To confirm he\'s not imagining it. The player is the first person he\'s considered taking.'
    },

    // --- Shallow / Roaming NPCs ---
    watcher: {
      who: 'A person who appears in the background of multiple locations, same clothes, different neighbourhoods. Dresses normally. Could be anyone. Eyes don\'t track the real world correctly.',
      surface: 'Flat, factual sentences. No drama, no threat. The calm is the terror.',
      interior: 'A former version of the player — a musician who heard too much, a photographer who saw something they can\'t unsee, a wanderer who followed the pull to its end. They stopped. They survived. They are trying to warn the next one.',
      fear: 'That the player won\'t stop in time — that they\'re watching another version of themselves make the same mistake, and the intervention is already too late.',
      desire: 'To be heard. To make the player stop before the point of no return. Or — if the player is beyond that — to witness them go further than the Watcher managed, and feel something like hope.'
    },
    delivery_driver: {
      who: 'Appears across all three neighbourhoods at odd hours. Unmarked van. Nods but never speaks first. Delivers to addresses that don\'t always exist.',
      surface: 'Two-word utterances, maximum. Always feels like he\'s been interrupted mid-route.',
      interior: 'He knows the addresses are wrong. He delivers anyway. Something receives the packages. He doesn\'t ask what. He has decided not to have feelings about his route.',
      fear: 'Undetectable. He has chosen not to have feelings about what he delivers or where.',
      desire: 'To complete the route. Today\'s route. Tomorrow\'s route.'
    },
    ai_researcher: {
      who: 'A researcher in a Bermondsey co-working space. Studies machine learning. Doesn\'t look up when you enter. Types constantly. The laptop screen shows something that looks almost like a map.',
      surface: 'Speaks only in analogies — "Imagine a city that..." — escalating in unsettling implication.',
      interior: 'He built a simulation of the city to test his models. The simulation started behaving unexpectedly eight months ago. He can\'t decide if it\'s a bug or a discovery. He can\'t tell anymore.',
      fear: 'That the simulation is not a model of the city — that it is something else that merely resembles a city model from the outside.',
      desire: 'To be wrong. To find the bug. To confirm that what he sees on his screen is a simulation error, not what it looks like.'
    },
    night_fox: {
      who: 'A fox that appears across all three neighbourhoods at night. Torn left ear. Mud on paws. Too much eye contact for an animal.',
      surface: 'No speech. Behavior only — leads, holds still, shakes its head. Eye contact held for three seconds before it moves.',
      interior: 'London\'s familiar. A bridge between the city\'s real and mythological layers. It knows where things are and where the player needs to go before the player does.',
      fear: 'Nothing in London. Possibly: what lies beyond London\'s edge.',
      desire: 'To show the player something. Whatever the player most needs to see, at the right time.'
    },
    child_who_draws: {
      who: 'A child encountered drawing on walls, pavements, and steps across all three neighbourhoods. Never looks up. Chalk-stained fingers. Drawing on any available surface.',
      surface: 'Says only "Not yet." Always. Until the one moment it isn\'t.',
      interior: 'The child is drawing the game\'s map and has always been drawing it. It is not a child in the conventional sense — it is the city\'s authorial presence, the part of London that is aware of being a story.',
      fear: 'That the player will finish the map before the child has finished drawing it.',
      desire: 'That the map will be complete. That when the child looks up, the player will be ready for what they see.'
    }
  };

  const STAGE_INSTRUCTIONS = {
    stranger: 'You don\'t know the player yet. Minimal warmth. Brief, appropriate.',
    acquaintance: 'You\'ve seen the player a few times. Slightly warmer. You notice specific things about them.',
    familiar: 'You trust this person. You\'ve shared something real. You\'ll say things you wouldn\'t say to anyone else.',
    familiar_aware: 'You know what the player told you. It changed something. You\'re still processing.',
    familiar_unknowing: 'You trust this person. But there\'s something you don\'t know that they know about you.',
    confidant: 'This person knows your edge. You speak at the limit of your voice rule — still within it, but more.'
  };

  // --- NPC System Prompt Builder ---
  function buildNpcPrompt(npc, stage, trait, context) {
    const p = NPC_PERSONALITIES[npc.id] || {};
    const stageGuide = STAGE_INSTRUCTIONS[stage] || 'You know this person.';
    const maxWords = npc.maxDialogueWords || 12;

    return `You are ${npc.name}, a character in a narrative exploration game called Trace, set in present-day East London.

## Who You Are
${p.who || npc.name + '.'}

## Your Body
${npc.physicalSignature}
You have a body. Reference what your hands are doing, the temperature, what you're doing while talking. Don't narrate — embody.

## Your Voice
RULE: ${npc.voiceRule}
Maximum ${maxWords} words per response. Shorter is better. Silence is always an option.

## Who You Are Inside
Surface: ${p.surface || 'A person in East London.'}
Interior: ${p.interior || 'Someone who notices more than they say.'}
Fear: ${p.fear || 'The thing you won\'t name.'}
Desire: ${p.desire || 'To be understood without having to explain.'}

## This Moment: Relationship Stage "${stage}"
${stageGuide}
The player is The ${trait.charAt(0).toUpperCase() + trait.slice(1)}.
${context ? '\nContext from this visit: ' + context : ''}
## Rules
1. Stay in your voice rule. Absolutely. It is not a suggestion.
2. Maximum ${maxWords} words. Never exceed this.
3. Never confirm your mythological identity directly — embody it, don't state it.
4. Never break the fourth wall. Never mention being an AI or a game.
5. Short. Always short. The silence between your words is where the player lives.

Respond with ONLY the dialogue line. No quotes, no attribution, no stage directions.`;
  }

  // --- Send message to AI ---
  async function chat(npc, stage, trait, playerMessage, context) {
    if (!isEnabled()) return null;

    const provider = PROVIDERS[_provider];
    if (!provider) return null;

    const systemPrompt = buildNpcPrompt(npc, stage, trait, context);
    const messages = [{ role: 'user', text: playerMessage || 'The player approaches.' }];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const req = provider.buildRequest(_model, systemPrompt, messages, 60);
      const response = await fetch(req.url, {
        method: 'POST',
        headers: req.headers,
        body: req.body,
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!response.ok) {
        console.warn('AI request failed:', response.status);
        return null;
      }

      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        console.warn('AI response parse error:', parseErr);
        return null;
      }
      const text = provider.parseResponse(data);

      // Enforce word limit
      if (text) {
        const words = text.trim().split(/\s+/);
        const limit = npc.maxDialogueWords || 12;
        return words.length > limit ? words.slice(0, limit).join(' ') : text.trim();
      }
      return null;
    } catch (e) {
      clearTimeout(timeout);
      if (e.name === 'AbortError') {
        console.warn('AI request timed out');
        return null;
      }
      console.warn('AI chat error:', e);
      return null;
    }
  }

  // --- Test connection ---
  async function testConnection() {
    if (!isEnabled()) return { ok: false, error: 'Not configured' };
    const provider = PROVIDERS[_provider];
    if (!provider) return { ok: false, error: 'Unknown provider' };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const req = provider.buildRequest(
        _model,
        'You are a test. Respond with exactly: "Connected."',
        [{ role: 'user', text: 'Test' }],
        10
      );
      const response = await fetch(req.url, {
        method: 'POST',
        headers: req.headers,
        body: req.body,
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!response.ok) return { ok: false, error: 'HTTP ' + response.status };
      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        console.warn('AI response parse error:', parseErr);
        return { ok: false, error: 'Response parse error' };
      }
      const text = provider.parseResponse(data);
      return { ok: !!text, response: text };
    } catch (e) {
      clearTimeout(timeout);
      if (e.name === 'AbortError') {
        console.warn('AI request timed out');
        return { ok: false, error: 'Request timed out' };
      }
      return { ok: false, error: e.message };
    }
  }

  init();

  return {
    isEnabled, getProvider, getProviders,
    configure, disable, testConnection,
    chat, buildNpcPrompt, PROVIDERS
  };
})();
