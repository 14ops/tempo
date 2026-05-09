export type TimeSignature = {
  beats: number;
  noteValue: number;
};

export type SoundType = 'classic' | 'woodblock' | 'cowbell' | 'beep' | 'electronic';

export type MetronomeTrack = {
  id: string;
  beats: number;
  currentBeat: number;
  color: string;
  isVisible: boolean;
};

export type VisualStyle = 'geometry' | 'waveform' | 'minimal';

export type AccentAudioStyle = 'pitch' | 'wood' | 'none';
export type AccentVisualStyle = 'flash' | 'pulse' | 'both' | 'none';

export type MetronomeState = {
  bpm: number;
  isPlaying: boolean;
  timeSignature: TimeSignature; // Main track signature
  currentBeat: number; // Main track current beat
  accentFirstBeat: boolean;
  accentAudioStyle: AccentAudioStyle;
  accentVisualStyle: AccentVisualStyle;
  soundType: SoundType;
  tracks: MetronomeTrack[];
  visualStyle: VisualStyle;
};

export const DEFAULT_STATE: MetronomeState = {
  bpm: 120,
  isPlaying: false,
  timeSignature: { beats: 4, noteValue: 4 },
  currentBeat: 0,
  accentFirstBeat: true,
  accentAudioStyle: 'pitch',
  accentVisualStyle: 'flash',
  soundType: 'classic',
  tracks: [
    { id: 'primary', beats: 4, currentBeat: 0, color: '#FFFFFF', isVisible: true },
    { id: 'secondary', beats: 3, currentBeat: 0, color: '#00FF9C', isVisible: false }
  ],
  visualStyle: 'geometry',
};
