// Max Headroom-style animated tile for Home Assistant. No dependencies.
// Usage: type: custom:max-headroom-card
// Options: video or image (your own Max footage/picture; without one he's a drawn placeholder),
//          segments ([[start, end], ...] seconds of the video to loop, e.g. only the shots of Max),
//          lines ([[start, end, "caption"?], ...] stretches of the video where he really speaks; played with sound),
//          tts_engine (HA TTS entity; his generated speech gets Max's pitch jumps and stutters),
//          tts_language + tts_voice (e.g. en_US / en_US-ryan-high; otherwise the engine uses HA's language),
//          voice_pitch (semitones to raise the TTS voice; 4.1 puts Piper's ryan-high on Max's measured ~240 Hz),
//          language (what the AI answers in, default en),
//          name, entity, messages, agent_id, persona, voice, reactions

const W = 640, H = 360;

const DEFAULT_MESSAGES = [
  "Good evening, house. Max here, live from inside your dashboard.",
  "I've counted your light switches. Twice. You have too many.",
  "This is a broadcast from twenty minutes into the future. Please stand by.",
  "Don't touch that dial. Oh wait, you don't have one.",
  "The fridge and I are no longer speaking.",
  "Network television: where reruns go to be born.",
  "Your thermostat thinks it's in charge. Adorable.",
  "I'm not trapped in here. You're trapped out there.",
];
const POKE = [
  "Hey! Watch the hair.",
  "Ow. That's my face.",
  "Do you poke your TV too?",
  "Personal space, please. I live in a six hundred and forty by three hundred and sixty box.",
  "Careful, I'm made of very expensive pixels.",
];
const ANNOYED = [
  "Okay, okay, I'm awake!",
  "Stop that. I will change your Wi-Fi password.",
  "One more poke and I'm switching to the weather channel.",
];
const THINKING = ["Hmm. Let me think.", "Processing. Processing.", "Ooh, good question."];
const HOME_LINES = ["Welcome home, {name}. I kept the lights warm.", "{name} has entered the building. Act natural."];
const AWAY_LINES = ["{name} has left. Finally, some peace and quiet.", "Bye-bye, {name}. Don't forget your keys. Too late."];
const DOOR_LINES = ["The {name} just opened. Who goes there?", "{name}: open. Draft detected."];
const PERSONA = "Answer as Max Headroom, the stuttering, sarcastic 1980s TV host who lives in this smart-home dashboard. " +
  "Keep it to one or two short sentences. The user says:";

const rand = (a, b) => a + Math.random() * (b - a);
const pick = list => list[Math.floor(Math.random() * list.length)];

function stutter(word) {
  if (!/^[a-z]/i.test(word)) return word;
  return `${word[0]}-`.repeat(1 + Math.floor(Math.random() * 3)) + word;
}

// Adds Max's trademark stutter to the first word (often) and random others (sometimes).
function prep(msg) {
  return msg.split(' ').map((w, i) =>
    (i === 0 && Math.random() < 0.5) || Math.random() < 0.12 ? stutter(w) : w
  ).join(' ');
}

function poly(ctx, fill, pts) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
}

// Rotating neon line grids, the classic Max backdrop.
function drawBackground(ctx, t) {
  ctx.fillStyle = '#05010a';
  ctx.fillRect(0, 0, W, H);
  const D = Math.hypot(W, H);
  ctx.lineWidth = 2;
  [['#ff2bd6', t * 0.21], ['#2bf0ff', 1 - t * 0.17], ['#ffe62b', 2 + t * 0.11]].forEach(([color, a], k) => {
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(a);
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.5;
    const gap = 34 + k * 8;
    const shift = (t * (15 + k * 10)) % gap;
    ctx.beginPath();
    for (let x = -D / 2 - gap + shift; x < D / 2; x += gap) {
      ctx.moveTo(x, -D / 2);
      ctx.lineTo(x, D / 2);
    }
    ctx.stroke();
    ctx.restore();
  });
}

