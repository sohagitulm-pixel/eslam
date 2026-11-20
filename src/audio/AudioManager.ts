// Centralized Birthday Audio System
// Zero-404 Web Audio procedural synth tracks + HTMLAudioElement support for uploaded audio.
// Never autoplays before explicit user interaction; guarantees single active music track.

export type SoundEffectType =
  | 'candle-blow'
  | 'fireworks'
  | 'gift-open'
  | 'scratch'
  | 'wheel-tick'
  | 'win'
  | 'puzzle-solve';

export interface SynthTrack {
  id: string;
  titleEn: string;
  titleAr: string;
  bpm: number;
  notes: number[]; // MIDI frequencies in Hz
}

export const PRESET_SYNTH_TRACKS: SynthTrack[] = [
  {
    id: 'happy-birthday-piano',
    titleEn: 'Happy Birthday Piano',
    titleAr: 'بيانو عيد الميلاد',
    bpm: 108,
    // Gentle Happy Birthday waltz melody in C major
    notes: [
      261.63, 261.63, 293.66, 261.63, 349.23, 329.63,
      261.63, 261.63, 293.66, 261.63, 392.00, 349.23,
      261.63, 261.63, 523.25, 440.00, 349.23, 329.63, 293.66,
      466.16, 466.16, 440.00, 349.23, 392.00, 349.23,
    ],
  },
  {
    id: 'starlight-musicbox',
    titleEn: 'Starlight Music Box',
    titleAr: 'صندوق الموسيقى النجمي',
    bpm: 96,
    notes: [523.25, 659.25, 783.99, 659.25, 587.33, 659.25, 523.25, 392.00, 440.00, 523.25, 659.25, 587.33],
  },
  {
    id: 'festive-waltz',
    titleEn: 'Festive Birthday Waltz',
    titleAr: 'فالس الاحتفال',
    bpm: 118,
    notes: [392.00, 493.88, 587.33, 493.88, 392.00, 440.00, 523.25, 659.25, 587.33, 493.88, 440.00, 392.00],
  },
  {
    id: 'morning-sunbeams',
    titleEn: 'Morning Sunbeams',
    titleAr: 'ألحان الصباح',
    bpm: 100,
    notes: [329.63, 392.00, 440.00, 523.25, 440.00, 392.00, 329.63, 293.66, 329.63, 392.00],
  },
  {
    id: 'coastal-twilight',
    titleEn: 'Coastal Twilight',
    titleAr: 'نسيم الغروب',
    bpm: 88,
    notes: [293.66, 349.23, 440.00, 523.25, 493.88, 440.00, 349.23, 329.63],
  },
];

export interface AudioStateSnapshot {
  isPlaying: boolean;
  currentTrackId: string | null;
  currentTrackTitle: string;
  volume: number;
  muted: boolean;
  progress: number; // 0 to 1
}

type AudioListener = (state: AudioStateSnapshot) => void;

class BirthdayAudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private htmlAudio: HTMLAudioElement | null = null;
  private synthTimer: number | null = null;
  private synthIndex = 0;
  private activeTrack: SynthTrack | null = null;
  private listeners = new Set<AudioListener>();

  private state: AudioStateSnapshot = {
    isPlaying: false,
    currentTrackId: null,
    currentTrackTitle: '',
    volume: 0.65,
    muted: false,
    progress: 0,
  };

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.state.muted ? 0 : this.state.volume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private emit() {
    const snap = { ...this.state };
    this.listeners.forEach((cb) => cb(snap));
  }

  subscribe(listener: AudioListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): AudioStateSnapshot {
    return { ...this.state };
  }

  setVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, vol));
    this.state.volume = clamped;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.state.muted ? 0 : clamped, this.ctx.currentTime, 0.03);
    }
    if (this.htmlAudio) {
      this.htmlAudio.volume = this.state.muted ? 0 : clamped;
    }
    this.emit();
  }

  toggleMute() {
    this.state.muted = !this.state.muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.state.muted ? 0 : this.state.volume, this.ctx.currentTime, 0.03);
    }
    if (this.htmlAudio) {
      this.htmlAudio.volume = this.state.muted ? 0 : this.state.volume;
    }
    this.emit();
  }

  stop() {
    if (this.synthTimer !== null) {
      window.clearInterval(this.synthTimer);
      this.synthTimer = null;
    }
    if (this.htmlAudio) {
      this.htmlAudio.pause();
      this.htmlAudio.currentTime = 0;
      this.htmlAudio = null;
    }
    this.activeTrack = null;
    this.synthIndex = 0;
    this.state.isPlaying = false;
    this.state.progress = 0;
    this.emit();
  }

  pause() {
    if (this.synthTimer !== null) {
      window.clearInterval(this.synthTimer);
      this.synthTimer = null;
    }
    if (this.htmlAudio) {
      this.htmlAudio.pause();
    }
    this.state.isPlaying = false;
    this.emit();
  }

  playTrack(trackId: string, title: string, sourceUrl?: string) {
    // Always stop previous track so two tracks never overlap
    const resumingSameSynth =
      !sourceUrl?.startsWith('data:') &&
      !sourceUrl?.startsWith('http') &&
      this.state.currentTrackId === trackId &&
      !this.state.isPlaying &&
      this.activeTrack !== null;

    if (resumingSameSynth && this.activeTrack) {
      this.startSynthLoop(this.activeTrack);
      this.state.isPlaying = true;
      this.emit();
      return;
    }

    this.stop();
    this.state.currentTrackId = trackId;
    this.state.currentTrackTitle = title;

    if (sourceUrl && (sourceUrl.startsWith('data:audio') || sourceUrl.startsWith('http') || sourceUrl.startsWith('blob:'))) {
      const audio = new Audio(sourceUrl);
      audio.volume = this.state.muted ? 0 : this.state.volume;
      audio.loop = true;
      audio.addEventListener('timeupdate', () => {
        if (audio.duration > 0) {
          this.state.progress = audio.currentTime / audio.duration;
          this.emit();
        }
      });
      audio.addEventListener('ended', () => {
        this.state.isPlaying = false;
        this.state.progress = 0;
        this.emit();
      });
      this.htmlAudio = audio;
      audio
        .play()
        .then(() => {
          this.state.isPlaying = true;
          this.emit();
        })
        .catch(() => {
          // Fallback to synth if audio element blocked
          this.playSynthPreset('happy-birthday-piano', title);
        });
      return;
    }

    const cleanId = sourceUrl?.startsWith('synth:') ? sourceUrl.replace('synth:', '') : trackId;
    this.playSynthPreset(cleanId, title);
  }

  private playSynthPreset(presetId: string, title: string) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const track = PRESET_SYNTH_TRACKS.find((t) => t.id === presetId) || PRESET_SYNTH_TRACKS[0];
    this.activeTrack = track;
    this.synthIndex = 0;
    this.state.currentTrackTitle = title || track.titleEn;
    this.state.isPlaying = true;
    this.emit();
    this.startSynthLoop(track);
  }

  private startSynthLoop(track: SynthTrack) {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const stepMs = Math.round((60 / track.bpm) * 1000);

    const playNote = () => {
      if (!this.ctx || !this.masterGain) return;
      const freq = track.notes[this.synthIndex % track.notes.length];
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const harmonic = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();

      osc.type = track.id === 'starlight-musicbox' ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      harmonic.type = 'sine';
      harmonic.frequency.setValueAtTime(freq * 2, now);

      const harmonicGain = this.ctx.createGain();
      harmonicGain.gain.setValueAtTime(0.08, now);

      noteGain.gain.setValueAtTime(0.001, now);
      noteGain.gain.exponentialRampToValueAtTime(0.22, now + 0.03);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + stepMs / 1000 * 0.92);

      osc.connect(noteGain);
      harmonic.connect(harmonicGain);
      harmonicGain.connect(noteGain);
      noteGain.connect(this.masterGain);

      osc.start(now);
      harmonic.start(now);
      osc.stop(now + stepMs / 1000);
      harmonic.stop(now + stepMs / 1000);

      this.synthIndex = (this.synthIndex + 1) % track.notes.length;
      this.state.progress = this.synthIndex / track.notes.length;
      this.emit();
    };

    playNote();
    this.synthTimer = window.setInterval(playNote, stepMs);
  }

  playSfx(type: SoundEffectType) {
    if (this.state.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    if (type === 'candle-blow') {
      // Soft breathy whoosh
      const bufferSize = ctx.sampleRate * 0.45;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(750, now);
      filter.frequency.exponentialRampToValueAtTime(220, now + 0.45);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      noise.start(now);
      return;
    }

    if (type === 'gift-open' || type === 'win' || type === 'puzzle-solve' || type === 'fireworks') {
      const chord =
        type === 'fireworks'
          ? [523.25, 659.25, 783.99, 1046.5]
          : type === 'win'
          ? [440, 554.37, 659.25, 880]
          : [523.25, 659.25, 783.99];
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.001, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.18, now + idx * 0.06 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.5);
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.55);
      });
      return;
    }

    if (type === 'wheel-tick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(720, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.04);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.045);
    }
  }
}

export const audioManager = new BirthdayAudioManager();
