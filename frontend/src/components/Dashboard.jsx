import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { GitPullRequest, Shield, Terminal, Zap } from 'lucide-react';
import SecurityGauge from './Security';
import confetti from 'canvas-confetti';

export default function Dashboard() {
  const [score, setScore] = useState(100);
  const [history, setHistory] = useState([]);
  const [distribution, setDistribution] = useState([
    { name: 'Security', value: 0 },
    { name: 'Performance', value: 0 },
    { name: 'Code Smell', value: 0 }
  ]);

  const COLOR_PALETTE = ['#EF4444', '#3B82F6', '#F59E0B'];

  useEffect(() => {
    // 1 ── Open production WebSocket listener connecting back to backend port
    const socket = new WebSocket('wss://codepulse-backend-fie8.onrender.com');

    const handleIncomingTelemetry = (socketData) => {
      if (socketData.type === 'INITIALIZE_PANEL') {
        setScore(socketData.score);
        setHistory(socketData.history || []);
      } else if (socketData.type === 'SCORE_TELEMETRY') {
        setScore(socketData.score);
        
        // Climax Trigger: If an AI automated fix has merged, rain down hackathon confetti
        if (socketData.prMeta?.action === 'REMEDIATION_RESOLVED') {
          confetti({ particleCount: 140, spread: 70, origin: { y: 0.6 } });
        } else if (socketData.prMeta) {
          setHistory(prev => [socketData.prMeta, ...prev]);
          
          // Dynamically increment pie chart distributions from incoming metrics
          if (socketData.prMeta.categories) {
            setDistribution(current => current.map(item => {
              const matches = socketData.prMeta.categories.filter(cat => cat === item.name).length;
              return { ...item, value: item.value + matches };
            }));
          }
        }
      }
    };

    socket.onmessage = (event) => {
      handleIncomingTelemetry(JSON.parse(event.data));
    };

    // 2 ── ⚡ ZERO-FAIL HYBRID BACKUP: HTTP Polling Engine
    // Pulls state from your backend API database if Render blocks persistent WebSockets
    const fetchCloudStateEngine = async () => {
      try {
        const response = await fetch('https://codepulse-backend-fie8.onrender.com/api/telemetry-state');
        if (response.ok) {
          const cloudState = await response.json();
          
          if (cloudState.history && cloudState.history.length > 0) {
            setScore(cloudState.score);
            setHistory(cloudState.history);
            
            // Recompute unified pie slices from the fetched historical array
            const updatedDist = [
              { name: 'Security', value: 0 },
              { name: 'Performance', value: 0 },
              { name: 'Code Smell', value: 0 }
            ];
            
            cloudState.history.forEach(item => {
              if (item.categories) {
                item.categories.forEach(cat => {
                  const match = updatedDist.find(d => d.name === cat);
                  if (match) match.value += 1;
                });
              }
            });
            setDistribution(updatedDist);
          }
        }
      } catch (err) {
        console.log("Sync checking... waiting for background pipeline execution threads.");
      }
    };

    // Poll the cloud state server every 3 seconds to keep UI metrics perfectly unified
    const backupInterval = setInterval(fetchCloudStateEngine, 3000);

    return () => {
      socket.close();
      clearInterval(backupInterval);
    };
  }, []);

  const renderBadge = (severity) => {
    const colorMatrix = {
      CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/20',
      WARNING: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${colorMatrix[severity] || 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
        {severity}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans antialiased">
      {/* Premium Dashboard Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 border-b border-slate-900 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg text-white"><Terminal className="w-5 h-5" /></div>
            <h1 className="text-2xl font-black tracking-tight text-white">CodePulse <span className="text-indigo-500 font-light">Engine</span></h1>
          </div>
          <p className="text-slate-400 text-xs mt-1">Autonomous AI Repository Remediation Terminal</p>
        </div>
        <div className="text-xs font-mono bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-indigo-400 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          Engine: claude-sonnet-4-20250514
        </div>
      </header>

      {/* Analytics Core Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <SecurityGauge score={score} />

        {/* Recharts Pie Chart Block */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl flex flex-col justify-between">
          <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-4">Anomaly Breakdown</h3>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distribution} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={5} dataKey="value">
                  {distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLOR_PALETTE[index % COLOR_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-around text-[11px] font-bold text-slate-400 mt-2">
            {distribution.map((item, index) => (
              <span key={item.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLOR_PALETTE[index] }} />
                {item.name} ({item.value})
              </span>
            ))}
          </div>
        </div>

        {/* System Diagnostics Block */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950/30 border border-slate-800 p-6 rounded-2xl shadow-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-4">Automation State</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20"><GitPullRequest className="w-4 h-4" /></div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Inline Annotation Engine</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Injects contextual warnings line-by-line using GitHub's Pull Request review framework.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20"><Shield className="w-4 h-4" /></div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Branch Patch Synthesis</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Executes tree changesets via Content APIs to instantly stand up secondary automated pull requests.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Historical Audit Log Tracker */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">Active Security Streams</h2>
          <span className="text-[11px] font-mono font-bold bg-slate-950 px-3 py-1 rounded-full border border-slate-800 text-slate-400">Captured Flows: {history.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-bold tracking-widest text-slate-400 uppercase bg-slate-950/40">
                <th className="py-4 px-6">Pull Request Node</th>
                <th className="py-4 px-6">Repository Namespace</th>
                <th className="py-4 px-6">Vulnerabilities</th>
                <th className="py-4 px-6 text-right">Max Threat Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs font-medium">
              {history.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-12 text-center text-slate-500 font-bold tracking-wide uppercase">
                    No active codebase diffs intercepted. Fire a GitHub PR webhook hook to trigger state updates.
                  </td>
                </tr>
              ) : (
                history.map((pr, index) => (
                  <tr key={index} className="hover:bg-slate-800/20 transition-colors duration-100">
                    <td className="py-4 px-6 font-bold text-white flex items-center gap-2">
                      <GitPullRequest className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                      {pr.title}
                    </td>
                    <td className="py-4 px-6 text-slate-400 font-mono text-[11px]">{pr.repo}</td>
                    <td className="py-4 px-6"><span className="bg-slate-950 border border-slate-800 text-slate-300 font-black px-2.5 py-0.5 rounded">{pr.defectCount}</span></td>
                    <td className="py-4 px-6 text-right">{renderBadge(pr.peakSeverity)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}