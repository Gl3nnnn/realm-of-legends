type Wave = OscillatorType;

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private volume = 0.35;
  private muted = false;

  constructor() {
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem("realm.volume") : null;
    if (stored !== null) this.volume = Math.max(0, Math.min(1, Number(stored) || 0));
    const muted = typeof localStorage !== "undefined" ? localStorage.getItem("realm.muted") : null;
    this.muted = muted === "1";
  }

  get isMuted(): boolean {
    return this.muted;
  }

  get currentVolume(): number {
    return this.volume;
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
