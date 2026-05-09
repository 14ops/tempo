import { MetronomeState, MetronomeTrack } from "../types";

export class MetronomeEngine {
  private audioContext: AudioContext | null = null;
  private nextNoteTime: number = 0;
  private timerID: number | null = null;
  private lookahead: number = 25.0; // How frequently to call scheduling function (in milliseconds)
  private scheduleAheadTime: number = 0.1; // How far ahead to schedule audio (in seconds)
  private state: MetronomeState;
  private onBeat: (beat: number, tracks: MetronomeTrack[]) => void;
  private subdivisionBeat: number = 0;

  constructor(state: MetronomeState, onBeat: (beat: number, tracks: MetronomeTrack[]) => void) {
    this.state = state;
    this.onBeat = onBeat;
  }

  public updateState(newState: Partial<MetronomeState>) {
    this.state = { ...this.state, ...newState };
  }

  private nextNote() {
    const secondsPerBeat = 60.0 / this.state.bpm;
    const subdivisionFactor = this.state.subdivision || 1;
    this.nextNoteTime += secondsPerBeat / subdivisionFactor;

    this.subdivisionBeat = (this.subdivisionBeat + 1) % subdivisionFactor;
    
    if (this.subdivisionBeat === 0) {
      // Handle Tempo Ramp
      if (this.state.tempoRamp && this.state.currentBeat === this.state.timeSignature.beats) {
        const ramp = this.state.tempoRamp;
        if (ramp.currentBar < ramp.bars) {
          const bpmDiff = ramp.targetBpm - this.state.bpm;
          const remainingBars = ramp.bars - ramp.currentBar;
          const bpmStep = bpmDiff / remainingBars;
          
          this.state.bpm = Math.round(this.state.bpm + bpmStep);
          this.state.tempoRamp = { ...ramp, currentBar: ramp.currentBar + 1 };
        } else {
          // Ramp finished
          this.state.tempoRamp = undefined;
        }
      }

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
  }

  private scheduleNote(beatNumber: number, time: number) {
    if (!this.audioContext) return;

    const isMainBeat = this.subdivisionBeat === 0;

    if (isMainBeat) {
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
    } else {
      // Subdivision tick sound
      if (this.state.tracks.find(t => t.id === 'primary')?.isVisible) {
        const osc = this.audioContext!.createOscillator();
        const envelope = this.audioContext!.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, time);
        envelope.gain.setValueAtTime(this.state.accentSubdivisions ? 0.3 : 0.1, time);
        envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

        osc.connect(envelope);
        envelope.connect(this.audioContext!.destination);
        osc.start(time);
        osc.stop(time + 0.05);
      }
    }

    // Update visual state on the main thread only on main beats
    if (isMainBeat) {
      setTimeout(() => {
        this.onBeat(beatNumber, [...this.state.tracks]);
      }, (time - this.audioContext!.currentTime) * 1000);
    }
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
