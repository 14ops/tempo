import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { Play, Square, Minus, Plus, Bell, BellOff, Volume2, Settings, ListMusic, Activity, Sparkles, TrendingUp, TrendingDown, Save } from 'lucide-react';
import { MetronomeEngine } from './lib/metronomeEngine';
import { MetronomeState, DEFAULT_STATE, Subdivision } from './types';
import { TapButton } from './components/TapButton';
import { GeometricMetronome } from './components/GeometricMetronome';
import { GeminiCommandCenter } from './components/GeminiCommandCenter';

export default function App() {
  const [state, setState] = useState<MetronomeState>(DEFAULT_STATE);
  const engineRef = useRef<MetronomeEngine | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    engineRef.current = new MetronomeEngine(DEFAULT_STATE, (beat, tracks) => {
      setState(prev => ({ 
        ...prev, 
        currentBeat: beat,
        tracks: tracks
      }));
    });
    setIsReady(true);
    return () => engineRef.current?.stop();
  }, []);

  // Haptic feedback and visual pulse effect
  useEffect(() => {
    if (state.isPlaying && state.currentBeat > 0) {
      if ("vibrate" in navigator) {
        const isAccent = state.currentBeat === 1 && state.accentFirstBeat;
        try {
          navigator.vibrate(isAccent ? 20 : 10);
        } catch (e) {
          // ignore vibration errors (e.g. if blocked by browser)
        }
      }
    }
  }, [state.currentBeat, state.isPlaying, state.accentFirstBeat]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateState(state);
    }
  }, [state]);

  useEffect(() => {
    const savedPresets = localStorage.getItem('peak-metronome-presets');
    if (savedPresets) {
      try {
        setState(prev => ({ ...prev, presets: JSON.parse(savedPresets) }));
      } catch (e) {
        console.error("Failed to load presets", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('peak-metronome-presets', JSON.stringify(state.presets));
  }, [state.presets]);

  const togglePlayback = useCallback(() => {
    if (!engineRef.current) return;
    
    if (state.isPlaying) {
      engineRef.current.stop();
      setState(prev => ({ ...prev, isPlaying: false, currentBeat: 0 }));
    } else {
      engineRef.current.start();
      setState(prev => ({ ...prev, isPlaying: true }));
    }
  }, [state.isPlaying]);

  const updateBpm = useCallback((newBpm: number) => {
    const bpm = Math.min(Math.max(newBpm, 20), 400);
    setState(prev => ({ ...prev, bpm }));
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          togglePlayback();
          break;
        case 'arrowup':
          e.preventDefault();
          updateBpm(state.bpm + 1);
          break;
        case 'arrowdown':
          e.preventDefault();
          updateBpm(state.bpm - 1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.bpm, togglePlayback, updateBpm]);

  const updateTrackBeats = useCallback((trackId: string, beats: number) => {
    const newBeats = Math.min(Math.max(beats, 2), 32);
    setState(prev => ({
      ...prev,
      tracks: prev.tracks.map(t => t.id === trackId ? { ...t, beats: newBeats } : t),
      // If it's the primary track, update the main signature too
      timeSignature: trackId === 'primary' ? { ...prev.timeSignature, beats: newBeats } : prev.timeSignature
    }));
  }, []);

  const toggleTrack = useCallback((trackId: string) => {
    setState(prev => ({
      ...prev,
      tracks: prev.tracks.map(t => t.id === trackId ? { ...t, isVisible: !t.isVisible } : t)
    }));
  }, []);

  const savePreset = () => {
    const name = prompt("Enter preset name:");
    if (!name) return;
    const newPreset = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      state: {
        bpm: state.bpm,
        timeSignature: state.timeSignature,
        soundType: state.soundType,
        subdivision: state.subdivision,
        tracks: state.tracks
      }
    };
    setState(prev => ({ ...prev, presets: [...prev.presets, newPreset] }));
  };

  const loadPreset = (presetState: Partial<MetronomeState>) => {
    setState(prev => ({ ...prev, ...presetState }));
  };

  if (!isReady) return null;

  return (
    <div className="w-full h-screen bg-peak-bg text-peak-text font-sans flex flex-col overflow-hidden" id="app-wrapper">
      {/* Visual Flash Pulse */}
      {state.isPlaying && (state.accentVisualStyle === 'flash' || state.accentVisualStyle === 'both') && (
        <motion.div 
          key={`flash-${state.currentBeat}`}
          initial={{ 
            opacity: state.currentBeat === 1 
              ? (state.accentFirstBeat ? 0.25 : 0.1) 
              : 0.03 
          }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 bg-white pointer-events-none z-0"
        />
      )}

      {/* Top Navigation */}
      <nav className="flex justify-between items-center px-10 py-6 border-b border-peak-zinc-800/50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-peak-zinc-200 rounded-sm flex items-center justify-center">
            <div className="w-1 h-5 bg-black rotate-12"></div>
          </div>
          <span className="text-lg font-medium tracking-[0.2em] uppercase italic text-peak-zinc-100 font-serif">Pulse Peak</span>
        </div>
        <div className="hidden md:flex items-center space-x-12 text-[10px] font-semibold uppercase tracking-[0.3em] text-peak-zinc-500">
          <span className="text-peak-zinc-200 cursor-pointer">Metronome</span>
          <span className="hover:text-peak-zinc-200 cursor-pointer transition-colors">Presets</span>
          <span className="hover:text-peak-zinc-200 cursor-pointer transition-colors">Tuner</span>
          <span className="hover:text-peak-zinc-200 cursor-pointer transition-colors">Analysis</span>
        </div>
        <div className="flex space-x-4">
          <button 
            onClick={() => setState(prev => ({ ...prev, accentFirstBeat: !prev.accentFirstBeat }))}
            className={`w-10 h-10 border border-peak-zinc-800 rounded-full flex items-center justify-center transition-colors ${state.accentFirstBeat ? 'text-peak-zinc-200 border-peak-zinc-400' : 'text-peak-zinc-500'}`}
          >
            {state.accentFirstBeat ? <Bell size={16} /> : <BellOff size={16} />}
          </button>
        </div>
      </nav>

      {/* Main Metronome Interface */}
      <motion.main 
        key={`shake-${state.currentBeat}`}
        animate={state.isPlaying ? {
          x: state.currentBeat === 1 ? [0, -2, 2, -2, 0] : [0, -1, 1, 0],
          y: state.currentBeat === 1 ? [0, -1, 1, 0] : 0
        } : {}}
        transition={{ duration: 0.1 }}
        className="relative z-10 w-full max-w-5xl bg-peak-bg text-peak-text font-sans flex-1 grid grid-cols-1 md:grid-cols-12 gap-0 overflow-hidden" 
        id="main-interface"
      >
        
        {/* Left Sidebar: Poly-Track Layers */}
        <div className="hidden md:flex md:col-span-3 border-r border-peak-zinc-800/50 p-10 flex-col space-y-12">
          <section>
            <h3 className="text-[10px] uppercase tracking-[0.3em] text-peak-zinc-600 mb-6 flex items-center gap-2">
              <Activity size={12} /> Rhythm Layers
            </h3>
            <div className="space-y-6">
              {state.tracks.map(track => (
                <div key={track.id} className={`p-4 border ${track.isVisible ? 'border-peak-zinc-200' : 'border-peak-zinc-800 opacity-50'} rounded-lg transition-all`}>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: track.isVisible ? track.color : 'inherit' }}>
                      {track.id === 'primary' ? 'Base Layer' : 'Poly Layer'}
                    </span>
                    <div className="flex gap-2">
                      {track.id === 'primary' && (
                        <button 
                          onClick={() => setState(prev => ({ ...prev, accentFirstBeat: !prev.accentFirstBeat }))}
                          className={`text-[9px] border px-2 py-0.5 transition-colors uppercase tracking-widest ${state.accentFirstBeat ? 'border-peak-zinc-200 text-peak-zinc-200 bg-white/5' : 'border-peak-zinc-700 text-peak-zinc-500'}`}
                        >
                          Accent {state.accentFirstBeat ? 'ON' : 'OFF'}
                        </button>
                      )}
                      <button 
                        onClick={() => toggleTrack(track.id)}
                        className="text-[9px] border border-peak-zinc-700 px-2 py-0.5 hover:bg-white/5 transition-colors uppercase tracking-widest"
                      >
                        {track.isVisible ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <button onClick={() => updateTrackBeats(track.id, track.beats - 1)} className="text-peak-zinc-500 hover:text-white"><Minus size={16}/></button>
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-mono leading-none">{track.beats}</span>
                      <span className="text-[8px] uppercase tracking-tighter opacity-50">Points</span>
                    </div>
                    <button onClick={() => updateTrackBeats(track.id, track.beats + 1)} className="text-peak-zinc-500 hover:text-white"><Plus size={16}/></button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-auto">
            <h3 className="text-[10px] uppercase tracking-[0.3em] text-peak-zinc-600 mb-4">Geometric Feedback</h3>
            <div className="flex gap-1 h-1 w-full">
              {state.tracks.filter(t => t.isVisible).map(t => (
                <div key={t.id} className="h-full flex-1 bg-peak-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={false}
                    animate={{ width: `${(t.currentBeat / t.beats) * 100}%` }}
                    className="h-full"
                    style={{ backgroundColor: t.color }}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Center: Geometric Visualizer */}
        <div className="md:col-span-6 flex flex-col items-center justify-center relative overflow-hidden p-6">
            <GeometricMetronome 
              tracks={state.tracks}
              isPlaying={state.isPlaying}
              bpm={state.bpm}
              visualStyle={state.visualStyle}
              accentFirstBeat={state.accentFirstBeat}
              accentVisualStyle={state.accentVisualStyle}
            />
          
          <div className="text-center z-10 mt-8">
            <span className="block text-[10px] uppercase tracking-[1em] text-peak-zinc-600 mb-2">Tempo</span>
            <motion.h1 
              key={state.bpm}
              className="text-8xl md:text-[100px] leading-none font-light tracking-tighter text-white font-mono"
            >
              {state.bpm}
            </motion.h1>
            
            <input 
              type="range"
              min="20"
              max="400"
              value={state.bpm}
              onChange={(e) => updateBpm(parseInt(e.target.value))}
              className="w-48 mt-8 accent-peak-zinc-200 cursor-pointer opacity-30 hover:opacity-100 transition-opacity"
            />
          </div>

          <div className="mt-12 flex items-center space-x-12 z-10">
            <TapButton onTempoCalculated={updateBpm} />
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={togglePlayback}
              className={`w-28 h-28 rounded-full flex items-center justify-center transition-all ${state.isPlaying ? 'bg-peak-zinc-800' : 'bg-white shadow-xl'}`}
            >
              {state.isPlaying ? <div className="w-8 h-8 bg-white rounded-sm"></div> : <Play size={24} fill="black" className="ml-1" />}
            </motion.button>
            <button className="w-16 h-16 border border-peak-zinc-800 rounded-full flex items-center justify-center text-peak-zinc-500 hover:text-white transition-colors">
              <Volume2 size={18} />
            </button>
          </div>
        </div>

        {/* Right Sidebar: Setlist & History */}
        <div className="hidden md:flex md:col-span-3 border-l border-peak-zinc-800/50 p-10 flex-col">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-[10px] uppercase tracking-[0.3em] text-peak-zinc-600 flex items-center gap-2">
              <ListMusic size={12} /> Setlist
            </h3>
            <button 
              onClick={savePreset}
              className="text-[9px] text-peak-zinc-400 border border-peak-zinc-700 px-2 py-1 uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors"
            >
              <Save size={10} className="inline mr-1" /> Save
            </button>
          </div>

          <div className="flex-1 space-y-8 overflow-y-auto pr-2">
            {state.presets.length === 0 && (
              <p className="text-[10px] text-peak-zinc-700 uppercase italic">No saved presets yet.</p>
            )}
            {state.presets.map(preset => (
              <div 
                key={preset.id}
                className="border-l-2 border-peak-zinc-800 pl-6 cursor-pointer hover:border-peak-zinc-400 transition-all group" 
                onClick={() => loadPreset(preset.state)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] text-peak-zinc-500 mb-1 font-mono uppercase tracking-tighter">{preset.name}</p>
                    <h4 className="text-white font-medium text-sm tracking-wide">
                      {preset.state.bpm} BPM — {preset.state.timeSignature?.beats}/{preset.state.timeSignature?.noteValue}
                    </h4>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setState(prev => ({ ...prev, presets: prev.presets.filter(p => p.id !== preset.id) }));
                    }}
                    className="opacity-0 group-hover:opacity-100 text-[8px] text-red-900 hover:text-red-500 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            
            <div className="pt-8 border-t border-peak-zinc-900 opacity-30">
              <p className="text-[10px] text-peak-zinc-700 uppercase mb-4 tracking-widest">Library Samples</p>
              <div className={`border-l-2 pl-6 cursor-pointer transition-all ${state.bpm === 124 ? 'border-peak-zinc-200' : 'border-peak-zinc-800 opacity-40'}`} onClick={() => updateBpm(124)}>
                <p className="text-[10px] text-peak-zinc-500 mb-1 font-mono">01. Intro Sequence</p>
                <h4 className="text-white font-medium text-sm tracking-wide">124 BPM — 4/4</h4>
              </div>
              {/* ... other default samples can stay or be removed ... */}
            </div>
          </div>

          <div className="space-y-6 mt-auto">
            <section>
              <div className="flex justify-between text-[10px] text-peak-zinc-600 uppercase tracking-widest mb-4">
                <span>Display Style</span>
                <span className="text-peak-zinc-200 uppercase tracking-widest">{state.visualStyle}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['geometry', 'waveform', 'minimal'] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() => setState(prev => ({ ...prev, visualStyle: style }))}
                    className={`p-2 border text-[8px] uppercase tracking-tighter transition-all ${state.visualStyle === style ? 'bg-peak-zinc-200 text-black border-peak-zinc-200' : 'bg-transparent text-peak-zinc-500 border-peak-zinc-800 hover:border-peak-zinc-600'}`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="flex justify-between text-[10px] text-peak-zinc-600 uppercase tracking-widest mb-4">
                <span>Accent Style</span>
                <div className="flex gap-1">
                  <button onClick={() => setState(prev => ({ ...prev, accentAudioStyle: prev.accentAudioStyle === 'pitch' ? 'wood' : prev.accentAudioStyle === 'wood' ? 'none' : 'pitch' }))} className="px-2 py-1 border border-peak-zinc-800 text-[8px] hover:text-white uppercase transition-colors">Sound: {state.accentAudioStyle}</button>
                  <button onClick={() => setState(prev => ({ ...prev, accentVisualStyle: prev.accentVisualStyle === 'flash' ? 'pulse' : prev.accentVisualStyle === 'pulse' ? 'both' : prev.accentVisualStyle === 'both' ? 'none' : 'flash' }))} className="px-2 py-1 border border-peak-zinc-800 text-[8px] hover:text-white uppercase transition-colors">Visual: {state.accentVisualStyle}</button>
                </div>
              </div>
            </section>

            <section>
              <div className="flex justify-between text-[10px] text-peak-zinc-600 uppercase tracking-widest mb-4">
                <span>Subdivisions</span>
                <span className="text-peak-zinc-200 uppercase tracking-widest">
                  {state.subdivision === 1 ? '1/4' : state.subdivision === 2 ? '1/8' : state.subdivision === 3 ? 'Triplet' : '1/16'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {([1, 2, 3, 4] as Subdivision[]).map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setState(prev => ({ ...prev, subdivision: sub }))}
                    className={`p-2 border text-[8px] uppercase tracking-tighter transition-all ${state.subdivision === sub ? 'bg-peak-zinc-200 text-black border-peak-zinc-200' : 'bg-transparent text-peak-zinc-500 border-peak-zinc-800 hover:border-peak-zinc-600'}`}
                  >
                    {sub === 1 ? '1/4' : sub === 2 ? '1/8' : sub === 3 ? '1/3' : '1/16'}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setState(prev => ({ ...prev, accentSubdivisions: !prev.accentSubdivisions }))}
                className={`w-full mt-2 py-1.5 border text-[8px] uppercase tracking-widest transition-all ${state.accentSubdivisions ? 'bg-peak-zinc-200 text-black border-peak-zinc-200' : 'bg-transparent text-peak-zinc-700 border-peak-zinc-800'}`}
              >
                Accent Sub: {state.accentSubdivisions ? 'ON' : 'OFF'}
              </button>
            </section>

            <GeminiCommandCenter 
              onStateUpdate={(update) => setState(prev => ({ ...prev, ...update }))}
              currentState={state}
            />

            <section>
              <div className="flex justify-between text-[10px] text-peak-zinc-600 uppercase tracking-widest mb-4">
                <span>Tempo Ramp</span>
                {state.tempoRamp && <span className="text-peak-zinc-200">Bar {state.tempoRamp.currentBar}/{state.tempoRamp.bars}</span>}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setState(prev => ({ 
                    ...prev, 
                    tempoRamp: prev.tempoRamp ? undefined : { targetBpm: prev.bpm + 20, bars: 16, currentBar: 0 } 
                  }))}
                  className={`flex-1 py-2 border text-[8px] uppercase tracking-widest transition-all ${state.tempoRamp ? 'bg-peak-zinc-200 text-black border-peak-zinc-200' : 'bg-transparent text-peak-zinc-500 border-peak-zinc-800'}`}
                >
                  {state.tempoRamp ? 'Cancel Ramp' : 'Auto Accelerando'}
                </button>
              </div>
            </section>

            <section className="bg-peak-zinc-900/10 p-6 border border-peak-zinc-800/50">
              <div className="flex justify-between text-[10px] text-peak-zinc-600 uppercase tracking-widest mb-6">
                <span>Sound Profile</span>
                <span className="text-peak-zinc-200 uppercase tracking-widest">{state.soundType}</span>
              </div>
              <div className="flex flex-col space-y-2">
                {(['classic', 'woodblock', 'cowbell', 'beep', 'electronic'] as const).map((sound) => (
                  <button 
                    key={sound}
                    onClick={() => setState(prev => ({ ...prev, soundType: sound }))}
                    className={`flex items-center justify-between px-3 py-2 text-[10px] uppercase tracking-widest transition-all border ${state.soundType === sound ? 'bg-peak-zinc-200 text-black border-peak-zinc-200' : 'bg-transparent text-peak-zinc-500 border-peak-zinc-800 hover:border-peak-zinc-600'}`}
                  >
                    {sound}
                    {state.soundType === sound && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      </motion.main>

      {/* Bottom Status Bar */}
      <footer className="px-10 py-5 border-t border-peak-zinc-800/50 flex flex-col md:flex-row justify-between items-center text-[9px] uppercase tracking-[0.3em] text-peak-zinc-600 gap-4">
        <div className="flex space-x-8">
          <span>Session: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span className="hidden sm:inline">Engine: 64-bit precision</span>
          <span className="hidden sm:inline">Clock: Internal Gen-X</span>
        </div>
        <div className="font-serif italic opacity-50">© 2024 Pulse Peak Engineering — Studio Grade Instrument</div>
      </footer>
    </div>
  );
}
