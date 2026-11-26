export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted = false;
  private musicEnabled = true;
  private radioEnabled = true;

  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private engineSubGain: GainNode | null = null;

  private crowdSource: AudioBufferSourceNode | null = null;
  private crowdGain: GainNode | null = null;
  private citySource: AudioBufferSourceNode | null = null;
  private cityGain: GainNode | null = null;
  private rainSource: AudioBufferSourceNode | null = null;
  private rainGain: GainNode | null = null;

  private isRaining = false;
  private engineRunning = false;

  private musicTimer: number | null = null;
  private musicStep = 0;
  private hornVariant = 0;
  private isPlayingPhase = false;
  private radioDuckUntil = 0;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getOutNode(): AudioNode | null {
    return this.masterGain ?? this.ctx?.destination ?? null;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.stopRadioSpeech();
    }
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, now, 0.025);
    }
    if (muted && this.ctx) {
      this.engineGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
      this.engineSubGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
      this.crowdGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
      this.cityGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
      this.rainGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
      this.stopMusicLoop();
    } else if (!muted && this.isPlayingPhase && this.musicEnabled) {
      this.startMusicLoop();
    }
  }

  public setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (!enabled || this.muted) {
      this.stopMusicLoop();
    } else if (this.isPlayingPhase) {
      this.startMusicLoop();
    }
  }

  public setRadioEnabled(enabled: boolean): void {
    this.radioEnabled = enabled;
    if (!enabled || this.muted) {
      this.stopRadioSpeech();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public isMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  public isRadioEnabled(): boolean {
    return this.radioEnabled;
  }

  public startEngine(): void {
    this.isPlayingPhase = true;
    const ctx = this.ensureContext();
    const out = this.getOutNode();
    if (!ctx || !out) return;

    if (!this.engineRunning) {
      // Primary 2-stroke CNG put-put + harmonic sub rumble
      const osc = ctx.createOscillator();
      const subOsc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      const subGain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.value = 48;
      subOsc.type = 'triangle';
      subOsc.frequency.value = 24;

      filter.type = 'lowpass';
      filter.frequency.value = 240;
      filter.Q.value = 1.6;

      gain.gain.value = 0;
      subGain.gain.value = 0;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(out);

      subOsc.connect(subGain);
      subGain.connect(out);

      osc.start();
      subOsc.start();

      this.engineOsc = osc;
      this.engineSubOsc = subOsc;
      this.engineFilter = filter;
      this.engineGain = gain;
      this.engineSubGain = subGain;

      // Shared procedural noise buffer for Crowd Murmur + Distant City Ambience
      const bufSize = ctx.sampleRate * 2;
      const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.04 * white) / 1.04;
        data[i] = lastOut * 2.2;
      }

      // Crowd Murmur (ভিড়ের কোলাহল)
      const crowdSrc = ctx.createBufferSource();
      crowdSrc.buffer = noiseBuf;
      crowdSrc.loop = true;

      const crowdBand = ctx.createBiquadFilter();
      crowdBand.type = 'bandpass';
      crowdBand.frequency.value = 640;
      crowdBand.Q.value = 0.85;

      const crowdGain = ctx.createGain();
      crowdGain.gain.value = 0;

      crowdSrc.connect(crowdBand);
      crowdBand.connect(crowdGain);
      crowdGain.connect(out);
      crowdSrc.start();

      this.crowdSource = crowdSrc;
      this.crowdGain = crowdGain;

      // Distant City Ambience (দূরের শহরের গমগমে শব্দ)
      const citySrc = ctx.createBufferSource();
      citySrc.buffer = noiseBuf;
      citySrc.loop = true;
      citySrc.playbackRate.value = 0.72;

      const cityBand = ctx.createBiquadFilter();
      cityBand.type = 'lowpass';
      cityBand.frequency.value = 210;

      const cityGain = ctx.createGain();
      cityGain.gain.value = 0;

      citySrc.connect(cityBand);
      cityBand.connect(cityGain);
      cityGain.connect(out);
      citySrc.start();

      this.citySource = citySrc;
      this.cityGain = cityGain;

      // Procedural Rain Loop (বৃষ্টির শব্দ)
      const rainBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const rainData = rainBuf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        rainData[i] = (Math.random() * 2 - 1) * 0.65;
      }
      const rainSrc = ctx.createBufferSource();
      rainSrc.buffer = rainBuf;
      rainSrc.loop = true;

      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = 'bandpass';
      rainFilter.frequency.value = 1750;
      rainFilter.Q.value = 0.5;

      const rainGain = ctx.createGain();
      rainGain.gain.value = 0;

      rainSrc.connect(rainFilter);
      rainFilter.connect(rainGain);
      rainGain.connect(out);
      rainSrc.start();

      this.rainSource = rainSrc;
      this.rainGain = rainGain;
      this.engineRunning = true;
    }

    if (this.musicEnabled && !this.muted) {
      this.startMusicLoop();
    }
  }

  public setWeatherRain(raining: boolean): void {
    this.isRaining = raining;
    if (!this.ctx || !this.rainGain) return;
    const target = raining && this.isPlayingPhase && !this.muted ? 0.055 : 0;
    this.rainGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.35);
  }

  public updateEngine(
    speedRatio: number,
    boosting: boolean,
    active: boolean,
    chasedCount = 0
  ): void {
    if (!this.ctx || !this.engineOsc || !this.engineGain) return;
    const now = this.ctx.currentTime;
    if (!active || this.muted) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.08);
      this.engineSubGain?.gain.setTargetAtTime(0, now, 0.08);
      this.crowdGain?.gain.setTargetAtTime(0, now, 0.08);
      this.cityGain?.gain.setTargetAtTime(0, now, 0.08);
      this.rainGain?.gain.setTargetAtTime(0, now, 0.12);
      return;
    }

    const clamped = Math.max(0, Math.min(1.25, speedRatio));
    const baseFreq = 44 + clamped * 68 + (boosting ? 30 : 0);
    this.engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.055);
    this.engineSubOsc?.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.055);

    const cutoff = 210 + clamped * 560 + (boosting ? 360 : 0);
    this.engineFilter?.frequency.setTargetAtTime(cutoff, now, 0.06);

    const vol = 0.026 + clamped * 0.026 + (boosting ? 0.015 : 0);
    this.engineGain.gain.setTargetAtTime(vol, now, 0.07);
    this.engineSubGain?.gain.setTargetAtTime(vol * 0.65, now, 0.07);

    // Crowd murmur rises slightly when slowed in traffic or chased by angry pedestrians
    const chaseBoost = Math.min(0.035, chasedCount * 0.012);
    const crowdVol = 0.026 + (1 - Math.min(1, clamped) * 0.45) * 0.016 + chaseBoost;
    this.crowdGain?.gain.setTargetAtTime(crowdVol, now, 0.14);

    // Subtle distant city hum
    const cityVol = 0.028 + Math.min(1, clamped) * 0.01;
    this.cityGain?.gain.setTargetAtTime(cityVol, now, 0.18);

    const rainVol = this.isRaining ? 0.055 : 0;
    this.rainGain?.gain.setTargetAtTime(rainVol, now, 0.22);
  }

  public stopEngine(): void {
    this.isPlayingPhase = false;
    this.stopRadioSpeech();
    if (this.ctx) {
      const now = this.ctx.currentTime;
      this.engineGain?.gain.setTargetAtTime(0, now, 0.05);
      this.engineSubGain?.gain.setTargetAtTime(0, now, 0.05);
      this.crowdGain?.gain.setTargetAtTime(0, now, 0.05);
      this.cityGain?.gain.setTargetAtTime(0, now, 0.05);
      this.rainGain?.gain.setTargetAtTime(0, now, 0.05);
    }
    this.stopMusicLoop();
  }

  private startMusicLoop(): void {
    if (this.musicTimer !== null || this.muted || !this.musicEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    // Neutral, upbeat Bengali folk-inspired pentatonic instrumental groove (azan-free)
    const melody = [523.25, 659.25, 587.33, 783.99, 659.25, 523.25, 587.33, 440.0];
    const harmony = [659.25, 783.99, 739.99, 987.77, 783.99, 659.25, 739.99, 587.33];
    const bass = [130.81, 130.81, 146.83, 196.0, 164.81, 130.81, 146.83, 110.0];

    this.musicTimer = window.setInterval(() => {
      const out = this.getOutNode();
      if (this.muted || !this.musicEnabled || !this.ctx || !out || !this.isPlayingPhase) return;
      const now = this.ctx.currentTime;
      const idx = this.musicStep % melody.length;
      const duck = performance.now() < this.radioDuckUntil ? 0.35 : 1;

      // Pluck lead
      const leadOsc = this.ctx.createOscillator();
      const leadGain = this.ctx.createGain();
      leadOsc.type = 'triangle';
      leadOsc.frequency.setValueAtTime(melody[idx], now);
      leadGain.gain.setValueAtTime(0.001, now);
      leadGain.gain.exponentialRampToValueAtTime(0.034 * duck, now + 0.02);
      leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      leadOsc.connect(leadGain);
      leadGain.connect(out);
      leadOsc.start(now);
      leadOsc.stop(now + 0.23);

      // Gentle harmony shimmer on off-beats
      if (this.musicStep % 4 === 2) {
        const harmOsc = this.ctx.createOscillator();
        const harmGain = this.ctx.createGain();
        harmOsc.type = 'sine';
        harmOsc.frequency.setValueAtTime(harmony[idx], now);
        harmGain.gain.setValueAtTime(0.001, now);
        harmGain.gain.exponentialRampToValueAtTime(0.014 * duck, now + 0.02);
        harmGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        harmOsc.connect(harmGain);
        harmGain.connect(out);
        harmOsc.start(now);
        harmOsc.stop(now + 0.22);
      }

      // Soft dholak bass pulse on even steps
      if (this.musicStep % 2 === 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(bass[idx], now);
        bassOsc.frequency.exponentialRampToValueAtTime(bass[idx] * 0.65, now + 0.14);
        bassGain.gain.setValueAtTime(0.048 * duck, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        bassOsc.connect(bassGain);
        bassGain.connect(out);
        bassOsc.start(now);
        bassOsc.stop(now + 0.2);
      }

      this.musicStep += 1;
    }, 260);
  }

  private stopMusicLoop(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  public playHorn(): void {
    const ctx = this.ensureContext();
    const out = this.getOutNode();
    if (!ctx || !out) return;
    const now = ctx.currentTime;

    const variant = this.hornVariant;
    this.hornVariant = (this.hornVariant + 1) % 4;
    const jitter = 0.97 + Math.random() * 0.06;

    const triggerBlast = (offset: number, dur: number, f1: number, f2: number, vol = 0.14) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(f1 * jitter, now + offset);
      osc2.frequency.setValueAtTime(f2 * jitter, now + offset);

      filter.type = 'bandpass';
      filter.frequency.value = 980;
      filter.Q.value = 1.35;

      gain.gain.setValueAtTime(0.001, now + offset);
      gain.gain.exponentialRampToValueAtTime(vol, now + offset + 0.018);
      gain.gain.setValueAtTime(vol * 0.9, now + offset + Math.max(0.025, dur - 0.04));
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + dur);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(out);

      osc1.start(now + offset);
      osc2.start(now + offset);
      osc1.stop(now + offset + dur + 0.015);
      osc2.stop(now + offset + dur + 0.015);
    };

    if (variant === 0) {
      // Classic double-honk ("পিঁপ-পিঁপ!")
      triggerBlast(0, 0.11, 430, 540, 0.15);
      triggerBlast(0.14, 0.15, 510, 640, 0.16);
    } else if (variant === 1) {
      // Urgent triple-tap ("পিঁপ-পিঁপ-পিঁপ!")
      triggerBlast(0, 0.075, 470, 590, 0.13);
      triggerBlast(0.1, 0.075, 470, 590, 0.13);
      triggerBlast(0.2, 0.12, 540, 680, 0.15);
    } else if (variant === 2) {
      // Road-clearing rising sweep ("পিঁই-পোঁ!")
      triggerBlast(0, 0.13, 390, 495, 0.14);
      triggerBlast(0.15, 0.18, 560, 705, 0.16);
    } else {
      // Playful quick squeak-honk
      triggerBlast(0, 0.22, 495, 620, 0.15);
    }
  }

  public playTrafficHorn(kind: 'heavy' | 'light'): void {
    const ctx = this.ensureContext();
    const out = this.getOutNode();
    if (!ctx || !out) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = kind === 'heavy' ? 'sawtooth' : 'square';
    const base = (kind === 'heavy' ? 165 : 590) * (0.95 + Math.random() * 0.1);
    osc.frequency.setValueAtTime(base, now);
    if (kind === 'heavy') {
      osc.frequency.setValueAtTime(base * 1.12, now + 0.14);
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(kind === 'heavy' ? 0.07 : 0.045, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (kind === 'heavy' ? 0.36 : 0.18));

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1100;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + (kind === 'heavy' ? 0.38 : 0.2));
  }

  public playTrafficHornBurst(kind: 'heavy' | 'light', bursts = 2): void {
    const ctx = this.ensureContext();
    const out = this.getOutNode();
    if (!ctx || !out) return;
    const now = ctx.currentTime;
    const count = Math.max(1, Math.min(3, bursts));
    const base = (kind === 'heavy' ? 168 : 610) * (0.94 + Math.random() * 0.12);
    const dur = kind === 'heavy' ? 0.14 : 0.095;
    const step = kind === 'heavy' ? 0.2 : 0.145;

    for (let i = 0; i < count; i++) {
      const start = now + i * step;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = kind === 'heavy' ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(base * (i === count - 1 ? 1.07 : 1), start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(kind === 'heavy' ? 0.072 : 0.048, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      filter.type = 'lowpass';
      filter.frequency.value = 1150;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(out);
      osc.start(start);
      osc.stop(start + dur + 0.015);
    }
  }

  public playCrash(heavy = false): void {
    const ctx = this.ensureContext();
    const out = this.getOutNode();
    if (!ctx || !out) return;
    const now = ctx.currentTime;

    // 1. Sub-bass impact thud
    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thudOsc.type = 'sine';
    thudOsc.frequency.setValueAtTime(heavy ? 115 : 145, now);
    thudOsc.frequency.exponentialRampToValueAtTime(26, now + (heavy ? 0.42 : 0.2));
    thudGain.gain.setValueAtTime(heavy ? 0.42 : 0.26, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.46 : 0.22));
    thudOsc.connect(thudGain);
    thudGain.connect(out);
    thudOsc.start(now);
    thudOsc.stop(now + (heavy ? 0.48 : 0.24));

    // 2. Crunch / body slap
    const bodyOsc = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(heavy ? 130 : 210, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(34, now + (heavy ? 0.35 : 0.18));
    bodyGain.gain.setValueAtTime(heavy ? 0.22 : 0.14, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.38 : 0.2));
    bodyOsc.connect(bodyGain);
    bodyGain.connect(out);
    bodyOsc.start(now);
    bodyOsc.stop(now + (heavy ? 0.4 : 0.22));

    // 3. Metallic scrape & debris burst (filtered noise)
    const noiseDur = heavy ? 0.38 : 0.19;
    const noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * noiseDur), ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(heavy ? 680 : 950, now);
    filter.frequency.exponentialRampToValueAtTime(240, now + noiseDur);
    filter.Q.value = 0.9;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(heavy ? 0.26 : 0.16, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDur);

    noiseSrc.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(out);
    noiseSrc.start(now);
  }

  public playCoinDing(combo = 1): void {
    const ctx = this.ensureContext();
    const out = this.getOutNode();
    if (!ctx || !out) return;
    const now = ctx.currentTime;

    const pitchScale = 1 + Math.min(6, Math.max(0, combo - 1)) * 0.045;
    const notes = [987.77 * pitchScale, 1479.98 * pitchScale];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i === 0 ? 'sine' : 'triangle';
      const t = now + i * 0.05;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.11, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.19);
      osc.connect(gain);
      gain.connect(out);
      osc.start(t);
      osc.stop(t + 0.21);
    });
  }

  public playGasRefill(): void {
    const ctx = this.ensureContext();
    const out = this.getOutNode();
    if (!ctx || !out) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playBribe(): void {
    const ctx = this.ensureContext();
    const out = this.getOutNode();
    if (!ctx || !out) return;
    const now = ctx.currentTime;
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.12, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.16);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.18);
    });
  }

  public playPickup(): void {
    const ctx = this.ensureContext();
    const out = this.getOutNode();
    if (!ctx || !out) return;
    const now = ctx.currentTime;
    [523, 659].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.07);
      gain.gain.setValueAtTime(0.1, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.15);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.17);
    });
  }

  public playFare(): void {
    const ctx = this.ensureContext();
    const out = this.getOutNode();
    if (!ctx || !out) return;
    const now = ctx.currentTime;
    [587, 740, 880, 1046].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.055);
      gain.gain.setValueAtTime(0.11, now + i * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.055 + 0.16);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + 0.18);
    });
  }

  public playAreaBanner(): void {
    const ctx = this.ensureContext();
    const out = this.getOutNode();
    if (!ctx || !out) return;
    const now = ctx.currentTime;
    [440, 554, 659].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.07);
      gain.gain.setValueAtTime(0.08, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.18);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.2);
    });
  }

  public playRedLightPenalty(): void {
    const ctx = this.ensureContext();
    const out = this.getOutNode();
    if (!ctx || !out) return;
    const now = ctx.currentTime;

    [0, 0.17].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2450, now + offset);
      osc.frequency.linearRampToValueAtTime(2950, now + offset + 0.06);
      osc.frequency.linearRampToValueAtTime(2350, now + offset + 0.12);
      gain.gain.setValueAtTime(0.001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.14, now + offset + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.13);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now + offset);
      osc.stop(now + offset + 0.14);
    });

    const buzz = ctx.createOscillator();
    const buzzGain = ctx.createGain();
    buzz.type = 'sawtooth';
    buzz.frequency.setValueAtTime(165, now);
    buzz.frequency.setValueAtTime(135, now + 0.18);
    buzzGain.gain.setValueAtTime(0.09, now);
    buzzGain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    buzz.connect(buzzGain);
    buzzGain.connect(out);
    buzz.start(now);
    buzz.stop(now + 0.38);
  }

  public playGreenLightGo(): void {
    const ctx = this.ensureContext();
    const out = this.getOutNode();
    if (!ctx || !out) return;
    const now = ctx.currentTime;
    [523.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.09, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.18);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.2);
    });
  }

  public stopRadioSpeech(): void {
    this.radioDuckUntil = 0;
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // Ignore speech cleanup errors
    }
  }

  public playRadioBroadcast(text: string, kind: 'সংবাদ' | 'ট্রাফিক' | 'গতি'): void {
    if (this.muted || !this.radioEnabled) return;
    this.radioDuckUntil = performance.now() + 4500;

    const ctx = this.ensureContext();
    const out = this.getOutNode();
    if (ctx && out) {
      const now = ctx.currentTime;

      const staticDur = 0.11;
      const staticBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * staticDur), ctx.sampleRate);
      const staticData = staticBuf.getChannelData(0);
      for (let i = 0; i < staticData.length; i++) {
        staticData[i] = (Math.random() * 2 - 1) * 0.45;
      }
      const staticSrc = ctx.createBufferSource();
      staticSrc.buffer = staticBuf;

      const staticFilter = ctx.createBiquadFilter();
      staticFilter.type = 'bandpass';
      staticFilter.frequency.setValueAtTime(2100, now);
      staticFilter.Q.value = 1.6;

      const staticGain = ctx.createGain();
      staticGain.gain.setValueAtTime(0.055, now);
      staticGain.gain.exponentialRampToValueAtTime(0.001, now + staticDur);

      staticSrc.connect(staticFilter);
      staticFilter.connect(staticGain);
      staticGain.connect(out);
      staticSrc.start(now);

      const notes =
        kind === 'সংবাদ'
          ? [659.25, 783.99, 987.77]
          : kind === 'গতি'
            ? [783.99, 1046.5, 1174.66]
            : [523.25, 659.25, 587.33];

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const t = now + 0.08 + i * 0.085;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.exponentialRampToValueAtTime(0.08, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.19);
        osc.connect(gain);
        gain.connect(out);
        osc.start(t);
        osc.stop(t + 0.21);
      });
    }

    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const synth = window.speechSynthesis;
        synth.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        const voices = synth.getVoices();
        const bnVoice = voices.find((v) => v.lang.toLowerCase().startsWith('bn'));
        if (bnVoice) {
          utter.voice = bnVoice;
          utter.lang = bnVoice.lang;
        } else {
          utter.lang = 'bn-BD';
        }
        utter.rate = 1.05;
        utter.pitch = kind === 'গতি' ? 1.08 : 1.0;
        utter.volume = 0.85;
        utter.onend = () => {
          this.radioDuckUntil = 0;
        };
        utter.onerror = () => {
          this.radioDuckUntil = 0;
        };
        synth.speak(utter);
      }
    } catch {
      // Fall back silently to Web Audio jingle + on-screen radio caption
    }
  }

  public dispose(): void {
    this.stopMusicLoop();
    this.stopRadioSpeech();
    try {
      this.engineOsc?.stop();
      this.engineSubOsc?.stop();
      this.crowdSource?.stop();
      this.citySource?.stop();
      this.rainSource?.stop();
      this.ctx?.close();
    } catch {
      // Ignore cleanup errors
    }
    this.engineOsc = null;
    this.engineSubOsc = null;
    this.engineFilter = null;
    this.engineGain = null;
    this.engineSubGain = null;
    this.crowdSource = null;
    this.crowdGain = null;
    this.citySource = null;
    this.cityGain = null;
    this.rainSource = null;
    this.rainGain = null;
    this.masterGain = null;
    this.ctx = null;
    this.engineRunning = false;
  }
}