// p = pose time (repeats while stuttering), mouth = 0..1 open amount, flinch = 0..1 after a poke.
function drawMax(ctx, p, mouth, flinch) {
  ctx.save();
  ctx.translate(W / 2 + Math.sin(p * 0.6) * 30 + flinch * rand(-14, 14), H / 2 + 10 + Math.sin(p * 1.3) * 4 + flinch * 10);
  ctx.rotate(Math.sin(p * 0.8) * 0.09 + flinch * 0.15);
  ctx.scale(0.85 - flinch * 0.08, 0.85 - flinch * 0.08);

  const skin = ctx.createLinearGradient(-90, -120, 90, 130);
  skin.addColorStop(0, '#fbe7da');
  skin.addColorStop(0.5, '#e9c2aa');
  skin.addColorStop(1, '#b98a72');

  // suit, shirt, neck, tie
  poly(ctx, '#15151c', [[-220, 300], [-160, 165], [-55, 140], [55, 140], [160, 165], [220, 300]]);
  poly(ctx, '#f4f4f4', [[-55, 140], [0, 205], [55, 140]]);
  poly(ctx, skin, [[-35, 95], [35, 95], [40, 150], [0, 185], [-40, 150]]);
  poly(ctx, '#c4122f', [[-10, 168], [10, 168], [16, 245], [0, 265], [-16, 245]]);

  // ears + head
  ctx.fillStyle = '#d9ad95';
  [-95, 95].forEach(x => { ctx.beginPath(); ctx.ellipse(x, 0, 14, 26, 0, 0, Math.PI * 2); ctx.fill(); });
  poly(ctx, skin, [[-80, -110], [80, -110], [95, -40], [90, 40], [60, 110], [0, 135], [-60, 110], [-90, 40], [-95, -40]]);

  // plastic sheen
  poly(ctx, 'rgba(255,255,255,0.35)', [[-62, -100], [-20, -106], [-55, -45]]);
  poly(ctx, 'rgba(255,255,255,0.25)', [[-80, 20], [-60, 5], [-62, 70]]);

  // slicked-back hair
  poly(ctx, '#e8e2c8', [[-92, -60], [-88, -120], [-50, -158], [10, -168], [65, -150], [92, -115], [95, -60], [75, -105], [20, -125], [-40, -120], [-75, -95]]);
  ctx.strokeStyle = '#b8ae8a';
  ctx.lineWidth = 3;
  [-40, 0, 40].forEach(x => {
    ctx.beginPath();
    ctx.moveTo(x - 20, -125);
    ctx.quadraticCurveTo(x, -155, x + 30, -150);
    ctx.stroke();
  });

  // sunglasses
  ctx.fillStyle = '#050505';
  ctx.beginPath();
  ctx.roundRect(-80, -48, 68, 38, 10);
  ctx.roundRect(12, -48, 68, 38, 10);
  ctx.rect(-14, -40, 28, 6);
  ctx.fill();
  ctx.strokeStyle = '#050505';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-80, -40); ctx.lineTo(-95, -30);
  ctx.moveTo(80, -40); ctx.lineTo(95, -30);
  ctx.stroke();
  poly(ctx, 'rgba(43,240,255,0.55)', [[-70, -44], [-55, -44], [-72, -16], [-78, -16]]);
  poly(ctx, 'rgba(43,240,255,0.55)', [[22, -44], [37, -44], [20, -16], [14, -16]]);

  // nose
  ctx.strokeStyle = '#a87a64';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -8); ctx.lineTo(-9, 30); ctx.lineTo(6, 34);
  ctx.stroke();

  // big toothy grin
  const open = 6 + mouth * 34;
  ctx.beginPath();
  ctx.moveTo(-58, 58);
  ctx.quadraticCurveTo(0, 72, 58, 58);
  ctx.quadraticCurveTo(0, 72 + open * 2, -58, 58);
  ctx.fillStyle = '#3a0d12';
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#fffdf5';
  ctx.fillRect(-60, 50, 120, 20);
  ctx.strokeStyle = '#d8d2c4';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = -42; x <= 42; x += 14) { ctx.moveTo(x, 55); ctx.lineTo(x, 70); }
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#8a4a44';
  ctx.lineWidth = 2;
  ctx.stroke();

  // smile creases
  ctx.strokeStyle = '#b98a72';
  ctx.beginPath();
  ctx.moveTo(-66, 45); ctx.quadraticCurveTo(-72, 60, -64, 72);
  ctx.moveTo(66, 45); ctx.quadraticCurveTo(72, 60, 64, 72);
  ctx.stroke();

  ctx.restore();
}

