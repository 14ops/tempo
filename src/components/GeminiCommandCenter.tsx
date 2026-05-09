import React, { useState } from 'react';
import { MetronomeState } from '../types';
import { Sparkles, Loader2, Send } from 'lucide-react';

interface GeminiCommandCenterProps {
  onStateUpdate: (newState: Partial<MetronomeState>) => void;
  currentState: MetronomeState;
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    bpm: { type: "number" },
    soundType: { type: "string" },
    subdivision: { type: "number" },
    visualStyle: { type: "string" },
    timeSignature: {
      type: "object",
      properties: {
        beats: { type: "number" },
        noteValue: { type: "number" }
      }
    },
    accentFirstBeat: { type: "boolean" },
  }
};

export function GeminiCommandCenter({ onStateUpdate, currentState }: GeminiCommandCenterProps) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApplyCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          currentState,
          schema: RESPONSE_SCHEMA
        })
      });

      if (!response.ok) throw new Error("Server error");
      
      const result = await response.json();
      onStateUpdate(result);
      setPrompt('');
    } catch (err: any) {
      console.error(err);
      setError("Failed to reach Peak AI Coach.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-peak-zinc-900/10 border border-peak-zinc-800/50 p-4 rounded-lg space-y-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-peak-zinc-400">
        <Sparkles size={12} className="text-yellow-500" />
        <span>Gemini AI Preset Engine</span>
      </div>
      
      <form onSubmit={handleApplyCommand} className="relative">
        <input 
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder='Try "Slow blues shuffle" or "5 over 4 polyrhythm"...'
          className="w-full bg-black/40 border border-peak-zinc-800 px-4 py-2 text-xs text-peak-zinc-200 placeholder:text-peak-zinc-600 focus:outline-none focus:border-peak-zinc-600 transition-colors pr-10"
          disabled={isLoading}
        />
        <button 
          type="submit"
          disabled={isLoading || !prompt.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-peak-zinc-500 hover:text-white transition-colors disabled:opacity-30"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
      
      {error && <p className="text-[10px] text-red-500 uppercase tracking-tight">{error}</p>}
      
      <div className="flex flex-wrap gap-2">
        {['Slow Jazz', '7/8 Fusion', 'Metal 16ths', '4 over 3 Polyrhythm'].map(suggest => (
          <button 
            key={suggest}
            onClick={() => setPrompt(suggest)}
            className="text-[8px] uppercase tracking-widest px-2 py-1 border border-peak-zinc-800/50 text-peak-zinc-600 hover:text-peak-zinc-300 hover:border-peak-zinc-700 transition-all"
          >
            {suggest}
          </button>
        ))}
      </div>
    </div>
  );
}
