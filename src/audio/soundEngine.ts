export class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private musicEnabled = true;
  private radioEnabled = true;

  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private crowdSource: AudioBufferSourceNode | null = null;
  private crowdGain: GainNode | null = null;
  private rainSource: AudioBufferSourceNode | null = null;
  private rainGain: GainNode | null = null;
  private isRaining = false;
  private engineRunning = false;

  private musicTimer: number | null = null;
  private musicStep = 0;
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
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.stopRadioSpeech();
    }
    if (muted && this.ctx) {
      this.engineGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      this.crowdGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      this.rainGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
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
    if (!ctx) return;

    if (!this.engineRunning) {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.value = 52;
      filter.type = 'lowpass';
      filter.frequency.value = 260;
      gain.gain.value = 0;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      this.engineOsc = osc;
      this.engineGain = gain;

      // Procedural Crowd Ambience (ভিড়ের কোলাহল) using looping filtered brown/pink noise
      const bufSize = ctx.sampleRate * 2;
      const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.04 * white) / 1.04;
        data[i] = lastOut * 2.2;
      }

      const crowdSrc = ctx.createBufferSource();
      crowdSrc.buffer = noiseBuf;
      crowdSrc.loop = true;

      const crowdBand = ctx.createBiquadFilter();
      crowdBand.type = 'bandpass';
      crowdBand.frequency.value = 620;
      crowdBand.Q.value = 0.85;

      const crowdGain = ctx.createGain();
      crowdGain.gain.value = 0;

      crowdSrc.connect(crowdBand);
      crowdBand.connect(crowdGain);
      crowdGain.connect(ctx.destination);
      crowdSrc.start();

      this.crowdSource = crowdSrc;
      this.crowdGain = crowdGain;

      // Procedural Rain Patter (বৃষ্টির শব্দ) using high-passed noise
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
      rainFilter.frequency.value = 1850;
      rainFilter.Q.value = 0.55;

      const rainGain = ctx.createGain();
      rainGain.gain.value = 0;

      rainSrc.connect(rainFilter);
      rainFilter.connect(rainGain);
      rainGain.connect(ctx.destination);
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
    const target = raining && this.isPlayingPhase && !this.muted ? 0.045 : 0;
    this.rainGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.4);
  }

  public updateEngine(speedRatio: number, boosting: boolean, active: boolean): void {
    if (!this.ctx || !this.engineOsc || !this.engineGain) return;
    const now = this.ctx.currentTime;
    if (!active || this.muted) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.08);
      this.crowdGain?.gain.setTargetAtTime(0, now, 0.08);
      this.rainGain?.gain.setTargetAtTime(0, now, 0.12);
      return;
    }
    const baseFreq = 46 + speedRatio * 58 + (boosting ? 28 : 0);
    this.engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.06);
    const vol = 0.03 + speedRatio * 0.025 + (boosting ? 0.014 : 0);
    this.engineGain.gain.setTargetAtTime(vol, now, 0.08);

    // Subtle crowd murmur swells slightly when driving slowly in traffic/market
    const crowdVol = 0.028 + (1 - speedRatio * 0.4) * 0.015;
    this.crowdGain?.gain.setTargetAtTime(crowdVol, now, 0.15);

    const rainVol = this.isRaining ? 0.045 : 0;
    this.rainGain?.gain.setTargetAtTime(rainVol, now, 0.25);
  }

  public stopEngine(): void {
    this.isPlayingPhase = false;
    this.stopRadioSpeech();
    if (this.ctx) {
      this.engineGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      this.crowdGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      this.rainGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
    this.stopMusicLoop();
  }

  private startMusicLoop(): void {
    if (this.musicTimer !== null || this.muted || !this.musicEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    // Upbeat Bengali folk-inspired pentatonic melody (C-D-E-G-A)
    const melody = [523.25, 659.25, 587.33, 783.99, 659.25, 523.25, 587.33, 440.0];
    const bass = [130.81, 130.81, 146.83, 196.0, 164.81, 130.81, 146.83, 110.0];

    this.musicTimer = window.setInterval(() => {
      if (this.muted || !this.musicEnabled || !this.ctx || !this.isPlayingPhase) return;
      const now = this.ctx.currentTime;
      const idx = this.musicStep % melody.length;

      const duck = performance.now() < this.radioDuckUntil ? 0.35 : 1;

      // Pluck lead
      const leadOsc = this.ctx.createOscillator();
      const leadGain = this.ctx.createGain();
      leadOsc.type = 'triangle';
      leadOsc.frequency.setValueAtTime(melody[idx], now);
      leadGain.gain.setValueAtTime(0.001, now);
      leadGain.gain.exponentialRampToValueAtTime(0.036 * duck, now + 0.02);
      leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      leadOsc.connect(leadGain);
      leadGain.connect(this.ctx.destination);
      leadOsc.start(now);
      leadOsc.stop(now + 0.23);

      // Soft dholak bass pulse on even steps
      if (this.musicStep % 2 === 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(bass[idx], now);
        bassOsc.frequency.exponentialRampToValueAtTime(bass[idx] * 0.65, now + 0.14);
        bassGain.gain.setValueAtTime(0.05 * duck, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        bassOsc.connect(bassGain);
        bassGain.connect(this.ctx.destination);
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
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(420, now);
    osc1.frequency.setValueAtTime(530, now + 0.11);
    osc2.frequency.setValueAtTime(525, now);
    osc2.frequency.setValueAtTime(660, now + 0.11);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
    gain.gain.setValueAtTime(0.15, now + 0.24);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 950;
    filter.Q.value = 1.4;

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  }

  public playTrafficHorn(kind: 'heavy' | 'light'): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = kind === 'heavy' ? 'sawtooth' : 'square';
    const base = kind === 'heavy' ? 165 : 590;
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
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (kind === 'heavy' ? 0.38 : 0.2));
  }

  public playCrash(heavy = false): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(heavy ? 120 : 190, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + (heavy ? 0.45 : 0.22));

    gain.gain.setValueAtTime(heavy ? 0.28 : 0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.48 : 0.24));

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (heavy ? 0.5 : 0.26));
  }

  public playGasRefill(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playBribe(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.12, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.18);
    });
  }

  public playPickup(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523, 659].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.07);
      gain.gain.setValueAtTime(0.1, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.17);
    });
  }

  public playFare(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [587, 740, 880, 1046].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.055);
      gain.gain.setValueAtTime(0.11, now + i * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.055 + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + 0.18);
    });
  }

  public playAreaBanner(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [440, 554, 659].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.07);
      gain.gain.setValueAtTime(0.08, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.2);
    });
  }

  public playRedLightPenalty(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Sharp double traffic-police whistle chirp + low buzzer
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
      gain.connect(ctx.destination);
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
    buzzGain.connect(ctx.destination);
    buzz.start(now);
    buzz.stop(now + 0.38);
  }

  public playGreenLightGo(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.09, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
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
    if (ctx) {
      const now = ctx.currentTime;

      // Brief FM radio static squelch when tuning into 99.8 FM
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
      staticGain.connect(ctx.destination);
      staticSrc.start(now);

      // Station chime (news bulletin vs speed alert vs traffic comedy)
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
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.21);
      });
    }

    // Optional Bengali Web Speech voiceover when supported by the browser
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
      this.crowdSource?.stop();
      this.rainSource?.stop();
      this.ctx?.close();
    } catch {
      // Ignore cleanup errors
    }
    this.engineOsc = null;
    this.engineGain = null;
    this.crowdSource = null;
    this.crowdGain = null;
    this.rainSource = null;
    this.rainGain = null;
    this.ctx = null;
    this.engineRunning = false;
  }
}
