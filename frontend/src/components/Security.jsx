import React from 'react';

export default function SecurityGauge({ score }) {
  const radius = 75;
  const arcLength = 2 * Math.PI * radius;
  // Calculate how much of the ring to hide based on the score percentage
  const dynamicOffset = arcLength - (score / 100) * arcLength;

  // Change color dynamically to create a high-impact diagnostic visual
  const resolveMetricHue = (value) => {
    if (value > 75) return '#10B981'; // Stable Emerald
    if (value > 45) return '#F59E0B'; // Degraded Amber
    return '#EF4444'; // Threat Crimson
  };

  return (
    <div className="flex flex-col items-center justify-center bg-slate-900 border border-slate-800 p-6 rounded-2xl relative shadow-2xl overflow-hidden">
      {/* Soft futuristic glow overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
      <h3 className="text-xs font-bold tracking-widest text-slate-400 mb-6 uppercase">System Integrity Matrix</h3>
      
      <div className="relative flex items-center justify-center">
        <svg className="w-44 h-44 transform -rotate-90">
          {/* Static gray track ring */}
          <circle cx="88" cy="88" r={radius} stroke="#1e293b" strokeWidth="10" fill="transparent" />
          {/* Animated score metric tracker */}
          <circle 
            cx="88" cy="88" r={radius} 
            stroke={resolveMetricHue(score)} 
            strokeWidth="10" 
            fill="transparent"
            strokeDasharray={arcLength}
            strokeDashoffset={dynamicOffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute text-center">
          <span className="text-5xl font-black tracking-tight text-white">{score}</span>
          <span className="text-[10px] block font-bold tracking-wider uppercase text-slate-400 mt-0.5">Health Pct</span>
        </div>
      </div>
      
      <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-slate-400">
        <span className="w-2 h-2 rounded-full animate-ping bg-emerald-500" />
        Live Webhook Connection Active
      </div>
    </div>
  );
}