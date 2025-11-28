import React, { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { generateStaffInsights } from '../services/geminiService';
import { StaffMember, CheckInLog, AppRoute } from '../types';
import { BarChart3, Users, Zap, BrainCircuit, ArrowLeft, Loader2, History, Clock } from 'lucide-react';

interface AnalysisProps {
  onNavigate: (route: AppRoute) => void;
}

export const Analysis: React.FC<AnalysisProps> = ({ onNavigate }) => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [logs, setLogs] = useState<CheckInLog[]>([]);
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const staffData = await dbService.getAllStaff();
      const logsData = await dbService.getRecentCheckIns(20);
      setStaff(staffData);
      setLogs(logsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInsights = async () => {
    setAnalyzing(true);
    const result = await generateStaffInsights(staff);
    setInsight(result);
    setAnalyzing(false);
  };

  // Calculate Metrics
  const totalStaff = staff.length;
  const unitCounts = staff.reduce((acc: Record<string, number>, curr) => {
    acc[curr.assignedUnit] = (acc[curr.assignedUnit] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedUnits = Object.entries(unitCounts).sort((a, b) => (b[1] as number) - (a[1] as number));
  const maxCount = sortedUnits.length > 0 ? (sortedUnits[0][1] as number) : 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-4 md:p-8 pb-24 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
              <button onClick={() => onNavigate(AppRoute.ADMIN_DASHBOARD)} className="md:hidden bg-slate-900 p-2 rounded-lg text-slate-400 hover:text-white border border-slate-800">
                  <ArrowLeft size={24} />
              </button>
              <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                  <BarChart3 className="text-emerald-400" />
                  Deep Analysis
              </h1>
              <p className="text-slate-400 text-sm md:text-base mt-1">Operational metrics and activity logs.</p>
              </div>
          </div>
          
          <button 
            onClick={handleGenerateInsights}
            disabled={analyzing || totalStaff === 0}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-emerald-900/20 transition-all hover:scale-105 active:scale-95"
          >
            {analyzing ? <Loader2 className="animate-spin" size={20} /> : <BrainCircuit size={20} />}
            <span>{analyzing ? 'Analyzing...' : 'Generate AI Insights'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Stat Cards */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
              <div className="flex items-center justify-between mb-4">
                  <h3 className="text-slate-400 font-medium">Total Personnel</h3>
                  <Users className="text-emerald-500" size={24} />
              </div>
              <p className="text-4xl font-bold text-white">{totalStaff}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
              <div className="flex items-center justify-between mb-4">
                  <h3 className="text-slate-400 font-medium">Active Units</h3>
                  <Zap className="text-amber-500" size={24} />
              </div>
              <p className="text-4xl font-bold text-white">{sortedUnits.length}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
              <div className="flex items-center justify-between mb-4">
                  <h3 className="text-slate-400 font-medium">Check-ins (Last 24h)</h3>
                  <History className="text-blue-500" size={24} />
              </div>
              <p className="text-4xl font-bold text-white">
                  {logs.filter(l => Date.now() - l.timestamp < 24 * 60 * 60 * 1000).length}
              </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Distribution Chart */}
          <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl shadow-xl">
              <h3 className="text-xl font-bold text-white mb-6">Staff Distribution by Platform</h3>
              {totalStaff === 0 ? (
                  <div className="text-center py-10 text-slate-500">No data available.</div>
              ) : (
                  <div className="space-y-6">
                      {sortedUnits.map(([unit, count]) => (
                          <div key={unit}>
                              <div className="flex justify-between text-sm mb-2">
                                  <span className="text-slate-300 font-medium">{unit.replace(/_/g, ' ')}</span>
                                  <span className="text-emerald-400 font-mono font-bold">{count} staff</span>
                              </div>
                              <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                                  <div 
                                      className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                                      style={{ width: `${((count as number) / maxCount) * 100}%` }}
                                  ></div>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>

          {/* AI Insights Panel */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                  <BrainCircuit size={120} className="text-emerald-500" />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 relative z-10">
                  <BrainCircuit className="text-emerald-500" size={24} />
                  AI Strategic Insights
              </h3>

              <div className="relative z-10">
                  {!insight ? (
                      <div className="h-64 flex flex-col items-center justify-center text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl p-6">
                          <p className="mb-4">Click "Generate AI Insights" to analyze staff allocation efficiency.</p>
                      </div>
                  ) : (
                      <div className="bg-emerald-950/30 border border-emerald-900/50 p-6 rounded-2xl">
                          <p className="text-emerald-100 leading-relaxed text-lg">
                              {insight}
                          </p>
                      </div>
                  )}
              </div>
          </div>
        </div>

        {/* Activity Log Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-slate-800">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Clock size={20} className="text-slate-400" />
              Recent Check-In Activity
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-800 text-slate-400 text-sm uppercase tracking-wider">
                  <th className="p-5 font-semibold">Time</th>
                  <th className="p-5 font-semibold">Staff Name</th>
                  <th className="p-5 font-semibold">ID</th>
                  <th className="p-5 font-semibold">Unit</th>
                  <th className="p-5 font-semibold">Match Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-5 text-slate-300 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second:'2-digit' })}
                        <span className="block text-xs text-slate-500">{new Date(log.timestamp).toLocaleDateString()}</span>
                      </td>
                      <td className="p-5 font-medium text-white">{log.staffName}</td>
                      <td className="p-5 font-mono text-emerald-400">{log.staffId}</td>
                      <td className="p-5 text-sm text-slate-300">{log.assignedUnit.replace(/_/g, ' ')}</td>
                      <td className="p-5">
                        <span className="bg-slate-950 px-2 py-1 rounded text-xs text-emerald-500 border border-emerald-900/50">
                          {log.confidenceScore.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-slate-500">
                      No check-in activity recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};