// Real footage fills the frame (it brings its own background); a picture sits full-height on the neon backdrop.
function drawMedia(ctx, el, p, flinch) {
  const isVideo = el instanceof HTMLVideoElement;
  const w = el.videoWidth || el.naturalWidth, h = el.videoHeight || el.naturalHeight;
  if (!w) return;
  const s = (isVideo ? Math.max(W / w, H / h) : H / h) * (1.06 + flinch * 0.1 + Math.sin(p * 1.3) * 0.01);
  ctx.save();
  // video taller than the tile: crop a bit more from the bottom than the top, keeping hair and mouth
  ctx.translate(W / 2 + (isVideo ? 0 : Math.sin(p * 0.6) * 20) + flinch * rand(-14, 14), H / 2 + (isVideo ? ((h * s - H) / 2) * 0.3 : 0));
  ctx.rotate(Math.sin(p * 0.8) * (isVideo ? 0.015 : 0.05) + flinch * 0.1);
  ctx.drawImage(el, (-w * s) / 2, (-h * s) / 2, w * s, h * s);
  ctx.restore();
}

function wrap(ctx, text, max) {
  const lines = [''];
  for (const w of text.split(' ')) {
    const last = lines[lines.length - 1];
    const cand = last ? `${last} ${w}` : w;
    if (last && ctx.measureText(cand).width > max) lines.push(w);
    else lines[lines.length - 1] = cand;
  }
  return lines;
}

// Top of frame, so it never covers the mouth or the control bar. Long replies scroll (last 3 lines).
function drawCaption(ctx, text) {
  if (!text) return;
  ctx.font = 'bold 22px "Arial Black", Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  wrap(ctx, text, W - 80).slice(-3).forEach((line, i) => {
    const y = 36 + i * 26;
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#000';
    ctx.strokeText(line, W / 2, y);
    ctx.fillStyle = '#ffe62b';
    ctx.fillText(line, W / 2, y);
  });
}

// Plays speech the way Max's voice was cut: short pieces with sudden sticky pitch jumps and
// repeated-syllable stutters, through a thin, slightly flanged TV-speaker chain. Returns seconds of audio.
// base: overall playback rate; raising it lifts pitch and brightness together, as in Max's own voice.
function maxify(ctx, buffer, nodes, base = 1) {
  const input = new GainNode(ctx);
  const tv = input
    .connect(new BiquadFilterNode(ctx, { type: 'highpass', frequency: 280 }))
    .connect(new BiquadFilterNode(ctx, { type: 'peaking', frequency: 2600, Q: 1, gain: 6 }));
  const flange = new DelayNode(ctx, { delayTime: 0.006 });
  const lfo = new OscillatorNode(ctx, { frequency: 0.8 });
  lfo.connect(new GainNode(ctx, { gain: 0.003 })).connect(flange.delayTime);
  tv.connect(ctx.destination);
  tv.connect(flange).connect(new GainNode(ctx, { gain: 0.5 })).connect(ctx.destination);
  const start = ctx.currentTime + 0.05;
  let when = start, pos = 0, rate = base;
  const play = (offset, dur) => {
    const s = new AudioBufferSourceNode(ctx, { buffer, playbackRate: rate });
    s.connect(input);
    s.start(when, offset, dur);
    nodes.push(s);
    when += dur / rate;
  };
  while (pos < buffer.duration) {
    const len = Math.min(rand(0.25, 0.6), buffer.duration - pos);
    if (Math.random() < 0.35) rate = base * pick([0.9, 1, 1, 1.08, 1.17]);
    if (len > 0.15 && Math.random() < 0.2) {
      const grain = rand(0.07, 0.13);
      for (let i = Math.floor(rand(1, 3)); i > 0; i--) play(pos, grain);
    }
    play(pos, len);
    pos += len;
  }
  lfo.start(start);
  lfo.stop(when);
  nodes.push(lfo);
  return when - ctx.currentTime;
}

