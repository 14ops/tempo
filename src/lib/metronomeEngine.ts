import { MetronomeState, MetronomeTrack } from "../types";

export class MetronomeEngine {
  private audioContext: AudioContext | null = null;
  private nextNoteTime: number = 0;
  private timerID: number | null = null;
  private lookahead: number = 25.0; // How frequently to call scheduling function (in milliseconds)
  private scheduleAheadTime: number = 0.1; // How far ahead to schedule audio (in seconds)
  private state: MetronomeState;
  private onBeat: (beat: number, tracks: MetronomeTrack[]) => void;

  constructor(state: MetronomeState, onBeat: (beat: number, tracks: MetronomeTrack[]) => void) {
    this.state = state;
    this.onBeat = onBeat;
  }

  public updateState(newState: Partial<MetronomeState>) {
    this.state = { ...this.state, ...newState };
  }

  private nextNote() {
    const secondsPerBeat = 60.0 / this.state.bpm;
    this.nextNoteTime += secondsPerBeat;

    // Update main beat
    this.state.currentBeat++;
    if (this.state.currentBeat > this.state.timeSignature.beats) {
      this.state.currentBeat = 1;
    }

    // Update track beats
    this.state.tracks = this.state.tracks.map(track => {
      let nextBeat = track.currentBeat + 1;
      if (nextBeat > track.beats) {
        nextBeat = 1;
      }
      return { ...track, currentBeat: nextBeat };
    });
  }

  private scheduleNote(beatNumber: number, time: number) {
    if (!this.audioContext) return;

    // We play a sound if the primary track beats, OR if any visible track beats (if we wanted unique sounds per track)
    // For now, let's just trigger the sound on every shared beat.
    // In many polyrhythm apps, each track has its own sound.
    
    // Play sound for each active track vertex
    this.state.tracks.forEach(track => {
      if (!track.isVisible) return;
      
      const osc = this.audioContext!.createOscillator();
      const envelope = this.audioContext!.createGain();
      
      // Slightly different pitch for different tracks if needed
      const isAccent = track.currentBeat === 1 && this.state.accentFirstBeat;
      const baseFreq = track.id === 'primary' ? 800 : 600;

      let pitchOffset = 0;
      if (isAccent) {
        if (this.state.accentAudioStyle === 'pitch') pitchOffset = 200;
        else if (this.state.accentAudioStyle === 'wood') pitchOffset = 500;
      }
      
      // Profiles
      switch (this.state.soundType) {
        case 'woodblock':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(isAccent ? (baseFreq + 400 + pitchOffset) : baseFreq + 400, time);
          envelope.gain.setValueAtTime(0.5, time);
          envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
          break;
        case 'cowbell':
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(isAccent ? (560 + pitchOffset) : 560, time);
          envelope.gain.setValueAtTime(0.6, time);
          envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
          break;
        case 'beep':
          osc.type = 'square';
          osc.frequency.setValueAtTime(isAccent ? (500 + pitchOffset) : 500, time);
          envelope.gain.setValueAtTime(0.15, time);
          envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
          break;
        case 'electronic':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(isAccent ? (100 + pitchOffset / 5) : 100, time);
          envelope.gain.setValueAtTime(0.7, time);
          envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
          break;
        case 'classic':
        default:
          osc.type = 'sine';
          osc.frequency.setValueAtTime(isAccent ? (baseFreq + pitchOffset) : baseFreq, time);
          envelope.gain.setValueAtTime(0.5, time);
          envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
          break;
      }

      osc.connect(envelope);
      envelope.connect(this.audioContext!.destination);
      osc.start(time);
      osc.stop(time + 0.2);
    });

    // Update visual state on the main thread
    setTimeout(() => {
      this.onBeat(beatNumber, [...this.state.tracks]);
    }, (time - this.audioContext.currentTime) * 1000);
  }

  private scheduler() {
    if (!this.audioContext) return;

    while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.state.currentBeat, this.nextNoteTime);
      this.nextNote();
    }
    this.timerID = window.setTimeout(() => this.scheduler(), this.lookahead);
  }

  public start() {
    if (this.state.isPlaying) return;

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    this.state.isPlaying = true;
    this.state.currentBeat = 1;
    this.nextNoteTime = this.audioContext.currentTime + 0.05;
    this.scheduler();
  }

  public stop() {
    this.state.isPlaying = false;
    if (this.timerID) {
      window.clearTimeout(this.timerID);
    }
  }
}
