import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface TapButtonProps {
  onTempoCalculated: (bpm: number) => void;
}

export function TapButton({ onTempoCalculated }: TapButtonProps) {
  const [taps, setTaps] = useState<number[]>([]);
  const [lastBpm, setLastBpm] = useState<number | null>(null);

  // Clear feedback after 2 seconds of inactivity
  useEffect(() => {
    const timer = setTimeout(() => {
      setLastBpm(null);
      setTaps([]);
    }, 2000);
    return () => clearTimeout(timer);
  }, [taps]);

  const handleTap = useCallback(() => {
    const now = Date.now();
    const newTaps = [...taps, now].filter(t => now - t < 2000).slice(-4);
    setTaps(newTaps);

    if (newTaps.length >= 2) {
      const intervals = [];
      for (let i = 1; i < newTaps.length; i++) {
        intervals.push(newTaps[i] - newTaps[i - 1]);
      }
      const averageInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const bpm = Math.round(60000 / averageInterval);
      if (bpm >= 20 && bpm <= 400) {
        setLastBpm(bpm);
        onTempoCalculated(bpm);
      }
    }
  }, [taps, onTempoCalculated]);

  return (
    <div className="relative flex items-center justify-center">
      <AnimatePresence>
        {lastBpm && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 0 }}
            animate={{ scale: 1, opacity: 1, y: -50 }}
            exit={{ scale: 1.5, opacity: 0, y: -80 }}
            className="absolute pointer-events-none text-white font-mono text-xl font-bold bg-peak-bg/80 px-3 py-1 rounded-full border border-peak-zinc-700"
          >
            {lastBpm}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleTap}
        className="w-20 h-20 border border-peak-zinc-800 rounded-full flex items-center justify-center text-peak-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-white/5 transition-colors"
        id="tap-tempo-button"
      >
        Tap
      </motion.button>
    </div>
  );
}