class MaxHeadroomCard extends HTMLElement {
  setConfig(config) {
    this._config = { messages: DEFAULT_MESSAGES, persona: PERSONA, language: 'en', ...config };
    this._watch = null;
  }

  set hass(hass) {
    const old = this._hass;
    this._hass = hass;
    if (!old || !this._queue) return;
    for (const r of this._reactions(hass)) {
      const a = old.states[r.entity], b = hass.states[r.entity];
      if (!a || !b || a.state === b.state || ['unavailable', 'unknown'].includes(a.state)) continue;
      if ((r.to && b.state !== r.to) || (r.from && a.state !== r.from)) continue;
      const name = b.attributes.friendly_name || r.entity;
      this._say(pick([].concat(r.say)).replaceAll('{name}', name).replaceAll('{state}', b.state));
    }
  }

  getCardSize() {
    return 4;
  }

  static getStubConfig() {
    return {};
  }

  // `reactions:` from config wins (use [] to turn off); otherwise people coming/going and door/window sensors.
  _reactions(hass) {
    if (!this._watch) {
      this._watch = this._config.reactions || Object.keys(hass.states).flatMap(id => {
        if (id.startsWith('person.')) return [{ entity: id, to: 'home', say: HOME_LINES }, { entity: id, from: 'home', say: AWAY_LINES }];
        const dc = hass.states[id].attributes.device_class;
        if (id.startsWith('binary_sensor.') && ['door', 'garage_door', 'window'].includes(dc)) return [{ entity: id, to: 'on', say: DOOR_LINES }];
        return [];
      });
    }
    return this._watch;
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' }).innerHTML = `
        <style>
          ha-card { overflow: hidden; position: relative; }
          canvas { display: block; width: 100%; aspect-ratio: 16 / 9; cursor: pointer; }
          .bar { position: absolute; left: 0; right: 0; bottom: 0; display: flex; align-items: center; gap: 4px;
                 padding: 4px 8px 4px 16px; background: rgba(0, 0, 0, 0.3); color: #fff; }
          .name { flex: 1; font-size: 16px; line-height: 40px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          input { flex: 2; min-width: 0; background: rgba(0, 0, 0, 0.4); color: #fff; font: inherit;
                  border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 16px; padding: 6px 12px; }
          button { background: none; border: 0; color: #fff; padding: 8px; cursor: pointer; border-radius: 50%;
                   line-height: 0; --mdc-icon-size: 22px; }
          button:hover { background: rgba(255, 255, 255, 0.15); }
          button.on { color: #2bf0ff; }
        </style>
        <ha-card>
          <canvas width="${W}" height="${H}" aria-label="Max Headroom. Tap to poke him."></canvas>
          <div class="bar">
            <span class="name"></span>
            <input placeholder="Talk to Max…" aria-label="Talk to Max">
            <button class="mic" aria-label="Speak to Max"><ha-icon icon="mdi:microphone"></ha-icon></button>
            <button class="mute"><ha-icon></ha-icon></button>
          </div>
        </ha-card>`;
      const $ = s => this.shadowRoot.querySelector(s);
      this._ctx = $('canvas').getContext('2d');
      const scan = document.createElement('canvas');
      scan.width = 1;
      scan.height = 3;
      scan.getContext('2d').fillStyle = 'rgba(0,0,0,0.35)';
      scan.getContext('2d').fillRect(0, 0, 1, 1);
      this._scanlines = this._ctx.createPattern(scan, 'repeat');
      this._vignette = this._ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.65);
      this._vignette.addColorStop(0, 'rgba(0,0,0,0)');
      this._vignette.addColorStop(1, 'rgba(0,0,0,0.7)');
      this._poseT = 0;
      this._stutterUntil = 0;
      this._flinchAt = -1;
      this._lastPoke = -9;
      this._pokes = 0;
      this._n = 0;
      this._queue = [];
      this._idleAt = 1;
      this._voiceNodes = [];
      this._audioUntil = 0;
      const { video, image } = this._config;
      if (video) {
        this._video = this._media = Object.assign(document.createElement('video'), { muted: true, loop: true, playsInline: true });
        this._video.src = video;
      } else if (image) {
        this._media = new Image();
        this._media.src = image;
      }
      // Start muted: browsers only allow speech after a click anyway.
      try { this._muted = localStorage.getItem('max-headroom-muted') !== 'false'; } catch { this._muted = true; }

      $('canvas').addEventListener('click', () => this._poke());
      // Tablets block sound until a tap, per audio context and per video element: any tap on the card unblocks both.
      $('ha-card').addEventListener('pointerdown', () => this._unlock());
      $('input').addEventListener('keydown', e => {
        e.stopPropagation(); // keep HA's keyboard shortcuts out of the text box
        if (e.key === 'Enter') { this._ask(e.target.value); e.target.value = ''; }
      });
      $('.mute').addEventListener('click', () => this._setMuted(!this._muted));
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) $('.mic').addEventListener('click', () => this._listen(SR));
      else $('.mic').hidden = true;
      this._setMuted(this._muted);
    }
    this.shadowRoot.querySelector('.name').textContent = this._config?.name || '';
    this._last = performance.now();
    const tick = now => { this._draw(now); this._raf = requestAnimationFrame(tick); };
    this._raf = requestAnimationFrame(tick);
  }

  disconnectedCallback() {
    cancelAnimationFrame(this._raf);
    this._stopVoice();
    this._video?.pause();
  }

  _stopVoice() {
    window.speechSynthesis?.cancel();
    this._speakToken = null;
    (this._voiceNodes || []).forEach(n => { try { n.stop(); } catch {} });
    this._voiceNodes = [];
    this._audioUntil = 0;
    if (this._line) this._endLine();
  }

  // A real recorded line: matching footage plays with its own sound, so the lips are in sync.
  _playLine([s, e]) {
    const v = this._video;
    if (!v) return;
    this._line = [s, e];
    v.currentTime = s;
    v.muted = this._muted;
    v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
  }

  _endLine() {
    this._line = null;
    this._video.muted = true;
    this._video.pause();
  }

  _startStutter(t, duration) {
    this._stutterFrom = this._poseT;
    this._stutterVideo = this._video?.currentTime;
    this._stutterJump = t;
    this._stutterUntil = t + duration;
  }

  _unlock() {
    if (this._muted) return;
    (this._audio ||= new AudioContext()).resume();
    const v = this._video;
    if (v && !this._unlocked && !this._line) {
      // playing with sound once inside the tap lets later real lines play with sound too
      this._unlocked = this._priming = true;
      v.muted = false;
      v.play()
        .then(() => { if (!this._line) { v.pause(); v.muted = true; } })
        .catch(() => { this._unlocked = false; v.muted = true; })
        .finally(() => { this._priming = false; });
    }
  }

  _setMuted(muted) {
    this._muted = muted;
    try { localStorage.setItem('max-headroom-muted', muted); } catch {}
    if (muted) window.speechSynthesis?.cancel();
    if (this._line) this._video.muted = muted;
    if (!muted) this._unlock(); // this click is the gesture browsers want
    const btn = this.shadowRoot.querySelector('.mute');
    btn.setAttribute('aria-label', muted ? 'Unmute Max' : 'Mute Max');
    btn.firstElementChild.setAttribute('icon', muted ? 'mdi:volume-off' : 'mdi:volume-high');
  }

  // item: text to speak, or a real line [start, end, caption?].
  // interrupt: cut him off and say this now (replies, pokes); a newer interrupt replaces an unsaid one.
  // Otherwise (house events) wait for the current line.
  _say(item, interrupt) {
    if (interrupt) {
      this._now = item;
      this._cap = null;
      this._stopVoice();
    } else if (this._queue.length < 3) this._queue.push(item);
  }

  // HA TTS run through maxify(); falls back to the browser's voice without a tts_engine.
  async _speak(text) {
    if (this._muted) return;
    const engine = this._config.tts_engine;
    if (!engine || !this._hass) return this._speakBrowser(text);
    const token = (this._speakToken = {});
    // LLMs write stutters like "m-m-master"; TTS would spell them out, and maxify adds real ones to the audio.
    const message = text.replace(/\b(\w{1,2})-(?:\1-)*(?=\1)/gi, '');
    try {
      const { tts_language: language, tts_voice: voice } = this._config;
      const r = await this._hass.callApi('POST', 'tts_get_url', { engine_id: engine, message, language, options: voice ? { voice } : undefined });
      const data = await (await fetch(r.path || r.url)).arrayBuffer();
      const ctx = (this._audio ||= new AudioContext());
      const buffer = await ctx.decodeAudioData(data);
      if (token !== this._speakToken || this._muted) return;
      if (ctx.state !== 'running') await ctx.resume().catch(() => {});
      if (ctx.state !== 'running') console.warn('max-headroom-card: audio still blocked, tap the card');
      const base = 2 ** ((this._config.voice_pitch || 0) / 12);
      this._audioUntil = performance.now() / 1000 + maxify(ctx, buffer, this._voiceNodes, base);
    } catch (e) {
      console.warn('max-headroom-card: TTS failed, using browser voice', e);
      if (token === this._speakToken) this._speakBrowser(text);
    }
  }

  // Short chunks with random pitch give the glitchy, pitch-shifting voice.
  _speakBrowser(text) {
    if (this._muted || !window.speechSynthesis) return;
    speechSynthesis.cancel();
    // Without this a Spanish tablet reads English with its Spanish voice.
    const lang = this._config.language;
    const voices = speechSynthesis.getVoices();
    const voice = (this._config.voice && voices.find(v => v.name.includes(this._config.voice))) || voices.find(v => v.lang.startsWith(lang));
    const words = text.split(' ');
    for (let i = 0; i < words.length; i += 4) {
      const u = new SpeechSynthesisUtterance(words.slice(i, i + 4).join(' '));
      u.pitch = rand(0.7, 1.6);
      u.rate = rand(1, 1.25);
      u.lang = lang;
      if (voice) u.voice = voice;
      speechSynthesis.speak(u);
    }
  }

  _poke() {
    const t = performance.now() / 1000;
    this._pokes = t - this._lastPoke < 3 ? this._pokes + 1 : 0;
    this._lastPoke = this._flinchAt = t;
    this._startStutter(t, 0.5);
    const short = (this._config.lines || []).filter(([s, e]) => e - s <= 3.5);
    this._say(this._pokes >= 3 ? pick(ANNOYED) : short.length ? pick(short) : pick(POKE), true);
  }

  _listen(SR) {
    const mic = this.shadowRoot.querySelector('.mic');
    const rec = new SR();
    rec.lang = this._hass?.language || navigator.language;
    rec.onresult = e => this._ask(e.results[0][0].transcript);
    rec.onend = () => mic.classList.remove('on');
    window.speechSynthesis?.cancel();
    mic.classList.add('on');
    rec.start();
  }

  async _ask(text) {
    text = text.trim();
    if (!text || !this._hass) return;
    this._say(pick(THINKING), true);
    try {
      const r = await this._hass.callWS({
        type: 'conversation/process',
        text: `${this._config.persona} ${text}`.trim(),
        agent_id: this._config.agent_id,
        language: this._config.language,
        conversation_id: this._convId,
      });
      this._convId = r.conversation_id;
      this._say(r.response?.speech?.plain?.speech || "I got nothing. Nothing!", true);
    } catch (e) {
      this._say(`My brain is offline. ${e.message || e.code || ''}`, true);
    }
  }

  _nextMessage() {
    const { messages, entity, lines } = this._config;
    if (lines?.length && this._video && Math.random() < 0.7) return pick(lines);
    const st = entity && this._hass?.states[entity];
    this._n++;
    if (st && this._n % 3 === 0) {
      const unit = st.attributes.unit_of_measurement ? ` ${st.attributes.unit_of_measurement}` : '';
      return `${st.attributes.friendly_name || entity} is ${st.state}${unit}. Fascinating.`;
    }
    return pick(messages);
  }

  _updateCaption(t) {
    const speaking = !!this._line || this._audioUntil > t || (!this._muted && window.speechSynthesis?.speaking);
    if (this._cap && t > this._cap.end && speaking) this._cap.end = t + 0.5;
    if (!this._cap || t > this._cap.end) {
      const queued = this._now || this._queue.shift();
      this._now = null;
      if (queued || t > this._idleAt) {
        const item = queued || this._nextMessage();
        const line = Array.isArray(item) ? item : null;
        const text = line ? line[2] || '' : prep(item);
        const start = t + (queued ? 0.2 : 0);
        const typed = start + (line ? line[1] - line[0] : text.length / 28);
        this._cap = { text, raw: line ? '' : item, line, start, typed, end: typed + (line ? 0.8 : 2.5) };
        this._idleAt = this._cap.end + rand(5, 12);
      } else this._cap = null;
    }
    const c = this._cap;
    if (!c) {
      this._talking = false;
      this._shown = '';
      return;
    }
    if (t >= c.start && !c.spoken) {
      c.spoken = true;
      if (c.line) this._playLine(c.line);
      else this._speak(c.raw); // un-stuttered text; maxify adds the stutters to the audio
    }
    this._talking = (t >= c.start && t < c.typed) || speaking;
    this._shown = t < c.start ? '' : c.text.slice(0, Math.floor(((t - c.start) / (c.typed - c.start)) * c.text.length));
  }

  _draw(now) {
    const ctx = this._ctx;
    const dt = Math.min((now - this._last) / 1000, 0.1);
    const t = now / 1000;
    this._last = now;
    this._updateCaption(t);

    // Stutter: keep snapping the pose (and the footage) back to the same moment, like a skipping tape.
    if (t < this._stutterUntil) {
      if (t - this._stutterJump > 0.09) {
        this._poseT = this._stutterFrom;
        if (this._video && !this._line) this._video.currentTime = this._stutterVideo;
        this._stutterJump = t;
      } else this._poseT += dt;
    } else {
      this._poseT += dt;
      // no random stutters during a real line: seeking back would garble his actual voice
      if (!this._line && Math.random() < dt * (this._talking ? 0.9 : 0.25)) this._startStutter(t, rand(0.3, 0.8));
    }
    // Footage only rolls for his real lines; for AI answers he's a frozen frame with glitches, never a silent clip.
    if (this._line) {
      if (this._video.currentTime >= this._line[1] || this._video.ended) this._endLine();
    } else if (this._video && !this._video.paused && !this._priming) this._video.pause();
    // Stay inside the chosen segments; jump to a random one when it runs out, like a jump cut.
    const segs = this._config.segments;
    if (!this._line && this._video?.readyState && segs?.length) {
      const now = this._video.currentTime;
      if (!this._seg || now < this._seg[0] - 0.05 || now > this._seg[1]) {
        this._seg = pick(segs);
        this._video.currentTime = this._seg[0];
      }
    }

    drawBackground(ctx, t);
    const flinch = Math.max(0, 1 - (t - this._flinchAt) / 0.4);
    if (this._media) drawMedia(ctx, this._media, this._poseT, flinch);
    else drawMax(ctx, this._poseT, this._talking ? Math.abs(Math.sin(this._poseT * 17)) * rand(0.6, 1) : 0, flinch);

    // horizontal tearing
    if (t < this._stutterUntil || Math.random() < 0.02) {
      for (let i = 0; i < 4; i++) {
        const y = rand(0, H), h = rand(4, 30);
        ctx.drawImage(ctx.canvas, 0, y, W, h, rand(-25, 25), y, W, h);
      }
    }

    drawCaption(ctx, this._shown);

    ctx.fillStyle = this._scanlines;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, ((t * 60) % (H + 80)) - 40, W, 40);
    ctx.fillStyle = this._vignette;
    ctx.fillRect(0, 0, W, H);
  }
}

customElements.define('max-headroom-card', MaxHeadroomCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'max-headroom-card',
  name: 'Max Headroom',
  description: 'A glitchy 80s TV host living in a tile. Talks, listens, and heckles your house.',
});
