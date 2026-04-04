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

  // --- NPC System Prompt Builder ---
  function buildNpcPrompt(npc, stage, trait, context) {
    return `You are ${npc.name} in Limehouse, East London. You are a character in a narrative exploration game called Trace.

VOICE: ${npc.voiceRule}
PHYSICAL: ${npc.physicalSignature}

RULES:
- Stay in character at all times.
- Maximum ${npc.maxDialogueWords || 12} words per response.
- Never break the fourth wall. Never mention being an AI.
- Never confirm or deny mythological identity directly.
- Speak as ${npc.name} would at the "${stage}" relationship stage.
- The player is The ${trait.charAt(0).toUpperCase() + trait.slice(1)}.
${context ? '- Context: ' + context : ''}

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
