// Temporary procedural sound: rain, a diesel idle, tyres on wet tarmac,
// wipers and a door. No music and no voice; the drive stays quiet.
export class Sound {
  constructor() { this.ready = false; }

  start() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    const len = ctx.sampleRate * 3;
    const buf = (this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate));
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);

    const loop = (type, freq, q, gain) => {
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = gain;
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start(0, Math.random() * 2);
      return { f, g };
    };
    loop('highpass', 2200, 0.5, 0.035);                 // rain hiss
    loop('bandpass', 420, 0.6, 0.11);                   // rain on the roof
    this.tyres = loop('bandpass', 1500, 0.7, 0.0);

    // diesel: two low oscillators plus clatter gated at the firing rate
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 170;
    this.engGain = ctx.createGain(); this.engGain.gain.value = 0.16;
    lp.connect(this.engGain); this.engGain.connect(this.master);
    this.o1 = ctx.createOscillator(); this.o1.type = 'sawtooth';
    this.o2 = ctx.createOscillator(); this.o2.type = 'square';
    const g2 = ctx.createGain(); g2.gain.value = 0.35;
    this.o1.connect(lp); this.o2.connect(g2); g2.connect(lp);
    this.clatter = loop('bandpass', 950, 1.2, 0.0);
    this.lfo = ctx.createOscillator(); this.lfo.type = 'square';
    const lg = ctx.createGain(); lg.gain.value = 0.012;
    this.lfo.connect(lg); lg.connect(this.clatter.g.gain);
    this.clatter.g.gain.value = 0.014;
    for (const o of [this.o1, this.o2, this.lfo]) o.start();
    this.setEngine(0, 0);
    this.ready = true;
  }

  fade(to, seconds) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(to, t + seconds);
  }

  setEngine(speed, throttle) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const f = 23 + Math.abs(speed) * 2.6 + throttle * 5;
    this.o1.frequency.setTargetAtTime(f, t, 0.15);
    this.o2.frequency.setTargetAtTime(f * 2.01, t, 0.15);
    this.lfo.frequency.setTargetAtTime(f, t, 0.15);
    this.engGain.gain.setTargetAtTime(0.14 + throttle * 0.07, t, 0.2);
    this.tyres.g.gain.setTargetAtTime(Math.min(0.06, Math.abs(speed) * 0.0045), t, 0.2);
  }

  burst(type, freq, q, gain, dur) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t, Math.random() * 2, dur + 0.05);
  }

  thump(freq, gain, dur) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.5, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  wiper() { this.burst('lowpass', 260, 0.7, 0.1, 0.12); }
  doorOpen() { this.burst('bandpass', 1400, 2, 0.16, 0.09); this.burst('highpass', 3000, 0.5, 0.05, 0.6); }
  doorClose() { this.thump(72, 0.5, 0.22); this.burst('lowpass', 500, 0.7, 0.3, 0.14); }
  kerb() { this.thump(55, 0.25, 0.15); }
}
