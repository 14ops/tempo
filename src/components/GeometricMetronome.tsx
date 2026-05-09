import { motion, AnimatePresence } from 'motion/react';
import { MetronomeTrack, VisualStyle, AccentVisualStyle } from '../types';

interface GeometricMetronomeProps {
  tracks: MetronomeTrack[];
  isPlaying: boolean;
  bpm: number;
  visualStyle: VisualStyle;
  accentFirstBeat?: boolean;
  accentVisualStyle?: AccentVisualStyle;
}

export function GeometricMetronome({ tracks, isPlaying, bpm, visualStyle, accentFirstBeat, accentVisualStyle = 'pulse' }: GeometricMetronomeProps) {
  const size = 300;
  const center = size / 2;
  const radius = 120;

  const getPoints = (sides: number) => {
    const points = [];
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      points.push({ x, y });
    }
    return points;
  };

  const showPulse = accentVisualStyle === 'pulse' || accentVisualStyle === 'both';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Dynamic Glow Pulse Background */}
      <AnimatePresence>
        {showPulse && tracks.filter(t => t.isVisible).map(track => (
          track.currentBeat === 1 && (
            <motion.div
              key={`pulse-bg-${track.id}-${track.currentBeat}`}
              initial={{ scale: 0.8, opacity: 0.15 }}
              animate={{ scale: 1.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 rounded-full blur-3xl pointer-events-none"
              style={{ backgroundColor: track.color }}
            />
          )
        ))}
      </AnimatePresence>

      {/* Background Rings (Subtle) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
        <div className="w-[300px] h-[300px] border border-peak-zinc-400 rounded-full"></div>
        <div className="w-[200px] h-[200px] border border-peak-zinc-400 rounded-full shadow-[inset_0_0_20px_rgba(255,255,255,0.1)]"></div>
      </div>

      <svg width={size} height={size} className="relative z-10 overflow-visible">
        {tracks.map((track) => {
          if (!track.isVisible) return null;

          if (visualStyle === 'geometry') {
            const points = getPoints(track.beats);
            const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
            const currentPoint = points[track.currentBeat - 1] || points[0];
            const isAccentBeat = track.currentBeat === 1 && accentFirstBeat;

            return (
              <g key={track.id}>
                <defs>
                  <filter id={`glow-${track.id}`} x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation={isAccentBeat ? "6" : "3"} result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* The Shape Path */}
                <motion.path
                  d={pathData}
                  fill="none"
                  stroke={track.color}
                  strokeWidth="2"
                  opacity={0.15}
                  initial={false}
                  animate={{ d: pathData }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                />

                {/* Vertices */}
                {points.map((p, i) => {
                  const isThisAccent = i === 0 && accentFirstBeat && showPulse;
                  const isCurrent = track.currentBeat === i + 1;
                  return (
                    <motion.circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={isCurrent ? (isThisAccent ? 8 : 4) : 2}
                      fill={isCurrent ? track.color : 'transparent'}
                      stroke={track.color}
                      strokeWidth={isThisAccent ? "2.5" : "1.5"}
                      animate={{
                        r: isCurrent ? (isThisAccent ? 10 : 6) : 3,
                        opacity: isCurrent ? 1 : 0.3,
                        fill: isCurrent ? track.color : 'transparent'
                      }}
                      filter={isCurrent ? `url(#glow-${track.id})` : 'none'}
                    />
                  );
                })}

                {/* The Traveling Dot */}
                {isPlaying && (
                  <motion.circle
                    key={`dot-${track.id}`}
                    initial={false}
                    animate={{ cx: currentPoint.x, cy: currentPoint.y }}
                    transition={{ duration: 60 / bpm, ease: "linear" }}
                    r="5"
                    fill={track.color}
                    style={{ filter: `url(#glow-${track.id})` }}
                  />
                )}
              </g>
            );
          }

          if (visualStyle === 'waveform') {
            const barCount = 32;
            const radiusInner = 80;
            const radiusOuter = 130;
            
            return (
              <g key={track.id}>
                {Array.from({ length: barCount }).map((_, i) => {
                  const angle = (i * 2 * Math.PI) / barCount - Math.PI / 2;
                  const isActive = track.currentBeat > 0 && i % Math.floor(barCount / track.beats) === 0 && (track.currentBeat - 1) === Math.floor(i / (barCount / track.beats));
                  
                  const x1 = center + radiusInner * Math.cos(angle);
                  const y1 = center + radiusInner * Math.sin(angle);
                  const x2 = center + (radiusInner + (isActive ? 40 : 10)) * Math.cos(angle);
                  const y2 = center + (radiusInner + (isActive ? 40 : 10)) * Math.sin(angle);

                  return (
                    <motion.line
                      key={i}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={track.color}
                      strokeWidth={isActive ? 3 : 1}
                      animate={{
                        x2: center + (radiusInner + (isActive ? 40 : 10)) * Math.cos(angle),
                        y2: center + (radiusInner + (isActive ? 40 : 10)) * Math.sin(angle),
                        opacity: isActive ? 1 : 0.2
                      }}
                    />
                  );
                })}
                
                {/* Central Circle Pulse */}
                <motion.circle
                  cx={center}
                  cy={center}
                  r={radiusInner - 10}
                  fill="none"
                  stroke={track.color}
                  strokeWidth="1"
                  animate={{
                    r: track.currentBeat === 1 ? [radiusInner - 10, radiusInner, radiusInner - 10] : radiusInner - 10,
                    opacity: track.currentBeat === 1 ? 0.8 : 0.2
                  }}
                />
              </g>
            );
          }

          if (visualStyle === 'minimal') {
             return (
               <g key={track.id}>
                 <motion.circle
                   cx={center}
                   cy={center}
                   r={track.currentBeat === 1 ? 100 : 80}
                   fill="none"
                   stroke={track.color}
                   strokeWidth={track.currentBeat === 1 ? 4 : 1}
                   animate={{
                     r: track.currentBeat === 1 ? [80, 110, 80] : 80,
                     opacity: track.currentBeat === 1 ? 1 : 0.1,
                     strokeWidth: track.currentBeat === 1 ? 4 : 1
                   }}
                   transition={{ duration: 0.2 }}
                 />
                 {Array.from({ length: track.beats }).map((_, i) => {
                    const angle = (i * 2 * Math.PI) / track.beats - Math.PI / 2;
                    const x = center + 60 * Math.cos(angle);
                    const y = center + 60 * Math.sin(angle);
                    const isActive = track.currentBeat === i + 1;
                    return (
                      <motion.circle
                        key={i}
                        cx={x}
                        cy={y}
                        r={isActive ? 4 : 2}
                        fill={isActive ? track.color : 'transparent'}
                        stroke={track.color}
                        strokeWidth="1"
                        animate={{
                          r: isActive ? 6 : 2,
                          opacity: isActive ? 1 : 0.2
                        }}
                      />
                    );
                 })}
               </g>
             );
          }

          return null;
        })}
      </svg>
    </div>
  );
}
