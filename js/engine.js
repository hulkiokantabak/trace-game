/**
 * engine.js — Canvas renderer, game loop, input handler, audio manager
 * Milestone 1: Per-location scenes, time-of-day palette, character creation
 */
const Engine = (() => {
  const W = 320, H = 180;
  let canvas, ctx;
  let state = 'title'; // 'title' | 'character_creation' | 'playing'
  let titleAlpha = 1;
  let currentLocation = 'L01';
  let timePeriod = 'evening';
  let locationNpcs = {}; // { npcId: true } for visible NPCs at current location
  let _onCanvasTap = null;
  let _raining = false;
  let _watcherVisible = false;
  let _forgetting = false;
  let _tapRing = null; // { x, y, age } for tap feedback
  let _lastTapTime = 0;
  let _hintPulse = 0; // animation counter
  let _discoveredDetails = []; // [{x,y,w,h}] hitboxes of found details
  let _hasUndiscovered = false; // Meier: whether location has undiscovered details
  let _discoveryFlash = null; // { x, y, w, h, age } — brief glow on discovery
  let _discoveryPreview = null; // { text, x, y, age } — floating text preview
  let _transitionAlpha = 0;
  let _transitionDir = 0;    // 0 = none, 1 = fading out, -1 = fading in
  let _transitionCallback = null;
  let _firstShimmer = null; // { x, y, w, h, age }
  let _playerTrait = 'musician';
  let _lastTimestamp = 0;

  // Pre-computed rain drop positions
  const RAIN_DROPS = Array.from({ length: 40 }, () => ({
    x: Math.floor(Math.random() * 320),
    y: Math.floor(Math.random() * 180),
    speed: 2 + Math.random() * 3,
    len: 3 + Math.floor(Math.random() * 4)
  }));

  // --- Sky gradients per time period ---
  const SKY = {
    morning: [
      [0, '#2a4070'], [0.25, '#4a70a0'], [0.5, '#7aace0'],
      [0.75, '#c0daf0'], [0.9, '#ffe4b5'], [1, '#ffd090']
    ],
    afternoon: [
      [0, '#2a5a90'], [0.3, '#4a80b5'], [0.6, '#5a9ece'],
      [0.85, '#87ceeb'], [1, '#a8d8ea']
    ],
    evening: [
      [0, '#0b0b1a'], [0.15, '#141030'], [0.32, '#2a1535'],
      [0.50, '#4a1a30'], [0.65, '#7a2a25'], [0.78, '#b85020'],
      [0.90, '#d87830'], [1, '#f0b050']
    ],
    night: [
      [0, '#050510'], [0.25, '#080818'], [0.5, '#0a0a20'],
      [0.8, '#101028'], [1, '#181838']
    ]
  };

  // --- Pre-computed star positions ---
  const stars = Array.from({ length: 14 }, () => ({
    x: 10 + Math.floor(Math.random() * 300),
    y: 3 + Math.floor(Math.random() * 42),
    phase: Math.random() * Math.PI * 2,
    base: 0.3 + Math.random() * 0.7
  }));

  // --- Building silhouettes data ---
  const BLDGS = [
    [0, 24, 14], [26, 14, 10], [42, 28, 20], [72, 10, 7],
    [84, 18, 14], [104, 14, 18], [120, 20, 12], [142, 16, 9],
    [160, 22, 26], [184, 14, 11], [200, 20, 16],
    [222, 20, 15], [244, 22, 18], [268, 26, 22], [296, 24, 13]
  ];
  const WINDOWS_BRIGHT = [[48, 64], [52, 68], [108, 65], [164, 57], [164, 62], [228, 67], [250, 65], [274, 62]];
  const WINDOWS_DIM = [[44, 68], [112, 70], [170, 66], [254, 69], [280, 67]];

  // --- Canvas Setup ---

  function init(el) {
    canvas = el;
    ctx = canvas.getContext('2d');
    canvas.width = W;
    canvas.height = H;
    ctx.imageSmoothingEnabled = false;
    resize();
    window.addEventListener('resize', resize);
    canvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.style.touchAction = 'none';

    // Tap/click detection for interactable details
    const handleTap = (screenX, screenY) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      const cx = Math.floor((screenX - rect.left) * scaleX);
      const cy = Math.floor((screenY - rect.top) * scaleY);
      _tapRing = { x: cx, y: cy, age: 0 };
      _lastTapTime = performance.now();
      if (_onCanvasTap) _onCanvasTap(cx, cy);
    };
    let _lastTapMs = 0;
    const DEBOUNCE_MS = 300;
    canvas.addEventListener('click', e => {
      if (Date.now() - _lastTapMs <= DEBOUNCE_MS) return;
      _lastTapMs = Date.now();
      handleTap(e.clientX, e.clientY);
    });
    canvas.addEventListener('touchend', e => {
      e.preventDefault();
      if (e.changedTouches.length) {
        _lastTapMs = Date.now();
        const t = e.changedTouches[0];
        handleTap(t.clientX, t.clientY);
      }
    });
    window.addEventListener('orientationchange', () => {
      setTimeout(resize, 100); // Delay to let the browser finish rotating
    });
  }

  function resize() {
    const container = canvas.parentElement;
    if (!container || container.clientWidth === 0 || container.clientHeight === 0) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const scale = Math.min(cw / W, ch / H);
    canvas.style.width = Math.floor(W * scale) + 'px';
    canvas.style.height = Math.floor(H * scale) + 'px';
  }

  // --- Shared drawing helpers ---

  function makeSkyGradient(yStart, yEnd) {
    const grad = ctx.createLinearGradient(0, yStart, 0, yEnd);
    const stops = SKY[timePeriod] || SKY.evening;
    for (const [pos, color] of stops) grad.addColorStop(pos, color);
    return grad;
  }

  function drawStars(t, yMax) {
    if (timePeriod !== 'evening' && timePeriod !== 'night') return;
    const boost = timePeriod === 'night' ? 1.3 : 1;
    for (const s of stars) {
      if (s.y > (yMax || 50)) continue;
      const twinkle = 0.5 + 0.5 * Math.sin(t * 1.2 + s.phase);
      ctx.fillStyle = `rgba(255,255,240,${(s.base * twinkle * boost).toFixed(2)})`;
      ctx.fillRect(s.x, s.y, 1, 1);
    }
  }

  function drawWindowView(x, y, w, h) {
    // Frame
    ctx.fillStyle = '#1a1828';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    // Sky through window
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    const stops = SKY[timePeriod] || SKY.evening;
    for (const [pos, color] of stops) grad.addColorStop(pos, color);
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    // Cross frame
    ctx.fillStyle = '#1a1828';
    ctx.fillRect(x + Math.floor(w / 2), y, 2, h);
    ctx.fillRect(x, y + Math.floor(h / 2), w, 2);
  }

  // --- Canal Basin scene (L01 + title backdrop) ---

  function sceneCanalBasin(t, npcVisible) {
    // Sky
    ctx.fillStyle = makeSkyGradient(0, 78);
    ctx.fillRect(0, 0, W, 78);
    // Horizon glow
    const isWarm = timePeriod === 'evening' || timePeriod === 'morning';
    if (isWarm) {
      ctx.fillStyle = 'rgba(240,176,80,0.25)';
      ctx.fillRect(0, 76, W, 2);
    }
    drawStars(t, 50);

    // Buildings
    ctx.fillStyle = '#08080f';
    const horizon = 78;
    for (const [x, w, h] of BLDGS) ctx.fillRect(x, horizon - h, w, h);
    // Spire
    ctx.beginPath();
    ctx.moveTo(215, 30); ctx.lineTo(211, 62); ctx.lineTo(219, 62);
    ctx.closePath(); ctx.fill();
    // Chimneys
    for (const [x, y, w, h] of [[14,60,2,4],[54,54,2,4],[108,57,2,3],[274,53,2,3]]) ctx.fillRect(x, y, w, h);
    // Crane
    ctx.fillRect(296, 44, 1, 21); ctx.fillRect(284, 44, 16, 1); ctx.fillRect(298, 46, 8, 1);

    // Windows — brightness varies by time
    const winAlpha = timePeriod === 'afternoon' ? 0.2 : timePeriod === 'morning' ? 0.4 : 1;
    ctx.fillStyle = `rgba(232,160,80,${winAlpha})`;
    for (const [x, y] of WINDOWS_BRIGHT) ctx.fillRect(x, y, 2, 2);
    ctx.fillStyle = `rgba(232,160,80,${winAlpha * 0.4})`;
    for (const [x, y] of WINDOWS_DIM) ctx.fillRect(x, y, 2, 2);

    // Canal wall
    ctx.fillStyle = '#12101a';
    ctx.fillRect(0, 78, W, 3);

    // Water
    const isDark = timePeriod === 'night';
    const wg = ctx.createLinearGradient(0, 81, 0, 118);
    wg.addColorStop(0, isDark ? '#08081a' : '#141228');
    wg.addColorStop(0.3, isDark ? '#060614' : '#0e0e1e');
    wg.addColorStop(1, isDark ? '#040410' : '#0a0a16');
    ctx.fillStyle = wg;
    ctx.fillRect(0, 81, W, 37);
    // Sky reflection
    const refColor = timePeriod === 'afternoon' ? '100,140,180' : '200,120,60';
    ctx.fillStyle = `rgba(${refColor},0.05)`;
    ctx.fillRect(0, 82, W, 6);
    // Animated reflections
    for (const [x, off] of [[48,0],[108,1.2],[164,0.6],[228,1.8],[250,0.3]]) {
      const a = (0.03 + 0.02 * Math.sin(t * 0.7 + off)).toFixed(3);
      const dy = Math.floor(Math.sin(t * 0.5 + off) * 1.5);
      ctx.fillStyle = `rgba(232,160,80,${a})`;
      ctx.fillRect(x, 84 + dy, 2, 5);
    }
    // Ripple lines
    ctx.fillStyle = 'rgba(255,255,255,0.012)';
    for (let i = 0; i < 5; i++) {
      const shift = Math.sin(t * 0.25 + i) * 2;
      ctx.fillRect(25 + i * 18 + shift, 90 + i * 5, 22 + i * 7, 1);
    }
    // Narrowboat
    ctx.fillStyle = '#0c0c16'; ctx.fillRect(175, 77, 38, 4);
    ctx.fillStyle = '#100e18'; ctx.fillRect(177, 74, 34, 4);
    // Near wall
    ctx.fillStyle = '#141218'; ctx.fillRect(0, 118, W, 4);

    // Street
    ctx.fillStyle = '#0e0c14'; ctx.fillRect(0, 122, W, 58);
    ctx.fillStyle = 'rgba(255,255,255,0.014)';
    for (let y = 126; y < H; y += 6) {
      const off = (Math.floor(y / 6) % 2) * 4;
      for (let x = off; x < W; x += 8) ctx.fillRect(x, y, 6, 4);
    }
    // Lamp
    ctx.fillStyle = '#18161e';
    ctx.fillRect(85, 106, 2, 16); ctx.fillRect(82, 104, 8, 3);
    const pulse = 0.8 + 0.2 * Math.sin(t * 0.5);
    ctx.fillStyle = `rgba(232,180,100,${(0.06 * pulse).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(86, 104, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(232,180,100,${(0.2 * pulse).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(86, 104, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(232,180,100,${(0.5 * pulse).toFixed(3)})`;
    ctx.fillRect(84, 103, 4, 2);
    ctx.fillStyle = `rgba(232,180,100,${(0.03 * pulse).toFixed(3)})`;
    ctx.fillRect(74, 122, 24, 8);
    // Bollards
    ctx.fillStyle = '#161420';
    ctx.fillRect(200, 118, 3, 5); ctx.fillRect(252, 118, 3, 5);

    // Canal Boat Painter — sitting on wall near narrowboat
    if (npcVisible) {
      const px = 220, py = 112;
      ctx.fillStyle = '#c8a878'; // skin
      ctx.fillRect(px, py, 5, 5); // head
      ctx.fillStyle = '#3a5040'; // beret
      ctx.fillRect(px - 1, py - 1, 7, 2);
      ctx.fillStyle = '#4a6858'; // smock
      ctx.fillRect(px - 1, py + 5, 7, 8);
      // Easel
      ctx.fillStyle = '#2a2218';
      ctx.fillRect(px + 10, py + 1, 1, 10); ctx.fillRect(px + 14, py + 1, 1, 10);
      ctx.fillRect(px + 9, py + 1, 7, 4); // canvas
      ctx.fillStyle = '#3a4a5a';
      ctx.fillRect(px + 10, py + 2, 4, 2); // painting
      // Arm reaching to easel
      ctx.fillStyle = '#c8a878';
      ctx.fillRect(px + 6, py + 7, 4, 2);
    }
  }

  // --- Flat interior scene ---

  function sceneFlat(t) {
    // Walls
    ctx.fillStyle = '#12101c';
    ctx.fillRect(0, 0, W, H);

    // Floor — painted white boards wearing through
    ctx.fillStyle = '#c0b8a8';
    ctx.fillRect(0, 132, W, 48);
    ctx.fillStyle = 'rgba(50,30,15,0.25)';
    for (let x = 8; x < W; x += 28) ctx.fillRect(x, 135, 14, 40);
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    for (let x = 0; x < W; x += 20) ctx.fillRect(x, 132, 1, 48);

    // Wall texture
    ctx.fillStyle = 'rgba(255,255,255,0.008)';
    for (let y = 8; y < 132; y += 7) ctx.fillRect(0, y, W, 1);

    // Window (right)
    drawWindowView(210, 28, 72, 52);
    // Rooftop silhouettes in window
    ctx.fillStyle = '#08080f';
    ctx.fillRect(210, 56, 18, 24); ctx.fillRect(230, 60, 14, 20);
    ctx.fillRect(248, 57, 16, 23); ctx.fillRect(266, 62, 16, 18);
    // Aerials
    ctx.fillRect(218, 50, 1, 7); ctx.fillRect(256, 48, 1, 10);
    // Basin water sliver
    ctx.fillStyle = timePeriod === 'night' ? '#0a0a1a' : '#2a4060';
    ctx.fillRect(210, 74, 72, 6);

    // Window light on floor
    const la = { morning: 0.14, afternoon: 0.10, evening: 0.06, night: 0.02 }[timePeriod] || 0.06;
    ctx.fillStyle = `rgba(200,180,140,${la})`;
    ctx.fillRect(200, 132, 85, 25);

    // Radiator under window
    ctx.fillStyle = '#1c1a28';
    for (let y = 84; y < 98; y += 3) ctx.fillRect(215, y, 62, 2);

    // Bed (left)
    ctx.fillStyle = '#181630';
    ctx.fillRect(8, 88, 72, 44);
    ctx.fillStyle = '#222040';
    ctx.fillRect(10, 90, 26, 14); // pillow
    ctx.fillStyle = '#1c1c38';
    ctx.fillRect(10, 106, 68, 24); // blanket

    // Table (center)
    ctx.fillStyle = '#2a2018';
    ctx.fillRect(120, 100, 55, 32);
    ctx.fillRect(122, 132, 3, 8); ctx.fillRect(170, 132, 3, 8);
    // Notebook
    ctx.fillStyle = '#3a3828';
    ctx.fillRect(132, 103, 18, 22);
    ctx.fillStyle = '#4a4838';
    ctx.fillRect(133, 104, 16, 20);
    // Mug ring
    ctx.fillStyle = 'rgba(80,60,40,0.2)';
    ctx.beginPath(); ctx.arc(160, 115, 4, 0, Math.PI * 2); ctx.fill();

    // Lamp glow
    const pulse = 0.85 + 0.15 * Math.sin(t * 0.4);
    ctx.fillStyle = `rgba(200,160,100,${(0.04 * pulse).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(148, 94, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(200,160,100,${(0.15 * pulse).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(148, 94, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d8b070';
    ctx.fillRect(146, 96, 4, 3);

    // Door (far left)
    ctx.fillStyle = '#141224';
    ctx.fillRect(0, 44, 7, 88);
    ctx.fillStyle = '#b09060';
    ctx.fillRect(4, 86, 2, 2);

    // Flat evolution — visual milestones
    const discoveries = typeof State !== 'undefined' ? (State.get('discoveries') || []).length : 0;
    const npcsMet = typeof State !== 'undefined' ? Object.keys(State.get('npcMemory') || {}).filter(id => (State.get('npcMemory') || {})[id] && (State.get('npcMemory') || {})[id].visitCount > 0).length : 0;
    const invs = typeof State !== 'undefined' ? State.get('investigations') || {} : {};
    const anyInvComplete = Object.values(invs).some(i => i.complete);

    // Notebook on table (first discovery)
    if (discoveries >= 1) {
      ctx.fillStyle = '#d8c8a0';
      ctx.fillRect(95, 105, 8, 6);
      ctx.fillStyle = '#4a3a28';
      ctx.fillRect(96, 106, 6, 4); // pages
    }

    // Mark on window (5+ discoveries) — a small drawn symbol
    if (discoveries >= 5) {
      ctx.fillStyle = 'rgba(200,180,140,0.15)';
      ctx.fillRect(152, 54, 3, 3);
    }

    // Warmer radiator glow (3+ NPCs met)
    if (npcsMet >= 3) {
      ctx.fillStyle = 'rgba(200,120,60,0.06)';
      ctx.fillRect(30, 100, 20, 30);
    }

    // Object on shelf (investigation complete)
    if (anyInvComplete) {
      ctx.fillStyle = '#8a7a60';
      ctx.fillRect(200, 80, 5, 4);
      ctx.fillStyle = '#6a5a40';
      ctx.fillRect(201, 81, 3, 2);
    }
  }

  // --- Coffee Shop interior scene ---

  function sceneCoffeeShop(t, npcVisible) {
    // Background
    ctx.fillStyle = '#1a1208';
    ctx.fillRect(0, 0, W, H);

    // Floor (tiles)
    ctx.fillStyle = '#241a0e';
    ctx.fillRect(0, 126, W, 54);
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    for (let x = 0; x < W; x += 16) ctx.fillRect(x, 126, 1, 54);
    for (let y = 126; y < H; y += 14) ctx.fillRect(0, y, W, 1);

    // Back wall
    ctx.fillStyle = '#1e1610';
    ctx.fillRect(0, 0, W, 126);

    // Window (right)
    drawWindowView(205, 18, 85, 65);
    // Buildings outside
    ctx.fillStyle = '#08080f';
    ctx.fillRect(205, 48, 22, 35); ctx.fillRect(230, 52, 18, 31);
    ctx.fillRect(252, 46, 20, 37); ctx.fillRect(275, 50, 15, 33);

    // Morning light patch
    const la = { morning: 0.10, afternoon: 0.07, evening: 0.03, night: 0.01 }[timePeriod] || 0.05;
    ctx.fillStyle = `rgba(220,200,160,${la})`;
    ctx.fillRect(200, 85, 75, 55);

    // Chalkboard menu
    ctx.fillStyle = '#081208';
    ctx.fillRect(55, 20, 65, 42);
    ctx.fillStyle = '#0e1a0e';
    ctx.fillRect(57, 22, 61, 38);
    ctx.fillStyle = 'rgba(200,200,180,0.2)';
    for (let y = 27; y < 54; y += 5) ctx.fillRect(61, y, 18 + ((y * 7) % 20), 1);

    // Counter (left)
    ctx.fillStyle = '#3a2818';
    ctx.fillRect(10, 82, 130, 26);
    ctx.fillStyle = '#4a3820';
    ctx.fillRect(10, 80, 130, 4);
    // Burn mark
    ctx.fillStyle = 'rgba(15,5,0,0.35)';
    ctx.fillRect(68, 86, 5, 5);
    // Wood grain
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    for (let y = 84; y < 106; y += 3) ctx.fillRect(10, y, 130, 1);

    // Espresso machine
    ctx.fillStyle = '#282030';
    ctx.fillRect(22, 62, 24, 18);
    ctx.fillStyle = '#383040';
    ctx.fillRect(24, 58, 20, 6);
    // Steam
    ctx.fillStyle = 'rgba(200,200,200,0.05)';
    for (let i = 0; i < 3; i++) {
      const sx = 33 + i * 4 + Math.sin(t * 1.5 + i) * 2;
      const sy = 46 - i * 7 + Math.sin(t * 0.8 + i) * 3;
      ctx.fillRect(sx, sy, 2, 3 + i * 2);
    }

    // Table (center)
    ctx.fillStyle = '#3a2a18';
    ctx.fillRect(148, 102, 38, 24);
    ctx.fillRect(150, 126, 3, 8); ctx.fillRect(182, 126, 3, 8);

    // Chair
    ctx.fillStyle = '#2a1e14';
    ctx.fillRect(155, 96, 20, 6);
    ctx.fillRect(157, 102, 2, 24); ctx.fillRect(173, 102, 2, 24);

    // Cat on doorstep
    ctx.fillStyle = '#3a3030';
    ctx.fillRect(4, 166, 7, 5); // body
    ctx.fillRect(1, 164, 5, 4); // head
    ctx.fillRect(11, 167, 4, 1); // tail

    // Barista figure (behind counter)
    if (npcVisible) {
      const bx = 90, by = 56;
      ctx.fillStyle = '#c0a888'; // skin
      ctx.fillRect(bx, by, 5, 5); // head
      ctx.fillStyle = '#2a1810'; // hair
      ctx.fillRect(bx - 1, by - 1, 7, 2);
      ctx.fillRect(bx - 1, by, 1, 3);
      ctx.fillRect(bx + 5, by, 1, 3);
      ctx.fillStyle = '#4a3828'; // apron/body
      ctx.fillRect(bx, by + 5, 5, 2); // neck area
      ctx.fillRect(bx - 1, by + 7, 7, 12); // torso
      ctx.fillStyle = '#3a2818'; // apron front
      ctx.fillRect(bx, by + 9, 5, 10);
      // Arms
      ctx.fillStyle = '#c0a888';
      ctx.fillRect(bx - 3, by + 8, 2, 6); // left arm
      ctx.fillRect(bx + 6, by + 8, 2, 6); // right arm
      // Subtle breathing
      const breathe = Math.sin(t * 0.8) > 0.7 ? 1 : 0;
      if (breathe) {
        ctx.fillStyle = '#c0a888';
        ctx.fillRect(bx + 6, by + 6, 2, 2); // hand near face (blowing on coffee)
      }
    }

    // Warm ambient overlay
    const pulse = 0.9 + 0.1 * Math.sin(t * 0.3);
    ctx.fillStyle = `rgba(180,140,80,${(0.015 * pulse).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }

  // --- St Anne's Churchyard (L03) ---

  function sceneChurchyard(t) {
    // Sky
    ctx.fillStyle = makeSkyGradient(0, 80);
    ctx.fillRect(0, 0, W, 80);
    drawStars(t, 40);

    // Church tower (massive, Hawksmoor)
    ctx.fillStyle = '#0c0a14';
    ctx.fillRect(120, 10, 80, 70); // main body
    ctx.fillRect(140, 0, 40, 12);  // tower top
    ctx.fillRect(155, -8, 10, 10); // spire
    // Windows
    ctx.fillStyle = 'rgba(60,50,80,0.3)';
    ctx.fillRect(135, 30, 8, 14); ctx.fillRect(155, 30, 8, 14); ctx.fillRect(175, 30, 8, 14);
    // Clock face
    ctx.fillStyle = 'rgba(200,180,140,0.08)';
    ctx.beginPath(); ctx.arc(160, 18, 6, 0, Math.PI * 2); ctx.fill();
    // Stone texture
    ctx.fillStyle = 'rgba(255,255,255,0.012)';
    for (let y = 12; y < 80; y += 4) ctx.fillRect(120, y, 80, 1);

    // Ground
    ctx.fillStyle = '#0a0e08';
    ctx.fillRect(0, 80, W, 100);
    // Grass patches
    ctx.fillStyle = '#121a0e';
    for (let x = 5; x < W; x += 14) ctx.fillRect(x, 82 + (x % 3), 8, H - 82);

    // Graves
    ctx.fillStyle = '#18161e';
    ctx.fillRect(30, 110, 8, 14); ctx.fillRect(60, 106, 6, 12);
    ctx.fillRect(240, 108, 7, 13); ctx.fillRect(270, 112, 6, 10);
    // Cross
    ctx.fillRect(90, 100, 2, 16); ctx.fillRect(86, 104, 10, 2);

    // Path
    ctx.fillStyle = '#14121a';
    ctx.fillRect(100, 80, 40, 100);
    ctx.fillStyle = 'rgba(255,255,255,0.01)';
    for (let y = 82; y < H; y += 6) ctx.fillRect(102, y, 36, 1);

    // Shadow (wrong geometry)
    const sa = timePeriod === 'night' ? 0.15 : 0.06;
    ctx.fillStyle = `rgba(0,0,10,${sa})`;
    ctx.beginPath();
    ctx.moveTo(200, 80); ctx.lineTo(280, 130); ctx.lineTo(310, 120);
    ctx.lineTo(260, 80); ctx.closePath(); ctx.fill();

    // Damp overlay
    ctx.fillStyle = 'rgba(40,60,40,0.02)';
    ctx.fillRect(0, 80, W, 100);
  }

  // --- Warehouse Studio (L04) ---

  function sceneWarehouse(t, npcVisible) {
    // Walls
    ctx.fillStyle = '#14121a';
    ctx.fillRect(0, 0, W, H);
    // Concrete texture
    ctx.fillStyle = 'rgba(255,255,255,0.015)';
    for (let y = 0; y < H; y += 5) ctx.fillRect(0, y, W, 1);

    // Floor
    ctx.fillStyle = '#1a1820';
    ctx.fillRect(0, 130, W, 50);

    // Frequency printouts on wall (layered)
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = `rgba(${40 + i * 10},${50 + i * 8},${60 + i * 5},0.15)`;
      ctx.fillRect(12 + i * 3, 16 + i * 8, 48, 55 - i * 7);
    }
    // Waveform lines on printouts
    ctx.fillStyle = 'rgba(100,200,100,0.12)';
    for (let y = 22; y < 65; y += 4) {
      const wave = Math.sin(t * 0.3 + y * 0.2) * 3;
      ctx.fillRect(16, y, 20 + wave, 1);
    }

    // Equipment rack
    ctx.fillStyle = '#1e1c28';
    ctx.fillRect(240, 40, 50, 90);
    ctx.fillStyle = 'rgba(80,200,80,0.15)';
    ctx.fillRect(250, 50, 4, 2); ctx.fillRect(250, 60, 4, 2); ctx.fillRect(250, 70, 4, 2);
    // Monitor glow
    ctx.fillStyle = 'rgba(80,120,180,0.06)';
    ctx.fillRect(245, 85, 40, 30);
    ctx.fillStyle = 'rgba(80,120,180,0.2)';
    ctx.fillRect(248, 88, 34, 24);

    // Cables on floor
    ctx.save();
    ctx.strokeStyle = '#0e0c16';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(50, 135); ctx.quadraticCurveTo(120, 160, 200, 135); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#0e0c16';
    for (let x = 80; x < 200; x += 8) {
      ctx.fillRect(x, 132 + Math.sin(x * 0.1) * 3, 4, 2);
    }

    // High window
    drawWindowView(260, 8, 40, 24);

    // Sound Artist — hunched over equipment
    if (npcVisible) {
      const sx = 160, sy = 112;
      ctx.fillStyle = '#b8a080'; // skin
      ctx.fillRect(sx, sy, 5, 5); // head
      ctx.fillStyle = '#1a1a2a'; // dark hoodie
      ctx.fillRect(sx - 1, sy + 5, 7, 10);
      // Earbud wire
      ctx.fillStyle = 'rgba(200,200,200,0.15)';
      ctx.fillRect(sx + 4, sy + 3, 1, 4);
      // Arms reaching to equipment
      ctx.fillStyle = '#b8a080';
      ctx.fillRect(sx - 3, sy + 7, 2, 5);
      ctx.fillRect(sx + 6, sy + 7, 2, 5);
      // Head tilt
      const tilt = Math.sin(t * 0.4) > 0.6 ? 1 : 0;
      if (tilt) {
        ctx.fillStyle = '#b8a080';
        ctx.fillRect(sx + 5, sy + 1, 1, 3);
      }
    }

    // Studio hum visualization
    const hum = Math.sin(t * 0.5) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(80,100,140,${(0.01 * hum).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }

  // --- The Grapes pub (L05) ---

  function scenePub(t, npcVisible) {
    // Dark wood ceiling
    ctx.fillStyle = '#0e0a06';
    ctx.fillRect(0, 0, W, 20);
    // Beams
    ctx.fillStyle = '#1a1208';
    for (let x = 30; x < W; x += 60) ctx.fillRect(x, 0, 4, 20);

    // Walls
    ctx.fillStyle = '#161008';
    ctx.fillRect(0, 20, W, 110);
    // Wood paneling
    ctx.fillStyle = 'rgba(255,255,255,0.008)';
    for (let y = 24; y < 130; y += 6) ctx.fillRect(0, y, W, 1);

    // Floor
    ctx.fillStyle = '#1e1610';
    ctx.fillRect(0, 130, W, 50);
    ctx.fillStyle = 'rgba(0,0,0,0.03)';
    for (let x = 0; x < W; x += 18) ctx.fillRect(x, 130, 1, 50);

    // Bar counter
    ctx.fillStyle = '#2a1e10';
    ctx.fillRect(10, 80, 120, 24);
    ctx.fillStyle = '#3a2a16';
    ctx.fillRect(10, 78, 120, 4);
    // Taps
    ctx.fillStyle = '#b09050';
    ctx.fillRect(40, 66, 3, 12); ctx.fillRect(60, 66, 3, 12); ctx.fillRect(80, 66, 3, 12);
    // Glasses
    ctx.fillStyle = 'rgba(200,180,140,0.08)';
    ctx.fillRect(100, 72, 4, 6); ctx.fillRect(110, 72, 4, 6);

    // Back window — Thames
    drawWindowView(230, 30, 60, 50);
    // Thames water through window
    ctx.fillStyle = timePeriod === 'night' ? '#0a0a1a' : '#2a4060';
    ctx.fillRect(230, 60, 60, 20);
    // Water shimmer
    const shimmer = Math.sin(t * 0.6) * 2;
    ctx.fillStyle = 'rgba(200,200,220,0.03)';
    ctx.fillRect(232 + shimmer, 65, 20, 1);
    ctx.fillRect(260 - shimmer, 70, 18, 1);

    // Cellar door (left)
    ctx.fillStyle = '#100c08';
    ctx.fillRect(5, 108, 12, 22);
    ctx.fillStyle = '#b09060';
    ctx.fillRect(14, 118, 2, 2);

    // Pub Landlord — behind bar, wiping
    if (npcVisible) {
      const lx = 60, ly = 58;
      ctx.fillStyle = '#c0a080'; // skin
      ctx.fillRect(lx, ly, 5, 5); // head
      ctx.fillStyle = '#181818'; // dark hair, cropped
      ctx.fillRect(lx, ly - 1, 5, 2);
      ctx.fillStyle = '#2a2a30'; // dark shirt
      ctx.fillRect(lx - 1, ly + 5, 7, 12);
      // Arms — wiping motion
      ctx.fillStyle = '#c0a080';
      const wipe = Math.sin(t * 0.6) * 4;
      ctx.fillRect(lx - 3 + wipe, ly + 9, 2, 4); // wiping hand
      ctx.fillRect(lx + 6, ly + 8, 2, 5);
      // Cloth
      ctx.fillStyle = 'rgba(200,200,200,0.12)';
      ctx.fillRect(lx - 2 + wipe, ly + 12, 4, 2);
    }

    // Warm glow
    const pulse = 0.9 + 0.1 * Math.sin(t * 0.3);
    ctx.fillStyle = `rgba(180,130,60,${(0.012 * pulse).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }

  // --- Tattoo Parlour (L06) ---

  function sceneParlour(t, npcVisible) {
    // Walls
    ctx.fillStyle = '#121018';
    ctx.fillRect(0, 0, W, H);

    // Floor (checkerboard)
    ctx.fillStyle = '#1a1620';
    ctx.fillRect(0, 130, W, 50);
    ctx.fillStyle = 'rgba(255,255,255,0.015)';
    for (let x = 0; x < W; x += 16) {
      for (let y = 130; y < H; y += 14) {
        if ((x + y) % 28 === 0) ctx.fillRect(x, y, 14, 12);
      }
    }

    // Flash art wall (left) — doors and maps
    ctx.fillStyle = '#1e1a24';
    ctx.fillRect(10, 20, 80, 80);
    // Door drawings
    ctx.fillStyle = 'rgba(200,160,100,0.12)';
    ctx.fillRect(18, 28, 14, 22); ctx.fillRect(40, 32, 12, 18);
    ctx.fillRect(58, 26, 16, 24); ctx.fillRect(22, 58, 12, 20);
    ctx.fillRect(42, 62, 14, 16); ctx.fillRect(62, 56, 12, 22);
    // Handles
    ctx.fillStyle = 'rgba(200,160,100,0.2)';
    ctx.fillRect(29, 38, 2, 2); ctx.fillRect(49, 40, 2, 2);
    ctx.fillRect(71, 36, 2, 2); ctx.fillRect(31, 68, 2, 2);

    // Curtain (right)
    ctx.fillStyle = '#1a1028';
    ctx.fillRect(200, 10, 4, 120);
    ctx.fillStyle = '#141020';
    ctx.fillRect(204, 10, 80, 120);
    // Buzz from behind
    const buzz = Math.sin(t * 12) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(200,180,100,${(0.02 * buzz).toFixed(3)})`;
    ctx.fillRect(206, 50, 70, 40);

    // Counter
    ctx.fillStyle = '#2a2030';
    ctx.fillRect(110, 90, 80, 20);

    // Neon sign (red)
    const neon = 0.7 + 0.3 * Math.sin(t * 1.2);
    ctx.fillStyle = `rgba(200,40,40,${(0.06 * neon).toFixed(3)})`;
    ctx.fillRect(120, 20, 60, 20);
    ctx.fillStyle = `rgba(200,40,40,${(0.15 * neon).toFixed(3)})`;
    ctx.fillRect(125, 24, 50, 12);
    // Tattoo Artist — at counter, drawing
    if (npcVisible) {
      const tx = 130, ty = 72;
      ctx.fillStyle = '#b0a090'; // skin
      ctx.fillRect(tx, ty, 5, 5); // head
      ctx.fillStyle = '#0a0a0a'; // dark hair, pulled back
      ctx.fillRect(tx - 1, ty - 1, 7, 2);
      ctx.fillStyle = '#1a1a1a'; // black tank
      ctx.fillRect(tx - 1, ty + 5, 7, 12);
      // Tattoo sleeves (ink marks on arms)
      ctx.fillStyle = '#2a3040';
      ctx.fillRect(tx - 3, ty + 7, 2, 6);
      ctx.fillRect(tx + 6, ty + 7, 2, 6);
      ctx.fillStyle = '#b0a090'; // hands
      ctx.fillRect(tx - 3, ty + 13, 2, 2);
      ctx.fillRect(tx + 6, ty + 13, 2, 2);
      // Drawing on napkin
      ctx.fillStyle = 'rgba(200,200,200,0.15)';
      ctx.fillRect(tx + 9, ty + 12, 6, 5);
    }
  }

  // --- Lock Gates (L07) ---

  function sceneLockGates(t) {
    // Sky
    ctx.fillStyle = makeSkyGradient(0, 70);
    ctx.fillRect(0, 0, W, 70);
    drawStars(t, 40);

    // Canal walls
    ctx.fillStyle = '#0c0a12';
    ctx.fillRect(0, 70, W, 10);

    // Water (both sides)
    const wg = ctx.createLinearGradient(0, 80, 0, 120);
    wg.addColorStop(0, '#10101e');
    wg.addColorStop(1, '#080814');
    ctx.fillStyle = wg;
    ctx.fillRect(0, 80, W, 40);
    // Ripples
    ctx.fillStyle = 'rgba(255,255,255,0.01)';
    for (let i = 0; i < 4; i++) {
      const shift = Math.sin(t * 0.3 + i * 1.5) * 3;
      ctx.fillRect(20 + i * 40 + shift, 88 + i * 6, 30, 1);
    }

    // The gates (massive iron)
    ctx.fillStyle = '#181620';
    ctx.fillRect(130, 30, 8, 90); // left gate
    ctx.fillRect(182, 30, 8, 90); // right gate
    // Cross bracing
    ctx.fillStyle = '#1e1c28';
    ctx.fillRect(138, 40, 44, 3); ctx.fillRect(138, 60, 44, 3);
    ctx.fillRect(138, 80, 44, 3);
    // Mechanism wheel
    ctx.fillStyle = '#22202e';
    ctx.beginPath(); ctx.arc(160, 50, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#181620';
    ctx.beginPath(); ctx.arc(160, 50, 8, 0, Math.PI * 2); ctx.fill();
    // Slow turn
    const angle = t * 0.05;
    ctx.fillStyle = '#2a2838';
    ctx.fillRect(160 + Math.cos(angle) * 8, 50 + Math.sin(angle) * 8, 3, 3);

    // Drips
    ctx.fillStyle = 'rgba(150,180,200,0.08)';
    const dripY = (t * 20) % 60;
    ctx.fillRect(134, 40 + dripY, 1, 3);
    ctx.fillRect(186, 35 + (dripY + 15) % 60, 1, 3);

    // Path
    ctx.fillStyle = '#0e0c14';
    ctx.fillRect(0, 120, W, 60);
    // Cobbles
    ctx.fillStyle = 'rgba(255,255,255,0.01)';
    for (let y = 124; y < H; y += 6) {
      const off = (Math.floor(y / 6) % 2) * 4;
      for (let x = off; x < W; x += 8) ctx.fillRect(x, y, 6, 4);
    }
  }

  // --- DLR Platform (L08) ---

  function sceneDLR(t, npcVisible) {
    // Sky (visible through open platform)
    ctx.fillStyle = makeSkyGradient(0, 60);
    ctx.fillRect(0, 0, W, 60);
    drawStars(t, 30);

    // Cranes and skyline
    ctx.fillStyle = '#08080f';
    ctx.fillRect(40, 30, 8, 30); ctx.fillRect(42, 20, 4, 12); ctx.fillRect(38, 20, 12, 2);
    ctx.fillRect(200, 35, 12, 25); ctx.fillRect(204, 25, 4, 12); ctx.fillRect(198, 25, 14, 2);
    ctx.fillRect(100, 40, 20, 20); ctx.fillRect(260, 38, 16, 22);

    // Canopy
    ctx.fillStyle = '#12101a';
    ctx.fillRect(0, 60, W, 8);
    // Support columns
    ctx.fillRect(30, 60, 4, 80); ctx.fillRect(150, 60, 4, 80); ctx.fillRect(280, 60, 4, 80);

    // Platform
    ctx.fillStyle = '#161420';
    ctx.fillRect(0, 110, W, 70);
    // Platform edge
    ctx.fillStyle = '#e0c020';
    ctx.fillRect(0, 110, W, 2);

    // Departure board
    ctx.fillStyle = '#0a0a10';
    ctx.fillRect(100, 68, 80, 22);
    ctx.fillStyle = 'rgba(200,120,0,0.4)';
    ctx.fillRect(104, 72, 72, 4); // destination line
    ctx.fillRect(104, 80, 40, 4); // time line

    // Tracks
    ctx.fillStyle = '#1e1c28';
    ctx.fillRect(0, 106, W, 4);
    ctx.fillStyle = '#b0a090';
    ctx.fillRect(0, 106, W, 1); ctx.fillRect(0, 109, W, 1);

    // Pigeons
    ctx.fillStyle = '#2a2830';
    ctx.fillRect(60, 62, 4, 3); ctx.fillRect(200, 63, 4, 3); ctx.fillRect(240, 61, 4, 3);

    // Wind lines
    ctx.fillStyle = 'rgba(255,255,255,0.015)';
    const wind = Math.sin(t * 0.8) * 10;
    ctx.fillRect(50 + wind, 85, 40, 1);
    ctx.fillRect(180 - wind, 90, 35, 1);

    // Bench
    ctx.fillStyle = '#1a1828';
    ctx.fillRect(200, 126, 40, 6); ctx.fillRect(206, 132, 4, 8); ctx.fillRect(232, 132, 4, 8);

    // Bike Courier — leaning against column, restless
    if (npcVisible) {
      const bx = 158, by = 118;
      ctx.fillStyle = '#b8a888'; // skin
      ctx.fillRect(bx, by, 5, 5); // head
      ctx.fillStyle = '#2a2a30'; // helmet
      ctx.fillRect(bx - 1, by - 2, 7, 3);
      ctx.fillRect(bx, by - 3, 5, 2);
      ctx.fillStyle = '#3a6030'; // hi-vis jacket
      ctx.fillRect(bx - 1, by + 5, 7, 10);
      ctx.fillStyle = '#e0d020'; // hi-vis stripe
      ctx.fillRect(bx - 1, by + 8, 7, 1);
      // Legs (restless shift)
      ctx.fillStyle = '#1a1a20';
      const shift = Math.sin(t * 1.5) > 0.5 ? 1 : 0;
      ctx.fillRect(bx + shift, by + 15, 2, 6);
      ctx.fillRect(bx + 3 - shift, by + 15, 2, 6);
    }
  }

  // --- Night Market (L09) ---

  function sceneMarket(t, npcVisible) {
    // Dark sky
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, W, 40);

    // LED strings
    for (let x = 20; x < W; x += 12) {
      const sway = Math.sin(t * 0.5 + x * 0.05) * 2;
      ctx.fillStyle = 'rgba(255,200,50,0.15)';
      ctx.fillRect(x, 14 + sway, 2, 2);
      ctx.fillStyle = 'rgba(200,50,50,0.12)';
      ctx.fillRect(x + 6, 16 + sway, 2, 2);
    }
    // String lines
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.fillRect(20, 15, W - 40, 1);

    // Buildings backdrop
    ctx.fillStyle = '#0a0810';
    ctx.fillRect(0, 40, W, 40);
    ctx.fillRect(0, 40, 30, 30); ctx.fillRect(50, 35, 40, 35);
    ctx.fillRect(200, 38, 50, 32); ctx.fillRect(280, 40, 40, 30);

    // Stalls
    ctx.fillStyle = '#1a1420';
    ctx.fillRect(20, 80, 60, 50); ctx.fillRect(100, 82, 50, 48);
    ctx.fillRect(170, 78, 55, 52); ctx.fillRect(250, 80, 50, 50);
    // Canopies
    ctx.fillStyle = '#201830';
    ctx.fillRect(18, 74, 64, 8); ctx.fillRect(98, 76, 54, 8);
    ctx.fillRect(168, 72, 59, 8); ctx.fillRect(248, 74, 54, 8);

    // Smoke
    ctx.fillStyle = 'rgba(200,180,160,0.03)';
    for (let i = 0; i < 4; i++) {
      const sx = 50 + i * 70 + Math.sin(t * 0.4 + i) * 5;
      const sy = 60 - i * 3 + Math.sin(t * 0.3 + i * 2) * 4;
      ctx.fillRect(sx, sy, 8 + i * 2, 12);
    }

    // Ground
    ctx.fillStyle = '#0e0c14';
    ctx.fillRect(0, 130, W, 50);
    // Bass vibration
    const bass = Math.sin(t * 2) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(100,50,150,${(0.01 * bass).toFixed(3)})`;
    ctx.fillRect(0, 130, W, 50);

    // Generator
    ctx.fillStyle = '#1e1c28';
    ctx.fillRect(10, 140, 22, 16);
    ctx.fillStyle = 'rgba(200,80,80,0.2)';
    ctx.fillRect(14, 144, 3, 2);

    // People silhouettes
    ctx.fillStyle = '#0a0810';
    ctx.fillRect(80, 126, 4, 10); ctx.fillRect(140, 124, 5, 12);
    ctx.fillRect(220, 125, 4, 11); ctx.fillRect(300, 126, 4, 10);

    // Nightclub Promoter — on the door, arms crossed
    if (npcVisible) {
      const nx = 160, ny = 120;
      ctx.fillStyle = '#a89880'; // skin
      ctx.fillRect(nx, ny, 5, 5); // head
      ctx.fillStyle = '#0a0a0a'; // black jacket
      ctx.fillRect(nx - 2, ny + 5, 9, 12);
      // Arms crossed
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(nx - 3, ny + 8, 3, 4);
      ctx.fillRect(nx + 5, ny + 8, 3, 4);
      // Stamp ink on wrists
      ctx.fillStyle = 'rgba(80,40,120,0.3)';
      ctx.fillRect(nx - 3, ny + 11, 2, 1);
      ctx.fillRect(nx + 6, ny + 11, 2, 1);
    }
  }

  // --- Empty Lot (L10) ---

  function sceneEmptyLot(t) {
    // Big sky (the sky is bigger here)
    ctx.fillStyle = makeSkyGradient(0, 100);
    ctx.fillRect(0, 0, W, 100);
    drawStars(t, 60);

    // Adjacent walls (building scar)
    ctx.fillStyle = '#0c0a12';
    ctx.fillRect(0, 20, 25, 80); // left wall
    ctx.fillRect(280, 25, 40, 75); // right wall
    // Scar on right wall — outline of old rooms
    ctx.fillStyle = 'rgba(200,180,140,0.03)';
    ctx.fillRect(282, 35, 30, 1); // old floor line
    ctx.fillRect(282, 55, 30, 1); // old floor line 2
    ctx.fillRect(298, 30, 1, 30); // old wall
    // Fireplace outline
    ctx.fillStyle = 'rgba(200,180,140,0.05)';
    ctx.fillRect(286, 38, 10, 14);
    ctx.fillStyle = '#0c0a12';
    ctx.fillRect(288, 40, 6, 10);

    // Ground (cracked concrete)
    ctx.fillStyle = '#10101a';
    ctx.fillRect(0, 100, W, 80);
    // Cracks
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(60, 105, 1, 30); ctx.fillRect(140, 110, 1, 25);
    ctx.fillRect(200, 108, 1, 35); ctx.fillRect(80, 135, 60, 1);

    // Weeds
    ctx.fillStyle = '#1a2a12';
    for (let x = 70; x < 200; x += 12) {
      const h = 4 + Math.sin(x * 0.5) * 3;
      ctx.fillRect(x, 140 - h, 2, h);
      ctx.fillRect(x + 1, 140 - h - 2, 1, 2);
    }

    // Moon reflection on concrete (evening/night)
    if (timePeriod === 'evening' || timePeriod === 'night') {
      ctx.fillStyle = 'rgba(200,200,220,0.01)';
      ctx.fillRect(100, 110, 80, 40);
    }

    // Fox (night only)
    if (timePeriod === 'night' || timePeriod === 'evening') {
      const foxX = 240 + Math.sin(t * 0.2) * 3;
      ctx.fillStyle = '#3a2010';
      ctx.fillRect(foxX, 148, 10, 6); // body
      ctx.fillRect(foxX - 4, 146, 6, 5); // head
      ctx.fillRect(foxX - 3, 144, 2, 3); // ear
      ctx.fillRect(foxX + 10, 149, 6, 1); // tail
      // Eye
      ctx.fillStyle = '#e0a020';
      ctx.fillRect(foxX - 2, 147, 1, 1);
    }

    // Silence overlay — subtle desaturation
    ctx.fillStyle = 'rgba(10,10,20,0.02)';
    ctx.fillRect(0, 0, W, H);
  }

  // --- Character creation silhouettes ---

  function drawSilhouettes(t) {
    const figures = [
      { x: 48, active: true, color: '#5a80b8' },
      { x: 112, active: false, color: '#606060' },
      { x: 160, active: false, color: '#606060' },
      { x: 208, active: false, color: '#606060' },
      { x: 272, active: false, color: '#606060' }
    ];
    const by = 140;
    for (let i = 0; i < figures.length; i++) {
      const f = figures[i];
      const a = f.active ? (0.75 + 0.25 * Math.sin(t * 1.5)) : 0.18;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = f.color;
      // Body
      ctx.fillRect(f.x - 3, by, 6, 6);       // head
      ctx.fillRect(f.x - 1, by + 6, 2, 2);   // neck
      ctx.fillRect(f.x - 4, by + 8, 8, 10);  // body
      ctx.fillRect(f.x - 7, by + 9, 3, 7);   // left arm
      ctx.fillRect(f.x + 4, by + 9, 3, 7);   // right arm
      ctx.fillRect(f.x - 3, by + 18, 2, 8);  // left leg
      ctx.fillRect(f.x + 1, by + 18, 2, 8);  // right leg
      // Trait icon
      switch (i) {
        case 0: // Musician — guitar on back
          ctx.fillRect(f.x + 7, by + 4, 2, 12);
          ctx.fillRect(f.x + 6, by + 14, 4, 3);
          break;
        case 1: // Photographer — camera at chest
          ctx.fillRect(f.x - 2, by + 10, 5, 3);
          ctx.fillRect(f.x - 1, by + 9, 3, 1);
          break;
        case 2: // Wanderer — walking stick
          ctx.fillRect(f.x - 9, by + 6, 1, 16);
          break;
        case 3: // Barista — cup in hand
          ctx.fillRect(f.x + 7, by + 12, 3, 3);
          ctx.fillRect(f.x + 8, by + 10, 1, 2);
          break;
        case 4: // Shopkeeper — package
          ctx.fillRect(f.x - 10, by + 10, 4, 4);
          break;
      }
      ctx.restore();
    }
  }

  // --- Title overlay ---

  function drawTitle(alpha) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText('TRACE', W / 2 + 1, 30);
    ctx.fillStyle = '#e8d4b8';
    ctx.fillText('TRACE', W / 2, 29);
    const tw = ctx.measureText('TRACE').width;
    ctx.fillStyle = `rgba(232,180,100,${(0.3 * alpha).toFixed(2)})`;
    ctx.fillRect(W / 2 - tw / 2, 33, tw, 1);
    ctx.restore();
  }

  // --- Render & Loop ---

  function render(t, dt) {
    switch (state) {
      case 'title':
        sceneCanalBasin(t);
        drawTitle(titleAlpha);
        break;
      case 'character_creation':
        sceneCanalBasin(t);
        drawSilhouettes(t);
        break;
      case 'playing':
        if (titleAlpha > 0) titleAlpha = Math.max(0, titleAlpha - 0.02);
        switch (currentLocation) {
          case 'flat': sceneFlat(t); break;
          case 'L01':  sceneCanalBasin(t, locationNpcs['canal_painter']); break;
          case 'L02':  sceneCoffeeShop(t, locationNpcs['barista']); break;
          case 'L03':  sceneChurchyard(t); break;
          case 'L04':  sceneWarehouse(t, locationNpcs['sound_artist']); break;
          case 'L05':  scenePub(t, locationNpcs['pub_landlord']); break;
          case 'L06':  sceneParlour(t, locationNpcs['tattoo_artist']); break;
          case 'L07':  sceneLockGates(t); break;
          case 'L08':  sceneDLR(t, locationNpcs['bike_courier']); break;
          case 'L09':  sceneMarket(t, locationNpcs['nightclub_promoter']); break;
          case 'L10':  sceneEmptyLot(t); break;
          default:     sceneCanalBasin(t); break;
        }
        // The Watcher — still figure at edge of any exterior scene
        if (_watcherVisible) {
          const WATCHER_POS = {
            L01: [290, 116], L03: [20, 116], L07: [12, 118],
            L08: [260, 120], L09: [305, 124], L10: [260, 144]
          };
          const wp = WATCHER_POS[currentLocation] || [290, 116];
          const wx = wp[0], wy = wp[1];
          ctx.save();
          ctx.globalAlpha = 0.35;
          ctx.fillStyle = '#0a0a10';
          ctx.fillRect(wx, wy, 4, 5);       // head
          ctx.fillRect(wx - 1, wy + 5, 6, 9); // body (long coat)
          ctx.fillRect(wx, wy + 14, 2, 5);  // left leg
          ctx.fillRect(wx + 2, wy + 14, 2, 5); // right leg
          ctx.restore();
        }

        // Discovered detail markers — subtle shimmer at found detail locations
        if (_discoveredDetails.length > 0) {
          for (const h of _discoveredDetails) {
            const cx = h.x + h.w / 2;
            const cy = h.y + h.h / 2;
            const pulse = Math.sin(t * 0.0015 + cx * 0.1) * 0.5 + 0.5;
            const a = 0.06 + pulse * 0.08;
            ctx.fillStyle = `rgba(200,180,140,${a.toFixed(3)})`;
            ctx.fillRect(cx - 1, cy - 1, 2, 2);
          }
        }

        // First discovery shimmer — teaches the player to tap (one-time, first location only)
        if (_firstShimmer) {
          _firstShimmer.age += dt * 1.2;
          if (_firstShimmer.age < 5) { // 5 seconds then gone
            const shimmer = Math.sin(_firstShimmer.age * 3) * 0.5 + 0.5;
            const sa = 0.08 + shimmer * 0.12;
            const cx = _firstShimmer.x + _firstShimmer.w / 2;
            const cy = _firstShimmer.y + _firstShimmer.h / 2;
            ctx.fillStyle = 'rgba(220,200,160,' + sa.toFixed(3) + ')';
            ctx.fillRect(cx - 2, cy - 2, 4, 4);
            // Outer pulse
            const pr = 3 + shimmer * 4;
            ctx.fillStyle = 'rgba(220,200,160,' + (sa * 0.3).toFixed(3) + ')';
            ctx.beginPath(); ctx.arc(cx, cy, pr, 0, Math.PI * 2); ctx.fill();
          } else {
            _firstShimmer = null;
          }
        }

        // Discovery flash — brief glow at detail location
        if (_discoveryFlash) {
          _discoveryFlash.age += dt * 1.8;
          const fa = Math.max(0, 0.4 - _discoveryFlash.age);
          if (fa > 0) {
            ctx.fillStyle = `rgba(220,200,140,${fa.toFixed(3)})`;
            ctx.fillRect(_discoveryFlash.x - 1, _discoveryFlash.y - 1, _discoveryFlash.w + 2, _discoveryFlash.h + 2);
          } else {
            _discoveryFlash = null;
          }
        }

        // Discovery preview — floating text near detail
        if (_discoveryPreview) {
          _discoveryPreview.age += dt * 0.9;
          const pa = Math.max(0, 0.9 - _discoveryPreview.age);
          if (pa > 0) {
            ctx.save();
            ctx.font = '5px monospace';
            ctx.fillStyle = `rgba(200,180,140,${pa.toFixed(2)})`;
            ctx.textAlign = 'center';
            ctx.fillText(_discoveryPreview.text, _discoveryPreview.x, _discoveryPreview.y - _discoveryPreview.age * 10);
            ctx.restore();
          } else {
            _discoveryPreview = null;
          }
        }

        // Hint pulse — ambient scene breathing when undiscovered details exist
        _hintPulse = (t * 0.8) % (Math.PI * 2);
        if (_discoveredDetails.length === 0) {
          // No details found yet at this location — gentle scene glow
          const breath = Math.sin(_hintPulse) * 0.5 + 0.5;
          if (breath > 0.7) {
            ctx.fillStyle = `rgba(200,190,160,${((breath - 0.7) * 0.04).toFixed(4)})`;
            ctx.fillRect(0, 0, W, H);
          }
        }

        // Tap feedback ring — warm hue when undiscovered details exist at location
        if (_tapRing) {
          _tapRing.age += dt * 3.0;
          const r = _tapRing.age * 20;
          const a = Math.max(0, 0.3 - _tapRing.age * 0.5);
          if (a > 0) {
            const TRAIT_RING = {
              musician: '216,176,96',     // warm amber
              photographer: '96,144,192', // cool blue
              wanderer: '138,112,80',     // earth brown
              barista: '192,144,112',     // rose gold
              shopkeeper: '112,160,128'   // patina green
            };
            const col = _hasUndiscovered ? (TRAIT_RING[_playerTrait] || '210,180,120') : '200,180,140';
            ctx.strokeStyle = `rgba(${col},${a.toFixed(2)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(_tapRing.x, _tapRing.y, r, 0, Math.PI * 2);
            ctx.stroke();
          } else {
            _tapRing = null;
          }
        }

        // Rain overlay (on top of scene)
        if (_raining) {
          ctx.fillStyle = 'rgba(100,120,140,0.08)';
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = 'rgba(180,200,220,0.25)';
          for (const d of RAIN_DROPS) {
            const y = (d.y + t * d.speed * 60) % H;
            ctx.fillRect(d.x, y, 1, d.len);
          }
        }
        // The Forgetting — desaturation overlay
        if (_forgetting) {
          ctx.fillStyle = 'rgba(20,20,30,0.15)';
          ctx.fillRect(0, 0, W, H);
        }
        // Navigation transition overlay
        if (_transitionDir !== 0) {
          _transitionAlpha += _transitionDir * dt * 3.0;
          if (_transitionDir === 1 && _transitionAlpha >= 1) {
            _transitionAlpha = 1;
            _transitionDir = -1;
            if (_transitionCallback) { _transitionCallback(); _transitionCallback = null; }
          } else if (_transitionDir === -1 && _transitionAlpha <= 0) {
            _transitionAlpha = 0;
            _transitionDir = 0;
          }
          if (_transitionAlpha > 0) {
            ctx.fillStyle = 'rgba(0,0,0,' + _transitionAlpha.toFixed(3) + ')';
            ctx.fillRect(0, 0, W, H);
          }
        }
        break;
    }
  }

  function loop(timestamp) {
    const ts = timestamp || performance.now();
    const dt = _lastTimestamp ? Math.min((ts - _lastTimestamp) / 1000, 0.1) : 0.016;
    _lastTimestamp = ts;
    render(ts / 1000, dt);
    requestAnimationFrame(loop);
  }

  function start() {
    requestAnimationFrame(loop);
  }

  // --- Audio ---

  // Map musicLayer values to base ambient types
  const LAYER_TO_AMBIENT = {
    interior_flat: 'interior', interior_cafe: 'interior',
    interior_studio: 'interior', interior_pub: 'interior', interior_parlour: 'interior',
    exterior_canal: 'canal', exterior_lock: 'canal',
    exterior_church: 'street', exterior_platform: 'street',
    exterior_market: 'street', exterior_lot: 'street'
  };

  const audio = {
    _ctx: null,
    _master: null,
    _playing: false,
    _timer: null,
    _ambient: null,      // { nodes[], gain, type, layer }
    _rain: null,         // { nodes[], gain }
    _crossfadeSec: 2,
    _muted: false,
    _preMuteVolume: 0.5,

    isMuted() { return this._muted; },

    toggleMute() {
      if (!this._master) return;
      if (this._muted) {
        this._master.gain.value = this._preMuteVolume;
        this._muted = false;
      } else {
        this._preMuteVolume = this._master.gain.value;
        this._master.gain.value = 0;
        this._muted = true;
      }
    },

    init() {
      try {
        this._ctx = new (window.AudioContext || window.webkitAudioContext)();
        this._master = this._ctx.createGain();
        this._master.gain.value = 0.5;
        this._master.connect(this._ctx.destination);

        // Resume AudioContext on first user interaction (required by browsers)
        const resumeAudio = () => {
          if (this._ctx && this._ctx.state === 'suspended') {
            this._ctx.resume();
          }
        };
        document.addEventListener('click', resumeAudio, { once: true });
        document.addEventListener('touchend', resumeAudio, { once: true });

        // Suspend audio when tab is hidden, resume when visible
        document.addEventListener('visibilitychange', () => {
          if (!this._ctx) return;
          if (document.hidden) {
            this._ctx.suspend();
          } else {
            this._ctx.resume();
          }
        });
      } catch (e) {
        console.warn('Audio unavailable:', e);
      }
    },

    // --- Utility: create noise buffer ---
    _noiseBuffer(seconds) {
      const sr = this._ctx.sampleRate;
      const buf = this._ctx.createBuffer(1, sr * seconds, sr);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      return buf;
    },

    // --- Note (for theme + punctuation) ---
    _note(freq, startTime, duration, gain, type) {
      if (!this._ctx) return;
      const osc = this._ctx.createOscillator();
      const g = this._ctx.createGain();
      osc.type = type || 'triangle';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.001, startTime);
      g.gain.linearRampToValueAtTime(gain, startTime + 0.025);
      g.gain.linearRampToValueAtTime(gain * 0.55, startTime + 0.15);
      g.gain.setValueAtTime(gain * 0.55, startTime + duration * 0.65);
      g.gain.linearRampToValueAtTime(0.001, startTime + duration);
      osc.connect(g);
      g.connect(this._master);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    },

    // --- Theme melody ---
    playTheme() {
      if (!this._ctx) return;
      if (this._timer) clearTimeout(this._timer);
      this._playing = true;
      const now = this._ctx.currentTime + 0.1;
      this._note(130.81, now, 11, 0.035, 'sine');
      this._note(196.00, now, 11, 0.022, 'sine');
      this._note(261.63, now + 0.8, 0.9, 0.12);
      this._note(329.63, now + 2.0, 0.9, 0.12);
      this._note(392.00, now + 3.2, 1.3, 0.14);
      this._note(440.00, now + 5.0, 0.9, 0.12);
      this._note(523.25, now + 6.2, 1.0, 0.14);
      this._note(587.33, now + 7.5, 2.5, 0.12);
      this._note(659.25, now + 3.8, 1.5, 0.04, 'sine');
      this._note(783.99, now + 6.8, 1.8, 0.03, 'sine');
      this._timer = setTimeout(() => {
        if (this._playing) this.playTheme();
      }, 13000);
    },

    fadeOut(seconds) {
      this._playing = false;
      if (this._timer) clearTimeout(this._timer);
      if (this._master && this._ctx) {
        const t = this._ctx.currentTime;
        this._master.gain.setValueAtTime(this._master.gain.value, t);
        this._master.gain.linearRampToValueAtTime(0.001, t + seconds);
        // Restore master gain after fade completes so ambient can be heard
        this._master.gain.setValueAtTime(0.5, t + seconds + 0.05);
      }
    },

    // ========================================
    // AMBIENT SOUNDSCAPES
    // ========================================

    // Build a set of looping nodes for an ambient type
    _buildAmbient(type, layer) {
      if (!this._ctx) return null;
      const nodes = [];
      const gain = this._ctx.createGain();
      gain.gain.value = 0;
      gain.connect(this._master);

      // --- Base drone (all types) ---
      const droneFreqs = { canal: 55, street: 65, interior: 50 };
      const timeFactors = { morning: 1.15, afternoon: 1.0, evening: 0.9, night: 0.8 };
      const timeFactor = timeFactors[timePeriod] || 1.0;
      const drone = this._ctx.createOscillator();
      drone.type = 'sine';
      drone.frequency.value = (droneFreqs[type] || 55) * timeFactor;
      const droneG = this._ctx.createGain();
      droneG.gain.value = 0.04 * (timePeriod === 'night' ? 1.5 : 1.0);
      drone.connect(droneG);
      droneG.connect(gain);
      drone.start();
      nodes.push(drone, droneG);

      // --- Filtered noise bed ---
      const noise = this._ctx.createBufferSource();
      noise.buffer = this._noiseBuffer(4);
      noise.loop = true;
      const filt = this._ctx.createBiquadFilter();
      filt.type = 'lowpass';
      const noiseG = this._ctx.createGain();

      if (type === 'canal') {
        filt.frequency.value = 200; // deep water rumble
        noiseG.gain.value = 0.025;
      } else if (type === 'street') {
        filt.frequency.value = 800; // urban hiss
        noiseG.gain.value = 0.015;
      } else {
        filt.frequency.value = 300; // interior hush
        noiseG.gain.value = 0.012;
      }
      filt.frequency.value *= timeFactor;
      noise.connect(filt);
      filt.connect(noiseG);
      noiseG.connect(gain);
      noise.start();
      nodes.push(noise, filt, noiseG);

      // --- Location-specific accent layer ---
      this._addAccent(layer, gain, nodes);

      return { nodes, gain, type, layer, timePeriod };
    },

    // Add unique sonic accent per musicLayer
    _addAccent(layer, dest, nodes) {
      if (!this._ctx) return;

      // Helper: LFO-modulated tone
      const lfoTone = (freq, lfoRate, lfoDepth, vol, waveType) => {
        const osc = this._ctx.createOscillator();
        osc.type = waveType || 'sine';
        osc.frequency.value = freq;
        const lfo = this._ctx.createOscillator();
        lfo.frequency.value = lfoRate;
        const lfoG = this._ctx.createGain();
        lfoG.gain.value = lfoDepth;
        lfo.connect(lfoG);
        lfoG.connect(osc.frequency);
        const g = this._ctx.createGain();
        g.gain.value = vol;
        osc.connect(g);
        g.connect(dest);
        osc.start(); lfo.start();
        nodes.push(osc, lfo, lfoG, g);
      };

      switch (layer) {
        case 'exterior_canal':
          // Chain clink: metallic shimmer
          lfoTone(1200, 0.15, 200, 0.006, 'triangle');
          // Water lap
          lfoTone(80, 0.08, 15, 0.02, 'sine');
          break;
        case 'exterior_lock':
          // Heavy mechanism hum
          lfoTone(47, 0.03, 2, 0.03, 'sawtooth');
          // Dripping
          lfoTone(2400, 0.5, 400, 0.003, 'sine');
          break;
        case 'interior_cafe':
          // Espresso machine hiss
          lfoTone(3000, 0.2, 500, 0.004, 'sawtooth');
          // Clock tick simulation
          lfoTone(800, 2.0, 200, 0.002, 'square');
          break;
        case 'interior_flat':
          // Radiator click
          lfoTone(150, 0.1, 30, 0.008, 'square');
          break;
        case 'interior_studio':
          // 47Hz — the unrecorded sound
          lfoTone(47, 0.02, 1, 0.035, 'sine');
          // Equipment hum
          lfoTone(100, 0.5, 5, 0.01, 'sawtooth');
          break;
        case 'interior_pub':
          // Low murmur
          lfoTone(120, 0.3, 20, 0.015, 'sine');
          // Glass clink
          lfoTone(2800, 0.08, 300, 0.002, 'triangle');
          break;
        case 'interior_parlour':
          // Tattoo buzz
          lfoTone(180, 12, 30, 0.008, 'sawtooth');
          break;
        case 'exterior_church':
          // Wind through graves
          lfoTone(200, 0.05, 50, 0.01, 'sine');
          break;
        case 'exterior_platform':
          // Distant rail hum
          lfoTone(90, 0.12, 10, 0.015, 'sawtooth');
          // Wind whistle
          lfoTone(600, 0.07, 100, 0.005, 'sine');
          break;
        case 'exterior_market':
          // Bass from speakers
          lfoTone(60, 2.0, 8, 0.02, 'sine');
          // Crowd murmur
          lfoTone(250, 0.4, 50, 0.008, 'sine');
          break;
        case 'exterior_lot':
          // Silence emphasis — very faint wind
          lfoTone(300, 0.03, 40, 0.004, 'sine');
          break;
      }
    },

    // Stop and disconnect all nodes in an ambient set
    _killAmbient(amb) {
      if (!amb) return;
      const t = this._ctx.currentTime;
      amb.gain.gain.setValueAtTime(amb.gain.gain.value, t);
      amb.gain.gain.linearRampToValueAtTime(0.001, t + this._crossfadeSec);
      setTimeout(() => {
        for (const n of amb.nodes) {
          try { if (n.stop) n.stop(); } catch (_) {}
          try { n.disconnect(); } catch (_) {}
        }
        try { amb.gain.disconnect(); } catch (_) {}
      }, (this._crossfadeSec + 0.5) * 1000);
    },

    // Set the ambient soundscape for a location's musicLayer
    setAmbient(musicLayer) {
      if (!this._ctx || !musicLayer) return;
      // Skip if already playing this layer
      if (this._ambient && this._ambient.layer === musicLayer && this._ambient.timePeriod === timePeriod) return;

      const type = LAYER_TO_AMBIENT[musicLayer] || 'street';
      const newAmb = this._buildAmbient(type, musicLayer);
      if (!newAmb) return;

      // Crossfade: fade out old, fade in new
      this._killAmbient(this._ambient);
      const t = this._ctx.currentTime;
      newAmb.gain.gain.setValueAtTime(0.001, t);
      newAmb.gain.gain.linearRampToValueAtTime(1, t + this._crossfadeSec);
      this._ambient = newAmb;
    },

    // Stop ambient entirely
    stopAmbient() {
      this._killAmbient(this._ambient);
      this._ambient = null;
    },

    // ========================================
    // RAIN OVERLAY
    // ========================================

    startRain() {
      if (!this._ctx || this._rain) return;
      const nodes = [];
      const gain = this._ctx.createGain();
      gain.gain.value = 0;
      gain.connect(this._master);

      // Heavy filtered noise — rain on canal / rooftops
      const noise = this._ctx.createBufferSource();
      noise.buffer = this._noiseBuffer(4);
      noise.loop = true;
      const bp = this._ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1000;
      bp.Q.value = 0.5;
      const rg = this._ctx.createGain();
      rg.gain.value = 0.06;
      noise.connect(bp);
      bp.connect(rg);
      rg.connect(gain);
      noise.start();
      nodes.push(noise, bp, rg);

      // High patter — individual drops
      const patter = this._ctx.createBufferSource();
      patter.buffer = this._noiseBuffer(2);
      patter.loop = true;
      const hp = this._ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 4000;
      const pg = this._ctx.createGain();
      pg.gain.value = 0.015;
      patter.connect(hp);
      hp.connect(pg);
      pg.connect(gain);
      patter.start();
      nodes.push(patter, hp, pg);

      // Fade in
      const t = this._ctx.currentTime;
      gain.gain.linearRampToValueAtTime(1, t + 3);
      this._rain = { nodes, gain };
    },

    stopRain() {
      if (!this._rain) return;
      const t = this._ctx.currentTime;
      this._rain.gain.gain.setValueAtTime(this._rain.gain.gain.value, t);
      this._rain.gain.gain.linearRampToValueAtTime(0.001, t + 3);
      const rain = this._rain;
      this._rain = null;
      setTimeout(() => {
        for (const n of rain.nodes) {
          try { n.stop(); } catch (_) {}
          try { n.disconnect(); } catch (_) {}
        }
        try { rain.gain.disconnect(); } catch (_) {}
      }, 3500);
    },

    // ========================================
    // PUNCTUATION SOUNDS
    // ========================================

    // Discovery chime — bright ascending pair
    playDiscovery() {
      if (!this._ctx) return;
      const TRAIT_PITCH = {
        musician: 1.0, photographer: 1.12, wanderer: 0.85,
        barista: 1.05, shopkeeper: 0.9
      };
      const p = TRAIT_PITCH[_playerTrait] || 1.0;
      const t = this._ctx.currentTime;
      this._note(523.25 * p, t, 0.3, 0.15, 'triangle');
      this._note(659.25 * p, t + 0.15, 0.4, 0.12, 'triangle');
      this._note(783.99 * p, t + 0.1, 0.6, 0.04, 'sine');
    },

    // NPC greeting — warm low tone
    playNpcGreet() {
      if (!this._ctx) return;
      const t = this._ctx.currentTime;
      this._note(196.00, t, 0.5, 0.08, 'sine');
      this._note(261.63, t + 0.08, 0.4, 0.06, 'triangle');
    },

    // Investigation advance — descending mystery
    playInvestigation() {
      if (!this._ctx) return;
      const t = this._ctx.currentTime;
      this._note(440.00, t, 0.35, 0.10, 'sine');
      this._note(349.23, t + 0.2, 0.35, 0.10, 'sine');
      this._note(293.66, t + 0.4, 0.6, 0.08, 'triangle');
    },

    // Lore fragment — deeper, more resonant tone
    playFragmentSound() {
      if (!this._ctx) return;
      const t = this._ctx.currentTime;
      const osc = this._ctx.createOscillator();
      const g = this._ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(165, t + 0.8);
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      osc.connect(g);
      g.connect(this._master);
      osc.start(t);
      osc.stop(t + 1.2);
    },

    // Investigation reveal — rising sequence
    playInvestigationReveal() {
      if (!this._ctx) return;
      const t = this._ctx.currentTime;
      [330, 392, 440].forEach((freq, i) => {
        const osc = this._ctx.createOscillator();
        const g = this._ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0, t + i * 0.15);
        g.gain.linearRampToValueAtTime(0.08, t + i * 0.15 + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.4);
        osc.connect(g);
        g.connect(this._master);
        osc.start(t + i * 0.15);
        osc.stop(t + i * 0.15 + 0.4);
      });
    },

    // Choice moment — suspended tension
    playChoice() {
      if (!this._ctx) return;
      const t = this._ctx.currentTime;
      this._note(329.63, t, 1.5, 0.07, 'sine');
      this._note(392.00, t, 1.5, 0.07, 'sine');
      this._note(466.16, t, 1.5, 0.05, 'sine'); // tritone tension
    },

    // Empty tap — faint hollow knock, teaches tapping is valid
    playEmptyTap() {
      if (!this._ctx) return;
      const t = this._ctx.currentTime;
      const osc = this._ctx.createOscillator();
      const g = this._ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);
      g.gain.setValueAtTime(0.04, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(g);
      g.connect(this._master);
      osc.start(t);
      osc.stop(t + 0.25);
    }
  };

  function fadeTransition(callback) {
    _transitionDir = 1;
    _transitionAlpha = 0;
    _transitionCallback = callback;
  }

  // --- Public API ---

  return {
    init, start, resize,
    setState(s) { state = s; },
    getState() { return state; },
    setLocation(id) { currentLocation = id; },
    setTimePeriod(p) { timePeriod = p; },
    setLocationNpcs(npcs) { locationNpcs = npcs; },
    onCanvasTap(fn) { _onCanvasTap = fn; },
    setRaining(v) { _raining = !!v; },
    setWatcherVisible(v) { _watcherVisible = !!v; },
    setForgetting(v) { _forgetting = !!v; },
    setDiscoveredDetails(details) { _discoveredDetails = details || []; },
    setHasUndiscovered(v) { _hasUndiscovered = !!v; },
    fadeTransition,
    setPlayerTrait(t) { _playerTrait = t || 'musician'; },
    setFirstShimmer(hitbox) { _firstShimmer = { x: hitbox.x, y: hitbox.y, w: hitbox.w, h: hitbox.h, age: 0 }; },
    flashDiscovery(hitbox, text) {
      _discoveryFlash = { x: hitbox.x, y: hitbox.y, w: hitbox.w, h: hitbox.h, age: 0 };
      const preview = (text || '').split(' ').slice(0, 4).join(' ');
      _discoveryPreview = { text: preview, x: hitbox.x + hitbox.w/2, y: hitbox.y - 6, age: 0 };
    },
    audio
  };
})();
