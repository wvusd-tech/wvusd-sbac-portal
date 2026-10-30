// src/components/StudentModal.jsx
import React, { useState } from 'react';
import { PERFORMANCE_LEVELS } from '../config.js';
import { generateNotebookLMPrompt } from '../utils/sbacData.js';
import { 
  X, 
  TrendingUp, 
  Award, 
  Sparkles, 
  Copy, 
  ExternalLink, 
  Check, 
  Target, 
  BookOpen, 
  User, 
  ShieldAlert, 
  FileText,
  Languages, 
  Home 
} from 'lucide-react';

export default function StudentModal({ student, onClose }) {
  const [activeTab, setActiveTab] = useState('trajectory'); // 'trajectory' | 'iep' | 'sst' | 'lesson'
  const [copied, setCopied] = useState(false);

  if (!student) return null;

  // Sort histories chronologically
  const sortedEla = [...(student.elaHistory || [])].sort((a, b) => (a.year || 0) - (b.year || 0));
  const sortedMath = [...(student.mathHistory || [])].sort((a, b) => (a.year || 0) - (b.year || 0));

  const currentPrompt = activeTab === 'iep' 
    ? generateNotebookLMPrompt(student, 'IEP') 
    : activeTab === 'sst' 
    ? generateNotebookLMPrompt(student, 'SST') 
    : generateNotebookLMPrompt(student, 'LESSON');

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(currentPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLevelBadge = (level) => {
    if (!level || !PERFORMANCE_LEVELS[level]) {
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-500 rounded border">
          N/A
        </span>
      );
    }
    const conf = PERFORMANCE_LEVELS[level];
    return (
      <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${conf.badgeClass}`}>
        L{conf.level} · {conf.shortLabel}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fade-in">
      <div 
        className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 sm:p-6 shrink-0 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            title="Close modal (Esc)"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-wrap items-start justify-between gap-4 pr-10">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Grade {student.grade}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  ID: #{student.studentId}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-300 font-medium">
                  {student.school}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
                {student.name}
              </h2>
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-300">
                <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-slate-400">{student.staffLabel || 'Staff'}:</span>
                  <span className="font-semibold text-white">{student.staffName || 'Unassigned'}</span>
                </div>
              </div>
            </div>

            {/* Demographic Indicators */}
            <div className="flex flex-wrap items-center gap-2 self-center sm:self-auto">
              {student.flags?.sped && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Special Education (IEP)
                </span>
              )}
              {student.flags?.plan504 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  <FileText className="w-3.5 h-3.5" />
                  504 Plan
                </span>
              )}
              {student.flags?.elStatus && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/40">
                  <Languages className="w-3.5 h-3.5" />
                  {student.flags.elStatus}
                </span>
              )}
              {student.flags?.homelessFoster && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  <Home className="w-3.5 h-3.5" />
                  Foster / Homeless
                </span>
              )}
            </div>
          </div>

          {/* Quick Metrics Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800 text-xs">
            <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
              <span className="text-slate-400 block text-[11px]">Latest ELA Score</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-base font-bold text-white font-mono">
                  {student.latestEla?.scaledScore || '—'}
                </span>
                {student.latestEla?.performanceLevel && (
                  <span className="text-[11px] font-semibold text-emerald-400">
                    Level {student.latestEla.performanceLevel}
                  </span>
                )}
              </div>
            </div>

            <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
              <span className="text-slate-400 block text-[11px]">ELA Growth Delta</span>
              <div className="flex items-center gap-1 mt-0.5 font-bold font-mono text-sm">
                {student.elaDelta !== null && student.elaDelta !== undefined ? (
                  <span className={student.elaDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {student.elaDelta >= 0 ? `+${student.elaDelta}` : student.elaDelta} pts
                  </span>
                ) : (
                  <span className="text-slate-500">—</span>
                )}
              </div>
            </div>

            <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
              <span className="text-slate-400 block text-[11px]">Latest Math Score</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-base font-bold text-white font-mono">
                  {student.latestMath?.scaledScore || '—'}
                </span>
                {student.latestMath?.performanceLevel && (
                  <span className="text-[11px] font-semibold text-blue-400">
                    Level {student.latestMath.performanceLevel}
                  </span>
                )}
              </div>
            </div>

            <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
              <span className="text-slate-400 block text-[11px]">Math Growth Delta</span>
              <div className="flex items-center gap-1 mt-0.5 font-bold font-mono text-sm">
                {student.mathDelta !== null && student.mathDelta !== undefined ? (
                  <span className={student.mathDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {student.mathDelta >= 0 ? `+${student.mathDelta}` : student.mathDelta} pts
                  </span>
                ) : (
                  <span className="text-slate-500">—</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 px-6 py-2.5 border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('trajectory')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'trajectory'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Longitudinal SBAC Trajectory
          </button>

          <span className="text-slate-300">|</span>

          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
            AI NotebookLM Architect:
          </span>

          <button
            onClick={() => setActiveTab('iep')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'iep'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-300" />
            IEP / 504 Assistant
          </button>

          <button
            onClick={() => setActiveTab('sst')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'sst'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/60'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-amber-500" />
            SST Intervention Architect
          </button>

          <button
            onClick={() => setActiveTab('lesson')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'lesson'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
            Tiered Lesson Architect
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'trajectory' ? (
            <div>
              {/* Longitudinal Comparison Tables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* ELA History Table */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      <h3 className="text-sm font-bold text-slate-800">
                        Smarter Balanced ELA History
                      </h3>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">
                      {sortedEla.length} Test Records
                    </span>
                  </div>

                  {sortedEla.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 italic">
                      No longitudinal ELA SBAC test administrations recorded.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500">
                            <th className="pb-2 font-medium">Test Year</th>
                            <th className="pb-2 font-medium">Date Taken</th>
                            <th className="pb-2 font-medium">Scale Score</th>
                            <th className="pb-2 font-medium">Level</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60 font-mono">
                          {sortedEla.map((rec, i) => (
                            <tr key={i} className="hover:bg-white/80 transition-colors">
                              <td className="py-2.5 font-bold text-slate-700">{rec.year}</td>
                              <td className="py-2.5 text-slate-500 font-sans">{rec.dateTaken || '—'}</td>
                              <td className="py-2.5 font-bold text-slate-900">{rec.scaledScore}</td>
                              <td className="py-2.5 font-sans">{getLevelBadge(rec.performanceLevel)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Math History Table */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                      <h3 className="text-sm font-bold text-slate-800">
                        Smarter Balanced Mathematics History
                      </h3>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">
                      {sortedMath.length} Test Records
                    </span>
                  </div>

                  {sortedMath.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 italic">
                      No longitudinal Math SBAC test administrations recorded.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500">
                            <th className="pb-2 font-medium">Test Year</th>
                            <th className="pb-2 font-medium">Date Taken</th>
                            <th className="pb-2 font-medium">Scale Score</th>
                            <th className="pb-2 font-medium">Level</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60 font-mono">
                          {sortedMath.map((rec, i) => (
                            <tr key={i} className="hover:bg-white/80 transition-colors">
                              <td className="py-2.5 font-bold text-slate-700">{rec.year}</td>
                              <td className="py-2.5 text-slate-500 font-sans">{rec.dateTaken || '—'}</td>
                              <td className="py-2.5 font-bold text-slate-900">{rec.scaledScore}</td>
                              <td className="py-2.5 font-sans">{getLevelBadge(rec.performanceLevel)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Longitudinal Insights Callout */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex items-start gap-3 mt-6">
                <Award className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-700 leading-relaxed">
                  <h4 className="font-bold text-blue-900 text-sm mb-1">
                    Longitudinal Progress Assessment
                  </h4>
                  <p>
                    {student.elaDelta !== null && student.elaDelta > 0 
                      ? `Student has demonstrated positive Year-over-Year acceleration in ELA (+${student.elaDelta} scale points). `
                      : student.elaDelta !== null && student.elaDelta < 0
                      ? `Student showed a -${Math.abs(student.elaDelta)} scale point retraction in ELA. Targeted claim support recommended. `
                      : ''}
                    {student.mathDelta !== null && student.mathDelta > 0
                      ? `In Mathematics, student advanced by +${student.mathDelta} scale points. `
                      : student.mathDelta !== null && student.mathDelta < 0
                      ? `In Mathematics, student shifted by ${student.mathDelta} points. `
                      : ''}
                    Use the AI NotebookLM tabs above to automatically generate calibrated SST/IEP goals and tiered lesson adaptations directly mapped to these test points.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* AI Workflow / NotebookLM Prompt Generator */
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    {activeTab === 'iep' && 'California IEP / 504 Accommodations Assistant'}
                    {activeTab === 'sst' && 'Student Study Team (SST) Intervention Architect'}
                    {activeTab === 'lesson' && 'Tiered Lesson Differentiation Architect'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Formatted with live student scale scores, growth metrics, and California CAASPP standards for Google NotebookLM.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyPrompt}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 shadow-sm transition-all"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-500" />
                        <span>Copy Prompt</span>
                      </>
                    )}
                  </button>

                  <a
                    href="https://notebooklm.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all"
                  >
                    <span>Launch NotebookLM</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Code / Markdown Display */}
              <div className="relative bg-slate-950 text-slate-100 p-4 rounded-xl border border-slate-800 font-mono text-xs leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap selection:bg-blue-600 selection:text-white">
                {currentPrompt}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Walnut Valley Unified School District • Official CAASPP Record</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
