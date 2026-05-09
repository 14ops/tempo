export type TimeSignature = {
  beats: number;
  noteValue: number;
};

export type SoundType = 'classic' | 'woodblock' | 'cowbell' | 'beep' | 'electronic';
export type Subdivision = 1 | 2 | 3 | 4; // 1 (none), 2 (8ths), 3 (triplets), 4 (16ths)

export type MetronomeTrack = {
  id: string;
  beats: number;
  currentBeat: number;
  color: string;
  isVisible: boolean;
};

export type VisualStyle = 'geometry' | 'waveform' | 'minimal' | 'pendulum';

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
  subdivision: Subdivision;
  accentSubdivisions: boolean;
  muteProbability: number; // 0 to 1
  tempoRamp?: { targetBpm: number; bars: number; currentBar: number };
  presets: { id: string; name: string; state: Partial<MetronomeState> }[];
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
  subdivision: 1,
  accentSubdivisions: false,
  presets: [],
  tracks: [
    { id: 'primary', beats: 4, currentBeat: 0, color: '#FFFFFF', isVisible: true },
    { id: 'secondary', beats: 3, currentBeat: 0, color: '#00FF9C', isVisible: false }
  ],
  visualStyle: 'geometry',
  muteProbability: 0,
};
