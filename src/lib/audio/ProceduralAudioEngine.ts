"use client";

/**
 * Lightweight procedural Web Audio synthesizer for opt-in tactical sound feedback.
 * Zero external MP3 assets; initializes lazily on explicit user opt-in.
 */
class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private droneOscA: OscillatorNode | null = null;
  private droneOscB: OscillatorNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private enabled = false;

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(next: boolean): boolean {
    if (typeof window === "undefined") return false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.disable();
      return false;
    }

    if (next) {
      this.enable();
      this.playReconcileChime();
    } else {
      this.disable();
    }
    return this.enabled;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.0;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private enable(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    if (!this.droneOscA) {
      this.droneFilter = ctx.createBiquadFilter();
      this.droneFilter.type = "lowpass";
      this.droneFilter.frequency.value = 240;
      this.droneFilter.Q.value = 1.6;
      this.droneFilter.connect(this.masterGain);

      this.droneOscA = ctx.createOscillator();
      this.droneOscA.type = "sine";
      this.droneOscA.frequency.value = 65.41; // C2 deep sub-cobalt hum

      this.droneOscB = ctx.createOscillator();
      this.droneOscB.type = "triangle";
      this.droneOscB.frequency.value = 98.0; // G2 fifth interval

      const oscBGain = ctx.createGain();
      oscBGain.gain.value = 0.28;

      this.droneOscA.connect(this.droneFilter);
      this.droneOscB.connect(oscBGain);
      oscBGain.connect(this.droneFilter);

      this.droneOscA.start();
      this.droneOscB.start();
    }

    this.enabled = true;
    this.masterGain.gain.cancelScheduledValues(ctx.currentTime);
    this.masterGain.gain.setTargetAtTime(0.08, ctx.currentTime, 0.25);
  }

  private disable(): void {
    this.enabled = false;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.12);
    }
  }

  public modulateByScroll(velocity: number, progress: number): void {
    if (!this.enabled || !this.ctx || !this.droneFilter) return;
    const clampedVel = Math.min(1, Math.abs(velocity) * 0.45);
    const targetFreq = 190 + progress * 160 + clampedVel * 280;
    this.droneFilter.frequency.setTargetAtTime(
      targetFreq,
      this.ctx.currentTime,
      0.08
    );
  }

  public playChapterTick(chapter: number): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const freqs = [523.25, 587.33, 659.25, 783.99, 880.0];
    osc.type = "sine";
    osc.frequency.setValueAtTime(freqs[(chapter - 1) % freqs.length], now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playReconcileChime(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = now + idx * 0.045;
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.045, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.38);
    });
  }

  public dispose(): void {
    this.disable();
    try {
      this.droneOscA?.stop();
      this.droneOscB?.stop();
      void this.ctx?.close();
    } catch {
      // Ignore already-closed audio context errors on unmount
    }
    this.ctx = null;
    this.masterGain = null;
    this.droneOscA = null;
    this.droneOscB = null;
    this.droneFilter = null;
  }
}

export const audioEngine = new ProceduralAudioEngine();
