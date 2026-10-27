type Wave = OscillatorType;
export type MusicTheme = "village" | "forest" | "dungeon" | "marsh" | "frost" | "throne" | "boss";

interface MusicDef {
  root: number;
  scale: number[];
  stepMs: number;
  lead: Wave;
  bass: Wave;
  pad: Wave;
  percussion: boolean;
}

const MUSIC_THEMES: Record<MusicTheme, MusicDef> = {
  village: { root: 220, scale: [0, 2, 4, 7, 9, 12], stepMs: 340, lead: "triangle", bass: "sine", pad: "sine", percussion: false },
  forest: { root: 196, scale: [0, 3, 5, 7, 10, 12], stepMs: 320, lead: "triangle", bass: "sine", pad: "triangle", percussion: false },
  dungeon: { root: 110, scale: [0, 3, 5, 6, 7, 10], stepMs: 390, lead: "sawtooth", bass: "sine", pad: "sawtooth", percussion: true },
  marsh: { root: 147, scale: [0, 1, 5, 6, 8, 12], stepMs: 370, lead: "triangle", bass: "sine", pad: "triangle", percussion: false },
  frost: { root: 262, scale: [0, 2, 3, 7, 8, 12], stepMs: 300, lead: "sine", bass: "triangle", pad: "sine", percussion: false },
  throne: { root: 123, scale: [0, 1, 3, 6, 7, 10], stepMs: 360, lead: "sawtooth", bass: "sine", pad: "sawtooth", percussion: true },
  boss: { root: 98, scale: [0, 1, 3, 5, 7, 8, 11], stepMs: 220, lead: "sawtooth", bass: "square", pad: "sawtooth", percussion: true },
};

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicOutput: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private currentTheme: MusicTheme | null = null;
  private musicStep = 0;
  private musicVolume = 0.3;
  private volume = 0.35;
  private muted = false;

  constructor() {
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem("realm.volume") : null;
    if (stored !== null) this.volume = Math.max(0, Math.min(1, Number(stored) || 0));
    const music = typeof localStorage !== "undefined" ? localStorage.getItem("realm.musicVolume") : null;
    if (music !== null) this.musicVolume = Math.max(0, Math.min(1, Number(music) || 0));
    const muted = typeof localStorage !== "undefined" ? localStorage.getItem("realm.muted") : null;
    this.muted = muted === "1";
  }

  get isMuted(): boolean {
    return this.muted;
  }

  get currentVolume(): number {
    return this.volume;
  }

  get currentMusicVolume(): number {
    return this.musicVolume;
  }

  get musicTheme(): MusicTheme | null {
    return this.currentTheme;
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    localStorage.setItem("realm.musicVolume", String(this.musicVolume));
    if (this.musicOutput && this.ctx) {
      this.musicOutput.gain.cancelScheduledValues(this.ctx.currentTime);
      this.musicOutput.gain.setTargetAtTime(this.musicVolume * 0.55, this.ctx.currentTime, 0.08);
    }
  }

  playMusic(theme: MusicTheme): void {
    if (this.currentTheme === theme) return;
    const ctx = this.ensure();
    if (ctx.state === "suspended") return;
    this.currentTheme = theme;
    this.musicStep = 0;
    if (this.musicTimer) clearInterval(this.musicTimer);
    const old = this.musicBus;
    if (old) {
      old.gain.cancelScheduledValues(ctx.currentTime);
      old.gain.setTargetAtTime(0, ctx.currentTime, 0.35);
      setTimeout(() => old.disconnect(), 1200);
    }
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0, ctx.currentTime);
    bus.gain.setTargetAtTime(0.75, ctx.currentTime, 0.5);
    bus.connect(this.musicOutput!);
    this.musicBus = bus;
    const def = MUSIC_THEMES[theme];
    this.scheduleMusicStep(theme, def, bus);
    this.musicTimer = setInterval(() => this.scheduleMusicStep(theme, def, bus), def.stepMs);
  }

  stopMusic(): void {
    this.currentTheme = null;
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
    if (this.musicBus && this.ctx) {
      const old = this.musicBus;
      old.gain.cancelScheduledValues(this.ctx.currentTime);
      old.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
      setTimeout(() => old.disconnect(), 900);
      this.musicBus = null;
    }
  }

  private scheduleMusicStep(theme: MusicTheme, def: MusicDef, bus: GainNode): void {
    if (this.currentTheme !== theme || this.musicBus !== bus) return;
    const step = this.musicStep++;
    const beat = def.stepMs / 1000;
    const note = (semi: number) => def.root * 2 ** (semi / 12);
    const bassSemis = [0, 0, 5, 3, 0, 0, 7, 3];
    this.musicTone(note(bassSemis[step % bassSemis.length]) / 2, beat * 1.7, def.bass, 0.16, bus);
    if (step % 2 === 0) {
      const arp = def.scale[(step * 3) % def.scale.length];
      this.musicTone(note(arp) * 2, beat * 0.9, def.lead, 0.07, bus);
    }
    if (step % 8 === 0) {
      const chord = [0, def.scale[2] ?? 4, def.scale[4] ?? 7];
      for (const semi of chord) this.musicTone(note(semi), beat * 6, def.pad, 0.035, bus);
    }
    if (def.percussion && step % 4 === 2) this.musicNoise(0.06, 0.05, bus);
    if (def.percussion && step % 8 === 0) this.musicNoise(0.12, 0.08, bus);
  }

  private musicTone(freq: number, duration: number, type: Wave, gain: number, bus: GainNode): void {
    const ctx = this.ensure();
    const start = ctx.currentTime + 0.01;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(gain, start + 0.03);
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(env);
    env.connect(bus);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  private musicNoise(duration: number, gain: number, bus: GainNode): void {
    const ctx = this.ensure();
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const env = ctx.createGain();
    env.gain.value = gain;
    source.connect(env);
    env.connect(bus);
    source.start(ctx.currentTime + 0.01);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    localStorage.setItem("realm.muted", muted ? "1" : "0");
    if (this.master) this.master.gain.value = muted ? 0 : this.volume * 0.35;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem("realm.volume", String(this.volume));
    if (this.master && !this.muted) this.master.gain.value = this.volume * 0.35;
  }

  resume(): void {
    const ctx = this.ensure();
    if (ctx.state === "suspended") void ctx.resume();
  }

  private ensure(): AudioContext {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume * 0.35;
      this.master.connect(this.ctx.destination);
      this.musicOutput = this.ctx.createGain();
      this.musicOutput.gain.value = this.musicVolume * 0.55;
      this.musicOutput.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  private tone(freq: number, duration: number, type: Wave = "square", gain = 0.3, slide = 0, delay = 0): void {
    if (this.muted) return;
    const ctx = this.ensure();
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slide !== 0) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), start + duration);
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(gain, start + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(env);
    env.connect(this.master!);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  private noise(duration: number, gain = 0.2, delay = 0): void {
    if (this.muted) return;
    const ctx = this.ensure();
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const env = ctx.createGain();
    env.gain.value = gain;
    source.connect(env);
    env.connect(this.master!);
    source.start(ctx.currentTime + delay);
  }

  hit(): void {
    this.tone(160, 0.08, "square", 0.18, -70);
    this.noise(0.06, 0.12);
  }

  crit(): void {
    this.tone(220, 0.12, "square", 0.22, 120);
    this.noise(0.09, 0.16);
  }

  hatchling(): void {
    this.tone(480, 0.07, "triangle", 0.06, 200);
    this.tone(640, 0.06, "sine", 0.05, 140, 0.04);
  }

  cast(kind = "physical"): void {
    const base = kind === "fire" ? 320 : kind === "ice" ? 520 : kind === "shadow" ? 190 : 380;
    this.tone(base, 0.16, "triangle", 0.2, 180);
    this.tone(base * 1.5, 0.12, "sine", 0.12, 120, 0.03);
  }

  pickup(): void {
    this.tone(520, 0.06, "square", 0.14);
    this.tone(760, 0.08, "square", 0.12, 0, 0.05);
  }

  coin(): void {
    this.tone(880, 0.05, "square", 0.12);
    this.tone(1180, 0.07, "square", 0.1, 0, 0.045);
  }

  heal(): void {
    this.tone(440, 0.18, "sine", 0.16, 260);
    this.tone(660, 0.22, "sine", 0.12, 220, 0.08);
  }

  level(): void {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, "triangle", 0.2, 0, i * 0.09));
  }

  death(): void {
    this.tone(220, 0.5, "sawtooth", 0.2, -160);
    this.noise(0.4, 0.12);
  }

  quest(): void {
    [659, 784, 988].forEach((f, i) => this.tone(f, 0.14, "square", 0.14, 0, i * 0.08));
  }

  ui(): void {
    this.tone(600, 0.03, "square", 0.06);
  }

  portal(): void {
    this.tone(300, 0.35, "sine", 0.18, 360);
    this.tone(900, 0.25, "sine", 0.08, -300, 0.08);
  }
}
