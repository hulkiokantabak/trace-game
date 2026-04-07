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
